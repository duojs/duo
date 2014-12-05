
/**
 * Module dependencies.
 */

var readdir = require('fs').readdirSync;
var extname = require('path').extname;
var exist = require('fs').existsSync;
var proc = require('child_process');
var rmrf = require('rimraf').sync;
var join = require('path').join;
var assert = require('assert');
var fs = require('co-fs');
var vm = require('vm');

/**
 * Tests.
 */

describe('Duo CLI', function () {
  var out = {};
  var ctx = {};

  afterEach(function () {
    cleanup();
    out = {};
    ctx = {};
  });

  describe('duo in.js', function () {
    it('should write to stdout', function *() {
      out = yield exec('duo index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    });

    it('should support opts', function *() {
      out = yield exec('duo -v -t js index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    });

    it('should error out when the file doesnt exist', function *() {
      var out = yield exec('duo zomg.js', 'cli-duo');
      assert(~out.stderr.indexOf('Error: cannot find entry: zomg.js'));
      assert(out.error);
    });

    it('should ignore unexpanded globs', function *() {
      var out = yield exec('duo *.css', 'entries');
      if (out.error) throw out.error;
      assert(!out.stderr);
    });
  });

  describe('duo in.js out', function () {
    it('should write to out/', function *() {
      var out = yield exec('duo index.js out', 'cli-duo');
      if (out.error) throw out.error;
      ctx = yield build('cli-duo/out/index.js');
      assert('cli-duo' == ctx.main);
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('cli-duo/out');
    });

    it('should support options', function *() {
      var out = yield exec('duo -v -t js index.js out', 'cli-duo');
      if (out.error) throw out.error;
      ctx = yield build('cli-duo/out/index.js');
      assert('cli-duo' == ctx.main);
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('cli-duo/out');
    });
  });

  describe('duo --standalone <name>', function(){
    it('should support umd (amd)', function*(){
      var out = yield exec('duo --standalone my-module index.js', 'cli-duo');
      if (out.error) throw out.error;
      var defs = [];
      var define = defs.push.bind(defs);
      define.amd = true;
      var ctx = evaluate(out.stdout, { define: define });
      assert('cli-duo' == defs[0]());
    });

    it('should support umd (commonjs)', function*(){
      var out = yield exec('duo --standalone my-module index.js', 'cli-duo');
      if (out.error) throw out.error;
      var mod = { exports: {} };
      mod.module = mod;
      var ctx = evaluate(out.stdout, mod);
      assert('cli-duo' == ctx.exports);
    });

    it('should support umd (global)', function*(){
      var out = yield exec('duo --standalone my-module index.js', 'cli-duo');
      if (out.error) throw out.error;
      var global = {};
      var ctx = evaluate(out.stdout, global);
      assert('cli-duo' == global['my-module']);
    });
  });

  describe('duo [file, ...]', function () {
    it('should build multiple entries to duo.assets()', function *() {
      var out = yield exec('duo *.js', 'entries');
      if (out.error) throw out.error;
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

    it('should copy non-js/css files to build', function *() {
      var out = yield exec('duo duo.png svg/*', 'assets');
      if (out.error) throw out.error;
      assert(contains(out.stderr, 'building : duo.png'));
      assert(contains(out.stderr, 'built : duo.png'));
      assert(contains(out.stderr, 'building : svg/logo-white.svg'));
      assert(contains(out.stderr, 'built : svg/logo-white.svg'));
      assert(contains(out.stderr, 'building : svg/logo-black.svg'));
      assert(contains(out.stderr, 'built : svg/logo-black.svg'));
      assert(exists('assets/build/duo.png'));
      assert(exists('assets/build/svg/logo-white.svg'));
      assert(exists('assets/build/svg/logo-black.svg'));
    });

    it('should work with options', function *() {
      var out = yield exec('duo -t js *.js', 'entries');
      var admin = yield build('entries/build/admin.js')
      var index = yield build('entries/build/index.js')
      if (out.error) throw out.error;
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
      if (out.error) throw out.error;
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!exists('entries/out/*.css'));
      assert(!out.stdout);
    });
  });

  describe('duo [file, ...] out', function () {
    it('should build multiple entries to a directory', function *() {
      var out = yield exec('duo *.js out', 'entries');
      var admin = yield build('entries/out/admin.js')
      var index = yield build('entries/out/index.js')
      if (out.error) throw out.error;
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('entries/out');
    });

    it('should support all directories', function *() {
      var out = yield exec('duo *.js .out', 'entries');
      var admin = yield build('entries/.out/admin.js')
      var index = yield build('entries/.out/index.js')
      if (out.error) throw out.error;
      assert('admin' == admin.main);
      assert('index' == index.main);
      assert(contains(out.stderr, 'building : admin.js'));
      assert(contains(out.stderr, 'built : admin.js'));
      assert(contains(out.stderr, 'building : index.js'));
      assert(contains(out.stderr, 'built : index.js'));
      assert(!out.stdout);
      rm('entries/.out');
    });

    it('should work with options', function *() {
      var out = yield exec('duo -t js *.js out', 'entries');
      var admin = yield build('entries/out/admin.js')
      var index = yield build('entries/out/index.js')
      if (out.error) throw out.error;
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
      if (out.error) throw out.error;
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
    });
  });

  describe('duo < in.js', function () {
    it('should write to stdout with js', function *() {
      out = yield exec('duo < index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    });

    it('should write to stdout with css', function *() {
      out = yield exec('duo < index.css', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      assert(~out.stdout.indexOf('body {'));
    });

    it('should error for unknown languages', function *() {
      out = yield exec('duo < index.coffee', 'cli-duo');
      assert(contains(out.stderr, 'error : could not detect the file type'));
    });
  });

  describe('duo --quiet', function () {
    it('should not log info to stderr', function *() {
      out = yield exec('duo -q index.js > build.js', 'cli-duo');
      if (out.error) throw out.error;
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
    });

    describe('with --use', function () {
      it('should not log "using : <plugin>"', function *() {
        var out = yield exec(
            'duo --quiet --use plugin.js index.js > build.js'
          , 'cli-duo'
        );
        assert('' == out.stdout);
        assert('' == out.stderr.trim());
        rm('cli-duo/build.js');
      });
    });
  });

  describe('duo --use <plugin>', function () {
    var src = join(__dirname, '..', 'node_modules');
    var dst = join(__dirname, 'fixtures', 'plugins', 'node_modules');

    before(function *() {
      yield fs.symlink(src, dst);
    });

    after(function *() {
      yield fs.unlink(dst);
    });

    it('should allow npm modules', function *() {
      this.timeout(10000);
      var out = yield exec('duo --use duo-jade index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
    });

    it('should allow regular js files', function *() {
      var out = yield exec('duo --use plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow multiple plugins', function *() {
      var out = yield exec('duo --use duo-jade,plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow multiple calls to --use', function *() {
      var out = yield exec('duo --use duo-jade --use plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should bomb if the plugin does not exist', function *() {
      var out = yield exec('duo --use zomg.js index.js', 'plugins');
      assert(contains(out.stderr, 'error : Error: Cannot find module'));
    });

    it('should not require .js when a local module', function *() {
      var out = yield exec('duo --use plugin index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow an array of plugins', function *() {
      var out = yield exec('duo --use plugins index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin1'));
      assert(contains(out.stderr, 'using : plugin2'));
      assert(contains(out.stderr, 'using : (anonymous)'));
    });

    it('should allow npm modules from the working directory', function *() {
      var cwd = join(__dirname, '..');
      var src = join(__dirname, 'fixtures', 'plugins');
      var cmd = join(__dirname, '..', 'bin', 'duo');
      var out = yield execute(cmd + ' -r ' + src + ' --use duo-jade index.js', { cwd: cwd });
      assert(contains(out.stderr, 'using : jade'));
    });
  });

  describe('duo --output <dir>', function () {
    it('should change to another output directory', function *() {
      var out = yield exec('duo --output out *.js', 'entries');
      assert(exists('entries/out/index.js'));
      assert(exists('entries/out/admin.js'));
      rm('entries/out');
    });
  });

  describe('duo ls', function () {
    beforeEach(function *() {
      yield exec('duo -q index.js > build.js', 'cli-duo-ls');
    });

    afterEach(function *() {
      rm('cli-duo-ls/build.js');
    });

    it('should list all dependencies', function *() {
      var out = yield exec('duo ls', 'cli-duo-ls');
      if (out.error) throw out.error;
      assert(contains(out.stdout, 'duo-ls'), 'duo-ls');
      assert(contains(out.stdout, '├── a.js'), '├── a.js');
      assert(contains(out.stdout, '└── b.js'), '└── b.js');
      assert(!out.stderr.trim(), 'stderr');
    });
  });

  describe('duo duplicates', function () {
    beforeEach(function *() {
      yield exec('duo index.js > build.js', 'cli-duo-ls');
    });

    afterEach(function *() {
      rm('cli-duo-ls/build.js');
    });

    it('should list all duplicates', function *() {
      var out = yield exec('duo duplicates', 'cli-duo-ls');
      if (out.error) throw out.error;
      assert(contains(out.stdout, 'total duplicates : 0b'));
      assert(!out.stderr.trim());
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
    });

    it('should not write to stdout', function () {
      assert('' == res.stdout);
    });
  });
});

/**
 * Resolve the path to a `fixture`.
 *
 * @param {String} fixture
 * @return {String}
 */

function path(fixture) {
  return join.apply(null, [__dirname, 'fixtures'].concat(fixture.split('/')));
}

/**
 * Remove a `fixture`.
 *
 * @param {String} fixture
 */

function rm(fixture) {
  fixture = path(fixture);
  rmrf(fixture);
}

/**
 * Get fixture `build.js`.
 *
 * @param {String} fixture
 * @return {Object}
 */

function *build(fixture) {
  fixture += extname(fixture) ? '' : '/build.js';
  var file = path(fixture);
  var js = yield fs.readFile(file, 'utf-8');
  return evaluate(js);
}

/**
 * Cleanup after the tests.
 *
 */

function cleanup() {
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
 * Check if a `file` exists.
 *
 * @param {String} file
 * @return {Boolean}
 */

function exists(file) {
  return exist(path(file));
}

/**
 * Evaluate a Javascript `string` with optional `ctx`.
 *
 * @return {Object}
 */

function evaluate(js, ctx) {
  var ctx = ctx || { window: {}, document: {} };
  vm.runInNewContext('main =' + js + '(1)', ctx, 'main.vm');
  vm.runInNewContext('require =' + js + '', ctx, 'require.vm');
  return ctx;
}

/**
 * Execute `cmd` with `cwd`.
 *
 * @param {String} cmd
 * @param {String} cwd
 * @return {Object}
 */

function *exec(cmd, cwd) {
  cmd = join(__dirname, '..', 'bin', cmd);
  cwd = join(__dirname, 'fixtures', cwd);
  return yield execute(cmd, { cwd: cwd });
}

/**
 * Execute `cmd` with `opts`.
 *
 * @param {String} cmd
 * @param {Object} opts
 */

function execute(cmd, opts) {
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
 * Check if `haystack` contains `needle`.
 *
 * @param {String} needle
 * @param {String} haystack
 * @return {Boolean}
 */

function contains(haystack, needle) {
  var rcolors = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g;
  haystack = haystack.replace(rcolors, '');
  return !! ~haystack.indexOf(needle);
}
