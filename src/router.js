var Args = require('args-js');
var url = require('url');

var Collection = function Collection(routeConfig) {
  var self = this;
  self.routes = {};
  var args = Args([
    {routeConfig:       Args.OBJECT | Args.Required}
  ], arguments);

  var normalizePath = function(path) {
    path = path.replace(new RegExp("[/ ]+$", "g"), ""); //end
    path = path.replace(new RegExp("^[/ ]+", "g"), ""); //beginning
    return path;
  };

  self.build = function(conf) {
    var args = Args([
      {conf:       Args.OBJECT | Args.Required},
    ], arguments);

    Object.keys(args.conf).forEach(function(name){
      self.add(name, args.conf[name]);
    });

    return self;
  };

  self.all = function() {
    return self.routes;
  };

  self.remove = function(name) {
    delete self.routes[name];
  };

  self.get = function(name) {
    return self.routes[name];
  };

  self.has = function(name) {
    var res = self.get(name);
    return ((res === undefined) ? false : true);
  };

  self.add = function(name, route) {
    var args = Args([
      {name:       Args.STRING | Args.Required},
      {route:       Args.OBJECT | Args.Required},
    ], arguments);

    if(route.path === undefined)
      throw new Error('given route "'+name+'" did not specify a path, received: ' + JSON.stringify(route));

    var urlObj = url.parse(route.path);
    route.path = normalizePath(url.format(urlObj));
    //if path is not absolute prefix with slash
    if(urlObj.protocol === null || urlObj.hostname === null) {
      route.path = '/' + route.path;
    }

    if(route.defaults !== undefined && typeof route.defaults !== 'object' )
      throw new Error('given route "'+name+'" expected an object to specify defaults, received:' + JSON.stringify(route.defaults));

    self.routes[name] = route;
    return self;
  };

  self.build(args.routeConfig);

};


module.exports = function(config) {
  var self = {};
  var SEPARATORS = '/,;.:-_~+*=@|';
  self.Collection = Collection;

  //create collection
  self.collection = new Collection({});

  /**
   * Load route config from json file
   * @param  {String} path the path to the configuration file
   * @return {self}      router
   */
  self.load = function(path) {
    args = Args([
      {path:       Args.STRING | Args.Required}
    ], arguments);

    //try to load routes
    var routeConfig;
    try {
      routeConfig = require(args.path);  
    } catch(err) {
      throw new Error('Exception while requiring routes from "'+args.path+'", does it exist and contains valid JSON?');
    }

    self.collection.build(routeConfig);
    return self;
  };

  /**
   * Compiles an route into regexp
   * NOTE: this is ported directly from Symfony2 routing framework's compile
   *
   * @method compile()
   * @param  {object} route the route
   * @return {object} compiled route
   */
  self.compile = function(route) {
    var args = Args([
      {route:       Args.OBJECT | Args.Required}
    ], arguments);
    route = args.route;

    var tokens = [];
    var variables = {};
    var pattern = route.path;
    var defaultSeparator = '/';
    var pos = 0;

    //@todo: refactor
    var quoteRegexp = function(str) {
        return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    };

    //@todo: refactor out of compile
    var hasDefault = function(key) {
      if(route.defaults === undefined)
        return false;

      var res = route.defaults[key];
      if(res === undefined)
        return false;

      return true;
    };

    var matches = pattern.match(/\{\w+\}/g);
    if(matches !== null) {
      matches.forEach(function(match, i){
        var varName = match.substring(1, match.length-1);

        var precedingText = pattern.substring(pos, pattern.indexOf(match));
        pos = pattern.indexOf(match) + match.length;

        var precedingChar = (precedingText.length > 0) ? precedingText.substring(precedingText.length-1, precedingText.length) : '';
        var isSeparator = (SEPARATORS.indexOf(precedingChar) > -1) ? (true) : (false);

        if(isSeparator && precedingText.length > 1) {
          tokens.push(['text', precedingText.substring(0, precedingText.length-1)]);
        } else if(!isSeparator && precedingText.length > 0) {
          tokens.push(['text', precedingText]);
        }

        var regexp = ("requirements" in route) ? (route.requirements[varName]) : undefined;
        if(regexp === undefined) {
          var followingPattern = pattern.substring(pos);
          var nextSeparator = followingPattern.replace(/\{\w+\}/g, ''); 
          nextSeparator = (SEPARATORS.indexOf(nextSeparator[0]) > -1) ? (nextSeparator[0]) : '';
          nextSeparator = (defaultSeparator !== nextSeparator && '' !== nextSeparator) ? (quoteRegexp(nextSeparator)) : ('');

          regexp = '[^'+quoteRegexp(defaultSeparator)+nextSeparator+']+';

        }

        tokens.push(['variable', (isSeparator) ? (precedingChar) : (''), regexp, varName]);
        variables[varName] = i+1;

      });
    }

    if(pos < pattern.length) {
      tokens.push(['text', pattern.substring(pos)]);
    }

    var firstOptionalPos = 9007199254740992;
    for (var i=0;i<tokens.length;i++)
    { 
      if(tokens[i][0] === 'variable' && hasDefault(tokens[i][3])) {
        firstOptionalPos = i;
        break;

      }
    }

    var openOptional = 0;
    var computeRegexp = function(tokens, index, firstOptional) {
      var token = tokens[index];

      if(token[0] === 'text') {
        return quoteRegexp(token[1]);
      } else {
        //token === variable
        if(index === 0 && firstOptional === 0) {
          return  quoteRegexp(token[1])+'('+token[2]+')?';
        } else {
          var regexp = quoteRegexp(token[1])+'('+token[2]+')';
          if (index >= firstOptional) {
            // open optional part
            // adding an extra optional shifts the match position
            regexp = "(" + regexp; 
            variables[token[3]] = variables[token[3]] + 1; 
            openOptional++;
            var nbTokens = tokens.length;
            if(index === nbTokens - 1) {
              regexp = regexp + Array(openOptional+1).join(')?');
            }
          }
          return regexp;
        }
      }

    };

    var regexp = '';
    tokens.forEach(function(token, i){
      regexp = regexp + computeRegexp(tokens, i, firstOptionalPos);
    });

    return {
      staticPrefix: (tokens[0][0] === 'text') ? (tokens[0][1]) : (''),
      regexp: new RegExp('^'+regexp+'$'),
      tokens: tokens,
      variables: variables
    };
  };

  /**
   * Match an url to an route
   *
   * @method match()
   * @param  {string} url the url to match
   * @param {Object} context additional request context to match
   * @return {Object} the route attributes
   */
  self.match = function(url, context) {
    var args = Args([
      {url:       Args.STRING | Args.Required},
      {context:       Args.OBJECT | Args.Optional, _default: {}}
    ], arguments);
    url = args.url;

    var routes = self.collection.routes;
    var matched = false;
    var attributes = {};

    Object.keys(routes).forEach(function(name){
      if(matched === true)
        return;

      var route = routes[name];
      var compiled = self.compile(route);

      //first try a less expensive method for testing
      if ('' !== compiled.staticPrefix && url.indexOf(compiled.staticPrefix) !== 0) {
        return;
      }

      //first: match url
      var match = url.match(compiled.regexp);

      //second: match context
      if(route.requirements) {
        Object.keys(route.requirements).forEach(function(name){
          if(args.context[name] !== undefined) {
            
            var ctx = args.context[name];
            if(typeof ctx !== 'string') {
              throw new Error('Invalid context attribute');
            }

            if(ctx.match(route.requirements[name]) === null) {
              match = null; //no match if context requirements fail
            }
          }          
        });
      }

      if(match === null)
        return;

      //get values from url
      Object.keys(compiled.variables).forEach(function(name){
        var val = match[compiled.variables[name]];
        if(val) {
          attributes[name] = val;
        }        
      });

      //add defaults
      if(route.defaults !== undefined) {
        Object.keys(route.defaults).forEach(function(def){
          if(!(def in attributes))
            attributes[def] = route.defaults[def];
        });        
      }

      attributes._route = name;
      matched = true;
    });

    if(matched === false)
      throw new Error('No route was found that matches the url "'+url+'"');
    return attributes;
  };


  /**
   * Generate an url based on the name of the route
   *
   * @method generate()
   * @param  {string} name       The route name
   * @param  {object} parameters route parameters
   * @return {string}            the url
   */
  self.generate = function(name, parameters) {
    parameters = (parameters !== undefined) ? parameters : {};

    if(self.collection.has(name) === false)
      throw new Error('Route with name "'+name+'" does not exist.');

    var route = self.collection.get(name);
    if(route.defaults !== undefined) {
      Object.keys(route.defaults).forEach(function(def){
        if(!(def in parameters))
          parameters[def] = route.defaults[def];
      });        
    }

    var compiled = self.compile(route);
    Object.keys(compiled.variables).forEach(function(key){
      if(parameters[key] === undefined)
        throw new Error('Some mandatory parameters are missing ("'+key+'") to generate a URL for route "'+name+'"');
    });

    var url = '';
    var optional = true;
    var defaults = (route.defaults === undefined) ? ({}) : (route.defaults);
    var tokens = compiled.tokens.reverse();
    tokens.forEach(function(token){
      if ('variable' === token[0]) {
        if (!optional || !(token[3] in defaults) || undefined !== parameters[token[3]] && parameters[token[3]] !== defaults[token[3]]) {

          if(!new RegExp('^'+token[2]+'$').test(parameters[token[3]])) {
            throw new Error('Parameter "'+token[3]+'" for route "'+name+'" must match "'+token[2]+'" ("'+parameters[token[3]]+'" given) to generate a corresponding URL.');
          }

          url = token[1] + parameters[token[3]] + url;
          optional = false;

        }
      } else {
        // static text
        url = token[1] + url;
        optional = false;
      }

    });

    return url;
  };


  /**
   * Create a context that can be used by the router for retrieving
   * additional matching attributes
   * @param  {http.ClientRequest} request the request
   * @return {Object}         the context
   */
  self.createRequestContext = function(request) {
    var args = Args([
      {request:       Args.OBJECT | Args.Required}
    ], arguments);

    var method = request.method;

    return {
      "_method": method
    };
  };


  /**
   * middleware handle function
   * @param  {request}   request  [description]
   * @param  {response}   response [description]
   * @param  {Function} next     [description]
   */
  self.handle = function(request, response, next) {

    //get url
    var url = request.url;
    if(!url) 
      throw new Error('Expected request to have url property');
    
    //match route
    var attribs;
    try {
      attribs = self.match(url, self.createRequestContext(request));  
    } catch(err) {
      //if not 404 throw again
      if(err.message.match(/No route/) === null) {
        throw err;
      }

      //else simply continue
      next();
      return;
    }
   
    //set request attributes
    request.attributes = attribs;

    next();
  };

  return self;
};