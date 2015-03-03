/**
 * Module Dependencies
 */

var assert = require('assert');
var Duo = require('../../');
var fs = require('fs');
var regen = require('regenerator');
var path = require('path');
var join = path.join;

/**
 * Paths
 */

out = join(__dirname, 'build.js');

/**
 * Initialize `Duo`
 */

var duo = Duo(__dirname)
  .use(regenerator)
  .entry('main.js')

/**
 * Run duo
 */

duo.run(function(err, results) {
  if (err) throw err;
  fs.writeFileSync(out, results.code);
  var len = Buffer.byteLength(results.code);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});

/**
 * Regenerator plugin
 */

function regenerator(file) {
  if ('js' != file.type) return;
  // TODO: only include runtime once, using duo#include('regenerator', fn)
  file.src = regen(file.src, { includeRuntime: true });
}
