var minibar = require('../..');
var temp = require('temp');
var fs = require('fs');

temp.track();
describe('minibar writer:', function(){

  it('should throw on invalid constructor arguments', function(){
    (function(){
      writer = minibar.writer();
    }).should.throw(/Argument/);
  });

  it('should init and have correct interface', function(){
    var writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json');
    writer.data.should.have.property('firstName').and.equal('Ad');

    writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json', {firstName: 'Warner'});
    writer.data.should.have.property('firstName').and.equal('Warner');
  });

 
  describe('update()', function(){
    it('should update data prop', function(){
      var writer = minibar.writer(__dirname + '/./fixtures/writer/valid_resource.json', {firstName: 'Warner'});
      writer.update({firstName: 'New'});

      writer.data.firstName.should.equal('New');
    });
  });

  describe('file system interaction', function(){

    var writer, res, tmpDir;
    beforeEach(function(){
      tmpDir = temp.mkdirSync();
      res = {
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
      };

      writer = minibar.writer(tmpDir + '/resource.json', res);
    });

    it('should auto create dir and file on persist', function(){

      fs.existsSync(writer.file).should.equal(false);
      writer.persist();
      fs.existsSync(writer.file).should.equal(true);

      //multiple persists shouldn't throw
      (function(){
        writer.persist();
        writer.persist();
      }).should.not.throw();

    });

  });

});