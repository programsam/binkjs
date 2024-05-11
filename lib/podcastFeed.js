const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const async 		= require('async');
const packagejson 	= require('../package');
const makeLogger = require("./loggerFactory.js");
const Podcast 		= require('podcast').Podcast;

const logger = makeLogger(path.basename(__filename), settings.logLevel);
let podcastRoutes = express.Router()

podcastRoutes.use(bodyParser.json())

function deliverPodcast(req, res) {
	var podcastSettings = settings.podcast;
	podcastSettings.generator = `BINK.js v${packagejson.version}`;
	podcastSettings.pubDate = `${new Date()}`;

	var feed = new Podcast(podcastSettings);
	Processing.recentAndHistoricJams(false, null, function(processingerr, recentJams) {
		if (processingerr) {
			res.status(500).json({message: `Processing error when loading podcast jams: ${processingerr}`});
		} else {
			async.each(recentJams, function(thisjam, jamcb) {
				Processing.getJamTracks(thisjam, function(trackserr, tracks) {
					if (trackserr) {
						logger.error(`Error getting jam tracks for ${thisjam.id}: ${trackserr}`);
						jamcb(trackserr);
					} else {
						async.each(thisjam.tracks, function(thistrack, trackcb) {
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
	
							if (thisjam.hasOwnProperty("band") && thisjam.band.bandid !== -1) {
								item.author = thisjam.band.name;
							}
	
							if (thisjam.hasOwnProperty("location") && thisjam.location.lat && thisjam.location.lon) {
								item.lat = thisjam.location.lat;
								item.long = thisjam.location.lon;
							}
	
							item.content =
								`${thisjam.title}: #${thistrack.num} - ${thistrack.title}.  `;
	
							if (thisjam.hasOwnProperty("band") && thisjam.band.bandid !== -1) {
								item.content += `Performed by ${thisjam.band.name}. `;
							}
	
							if (thisjam.hasOwnProperty("location") && thisjam.location.locid !== -1) {
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
							trackcb();
						}, function(trackprocesserr) {
							jamcb();
						})
					}
				})
			}, function(jamerr) {
				if (jamerr) {
					logger.error(`Error when procesing jams: ${jamerr}`);
					res.status(500).json({message: `Error when processing jams: ${jamerr}`});
				} else {
					var result = feed.buildXml();
					res.header('Content-Type', 'text/xml');
					res.end(result);
				}
			})
		}
	})
}

podcastRoutes.get('/podcast.php', function(req, res) {
	logger.warn(`Something is still using old podcast.php URL!`);
	deliverPodcast(req, res);
})

podcastRoutes.get('/podcast', function(req, res) {
	deliverPodcast(req, res);
}) //get /podcast

module.exports = podcastRoutes;
