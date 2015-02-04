var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var settings	= require('./settings.json')

function sql() {
	return mysql.createClient(settings.mysql);
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.get('/recent', function (req, res) {
	var client = sql();
	client..query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
	  if (err) throw err;
	  console.log('The solution is: ', rows[0].solution);
	});
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
