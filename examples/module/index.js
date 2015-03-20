
/**
 * Module Dependencies
 */

var assert = require('assert');
var Duo = require('../../');
var path = require('path');
var fs = require('fs');
var join = path.join;

/**
 * Paths
 */

out = join(__dirname, 'build.js');

/**
 * Initialize `duo`
 */

var duo = Duo(__dirname)
  .development(true)
  .entry('main.js')

/**
 * Run `duo`
 */

duo.run(function(err, results) {
  if (err) throw err;
  fs.writeFileSync(out, results.code);
  var len = Buffer.byteLength(results.code);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});
