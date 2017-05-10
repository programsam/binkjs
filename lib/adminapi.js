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



module.exports = adminapi