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

/**
 * Paths
 */

var build = join(__dirname, 'build');
var out = join(build, 'build.css')
var rel = relative(__dirname, out);

// mkdirp
mkdir(build);

/**
 * Initialize `duo`
 */

var duo = Duo(__dirname)
  .entry('main.css');

/**
 * Styl plugin
 */

duo.use(function(file){
  if ('styl' != file.type) return;
  file.type = 'css';
  file.src = styl(file.src, { whitespace: true }).toString();
});

/**
 * Run `duo`
 */

duo.run(function(err, results) {
  if (err) throw err;
  fs.writeFileSync(out, results.code);
  var len = Buffer.byteLength(results.code);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});
