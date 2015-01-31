var express = require('express')
var app = express()
var jade = require('jade');


app.get('/', function (req, res) {
  res.send(jade.renderFile(__dirname + 'jade/index.jade', options));
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
