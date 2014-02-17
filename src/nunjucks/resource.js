var nunjucks = require('nunjucks');
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
    var body = parser.parseUntilBlocks('endresource', 'endtruncate');

    parser.advanceAfterBlockEnd();
    return new nodes.CallExtensionAsync(self, 'run', args, [body]);
  };

  self.run = function(context, arg1, content, done) {
    var resource;
    resource = self.parseResource(arg1);

    //get resource and add result to context
    self.interceptor.request(resource.url, function(err, proxy){
      if(err) {
        done(err); //error on request
        return;
      }

      //parse result data and add to context
      context.ctx[resource.variable] = proxy;
      done(false, new nunjucks.runtime.SafeString(content()));
    });
  };
};

module.exports = ResourceExtension;