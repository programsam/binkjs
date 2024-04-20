# BINK.js

BINK! is an experiment in musical documentation.

You have things like SoundCloud and ReverbNation and others that allow bands to post their stuff online.  Sometimes, though, as a musician, this isn't enough because you produce a bunch of different recordings with a bunch of different people and it becomes not so much about image or brand promotion as it is just having an archive that lets you see the Who, What, Where and When that happened in a particular recording.

Where is SoundCloud's feature that shows you what each musician played on this recording?  What if there was a set break?  Where were these recordings on SoundCloud made?  Can I see a map of that?  _What day_ exactly, was this recording finished on?  Let me see all the recordings that were created at a certain location. Anyway, BINK makes all of this easy and allows for easy sharing of recordings between musicians.  You make a recording, you post it to BINK and then you can easily share with your fellow musicians.

Searching also makes it quite easy to find out "what was that I thing I played last spring with those guys from college?" and so on.

## Developer Setup

Overview:

1. Install Node.js for your OS.
1. Install MySQL for your OS.
1. Setup MySQL for BINK.js.
1. Setup an Amazon S3 bucket.
1. Configure BINK.js for development.
1. Install dependencies.
1. Run.

### Install Node.js and MySQL

Outside the scope of this README; if you can't install these packages, BINK.js probably isn't something you should run for yourself.

### Setup MySQL

BINK.js needs access to a running instance of MySQL that has a database set aside specifically for BINK.  It's recommended that you install BINK.js with an application user and password that is reserved just for BINK operations, for added security.

* **NB**: BINK.js uses the [MySQL2 NPM](https://www.npmjs.com/package/mysql2), which provides a MySQL driver that allows TCP/IP input to any instance of MySQL, but currently does not provide MySQL authentication using the SHA2 or Caching pluggable auth modules.  There **are** specific instructions for what to do about this here below.

On a macos system using [MySQL Shell](https://dev.mysql.com/downloads/shell/),

* Execute the macos command line interface and `cd` to this repository's directory:

  ```
  % cd ~/git/binkjs
  ```

  **NB**: Your directory name may be different!

* Run the shell at the Mac command line interface:

  ```
  % mysqlsh
  MySQL Shell 8.0.18

  Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved.
  Oracle is a registered trademark of Oracle Corporation and/or its affiliates.
  Other names may be trademarks of their respective owners.

  Type '\help' or '\?' for help; '\quit' to exit.
  MySQL  JS >
  ```

* Connect to the local MySQL server installation (you will need the MySQL **root password** which you should have provided when you installed the server):

  ```
  MySQL  JS >  \connect root@localhost;
  Creating a session to 'root@localhost'
  Please provide the password for 'root@localhost':
  Save password for 'root@localhost'? [Y]es/[N]o/Ne[v]er (default No): v
  Fetching schema names for autocompletion... Press ^C to stop.
  Your MySQL connection id is 140 (X protocol)
  Server version: 8.0.18 MySQL Community Server - GPL
  No default schema selected; type \use <schema> to set one.
  MySQL  localhost:33060+ ssl  JS >
  ```

  **NB**: We recommend **NEVER** saving your root password to your disk.

* Switch to "SQL mode". It's ironic that you have to do this in a program called "SQL shell", but you are currently in Javascript mode and the next commands are easier to express in SQL.  Execute this:

  ```
  MySQL  localhost:33060+ ssl  JS > \sql
  Switching to SQL mode... Commands end with ;
  MySQL  localhost:33060+ ssl  SQL >
  ```

* Setup a `binkjs` database using the [provided schema](./misc/binkjs.sql):

  ```
  MySQL  localhost:33060+ ssl  SQL > \source binkjs.sql
  Query OK, 0 rows affected (0.0003 sec)
  ...
  Query OK, 0 rows affected (0.0002 sec)
  Query OK, 0 rows affected (0.0002 sec)
  Query OK, 0 rows affected (0.0002 sec)
  Warning (code 3719): 'utf8' is currently an alias for the character set UTF8MB3, but will be an alias for UTF8MB4 in a future release. Please consider using UTF8MB4 in order to be unambiguous.
  ...
  ```

  **NB**: You may see some warnings similar to the ones above; until we see a specific operation problem with the current syntax; we are safe ignoring these warnings.

* Check that the database successfully created:

  ```
  MySQL  localhost:33060+ ssl  binkjs  SQL > select * from binkjs.jams;
  Empty set (0.0017 sec)
  ```

  This is good; there are no jams yet, but the jams table and binkjs database exist.

* Create a user identified with the MySQL native password pluggable authentication module for use with BINK.js:

  ```
  MySQL  localhost:33060+ ssl  binkjs  SQL > CREATE USER binkjsuser@localhost IDENTIFIED WITH mysql_native_password BY '1234';
  Query OK, 0 rows affected (0.0028 sec)
  ```

  **NB**: Here it's good to use your own username instead of `binkjsuser` and your own password (preferably one that's hard to guess) instead of `1234`.  You probably want to leave the host as `localhost`. The clause `IDENTIFIED WITH mysql_native_password` is **THE MOST IMPORTANT THING** about this query and should not be left out.

* Grant the newly-created user all access on the `binkjs` database:

  ```
  MySQL  localhost:33060+ ssl  binkjs  SQL > GRANT ALL PRIVILEGES ON binkjs.* TO binkjsuser@localhost;
  Query OK, 0 rows affected (0.0030 sec)
  ```

* Congratulations, MySQL is now properly configured to use.  If you followed these instructions exactly, you would need the following MySQL settings object in `settings.json` (see below).  But note that you'd probably want to change your password and user for your deployment:

  ```json
  "mysql": {
    "host": "localhost",
    "user": "binkjsuser",
    "port": 3306,
    "password": "1234",
    "database": "binkjs"
  }
  ```

### S3 Bucket

You will need to register for an AWS account, if you don't already have one.

[Get AWS Credentials](https://aws.amazon.com/blogs/security/how-to-find-update-access-keys-password-mfa-aws-management-console/)

For local development, you should also set up an S3 bucket with public read permissions. 

[Create an S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html). 

It's also recommended that you create a folder within your bucket called `public`.

[Set appropriate permissions for your S3 bucket.](https://docs.aws.amazon.com/AmazonS3/latest/userguide/managing-acls.html) Your bucket will need to be publicly accessible. 

Your S3 bucket will also not have ACLs allowed by default. If ACLs are not allowed, you will not be able to upload assets (tracks, images, videos) via the Binkjs admin console. 

In order to resolve this, do the following: 

- Go to the S3 Console and select your bucket
- Go to Permissions
- In Object Ownership, click Edit
- Select ACLs enabled
- Agree and save changes

Once you have setup the bucket, you'll need to gather the following from the Amazon Web Console for your S3 bucket:
- S3 Bucket Name
- S3 Region
- S3 Base URL
- API Key ID
- API Key Secret

These items all go into your `settings.json` under the section `s3`. See below for more information.

### Configure BINK.js for Development

* Open the MacOS command line terminal if it's not already open.

* `cd` to this repository's directory if you aren't already there.

* Run `npm install --all` and wait for the command to finish executing.

* Copy the [settings.example](./settings.example) file to a file called `settings.json`.  The BINK Node.js app looks for this file when it starts up and will fail if the file doesn't exist or has the wrong structure.  This file contains things that really shouldn't be hardcoded and stored in Git. Specifically:

  - `mysql`: The settings for the MySQL connections the Node.js app will use to grab BINK! data.
    - `mysql.host`: The hostname of the database (usually `localhost`)
    - `mysql.user`: The username of a MySQL user who has access to the database below.
    - `mysql.port`: The port used to connect to the MySQL server.
    - `mysql.password`: The password associated with the user above.
    - `mysql.database`: The name of a database within MySQL that the `mysql.user` above has _write_ access to.
  - `s3`: The settings related to Amazon AWS S3, the backend storage for BINK's media.  See [the AWS credentials section](#aws-credentials-awscli) for more information on how to setup and use S3 for backend media storage.
    - `public_base_url`: The URL that BINK's media is downloaded from. This can be determined by going into Amazon S3 and looking up the public URL for an object and then removing the specific path to that object.  **NB**: Please use `https` URLS!
    - `bucket_name`: The bucket within your Amazon AWS S3 account that BINK will store its media in.  See the [S3 Bucket](#s3-bucket) section for more info.
    - `bucket_region`: The buckets are each stored in a physical region; this allows for CDN and near physical location of buckets to users and developers. Look this up in Amazon Console.  See the [S3 Bucket](#s3-bucket) section for more info.
    - `accessKeyId`: The access key ID that is required for accessing the S3 bucket. This will need to be configured in Amazon IAM.  See the [S3 Bucket](#s3-bucket) section for more info.
    - `secretAccessKey`: The secret access key tied to the above access key ID. Again, see the [S3 Bucket](#s3-bucket) section for more info.
  - `tmpuploads`: A directory on your server or local machine where BINK.js can store files that are uploaded to BINK.js before BINK uploads them to Amazon AWS.
  - `maps`: Google Maps is integrated into BINK; you'll need to go grab a Google API key, give it access to Google Maps, and insert it here.
  - `admin_password`: Historically, to make things easy, there has been just one password for administering BINK.  It is shared amongst friends.  This may be changing but for now, you need to set this so that friends can get in and edit jams, etc.
  - `session_secret`: Used to Salt/Hash the session IDs for BINK.  Best if set to a really securely random string.
  - `cookie`: A set of options related to HTTP/HTTPS cookies for when a user connects to BINK.
    - `secure`: Whether Express sessions should require a *Secure Cookie* to establish a session with users. **TL;DR** -- you want this set to `false` in development and `true` in production environments when BINK.js is behind a reverse proxy.
    - `sameSite`: Generally speaking, it's a good idea to ensure that our cookie comes from the same domain name as BINK is running on. This is much more important for production environments.
  - `logLevel`: The level of logging you'll see from the server-side component.  Set this to `silly` to see ridiculous, almost nonsensical amounts of information and set it to `error` to only see the critical problems.
  - `podcast`: This is a section of settings related to the BINK podcast. BINK creates a podcast listing of every public track that can then be fed to things like Apple Music and similar providers to allow people to stream BINK's media within their favorite app.  See [the podcast npm feed options](https://www.npmjs.com/package/podcast#feedoptions) for a list and description of these options.

* Congratulations, you should now be ready to start BINK.js.  Execute the following:
  ```
  % npm start

  > BINK.js@0.12.0 start /Users/programsam/git/binkjs
  > npx nodemon server.js

  [nodemon] 3.1.0
  [nodemon] to restart at any time, enter `rs`
  [nodemon] watching path(s): *.*
  [nodemon] watching extensions: js,mjs,cjs,json
  [nodemon] starting `node server.js`
  2019-12-31T15:59:10.296Z [server.js] info: BINK.js is up and listening on port 3001...
  2019-12-31T15:59:10.325Z [server.js] info: Successfully queried database.
  ```

  You should now be able to browse to `http://localhost:3001` and see the BINK homepage.

## Production Setup

### Nginx

[Nginx](https://www.nginx.com/resources/wiki/) is a useful reverse proxy that we expect you to deploy in front of BINK to manage things like caching and https-to-http termination, etc.  Note that you'll need something like the following in your Nginx configuration for BINK.js:

Check out the [example nginx.conf](./misc/binkjs-nginx.conf) configuration file to get started with configuring Nginx for BINK.js usage.  Further documentation of each setting and what they do is available in that file.

### Ubuntu/Systemd Service

You'll want to configure a [Systemd Service](https://docs.fedoraproject.org/en-US/quick-docs/systemd-understanding-and-administering/) for BINK.js that is **separate** from the frontend reverse proxy, like Nginx (see previous section).  This Service will start BINK.js when your machine turns on, and can restart BINK.js if it crashes. Checkout our [example systemd service](./misc/binkjs.service) for more information.