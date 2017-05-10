var mysql		= require('mysql');
var async		= require('async');
var settings	= require('../settings.json')

var Processing = function () {};

function sql() {
	return client = mysql.createClient(settings.mysql);
}

Processing.prototype.getJamMusicians = function (thisjam, overallCallback)
{
	var client = sql();
	var mymusicians = []
	client.query("SELECT musiciansoncollection.musicianid as musicianid, musiciansoncollection.jamid, " +
			"musiciansoncollection.instrumentid, " +
			"musicians.name as musicianname, instruments.name as instrumentname " +
			"FROM musiciansoncollection, musicians, " +
			"instruments where instruments.id = musiciansoncollection.instrumentid and musicians.id = " +
			"musicianid and " +
			"musiciansoncollection.jamid = ?", [thisjam.id], function(err, musicians, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(musicians, function(thismusician, mainCallback) {
				 var found = false
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
						 var musician = {"name":thismusician.musicianname,
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

Processing.prototype.getJamTracks = function(thisjam, overallCallback)
{
	var client = sql();
	var mytracks = []
	client.query("SELECT * from tracks where jamid = ? order by num asc", [thisjam.id], 
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			async.forEach(tracks, function(thisTrack, trackCallback) {
				var track = {
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
	var client = sql();
	client.query("SELECT * from tracks where jamid = ?", [thisjam.id], 
		function(err, tracks, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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
	var client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id], 
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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
	var client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id], 
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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
	var client = sql();
	var mystaff = []
	client.query("SELECT productiononcollection.jamid, productiononcollection.staffid as id, " +
				 "productiononcollection.roleid, staff.name as staffname, roles.name as rolename " +  
				 "FROM productiononcollection, staff, roles where staff.id = productiononcollection.staffid " + 
				 "and roles.id = productiononcollection.roleid " +
				 "and jamid = ?", [thisjam.id], 
		function(err, staff, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			overallCallback()
		}
		else
		{
			 async.forEach(staff, function(thisstaff, mainCallback) {
				 var found = false
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
						 var staff = {"name":thisstaff.staffname,
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
	var client = sql();
	client.query("SELECT * from video where jamid = ?", [thisjam.id], 
		function(err, vids, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
			client.end()
			callback()
		}
		else
		{
			client.end()
			if (vids.length > 0)
			{
				for (var j=0;j<vids.length;j++)
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
	
	var client = sql();
	client.query("SELECT * from pictures where id = ?", [thisjam.defpic], 
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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
	var client = sql();
	client.query("SELECT * from locations where id = ?", [thisjam.locid], 
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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
	var client = sql();
	client.query("SELECT * from bands where id = ?", [thisjam.bandid], 
    function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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

Processing.prototype.getJamPictures(thisjam, overallCallback)
{
	var client = sql();
	client.query("SELECT * from pictures where jamid = ?", [thisjam.id], 
		function(err, pics, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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

Processing.prototype.getTotalJams = function(toRet, callback) {
	var client = sql();
	client.query("SELECT COUNT(*) as num from jams where private = 0", 
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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

Processing.prototype.getTotalSearchJams = function(query, toRet, callback) {
	var client = sql();
	client.query("SELECT COUNT(*) as num from jams where private = 0 and title like (?)",
		[query],
		function(err, rows) {
		if (err) //error while getting the item
		{
			console.log("ERROR: " + err)
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