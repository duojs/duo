
/**
 * Module dependencies.
 */

var debug = require('debug')('duo:mapping');
var atomic = require('atomic-json');
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
  debug('initializing with %s', path);
  this.atomic = atomic(path);
  this.path = path;
  this.data = null;
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
  debug('read');
  var path = this.path;
  var exists = yield fs.exists(path);
  if (!exists) {
    debug('%s does not exist', path);
    return false;
  }

  if (!this.data) {
    debug('reading from disk');
    var obj = yield fs.readFile(path, 'utf8');
    this.data = JSON.parse(obj);
    debug('read from disk');
  }

  return this.data;
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
  debug('write to disk');
  this.atomic(json, function (err, data) {
    debug('written to disk');
  });
};
