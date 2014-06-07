/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');
var fs = require('fs');

/**
 * Build file
 */

var duo = Duo(__dirname)
  .development(true)
  .entry('entry.js')

duo.run = co(duo.run)

var start = new Date;

duo.run(function(err, src) {
  if (err) throw err;
  fs.writeFileSync('build.js', src);
  var len = Buffer.byteLength(src);
  console.log('all done, wrote %dkb in %sms', len / 1024 | 0, new Date - start);
});
