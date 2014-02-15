var express = require('express');
var app = module.exports = express();
var minibar = require('../../..');

/*

var nconf = require('nconf');

var conf = new nconf.Provider();


conf
    .overrides({'auto_write': 'aaah', 'auto_intercept': 'coool'}) //constructor args
    .file('env', __dirname + '/app/test/endpoints_prod.json')
    .file('default', __dirname + '/app/test/endpoints.json')
    .defaults({'auto_intercept': 'use this value'});

console.log(conf.get('auto_write'));
console.log(conf.get('auto_intercept'));
*/

//configure interceptor
var interceptor = minibar.interceptor(__dirname + '/app/endpoints.json');

//configure and install middleware
app.use(minibar.router().load(__dirname + '/app/routes.json'));
app.use(minibar.renderer(__dirname + '/src/html', interceptor));

//writer
app.use(function(req, res, next){
  if(req.content) {    
    res.send(200, req.content);
  } else {
    next();
  }
});

//if run seperately start listening
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}