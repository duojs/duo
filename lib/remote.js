/**
 * Module dependencies
 */

var Package = require('duo-package');
var parse = require('./parse');

/**
 * Export `Remote`
 */

module.exports = Remote;

/**
 * Initialize `Remote`
 *
 * @param {String} dep
 * @return {Remote}
 */

function Remote(dep) {
  if (!(this instanceof Remote)) return new Remote(dep);
}
