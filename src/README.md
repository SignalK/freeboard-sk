# Freeboard

This is a port of Freeboard (http://www.42.co.nz/freeboard) to use the Signal K communication protocols and utilise Signal K server features.

## Features:

#### Chart Display:

    - *(online)* OpenStreetMap, OpenSeaMap, and WORLD chart outline
    - Charts hosted on Signal K server via `/resources/charts` path

#### Resources:  Routes and Waypoints
    - List / Select resources hosted on Signal K server via `/resources/routes`, `/resources/waypoints` paths
    - Set an active Route
    - Edit Route / Waypoint properties (Name, Description)
    - Draw Route
    - Add Waypoint at: Cursor or Vessel position
    - Delete Waypoint(s) / Route(s) 
    - Import Routes and Waypoints from GPX files

**Note:** Server requests to update data values *e.g. the creation, updating or deletion of resources* requires is can be done via either PUT requests *(default / recommended)* or web socket UPDATES.

This can be selected by the **Use PUT Requests** checkbox in **Settings**.

    
#### Map Display:

    - North-up or Vessel-up 
    - Moving Map or Moving Vessel
    - Vessel Heading / Bearing lines
    - Wind true direction / apparent angle lines
    - Measure distance

#### Alarms:

    Displays both visual and audio alarm indication as specified by the received *Notification* message.

    - Anchor Watch: set radius and raise / drop anchor
    - Depth Notifications.

#### Integration: 

Freeboard allows you to select installed *Applications* to use for the following:

- **Instrument panel**: *(default: `@SignalK/InstrumentPanel`)*

Selected application will be displayed in the Instrument panel drawer.


## System Requirements:

For all Freeboard features to be fully functional, it requires that the Signal K server in use be able to provide the necessary services for the following paths:

1. `reources/routes` and `resources/waypoints` - Serve resources as well as accept and persist resource data submitted to these paths.

2. `resources/charts` - Serve chart resources.

3. `navigation/anchor`, `notifications/navigation/anchor` - Serve and accept `position`, `maxRadius` values as well as calculate `currentRadius` and serve notifications.

4. `notifications/environment/depth` - Serve notifications for `belowKeel`, `belowSurface` `belowTransducer`.

5. `navigation/course/activeRoute` - Serve and accept `href` & `startTime` values to allow a route to be set as active. It is expected that the server will initiate any subsequent calculations and related value updates.

This function may be provided natively by the server or through the use of *plugins*.

For example the following plugins installed on the *Signal K node server* will enable full functionality:
- @signalk/charts-plugin *(Charts provider)*
- GPXLoad *(Routes & Waypoints provider)*
- signalk-anchoralarm-plugin *(anchor alarm settings & notifications)*
- signalk-simple-notifications *(depth alarm notifications)*


### Vessel up
![Vessel Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-vessel-up.png)

### North up
![North Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-north-up.png)


