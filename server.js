var express 	= require('express')
var session 	= require('express-session')
var uuid		= require('node-uuid')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var bodyParser 	= require('body-parser')
var settings	= require('./settings.json')
var twitter		= require('twitter')

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

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

function getJamMusicians(thisjam, overallCallback)
{
	var client = sql();
	var mymusicians = []
	client.query("SELECT musiciansoncollection.musicianid, musiciansoncollection.jamid, musiciansoncollection.instrumentid, " +
			"musicians.name as musicianname, instruments.name as instrumentname FROM musiciansoncollection, musicians, " +
			"instruments where instruments.id = musiciansoncollection.instrumentid and musicians.id = musicianid and " +
			"musiciansoncollection.jamid = ?", [thisjam.id], function(err, musicians, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(musicians, function(thismusician, mainCallback) {
				 var found = false
				 async.forEach(mymusicians, function(thismymusician, subCallback) {
				 	 if (thismusician.musicianname == thismymusician.name)
					 {
						thismymusician.instruments.push(thismusician.instrumentname)
						found = true
					 }
					 subCallback()
				 	}, 
				 	function (err, results) {
					 if (found == false)
					 {
						 var musician = {"name":thismusician.musicianname,
								 "instruments": [thismusician.instrumentname]}
						 mymusicians.push(musician)
					 }
					 mainCallback()
				  })
			   },
			   function(err, results) {
				 thisjam.musicians = mymusicians
				 client.end()
				 overallCallback()
			   })
		}
	})
}

function getJamTracks(thisjam, overallCallback)
{
	var client = sql();
	var mytracks = []
	client.query("SELECT * from tracks where jamid = ? order by num asc", [thisjam.id], 
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			async.forEach(tracks, function(thisTrack, trackCallback) {
				var track = {
					id: thisTrack.id,
					title: thisTrack.title,
					path: settings.media_s3_url + thisTrack.path,
					notes: thisTrack.notes
				}
				mytracks.push(track)
				trackCallback()
			}, function (err, results)
			{
				thisjam.tracks = mytracks
				overallCallback()
			}) //async
		} //else
	}) //query
}

function hasTracks(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT * from tracks where jamid = ?", [thisjam.id], 
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (tracks.length > 0)
			{
				thisjam.hasTracks = true
				overallCallback()
			}
			else
			{
				thisjam.hasTracks = false
				overallCallback()
			}
		} //else
	}) //query
}

function hasPics(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id], 
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (pics.length > 0)
			{
				thisjam.hasPics = true
				overallCallback()
			}
			else
			{
				thisjam.hasPics = false
				overallCallback()
			}
		} //else
	}) //query
}

function hasVids(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id], 
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (vids.length > 0)
			{
				thisjam.hasVids = true
				overallCallback()
			}
			else
			{
				thisjam.hasVids = false
				overallCallback()
			}
		} //else
	}) //query
}

function getJamStaff(thisjam, overallCallback)
{
	var client = sql();
	var mystaff = []
	client.query("SELECT productiononcollection.jamid, productiononcollection.staffid, " +
				 "productiononcollection.roleid, staff.name as staffname, roles.name as rolename " +  
				 "FROM productiononcollection, staff, roles where staff.id = productiononcollection.staffid " + 
				 "and roles.id = productiononcollection.roleid " +
				 "and jamid = ?", [thisjam.id], 
		function(err, staff, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(staff, function(thisstaff, mainCallback) {
				 var found = false
				 async.forEach(mystaff, function(thismystaff, subCallback) {
				 	 if (thisstaff.staffname == thismystaff.name)
					 {
						thismystaff.roles.push(thisstaff.rolename)
						found = true
					 }
					 subCallback()
				 	}, 
				 	function (err, results) {
					 if (found == false)
					 {
						 var staff = {"name":thisstaff.staffname,
								 "roles": [thisstaff.rolename]}
						 mystaff.push(staff)
					 }
					 mainCallback()
				  })
			   },
			   function(err, results) {
				 thisjam.staff = mystaff
				 client.end()
				 overallCallback()
			   })
		}
	})
}

function getJamPictures(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id], 
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
		}
		else
		{
			client.end()
			if (pics.length > 0)
			{
				mypics = []
				async.forEach(pics, function(thisPic, picCallback) {
					thisPic.path = settings.media_s3_url + "pics/" + thisPic.jamid + "/" + thisPic.filename
					mypics.push(thisPic)
					picCallback()
				}, function (err, results)
				{
					thisjam.pictures = mypics
					overallCallback()
				}) //async
			}
			else
			{
				thisjam.pictures = null
				overallCallback()
			}
		} //else
	}) //query
}

function getJamVideos(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id], 
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
		}
		else
		{
			client.end()
			if (vids.length > 0)
			{
				for (var j=0;j<vids.length;j++)
				{
					vids[j].path = settings.media_s3_url + vids[j].path
				}
				thisjam.video = vids
				callback()
			}
			else
			{
				thisjam.video = null
				callback()
			}
		} //else
	}) //query
}

function getBand(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from bands where id = ?", [thisjam.bandid], 
    function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
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

function getDefPic(thisjam, callback)
{
	
	var client = sql();
	client.query("SELECT * from pictures where id = ?", [thisjam.defpic], 
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.defpic = rows[0]
				thisjam.defpic.path = settings.media_s3_url + "pics/" + thisjam.id + "/" + thisjam.defpic.filename
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				thisjam.defpic = null
				client.end()
				callback()
			}
		} //else
	}) //query
} //function

function getLocation(thisjam, callback)
{
	var client = sql();
	client.query("SELECT * from locations where id = ?", [thisjam.locid], 
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
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
	client.query('SELECT * from jams where id = ?', [req.params.id], 
		function(err, rows) {
		if (err)
		{
			console.log("ERROR: " + err)
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
			    	getJamStaff(thisjam, callback)
			    },
			    function(callback)
			    {
			    	getJamTracks(thisjam, callback)
			    },
			    function(callback)
			    {
			    	getJamPictures(thisjam, callback)
			    },
			    function(callback)
			    {
			    	getJamVideos(thisjam, callback)
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
				    },
				    function(callback)
				    {
				    	getDefPic(thisjam, callback)
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

app.get('/playlist', function(req, res) {
	res.send(JSON.stringify(req.session.playlist))
})

app.get('/timelineData', function(req, res) {
	var client = sql();
	client.query("SELECT id, title as content, date as start from jams", 
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
				for (var j=0;j<rows.length;j++)
				{
					rows[j].type = "point"
				}
				client.end()
				res.send(rows)
			}
			else //nothing in the array, return null
			{
				client.end()
				res.send("[]")
			}
		} //else
	}) //query
})

app.put('/playlist', function(req, res) {
	if (! req.session.hasOwnProperty("playlist") ||
		typeof req.session.playlist == "undefined")
	{ 
		req.session.playlist = []
	}
	req.session.playlist.push(req.body)
	res.send(req.session.playlist)
})

function getTotalJams(toRet, callback) {
	var client = sql();
	client.query("SELECT COUNT(*) as num from jams", 
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
				client.end()
				toRet.total = rows[0].num
				if (null != callback)
					callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				if (null != callback)
					callback()
			}
		} //else
	}) //query
}

app.get('/total/jams', function (req, res) {
	toRet = {}
	async.series([
	function(callback)
	{
		getTotalJams(toRet, callback)
	},
	function(callback)
	{
		res.send(toRet)
	}])
})

app.get('/history', function(req, res) {
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
				client.end()
				res.send(rows)
			}
			else //nothing in the array, return null
			{
				client.end()
				res.send("[]")
			}
		} //else
	}) //query
})

app.get('/api/maps/key', function (req,res) {
	res.send(settings.maps)
})

app.get('/tweets', function (req, res) {
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

app.get('/mapdata', function(req, res) {
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

app.get('/search/:query/:size/:page', function (req, res) {
	res.set('Content-Type','application/json')
	var size = 10
	var page = 0
	if (req.params.size != "" && req.params.size != null)
	{
		size = parseInt(req.params.size)
	}
	if (req.params.page != "" && req.params.page != null)
	{
		page = parseInt(req.params.page)
	}
	var offset = page * size
	
	var client = sql();
	var toRet = {"page": page, "size": size}
	getTotalJams(toRet)
	client.query("SELECT * from jams where title like (%?%) and private = 0 " +
		"order by date desc limit ?,?", 
	[req.params.query, offset, size],
	function(err, jams, fields) {
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
				    },
				    function(callback)
				    {
				    	hasTracks(thisjam, callback)
				    },
				    function(callback)
				    {
				    	hasVids(thisjam, callback)
				    },
				    function(callback)
				    {
				    	hasPics(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err)
		  {
			  toRet.results = jams
			  res.send(toRet)
			  client.end()
		  }
		  ) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

app.get('/browse/:size/:page', function (req, res) {
	res.set('Content-Type','application/json')
	var size = 10
	var page = 0
	if (req.params.size != "" && req.params.size != null)
	{
		size = parseInt(req.params.size)
	}
	if (req.params.page != "" && req.params.page != null)
	{
		page = parseInt(req.params.page)
	}
	var offset = page * size
	
	var client = sql();
	var toRet = {"page": page, "size": size}
	getTotalJams(toRet)
	client.query('SELECT * from jams where private = 0 order by date desc limit ?,?', 
	[offset, size],
	function(err, jams, fields) {
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
				    },
				    function(callback)
				    {
				    	hasTracks(thisjam, callback)
				    },
				    function(callback)
				    {
				    	hasVids(thisjam, callback)
				    },
				    function(callback)
				    {
				    	hasPics(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err)
		  {
			  toRet.results = jams
			  res.send(toRet)
			  client.end()
		  }
		  ) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

app.use(express.static(__dirname + '/public'));

var server = app.listen(process.env.PORT || 3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
