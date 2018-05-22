# BINK.js

BINK! is an experiment in musical documentation.

You have things like SoundCloud and ReverbNation and others that allow bands to post their stuff online.  Sometimes, though, as a musician, this isn't enough because you produce a bunch of different recordings with a bunch of different people and it becomes not so much about image or brand promotion as it is just having an archive that lets you see the Who, What, Where and When that happened in a particular recording.

Where is SoundCloud's feature that shows you what each musician played on this recording?  What if there was a set break?  Where were these recordings on SoundCloud made?  Can I see a map of that?  _What day_ exactly, was this recording finished on?  Let me see all the recordings that were created at a certain location. Anyway, BINK makes all of this easy and allows for easy sharing of recordings between musicians.  You make a recording, you post it to BINK and then you can easily share with your fellow musicians.

Searching also makes it quite easy to find out "what was that I thing I played last spring with those guys from college?" and so on.

## Developer Notes

This is a section where I will put notes about BINK that are useful for mostly for me later on when I look at it and can't remember what I was doing.  Plus, eventually, maybe BINK! will be exciting enough to some people that they will also want to go deploy it on their servers and then boom, it's an open source project now.  But I sincerely doubt it will ever get that popular because nothing I do ever does.

### Setup

BINK uses the following pieces of technology (dependencies/requirements):

- MySQL (`mysql  Ver 14.14 Distrib 5.7.19`)
- Node.js  (`v9.9.0`)
- Twitter (disabled temporarily)
- Amazon S3
- FontAwesome
- jQuery (`v3.3.1`)
- jPlayer (`v2.9.2`)
- Google Maps Javascript API
- Bootstrap.css (`v4 - Darkly Theme`)
- Nginx (`1.10.3 (Ubuntu)`)

### Settings.json

Copy the [settings.example](./settings.example) file to a file called `settings.json`.  The BINK Node.js app looks for this file when it starts up and will fail if the file doesn't exist or has the wrong structure.  This file contains things that really shouldn't be hardcoded and stored in Git. Specifically:

- `mysql`: The settings for the MySQL connections the Node.js app will use to grab BINK! data.
  - `mysql.host`: The hostname of the database (usually `localhost`)
  - `mysql.user`: The username of a MySQL user who has access to the database below.
  - `mysql.port`: The port used to connect to the MySQL server.
  - `mysql.password`: The password associated with the user above.
  - `database`: The name of a database within MySQL that the `mysql.user` above has _write_ access to.
- `media_s3_url`: The base URL that is used in constructing links/downloading files from Amazon S3, which is where BINK stores its media.
- `maps`: Google Maps is integrated into BINK; you'll need to go grab a Google API key, give it access to Google Maps, and insert it here.
- `twitter`: An object for configuring access to the Twitter APIs.
  - `consumer_key`: Something Twitter uses to authenticate to their APIs.
  - `consumer_secret`: Something Twitter uses to authenticate to their APIs.
  - `access_token_key`: Something Twitter uses to authenticate to their APIs.
  - `access_token_secret`: Something Twitter uses to authenticate to their APIs.
- `admin_password`: Historically, to make things easy, there has been just one password for administering BINK.  It is shared amongst friends.  This may be changing but for now, you need to set this so that friends can get in and edit jams, etc.
- `session_secret`: Used to Salt/Hash the session IDs for BINK.  Best if set to a really hard-to-guess string.

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

### Bootstrap.css

[Bootstrap.css v4](https://getbootstrap.com/docs/4.0/getting-started/introduction/).  We get it from a CDN. It's the thing that makes the page look good.  The version is important -- some significant things have changed from v3 to v4.  We use the latest beta v4.

### Custom CSS

[custom.css](public/css/bink.css) contains custom and specific CSS for BINK that goes beyond the Bootstrap CSS. We try to keep this as short and simple as possible — relying on Bootstrap to do most of the style sheet control.

### Pug

[Pug](https://pugjs.org/api/getting-started.html) is a template rendering utility in Node.js that is very compatible with Express.  HTML in BINK is rendered using Pug.

### Express

[Express](https://expressjs.com/) is a standard, popular way of providing web applications in Node.js.

### JPlayer

BINK uses a custom build/config for  [jPlayer](http://jplayer.org/) so that it fits into the BINK theme--specifically so that it's a floating navbar on the bottom of the page you can deal with.

### MySQL

[binkjs.sql](./binkjs.sql) is the schema that is required to be in the database for you to use BINK.  You'll need to set up MySQL on your server and point BINK to it, so be ready for that.
