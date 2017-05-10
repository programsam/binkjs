var express 	= require('express')
var session 	= require('express-session')
var uuid		= require('node-uuid')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var bodyParser 	= require('body-parser')
var settings	= require('./settings.json')
var twitter		= require('twitter')
var Processing 	= require("./lib/processing.js")
var api			= require("./lib/api.js")
var api			= require("./lib/adminapi.js")

function sql() {
	return client = mysql.createClient(settings.mysql);
}

app.use(session({
  resave: false,
  saveUninitialized: false,
  genid: function(req) {
    return uuid.v4(); // use UUIDs for session IDs
  },
  secret: 'keyboard cat'
}))

app.use(bodyParser.json())

app.use(api)
app.use(adminapi)

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.get('api/playlist', function(req, res) {
	res.send(JSON.stringify(req.session.playlist))
})

app.put('api/playlist', function(req, res) {
	if (! req.session.hasOwnProperty("playlist") ||
		typeof req.session.playlist == "undefined")
	{ 
		req.session.playlist = []
	}
	req.session.playlist.push(req.body)
	res.send(req.session.playlist)
})



app.get('/api/maps/key', function (req,res) {
	res.send(settings.maps)
})

app.get('/api/tweets', function (req, res) {
	var client = new twitter(settings.twitter)
	client.get("statuses/user_timeline",
	{"screen_name": "binkupdates"}, 
	function(error, tweets, response){
	  	if (error)
	  	{
	  		console.log("An error occurred retrieving Tweets!")
	  		res.send("[]")
	  	}
	  	else
	  	{
	  		res.send(tweets)
	  	} 
	});
})

app.get('/api/mapdata', function(req, res) {
	var client = sql();
	client.query("SELECT * from locations where lat is not null and lon is not null",
		function(err, locations, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
		}
		else //no error
		{
			if (locations.length > 0) //there is something in the array, return it
			{
				var toSend = []
				var client2 = sql();
				async.forEach(locations, function(thislocation, callback) {
					client2.query("SELECT * from jams where locid = ?",
						[thislocation.id],
						function(err, jams, fields) {
						if (err) //error while getting the item
						{
							console.log("ERROR: " + err)
							client2.end()
							callback()
						}
						else //no error
						{
							if (jams.length > 0) //there is something in the array, return it
							{
								thislocation.jams = []
								for (var i=0;i<jams.length;i++)
								{
									thislocation.jams.push(jams[i])
								}
								toSend.push(thislocation)
								callback()
							}
							else //nothing in the array, return null
							{
								toSend.push(thislocation)
								callback()
							}
						} //else
					}) //query
				}, function (err) {
					client2.end()
					client.end()
					res.send(toSend)
				})
			}
			else //nothing in the array, return null
			{
				client.end()
				res.send("[]")
			}
		} //else
	}) //query
})

app.get('/api/history', function(req, res) {
	var client = sql();
	var d = new Date();
	var sqlMonth = ('00' + (d.getUTCMonth() + 1)).slice(-2)
	var sqlDate = ('00' + (d.getUTCDate())).slice(-2)
	client.query("SELECT * from jams where date like ('%-" + sqlMonth + "-" + sqlDate + "')",
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				async.forEach(rows, function(thisjam, mainCallback) {
					async.series([
					    function(callback)
					    {
					    	Processing.getBand(thisjam, callback)
					    },
					    function(callback)
					    {
					    	Processing.getLocation(thisjam, callback)
					    },
					    function(callback)
					    {
					    	Processing.hasTracks(thisjam, callback)
					    },
					    function(callback)
					    {
					    	Processing.hasVids(thisjam, callback)
					    },
					    function(callback)
					    {
					    	Processing.hasPics(thisjam, callback)
					    },
					    function(callback)
					    {
					    	Processing.getDefPic(thisjam, callback)
					    }
					],
					function (err, results) {
						mainCallback()
					})
			  }, //got everything, return now
			  function (err)
			  {
				  res.send(rows)
				  client.end()
			  }
			  ) //jams are done
			}
			else //nothing in the array, return an empty array
			{
				client.end()
				res.send("[]")
			}
		} //else
	}) //query
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(process.env.PORT || 3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
