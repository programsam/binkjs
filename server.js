var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('./settings.json')

function sql() {
	var client;
	try
	{
		client = mysql.createClient(settings.mysql);
		return client
	}
	catch (error)
	{
		console.log(error)
	}
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.get('/jam/:id', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where id = ' + req.params.id, function(err, rows) {
		thisjam = rows[0]
		async.series(function(callback) {
			if (thisjam.bandid != -1)
			{
			  	client.query('SELECT * from bands where id = ' + thisjam.bandid, function(err, bands, fields) {
			  		thisjam.band = bands[0]
			  	})
			}
			if (thisjam.locid != -1)
			{
				client.query('SELECT * from locations where id = ' + thisjam.locid, function(err, locations, fields) {
			  		thisjam.location = locations[0]
				})
			}
			callback()
		}, function(callback) {
			res.set('Content-Type', 'application/json')
			res.send(thisjam)
			callback()
		})
	})
}) //get /jam/id

app.get('/recent', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where private = 0 order by date desc limit 0,5', function(err, jams, fields) {
	  if (err) throw err;
	  async.forEach(jams, function(thisjam, callback) {
			  if (thisjam.bandid != -1)
			  {
			  	client.query('SELECT * from bands where id = ' + thisjam.bandid, function(err, bands, fields) {
			  		thisjam.band = bands[0]
			  		callback()
			  	})
			  }
			  else
			  {
			  	callback()
			  }
		  }, //individual jam
		  function (err)
		  {
			  async.forEach(jams, function(thisjam, callback2) {
				  if (thisjam.locid != -1)
				  {
				  	client.query('SELECT * from locations where id = ' + thisjam.locid, function(err, locations, fields) {
				  		thisjam.location = locations[0]
				  		callback2()
				  	})
				  }
				  else
				  {
				  	callback2()
				  }
			  }, //individual jam
			  function (err)
			  {
			    res.set('Content-Type','application/json')
			  	res.send(JSON.stringify(jams))
			  }) //locations are done
		  }) //jams are done
	  })//client.query
}) //get /recent

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
