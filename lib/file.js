/**
 * Module dependencies
 */

var debug = require('debug')('duo-file');
var transform = require('./transform');
var clone = require('component-clone');
var delegate = require('delegates');
var filedeps = require('file-deps');
var extend = require('extend.js');
var exists = require('co-exists');
var stat = require('fs').statSync;
var thunk = require('thunkify');
var mask = require('json-mask');
var path = require('path');
var relative = path.relative;
var extname = path.extname;
var resolve = path.resolve;
var fs = require('co-fs');

/**
 * Export `File`
 */

module.exports = File;

/**
 * Thunks
 */

transform.run = thunk(transform.run);

/**
 * duo.json fields
 */

var fields = 'id,type,mtime,src,deps,entry';

/**
 * Initialize `File`
 *
 * @param {Object} attrs
 * @param {Duo} duo
 * @return {File}
 * @api public
 */

function File(attrs, duo) {
  if (!(this instanceof File)) return new File(attrs, duo);
  this.attrs = clone(attrs || {});
  this.duo = duo;

  var type = attrs.type ? '.' + attrs.type : '';
  var path = attrs.path || 'source' + type;

  // initial attrs
  this.attrs.path = resolve(attrs.root, path);
  this.attrs.type = attrs.type || extension(this.path);
  this.attrs.id = relative(duo.root, this.path);
  this.attrs.mtime = attrs.mtime || this.modified(this.path);
}

/**
 * Delegates
 */

delegate(File.prototype, 'attrs')
  .access('id')
  .access('src')
  .access('raw')
  .access('type')
  .access('root')
  .access('path')
  .access('entry')
  .access('mtime');

delegate(File.prototype, 'duo')
  .method('include');

/**
 * Get the files dependencies
 *
 * @return {Array}
 * @api public
 */

File.prototype.dependencies = function() {
  if (this.deps) return this.deps;
  if (!this.src) return [];
  return this.deps = filedeps(this.src, this.type);
};

/**
 * Load the files source
 * and run the transforms
 *
 * @api public
 */

File.prototype.load = function *() {
  if (this.src) return this;

  // read the file
  this.attrs.src = this.raw = this.raw
    || (yield fs.readFile(this.path, 'utf8'));

  // transform the file and update attributes
  var entry = this.entry ? this : this.duo.entryFile;
  var res = yield transform.run(this, entry);
  this.set(res[0].json());

  return this;
}

/**
 * Check if the path exists,
 * unless we already have the raw source
 *
 * @return {Boolean}
 * @api public
 */

File.prototype.exists = function *() {
  if (this.raw) return true;
  else return yield exists(this.path);
};

/**
 * Set additional attributes
 *
 * @param {Object} attrs
 * @return {File}
 * @api public
 */

File.prototype.set = function(attrs) {
  extend(this.attrs, attrs || {});
  return this;
}

/**
 * Get the JSON representation of this file
 *
 * @return {Object}
 * @api public
 */

File.prototype.json =
File.prototype.toString = function() {
  var json = clone(this.attrs);
  if (!json.entry) delete json.entry;
  return mask(json, fields);
};

/**
 * Get the mtime, if the path
 * doesn't exist, return the current date
 *
 * @param {String} path
 * @return {Number}
 * @api private
 */

File.prototype.modified = function(path) {
  try {
    return stat(path).mtime.getTime();
  } catch (e) {
    return (new Date()).getTime();
  }
}

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
