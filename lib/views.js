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
							thisjam.mydate = `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`;
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
							thisjam.mydate = `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`;
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
