
/**
 * Module dependencies.
 */

var debug = require('debug')('duo:mapping');
var Promise = require('native-or-bluebird');
var atomic = require('atomic-json');
var fs = require('co-fs');
var co = require('co');

var mappings = {};

/**
 * Export `Mapping`.
 */

module.exports = function (path) {
  if (!(path in mappings)) mappings[path] = new Mapping(path);
  return mappings[path];
};

/**
 * Initialize a `Mapping` with a `path`.
 *
 * @param {String} path
 * @return {Mapping}
 */

function Mapping(path) {
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
  var path = this.path;

  debug('read %s', path);
  if (this.data) return this.data;

  this.data = new Promise(co(function *(resolve) {
    debug('reading %s from disk', path);
    if (!(yield fs.exists(path))) {
      debug('%s does not exist', path);
      resolve({});
    }

    var str = yield fs.readFile(path, 'utf8');
    debug('read %s from disk', path);

    try {
      var obj = JSON.parse(str);
      resolve(obj);
    } catch (err) {
      debug('unable to parse %s', path);
      resolve({});
    }
  }));

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
  var path = this.path;
  debug('write %s to disk', path);

  this.atomic(json, function (err) {
    if (err) {
      debug('error attempting to write %s', path, err.stack);
    } else {
      debug('written %s to disk', path);
    }
  });
};
