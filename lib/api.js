const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql2');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

var api = express.Router()

api.use(bodyParser.json())


function sql() {
	return client = mysql.createConnection(settings.mysql);
}

api.get('/api/jam/:id/location', function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam locations must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's location by a jamid that was not a number! They looked up the location for jam ID: ${req.params.id}`);
		return;
	}
	Processing.getLocationByJamId(jamid, function(err, result) {
		if (err) {
			res.status(500).json({message: JSON.stringify(err)});
		} else {
			res.json(result);
		}
	})
})

api.get('/api/jam/:id', function (req, res) {
	var jamid = parseInt(req.params.id);
	var client = sql();
	let onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams where ' + onlyPublic + 'id = ?', [jamid],
		function(err, rows) {
		if (err) {
			logger.error(`Error while loading jam ${jamid}: ${JSON.stringify(err)}`);
			res.status(500).json(`Error occurred loading jam ${jamid}: ${JSON.stringify(err)}`);
			client.end();
		} else {
			if (rows.length === 1) {
				thisjam = rows[0]
				async.series([
			    function(callback) {
			    	Processing.getBand(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getLocation(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getJamMusicians(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getJamStaff(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getJamTracks(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getJamPictures(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getJamVideos(thisjam, callback)
			    },
			    function(callback) {
			    	res.send(thisjam)
			    	client.end()
			    	callback()
			    } //final callback
				]) //async.series
			} else { //there is not just one item but maybe many
				res.status(404).send({message: `Jam ${jamid} was not found!`})
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
	  if (err) {
		  logger.error("ERROR Getting recent jams: " + err)
		  res.status(500).end()
		  client.end()
	  } else {
		  async.forEach(jams, function(thisjam, mainCallback) {
				async.series([
			    function(callback) {
			    	Processing.getBand(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getLocation(thisjam, callback)
			    },
			    function(callback) {
			    	Processing.getDefPic(thisjam, callback)
			    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err) {
			  res.send(jams)
			  client.end()
		  }) //jams are done
  	} //else the database command was successful
  })//client.query
}) //get /recent

api.get('/api/entity/:type/:id/search', function(req, res) {
	if (req.params.type === "bands" || req.params.type === "locations") {
		searchJamsTable(req, res);
	} else if (req.params.type === "musicians" || req.params.type === "staff") {
		matchEntityToJams(req, res);
	} else {
		res.status(404).json({message:`Type ${req.params.type} is not known to BINK`});
	}
})

api.get('/api/entity/search/:type', function(req, res) {
	Processing.searchEntities(req.params.type, req.query, function(err, list) {
		if (err) {
			logger.error(`Error occurred searching for ${type}s with query '${req.query.q}': ${err}`);
			res.status(500).json(err);
		} else {
			res.json(list);
		}
	})
})

api.get('/api/entity/:type/:id', function(req, res) {
	Processing.getEntity(req.params.type, req.params.id, function(err, entity) {
		if (err) {
			logger.error(`Error occurred looking up ${req.params.type} #${req.params.id}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(entity);
		}
	})
})

api.get('/api/search', function (req, res) {
	searchJamsTable(req, res);
}) //get /recent

function searchJamsTable(req, res) {
	var toRet = {};
	var limit = 10;
	var offset = 0;

	if (req.query.limit != "" && req.query.limit != null) 	{
		limit = parseInt(req.query.limit)
	}
	if (req.query.offset != "" && req.query.offset != null) {
		offset = parseInt(req.query.offset)
	}
	logger.debug(`Determined offset: ${offset}, and limit: ${limit}`);

	var whereClause = "private = 0 ";
	if (req.session.admin)
		whereClause = "(private = 0 or private = 1) ";

	logger.debug(`Deterined whereClause: ${whereClause}`)

	var columnName = null;
	if (req.params.type === "locations")
		columnName = "locid";
	else if (req.params.type === "bands")
		columnName = "bandid";
	else if (req.params.type) {
		logger.warn("The type was defined but not one we know and didn't get filtered out previously.")
		res.status(500).end();
	}

	if (columnName)
		whereClause += ` and ${columnName} = ?`;

	logger.debug(`whereClause after type: ${whereClause}`)

	var orderBy = "desc";
	if (req.query.order === "asc")
		orderBy = "asc";

	logger.debug(`Determined orderBy: ${orderBy}`)

	var search, paramArray;

	if (req.query.search) {
		var search = `%${req.query.search}%`;
		logger.debug(`Search active. Query is ${search}`)
		whereClause = `${whereClause} and title like(?) `;
		if (columnName) {
			logger.debug(`Search active and column is set. Params will be id, search, offset, limit, id, search.`);
			paramArray = [req.params.id, search, offset, limit, req.params.id, search]
		} else {
			logger.debug(`Search active but not column set. Params will be search, offset, limit, search.`);
			paramArray = [search, offset, limit, search];
		}
	} else {
		if (columnName) {
			logger.debug(`Search not active, but column set. Params will be id, offset, limit, id.`);
			paramArray = [req.params.id, offset, limit, req.params.id];
		} else {
			logger.debug(`Search not active and column not set. Params will be offset, limit.`);
			paramArray = [offset, limit];
		}
	}

	var query = `SELECT * FROM jams WHERE ${whereClause} order by date ${orderBy} limit ?,?;` +
							`SELECT COUNT(*) FROM jams WHERE ${whereClause};`;

	logger.debug(`SQL query: ${query}; parameters: ${JSON.stringify(paramArray)}`)
	let client = sql();
	client.query(query, paramArray, function (err, data) {
		client.end();
	  if (err) {
		  logger.error("[ERR api.js searchJamsTable] client.query: " + err)
		  res.status(500).end();
	  } else {
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
		  }, function (err) { //got everything; can return
			  if (err) {
					logger.error(`Error while processing results: ${JSON.stringify(err)}`)
					res.status(500).json(err);
				} else {
					toRet.rows = data[0];
					logger.debug(`The total: ${JSON.stringify(data[1])}`);
					toRet.total = data[1][0]["COUNT(*)"];
					res.json(toRet);
				} //no error grabbing results
		  }) //for each
		} //else top level query was succesful
	}) //client.query
} //searchJamsTable

function matchEntityToJams(req, res) {
	var toRet = {};
	var limit = 10;
	var offset = 0;

	if (req.query.limit != "" && req.query.limit != null) 	{
		limit = parseInt(req.query.limit)
	}
	if (req.query.offset != "" && req.query.offset != null) {
		offset = parseInt(req.query.offset)
	}
	logger.debug(`Determined offset: ${offset}, and limit: ${limit}`);

	var whereClause = "private = 0 ";
	if (req.session.admin)
		whereClause = "(private = 0 or private = 1) ";

	logger.debug(`Deterined whereClause: ${whereClause}`);

	var tableName, innerWhereClause;
	if (req.params.type === "musicians") {
		tableName = "musiciansoncollection";
		// whereClause += `and jams.id = musiciansoncollection.jamid and musiciansoncollection.musicianid = ?`
		innerWhereClause = `musiciansoncollection.musicianid = ?`
	}
	else if (req.params.type === "staff") {
		tableName = "productiononcollection";
		// whereClause += `and jams.id = productiononcollection.jamid and productiononcollection.staffid = ?`
		innerWhereClause = `productiononcollection.staffid = ?`
	}
	else if (req.params.type) {
		logger.error("The type was defined but not one we know and didn't get filtered out previously.")
		res.status(500).end();
	}

	logger.debug(`whereClause after type: ${whereClause}`)

	var orderBy = "desc";
	if (req.query.order === "asc")
		orderBy = "asc";

	logger.debug(`Determined orderBy: ${orderBy}`)

	var search, paramArray, whereClause;

	if (req.query.search) {
		search = `%${req.query.search}%`;
		logger.debug(`Search active. Query is ${search}`)
		whereClause = `${whereClause} and title like(?) `;
		if (tableName) {
			logger.debug(`tableName is set and so is search, so params will be id, search, offset, limit, id, search`);
			paramArray = [req.params.id, search, offset, limit, req.params.id, search]
		} else {
			logger.debug(`tableName is NOT set and so is search, so params will be search, offset, limit, search`);
			paramArray = [search, offset, limit, search];
		}
	} else {
		if (tableName) {
			logger.debug(`tableName is set and but search is not, so params will be id, offset, limit, id`);
			paramArray = [req.params.id, offset, limit, req.params.id];
		} else {
			logger.debug(`tableName and search are not set so params will be limit, offset`);
			paramArray = [offset, limit];
		}
	}

	var query = `SELECT * FROM jams WHERE jams.id in (select distinct jamid from ${tableName} where ${innerWhereClause}) and ${whereClause} order by date ${orderBy} limit ?,?; ` +
							 `SELECT COUNT(*) FROM jams WHERE jams.id in (select distinct jamid from ${tableName} where ${innerWhereClause}) and ${whereClause};`;

	logger.debug(`SQL query: ${query}, paramArray: ${JSON.stringify(paramArray)}`)
	let client = sql();
	client.query(query,
		paramArray, function (err, data) {
			  if (err) {
				  logger.error("[ERR api.js matchEntityToJams] client.query: " + err)
				  res.status(500).end()
				  client.end()
			  } else {
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
		  }, function (err) { //got everything, return now
				client.end();
			  if (err) {
					logger.error(`Error while processing results: ${JSON.stringify(err)}`)
					res.status(500).json(err);
				} else {
					toRet.rows = data[0];
					toRet.total = data[1][0]["COUNT(*)"];
					res.json(toRet);
				} //else no issue with jam processing
		  }) //jams are done
  	} //else top level database was successful
	}) //main query
} // match entity to jam

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
			logger.error("ERROR: " + err)
			client.end();
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
					client.end();
					if (err) {
						logger.error(`Error while grabbing geojson data; ${err}`);
						res.status(500).json(err);
					} else {
						res.json(toRet);
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
			logger.error("ERROR: " + err)
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
					client.end();
					if (err) {
						logger.error(`Error while grabbing map location data; ${err}`);
						res.status(500).json(err);
					} else {
						res.json(toRet);
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
			logger.error("ERROR: " + err)
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
