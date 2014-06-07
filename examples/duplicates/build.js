(function outer(modules, cache, entry) {var previousRequire = typeof require == "function" && require;function newRequire(name, jumped){if(!cache[name]) {if(!modules[name]) {var currentRequire = typeof require == "function" && require;if (!jumped && currentRequire) return currentRequire(name, true);if (previousRequire) return previousRequire(name, true);throw new Error('Cannot find module \'' + name + '\'');}var m = cache[name] = {exports:{}};modules[name][0].call(m.exports, function(x){var id = modules[name][1][x];return newRequire(id ? id : x);},m,m.exports,outer,modules,cache,entry);}return cache[name].exports;}for(var i=0;i<entry.length;i++) newRequire(entry[i]);return newRequire;})({
1: [function(require, module, exports) {


var a = require('component/event@0.1.0');
var b = require('component/event@0.1.1');

}, {"component/event@0.1.0":2,"component/event@0.1.1":3}],

2: [function(require, module, exports) {


/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

}, {}],

3: [function(require, module, exports) {


/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture || false);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture || false);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

}, {}]}, {}, [1])

