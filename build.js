(function outer(modules, cache, entry) {var previousRequire = typeof require == "function" && require;function newRequire(name, jumped){if(!cache[name]) {if(!modules[name]) {var currentRequire = typeof require == "function" && require;if (!jumped && currentRequire) return currentRequire(name, true);if (previousRequire) return previousRequire(name, true);throw new Error('Cannot find module \'' + name + '\'');}var m = cache[name] = {exports:{}};modules[name][0].call(m.exports, function(x){var id = modules[name][1][x];return newRequire(id ? id : x);},m,m.exports,outer,modules,cache,entry);}return cache[name].exports;}for(var i=0;i<entry.length;i++) newRequire(entry[i]);return newRequire;})({
1: [function(require, module, exports) {

/**
 * Module Dependencies
 */

var uid = require('uid');
var events = require('events');
var infinity = require('infinity');

/**
 * UID
 */

console.log(uid(10));

}, {"uid":2,"events":3,"infinity":4}],

2: [function(require, module, exports) {

/**
 * Export `uid`
 */

module.exports = uid;

/**
 * Create a `uid`
 *
 * @param {String} len
 * @return {String} uid
 */

function uid(len) {
  len = len || 7;
  return Math.random().toString(35).substr(2, len);
}

}, {}],

3: [function(require, module, exports) {


/**
 * Module dependencies.
 */

var events = require('event');
var delegate = require('delegate');

/**
 * Expose `Events`.
 */

module.exports = Events;

/**
 * Initialize an `Events` with the given
 * `el` object which events will be bound to,
 * and the `obj` which will receive method calls.
 *
 * @param {Object} el
 * @param {Object} obj
 * @api public
 */

function Events(el, obj) {
  if (!(this instanceof Events)) return new Events(el, obj);
  if (!el) throw new Error('element required');
  if (!obj) throw new Error('object required');
  this.el = el;
  this.obj = obj;
  this._events = {};
}

/**
 * Subscription helper.
 */

Events.prototype.sub = function(event, method, cb){
  this._events[event] = this._events[event] || {};
  this._events[event][method] = cb;
};

/**
 * Bind to `event` with optional `method` name.
 * When `method` is undefined it becomes `event`
 * with the "on" prefix.
 *
 * Examples:
 *
 *  Direct event handling:
 *
 *    events.bind('click') // implies "onclick"
 *    events.bind('click', 'remove')
 *    events.bind('click', 'sort', 'asc')
 *
 *  Delegated event handling:
 *
 *    events.bind('click li > a')
 *    events.bind('click li > a', 'remove')
 *    events.bind('click a.sort-ascending', 'sort', 'asc')
 *    events.bind('click a.sort-descending', 'sort', 'desc')
 *
 * @param {String} event
 * @param {String|function} [method]
 * @return {Function} callback
 * @api public
 */

Events.prototype.bind = function(event, method){
  var e = parse(event);
  var el = this.el;
  var obj = this.obj;
  var name = e.name;
  var method = method || 'on' + name;
  var args = [].slice.call(arguments, 2);

  // callback
  function cb(){
    var a = [].slice.call(arguments).concat(args);
    obj[method].apply(obj, a);
  }

  // bind
  if (e.selector) {
    cb = delegate.bind(el, e.selector, name, cb);
  } else {
    events.bind(el, name, cb);
  }

  // subscription for unbinding
  this.sub(name, method, cb);

  return cb;
};

/**
 * Unbind a single binding, all bindings for `event`,
 * or all bindings within the manager.
 *
 * Examples:
 *
 *  Unbind direct handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * Unbind delegate handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * @param {String|Function} [event]
 * @param {String|Function} [method]
 * @api public
 */

Events.prototype.unbind = function(event, method){
  if (0 == arguments.length) return this.unbindAll();
  if (1 == arguments.length) return this.unbindAllOf(event);

  // no bindings for this event
  var bindings = this._events[event];
  if (!bindings) return;

  // no bindings for this method
  var cb = bindings[method];
  if (!cb) return;

  events.unbind(this.el, event, cb);
};

/**
 * Unbind all events.
 *
 * @api private
 */

Events.prototype.unbindAll = function(){
  for (var event in this._events) {
    this.unbindAllOf(event);
  }
};

/**
 * Unbind all events for `event`.
 *
 * @param {String} event
 * @api private
 */

Events.prototype.unbindAllOf = function(event){
  var bindings = this._events[event];
  if (!bindings) return;

  for (var method in bindings) {
    this.unbind(event, method);
  }
};

/**
 * Parse `event`.
 *
 * @param {String} event
 * @return {Object}
 * @api private
 */

function parse(event) {
  var parts = event.split(/ +/);
  return {
    name: parts.shift(),
    selector: parts.join(' ')
  }
}

}, {"event":5,"delegate":6}],

4: [function(require, module, exports) {

/**
 * Module dependencies
 */

var event = require('event');
var query = require('query');
var throttle = require('throttle');
var debounce = require('debounce');
var Emitter = require('emitter');

/**
 * Export `infinity`
 */

module.exports = infinity;

/**
 * Initialize `infinity`
 *
 * @param {Element|Window} container el
 * @return {infinity}
 * @api public
 */

function infinity(el) {
  if (!(this instanceof infinity)) return new infinity(el);
  this.el = el;
  this.isWindow = (el.self == el);
  this.views = [];
  this._margin = 0;
  this.throttle = throttle(this.refresh.bind(this), 200);
  this.debounce = debounce(this.refresh.bind(this), 100);
  event.bind(el, 'scroll', this.throttle);
  event.bind(el, 'scroll', this.debounce);
  event.bind(el, 'resize', this.debounce);
}

/**
 * Mixin `Emitter`
 */

Emitter(infinity.prototype);

/**
 * Add an element. You may pass any number of arguments
 * to be called on the load and unload functions
 *
 * ex. infinity.add(view.el, view)
 *
 * @param {Element} el
 * @param {Mixed, ...} args
 * @return {infinity}
 * @api public
 */

infinity.prototype.add = function(el) {
  var view = {};
  view.el = el;
  view.args = [].slice.call(arguments) || [];
  view.loaded = false;
  this.views.push(view);
  return this;
};

/**
 * Remove an element.
 *
 * ex. infinity.remove(el)
 *
 * @param {Element} el
 * @return {infinity}
 * @api public
 */

infinity.prototype.remove = function(el) {
  for (var i = 0, view; view = this.views[i]; i++) {
    if (el == view.el) {
      this.views.splice(i, 1);
      break;
    }
  }

  return this;
};


/**
 * Get the coordinated of the box
 *
 * @return {Object} coords
 * @api private
 */

infinity.prototype.box = function() {
  var el = this.el;
  var margin = this._margin;
  var box = {};

  if (!this.isWindow) {
    var rect = el.getBoundingClientRect();
    box.top = rect.top;
    box.left = rect.left;
    box.width = rect.width;
    box.height = rect.height;
  } else {
    box.top = 0;
    box.left = 0;
    box.height = el.innerHeight || document.documentElement.clientHeight;
    box.width = el.innerWidth || document.documentElement.clientWidth;
  }

  box.top -= margin;
  box.left -= margin;
  box.width += (margin * 2);
  box.height += (margin * 2);

  return box;
};

/**
 * Add margin to the box
 *
 * @param {Number} margin
 * @return {infinity}
 * @api public
 */

infinity.prototype.margin = function(margin) {
  this._margin = margin;
  return this;
};

/**
 * Is the element in view?
 *
 * @param {Object} view
 * @return {Boolean}
 * @api private
 */

infinity.prototype.visible = function(view) {
  var box = this._box;
  var pos = view.el.getBoundingClientRect();

  // only load if our view has dimensions
  if (0 === pos.width || 0 === pos.height) return false;

  // check viewport if window otherwise view
  return (this.isWindow) ? this.inViewport(pos, box)
                         : this.inView(pos, box);
};

/**
 * Is the element in view?
 *
 * @param {Object} pos
 * @param {Object} box
 * @return {Boolean}
 * @api private
 */

infinity.prototype.inView = function(pos, box) {
  return (
    pos.top < (box.top + box.height) &&
    pos.left < (box.left + box.width) &&
    (pos.top + pos.height) > box.top &&
    (pos.left + pos.width) > box.left
  );
};

/**
 * Is the element in the viewport?
 *
 * TODO: inViewport and inView could probably be consolidated
 * with some better math
 *
 * @param {Object} pos
 * @param {Object} box
 * @return {Boolean}
 * @api private
 */

infinity.prototype.inViewport = function(pos, box) {
  return (
    pos.bottom >= box.top &&
    pos.right >= box.left &&
    pos.top <= box.height &&
    pos.left <= box.width
  );
};

/**
 * Add a load function
 *
 * @param {Function} fn
 * @return {infinity}
 * @api public
 */

infinity.prototype.load = function(fn) {
  this.on('load', fn);
  return this;
};

/**
 * Add an unload function
 *
 * @param {Function} fn
 * @return {infinity}
 * @api public
 */

infinity.prototype.unload = function(fn) {
  this.on('unload', fn);
  return this;
};

/**
 * Refresh, loading and unloading elements.
 *
 * Used internally but may need to be called
 * manually if you are programmatically adjusting
 * elements.
 *
 * @return {infinity}
 * @api public
 */

infinity.prototype.refresh = function() {
  var visibles = [];
  var invisibles = [];

  this._box = this.box();

  // load / unload panes
  //
  // TODO: figure out a smarter way to not loop
  // through all the elements time but maintain
  // flexibility
  for (var i = 0, view; view = this.views[i]; i++) {
    var visible = this.visible(view);
    if (visible && !view.loaded) {
      visibles.push(view);
    } else if (!visible && view.loaded) {
      invisibles.push(view);
    }
  }

  if (visibles.length) {
    this.emit('loading');
    for (var i = 0, view; view = visibles[i]; i++) {
      this.emit.apply(this, ['load'].concat(view.args));
      view.loaded = true;
    }
  }

  if (invisibles.length) {
    this.emit('unloading');
    for (var i = 0, view; view = invisibles[i]; i++) {
      this.emit.apply(this, ['unload'].concat(view.args));
      view.loaded = false;
    }
  }

  return this;
};

/**
 * Unbind events
 *
 * @return {infinity}
 * @api public
 */

infinity.prototype.unbind = function() {
  event.unbind(this.el, 'scroll', this.throttle);
  event.unbind(this.el, 'scroll', this.debounce);
  event.unbind(this.el, 'resize', this.debounce);
  return this;
};

}, {"event":7,"query":8,"throttle":9,"debounce":10,"emitter":11}],

5: [function(require, module, exports) {


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

6: [function(require, module, exports) {


/**
 * Module dependencies.
 */

var matches = require('matches-selector')
  , event = require('event');

/**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, selector, type, fn, capture){
  return event.bind(el, type, function(e){
    if (matches(e.target, selector)) fn(e);
  }, capture);
  return callback;
};

/**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  event.unbind(el, type, fn, capture);
};

}, {"matches-selector":12,"event":7}],

7: [function(require, module, exports) {

var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

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
  el[bind](prefix + type, fn, capture || false);
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
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
}, {}],

8: [function(require, module, exports) {

function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

}, {}],

9: [function(require, module, exports) {


/**
 * Module exports.
 */

module.exports = throttle;

/**
 * Returns a new function that, when invoked, invokes `func` at most one time per
 * `wait` milliseconds.
 *
 * @param {Function} func The `Function` instance to wrap.
 * @param {Number} wait The minimum number of milliseconds that must elapse in between `func` invokations.
 * @return {Function} A new function that wraps the `func` function passed in.
 * @api public
 */

function throttle (func, wait) {
  var rtn; // return value
  var last = 0; // last invokation timestamp
  return function throttled () {
    var now = new Date().getTime();
    var delta = now - last;
    if (delta >= wait) {
      rtn = func.apply(this, arguments);
      last = now;
    }
    return rtn;
  };
}

}, {}],

10: [function(require, module, exports) {

/**
 * Debounces a function by the given threshold.
 *
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */

module.exports = function debounce(func, threshold, execAsap){
  var timeout;

  return function debounced(){
    var obj = this, args = arguments;

    function delayed () {
      if (!execAsap) {
        func.apply(obj, args);
      }
      timeout = null;
    }

    if (timeout) {
      clearTimeout(timeout);
    } else if (execAsap) {
      func.apply(obj, args);
    }

    timeout = setTimeout(delayed, threshold || 100);
  };
};

}, {}],

11: [function(require, module, exports) {


/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

}, {}],

12: [function(require, module, exports) {

/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

}, {"query":8}]}, {}, [])
