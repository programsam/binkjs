const settings	= require('../settings.json')
const express 	= require('express')

var scriptHolders = express.Router()

function authenticated(req, res, next) {
	if (req.session.admin)
	{
		next();
	}
	else {
		res.status(401).send("Not allowed!");
	}
}

scriptHolders.get('/views/scriptHolders/markerClusterer', function(req, res) {
	res.render('scriptHolders/markerClusterer', {});
})

scriptHolders.get('/views/scriptHolders/googleMaps', function(req, res) {
	res.render('scriptHolders/googleMaps', {googleMapsApiKey: settings.maps});
})

scriptHolders.get('/views/scriptHolders/bootstrapTable', function(req, res) {
	res.render('scriptHolders/bootstrapTable', {})
})

scriptHolders.get('/views/scriptHolders/dropzone', authenticated, function(req, res) {
	res.render('scriptHolders/dropzone', {})
})

scriptHolders.get('/views/scriptHolders/tempusDominus', authenticated, function(req, res) {
	res.render('scriptHolders/tempusDominus', {})
})

scriptHolders.get('/views/scriptHolders/bootstrapAutocomplete', authenticated, function(req, res) {
	res.render('scriptHolders/bootstrapAutocomplete', {})
})

module.exports = scriptHolders;
