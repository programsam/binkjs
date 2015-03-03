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

function getBand(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from bands where id = " + thisjam.bandid, function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.band = rows[0]
				callback()
			}
			else //nothing in the array, return null
			{
				callback()
			}
		} //else
	}) //query
} //function

function getLocation(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from locations where id = " + thisjam.locid, function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.location = rows[0]
				callback()
			}
			else //nothing in the array, return null
			{
				callback()
			}
		} //else
	}) //query
} //function

app.get('/jam/:id', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where id = ' + req.params.id, function(err, rows) {
		thisjam = rows[0]
		async.series([
		    function(callback)
		    {
		    	thisjam.band = getBand(thisjam, callback)
		    },
		    function(callback)
		    {
		    	thisjam.location = getLocation(thisjam, callback)
		    },
		    function(callback)
		    {
		    	res.send(thisjam)
		    	callback()
		    }
		]) //series
	})//outer client.query
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
		  async.forEach(jams, function(thisjam, mainCallback) {
				async.series([
				    function(callback)
				    {
				    	thisjam.band = getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	thisjam.location = getLocation(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err)
		  {
			  res.send(jams)
		  }
		  ) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
