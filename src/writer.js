var Args = require('args-js');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = function(options) {
  var self = {};
  options = Args([
    {file:  Args.STRING    | Args.Required},
    {originalData:  Args.ANY    | Args.Optional}
  ], arguments);

  //init logic, read file if data is undefined  
  self.file = path.normalize(options.file);
  if(!options.originalData) {
    options.originalData = fs.readFileSync(self.file, {encoding: 'utf8'});
  }

  if(typeof options.originalData === 'string')
    options.originalData = JSON.parse(options.originalData);

  self.data = options.originalData;

  self.update = function(resource) {
    self.data = resource;
  };

  self.persist = function() {
    mkdirp.sync(path.dirname(self.file));
    fs.writeFileSync(self.file, JSON.stringify(self.data, false, 4));
  };

  return self;
};
