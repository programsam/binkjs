# BINK.js

BINK! is an experiment in musical documentation.

You have things like SoundCloud and ReverbNation and others that allow bands to post their stuff online.  Sometimes, though, as a musician, this isn't enough because you produce a bunch of different recordings with a bunch of different people and it becomes not so much about image or brand promotion as it is just having an archive that lets you see the Who, What, Where and When that happened in a particular recording.

Where is SoundCloud's feature that shows you what each musician played on this recording?  What if there was a set break?  Where were these recordings on SoundCloud made?  Can I see a map of that?  _What day_ exactly, was this recording finished on?  Let me see all the recordings that were created at a certain location. Anyway, BINK makes all of this easy and allows for easy sharing of recordings between musicians.  You make a recording, you post it to BINK and then you can easily share with your fellow musicians.

Searching also makes it quite easy to find out "what was that I thing I played last spring with those guys from college?" and so on.

## Developer Notes

This is a section where I will put notes about BINK that are useful for mostly for me later on when I look at it and can't remember what I was doing.

### Setup

BINK uses the following pieces of technology (dependencies/requirements):

- MySQL
- Node.js
- Amazon S3
- jQuery
- jPlayer
- Google Maps
- Bootstrap.css

### Settings.json

Copy the [settings.example](./settings.example) file to a file called `settings.json`.  The BINK Node.js app looks for this file when it starts up and will fail if the file doesn't exist or has the wrong structure.  This file contains things that really shouldn't be hardcoded and stored in Git. Specifically:

- MySQL host, user, password, port, and database name.
- The URL for where in S3 the media for BINK is stored.
- The Google Maps API key that is used to render maps of the locations of jams to the page.
- Twitter authentication credentials to be able to view the Twitter posts about BINK in an in-line page.
- The credentials to be able to upload files to BINK using the Amazon S3 client (coming soon).

### Bootstrap.css

[Bootstrap.css](http://getbootstrap.com/css/).  We get it from a CDN. It's the thing that makes the page look good.

### Custom CSS

[custom.css](public/css/custom.css) contains custom and specific CSS for BINK that goes beyond the Bootstrap CSS.

### JPlayer

BINK uses a custom build/config for  [jPlayer](http://jplayer.org/) so that it fits into the BINK theme--specifically so that it's a floating navbar on the bottom of the page you can deal with. 

### MySQL

[binkjs.sql](./binkjs.sql) is the schema that is required to be in the database for you to use BINK.