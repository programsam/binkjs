const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")

function isSet(field) {
	return (typeof field !== "undefined" && field !== null);
}

function isNotSet(field) {
	return (typeof field === "undefined" || field === null);
}

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

var api = express.Router()

api.use(bodyParser.json())

const entityTypeMap = {
	musicians: "Musician",
	locations: "Location",
	instruments: "Instrument",
	staff: "Staff Member",
	bands: "Band",
	roles: "Role"
}

api.get('/api/jam/:id', function (req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam locations must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's location by a jamid that was not a number! They looked up the location for jam ID: ${req.params.id}`);
		return;
	} else {
		Processing.loadFullSingleJam(jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error when loading jam ${jamid}: ${JSON.stringify(err)}`);
				res.status(400).json(err);
			} else if (isSet(thisjam.id)) {
				res.json(thisjam)
			} else {
				res.status(404).json({message: `Jam ${jamid} was not found!`});
			}
		})
	}
})

api.get('/api/entity/:type/:id/search', function(req, res) {
	var limit = null, offset = null;

	if (req.query.limit != "" && req.query.limit != null) 	{
		limit = parseInt(req.query.limit)
		if (Number.isNaN(limit) || limit <= 0) {
			res.status(400).json({message: `Received limit ${req.query.limit}, which is not a positive number!`});
			return;
		}
	}

	if (req.query.offset != "" && req.query.offset != null) {
		offset = parseInt(req.query.offset)
		if (Number.isNaN(offset) || offset < 0) {
			res.status(400).json({message: `Received offset ${req.query.offset}, which is not a positive number!`});
			return;
		}
	}

	var entityId = parseInt(req.params.id)
	if (Number.isNaN(entityId) || entityId <= 0) {
		res.status(400).json({message: `Received entityId ${req.params.id}, which is not a positive number!`});
		return;
	}

	if (Object.keys(entityTypeMap).indexOf(req.params.type) == -1) {
		res.status(400).json({message: `Searching for type ${type} is prohibited.`});
		return;
	}

	if (req.query.order !== "asc" && req.query.order !== "desc") {
		res.status(400).json({message: `Received order ${req.query.order} which is not a valid order.`});
		return;
	}

	logger.debug(`Determined offset: ${offset}, and limit: ${limit}, and type ${req.params.type} and order ${req.query.order}...`);

	if (req.params.type === "bands" || req.params.type === "locations") {
		Processing.searchJamsTable(
			limit, 
			offset, 
			req.session.admin, 
			req.params.type, 
			entityId, 
			req.query.order,
			req.query.search, 
		function(err, result) {
			if (err) {
				logger.error(`[api entity search bands/locations] Error occurred searching; query string: ${JSON.stringify(req.query)}, params: ${JSON.stringify(req.params)}: ${JSON.stringify(err)}`);
				res.status(500).json({message: `Error occurred searching jams: ${err}`});
			} else {
				res.json(result);
			}
		})
	} else if (req.params.type === "musicians" || req.params.type === "staff" || req.params.type === "instruments" || req.params.type === "roles") {
		Processing.matchEntityToJams(
			limit, 
			offset, 
			req.session.admin, 
			req.params.type, 
			entityId, 
			req.query.order,
			req.query.search, 
		function(err, result) {
			if (err) {
				logger.error(`[api entity search musicians/staff] Error occurred searching; query string: ${JSON.stringify(req.query)}, params: ${JSON.stringify(req.params)}: ${JSON.stringify(err)}`);
				res.status(500).json({message: `Error occurred searching jams: ${err}`});
			} else {
				res.json(result);
			}
		})
	} else {
		res.status(400).json({message: `Searching for ${type} is prohibited!`});
	}
})

api.get('/api/entity/search/:type', function(req, res) {
	//add type checking and input query checking
	Processing.entityAutocomplete(req.params.type, req.query, function(err, list) {
		if (err) {
			logger.error(`Error occurred searching for ${type}s with query '${req.query.q}': ${err}`);
			res.status(500).json(err);
		} else {
			res.json(list);
		}
	})
})

api.get('/api/entity/:type/:id', function(req, res) {
	//add type checking
	//parseInt for id
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
	var limit = null, offset = null;

	if (req?.query?.limit) 	{
		logger.debug(`User passed a limit parameter: ${req.query.limit}`);
		limit = parseInt(req.query.limit)
		if (Number.isNaN(limit) || limit <= 0) {
			res.status(400).json({message: `Received limit ${req.query.limit}, which is not a positive number!`});
			return;
		}
	}

	if (req?.query?.offset) {
		logger.debug(`User passed an offset parameter: ${req.query.offset}`);
		offset = parseInt(req.query.offset)
		if (Number.isNaN(offset) || offset < 0) {
			res.status(400).json({message: `Received offset ${req.query.offset}, which is not a positive number or zero!`});
			return;
		}
	}
	
	logger.debug(`Determined offset: ${offset}, and limit: ${limit}`);

	Processing.searchJamsTable(
		limit, 
		offset, 
		req.session.admin, 
		null, 
		null, 
		req.query.order,
		req.query.search, 
	function(err, result) {
		if (err) {
			logger.error(`[apisearch] Error occurred searching; query string: ${JSON.stringify(req.query)}, params: ${JSON.stringify(req.params)}: ${JSON.stringify(err)}`);
		} else {
			res.json(result);
		}
	})
}) //get /api/search

api.get('/api/maplocations', function(req, res) {
	Processing.getGeoCordinates(function(err, result) {
		if (err) {
			res.status(500).json({message: err});
		} else {
			res.json(result);
		}
	});
})

api.get('/api/recent', function (req, res) {
	Processing.recentAndHistoricJams(false, req.session.admin, function(err, recentJams) {
		if (err) {
			logger.error(`Error loading recent jams for API: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(recentJams);
		}
	})
}) //get /api/recent

api.get('/api/history', function(req, res) {
	Processing.recentAndHistoricJams(true, req.session.admin, function(err, result) {
		if (err) {
			res.status(500).json({message: `Error when getting recent jams: ${err}`});
		} else {
			res.json(result);
		}
	})
}) //api/history

api.get('/api/playlist', function(req, res) {
	if (isNotSet(req.session)) {
		req.session = {};
	}
	if (isNotSet(req.session?.playlist)) {
		req.session.playlist = [];
	}
	res.json(req.session.playlist);
})

api.post('/api/playlist', function(req, res) {
	if (isNotSet(req.session?.playlist)) {
		req.session.playlist = [];
	}
	if (Array.isArray(req.body)) {
		req.session.playlist = req.session.playlist.concat(req.body);
		res.send(req.session.playlist);
	} else {
		logger.warn(`[api.playlist.post] Somebody tried to submit an improper playlist entry: ${JSON.stringify(req.body)}`);
		res.status(400).send(`Improperly formatted playlist entry`);
	}
})

api.delete('/api/playlist/:num', function(req, res) {
	var num = parseInt(req.params.num);
	if (Number.isNaN(num)) {
		res.status(400).send(`Could not delete playlist item ${req.params.num}`);
	} else {
		if (isNotSet(req.session.playlist)) {
			req.session.playlist = [];
		}
		req.session.playlist.splice(num, 1);
		res.json(req.session.playlist);
	}
})

module.exports = api
