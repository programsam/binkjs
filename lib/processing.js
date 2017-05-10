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

module.exports = new Processing();