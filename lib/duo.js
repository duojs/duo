
/**
 * Module dependencies
 */

var Emitter = require('events').EventEmitter;
var clone = require('component-clone');
var stoj = require('duo-string-to-js');
var transform = require('./transform');
var parallel = require('co-parallel');
var Package = require('duo-package');
var debug = require('debug')('duo');
var Mapping = require('./mapping');
var exists = require('co-exists');
var extend = require('extend.js');
var fmt = require('util').format;
var unyield = require('unyield');
var thunk = require('thunkify');
var Pack = require('duo-pack');
var main = require('duo-main');
var parse = require('./parse');
var mkdir = require('mkdirp');
var File = require('./file');
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

var rsupported = /^(js|css)$/;

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
  if (!root) throw error('duo requires a root directory');
  this.root = root;
  this.manifestName = 'component.json';
  this.manifestPath = join(root, this.manifestName);
  this.installPath = join(root, 'components');
  this.mappingPath = join(this.installPath, 'duo.json');
  this.rootjson = this.json(this.manifestPath);
  this.assetPath = join(root, 'build');
  this.symlinks = [];
  this.includes = {};
  Emitter.call(this);
  this.plugins = [];
  this.mapping = {};
  this.dev = false;
  this.file = null;
  this.tok = null;
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
  if (!file) return this._entry;
  this._entry = resolve(this.root, file);
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
  debug('using plugin: %s', fn.name || fn.toString());
  transform.use(fn);
  return this;
};

/**
 * Authenticate with github
 *
 * @param {String} token
 * @return {Duo}
 * @api public
 */

Duo.prototype.token = function(token) {
  if (!token) return this.tok;
  this.tok = token;
  return this;
};

/**
 * Include a runtime
 *
 * @param {String} name
 * @param {String} src
 * @return {Duo}
 * @api public
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
 * Write the compiled src
 *
 * @param {Function} fn (optional)
 * @return {Duo}
 * @api public
 */

Duo.prototype.write = unyield(function *() {
  var src = yield this.run();
  var entry = this.entry();
  var rel = relative(this.root, entry);
  var path = join(this.assetPath, rel);
  yield mkdir(dirname(path));
  yield fs.writeFile(path, src);
  return this;
});

/**
 * Run duo
 *
 * @param {Function} fn (optional)
 * @return {String}
 * @api public
 */

Duo.prototype.run = unyield(function *() {
  var mapping = Mapping(this.mappingPath);
  var manifestName = this.manifestName;
  var global = this.global();
  var entry = this.entry();
  var root = this.root;
  var rel = relative(root, entry);

  // idempotent across runs
  this.symlinks = [];

  // add core plugins
  this.use(stoj());

  // 1) Try to load duo.json mapping
  this.mapping = yield mapping.read();

  // ensure that the entry exists
  if (!(yield exists(entry))) throw error('cannot find entry: %s', entry);

  // 3) Fetch the dependency map
  var deps = yield this.dependencies(entry, root);

  // includes to mapping
  deps = extend(deps, this.includes);

  // add global
  if (global) deps[rel].global = global;

  // write out the symlinks
  yield this.symlinks;

  // write out mapping
  yield mkdir(this.installPath);
  deps = yield mapping.update(deps);

  // pack the mapping
  var pack = Pack(deps);
  this.dev && pack.development();
  return pack.pack(rel);
});

/**
 * Get all the dependencies
 *
 * @param {String} path
 * @param {String} root
 * @param {Object} out (private)
 * @return {Object}
 * @api private
 */

Duo.prototype.dependencies = function *(path, root, out) {
  out = out || {};

  var file = new File({ path: path, root: root }, this.file, this);
  var cache = clone(this.mapping[file.id] || {});
  var entry = path == this.entry();
  var includes = this.includes;
  var paths = [];
  var gens = [];

  // logging
  debug('parsing: %s', file.id)

  // already visited
  if (out[file.id]) {
    debug('%s, already parsed. ignoring', file.id);
    return out;
  }

  // included manually
  if (cache.include) {
    out[file.id] = cache;
    return out;
  }

  // if entry, set the file
  if (entry) this.file = file;

  // check if the file has been modified
  if (file.mtime == cache.mtime) {
    debug('%s: has not been modified. skip parsing', file.id);
    out[file.id] = cache;
    paths = values(cache.deps);
    gens = [];

    // update the file
    file.set(cache);

    // recurse the dependency's dependencies
    var gens = this.recurse(paths, out);
    yield this.parallel(gens);
    return out;
  }

  // load the file
  yield file.load();

  // Not a supported file type, don't parse any farther
  // But include in duo.json, for symlinking / copying
  if (!rsupported.test(file.type)) {
    if (entry) throw error('%s: ".%s" not supported', file.id, file.type);
    this.symlinks.push(this.symlink(file.id));
    delete file.attrs.src;
    out[file.id] = file.json();
    return out;
  }

  // Parse content for dependencies
  var deps = file.dependencies();
  var depmap = {};

  // logging
  debug('%s deps: %j', file.id, deps)

  // download and resolve the dependencies
  for (var i = 0, dep; dep = deps[i++];) {
    depmap[dep] = this.dependency(dep, file);
  }

  // resolve dependency entrypoints,
  // and remove unresolved deps
  depmap = compact(yield depmap);
  paths = values(depmap);
  gens = [];

  // update the file with the resolved dependencies
  file.set({ deps: depmap });
  out[file.id] = file.json();

  // recurse the dependency's dependencies
  var gens = this.recurse(paths, out);
  yield this.parallel(gens);
  return out;
};

/**
 * Create generators to recurse the next
 * layer of dependencies
 *
 * @param {Array} paths
 * @param {Object} out
 * @return {Array}
 * @api private
 */

Duo.prototype.recurse = function(paths, out) {
  var includes = this.includes;
  var gens = [];

  for (var i = 0, path; path = paths[i++];) {
    if (includes[path]) continue;
    path = resolve(this.root, path);
    root = this.findroot(path);
    gens.push(this.dependencies(path, root, out));
  }

  return gens;
};

/**
 * Resolve the dependency
 *
 * @param {String} dep
 * @param {File} file
 * @return {String}
 * @api private
 */

Duo.prototype.dependency = function *(dep, file) {
  var includes = this.includes;
  var root = this.root;

  // included manually
  if (includes[dep]) return dep;

  // ignore http dependencies
  if (http(dep)) {
    debug('%s: ignoring dependency "%s"', file.id, dep)
    return false;
  }

  // local dependency
  var local = yield this.resolve(dep, file.root, file.path);
  if (local) return relative(root, local);

  // remote dependency
  var json = this.json(join(file.root, this.manifestName));
  var pkg = this.package(dep, json);
  if (!pkg) {
    debug('%s: cannot resolve "%s"', file.id, dep);
    return false;
  }

  // fetch the dependency
  yield pkg.fetch();

  // path
  var path = parse(dep).path || 'component.json';
  var resolved = yield this.resolve(pkg.path(path), pkg.path());
  return relative(root, resolved);
};

/**
 * Resolve local dependencies
 *
 * @param {String} dep
 * @param {String} root
 * @return {String|null} path
 * @api private
 */

Duo.prototype.resolve = function*(dep, root, path) {
  var file = this.file;
  var ext = extension(dep) ? '' : '.' + file.type;
  var ret;

  if (this.manifestName == basename(dep)) {
    // component
    var json = this.json(resolve(root, dep));
    var entrypoint = main(json, file.type) || 'index.' + file.type;
    return resolve(root, dirname(dep), entrypoint);
  } else if ('/' == dep[0]) {
    // absolute (to this.root)
    ret = resolve(file.root, dep);
  } else if ('../' == dep.slice(0, 3)) {
    // relative
    ret = resolve(dirname(path), dep);
  } else if ('./' == dep.slice(0, 2)) {
    // relative
    ret = resolve(dirname(path), dep);
  } else if ('css' == file.type && (yield relative(resolve(root, dep)))) {
    // hack to support relative paths without "./"
    // lots of for CSS urls with no "./" unfortunately
    // example "fonts/whatever"
    ret = resolve(root, dep);
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
    .directory(this.installPath);

  // pass the token in, if we have one
  this.tok && pkg.token(this.tok);

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
 * @api private
 */

Duo.prototype.findroot = function(path) {
  var root = this.root;

  while(path != root && !slug(path)) {
    path = dirname(path);
  }

  function slug(path) {
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
 * @param {String} path
 * @param {String} root
 * @return {Duo}
 * @api private
 */

Duo.prototype.symlink = function *(path) {
  var dest = join(this.assetPath, path);

  // mkdir -p
  yield mkdir(dirname(dest));

  // fullpath
  path = join(this.root, path);

  // try symlinking
  try {
    debug('symlinking %s => %s', path, dest);
    yield fs.symlink(path, dest);
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
 * Create an error
 *
 * @param {String} msg
 * @return {Error}
 * @api private
 */

function error(msg) {
  var args = slice.call(arguments, 1);
  var msg = fmt.apply(fmt, [msg].concat(args));
  return new Error(msg);
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
 * Get the values of an object
 *
 * @param {Object} obj
 * @return {Array}
 * @api private
 */

function values(obj) {
  if (!obj) return [];
  return Object.keys(obj).map(function(k) {
    return obj[k];
  });
}

/**
 * Compact
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function compact(obj) {
  var out = {};

  for (var k in obj) {
    if (obj[k]) out[k] = obj[k];
  }

  return out;
}
