
var proc = require('child_process');
var join = require('path').join;
var assert = require('assert');
var fs = require('co-fs');
var vm = require('vm');

describe('Duo CLI', function(){
  var out = {};
  var ctx = {};

  beforeEach(function(){
    out = {};
    ctx = {};
  });

  describe('duo entry.js build.js', function(){
    it('should build to build.js', function*(){
      out = yield exec('duo index.js build.js', 'cli-duo');
      ctx = yield build('cli-duo');
      assert.equal(true, ctx.duo);
      yield remove('cli-duo');
    });
  });

  describe('duo entry.js', function(){
    it('should write to stdout', function*(){
      out = yield exec('duo index.js', 'cli-duo');
      assert(out.stdout);
      ctx = evaluate(out.stdout);
      assert.equal(true, ctx.duo);
    });
  });

  describe('duo ls', function(){
    before(function *(){
      yield exec('duo index.js build.js', 'cli-duo-ls');
    })

    after(function *(){
      yield remove('cli-duo-ls');
    })

    it('should list all dependencies', function*(){
      out = yield exec('duo ls', 'cli-duo-ls');
      assert(out.stdout, 'expected stdout to be truthy');
      assert.equal('', out.stderr.trim(), 'expected stderr to be empty');
    });
  });

  describe('duo duplicates', function(){
    it('should list all duplicates', function*(){
      out = yield exec('duo duplicates', 'cli-duo-ls');
      assert(out.stdout, 'expected stdout to be truthy');
      assert.equal('', out.stderr.trim(), 'expected stderr to be empty');
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
 * Remove `fixture/build.js`
 */

function *remove(fixture){
  var path = join(__dirname, 'fixtures', fixture, 'build.js');
  yield fs.unlink(path);
}

/**
 * Get fixture `build.js`
 */

function *build(fixture){
  var path = join(__dirname, 'fixtures', fixture, 'build.js');
  var js = yield fs.readFile(path, 'utf-8');
  return evaluate(js);
}

/**
 * Evalaute `js`
 */

function evaluate(js){
  var ctx = {};
  vm.runInNewContext(js, ctx, 'duo-cli-vm');
  return ctx;
}

/**
 * Execute `cmd` with `cwd`
 */

function *exec(cmd, cwd){
  cmd = join(__dirname, '..', 'bin', cmd);
  cwd = join(__dirname, 'fixtures', cwd);
  return yield execute(cmd, { cwd: cwd });
}

/**
 * Execute `cmd` with `opts`
 */

function execute(command, opts){
  return function(done){
    proc.exec(command, opts, function(err, stdout, stderr){
      if (err) return done(err);
      done(null, {
        stdout: stdout,
        stderr: stderr
      });
    });
  };
}
