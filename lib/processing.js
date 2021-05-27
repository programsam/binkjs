const path = require('path');
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const BINKS3			= require("./binks3.js");
const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let Processing = function () {};

const entityTypeMap = {
	musicians: "Musician",
	locations: "Location",
	instruments: "Instrument",
	staff: "Staff Member",
	bands: "Band",
	roles: "Role"
}

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

Processing.prototype.testSQL = function(callback) {
	let connection = sql();
	connection.query('SELECT * FROM jams', function(err, rows) {
		if (err) {
			logger.error("Error! " + err)
			connection.end();
			callback(err);
		}
		else {
			callback(null);
		}
	});
}

// JAM ACTIONS

Processing.prototype.createJam = function (callback) {
	let client = sql();
	let now = new Date();
	let todaysdate = now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate();
	this.getNextId("jams", function(err, nextId) {
		if (err) {
			logger.error(`Error when determining last inserted jam id: ${err}`);
			callback(err);
		} else {
			BINKS3.createDirectories(nextId, function(s3Error, s3Results) {
				if (s3Error) {
					logger.error(`Error when creating directory in S3! ${JSON.stringify(s3Error)}`);
					callback(s3Error);
				} else {
					client.query("INSERT INTO `jams` (id,private,date,title,notes) VALUES (?,?,?,?,?)",
						[nextId, '1',todaysdate,'',''],
					function(err, result) {
						if (err) {
							res.status(500).send("Error while creating jam: " + JSON.stringify(err));
							callback(err);
						}
						else {
							callback(null, {id: nextId });
						} //else
					}); //client.query
				} //else no error creating directory
			}) //BINKS3.createDirectory
		} //no error getting next ID
	}) //this.getNextID
} //createJam

Processing.prototype.updateJam = function(id, data, callback) {
	let client = sql();
	console.log(`Received date: ${data.date}`);
	var numericalDate = Date.parse(data.date);
	var dateObject = new Date(numericalDate);
	logger.debug(`Date object: ${dateObject}`)
	var mysqlDate = dateObject.getFullYear() + "-" + (dateObject.getMonth()+1) + "-" + dateObject.getDate();
	console.log(`MySQL Date: ${mysqlDate}`);
	client.query("UPDATE jams SET title = ?, date = ?, locid = ?, bandid = ?, notes = ? WHERE id = ?",
		[data.title, mysqlDate, data.locid, data.bandid, data.notes, id],
		function(err, result) {
		client.end();
		if (err) {
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

//id, jamid, num, title, path, notes
Processing.prototype.syncMedia = function(params, callback) {
	let client = sql();
	logger.debug(`I received a request to sync ${params.type} for jam ${params.jamid}`);

	client.query("DELETE from tracks where jamid = ? ", [params.jamid],
		function(sqlerr, delResult, fields) {
		if (sqlerr)
		{
			client.end();
			logger.error(`Error when deleting db tracks for jam ${params.jamid}: ${sqlerr}`);
			callback(sqlerr);
		}
		else
		{
			logger.debug(`Successfully deleted all the ${params.type} for jam ${params.jamid}`);
			var s3path = `public/${params.type}/${params.jamid}/`;
			BINKS3.makeDirectoryPublic(s3path, function(s3err, s3Results) {
				if (s3err) {
					client.end();
					callback(s3err);
				} else {
					logger.debug(JSON.stringify(s3Results, null, 3))
					if (s3Results.Contents && s3Results.Contents.length > 1) {
						var files = s3Results.Contents;
						var toInsert = "VALUES ";
						var num = 0;
						for (var i=0;i<files.length;i++) {
							if (files[i].Key !== s3path && files[i].Size > 0) {
								var filename = files[i].Key.substr(s3path.length);
								toInsert += `(${params.jamid}, ${num}, '${filename}', '${files[i].Key.substr(7)}')`;
								if (i < files.length-1) {
									toInsert += ", "
								}
								num++;
							} //if it's not a directory
						} //for all files

						var sqlquery = "INSERT INTO `tracks` (jamid, num, title, path) " + toInsert;
						logger.debug(`Execute SQL query: ${sqlquery}`);

						client.query(sqlquery, function(inserterr, insertresult) {
							client.end();
							if (inserterr) //error while getting the item
							{
								logger.error(`Error when inserting synchronized tracks for jam ${params.jamid}: ${sqlerr}`);
								callback(sqlerr);
							}
							else
							{
								callback(null, {success: true});
							}
						})
					} else {
						callback(null, {message: `No usable tracks at ${s3path}`, results: s3Results});
					}
				}
			})
		} //else
	}) //query
}

//MUSICIAN ACTIONS
Processing.prototype.removeMusicianFromJam = function (obj, callback) {
	let client = sql();
	client.query("DELETE FROM `musiciansoncollection` WHERE jamid = ? AND musicianid = ? AND instrumentid = ?",
		[obj.jamid, obj.musicianid, obj.instrumentid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.removeMusicianEntirely = function (obj, callback) {
	let client = sql();
	client.query("DELETE FROM `musiciansoncollection` WHERE jamid = ? AND musicianid = ?",
		[obj.jamid, obj.musicianid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.addMusicianToJam = function (obj, callback) {
	let client = sql();
	logger.info(`The object I received to insert into the database is: ${JSON.stringify(obj)}`);
	client.query("INSERT INTO `musiciansoncollection` (jamid,musicianid,instrumentid) VALUES (?,?,?)",
		[obj.jamid, obj.musicianid, obj.instrumentid],
		function(err, result)
		{
			client.end();
			callback(err);
		}
	);
}

//STAFF ACTIONS
Processing.prototype.removeStaffFromJam = function (obj, callback) {
	let client = sql();
	client.query("DELETE FROM `productiononcollection` WHERE jamid = ? AND staffid = ? AND roleid = ?",
		[obj.jamid, obj.staffid, obj.roleid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.removeStaffEntirely = function (obj, callback) {
	let client = sql();
	client.query("DELETE FROM `productiononcollection` WHERE jamid = ? AND staffid = ?",
		[obj.jamid, obj.staffid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.addStaffToJam = function (obj, callback) {
	let client = sql();
	logger.info(`The object I received to insert into the database is: ${JSON.stringify(obj)}`);
	client.query("INSERT INTO `productiononcollection` (jamid,staffid,roleid) VALUES (?,?,?)",
		[obj.jamid, obj.staffid, obj.roleid],
		function(err, result)
		{
			client.end();
			callback(err);
		}
	);
}

Processing.prototype.createEntity = function (type, incomingName, callback) {
	let client = sql();

	if (Object.keys(entityTypeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to create an unsupported entity type: ${type}`)
		callback(new Error(`${type} is not a legal BINK type.`), null);
	}
	else
	{
		this.getNextId(type, function(err, nextId) {
			if (err) {
				logger.error(`Error when determining last inserted ${type} id: ${err}`);
				res.status(500).json(err);
			} else {
				client.query(`INSERT INTO ${type} (id,name) VALUES (?,?)`,
					[nextId, incomingName],
					function(err, result)
					{
						client.end();
						if (err) {
							res.status(500).send(`Database error while creating ${type} called ${incomingName}: ${JSON.stringify(err)}`);
							callback(err);
						}
						else {
							callback(null, {
								id: nextId,
								name: incomingName
							})
						}
				});
			}
		})
	}
}

Processing.prototype.getEntity = function (type, id, callback) {
	if (Object.keys(entityTypeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to look up an unsupported entity type: ${type}`)
		callback(new Error(`${type} is not a legal BINK type.`), null);
	}
	else
	{
		let client = sql();
		client.query(`SELECT * from ${type} where id = ?`,
			[id],
			function(err, rows, fields) {
			client.end();
			if (err) //error while getting the item
			{
				logger.error(`Error while retrieving a ${type}: ${err}`)
				callback(new Error(`Error while retrieving a ${type}, ${err}`), null)
			}
			else //no error
			{
				if (rows.length === 1) //there is something in the array, return it
				{
					let entity = rows[0];
					entity.type = type;
					entity.displayType = entityTypeMap[type];
					callback(null, entity);
				} else {
					logger.error(`More/less than one ${type} matches ID ${id}`);
					callback(new Error(`More than one ${type} matches ID ${id}`), null);
				}
			}
		})
	}
}

Processing.prototype.searchEntities = function (type, query, callback) {
	if (Object.keys(entityTypeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to search for an unusual entity: ${type}`)
		callback(new Error(`${type} is not a legal BINK type.`), null);
	}
	else
	{
		let client = sql();
		var query = client.query(`SELECT * from ${type} where name like ?`,
			[`%${query.q}%`],
			function(err, rows, fields) {
			client.end()
			if (err) //error while getting the item
			{
				logger.error(`Error while searching ${type}s with query ${query.q}: ${err}`)
				callback(new Error(`Error while searching ${type}s with query ${query.q}: ${err}`), null)
			}
			else //no error
			{
				var formattedObjects = [];
				async.each(rows, function(item, cb) {
					formattedObjects.push({
						value: item.id,
						text: item.name
					});
					cb();
				}, function(err) {
					callback(null, formattedObjects);
				})
			}
		})
	}
}

Processing.prototype.getNextId = function(table, callback) {
	let client = sql();
	var query = client.query(`SELECT max(id) as last FROM ${table};`, [table],
		function(err, result) {
			client.end();
			if (err) {
				callback(err);
			} else {
				callback(null, result[0].last + 1);
			}
		}
	)
}

Processing.prototype.getJamMusicians = function (thisjam, overallCallback)
{
	let client = sql();
	let jamMusicians = []
	client.query("SELECT musiciansoncollection.musicianid as musicianid, musiciansoncollection.jamid, " +
			"musiciansoncollection.instrumentid, " +
			"musicians.name as musicianname, instruments.name as instrumentname, " +
			"instruments.id as instrumentid " +
			"FROM musiciansoncollection, musicians, " +
			"instruments where instruments.id = musiciansoncollection.instrumentid and musicians.id = " +
			"musicianid and " +
			"musiciansoncollection.jamid = ?", [thisjam.id], function(err, dbrows, fields) {
			client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting jam musicians for ${thisjam.id}: ${err}`);
			overallCallback()
		}
		else {
			async.forEach(dbrows, function(thisDbRow, mainCallback) {
				var dbInstrument = {
					 id: thisDbRow.instrumentid,
					 name: thisDbRow.instrumentname
				 }
				let found = false
				async.forEach(jamMusicians, function(thisJamMusician, subCallback) {
					if (thisDbRow.musicianid === thisJamMusician.id) {
						 thisJamMusician.instruments.push(dbInstrument)
						 found = true
						 subCallback()
					 } else {
						 subCallback();
					 }
				 }, function (err) {
					 if (found === false)
					 {
						 var newMusician = {
							 name: thisDbRow.musicianname,
							 id: thisDbRow.musicianid,
							 instruments: [dbInstrument]
						 }
						 jamMusicians.push(newMusician)
						 mainCallback();
					 } else {
						 mainCallback();
					 }
				 })
			 },
			 function(err, results) {
				 thisjam.musicians = jamMusicians
				 overallCallback()
		   })
		}
	})
}

Processing.prototype.deleteJamEntry = function(deleteid, topcallback) {
	let client = sql();
	async.parallel([
		function(callback) {
			BINKS3.removeDirectories(deleteid, function(s3Err, results) {
				if (s3Err) {
					var message = `There was an error deleting directories for ${deleteid}: ${JSON.stringify(s3Err)}. We are continuing on to allow easier cleanup!`;
					logger.warn(message);
					callback(null, {message: message});
				} else {
					logger.debug(`Results for deleting directories of ${deleteid}: ${JSON.stringify(results)}`);
					callback(null, {results: results});
				}
			});
		},
		function(callback) {
			client.query("DELETE FROM jams WHERE id = ?", [deleteid], function(err, result) {
				if (err) //error while getting the item
				{
					logger.error(`Error when deleting jam #${deleteid}: ${err}`);
					callback(err);
				}
				else
				{
					callback(null, result);
				}
			})
		},
		function(callback) {
			client.query("DELETE FROM musiciansoncollection WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) //error while getting the item
				{
					logger.error(`Error when deleting musicians for jam #${deleteid}: ${err}`);
					callback(err);
				}
				else
				{
					callback(null, result);
				}
			})
		},
		function(callback) {
			client.query("DELETE FROM productiononcollection WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) //error while getting the item
				{
					logger.error(`Error when deleting staff for jam #${deleteid}: ${err}`);
					callback(err);
				}
				else
				{
					callback(null, result);
				}
			})
		}
	], function(err, results) {
		client.end()
		topcallback(err, results);
	})
}

Processing.prototype.getJamTracks = function(thisjam, overallCallback)
{
	var client = sql();
	let mytracks = []
	client.query("SELECT * from tracks where jamid = ? order by num asc", [thisjam.id],
		function(err, tracks, fields) {
		client.end();
		if (err) //error while getting the item
		{
			logger.error(`Error when getting tracks for jam ${thisjam.id}: ${err}`);
			overallCallback()
		}
		else
		{
			async.forEach(tracks, function(thisTrack, trackCallback) {
				let track = {
					id: thisTrack.id,
					title: thisTrack.title,
					path: settings.s3.public_base_url + thisTrack.path,
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has tracks: ${err}`);
			overallCallback()
		}
		else
		{
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has pics: ${err}`);
			overallCallback()
		}
		else
		{
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when checking if jam ${thisjam.id} has vids: ${err}`);
			overallCallback()
		}
		else
		{
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
	let jamStaff = []
	client.query("SELECT productiononcollection.jamid, productiononcollection.staffid as staffid, " +
				 "productiononcollection.roleid as roleid, staff.name as staffname, roles.name as rolename " +
				 "FROM productiononcollection, staff, roles where staff.id = productiononcollection.staffid " +
				 "and roles.id = productiononcollection.roleid " +
				 "and jamid = ?", [thisjam.id],
		function(err, dbRows, fields) {
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the staff for jam ${thisjam.id}: ${err}`)
			overallCallback()
		}
		else
		{
			 async.forEach(dbRows, function(thisDbRow, mainCallback) {
				 let found = false
				 var dbRole = {
					 id: thisDbRow.roleid,
					 name: thisDbRow.rolename
				 }
				 async.forEach(jamStaff, function(thisJamStaff, subCallback) {
				 	 if (thisDbRow.staffid === thisJamStaff.id)
					 {
						thisJamStaff.roles.push(dbRole)
						found = true
					 }
					 subCallback()
				 	},
				 	function (err, results) {
					 if (found == false)
					 {
						 let newStaff = {
							 		"name": thisDbRow.staffname,
								 "id": thisDbRow.staffid,
								 "roles": [dbRole]
							 }
						 jamStaff.push(newStaff)
					 }
					 mainCallback()
				  })
			   },
			   function(err, results) {
					 thisjam.staff = jamStaff
					 overallCallback()
		   	}
			)
		}
	})
}

Processing.prototype.getJamVideos = function(thisjam, callback)
{
	let client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id],
		function(err, vids, fields) {
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the video for jam ${thisjam.id}: ${err}`);
			callback()
		}
		else
		{
			if (vids.length > 0)
			{
				for (let j=0;j<vids.length;j++)
				{
					vids[j].path = settings.s3.public_base_url + vids[j].path
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the default pic for jam ${thisjam.id}: ${err}`);
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.defpic = rows[0]
				thisjam.defpic.path = settings.public_base_url + "pics/" + thisjam.id + "/" + thisjam.defpic.filename
				callback()
			}
			else //nothing in the array, return null
			{
				thisjam.defpic = null
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the location for jam ${thisjam.id}: ${err}`);
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.location = rows[0]
				callback()
			}
			else //nothing in the array, return null
			{
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
		client.end();
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the band for jam ${thisjam.id}: ${err}`);
			callback()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				thisjam.band = rows[0]
				callback()
			}
			else //nothing in the array, return null
			{
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
		client.end()
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the pictures for jam ${thisjam.id}: ${err}`);
			callback()
		}
		else
		{
			if (pics.length > 0)
			{
				mypics = []
				async.forEach(pics, function(thisPic, picCallback) {
					thisPic.path = settings.public_base_url + "pics/" + thisPic.jamid + "/" + thisPic.filename
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
		client.end();
		if (err) //error while getting the item
		{
			logger.error(`Error when getting the total number of jams: ${err}`);
			callback(err);
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				toRet.total = rows[0].num
				if (null != callback)
					callback()
			}
			else //nothing in the array, return null
			{
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
		client.end();
		if (err) //error while getting the item
		{
			logger.error(`Error getting the total jams for search: ${err}`)
			callback(err);
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				toRet.total = rows[0].num
				if (null != callback)
					callback()
			}
			else //nothing in the array, return null
			{
				if (null != callback)
					callback()
			}
		} //else
	}) //query
}

module.exports = new Processing();
