var Args = require('args-js');
var request = require('request');
var url = require('url');
var fs = require('fs');
var router = require('./router.js');
var nconfCommon = require('nconf/lib/nconf/common.js');
//We overwrite nconf seperator to allow http:// keys in config
nconfCommon.path = function (key) {
  return key.split('::');
};

nconfCommon.key = function () {
  return Array.prototype.slice.call(arguments).join('::');
};


var nconf = require('nconf');

/**
 * Tthe default configuration for the interceptor
 * @type {Object}
 */
var defaultConfiguration = {
  "auto_update": false,
  "endpoints": {}
};


module.exports = function(options) {
  var self = {};

  self.configuration = new nconf.Provider();
  self.frontRouter = router();  
  self.backRouter = router();  
  self.endpoints = {};

  options = Args([
    {configFile:       Args.STRING | Args.Required},
    {configuration: Args.OBJECT | Args.Optional, _default: {}}
  ], arguments);


  if(!fs.existsSync(options.configFile))
    throw new Error('Could not find default endpoint configuration "'+options.configFile+'", does it exist');

  self.configuration
      .overrides(options.configuration) //argument config overwrite all
      .file('default', options.configFile) //must have default endpoint config
      .defaults(defaultConfiguration);

  self.endpointConfig = self.configuration.get('endpoints');

  /**
   * Parse the endpoint or throw on wrong format
   * @param  {string} endpoint the url
   * @return {UrlObject}          the formatted url object
   */
  self.parse = function(endpoint) {
    var urlObj = url.parse(endpoint);
    try {
      endpoint = Args([
        {hostname:       Args.STRING | Args.Required},
        {port:       Args.INT | Args.Optional, _default: 80},
        {protocol:       Args.STRING | Args.Optional, _default: 'http:'}
      ], [urlObj]);      
    } catch(err) {
      throw new Error('Exception while parsing endpoint "'+endpoint+'", expected format <protocol>://<hostname><path>');
    }

    return urlObj;
  };

  /**
   * Add each of the endpoint configurations to the interceptor
   * @param  {Object} endpointConfig keys are endpoints
   * @return {self}                interceptor
   */
  self.build = function(endpointConfig) {
    var args = Args([
      {endpointConfig:       Args.OBJECT | Args.Required},
    ], arguments);

    Object.keys(args.endpointConfig).forEach(function(name){
      self.add(name, args.endpointConfig[name]);
    });

    return self;
  };

  /**
   * Add an endpoint for interceptions
   * @param {string} endpoint the url
   * @param {Object} config   configuration
   */
  self.add = function(endpoint, config) {
    var args = Args([
      {endpoint:       Args.STRING | Args.Required},
      {config:       Args.OBJECT | Args.Required},
    ], arguments);

    //add to endpoints and routes for matching
    var urlObj = self.parse(args.endpoint);
    var path = url.format(urlObj);
    var conf = args.config;

    //if configuration does not provide url, do so here
    if(conf.url === undefined) {
      conf.url = path;
    }

    self.endpoints[path] = args.config;
    self.frontRouter.collection.add(path, {path: path, defaults: {}});
    self.backRouter.collection.add(path, {path: conf.url, defaults: {}});
    return self;
  };

  /**
   * Get the configuration for a certain endpoint using 
   * internal router matching
   * @param  {string} endpoint the endpoint
   * @return {Object} configuration or false when non existing
   */
  self.get = function(endpoint) {
    var args = Args([
      {endpoint:       Args.STRING | Args.Required}
    ], arguments);

    var attribs;
    try {
      attribs = self.frontRouter.match(args.endpoint);  
    } catch(err) {
      if(err.message.match(/No route was found/) === null) {
        throw err;
      } else {
        //no configuration for endpoint? return default request config
        return {
          url: endpoint
        };
      }
    }

    var conf = self.endpoints[attribs._route];

    //this allows us to generate a route later
    conf.attributes = attribs;
    return conf;
  };

  /**
   * Create the final reuquest configuration based on
   * the endpoint config
   * @param  {String} uri the uri to request
   * @param  {Object} endpointConfig configuration for the endpoint
   * @return {Object}                resulting request config
   */
  self.createRequest = function(uri, conf) {
    var args = Args([
      {uri:       Args.STRING | Args.Required},
      {conf:       Args.OBJECT | Args.Required},
    ], arguments);

    conf = args.conf;

    //transpose url to backrouter if a route is specified
    if(conf.attributes !== undefined && conf.attributes._route !== undefined)
      conf.url = self.backRouter.generate(conf.attributes._route, conf.attributes);

    return conf;
  };

  /**
   * Get a resource through the interceptor
   * @return {undefined} [description]
   */
  self.request = function(uri, callback) {

    //1. match endpoint in configuration
    var conf = self.get(uri);

    //2. merge configuration into default
    var requestConf = self.createRequest(uri, conf);
    
    //3. call request with configuration
    return request.call(request, requestConf, callback);
  };

  self.build(self.endpointConfig);
  return self;
};