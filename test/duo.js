
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
    var js = yield build('simple');
    var ctx = evaluate(js);
    assert.deepEqual(['one', 'two'], ctx.main);
  });

  it('resolve directories like `require(./lib)`', function*(){
    var js = yield build('resolve');
    var ctx = evaluate(js);
    assert.deepEqual('resolved', ctx.main);
  });

  it('should fetch and build direct dependencies', function*(){
    var js = yield build('simple-deps');
    var ctx = evaluate(js);
    var type = ctx.main;
    assert('string' == type(js));
  })

  it('should fetch dependencies from manifest', function*(){
    var js = yield build('manifest-deps');
    var ctx = evaluate(js);
    var type = ctx.main;
    assert('string' == type(js));
  })
})

/**
 * Build `fixture` and return `str`.
 *
 * @param {String} fixture
 * @return {String}
 */

function *build(fixture){
  var root = join(__dirname, 'fixtures', fixture);
  return yield Duo(root)
    .entry('index.js')
    .run();
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
