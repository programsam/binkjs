var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('./settings.json')

function sql() {
	return client = mysql.createClient(settings.mysql);
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

function getItem(field, id)
{
	client.query('SELECT * from " + fields + " where id = ' + id, function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				return row[0]
			}
			else //nothing in the array, return null
			{
				return null
			}
		} //else
	}) //query
} //function

app.get('/jam/:id', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where id = ' + req.params.id, function(err, rows) {
		thisjam = rows[0]
		thisjam.band = getItem("bands", thisjam.bandid)
	}) //outer client.query
}) //get /jam/id

app.get('/recent', function (req, res) {
	res.set('Content-Type','application/json')
	var client = sql();
	client.query('SELECT * from jams where private = 0 order by date desc limit 0,20', function(err, jams, fields) {
	  if (err)
	  {
		  console.log("ERROR Getting recent jams: " + err)
		  res.status(500).end()
	  }
	  else
	  {
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
				  	res.send(JSON.stringify(jams))
				  }) //locations are done
			  }) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
