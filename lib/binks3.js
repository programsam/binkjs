const path = require('path');
const async		= require('async');
const settings	= require('../settings.json')

let BINKS3 = function() {};

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3')
const { fromIni } = require('@aws-sdk/credential-provider-ini');

const s3 = new S3Client({
  region: settings.s3.bucket_region,
  credentials: fromIni()
});

BINKS3.prototype.testConnection = function (callback) {
  const cmd = new HeadBucketCommand({Bucket: settings.s3.bucket_name});

  logger.debug(`Testing connection to configured bucket: ${settings.s3.bucket_name}`);
  s3.send(cmd).then(function (result) {
    callback(null, result);
  }).catch(function(err) {
    logger.error(`Error! Details: ${JSON.stringify(err)}`);
    callback(err);
  });
}




module.exports = new BINKS3();
