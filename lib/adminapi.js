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
		res.send(JSON.stringify({valid: true}));
	}
	else
	{
		res.send(JSON.stringify({valid: false}));
	}
})

module.exports = adminapi