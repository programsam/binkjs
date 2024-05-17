const path = require('path');
const mysql		= require('mysql2');
const async		= require('async');
const settings	= require('../settings.json')
const BINKS3			= require("./binks3.js");
const makeLogger = require("./loggerFactory.js");
const fs 					= require("fs");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

var Processing = function () {};

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
	var connection = sql();
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

Processing.prototype.loadFullSingleJam = function(jamid, admin, topcb) {
	//"this" will change in diff function calls.
	//in client.query "this" will become "client", but
	//"that" should stay Processing.
	var that = this;
	var client = sql();
	var onlyPublic = "private = 0 and "
	if (admin)
		onlyPublic = ""
	client.query(`SELECT * from jams where ${onlyPublic}id = ?`, [jamid],
	function(err, rows) {
		if (err) {
			logger.error(`Error loading the jam ${jamid}: ${JSON.stringify(err)}`);
			topcb(err);
		} else if (rows.length === 1) {
			logger.debug(`We found exactly 1 jam with id ${jamid}... populating it...`);
			that.populateJam(rows[0], topcb);
		} else if (rows.length === 0) {
			topcb(null, {});
		} else {
			logger.error(`Multiple jams match ID ${jamid}! They are: ${JSON.stringify(rows)}`);
			topcb(new Error(`Multiple jams match that ID!`));
		}
	});
}

Processing.prototype.recentAndHistoricJams = function(historic, admin, topcb) {
	var that = this;
	var client = sql();

	var d = new Date();
	var sqlMonth = ('00' + (d.getMonth() + 1)).slice(-2)
	var sqlDate = ('00' + (d.getDate())).slice(-2)
	var sqlYear = d.getFullYear();
	var historicWhere = `date LIKE ('%-${sqlMonth}-${sqlDate}') AND year(date) < ${sqlYear}`;

	var query = ""
	if (historic && ! admin) {
		query = `SELECT * FROM jams WHERE private = 0 AND ${historicWhere} ORDER BY date DESC LIMIT 0,20`;
	} else if (historic && admin) {
		query = `SELECT * FROM jams WHERE ${historicWhere} ORDER BY date DESC LIMIT 0,20`;
	} else if (! historic && ! admin) {
		query = `SELECT * FROM jams WHERE private = 0 ORDER BY date DESC LIMIT 0,20`;
	} else if (! historic && admin) {
		query = `SELECT * FROM jams ORDER BY date DESC LIMIT 0,20`;
	}

	logger.debug(`Grabbing blog-style jams. The query: ${query}`);
	client.query(query, function(err, jams) {
	  if (err) {
		  logger.error("ERROR Getting recent jams: " + err)
		  client.end()
		  topcb(err);
	  } else {
		async.forEach(jams, function(thisjam, jamCallback) {
			logger.debug(`Iterating over jam ${thisjam.id}...`);
			async.parallel([
				function(cb) {
					var d = new Date(thisjam.date);
					thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
					cb();
				},
				function (cb) {
					logger.debug(`Grabbing band for jam ${thisjam.id}`);
					that.getBand(thisjam, cb);
				},
				function (cb) {
					logger.debug(`Grabbing location for jam ${thisjam.id}`)
					that.getLocation(thisjam, cb);
				},
				function (cb) {
					logger.debug(`Grabbing defpic for jam ${thisjam.id}`);
					that.getDefPic(thisjam, cb);
				}
			], function(err) {
				logger.debug(`Jam ${thisjam.id} has been populated; calling next...`);
				jamCallback(err);
			})
		}, function(parallelErr) {
			logger.debug(`All jams populated; calling back...`);
			topcb(parallelErr, jams);
			client.end();
		})
  	} //else the database command was successful
  })//client.query
}

Processing.prototype.populateJam = function(thisjam, topcb) {
	//"this" will change in diff function calls.
	//in async.parellel "this" will become "async", but
	//"that" should stay Processing.
	var that = this;
	async.parallel([
		function(cb) {
			var d = new Date(thisjam.date);
			thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
			cb();
		},
		function (cb) {
			that.getBand(thisjam, cb);
		},
		function(cb) {
			that.getLocation(thisjam, cb);
		},
		function(cb) {
			that.getJamMusicians(thisjam, cb);
		},
		function(cb) {
			that.getJamStaff(thisjam, cb);
		},
		function(cb) {
			that.getJamPictures(thisjam, cb);
		},
		function(cb) {
			that.getJamVideos(thisjam, cb);
		},
		function(cb) {
			that.getDefPic(thisjam, cb);
		},
		function(cb) {
			that.getJamTracks(thisjam, cb);
		}
	], function(err) {
		logger.debug(`populateJam; jam is now populated.`);
		topcb(err, thisjam);
	});
}

// UPLOAD FILES

Processing.prototype.uploadFiles = function(jamid, files, topcallback) {
	async.each(files, function(thisfile, filecb) {
		logger.debug(`Handling file: ${thisfile.originalname}; mimetype: ${thisfile.mimetype}; path ${thisfile.path}`);
		var constructedKey = `public/`;
		if (thisfile.mimetype.indexOf('audio/') === 0 || thisfile.mimetype.indexOf('video/') === 0 || thisfile.mimetype.indexOf('image/') === 0) {

			if (thisfile.mimetype.indexOf('audio/') === 0) {
				constructedKey += `snd/`;
			} else if (thisfile.mimetype.indexOf('video/') === 0) {
				constructedKey += `video/`
			} else if (thisfile.mimetype.indexOf('image/') === 0) {
				constructedKey += `pics/`
			} else {
				throw new Error(`This code should not be reachable! File's mimetype: ${thisfile.mimetype}!`);
			}

			constructedKey += `${jamid}/${thisfile.originalname}`;
			logger.debug(`Before I sent the file it was ${thisfile.path}`);
			BINKS3.putObject(constructedKey, thisfile, function(err, result) {
				if (err) {
					logger.debug(`[processing.files.23] Error uploading file to jam ${jamid} with file ${thisfile.originalname}`);
					filecb(err);
				} else {
					logger.debug(`[processing.files.24] File ${thisfile.originalname} successfully uploaded; inserting it into the db now...`);

					if (thisfile.mimetype.indexOf('audio/') === 0) {
						thisfile.s3path = `snd/${jamid}/${thisfile.originalname}`;
						insertNewTrack(jamid, thisfile, function(err) {
							fs.unlink(thisfile.path, filecb);
						});
					} else if (thisfile.mimetype.indexOf('image/') === 0) {
						insertNewPic(jamid, thisfile, function(err) {
							fs.unlink(thisfile.path, filecb);
						});
					} else if (thisfile.mimetype.indexOf('video/') === 0) {
						thisfile.s3path = `video/${jamid}/${thisfile.originalname}`;
						insertNewVid(jamid, thisfile, function(err) {
							fs.unlink(thisfile.path, filecb);
						});
					} else {
						throw new Error(`This code should not be reachable! File's mimetype: ${thisfile.mimetype}!`);
					} //not a tableName we know about
				} //no problem putting object to S3
			}) //BINKS3.putObject
		} else {
			logger.warn(`[processing.files.93] Someone tried to upload a file of unsupported type ${thisfile.mimetype}!`);
			logger.debug(`Deleting the temporary file.`);
			fs.unlink(thisfile.path, function(unlinkerr) {
				if (unlinkerr) logger.debug(`Unlink error: ${unlinkerr}`);
				logger.debug(`Doing a filecb with a custom error about unsupported type.`);
				filecb({message: `We do not support this file type!`, mimetype: thisfile.mimetype});
			})
		} //file type not accepted
	}, function(err) {
		logger.debug(`[processing.files.21] Finished with file list. Err: ${JSON.stringify(err)}`);
		topcallback(err);
	}) //async.each files
}

function insertNewVid(jamid, thisfile, filecb) {
	logger.silly(`This video's original name is: ${thisfile.originalname}`);
	logger.silly(`Its first three characters are ${thisfile.originalname.substr(0, 3)}`);
	logger.silly(`That is NOT a number: ${isNaN(thisfile.originalname.substr(0,3))}`);

	if (isNaN(thisfile.originalname.substr(0, 3))) { //it's NOT a number, so get highest value
		logger.silly(`It's not a number, so we're going to get the largest video number and go from there.`);
		getHighestNumber(jamid, "video", function(err, vidNumber) {
			if (err) {
				filecb(err);
			} else {
				actuallyInsertVid(jamid, thisfile, vidNumber, filecb);
			}
		});
	} else {
		logger.silly(`It IS a number, so we'll use it!`)
		var vidNumber = parseInt(thisfile.originalname.substr(0, 3));
		logger.debug(`We got ${vidNumber}; sending that along!`);
		actuallyInsertVid(jamid, thisfile, vidNumber, filecb);
	}
} //insertNewTrack

function actuallyInsertVid(jamid, thisfile, vidNumber, filecb) {
	var client = sql();
	logger.silly(`This video will have number ${vidNumber}`);
	client.query("INSERT INTO video (jamid, num, title, path) VALUES (?,?,?,?)",
							[jamid, vidNumber, thisfile.originalname, thisfile.s3path],
	function(inserterr, results) {
		client.end();
		if (inserterr) {
			logger.error(`Error inserting new video in ${jamid} with track #${trackNumber}: ${JSON.stringify(inserterr)}`);
			filecb(inserterr);
		} else {
			filecb(null, results);
		} //no issue inserting new track
	}) //client.query insert new track
}

function getHighestNumber(jamid, table, cb) {
	var client = sql();
	logger.debug(`Looking up highest number in '${table}' table for jam #${jamid}...`)
	if (table === "tracks" || table === "video") {
		client.query(`SELECT max(num) as maxnum FROM ${table} WHERE jamid = ?`, [jamid], function(sqlerr, results) {
		client.end();
		if (sqlerr) { //error finding maximum number (why?)
			logger.error(`Error finding highest numbered item in ${jamid}: ${JSON.stringify(sqlerr)}`);
			cb(sqlerr);
		} else {
			logger.debug(`Results are: ${JSON.stringify(results)}`);
				//if it's not a number coming back then just start with zero.
				if (results[0].maxnum === null) {
					cb(null, 0);
				} else { //otherwise, passback the number + 1 to increment.
					cb(null, parseInt(results[0].maxnum) + 1)
				} //else just use zero
			} //no error finding number
		}) //client.query
	} else { //used proper tables or didn't...
		logger.warn(`Someone tried to look up max(num) in a table that doesn't have num! Jam #${jamid}, table called: '${table}'!`);
		cb({message: `We do not allow looking up highest numbers in that table!`, tableCalled: $table});
	} //didn't use proper tables
} //getHighestNumber

function insertNewTrack(jamid, thisfile, filecb) {
	logger.silly(`This file's original name is: ${thisfile.originalname}`);
	logger.silly(`It's first three characters are ${thisfile.originalname.substr(0, 3)}`);
	logger.silly(`That is NOT a number: ${isNaN(thisfile.originalname.substr(0,3))}`);

	if (isNaN(thisfile.originalname.substr(0, 3))) { //it's NOT a number, so get highest value
		logger.debug(`It's not a number, so we're going to get the largest track number and go from there.`);
		getHighestNumber(jamid, "tracks", function(err, trackNumber) {
			if (err) {
				filecb(err);
			} else {
				actuallyInsertTrack(jamid, thisfile, trackNumber, filecb);
			}
		});
	} else {
		logger.debug(`It IS a number, so we'll use it!`)
		var trackNumber = parseInt(thisfile.originalname.substr(0, 3));
		logger.silly(`We got ${trackNumber}; sending that along!`);
		actuallyInsertTrack(jamid, thisfile, trackNumber, filecb);
	}
} //insertNewTrack

function actuallyInsertTrack(jamid, thisfile, trackNumber, filecb) {
	var client = sql();
	logger.silly(`This track will have number ${trackNumber}`);
	client.query("INSERT INTO tracks (jamid, num, title, path) VALUES (?,?,?,?)",
							[jamid, trackNumber, thisfile.originalname, thisfile.s3path],
	function(inserterr, results) {
		client.end();
		if (inserterr) {
			logger.error(`Error inserting new track in ${jamid} with track #${trackNumber}: ${JSON.stringify(inserterr)}`);
			filecb(inserterr);
		} else {
			filecb(null, results);
		} //no issue inserting new track
	}) //client.query insert new track
}

function insertNewPic(jamid, thisfile, filecb) {
	var client = sql();
	client.query("INSERT INTO pictures (jamid, filename) VALUES (?,?)",
							[jamid, thisfile.originalname],
	function(inserterr, results) {
		client.end();
		if (inserterr) {
			logger.error(`Error inserting new picture in ${jamid} with name #${thisfile.originalname}: ${JSON.stringify(inserterr)}`);
			filecb(inserterr);
		} else {
			filecb(null, results);
		} //no insertion problems
	}) //client.query
} //insertNewPic

// JAM ACTIONS
Processing.prototype.createJam = function (callback) {
	var now = new Date();
	var todaysdate = now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate();
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
					var client = sql();
					client.query("INSERT INTO `jams` (id,private,date,title,notes) VALUES (?,?,?,'untitled',?)",
						[nextId, '1',todaysdate,'',''],
					function(err, result) {
						client.end();
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
	var client = sql();
	console.log(`Received date: ${data.date}`);
	var numericalDate = Date.parse(data.date);
	var dateObject = new Date(numericalDate);
	logger.debug(`Date object: ${dateObject}`)
	var mysqlDate = dateObject.getFullYear() + "-" + (dateObject.getMonth()+1) + "-" + dateObject.getDate();
	console.log(`MySQL Date: ${mysqlDate}`);
	client.query("UPDATE jams SET title = ?, date = ?, locid = ?, bandid = ?, notes = ?, private=? WHERE id = ?",
		[data.title, mysqlDate, data.locid, data.bandid, data.notes, data.private, id],
		function(err, result) {
		client.end();
		if (err) {
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

Processing.prototype.stripTrackNumbers = function(jamid, topcallback) {
	logger.debug(`Stripping track numbers for jam ${jamid}`);

	var client = sql();
	client.query("SELECT * FROM tracks where jamid = ?", [jamid], function(sqlerr, tracks) {
		if (sqlerr) {
			client.end();
			logger.error(`Error occurred selecting tracks for stripping in jam ${jamid}: ${JSON.stringify(sqlerr)}`);
			topcallback(sqlerr);
		} else {
			async.each(tracks, function(thistrack, trackcb) {
				/**
				 * This is where we update track titles to remove prefixes like track numbers
				 * and suffixes like .mp3!
				 */
				var newtitle = thistrack.title.replace('.mp3', '');
				newtitle = newtitle.substr(3);

				client.query("UPDATE tracks SET title = ? WHERE id = ? AND jamid = ?", [newtitle, thistrack.id, jamid],
				function(updateErr, results) {
					if (updateErr) {
						logger.error(`Error updating track '${thistrack.title}'; came up with ${newtitle}, id ${thistrack.id} on jam ${jamid}: ${JSON.stringify(updateErr)}`);
						trackcb(updateErr);
					} else {
						logger.debug(`Updated track ${thistrack.id} from '${thistrack.title}' to '${newtitle}' in jam #${jamid}`);
						trackcb();
					}
				})
			}, function(stripErr, stripResults) {
				if (stripErr) {
					logger.error(`Error occurred actually transforming the tracks in jam ${jamid}: ${JSON.stringify(stripErr)}`)
					topcallback(stripErr);
				} else {
					logger.debug('Successfully stripped all tracks...');
					topcallback(null);
				} //no problem actually stripping
				client.end();
			}) //async.each
		} //no problem looking up tracks
	}) //SQL look up tracks for jam
} //stripTrackNumbers

Processing.prototype.syncMedia = function(params, callback) {
	logger.debug(`Synchronizing table ${params.tableName} with s3's ${params.s3Path} for jam ${params.jamid}`);
	var client = sql();

	client.query(`DELETE FROM ${params.tableName} WHERE jamid = ?`, [params.jamid],
		function(sqlerr, delResult, fields) {
		if (sqlerr)
		{
			client.end();
			logger.error(`Error when deleting db ${params.tableName} for jam ${params.jamid}: ${sqlerr}`);
			callback(sqlerr);
		} else {
			logger.debug(`Successfully cleared table ${params.tableName} for jam ${params.jamid}`);
			var s3path = `public/${params.s3Path}/${params.jamid}/`;
			logger.debug(`Listing all files at ${s3path}, while making them public`);
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

								if (params.tableName === "tracks") {
									var filename = files[i].Key.substr(s3path.length);
									toInsert += `(${params.jamid}, ${num}, '${filename}', '${files[i].Key.substr(7)}')`;
									num++;
								} else if (params.tableName === "pictures") {
									toInsert += `(${params.jamid}, '${files[i].Key.substr(s3path.length)}')`;
								} else if (params.tableName === "video") {
									var filename = files[i].Key.substr(s3path.length);
									toInsert += `(${params.jamid}, ${num}, '${filename}', '${files[i].Key.substr(7)}')`;
									num++;
								}

								if (i < files.length-1) {
									toInsert += ", "
								}
							} //if it's not a directory
						} //for all files

						var sqlquery = `INSERT INTO ${params.tableName}`;

						if (params.tableName === "tracks") {
							sqlquery += ` (jamid, num, title, path) `;
						} else if (params.tableName === "pictures") {
							sqlquery += ` (jamid, filename) `
						} else if (params.tableName === "video") {
							sqlquery += ` (jamid, num, title, path) `
						}

						sqlquery += toInsert;

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
						callback(null, {message: `No usable ${params.tableName} at ${s3path}`, results: s3Results});
					}
				}
			})
		} //else
	}) //query
}

//MUSICIAN ACTIONS
Processing.prototype.removeMusicianFromJam = function (obj, callback) {
	var client = sql();
	client.query("DELETE FROM `musiciansoncollection` WHERE jamid = ? AND musicianid = ? AND instrumentid = ?",
		[obj.jamid, obj.musicianid, obj.instrumentid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.removeMusicianEntirely = function (obj, callback) {
	var client = sql();
	client.query("DELETE FROM `musiciansoncollection` WHERE jamid = ? AND musicianid = ?",
		[obj.jamid, obj.musicianid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.addMusicianToJam = function (obj, callback) {
	var client = sql();
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
	var client = sql();
	client.query("DELETE FROM `productiononcollection` WHERE jamid = ? AND staffid = ? AND roleid = ?",
		[obj.jamid, obj.staffid, obj.roleid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.updateTrack = function(obj, callback) {
	var client = sql();
	logger.debug(`Request to update track ${obj.trackid} in jam ${obj.jamid} to title '${obj.title}'`);
	client.query("UPDATE tracks SET title = ?, notes = ? WHERE id = ? AND jamid = ?",
		[obj.title, obj.notes, obj.trackid, obj.jamid],
		function(err, result) {
		client.end();
		if (err) {
			logger.error(`Error updating track ${obj.trackid} in jam ${obj.jamid}: ${JSON.stringify(err)}`);
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

Processing.prototype.moveTrackOrVidUp = function(typeAsTable, itemid, jamid, callback) {
	var client = sql();
	logger.debug(`Request to move ${typeAsTable} ${itemid} in jam ${jamid} up`);
	var selectedItem, previousItem;
	client.query(`SELECT * FROM ${typeAsTable} WHERE jamid = ? ORDER BY num`, [jamid], function(allJamItemsErr, allJamItems) {
		if (allJamItemsErr) {
			callback(allJamItemsErr);
			logger.error(`[move.up.all] Error when selecting ${typeAsTable} to move down: ${JSON.stringify(allTracksErr)}`);
		} else {
			logger.debug(`Successfully retrieved ${typeAsTable}} for jam: ${jamid}...`);
			for (var i=0;i<allJamItems.length;i++) {
				if (allJamItems[i].id === itemid) {
					selectedItem = allJamItems[i];
					previousItem = allJamItems[i-1];
					logger.debug(`Item to move: ${JSON.stringify(selectedItem)}`);
					logger.debug(`Previous item: ${JSON.stringify(previousItem)}`);
					if (i > 0 && typeof previousItem === "object") {
						logger.silly(`UPDATE ${typeAsTable} SET num = ${previousItem.num} WHERE id = ${selectedItem.id}`);
						client.query(`UPDATE ${typeAsTable} SET num = ? WHERE id = ?`, 
							[previousItem.num, selectedItem.id], 
							function(selectedBackwardsErr, selectedBackwardsResult) {
								if (selectedBackwardsErr) {
									logger.error(`[move.up.selected] Error when trying to move current ${typeAsTable} backwards: ${JSON.stringify(selectedBackwardsErr)}`);
									callback(selectedBackwardsErr);
								} else {
									logger.debug(`Result: ${JSON.stringify(selectedBackwardsResult)}`);
									logger.silly(`UPDATE ${typeAsTable} SET num = ${selectedItem.num} WHERE id = ${previousItem.id}`);
									client.query(`UPDATE ${typeAsTable} SET num = ? WHERE id = ?`, 
									[selectedItem.num, previousItem.id], 
										function(previousForwardErr, previousForwardResult) {
											if (previousForwardErr) {
												logger.error(`[move.up.previous] Error when trying to move previous ${typeAsTable} forward: ${JSON.stringify(previousForwardErr)}`);
												callback(previousForwardErr);
											} else {
												logger.debug(`Result: ${JSON.stringify(previousForwardResult)}`);
												callback(null, {});
											} //no error moving previous item forward
										}); //query moving previous item forward
								} //no error moving current item backwards
						}); //query moving chosen item backwards
					} else { 
						logger.debug(`Cannot move the top item any higher; doing nothing.`);
						callback(null, {});
					} //current item cannot be moved
				} //we found the item
			} //iterate over the items in this jam
		} //no error getting this jam's items
	}); //query getting all items for this jam
}

Processing.prototype.moveTrackOrVidDown = function(typeAsTable, itemid, jamid, callback) {
	var client = sql();
	logger.debug(`Request to move ${typeAsTable} ${itemid} in jam ${jamid} up`);
	var selectedItem, nextItem;
	client.query(`SELECT * FROM ${typeAsTable} WHERE jamid = ? ORDER BY num`, [jamid], function(allJamItemsErr, allJamItems) {
		if (allJamItemsErr) {
			logger.error(`[move.down.all] Error when selecting ${typeAsTable} to move down: ${JSON.stringify(allJamItemsErr)}`);
			callback(allJamItemsErr);
		} else {
			logger.debug(`Successfully retrieved ${typeAsTable} for jam: ${jamid}...`);
			for (var i=0;i<allJamItems.length;i++) {
				if (allJamItems[i].id === itemid) {
					selectedItem = allJamItems[i];
					nextItem = allJamItems[i+1];
					logger.debug(`Item to move: ${JSON.stringify(selectedItem)}`);
					logger.debug(`Next item: ${JSON.stringify(nextItem)}`);
					if (i < allJamItems.length-1 && typeof nextItem === "object") {
						logger.silly(`UPDATE ${typeAsTable} SET num = ${nextItem.num} WHERE id = ${selectedItem.id}`);
						client.query(`UPDATE ${typeAsTable} SET num = ? WHERE id = ?`, 
							[nextItem.num, selectedItem.id], 
							function(selectedForwardsError, selectedForwardResult) {
								if (selectedForwardsError) {
									logger.error(`[move.down.selected] Error when trying to move current ${typeAsTable} forward: ${JSON.stringify(selectedForwardsError)}`);
									callback(selectedForwardsError);
								} else {
									logger.debug(`Result: ${JSON.stringify(selectedForwardResult)}`);
									logger.silly(`UPDATE ${typeAsTable} SET num = ${selectedItem.num} WHERE id = ${nextItem.id}`);
									client.query(`UPDATE ${typeAsTable} SET num = ? WHERE id = ?`, 
									[selectedItem.num, nextItem.id], 
										function(nextBackwardErr, nextBackwardResult) {
											if (nextBackwardErr) {
												logger.error(`[move.up.next] Error when trying to move next ${typeAsTable} backward: ${JSON.stringify(nextBackwardErr)}`);
												callback(nextBackwardErr);
											} else {
												logger.debug(`Result: ${JSON.stringify(nextBackwardResult)}`);
												callback(null, {});
											} //no error moving previous item forward
										}); //query moving previous item forward
								} //no error moving current item backwards
						}); //query moving chosen item backwards
					} else { 
						logger.debug(`Cannot move the bottom item any lower; doing nothing.`);
						callback(null, {});
					} //current item cannot be moved
				} //we found the item
			} //iterate over the items in this jam
		} //no error getting this jam's items
	}); //query getting all items for this jam
}

Processing.prototype.setJamDefPic = function(obj, callback) {
	var client = sql();
	logger.debug(`Request to update default pic ${obj.defpic} in jam ${obj.jamid}.`);
	client.query("UPDATE jams SET defpic = ? WHERE id = ?",
		[obj.defpic, obj.jamid],
		function(err, result) {
		client.end();
		if (err) {
			logger.error(`Error updating jam ${obj.jamid} to default pic #${obj.defpic}: ${JSON.stringify(err)}`);
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

Processing.prototype.removeTrack = function(obj, callback) {
	logger.debug(`Removing track ${obj.trackid} from jam ${obj.jamid}`);
	var client = sql();
	client.query("SELECT * FROM `tracks` WHERE jamid = ? AND id = ?",
		[obj.jamid, obj.trackid],
		function(err, results) {
			if (err) {
				client.end();
				logger.error(`Error looking up track to delete it: ${JSON.stringify(err)}`);
				callback(err);
			} else {
				if (results.length !== 1) {
					callback({message: `Jam #${obj.jamid} and track #${obj.trackid} has more than one result!`});
				} else {
					var fullPath = `public/${results[0].path}`;
					BINKS3.deleteObject(fullPath, function(s3Err, results) {
						if (s3Err) {
							callback(s3Err);
						} else {
							logger.debug(`Successfully deleted ${fullPath}...`);
							client.query("DELETE FROM `tracks` WHERE jamid = ? AND id = ?",
								[obj.jamid, obj.trackid],
								function(err, result)
								{
									client.end();
									callback(err);
							}); //SQL: delete dbtrack query
						} //no S3 errors
					}) //delete S3 object callback
				} //exactly one track was found
			} //no errors looking up the track
		}) //SQL: lookup track info
} //removeTrack

Processing.prototype.deletePic = function(obj, callback) {
	logger.debug(`Removing pic ${obj.picid} from jam ${obj.jamid}`);
	var client = sql();
	client.query("SELECT * FROM `pictures` WHERE jamid = ? AND id = ?",
		[obj.jamid, obj.picid],
		function(err, results) {
			if (err) {
				client.end();
				logger.error(`Error looking up pic to delete it: ${JSON.stringify(err)}`);
				callback(err);
			} else {
				if (results.length !== 1) {
					callback({message: `Jam #${obj.jamid} and track #${obj.picid} has <> one result!`});
				} else {
					var fullPath = `public/pics/${obj.jamid}/${results[0].filename}`;
					BINKS3.deleteObject(fullPath, function(s3Err, results) {
						if (s3Err) {
							callback(s3Err);
						} else {
							logger.debug(`Successfully deleted ${fullPath} from S3; now removing from db...`);
							client.query("DELETE FROM `pictures` WHERE jamid = ? AND id = ?",
								[obj.jamid, obj.picid],
								function(err, result)
								{
									if (err) {
										logger.error(`SQL Error when deleting pic ${obj.picid} from jam ${obj.jamid}: ${JSON.stringify(err)}`);
										callback(err);
									} else {
										logger.debug(`Successfully deleted pic ${obj.picid} from jam ${obj.jamid}!`);
										callback(null, result);
									}
									client.end();

							}); //SQL: delete dbtrack query
						} //no S3 errors
					}) //delete S3 object callback
				} //exactly one track was found
			} //no errors looking up the track
		}) //SQL: lookup track info
} //removeTrack

Processing.prototype.removeStaffEntirely = function (obj, callback) {
	var client = sql();
	client.query("DELETE FROM `productiononcollection` WHERE jamid = ? AND staffid = ?",
		[obj.jamid, obj.staffid],
		function(err, result)
		{
			client.end();
			callback(err);
	});
}

Processing.prototype.addStaffToJam = function (obj, callback) {
	var client = sql();
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

Processing.prototype.editEntity = function(type, data, topcb) {
	var client = sql();

	if (Object.keys(entityTypeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to create an unsupported entity type: ${type}`)
		callback({message: `${type} is not a legal BINK type.`});
	} else if (! data.hasOwnProperty('id')) {
		logger.warn(`Somebody tried to update an entity without passing an id. The entity: ${JSON.stringify(data)}`);
		callback({message: `Entities must have an id.`});
	} else {
		var setClause = "name = ?";
		var params = [];
		params.push(data.name);
		if (type === "locations") {
			setClause += ", link = ?, address = ?, lat = ?, lon = ?";
			params.push(data.link);
			params.push(data.address);
			params.push(data.lat);
			params.push(data.lon);
		} else if (type === "bands" || type == "musicians") {
			setClause += ", link = ?";
			params.push(data.link);
		}
		params.push(data.id);

		logger.debug(`Type: ${type}`);
		logger.debug(`setClause: ${setClause}`);
		logger.debug(`params: ${JSON.stringify(params)}`);

		var query = `UPDATE ${type} SET ${setClause} WHERE id = ?`;
		logger.debug(`Query: ${query}`);

		client.query(query, params,
		function(sqlerr, result) {
			if (sqlerr) {
				logger.error(`Prototype.editEntity.sqlerr: ${sqlerr}`);
				topcb({message: `Database when updating entity.`});
			} else {
				topcb(null, result);
			}
		});
	}
}

Processing.prototype.createEntity = function (type, incomingName, callback) {
	var client = sql();

	if (Object.keys(entityTypeMap).indexOf(type) == -1)
	{
		logger.warn(`Somebody tried to create an unsupported entity type: ${type}`)
		callback({message: `${type} is not a legal BINK type.`});
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

Processing.prototype.matchEntityToJams = function(limit, offset, admin, type, id, order, query, topcb) {
	var that = this;
	var toRet = {};
	
	if (! limit || limit === null)
		limit = 10;
	
	if (! offset || offset === null)
		offset = 0;

	var whereClause = "private = 0 ";
	if (admin)
		whereClause = "(private = 0 or private = 1) ";

	logger.debug(`Deterined whereClause: ${whereClause}`)

	var tableName, innerWhereClause;
	if (type === "musicians") {
		tableName = "musiciansoncollection";
		// whereClause += `and jams.id = musiciansoncollection.jamid and musiciansoncollection.musicianid = ?`
		innerWhereClause = `musiciansoncollection.musicianid = ?`
	}
	else if (type === "staff") {
		tableName = "productiononcollection";
		// whereClause += `and jams.id = productiononcollection.jamid and productiononcollection.staffid = ?`
		innerWhereClause = `productiononcollection.staffid = ?`
	}
	else if (type) {
		logger.error(`[Processing.matchEntityToJams]: The type ${type} was defined but not one we know and didn't get filtered out previously.`)
		topcb(new Error(`We cannot process type ${type}`));
		return;
	}

	logger.debug(`whereClause after type: ${whereClause}`)

	var orderBy = "desc";
	if (order === "asc")
		orderBy = "asc";

	logger.debug(`Determined orderBy: ${orderBy}`)

	var search, paramArray, whereClause;

	if (query) {
		search = `%${query}%`;
		logger.debug(`Search active. Query is ${search}`)
		whereClause = `${whereClause} and title like(?) `;
		if (tableName) {
			logger.debug(`tableName is set and so is search, so params will be id, search, offset, limit, id, search`);
			paramArray = [id, search, offset, limit, id, search]
		} else {
			logger.debug(`tableName is NOT set and so is search, so params will be search, offset, limit, search`);
			paramArray = [search, offset, limit, search];
		}
	} else {
		if (tableName) {
			logger.debug(`tableName is set and but search is not, so params will be id, offset, limit, id`);
			paramArray = [id, offset, limit, id];
		} else {
			logger.debug(`tableName and search are not set so params will be limit, offset`);
			paramArray = [offset, limit];
		}
	}

	var query = `SELECT * FROM jams WHERE jams.id in (select distinct jamid from ${tableName} where ${innerWhereClause}) and ${whereClause} order by date ${orderBy} limit ?,?; ` +
							 `SELECT COUNT(*) FROM jams WHERE jams.id in (select distinct jamid from ${tableName} where ${innerWhereClause}) and ${whereClause};`;

	logger.debug(`SQL query: ${query}, paramArray: ${JSON.stringify(paramArray)}`)
	var client = sql();
	client.query(query,
		paramArray, function (sqlerr, data) {
			  if (sqlerr) {
				  logger.error("[ERR api.js matchEntityToJams] client.query: " + sqlerr)
				  topcb(err);
				  client.end();
			  } else {
				  async.forEach(data[0], function(thisjam, mainCallback) {
						async.series([
						    function(callback)
						    {
						    	that.getBand(thisjam, callback)
						    },
						    function(callback)
						    {
						    	that.getLocation(thisjam, callback)
						    },
						    function(callback)
						    {
						    	that.hasTracks(thisjam, callback)
						    },
						    function(callback)
						    {
						    	that.hasVids(thisjam, callback)
						    },
						    function(callback)
						    {
						    	that.hasPics(thisjam, callback)
						    }
						],
				function (err, results) {
					mainCallback(err, results)
				})
		  }, function (processingerr) { //got everything, return now
				client.end();
			  if (processingerr) {
					logger.error(`Error while processing results: ${JSON.stringify(processingerr)}`)
					topcb(processingerr);
				} else {
					toRet.rows = data[0];
					toRet.total = data[1][0]["COUNT(*)"];
					topcb(null, toRet);
				} //else no issue with jam processing
		  }) //jams are done
  	} //else top level database was successful
	}) //main query
} // match entity to jam

Processing.prototype.getGeoCordinates = function(topcb) {
	var client = sql();
	var toRet = [];

	client.query(`SELECT * FROM locations WHERE lat > 0 AND lat < 0 AND lon > 0 OR lon < 0`, function(err, rows) {
		client.end();
		if (err) {
			logger.error(`[Processing.getGeoCordinates]: ${err}`);
			topcb(err);
		} else {
			if (rows.length > 0) {
				async.each(rows, function(thisrow, rowcb) {
					var thisposition = {
						id: parseInt(thisrow.id),
						lat: parseFloat(thisrow.lat),
						lng: parseFloat(thisrow.lon)
					}

					toRet.push(thisposition);
					rowcb();
				}, function(eacherr) {
					if (eacherr) {
						logger.error(`Processing.geoCoordinates.eacherr: ${eacherr}`);
					}
					topcb(eacherr, toRet);
				})
			} else {
				topcb(null, toRet);
			}
		}
	})
}

Processing.prototype.searchJamsTable = function(limit, offset, admin, type, id, order, query, topcb) {
	var that = this;
	var toRet = {};
	
	if (! limit || limit === null)
		limit = 10;
	
	if (! offset || offset === null)
		offset = 0;

	var numTracks = `(select tracks.id from tracks where tracks.jamid = jams.id limit 0,1) as hasTracks`;
	var numPics = `(select pictures.id from pictures where pictures.jamid = jams.id limit 0,1) as hasPics`;
	var numVids = `(select video.id from video where video.jamid = jams.id limit 0,1) as hasVids`;

	var whereClause = "private = 0 ";
	if (admin)
		whereClause = "(private = 0 or private = 1) ";

	logger.debug(`Deterined whereClause: ${whereClause}`)

	var columnName = null;
	if (type === "locations")
		columnName = "locid";
	else if (type === "bands")
		columnName = "bandid";
	else if (type) {
		topcb(new Error(`Type was set to ${type}, but that's not something we search on!`));
	}

	if (columnName)
		whereClause += ` and ${columnName} = ?`;

	logger.debug(`whereClause after type: ${whereClause}`)

	var orderBy = "desc";
	if (order === "asc")
		orderBy = "asc";

	logger.debug(`Determined orderBy: ${orderBy}`)

	var search, paramArray;

	if (query) {
		search = `%${query}%`;
		logger.debug(`Search active. Query is ${search}`)
		whereClause = `${whereClause} and title like(?) `;
		if (columnName) {
			logger.debug(`Search active and column is set. Params will be id, search, offset, limit, id, search.`);
			paramArray = [id, search, offset, limit, id, search]
		} else {
			logger.debug(`Search active but not column set. Params will be search, offset, limit, search.`);
			paramArray = [search, offset, limit, search];
		}
	} else {
		if (columnName) {
			logger.debug(`Search not active, but column set. Params will be id, offset, limit, id.`);
			paramArray = [id, offset, limit, id];
		} else {
			logger.debug(`Search not active and column not set. Params will be offset, limit.`);
			paramArray = [offset, limit];
		}
	}

	var query = `SELECT *, ${numPics}, ${numTracks}, ${numVids} FROM jams WHERE ${whereClause} order by date ${orderBy} limit ?,?;` +
							`SELECT COUNT(*) FROM jams WHERE ${whereClause};`;

	logger.debug(`SQL query: ${query}; parameters: ${JSON.stringify(paramArray)}`)
	var client = sql();
	client.query(query, paramArray, function (sqlerr, data) {
		client.end();
	  if (sqlerr) {
		  logger.error("[Processing.searchJamsTable] client.query: " + sqlerr)
		  topcb(err);
	  } else {
		  async.forEach(data[0], function(thisjam, mainCallback) {
				async.series([
				    function(callback)
				    {
				    	that.getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	that.getLocation(thisjam, callback)
				    },
				    function(callback)
				    {
						callback();
				    	// that.hasTracks(thisjam, callback)
				    },
				    function(callback)
				    {
						callback();
				    	// that.hasVids(thisjam, callback)
				    },
				    function(callback)
				    {
						callback();
				    	// that.hasPics(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback(err, results);
				})
		  }, function (err) { //got everything; can return
			  if (err) {
					logger.error(`Processing.searchJamsTable jamcallback: ${JSON.stringify(err)}`)
					topcb(err);
				} else {
					toRet.rows = data[0];
					logger.debug(`The total: ${JSON.stringify(data[1])}`);
					toRet.total = data[1][0]["COUNT(*)"];
					topcb(null, toRet);
				} //no error grabbing results
		  }) //for each
		} //else top level query was succesful
	}) //client.query
} //searchJamsTable

Processing.prototype.getEntity = function (type, id, callback) {
	var client = sql();
	client.query(`SELECT * from ${type} where id = ?`,
		[id],
		function(err, rows, fields) {
		client.end();
		if (err) { //error while getting the item
			logger.error(`Error while retrieving a ${type}: ${err}`)
			callback({message: `Error while retrieving a ${type}, ${err}`})
		}
		else //no error
		{
			if (rows.length === 1) { //there is something in the array, return it
				var entity = rows[0];
				entity.type = type;
				entity.displayType = entityTypeMap[type];
				callback(null, entity);
			} else if (rows.length === 0) {
				logger.error(`Could not find ${type} with id ${id}`);
				callback({message: `Could not find ${type} with id ${id}`});
			} else {
				logger.error(`More than one ${type} matches ID ${id}`);
				callback({message: `More than one ${type} matches ID ${id}`});
			}
		}
	})
}

Processing.prototype.searchAllEntities = function (queryobject, callback) {
	var toRet = {};
	var limit = 10;
	var offset = 0;

	if (queryobject.limit != "" && queryobject.limit != null) 	{
		limit = parseInt(queryobject.limit)
	}
	if (queryobject.offset != "" && queryobject.offset != null) {
		offset = parseInt(queryobject.offset)
	}
	logger.debug(`Determined offset: ${offset}, and limit: ${limit}`);

	var orderBy = "desc";
	if (queryobject.order === "asc")
		orderBy = "asc";

	logger.debug(`Determined orderBy: ${orderBy}`)
	
	var client = sql();
	var sqlquery = client.query(
			//counts the total results in first query;
			`select count(*) as count from` +
			`(select id from bands where name like ? union all ` +
			`select id from locations where name like ? union all ` +
			`select id from musicians where name like ? union all ` +
			`select id from staff where name like ? union all ` +
			`select id from roles where name like ? union all ` +
			`select id from instruments where name like ?) x;` +
			
			//actually grab the names, types. limit the results and sort.
			`(select id, name, 'bands' as type from bands where name like ? union all ` +
			`select id, name, 'locations' from locations where name like ? union all ` +
			`select id, name, 'musicians' from musicians where name like ? union all ` +
			`select id, name, 'staff' from staff where name like ? union all ` + 
			`select id, name, 'roles' from roles where name like ? union all ` +
			`select id, name, 'instruments' from instruments where name like ?) order by name ${orderBy} limit ?, ?`,
		[
		//the query string is the same for all first six tables 
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		
		//same query string on the actual data query
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,
		`%${queryobject.search}%`,

		//this time we limit and offset
		offset,
		limit],
		function(err, data, fields) {
			logger.debug(`${JSON.stringify(data)}`);
			client.end();
			if (err) //error while getting the item
			{
				logger.error(`[err.entitites.all.query] Error while searching all entitities with query ${queryobject.search}: ${err}`)
				callback({message: `Error while searching all entities with query ${queryobject.search}: ${err}`})
			} else { //no error
				toRet.total = data[0][0].count;
				toRet.rows = data[1];
				logger.debug(`[err.entities.all.result] ${JSON.stringify(toRet)}`);
				callback(null, toRet);
			}
	})
}

Processing.prototype.searchEntityType = function (type, query, callback) {
	if (Object.keys(entityTypeMap).indexOf(type) == -1) {
		logger.warn(`Somebody tried to search for an unusual entity: ${type}`)
		callback({message: `${type} is not a legal BINK type.`});
	} else {
		var client = sql();
		var query = client.query(`SELECT * from ${type} where name like ?`,
			[`%${query.q}%`],
			function(err, rows, fields) {
			client.end()
			if (err) //error while getting the item
			{
				logger.error(`Error while searching ${type}s with query ${query.q}: ${err}`)
				callback({message: `Error while searching ${type}s with query ${query.q}: ${err}`})
			} else { //no error
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
	var client = sql();
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
	var client = sql();
	var jamMusicians = [];
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
				var found = false
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
	var client = sql();
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
			})
		}, function(callback) {
			client.query("DELETE FROM jams WHERE id = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted jam ${deleteid} from the table...`);
					callback(null, result);
				}
			})
		}, function(callback) {
			client.query("DELETE FROM musiciansoncollection WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting musicians for jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted all musicians from the table for jam ${deleteid}...`);
					callback(null, result);
				}
			})
		}, function(callback) {
			client.query("DELETE FROM productiononcollection WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting staff for jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted all staff from the table for jam ${deleteid}...`);
					callback(null, result);
				}
			})
		}, function(callback) {
			client.query("DELETE FROM tracks WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting tracks for jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted all tracks from the table for jam ${deleteid}...`);
					callback(null, result);
				}
			})
		}, function(callback) {
			client.query("DELETE FROM pictures WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting tracks for jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted all pictures from the table for jam ${deleteid}...`);
					callback(null, result);
				}
			})
		}, function(callback) {
			client.query("DELETE FROM video WHERE jamid = ?", [deleteid], function(err, result) {
				if (err) {
					logger.error(`Error when deleting videos for jam #${deleteid}: ${err}`);
					callback(err);
				} else {
					logger.debug(`Successfully deleted all videos from the table for jam ${deleteid}...`);
					callback(null, result);
				}
			})
		}
	], function(err, results) {
		client.end()
		topcallback(err, results);
	})
}

Processing.prototype.getAdminJamTracks = function(jamid, overallCallback)
{
	var client = sql();
	var mytracks = []
	client.query("SELECT * from tracks where jamid = ? order by num asc", [jamid],
		function(err, tracks, fields) {
		client.end();
		if (err) {
			logger.error(`Admin gets tracks for jam ${thisjam.id}: ${err}`);
			overallCallback(err)
		} else {
			async.forEach(tracks, function(thisTrack, trackCallback) {
				var track = {
					id: thisTrack.id,
					title: thisTrack.title,
					num: thisTrack.num,
					path: settings.s3.public_base_url + thisTrack.path,
					notes: thisTrack.notes
				}
				mytracks.push(track)
				trackCallback()
			}, function (err, results) {
				overallCallback(null, mytracks)
			}) //async
		} //else
	}) //query
}

Processing.prototype.getAdminJamVideos = function(jamid, overallCallback)
{
	var client = sql();
	var myvids = []
	client.query("SELECT * from video where jamid = ? order by num asc", [jamid],
		function(err, vids, fields) {
		client.end();
		if (err) {
			logger.error(`Error for admin grabs videos for jam #${thisjam.id}: ${err}`);
			overallCallback(err)
		} else {
			async.forEach(vids, function(thisvid, trackCallback) {
				var newvid = {
					id: thisvid.id,
					title: thisvid.title,
					num: thisvid.num,
					path: settings.s3.public_base_url + thisvid.path,
					notes: thisvid.notes
				}
				myvids.push(newvid)
				trackCallback()
			}, function (err, results) {
				overallCallback(null, myvids)
			}) //async
		} //else
	}) //query
}

Processing.prototype.removeVideo = function(obj, callback) {
	logger.debug(`Removing video ${obj.vidid} from jam ${obj.jamid}`);
	var client = sql();
	client.query("SELECT * FROM `video` WHERE jamid = ? AND id = ?",
		[obj.jamid, obj.vidid],
		function(err, results) {
			if (err) {
				client.end();
				logger.error(`Error looking up video to delete it: ${JSON.stringify(err)}`);
				callback(err);
			} else {
				if (results.length !== 1) {
					callback({message: `Jam #${obj.jamid} and video #${obj.vidid} has <> one result!`});
				} else {
					console.log(`Trying to delete this video: ${JSON.stringify(results)}`);
					var fullPath = `public/${results[0].path}`;
					BINKS3.deleteObject(fullPath, function(s3Err, results) {
						if (s3Err) {
							callback(s3Err);
						} else {
							logger.debug(`Successfully deleted ${fullPath}...`);
							client.query("DELETE FROM `video` WHERE jamid = ? AND id = ?",
								[obj.jamid, obj.vidid],
								function(err, result)
								{
									client.end();
									callback(err);
							}); //SQL: delete dbtrack query
						} //no S3 errors
					}) //delete S3 object callback
				} //exactly one track was found
			} //no errors looking up the track
		}) //SQL: lookup track info
} //removeTrack

Processing.prototype.updateVid = function(obj, callback) {
	var client = sql();
	logger.debug(`Request to update video ${obj.vidid} in jam ${obj.jamid} to title '${obj.title}'`);
	client.query("UPDATE video SET title = ?, notes = ? WHERE id = ? AND jamid = ?",
		[obj.title, obj.notes, obj.vidid, obj.jamid],
		function(err, result) {
		client.end();
		if (err) {
			logger.error(`Error updating video ${obj.vidid} in jam ${obj.jamid}: ${JSON.stringify(err)}`);
			callback(err);
		} else {
			callback(null, result);
		}
	})
}

Processing.prototype.getJamTracks = function(thisjam, overallCallback)
{
	var client = sql();
	var mytracks = []
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
				var track = {
					id: thisTrack.id,
					num: thisTrack.num,
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
	var client = sql();
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
	var client = sql();
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
	var client = sql();
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
	var client = sql();
	var jamStaff = []
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
				 var found = false
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
						 var newStaff = {
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
	var client = sql();
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
				for (var j=0;j<vids.length;j++)
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
	if (thisjam.hasOwnProperty('defpic') && thisjam.defpic !== null) { //is it even set and non-null?
		logger.debug(`defpic for jam ${thisjam.id} is defined.`);
		if (thisjam.defpic === -1) { //is it set to -1?
			logger.debug(`defpic for jam ${thisjam.id} is -1 so that's not an actual picture`)
			thisjam.defpic = null; //yes? we can set it as null and skip the db query
			callback();
		} else if (typeof thisjam.defpic === "object") { //is it an object?
			logger.debug(`defpic for ${thisjam.id} is set, so we're leaving it alone.`)
			callback(); // if so, it's probably already set, so let's just skip it
		} else if (typeof thisjam.defpic === "number") { //is it a number?
			logger.debug(`defpic for ${thisjam.id} is the number ${thisjam.defpic}, so we're gonna look that up.`);
			var client = sql(); //ok, time to use the database and lookup the pic associated with that number
			client.query("SELECT * from pictures where id = ?", [thisjam.defpic],
			function(err, rows, fields) {
			client.end()
			if (err) {//error while getting the item
				logger.error(`Error when getting the default pic for jam ${thisjam.id}: ${err}`);
				callback(err)
			} else { //no error
				if (rows.length > 0) { //there is something in the array, return it
					logger.debug(`For jam ${thisjam.id} we looked up ${thisjam.defpic}; and are returning it.`);
					thisjam.defpic = rows[0]
					thisjam.defpic.path = settings.s3.public_base_url + "pics/" + thisjam.id + "/" + thisjam.defpic.filename
					callback();
				} else { //nothing in the array, return null
					logger.warn(`Jam ID ${thisjam.id} has defpic set to ${thisjam.defpic}, which is not actually a picture we know about.`);
					thisjam.defpic = null
					callback()
				}
			} //else
		}) //query
		}
	} else { //is it not even defined or maybe null?
		logger.debug(`jam ${thisjam.id} defpic is not even defined, so we're just returning null.`);
		thisjam.defpic = null; //if so, we can just skip the db query and just return null
		callback();
	}
} //function

Processing.prototype.getLocation = function(thisjam, callback)
{
	var client = sql();
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
	var client = sql();
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

Processing.prototype.getJamPictures = function(thisjam, topcb) {
	var client = sql();
	client.query("SELECT pictures.id, pictures.filename, pictures.jamid, jams.date FROM pictures LEFT JOIN jams ON jams.defpic = pictures.id WHERE jamid = ?", [thisjam.id],
	function(err, rows) {
		client.end();
		if (err) {
			logger.error(`Error populating the pictures for jam ${thisjam.id}: ${JSON.stringify(err)}`);
			topcb(err);
		} else {
			thisjam.pictures = [];
			if (rows.length > 0) {
				async.each(rows, function(thisrow, rowcb) {
					logger.debug(`Processing row: ${JSON.stringify(thisrow)}`);
					var thispic = {
						id: thisrow.id,
						filename: thisrow.filename,
						jamid: thisrow.jamid,
						path: `${settings.s3.public_base_url}pics/${thisrow.jamid}/${thisrow.filename}`,
						defpic: false
					};
					if (thisrow.date)
						thispic.defpic = true;
					thisjam.pictures.push(thispic);
					rowcb();
				}, function(err) {
					topcb(err);
				})
			} else {
				topcb();
			}
		}
	})
}

module.exports = new Processing();
