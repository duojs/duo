/**
 * Module Dependencies
 */

var runtimepath = require.resolve('jade/runtime.js');
var read = require('co-fs').readFile;
var Duo = require('../../');
var path = require('path');
var Jade = require('jade');
var fs = require('fs');
var co = require('co');
var join = path.join;

/**
 * Paths
 */

out = join(__dirname, 'build.js');

/**
 * Initialize `Duo`
 */

var duo = Duo(__dirname)
  .use(jade())
  .entry('main.js')

/**
 * Wrap duo#run in `co`
 */

duo.run = co(duo.run)

/**
 * Run duo
 */

duo.run(function(err, src) {
  if (err) throw err;
  fs.writeFileSync(out, src);
  var len = Buffer.byteLength(src);
  console.log('all done, wrote %dkb', len / 1024 | 0);
});

/**
 * Jade plugin
 */

function jade(opts) {
  opts = opts || {};
  var first = true;

  return function *(file, duo) {
    if ('jade' != file.type) return;
    file.type = 'js'; 

    if (first) {
      var runtime = yield read(runtimepath, 'utf8');
      duo.include('jade-runtime', runtime);
      first = false;
    }

    // add path for extends, includes, etc.
    opts.filename = file.path;

    file.src = 'var jade = require(\'jade-runtime\');\n\n' +
               'module.exports = ' + Jade.compileClient(file.src, opts) + ';';
  }
}
