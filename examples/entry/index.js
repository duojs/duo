/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');
var fs = require('fs');

// assert(process.env.user, 'no process.env.user');
// assert(process.env.token, 'no process.env.token');

var duo = Duo(__dirname)
  // .auth(process.env.user, process.env.token)
  .development(true)
  .entry('entry.js')

duo.run = co(duo.run)

duo.run(function(err, src) {
  console.log(err);
  if (err) throw err;
  fs.writeFileSync('build.js', src);
  var len = Buffer.byteLength(src);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});
