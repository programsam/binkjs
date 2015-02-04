var express 	= require('express')
var app 		= express()
var mysql		= require('mysql');
var async		= require('async');
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
	  async.forEach(jams, function(thisjam, callback) {
			  if (element.bandid != -1)
			  {
			  	client.query('SELECT * from bands where id = ' + element.bandid, function(err, bands, fields) {
			  		thisjam.band = bands[0]
			  		callback()
			  	})
			  }
			  else
			  {
			  	callback()
			  }
		  },
		  function (callback)
		  {
		  	res.send(JSON.stringify(jams))
		  	callback()
		  })
	  })
	});
})

app.use(express.static(__dirname + '/public'));

var server = app.listen(3001, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BINK.js is listening at http://%s:%s', host, port)

})
