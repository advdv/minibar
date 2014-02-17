var Args = require('args-js');
var path = require('path');
var fs = require('fs');

module.exports = function(options) {
  var self = {};
  options = Args([
    {file:  Args.STRING    | Args.Required},
    {data:  Args.OBJECT    | Args.Optional}
  ], arguments);

  //init logic, read file if data is undefined  
  self.file = path.normalize(options.file);
  if(!options.data) {
    options.data = JSON.parse(fs.readFileSync(self.file, {encoding: 'utf8'}));
  }

  self.data = options.data;




  return self;
};


/*

var path = require('path');
var fs = require('fs');
var casual = require('casual');

module.exports  = function writer(options) {
  var self = {};
  options = Args([
    {path:  Args.STRING    | Args.Required},
    {data:  Args.OBJECT    | Args.Optional}
  ], arguments);
  
  self.path = path.normalize(options.path);
  if(!options.data) {
    options.data = JSON.parse(fs.readFileSync(self.path, {encoding: 'utf8'}));
  }

  self.data = options.data;
  self.fakerIndex = {};


  self.normalizeIndexKey = function(key) {
    return key.toLowerCase().replace('-', '').replace('_', '');
  };

  self.searchFakerIndex = function(str) {
    str = self.normalizeIndexKey(str);
    var res = self.fakerIndex[str];
    if(!res)
      res = self.fakerIndex.sentence;

    return res;
  };

  self.generateFakerIndex = function() {
    self.fakerIndex = {};
    var funcs = casual.functions();
    Object.keys(funcs).forEach(function(key){
      self.fakerIndex[self.normalizeIndexKey(key)] = funcs[key]; 
    });
  };


  self.getPropertyDescriptor = function(name) {
    return Object.getOwnPropertyDescriptor(self.data, name);
  };

  self.getPropertyNames = function(proxy) {
    return Object.keys(self.data);
  };

  self.get = function(proxy, name) {  
    //system properties are prefixed with _
    if(name[0] === '_') {
      return self[name.substring(1)];
    }

    //on array access, length is asked
    if(name === 'length') {
      return 5;
    }



    //simple property access
    res = self.data[name];
    if(res === undefined) {
      var generator = self.searchFakerIndex(name);
      self.data[name] = generator();

      //persist addition
      fs.writeFileSync(self.path, JSON.stringify(self.data, undefined, 4));
      res = self.data[name];
    }

    return res;
  };

  self.generateFakerIndex();
  return Proxy.create(self);
};

*/