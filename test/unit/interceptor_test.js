var minibar = require('../..');

describe('minibar interceptor:', function(){

  it('factory should create a object with correct interface', function(){
    var interceptor = minibar.interceptor();

    //test interface
    interceptor.should.have.property('get').and.be.an.instanceOf(Function);


  });

  it('factory should throw on wrong argument', function(){


  });

});