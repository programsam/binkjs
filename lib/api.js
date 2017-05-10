var express 	= require('express')
var bodyParser 	= require('body-parser')
var mysql		= require('mysql');
var async		= require('async');


var api = express.Router()

function sql() {
	return client = mysql.createClient(settings.mysql);
}

api.get('/jam/:id', function (req, res) {
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
		}
	})//outer client.query
}) //get /jam/id

api.get('/recent', function (req, res) {
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
api.get('/entity/:type/:id', function(req, res) {
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
						client2.query("select distinct jams.title as title, jams.id as id from musiciansoncollection, " +
								"jams, musicians where musicians.id = ? and jams.id = musiciansoncollection.jamid and " +
								"musiciansoncollection.musicianid = musicians.id",
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
						client2.query("select distinct jams.title as title, jams.id as id from productiononcollection, " +
								"jams, staff where staff.id = ? and jams.id = productiononcollection.jamid and " +
								"productiononcollection.staffid = staff.id",
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
						client2.query("select jams.id as id, jams.title as title from jams, " +
								"locations where locations.id = jams.locid and locations.id = ?",
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
						var client2 = sql()
						client2.query("select jams.id as id, jams.title as title from jams, " +
								"bands where bands.id = jams.bandid and bands.id = ?",
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

api.get('/timelineData', function(req, res) {
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

api.get('/total/jams', function (req, res) {
	toRet = {}
	async.series([
	function(callback)
	{
		Processing.getTotalJams(toRet, callback)
	},
	function(callback)
	{
		res.send(toRet)
	}])
})

api.get('/search/:size/:page/:query', function (req, res) {
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
	var query = "%" + req.params.query + "%"
	
	var client = sql();
	var toRet = {"page": page, "size": size, "query": req.params.query}
	Processing.getTotalSearchJams(query, toRet)
	client.query("SELECT * from jams where private = 0 and title like (?) order by date desc limit ?,?",
				[query, offset, size], function (err, jams) {
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
						  toRet.results = jams
						  res.send(toRet)
						  client.end()
					  }
					  ) //jams are done
				  	} //else the database command was successful
				}) //client.query
}) //get /recent

api.get('/search/:size/:page', function (req, res) {
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
	Processing.getTotalJams(toRet)
	client.query("SELECT * from jams where private = 0 order by date desc limit ?,?", 
				[offset, size], 
				function(err, jams) {
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
						  toRet.results = jams
						  res.send(toRet)
						  client.end()
					  }
					  ) //jams are done
				  	} //else the database command was successful
				}) //client.query
}) //get /recent

module.exports = api