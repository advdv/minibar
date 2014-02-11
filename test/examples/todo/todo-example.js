var express = require('express');
var app = module.exports = express();
var minibar = require('../../..');

app.use(minibar.router(__dirname + '/app/routes.json'));
app.use(minibar.renderer(__dirname + '/src/html'));

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