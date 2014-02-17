var Args = require('args-js');

module.exports = function(options) {
  var self = {};
  options = Args([
    {seed:       Args.INT | Args.Optional}
  ], arguments);
  
  self.casual = require('casual');
  if(options.seed !== undefined)
    self.casual.seed(options.seed);

  self.generate = function(property) {
    args = Args([
      {property:       Args.STRING | Args.Required},
    ], arguments);

    var res = self.casual[property];
    if(res === undefined) {
      res = self.casual.string;
    }

    return res;
  };  

  self.generateArray = function() {
    return new Array(self.casual.integer(0, 20));
  };

  return self;
};