var minibar = require('../../..');
var ResourceExtension = require('../../../src/nunjucks/resource.js');
var nunjucks = require('nunjucks');
var sinon = require('sinon');

var requestStub = function(url, cb) {
  if(url === 'https://api.github.com/invalid') {
    cb(false, {}, 'invalid json');
  } else if(url === '/invalid') {
    cb(new Error('Invalid url'), {}, false);
  } else {
    cb(false, {}, JSON.stringify({
      name: 'Jacky',
      likes: 5
    }));
  }
};

describe('nunjucks resource tag:', function(){

  var env, ext, interceptor;
  beforeEach(function(){
    interceptor = minibar.interceptor({configFile: __dirname+'/../fixtures/endpoint/endpoints_valids.json'});
    sinon.stub(interceptor, "request", requestStub);

    env = nunjucks.configure(__dirname + '/../fixtures/views/resource', {});
    ext = new ResourceExtension(interceptor);
    env.addExtension('ResourceExtension', ext);
  });

  it('should have been loaded', function(){
    env.extensions.should.have.property('ResourceExtension');
  });

  describe('parseResource()', function(){

    it('should throw on invalid usage', function(){
      (function(){
        var res = ext.parseResource({});
      }).should.throw(/Argument/);
      
      (function(){
        var res = ext.parseResource('http://api.com/users/ad');
      }).should.throw(/Invalid resource specification/);

      (function(){
        var res = ext.parseResource(' AS http://api.com/users/ad');
      }).should.throw(/Invalid resource specification/);

      (function(){
        var res = ext.parseResource('http://api.com/users/ad AS ');
      }).should.throw(/Invalid resource specification/);
    });

    it('should return resoure objects on valid usage', function(){
      var user = ext.parseResource('http://api.com/users/ad AS user');
      user.should.have.property('url').and.equal('http://api.com/users/ad');
      user.should.have.property('variable').and.equal('user');
    });

  });

  describe('parse()', function(){

    it('should parse simple template, dont touch content, add one object to context', function(done){
      env.render('simple.html', {}, function(err, res){
        if(err)
          throw err;

        res.should.equal('before\nseethroughJacky\nafter');
        done();
      });
    });
    
    it('should throw async during parse on extra arguments', function(){
      (function(){
        env.render('invalid1.html', {});
      }).should.throw(/too many arguments/);
    });

    it('should throw async invalid json is returned', function(){
      (function(){
        env.render('invalid2.html', {});
      }).should.throw(/Error while parsing JSON/);
    });

    it('should throw async invalid request', function(){
      (function(){
        env.render('invalid3.html', {});
      }).should.throw(/Invalid url/);
    });

  });


});