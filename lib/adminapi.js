var express 	= require('express')
var bodyParser 	= require('body-parser')
var mysql		= require('mysql');
var async		= require('async');
var settings	= require('../settings.json')
var Processing 	= require("./processing.js")

var adminapi = express.Router()

function sql() {
	return client = mysql.createClient(settings.mysql);
}

adminapi.put('/admin/login', function(req, res) {
	if (req.body.password == settings.admin_password)
	{
		res.send("OK")
	}
	else
	{
		res.send("NOPE")
	}
})

module.exports = adminapi