/**
 * Module Dependencies
 */

var assert = require('assert');
var Duo = require('../../');
var styl = require('styl');


var duo = Duo(__dirname).entry('main.css');

duo.use(function*(file){
  if ('styl' != file.type) return;
  file.src = styl(file.src, { whitespace: true }).toString();
  file.type = 'css';
});

duo.run(function(err, str) {
  if (err) throw err;
  console.log('all done!');
  console.log(str);
});
