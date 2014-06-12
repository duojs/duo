/**
 * Module Dependencies
 */

var co = require('co');
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
 * Wrap duo#run in `co`
 */

duo.run = co(duo.run)

/**
 * Run duo
 */

duo.run(function(err, src) {
  if (err) throw err;
  fs.writeFileSync(out, src);
  var len = Buffer.byteLength(src);
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
