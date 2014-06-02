/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');


var duo = Duo(__dirname).entry('main.css');
duo.run = co(duo.run)

duo.run(function(err, str) {
  if (err) throw err;
  console.log('all done!');
  console.log(str);
});
