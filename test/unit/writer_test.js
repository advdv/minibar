var minibar = require('../..');

describe('minibar writer:', function(){

  it('should throw on invalid constructor arguments', function(){
    (function(){
      writer = minibar.writer();
    }).should.throw(/Argument/);
  });

  it('should have correct interface', function(){
    writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json');
    writer.data.should.have.property('firstName').and.equal('Ad');

    writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json', {firstName: 'Warner'});
    writer.data.should.have.property('firstName').and.equal('Warner');
  });

  /*

  var writer;
  it('should have correct interface', function(){
    writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json');

    writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json', {firstName: 'Warner'});
    writer._data.should.have.property('firstName').and.equal('Warner');

    //try some random stuff
    writer.username.should.be.an.instanceOf(String);
    writer.userName.should.be.an.instanceOf(String);
    writer.user_name.should.be.an.instanceOf(String);
    writer.asdfasdf.should.be.an.instanceOf(String);

  });



  describe('normalizeIndexKey()', function(){
    it('should normalize index keys', function(){
      writer._normalizeIndexKey('test_K-else').should.equal('testkelse');
    });
  });

  describe('generateFakerIndex()', function(){
    it('should normalize casual property names correctly', function(){

      writer._generateFakerIndex();
      writer._fakerIndex.should.have.property('rgbhex').and.equal(casual.functions().rgb_hex);
      writer._fakerIndex.should.have.property('streetsuffix').and.equal(casual.functions().street_suffix);
    });
  });

  describe('searchFakerIndex()', function(){

    beforeEach(function(){
      writer._generateFakerIndex();
    });

    it('should do some smart matching', function(){
      writer._searchFakerIndex('asdfasdf').should.equal(casual.functions().sentence);

      writer._searchFakerIndex('rgbhex').should.equal(casual.functions().rgb_hex);
      writer._searchFakerIndex('rGb_HeX').should.equal(casual.functions().rgb_hex);
    });
  });

*/

});