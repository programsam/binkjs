let settings = require('./settings');

const { S3Client,
    HeadBucketCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    PutObjectCommand,
    PutObjectAclCommand
   } = require('@aws-sdk/client-s3')

const { fromHttp } = require('@aws-sdk/credential-provider-http');


const s3 = new S3Client({
    region: settings.s3.bucket_region,
    credentials: fromHttp({
        awsContainerCredentialsFullUri: "http://127.0.0.1:3001/admin/awscreds",
        awsContainerAuthorizationToken: settings.session_secret
    })
});

const cmd = new ListObjectsV2Command({
    Bucket: settings.s3.bucket_name,
    Prefix: "/"
});

s3.send(cmd).then(function (result) {
    console.log(JSON.stringify(result));
})

// const cmd = new HeadBucketCommand({Bucket: settings.s3.bucket_name});
// console.debug(`Testing connection to configured bucket: ${settings.s3.bucket_name}`);
// s3.send(cmd).then(function (result) {
//     console.log(JSON.stringify(result));
// }).catch(function(err) {
//     console.error(`Error! ${JSON.stringify(err)}`);
// });