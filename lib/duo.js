
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var detect = require('language-classifier');
var clone = require('component-clone');
var stoj = require('duo-string-to-js');
var compat = require('duo-css-compat');
var parallel = require('co-parallel');
var Package = require('duo-package');
var debug = require('debug')('duo');
var Mapping = require('./mapping');
var exists = require('co-exists');
var extend = require('extend.js');
var fmt = require('util').format;
var parse = require('duo-parse');
var unyield = require('unyield');
var thunk = require('thunkify');
var Pack = require('duo-pack');
var main = require('duo-main');
var mkdir = require('mkdirp');
var Step = require('step.js');
var File = require('./file');
var fs = require('co-fs');
var co = require('co');
var cp = require('cp');
var path = require('path');
var basename = path.basename;
var relative = path.relative;
var extname = path.extname;
var dirname = path.dirname;
var resolve = path.resolve;
var join = path.join;
var slice = [].slice;

/**
 * Thunks.
 */

mkdir = thunk(mkdir);
cp = thunk(cp);

/**
 * Export `Duo`.
 */

module.exports = Duo;

/**
 * Regexps.
 */

var rsupported = /^(js|css)$/;

/**
 * Language mapping.
 */

var langmap = {
  javascript: 'js',
  css: 'css'
};

/**
 * Initialize a new `Duo` package with the path to the package's `root` folder.
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
  this.manifest = this.json(this.manifestPath);
  this.installPath = join(root, 'components');
  this.mappingPath = join(this.installPath, 'duo.json');
  this.assetPath = join(root, 'build');
  this._concurrency = 50;
  this.entryFile = null;
  this.includes = {};
  this._copy = false;
  Emitter.call(this);
  this.mapping = {};
  this.dev = false;
  this.tok = null;
  this.files = [];
  this.deps = {};

  // plugins
  this.plugins = new Step;
  this.plugins.run = thunk(this.plugins.run);
}

/**
 * Inherit from `Emitter`.
 */

Duo.prototype.__proto__ = Emitter.prototype;

/**
 * Set the entry file by `path`.
 *
 * @param {String} path
 * @return {Duo}
 * @api public
 */

Duo.prototype.entry = function (path) {
  this.entryFile = this.file({ path: path, entry: true });
  return this;
};

/**
 * Set the entry file by `src` and `type`, instead of a path.
 *
 * @param {String} src
 * @param {String} type
 * @api public
 */

Duo.prototype.src = function (src, type) {
  type = type || langmap[detect(src)];
  if (!type) throw error('could not detect a supported type on this source');
  this.entryFile = this.file({ raw: src, type: type, entry: true });
  return this;
};

/**
 * Whether to install development dependencies.
 *
 * @param {Boolean} dev
 * @return {Duo}
 * @api public
 */

Duo.prototype.development = function (dev) {
  this.dev = undefined == dev ? true : dev;
  return this;
};

/**
 * Whether to copy assert files instead of symlinking.
 *
 * @param {Boolean} copy
 * @return {Duo}
 * @api public
 */

Duo.prototype.copy = function (copy) {
  this._copy = undefined == copy ? true : copy;
  return this;
}

/**
 * Set a `global` variable name to expose the entry file by.
 *
 * @param {String} global
 * @return {String|Duo}
 * @api public
 */

Duo.prototype.global = function (global) {
  if (!global) return this._global;
  this._global = global;
  return this;
};

/**
 * Set the download `concurrency`.
 *
 * @param {Number} concurrency
 * @return {Duo}
 * @api public
 */

Duo.prototype.concurrency = function (concurrency) {
  this._concurrency = concurrency;
  return this;
};

/**
 * Set the `path` to install dependencies to.
 *
 * @param {String} path
 * @api public
 */

Duo.prototype.install = function (path) {
  this.installPath = resolve(this.root, path);
  this.mappingPath = join(this.installPath, 'duo.json');
  return this;
};

/**
 * Set an `assets` path to copy assets from.
 *
 * @param {String} path
 * @return {Duo}
 * @api public
 */

Duo.prototype.assets = function (path) {
  this.assetPath = resolve(this.root, path);
  return this;
};

/**
 * Use  an async, sync or generator `plugin`.
 *
 * @param {Function} plugin
 * @return {Duo}
 * @api public
 */

Duo.prototype.use = function (fn) {
  if (~this.plugins.fns.indexOf(fn)) return this;
  debug('using plugin: %s', fn.name || fn.toString());
  this.plugins.use(fn);
  return this;
};

/**
 * Authenticate with github with a `token`.
 *
 * @param {String} token
 * @return {Duo}
 * @api public
 */

Duo.prototype.token = function (token) {
  if (!token) return this.tok;
  this.tok = token;
  return this;
};

/**
 * Include a runtime by `name` and `src`.
 *
 * @param {String} name
 * @param {String} src
 * @return {Duo}
 * @api public
 */

Duo.prototype.include = function (name, src) {
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
 * Write the built source to a `path`, which defaults to the same name as the
 * entry file's name.
 *
 * @param {String} path (optional)
 * @param {Function} fn (optional)
 * @return {Duo}
 * @api public
 */

Duo.prototype.write = unyield(function *(path) {
  var src = yield this.run();
  var entry = this.entryFile;
  var type = entry.type;
  var rel = entry.id;

  // resolve the path
  path = resolve(this.assetPath, path || rel);

  // change the extension if the type has changed
  var base = basename(path, extname(path)) + '.' + type;
  var dir = dirname(path);

  // update the path
  path = join(dir, base);

  // write the file
  yield mkdir(dir);
  yield fs.writeFile(path, src);

  return this;
});

/**
 * Run duo on the entry file and return the built source.
 *
 * @param {Function} fn (optional)
 * @return {String}
 * @api public
 */

Duo.prototype.run = unyield(function *() {
  if (!this.entryFile) return '';

  var mapping = Mapping(this.mappingPath);
  var manifestName = this.manifestName;
  var global = this.global();
  var file = this.entryFile;
  var rel = file.id;

  // logging
  this.emit('running', rel);
  debug('running: %s', rel);

  // idempotent across runs
  this.files = [];
  this.deps = {};

  // add core plugins
  this
    .use(compat())
    .use(stoj());

  // 1) Try to load duo.json mapping
  this.mapping = yield mapping.read();

  // ensure that the entry exists
  if (!(yield file.exists())) {
    throw error('cannot find entry: %s', rel);
  }

  // 3) Fetch the dependency map
  yield this.dependencies(file);

  // includes to mapping
  extend(this.deps, this.includes);

  // add global
  if (global) this.deps[rel].global = global;

  // write out the asset files
  yield this.files;

  // write out mapping
  yield mkdir(this.installPath);
  this.deps = yield mapping.update(this.deps);

  // pack the mapping
  var pack = Pack(this.deps);
  this.dev && pack.development();
  var src = pack.pack(rel);

  // logging
  this.emit('run', rel);
  debug('ran: %s', rel);

  return src;
});

/**
 * Get all the dependencies of a `file`.
 *
 * @param {File} file
 * @api private
 */

Duo.prototype.dependencies = function *(file) {
  var out = this.deps;

  var cache = clone(this.mapping[file.id] || {});
  var includes = this.includes;
  var paths = [];
  var gens = [];

  // logging
  debug('parsing: %s', file.id)

  // already visited
  if (out[file.id]) {
    debug('%s, already parsed. ignoring', file.id);
    return;
  }

  // included manually
  if (cache.include) {
    out[file.id] = cache;
    return;
  }

  // check if the file has been modified
  if (file.mtime == cache.mtime) {
    debug('%s: has not been modified. skip parsing', file.id);
    out[file.id] = cache;
    paths = values(cache.deps);
    gens = [];

    // update the file
    file.set(cache);

    // if a non-supported file type, bundle
    !rsupported.test(file.type) && this.files.push(this.bundle(file.id));

    // recurse the dependency's dependencies
    var gens = this.recurse(paths);
    yield this.parallel(gens);
    return;
  }

  // load the file
  yield file.load();

  // Not a supported file type, don't parse any farther
  // But include in duo.json, for symlinking / copying
  if (!rsupported.test(file.type)) {
    if (file.entry) throw error('%s: ".%s" not supported', file.id, file.type);
    this.files.push(this.bundle(file.id));
    delete file.attrs.src;
    out[file.id] = file.json();
    return;
  }

  // Parse content for dependencies
  var deps = file.dependencies();
  var depmap = {};

  // logging
  debug('%s deps: %j', file.id, deps)

  // download and resolve the dependencies
  for (var i = 0, dep; dep = deps[i++];) {
    depmap[dep] = includes[dep] ? dep : this.dependency(dep, file, this.entryFile);
  }

  // resolve dependencies from entry files,
  // and remove unresolved deps
  depmap = compact(yield depmap);
  paths = values(depmap);
  gens = [];

  // update the file with the resolved dependencies
  file.set({ deps: depmap });
  out[file.id] = file.json();

  // recurse the dependency's dependencies
  var gens = this.recurse(paths);
  yield this.parallel(gens);
  return;
};

/**
 * Create generators to recurse the next layer of dependencies.
 *
 * @param {Array} paths
 * @return {Array}
 * @api private
 */

Duo.prototype.recurse = function (paths) {
  var includes = this.includes;
  var gens = [];
  var path;
  var file;

  for (var i = 0, path; path = paths[i++];) {
    if (includes[path]) continue;
    path = resolve(this.root, path);

    file = this.file({
      root: this.findroot(path),
      path: path
    });

    gens.push(this.dependencies(file));
  }

  return gens;
};

/**
 * Resolve a dependency by `dep`, from `file` with an `entry`.
 *
 * @param {String} dep
 * @param {File} file
 * @param {File} entry
 * @return {String}
 * @api private
 */

Duo.prototype.dependency = function *(dep, file, entry) {

  // ignore http dependencies
  if (http(dep)) {
    debug('%s: ignoring dependency "%s"', file.id, dep)
    return false;
  }

  // local dependency
  var local = yield this.resolve(dep, file, this.entryFile);
  if (local) return relative(entry.root, local);

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
  var path = pkg.path(parse(dep).path || 'component.json');
  var pkgfile = this.file({ root: pkg.path(), path: path });
  var resolved = yield this.resolve(path, pkgfile, this.entryFile);

  // logging
  !resolved && debug('%s: cannot resolve "%s"', file.id, dep);

  // return resolved or false
  return resolved
    ? relative(entry.root, resolved)
    : false;
};

/**
 * Resolve local dependencies by `dep`, from `file` with an `entry`.
 *
 * @param {String} dep
 * @param {String} root
 * @return {String} path
 * @api private
 */

Duo.prototype.resolve = function *(dep, file, entry) {
  var ext = extension(dep) ? '' : '.' + entry.type;
  var ret;

  if (this.manifestName == basename(dep)) {
    // component
    var json = this.json(resolve(file.root, dep));
    var entrypoint = main(json, entry.type) || 'index.' + entry.type;
    ret = resolve(file.root, dirname(dep), entrypoint);
  } else if ('/' == dep[0]) {
    // absolute path (relative to app/component root)
    var relroot = this.findroot(file.path);
    ret = join(relroot, dep.replace(relroot, ''));
  } else if ('..' == dep.slice(0, 2)) {
    // relative
    ret = resolve(dirname(file.path), dep);
  } else if ('./' == dep.slice(0, 2)) {
    // relative
    ret = resolve(dirname(file.path), dep);
  } else if ('css' == entry.type && (yield relative(resolve(dirname(file.path), dep)))) {
    // hack to support relative paths without "./"
    // lots of for CSS urls with no "./" unfortunately
    // example "fonts/whatever"
    ret = resolve(dirname(file.path), dep);
  }

  // not found
  if (!ret) return;

  // Remove any hashes, querystrings, etc.
  //
  // Example: fonts in bootstrap
  ret = pathname(ret);

  // try
  // ./file.ext
  // ./file/index.ext
  return yield exists([
    ret + ext,
    join(ret, 'index' + ext)
  ]);

  // check filesystem for relative asset
  function *relative(path) {
    path = pathname(path);
    if (!extension(path)) return false;
    return yield exists(path);
  }
};

/**
 * Create a file with `attrs`.
 *
 * @param {Object} attrs
 * @return {File}
 * @api private
 */

Duo.prototype.file = function (attrs) {
  attrs.root = attrs.root || this.root;
  return new File(attrs, this);
};

/**
 * Create a package from a `dep` with `json`.
 *
 * @param {String} dep
 * @param {Object} json
 * @return {Package|null}
 * @api private
 */

Duo.prototype.package = function (dep, json) {
  var gh = this.finddeps(parse(dep), json);
  if (!gh) return null;

  // initialize the package
  var pkg = Package(gh.package, gh.ref)
    .directory(this.installPath);

  // pass the token in, if we have one
  this.tok && pkg.token(this.tok);

  // forward package events to duo
  pkg
    .once('resolving', this.forward('resolving'))
    .once('installing', this.forward('installing'))
    .once('resolve', this.forward('resolve'))
    .once('install', this.forward('install'));

  return pkg;
};

/**
 * Find the repo in the `jsons`'s dependencies.
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

  if (this.dev && json == this.manifest) {
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
 * TODO: fix this for windows.
 *
 * @param {String} path
 * @return {String} root
 * @api private
 */

Duo.prototype.findroot = function (path) {
  var root = this.root;

  while (path != '.' && path != root && !slug(path)) {
    path = dirname(path);
  }

  if (path == '.') {
    throw error('could not find root for %s', path);
  }

  return path;

  function slug(path) {
    return parse.slug.test(basename(path));
  }
};

/**
 * Parallelize an array of generators with `concurrency`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

Duo.prototype.parallel = function (arr) {
  return parallel(arr, this._concurrency);
};

/**
 * Safely read a JSON file by `path`, with caching.
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

Duo.prototype.json = function (path) {
  try {
    return require(path);
  } catch(e) {
    return {};
  }
};

/**
 * Copy over assets from a `path` relative to the assets path. This will symlink
 * unless `duo.copy(true)` has been set.
 *
 * @param {String} path
 * @return {Duo}
 */

Duo.prototype.bundle = function *(path) {
  var dest = join(this.assetPath, path);
  var fn = this._copy ? cp : fs.symlink;
  var action = this._copy ? 'copying' : 'symlinking';

  // mkdir -p
  yield mkdir(dirname(dest));

  // fullpath
  path = join(this.root, path);

  try {
    debug('%s: %s => %s', action, path, dest);
    yield fn(path, dest);
  } catch (e) {
    // ignore symlinks that already exist
    if ('EEXIST' != e.code) throw e;
  }

  return this;
};

/**
 * Forward events with a `name`, adding the Duo instance as the final argument.
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */

Duo.prototype.forward = function (name) {
  var duo = this;
  return function () {
    var args = slice.call(arguments);
    var ctx = this;
    args = [name].concat(args).concat(ctx);
    duo.emit.apply(duo, args);
    return ctx;
  };
};

/**
 * Get the extension of a `path`, without the leading period.
 *
 * @param {String} path
 * @return {String} ext
 */

function extension(path) {
  return extname(path).slice(1);
}

/**
 * Convenience to turn a `msg` with placeholders into a proper `Error`.
 *
 * @param {String} msg
 * @return {Error}
 */

function error(msg) {
  var args = slice.call(arguments, 1);
  var msg = fmt.apply(fmt, [msg].concat(args));
  return new Error(msg);
}

/**
 * Strip a querystring or hash fragment from a `path`.
 *
 * @param {String} path
 * @return {String}
 */

function pathname(path) {
  return path
    .split('?')[0]
    .split('#')[0];
}

/**
 * Check if `url` is an HTTP URL.
 *
 * @param {String} path
 * @param {Boolean}
 */

function http(url) {
  return 'http' == url.slice(0, 4)
    || '://' == url.slice(0, 3)
    || false;
}

/**
 * Get the values of an `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 */

function values(obj) {
  if (!obj) return [];
  return Object.keys(obj).map(function (k) {
    return obj[k];
  });
}

/**
 * Remove empty values from an `obj`.
 *
 * @param {Object} obj
 * @return {Object}
 */

function compact(obj) {
  var out = {};

  for (var k in obj) {
    if (obj[k]) out[k] = obj[k];
  }

  return out;
}
