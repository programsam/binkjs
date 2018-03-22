let twitter		= require('twitter')
let express 	= require('express')
let bodyParser 	= require('body-parser')
let mysql		= require('mysql');
let async		= require('async');
let settings	= require('../settings.json')
let Processing 	= require("./processing.js")
let packagejson = require('../package');

let views = express.Router()

views.use(bodyParser.json())


function sql() {
	return client = mysql.createConnection(settings.mysql);
}

views.get('/views/entity/:type/:id', function(req, res) {
	let onlyPublic = "and private = 0"
	if (req.admin) {
		onlyPublic = "true";
	}
	Processing.getEntity(req.params.type, req.params.id, onlyPublic, function(err, result) {
		if (err) {
			res.status(500).json({message:"Error looking up ${type} with id ${id}: ${err}"})
		} else {
			res.render('entity', result);
		}
	})
})

views.get('/views/browse', function(req, res) {
	res.render('browse');
})

views.get('/views/jam/:id', function(req, res) {
	var client = sql();
	var onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query('SELECT * from jams where ' + onlyPublic + 'id = ?', [req.params.id],
		function(err, rows) {
		if (err)
		{
			console.log("ERROR: " + err)
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
				    	res.render('jam', {jam: thisjam});
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

views.get('/', function(req, res) {
	res.render('index', {version: packagejson.version})
})

views.get('/views/admin/dropdown', function(req, res) {
	res.render('admin/dropdown', {})
})

views.get('/views/loginAlert', function(req, res) {
	res.render('loginAlert', {});
})

views.get('/views/history', function(req, res) {
	var client = sql();
	var d = new Date();
	var sqlMonth = ('00' + (d.getUTCMonth() + 1)).slice(-2)
	var sqlDate = ('00' + (d.getUTCDate())).slice(-2)
	var onlyPublic = "private = 0 and "
	if (req.session.admin)
		onlyPublic = ""
	client.query("SELECT * from jams where " + onlyPublic + " date like ('%-" + sqlMonth + "-" + sqlDate + "')",
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
					console.log(`Historic jams; I'm rendering: ${JSON.stringify(rows)}`)
					res.render('jams', {jams:rows})
				  client.end()
				}
				) //jams are done
			}
			else //nothing in the array, return an empty array
			{
				res.render('jams', {jams:rows})
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
		  console.log("ERROR Getting recent jams: " + err)
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