const path            = require('path');
const express 	    = require('express')
const bodyParser 	= require('body-parser')
const async		    = require('async');
const settings	    = require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson   = require('../package');
const v				= require('express-validator')

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

function isSet(field) {
	return (typeof field !== "undefined" && field !== null);
}

function isNotSet(field) {
	return (typeof field === "undefined" || field === null);
}

function handleValidationResults(req, res, cb) {
    const result = v.validationResult(req);
    if (! result.isEmpty()) {
        logger.warn(`Input validation error at ${req.method} ${req.path}: ${JSON.stringify(result)}`);
        res.status(400).end(`Improper input!`);
    } else {
        cb();
    }
}

var compat = express.Router()

compat.get('/index.php', function(req, res) {
    res.redirect(`/#recent`);
})

compat.get('/m/index.php', function(req, res) {
    res.redirect(`/#recent`);
})

compat.get('/history.php', function(req, res) {
    res.redirect(`/#history`);
})

compat.get('/m/history.php', function(req, res) {
    res.redirect(`/#history`);
})

compat.get('/search.php', function(req, res) {
    res.redirect(`/#browse`);
})

compat.get('/m/search.php', function(req, res) {
    res.redirect(`/#browse`);
})

compat.get('/list.php', function(req, res) {
    res.redirect(`/#browse`);
})

compat.get('/m/list.php', function(req, res) {
    res.redirect(`/#browse`);
})

compat.get('/maps.php', function(req, res) {
    res.redirect(`/#map`);
})

compat.get('/musician.php', v.checkSchema({
        query: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var musicianId = parseInt(req.query.query);
        res.redirect(`/#musicians-${musicianId}`);
    })
})

compat.get('/m/musician.php', v.checkSchema({
        query: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var musicianId = parseInt(req.query.query);
        res.redirect(`/#musicians-${musicianId}`);
    })
})

compat.get('/band.php', v.checkSchema({
        query: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var bandId = parseInt(req.query.query);
        res.redirect(`/#bands-${bandId}`);
    })
})

compat.get('/m/band.php', v.checkSchema({
        query: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var bandId = parseInt(req.query.query);
        res.redirect(`/#bands-${bandId}`);
    })
})

compat.get('/jam.php', v.checkSchema({
        id: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var jamid = parseInt(req.query.id);
        res.redirect(`/#jams-${jamid}`);
    })
})

compat.get('/m/jam.php', v.checkSchema({
        id: { isInt: { options: { gt: 0 }} }
    }),
    function(req, res) {
    handleValidationResults(req, res, function() {
        var jamid = parseInt(req.query.id);
        res.redirect(`/#jams-${jamid}`);
    })
})

module.exports = compat;