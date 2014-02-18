var minibar = require('../..');
var assert = require('assert');
var sinon = require('sinon');

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

  
  describe('_normalize()', function(){

    it('should normalize primitives proxy', function(){
      minibar.proxy('hello').$_normalize().should.equal('hello');
      minibar.proxy(10.5).$_normalize().should.equal(10.5);
      minibar.proxy(true).$_normalize().should.equal(true);
    });

    it('should normalize primitives arrays', function(){
      minibar.proxy(['hello', 10.5, true]).$_normalize().should.eql(['hello', 10.5, true]);
      minibar.proxy(['hello', 10.5, ['item1', 'item2']]).$_normalize().should.eql(['hello', 10.5, ['item1', 'item2']]);
    });

    it('should normalize a proxied object', function(){
      minibar.proxy({str: 'hello', nr: 11.5, bool: true}).$_normalize().should.eql({str: 'hello', nr: 11.5, bool: true});
      minibar.proxy({str: 'hello', arr: ['item1', 10]}).$_normalize().should.eql({str: 'hello', arr: ['item1', 10]});

      var proxy = minibar.proxy({
        nr: 10,
        bool: true,
        str: 'hello world',
        arr: ['item1', 2, ['test'], {test: 'test'}],
        obj: {
          nestedNr: 1.5,
          nestedBool: false,
          nestedStr: 'nested hello',
          nestedArr: [5, 'item2']
        }
      }, minibar.faker({seed: 1}));

      proxy.$isProxy.should.equal(true);
      proxy.arr.$isProxy.should.equal(true);
      proxy.arr[2].$isProxy.should.equal(true);
      proxy.arr[3].$isProxy.should.equal(true);
      proxy.arr[3].test.$isProxy.should.equal(true);

      //this transforms leaf primitive into an object
      proxy.arr[3].test.nest.$isProxy.should.equal(true);

      proxy.$_normalize().should.eql({
        nr: 10,
        bool: true,
        str: 'hello world',
        arr: ['item1', 2, ['test'], {test: {nest: {}}}],
        obj: {
          nestedNr: 1.5,
          nestedBool: false,
          nestedStr: 'nested hello',
          nestedArr: [5, 'item2']
        }
      });
    });

    describe('edge cases: ',function(){

      it('dont overwrite defined objects', function(){

        var proxy = minibar.proxy({
          username: 'fake_user'
        }, minibar.faker(1));

        proxy.company.toString().should.equal('esse repellat quisquam recusandae alias consequuntur corporis');
        proxy.company.company_suffix.toString().should.equal('Ltd');
        proxy.company.company_name.toString().should.equal('Feest Inc');
        proxy.company.toString().should.equal('[object Object]');

      });

      it('generator is function', function(){

         var proxy = minibar.proxy({
            username: 'fake_user'
          }, minibar.faker(1));

         proxy.card_number.toString().should.equal('5502082966266759');

      });

      /*

      it('console inspecting should not break everything', function(){
        var proxy = minibar.proxy({
          username: 'fake_user'
        }, minibar.faker(1));

        proxy.items.length.should.equal(8);
        proxy.items[0].toString().should.equal('repellat quisquam recusandae alias consequuntur corporis repellat');
        proxy.items[1].toString().should.equal('ratione ut sunt qui amet iure ut');

        console.log(proxy.items);
        proxy.items.length.should.equal(8);
      });

*/


    });





  });


});