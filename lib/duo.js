
/**
 * Module dependencies
 */

var Emitter = require('events').EventEmitter;
var clone = require('clone-component');
var stoj = require('duo-string-to-js');
var parallel = require('co-parallel');
var Package = require('duo-package');
var debug = require('debug')('duo');
var filedeps = require('file-deps');
var exists = require('co-exists');
var extend = require('extend.js');
var thunk = require('thunkify');
var Pack = require('duo-pack');
var parse = require('./parse');
var mkdir = require('mkdirp');
var array = require('array');
var fs = require('co-fs');
var url = require('url');
var co = require('co');
var path = require('path');
var basename = path.basename;
var relative = path.relative;
var extname = path.extname;
var dirname = path.dirname;
var resolve = path.resolve;
var join = path.join;
var slice = [].slice;

/**
 * Export `Duo`
 */

module.exports = Duo;

/**
 * Regexps
 */

var rsupported = /^(js|css|html)$/;

/**
 * Thunkify functions
 */

mkdir = thunk(mkdir);

/**
 * Initialize `Duo`
 *
 * @param {String} root
 * @return {Duo}
 * @api public
 */

function Duo(root) {
  if (!(this instanceof Duo)) return new Duo(root);
  if (!root) throw new Error('duo requires a root directory');
  this.root = root;
  this.manifestName = 'component.json';
  this.manifestPath = this._entry = join(root, this.manifestName);
  this.installPath = join(root, 'components');
  this.mappingPath = join(this.installPath, 'duo.json');
  this.rootjson = this.json(this.manifestPath);
  this.assetPath = join(root, 'build');
  this.symlinks = [];
  this.dev = false;
  this.plugins = [];
  this.mapping = {};
  this.includes = {};
  Emitter.call(this);
  this.auth = {};
}

/**
 * Inherit `Emitter`
 */

Duo.prototype.__proto__ = Emitter.prototype;

/**
 * Set entry `file`.
 *
 * @param {String} file
 * @return {Duo}
 * @api public
 */

Duo.prototype.entry = function(file) {
  this._entry = '/' == file[0]
    ? file
    : join(this.root, file);
  return this;
};

/**
 * Install development packages
 *
 * @param {Boolean} dev
 * @return {Duo}
 * @api public
 */

Duo.prototype.development = function(dev) {
  this.dev = undefined == dev ? true : dev;
  return this;
};

/**
 * Expose entry as global `name`.
 *
 * @param {String} name
 * @return {String|Duo}
 * @api public
 */

Duo.prototype.global = function(name){
  if (!name) return this._global;
  this._global = name;
  return this;
};

/**
 * Set concurrency `n`
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
 * Set install `path`.
 *
 * @param {String} path
 * @api private
 */

Duo.prototype.install = function(path) {
  this.installPath = join(root, path);
  this.mappingPath = join(this.installPath, 'duo.json');
  return this;
};

/**
 * Set the assets path.
 *
 * @param {String} path
 * @return {Duo}
 * @api public
 */

Duo.prototype.assets = function(path) {
  this.assetPath = join(root, path);
  return this;
};

/**
 * Use async / sync `plugin`.
 *
 * @param {Function} plugin
 * @return {Duo}
 * @api public
 */

Duo.prototype.use = function(fn) {
  debug('plugin %s', fn.name || '-');
  this.plugins.push(fn);
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
  this.auth.user = user;
  this.auth.token = token;
  return this;
};

/**
 * Include a runtime
 *
 * @param {String} name
 * @param {String} src
 */

Duo.prototype.include = function(name, src) {
  this.includes[name] = {
    id: name,
    src: src,
    entry: false,
    include: true,
    deps: {}
  };

  return this;
};

/**
 * Run Duo
 *
 * @param {Function} fn (optional)
 * @return {Function|Generator}
 * @api public
 */

Duo.prototype.run = function(fn) {
  return fn
    ? co(this._run).call(this, fn)
    : this._run();
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
 * @api private
 */

Duo.prototype._run = function *() {
  var manifestName = this.manifestName;
  var global = this.global();
  var root = this.root;
  var entry = this._entry;

  // idempotent across runs
  // TODO: more resets
  this.symlinks = [];

  // add core plugins
  this.use(stoj());

  // add the root type
  this.type = extension(entry);

  // 1) Try to load {installPath}/duo.json mapping
  var mapping = this.mapping = yield this.readjson(this.mappingPath);

  // 2) Resolve root entry to main (if {manifest} passed in)
  entry = yield this.resolve(entry || this.manifestPath, root);

  // 3) Fetch the dependency map
  var deps = yield this.dependencies(entry, root);

  // add deps & includes to mapping
  mapping = extend(mapping, deps, this.includes);

  // add global
  if (global) {
    mapping[relative(root, entry)].global = global;
  }

  // write out the symlinks
  yield this.symlinks;

  // write out mapping
  yield mkdir(this.installPath);
  yield fs.writeFile(this.mappingPath, stringify(mapping));

  // pack the mapping
  var pack = Pack(mapping);
  if (this.dev) pack.development();
  return pack.pack(relative(root, entry));
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
 *   6) remotes versions are resolved
 *   7) remotes are fetched from github
 *   8) remotes entry files are resolved from manifest
 *   9) remotes and locals each go back to step (1)
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
  var entry = file == this._entry;

  // visited.
  if (out[relativeFile]) {
    debug('ignoring %s, already parsed', relativeFile);
    return out;
  }

  // check to see if there's a mapping
  var mapping = this.mapping[relativeFile];
  var ext = extension(file);
  var gens = [];
  var file;

  // if the file has been included manually, don't parse
  if (mapping && mapping.include) {
    out[relativeFile] = clone(mapping);
    return out;
  }

  var layer = out[relativeFile] = { deps: {} };
  var mtime = layer.mtime = (yield fs.stat(file)).mtime.getTime();

  // 1) Look up filename in duo.json mapping
  if (mapping && mtime == mapping.mtime) {
    out[relativeFile] = layer = clone(mapping);

    debug('%s has not been modified. skipping parsing', file);

    // 1.1.1) Not Modified: Pass dependency file paths to step (1)
    for (var dep in layer.deps) {
      var deppath = layer.deps[dep];
      gens.push(this.dependencies(resolve(this.root, deppath), this.findroot(file), out));
    }

    yield gens;
    return out;
  }

  // entry
  if (entry) layer.entry = true;

  // id, path, type
  layer.id = relativeFile;
  layer.path = file;
  layer.type = ext;

  // 2) Contents of file are read
  layer.src = yield fs.readFile(file, 'utf8');

  // 3) File contents are transformed, passing layer in
  yield this.transform(layer);

  // cleanup after transform
  delete layer.path;

  // Update root type here, because we might pass
  // in a .coffee or .styl file as the entry
  this.type = entry ? layer.type : this.type;

  // Not a supported file type, don't parse any farther
  // But include in duo.json, for symlinking / copying
  if (!rsupported.test(layer.type)) {
    this.symlinks.push(this.symlink(relativeFile));
    delete layer.src;
    return out;
  }

  // 4) Parse content for dependencies
  var deps = filedeps(layer.src, layer.type);
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
      layer.deps[dep] = relative(this.root, resolved);
      gens.push(this.dependencies(resolved, this.findroot(file), out));
      continue;
    }

    // Ignore http deps
    if (http(dep)) {
      debug('ignoring "%s" in "%s"', dep, file)
      continue;
    }

    // 5.2) Not the same, resolve the dependency
    resolved = yield this.resolve(dep, root, file);

    if (resolved) {
      // local files (relative or absolute)
      layer.deps[dep] = relative(this.root, resolved);
      gens.push(this.dependencies(resolved, root, out));
    } else if (this.includes[dep]) {
      layer.deps[dep] = dep;
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

  // 6) Remotes versions are resolved
  yield this.parallel(pkgs.map('resolve'));

  // 7) Remote versions are fetched
  yield this.parallel(pkgs.map('fetch'));

  // 8) resolve remotes entry files from package manifest
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

  // 9) remotes and locals each go back to step (1)
  yield this.parallel(gens);

  return out;
};

/**
 * Transform using plugins.
 *
 * @param {Object} file
 * @api private
 */

Duo.prototype.transform = function*(layer){
  var fns = this.plugins;

  debug('transform %s, %s', layer.id, layer.type);
  for (var i = 0, fn; fn = fns[i++];) {
    if (generator(fn)) {
      yield fn(layer, this);
    } else if (2 < fn.length) {
      fn = thunk(fn);
      yield fn(layer, this);
    } else {
      fn(layer, this);
    }
  }

  return this;
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
  var ext = extension(path) ? '' : '.' + this.type;
  var ret;

  if (this.manifestName == basename(path)) {
    // component
    var json = this.json(resolve(root, path));
    var main = this.main(json);
    return resolve(root, dirname(path), main);
  } else if ('/' == path[0]) {
    // absolute (to this.root)
    ret = resolve(this.root, path);
  } else if ('../' == path.slice(0, 3)) {
    // relative
    ret = resolve(dirname(file), path);
  } else if ('./' == path.slice(0, 2)) {
    // relative
    ret = resolve(dirname(file), path);
  } else if ('css' == this.type && (yield relative(resolve(root, path)))) {
    // hack to support relative paths without "./"
    // lots of for CSS urls with no "./" unfortunately
    // example "fonts/whatever"
    ret = resolve(root, path);
  }

  // not found
  if (!ret) return;

  // Pass file through url.parse(path) to
  // remove any hashes, querystrings, etc.
  //
  // Example: fonts in bootstrap
  ret = url.parse(ret).pathname;

  // try
  // ./file.ext
  // ./file/index.ext
  return yield exists([
    ret + ext,
    join(ret, 'index' + ext)
  ]);

  // check filesystem for relative asset
  function *relative(path) {
    path = url.parse(path).pathname;
    if (!extension(path)) return false;
    return yield exists(path);
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

  // initialize the package
  var pkg = Package(gh.package, gh.ref)
    .directory(this.installPath)
    .auth(this.auth.user, this.auth.token)

  // forward package events to duo
  pkg
    .on('resolving', this.forward('resolving'))
    .on('fetching', this.forward('fetching'))
    .on('resolve', this.forward('resolve'))
    .on('fetch', this.forward('fetch'));

  return pkg;
};

/**
 * Find the repo in the `jsons`'s dependencies
 *
 * @param {Object} gh
 * @param {Object} json
 * @return {Object}
 * @api private
 */

Duo.prototype.finddeps = function(gh, json) {
  if (gh.user && gh.repo && gh.ref) {
    gh.package = gh.user + '/' + gh.repo;
    return gh;
  }

  var deps = json.dependencies || {};
  var rext = '([\.][a-z]+)?';

  if (this.dev && json == this.rootjson) {
    deps = extend(deps, json.development || {});
  }

  var re = gh.user
    ? new RegExp('^' + gh.user + '[\\/:]' + gh.repo + rext + '$', 'i')
    : new RegExp('([\\/:])?' + gh.repo + rext + '$', 'i');

  for (var dep in deps) {
    if (re.test(dep) || re.test(dep.replace('/', '-'))) {
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
    return parse.slug.test(basename(path));
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
 * Read JSON (cached)
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
 * Read JSON (non-cached)
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

Duo.prototype.readjson = function*(path) {
  try {
    var str = yield fs.readFile(path, 'utf8');
    return JSON.parse(str);
  } catch(e) {
    return {};
  }
};

/**
 * Symlink assets
 *
 * @param {String} src
 * @param {String} root
 * @return {Duo}
 * @api private
 */

Duo.prototype.symlink = function *(src) {
  var dest = join(this.assetPath, src);
  debug('symlinking %s => %s', src, dest);

  // mkdir -p
  yield mkdir(dirname(dest));

  // fullpath
  src = join(this.root, src);

  // try symlinking
  try {
    debug('symlinking %s => %s', src, dest);
    yield fs.symlink(src, dest);
  } catch (e) {
    // ignore symlinks that already exist
    if ('EEXIST' != e.code) throw e;
  }

  return this;
};

/**
 * Forward events
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */

Duo.prototype.forward = function(name) {
  var duo = this;

  return function() {
    var args = slice.call(arguments);
    var ctx = this;

    args = [name].concat(args).concat(ctx);
    duo.emit.apply(duo, args);

    return ctx;
  }
};

/**
 * Get entry of `json` based on the `type`
 *
 * @param {Object} json
 * @return {String}
 * @api private
 */

Duo.prototype.main = function(json) {
  var ext = this.type;
  var main = json.main || {};

  // handle single "main"
  if (single(main)) return json.main;

  // contextual entry
  switch (ext) {
    case 'js':
      return main.js
        || (json.scripts && json.scripts[0])
        || 'index.js';
    case 'css':
      return main.css
        || (json.styles && json.styles[0])
        || 'index.css';
    default:
      return false;
  }

  // single json.main string of correct type
  function single (main) {
    return 'string' == typeof main
      && ext == extension(main);
  }
};

/**
 * Get the extension
 *
 * @param {String} path
 * @return {Strign} ext
 * @api private
 */

function extension(path) {
  return extname(path).slice(1);
}

/**
 * Stringify
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function stringify(obj) {
  return JSON.stringify(obj, true, 2);
}

/**
 * Check if dep is an http url
 *
 * @param {String} path
 * @param {Boolean}
 * @api private
 */

function http(url) {
  return 'http' == url.slice(0, 4)
    || '://' == url.slice(0, 3)
    || false;
}

/**
 * Is generator.
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function generator(value){
  return value && value.constructor && 'GeneratorFunction' == value.constructor.name;
}
