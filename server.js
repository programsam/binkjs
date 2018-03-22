var express 	= require('express')
var session 	= require('express-session')
var uuid		= require('node-uuid')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
var bodyParser 	= require('body-parser');
var pug = require('pug');
var settings	= require('./settings.json');
var Processing 	= require("./lib/processing.js");
var api			= require("./lib/api.js");
var adminapi	= require("./lib/adminapi.js");
var views	= require("./lib/views.js");
var helmet = require('helmet');
var robots = require('express-robots');
var app = express();

var settings = require('./settings');

settings.mysql.multipleStatements = true;

function sql() {
	return mysql.createConnection(settings.mysql);
}

var connection = sql();
connection.query('SELECT * FROM jams', function(err, rows) {
	if (err)
	{
		console.log("Issue connecting to database: " + err)
		connection.end();
		process.exit(1);
	}
	else
	{
		console.log("Successfully queried database.")
		connection.end();
	}
});

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: settings.session_secret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: settings.secureCookie }
}))

app.use(helmet());

app.use(robots({UserAgent: '*', Disallow: '/'}));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.set('view engine','pug');

app.use(api);
app.use(adminapi);
app.use(views);

var server = app.listen(process.env.PORT || 3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
