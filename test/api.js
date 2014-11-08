
/**
 * Module dependencies.
 */

var readdir = require('fs').readdirSync;
var readfile = require('fs').readFileSync;
var dirname = require('path').dirname;
var coffee = require('coffee-script');
var resolve = require('path').resolve;
var exist = require('fs').existsSync;
var mkdir = require('fs').mkdirSync;
var lstat = require('fs').lstatSync;
var rmrf = require('rimraf').sync;
var stat = require('fs').statSync;
var expect = require('expect.js');
var File = require('../lib/file');
var join = require('path').join;
var assert = require('assert');
var styl = require('styl');
var fs = require('co-fs');
var Duo = require('..');
var noop = function (){};
var vm = require('vm');
var slice = [].slice;

/**
 * Tests.
 */

describe('Duo API', function () {
  beforeEach(function () {
    cleanup();
  });

  it('should throw without root', function () {
    var err;
    try {
      Duo();
    } catch (e) {
      err = e;
    }
    assert(err && /root directory/.test(err.message));
  });

  it('should set default options', function () {
    var duo = Duo(__dirname);
    assert.equal(duo._root, __dirname);
    assert.equal(duo._entry, undefined);
    assert.equal(duo._manifest, 'component.json');
    assert.equal(duo._global, undefined);
    assert.equal(duo._installTo, 'components');
    assert.equal(duo._buildTo, 'build');
    assert.equal(duo._copy, false);
    assert.equal(duo._development, false);
    assert.equal(duo._concurrency, 50);
    assert.equal(duo._cache, true);
  });

  describe('.entry()', function () {
    it('should get the current entry file', function () {
      var duo = Duo(__dirname);
      duo._entry = 'entry';
      assert.equal(duo.entry(), 'entry');
    });
  });

  describe('.entry(path)', function () {
    it('should set the entry file by path', function () {
      var duo = Duo(__dirname);
      duo.entry('path');
      var file = duo.entry();
      assert(file instanceof File);
      assert.equal(file.path, join(__dirname, 'path'));
      assert.equal(file.entry, true);
    });
  });

  describe('.entry(source, type)', function () {
    it('should set the entry file by source and type', function () {
      var duo = Duo(__dirname);
      duo.entry('string', 'js');
      var file = duo.entry();
      assert(file instanceof File);
      assert.equal(file.raw, 'string');
      assert.equal(file.type, 'js');
    });
  });

  describe('.root()', function () {
    it('should get the root path', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.root(), __dirname);
    });
  });

  describe('.root(path)', function () {
    it('should set the root path', function () {
      var duo = Duo(__dirname);
      duo.root('root');
      assert.equal(duo.root(), 'root');
    });
  });

  describe('.token()', function () {
    it('should get the token name', function () {
      var duo = Duo(__dirname);
      duo._token = 'token';
      assert.equal(duo.token(), 'token');
    });
  });

  describe('.token(name)', function () {
    it('should set the token name', function () {
      var duo = Duo(__dirname);
      duo.token('secret');
      assert.equal(duo.token(), 'secret');
    });
  });

  describe('.manifest()', function () {
    it('should get the manifest name', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.manifest(), 'component.json');
    });
  });

  describe('.manifest(name)', function () {
    it('should set the manifest name', function () {
      var duo = Duo(__dirname);
      duo.manifest('package.json');
      assert.equal(duo.manifest(), 'package.json');
    });
  });

  describe('.global()', function () {
    it('should get the global name', function () {
      var duo = Duo(__dirname);
      duo._global = 'global';
      assert.equal(duo.global(), 'global');
    });
  });

  describe('.global(name)', function () {
    it('should set the global name', function () {
      var duo = Duo(__dirname);
      duo.global('package.json');
      assert.equal(duo.global(), 'package.json');
    });
  });

  describe('.development()', function () {
    it('should get whether to build with development dependencies', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.development(), false);
    });
  });

  describe('.development(name)', function () {
    it('should set whether to build with development dependencies', function () {
      var duo = Duo(__dirname);
      duo.development(true);
      assert.equal(duo.development(), true);
    });
  });

  describe('.copy()', function () {
    it('should get whether to copy files instead of symlinking', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.copy(), false);
    });
  });

  describe('.copy(name)', function () {
    it('should set whether to copy files instead of symlinking', function () {
      var duo = Duo(__dirname);
      duo.copy(true);
      assert.equal(duo.copy(), true);
    });
  });

  describe('.concurrency()', function () {
    it('should get the download concurrency value', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.concurrency(), 50);
    });
  });

  describe('.concurrency(value)', function () {
    it('should set the download concurrency value', function () {
      var duo = Duo(__dirname);
      duo.concurrency(1);
      assert.equal(duo.concurrency(), 1);
    });
  });

  describe('.cache()', function () {
    it('should get the cache flag', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.cache(), true);
    });
  });

  describe('.cache(value)', function () {
    it('should set the cache flag', function () {
      var duo = Duo(__dirname);
      duo.cache(true);
      assert.equal(duo.cache(), true);
      duo.cache(false);
      assert.equal(duo.cache(), false);
    });
  });

  describe('.installTo()', function () {
    it('should get the relative path to the install directory', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.installTo(), 'components');
    });

    it('should set the relative path to the install directory', function () {
      var duo = Duo(__dirname);
      duo.installTo('modules');
      assert.equal(duo.installTo(), 'modules');
    });
  });

  describe('.buildTo()', function () {
    it('should get the relative path to the build directory', function () {
      var duo = Duo(__dirname);
      assert.equal(duo.buildTo(), 'build');
    });

    it('should set the relative path to the build directory', function () {
      var duo = Duo(__dirname);
      duo.buildTo('public');
      assert.equal(duo.buildTo(), 'public');
    });
  });

  describe('.path(paths...)', function () {
    it('should resolve paths relative to the root directory', function () {
      var duo = Duo(__dirname);
      var dir = join(__dirname, 'folder');
      assert.equal(duo.path('folder'), dir);
    });
  });

  describe('.buildPath(paths...)', function () {
    it('should resolve paths relative to the build directory', function () {
      var duo = Duo(__dirname);
      var dir = join(__dirname, 'build', 'folder');
      assert.equal(duo.buildPath('folder'), dir);
    });
  });

  describe('.installPath(paths...)', function () {
    it('should resolve paths relative to the install directory', function () {
      var duo = Duo(__dirname);
      var dir = join(__dirname, 'components', 'folder');
      assert.equal(duo.installPath('folder'), dir);
    });
  });

  describe('.include(name, src, [type])', function () {
    it('should add the specified module to the includes hash', function () {
      var duo = build('includes');
      duo.include('some-include', 'module.exports = "a"');
      assert('some-include' in duo.includes);
    });

    it('should parse the included file for dependencies (when a type is specified)', function () {
      var duo = build('includes');
      duo.include('some-include', 'require("other-include");', 'js');
      assert('other-include' in duo.includes['some-include'].deps);
    });
  });

  describe('.included(name)', function () {
    it('should tell us if something has already been included', function () {
      var duo = build('includes');
      assert(!duo.included('some-include'));
      duo.include('some-include', 'module.exports = "a"');
      assert(duo.included('some-include'));
    });
  });

  describe('.run([fn])', function () {
    it('should ignore runs without an entry or source', function *() {
      var js = yield Duo(__dirname).run();
      assert('' == js);
    });

    it('should build simple modules', function *() {
      var js = yield build('simple').run();
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    });

    it('should build require conflicts', function*(){
      this.timeout(10000);
      var js = yield build('require-conflict').run();
      var ctx = evaluate(js);
      var mod = ctx.main;
      assert(mod.send != mod.json, 'segmentio/json == yields/send-json');
    });

    it('should build with no deps', function *() {
      var js = yield build('no-deps').run();
      var ctx = evaluate(js).main;
      assert('a' == ctx)
    });

    it('resolve directories like `require(./lib)`', function *() {
      var js = yield build('resolve').run();
      var ctx = evaluate(js);
      assert.deepEqual('resolved', ctx.main);
    });

    it('should resolve relative files like `require(../path/file.js`)', function *() {
      var js = yield build('resolve-file').run();
      var ctx = evaluate(js);
      assert('resolved' == ctx.main);
    });

    it('should resolve dependencies like require("..")', function *() {
      var js = yield build('relative-path', 'test/test.js').run();
      var ctx = evaluate(js);
      assert('index' == ctx.main);
    });

    it('should fetch and build direct dependencies', function *() {
      this.timeout(15000);
      var js = yield build('simple-deps').run();
      var ctx = evaluate(js);
      var type = ctx.main;
      assert(ctx.mods);
      assert(2 == ctx.mods.length);
      assert('string' == ctx.mods[0](''));
      assert('function' == typeof ctx.mods[1]);
    });

    it('should fetch dependencies from manifest', function *() {
      var js = yield build('manifest-deps').run();
      var ctx = evaluate(js);
      var type = ctx.main;
      assert('string' == type(''));
    });

    it('should be idempotent', function *() {
      var a = yield build('idempotent').run();
      var b = yield build('idempotent').run();
      var c = yield build('idempotent').run();
      a = evaluate(a).main;
      b = evaluate(b).main;
      c = evaluate(c).main;
      assert('string' == a(''));
      assert('string' == b(''));
      assert('string' == c(''));
    });

    it('should rebuild correctly when a file is touched', function *() {
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
    });

    it('should resolve repos with different names', function *() {
      this.timeout(15000);
      var js = yield build('different-names').run();
      var ms = evaluate(js).main;
      assert(36000000 == ms('10h'));
    });

    it('should resolve dependencies that use require("{user}-{repo}")', function *() {
      var js = yield build('user-repo-dep').run();
      var type = evaluate(js).main;
      assert('string' == type(js));
    });

    it('.run(fn) should work with a function', function (done) {
      build('simple').run(function (err, js) {
        assert(!err);
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
        done();
      });
    });

    it('should support multiple versions in the same file', function *() {
      var js = yield build('multiple-versions').run();
      var mimes = evaluate(js).mimes;
      assert('image/x-nikon-nef' == mimes[0].lookup('.nef')); // 0.0.2
      assert(null == mimes[1].lookup('.nef')); // 0.0.1
      assert('image/jpeg' == mimes[1].lookup('.jpg'));
    });

    describe('with .entry(path)', function () {
      it('should work with full paths for entry files', function *() {
        var entry = join(path('simple'), 'index.js');
        var js = yield build('simple', entry).run();
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
      });

      it('should throw if the entry file doesn\'t exist', function *() {
        var duo = Duo(__dirname).entry('zomg.js');

        try {
          yield duo.run();
        } catch (e) {
          assert(~e.message.indexOf('cannot find entry: zomg.js'));
        }
      });

      it('should treat entries idempotently', function *() {
        var root = path('simple');
        var duo = Duo(root).entry('hi.js');
        duo.entry('index.js');
        var js = yield duo.run();
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
        var json = yield mapping('simple');
        assert(true == json['index.js'].entry);
      });
    });

    describe('with .entry(source, type)', function () {
      it('should support passing raw source for entry files', function *() {
        var src = read('simple/index.js');
        var root = path('simple');
        var duo = Duo(root).entry(src, 'js');
        var js = yield duo.run();
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
      });

      it('should support passing transformed raw source for entry files', function *() {
        var src = read('coffee/index.coffee');
        var root = path('coffee');
        var duo = Duo(root).use(cs).entry(src, 'coffee');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx.a == 'a');
        assert(ctx.b == 'b');
        assert(ctx.c == 'c');
      });
    });


    describe('with .development(false)', function () {
      it('should not generate sourcemaps', function *() {
        var js = yield build('simple').run();
        assert(!~ js.indexOf('//# sourceMappingURL'));
      });
    });

    describe('with .development(true)', function () {
      it('should generate sourcemaps', function *() {
        var duo = build('simple');
        duo.development(true);
        var js = yield duo.run();
        assert(!!~ js.indexOf('//# sourceMappingURL'));
      });

      it('should fetch and bundle development dependencies', function *() {
        this.timeout(20000);
        var duo = build('simple-dev-deps');
        duo.development(true);
        var js = yield duo.run();
        var ctx = evaluate(js);
        assert('trigger' == ctx.mods[0].name);
        assert('function' == typeof ctx.mods[1].equal);
      });
    });

    describe('with .copy(false)', function () {
      it('should symlink files', function *() {
        var duo = build('symlink', 'index.css');
        var file = path('symlink/build/duo.png');
        var out = read('symlink/index.out.css');
        var css = yield duo.run();
        assert(css == out);
        var stat = yield fs.lstat(file);
        assert(stat.isSymbolicLink());
      });
    });

    describe('with .copy(true)', function () {
      it('should copy files instead of symlink', function *() {
        var duo = build('copy', 'index.css').copy(true);
        var file = path('copy/build/duo.png');
        var out = read('copy/index.out.css');
        var css = yield duo.run();
        assert(css == out);
        var stat = yield fs.lstat(file);
        assert(!stat.isSymbolicLink());
      });

      it('should not empty the target file when symlinked then copied. fixes: #356', function *() {
        // symlink
        var duo = build('copy', 'index.css').copy(false);
        var original = read('copy/duo.png');
        var file = path('copy/build/duo.png');
        var css = yield duo.run();
        var stat = yield fs.lstat(file);
        assert(original == read(file));
        assert(stat.isSymbolicLink());

        // copy
        duo = build('copy', 'index.css').copy(true);
        css = yield duo.run();
        stat = yield fs.lstat(file);
        assert(!stat.isSymbolicLink());
        assert(original == read(file));
        assert(original == read('copy/duo.png'));
      })
    });

    describe('with .global(name)', function () {
      it('should expose the entry as a global', function *() {
        var duo = build('global');
        duo.global('global-module');
        var js = yield duo.run();
        var ctx = evaluate(js);
        assert('global module' == ctx['global-module']);
      });
    });

    describe('with .cache(false)', function () {
      it('should have an empty mapping', function *() {
        var duo = build('idempotent').cache(false);
        yield duo.run();
        assert.deepEqual(duo.mapping, {});
      });
    });

    describe('with .use(fn|gen)', function () {
      it('should transform entry files', function *() {
        var duo = build('coffee', 'index.coffee');
        duo.use(cs);
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx.a == 'a');
        assert(ctx.b == 'b');
        assert(ctx.c == 'c');
      });

      it('should transform deps', function *() {
        var duo = build('coffee-deps')
        duo.use(cs);
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx.a == 'a');
        assert(ctx.b == 'b');
        assert(ctx.c == 'c');
      });

      it('should work with generators', function *() {
        var duo = build('coffee', 'index.coffee');
        var called = false;
        duo.use(cs).use(function *() { called = true; });
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx.a == 'a');
        assert(ctx.b == 'b');
        assert(ctx.c == 'c');
        assert(called);
      });

      it('should work async', function *() {
        var duo = build('no-deps');
        var called = false;
        duo.use(function (file, entry, fn) {
          setTimeout(function () {
            called = true;
            fn();
          }, 30);
        });

        var js = yield duo.run();
        assert(called);
      });

      it('should work sync', function *() {
        var duo = build('no-deps');
        var called = false;
        duo.use(function (file, entry) {
          called = true;
        });
        var js = yield duo.run();
        assert(called);
      });

      it('should be idempotent across duos', function () {
        var a = build('simple');
        var b = build('no-deps');

        // plugins
        a.use(function ap() {});
        b.use(function bp() {});

        assert(1 == a.plugins.length);
        assert(1 == b.plugins.length);
      });
    });

    describe('with .include(name, source)', function () {
      it('should include a string as a source', function *() {
        var duo = build('includes');
        duo.include('some-include', 'module.exports = "a"');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx == 'a');
      });

      it('should be idempotent', function *() {
        var duo = build('includes');
        duo.include('some-include', 'module.exports = "a"');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx == 'a');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx == 'a');
      });
    });

    describe('with bundles', function () {
      it('should support multiple bundles', function *() {
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
      });
    });

    describe('with css', function () {
      it('should work with no deps', function *() {
        var duo = build('css-no-deps', 'index.css');
        var css = yield duo.run();
        var out = read('css-no-deps/index.out.css');
        assert(css == out);
      });

      it('should resolve relative files', function *() {
        var duo = build('css-relative-files', 'index.css');
        var css = yield duo.run();
        var out = read('css-relative-files/index.out.css');
        assert(css == out);
      });

      it('should resolve files with hashes and querystrings', function *() {
        var duo = build('css-hash-query-files', 'index.css');
        var css = yield duo.run();
        var out = read('css-hash-query-files/index.out.css');
        assert(css.trim() == out.trim());
      });

      it('should support entry css transforms', function *() {
        var duo = build('css-styl', 'index.styl');
        duo.use(stylus);
        var css = yield duo.run();
        var out = read('css-styl/index.out.css');
        assert(css.trim() == out.trim());
      });

      it('should support css transforms', function *() {
        var duo = build('css-styl-deps', 'index.css');
        duo.use(stylus);
        var css = yield duo.run();
        var out = read('css-styl-deps/index.out.css');
        assert(css == out);
      });

      it('should load a simple dep', function *() {
        this.timeout(15000);
        var duo = build('css-simple-dep', 'index.css');
        var css = yield duo.run();
        var out = read('css-simple-dep/index.out.css');
        assert(css.trim() == out.trim());
      });

      it('should work with user/repo@ref:path', function *() {
        this.timeout(15000);
        var duo = build('user-repo-ref-path', 'index.css');
        var css = yield duo.run();
        var out = read('user-repo-ref-path/index.out.css');
        assert(css.trim() == out.trim());
      });

      it('should work with empty deps', function *() {
        var duo = build('empty-css-file', 'index.css');
        var css = yield duo.run();
        var out = read('empty-css-file/index.out.css');
        assert(css == out);
      });

      it('should ignore http deps', function *() {
        var duo = build('css-http-dep', 'index.css');
        var css = yield duo.run();
        var out = read('css-http-dep/index.out.css');
        assert(css == out);
      });

      it('should ignore image urls if asset is local', function *() {
        var duo = build('css-url', 'lib/inline.css');
        var css = yield duo.run();
        var out = read('css-url/index.out.css');
        assert(css == out);
      });

      it('should keep duplicate references to assets', function *() {
        var duo = build('css-dup-asset', 'index.css');
        var css = yield duo.run();
        var out = read('css-dup-asset/index.out.css');
        assert(css.trim() == out.trim());
      });

      it('should ignore unresolved remote paths', function *() {
        var duo = build('css-ignore-unresolved', 'index.css');
        var css = yield duo.run();
        var out = read('css-ignore-unresolved/index.out.css');
        assert(css == out);
      });
    });

    describe('with json', function () {
      it('should load json files', function *() {
        var duo = build('json-dep');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(1 == ctx.a);
        assert(2 == ctx.b);
      });
    });

    describe('with components', function () {
      it('should build multi-asset components', function *() {
        this.timeout(15000);
        var duo = build('js-css-dep');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert(ctx({}).dom);
        var duo = build('js-css-dep', 'index.css');
        var out = read('js-css-dep/index.out.css');
        var css = yield duo.run();
        assert(css.trim() == out.trim());
      });

      it('should build components with a main object', function *() {
        var duo = build('main-obj');
        var js = yield duo.run();
        var ctx = evaluate(js).main;
        assert('local' == ctx);
        var duo = build('main-obj', 'index.css');
        var out = read('main-obj/index.out.css');
        var css = yield duo.run();
        assert(css.trim() == out.trim());
      });

      it('should work on a full hybrid that triggers css-compat', function *() {
        this.timeout(20000);
        var duo = build('hybrid-full');

        // TODO: figure out how to simulate a browser-like
        // environment to run this code. For now we're just
        // ensuring nothing throws.
        var js = yield duo.run();

        var duo = build('hybrid-full', 'index.css');
        var css = yield duo.run();

        // this is more resistent to version changes
        var menu = css.indexOf('.menu {');
        var dropdown = css.indexOf('.dropdown-link {');
        var body = css.indexOf('.hybrid-full {');

        // test order
        assert(-1 < menu < dropdown < body);
      });
    });

    describe('with mapping', function () {
      it('should contain keys from all instances', function *() {
        var a = build('concurrent-mapping', 'index.css');
        var b = build('concurrent-mapping');
        yield [a.run(), b.run()];
        var json = yield mapping('concurrent-mapping');
        var keys = Object.keys(json).sort();
        assert(keys[0] == 'components/component-emitter@1.1.3/index.js');
        assert(keys[1] == 'components/component-type@1.0.0/index.js');
        assert(keys[2] == 'components/necolas-normalize.css@3.0.2/normalize.css');
        assert(keys[3] == 'index.css');
        assert(keys[4] == 'index.js' );
      });

      it('should have entry keys for entry files', function *() {
        var a = build('entries', 'index.js');
        var b = build('entries', 'admin.js');
        yield [a.run(), b.run()];
        var json = yield mapping('entries');
        assert(true == json['index.js'].entry);
        assert(true == json['admin.js'].entry);
      });
    });

    describe('with symlinks', function () {
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
      });
    });
  });

  describe('.write([fn])', function () {
    it('should write files to duo.assetPath', function *() {
      var duo = build('simple');
      yield duo.write();
      var js = read('simple/build/index.js');
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
    });

    it('should support .write(fn)', function (done) {
      var duo = build('simple-deps');
      duo.write(function (err) {
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
    });

    it('should support a path', function *() {
      var duo = build('simple');
      var out = join(path('simple'), 'build.js');
      yield duo.write(out);
      var js = read('simple/build.js');
      var ctx = evaluate(js);
      assert.deepEqual(['one', 'two'], ctx.main);
      rmrf(out);
    });

    it('should support .write(path, fn)', function (done) {
      var duo = build('simple');
      var out = join(path('simple'), 'build.js');

      duo.write(out, function (err) {
        if (err) return done(err);
        var js = read('simple/build.js');
        var ctx = evaluate(js);
        assert.deepEqual(['one', 'two'], ctx.main);
        rmrf(out);
        done();
      });
    });

    it('should change type if duo.entryFile\'s type changes', function *() {
      var expected = read('css-styl/index.out.css');
      var duo = build('css-styl', 'index.styl');
      duo.use(stylus);
      yield duo.write();
      var css = read('css-styl/build/index.css');
      assert(expected.trim() == css.trim());
    });

    it('should bundle assets', function *() {
      this.timeout(10000);
      var expected = read('css-assets/index.out.css');
      var duo = build('css-assets', 'index.css');
      yield duo.write();
      var css = read('css-assets/build/index.css');
      assert(expected.trim() == css.trim());
      assert(exists('css-assets/build/components/duojs-logo@0.0.2/images/logo.svg'));
    });

    it('should bundle assets even if in the cache', function *() {
      var expected = read('css-assets/index.out.css');
      var duo = build('css-assets', 'index.css')
      yield duo.write();
      duo.buildTo('out');
      yield duo.write('index.css');
      var css = read('css-assets/out/index.css');
      assert(expected.trim() == css.trim());
      assert(exists('css-assets/out/components/duojs-logo@0.0.2/images/logo.svg'));
      rmrf(path('css-assets/out'));
    });

    describe('with .installTo(directory)', function () {
      it('should write to the installation directory', function *(){
        var duo = build('simple-deps');
        duo.installTo('deps');
        yield duo.write();
        assert(stat(path('simple-deps', 'deps')));
        var str = yield fs.readFile(path('simple-deps', 'deps', 'duo.json'));
        assert(str && JSON.parse(str));
        rmrf(path('simple-deps', 'deps'));
      });
    });
  });
});

/**
 * Build a `fixture` with an optional entry `file`, and return the built source.
 *
 * @param {String} fixture
 * @return {String}
 */

function build(fixture, file) {
  var root = path(fixture);
  var duo = Duo(root).entry(file || 'index.js');
  return duo;
}

/**
 * Resolve the path to a fixture.
 *
 * @param {String} paths...
 * @return {String}
 */

function path() {
  var paths = slice.call(arguments);
  return join.apply(null, [__dirname, 'fixtures'].concat(paths));
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
 * Evaluate a Javascript `string` with `ctx`.
 *
 * @param {String} string
 * @param {Object} ctx
 * @return {Object}
 */

function evaluate(js, ctx) {
  var ctx = ctx || { window: {}, document: {} };
  vm.runInNewContext('main =' + js + '(1)', ctx, 'main.vm');
  vm.runInNewContext('require =' + js + '', ctx, 'require.vm');
  return ctx;
}

/**
 * Cleanup after the tests.
 */

function cleanup() {
  var dir = join(__dirname, 'fixtures');
  var dirs = readdir(dir);
  dirs.forEach(function (name) {
    if ('.' == name[0]) return;
    var components = join(dir, name, 'components');
    var build = join(dir, name, 'build');
    rmrf(components);
    rmrf(build);
  });
}

/**
 * Get the mapping from a `fixture`.
 *
 * @param {String} fixture
 * @return {Object}
 */

function *mapping(fixture) {
  var root = path(fixture);
  var mapping = join(root, 'components', 'duo.json');
  var str = yield fs.readFile(mapping, 'utf8');
  return JSON.parse(str);
}

/**
 * Read a fixture file by `path`.
 *
 * @param {String} path
 * @return {String}
 */

function read(path) {
  path = resolve(__dirname, 'fixtures', path);
  return readfile(path, 'utf8');
}

/**
 * Check whether a `path` is a symbolic link.
 *
 * @param {String} path
 * @return {Boolean}
 */

function isSymlink(path) {
  var stat = lstat(path);
  return stat.isSymbolicLink();
}

/**
 * A Duo plugin to compile a Coffeescript `file`.
 *
 * @param {File} file
 */

function cs(file) {
  if ('coffee' != file.type) return;
  file.type = 'js';
  file.src = coffee.compile(file.src);
}

/**
 * A Duo plugin to compile a Stylus `file`.
 *
 * @param {File} file
 */

function stylus(file) {
  if ('styl' != file.type) return;
  file.type = 'css';
  file.src = styl(file.src, { whitespace: true }).toString();
}
