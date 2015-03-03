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

function getJamMusicians(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT musiciansoncollection.musicianid, musiciansoncollection.jamid, musiciansoncollection.instrumentid, " +
			"musicians.name as musicianname, instruments.name as instrumentname FROM musiciansoncollection, musicians, " +
			"instruments where instruments.id = musiciansoncollection.instrumentid and musicians.id = musicianid and " +
			"musiciansoncollection.jamid = " + thisjam.id, function(err, musicians, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			res.status(500).end("ERROR!")
			client.end()
		}
		else
		{
			 mymusicians = []
			 async.forEach(musicians, function(thismusician, mainCallback) {
				 async.forEach(mymusicians, function(thismymusician, subCallback) {
				 	 if (thismusician.name == thismymusician.name)
					 {
						thismymusician.instruments.push(thismusician.instrumentname)
						subCallback()
					 }
					 else
					 {
						 var musician = {"name":thismusician.musicianname,
								 "instruments": [thismusician.instrumentname]}
						 mymusicians.push(musician)
						 subCallback()
					 }
				 }, 
				 function (err, results) {
					 mainCallback()
				 })
			 }, 
			 function(err, results) {
				 thisjam.musicians = mymusicians
				 overallCallback()
			 })
		}
	})
}

function getBand(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from bands where id = " + thisjam.bandid, function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			res.status(500).end("ERROR!")
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.band = rows[0]
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				client.end()
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
			res.status(500).end("ERROR!")
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.location = rows[0]
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				callback()
			}
		} //else
	}) //query
} //function

app.get('/jam/:id', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams where id = ' + req.params.id, function(err, rows) {
		if (err)
		{
			res.status(500).end("ERROR!")
			client.end()
		}
		else
		{
			thisjam = rows[0]
			async.series([
			    function(callback)
			    {
			    	getBand(thisjam, callback)
			    },
			    function(callback)
			    {
			    	getLocation(thisjam, callback)
			    },
			    function(callback)
			    {
			    	getJamMusicians(thisjam, callback)
			    },
			    function(callback)
			    {
			    	res.send(thisjam)
			    	client.end()
			    	callback()
			    }
			]) //series
		}
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
		  client.end()
	  }
	  else
	  {
		  async.forEach(jams, function(thisjam, mainCallback) {
				async.series([
				    function(callback)
				    {
				    	getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	getLocation(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err)
		  {
			  res.send(jams)
			  client.end()
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
