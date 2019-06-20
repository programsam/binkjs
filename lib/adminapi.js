const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename));

let adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
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

adminapi.post('/admin/login', function(req, res) {
	if (req.body.password == settings.admin_password)
	{
		req.session.admin = true
		res.send(JSON.stringify({valid: true}));
	}
	else
	{
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
