var minibar = require('../..');

describe('minibar router:', function(){

  it('factory should create a object with correct (middleware) interface', function(){
    
    var router = minibar.router({path: __dirname + '/fixtures/router_routes.json'});
    router.routeConfig.should.be.instanceOf(Object);

    //test it as middle ware
    router.should.have.property('handle');
    router.handle.should.be.instanceOf(Function);

    //test it as router
    router.should.have.property('match');
    router.match.should.be.instanceOf(Function);
    router.should.have.property('routeConfig');
    router.routeConfig.should.be.instanceOf(Object);
    router.should.have.property('Collection');
    router.Collection.should.be.instanceOf(Function);
    router.should.have.property('collection');
    router.collection.should.be.instanceOf(router.Collection);

  });

  it('factory should throw on wrong argument', function(){

    (function(){
      //path to routing config is mandatory
      minibar.router();
    }).should.throw(/Argument/);

    (function(){
      //non existing path
      minibar.router({path: "app/routing.json"});
    }).should.throw(/Exception while requiring routes/);

  });

  /**
   * Test route collections
   */
  describe('router.Collection', function(){

    var router;
    var invalidConfigs = require(__dirname + '/fixtures/router_invalids.json');
    var validConfigs = require(__dirname + '/fixtures/router_valids.json');
    beforeEach(function(){
      router = minibar.router(__dirname + '/fixtures/router_routes.json');
    });

    it('should throw on invalid constructor arguments', function(){
      (function(){
        var coll = new router.Collection('bogus');
      }).should.throw(/Argument/);
    });

    it("should have been initialized with some routes", function(){
      var coll = new router.Collection(validConfigs.valid1);
      Object.keys(coll.routes).length.should.equal(2);
    });

    describe('add()', function() {

      var coll;
      beforeEach(function(){
        coll = new router.Collection({});
      });

      it("should throw on invalid route definitions", function(){
        (function(){
          coll.add('test', false);
        }).should.throw(/Argument/);
        
        (function(){
          coll.add('invalid1', invalidConfigs.invalid1.index);  
        }).should.throw(/did not specify a path/);

        (function(){
          coll.add('invalid2', invalidConfigs.invalid2.index);  
        }).should.throw(/expected an object to specify defaults/);

      });

    });


    describe('build()', function() {

      var coll;
      beforeEach(function(){
        coll = new router.Collection({});
      });

      it("should walk all routes", function(){

        coll.build(validConfigs.valid1);
        Object.keys(coll.routes).length.should.equal(2);
        coll.routes.should.have.property('index');
        coll.routes.should.have.property('users');

      });


    });


  });
  

  /**
   * Test route compilation
   */
  describe('compile()', function(){

    var router;
    beforeEach(function(){
      router = minibar.router(__dirname + '/fixtures/router_routes.json');
    });

    it("should compile without vars", function(){

      var compiled = router.compile({path:'/'});
      compiled.staticPrefix.should.equal('/');

    });

    it("should do basic compilation", function(){

      var compiled1 = router.compile({path:'/api/{type}/id-{id}.{_format}test'});
      Object.keys(compiled1.variables).length.should.equal(3);
      compiled1.variables.type.should.equal(1);
      compiled1.variables.id.should.equal(2);
      compiled1.variables._format.should.equal(3);
      compiled1.staticPrefix.should.equal('/api');

      var res1 = '/api/car/id-1.xmltest'.match(compiled1.regexp);
      res1[1].should.equal('car');
      res1[2].should.equal('1');
      res1[3].should.equal('xml');

    });

    it("should take requirement into account", function(){
      var compiled1 = router.compile({
        path:'/api/car{type}.xml',
        requirements: {
          type: '[0-9]'
        }
      });
      var res1 = '/api/carford.xml'.match(compiled1.regexp);
      if(res1 !== null)
        throw Error('fail');

      res1 = '/api/car1.xml'.match(compiled1.regexp);
      res1[1].should.equal('1');
    });

    it("should also take requirement into account with extra var", function(){
      var compiled1 = router.compile({
        path:'/api/car{type}/user/{name}',
        requirements: {
          type: '[0-9]'
        }
      });
      var res1 = '/api/carford/user/ad'.match(compiled1.regexp);
      if(res1 !== null)
        throw Error('fail');

      res1 = '/api/car1/user/ad'.match(compiled1.regexp);
      res1[1].should.equal('1');
      res1[2].should.equal('ad');
    });

    it("should match with single optional parameter, which is discarded", function(){
      var compiled1 = router.compile({
        path:'/{type}',
        defaults: {
          type: 5
        }
      });

      var res1 = '/'.match(compiled1.regexp);
      if(res1[1] !== undefined)
        throw Error('fail');
    });

    it("multiple variables and default at end should discard final default", function(){

      var compiled1 = router.compile({
        path:'/api/car{type}/user/{name}',
        defaults: {
          name: 'ad'
        }
      });

      var res1 = '/api/carA/user'.match(compiled1.regexp);
      res1[1].should.equal('A');

    });

    it("should handle multiple defaults", function(){
      var compiled1 = router.compile({
        path:'{type}/user/{name}/{slogan}',
        defaults: {
          name: 'ad',
          slogan: 'bier'
        }
      });

      var res1 = 'carA/user'.match(compiled1.regexp);
      res1.should.not.equal(null);

      var compiled2 = router.compile({
        path:'/api/car{type}/user/{name}/says/{slogan}',
        defaults: {
          name: 'ad',
          slogan: 'bier'
        }
      });

      var res2 = '/api/carA/user'.match(compiled2.regexp);
      res2.should.not.equal(null);

      var res3 = '/api/carA/user/ad/says'.match(compiled2.regexp);
      res3.should.not.equal(null);
    });

  });


  /**
   * Test url matching
   */
  describe('match()', function(){

    var r, r2;

    beforeEach(function(){
      r = minibar.router(__dirname + '/fixtures/router_routes.json');
      r2 = minibar.router(__dirname + '/fixtures/router_index.json');
    });

    it('should throw on wrong argument', function(){
      (function(){
        r.match(false);
      }).should.throw(/Argument/);
    });

    it("#match(), check parameters", function(){

      var res0 = r2.match('/');
      res0._route.should.equal('index');

      var res = r.match('/basic/car/id-1.xmltest');
      res.type.should.equal('car');
      res.id.should.equal('1');
      res._format.should.equal('xml');

      (function(){
        var res = r.match('/basic/car/id-aaa.xmltest');
      }).should.throw(); //requirements dont match
      
      var res2 = r.match('/basic');
      res2.dog.should.equal('basic');
      res2._controller.should.equal('test');

      var res3 = r.match('/');
      res3.dog.should.equal('golden');
      res3._controller.should.equal('test');

      var res4 = r.match('/house/carA/user');
      res4.type.should.equal('A');
      res4.owner.should.equal('ad');

      var res5 = r.match('/house/carC/user/bart');
      res5.type.should.equal('C');
      res5.owner.should.equal('bart');

      var res6 = r.match('/carA/user');
      res6.type.should.equal('carA');
      res6.name.should.equal('ad');
      res6.slogan.should.equal('bier');

      var res7 = r.match('/api/carA/user');
      res7.type = 'A';
      res7.username = 'advanderveer';
      res7.car = 'bmw';

    });

  });

  /**
   * Test middleware handle
   */
  describe('handle()', function(){
    var r;
    beforeEach(function(){
      r = minibar.router(__dirname + '/fixtures/router_routes.json');
    });

    it('should read url, add attributes and call next', function(done){

      (function(){
        r.handle({}, {}, done);
      }).should.throw(/url/);
      
      var req = {url: '/house/carC/user/bart'};
      r.handle(req, {}, done);

      req.should.have.property('attributes');
      req.attributes.should.be.instanceOf(Object);
      req.attributes.should.have.property('_route');
      req.attributes.should.have.property('type');
      req.attributes.should.have.property('owner');

    });


  });


});