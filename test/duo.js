
var readdir = require('fs').readdirSync;
var dirname = require('path').dirname;
var mkdir = require('fs').mkdirSync;
var rmrf = require('rimraf').sync;
var expect = require('expect.js');
var join = require('path').join;
var assert = require('assert');
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
  var root = join(__dirname, 'fixtures', fixture);
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
