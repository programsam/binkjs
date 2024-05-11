const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const async			= require('async');
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson 	= require('../package');

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let views = express.Router()

views.use(bodyParser.json())

const entityTypeMap = {
	musicians: "Musician",
	locations: "Location",
	instruments: "Instrument",
	staff: "Staff Member",
	bands: "Band",
	roles: "Role"
}

function authenticated(req, res, next) {
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}

views.get('/views/entity/:type/:id', function(req, res) {
	var entityId = parseInt(req.params.id);
	if (Object.keys(entityTypeMap).indexOf(req.params.type) == -1) {
		logger.warn(`Somebody tried to look up an unsupported entity type: ${req.params.type}`)
		res.status(400).json({message: `${req.params.type} is not a valid BINK type!`});
	} else if (Number.isNaN(entityId) || entityId <= 0) {
		res.status(400).json({message: "Jam locations must by looked up by id; id must be a positive number!"});
		logger.warn(`Someone tried to lookup a location by an id that was not a number! They looked up the location ID: ${req.params.id}`);
	} else {
		Processing.getEntity(req.params.type, entityId, function(err, result) {
			if (err) {
				res.status(500).json({message: `Error looking up ${req.params.type} with id ${req.params.id}: ${JSON.stringify(err)}`, error: err});
			} else {
				logger.debug(`Entity retrieved: ${JSON.stringify(result)}`);
				res.render('entity', result);
			}
		})
	}
})

views.get('/views/infowindow/:id', function(req, res) {
	var id = parseInt(req.params.id);
	if (Number.isNaN(id)) {
		res.status(400).json({message: "Jam locations must by looked up by id; id must be a number!"});
		logger.warn(`Someone tried to lookup a location by an id that was not a number! They looked up the location ID: ${req.params.id}`);
		return;
	} else {
		Processing.getEntity('locations', id, function(err, result) {
			if (err) {
				res.status(500).json({message:"Error looking up location for infowindow with id ${id}: ${err}"})
			} else {
				res.render('infowindow', result);
			}
		})
	}
})

views.get('/views/browse', function(req, res) {
	res.render('browse', {admin: req.session.admin});
})

views.get('/views/jam/:id', function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam locations must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's location by a jamid that was not a number! They looked up the location for jam ID: ${req.params.id}`);
		return;
	} else {
		Processing.loadFullSingleJam(jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error loading jam ${jamid} for viewing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.render('jam', {jam: thisjam, admin: req.session.admin});
			}
		})
	}	
})

views.get('/views/admin/dropzone/template', authenticated, function(req, res) {
	res.render('admin/dropzoneTemplate');
})


views.get('/views/admin/jam/:id/edit/musicians', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam musicians must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's musicians by a jamid that was not a number! They looked up the musicians for jam ID: ${req.params.id}`);
		return;
	} else {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: jamid
		}
		Processing.getJamMusicians(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading musicians for jam ${jamid} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Found musicians for jam ${jamid}: ${JSON.stringify(thisjam.musicians)}`);;
				res.render('admin/jamEntities/musicians', {jam: thisjam, admin: req.session.admin});
			}
		})
	}	
})

views.get('/views/admin/jam/:id/edit/staff', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam staff must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's staff by a jamid that was not a number! They looked up the staff for jam ID: ${req.params.id}`);
		return;
	} else {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: jamid
		}
		Processing.getJamStaff(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading staff for jam ${jamid} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Found staff for jam ${jamid}: ${JSON.stringify(thisjam.staff)}`);;
				res.render('admin/jamEntities/staff', {jam: thisjam, admin: req.session.admin});
			}
		})
	}	
})

views.get('/views/admin/jam/edit/:id', function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jams must by looked up by id; id must be a number!"});
		logger.warn(`Someone tried to lookup a jam by a jamid that was not a number! They looked jam ID: ${req.params.id}`);
		return;
	} else {
		Processing.loadFullSingleJam(jamid, req.session.admin, function(err, thisjam) {
			if (err) {
				logger.error(`Error loading jam ${jamid} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.render('admin/editJam', {jam: thisjam, admin: req.session.admin});
			}
		})
	}	
})

views.get('/views/admin/jam/:id/edit/pics', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid)) {
		res.status(400).json({message: "Jam pics must by looked up by jam id; jam id must be a number!"});
		logger.warn(`Someone tried to lookup a jam's pics by a jamid that was not a number! They looked up the pics for jam ID: ${req.params.id}`);
		return;
	} else {
		// to reuse the processing methods for populating a jam,
		// we create a stubbed out jam that just has its ID and pass that.
		var thisjam = {
			id: jamid
		}
		Processing.getJamPictures(thisjam, function(err) {
			if (err) {
				logger.error(`Error loading pics for jam ${jamid} for editing: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				logger.debug(`Found pics for jam ${jamid}: ${JSON.stringify(thisjam)}; doing defpic...`);
				res.render('admin/jamEntities/pictures', {thisjam: thisjam, admin: req.session.admin});
			}
		})
	}	
})

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

views.get('/views/history', function(req, res) {
	Processing.recentAndHistoricJams(true, req.session.admin, function(err, historicJams) {
		if (err) {
			logger.error(`Error occurred loading historic jams: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.render('recentAndHistory', {jams: historicJams, admin: req.session.admin});
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
