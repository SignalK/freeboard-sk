Freeboard-SK
============

This is a rewrite of Freeboard (http://www.42.co.nz/freeboard) to use the Signal K communication protocols.

###Vessel up
![Vessel Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-vessel-up.png)

###North up
![North Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-north-up.png)

Its a work-in-progress, currently:

 * Displays OpenStreetmap, OpenSeaMap, and WORLD chart outline
 * Displays suitably installed common chart formats
 * Displays boat position with track-line
 * Has anchor watch, alarms trigger properly, but doesnt make any alarm noise yet :-(
 * Has import for most common route and waypoint formats, just drag and drop the file on the chart
 * Allows draw/edit/save of waypoints, routes and regions.
 * Supports chart rotation by [Shift-click-drag].
 * Waypoint/route/regions management

Todo:
 * Integration to instrumentpanel project
 * Chart management
 * Bearing and speed lines
 * AIS targets
 
 * and on and on...

### Installation

NOTE: Windows users - DONT put any of this in directories with spaces or anything but simple ascii names. Use something like eg C:\dev\freeboard-sk

You will need a working nodejs installation, and the project must be served from a web server. The easiest way to do this is to also install and run the signalk-server-java project.

```shell
$ git clone https://github.com/SignalK/signalk-java-server.git
```

### Developing:

 * install development dependencies with `npm install`
 * build & watch with `npm start`
 