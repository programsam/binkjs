const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")
const BINKS3 = require('./binks3.js');
const archiver = require('archiver');

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

api.get('/api/jam/:id/zip', function (req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jams must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam for zip downloads by a jamid that was not a number! They looked up: ${req.params.id}`);
		return;
	} else {
		Processing.getJamTracksOnly(jamid, function(err, tracks) {
			logger.debug(`Jam tracks: ${JSON.stringify(tracks)}`);
			if (tracks.length < 1) {
				res.status(404).json({"message":"No tracks to download for this jam!"});
			} else if (err) {
				logger.error(`Error when loading ZIP for jam ${jamid}: ${JSON.stringify(err)}`);
				res.status(400).json(err);
			} else {
				//We have a list of objects; let's go get 'em.
				//Initalize the archive
				const archive = archiver('zip', {
					zlib: { level: 9 } // Adjust compression level as needed
				});
				
				// Until we know what this is, let's just log warnings to the console
				archive.on('warning', (warning) => {
					if (err.code === 'ENOENT') {
						logger.warn(`Warning occurred while archiving files: ${warning}`);
					} else {
						throw err;
					}
				});

				// Handle archiving errors with an error message and HTTP status 500
				archive.on('error', (err) => {
					logger.error('Archiver error:', err);
					res.status(500).json({message: "There was an error while zipping up these files", error: err});
				});

				// When the object is done, end the request.
				archive.on('end', () => {
					logger.debug('Zip archive stream ended');
					res.end();
				});

				async.each(tracks, function(thistrack, trackcb) {
					var decodedTrackPath = decodeURIComponent(thistrack.path);
					var s3path = `public/${decodedTrackPath}`;
					var basepath = `public/snd/${jamid}/`;
					var nameinzip = s3path.replace(basepath, '');
					logger.debug(`Original database entry: ${thistrack.path}, Requesting from S3: ${s3path}, filename will be ${nameinzip}`);
					BINKS3.getObject(s3path, function(err, result) {
						if (err) {
							logger.debug(`Error getting the object: ${err}`);
							trackcb(err);
						} else {
							logger.debug(`Object ${s3path} exists in S3; streaming into ZIP with filename ${nameinzip}`);
							archive.append(result.Body, {name: nameinzip});
							trackcb();
						}
					}) //object gotten and appended
				}, function(err) {
					if (err) {
						res.status(500).json({message: `Error when retreiving a file!`, error: err});
					} else {
						logger.debug(`All files successfully downloaded and zipped; telling the browser to download a ZIP...`)
						//Letting the user's browser know that this is a zip files.
						res.set('content-type', 'application/zip');
						//Telling the user's browser that this is an attachment and should be treated so
						res.set('content-disposition', 'attachment; filename="binkfiles.zip"');
						//Sending the results of the completed archive to the user via pipes!
						logger.debug(`Sending the archive!`);
						archive.pipe(res);
						archive.finalize();
					} //else no error for async each
				})
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
