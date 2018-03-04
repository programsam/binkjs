var twitter		= require('twitter')
var express 	= require('express')
var bodyParser 	= require('body-parser')
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('../settings.json')
var Processing 	= require("./processing.js")

var api = express.Router()

api.use(bodyParser.json())


function sql() {
	return client = mysql.createConnection(settings.mysql);
}

api.get('/api/jam/:id/location', function(req, res) {
	let client = sql();
	client.query('select locations.name, locations.id, locations.address, ' +
								'locations.link, locations.lat, locations.lon from jams, locations where ' +
								' jams.id=? and jams.locid = locations.id', [req.params.id],
	function(err, rows) {
		if (err) {
			console.log(`Error loading jam location: ${JSON.stringify(err)}`);
			client.end();
			res.status(500).json(err);
		} else {
			if (rows.length === 1) {
				thisloc = rows[0];
				res.json(thisloc);
			} else {
				res.status(400).send("Too many or not enough locations found (does this jam have a location?)");
			}
		}
	})
})

api.get('/api/jam/:id', function (req, res) {
	var client = sql();
	var onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams where ' + onlyPublic + 'id = ?', [req.params.id],
		function(err, rows) {
		if (err)
		{
			console.log("ERROR: " + err)
			client.end()
		}
		else
		{
			if (rows.length == 1)
			{
				thisjam = rows[0]
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
				    	Processing.getJamMusicians(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamStaff(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamTracks(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamPictures(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamVideos(thisjam, callback)
				    },
				    function(callback)
				    {
				    	res.send(thisjam)
				    	client.end()
				    	callback()
				    }
				]) //series
			}//there is one item
			else
			{
				res.status(404).send("This item was not found in BINK!")
			}
		}
	})//outer client.query
}) //get /jam/id

api.get('/api/recent', function (req, res) {
	res.set('Content-Type','application/json')
	var client = sql();
	var onlyPublic = "where private = 0"
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams ' + onlyPublic + ' order by date desc limit 0,20', function(err, jams, fields) {
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
				    	Processing.getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getLocation(thisjam, callback)
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
			  res.send(jams)
			  client.end()
		  }
		  ) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

var allowed = ['musicians' , 'locations', 'staff', 'bands']
api.get('/api/entity/:type/:id', function(req, res) {
	if (allowed.indexOf(req.params.type) == -1)
	{
		res.send("[]")
	}
	else
	{
		var client = sql();
		client.query("SELECT * from " + req.params.type + " where id = ?",
			[req.params.id],
			function(err, rows, fields) {
			if (err) //error while getting the item
			{
				console.log("ERROR: " + err)
				client.end()
			}
			else //no error
			{
				if (rows.length > 1) //there is something in the array, return it
				{
					client.end()
					res.send("More than one entity matches that ID! WHAT?")
				}
				else if (rows.length == 1)
				{
					var entity = rows[0]
					if (req.params.type == "musicians")
					{
						var client2 = sql()
						var onlyPublic = "and jams.private = 0"
						if (req.session.admin)
							onlyPublic = ""
						client2.query("select distinct jams.title as title, jams.id as id from musiciansoncollection, " +
								"jams, musicians where musicians.id = ? and jams.id = musiciansoncollection.jamid and " +
								"musiciansoncollection.musicianid = musicians.id " + onlyPublic,
							[req.params.id],
							function(err, jams, fields) {
							if (err) //error while getting the item
							{
								console.log("ERROR: " + err)
								client2.end()
							}
							else //no error
							{
								if (jams.length > 0) //there is something in the array, return it
								{
									client2.end()
									entity.jams = jams
									res.send(entity)
								}
								else //nothing in the array, return null
								{
									res.send(entity)
									client2.end()
								}
							} //else
							client.end()
						}) //query
					}
					else if (req.params.type == "staff")
					{
						var client2 = sql()
						var onlyPublic = "and jams.private = 0"
						if (req.session.admin)
							onlyPublic = ""
						client2.query("select distinct jams.title as title, jams.id as id from productiononcollection, " +
								"jams, staff where staff.id = ? and jams.id = productiononcollection.jamid and " +
								"productiononcollection.staffid = staff.id" + onlyPublic,
							[req.params.id],
							function(err, jams, fields) {
							if (err) //error while getting the item
							{
								console.log("ERROR: " + err)
								client2.end()
							}
							else //no error
							{
								if (jams.length > 0) //there is something in the array, return it
								{
									client2.end()
									entity.jams = jams
									res.send(entity)
								}
								else //nothing in the array, return null
								{
									res.send(entity)
									client2.end()
								}
							} //else
							client.end()
						}) //query
					}
					else if (req.params.type == "locations")
					{
						var client2 = sql()
						var onlyPublic = "and jams.private = 0"
						if (req.session.admin)
							onlyPublic = ""
						client2.query("select jams.id as id, jams.title as title from jams, " +
								"locations where locations.id = jams.locid and locations.id = ? " + onlyPublic,
							[req.params.id],
							function(err, jams, fields) {
							if (err) //error while getting the item
							{
								console.log("ERROR: " + err)
								client2.end()
							}
							else //no error
							{
								if (jams.length > 0) //there is something in the array, return it
								{
									client2.end()
									entity.jams = jams
									res.send(entity)
								}
								else //nothing in the array, return null
								{
									res.send(entity)
									client2.end()
								}
							} //else
							client.end()
						}) //query
					}
					else if (req.params.type == "bands")
					{
						var onlyPublic = "and jams.private = 0"
							if (req.session.admin)
								onlyPublic = ""
						var client2 = sql()
						client2.query("select jams.id as id, jams.title as title from jams, " +
								"bands where bands.id = jams.bandid and bands.id = ? " + onlyPublic,
							[req.params.id],
							function(err, jams, fields) {
							if (err) //error while getting the item
							{
								console.log("ERROR: " + err)
								client2.end()
							}
							else //no error
							{
								if (jams.length > 0) //there is something in the array, return it
								{
									client2.end()
									entity.jams = jams
									res.send(entity)
								}
								else //nothing in the array, return null
								{
									res.send(entity)
									client2.end()
								}
							} //else
							client.end()
						}) //query
					}
					else
					{
						res.send(entity)
						client.end()
					}
				}
				else //nothing in the array, return null
				{
					client.end()
					res.send("{}")
				}
			} //else
		}) //query
	} //else
})

api.get('/api/timelineData', function(req, res) {
	var client = sql();
	var onlyPublic = " where jams.private = 0"
	if (req.session.admin)
		onlyPublic = ""

	client.query("SELECT id, title as content, date as start from jams" + onlyPublic,
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

api.get('/api/total/jams', function (req, res) {
	toRet = {}
	async.series([
	function(callback)
	{
		Processing.getTotalJams(toRet, req.session.admin, callback)
	},
	function(callback)
	{
		res.send(toRet)
	}])
})

api.get('/api/search', function (req, res) {
	console.log(`My inputs were: ${JSON.stringify(req.query)}`)
	let toRet = {};
	let limit = 10;
	let offset = 0;
	if (req.query.limit != "" && req.query.limit != null)
	{
		limit = parseInt(req.query.limit)
	}
	if (req.query.offset != "" && req.query.offset != null)
	{
		offset = parseInt(req.query.offset)
	}

	var client = sql();
	var onlyPublic = "private = 0 ";
	if (req.session.admin)
		onlyPublic = "true"

	let orderBy = "desc";
	if (req.query.order === "asc")
		orderBy = "asc";

	let query = `SELECT SQL_CALC_FOUND_ROWS * FROM jams WHERE ${onlyPublic} order by date ${orderBy} limit ?,?;` +
							`SELECT FOUND_ROWS() as total;`;
	let paramArray = [offset, limit];

	if (req.query.search) {
		let search = `%${req.query.search}%`;
		query = `SELECT SQL_CALC_FOUND_ROWS * FROM jams WHERE ${onlyPublic}and title like(?) ` +
						`order by date ${orderBy} limit ?,?;` +
						`SELECT FOUND_ROWS() as total;`;
		paramArray = [search,offset,limit]
	}

	console.log(`SQL query: ${query}`)
	client.query(query,
				paramArray, function (err, data) {
					  if (err)
					  {
						  console.log("ERROR Getting recent jams: " + err)
						  res.status(500).end()
						  client.end()
					  }
					  else
					  {
						  async.forEach(data[0], function(thisjam, mainCallback) {
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
							    }
							],
							function (err, results) {
								mainCallback()
							})
					  }, //got everything, return now
					  function (err)
					  {
						  if (err) {
								console.log(`Error while processing results: ${JSON.stringify(err)}`)
								res.status(500).json(err);
							} else {
								toRet.rows = data[0];
								toRet.total = data[1][0].total;
								res.json(toRet);
								client.end()
							}
					  }
					  ) //jams are done
				  	} //else the database command was successful
				}) //client.query
}) //get /recent


api.get('/api/playlist', function(req, res) {
	res.send(JSON.stringify(req.session.playlist))
})

api.put('/api/playlist', function(req, res) {
	if (! req.session.hasOwnProperty("playlist") ||
		typeof req.session.playlist == "undefined")
	{
		req.session.playlist = []
	}
	req.session.playlist.push(req.body)
	res.send(req.session.playlist)
})

api.get('/api/maps/key', function (req,res) {
	res.send(settings.maps)
})

api.get('/api/tweets', function (req, res) {
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

api.get('/api/mapdata', function(req, res) {
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
					var onlyPublic = " private = 0 and "
					if (req.session.admin)
						onlyPublic = ""
					client2.query("SELECT * from jams where " + onlyPublic + " locid = ?",
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

api.get('/api/history', function(req, res) {
	var client = sql();
	var d = new Date();
	var sqlMonth = ('00' + (d.getUTCMonth() + 1)).slice(-2)
	var sqlDate = ('00' + (d.getUTCDate())).slice(-2)
	var onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query("SELECT * from jams where " + onlyPublic + " date like ('%-" + sqlMonth + "-" + sqlDate + "')",
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

module.exports = api
