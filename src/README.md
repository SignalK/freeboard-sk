# Freeboard

This is a port of Freeboard (http://www.42.co.nz/freeboard) to use the Signal K communication protocols and utilise Signal K server features.

## Features:

#### Chart Display:

- *(online)* OpenStreetMap, OpenSeaMap, and WORLD chart outline
- Charts hosted on Signal K server *(requires @signalk/charts-plugin)*

#### Resources:  Routes and Waypoints

    - List / Select resources hosted on Signal K server
    - Set an active Route
    - Edit Route / Waypoint properties (Name, Description)
    - Draw Route
    - Add Waypoint at: Cursor or Vessel position
    - Delete Waypoint(s) / Route(s) 

**Note:** For resources to be Added, Updated or Deleted on the Signal K server, a suitable resource provider plugin is required to be installed on the Signal K server *e.g. GPXLoad*.

If a suitable plugin is not installed it is recommended that the **Use PUT Requests** checkbox in **Settings** be *unchecked* to enable Delta Updates to be sent.
    
#### Map Display:

    - North-up or Vessel-up 
    - Moving Map or Moving Vessel
    - Vessel Heading / Bearing lines
    - Wind true direction / apparent angle lines
    - Measure distance

#### Alarms:

    Displays both visual and audio alarm indication as specified by the received *Notification* message.

    - Anchor Watch: set radius and raise / drop anchor (requires signalk-anchor-watch plugin)
    - Depth Notification display.

#### Integration: 

Freeboard allows you to select installed *Applications* to use for the following:

- **Instrument panel**: *(default: `@SignalK/InstrumentPanel`)*

Selected application will be displayed in the Instrument panel drawer.

- **Resource Manager**: *(default: `none`)*

When selected provides a link to the application at the top of the menu drawer.

### Vessel up
![Vessel Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-vessel-up.png)

### North up
![North Up](https://raw.githubusercontent.com/SignalK/signalk-server-java/master/src/test/resources/samples/freeboard-sk-north-up.png)


