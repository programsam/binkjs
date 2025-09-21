const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const async			= require('async');
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const multer		= require('multer');

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

function isSet(field) {
	return (typeof field !== "undefined" && field !== null);
}

function isNotSet(field) {
	return (typeof field === "undefined" || field === null);
}

var adminapi = express.Router()

adminapi.use(bodyParser.json())

const entityTypeMap = {
	musicians: "Musician",
	locations: "Location",
	instruments: "Instrument",
	staff: "Staff Member",
	bands: "Band",
	roles: "Role"
}

//FILE UPLOAD

var upload = multer({
	dest: settings.tmpuploads
});

adminapi.post('/admin/jam/:id/files', upload.any(), function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid) || jamid <= 0) {
		res.status(400).json({message: `Jam ids must be a positive number; ${jamid} is not a positive number!`});
		logger.warn(`Someone tried to post files to a jam using an id that was not a number! They looked up the jam ID: ${jamid}`);
	} else {
		logger.debug(`${req.files.length} files being uploaded for jam #${jamid}...`);
		Processing.uploadFiles(jamid, req.files, function(err, result) {
			if (err) {
				logger.error(`[adminapi.files.21] Error uploading files to jam #${jamid}: ${JSON.stringify(err)}`)
				res.status(500).json({
					error: `Error uploading files to jam #${jamid}: ${JSON.stringify(err)}`,
					fullContext: err
				});
			} else {
				res.json(result);
			} //no errors, return the result of files.
		}) //processing.uploadfiles
	} //else correct jam number
}) //post /api/jam/:id/files

//JAM ACTIONS

adminapi.put('/admin/jam/:id', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid) || jamid <= 0) {
		res.status(400).json({message: `Jam ids must be a positive number; ${jamid} is not a positive number!`});
		logger.warn(`Someone tried to edit a jam by an id that was not a number! They looked up the jam ID: ${jamid}`);
	} else if (isNotSet(req.body)
			|| isNotSet(req.body.title)
			|| isNotSet(req.body.date)) {
		logger.warn(`Invalid request to edit jam #${jamid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The jam must include a title, date, and id.", body: req.body});
	} else {
		if (req.body.title.length === 0) {
			res.status(400).json({message: "Please provide a title for the jam!", body: req.body});
		} else {
			Processing.updateJam(jamid, req.body, function(err, result) {
				if (err) {
					logger.error(`An error occurred while someone tried to update jam ${req.params.id}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json(result);
				} //else no error updating the jam
			}) //processing.updateJam
		} //jam has title
	} //properly formatted request
})//put /admin/jam/id

adminapi.delete('/admin/jam/:id', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid) || jamid <= 0) {
		res.status(400).json({message: `Jam ids must be a positive number; ${jamid} is not a positive number!`});
		logger.warn(`Someone tried to delete a jam by an id that was not a number! They looked up the jam ID: ${jamid}`);
	} else {
		Processing.deleteJamEntry(req.params.id, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to delete jam ${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error when deleting
		}) //deleteJamEntry
	} //else proper input
}) //delete /admin/jam/:id

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
	var jamid = parseInt(req.params.id);
	if (Number.isNaN(jamid) || jamid <= 0) {
		res.status(400).json({message: `Jam ids must be a positive number; ${jamid} is not a positive number!`});
		logger.warn(`Someone tried to edit staff for a jam with id that was not a number! They looked up the jam ID: ${jamid}`);
	} else if (isNotSet(req.body?.staffid) || 
				isNotSet(req.body?.roleid) || 
				Number.isNaN(parseInt(req.body.staffid)) || parseInt(req.body.staffid) < 0 ||
				Number.isNaN(parseInt(req.body.roleid)) || parseInt(req.body.roleid) < 0) {
		logger.warn(`Someone tried to add a staff to jam ${jamid} with an incomplete or incorrect body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: `Staff entries must have a staff id and roleid that are both positive numbers`});
	} else {
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
			}) //addStaffToJam
	} //else body is good.
}) //post admin/jam/:id/staff

adminapi.delete('/admin/jam/:id/staff/:staffid/roles/:roleid', authenticated, function(req, res) {
	var jamid = parseInt(req.params.id);
	var staffid = parseInt(req.params.staffid);
	var roleid = parseInt(req.params.roleid);
	if (Number.isNaN(jamid) || jamid < 0 || 
		Number.isNaN(staffid) || staffid < 0 ||
		Number.isNaN(roleid) || roleid < 0) {
		logger.warn(`Someone tried to delete a staff and role without proper parameters: ${JSON.stringify(req.params)}`);
		res.status(400).json({message: `Deleting staff requires a positive id for jam, staff, and role!`});
	} else {
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
			} //else deletion went ok
		}) //removeStaffFromJam
	} //else the input is correct
}) //delete /admin/jam/:id/staff/:staffid/roles/:roleid

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

adminapi.post('/admin/jam/:jamid/tracks/setbreak', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	logger.debug(`An admin inserts a set break into the tracks for jam ${jamid}...`);
	Processing.addSetBreak(jamid, function(err, result) {
		if (err) {
			logger.error(`Error while admin tries to insert set break for jam ${jamid}: ${err}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error retrieving tracks
	}) //processing.getAdminJamTracks
}) //adminapi.get

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

adminapi.put('/admin/jam/:jamid/track/:trackid/up', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var trackid = parseInt(req.params.trackid);

	Processing.moveTrackOrVidUp("tracks", trackid, jamid, function(err, result) {
		if (err) {
			logger.error(`Error moving track id ${trackid} in jam ${jamid} up: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error updating the jam
	}) //processing.moveTrackOrVidUp
})

adminapi.put('/admin/jam/:jamid/track/:trackid/down', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var trackid = parseInt(req.params.trackid);

	Processing.moveTrackOrVidDown("tracks", trackid, jamid, function(err, result) {
		if (err) {
			logger.error(`Error moving track id ${trackid} in jam ${jamid} down: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error updating the jam
	}) //processing.moveTrackOrVidUp
})

adminapi.put('/admin/jam/:jamid/vid/:vidid/up', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var vidid = parseInt(req.params.vidid);

	Processing.moveTrackOrVidUp("video", vidid, jamid, function(err, result) {
		if (err) {
			logger.error(`Error moving vid id ${vidid} in jam ${jamid} up: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error updating the jam
	}) //processing.moveTrackOrVidUp
})

adminapi.put('/admin/jam/:jamid/vid/:vidid/down', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var vidid = parseInt(req.params.vidid);

	Processing.moveTrackOrVidDown("video", vidid, jamid, function(err, result) {
		if (err) {
			logger.error(`Error moving vid id ${trackid} in jam ${jamid} down: ${JSON.stringify(err)}`);
			res.status(500).json(err);
		} else {
			res.json(result);
		} //else no error updating the jam
	}) //processing.moveTrackOrVidDown
})

adminapi.put('/admin/jam/:jamid/track/:trackid', authenticated, function(req, res) {
	var jamid = parseInt(req.params.jamid);
	var trackid = parseInt(req.params.trackid);

	if (isNotSet(req.body)
			|| isNotSet(req.body.title)) {
		logger.warn(`Invalid request to edit jam #${jamid} track ${trackid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The track must include a title.", body: req.body});
	} else {

		var trackToUpdate = {
			jamid: jamid,
			trackid: trackid,
			title: req.body.title,
			notes: ""
		}

		if (isSet(req.body.notes) && req.body.notes !== "") {
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

	if (isNotSet(req.body)
			|| isNotSet(req.body.defpic)) {
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

	if (isNotSet(req.body)
			|| isNotSet(req.body.title)) {
		logger.warn(`Invalid request to edit jam #${jamid} video ${vidid}, body: ${JSON.stringify(req.body)}`);
		res.status(400).json({message: "The video must include a title.", body: req.body});
	} else {

		var vidToUpdate = {
			jamid: jamid,
			vidid: vidid,
			title: req.body.title,
			notes: ""
		}

		if (isSet(req.body.notes) && req.body.notes !== "") {
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

	Processing.deleteVideo(vidToRemove, function(err, result) {
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

	if (isSet(lookups[req.params.type])) {
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

adminapi.get('/admin/entities/search', authenticated, function(req, res) {
	if (isNotSet(req.query.limit)) {
		logger.warn(`[adminapi.entities.search] An admin searched all entities without any parameters!`);
		res.status(400).json({message: `Please pass some type of search parameters.`});
	} else { //it has query parameters of some kind.
		logger.debug(`Search query object: ${JSON.stringify(req.query)}`);
		Processing.searchAllEntities(req.query, function(err, entities) {
			if (err) {
				logger.error(`Error occurred searching all entities; query was ${JSON.stringify(req.query)}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(entities);
			}
		})
	} //end params of some kind
})

adminapi.delete('/admin/entity/:type/:id', authenticated, function(req, res) {
	logger.debug(JSON.stringify(req.params));
	if (Object.keys(entityTypeMap).indexOf(req.params.type) == -1) {
		logger.warn(`[adminapi.delete.entity] Somebody tried to delete an unsupported entity type: ${req.params.type}`)
		res.status(400).end({message: `${req.params.type} is not a legal BINK type.`});
	} else if (Number.isNaN(parseInt(req.params.id)) || parseInt(req.params.id) < 0) {
		logger.warn(`[adminapi.delete.entity] Someone tried to delete a ${req.params.type} with invalid id ${req.params.id}`);
		res.status(400).end({message: `${req.params.id} is an invalid ID; IDs are positive integers!`});
	} else {
		Processing.deleteEntity(req.params.type, req.params.id, function(err, result) {
			if (err) {
				logger.error(`Error deleting ${req.params.type} #${req.params.id}: ${err}`);
				res.status(500).json()
			} else {
				res.status(201).json({message: `${req.params.type} #${req.params.id} was successfully deleted`, result: result});
			}
		});
	}
})

adminapi.post('/admin/entity/:type', authenticated, function(req, res) {
	if (Object.keys(entityTypeMap).indexOf(req.params.type) == -1) {
		logger.warn(`Somebody tried to create an unsupported entity type: ${req.params.type}`)
		res.status(400).send(`${req.params.type} is not a legal BINK type.`);
	} else if (! req.body || ! req.body.name) {
		logger.warn(`Someone tried to create a ${req.params.type} without a name!`);
		res.status(400).send(`Things of type ${req.params.type} must have a name!`);
	} else {
		Processing.createEntity(req.params.type, req.body.name, function(err, entity) {
			if (err) {
				logger.error(`Error occurred creating ${req.params.type} #${req.body.name}: ${err}`);
				res.status(500).send(err);
			} else {
				res.json(entity);
			}
		})
	}
})

adminapi.put('/admin/entity/:type', authenticated, function(req, res) {
	if (Object.keys(entityTypeMap).indexOf(req.params.type) == -1) {
		logger.warn(`Somebody tried to update an unsupported entity type: ${type}`)
		res.status(400).end({message: `${type} is not a legal BINK type.`});
	} else if (! req.body || ! req.body.name || ! req.body.id) {
		logger.warn(`Someone tried to update a ${type} without a name or id...`);
		res.status(400).json({message: `${type} must have a name and id!`})
	} else if (Number.isNaN(parseInt(req.body.id)) || parseInt(req.body.id) <= 0) {
		logger.warn(`Someone tried to edit a ${type} with an id that was not a positive integer: ${req.body.id}`);
	}
	else {
		Processing.editEntity(req.params.type, req.body, function(err, result) {
			if (err) {
				logger.error(`Error occurred editing ${req.params.type} #${req.body.id}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
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