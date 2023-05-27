const path				= require('path');
const express 		= require('express');
const session 		= require('express-session');
const MySQLStore 	= require('express-mysql-session')(session);
const uuid				= require('node-uuid');
const app 				= express();
const mysql				= require('mysql');
const async				= require('async');
const bodyParser 	= require('body-parser');
const pug					= require('pug');
const Processing 	= require("./lib/processing.js");
const BINKS3			= require("./lib/binks3.js");
const api					= require("./lib/api.js");
const adminapi		= require("./lib/adminapi.js");
const views				= require("./lib/views.js");
const podcastFeed	= require("./lib/podcastFeed.js");
const makeLogger  = require("./lib/loggerfactory.js");
const helmet 			= require('helmet');
const robots 			= require('express-robots');

let settings = require('./settings');

settings.mysql.multipleStatements = true;

const logger = makeLogger(path.basename(__filename));

Processing.testSQL(function(err) {
	if (err) {
		logger.error(`There was an error connecting to the backend database. BINK will now exit.`);
		process.exit(1);
	} else {
		logger.info(`Successfully connected to the backend database.`);
	}
})

BINKS3.testConnection(function(err, result) {
	if (err) {
		logger.error(`There was an error connecting to BINK's Media Bucket! Some functions may not work properly...`);
	} else {
		logger.info(`Successfully connected to BINK's Media Bucket!`);
	}
})

app.set('trust proxy', 1) // trust first proxy

let sessionstore = new MySQLStore(settings.mysql);

app.use(session({
  secret: settings.session_secret,
  resave: false,
	store: sessionstore,
  saveUninitialized: true,
  cookie: settings.cookie
}))

const webLogger = makeLogger('req');
app.use(function(req, res, next) {
	webLogger.info(`${req.method} ${req.path}`)
	next();
});

app.use(helmet());

app.use(robots({UserAgent: '*', Disallow: '/'}));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.set('view engine','pug');

app.use(api);
app.use(adminapi);
app.use(views);
app.use(podcastFeed);

let server = app.listen(process.env.PORT || 3001, function () {

  let host = server.address().address
  let port = server.address().port

  logger.info(`BINK.js is up and listening on port ${port}...`);

})
