
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
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
 * Initialize a new `Duo` package with the path to the package's `root` folder.
 *
 * @param {String} root
 * @return {Duo}
 * @api public
 */

function Duo(root) {
  if (!(this instanceof Duo)) return new Duo(root);
  if (!root) throw error('duo requires a root directory');
  Emitter.call(this);
  this.root(root);
  this.manifest('component.json');
  this.installTo('components');
  this.buildTo('build');
  this.copy(false);
  this.development(false);
  this.concurrency(50);

  this.files = [];
  this.mapping = {};
  this.includes = {};
  this.json = readJson(this.path('component.json'));

  // plugins
  this.plugins = new Step;
  this.plugins.run = thunk(this.plugins.run);
}

/**
 * Inherit from `Emitter`.
 */

Duo.prototype.__proto__ = Emitter.prototype;

/**
 * Get or set the entry file for the package.
 *
 * You can either specify a single `path` to an entry file:
 *
 *   duo.entry('index.js');
 *
 * Or you can pass a source string and a file type:
 *
 *   duo.entry('var a = 0;', 'js');
 *
 * @param {String} path or source (optional)
 * @param {String} type (optional)
 * @return {Duo|File}
 * @api public
 */

Duo.prototype.entry = function () {
  switch (arguments.length) {
    case 0:
      return this._entry;
    case 1:
      this._entry = this.file({ path: arguments[0], entry: true });
      return this;
    case 2:
      this._entry = this.file({ raw: arguments[0], type: arguments[1], entry: true });
      return this;
  }
};

/**
 * Get or set the root `dir` for the package.
 *
 * @param {String} dir (optional)
 * @return {Duo|String}
 * @api public
 */

Duo.prototype.root = function (dir) {
  if (!arguments.length) return this._root;
  this._root = dir;
  return this;
};

/**
 * Get or set the `token` to authenticate to GitHub with.
 *
 * @param {String} token (optional)
 * @return {Duo|String}
 * @api public
 */

Duo.prototype.token = function (token) {
  if (!arguments.length) return this._token;
  this._token = token;
  return this;
};

/**
 * Get or set the manifest `name` to read settings from.
 *
 * @param {String} name
 * @return {Duo|String}
 * @api public
 */

Duo.prototype.manifest = function (name) {
  if (!arguments.length) return this._manifest;
  this._manifest = name;
  return this;
};

/**
 * Get or set a global variable `name` to expose the entry file by.
 *
 * @param {String} name (optional)
 * @return {String|Duo}
 * @api public
 */

Duo.prototype.global = function (name) {
  if (!arguments.length) return this._global;
  this._global = name;
  return this;
};

/**
 * Get or set whether to install development dependencies.
 *
 * @param {Boolean} value (optional)
 * @return {Duo|Boolean}
 * @api public
 */

Duo.prototype.development = function (value) {
  if (!arguments.length) return this._development;
  this._development = value;
  return this;
};

/**
 * Get or set whether to copy built files instead of symlinking them.
 *
 * @param {Boolean} value (optional)
 * @return {Duo|Boolean}
 * @api public
 */

Duo.prototype.copy = function (value) {
  if (!arguments.length) return this._copy;
  this._copy = value;
  return this;
};

/**
 * Get or set the download concurrency `value`.
 *
 * @param {Number} value (optional)
 * @return {Duo|Number}
 * @api public
 */

Duo.prototype.concurrency = function (value) {
  if (!arguments.length) return this._concurrency;
  this._concurrency = value;
  return this;
};

/**
 * Get or set the `path` to install dependencies to.
 *
 * @param {String} path (optional)
 * @return {Duo|String}
 * @api public
 */

Duo.prototype.installTo = function (path) {
  if (!arguments.length) return this._installTo;
  this._installTo = path;
  return this;
};

/**
 * Get or set the `path` to build source to.
 *
 * @param {String} path (optional)
 * @return {Duo|String}
 * @api public
 */

Duo.prototype.buildTo = function (path) {
  if (!arguments.length) return this._buildTo;
  this._buildTo = path;
  return this;
};

/**
 * Use an async, sync or generator `plugin` function.
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
 * Resolve `paths...` relative to the root directories.
 *
 * @param {String} paths...
 * @return {String}
 * @api public
 */

Duo.prototype.path = function () {
  var strs = slice.call(arguments);
  strs.unshift(this.root());
  return path.join.apply(path, strs);
};

/**
 * Resolve `paths...` relative to the build directory.
 *
 * @param {String} paths...
 * @return {String}
 * @api public
 */

Duo.prototype.buildPath = function () {
  var strs = slice.call(arguments);
  strs.unshift(this.buildTo());
  return this.path.apply(this, strs);
};

/**
 * Resolve `paths...` relative to the install directory.
 *
 * @param {String} paths...
 * @return {String}
 * @api public
 */

Duo.prototype.installPath = function () {
  var strs = slice.call(arguments);
  strs.unshift(this.installTo());
  return this.path.apply(this, strs);
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
  var entry = this.entry();
  var dir = this.buildPath();
  var type = entry.type;
  var rel = entry.id;

  // resolve the path
  path = resolve(dir, path || rel);

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
  if (!this.entry()) return '';

  var path = this.installPath('duo.json');
  var mapping = Mapping(path);
  var global = this.global();
  var file = this.entry();
  var rel = file.id;

  // logging
  this.emit('running', rel);
  debug('running: %s', rel);

  // idempotent across runs
  this.files = [];

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
  var deps = yield this.dependencies(file);

  // includes to mapping
  deps = extend(deps, this.includes);

  // add global
  if (global) deps[rel].global = global;

  // write out the asset files
  yield this.files;

  // write out mapping
  yield mkdir(this.installPath());
  deps = yield mapping.update(deps);

  // pack the mapping
  var pack = Pack(deps);
  this.development() && pack.development();
  var src = pack.pack(rel);

  // logging
  this.emit('run', rel);
  debug('ran: %s', rel);

  return src;
});

/**
 * Get all the dependencies of a `file` and install them to `out`.
 *
 * @param {File} file
 * @param {Object} out
 * @return {Object}
 * @api private
 */

Duo.prototype.dependencies = function *(file, out) {
  out = out || {};

  var json = clone(this.mapping[file.id] || {});
  var includes = this.includes;
  var paths = [];

  // logging
  debug('parsing: %s', file.id);

  var isAsset = !rsupported.test(file.type);
  var isCached = file.mtime == json.mtime;
  var isIncluded = json.include;
  var isParsed = out[file.id];

  // already visited
  if (isParsed) {
    debug('%s, already parsed. ignoring', file.id);
    return out;
  }

  // included manually
  if (isIncluded) {
    out[file.id] = json;
    return out;
  }

  // check if the file has been modified
  if (isCached) {
    debug('%s: has not been modified. skip parsing', file.id);
    out[file.id] = json;
    paths = values(json.deps);

    // update the file
    file.set(json);

    // if a non-supported file type, bundle
    if (isAsset) this.files.push(this.bundle(file.id));

    // recurse the dependency's dependencies
    var gens = this.recurse(paths, out);
    yield this.parallel(gens);
    return out;
  }

  // load the file
  yield file.load();
  isAsset = !rsupported.test(file.type);

  // Not a supported file type, don't parse any farther
  // But include in duo.json, for symlinking / copying
  if (isAsset) {
    if (file.entry) throw error('%s: ".%s" not supported', file.id, file.type);
    this.files.push(this.bundle(file.id));
    delete file.attrs.src;
    out[file.id] = file.json();
    return out;
  }

  // Parse content for dependencies
  var deps = file.dependencies();
  var depmap = {};

  // logging
  debug('%s deps: %j', file.id, deps);

  // download and resolve the dependencies
  for (var i = 0, dep; dep = deps[i++];) {
    depmap[dep] = includes[dep] ? dep : this.dependency(dep, file, this.entry());
  }

  // resolve dependencies from entry files,
  // and remove unresolved deps
  depmap = compact(yield depmap);
  paths = values(depmap);

  // update the file with the resolved dependencies
  file.set({ deps: depmap });
  out[file.id] = file.json();

  // recurse the dependency's dependencies
  var gens = this.recurse(paths, out);
  yield this.parallel(gens);
  return out;
};

/**
 * Create generators to recurse the next layer of dependencies.
 *
 * @param {Array} paths
 * @param {Object} out
 * @return {Array}
 * @api private
 */

Duo.prototype.recurse = function (paths, out) {
  var includes = this.includes;
  var gens = [];
  var path;
  var file;
  var root;

  for (var i = 0, path; path = paths[i++];) {
    if (includes[path]) continue;
    path = this.path(path);
    root = this.findroot(path);

    file = this.file({
      root: root,
      path: path
    });

    gens.push(this.dependencies(file, out));
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
  var local = yield this.resolve(dep, file, this.entry());
  if (local) return relative(entry.root, local);

  // remote dependency
  var json = readJson(join(file.root, this.manifest()));
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
  var resolved = yield this.resolve(path, pkgfile, this.entry());

  // logging
  if (!resolved) debug('%s: cannot resolve "%s"', file.id, dep);

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
  var isManifest = this.manifest() == basename(dep);
  var isRelative = './' == dep.slice(0, 2);
  var isParent = '..' == dep.slice(0, 2);
  var isAbsolute = '/' == dep[0];
  var isRelativeCSS = 'css' == entry.type
    && (yield relative(resolve(dirname(file.path), dep)));
  var ret;

  if (isManifest) {
    // component
    var json = readJson(resolve(file.root, dep));
    var entrypoint = main(json, entry.type) || 'index.' + entry.type;
    ret = resolve(file.root, dirname(dep), entrypoint);
  } else if (isAbsolute) {
    // absolute path (relative to app/component root)
    var relroot = this.findroot(file.path);
    ret = join(relroot, dep.replace(relroot, ''));
  } else if (isParent) {
    // relative
    ret = resolve(dirname(file.path), dep);
  } else if (isRelative) {
    // relative
    ret = resolve(dirname(file.path), dep);
  } else if (isRelativeCSS) {
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
  attrs.root = attrs.root || this.root();
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
    .directory(this.installPath());

  // pass the token in, if we have one
  var token = this.token();
  token && pkg.token(token);

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

  var dev = this.development();
  var deps = json.dependencies || {};
  var rext = '([\.][a-z]+)?';

  if (dev && json == this.json) {
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
  var root = this.root();

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
  return parallel(arr, this.concurrency());
};

/**
 * Copy over assets from a `path` relative to the assets path. This will symlink
 * unless `duo.copy(true)` has been set.
 *
 * @param {String} path
 * @return {Duo}
 */

Duo.prototype.bundle = function *(path) {
  var dest = this.buildPath(path);
  var copy = this.copy();
  var fn = copy ? cp : fs.symlink;
  var action = copy ? 'copying' : 'symlinking';

  // mkdir -p
  yield mkdir(dirname(dest));

  // fullpath
  path = this.path(path);

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

/**
 * Safely read a JSON file by `path`, with caching.
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

function readJson(path) {
  try {
    return require(path);
  } catch(e) {
    return {};
  }
}