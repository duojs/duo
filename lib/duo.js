/**
 * Module dependencies
 */

var debug = require('debug')('duo');
var Emitter = require('events').EventEmitter;
var parallel = require('co-parallel');
var Package = require('duo-package');
var filedeps = require('file-deps');
var error = require('better-error');
var filepipe = require('file-pipe');
var thunkify = require('thunkify');
var extend = require('extend.js');
var Pack = require('duo-pack');
var parse = require('./parse');
var array = require('array');
var fs = require('co-fs');
var path = require('path');
var basename = path.basename;
var relative = path.relative;
var extname = path.extname;
var dirname = path.dirname;
var resolve = path.resolve;
var join = path.join;

/**
 * Export `Duo`
 */

module.exports = Duo;

/**
 * Regexps
 */

var rref = /([A-Za-z0-9-_\/\.$!#%&\(\)\+=]+)/;
var ruser = /([A-Za-z0-9-]{1,39})/;
var rrepo = /([A-Za-z0-9-_\.]+)/;
var rslug = new RegExp(ruser + '-' + rrepo + '@' + rref, 'i');

/**
 * Initialize `Duo`
 *
 * @param {String} root
 * @return {Duo}
 * @api public
 */

function Duo(root) {
  if (!(this instanceof Duo)) return new Duo(root);
  if (!root) throw error('duo requires a root directory');
  this.root = root;

  // defaults
  this.manifestName = 'component.json';
  this.manifestPath = this._entry = join(root, this.manifestName);
  this.installPath = join(root, 'components');
  this.mappingPath = join(this.installPath, 'duo.json');
  this.rootjson = this.json(this.manifestPath);
  this.buildPath = join(root, 'build');
  this.dev = false;

  this.pipes = [];
  this.mapping = {};
}

/**
 * Inherit `Emitter`
 */

Duo.prototype.__proto__ = Emitter.prototype;

/**
 * Add an entry file
 */

Duo.prototype.entry = function(entry) {
  this._entry = join(this.root, entry);
  return this;
};

/**
 * Install development packages
 *
 * @param {Boolean} dev
 * @return {Installer}
 * @api public
 */

Duo.prototype.development = function(dev) {
  this.dev = undefined == dev ? true : dev;
  return this;
};

/**
 * Add the concurrency
 *
 * @param {Number} n
 * @return {Duo}
 * @api public
 */

Duo.prototype.concurrency = function(n) {
  this._concurrency = n;
  return this;
};

/**
 * install path
 */

Duo.prototype.install = function(path) {
  this.installPath = join(root, path);
  this.mappingPath = join(this.installPath, 'duo.json');
  return this;
};

/**
 * build path
 */

Duo.prototype.build = function(path) {
  this.buildPath = join(root, path);
  return this;
};

/**
 * use
 */

Duo.prototype.use = function(fn) {
  this.pipes.push(fn);
  return this;
};

/**
 * Authenticate with github
 *
 * @param {String} user
 * @param {String} token
 * @return {Installer}
 * @api public
 */

Duo.prototype.auth = function(user, token) {
  Package.user = user;
  Package.token = token;
  return this;
};

/**
 * Run duo
 *
 * Steps:
 * 
 *   1) Try to load {installPath}/duo.json mapping
 *   2) Resolve root entry to main
 *   3) Fetch the dependency map
 *   4) Write out the mappings
 *   5) Build
 *
 * @return {Duo}
 * @api public
 */

Duo.prototype.run = function *() {
  var manifestName = this.manifestName;
  var entry = this._entry;
  var root = this.root;
  var pack = Pack();

  // add the root extension
  this.rootext = extname(entry).slice(1);

  // 1) Try to load {installPath}/duo.json mapping
  this.mapping = this.json(this.mappingPath);

  // 2) Resolve root entry to main (if {manifest} passed in)
  entry = yield this.resolve(entry || this.manifestPath, root);

  // 3) Fetch the dependency map
  var deps = yield this.dependencies(entry, root);

  // write out mapping
  yield fs.writeFile(this.mappingPath, JSON.stringify(deps, true, 2), 'utf8');

  // build
  var names = Object.keys(deps);

  // not js
  // TODO: change filedeps to remove 
  // found @imports ?, or remove them here.
  if ('js' != this.rootext) {
    return names.map(function(name){
      return deps[name].src;
    }).join('');
  }

  // gens
  var gens = names.map(function*(name, i){
    var last = i == names.length - 1;
    deps[name].id = name;
    return yield pack(deps[name], last);
  });

  // pack
  return (yield this.parallel(gens)).join('');
};

/**
 * Get all the dependencies
 *
 * Steps:
 *
 *   1) Look up filename in duo.json mapping
 *      1.1) Found: Look up mtime in duo.json mapping
 *        1.1.1) Not Modified: Pass dependency file paths to step (1)
 *        1.1.2) Modified: Go to step (2)
 *      1.2) Not Found: Go to step (2)
 *   2) Contents of file are read
 *   3) File contents are transformed (gulp plugin support)
 *   4) Parse content for dependencies
 *   5) Dependencies are resolved to either remotes (on github) or local (local paths)
 *   6) filter out packages that we already resolved
 *   7) remotes versions are resolved
 *   8) remotes are fetched from github
 *   9) remotes entry files are resolved from manifest
 *   10) remotes and locals each go back to step (1)
 *
 * @param {String} file path
 * @param {String} root
 * @param {Array} out (private)
 * @return {Array}
 */

Duo.prototype.dependencies = function *(file, root, out) {
  out = out || {};

  var json = this.json(join(root, this.manifestName));
  var relativeFile = relative(this.root, file);
  var mapping = this.mapping[relativeFile];
  var layer = out[relativeFile] = { deps: {} };
  var mtime = layer.mtime = (yield fs.stat(file)).mtime.getTime();
  var ext = extname(file).slice(1);
  var gens = [];
  var file;

  // 1) Look up filename in duo.json mapping
  if (mapping && mtime == mapping.mtime) {
    out[relativeFile] = layer = mapping;

    debug('%s has not been modified. skipping parsing', file);

    // 1.1.1) Not Modified: Pass dependency file paths to step (1)
    for (var dep in layer.deps) {
      file = layer.deps[dep];
      gens.push(this.dependencies(resolve(this.root, file), this.findroot(root), out));
    }

    yield gens;
    return out;
  }

  // 2) Contents of file are read
  // 3) File contents are transformed (gulp plugin support)
  // var fp = new filepipe();
  // for (var i = 0, pipe; pipe = this.pipes[i]; i++) fp.pipe(pipe);
  // fp.run = thunkify(fp.run);

  // var content = yield fp.run(file);
  layer.src = yield fs.readFile(file, 'utf8');

  // 4) Parse content for dependencies
  var deps = filedeps(layer.src, ext);
  var pkgs = array();
  var pkgmap = {};
  var resolved;

  // 5) Dependencies are resolved to either remotes (on github) or local (local paths)
  for (var i = 0, dep; dep = deps[i]; i++) {
    // 5.1) Check if the dep is the same as in the mapping
    // 
    // TODO: figure out why if I modify yields/shortcuts dep in examples/entry/another.js 
    // both get fetched
    if (mapping && mapping.deps[dep]) {
      debug('%s has a mapping for dep: %s', file, dep);
      resolved = resolve(this.root, mapping.deps[dep]);
      gens.push(this.dependencies(resolved, this.findroot(root), out));
      continue;
    }

    // 5.2) Not the same, resolve the dependency
    resolved = yield this.resolve(dep, root, file);
    if (resolved) {
      // local files (relative or absolute)
      layer.deps[dep] = relative(this.root, resolved);
      gens.push(this.dependencies(resolved, root, out));
    } else {
      // remote files
      pkg = this.package(dep, json);
      if (!pkg) {
        debug('cannot resolve "%s" in "%s"', dep, file);
        continue;
      }
      pkgmap[dep] = pkg;
      pkgs.push(pkg);
    }
  }

  // TODO
  // 6) filter out packages that we already resolved

  // 7) Remotes versions are resolved
  yield this.parallel(pkgs.map('resolve'));

  // 8) Remote versions are fetched
  yield this.parallel(pkgs.map('fetch'));

  // 9) resolve remotes entry files from package manifest
  var pkgroot;
  var path;
  var pkg;
  var gh;

  for (var dep in pkgmap) {
    pkg = pkgmap[dep];
    path = parse(dep).path || 'component.json';
    pkgroot = pkg.path();
    resolved = yield this.resolve(pkg.path(path), pkgroot);
    layer.deps[dep] = relative(this.root, resolved);
    gens.push(this.dependencies(resolved, pkgroot, out));
  }

  // 10) remotes and locals each go back to step (1)
  yield this.parallel(gens);

  return out;
};

/**
 * Resolve local dependencies
 *
 * @param {String} path
 * @param {String} root
 * @return {String|null} entry
 * @api private
 */

Duo.prototype.resolve = function*(path, root, file) {
  var ext = extname(path) ? '' : '.' + this.rootext;
  var ret;

  // component
  if (this.manifestName == basename(path)) {
    var json = this.json(path);
    var main = entry(json);
    return resolve(root, main);
  } else if ('/' == path[0]) {
    ret = resolve(this.root, path);
  } else if (0 == path.indexOf('./')) {
    ret = resolve(dirname(file), path);
  }

  // not found
  if (!ret) return;

  // try
  // ./file.ext
  // ./file/index.ext
  try {
    yield fs.stat(ret + ext);
    return ret + ext;
  } catch (e) {
    ret = join(ret, 'index' + ext);
    return ret;
  }
};

/**
 * Create a package from a dependency
 *
 * @param {String} dep
 * @param {Object} json
 * @return {Package|null}
 * @api private
 */

Duo.prototype.package = function(dep, json) {
  var gh = this.finddeps(parse(dep), json);
  if (!gh) return null;

  var pkg = new Package(gh.package, gh.ref);
  pkg.directory(this.installPath);

  return pkg;
};

/**
 * Find the repo in the `jsons`'s dependencies
 *
 *   TODO: resolve ambiguous component/store.js
 *
 * @param {Object} gh
 * @param {Object} json
 * @return {Object}
 *
 * @api private
 */

Duo.prototype.finddeps = function(gh, json) {

  if (gh.user && gh.repo && gh.ref) {
    gh.package = gh.user + '/' + gh.repo;
    return gh;
  }

  var deps = json.dependencies || {};

  if (this.dev && json == this.rootjson) {
    deps = extend(deps, json.development || {});
  }

  var re = gh.user
    ? new RegExp('^' + gh.user + '[\\/:]' + gh.repo + '$', 'i')
    : new RegExp('[\\/:]' + gh.repo + '$', 'i');
  
  for (var dep in deps) {
    if (re.test(dep)) {
      gh.package = dep;
      gh.ref = deps[dep];
      return gh;
    }
  }

  if (gh.user && gh.repo) {
    gh.package = gh.user + '/' + gh.repo;
    gh.ref = '*';
    return gh;
  }

  return null;
};

/**
 * Given a `path`, find the root.
 *
 * @param {String} path
 * @return {String} root
 */

Duo.prototype.findroot = function(path) {
  var root = this.root;
  
  while(path != root && !test(path)) {
    path = dirname(path);
  }

  function test(path) {
    return rslug.test(basename(path));
  }

  return path;
};


/**
 * Parallelize an array of generators
 * with `concurrency`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

Duo.prototype.parallel = function(arr) {
  return parallel(arr, this._concurrency);
};

/**
 * Fetch JSON
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

Duo.prototype.json = function(path) {
  try {
    return require(path);
  } catch(e) {
    return {};
  }
};

/**
 * Get entry of `json`.
 * 
 * @param {Object} json
 * @return {String}
 * @api private
 */

function entry(json){
  return json.main
    || (json.scripts && json.scripts[0])
    || (json.styles && json.styles[0])
    || (json.templates && json.templates[0])
    || 'index.js';
}
