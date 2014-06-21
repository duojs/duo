/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Duo = require('../../');
var styl = require('styl');
var fs = require('fs');
var path = require('path');
var relative = path.relative;
var mkdir = require('mkdirp').sync;
var join = path.join;

// build paths
var build = join(__dirname, 'build');
var out = join(build, 'build.css')
var rel = relative(__dirname, out);

// mkdirp
mkdir(build);

// initialize duo
var duo = Duo(__dirname).entry('main.css');
duo.run = co(duo.run)

// "styl" plugin
duo.use(function(file){
  if ('styl' != file.type) return;
  file.type = 'css';
  file.src = styl(file.src, { whitespace: true }).toString();
});

// time
var start = new Date;

// run
duo.run(function(err, str) {
  if (err) throw err;
  
  var len = Buffer.byteLength(str);
  var duration = new Date - start;

  // console.log(str);
  fs.writeFileSync(out, str);
  console.log('built "%s" (%dkb) in %sms.', rel, len / 1024 | 0, duration);
});
