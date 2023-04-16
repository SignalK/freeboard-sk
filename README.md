# Freeboard-SK
Freeboard-SK is a stateless, multi-station, Openlayers based chart plotter for Signal K for displaying and managing routes, waypoints, notes, alarms, notifications and more from any web enabled device.

![screen](https://user-images.githubusercontent.com/38519157/128667564-0f5e1ed6-eaae-40c7-ad62-5e7011c1f082.png)


## Features:
---

### Vessel / Chart Display:

Moving map display with:

- Multiple chart overlay using both of online and locally served charts 
- Built in support (no plugin required) for OpenStreetMap and OpenSeaMap(from Signal K server)  
- North-up / Vessel-up orientation   
- Moving Map / Moving Vessel
- Vessel Heading / Bearing lines
- Wind True / Apparent display
- Closest point of approach

and more.

Charts are sourced from the `/resources/charts` path on the Signal K server and the following chart types / sources are supported:

- Image tiles _(XYZ)_
- Vector Tiles _(MVT / PBF)_
- WMS _(Web Map Server)_
- WMTS _(Web Map Tile Server)_
- PMTiles _(ProtoMap files)_

---

### Resources:  

Freeboard-SK supports the creation, editing and deletion of all resource types defined in the Signal K specification that are available under the `/resources` path.

__Routes and Waypoints:__

_Path(s): `/resources/routes`, `/resources/waypoints`_

- Show / Hide Routes & Waypoints
- Set a Waypoint as a destination
- Set an active Route
- Select destination point along an Active Route
- Create / Edit / Delete Routes
- Create / Edit / Delete Waypoints
- Create Waypoint at current vessel position
- Import Routes and Waypoints from GPX files
- Attach Notes to Routes & Waypoints

__Notes and Regions:__

_Path(s): `/resources/notes`, `/resources/regions`_

- Display Notes and Regions
- View / Edit Note properties
- Draw Regions and attach Notes
- Add / Edit / Delete Notes
- Attach Notes to Regions

__Tracks:__

Whilst not specifically defined in the Signal K specification, Freeboard-SK supports the import and display of tracks from GPX files which are available under the `/resources/tracks` path.

- Show / Hide Tracks
- Delete Tracks

---

### Alarms and Notifications:

Freeboard-SK can display alarms _(visual and audio)_ & messages contained in *Notification* messages transmitted by the Signal K server.

Alarm types supported include:
- Depth
- Closest Approach
- Anchor drag
- "Buddy" notifications
- All standard Signal K Alarms (i.e. `Man overboard`, `Sinking`, etc.)

Additionally you can raise `anchor watch` and a number of the standard alarms such as `Man overboard`, `Sinking`, etc directly from the user interface.

Freeboard-SK also implements the following API endpoint to accept requests for raising and clearing notifications for Signal K Standard Alarms:
```
/signalk/v2/api/notifications/<standard_alarm>
```

_Example: Raise Man overboard alarm (default message):_
```
HTTP PUT 'http://host:port/signalk.v2/api/notifications/mob'
```

_Example: Raise Man overboard alarm (custom message):_
```
HTTP PUT 'http://host:port/signalk.v2/api/notifications/mob' {
    "message": "Man Overboard!"
}
```

_Example: Clear Man overboard alarm:_
```
HTTP DELETE 'http://host:port/signalk.v2/api/notifications/mob'
```

_**Signal K Standard Alarms:**_
- mob
- fire
- sinking
- flooding
- collision
- grounding
- listing
- adrift
- piracy
- abandon

_Vessel Closest Approach alarm:_
![screen](https://user-images.githubusercontent.com/38519157/128667564-0f5e1ed6-eaae-40c7-ad62-5e7011c1f082.png)



---

### History Playback

Freeboard-SK supports the Siganl K `playback` api and can replay recorded time-series data captured on a Signal K server equipped with the `signalk-to-infludb` plugin.

---

### Instruments: 

Freeboard-SK allows you to use your favourite instrumentation app installed on the Signal K server.

Select one or more from the installed applications listed in the `settings` screen and they will displayed in the instrument panel drawer.

When more than one app is selected you can cycle through them within the instrument panel.

_Note: The `Instrument Panel` app is the default application if no user selection has been made._

![instruments](https://user-images.githubusercontent.com/38519157/128668406-02cbb8d8-2353-4e93-ae5e-12e0c7d507fe.png)

---

### Experiments: 

To get access to experimental Freeboard-SK features ensure you check the **Experimental Features** option in **Settings**.

Checking this option will make these features appear in the user interface.

---

## System Requirements:

Freeboard-SK requires **Signal K API Version 2** as it makes use of both the v2 `Resources` and `Course` APIs.

_If installed on Signal K v1.x.x Freeboard features may not be fully functional!_

The following features require that the Signal K server have plugins / providers installed to service the following paths:

- `resources/charts` - Ability to view charts.

- `navigation/anchor`, `notifications/navigation/anchor` - Ability to set anchor alarm and display notifications.

- `notifications/environment/depth` - Display depth notifications.

- `signalk/v1/playback` (Playback API) - Replay of recorded vessel data.

- `vessels/self/track` - Display of vessel track stored on server.

- `vessels/self/navigation/course/calcValues` - Display of calculated course values such as DTG, XTE, etc.


### Recommended Plugins:

The following plugins are recommended for the *Signal K node server* to enable full functionality:

- @signalk/charts-plugin *(Charts provider)*
- signalk-anchoralarm-plugin _(anchor alarm settings & notifications)_
- signalk-simple-notifications _(depth alarm notifications)_
- @signalk/course-provider _(course calculations e.g. XTE, DTG, etc.)_

---

## Development:

Freeboard-SK is an Angular project.

It is recommended that the Angular CLI be installed globally `npm i -g @angular/cli@latest` prior to following the steps below.

1. Clone this repository.

2. Run `npm i` to install project dependencies. *Note: this will also build the project placing the deployable application files in the `public` folder.*

3. Run `npm start` or `ng serve` to start a development web server and then navigate to `http://localhost:4200/` to load the application. The application will automatically reload once you save changes to any of the source files.

### Note:

The Freeboard-SK application will look to connect to a Signal K server at the *ip address:port* contained in the url of your browser. 

In development mode you are able to specify the Signal K server host address and port you wish to connect to by editing the `DEV_SERVER` object in the `src/app.info.ts` file.
```
DEV_SERVER { 
    host: '192.168.99.100', 
    port; 3000, 
    ssl: false 
}
```

_Note: These settings apply in **Development Mode** only!_

```
npm start
ng serve 
ng build
```


_They will __NOT__ apply when using **Production Mode**, the generated application will attempt to connect to a Signal K api / stream on the hosting server._

```
ng build -c production
or
npm run build:prod
```

---

### Building a Release:

__Angular Build:__

- To build the Freeboard-SK application use the `npm run build:prod` command.

- To build the plugin use the `npm run build:helper` command.

Built files for deployment are placed in the following folders:
-  `/public` (application)
-  `/plugin` (plugin)

__NPM package:__

To build the NPM package use `npm pack` command which will:
1. Build the plugin using `npm run build:helper`. 
1. Build the application using `npm run build:prod`. 
2. Create the NPM package `*.tgz` file.

Built `*.tgz` file is placed in the root folder of the project.

---

_**Freeboard-SK** is a port of http://www.42.co.nz/freeboard for use with Signal K communication protocols and server features._
