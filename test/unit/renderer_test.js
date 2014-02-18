var minibar = require('../..');
var nunjucks = require('nunjucks');

describe('minibar renderer:', function(){

  var interceptor;
  beforeEach(function(){
    interceptor = minibar.interceptor({configFile: __dirname+'/fixtures/endpoint/endpoints_valids.json'});
  });

  it('factory should create a object with correct (middleware) interface', function(){
    var renderer = minibar.renderer({viewPath: __dirname + '/fixtures/views', interceptor: interceptor});

    //test it as middle ware
    renderer.should.have.property('handle').and.be.instanceOf(Function);
    renderer.should.have.property('templating').and.be.instanceOf(nunjucks.Environment);

    //test if nunjucks is initiated correctly
    renderer.templating.getTemplate('test.html');
    renderer.templating.autoesc.should.equal(true);
    renderer = minibar.renderer({viewPath: __dirname + '/fixtures/views',  interceptor: interceptor, nunjucks: {autoescape: false}});
    renderer.templating.autoesc.should.equal(false);

  });

  it('factory should throw on wrong argument', function(){
    (function(){
      //path to routing config is mandatory
      minibar.renderer();
    }).should.throw(/Argument/);

    (function(){
      //non existing path
      minibar.renderer('/bogus', interceptor);
    }).should.throw(/Could not find view resolve path/);
  });


  describe('handle()', function(){

    var renderer, request, response;
    beforeEach(function(){
      renderer = minibar.renderer({viewPath: __dirname + '/fixtures/views', interceptor: interceptor});
      response = {write: function(){}, end: function(){}};
      request = {
        attributes: {view: "test.html"}        
      };
    });

    it('should throw on invalid request attributes', function(done){
      (function(){
        renderer.handle({attributes: 'aa'}, {}, done);
      }).should.throw(/Expected request attributes to be an object/);

      (function(){
        renderer.handle({attributes: {view: {}}}, {}, done);
      }).should.throw(/Expected request attribute "view" to be a string/);

      (function(){
        renderer.handle({attributes: {view: "bogus.html"}}, {}, done);
      }).should.throw(/Could not find template/);

      done();
    });

    it('should throw on rendering an empty view', function(done){
      (function(){
        renderer.handle({attributes: {view: 'empty.html'}}, {}, done);
      }).should.throw(/empty/);

      done();
    });

    it('should add template on', function(done){

      renderer.handle(request, response, function(){
        request.template.should.be.instanceOf(nunjucks.Template);
        request.content.should.be.instanceOf(String);
        done();
      });

    });


  });

});