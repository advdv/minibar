var Args = require('args-js');
var request = require('request');
var url = require('url');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var nconf = require('nconf');
var nconfCommon = require('nconf/lib/nconf/common.js');

var router = require('./router.js');
var writer = require('./writer.js');
var proxy = require('./proxy.js');
var faker = require('./faker.js');

//We overwrite nconf seperator to allow http:// keys in config
nconfCommon.path = function (key) {
  return key.split('::');
};

nconfCommon.key = function () {
  return Array.prototype.slice.call(arguments).join('::');
};

/**
 * Tthe default configuration for the interceptor
 * @type {Object}
 */
var defaultConfiguration = {
  "resource_dir": '../res',
  "resource_filename": "default.json",
  "default_resource": {},
  "endpoints": {},
  "fake_data": false,
  "auto_write": {
    "resources": false,
  }
};

module.exports = function(options) {
  var self = {};

  self.configuration = new nconf.Provider();
  self.frontRouter = router();  
  self.backRouter = router();  
  self.endpoints = {};

  options = Args([
    {configFile:       Args.STRING | Args.Required},
    {env: Args.STRING | Args.Optional, _default: 'dev'},
    {configuration: Args.OBJECT | Args.Optional, _default: {}}
  ], arguments);

  /**
   * Parse the default config file path en return one that 
   * takes into account the current environment
   * @param  {String} configFile the path
   * @return {String}            env path
   */
  self.getEnvConfigFile = function(configFile, env) {
    if(path.extname(configFile) !== '.json') {
      throw new Error('Expected config file with json extension received: "'+configFile+'"');
    }

    var filename = path.basename(configFile);
    filename = filename.replace('.json', '_'+env+'.json');
    return  path.dirname(configFile)+'/'+filename;
  };

  if(!fs.existsSync(options.configFile))
    throw new Error('Could not find default endpoint configuration "'+options.configFile+'", does it exist');

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

    var allowed = ['http:', 'https:'];
    if(allowed.indexOf(endpoint.protocol) === -1) {
      throw new Error('Unsupported protocol for endpoint: "'+endpoint.protocol+'", allowed: "'+allowed.join(', ')+'"');
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

    //validate url config
    urlObj = url.parse(conf.url);
    var allowed = ['http:', 'https:', 'file:'];
    if(allowed.indexOf(urlObj.protocol) === -1) {
      throw new Error('Unsupported protocol for endpoint url: "'+urlObj.protocol+'", allowed: "'+allowed.join(', ')+'"');
    }

    self.endpoints[path] = args.config;
    self.frontRouter.collection.add(path, {path: path, defaults: {}});
    self.backRouter.collection.add(path, {path: conf.url, defaults: {}});
    return self;
  };

  /**
   * This is called whenever their is not endpoint configuration
   * for a request
   *
   * @param  {String} uri the request url
   * @return {[type]}          [description]
   */
  self.noEndpointConfiguration = function(uri) {

    //get default endpoint configuration

    //if configuration defines a auto write config
    //  1. read default endpoint configuration
    //  2. write dev config with default endpoint configuration

    return {
      url: uri
    };
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
        return self.noEndpointConfiguration(endpoint);
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
   * Return a proxy to the original resource that
   * can intercept calls to properties that are undefined
   *   
   * @param  {string} resourceData the resource as it currently is
   * @param {string} resourceFile optional path to the file fakes the resource
   * @return {Proxy}          a proxy object
   */
  self.proxify = function(resourceData, resourceFile) {
    var args = Args([
      {resourceData:       Args.STRING | Args.Required},
      {resourceFile:       Args.STRING | Args.Optional},
    ], arguments);

    var resource;
    try {
      resource = JSON.parse(args.resourceData);  
    } catch(error) {
      throw new Error('Error while parsing JSON, is your endpoint configured correctly? Received: "'+resourceData+'"');
    }



    //create writer
    var w = false;
    if(self.configuration.get('auto_write::resources') === true) {
      if(!resourceFile)
        throw new Error('Auto write was enabled but did not receive a resource file');

      w = writer(resourceFile, resourceData);
    }

    //create faker
    var f = false;
    if(self.configuration.get('fake_data') === true) {
      f = faker();
    }

    //create and return resource proxy 
    return proxy({resource: resource, writer: w, faker: f});
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

    //if conf specifies a locale path as url
    var urlObj = url.parse(requestConf.url);
    if(urlObj.protocol === 'file:') {
      if(!self.configuration.get('resource_dir')) {
        throw new Error('Endpoint url points to directory but "resource_dir" is not configured');
      }

      //create dir based on configfile location, configuration and endpoint conf
      var filename = self.configuration.get('resource_filename');
      var file = path.normalize(path.dirname(options.configFile)+ '/' + self.configuration.get('resource_dir')+urlObj.path + '/' + filename);
      fs.readFile(file, {encoding: 'utf8'},function (err, data) {
        if(err) {
          //if file is not found and auto write is enabled, create dir structure and touch file
          if(err.code === 'ENOENT' && self.configuration.get('auto_write::resources') === true) {
            data = JSON.stringify(self.configuration.get('default_resource'));
            
            // @todo write/create/touch files lazy instead by the writer
            /*mkdirp.sync(path.dirname(file));
            fs.writeFileSync(file, data); //touch file */
          } else {
            callback(new Error('Error while reading endpoint resource file at "'+file+'":' + err));            
            return;
          }
        }

        callback(false, self.proxify(data, file));  
      });

    } else {

      //3. call request with configuration
      request.call(request, requestConf, function(err, response, data){
        callback(err, self.proxify(data));
      });

    }

  };

  //init logic
  self.env = options.env;
  self.configuration
      .overrides(options.configuration) //argument config overwrite all
      .file('env', self.getEnvConfigFile(options.configFile, self.env)) //must have default endpoint config
      .file('default', options.configFile) //must have default endpoint config
      .defaults(defaultConfiguration);

  self.endpointConfig = self.configuration.get('endpoints');
  self.build(self.endpointConfig);
  return self;
};