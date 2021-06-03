const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")
const async = require('async');
const packagejson = require('../package');
const Podcast = require('podcast');
const mysql		= require('mysql');

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let podcastRoutes = express.Router()

podcastRoutes.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

podcastRoutes.get('/podcast', function(req, res) {
	var feed = new Podcast(settings.podcast);
	feed.feedOptions.generator = `BINK.js ${packagejson.version}`;
	let client = sql();
	client.query("SELECT * FROM jams WHERE private = 0 ORDER BY date desc LIMIT 0, 20", function(sqlerr, jams) {
		client.end();
		if (sqlerr) {
			logger.error(`An error occurred populating podcast feed: ${JSON.stringify(sqlerr)}`);
			topcallback(sqlerr)
		} else {
			async.each(jams, function(thisjam, jamCallback) {
				async.parallel([
					function(cb) {
						Processing.getBand(thisjam, cb)
					},
					function(cb) {
						Processing.getLocation(thisjam, cb)
					},
					function(cb) {
						Processing.getDefPic(thisjam, cb)
					},
					function(cb) {
						Processing.getJamTracks(thisjam, cb)
					}
				], function(err, results) {
					async.each(thisjam.tracks, function(thistrack, trackCallback) {
						var item = {
							title: `${thisjam.title}: #${thistrack.num} - ${thistrack.title}`,
							description: `Jam Notes: ${thisjam.notes}`,
							date: thisjam.date,
							url: `https://binkmusic.com/#jam-${thisjam.id}`,
							guid: thistrack.id
						};

						if (thistrack.notes) {
							item.description += ` Jam Notes: "${thistrack.notes}"`
						}

						if (thisjam.band.bandid !== -1) {
							item.author = thisjam.band.name;
						}

						if (thisjam.location.lat && thisjam.location.lon) {
							item.lat = thisjam.location.lat;
							item.long = thisjam.location.lon;
						}

						item.content =
							`${thisjam.title}: #${thistrack.num} - ${thistrack.title}.  `;

						if (thisjam.band.bandid !== -1) {
							item.content += `Performed by ${thisjam.band.name}. `;
						}

						if (thisjam.location.locid !== -1) {
							item.content += `Located at ${thisjam.location.name}`;
						}

						if (thisjam.notes) {
							item.content += `Jam Notes: ${thisjam.notes}`;
						}

						if (thistrack.notes) {
							item.content += `Track Notes: ${thistrack.notes}`;
						}

						item.enclosure = {
							url: thistrack.path
						};

						feed.addItem(item);
						trackCallback();
					}, function(err, results) {
						jamCallback(err);
					})
				})
			}, function(overallErr) {
				if (overallErr) {
					res.status(500).json(err);
				} else {
					res.header('Content-Type', 'text/xml');
					var result = feed.buildXml();
					res.end(result);
				} //no error populating podcast from backend
			}) //foreach
		} //no SQL error
	}) //client.query
}) //get /podcast

module.exports = podcastRoutes;
