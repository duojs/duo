/**
 * Module Dependencies
 */

var jade = require('duo-jade');
var Duo = require('../../');
var path = require('path');
var fs = require('fs');
var util = require('../../lib/util');
var join = path.join;
var token = util.token();

/**
 * Paths
 */

out = join(__dirname, 'build.js');

/**
 * Initialize `Duo`
 */

var duo = Duo(__dirname)
  .token(token)
  .use(jade())
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
