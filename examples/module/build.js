(function outer(modules, cache, entry) {var previousRequire = typeof require == "function" && require;function newRequire(name, jumped){if(!cache[name]) {if(!modules[name]) {var currentRequire = typeof require == "function" && require;if (!jumped && currentRequire) return currentRequire(name, true);if (previousRequire) return previousRequire(name, true);throw new Error('Cannot find module \'' + name + '\'');}var m = cache[name] = {exports:{}};modules[name][0].call(m.exports, function(x){var id = modules[name][1][x];return newRequire(id ? id : x);},m,m.exports,outer,modules,cache,entry);}return cache[name].exports;}for(var i=0;i<entry.length;i++) newRequire(entry[i]);return newRequire;})({
1: [function(require, module, exports) {


var bind = require('ianstormtaylor/bind@0.0.2/index.js');

console.log(bind);

}, {"ianstormtaylor/bind@0.0.2/index.js":2}],

2: [function(require, module, exports) {


try {
  var bind = require('bind');
} catch (e) {
  var bind = require('bind-component');
}

var bindAll = require('bind-all');


/**
 * Expose `bind`.
 */

module.exports = exports = bind;


/**
 * Expose `bindAll`.
 */

exports.all = bindAll;


/**
 * Expose `bindMethods`.
 */

exports.methods = bindMethods;


/**
 * Bind `methods` on `obj` to always be called with the `obj` as context.
 *
 * @param {Object} obj
 * @param {String} methods...
 */

function bindMethods (obj, methods) {
  methods = [].slice.call(arguments, 1);
  for (var i = 0, method; method = methods[i]; i++) {
    obj[method] = bind(obj, obj[method]);
  }
  return obj;
}
}, {"bind":3,"bind-all":4}],

3: [function(require, module, exports) {

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

}, {}],

4: [function(require, module, exports) {


try {
  var bind = require('bind');
  var type = require('type');
} catch (e) {
  var bind = require('bind-component');
  var type = require('type-component');
}

module.exports = function (obj) {
  for (var key in obj) {
    var val = obj[key];
    if (type(val) === 'function') obj[key] = bind(obj, obj[key]);
  }
  return obj;
};
}, {"bind":3,"type":5}],

5: [function(require, module, exports) {


/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

}, {}]}, {}, [1])

