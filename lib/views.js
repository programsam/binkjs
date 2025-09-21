const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const async			= require('async');
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson 	= require('../package');
const v				= require('express-validator');

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

/**
 * The title of tracks that represent set breaks.
 */
const setBreakString = "--------------------";

var views = express.Router()

views.use(bodyParser.json())

const entityTypeMap = {
	musicians: "Musician",
	locations: "Location",
	instruments: "Instrument",
	staff: "Staff Member",
	bands: "Band",
	roles: "Role"
}

function handleValidationResults(req, res, cb) {
	const result = v.validationResult(req);
	if (! result.isEmpty()) {
		logger.warn(`Input validation error at ${req.method} ${req.path}: ${JSON.stringify(result)}`);
		res.status(400).end("Improper input!");
	} else {
		cb();
	}
}

function authenticated(req, res, next) {
	if (req.session.admin) {
		next();
	} else {
		res.status(401).send("Not allowed!");
	}
}

views.get('/views/entity/:type/:id',
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		type: { isIn: { options: [Object.keys(entityTypeMap)] } },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var entityId = parseInt(req.params.id);
		Processing.getEntity(req.params.type, entityId, function(err, result) {
			if (err) {
				res.status(500).json({message: `Error looking up ${req.params.type} with id ${req.params.id}: ${JSON.stringify(err)}`, error: err});
			} else {
				logger.debug(`Entity retrieved: ${JSON.stringify(result)}`);
				result.admin = req.session.admin;
				res.render('entity', result);
			} //else results came back ok
		}) //Processing.getEntity
	}) //handle validation
}) //GET /views/entity/:type/:id

views.get('/views/admin/entity/:type/:id', authenticated,
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		type: { isIn: { options: [Object.keys(entityTypeMap)] } },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var entityId = parseInt(req.params.id);
		Processing.getEntity(req.params.type, entityId, function(err, result) {
			if (err) {
				res.status(500).json({message: `Error looking up ${req.params.type} with id ${req.params.id}: ${JSON.stringify(err)}`, error: err});
			} else {
				logger.debug(`Entity retrieved: ${JSON.stringify(result)}`);
				result.admin = req.session.admin;
				res.render('admin/editEntity', result);
			} //else results came back
		}) //Processing.getEntity
	}) //handle validation
}) //GET /view/admin/entity/:type/:id

views.get('/views/infowindow/:id', v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var id = parseInt(req.params.id);
		Processing.getEntity('locations', id, function(err, result) {
			if (err) {
				logger.warn(`Error looking up info window: ${req.params.id}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.render('infowindow', result);
			} //else infowindow came back ok
		}) //Processing.getEntity
	}) //handle validation
}) // GET /views/infowindow/:id

views.get('/views/browse', function(req, res) {
	res.render('browse', {admin: req.session.admin});
})

views.get('/views/jam/:id', v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var jamid = parseInt(req.params.id);
		Processing.loadFullSingleJam(jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error loading jam ${jamid} for viewing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Rendering jam: ${JSON.stringify(thisjam)}`);
				res.render('jam', {jam: thisjam, admin: req.session.admin, setBreakString: setBreakString});
			} //jam rendered successfully
		}) //Processing.loadFullSingleJam
	}) //handle validation
}) //GET /views/jam/:id

views.get('/views/admin/dropzone/template', authenticated, function(req, res) {
	res.render('admin/dropzoneTemplate');
})


views.get('/views/admin/jam/:id/edit/musicians', authenticated, v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: parseInt(req.params.id)
		}
		Processing.getJamMusicians(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading musicians for jam ${thisjam.id} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Found musicians for jam ${thisjam.id}: ${JSON.stringify(thisjam.musicians)}`);;
				res.render('admin/jamEntities/musicians', {jam: thisjam, admin: req.session.admin});
			} //else rendered successfully
		}) //Processing.getJamMusicians
	}) //handle validation
}) //GET /views/admin/jam/:id/edit/musicians

views.get('/views/admin/jam/:id/edit/staff', authenticated, v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: parseInt(req.params.id)
		}
		Processing.getJamStaff(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading staff for jam ${thisjam.id} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Found staff for jam ${thisjam.id}: ${JSON.stringify(thisjam.staff)}`);;
				res.render('admin/jamEntities/staff', {jam: thisjam, admin: req.session.admin});
			} //results came back ok
		}) //Processing.getJamStaff
	}) //handle validation
}) //GET /views/admin/jam/:id/edit/staff

views.get('/views/admin/jam/edit/:id', v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var jamid = parseInt(req.params.id);
		Processing.loadFullSingleJam(jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error loading jam ${jamid} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.render('admin/editJam', {jam: thisjam, admin: req.session.admin});
			} //else jam came back ok
		}) //Processing.loadFullSingleJam
	}) //handle validation results
}) //GET /views/admin/jam/edit/:id

views.get('/views/admin/jam/:id/edit/pics', authenticated, v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: parseInt(req.params.id)
		}
		Processing.getJamPictures(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading pics for jam ${thisjam.id} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.render('admin/jamEntities/pictures', {thisjam: thisjam, admin: req.session.admin});
			}
		})
	}) //handle validation
}) //GET /views/admin/jam/:id/edit/pics

views.get('/', function(req, res) {
	res.render('index', {version: packagejson.version})
})

views.get('/views/admin/dropdown', function(req, res) {
	res.render('admin/dropdown', {})
})

views.get('/views/loginModal', function(req, res) {
	res.render('loginModal', {});
})

views.get('/views/admin/confirmModal', function(req, res) {
	res.render('admin/confirmModal', {});
})

views.get('/views/manage', function(req, res) {
	res.render('admin/manageEntities', {})
})

views.get('/views/playlist', function(req, res) {
	if (! req.session)
		req.session = {}
	if (! req.session.playlist) 
		req.session.playlist = []

	res.render('playlist', {playlist: req.session.playlist});
})

views.get('/views/history', function(req, res) {
	Processing.recentAndHistoricJams(true, req.session.admin, function(err, historicJams) {
		if (err) {
			logger.error(`Error occurred loading historic jams: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.render('recentAndHistory', {history: true, jams: historicJams, admin: req.session.admin});
		}
	})
})

views.get('/views/recent', function(req, res) {
	Processing.recentAndHistoricJams(false, req.session.admin, function(err, recentJams) {
		if (err) {
			logger.error(`Error occurred loading recent jams: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.render('recentAndHistory', {jams: recentJams, admin: req.session.admin});
		}
	})
})

module.exports = views;
