/**
 * Module dependencies
 */

var debug = require('debug')('duo-file');
var transform = require('./transform');
var clone = require('component-clone');
var filedeps = require('file-deps');
var exists = require('co-exists');
var extend = require('extend.js');
var exists = require('co-exists');
var stat = require('fs').statSync;
var fmt = require('util').format;
var thunk = require('thunkify');
var mask = require('json-mask');
var main = require('duo-main');
var path = require('path');
var relative = path.relative;
var basename = path.basename;
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
 * duo.json fields
 */

var fields = 'id,type,mtime,src,deps';

/**
 * Initialize `File`
 *
 * @param {Object} attrs
 * @param {String} root
 * @param {File} entry
 * @return {File}
 * @api public
 */

function File(attrs, file, duo) {
  if (!(this instanceof File)) return new File(attrs, file, duo);
  this.attrs = clone(attrs || {});
  this.file = file;
  this.duo = duo;

  var root = file ? file.root : this.root;

  // attrs
  this.attrs.type = extension(this.path);
  this.attrs.id = relative(root, this.path);
  this.attrs.mtime = attrs.mtime || mtime(this.path);
}

/**
 * Getters
 */

File.prototype = {
  get id() {
    return this.attrs.id;
  },

  get type() {
    return this.attrs.type;
  },

  get src() {
    return this.attrs.src;
  },

  get root() {
    return this.attrs.root;
  },

  get path() {
    return this.attrs.path;
  },

  get mtime() {
    return this.attrs.mtime;
  },

  get dependencies() {
    if (this.deps) return this.deps;
    if (!this.src) return [];
    return this.deps = filedeps(this.src, this.type);
  }
}

/**
 * Load the files source
 * and run the transforms
 *
 * @api public
 */

File.prototype.load = function *() {
  if (this.src) return this;
  var file = this.file ? clone(this.file.attrs) : {};
  this.attrs.src = yield fs.readFile(this.path, 'utf8');

  // transform the file and update attributes
  var res = yield transform.run(clone(this.attrs), file);
  this.set(res[0]);

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
