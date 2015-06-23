
/**
 * Module dependencies.
 */

var detect = require('language-classifier');
var resolve = require('path').resolve;
var exists = require('fs').existsSync;
var stat = require('fs').statSync;
var netrc = require('node-netrc');
var glob = require('glob').sync;
var path = require('path');

/**
 * Language mapping.
 */

var langmap = {
  javascript: 'js',
  css: 'css'
};

/**
 * Pull GH auth from ~/.netrc or $GH_TOKEN.
 */

exports.auth = function () {
  return netrc('api.github.com') || {
    password: process.env.GH_TOKEN
  };
};

/**
 * Normalize entries list.
 *
 *  - expand globs
 *  - expand directories into list of all nested files
 *
 * @param {Array:String}
 * @return {Array:String}
 */

exports.entries = function (root, list) {
  return list.filter(globs).reduce(function (memo, entry) {
    if (isDir(path.join(root, entry))) {
      return memo.concat(listFiles(root, entry));
    } else {
      return memo.concat(entry);
    }
  }, []);
};

/**
 * Helper for collecting CLI params into a single array.
 *
 * @param {String} val
 * @param {Array:String} memo
 * @returns {Array:String}
 */

exports.collect = function (val, memo) {
  val.split(',').forEach(function (val) {
    memo.push(val);
  });

  return memo;
};

/**
 * Find the root.
 *
 * @param {String} root
 * @param {String}
 */

exports.findroot = function (root) {
  var cwd = process.cwd();
  if (root) return resolve(cwd, root);
  var sep = path.sep;
  var parts = cwd.split(sep);
  var dir = cwd;

  while (!exists(path.join(dir, 'component.json')) && parts.length > 1) {
    parts.pop();
    dir = parts.join(sep);
  }

  return parts.length <= 1
    ? cwd
    : dir;
};

/**
 * Detect the type of a source-file.
 *
 * @param {String} src
 * @returns {String}
 */

exports.type = function (src) {
  return langmap[detect(src)];
};

/**
 * Retrieve an array of plugins from `--use`.
 *
 * @param {Array:String} plugins
 * @return {Array:Function}
 */

exports.plugins = function (root, plugins) {
  return plugins.map(function (plugin) {
    var local = resolve(root, plugin);
    var npm = resolve(root, 'node_modules', plugin);
    var cwd = resolve(process.cwd(), 'node_modules', plugin);
    var mod;

    if (exists(local)) mod = require(local);
    else if (exists(local + '.js')) mod = require(local);
    else if (exists(npm)) mod = require(npm);
    else mod = require(cwd);

    return Array.isArray(mod) ? mod : mod();
  }, []);
};


/**
 * Filter out unexpanded globs.
 *
 * @param {String} entry
 * @return {Boolean}
 */

function globs(path) {
  return !/\*/.test(path);
}

/**
 * Gets a list of all files within a directory recursively (and synchronously)
 *
 * @param {String} path
 * @return {Array:String}
 */

function listFiles(root, dir, pattern) {
  var opts = { cwd: root, nodir: true };
  return glob(path.join(dir, pattern || '**/*'), opts);
}

/**
 * Simple hueristic to check if `path` is a directory.
 *
 * @param {String} path
 * @return {Boolean}
 */

function isDir(path) {
  try {
    return stat(path).isDirectory();
  } catch (e) {
    return false;
  }
}
