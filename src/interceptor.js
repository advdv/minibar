var Args = require('args-js');
var request = require('request');

module.exports = function() {
  var self = this;

  /**
   * Get a resource through the interceptor
   * @return {undefined} [description]
   */
  self.get = function() {

    //@todo handle endpoint config:
    // redirect + header information

    return request.apply(request, arguments);
  };


  return self;
};