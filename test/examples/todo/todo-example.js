var express = require('express');
var app = module.exports = express();
var minibar = require('../../..');

app.use(minibar.router(__dirname + '/app/routes.json'));


//if run seperately start listening
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}