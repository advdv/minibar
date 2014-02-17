var minibar = require('../..');
var assert = require('assert');

describe('minibar proxy:', function(){

  it('should recongize primitive resource', function(){
    minibar.proxy({}).$_isPrimitive().should.equal(false);
    minibar.proxy([]).$_isPrimitive().should.equal(false);
    minibar.proxy('aaa').$_isPrimitive().should.equal(true);
    minibar.proxy(10).$_isPrimitive().should.equal(true);
    minibar.proxy(true).$_isPrimitive().should.equal(true);
  });

  it('should recongize type of resource', function(){
    minibar.proxy({}).$_typeOfResource().should.equal('object');
    minibar.proxy([]).$_typeOfResource().should.equal('array');
    minibar.proxy('aaa').$_typeOfResource().should.equal('primitive');
    minibar.proxy(10).$_typeOfResource().should.equal('primitive');
    minibar.proxy(true).$_typeOfResource().should.equal('primitive');
  });
  
  it('should recongize type of access', function(){
    minibar.proxy({}).$_typeOfAccess('valueOf').should.equal('primitive');
    minibar.proxy({}).$_typeOfAccess('toString').should.equal('primitive');
    minibar.proxy({}).$_typeOfAccess('length').should.equal('array');
    minibar.proxy({}).$_typeOfAccess('2').should.equal('array');
    minibar.proxy({}).$_typeOfAccess(2).should.equal('array');
    minibar.proxy({}).$_typeOfAccess('prop').should.equal('object');
  });


  describe('default unfaked behaviour', function(){

    it('type: undefined/null', function(){
      (function(){
        minibar.proxy(null);
      }).should.throw(/Argument 0/);
      
      (function(){
        minibar.proxy(undefined);
      }).should.throw(/Argument 0/);

      (function(){
        minibar.proxy(function(){});
      }).should.throw(/not supported/);
    });

    it('type: Object()', function(){
      var res = {test: 'a'};
      var proxy = minibar.proxy(res);

      //get()
      proxy.$faker.should.equal(false);
      assert.strictEqual(proxy.$asdf, undefined);  
      assert.strictEqual(proxy.asdf, undefined);
      proxy.test.should.equal('a');

      //as primitive
      (proxy + '').should.equal('[object Object]');
    
      //getOwnPropertyNames() / getOwnPropertyDescriptor()
      Object.keys(proxy).should.eql(Object.keys(res));

      //getPropertyNames()
      for(var k in proxy) {
        proxy[k].should.eql('a');
      }

      //defineProperty()
      (proxy.test2 = 'b').should.equal((res.test2 = 'b'));

    });

    it('type: Array()', function(){
      var res = ['a', 'b', {test: 'c'}];
      var proxy = minibar.proxy(res);

      proxy[0].should.equal('a');
      proxy[2].test.should.eql('c');

      assert.strictEqual(proxy[3], undefined);  

      proxy.forEach(function(val, key){
        if(key === 0) {
          proxy[key].should.equal('a');  
        }
      });

      proxy.length.should.equal(3);
      proxy.push(10).should.equal(4);

    });

    it('type: String()/Number()/Boolean()', function(){
      var res = "word";
      var proxy = minibar.proxy(res);

      ("it is a " + proxy).should.equal("it is a word");
      proxy.length.should.equal(4);
      proxy[0].should.equal('w');
      isNaN(proxy).should.equal(true);

      res = 10;
      proxy = minibar.proxy(res);
      (proxy + 10).should.equal(20);
      isNaN(proxy).should.equal(false);

      res = false;
      proxy = minibar.proxy(res);
      (proxy).should.equal(false);
    });

    it('type: Proxies themselfs', function(){
      var proxy1 = minibar.proxy(100);
      var proxy2 = minibar.proxy(['a', proxy1]);
      var proxy3 = minibar.proxy({proxy2: proxy2, test: 'nested'});

      proxy3.proxy2[1].should.equal(100);

    });

  });

  describe('faked behaviour', function(){

    it('type: object access', function(){
      var res = {
        country: 'paaseiland'
      };

      var proxy = minibar.proxy(res, minibar.faker({seed: 1}));

      //root to string
      proxy.toString().should.equal('[object Object]');
      proxy.country.should.equal('paaseiland');

      //nested overwrite
      proxy.country.username.toString().should.equal('Zion.Reichel');

      //deep nested
      proxy.test.test.test.test.country.toString().should.equal('Uganda');

    });


    it('type: array access', function(){
      var res = {
        country: 'paaseiland'
      };

      var proxy = minibar.proxy(res, minibar.faker({seed: 1}));

      //array access by length
      proxy.length.should.equal(8);

      //deep nested array access
      proxy[3].test.test.test.word.toString().should.equal('repellat');

    });



  });



});