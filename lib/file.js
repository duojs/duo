/**
 * Module dependencies
 */

var debug = require('debug')('duo-file');
var transform = require('./transform');
var filedeps = require('file-deps');
var exists = require('co-exists');
var extend = require('extend.js');
var fmt = require('util').format;
var thunk = require('thunkify');
var main = require('duo-main');
var path = require('path');
var relative = path.relative;
var basename = path.basename;
var resolve = path.resolve;
var resolve = path.resolve;
var dirname = path.dirname;
var extname = path.extname;
var fs = require('co-fs');
var url = require('url');
var join = path.join;
var slice = [].slice;

/**
 * Export `File`
 */

module.exports = File;

/**
 * Thunks
 */

transform.run = thunk(transform.run);

/**
 * Initialize `File`
 *
 * @param {String} path
 * @param {String} root
 * @param {File} entry
 * @return {File}
 * @api public
 */

function File(path, root, entry) {
  if (!(this instanceof File)) return new File(path, root, entry);
  this.attrs = {};
  this.relative = relative(entry.root, path);
  this.type = extension(path);
  this.entry = entry;
  this.path = path;

  // cache
  this.cache = {};
}

/**
 * Get the file's dependencies
 *
 * @return {Array}
 * @api public
 */

File.prototype.dependencies = function *() {
  if (this.cache.deps) return this.cache.deps;
  var src = yield this.contents();
  var deps = this.cache.deps = filedeps(src, this.type);
  return deps;
};

/**
 * Get the file's contents
 *
 * @return {String}
 * @api public
 */

File.prototype.contents = function *() {
  if (this.cache.contents) return this.cache.contents;
  this.cache.contents = yield fs.readFile(this.path, 'utf8');
  var res = yield transform.run(this.json(), this.entry);

  // HACK update from response
  // TODO figure out a better
  // way to do this
  this.type = res[0].type;
  this.cache.contents = res[0].src;

  return this.cache.contents;
}

/**
 * Get the file's mtime
 */

File.prototype.mtime = function *() {
  if (this.cache.mtime) return this.cache.mtime;
  var stat = yield fs.stat(this.path);
  var mtime = this.cache.mtime = stat.mtime.getTime();
  return mtime;
};

/**
 * isEntry
 */

File.prototype.isEntry = function() {
  return !this.entry;
};


/**
 * Get the JSON representation of this file
 *
 * @return {Object}
 * @api public
 */

File.prototype.json = function() {
  var out = {};

  out.src = this.cache.contents;
  out.mtime = this.cache.mtime;
  out.id = this.relative;
  out.type = this.type;
  if (this.isEntry()) out.entry = true;

  return out;
};

/**
 * Debug
 *
 * @param {String} msg
 * @param {Mixed, ...} args
 * @return {Package}
 * @api private
 */

File.prototype.debug = function(msg) {
  var args = [].slice.call(arguments, 1);
  msg = fmt('%s: %s', this.relative, msg);
  debug.apply(debug, [msg].concat(args));
  return this;
};

/**
 * Error
 *
 * @param {String} msg
 * @param {Mixed, ...} args
 * @return {Error}
 * @api private
 */

File.prototype.error = function(msg) {
  msg = fmt('%s: %s', this.relative, msg.message || msg);
  var args = [].slice.call(arguments, 1);
  return new Error(fmt.apply(null, [msg].concat(args)));
};

/**
 * Static: Add a file transform
 */

File.use = function(fn) {
  File.plugins.push(fn);
  return this;
}

/**
 * Check if dep is an http url
 *
 * @param {String} path
 * @param {Boolean}
 * @api private
 */

// function http(url) {
//   return 'http' == url.slice(0, 4)
//     || '://' == url.slice(0, 3)
//     || false;
// }

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
 * Read JSON (cached)
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

function json(path) {
  try { return require(path) }
  catch(e) { return {} }
};

/**
 * Is generator?
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function generator(value){
  return value
    && value.constructor
    && 'GeneratorFunction' == value.constructor.name;
}
