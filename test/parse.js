
var parse = require('../lib/parse');
var expect = require('expect.js');

describe('parse()', function(){
  describe('user/repo@ref/path', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo@1.0.0/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0',
        path: '/index.js'
      });
    })
  })

  describe('user/repo@ref', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo@1.0.0')).to.eql({
        user: 'user',
        repo: 'repo',
        ref: '1.0.0'
      });
    })
  })

  describe('user/repo/path', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo/index.js')).to.eql({
        user: 'user',
        repo: 'repo',
        path: '/index.js'
      });
    })
  })

  describe('user/repo', function(){
    it('should parse correctly', function(){
      expect(parse('user/repo')).to.eql({
        user: 'user',
        repo: 'repo'
      });
    })
  })

  describe('repo', function(){
    it('should parse correctly', function(){
      expect(parse('repo')).to.eql({
        repo: 'repo',
      });
    })
  })
})
