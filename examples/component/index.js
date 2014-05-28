/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');

assert(process.env.user, 'no process.env.user');
assert(process.env.token, 'no process.env.token');

var duo = Duo(__dirname)
  .auth(process.env.user, process.env.token)

duo.run = co(duo.run);

duo.run(function(err) {
  if (err) throw err;
  console.log('all done!');
});
