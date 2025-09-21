const path 			= require('path');
const express 		= require('express')
const bodyParser 	= require('body-parser')
const async			= require('async');
const settings		= require('../settings.json')
const Processing 	= require("./processing.js")
const multer		= require('multer');
const v				= require('express-validator')

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

function handleValidationResults(req, res, cb) {
	const result = v.validationResult(req);
	if (! result.isEmpty()) {
		logger.warn(`Input validation error at ${req.method} ${req.path}: ${JSON.stringify(result)}`);
		res.status(400).json({message: "Improper input!"});
	} else {
		cb();
	}
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

const s3pathlookup = {
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

//FILE UPLOAD

var upload = multer({
	dest: settings.tmpuploads
});

adminapi.post('/admin/jam/:id/files', authenticated, upload.any(), 
	v.param('id', 'delete jam id must be positive integer').isInt({gt: 0}), 
	function(req, res) {
		handleValidationResults(req, res, function() {
			logger.debug(`${req.files.length} files being uploaded for jam #${req.params.id}...`);
			Processing.uploadFiles(req.params.id, req.files, function(err, result) {
				if (err) {
					logger.error(`[adminapi.files.21] Error uploading files to jam #${req.params.id}: ${JSON.stringify(err)}`)
					res.status(500).json({
						error: `Error uploading files to jam #${req.params.id}: ${JSON.stringify(err)}`,
						fullContext: err
					});
				} else {
					res.json(result);
				} //no errors, return the result of files.
			}) //processing.uploadfiles
		}) //handle validation results
}) //post /api/jam/:id/files

//JAM ACTIONS

adminapi.put('/admin/jam/:id', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		date: { isDate: { options: { format:"MM/DD/YYYY"}} } ,
		locid: { isInt: { options: { gt: -2 }} },
		bandid: { isInt: { options: { gt: -2 }} },
		title: { isAscii: {} },
		notes: { isAscii: {} },
		private: { isBoolean: {} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
			Processing.updateJam(req.params.id, req.body, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to update jam ${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateJam
	}) //handle validation
})//put /admin/jam/id

adminapi.delete('/admin/jam/:id', authenticated, 
	v.param('id', 'delete jam id must be positive integer').isInt({gt: 0}), 
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.deleteJamEntry(req.params.id, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to delete jam ${req.params.id}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error when deleting
		})
	})
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
adminapi.post('/admin/jam/:id/staff', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		staffid: { isInt: { options: { gt: 0 }} },
		roleid: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
			var staffObject = {
				jamid: parseInt(req.params.id),
				staffid: parseInt(req.body.staffid),
				roleid: parseInt(req.body.roleid)
			}
			Processing.addStaffToJam(staffObject, function(err, result) {
				if (err) {
					logger.error(`Error occurred while removing staff ${JSON.stringify(staffObject)}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json({message: "OK"});
				}
			}) //addStaffToJam
		}) //handle validation
}) //post admin/jam/:id/staff

adminapi.delete('/admin/jam/:id/staff/:staffid/roles/:roleid', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		staffid: { isInt: { options: { gt: 0 }} },
		roleid: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
			var staffObjectToRemove = {
				jamid: parseInt(req.params.id),
				staffid: parseInt(req.params.staffid),
				roleid: parseInt(req.params.roleid)
			}
			Processing.removeStaffFromJam(staffObjectToRemove, function(err, result) {
				if (err) {
					logger.error(`Error while trying to remove staff ${JSON.stringify(staffObjectToRemove)}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json({message: "OK"});
				} //else deletion went ok
			}) //removeStaffFromJam
		}) //handle validation results
}) //delete /admin/jam/:id/staff/:staffid/roles/:roleid

adminapi.post('/admin/jam/:id/stripTrackNumbers', authenticated, 
	v.param('id', 'strip track numbers jam id must be positive integer').isInt({gt: 0}), 
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.stripTrackNumbers(req.params.id, function(err) {
			if (err) {
				logger.error(`An error occurred while someone tried to strip track numbers for jam ${req.params.id}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json({message: 'OK'});
			}
		}) //stripTrackNumbers
	}) //input was valid
}) //post /admin/jam/:id/striptracknumbers

adminapi.delete('/admin/jam/:id/staff/:staffid/all', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		staffid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
			var staffObjectToRemove = {
				jamid: parseInt(req.params.id),
				staffid: parseInt(req.params.staffid)
			}
			Processing.removeStaffEntirely(staffObjectToRemove, function(err, result) {
				if (err) {
					logger.error(`Error occurred while trying to remove staff ${JSON.stringify(staffObjectToRemove)}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json({message: "OK"});
				}
			}) //removeStaffEntirely
	}) //input was correct
}) //delete /admin/jam/:id/staff/:staffid/all

//MUSICIAN ACTIONS
adminapi.post('/admin/jam/:id/musicians', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		musicianid: { isInt: { options: { gt: 0 }} },
		instrumentid: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
			var musicianObject = {
				jamid: parseInt(req.params.id),
				musicianid: parseInt(req.body.musicianid),
				instrumentid: parseInt(req.body.instrumentid)
			}
			Processing.addMusicianToJam(musicianObject, function(err, result) {
				if (err) {
					logger.error(`Error while trying to add musician: ${JSON.stringify(musicianObject)}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json({message: "OK"});
				}
			})
	}) // input was correct
})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/instruments/:instrumentid', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		musicianid: { isInt: { options: { gt: 0 }} },
		instrumentid: { isInt: { options: { gt: 0 }} },
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
		var musicianObjectToRemove = {
			jamid: parseInt(req.params.id),
			musicianid: parseInt(req.params.musicianid),
			instrumentid: parseInt(req.params.instrumentid)
		}
		Processing.removeMusicianFromJam(musicianObjectToRemove, function(err, result) {
			if (err) {
				logger.error(`Error when deleting musician ${JSON.stringify(musicianObjectToRemove)}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json({message: "OK"});
			}
		}) //db call
	}) //input was correct
})

adminapi.delete('/admin/jam/:id/musicians/:musicianid/all', authenticated, 
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		musicianid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
		var musicianObjectToRemove = {
			jamid: parseInt(req.params.id),
			musicianid: parseInt(req.params.musicianid)
		}
		Processing.removeMusicianEntirely(musicianObjectToRemove, function(err, result) {
			if (err) {
				logger.error(`An error occurred deleting musician ${JSON.stringify(musicianObjectToRemove)}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json({message: "OK"});
			}
		})
	}) //input was correct
})

//TRACK ACTIONS

adminapi.post('/admin/jam/:jamid/tracks/setbreak', authenticated, 
	v.param('jamid', 'insert setbreak jam id must be positive integer').isInt({gt: 0}), 
	function(req, res) {
		handleValidationResults(req, res, function() {
		Processing.addSetBreak(req.params.jamid, function(err, result) {
			if (err) {
				logger.error(`Error while admin tries to insert set break for jam ${req.params.jamid}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error retrieving tracks
		}) //processing.getAdminJamTracks
	}) //input was correct
}) //adminapi.get

adminapi.get('/admin/jam/:jamid/tracks', authenticated, 
	v.param('jamid', 'requesting tracks jam id must be positive integer').isInt({gt: 0}), 
	function(req, res) {
		handleValidationResults(req, res, function() {
		logger.debug(`An admin requests tracks for jam ${req.params.jamid}...`);
		Processing.getAdminJamTracks(req.params.jamid, function(err, result) {
			if (err) {
				logger.error(`Error while admin tries to get tracks for jam ${req.params.jamid}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error retrieving tracks
		}) //processing.getAdminJamTracks
	}) //input was correct
}) //adminapi.get

adminapi.delete('/admin/jam/:jamid/tracks/:trackid', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		trackid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {

		var trackToRemove = {
			jamid: parseInt(req.params.jamid),
			trackid: parseInt(req.params.trackid)
		}

		Processing.removeTrack(trackToRemove, function(err, result) {
			if (err) {
				logger.error(`Error deleting track ${JSON.stringify(trackToRemove)}: ${err}`);
				res.status(500).json(err);
			} else {
				res.json({message: "OK"});
			}
		})
	}) //input was correct
})

adminapi.put('/admin/jam/:jamid/:typeAsTable/:trackid/:upOrDown', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		trackid: { isInt: { options: { gt: 0 }} },
		typeAsTable: { isIn: { options: [['tracks', 'video']]}},
		upOrDown: { isIn: { options: [['up', 'down']] } }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
		Processing.swapTrackOrVid(req.params.typeAsTable, req.params.upOrDown, req.params.jamid, req.params.trackid, function(err, result) {
			if (err) {
				logger.error(`Error moving track id ${req.params.trackid} in jam ${req.params.jamid} down: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.moveTrackOrVidUp
	}) //input was correct
})

adminapi.put('/admin/jam/:jamid/track/:trackid', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		trackid: { isInt: { options: { gt: 0 }} },
		title: { isAscii: {} },
		notes: { optional: true, isAscii: {} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {

		var trackToUpdate = {
			jamid: req.params.jamid,
			trackid: req.params.trackid,
			title: req.body.title,
			notes: ""
		}

		if (req.body?.notes && req.body.notes !== "") {
			trackToUpdate.notes = req.body.notes;
		}

		Processing.updateTrack(trackToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating track ${JSON.stringify(trackToUpdate)}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	}) //input was correct
})//put /admin/jam/id

//PIC ACTIONS
adminapi.delete('/admin/jam/:jamid/pic/:picid', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		picid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {

		var picToDelete = {
			jamid: req.params.jamid,
			picid: req.params.picid
		}

		Processing.deletePic(picToDelete, function(err, result) {
			if (err) {
				logger.error(`Error deleting pic ${req.params.picid}, jam ${req.params.jamid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error deleting the picture
		}) //processing.deletePic
	}) //validation results
}) //delete jamid/pics/picid

adminapi.put('/admin/jam/:jamid/defpic', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		defpic: { isInt: { options: { gt: -2 }} },
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {

		var jamToUpdate = {
			jamid: req.params.jamid,
			defpic: req.body.defpic
		}

		Processing.setJamDefPic(jamToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating jam ${req.params.jamid} with default pic ${jamToUpdate.defpic}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	}) //handle validation results
})//put /admin/jam/id

//VIDS ACTIONS

adminapi.get('/admin/jam/:jamid/vids', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
		handleValidationResults(req, res, function() {
			Processing.getAdminJamVideos(req.params.jamid, function(err, result) {
				if (err) {
					logger.error(`Error while admin tries to get videos for jam ${req.params.jamid}: ${err}`);
					res.status(500).json(err);
				} else {
					res.json(result);
				} //else no error retrieving tracks
			}) //processing.getAdminJamTracks
	}) //validate parameters
}) //adminapi.get

adminapi.put('/admin/jam/:jamid/vid/:vidid', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		vidid: { isInt: { options: { gt: 0 }} },
		title: { isAscii: {} },
		notes: { optional: { options: { values: 'falsy' } }, isAscii: {} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var vidToUpdate = {
			jamid: req.params.jamid,
			vidid: req.params.vidid,
			title: req.body.title,
			notes: ""
		}

		if (req.body?.notes && req.body.notes !== "") {
			vidToUpdate.notes = req.body.notes;
		}

		Processing.updateVid(vidToUpdate, function(err, result) {
			if (err) {
				logger.error(`Error updating jam ${req.params.jamid}, video ${req.params.vidid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //else no error updating the jam
		}) //processing.updateTrack
	}) //properly formatted request
})//put /admin/jam/id

adminapi.delete('/admin/jam/:jamid/vid/:vidid', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		vidid: { isInt: { options: { gt: 0 }} }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
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
			} //video deleted successfully
		}) //processing.deleteVideo
	}) //passed validation
}) //DELETE /admin/jam/vid/vidid

//CROSS TYPE ACTIONS

adminapi.post('/admin/jam/:jamid/sync/:type', authenticated, 
	v.checkSchema({
		jamid: { isInt: { options: { gt: 0 }} },
		type: { isIn: { options: [Object.keys(s3pathlookup)]}},
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		var whatToSync = {
			jamid: req.params.jamid,
			tableName: s3pathlookup[req.params.type].tableName,
			s3Path: s3pathlookup[req.params.type].s3Path
		}

		logger.debug(`Synchronizing ${req.params.type} for jam #${req.params.jamid}...`);
		logger.debug(`The table is named: ${whatToSync.tableName}, and the s3 prefix is ${whatToSync.s3Path}`);

		Processing.syncMedia(whatToSync, function(err, result) {
			if (err) {
				logger.error(`An error occurred while someone tried to sync ${req.params.type} for jam ${req.params.jamid}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			}
		}) //Processing.syncMedia
	}) //input is proper
}) //POST /admin/jam/id/sync/type

adminapi.get('/admin/entities/search', authenticated,
	v.checkSchema({
		limit: { isInt: { options: { gt: 0 }} },
		offset: { optional: true, isInt: { options: { gt: -1 }} },
		order: { optional: true, isIn: { options: [['asc', 'desc']]}},
		type: { optional: true, isIn: { options: [Object.keys(entityTypeMap).concat(['all'])]}},
		search: { optional: { options: { values: 'falsy' } }, isAscii: { } }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		logger.debug(`Search query object: ${JSON.stringify(req.query)}`);
		Processing.searchAllEntities(req.query, function(err, entities) {
			if (err) {
				logger.error(`Error occurred searching all entities; query was ${JSON.stringify(req.query)}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(entities);
			} //successful search results
		}) //Processing.searchAllEntities
	}) //proper validation
}) //get /admin/entities/search

adminapi.delete('/admin/entity/:type/:id', authenticated,
	v.checkSchema({
		id: { isInt: { options: { gt: 0 }} },
		type: { isIn: { options: [Object.keys(entityTypeMap)]}}
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.deleteEntity(req.params.type, req.params.id, function(err, result) {
			if (err) {
				logger.error(`Error deleting ${req.params.type} #${req.params.id}: ${err}`);
				res.status(500).json()
			} else {
				res.status(201).json({message: `${req.params.type} #${req.params.id} was successfully deleted`, result: result});
			} //properly deleted
		}); //processing.deleteEntity
	}) //proper validation
}) //delete /admin/entity/:type/:id

adminapi.post('/admin/entity/:type', authenticated,
	v.checkSchema({
		name: { isAscii: {} },
		type: { isIn: { options: [Object.keys(entityTypeMap)]}}
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.createEntity(req.params.type, req.body.name, function(err, entity) {
			if (err) {
				logger.error(`Error occurred creating ${req.params.type} #${req.body.name}: ${err}`);
				res.status(500).send(err);
			} else {
				res.json(entity);
			} //successful creation
		}) //Processing.createEntity
	}) //proper validation
}) //POST /admin/entity/:type

adminapi.put('/admin/entity/:type', authenticated,
	v.checkSchema({
		name: { isAscii: {} },
		type: { isIn: { options: [Object.keys(entityTypeMap)]}},
		link: { optional: { options: { values: 'falsy' } }, isURL: {} },
		address: { optional: { options: { values: 'falsy' } }, isAscii: {} },
		lat: { optional: { options: { values: 'falsy' } }, isFloat: { options: { locale: 'en-US', min: -90, max: 90 } } },
		lon: { optional: { options: { values: 'falsy' } }, isFloat: { options: { locale: 'en-US', min: -180, max: 180 } } }
	}),
	function(req, res) {
	handleValidationResults(req, res, function() {
		Processing.editEntity(req.params.type, req.body, function(err, result) {
			if (err) {
				logger.error(`Error occurred editing ${req.params.type} #${req.body.id}: ${JSON.stringify(err)}`);
				res.status(500).json(err);
			} else {
				res.json(result);
			} //properly created
		}) //Processing.editEntity
	}) //proper validation
}) //PUT /admin/entity/:type

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
	res.json(req.session);
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