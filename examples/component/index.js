/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var fs = require('fs');
var Duo = require('../../');

assert(process.env.user, 'no process.env.user');
assert(process.env.token, 'no process.env.token');

var duo = Duo(__dirname)
  .auth(process.env.user, process.env.token)

duo.run = co(duo.run);

duo.run(function(err, src) {
  if (err) throw err;
  console.log('wrote build.js %dkb', Buffer.byteLength(src) / 1024 | 0);
  fs.writeFileSync('build.js', src);
});
