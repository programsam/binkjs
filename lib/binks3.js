const path      = require('path');
const async		  = require('async');
const settings	= require('../settings.json')
const fs        = require('fs');
const Minio     = require('minio')

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

if (settings.minio_settings.using_minio) {

  var s3 = new Minio.Client({
    endPoint: settings.minio_settings.endpoint,
    port: 9000,
    useSSL: false,
    accessKey: settings.minio_settings.access_key,
    secretKey: settings.minio_settings.secret_key
  }); 

  BINKS3.prototype.testConnection = function (callback) {
      // Use MinIO's bucketExists method
      s3.bucketExists(settings.s3.bucket_name, function(err, exists) {
        if (err) {
          logger.error(`Error! ${JSON.stringify(err)}`);
          callback(err);
        } else if (exists) {
          callback(null, 'Bucket exists');
        } else {
          callback(new Error('Bucket does not exist'));
        }
      });
    }


  BINKS3.prototype.deleteObject = function (passedPrefix, callback) {
    logger.debug(`Delete a single object with prefix '${passedPrefix}'`);
    s3.removeObjects(settings.s3.bucket_name, passedPrefix, function(err) {
      if (err) {
        logger.error(`Error! ${JSON.stringify(err)}`);
        callback(err);
      } else {
        callback(null, 'Deleted');
      }
    });
  }

  BINKS3.prototype.makeDirectoryPublic = function (passedPrefix, topcallback) {
    logger.debug(`Making directory '${passedPrefix}' public...`);
    const policy = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": "*",
          "Action": ["s3:GetObject"],
          "Resource": [`arn:aws:s3:::${settings.s3.bucket_name}/${passedPrefix}*`]
        }
      ]
    };

    s3.setBucketPolicy(settings.s3.bucket_name, JSON.stringify(policy), function(err) {
      if (err) {
        logger.error(`Error! ${JSON.stringify(err)}`);
        topcallback(err);
      } else {
        topcallback(null, 'Bucket policy updated');
      }
    });
  }

  BINKS3.prototype.listObjects = function (passedPrefix, callback) {
    const stream = s3.listObjectsV2(settings.s3.bucket_name, passedPrefix, true);

    let objects = [];
    stream.on('data', function(obj) { objects.push(obj); });
    stream.on('error', function(err) {
      logger.error(`Error! ${JSON.stringify(err)}`);
      callback(err);
    });
    stream.on('end', function() {
      callback(null, objects);
    });
  }

  BINKS3.prototype.putObject = function(constructedKey, file, callback) {
    logger.debug(`Uploading ${file.originalname} to ${constructedKey} from local path ${file.path}...`);
    var fileStream = fs.createReadStream(file.path)
    s3.putObject(settings.s3.bucket_name, constructedKey, fileStream, function(err, etag) {
      if (err) {
        logger.error(`Error! ${JSON.stringify(err)}`);
        callback(err);
      } else {
        logger.debug(`Successfully put object with ETag: ${etag}`);
        callback(null, { ETag: etag });
      }
    });

    BINKS3.prototype.createDirectory = function(passedPath, callback) {
      const emptyBuffer = Buffer.from('');
    s3.putObject(settings.s3.bucket_name, `${passedPath}/`, emptyBuffer, function(err, etag) {
      if (err) {
        logger.error(`Error! ${JSON.stringify(err)}`);
        callback(err);
      } else {
        logger.debug(`Successfully created directory with ETag: ${etag}`);
        callback(null, { ETag: etag });
      }
    });
    }

    // Can make this non-specific to MinIO/ S3 by breaking out of the if/else potentially 
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
      
  
    // Can make this non-specific to MinIO/ S3 by breaking out of the if/else potentially
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

  }

  BINKS3.prototype.removeDirectory = function (passedPrefix, callback) {
    BINKS3.prototype.removeDirectory = function (passedPrefix, callback) {
      logger.debug(`Listing objects with prefix '${passedPrefix}'`);
      // Use MinIO's listObjects and removeObjects methods
      var objectsList = [];
      var stream = s3.listObjectsV2(settings.s3.bucket_name, passedPrefix, true);
    
      stream.on('data', function(obj) { 
        objectsList.push(obj.name); 
      });
    
      stream.on('end', function() {
        logger.debug(`Response from listing objects: ${JSON.stringify(objectsList)}`);
        logger.debug(`Deleting all objects with prefix '${passedPrefix}'`);
        logger.debug(`This amounts to: ${JSON.stringify(objectsList)}`);
    
        s3.removeObjects(settings.s3.bucket_name, objectsList, function(err) {
          if (err) {
            logger.error(`Error deleting objects w prefix '${passedPrefix}'! ${JSON.stringify(err)}`);
            callback(err);
          } else {
            logger.debug(`Successfully deleted all objects with prefix '${passedPrefix}'`);
            callback(null, { Deleted: objectsList });
          }
        });
      });
    
      stream.on('error', function(err) {
        logger.error(`Error listing objects to delete w prefix '${passedPrefix}'! ${JSON.stringify(err)}`);
        callback(err);
      });
    }}

} else {

  var s3 = new S3Client({
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
}

module.exports = new BINKS3();