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
	let client = sql();
	let now = new Date();
	let todaysdate = now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate();
	Processing.getLastJamId(function(err, lastId) {
		if (err) {
			logger.error(`Error when determining last inserted jam id: ${err}`);
			res.status(500).json(err);
		} else {
			client.query("INSERT INTO `jams` (id,private,date,title,notes) VALUES (?,?,?,?,?)",
				[lastId+1, '1',todaysdate,'New Jam','Details about this jam'],
				function(err, result)
				{
					if (err) {
						res.status(500).send("Error while creating jam: " + JSON.stringify(err));
					}
					else {
						res.json({
							id: lastId + 1
						})
					}
			});
		}
	})
})

adminapi.put('/admin/jam/:id', authenticated, function(req, res) {
	logger.info(`Received updates to jam ${req.params.id}: ${JSON.stringify(req.body)}`);
	Processing.updateJam(req.params.id, req.body, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to update jam ${req.params.id}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		}
	})
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

adminapi.get('/test', function(req, res) {
	Processing.getLastJamId(function(err, id) {
		if (err) {
			res.status(500).json(err);
		} else {
			res.end(`Hallo: ${id}`);
		}
	})
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
