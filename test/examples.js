
/**
 * Module dependencies.
 */

var path = require('path');
var join = path.join;
var fs = require('fs');
var ls = fs.readdirSync;
var exists = fs.existsSync;
var fmt = require('util').format;
var spawn = require('child_process').spawn;
var assert = require('assert');
var gnode = require.resolve('gnode/bin/gnode');
var dir = join(__dirname, '..', 'examples');

/**
 * Built files.
 */

var map = {
  css: 'build/build.css',
  default: 'build.js',
};

/**
 * Generate tests for each of the examples.
 */

ls(dir).forEach(function (example) {
  var root = join(dir, example);
  var index = join(root, 'index.js');
  if (!exists(index)) return;

  describe(fmt('node examples/%s/index.js', example), function () {
    this.timeout('10s');
    it('should build', function (done) {
      var args = [gnode, index];
      var proc = spawn('node', args);
      var build = join(root, map[example] || map.default);
      proc.on('close', function (code) {
        assert(0 == code);
        assert(exists(build));
        done();
      });
    });
  });
});