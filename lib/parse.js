
/**
 * Regexps
 */

var re = require('./regexps');
var cache = {};
var p = {};
var m;

/**
 * Expose `parse`
 */

exports = module.exports = parse;

/**
 * Expose `parse`
 *
 * @param {String} path
 * @return {Object|null}
 */

function parse(path) {
  path = path.trim();

  return cache[path] = cache[path]
      || p['user/repo@ref/path'](path)
      || p['user/repo@ref'](path)
      || p['repo@ref/path'](path)
      || p['user/repo/path'](path)
      || p['user/repo'](path)
      || p['path'](path)
      || p['repo/path'](path)
      || { repo: path }
}

/**
 * Parsers
 */

p['user/repo@ref/path'] = function(path) {
  if (m = re['user/repo@ref/path'].exec(path)) {
    return {
      user: m[1],
      repo: m[2],
      ref: m[3],
      path: m[4]
    };
  }
}

p['user/repo@ref'] = function(path) {
  if (m = re['user/repo@ref'].exec(path)) {
    return {
      user: m[1],
      repo: m[2],
      ref: m[3]
    };
  }
}

p['repo@ref/path'] = function(path) {
  if (m = re['repo@ref/path'].exec(path)) {
    return {
      repo: m[1],
      ref: m[2],
      path: m[3]
    };
  }
}

p['user/repo/path'] = function(path) {
  if (m = re['user/repo/path'].exec(path)) {
    return {
      user: m[1],
      repo: m[2],
      path: m[3]
    };
  }
}

p['user/repo'] = function(path) {
  if (m = re['user/repo'].exec(path)) {
    return {
      user: m[1],
      repo: m[2]
    };
  }
}

p['path'] = function(path) {
  if (m = re['path'].exec(path)) {
    return {
      path: m[1]
    };
  }
}

p['repo/path'] = function(path) {
  if (m = re['repo/path'].exec(path)) {
    return {
      repo: m[1],
      path: m[2]
    };
  }
}
