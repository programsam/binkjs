var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.send('Hello World!')
})

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
