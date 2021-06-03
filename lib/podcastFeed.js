const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson = require('../package');
const Podcast = require('podcast');

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let podcastRoutes = express.Router()

podcastRoutes.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

const feed = new Podcast(settings.podcast);

podcastRoutes.get('/podcast', function(req, res) {
	res.header('Content-Type', 'text/xml');
	res.end(feed.buildXml());
})

module.exports = podcastRoutes;
