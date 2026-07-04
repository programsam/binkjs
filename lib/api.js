const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const async			= require('async');
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const BINKS3 		= require('./binks3.js');
const Archiver 		= require('archiver').Archiver;
const v				= require('express-validator')


function isNotSet(field) {
	return (typeof field === "undefined" || field === null);
}

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

function handleValidationResults(req, res, cb) {
	const result = v.validationResult(req);
	if (! result.isEmpty()) {
		logger.warn(`Input validation error at ${req.method} ${req.path}: ${JSON.stringify(result)}`);
		res.status(400).json({message: "Improper input!"});
	} else {
		cb();
	}
}

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

api.get('/api/jam/:jamid', 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.loadFullSingleJam(req.params.jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error when loading jam ${req.params.jamid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(thisjam)
			} //jam successfully retrieved
		}) //Processing.loadFullSingleJam
	}) //proper validation
}) //GET /api/jam/:id

api.get('/api/jam/:jamid/zip', 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.getJamTracksOnly(req.params.jamid, function(err, tracks) {
			logger.debug(`Jam tracks: ${JSON.stringify(tracks)}`);
			if (tracks.length < 1) {
				res.status(404).json({"message":"No tracks to download for this jam!"});
			} else if (err) {
				logger.error(`Error when loading ZIP for jam ${req.params.jamid}: ${JSON.stringify(err)}`);
				res.status(400).json(err);
			} else {
				//We have a list of objects; let's go get 'em.
				//Initalize the archive
				const archive = new Archiver('zip', {
					zlib: { level: 9 } // Adjust compression level as needed
				});
				
				// Until we know what this is, let's just log warnings to the console
				archive.on('warning', (warning) => {
					if (warning.code === 'ENOENT') {
						logger.warn(`Warning occurred while archiving files: ${warning}`);
					} else {
						throw warning;
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
					var basepath = `public/snd/${req.params.jamid}/`;
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
				}) //iterate each track
			} //list of objects block
		})//Processing.getJamTracksOnly
	}) //proper validation
}) // GET /api/jam/:id/zip


//req.query.limit, req.query.offset, req.params.id, req.params.type, req.query.order
api.get('/api/entity/:type/:id/search',
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		limit: { optional: true, isInt: { options: { gt: 0 }} },
		offset: { optional: true, isInt: { options: { gt: -1 }} },
		order: { optional: true, isIn: { options: [['asc', 'desc']]} },
		type: { optional: true, isIn: { options: [Object.keys(entityTypeMap)] } },
		search: { optional: { options: { values: 'falsy' } }, isAscii: { } }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		logger.debug(`type: ${req.params.type}, offset: ${req.query.offset}, limit: ${req.query.limit}, order ${req.query.order}, search: ${req.query.search}`);
		var offset, limit, order;
		if (isNotSet(req.query.offset)) {
			logger.debug(`Offset was not set; using default of 0`);
			offset = 0;
		} else {
			logger.debug(`Offset is set to ${req.query.offset}`);
			offset = parseInt(req.query.offset);
		}

		if (isNotSet(req.query.limit)) {
			logger.debug(`Limit was not set; using default of 0`);
			limit = 10;
		} else {
			logger.debug(`Offset is set to ${req.query.limit}`);
			limit = parseInt(req.query.limit);
		}

		if (isNotSet(req.query.order)) {
			logger.debug(`Order was not set; using default of asc`);
			order = "asc";
		} else {
			logger.debug(`Order was set to ${req.query.order}`);
			order = req.query.order;
		}

		if (req.params.type === "bands" || req.params.type === "locations") {
			Processing.searchJamsTable(
				limit,
				offset,
				req.session.admin, 
				req.params.type, 
				parseInt(req.params.id), 
				order,
				req.query.search, 
			function(err, result) {
				if (err) {
					logger.error(`[api entity search bands/locations] Error occurred searching; query string: ${JSON.stringify(req.query)}, params: ${JSON.stringify(req.params)}: ${JSON.stringify(err)}`);
					res.status(500).json({message: `Error occurred searching jams: ${err}`});
				} else {
					res.json(result);
				} //no error search jams table
			}) //processing.searchJamsTable
		} else if (req.params.type === "musicians" || req.params.type === "staff" || req.params.type === "instruments" || req.params.type === "roles") {
			Processing.matchEntityToJams(
				limit,
				offset,
				req.session.admin, 
				req.params.type, 
				parseInt(req.params.id),
				order,
				req.query.search, 
			function(err, result) {
				if (err) {
					logger.error(`[api entity search musicians/staff] Error occurred searching; query string: ${JSON.stringify(req.query)}, params: ${JSON.stringify(req.params)}: ${JSON.stringify(err)}`);
					res.status(500).json({message: `Error occurred searching jams: ${err}`});
				} else {
					res.json(result);
				} //no error on matchEntityToJams
			}) //Processing.matchEntityToJams
		} //else it's match entity to jams
	}) //handle validation
}) //api/entity/:type/:id/search

api.get('/api/entity/search/:type',
	v.checkSchema({
		type: { isIn: { options: [Object.keys(entityTypeMap)] } },
		q: { optional: { options: { values: 'falsy' } }, isAscii: { } }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.entityAutocomplete(req.params.type, req.query, function(err, list) {
			if (err) {
				logger.error(`Error occurred searching for ${type}s with query '${req.query.q}': ${err}`);
				res.status(500).json(err);
			} else {
				res.json(list);
			} //else no problems w query
		}) //Processing.entityAutocomplete
	}) //handle validation
}) //GET /api/entity/search/:type

api.get('/api/entity/:type/:id',
	v.checkSchema({
		type: { isIn: { options: [Object.keys(entityTypeMap)] } },
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.getEntity(req.params.type, req.params.id, function(err, entity) {
			if (err) {
				logger.error(`Error occurred looking up ${req.params.type} #${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(entity);
			} //no issue grabbing the entity
		}) //Processing.getEntity
	}) //handle validation
}) //GET /api/entity/:type/:id

api.get('/api/search',
	v.checkSchema({
		limit: { optional: true, isInt: { options: { gt: 0 }} },
		offset: { optional: true, isInt: { options: { gt: -1 }} },
		order: { optional: true, isIn: { options: [['asc', 'desc']]} },
		search: { optional: { options: { values: 'falsy' } }, isAscii: { } }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var limit, offset, order;

		logger.debug(`type: ${req.params.type}, offset: ${req.query.offset}, limit: ${req.query.limit}, order ${req.query.order}, search: ${req.query.search}`);
		var offset, limit, order;
		if (isNotSet(req.query.offset)) {
			logger.debug(`Offset was not set; using default of 0`);
			offset = 0;
		} else {
			logger.debug(`Offset is set to ${req.query.offset}`);
			offset = parseInt(req.query.offset);
		}

		if (isNotSet(req.query.limit)) {
			logger.debug(`Limit was not set; using default of 0`);
			limit = 10;
		} else {
			logger.debug(`Offset is set to ${req.query.limit}`);
			limit = parseInt(req.query.limit);
		}

		if (isNotSet(req.query.order)) {
			logger.debug(`Order was not set; using default of asc`);
			order = "asc";
		} else {
			logger.debug(`Order was set to ${req.query.order}`);
			order = req.query.order;
		}

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
			} //no issues with data
		}) //Processing.searchJamsTable
	}) //handle validation results
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

api.post('/api/playlist',
	v.checkSchema({
		'': { in: ['body'], isArray: {} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		if (isNotSet(req.session?.playlist)) {
			req.session.playlist = [];
		}

		req.session.playlist = req.session.playlist.concat(req.body);
		res.send(req.session.playlist);
	}) //validation results
})

api.delete('/api/playlist/:num',
	v.checkSchema({
		num: { isInt: { options: { gt: -1 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var num = parseInt(req.params.num);
		if (isNotSet(req.session.playlist)) {
			req.session.playlist = [];
		}
		
		req.session.playlist.splice(num, 1);
		res.json(req.session.playlist);

	}) //validation results
})

module.exports = api
