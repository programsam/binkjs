const path = require('path');
const express 	= require('express')
const bodyParser 	= require('body-parser')
const async		= require('async');
const settings	= require('../settings.json')
const Processing 	= require("./processing.js")
const packagejson = require('../package');

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

function isSet(field) {
	return (typeof field !== "undefined" && field !== null);
}

function isNotSet(field) {
	return (typeof field === "undefined" || field === null);
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

compat.get('/musician.php', function(req, res) {
    if (isSet(req.query?.query)) {
        var musicianId = parseInt(req.query.query)
        if (Number.isInteger(musicianId)) {
            res.redirect(`/#musicians-${musicianId}`)
        } else {
            res.status(400).end(`Please enter a valid musician id.`);
            logger.warn(`Invalid data format from /musician.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid musician id.`);
        logger.warn(`Someone is force-browsing musician.php.`)
    }
})

compat.get('/m/musician.php', function(req, res) {
    if (isSet(req.query?.query)) {
        var musicianId = parseInt(req.query.query)
        if (Number.isInteger(musicianId)) {
            res.redirect(`/#musicians-${musicianId}`)
        } else {
            res.status(400).end(`Please enter a valid musician id.`);
            logger.warn(`Invalid data format from /m/musician.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid musician id.`);
        logger.warn(`Someone is force-browsing /m/musician.php.`)
    }
})

compat.get('/band.php', function(req, res) {
    if (isSet(req.query?.query)) {
        var bandId = parseInt(req.query.query)
        if (Number.isInteger(bandId)) {
            res.redirect(`/#bands-${bandId}`)
        } else {
            res.status(400).end(`Please enter a valid band id.`);
            logger.warn(`Invalid data format from /band.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid band id.`);
        logger.warn(`Someone is force-browsing /band.php.`)
    }
})

compat.get('/m/band.php', function(req, res) {
    if (isSet(req.query?.query)) {
        var bandId = parseInt(req.query.query)
        if (Number.isInteger(bandId)) {
            res.redirect(`/#bands-${bandId}`)
        } else {
            res.status(400).end(`Please enter a valid band id.`);
            logger.warn(`Invalid data format from /m/band.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid band id.`);
        logger.warn(`Someone is force-browsing /m/band.php.`)
    }
})

compat.get('/jam.php', function(req, res) {
    if (isSet(req.query?.id)) {
        var jamid = parseInt(req.query.id)
        if (Number.isInteger(jamid)) {
            res.redirect(`/#jams-${jamid}`)
        } else {
            res.status(400).end(`Please enter a valid jam id.`);
            logger.warn(`Invalid data format from /jam.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid jam id.`);
        logger.warn(`Someone is force-browsing /jam.php.`)
    }
})

compat.get('/m/jam.php', function(req, res) {
    if (isSet(req.query?.id)) {
        var jamid = parseInt(req.query.id)
        if (Number.isInteger(jamid)) {
            res.redirect(`/#jams-${jamid}`)
        } else {
            res.status(400).end(`Please enter a valid jam id.`);
            logger.warn(`Invalid data format from /m/jam.php: ${musicianId}`)
        }
    } else {
        res.status(400).end(`Please enter a valid jam id.`);
        logger.warn(`Someone is force-browsing /m/jam.php.`)
    }
})

module.exports = compat;