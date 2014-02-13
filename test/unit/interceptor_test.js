var minibar = require('../..');

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
    }).should.throw(/Exception while requiring endpoint/);

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
      
      Object.keys(interceptor.endpoints).length.should.equal(4);
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


});