# Freeboard

Freeboard is a stateless, multi-station ready, Openlayers chartplotter for Signal K.

Display and manage routes, waypoints, notes, alarms, notifications on your Signal K server
from multiple clients.

![screen](https://user-images.githubusercontent.com/38519157/128667564-0f5e1ed6-eaae-40c7-ad62-5e7011c1f082.png)


## Features:
---

### Vessel / Chart Display:

Moving map display with the ability to use a combination of online and locally served charts.

Ability to select the active vessel and direct actions to it _(where supported by the server)_.
    
- North-up / Vessel-up 
- Moving Map / Moving Vessel
- Vessel Heading / Bearing lines
- Wind True / Apparent display
- Measure distance

### CHARTS

Built in support (no plugin required) for:

- OpenStreetMap / WORLD chart outline
- OpenSeaMap

__Signal K `/resources/charts` path:__

Charts listed under the Signal K servers `/resources/charts` path are avaialble for display.

The following chart types / sources are supported 
- Image tiles (XYZ)
- Vector Tiles (MVT / PBF)
- WMS (Web Map Server)

---

### Resources:  

The following resources available at the Signal K `/resources` path are supported:

__Routes and Waypoints:__

_Path(s): `/resources/routes`, `/resources/waypoints`_

- Show / Hide Routes & Waypoints 
- Set an active Route
- Select destination point along and Active Route
- Select a Waypoint as a destination
- Create / Edit / Delete Routes
- Add Waypoint at location or Vessel position
- Edit / Delete Waypoints
- Import Routes and Waypoints from GPX files

__Notes and Regions:__

_Path(s): `/resources/notes`, `/resources/regions`_

- Display Notes and Regions
- View / Edit Note properties
- Draw Regions and attach Notes
- Add / Edit / Delete Notes
- Associate Notes with Regions

---

### Alarms and Notifications:

- Display alarms from received *Notification* messages _(visual and audio)_ including: 
    - Depth
    - Closest Approach
    - "Buddy" notifications
- Raise alarms such as `Man overboard`, `Sinking`, etc.

- Set anchor watch / drag alarm


_Vessel Closest Approach alarm:_
![screen](https://user-images.githubusercontent.com/38519157/128667564-0f5e1ed6-eaae-40c7-ad62-5e7011c1f082.png)



---

### History Playback

Playback recorded time-series data captured on the Signal K server via the `playback` api.

---

### Instruments: 

Freeboard allows you to use your favourite instrumentation app hosted on the Signal K server.

Select one or more from installed applications in the `settings` screen and they will displayed in the instrument panel drawer.

When more than one app is selected you can cycle through them within the instrument panel.

_Instrument Panel: `Signal K Instrument Panel` app is the default._ 
![instruments](https://user-images.githubusercontent.com/38519157/128668406-02cbb8d8-2353-4e93-ae5e-12e0c7d507fe.png)


---

## System Requirements:

For all Freeboard features to be fully functional, it requires that the Signal K server in use be able to provide the necessary services for the following paths:

1. `reources/routes`, `resources/waypoints`, `resources/notes`, `resources/regions` - Serve resources as well as accept and persist resource data submitted to these paths.

2. `resources/charts` - Serve chart resources.

3. `navigation/anchor`, `notifications/navigation/anchor` - Serve and accept `position`, `maxRadius` values as well as calculate `currentRadius` and serve notifications.

4. `notifications/environment/depth` - Serve notifications for `belowKeel`, `belowSurface` `belowTransducer`.

5. `navigation/course` - Serve and accept course information, allow a route to be set as active, allow a waypoint or position to be set as a destination. It is expected that the server will initiate any subsequent calculations and related value updates.

6. **Playback History** - Implement the Signal K Playback api (`/signalk/v1/playback`)

These functions may be provided natively by the server or through the use of *plugins*.

### Recommended Plugins:
The following plugins are recommended for the *Signal K node server* to enable full functionality:
- freeeboard-sk-helper _(Set destination, active route, arrival circle)_
- sk-resources-fs _(Routes, Waypoints, Notes & Regions provider)_
- @signalk/charts-plugin *(Charts provider)*
- signalk-anchoralarm-plugin _(anchor alarm settings & notifications)_
- signalk-simple-notifications _(depth alarm notifications)_
- signalk-derived-data _(XTE, DTG, etc.)_

---

## Development:

Freeboard is an Angular project.

It is recommended that the Angular CLI be installed globally `npm i -g @angular/cli@latest` prior to following the steps below.

1. Clone this repository.

2. Run `npm i` to install project dependencies. *Note: this will also build the project placing the deployable application files in the `public` folder.*

3. Run `npm start` or `ng serve` to start a development web server and then navigate to `http://localhost:4200/` to load the application. The application will automatically reload once you save changes to any of the source files.

### Note:

The Freeboard application will look to connect to a Signal K server at the *ip address:port* contained in the url of your browser. 

In development mode you are able to specify the Signal K server host address and port you wish to connect to by editing the `DEV_SERVER` object in the `src/app.info.ts` file.
```
DEV_SERVER { 
    host: '192.168.99.100', 
    port; 3000, 
    ssl: false 
}
```

_Note: These settings apply in **Development Mode** only!_

    - `npm start`
    - `ng serve` 
    - `ng build`


_They will __NOT__ apply when using **Production Mode**, the generated application will attempt to connect to a Signal K api / stream on the hosting server._

    - `ng build -c production`
    - `npm run build:prod`

---

### Building a Release:

__Angular Build:__

To build the Freeboard application use the `npm run build:prod` command.

Built application files for deployment are placed in the `/public` folder.

__NPM package:__

To build the NPM package use `npm pack` command which will:
1. Build the application using `npm run build:prod`. 
2. Create the NPM package `*.tgz` file.


Built `*.tgz` file is placed in the root folder of the project.

---

_**Freeboard** is a port of http://www.42.co.nz/freeboard for use with Signal K communication protocols and server features._
