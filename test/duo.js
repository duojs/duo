
var readdir = require('fs').readdirSync;
var dirname = require('path').dirname;
var mkdir = require('fs').mkdirSync;
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

  it('should prevent requires from requiring higher than root', function*() {
    try {
      var js = yield build('unsafe').run();
    } catch (e) {
      // TODO: ensure correct error message,
      // better error isn't passing that through
      return;
    }

    assert(false);
  })

  it('should fetch and build direct dependencies', function*(){
    var js = yield build('simple-deps').run();
    var ctx = evaluate(js);
    var type = ctx.main;
    assert('string' == type(js));
  })

  it('should fetch dependencies from manifest', function*(){
    var js = yield build('manifest-deps').run();
    var ctx = evaluate(js);
    var type = ctx.main;
    assert('string' == type(js));
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

  describe('.global(name)', function(){
    it('should expose the entry as a global', function*(){
      var duo = build('global');
      duo.global('global-module');
      var js = yield duo.run();
      var ctx = evaluate(js);
      assert('global module' == ctx['global-module']);
    })
  })
})

/**
 * Build `fixture` and return `str`.
 *
 * @param {String} fixture
 * @return {String}
 */

function build(fixture){
  var root = path(fixture);
  return Duo(root).entry('index.js');
}

/**
 * Evaluate `js`.
 *
 * @return {Object}
 */

function evaluate(js, ctx){
  var ctx = { window: {} };
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
    mkdir(path);
  });
}

/**
 * Path to `fixture`
 */

function path(fixture){
  return join(__dirname, 'fixtures', fixture);
}
