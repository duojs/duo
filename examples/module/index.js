
/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');
var fs = require('fs');


var duo = Duo(__dirname)
  .development(true)
  .entry('main.js')

duo.run = co(duo.run)

duo.run(function(err, src) {
  console.log(err);
  if (err) throw err;
  fs.writeFileSync('build.js', src);
  var len = Buffer.byteLength(src);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});
