/**
 * Module Dependencies
 */

var tmp = require('./template.jade');

/**
 * Jade
 */

var str = tmp({
  who: 'everyone'
});

/**
 * Log
 */

console.log(str);
