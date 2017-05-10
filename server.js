var express 	= require('express')
var session 	= require('express-session')
var uuid		= require('node-uuid')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var bodyParser 	= require('body-parser')
var settings	= require('./settings.json')
var twitter		= require('twitter')
var Processing 	= require("./lib/processing.js")
var api			= require("./lib/api.js")
var adminapi	= require("./lib/adminapi.js")

function sql() {
	return client = mysql.createClient(settings.mysql);
}

app.use(session({
  resave: false,
  saveUninitialized: false,
  genid: function(req) {
    return uuid.v4(); // use UUIDs for session IDs
  },
  secret: 'keyboard cat'
}))

app.use(bodyParser.json())

app.use(api)
app.use(adminapi)

/**
 * By default, just load index.html.
 */
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

/**
 * If they want a specific binary file to be sent, they can send /public in the
 * URL. Otherwise, we'll assume it's a specific navigation request or an API call.
 */
app.use(express.static(__dirname + '/public'));

var server = app.listen(process.env.PORT || 3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
