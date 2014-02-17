var minibar = require('../..');
var nconf = require('nconf');
var fs = require('fs');
var path = require('path');
var temp = require('temp');

temp.track();
describe('minibar interceptor:', function(){

  it('factory should create a object with correct interface', function(){
    var interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});

    //test interface
    interceptor.should.have.property('request').and.be.an.instanceOf(Function);
    interceptor.should.have.property('frontRouter').and.be.an.instanceOf(Object);
    interceptor.should.have.property('backRouter').and.be.an.instanceOf(Object);
    interceptor.should.have.property('endpoints').and.be.an.instanceOf(Object);
    interceptor.should.have.property('endpointConfig').and.be.an.instanceOf(Object);
  });

  it('factory should throw on wrong argument', function(){

    (function(){
      minibar.interceptor();
    }).should.throw(/Argument/);

    (function(){
      minibar.interceptor({configFile: __dirname+'/bogus.json'});
    }).should.throw(/Could not find/);

  });

  it('getEnvConfigFile()', function(){
    var interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    (function(){
      interceptor.getEnvConfigFile('endpoints_valids.js', 'dev');
    }).should.throw(/json extension/);

    interceptor.getEnvConfigFile('/fixtures/endpoint/endpoints_valids.json', 'dev').should.equal('/fixtures/endpoint/endpoints_valids_dev.json');

  });


  it('should load configuration based on environment', function(){

    //default env should be 'dev'
    var interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    interceptor.env.should.equal('dev');

    //should have merged, but kept default configuration because it's not specified
    interceptor.endpointConfig['http://www.google.com/results'].headers['User-Agent'].should.equal('request-test');
    interceptor.configuration.get('resource_dir').should.equal('../res');

    interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json', env: 'test'});
    interceptor.env.should.equal('test');

    //should not have merged because _test.json doesn't exist
    interceptor.endpointConfig['http://www.google.com/results'].headers['User-Agent'].should.equal('request');

  });


  describe('parse()', function(){
    var interceptor;
    beforeEach(function(){
      interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    });

    it('throw on invalid arguments', function(){

      (function(){
        interceptor.parse('/hello/ad', {});
      }).should.throw(/Exception while parsing endpoint/);

      (function(){
        interceptor.parse('www.google.com/hello/ad', {});  
      }).should.throw(/Exception while parsing endpoint/);

      (function(){
        interceptor.parse('ftp://www.google.com/files', {});    
      }).should.throw(/Unsupported protocol/);

    });
  });

  describe('add()', function(){
    var interceptor;
    beforeEach(function(){
      interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    });

    it('throw on invalid arguments', function(){
      (function(){
        interceptor.add('bogus', 'bogus');
      }).should.throw(/Argument/);

      (function(){
        interceptor.add('http://www.google.com/hello/{name}', {
          url: 'ftp://google.com/files'
        });
      }).should.throw(/Unsupported protocol/);

    });

    it('add on valid endpoint', function(){
      var config = {};
      interceptor.add('http://www.google.com/hello/{name}', config);  
      config.url.should.equal('http://www.google.com/hello/{name}');
      interceptor.endpoints.should.have.property('http://www.google.com/hello/{name}').and.equal(config);
      interceptor.frontRouter.collection.routes.should.have.property('http://www.google.com/hello/{name}');
      interceptor.backRouter.collection.routes.should.have.property('http://www.google.com/hello/{name}');

      config = {url: 'http://www.fake-data.com/test'};
      interceptor.add('http://www.github.com/hello/{name}', config);  

      interceptor.backRouter.collection.routes['http://www.github.com/hello/{name}'].path.should.equal('http://www.fake-data.com/test');
      interceptor.frontRouter.collection.routes['http://www.github.com/hello/{name}'].path.should.equal('http://www.github.com/hello/{name}');

    });
  });


  describe('build()', function(){
    var interceptor;
    beforeEach(function(){
      interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    });

    it("should walk all routes", function(){

      interceptor.build(interceptor.endpointConfig);
      
      Object.keys(interceptor.endpoints).length.should.equal(6);
      interceptor.endpoints.should.have.property('http://www.google.com/results');
      interceptor.endpoints.should.have.property('http://www.github.com/{user}/repos');

    });
  });

  describe('get()', function(){
    var interceptor;
    beforeEach(function(){
      interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    });

    it('throw on invalid arguments', function(){
      (function(){
        interceptor.get();
      }).should.throw(/Argument/);
    });

    it('should return config', function(){
      //does not exist, return default request config
      interceptor.get('http://www.google.com/non-existing').url.should.equal('http://www.google.com/non-existing');

      //match exact
      var conf = interceptor.get('http://www.google.com/results');
      conf.should.have.property('headers');
      conf.should.have.property('attributes');

      conf = interceptor.get('http://www.github.com/ad/repos');
      conf.should.have.property('test');
      conf.should.have.property('attributes');
    });
  });


  describe('createRequest()', function(){
    var interceptor, res;
    beforeEach(function(){
      interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
    });

    it('throw on invalid arguments', function(){
      (function(){
        interceptor.createRequest(false, 'aa');
      }).should.throw(/Argument/);
    });

    it('should return merged config', function(){

      //config doesn't provides url
      res = interceptor.createRequest('http://www.github.com/ad/stargazers', interceptor.get('http://www.github.com/ad/stargazers'));
      res.url.should.equal('http://www.github.com/ad/stargazers');

      //config doesn't provide url and has parameters
      res = interceptor.createRequest('http://www.github.com/ad/repos', interceptor.get('http://www.github.com/ad/repos'));
      res.url.should.equal('http://www.github.com/ad/repos');

      //config provides url
      res = interceptor.createRequest('http://www.google.com/results', interceptor.get('http://www.google.com/results'));
      res.url.should.equal('https://api.github.com/repos/mikeal/request');

      //config provides url and has parameters
      res = interceptor.createRequest('http://www.google.com/maps/london', interceptor.get('http://www.google.com/maps/london'));
      res.url.should.equal('https://fake-data.com/maps/london');
      res.should.have.property('headers');

    });
  });


  describe('filesystem interactions', function(){

      var interceptor, res, tmpResourceDir;
      beforeEach(function(){
        var endpointFile = __dirname+'/fixtures/endpoint/endpoints_valids.json';
        
        tmpResourceDir = path.relative(path.dirname(endpointFile), temp.mkdirSync());
        interceptor = minibar.interceptor({configFile: endpointFile});
      });

      describe('proxify()', function(done){
        it('should throw on invalid usage', function(){
          (function(){
            interceptor.proxify({});
          }).should.throw(/Argument/);
          
         (function(){
            interceptor.proxify('bogus json');
          }).should.throw(/Error while parsing JSON/);
        });

        it('should throw when auto_write is enabled but no file is provided', function(){
          interceptor.configuration.set('auto_write::resources', true);
          (function(){
            interceptor.proxify('{}');
          }).should.throw(/did not receive a resource file/);
        });

        it('should receive write enabled proxy', function(){
          interceptor.configuration.set('auto_write::resources', true);
          var proxy = interceptor.proxify('{}', __dirname + '/fixtures/writer/valid_resource.json');
          proxy.$writer.should.not.equal(false);
          proxy.$faker.should.equal(false);
        });


        it('should receive fake data proxy', function(){
          interceptor.configuration.set('auto_write::resources', true);
          interceptor.configuration.set('fake_data', true);
          var proxy = interceptor.proxify('{}', __dirname + '/fixtures/writer/valid_resource.json');
          proxy.$writer.should.not.equal(false);
          proxy.$faker.should.not.equal(false);

        });

      });


      describe('request()', function(done){
        it('should throw when resource file cannot be read', function(done){      
            interceptor.request('http://www.facebook.com/api/bogus', function(err){
              err.should.be.an.instanceOf(Error);
              done();
            });
        });

        it('should throw when resource_dir is not configured', function(){
          (function(){
            interceptor.configuration.set('resource_dir', false);
            interceptor.request('http://www.facebook.com/api/me');
          }).should.throw(/"resource_dir" is not configured/);
        });

        it('should return a proxy with the file content if it exists', function(done){
          interceptor.request('http://www.facebook.com/api/me', function(err, proxy){
            proxy.$resource.should.be.type('object');
            proxy.$resource.id.should.equal(10);
            proxy.$resource.username.should.equal('advanderveer');
            done();
          });
        });

      });

  });

});