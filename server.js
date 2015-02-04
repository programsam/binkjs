var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var settings	= require('./settings.json')

function sql() {
	return mysql.createClient(settings.mysql);
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.get('/recent', function (req, res) {
	var client = sql();
	client.query('SELECT * from jams order by date desc limit 0,5', function(err, jams, fields) {
	  if (err) throw err;
	  jams.forEach(function(element, index, array) {
	  	if (element.bandid != -1)
	  	{
	  		console.log("Query: " + 'SELECT * from bands where bandid = ' + element.bandid)
	  		client.query('SELECT * from bands where bandid = ' + element.bandid, function(err, bands, fields) {
	  			console.log(JSON.stringify(bands))
	  		})
	  	}
	  })
	  res.send(JSON.stringify(jams))
	});
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
