
/**
 * Module dependencies.
 */

var convert = require('convert-source-map');
var readdir = require('fs').readdirSync;
var extname = require('path').extname;
var resolve = require('path').resolve;
var exist = require('fs').existsSync;
var Package = require('duo-package');
var proc = require('child_process');
var rmrf = require('rimraf').sync;
var tmp = require('os').tmpdir();
var assert = require('assert');
var semver = require('semver');
var fs = require('co-fs');
var vm = require('vm');

/**
 * Tests.
 */

describe('Duo CLI', function () {
  var out = {};
  var ctx = {};

  this.slow('1s');

  beforeEach(function () {
    cleanup();
    out = {};
    ctx = {};
  });

  after(function () {
    cleanup();
  });

  describe('duo in.js', function () {
    it('should write to build/', function *() {
      out = yield exec('index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stderr);
      assert(exists('cli-duo/build/index.js'));
    });

    it('should support opts', function *() {
      out = yield exec('-v -t js index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stderr);
      assert(exists('cli-duo/build/index.js'));
    });

    it('should error out when the file doesnt exist', function *() {
      var out = yield exec('zomg.js', 'cli-duo');
      assert(~out.stderr.indexOf('Error: cannot find entry: zomg.js'));
      assert(out.error);
    });
  });

  describe('duo --standalone <name>', function(){
    it('should support umd (amd)', function*(){
      var out = yield exec('--standalone my-module --stdout index.js', 'cli-duo');
      if (out.error) throw out.error;
      var defs = [];
      var define = defs.push.bind(defs);
      define.amd = true;
      var ctx = evaluate(out.stdout, { define: define });
      assert('cli-duo' == defs[0]());
    });

    it('should support umd (commonjs)', function*(){
      var out = yield exec('--standalone my-module --stdout index.js', 'cli-duo');
      if (out.error) throw out.error;
      var mod = { exports: {} };
      mod.module = mod;
      var ctx = evaluate(out.stdout, mod);
      assert('cli-duo' == ctx.exports);
    });

    it('should support umd (global)', function*(){
      var out = yield exec('--standalone my-module --stdout index.js', 'cli-duo');
      if (out.error) throw out.error;
      var global = {};
      var ctx = evaluate(out.stdout, global);
      assert('cli-duo' == global['my-module']);
    });
  });

  describe('duo --development', function () {
    it('should include inline source-maps', function *() {
      var out = yield exec('--development index.js', 'simple');
      if (out.error) throw out.error;
      var entry = yield fs.readFile(path('simple/build/index.js'), 'utf8');
      var map = convert.fromSource(entry).toObject();
      var src = map.sourcesContent[map.sources.indexOf('/duo/two.js')];
      assert(src.trim() == 'module.exports = \'two\';');
    });
  });

  describe('duo --external-source-maps', function () {
    it('should add external source-maps', function *() {
      var out = yield exec('--external-source-maps index.js', 'simple');
      if (out.error) throw out.error;
      var entry = yield fs.readFile(path('simple/build/index.js'), 'utf8');
      var map = convert.fromMapFileSource(entry, path('simple/build')).toObject();
      var src = map.sourcesContent[map.sources.indexOf('/duo/two.js')];
      assert(src.trim() == 'module.exports = \'two\';');
    });

    it('should behave the same way with `--development` on', function *() {
      var out = yield exec('--development --external-source-maps index.js', 'simple');
      if (out.error) throw out.error;
      var entry = yield fs.readFile(path('simple/build/index.js'), 'utf8');
      var map = convert.fromMapFileSource(entry, path('simple/build')).toObject();
      var src = map.sourcesContent[map.sources.indexOf('/duo/two.js')];
      assert(src.trim() == 'module.exports = \'two\';');
    });
  });

  describe('duo [file, ...]', function () {
    it('should build multiple entries to duo.assets()', function *() {
      var out = yield exec('*.js', 'entries');
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
      var out = yield exec('duo.png svg/*', 'assets');
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
      var out = yield exec('-t js *.js', 'entries');
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
      var out = yield exec('*.js *.css', 'entries');
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

    it('should recursively copy directories', function *() {
      var out = yield exec('svg', 'assets');
      if (out.error) throw out.error;
      assert(!contains(out.stderr, 'building : duo.png'));
      assert(!contains(out.stderr, 'built : duo.png'));
      assert(contains(out.stderr, 'building : svg/logo-white.svg'));
      assert(contains(out.stderr, 'built : svg/logo-white.svg'));
      assert(contains(out.stderr, 'building : svg/logo-black.svg'));
      assert(contains(out.stderr, 'built : svg/logo-black.svg'));
      assert(exists('assets/build/svg/logo-white.svg'));
      assert(exists('assets/build/svg/logo-black.svg'));
    });

    it('should recursively copy directories even if they are the only argument', function *() {
      var out = yield exec('svg', 'assets');
      if (out.error) throw out.error;
      assert(!contains(out.stderr, 'building : duo.png'));
      assert(!contains(out.stderr, 'built : duo.png'));
      assert(contains(out.stderr, 'building : svg/logo-white.svg'));
      assert(contains(out.stderr, 'built : svg/logo-white.svg'));
      assert(contains(out.stderr, 'building : svg/logo-black.svg'));
      assert(contains(out.stderr, 'built : svg/logo-black.svg'));
      assert(exists('assets/build/svg/logo-white.svg'));
      assert(exists('assets/build/svg/logo-black.svg'));
    });
  });

  describe('duo < in.js', function () {
    it('should write to stdout with js', function *() {
      out = yield exec('< index.js', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      ctx = evaluate(out.stdout);
      assert('cli-duo' == ctx.main);
    });

    it('should write to stdout with css', function *() {
      out = yield exec('< index.css', 'cli-duo');
      if (out.error) throw out.error;
      assert(out.stdout);
      assert(out.stderr);
      assert(~out.stdout.indexOf('body {'));
    });

    it('should error for unknown languages', function *() {
      out = yield exec('< index.coffee', 'cli-duo');
      assert(contains(out.stderr, 'error : could not detect the file type'));
    });

    describe('with --development', function () {
      it('should output an inline source-map', function *() {
        out = yield exec('--development < index.js', 'cli-duo');
        if (out.error) throw out.error;
        assert(out.stdout);
        assert(out.stderr);
        ctx = evaluate(out.stdout);
        assert('cli-duo' == ctx.main);
        assert(~ out.stdout.indexOf('//# sourceMappingURL=data:application/json;'));
      });
    });

    describe('with --external-source-maps', function () {
      it('should output an inline source-map (magic)', function *() {
        out = yield exec('--external-source-maps < index.js', 'cli-duo');
        if (out.error) throw out.error;
        assert(out.stdout);
        assert(out.stderr);
        ctx = evaluate(out.stdout);
        assert('cli-duo' == ctx.main);
        assert(~ out.stdout.indexOf('//# sourceMappingURL=data:application/json;'));
      });
    });
  });

  describe('duo --quiet', function () {
    it('should not log info to stderr when writing files', function *() {
      out = yield exec('--quiet index.js', 'cli-duo');
      if (out.error) throw out.error;
      ctx = yield build('cli-duo/build/index.js');
      assert('cli-duo' == ctx.main);
      assert(!out.stderr);
      assert(!out.stdout);
      rm('cli-duo/build');
    });

    it('should not log info to stderr when printing to stdout', function *() {
      out = yield exec('--stdout --quiet index.js > build.js', 'cli-duo');
      if (out.error) throw out.error;
      ctx = yield build('cli-duo');
      assert('cli-duo' == ctx.main);
      assert(!out.stderr);
      assert(!out.stdout);
      rm('cli-duo/build.js');
    });

    it('should log if there is an error', function *() {
      var out = yield exec('-q zomg.js', 'cli-duo');
      assert(~out.stderr.indexOf('Error: cannot find entry: zomg.js'));
      assert(out.error);
    });

    it('should not allow verbose and quiet mode simultaneously', function *() {
      var out = yield exec('--quiet --verbose index.js', 'cli-duo');
      assert(~out.stderr.indexOf('error'));
      assert(~out.stderr.indexOf('cannot use both quiet and verbose mode simultaneously'));
      assert(out.error);
    });

    describe('with --use', function () {
      it('should not log "using : <plugin>"', function *() {
        var out = yield exec('--quiet --use plugin.js index.js > build.js', 'cli-duo');
        assert('' == out.stdout);
        assert('' == out.stderr.trim());
        rm('cli-duo/build.js');
      });
    });
  });

  describe('duo --use <plugin>', function () {
    var src = resolve(__dirname, '..', 'node_modules');
    var dst = resolve(__dirname, 'fixtures', 'plugins', 'node_modules');

    before(function *() {
      yield fs.symlink(src, dst);
    });

    after(function *() {
      yield fs.unlink(dst);
    });

    it('should allow npm modules', function *() {
      this.timeout(10000);
      var out = yield exec('--use duo-jade index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
    });

    it('should allow regular js files', function *() {
      var out = yield exec('--use plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow multiple plugins', function *() {
      var out = yield exec('--use duo-jade,plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow multiple calls to --use', function *() {
      var out = yield exec('--use duo-jade --use plugin.js index.js', 'plugins');
      assert(contains(out.stderr, 'using : jade'));
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should bomb if the plugin does not exist', function *() {
      var out = yield exec('--use zomg.js index.js', 'plugins');
      assert(contains(out.stderr, 'error : Error: Cannot find module'));
    });

    it('should not require .js when a local module', function *() {
      var out = yield exec('--use plugin index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin'));
    });

    it('should allow an array of plugins', function *() {
      var out = yield exec('--use plugins index.js', 'plugins');
      assert(contains(out.stderr, 'using : plugin1'));
      assert(contains(out.stderr, 'using : plugin2'));
      assert(contains(out.stderr, 'using : (anonymous)'));
    });

    it('should allow npm modules from the working directory', function *() {
      var cwd = resolve(__dirname, '..');
      var src = resolve(__dirname, 'fixtures', 'plugins');
      var cmd = resolve(__dirname, '..', 'bin', 'duo');
      var out = yield execute(cmd + ' -r ' + src + ' --use duo-jade index.js', { cwd: cwd });
      assert(contains(out.stderr, 'using : jade'));
    });
  });

  describe('duo --output <dir>', function () {
    it('should change to another output directory', function *() {
      var out = yield exec('--output out *.js', 'entries');
      assert(exists('entries/out/index.js'));
      assert(exists('entries/out/admin.js'));
      rm('entries/out');
    });
  });

  describe('duo --stdout', function () {
    it('should output to stdout', function *() {
      var out = yield exec('--stdout index.js', 'entries');
      var index = evaluate(out.stdout);
      assert('index' == index.main);
    });

    it('should error when multiple entries are passed', function *() {
      var out = yield exec('--stdout *.js', 'entries');
      assert(contains(out.stderr, 'cannot use stdout with multiple entries'));
      rm('entries/out');
    });

    describe('with --development', function () {
      it('should output an inline source-map', function *() {
        out = yield exec('--development --stdout index.js', 'cli-duo');
        if (out.error) throw out.error;
        assert(out.stdout);
        assert(out.stderr);
        ctx = evaluate(out.stdout);
        assert('cli-duo' == ctx.main);
        assert(~ out.stdout.indexOf('//# sourceMappingURL=data:application/json;'));
      });
    });

    describe('with --external-source-maps', function () {
      it('should output an inline source-map (magic)', function *() {
        out = yield exec('--external-source-maps --stdout index.js', 'cli-duo');
        if (out.error) throw out.error;
        assert(out.stdout);
        assert(out.stderr);
        ctx = evaluate(out.stdout);
        assert('cli-duo' == ctx.main);
        assert(~ out.stdout.indexOf('//# sourceMappingURL=data:application/json;'));
      });
    });
  });

  describe('duo ls', function () {
    beforeEach(function *() {
      yield exec('-q index.js > build.js', 'cli-duo-ls');
    });

    afterEach(function *() {
      rm('cli-duo-ls/build.js');
    });

    it('should list all dependencies', function *() {
      var out = yield exec('ls', 'cli-duo-ls');
      if (out.error) throw out.error;
      assert(contains(out.stdout, 'duo-ls'), 'duo-ls');
      assert(contains(out.stdout, '├── a.js'), '├── a.js');
      assert(contains(out.stdout, '└── b.js'), '└── b.js');
      assert(!out.stderr.trim(), 'stderr');
    });
  });

  describe('duo duplicates', function () {
    beforeEach(function *() {
      yield exec('index.js > build.js', 'cli-duo-ls');
    });

    afterEach(function *() {
      rm('cli-duo-ls/build.js');
    });

    it('should list all duplicates', function *() {
      var out = yield exec('duplicates', 'cli-duo-ls');
      if (out.error) throw out.error;
      assert(contains(out.stdout, 'total duplicates : 0b'));
      assert(!out.stderr.trim());
    });
  });

  describe('duo clean-cache', function () {
    beforeEach(function *() {
      yield exec('index.js', 'simple-deps');
    });

    it('should remove the mapping file', function *() {
      var out = yield exec('clean-cache', 'simple-deps');
      if (out.error) throw out.error;
      assert(contains(out.stderr, 'cleaned : components/duo.json'));
      assert(!exists('simple-deps/components/duo.json'));
    });

    it('should remove the package tmp dir', function *() {
      var out = yield exec('clean-cache', 'simple-deps');
      if (out.error) throw out.error;
      assert(contains(out.stderr, '/duo'));
    });

    describe('with --quiet', function () {
      it('should not have any output', function *() {
        var out = yield exec('clean-cache --quiet', 'simple-deps');
        if (out.error) throw out.error;
        assert.equal(out.stderr, '');
      });
    });
  });

  describe('duo <unsupported command>', function () {
    var res = {};
    beforeEach(function (done) {
      var duo = resolve(__dirname, '..', 'bin', 'duo');
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
  return resolve.apply(null, [__dirname, 'fixtures'].concat(fixture.split('/')));
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
  var dir = resolve(__dirname, 'fixtures');
  var dirs = readdir(dir);
  dirs.forEach(function(name){
    if ('.' == name[0]) return;
    var components = resolve(dir, name, 'components');
    var build = resolve(dir, name, 'build');
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
  js = convert.removeComments(js);
  vm.runInNewContext('main =' + js + '(1)', ctx, 'main.vm');
  vm.runInNewContext('require =' + js + '', ctx, 'require.vm');
  return ctx;
}

/**
 * Execute `duo {args}` using {fixture} as cwd.
 *
 * @param {String} args
 * @param {String} fixture
 * @return {Object}
 */

var exec = (function (version) {
  if (semver.satisfies(version, '>= 0.11')) {
    return function* (args, fixture) {
      var duo = resolve(__dirname, '../bin/duo');
      var cmd = [ duo, args ].join(' ');
      var cwd = resolve(__dirname, 'fixtures', fixture);
      return yield execute(cmd, { cwd: cwd });
    };
  } else {
    return function* (args, fixture) {
      var gnode = require.resolve('gnode/bin/gnode');
      var duo = resolve(__dirname, '../bin/duo');
      var cmd = [ gnode, duo, args ].join(' ');
      var cwd = resolve(__dirname, 'fixtures', fixture);
      return yield execute(cmd, { cwd: cwd });
    };
  }
}(process.version));

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
