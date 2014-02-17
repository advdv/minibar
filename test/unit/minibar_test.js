var minibar = require('../..');

describe('minibar:', function(){

  it('should contain several sub modules', function(){

    minibar.should.have.property('proxy').and.be.instanceOf(Function);
    minibar.should.have.property('writer').and.be.instanceOf(Function);
    minibar.should.have.property('faker').and.be.instanceOf(Function);
    minibar.should.have.property('router').and.be.instanceOf(Function);
    minibar.should.have.property('renderer').and.be.instanceOf(Function);
    minibar.should.have.property('interceptor').and.be.instanceOf(Function);


  });


});