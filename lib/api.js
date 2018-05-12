let express 	= require('express')
let bodyParser 	= require('body-parser')
let mysql		= require('mysql');
let async		= require('async');
let settings	= require('../settings.json')
let Processing 	= require("./processing.js")

let api = express.Router()

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
	let client = sql();
	let onlyPublic = "private = 0 and "
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
	let client = sql();
	let onlyPublic = "where private = 0"
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

api.get('/api/entity/:type/:id/search', function(req, res) {
	console.log(`DING! ${JSON.stringify(req.params)}`)
	if (req.params.type === "bands" || req.params.type === "locations") {
		searchJamsTable(req, res);
	} else if (req.params.type === "musicians" || req.params.type === "staff") {
		matchEntityToJams(req, res);
	} else {
		res.status(404).json({message:`Type ${req.params.type} is not known to BINK`});
	}
})

api.get('/api/search', function (req, res) {
	searchJamsTable(req, res);
}) //get /recent

function searchJamsTable(req, res) {
	console.log(`My inputs were: ${JSON.stringify(req.query)}, type: ${req.params.type}, id: ${req.params.id}`)
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

	let client = sql();
	let whereClause = "private = 0 ";
	if (req.session.admin)
		whereClause = "(private = 0 or private = 1) ";

	let columnName = null;
	if (req.params.type === "locations")
		columnName = "locid";
	else if (req.params.type === "bands")
		columnName = "bandid";
	else if (req.params.type) {
		console.log("The type was defined but not one we know and didn't get filtered out previously.")
		console.log("There's a coding problem on BINK.");
		res.status(500).end();
	}

	if (columnName)
		whereClause += ` and ${columnName} = ?`;

	let orderBy = "desc";
	if (req.query.order === "asc")
		orderBy = "asc";

	let query = `SELECT SQL_CALC_FOUND_ROWS * FROM jams WHERE ${whereClause} order by date ${orderBy} limit ?,?;` +
							`SELECT FOUND_ROWS() as total;`;
	let paramArray = [offset, limit];
	if (columnName)
		paramArray = [req.params.id, offset, limit];

	if (req.query.search) {
		let search = `%${req.query.search}%`;
		query = `SELECT SQL_CALC_FOUND_ROWS * FROM jams WHERE ${whereClause}and title like(?) ` +
						`order by date ${orderBy} limit ?,?;` +
						`SELECT FOUND_ROWS() as total;`;
		paramArray = [search,offset,limit]
		if (columnName)
			paramArray = [req.params.id, offset, limit];
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
}

function matchEntityToJams(req, res) {
	console.log(`My inputs were: ${JSON.stringify(req.query)}, type: ${req.params.entity}, id: ${req.params.id}`)
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

	let client = sql();
	let whereClause = "jams.private = 0 ";
	if (req.session.admin)
		whereClause = "(jams.private = 0 or jams.private = 1) ";

	let tableName = null;
	if (req.params.type === "musicians") {
		tableName = "musiciansoncollection";
		whereClause += `and jams.id = musiciansoncollection.jamid and musiciansoncollection.musicianid = ?`
	}
	else if (req.params.type === "staff") {
		tableName = "productiononcollection";
		whereClause += `and jams.id = productiononcollection.jamid and productiononcollection.staffid = ?`
	}
	else if (req.params.type) {
		console.log("The type was defined but not one we know and didn't get filtered out previously.")
		console.log("There's a coding problem on BINK.");
		res.status(500).end();
	}

	let orderBy = "desc";
	if (req.query.order === "asc")
		orderBy = "asc";

	let query = `SELECT SQL_CALC_FOUND_ROWS distinct jams.id, jams.title, jams.date, jams.locid, jams.bandid, jams.private ` +
							` FROM jams, ${tableName} WHERE ${whereClause} order by date ${orderBy} limit ?,?;` +
							`SELECT FOUND_ROWS() as total;`;
	let paramArray = [req.params.id, offset, limit];

	if (req.query.search) {
		let search = `%${req.query.search}%`;
		query = `SELECT SQL_CALC_FOUND_ROWS distinct jams.id, jams.title, jams.date, jams.locid, jams.banid, jams.private ` +
						` FROM jams, ${tableName} WHERE ${whereClause}and jams.title like(?) ` +
						`order by date ${orderBy} limit ?,?;` +
						`SELECT FOUND_ROWS() as total;`;
		paramArray = [req.params.id, offset, limit];
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
}

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

api.get('/api/maps/key', function (req,res) {
	res.send(settings.maps)
})

api.get('/api/geojson', function(req, res) {
	let client = sql();
	let toRet = {
		type: "FeatureCollection",
		features: []
	}
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
				async.forEach(locations, function(thislocation, callback) {
					let thisfeature = {
						type: "Feature",
						properties: {
							id: thislocation.id
						},
						geometry: {
							type: "Point",
							coordinates: [
								parseFloat(thislocation.lon),
								parseFloat(thislocation.lat)
							]
						}
					}
					toRet.features.push(thisfeature)
					callback()
				}, function(err) {
					if (err) {
						console.log(`Error while grabbing geojson data; ${err}`);
						res.status(500).json(err);
					} else {
						res.json(toRet);
						client.end();
					}
				});
			}
			else //nothing in the array, return null
			{
				client.end()
				res.json(toRet)
			}
		} //else
	}) //query
})

api.get('/api/maplocations', function(req, res) {
	let client = sql();
	let toRet = [];
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
				async.forEach(locations, function(thislocation, callback) {
					let thisone = {
						lat: parseFloat(thislocation.lat),
						lon: parseFloat(thislocation.lon),
						id: thislocation.id
					}
					toRet.push(thisone)
					callback()
				}, function(err) {
					if (err) {
						console.log(`Error while grabbing map location data; ${err}`);
						res.status(500).json(err);
					} else {
						res.json(toRet);
						client.end();
					}
				});
			}
			else //nothing in the array, return null
			{
				client.end()
				res.json(toRet)
			}
		} //else
	}) //query
})


api.get('/api/history', function(req, res) {
	let client = sql();
	let d = new Date();
	let sqlMonth = ('00' + (d.getUTCMonth() + 1)).slice(-2)
	let sqlDate = ('00' + (d.getUTCDate())).slice(-2)
	let onlyPublic = "private = 0 and "
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
