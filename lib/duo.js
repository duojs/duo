
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
  this.cache(true);

  this.assets = [];
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
 * Get or set standalone `name`, this will be used
 * to create a standalone JS (umd).
 *
 * @param {String} name
 * @return {String|Duo}
 * @api public
 */

Duo.prototype.standalone = function(name){
  if (!arguments.length) return this.umd;
  this.umd = name;
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
 * Get or set whether the cache should be used
 *
 * @param {Boolean} value (optional)
 * @return {Duo|Boolean}
 * @api public
 */

Duo.prototype.cache = function (value) {
  if (!arguments.length) return this._cache;
  this._cache = value;
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
 * Write the built source to a `path`, which defaults
 * to the same name as the entry file's name.
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
 * - Loads core duo plugins.
 * - Map out the dependency grpah.
 * - Add in the manually included files.
 * - Write the assets to the `buildTo()` path.
 * - Write out the map of the dependency graph to `components/duo.json`.
 * - Build the source by passing the `mapping` into duo-pack.
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
  var opts = {};

  // logging
  this.emit('running', rel);
  debug('running: %s', rel);

  // idempotent across runs
  this.assets = [];

  // add core plugins
  this
    .use(compat())
    .use(stoj());

  // try to load duo.json mapping
  if (this.cache()) this.mapping = yield mapping.read();

  // ensure that the entry exists
  if (!(yield file.exists())) {
    throw error('cannot find entry: %s', rel);
  }

  // fetch the map of the dependency graph
  var deps = yield this.dependencies(file);

  // add "includes" to dependency mapping
  deps = extend(deps, this.includes);

  // add global
  if (global) deps[rel].global = global;

  // write out the asset files in parallel
  yield this.parallel(this.assets);

  // write out mapping
  yield mkdir(this.installPath());
  deps = yield mapping.update(deps);

  // standalone?
  if (this.standalone()) {
    deps[rel].name = this.standalone();
    opts.umd = true;
  }

  // pack the mapping
  var pack = Pack(deps, opts);
  if (this.development()) pack.development();
  var src = pack.pack(rel);

  // logging
  this.emit('run', rel);
  debug('ran: %s', rel);

  return src;
});

/**
 * Recursively transform, parse and fetch the dependencies of `file`.
 * Returns a flat `map` of the full dependency graph.
 *
 * - `this.mapping` is a cache to only build files that have been changed.
 * - `map` is a current snapshot of the dependency graph.
 * - `map` gets built as we recurse.
 *
 * @param {File} file
 * @param {Object} map
 * @return {Object}
 * @api private
 */

Duo.prototype.dependencies = function *(file, map) {
  map = map || {};

  var json = clone(this.mapping[file.id] || {});
  var includes = this.includes;
  var paths = [];
  var gens = [];

  // logging
  debug('parsing: %s', file.id);

  var isCached = file.mtime == json.mtime;
  var isIncluded = json.include;
  var isParsed = map[file.id];

  // `file` already visited
  if (isParsed) {
    debug('%s, already parsed. ignoring', file.id);
    return map;
  }

  // `file` included manually already
  if (isIncluded) {
    map[file.id] = json;
    return map;
  }

  // check if the `file` has been modified
  // if not, skip parsing and recurse its
  // dependencies immediately.
  if (this.cache() && isCached) {
    debug('%s: has not been modified. skip parsing', file.id);
    map[file.id] = json;
    paths = values(json.deps);
    gens = [];

    // update the file with the cached
    // dependency mapping
    file.set(json);

    // bundle if there is a non-supported file type
    if (!supported(file.type)) this.assets.push(this.bundle(file.id));

    // recurse the dependency's dependencies
    var gens = this.recurse(paths, map);
    yield this.parallel(gens);
    return map;
  }

  // load the file, applying plugin transforms
  yield file.load();

  // not a supported file type, don't parse any farther
  // but include in duo.json, for symlinking or copying
  if (!supported(file.type)) {
    this.assets.push(this.bundle(file.id));
    delete file.attrs.src;
    map[file.id] = file.json();
    return map;
  }

  // parse content for dependencies
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
  map[file.id] = file.json();

  // recurse the dependency's dependencies
  var gens = this.recurse(paths, map);
  yield this.parallel(gens);
  return map;
};

/**
 * Create generators to recurse the next layer
 * of dependencies in the dependency graph
 *
 * @param {Array} paths
 * @param {Object} map
 * @return {Array}
 * @api private
 */

Duo.prototype.recurse = function (paths, map) {
  var includes = this.includes;
  var gens = [];
  var path;
  var file;
  var root;

  for (var i = 0, path; path = paths[i++];) {
    if (includes[path]) continue;
    path = this.path(path);
    root = this.findRoot(path);

    file = this.file({
      root: root,
      path: path
    });

    gens.push(this.dependencies(file, map));
  }

  return gens;
};

/**
 * Resolve a single dependency's path. Supports local and remote dependencies.
 * Fetches remote packages to components/ to resolve remote paths.
 *
 * Examples:
 *
 *  1. this.dependency('./one.js', file, entry)
 *      => lib/one/one.js
 *
 *  2. this.dependency('component/tip', file, entry)
 *      => components/component-tip@master/index.js
 *
 *  3. this.dependency('yields/skeleton', file, entry)
 *      => components/yields-skeleton@master/skeleton.css
 *
 *  Where:
 *
 *    `file` is the current file with the dependency `dep`.
 *    `entry` is the root file you passed into Duo.
 *
 * @param {String} dep
 * @param {File} file
 * @param {File} entry
 * @return {String|Boolean}
 * @api private
 */

Duo.prototype.dependency = function *(dep, file, entry) {

  // ignore http dependencies
  if (http(dep)) {
    debug('%s: ignoring dependency "%s"', file.id, dep)
    return false;
  }

  // `dep` is a local dependency
  var local = yield this.resolve(dep, file, this.entry());
  if (local) return relative(entry.root, local);

  // `dep` is a remote dependency
  var pkg = this.package(dep, file);
  if (!pkg) {
    debug('%s: cannot resolve "%s"', file.id, dep);
    return false;
  }

  // install the dependency from github
  // or another remote to 'components/'
  yield pkg.fetch();

  // resolve the remote dependency's path
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
 * Resolve the full local path of `dep`.
 *
 * TODO: clean & move this function into `duo-resolve`.
 *
 * Examples:
 *
 *   1. Local dependency:
 *
 *     this.resolve('./one.js', file, entry)
 *       => lib/one/one.js
 *
 *   2. Remote dependency (after it's installed):
 *
 *     this.resolve('$HOME/components/yields-skeleton@0.0.1/component.json', file, entry)
 *       => $HOME/components/yields-skeleton@0.0.1/skeleton.css
 *
 *  Where:
 *
 *    `file` is the current file with the dependency `dep`.
 *    `entry` is the root file you passed into Duo.
 *
 * @param {String} dep
 * @param {String} root
 * @return {String} path
 * @api private
 */

Duo.prototype.resolve = function *(dep, file, entry) {
  var isManifest = this.manifest() == basename(dep);
  var ext = extension(dep) ? '' : '.' + entry.type;
  var path = resolve(dirname(file.path), dep);
  var isRelative = './' == dep.slice(0, 2);
  var isParent = '..' == dep.slice(0, 2);
  var isAbsolute = '/' == dep[0];
  var ret;

  if (isManifest) {
    // `dep` is a component.json
    var json = readJson(resolve(file.root, dep));
    var entrypoint = main(json, entry.type) || 'index.' + entry.type;
    ret = resolve(file.root, dirname(dep), entrypoint);
  } else if (isAbsolute) {
    // `dep` is an absolute path (relative to app or component root)
    var relroot = this.findRoot(file.path);
    ret = join(relroot, dep.replace(relroot, ''));
  } else if (isParent) {
    // `dep` is a parent path with ".."
    ret = path;
  } else if (isRelative) {
    // `dep` is a relative path with "./"
    ret = path;
  } else if (yield isRelativeCSS(entry, path)) {
    // Hack to support for CSS relative paths without "./"
    // Example: body { background-image: url('image.jpg'); }
    ret = path;
  }

  // Could not resolve
  if (!ret) return;

  // Strip any hashes, querystrings, etc from path.
  // fonts/glyphicons-halflings-regular.eot?#iefix
  ret = stripPath(ret);

  // does one of these file paths exist?
  //
  // ./file.{{ext}}
  // ./file/index.{{ext}}
  return yield exists([
    ret + ext,
    join(ret, 'index' + ext)
  ]);

  // check filesystem for relative asset
  function *isRelativeCSS(entry, path) {
    if ('css' != entry.type) return false;
    path = stripPath(path);
    if (!extension(path)) return false;
    return yield exists(path);
  }
};

/**
 * Helper to create a file with `attrs`.
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
 * Helper to create a package from a `dep` with `file`.
 *
 * - Finds the necessary information to fetch `dep`
 * - Adds in our github token
 * - Sets up the events
 *
 * Examples:
 *
 *   1. "component/emitter": "0.1.0" in our manifest
 *
 *     var pkg = this.package('emitter', file);
 *     pkg.slug(); => component/emitter@0.1.0
 *
 *   2. require('component/emitter@master:index.js')
 *
 *     var pkg = this.package('component/emitter@master:index.js');
 *     pkg.slug(); => component/emitter@master
 *
 *
 * @param {String} dep
 * @param {File} file
 * @return {Package|null}
 * @api private
 */

Duo.prototype.package = function (dep, file) {
  var manifest = readJson(join(file.root, this.manifest()));
  var gh = this.findDependency(dep, manifest);
  if (!gh) return null;

  var token = this.token();

  // initialize the package
  var pkg = Package(gh.package, gh.ref);
  pkg.directory(this.installPath());
  if (token) pkg.token(token);

  // forward package events to duo
  pkg
    .once('resolving', this.forward('resolving'))
    .once('installing', this.forward('installing'))
    .once('resolve', this.forward('resolve'))
    .once('install', this.forward('install'));

  return pkg;
};

/**
 * Piece together the remote repository information from the dependency `dep`.
 *
 * - Consults the manifest for additional information, when needed.
 * - Includes development dependencies in when `development()` is set
 *
 * Examples:
 *
 *   1. specific dependency. no `manifest`:
 *
 *     this.findDependency('component/emitter', {})
 *     => {
 *          package: 'component/emitter',
 *          user: 'component',
 *          repo: 'emitter',
 *          ref: '*'
 *        }
 *
 *   2. vague dependency. "component/emitter": "0.1.0" is in the `manifest`:
 *
 *     this.findDependency('emitter', manifest)
 *     => {
 *          package: 'component/emitter',
 *          user: 'component',
 *          repo: 'emitter',
 *          ref:  '0.1.0'
 *        }
 *
 *   3. specific dependency. "component/emitter": "0.1.0" is in the `manifest`:
 *
 *     this.findDependency('component/emitter@1.0.0', manifest)
 *     => {
 *          package: 'component/emitter',
 *          user: 'component',
 *          repo: 'emitter'
 *          ref: '0.1.0'
 *        }
 *
 * @param {String} dep
 * @param {Object} manifest
 * @return {Object}
 * @api private
 */

Duo.prototype.findDependency = function(dep, manifest) {
  var gh = parse(dep);

  // We have all the information we need from `dep`.
  // Set the `package` key and return.
  if (gh.user && gh.repo && gh.ref) {
    gh.package = gh.user + '/' + gh.repo;
    return gh;
  }

  var dev = this.development();
  var deps = manifest.dependencies || {};
  var rext = /([\.][a-z]+)?/;

  // Include development dependencies if `development(true)` is set.
  if (dev && manifest == this.json) {
    deps = extend(deps, manifest.development || {});
  }

  // Build a regexp based on if we have the `user` key or not.
  // If we have the `user` key, our search is more specific.
  var re = gh.user
    ? new RegExp('^' + gh.user + '[\\/:]' + gh.repo + rext.source + '$', 'i')
    : new RegExp('([\\/:])' + gh.repo + rext.source + '$', 'i');

  // Not enough information yet.
  // Search through the manifest for our dependency.
  for (var dep in deps) {
    if (re.test(dep) || dep.replace('/', '-') == gh.repo) {
      gh.package = dep;
      gh.ref = deps[dep];
      return gh;
    }
  }

  // We have the `user` and `repo` keys, but not the `ref`.
  // Although vague, we have enough information to find our dependency.
  // Set `ref` to `*` and add in our `package` key.
  if (gh.user && gh.repo) {
    gh.package = gh.user + '/' + gh.repo;
    gh.ref = '*';
    return gh;
  }

  // Not enough information to find the dependency.
  return null;
};

/**
 * Given a `path`, find the root.
 * TODO: fix this for windows.
 *
 * - `root` is relative. It could be the project `root` or a component's `root`
 *
 * Examples:
 *
 *   1. Project root (app):
 *
 *     this.findRoot('$HOME/app/lib/one/one.js')
 *     => $HOME/app
 *
 *   2. Component root
 *
 *     this.findRoot('$HOME/app/components/component-reactive@1.2.0/lib/index.js')
 *     => $HOME/app/components/component-reactive@1.2.0
 *
 * @param {String} path
 * @return {String} root
 * @api private
 */

Duo.prototype.findRoot = function (path) {
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
 * Copy over assets from a `path` relative to the assets path.
 * This will symlink unless `duo.copy(true)` has been set.
 *
 * @param {String} path
 * @return {Duo}
 */

Duo.prototype.bundle = function *(path) {
  var log = this.copy() ? 'copying' : 'symlinking';
  var action = this.copy() ? cp : fs.symlink;
  var dest = this.buildPath(path);
  var rm = fs.unlink;

  // mkdir -p
  yield mkdir(dirname(dest));

  // fullpath
  path = this.path(path);

  // try removing any existing symlink or file first
  try {
    yield rm(dest);
  } catch(e) {
    if ('ENOENT' != e.code) throw e;
  }

  // symlink or copy the file
  debug('%s: %s => %s', log, path, dest);
  yield action(path, dest);

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
 * Get the extension of a `path`, without the leading period.
 *
 * @param {String} path
 * @return {String} ext
 * @api private
 */

function extension(path) {
  return extname(path).slice(1);
}

/**
 * Convenience to turn a `msg` with placeholders into a proper `Error`.
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
 * Is the extension supported by Duo?
 *
 * @param {String} ext
 * @return {Boolean}
 * @api private
 */

function supported(ext) {
  return /^(js|css)$/.test(ext);
}

/**
 * Strip a querystring or hash fragment from a `path`.
 *
 * @param {String} path
 * @return {String}
 * @api private
 */

function stripPath(path) {
  return path
    .split('?')[0]
    .split('#')[0];
}

/**
 * Check if `url` is an HTTP URL.
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
 * Get the values of an `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api private
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
 * @api private
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
