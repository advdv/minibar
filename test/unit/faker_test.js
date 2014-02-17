var minibar = require('../..');
var casual = require('casual');

describe('minibar faker:', function(){

  it('should throw on invalid constructor arguments', function(){

  });

  it('should have correct interface', function(){
    var faker = minibar.faker();

    faker.should.have.property('generate').and.instanceOf(Function);
    faker.should.have.property('generate').and.instanceOf(Function);
  });

  describe('generate*()', function(){
    var faker;
    beforeEach(function(){
      faker = minibar.faker({seed: 1});
    });

    it('should throw on invalid use', function(){
      (function(){
        faker.generate();
      }).should.throw(/Argument/);
    });


    it('should just generate on precice property match', function(){
      //non perfect match, generate string
      faker.generate('firstname').should.equal('esse repellat quisquam recusandae alias consequuntur corporis');
      
      //perfect match return generated value
      faker.generate('first_name').should.equal('Zola');
    });

    it('should generate empy array with certain length', function(){
      var arr = faker.generateArray();
      arr.length.should.equal(8);
      if(arr[0] !== undefined)
        throw new Error('throw');

    });


  });


});