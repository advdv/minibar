var Args = require('args-js');
var nunjucks = require('nunjucks');
var ResourceExtension = require('./nunjucks/resource.js');
var fs = require('fs');

module.exports = function(config) {
  var self = {};
  config = Args([
    {viewPath:       Args.STRING | Args.Required},
    {interceptor:       Args.OBJECT | Args.Required},
    {nunjucks: Args.OBJECT | Args.Optional, _default: {autoescape: true}}
  ], arguments);

  if(!fs.existsSync(config.viewPath)) {
    throw new Error('Could not find view resolve path "'+config.viewPath+'", does it exist?');
  }

  //create nunjucks env
  self.templating = nunjucks.configure(config.viewPath, config.nunjucks);

  //@todo inject interceptor?
  self.templating.addExtension('ResourceExtension', new ResourceExtension(config.interceptor));

  //interceptor = minibar.interceptor({configFile: __dirname+'/../fixtures/endpoint/endpoints_valids.json'});

  //@todo load extension
  

  /**
   * middleware handle function
   * @param  {request}   request  [description]
   * @param  {response}   response [description]
   * @param  {Function} next     [description]
   */
  self.handle = function(request, response, next) {

    if(!request.attributes) {
      next(); 
      return;
    }

    var attribs = request.attributes;
    if(typeof attribs !== 'object')
      throw new Error('Expected request attributes to be an object, received: ' + JSON.stringify(request.attributes));

    if(!attribs.view) {
      next();
      return;
    }

    if(typeof attribs.view !== 'string')
      throw new Error('Expected request attribute "view" to be a string, received: ' + JSON.stringify(request.attributes));

    self.templating.getTemplate(attribs.view, function(err, tmpl) {
      if(err) {
        if(err.message.match(/template not found/)) {
          throw new Error('Could not find template "'+attribs.view+'" in "'+config.viewPath+'"');
        } else {
          throw err;  
        }
      }

      //add template to request
      request.template = tmpl;

      //render and add content
      tmpl.render(attribs, function(err, content){
        if(err)
          throw err;

        request.content = content;

        next();
      });  
    });

  };

  return self;
};