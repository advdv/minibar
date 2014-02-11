var app = require('../examples/todo/todo-example.js');
var request = require('supertest');

describe('TODO example:', function(){

  describe('"/"',function(){

    it('GET should return 200 and contain "todos"', function(done){
      request(app)
        .get('/')
        .expect(200, /todos/, done);
    });

    it('POST should return 404', function(done){
      request(app)
        .post('/')
        .expect(404)
        .end(done);
    });

  });

  describe('"/hello/ad"',function(){
    it('GET should return 200 and contain "ad"', function(done){
      request(app)
        .get('/hello/ad')
        .expect(200, /hello ad/, done);
    });
  });

});