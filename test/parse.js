
var parse = require('../lib/parse');
var expect = require('expect.js');

describe('parse()', function(){
  describe('user/repo@ref/path', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo@1.0.0:/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0',
        path: '/index.js',
        provider: 'github.com',
      });
    })

    it('should parse with v1.0.0', function(){
      expect(parse('user/repo@v1.0.0:/dist/css')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: 'v1.0.0',
        path: '/dist/css',
        provider: 'github.com',
      });
    })

    it('should handle refs with "/" and a path', function() {
      expect(parse('user/repo@add/feature:/dist/css')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: 'add/feature',
        path: '/dist/css',
        provider: 'github.com',
      });
    })

    it('should handle refs with "/" and a path with "."', function() {
      expect(parse('user/repo@add/feature:./dist/css')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: 'add/feature',
        path: './dist/css',
        provider: 'github.com',
      });
    })

    it('should handle refs with "/" and a path with "."', function() {
      expect(parse('user/repo@add/feature:dist/css')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: 'add/feature',
        path: 'dist/css',
        provider: 'github.com',
      });
    })
  })

  describe('provider/repo@ref/path', function () {
    it('should parse correctly', function () {
      expect(parse('provider.com/user/repo@1.0.0:/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0',
        path: '/index.js',
        provider: 'provider.com',
      });
    });
  })

  describe('user/repo@ref', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo@1.0.0')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0',
        provider: 'github.com',
      });
    })
  })

  describe('provider/user/repo@ref', function(){
    it('should parse correctly', function(){
      expect(parse('provider.com/user/repo@1.0.0')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0',
        provider: 'provider.com',
      });
    })
  })

  describe('user/repo/path', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo:/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        path: '/index.js',
        provider: 'github.com',
      });
    })
  })

  describe('provider/user/repo/path', function(){
    it('should parse correctly', function(){
      expect(parse('provider.com/user/repo:/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        path: '/index.js',
        provider: 'provider.com',
      });
    })
  })

  describe('user/repo', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo')).to.eql({
        user: 'user',
        repo: 'repo',
        provider: 'github.com',
      });
    })
  })

  describe('provider/user/repo', function(){
    it('should parse correctly', function(){
      expect(parse('provider.com/user/repo')).to.eql({
        user: 'user',
        repo: 'repo',
        provider: 'provider.com',
      });
    })
  })

  describe('repo', function(){
    it('should parse correctly', function(){
      expect(parse('repo')).to.eql({
        repo: 'repo',
        provider: 'github.com',
      });
    })
  })
})
