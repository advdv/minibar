var nunjucks = require('nunjucks');
var nunjucksLib = require('nunjucks/src/lib.js');
nunjucksLib.isArray = function(input) {
    if(input.$isProxy === true) {
      var res = input.$resource;
      if(Array.isArray(input.$resource)) {
        return true;
      }

      //if its a empty proxied object assume it can be anaything, and it will be an array
      if(Object.getOwnPropertyNames(res).length === 0) {
        return true;
      }

      return false;
    } 
    return Array.isArray(input);
};

var Args = require('args-js');

var ResourceExtension = function ResourceExtension(config) {
  var self = this;
  config = Args([
    {interceptor:       Args.OBJECT | Args.Required},
    {keyword:       Args.STRING | Args.Optional, _default: 'AS'}
  ], arguments);

  self.keyword = config.keyword;
  self.interceptor = config.interceptor;
  self.tags = ['resource'];

  self.bodyRendered = function(err, content, resource, proxy, cb, writer) {
    if(err) {
      done(err);
      return;
    }

    if(writer !== false) {
      var res = proxy.$_normalize();
      writer.update(res);
      writer.persist();
    }

    cb(false, new nunjucks.runtime.SafeString(content));
  };

  self.parseResource = function(str) {
    args = Args([
      {str:       Args.STRING | Args.Required},
    ], arguments);

    var match = str.match('(.+) '+self.keyword+' (.+)');
    if(match === null) {
      throw new Error('Invalid resource specification expected format: "<url> '+self.keyword+' <variable>"');
    }

    return {
      url: match[1],
      variable: match[2]
    };
  };

  self.parse = function(parser, nodes, lexer) {
    //get token and args
    var tok = parser.nextToken();
    var args = parser.parseSignature(null, true);
    if(args.children.length > 1) {
      parser.fail('Resource tag received too many arguments');
    }  

    //parse body
    parser.advanceAfterBlockEnd(tok.value);
    var body = parser.parseUntilBlocks('endresource');

    parser.advanceAfterBlockEnd();
    return new nodes.CallExtensionAsync(self, 'run', args, [body]);
  };

  self.run = function(context, arg1, body, done) {
    var resource;
    resource = self.parseResource(arg1);

    //get resource and add result to context
    self.interceptor.request(resource.url, function(err, proxy, writer){
      if(err) {
        done(err); //error on request
        return;
      }

      //parse result data and add to context
      context.ctx[resource.variable] = proxy;

      //render innercontent async
      body(function(err, content){
        self.bodyRendered(err, content, resource, proxy, done, writer);
      });      
    });
  };
};

module.exports = ResourceExtension;