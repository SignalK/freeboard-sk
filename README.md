# Freeboard

Freeboard is a stateless, multi-station ready, Openlayers chartplotter for Signal K.

Display and manage routes, waypoints, notes, alarms, notifications on your Signal K server
from multiple clients.


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

__Online:__

- OpenStreetMap / WORLD chart outline
- OpenSeaMap

__Offline:__

- MBTiles (or compatible) charts hosted on the Signal K server via `/resources/charts` path.

---

### Resources:  

#### Routes and Waypoints

- List / Select resources available via `/resources/routes`, `/resources/waypoints` paths
- Set an active Route
- Select destination point along and Active Route
- Select a Waypoint as a destination
- Draw Routes
- Add Waypoint at: Cursor or Vessel position
- Edit and delete Routes / Waypoints
- Import Routes and Waypoints from GPX files


#### Notes and Regions

- Display Notes and Regions available via `/resources/notes` and  `/resources/regions` paths
- View Note properties.
- Draw Regions and add Notes to them.
- Add, edit, move and delete Notes and associate them with Regions.

---

### Alarms and Notifications:

- Display alarms from received *Notification* messages _(visual and audio)_. 
    - Depth
    - Closest Approach
    - "Buddy" notifications
- Raise alarms such as `Man overboard`, etc.

__Anchor Watch:__
- Set anchor drag alarm

---

### History Playback

Playback recorded time-series data captured on the Signal K server via the `playback` api.

---

### Instrument Panel: 

Freeboard allows you to use your favourite instrumentation app installed on your Signal K server.

Select from installed applications in the `settings` screen and they will displayed in the instrument panel drawer.

_Instrument Panel `(@SignalK/InstrumentPanel)` will be displayed by default._ 

---

_**Freeboard** is a port of http://www.42.co.nz/freeboard for use with Signal K communication protocols and server features._

---

## System Requirements:

For all Freeboard features to be fully functional, it requires that the Signal K server in use be able to provide the necessary services for the following paths:

1. `reources/routes`, `resources/waypoints`, `resources/notes`, `resources/regions` - Serve resources as well as accept and persist resource data submitted to these paths.

2. `resources/charts` - Serve chart resources.

3. `navigation/anchor`, `notifications/navigation/anchor` - Serve and accept `position`, `maxRadius` values as well as calculate `currentRadius` and serve notifications.

4. `notifications/environment/depth` - Serve notifications for `belowKeel`, `belowSurface` `belowTransducer`.

5. `navigation/courseGreatCircle/activeRoute` - Serve and accept `href` & `startTime` values to allow a route to be set as active. It is expected that the server will initiate any subsequent calculations and related value updates.

6. `navigation/courseGreatCircle/nextPoint` - Serve and accept `position` values to allow a waypoint to be set as a destination. It is expected that the server will initiate any subsequent calculations and related value updates.

7. **Playback History** - Implement the Signal K Playback api (`/signalk/v1/playback`)

These functions may be provided natively by the server or through the use of *plugins*.

For example the following plugins installed on the *Signal K node server* will enable full functionality:
- freeeboard-sk-helper _(Course information)_
- sk-resources-fs _(Routes, Waypoints, Notes & Regions provider)_
- @signalk/charts-plugin *(Charts provider)*
- signalk-anchoralarm-plugin *(anchor alarm settings & notifications)*
- signalk-simple-notifications *(depth alarm notifications)*

---

### Integrate Instrument Apps
![Server Instruments](https://user-images.githubusercontent.com/38519157/46716813-00d27080-ccad-11e8-98a3-ab4b4f47df11.png)

### Vessel Up Display
![Vessel Up](https://user-images.githubusercontent.com/38519157/46716759-cf59a500-ccac-11e8-9ac5-68a7f3429f4a.png)

### North Up Display
![North Up](https://user-images.githubusercontent.com/38519157/46716737-bc46d500-ccac-11e8-9d31-87cfffb1ad3b.PNG)


---

## Development:

Freeboard is an Angular project generated with [Angular CLI](https://github.com/angular/angular-cli).
It is recommended that the Angular CLI be installed globally `npm i -g @angular/cli@latest` prior to following the steps below.

1. Clone this repository.

2. Run `npm i` to install Angular CLI and project dependencies. *Note: this will also build the project placing the deployable application files in the `public` folder.*

3. Run `npm start` or `ng serve` to start a development web server and then navigate to `http://localhost:4200/` to load the application. The application will automatically reload once you save changes to any of the source files.

### Note:

The Freeboard application will look to connect to a Signal K server at the *ip address:port* contained in the url of your browser. 

During development, if a Signal K server is not running on your development device, you are able to specify the Signal K server api / stream host you wish to connect to by editing the `DEV_SERVER` object in the `src/app.info.ts` file.
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
    - Files generated using `ng build`


_They will __NOT__ apply when using **Production Mode**, the generated application will attempt to connect to a Signal K api / stream on the hosing server._

    - `ng serve --prod`
    - Files generated by `ng build --prod`

---

### Building a Release:

#### Angular Build

To build the Freeboard application use the `ng build --prod` command.

Built application files for deployment are placed in the `/public` folder.

#### NPM package

To build the NPM package use `npm pack` command which will:
1. Build the application using `ng build --prod`. 
2. Create the NPM package `*.tgz` file.


Built `*.tgz` file is placed in the `/` root folder.

