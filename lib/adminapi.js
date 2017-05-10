var express 	= require('express')
var bodyParser 	= require('body-parser')
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('../settings.json')
var Processing 	= require("./processing.js")

var adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createClient(settings.mysql);
}

adminapi.put('/admin/login', function(req, res) {
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
	req.session.admin = false;
	res.send("OK")
})

adminapi.get('/admin/loggedin', function(req, res) {
	if (req.session.admin && req.session.admin == true)
	{
		res.send(true);
	}
	else
	{
		res.send(false);
	}
})

module.exports = adminapi