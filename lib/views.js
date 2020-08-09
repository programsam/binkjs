const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const mysql		= require('mysql');
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson = require('../package');

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

let views = express.Router()

views.use(bodyParser.json())

function authenticated(req, res, next) {
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}


function sql() {
	return client = mysql.createConnection(settings.mysql);
}

views.get('/views/entity/:type/:id', function(req, res) {
	let onlyPublic = "and private = 0"
	if (req.admin) {
		onlyPublic = "true";
	}
	Processing.getEntity(req.params.type, req.params.id, function(err, result) {
		if (err) {
			res.status(500).json({message:"Error looking up ${type} with id ${id}: ${err}"})
		} else {
			res.render('entity', result);
		}
	})
})

views.get('/views/infowindow/:id', function(req, res) {
	let onlyPublic = "and private = 0"
	if (req.admin) {
		onlyPublic = "true";
	}
	Processing.getEntity('locations', req.params.id, function(err, result) {
		if (err) {
			res.status(500).json({message:"Error looking up location for infowindow with id ${id}: ${err}"})
		} else {
			res.render('infowindow', result);
		}
	})
})

views.get('/views/browse', function(req, res) {
	res.render('browse');
})

views.get('/views/jam/:id', function(req, res) {
	let client = sql();
	let onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams where ' + onlyPublic + 'id = ?', [req.params.id],
		function(err, rows) {
		if (err)
		{
			logger.error(`Getting the view for jam ${req.params.id}: ${err}`);
			client.end()
		}
		else
		{
			if (rows.length == 1)
			{
				thisjam = rows[0]
				async.series([
						function(callback)
						{
							let d = new Date(thisjam.date);
							thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
							callback();
						},
				    function(callback)
				    {
				    	Processing.getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getLocation(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamMusicians(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamStaff(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamTracks(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamPictures(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamVideos(thisjam, callback)
				    },
				    function(callback)
				    {
				    	res.render('jam', {jam: thisjam, admin: req.session.admin});
				    	client.end()
				    	callback()
				    }
				]) //series
			}//there is one item
			else
			{
				res.status(404).send("This item was not found in BINK!")
			}
		}
	})//outer client.query
})

views.get('/views/jam/:id/edit/musicians', authenticated, function(req, res) {
	loadJamAndThen(req.params.id, function(err, thisjam) {
		if (err) {
			res.status(404).end(`There was a problem loading the edit musicians view for this jam: ${err}`)
		} else {
			res.render('editMusicians', {jam: thisjam, admin: req.session.admin});
		}
	})
})

views.get('/views/jam/:id/edit/staff', authenticated, function(req, res) {
	loadJamAndThen(req.params.id, function(err, thisjam) {
		if (err) {
			res.status(404).end(`There was a problem loading the edit staff view for this jam: ${err}`)
		} else {
			res.render('editStaff', {jam: thisjam, admin: req.session.admin});
		}
	})
})

views.get('/views/jam/edit/:id', authenticated, function(req, res) {
	loadJamAndThen(req.params.id, function(err, thisjam) {
		if (err) {
			res.status(404).end(`There was a problem editing this jam: ${err}`)
		} else {
			res.render('editJam', {jam: thisjam, admin: req.session.admin});
		}
	})
})

function loadJamAndThen(id, callbackWhenDone) {
	let client = sql();
	client.query('SELECT * from jams where id = ?', [id],
		function(err, rows) {
		if (err)
		{
			logger.error(`Getting the edit view for jam ${req.params.id}: ${err}`);
			client.end()
		}
		else
		{
			if (rows.length == 1)
			{
				thisjam = rows[0]
				async.series([
						function(callback)
						{
							let d = new Date(thisjam.date);
							thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
							callback();
						},
				    function(callback)
				    {
				    	Processing.getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getLocation(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamMusicians(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamStaff(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamTracks(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamPictures(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getJamVideos(thisjam, callback)
				    },
				    function(callback)
				    {
				    	client.end()
							callbackWhenDone(null, thisjam)
				    }
				]) //series
			}//there is one item
			else
			{
				callbackWhenDone(new Error('This jam was not found in BINK!'))
			}
		}
	})//outer client.query
}


views.get('/views/scriptHolders/bootstrapTable', function(req, res) {
	res.render('scriptHolders/bootstrapTable', {})
})

views.get('/views/scriptHolders/tempusDominus', function(req, res) {
	res.render('scriptHolders/tempusDominus', {})
})

views.get('/views/scriptHolders/bootstrapAutocomplete', function(req, res) {
	res.render('scriptHolders/bootstrapAutocomplete', {})
})

views.get('/', function(req, res) {
	res.render('index', {version: packagejson.version})
})

views.get('/views/admin/dropdown', function(req, res) {
	res.render('admin/dropdown', {})
})

views.get('/views/loginModal', function(req, res) {
	res.render('loginModal', {});
})

views.get('/admin/confirmModal', function(req, res) {
	res.render('confirmModal', {});
})

views.get('/views/history', function(req, res) {
	let client = sql();
	let d = new Date();
	let sqlMonth = ('00' + (d.getUTCMonth() + 1)).slice(-2)
	let sqlDate = ('00' + (d.getUTCDate())).slice(-2)
	let onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query("SELECT * from jams where " + onlyPublic + " date like ('%-" + sqlMonth + "-" + sqlDate + "')",
		function(err, rows, fields) {
		if (err) //error while getting the item
		{
			logger.error(`Getting the historical views: ${err}`);
			client.end()
		}
		else //no error
		{
			if (rows.length > 0) //there is something in the array, return it
			{
				async.forEach(rows, function(thisjam, mainCallback) {
					async.series([
							function(callback)
							{
								let d = new Date(thisjam.date);
								thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
								callback();
							},
							function(callback)
							{
								Processing.getBand(thisjam, callback)
							},
							function(callback)
							{
								Processing.getLocation(thisjam, callback)
							},
							function(callback)
							{
								Processing.getDefPic(thisjam, callback)
							}
					],
					function (err, results) {
						mainCallback()
					})
				}, //got everything, return now
				function (err)
				{
					res.render('jams', {jams:rows, history:true})
				  client.end()
				}
				) //jams are done
			}
			else //nothing in the array, return an empty array
			{
				res.render('jams', {jams:rows, history: true})
				client.end()
			}
		} //else
	}) //query
})

views.get('/views/recent', function (req, res) {
	let client = sql();
	let onlyPublic = "where private = 0"
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams ' + onlyPublic + ' order by date desc limit 0,20', function(err, jams, fields) {
	  if (err)
	  {
		  logger.error(`Getting the recent jams: ${err}`);
		  res.status(500).end()
		  client.end()
	  }
	  else
	  {
		  async.forEach(jams, function(thisjam, mainCallback) {
				async.series([
						function(callback)
						{
							let d = new Date(thisjam.date);
							thisjam.mydate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
							callback();
						},
				    function(callback)
				    {
				    	Processing.getBand(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getLocation(thisjam, callback)
				    },
				    function(callback)
				    {
				    	Processing.getDefPic(thisjam, callback)
				    }
				],
				function (err, results) {
					mainCallback()
				})
		  }, //got everything, return now
		  function (err)
			  {
					res.render('jams', {jams:jams})
				  client.end()
			  }
		  ) //jams are done
	  	} //else the database command was successful
	  })//client.query
}) //get /recent

module.exports = views;
