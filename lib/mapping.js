
/**
 * Module dependencies.
 */

var atomic = require('atomic-json');
var extend = require('extend.js');
var thunk = require('thunkify');
var fs = require('co-fs');

/**
 * Export `Mapping`.
 */

module.exports = Mapping;

/**
 * Initialize a `Mapping` with a `path`.
 *
 * @param {String} path
 * @return {Mapping}
 */

function Mapping(path) {
  if (!(this instanceof Mapping)) return new Mapping(path);
  this.atomic = atomic(path);
  this.path = path;
}

/**
 * Read the mapping from disk.
 *
 * TODO: update atomic() to return the object
 *
 * @return {Object}
 * @api public
 */

Mapping.prototype.read = function *() {
  try {
    var obj = yield fs.readFile(this.path, 'utf8');
    return JSON.parse(obj);
  } catch (e) {
    return {};
  }
};

/**
 * Return a thunk to update the mapping on disk with `json`.
 *
 * @param {Object} json
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

Mapping.prototype.update = function (json) {
  var self = this;
  return function (fn) {
    self.atomic(json, fn);
  };
};