
var readdir = require('fs').readdirSync;
var dirname = require('path').dirname;
var coffee = require('coffee-script');
var mkdir = require('fs').mkdirSync;
var thunkify = require('thunkify');
var rmrf = require('rimraf').sync;
var expect = require('expect.js');
var join = require('path').join;
var assert = require('assert');
var fs = require('co-fs');
var Duo = require('..');
var vm = require('vm');

describe('Duo', function(){
  beforeEach(function(){
    cleanup();
  })

  it('should build simple modules', function*(){
    var js = yield build('simple').run();
    var ctx = evaluate(js);
    assert.deepEqual(['one', 'two'], ctx.main);
  });

  it('.entry(file) should work with full paths', function*() {
    var entry = join(path('simple'), 'index.js');
    var js = yield build('simple', entry).run();
    var ctx = evaluate(js);
    assert.deepEqual(['one', 'two'], ctx.main);
  })

  it('should build with no deps', function *() {
    var js = yield build('no-deps').run();
    var ctx = evaluate(js).main;
    assert('a' == ctx)
  })

  it('resolve directories like `require(./lib)`', function*(){
    var js = yield build('resolve').run();
    var ctx = evaluate(js);
    assert.deepEqual('resolved', ctx.main);
  });

  it('should resolve relative files like `require(../path/file.js`', function*(){
    var js = yield build('resolve-file').run();
    var ctx = evaluate(js);
    assert('resolved' == ctx.main);
  })

  it('should fetch and build direct dependencies', function*(){
    this.timeout(15000);
    var js = yield build('simple-deps').run();
    var ctx = evaluate(js);
    var type = ctx.main;
    assert(ctx.mods);
    assert(2 == ctx.mods.length);
    assert('string' == ctx.mods[0](''));
    assert('function' == typeof ctx.mods[1]);
  })

  it('should fetch dependencies from manifest', function*(){
    var js = yield build('manifest-deps').run();
    var ctx = evaluate(js);
    var type = ctx.main;
    assert('string' == type(''));
  })

  it('should be idempotent', function*(){
    var a = yield build('idempotent').run();
    var b = yield build('idempotent').run();
    var c = yield build('idempotent').run();
    a = evaluate(a).main;
    b = evaluate(b).main;
    c = evaluate(c).main;
    assert('string' == a(''));
    assert('string' == b(''));
    assert('string' == c(''));
  })

  it('should rebuild correctly when a file is touched', function*(){
    var p = join(path('rebuild'), 'index.js');
    var js = yield fs.readFile(p, 'utf8');
    var a = build('rebuild');
    var b = build('rebuild');
    var c = build('rebuild');
    a = yield a.run();
    fs.writeFile(p, js);
    b = yield b.run();
    c = yield c.run();
    assert(a && b && c);
    assert(a == b);
    assert(b == c);
  })

  it('should resolve repos with different names', function*() {
    this.timeout(10000);
    var js = yield build('different-names').run();
    var ms = evaluate(js).main;
    assert(36000000 == ms('10h'));
  })

  it('should resolve dependencies that use require("{user}-{repo}")', function*() {
    var js = yield build('user-repo-dep').run();
    var type = evaluate(js).main;
    assert('string' == type(js));
  });

  describe('.development(boolean)', function(){
    it('should contain sourcemaps when development is `true`', function*(){
      var duo = build('simple');
      duo.development(true);
      var js = yield duo.run();
      assert(!!~ js.indexOf('//# sourceMappingURL'));
    })

    it('should fetch and build dependencies', function*(){
      this.timeout(15000);
      var duo = build('simple-dev-deps');
      duo.development(true);
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert('trigger' == ctx.mods[0].name);
      assert('function' == typeof ctx.mods[1].equal);
    })

    it('should not contain sourcemaps by default', function*(){
      var js = yield build('simple').run();
      assert(!~ js.indexOf('//# sourceMappingURL'));
    })
  })

  describe('.global(name)', function(){
    it('should expose the entry as a global', function*(){
      var duo = build('global');
      duo.global('global-module');
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert('global module' == ctx['global-module']);
    })
  })

  describe('duo#use', function() {
    it('should transform entry files', function*() {
      var duo = build('coffee', 'index.coffee');
      duo.use(cs);
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx.a == 'a');
      assert(ctx.b == 'b');
      assert(ctx.c == 'c');
    })

    it('should transform deps', function*() {
      var duo = build('coffee-deps')
      duo.use(cs);
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx.a == 'a');
      assert(ctx.b == 'b');
      assert(ctx.c == 'c');
    })

    it('should work with generators', function*() {
      var duo = build('coffee', 'index.coffee');
      var called = false;
      duo.use(cs).use(function *() { called = true; });
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx.a == 'a');
      assert(ctx.b == 'b');
      assert(ctx.c == 'c');
      assert(called);
    })

    function cs(file) {
      if ('coffee' != file.type) return;
      file.type = 'js';
      file.src = coffee.compile(file.src);
    }
  });

  describe('duo#include(name, source)', function() {
    it('should include a string as a source', function*() {
      var duo = build('includes');
      duo.include('some-include', 'module.exports = "a"');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx == 'a');
    })

    it('should be idempotent', function*() {
      var duo = build('includes');
      duo.include('some-include', 'module.exports = "a"');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx == 'a');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx == 'a');
    })
  })

  describe('bundles', function() {
    it('should support multiple bundles', function*() {
      this.timeout(10000);
      var one = build('bundles', 'one.js');
      var two = build('bundles', 'two.js');
      var onejs = yield one.run();
      var twojs = yield two.run();
      var ms = evaluate(onejs).main;
      var type = evaluate(twojs).main;
      assert(36000000 == ms('10h'));
      assert('string' == type(''));

      // Ensure both bundles are in the manifest
      var json = yield mapping('bundles');
      assert(json['one.js'], 'one.js not found in manifest');
      assert(json['two.js'], 'two.js not found in manifest');

      // don't let pack change the IDs of the deps
      assert('string' == typeof json['one.js'].deps['ms']);
      assert('string' == typeof json['two.js'].deps['type']);
    })
  })
})

/**
 * Build `fixture` and return `str`.
 *
 * @param {String} fixture
 * @return {String}
 */

function build(fixture, file){
  var root = path(fixture);
  var duo = Duo(root).entry(file || 'index.js');
  duo.run = thunkify(duo.run);
  return duo;
}

/**
 * Evaluate `js`.
 *
 * @return {Object}
 */

function evaluate(js, ctx){
  var ctx = { window: {}, document: {} };
  vm.runInNewContext('main =' + js + '(1)', ctx, 'main.vm');
  vm.runInNewContext('require =' + js + '', ctx, 'require.vm');
  return ctx;
}

/**
 * Cleanup
 */

function cleanup(){
  var dir = join(__dirname, 'fixtures');
  var dirs = readdir(dir);
  dirs.forEach(function(name){
    var path = join(dir, name, 'components');
    rmrf(path);
  });
}

/**
 * Get the mapping
 */

function *mapping(fixture) {
  var root = path(fixture);
  var mapping = join(root, 'components', 'duo.json');
  var str = yield fs.readFile(mapping, 'utf8');
  return JSON.parse(str);
}

/**
 * Path to `fixture`
 */

function path(fixture){
  return join(__dirname, 'fixtures', fixture);
}
