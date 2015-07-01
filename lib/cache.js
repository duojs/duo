
/**
 * Module dependencies.
 */

var Cache = require('duo-cache');
var debug = require('debug')('duo:cache');
var each = require('co-each');
var values = require('object-values');

/**
 * Manages the available instances of the cache, allowing multiple
 * duo builders to operate on the same root dir in parallel.
 */

var instances = {};

exports = module.exports = function (file) {
  if (!(file in instances)) {
    debug('creating new cache instance');
    instances[file] = new Cache(file);
  }

  return instances[file];
};

exports.clean = function *() {
  debug('clearing out cache instance list');
  yield each(values(instances), function *(instance) {
    yield instance.clean();
  });
  instances = {};
};
