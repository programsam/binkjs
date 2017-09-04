var express 	= require('express')
var bodyParser 	= require('body-parser')
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('../settings.json')
var Processing 	= require("./processing.js")

var adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
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
	req.session.destory(function(err) {
		if (err)
			res.status(500).send("Error while logging out: " + JSON.stringify(err));
		else {
			res.json({status: "OK"});
		}
	})
})

adminapi.get('/admin/loggedin', function(req, res) {
	if (req.session && req.session.admin && req.session.admin == true)
	{
		res.json({admin: true});
	}
	else
	{
		res.json({admin: false});
	}
})

module.exports = adminapi
