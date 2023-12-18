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
1. Configure BINK.js for development.
1. Install dependencies.
1. Run.

### Install Node.js and MySQL

Outside the scope of this README; if you can't install these packages, BINK.js probably isn't something you should run for yourself.

### Setup MySQL

BINK.js needs access to a running instance of MySQL that has a database set aside specifically for BINK.  It's recommended that you install BINK.js with an application user and password that is reserved just for BINK operations, for added security.

* **NB**: BINK.js uses the [MySQL NPM](https://www.npmjs.com/package/mysql), which provides a MySQL driver that allows TCP/IP input to any instance of MySQL, but currently does not provide MySQL authentication using the SHA2 or Caching pluggable auth modules.  There **are** specific instructions for what to do about this here below.

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

* Setup a `binkjs` database using the [provided schema](./binkjs.sql):

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
  - `media_s3_url`: The base URL that is used in constructing links/downloading files from Amazon S3, which is where BINK stores its media.
  - `maps`: Google Maps is integrated into BINK; you'll need to go grab a Google API key, give it access to Google Maps, and insert it here.
  - `admin_password`: Historically, to make things easy, there has been just one password for administering BINK.  It is shared amongst friends.  This may be changing but for now, you need to set this so that friends can get in and edit jams, etc.
  - `session_secret`: Used to Salt/Hash the session IDs for BINK.  Best if set to a really securely random string.
  - `secureCookie`: Whether Express sessions should require a *Secure Cookie* to establish a session with users. **TL;DR** -- you want this set to `false`
  - `logLevel`: The level of logging you'll see from the server-side component.  Set this to `silly` to see ridiculous, almost nonsensical amounts of information and set it to `error` to only see the critical problems.

* Congratulations, you should now be ready to start BINK.js.  Execute the following:
  ```
  % npm start

  > BINK.js@0.12.0 start /Users/programsam/git/binkjs
  > npx nodemon server.js

  [nodemon] 1.19.4
  [nodemon] to restart at any time, enter `rs`
  [nodemon] watching dir(s): *.*
  [nodemon] watching extensions: js,mjs,json
  [nodemon] starting `node server.js`
  2019-12-31T15:59:10.296Z [server.js] info: BINK.js is up and listening on port 3001...
  2019-12-31T15:59:10.325Z [server.js] info: Successfully queried database.
  ```

  You should now be able to browse to `http://localhost:3001` and see the BINK homepage.

### AWS Credentials and Setup

You will need a local .aws/credentials file (if on Mac/ Linux) file configured to access your AWS account.

First, create security credentials in your AWS account.

[Get AWS Credentials](https://aws.amazon.com/blogs/security/how-to-find-update-access-keys-password-mfa-aws-management-console/)

Next, install aws-cli.

[Install aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

Once installed, run `aws configure`. Fill in the values for access key id and secret key, as well as your bucket's region. 

You will also need to set a local environment variable for the current AWS_PROFILE.

`export AWS_PROFILE=default`

NB: This assumes you are using the default profile. If adding a profile, you will need to set this local environment variable to that value. 

To confirm that you have the correct profile selected, run the following: 

`aws configure list`

You should see output showing the selected profile, access_key, secret_key, and region. 

For local development, you should also set up an S3 bucket with public read permissions. 

[Create an S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html). 

It's also recommended that you create a folder within your bucket called public.

[Set appropriate permissions for your S3 bucket.](https://docs.aws.amazon.com/AmazonS3/latest/userguide/managing-acls.html)

Once this is complete, you will need to input the information for your s3 bucket name, region, and URL in your settings.json file. 

For example, if your bucket is called binkjs, your public_base_url should appear similar to the following: 

https://s3.amazonaws.com/binkjs/public/

## Production Setup

### Nginx

[Nginx](https://www.nginx.com/resources/wiki/) is a useful reverse proxy that we expect you to deploy in front of BINK to manage things like caching and https-to-http termination, etc.  Note that you'll need something like the following in your Nginx configuration for BINK.js:

```
location / {
		proxy_pass http://localhost:3001;
		proxy_set_header Host $http_host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
```

Otherwise, BINK.js won't get the cookies it needs.


