const path      = require('path');
const async		  = require('async');
const settings	= require('../settings.json')
const fs        = require('fs');

let BINKS3 = function() {};

const makeLogger = require("./loggerFactory.js");
const logger = makeLogger(path.basename(__filename), settings.logLevel);

const { S3Client,
        HeadBucketCommand,
        ListObjectsV2Command,
        DeleteObjectCommand,
        DeleteObjectsCommand,
        PutObjectCommand,
        PutObjectAclCommand
       } = require('@aws-sdk/client-s3')
const { fromEnv } = require('@aws-sdk/credential-provider-env');

// set the environment variables from the JSON file. it's a hack but it works.
process.env.AWS_ACCESS_KEY_ID = settings.s3.accessKeyId;
process.env.AWS_SECRET_ACCESS_KEY = settings.s3.secretAccessKey;

const s3 = new S3Client({
  region: settings.s3.bucket_region,
  credentials: fromEnv()
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
    if (! Array.isArray(listresult.Contents) || listresult.Contents.length === 0) {
      logger.warn(`The prefix ${passedPrefix} was empty. Creating it now...`);
      BINKS3.prototype.createDirectory(passedPrefix, function(err, result) {
        logger.debug(`Err: ${JSON.stringify(err)}, result: ${JSON.stringify(result)}`);
        if (err) {
          logger.error(`Error when creating non-existent directory ${passedPrefix}: ${JSON.stringify(err)}`);
          topcallback(err);
        } else {
          logger.debug(`Successfully created directory (we think): ${JSON.stringify(result)}`);
          BINKS3.prototype.makeDirectoryPublic(passedPrefix, topcallback);
        }
      })
    } else {
      logger.debug(`We found some stuff to make public: ${JSON.stringify(listresult.Contents)}`)
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
        }).catch(function(aclerr) {
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
    } //there was something to make public
  }).catch(function(listerr) { //problem even listing the directory
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

BINKS3.prototype.putObject = function(constructedKey, file, callback) {
  logger.debug(`Uploading ${file.originalname} to ${constructedKey} from local path ${file.path} as publicly readable...`);
  var fileStream = fs.createReadStream(file.path)

  const cmd = new PutObjectCommand({
    ACL: 'public-read',
    Bucket: settings.s3.bucket_name,
    Key: constructedKey,
    Body: fileStream
  })

  s3.send(cmd).then(function(result) {
    logger.debug(`Successfully put object with result: ${JSON.stringify(result)}`);
    callback(null, result);
  }, function(err) {
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
    var toDelete = [];
    listResult.Contents.forEach(function(thisItem) {
      var item = {
        Key: thisItem.Key
      }
      toDelete.push(item);
    })
    const delcmd = new DeleteObjectsCommand({
      Bucket: settings.s3.bucket_name,
      Delete: {
        Objects: toDelete
      }
    })

    logger.debug(`Deleting all objects with prefix '${passedPrefix}'`);
    logger.debug(`This amounts to: ${JSON.stringify(delcmd)}`);

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
