
/**
 * Export `parse`
 */

module.exports = exports = parse;

/**
 * Regexps
 */

exports.path = /(\.?\/.+)/;
exports.ref = /([A-Za-z0-9-_\/\.$!#%&\(\)\+=]+)/;
exports.repo = /([A-Za-z0-9-_\.]+)/;
exports.user = /([A-Za-z0-9-]{1,39})/;
exports.slug = new RegExp(exports.user.source + '-' + exports.repo.source + '@' + exports.ref.source, 'i');

/**
 * Cache
 */

var cache = {};

/**
 * Patterns
 */

var patterns = [
  match('user/repo@ref+path'),
  match('user/repo@ref'),
  match('repo@ref+path'),
  match('user/repo+path'),
  match('user/repo'),
  match('path'),
  match('repo+path')
];

/**
 * Parse a `path`
 *
 * @param {String} path
 * @return {Object}
 */

function parse(path){
  path = path.trim();
  var match = cache[path];

  for (var i = 0, fn; fn = patterns[i]; i++) {
    if (match) break;
    match = fn(path);
  }

  return cache[path] = match = match || { repo: path };
}

/**
 * Create a regexp matcher from a `pattern`
 *
 * @param {String}
 * @return {RegExp}
 */

function match(pattern){
  var parts = pattern.match(/\w+|[^+]/g);
  var names = pattern.match(/\w+/g);
  var source = parts.map(function(part){
    return exports[part] ? exports[part].source : part;
  });

  var regexp = new RegExp('^' + source.join('') + '$');

  return function(path){
    var m = regexp.exec(path);
    if (!m) return;
    m = m.slice(1);
    return m.reduce(function(ret, match, i){
      var key = names[i];
      ret[key] = match;
      return ret;
    }, {});
  };
}
