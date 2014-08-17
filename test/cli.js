
var readfile = require('fs').readFileSync;
var readdir = require('fs').readdirSync;
var extname = require('path').extname;
var exist = require('fs').existsSync;
var proc = require('child_process');
var rmrf = require('rimraf').sync;
var join = require('path').join;
var assert = require('assert');
var fs = require('co-fs');
var vm = require('vm');

describe('Duo CLI', function(){
  var out = {};
  var ctx = {};

  beforeEach(function(){
    cleanup();
    out = {};
    ctx = {};
  });

  describe('duo in.js', function(){
    it('should write to stdout', function *(){
      out = yield exec('duo index.js', 'cli-duo');
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    });

    it('should support opts', function *() {
      out = yield exec('duo -c 20 -t js index.js', 'cli-duo');
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    })

    it('should error out when the file doesnt exist', function *() {
      var out = yield exec('duo zomg.js', 'cli-duo');
      assert(~out.stderr.indexOf('Error: cannot find entry: zomg.js'));
      assert(out.error);
    })

    it('should ignore unexpanded globs', function *() {
      var out = yield exec('duo *.css', 'entries');
      assert(!out.stderr);
      assert(!out.error);
    })

    it('should work with component.json', function *() {
      out = yield exec('duo component.json', 'component');
      assert(!out.stdout);
      assert(out.stderr);

      ctx = yield build('component/build/index.js')
      assert('index' == ctx.main);
      var css = read('component/build/index.css');
      assert('body { background: blue; }\n' == css)
    })
  });

  describe('duo [file, ...]', function() {
    it('should build multiple entries to duo.assets()', function *() {
      var out = yield exec('duo *.js', 'entries');
      var admin = yield build('entries/build/admin.js')
      var index = yield build('entries/build/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
    });

    it('should work with options', function *() {
      var out = yield exec('duo -c 20 *.js', 'entries');
      var admin = yield build('entries/build/admin.js')
      var index = yield build('entries/build/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
    });

    it('should ignore unexpanded globs', function *() {
      var out = yield exec('duo *.js *.css', 'entries');
      var admin = yield build('entries/build/admin.js')
      var index = yield build('entries/build/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!exists('entries/out/*.css'));
      assert(!out.stdout);
    });
  })

  describe('duo [file, ...] out', function() {
    it('should build multiple entries to a directory', function *() {
      var out = yield exec('duo *.js out', 'entries');
      var admin = yield build('entries/out/admin.js')
      var index = yield build('entries/out/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('entries/out');
    });

    it('should work with options', function *() {
      var out = yield exec('duo -c 20 *.js out', 'entries');
      var admin = yield build('entries/out/admin.js')
      var index = yield build('entries/out/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('entries/out');
    });

    it('should ignore unexpanded globs', function *() {
      var out = yield exec('duo *.js *.css out', 'entries');
      var admin = yield build('entries/out/admin.js')
      var index = yield build('entries/out/index.js')
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!exists('entries/out/*.css'));
      assert(!out.stdout);
      rm('entries/out');
    })
  })

  describe('duo < in.js', function() {
    it('should write to stdout', function *() {
      out = yield exec('duo < index.js', 'cli-duo');
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    })
  })

  describe('--quiet', function() {
    it('should not log info to stderr', function *() {
      out = yield exec('duo -q index.js > build.js', 'cli-duo');
      ctx = yield build('cli-duo');
      assert('cli-duo' == ctx.main);
      assert(!out.stderr.trim());
      assert(!out.stdout);
      rm('cli-duo/build.js');
    });

    it('should log if there is an error', function *() {
      var out = yield exec('duo -q zomg.js', 'cli-duo');
      assert(~out.stderr.indexOf('Error: cannot find entry: zomg.js'));
      assert(out.error);
    })
  });

  describe('duo ls', function(){
    before(function *(){
      yield exec('duo index.js > build.js', 'cli-duo-ls');
    })

    after(function *(){
      rm('cli-duo-ls/build.js');
    })

    it('should list all dependencies', function*(){
      out = yield exec('duo -q index.js > build.js && duo ls', 'cli-duo-ls');
      assert(contains(out.stdout, 'duo-ls'), 'duo-ls');
      assert(contains(out.stdout, '├── a.js'), '├── a.js');
      assert(contains(out.stdout, '└── b.js'), '└── b.js');
      assert(!out.stderr.trim(), 'stderr');
      rm('cli-duo-ls/build.js');
    });
  });

  describe('duo duplicates', function(){
    it('should list all duplicates', function*(){
      out = yield exec('duo -q index.js > build.js && duo duplicates', 'cli-duo-ls');
      assert(contains(out.stdout, 'total duplicates : 0b'));
      assert(!out.stderr.trim());
      rm('cli-duo-ls/build.js');
    });
  });

  describe('duo <unsupported command>', function () {
    var res = {};
    beforeEach(function (done) {
      var duo = join(__dirname, '..', 'bin', 'duo');
      var child = proc.spawn(duo, ['foo']);
      res.stdout = res.stderr = '';
      child.stdout.on('data', function (chunk) { res.stdout += chunk; });
      child.stderr.on('data', function (chunk) { res.stderr += chunk; });
      child.on('exit', function (code) {
        res.code = code;
        done();
      });
    });

    it('should exit with a non-zero code', function () {
      assert(0 != res.code);
    });

    it('should write to stderr', function () {
      assert('' != res.stderr);
    })

    it('should not write to stdout', function () {
      assert('' == res.stdout);
    })
  });
})

/**
 * Path to `fixture`
 *
 * @param {String} fixture
 * @return {String}
 * @api private
 */

function path(fixture){
  return join.apply(null, [__dirname, 'fixtures'].concat(fixture.split('/')));
}

/**
 * Read a file
 *
 * @param {String} file
 * @return {String}
 * @api private
 */

function read(file) {
  file = path(file);
  return readfile(file, 'utf8');
}

/**
 * Remove `fixture/build.js`
 *
 * @param {String} fixture
 * @api private
 */

function rm(fixture){
  fixture = path(fixture);
  rmrf(fixture);
}

/**
 * Get fixture `build.js`
 *
 * @param {String} fixture
 * @return {Object}
 * @api private
 */

function *build(fixture){
  fixture += extname(fixture) ? '' : '/build.js';
  var file = path(fixture);
  var js = yield fs.readFile(file, 'utf-8');
  return evaluate(js);
}

/**
 * Cleanup
 *
 * @api private
 */

function cleanup(){
  var dir = join(__dirname, 'fixtures');
  var dirs = readdir(dir);
  dirs.forEach(function(name){
    if ('.' == name[0]) return;
    var components = join(dir, name, 'components');
    var build = join(dir, name, 'build');
    rmrf(components);
    rmrf(build);
  });
}

/**
 * Check if a file exists
 *
 * @param {String} file
 * @return {Boolean}
 * @api private
 */

function exists(file) {
  return exist(path(file));
}

/**
 * Evaluate `js`.
 *
 * @return {Object}
 * @api private
 */

function evaluate(js, ctx){
  var ctx = ctx || { window: {}, document: {} };
  vm.runInNewContext('main =' + js + '(1)', ctx, 'main.vm');
  vm.runInNewContext('require =' + js + '', ctx, 'require.vm');
  return ctx;
}

/**
 * Execute `cmd` with `cwd`
 *
 * @param {String} cmd
 * @param {String} cwd
 * @return {Object}
 * @api private
 */

function *exec(cmd, cwd){
  cmd = join(__dirname, '..', 'bin', cmd);
  cwd = join(__dirname, 'fixtures', cwd);
  return yield execute(cmd, { cwd: cwd });
}

/**
 * Execute `cmd` with `opts`
 *
 * @param {String} cmd
 * @param {Object} opts
 * @api private
 */

function execute(cmd, opts){
  return function(done){
    proc.exec(cmd, opts, function(err, stdout, stderr){
      done(null, {
        error: err,
        stdout: stdout,
        stderr: stderr
      });
    });
  };
}

/**
 * Check if `haystack` contains `needle`
 *
 * @param {String} needle
 * @param {String} haystack
 * @return {Boolean}
 * @api private
 */

function contains(haystack, needle) {
  var rcolors = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g;
  haystack = haystack.replace(rcolors, '');
  return !! ~haystack.indexOf(needle);
}
