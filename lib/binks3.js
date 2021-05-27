const path = require('path');
const async		= require('async');
const settings	= require('../settings.json')

let BINKS3 = function() {};

const makeLogger = require("./loggerfactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

const { S3Client,
        HeadBucketCommand,
        ListObjectsV2Command,
        DeleteObjectCommand,
        DeleteObjectsCommand,
        PutObjectCommand,
        PutObjectAclCommand
       } = require('@aws-sdk/client-s3')
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
    logger.error(`Error! ${JSON.stringify(err)}`);
    callback(err);
  });
}

BINKS3.prototype.deleteObject = function (passedPrefix, callback) {
  const cmd = new DeleteObjectCommand({
    Bucket: settings.s3.bucket_name,
    Key: passedPrefix
  });

  logger.debug(`Delete a single object with prefix '${passedPrefix}'`);
  s3.send(cmd).then(function (result) {
    callback(null, result);
  }).catch(function(err) {
    logger.error(`Error! ${JSON.stringify(err)}`);
    callback(err);
  });
}

BINKS3.prototype.makeDirectoryPublic = function (passedPrefix, topcallback) {
  const listcmd = new ListObjectsV2Command({
    Bucket: settings.s3.bucket_name,
    Prefix: passedPrefix
  });

  logger.debug(`Listing objects with prefix '${passedPrefix}'`);
  s3.send(listcmd).then(function (listresult) {
    if (listresult.Contents && listresult.Contents.length > 0) {
      async.each(listresult.Contents, function(thisobj, aclcb) {
        const aclcmd = new PutObjectAclCommand({
          Bucket: settings.s3.bucket_name,
          Key: thisobj.Key,
          "ACL": "public-read"
        });

        logger.debug(`Making object ${thisobj.Key} world-readable!`);
        s3.send(aclcmd).then(function(aclresult) {
          logger.debug(`Object ${thisobj.Key} is done.`);
          aclcb(null, aclresult);
        }).catch(function(aclerror) {
          logger.error(`Error on object ${thisobj.Key}: ${JSON.stringify(aclerr)}`)
          aclcb(aclerr);
        })
      }, function(aclerrs, aclresults) {
        if (aclerrs) {
          logger.warn(`Error making objects public: ${JSON.stringify(aclerrs)}`);
          topcallback(aclerrs)
        } else {
          topcallback(null, listresult);
        }
      })
    }
  }).catch(function(listerr) {
    logger.error(`Error when listing objects! ${JSON.stringify(listerr)}`);
    topcallback(listerr);
  });
}

BINKS3.prototype.listObjects = function (passedPrefix, callback) {
  const cmd = new ListObjectsV2Command({
    Bucket: settings.s3.bucket_name,
    Prefix: passedPrefix
  });

  logger.debug(`Listing objects with prefix '${passedPrefix}'`);
  s3.send(cmd).then(function (result) {
    callback(null, result);
  }).catch(function(err) {
    logger.error(`Error! ${JSON.stringify(err)}`);
    callback(err);
  });
}

BINKS3.prototype.createDirectory = function(passedPath, callback) {
  logger.debug(`Creating '${passedPath}' directory...`);
  const cmd = new PutObjectCommand({
    Bucket: settings.s3.bucket_name,
    Key: passedPath
  });

  s3.send(cmd).then(function (result) {
    callback(null, result);
  }).catch(function(err) {
    logger.error(`Error! ${JSON.stringify(err)}`);
    callback(err);
  });
}

BINKS3.prototype.createDirectories = function(number, topLevelCallback) {
  var self = new BINKS3();
  async.parallel([
    function(sndCallback) {
      self.createDirectory(`public/snd/${number}/`, function(snderr, sndresult) {
        sndCallback(snderr, sndresult)
      })
    },
    function(picsCallback) {
      self.createDirectory(`public/pics/${number}/`, function(picserr, picsresult) {
        picsCallback(picserr, picsresult)
      })
    },
    function(vidCallback) {
      self.createDirectory(`public/video/${number}/`, function(viderr, vidresult) {
        vidCallback(viderr, vidresult)
      })
    },
  ], function(overallErr, overallResults) {
    if (overallErr) {
      logger.error(`Error creating directories: ${JSON.stringify(overallErr)}`);
      topLevelCallback(overallErr);
    } else {
      topLevelCallback(null, overallResults);
    } //else no overall error
  }) //async.parallel
} //createDirectory

BINKS3.prototype.removeDirectories = function(number, topLevelCallback) {
  var self = new BINKS3();
  async.parallel([
    function(sndCallback) {
      self.removeDirectory(`public/snd/${number}`, function(snderr, sndresult) {
        sndCallback(snderr, sndresult)
      })
    },
    function(picsCallback) {
      self.removeDirectory(`public/pics/${number}`, function(picserr, picsresult) {
        picsCallback(picserr, picsresult)
      })
    },
    function(vidCallback) {
      self.removeDirectory(`public/video/${number}`, function(viderr, vidresult) {
        vidCallback(viderr, vidresult)
      })
    },
  ], function(overallErr, overallResults) {
    if (overallErr) {
      logger.error(`Error deleting directories for '${number}': ${JSON.stringify(overallErr)}`);
      topLevelCallback(overallErr);
    } else {
      topLevelCallback(null, overallResults);
    } //else no overall error
  }) //async.parallel
} //createDirectory

BINKS3.prototype.removeDirectory = function (passedPrefix, callback) {
  const listcmd = new ListObjectsV2Command({
    Bucket: settings.s3.bucket_name,
    Prefix: passedPrefix
  });

  logger.debug(`Listing objects with prefix '${passedPrefix}'`);
  s3.send(listcmd).then(function (listResult) {
    logger.debug(`Response from listing objects: ${JSON.stringify(listResult)}`)
    const delcmd = new DeleteObjectsCommand({
      Bucket: settings.s3.bucket_name,
      Delete: {
        Objects: listResult.Contents
      }
    })

    logger.debug(`Deleting all objects with prefix '${passedPrefix}'`);
    logger.debug(`This amounts to: ${JSON.stringify(listResult.Contents)}`);

    s3.send(delcmd).then(function (result) {
      callback(null, result);
    }).catch(function(err) {
      logger.error(`Error deleting objects w prefix '${passedPrefix}'! ${JSON.stringify(err)}`);
      callback(err);
    });
  }).catch(function(err) {
    logger.error(`Error listing objects to delete w prefix '${passedPrefix}'! ${JSON.stringify(err)}`);
    callback(err);
  });

}

module.exports = new BINKS3();
