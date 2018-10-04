const path = require('path');
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')

let Processing = function () {};

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename));

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

Processing.prototype.getEntity = function (type, id, onlyPublic, callback) {
	let typeMap = {
		musicians: "Musician",
		locations: "Location",
		staff: "Staff Member",
		bands: "Band"
	}
	if (Object.keys(typeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to look up an unusual entity: ${type}`)
		callback(new Error(`${type} is not a legal BINK type.`), null);
	}
	else
	{
		let client = sql();
		client.query(`SELECT * from ${type} where id = ?`,
			[id],
			function(err, rows, fields) {
			if (err) //error while getting the item
			{
				logger.error(`Error while retrieving a ${type}: ${err}`)
				callback(new Error(`Error while retrieving a ${type}, ${err}`), null)
				client.end()
			}
			else //no error
			{
				if (rows.length === 1) //there is something in the array, return it
				{
					let entity = rows[0];
					entity.type = type;
					entity.displayType = typeMap[type];
					callback(null, entity);
				} else {
					client.end()
					logger.error(`More/less than one ${type} matches ID ${id}`);
					callback(new Error(`More than one ${type} matches ID ${id}`), null);
				}
			}
		})
	}
}

Processing.prototype.getLastJamId = function(callback) {
	let client = sql();
	client.query("SELECT max(id) as last FROM `jams`;", function(err, result) {
		if (err) {
			callback(err);
		} else {
			callback(null, result[0].last);
		}
	})
}

Processing.prototype.updateJam = function(id, data, callback) {
	let client = sql();
	client.query("UPDATE jams SET title = ?, date = ? WHERE id = ?",
		[data.title, data.date, id],
		function(err, result) {
		if (err) {
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

Processing.prototype.getJamMusicians = function (thisjam, overallCallback)
{
	let client = sql();
	let mymusicians = []
	client.query("SELECT musiciansoncollection.musicianid as musicianid, musiciansoncollection.jamid, " +
			"musiciansoncollection.instrumentid, " +
			"musicians.name as musicianname, instruments.name as instrumentname " +
			"FROM musiciansoncollection, musicians, " +
			"instruments where instruments.id = musiciansoncollection.instrumentid and musicians.id = " +
			"musicianid and " +
			"musiciansoncollection.jamid = ?", [thisjam.id], function(err, musicians, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting jam musicians for ${thisjam.id}: ${err}`);
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(musicians, function(thismusician, mainCallback) {
				 let found = false
				 async.forEach(mymusicians, function(thismymusician, subCallback) {
				 	 if (thismusician.musicianname == thismymusician.name)
					 {
						thismymusician.instruments.push(thismusician.instrumentname)
						found = true
					 }
					 subCallback()
				 	},
				 	function (err, results) {
					 if (found == false)
					 {
						 let musician = {"name":thismusician.musicianname,
								 "id": thismusician.musicianid,
								 "instruments": [thismusician.instrumentname]}
						 mymusicians.push(musician)
					 }
					 mainCallback()
				  })
			   },
			   function(err, results) {
				 thisjam.musicians = mymusicians
				 client.end()
				 overallCallback()
			   })
		}
	})
}

Processing.prototype.deleteJamEntry = function(deleteid, callback) {
	let client = sql();
	client.query("DELETE FROM jams WHERE id = ?", [deleteid], function(err, result) {
		if (err) //error while getting the item
		{
			logger.error(`Error when deleting jam #${deleteid}: ${err}`);
			client.end()
			callback(err);
		}
		else
		{
			logger.info(`Someone just deleted jam #${deleteid}`);
			callback(null, result);
		}
	})
}

Processing.prototype.getJamTracks = function(thisjam, overallCallback)
{
	let client = sql();
	let mytracks = []
	client.query("SELECT * from tracks where jamid = ? order by num asc", [thisjam.id],
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting tracks for jam ${thisjam.id}: ${err}`);
			client.end()
			overallCallback()
		}
		else
		{
			async.forEach(tracks, function(thisTrack, trackCallback) {
				let track = {
					id: thisTrack.id,
					title: thisTrack.title,
					path: settings.media_s3_url + thisTrack.path,
					notes: thisTrack.notes
				}
				mytracks.push(track)
				trackCallback()
			}, function (err, results)
			{
				thisjam.tracks = mytracks
				overallCallback()
			}) //async
		} //else
	}) //query
}

Processing.prototype.hasTracks = function(thisjam, overallCallback)
{
	let client = sql();
	client.query("SELECT * from tracks where jamid = ?", [thisjam.id],
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has tracks: ${err}`);
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (tracks.length > 0)
			{
				thisjam.hasTracks = true
				overallCallback()
			}
			else
			{
				thisjam.hasTracks = false
				overallCallback()
			}
		} //else
	}) //query
}

Processing.prototype.hasPics = function(thisjam, overallCallback)
{
	let client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id],
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has pics: ${err}`);
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (pics.length > 0)
			{
				thisjam.hasPics = true
				overallCallback()
			}
			else
			{
				thisjam.hasPics = false
				overallCallback()
			}
		} //else
	}) //query
}

Processing.prototype.hasVids = function(thisjam, overallCallback)
{
	let client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id],
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has vids: ${err}`);
			client.end()
			overallCallback()
		}
		else
		{
			client.end()
			if (vids.length > 0)
			{
				thisjam.hasVids = true
				overallCallback()
			}
			else
			{
				thisjam.hasVids = false
				overallCallback()
			}
		} //else
	}) //query
}

Processing.prototype.getJamStaff = function(thisjam, overallCallback)
{
	let client = sql();
	let mystaff = []
	client.query("SELECT productiononcollection.jamid, productiononcollection.staffid as id, " +
				 "productiononcollection.roleid, staff.name as staffname, roles.name as rolename " +
				 "FROM productiononcollection, staff, roles where staff.id = productiononcollection.staffid " +
				 "and roles.id = productiononcollection.roleid " +
				 "and jamid = ?", [thisjam.id],
		function(err, staff, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the staff for jam ${thisjam.id}: ${err}`)
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(staff, function(thisstaff, mainCallback) {
				 let found = false
				 async.forEach(mystaff, function(thismystaff, subCallback) {
				 	 if (thisstaff.staffname == thismystaff.name)
					 {
						thismystaff.roles.push(thisstaff.rolename)
						found = true
					 }
					 subCallback()
				 	},
				 	function (err, results) {
					 if (found == false)
					 {
						 let staff = {"name":thisstaff.staffname,
								 "id": thisstaff.id,
								 "roles": [thisstaff.rolename]}
						 mystaff.push(staff)
					 }
					 mainCallback()
				  })
			   },
			   function(err, results) {
				 thisjam.staff = mystaff
				 client.end()
				 overallCallback()
			   })
		}
	})
}

Processing.prototype.getJamVideos = function(thisjam, callback)
{
	let client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id],
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the video for jam ${thisjam.id}: ${err}`);
			client.end()
			callback()
		}
		else
		{
			client.end()
			if (vids.length > 0)
			{
				for (let j=0;j<vids.length;j++)
				{
					vids[j].path = settings.media_s3_url + vids[j].path
				}
				thisjam.video = vids
				callback()
			}
			else
			{
				thisjam.video = null
				callback()
			}
		} //else
	}) //query
}

Processing.prototype.getDefPic = function(thisjam, callback)
{

	let client = sql();
	client.query("SELECT * from pictures where id = ?", [thisjam.defpic],
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the default pic for jam ${thisjam.id}: ${err}`);
			client.end()
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.defpic = rows[0]
				thisjam.defpic.path = settings.media_s3_url + "pics/" + thisjam.id + "/" + thisjam.defpic.filename
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				thisjam.defpic = null
				client.end()
				callback()
			}
		} //else
	}) //query
} //function

Processing.prototype.getLocation = function(thisjam, callback)
{
	let client = sql();
	client.query("SELECT * from locations where id = ?", [thisjam.locid],
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the location for jam ${thisjam.id}: ${err}`);
			client.end()
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.location = rows[0]
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				callback()
			}
		} //else
	}) //query
} //function

Processing.prototype.getBand = function(thisjam, callback)
{
	let client = sql();
	client.query("SELECT * from bands where id = ?", [thisjam.bandid],
    function(err, rows, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the band for jam ${thisjam.id}: ${err}`);
			client.end()
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.band = rows[0]
				client.end()
				callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				callback()
			}
		} //else
	}) //query
} //function

Processing.prototype.getJamPictures = function(thisjam, overallCallback)
{
	let client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id],
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the pictures for jam ${thisjam.id}: ${err}`);
			client.end()
			callback()
		}
		else
		{
			client.end()
			if (pics.length > 0)
			{
				mypics = []
				async.forEach(pics, function(thisPic, picCallback) {
					thisPic.path = settings.media_s3_url + "pics/" + thisPic.jamid + "/" + thisPic.filename
					mypics.push(thisPic)
					picCallback()
				}, function (err, results)
				{
					thisjam.pictures = mypics
					overallCallback()
				}) //async
			}
			else
			{
				thisjam.pictures = null
				overallCallback()
			}
		} //else
	}) //query
}

Processing.prototype.getTotalJams = function(toRet, admin, callback) {
	let client = sql();
	let onlyPublic = "where private = 0"
	if (admin)
		onlyPublic = ""
	client.query("SELECT COUNT(*) as num from jams " + onlyPublic,
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the total number of jams: ${err}`);
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				client.end()
				toRet.total = rows[0].num
				if (null != callback)
					callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				if (null != callback)
					callback()
			}
		} //else
	}) //query
}

Processing.prototype.getTotalSearchJams = function(query, toRet, admin, callback) {
	let client = sql();
	let onlyPublic = "private = 0 and "
		if (admin)
			onlyPublic = ""
	client.query("SELECT COUNT(*) as num from jams where " + onlyPublic + " title like (?)",
		[query],
		function(err, rows) {
		if (err) //error while getting the item
		{
			logger.error(`Error getting the total jams for search: ${err}`)
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				client.end()
				toRet.total = rows[0].num
				if (null != callback)
					callback()
			}
			else //nothing in the array, return null
			{
				client.end()
				if (null != callback)
					callback()
			}
		} //else
	}) //query
}

module.exports = new Processing();
