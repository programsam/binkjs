const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

//JAM ACTIONS

adminapi.put('/admin/jam/:id', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (! req.body
			|| ! req.body.hasOwnProperty('title')
			|| ! req.body.hasOwnProperty('date')) {
		logger.warn(`Invalid request to edit jam #${jamid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The jam must include a title, date, and id.", body: req.body});
	} else {
		Processing.updateJam(jamid, req.body, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to update jam ${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateJam
	} //properly formatted request
})//put /admin/jam/id

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

//STAFF ACTIONS
adminapi.post('/admin/jam/:id/staff', authenticated, function(req, res) {
	var staffObject = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.body.staffid),
		roleid: parseInt(req.body.roleid)
	}
	Processing.addStaffToJam(staffObject, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to add a staff to a jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})
})

adminapi.delete('/admin/jam/:id/staff/:staffid/roles/:roleid', authenticated, function(req, res) {

	var staffObjectToRemove = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.params.staffid),
		roleid: parseInt(req.params.roleid)
	}

	Processing.removeStaffFromJam(staffObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete a staff from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.post('/admin/jam/:id/stripTrackNumbers', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id)
	Processing.stripTrackNumbers(jamid, function(err) {
		if (err) {
			logger.error(`An error occurred while someone tried to strip track numbers for jam ${jamid}: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json({message: 'OK'});
		}
	})
})

adminapi.delete('/admin/jam/:id/staff/:staffid/all', authenticated, function(req, res) {

	var staffObjectToRemove = {
		jamid: parseInt(req.params.id),
		staffid: parseInt(req.params.staffid)
	}

	Processing.removeStaffEntirely(staffObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete all roles for a staff from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

//MUSICIAN ACTIONS
adminapi.post('/admin/jam/:id/musicians', authenticated, function(req, res) {
	var musicianObject = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.body.musicianid),
		instrumentid: parseInt(req.body.instrumentid)
	}
	Processing.addMusicianToJam(musicianObject, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to add a musician to a jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})
})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/instruments/:instrumentid', authenticated, function(req, res) {

	var musicianObjectToRemove = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.params.musicianid),
		instrumentid: parseInt(req.params.instrumentid)
	}

	Processing.removeMusicianFromJam(musicianObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete a musician from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/all', authenticated, function(req, res) {

	var musicianObjectToRemove = {
		jamid: parseInt(req.params.id),
		musicianid: parseInt(req.params.musicianid)
	}

	Processing.removeMusicianEntirely(musicianObjectToRemove, function(err, result) {
		if (err) {
			logger.error(`An error occurred while someone tried to delete all instruments for a musician from this jam: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

//TRACK ACTIONS

adminapi.get('/admin/jam/:jamid/tracks', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	logger.debug(`An admin requests tracks for jam ${jamid}...`);
	Processing.getAdminJamTracks(jamid, function(err, result) {
		if (err) {
			logger.error(`Error while admin tries to get tracks for jam ${jamid}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error retrieving tracks
	}) //processing.getAdminJamTracks
}) //adminapi.get

adminapi.delete('/admin/jam/:jamid/tracks/:trackid', authenticated, function(req, res) {

	var trackToRemove = {
		jamid: parseInt(req.params.jamid),
		trackid: parseInt(req.params.trackid)
	}

	Processing.removeTrack(trackToRemove, function(err, result) {
		if (err) {
			logger.error(`Error deleting track ${req.params.trackid} from jam ${req.params.jamid}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

adminapi.put('/admin/jam/:jamid/track/:trackid', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var trackid = parseInt(req.params.trackid);

	if (! req.body
			|| ! req.body.hasOwnProperty('title')) {
		logger.warn(`Invalid request to edit jam #${jamid} track ${trackid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The track must include a title.", body: req.body});
	} else {

		var trackToUpdate = {
			jamid: jamid,
			trackid: trackid,
			title: req.body.title,
			notes: ""
		}

		if (req.body.hasOwnProperty('notes') && req.body.notes !== "") {
			trackToUpdate.notes = req.body.notes;
		}

		Processing.updateTrack(trackToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating jam ${jamid}, track ${trackid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	} //properly formatted request
})//put /admin/jam/id

//PIC ACTIONS
adminapi.delete('/admin/jam/:jamid/pic/:picid', authenticated, function (req, res) {

	var jamid = parseInt(req.params.jamid);
	var picid = parseInt(req.params.picid);

	var picToDelete = {
		jamid: jamid,
		picid: picid
	}

	Processing.deletePic(picToDelete, function(err, result) {
		if (err) {
			logger.error(`Error deleting pic ${picid}, jam ${jamid}: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error deleting the picture
	}) //processing.deletePic
}) //delete jamid/pics/picid

adminapi.put('/admin/jam/:jamid/defpic', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);

	if (! req.body
			|| ! req.body.hasOwnProperty('defpic')) {
		logger.warn(`Invalid request to edit jam #${jamid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The request must include a default picture named 'defpic'.", body: req.body});
	} else {

		var jamToUpdate = {
			jamid: jamid,
			defpic: parseInt(req.body.defpic)
		}

		Processing.setJamDefPic(jamToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating jam ${jamid} with default pic ${jamToUpdate.defpic}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	} //properly formatted request
})//put /admin/jam/id

//VIDS ACTIONS

adminapi.get('/admin/jam/:jamid/vids', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	logger.debug(`An admin requests videos for jam ${jamid}...`);
	Processing.getAdminJamVideos(jamid, function(err, result) {
		if (err) {
			logger.error(`Error while admin tries to get videos for jam ${jamid}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error retrieving tracks
	}) //processing.getAdminJamTracks
}) //adminapi.get

adminapi.put('/admin/jam/:jamid/vid/:vidid', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var vidid = parseInt(req.params.vidid);

	if (! req.body
			|| ! req.body.hasOwnProperty('title')) {
		logger.warn(`Invalid request to edit jam #${jamid} video ${vidid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The video must include a title.", body: req.body});
	} else {

		var vidToUpdate = {
			jamid: jamid,
			vidid: vidid,
			title: req.body.title,
			notes: ""
		}

		if (req.body.hasOwnProperty('notes') && req.body.notes !== "") {
			vidToUpdate.notes = req.body.notes;
		}

		Processing.updateVid(vidToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating jam ${jamid}, video ${vidid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	} //properly formatted request
})//put /admin/jam/id

adminapi.delete('/admin/jam/:jamid/vid/:vidid', authenticated, function(req, res) {

	var vidToRemove = {
		jamid: parseInt(req.params.jamid),
		vidid: parseInt(req.params.vidid)
	}

	Processing.removeVideo(vidToRemove, function(err, result) {
		if (err) {
			logger.error(`Error deleting video ${req.params.vidid} from jam ${req.params.jamid}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json({message: "OK"});
		}
	})

})

//CROSS TYPE ACTIONS

adminapi.post('/admin/jam/:id/sync/:type', authenticated, function(req, res) {

	var jamid = parseInt(req.params.id);

	var lookups = {
		pics: {
			tableName: "pictures",
			s3Path: "pics"
		},
		tracks: {
			tableName: "tracks",
			s3Path: "snd"
		},
		vids: {
			tableName: "video",
			s3Path: "video"
		}
	}

	if (lookups.hasOwnProperty(req.params.type)) {
		var whatToSync = {
			jamid: jamid,
			tableName: lookups[req.params.type].tableName,
			s3Path: lookups[req.params.type].s3Path
		}

		logger.debug(`Synchronizing ${req.params.type} for jam #${jamid}...`);
		logger.debug(`The table is named: ${whatToSync.tableName}, and the s3 prefix is ${whatToSync.s3Path}`);

		Processing.syncMedia(whatToSync, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to sync ${req.params.type} for jam ${req.params.id}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			}
		})
	} else {
		logger.warn(`Somebody tried to sync ${req.params.type} for jam ${req.params.id} -- we don't do this.`);
		res.status(400).json({message: `We do not know how to sync: ${req.params.type} for jam ${req.params.id}`});
	}
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

// AUTHENTICATION ENDPOINTS
adminapi.post('/admin/login', function(req, res) {
	if (req.body.password === settings.admin_password)
	{
		logger.verbose(`Successful authentication; settings session admin variable.`);
		req.session.admin = true
		res.send(JSON.stringify({valid: true}));
	}
	else
	{
		logger.warn(`Invalid authentication attempt!`);
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

function authenticated(req, res, next) {
	logger.debug(`Checking authentication; session: ${JSON.stringify(req.session)}`);
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}

module.exports = adminapi
