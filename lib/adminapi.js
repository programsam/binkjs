let express 	= require('express')
let bodyParser 	= require('body-parser')
let mysql		= require('mysql');
let async		= require('async');
let settings	= require('../settings.json')
let Processing 	= require("./processing.js")

let adminapi = express.Router()

adminapi.use(bodyParser.json())

function sql() {
	return client = mysql.createConnection(settings.mysql);
}

function authenticated(req, res, next) {
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}

adminapi.post('/admin/login', function(req, res) {
	if (req.body.password == settings.admin_password)
	{
		req.session.admin = true
		res.send(JSON.stringify({valid: true}));
	}
	else
	{
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

adminapi.post('/admin/jam', authenticated, function(req, res) {
	let client = sql();
	let now = new Date();
	let todaysdate = now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate();
	client.query("INSERT INTO `jams` (private,date,title,notes) VALUES (?,?,?,?)",
		['1',todaysdate,'New Jam','Details about this jam'],
		function(err, result)
		{
			if (err) {
				res.status(500).send("Error while creating jam: " + JSON.stringify(err));
			}
			else {
				res.json(result);
			}
		});
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

module.exports = adminapi
