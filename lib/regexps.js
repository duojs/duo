/**
 * Module Dependencies
 */

var slice = [].slice;

/**
 * Regexps
 */

var ref  = exports.ref = /([A-Za-z0-9-_\/\.$!#%&\(\)\+=]+)/
var user = exports.user = /([A-Za-z0-9-]{1,39})/;
var repo = exports.repo = /([A-Za-z0-9-_\.]+)/
var path = exports.path = /(\.?\/.+)/;

/**
 * Package slug
 */

var slug = exports.slug = compose(user, '-', repo, '@', ref);

/**
 * Composed regexps
 */

exports['user/repo@ref/path'] = compose(user, '/', repo, '@', ref, path);
exports['user/repo@ref'] = compose(user, '/', repo, '@', ref);
exports['repo@ref/path'] = compose(repo, '@', ref, path);
exports['user/repo/path'] = compose(user, '/', repo, path);
exports['user/repo'] = compose(user, '/', repo);
exports['repo/path'] = compose(repo, path);

/**
 * Compose the regexps
 *
 * @param {String, ...}
 * @return {RegExp}
 */

function compose() {
  var args = slice.call(arguments);
  var source = args.map(function (arg) { return arg.source || arg }).join('');
  return new RegExp('^' + source + '$');  
}
