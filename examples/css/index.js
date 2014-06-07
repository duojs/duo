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
var join = path.join;
var mkdir = require('mkdirp').sync;

// build paths
var build = join(__dirname, 'build');
var out = join(build, 'build.css')
var rel = relative(__dirname, out);

// make build directory
mkdir(build);

// initialize duo
var duo = Duo(__dirname).entry('main.css');
duo.run = co(duo.run)

// "styl" plugin
duo.use(function*(file){
  if ('styl' != file.type) return;
  file.src = styl(file.src, { whitespace: true }).toString();
  file.type = 'css';
  return file;
});

// time
var start = new Date;

// run
duo.run(function(err, str) {
  if (err) throw err;
  
  var len = Buffer.byteLength(str);
  var duration = new Date - start;

  fs.writeFileSync(out, str);
  console.log('built "%s" (%dkb) in %sms.', rel, len / 1024 | 0, duration);
});
