const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

function authenticated(req, res, next) {
	logger.debug(`Checking authentication; session: ${JSON.stringify(req.session)}`);
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}

adminapi.post('/admin/login', function(req, res) {
	if (req.body.password === settings.admin_password)
	{
		logger.verbose(`Successful authentication; settings session admin variable.`);
		req.session.admin = true
		res.send(JSON.stringify({valid: true}));
	}
	else
	{
		logger.warn(`Invalid authentication attempt!`);
		res.send(JSON.stringify({valid: false}));
	}
})

adminapi.put('/admin/logout', function(req, res) {
	req.session.destroy(function(err) {
		if (err)
			res.status(500).send("Error while logging out: " + JSON.stringify(err));
		else {
			res.json({status: "OK"});
		}
	})
})

adminapi.post('/admin/jam', authenticated, function(req, res) {
	Processing.createJam(function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to create a new jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		}
	})
})

//STAFF ACTIONS
adminapi.post('/admin/jam/:id/staff', authenticated, function(req, res) {
	var staffObject = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.body.staffid),
		roleid: parseInt(req.body.roleid)
	}
	Processing.addStaffToJam(staffObject, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to add a staff to a jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})
})

adminapi.delete('/admin/jam/:id/staff/:staffid/roles/:roleid', authenticated, function(req, res) {

	var staffObjectToRemove = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.params.staffid),
		roleid: parseInt(req.params.roleid)
	}

	Processing.removeStaffFromJam(staffObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete a staff from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.delete('/admin/jam/:id/staff/:staffid/all', authenticated, function(req, res) {

	var staffObjectToRemove = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.params.staffid)
	}

	Processing.removeStaffEntirely(staffObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete all roles for a staff from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

//MUSICIAN ACTIONS
adminapi.post('/admin/jam/:id/musicians', authenticated, function(req, res) {
	var musicianObject = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.body.musicianid),
		instrumentid: parseInt(req.body.instrumentid)
	}
	Processing.addMusicianToJam(musicianObject, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to add a musician to a jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})
})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/instruments/:instrumentid', authenticated, function(req, res) {

	var musicianObjectToRemove = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.params.musicianid),
		instrumentid: parseInt(req.params.instrumentid)
	}

	Processing.removeMusicianFromJam(musicianObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete a musician from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/all', authenticated, function(req, res) {

	var musicianObjectToRemove = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.params.musicianid)
	}

	Processing.removeMusicianEntirely(musicianObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete all instruments for a musician from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.put('/admin/jam/:id', authenticated, function(req, res) {
	if (! req.body || ! req.body.title || ! req.body.date) {
		logger.debug(`Someone tried to create a jam that did not have the required components!`)
		res.status(400).json({message: "The jam must include a title, date, and id."});
	} else {
		Processing.updateJam(req.params.id, req.body, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to update jam ${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			}
		})
	}
})

adminapi.delete('/admin/jam/:id', authenticated, function(req, res) {
	Processing.deleteJamEntry(req.params.id, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete jam ${req.params.id}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		}
	})
})

adminapi.post('/admin/entity/:type', authenticated, function(req, res) {
	if (! req.body || ! req.body.name) {
		res.status(400).json({message: `Things of this type must have a name!`})
	} else {
		Processing.createEntity(req.params.type, req.body.name, function(err, entity) {
			if (err) {
				logger.error(`Error occurred creating ${type} #${req.body.name}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(entity);
			}
		})
	}
})

adminapi.get('/admin/loggedin', function(req, res) {
	if (req.session && req.session.admin)
	{
		res.json(req.session);
	}
	else
	{
		res.json(req.session);
	}
})

module.exports = adminapi
