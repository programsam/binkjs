var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var settings	= require('./settings.json')

console.log(settings.derp)

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
