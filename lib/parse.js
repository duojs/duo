
/**
 * Export `parse`
 */

module.exports = exports = parse;

/**
 * Regexps
 */

exports.path = /(.+)/;
exports.ref = /([A-Za-z0-9-_\/\.$!#%&\(\)\+=]+)/;
exports.repo = /([A-Za-z0-9-_\.]+)/;
exports.user = /([A-Za-z0-9-]{1,39})/;
exports.provider = /([a-z-]+\.[a-z]+)/;
exports.slug = new RegExp(exports.user.source + '-' + exports.repo.source + '@' + exports.ref.source, 'i');

/**
 * Cache
 */

var cache = {};

/**
 * Patterns
 */

var slugs = [
  'user/repo@ref:path',
  'user/repo@ref',
  'repo@ref:path',
  'user/repo:path',
  'user/repo',
  'repo:path',
];

var patterns = slugs.concat(slugs.map(provider)).map(match);

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

  return cache[path] = match = match || {
    repo: path,
    provider: 'github.com',
  };
}

/**
 * Create a regexp matcher from a `pattern`
 *
 * @param {String}
 * @return {RegExp}
 */

function match(pattern){
  var parts = pattern.match(/\w+|[^\w]/g);
  var names = pattern.match(/\w+/g);

  var source = parts.map(function(part){
    return exports[part] ? exports[part].source : part;
  });

  var regexp = new RegExp('^' + source.join('') + '$');
  return function(path){
    var m = regexp.exec(path);
    if (!m) return;

    m = m.slice(1);
    var match = m.reduce(function(ret, match, i){
      var key = names[i];
      ret[key] = match;
      return ret;
    }, {});
    match.provider = match.provider || 'github.com';
    return match;
  };
}

/**
 * Prefix `str` with "provider".
 */

function provider(str) {
  return 'provider/' + str;
}
