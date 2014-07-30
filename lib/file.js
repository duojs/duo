/**
 * Module dependencies
 */

var debug = require('debug')('duo-file');
var transform = require('./transform');
var clone = require('component-clone');
var delegate = require('delegates');
var filedeps = require('file-deps');
var extend = require('extend.js');
var stat = require('fs').statSync;
var thunk = require('thunkify');
var mask = require('json-mask');
var path = require('path');
var relative = path.relative;
var extname = path.extname;
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

var fields = 'id,type,mtime,src,deps';

/**
 * Initialize `File`
 *
 * @param {Object} attrs
 * @param {File} entry
 * @param {Duo} duo
 * @return {File}
 * @api public
 */

function File(attrs, entry, duo) {
  if (!(this instanceof File)) return new File(attrs, entry, duo);
  this.attrs = clone(attrs || {});
  this.entry = entry;
  this.duo = duo;

  var root = entry ? entry.root : this.root;

  // initial attrs
  this.attrs.type = extension(this.path);
  this.attrs.id = relative(root, this.path);
  this.attrs.mtime = attrs.mtime || mtime(this.path);
}

/**
 * Delegates
 */

delegate(File.prototype, 'attrs')
  .access('id')
  .access('src')
  .access('type')
  .access('root')
  .access('path')
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
  var duo = this.duo;

  // read the file
  this.attrs.src = yield fs.readFile(this.path, 'utf8');

  // transform the file and update attributes
  var res = yield transform.run(this, this.entry || this);
  this.set(res[0].json());

  return this;
}

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

File.prototype.json = function() {
  var json = clone(this.attrs);
  return mask(json, fields);
};

/**
 * Get the mtime
 *
 * @param {String} path
 * @return {Number}
 * @api private
 */

function mtime(path) {
  return stat(path).mtime.getTime();
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
