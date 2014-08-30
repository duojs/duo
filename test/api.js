/**
 * Module Dependencies
 */

var readdir = require('fs').readdirSync;
var readfile = require('fs').readFileSync;
var dirname = require('path').dirname;
var coffee = require('coffee-script');
var exist = require('fs').existsSync;
var mkdir = require('fs').mkdirSync;
var lstat = require('fs').lstatSync;
var rmrf = require('rimraf').sync;
var stat = require('fs').statSync;
var expect = require('expect.js');
var join = require('path').join;
var assert = require('assert');
var styl = require('styl');
var fs = require('co-fs');
var Duo = require('..');
var noop = function(){};
var vm = require('vm');
var slice = [].slice;

/**
 * Tests
 */

describe('Duo API', function(){
  beforeEach(function(){
    cleanup();
  })

  it('should throw without root', function () {
    var err
    try {
      Duo();
    } catch (e) {
      err = e;
    }
    assert(err && /root directory/.test(err.message));
  })

  it('should ignore runs without an entry or source', function *() {
    var js = yield Duo(__dirname).run();
    assert('' == js);
  })

  it('should build simple modules', function*(){
    var js = yield build('simple').run();
    var ctx = evaluate(js);
    assert.deepEqual(['one', 'two'], ctx.main);
  });

  describe('.entry(file)', function() {
    it('should work with full paths', function*() {
      var entry = join(path('simple'), 'index.js');
      var js = yield build('simple', entry).run();
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    })

    it('should throw if file doesn\'t exist', function *() {
      var duo = Duo(__dirname).entry('zomg.js');

      try {
        yield duo.run();
      } catch (e) {
        assert(~e.message.indexOf('cannot find entry: zomg.js'));
      }
    })

    it('should be idempotent', function *() {
      var root = path('simple');
      var duo = Duo(root).entry('hi.js');
      duo.entry('index.js');
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
      var json = yield mapping('simple');
      assert(true == json['index.js'].entry);
    })
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

  it('should resolve relative files like `require(../path/file.js`)', function*(){
    var js = yield build('resolve-file').run();
    var ctx = evaluate(js);
    assert('resolved' == ctx.main);
  })

  it('should resolve dependencies like require("..")', function *() {
    var js = yield build('relative-path', 'test/test.js').run();
    var ctx = evaluate(js);
    assert('index' == ctx.main);
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
    this.timeout(15000);
    var js = yield build('different-names').run();
    var ms = evaluate(js).main;
    assert(36000000 == ms('10h'));
  })

  it('should resolve dependencies that use require("{user}-{repo}")', function*() {
    var js = yield build('user-repo-dep').run();
    var type = evaluate(js).main;
    assert('string' == type(js));
  });

  it('.run(fn) should work with a function', function(done) {
    build('simple').run(function(err, js) {
      assert(!err);
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
      done();
    });
  })

  it('should support multiple versions in the same file', function*(){
    var js = yield build('multiple-versions').run();
    var mimes = evaluate(js).mimes;
    assert('image/x-nikon-nef' == mimes[0].lookup('.nef')); // 0.0.2
    assert(null == mimes[1].lookup('.nef')); // 0.0.1
    assert('image/jpeg' == mimes[1].lookup('.jpg'));
  })

  describe('.development(boolean)', function(){
    it('should contain sourcemaps when development is `true`', function*(){
      var duo = build('simple');
      duo.development(true);
      var js = yield duo.run();
      assert(!!~ js.indexOf('//# sourceMappingURL'));
    })

    it('should fetch and build dependencies', function*(){
      this.timeout(20000);
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

  describe('.src(src, type)', function() {
    it('should support passing strings', function *() {
      var src = read('simple/index.js');
      var root = path('simple');
      var duo = Duo(root).src(src, 'js');
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    })

    it('should support transformed strings', function *() {
      var src = read('coffee/index.coffee');
      var root = path('coffee');
      var duo = Duo(root).use(cs).src(src, 'coffee');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx.a == 'a');
      assert(ctx.b == 'b');
      assert(ctx.c == 'c');
    })
  });

  describe('.src(src)', function() {
    it('should recognize js', function *() {
      var src = read('simple/index.js');
      var root = path('simple');
      var duo = Duo(root).src(src);
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    })

    it('should recognize css', function *() {
      var src = read('css-simple-dep/index.css');
      var root = path('css-simple-dep');
      var duo = Duo(root).src(src);
      var css = yield duo.run();
      var out = read('css-simple-dep/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should throw for wrongly classified', function *() {
      var src = read('coffee/index.coffee');
      var root = path('coffee');

      try {
        Duo(root).src(src);
      } catch(e) {
        assert(~e.message.indexOf('could not detect a supported type on this source'))
      }
    });

    it('should throw for non-supported languages', function *() {
      try {
        Duo(__dirname).src('!!;2elk;123v')
      } catch(e) {
        assert(~e.message.indexOf('could not detect a supported type on this source'))
      }
    });
  })

  describe('.copy', function() {
    it('should copy files instead of symlink', function *() {
      var duo = build('copy', 'index.css').copy();
      var file = path('copy/build/duo.png');
      var out = read('copy/index.out.css');
      var css = yield duo.run();
      assert(css == out);
      var stat = yield fs.lstat(file);
      assert(!stat.isSymbolicLink());
    })
  })

  describe('.symlink', function() {
    it('should symlink files by default', function *() {
      var duo = build('symlink', 'index.css');
      var file = path('symlink/build/duo.png');
      var out = read('symlink/index.out.css');
      var css = yield duo.run();
      assert(css == out);
      var stat = yield fs.lstat(file);
      assert(stat.isSymbolicLink());
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

  describe('.use(fn|gen)', function() {
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

    it('should work async', function*() {
      var duo = build('no-deps');
      var called = false;
      duo.use(function(file, entry, fn) {
        setTimeout(function() {
          called = true;
          fn();
        }, 30);
      });

      var js = yield duo.run();
      assert(called);
    })

    it('should work sync', function*() {
      var duo = build('no-deps');
      var called = false;
      duo.use(function(file, entry) {
        called = true;
      });
      var js = yield duo.run();
      assert(called);
    })

    it('should be idempotent across duos', function() {
      var a = build('simple');
      var b = build('no-deps');

      // plugins
      a.use(function ap() {});
      b.use(function bp() {});

      assert(1 == a.plugins.length);
      assert(1 == b.plugins.length);
    })
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

  describe('duo#assets(dir)', function() {
    it('should change the assets dir', function() {
      var duo = build('simple');
      assert(duo.assetPath == join(duo.root, 'build'))
      duo.assets('public')
      assert(duo.assetPath == join(duo.root, 'public'))
    })
  })

  describe('.write([fn])', function() {
    it('should write files to duo.assetPath', function *() {
      var duo = build('simple');
      yield duo.write();
      var js = read('simple/build/index.js');
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    });

    it('should support .write(fn)', function(done) {
      var duo = build('simple-deps');
      duo.write(function(err) {
        if (err) return done(err);
        var js = read('simple-deps/build/index.js')
        var ctx = evaluate(js);
        var type = ctx.main;
        assert(ctx.mods);
        assert(2 == ctx.mods.length);
        assert('string' == ctx.mods[0](''));
        assert('function' == typeof ctx.mods[1]);
        done();
      });
    })

    it('should support a path', function *() {
      var duo = build('simple');
      var out = join(path('simple'), 'build.js');
      yield duo.write(out);
      var js = read('simple/build.js');
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
      rmrf(out);
    })

    it('should support .write(path, fn)', function(done) {
      var duo = build('simple');
      var out = join(path('simple'), 'build.js');

      duo.write(out, function(err) {
        if (err) return done(err);
        var js = read('simple/build.js');
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
        rmrf(out);
        done();
      });
    })

    it('should change type if duo.entryFile\'s type changes', function *() {
      var expected = read('css-styl/index.out.css');
      var duo = build('css-styl', 'index.styl');
      duo.use(stylus);
      yield duo.write();
      var css = read('css-styl/build/index.css');
      assert(expected.trim() == css.trim());
    })

    it('should bundle assets', function *() {
      var expected = read('css-assets/index.out.css');
      var duo = build('css-assets', 'index.css');
      yield duo.write();
      var css = read('css-assets/build/index.css');
      assert(expected.trim() == css.trim());
      assert(exists('css-assets/build/components/duojs-logo@0.0.2/images/logo.svg'));
    })

    it('should bundle assets even if in the cache', function *() {
      var expected = read('css-assets/index.out.css');
      var duo = build('css-assets', 'index.css')
      yield duo.write();
      duo.assets('out');
      yield duo.write('index.css');
      var css = read('css-assets/out/index.css');
      assert(expected.trim() == css.trim());
      assert(exists('css-assets/out/components/duojs-logo@0.0.2/images/logo.svg'));
      rmrf(path('css-assets/out'));
    })
  })

  describe('.install()', function () {
    it('should set the installation path', function *(){
      var duo = build('simple-deps');
      duo.install('deps');
      yield duo.write();
      assert(stat(path('simple-deps', 'deps')));
      var str = yield fs.readFile(path('simple-deps', 'deps', 'duo.json'));
      assert(str && JSON.parse(str));
      rmrf(path('simple-deps', 'deps'));
    })
  })

  describe('.token()', function () {
    it('should set the token', function() {
      var duo = Duo(__dirname);
      duo.token('foo');
      assert('foo' == duo.token());
    })
  })

  describe('.concurrency()', function () {
    it('should set concurrency', function () {
      var duo = Duo(__dirname);
      duo.concurrency(5);
      assert(5 == duo._concurrency);
    })
  });

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

  describe('css', function() {
    it('should work with no deps', function*() {
      var duo = build('css-no-deps', 'index.css');
      var css = yield duo.run();
      var out = read('css-no-deps/index.out.css');
      assert(css == out);
    })

    it('should resolve relative files', function*() {
      var duo = build('css-relative-files', 'index.css');
      var css = yield duo.run();
      var out = read('css-relative-files/index.out.css');
      assert(css == out);
    })

    it('should resolve files with hashes and querystrings', function*() {
      var duo = build('css-hash-query-files', 'index.css');
      var css = yield duo.run();
      var out = read('css-hash-query-files/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should support entry css transforms', function*() {
      var duo = build('css-styl', 'index.styl');
      duo.use(stylus);
      var css = yield duo.run();
      var out = read('css-styl/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should support css transforms', function*() {
      var duo = build('css-styl-deps', 'index.css');
      duo.use(stylus);
      var css = yield duo.run();
      var out = read('css-styl-deps/index.out.css');
      assert(css == out);
    })

    it('should load a simple dep', function*() {
      this.timeout(15000);
      var duo = build('css-simple-dep', 'index.css');
      var css = yield duo.run();
      var out = read('css-simple-dep/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should work with user/repo@ref:path', function*() {
      this.timeout(15000);
      var duo = build('user-repo-ref-path', 'index.css');
      var css = yield duo.run();
      var out = read('user-repo-ref-path/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should work with empty deps', function *() {
      var duo = build('empty-css-file', 'index.css');
      var css = yield duo.run();
      var out = read('empty-css-file/index.out.css');
      assert(css == out);
    })

    it('should ignore http deps', function *() {
      var duo = build('css-http-dep', 'index.css');
      var css = yield duo.run();
      var out = read('css-http-dep/index.out.css');
      assert(css == out);
    })

    it('should ignore image urls if asset is local', function *() {
      var duo = build('css-url', 'lib/inline.css');
      var css = yield duo.run();
      var out = read('css-url/index.out.css');
      assert(css == out.trim());
    })

    it('should keep duplicate references to assets', function *() {
      var duo = build('css-dup-asset', 'index.css');
      var css = yield duo.run();
      var out = read('css-dup-asset/index.out.css');
      assert(css.trim() == out.trim());
    })

    it('should ignore unresolved remote paths', function *() {
      var duo = build('css-ignore-unresolved', 'index.css');
      var css = yield duo.run();
      var out = read('css-ignore-unresolved/index.out.css');
      assert(css == out);
    })
  })

  describe('json', function() {
    it('should load json files', function*() {
      var duo = build('json-dep');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(1 == ctx.a);
      assert(2 == ctx.b);
    })
  })

  describe('components', function() {
    it('should build multi-asset components', function*() {
      this.timeout(15000);
      var duo = build('js-css-dep');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert(ctx({}).dom);
      var duo = build('js-css-dep', 'index.css');
      var out = read('js-css-dep/index.out.css');
      var css = yield duo.run();
      assert(css.trim() == out.trim());
    })

    it('should build components with a main object', function*() {
      var duo = build('main-obj');
      var js = yield duo.run();
      var ctx = evaluate(js).main;
      assert('local' == ctx);
      var duo = build('main-obj', 'index.css');
      var out = read('main-obj/index.out.css');
      var css = yield duo.run();
      assert(css.trim() == out.trim());
    })
  })

  describe('mapping', function() {
    it('should contain keys from all instances', function*() {
      var a = build('concurrent-mapping', 'index.css');
      var b = build('concurrent-mapping');
      yield [a.run(), b.run()];
      var json = yield mapping('concurrent-mapping');
      var keys = Object.keys(json).sort();

      assert(keys[0] == 'components/component-emitter@1.1.3/index.js');
      assert(keys[1] == 'components/component-type@1.0.0/index.js');
      assert(keys[2] == 'components/necolas-normalize.css@3.0.1/normalize.css');
      assert(keys[3] == 'index.css');
      assert(keys[4] == 'index.js' );
    })

    it('should have entry keys for entry files', function *() {
      var a = build('entries', 'index.js');
      var b = build('entries', 'admin.js');
      yield [a.run(), b.run()];
      var json = yield mapping('entries');
      assert(true == json['index.js'].entry);
      assert(true == json['admin.js'].entry);
    })
  })

  describe('symlinks', function() {
    it('should symlink images', function *() {
      var duo = build('symlink-assets', 'index.css');
      var css = yield duo.run();
      var out = read('symlink-assets/index.out.css');
      assert(css == out);

      var imgpath = path('symlink-assets', 'build', 'badgermandu.jpg');
      var symlink = read('symlink-assets/build/badgermandu.jpg');
      var img = read('symlink-assets/badgermandu.jpg');
      assert(isSymlink(imgpath));
      assert(symlink == img);
    })
  })
})

/**
 * Build js `fixture` and return `str`.
 *
 * @param {String} fixture
 * @return {String}
 */

function build(fixture, file){
  var root = path(fixture);
  var duo = Duo(root).entry(file || 'index.js');
  return duo;
}

/**
 * Path to `fixture`
 *
 * @param {String, ...} paths
 * @return {String}
 * @api private
 */

function path(fixture){
  var paths = slice.call(arguments);
  return join.apply(null, [__dirname, 'fixtures'].concat(paths));
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
 */

function evaluate(js, ctx){
  var ctx = ctx || { window: {}, document: {} };
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
    if ('.' == name[0]) return;
    var components = join(dir, name, 'components');
    var build = join(dir, name, 'build');
    rmrf(components);
    rmrf(build);
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
 * Read the file
 */

function read(path) {
  path = join(__dirname, 'fixtures', path);
  return readfile(path, 'utf8');
}

/**
 * is symbolic link?
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

function isSymlink(path) {
  var stat = lstat(path);
  return stat.isSymbolicLink();
}

/**
 * Compile coffeescript
 *
 * @param {File} file
 */

function cs(file) {
  if ('coffee' != file.type) return;
  file.type = 'js';
  file.src = coffee.compile(file.src);
}

/**
 * Compile stylus
 */

function stylus(file) {
  if ('styl' != file.type) return;
  file.type = 'css';
  file.src = styl(file.src, { whitespace: true }).toString();
}
