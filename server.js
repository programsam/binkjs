let express 		= require('express');
let session 		= require('express-session');
let MySQLStore 	= require('express-mysql-session')(session);
let uuid				= require('node-uuid');
let app 				= express();
let mysql				= require('mysql');
let async				= require('async');
let bodyParser 	= require('body-parser');
let pug					= require('pug');
let Processing 	= require("./lib/processing.js");
let api					= require("./lib/api.js");
let adminapi		= require("./lib/adminapi.js");
let views				= require("./lib/views.js");
let helmet 			= require('helmet');
let robots 			= require('express-robots');

let settings = require('./settings');

settings.mysql.multipleStatements = true;

function sql() {
	return mysql.createConnection(settings.mysql);
}

let connection = sql();
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

let sessionstore = new MySQLStore(settings.mysql);

app.use(session({
  secret: settings.session_secret,
  resave: false,
	store: sessionstore,
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

let server = app.listen(process.env.PORT || 3001, function () {

  let host = server.address().address
  let port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
