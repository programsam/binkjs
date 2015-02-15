var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('./settings.json')

function sql() {
	return mysql.createClient(settings.mysql);
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.get('/jam/:id', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where id = ' + req.params.id, function(err, rows) {
		result = rows[0]
		res.set('Content-Type', 'application/json')
		res.send(result)
	})
}) //get /jam/id

app.get('/recent', function (req, res) {
	var client = sql();
	var jams = [];
	client.query('SELECT * from jams where bands.id = jams.bandid and locations.id = jams.locid order by date desc limit 0,5', function(err, rows) {
	  if (err) throw err;
	  	res.send(rows)
	  })//client.query
}) //get /recent

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
