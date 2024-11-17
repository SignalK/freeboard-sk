# CHANGELOG: Freeboard


### v2.12.2
- **Fixed**: Issue applying URL query parameters. (#201)
- **Fixed**: S57 symbol display issue. (#202)
- **Added**: Watch for SK login info token changes.


### v2.12.1
- **Added**: WMS sources to the type of chart sources that can be defined.
- **Fixed**: Date / time formating in weather forecast. (#193)
- **Fixed**: Fix issue where anchor watch controls are not visible on small screens. (#198)
- **Fixed**: Vessel Call sign not displayed correctly in AIS Properties screen. (#199)


### v2.12.0

- **Added**: Define chart sources from within the Charts List including: WMTS, Mapbox Style and TileJSON.
- **Updated**: Measure distances < 1km are displayed in meters and < 0.5NM uses depth units (#194). 
- **Updated**: Ensure weather forecast times use 24 hr format. (#193)
- **Updated**: OpenSea Map min / max zoom levels.
- **Updated**: OpenLayers v10. 
- **Fixed**: gybeAngle null value handling.

### v2.11.5

- **Fixed**: Issue when moving waypoint.
- **Fixed**: Downwind mark laylines. 
- **Fixed**: Chart type metadata value processing. 

### v2.11.4

- **Updated**: Style waypoints using defined list of "type" attribute values.
- **Added**: Debug data capture option to experiments. 

### v2.11.3

- **Fixed**: VMG not being displayed in course data when destination is active. 

### v2.11.2

- **Updated**: Proxy mode operation is now the default and configuration option removed. (#159)
- **Added**: Setting to mute all sounds regardless of notification ALARM_METHOD value.(#178)
- **Updated**: Show total length of Route when editing. (#171)
- **Updated**: When editing a route (on a touch device) `long-press` on a route point to delete it. (#169)
- **Added**: Toggle charts on/of by clicking chart boundaries on map.
- **Added**: Lock in `Follow Vessel` setting to remain in this mode when map is panned. (#185)
- **Fixed**: Not rendering laylines when preferred path is `environment.wind.directionMagnetic`. (#184)
- **Fixed**: Cursor position display formatting issue when using `028°15.345'S` format. (#188)

### v2.11.1

- **Fixed**: Display of AIS COG vector does not honor setting value. (#180)
- **Added**: Separate setting for AIS COG vector.

### v2.11.0

- **Added**: COG vector for AIS vessels. (#180)
- **Added**: Flag / Un-flag AIS vessels. (#165)
- **Added**: Initial support for `navigation.racing`. _(Display start line)_
- **Updated**: Improved AIS target processing.
- **Fixed**: AIS vessels not correctly oriented when preferred path is not available. (#182)

### v2.10.0

- **Updated**: Scale up AIS icon sizes (#180).
- **Updated**: Scale down AtoN icon sizes (#179).
- **Added**: Option to filter out vessels without an IMO registration (#174).
- **Updated**: Compass widget in Weather Station popover (#173).
- **Updated**: Add waypoint styles to routes (#168).
- **Updated**: S57 chart styles (@wdantuma).
- **Updated**: Angular framework to v18 & Material 3

### v2.9.1

- **Added**: Ability to filter vessels by `AIS Ship Type` (#163).
- **Added**: Display `performance.beatAngle` and `performance.gybeAngle` vectors on the map.
- **Fixed**: Meteo properties `environment.water.waves` display formatting.
- **Fixed**: Anchor watch not available when plugin is installed and enabled.
- **Fixed**: Laylines not displayed if performance paths do not contain values.
- **Updated**: Don't show internet map service dialog in kiosk mode. (#166)

### v2.8.4

- **Fixed**: shore.basestation popover & properties not displayed.
- **Fixed**: Use performance data values to control layline display (#149).
- **Updated**: Display moored vessels with different image (#164).
- **Updated**: Color AIS vessels based on value of `design.asiShipType` (#162).

### v2.8.3

- **Fixed**: Laylines being shown when vessel is upwind (#149).
- **Fixed**: True wind vector display when using `angleTrueGround` or `angleTrueWater`.
- **Fixed**: Focussed AIS target hidden behind other vessels.
- **Updated**: Display position in preferred format in properties modals.
- **Updated**: Meteo popover to display wind & temperature values. 

### v2.8.2

- **Updated**: Show laylines only when destination is upwind (#149).
- **Fixed**: Apparent wind vector not correct in North-Up mode.

### v2.8.1

- **Fixed**: Unable to clearing alarms on server v2.8 or greater due to 'DELETE' requests not being passed to plugins.

### v2.8.0

- **Added**: Option to display laylines when destination is active. (#149)
- **Added**: Support for Signal K server "Features" API.
- **Updated**: Measure function displays both segment details and total distance. (#153)
- **Updated**: Clearing an alarm sets alarm state to normal rather than `null`.
- **Fixed**: Inverted label color not correctly applied after feature update.

### v2.7.1

- **Added**: Set a default waypoint name when adding a waypoint at vessel position. (#146)

### v2.7.0

- **Added**: OpenWeather OneCall v3.0 support. _(v2.5 is deprecated April 2024)_
- **Added**: OpenWeather service polling watchdog to protect against excessive API calls.
- **Added**: Kiosk mode to support view-only operation.
- **Update**: Hide login / change user menu item when token supplied in url parameter.
- **Update**: Measurement not shows angle as well as distance. (#145)
- **Fixed**: Settings menu overflow on smaller screens. (#144)
- **Fixed**: Weather station name display in popover when not closed. (#147)


### v2.6.1

- **Added**: Options to display and configure Heading and COG lines on map. (#138)
- **Added**: Additional position display format option (e.g. 020° 44.56' E).
- **Updated**: Use HTTP credentials when user is already logged in via Admin UI. _(signalk-client-angular@2.0.3)_ 
- **Updated**: Angular framework version (v17.3)
- **Updated**: OpenLayers (v9.0)

### v2.6.0

- **Added**: Ability to show / hide toolbar buttons on both sides of the screen.
- **Added**: Route builder. 1st release allows creating a route from waypoints.
- **Added**: Support for displaying S57 vector charts converted using [s57-tiler](https://github.com/wdantuma/s57-tiler).
- **Updated**: Resources created outside of Freeboard UI (plugins, etc.) are now selected for display on the map. Previously these had to be manually selected from the relevant list.
- **Fixed**: Wind speed values in vessel popover showing 0 rather than - when no value is present.

### v2.5.0

- **Added**: In the chart list, toggle the display of the bounds of all available charts on the map.
- **Added**: Displaying vector charts with defined styles in a Mapbox style JSON file.
- **Updated**: New Map icons for waypoints and AIS targets.

**Weather** moves from `experiment` ->  feature with the introduction of the `meteo` context as per [nmea0183-signalk PR #245 - VDM Msg 8](https://github.com/SignalK/nmea0183-signalk).

- **Added**: Display weather stations on the map and view observation data.
- **Added**: Weather data relative to vessel position, sourced from _OpenWeather_, including hourly forecasts is available via the `meteo.freeboard-sk` context.
- **Removed**: Option to use NOAA as weather source.

**Experiments**: 
- **Routes**: Render start / Finish line for the active route when values are present in route meta data.

### v2.4.0

- **Added**: Ability to shift anchor position.
- **Fixed**: Issues where "Constrain Zoom" button did not toggle color to reflect status.

### v2.3.2

- **Fixed**: GPX load screen not displaying list of resources to select.
- **Updated**: Openlayers version 8.

### v2.3.1

- **Fixed**: Issue in autopilot display where +/- adjustment buttons were not sending data to Pypilot.

### v2.3.0

- **Added**: Display a badge on menu icon when server has security enabled and client is not authenticated.
- **Added**: Autopilot console for use with built-in PyPyilot integration.
- **Added**: Display location of Man Overboard alarm on map.
- **Added**: Additional remove AIS target timeout options.
- **Updated**: Align anchor watch UI to anchor-alarm API operation.
- **Updated**: Display the waypoint name when a route point is a reference to a waypoint resource.
- **Updated**: Use updated typings in `@signalk/server-api`.

### v2.2.6

- **Fixed**: Issue where anchor watch could not be set when Signal K server had security enabled. _(Requires signalk-anchoralarm-plugin v1.13.0 or later)_

### v2.2.5

- **Added**: Ability to toggle AIS label color between dark and light to improve visibility on satellite imagery.
- **Fixed**: Authentication error on plugin startup on systems with security enabled.

### v2.2.4

- **Fixed**: GPX Load errors caused by routes with no name and / or description causing validation errors.

### v2.2.3

- **Fixed**: Do not make "Fixed Location" mode the default.

### v2.2.2

- **Fixed**: Update Anchor Watch to use `signalk-anchor-alarm` REST API to resolve incorrect state being displayed.
- **Fixed**: Switching to fixed location did not update map until a delta update had been parsed.

### v2.2.1

- **Fixed**: Issue where waypoint was not centered on the screen when the center waypoint button was clicked from the entry in the waypoint list.

- **Fixed**: Issue where invalid fixed location postion was being written to settings.


### v2.2.0

- **Added**: Ability to center a vessel in the Vessels List.
- **Added**: Fixed Location Mode for when operating from a building or other fixed location.

### v2.1.0

- **Added**: Ability to limit map zoom to min / max of displayed charts.

- **Fix**: Issue handling port value when no port is specified in host url.

### v2.0.2

- **Fix** Update signalk-client-angular library to address issues creating resources when not using ssl.

### v2.0.1

- **Fix** `tslib` dependency`.

### v2.0.0

__** BREAKING CHANGES **__ 
- Freeboard-SK now requires Signal K API Version 2 as it makes extensive use of both the new `Resources` and `Course` APIs.

- Standard Alarms provider: Freeboard-SK now acts as a provider for standard Signal K alarms and no longer requires the `freeboard-sk-helper` plugin to set and clear these alarms _(i.e. Man Overboard, Sinking, etc.)_. 
This function can be enabled / disabled in the **Plugin Config** section of the Signal K admin console.

__UPDATES:__ 

- **Added**: Restart course calculations using the current vessel position

- **Added**: Reverse direction a route is followed.

- **Added**: Display arrow(s) showing the direction the active route is being followed.

- **Added**: Advance to next route point button to arrival notification to .

- **Added**: Setting to select auto advance to next route point on arrival with choice of time delay.

- **Added**: Option to delete attached notes when deleting a resource.

- **Added**: Ability to enter `name` and `description` for a region resource.

- **New**: Support for PMTiles map files (`raster` and `vector`).

- **New**: Detect "circular routes" _(first and last points have the exact same coordinate)_ allowing Issue where vessel wind vector on map was not displayed when heading was 0 degrees

- **New**: `host` and `port` url params to enable connection to an alternate Signal K server.

- **Fix**: Issue where audio was played when notification was 'visual' only.

- **Fix**: Issue where vessel wind vector on map was not displayed when heading was 0 degrees.

- **Change**: Notes are only displayed on the map if they have a valid position. Notes attached to a resource / region are only available in the notes list of that resource.

- **Change**: Updated to use Openlayers v7.

- **Experiments:** _(via `Server Admin -> PluginConfig -> Freeboard-SK`)_

    - Display Weather forecasts and warnings from OpenWeather.

    - Autopilot support (PyPilot).

### v1.22.1

- **Add**: Additional settings to control the way vessel trail is retrieved from the server.

- **Update**: Improved rendering of vessel trail when retrieved from the server.

- **Fix**: Trail to Route not honoring `Include Trail from Server` on tolerance change.


### v1.21.2

- **Update**: Allow seconds to be specified when setting targetArrivalTime.
- **Fix**: Error handling when targetArrivalTime.


### v1.21.1

- **Fix**: VMG display value is incorrect.


### v1.21.0

- **Add**: Ability to apply targetArrivalTime when a destination is active at the path navigation.course.targetArrivalTime

- **Add**: Support to display Icon in WebApps list.


### v1.20.0

- **Add**: Ability to supply url parameters to set the following configuration: `northup`, `zoom` and `movemap`. See Help for details. (closes #110)

- **Experiment**: View weather forecast information provided by `openweather-signalk` plugin. 


### v1.19.4

- **Update**: Change select all/none on resource lists to only operate on the visible (filtered) list items. (closes #107)


### v1.19.3

- **Add**: Speed units selection option added to settings. (closes #104)

### v1.19.2

- **Fix**: Coordinate display issue when format is DegMinSec. (closes #105)

### v1.19.1

- **Fix**: Issue where vessel name and MMSI not being received in stream connection after upgrading to server version 1.41.0

### v1.19.0

- **Add**: Add a default name to imported GPX tracks when no name is defined in the source file.

- **New**: Attach notes to waypoints and routes.

### v1.18.3

- **Add**: Display ETA to destination point (in local time) from `navigation.courseGreatCircle.nextPoint.estimatedTimeOfArrival`.


### v1.18.2

- **Fix**: Vessel wind vector lines not being displayed.


### v1.18.1

- **Fix**: Remove offset to Openlayers chart max zoom.


### v1.18.0

- **Add**: Export Waypoints and Routes to GPX file.

- **Fix**: Apply small offset to Openlayers chart min/max zoom values to ensure charts are visible at:  zoom levels = min zoom value and fractional zoom levels between max zoom & max zoom + 1.

- **Fix**: Zoom level rounding causing jumpy zooming when using mouse scroll.


### v1.17.0

**BREAKING CHANGES**

- Older iOS devices (12 and earlier) require the `Pointer Events` to be enabled in `Settings | Safari | Advanced | Experimental Features` to allow touch gestures on the map for panning, etc.

---

- **New**: Create Route from vessel trail.

- **New**: Prevent your device from entering sleep mode whilst using Freeboard-SK. (Supported devices only).

- **Fix**: Modern browsers do not allow audio to autoplay without user interaction. This can cause alarms not to sound if they are active upon app start. A warning is now displayed if web audio is detected to be in a suspended state upon app start.

- **Fix**: Improved mobile device behaviour by addition of mobile specific style and meta attributes. 

- **Update**: Alarm panel uses Signal K api PUT rather than stream delta to raise and clear alarms. _(Requires freeboard-sk-helper v1.4.0 or later)_

- **Update**: Upgrade to Angular 12.

- **Update**: Updated Signal K client. _(Requires signalk-client-angular v1.8.0 or later)_

- **Update**: Completely re-written Map components using OpenLayers 6.5. `fb-openlayers` library source code is located in the `project` folder.

- **Deprecated**: GRIB experiment.

### v1.16.3

- **Update**: Auto-reconnect to Signal K server if stream connection is lost. (closes #97)

### v1.16.2

- **Update**: Waypoint list to identify `PsuedoAtoN` resources. 

- **Fix**: Internet connection test made non-blocking. (closes #96)

- **Fix**: Resource list refresh to honour applied filter.

- **Fix**: Waypoint / Note visibility on map when selections changed.

### v1.16.1

- **Add**: `PseudoAtoN` Waypoint type. 

- **Fix**: Various rendering issues when in dark mode.

### v1.16.0

- **Add**: Initial support for VectorTile chart types. Charts with a format attribute of "pbf" or "mvt" will be rendered as vector tiles and displayed with a default style. 

- **Add**: Initial support for selecting alternative AIS (other vessels) profiles. 

- **Add**: Support for @signalk/tracks plugin. 

- **Update**: Replaced note editor component. 

- **Fix**: Issue where fetching note for edit was non-responsive due to invalid meta request. 


### v1.15.3

- **Fix**: Add `no-cache` directive to index.html to enforce loading from the server to address loading screen not disappearing after version update.

### v1.15.2

- **Fix**: GPXLoad not correctly handling 202 PENDING response.

- **Add**: Include GPX route point names in the Route GeoJSON properties.

### v1.15.1

- **Fix**: OpenSeaMap chart display issue (closes #94).

### v1.15.0

- **Add**: Add settings to define the maximum time elasped between updates to mark AIS vessels
as inactive and for removal from map. (closes #93)

- **Add**: Support display of additonal targets (aircraft, SaR, shore.basestations)

- **Add**: Settings to select target types to display on the map and their scope (distance from vessel).

- **Fix**: Issue where config loaded from server not correctly displayed in Settings screen.

- **Fix**: Apply resource selections after config loaded from server.

- **Fix**: Auth persistance upon session refresh.

- **Fix**: Android map touch panning / zooming issue related to touch events.


### v1.14.2

- **Update**: Allow anchor watch radius to be changed when anchor is down.


### v1.14.1

- **Added**: Display track for AIS vessels.

- **Update**: Removed some annoying rendering issues when using the Anchor Watch screen.


### v1.14.0

- **Added**: Display ResourceSet data from user-defined resoource paths.

- **Added**: Upload data to user-defined resoource paths.

- **Update**: Consolidate resource layer display under one toolbar button.

- **Update**: Moved Load GeoJSON and Tracks display out from under experiments.

- **Update**: Move chart re-ordering to within the chart list (closes #88).


### v1.13.1

- **Fix**: Handling of receiving `navigation.position` with a `null` value.


### v1.13

- **Added**: Display of path line between `previousPoint` and destination (`nextPoint`).

- **Added**: Additional vessel trail settings to select the length of trail retrieved from the server.

- **Added**: Setting to enable / disable close button on map popovers.

- **Added**: Setting to enable / disable double click to zoom the map.

- **Fix**: Issue where default world map was not displayed if server returned no charts.

- **Fix**: Remove map rotate interactions to ensure map orientation remains correct.

- **Fix**: Delta message handling to cater for meta deltas (server v1.37).


### v1.12

- **Added**: Display vessel trail from server provided by `signalk-to-influxdb (v1.8.0)`.

- **Added**: Define an Arrival Circle for current destination (PUT to `navigation.courseGreatCircle.nextPoint.arrivalCircle`). Will display notifcation (`notification.arrivalCircleEntered`) when approaching destination (requires `freeboard-sk-helper v1.21.0`).

- **Added**: PUT to `navigation.courseGreatCircle.previousPoint.position` with position of vessel when activating a destination to navigate to.

- **Fix**: Issue where saved settings were being reset when new version detected.

- **Experiment**: Load resources from GeoJSON feature collection.

### v1.11

- **Added**: North indicator on map.

- **Added**: GPX Track import support `Experiment` (requires `freeboard-sk-helper`).

- **Fixed**: Issue where map was not rotated until `Heading Up` was de-selected and re-selected if application was started in `Heading Up` mode.

### v1.10

- **Added**: Ability to order the chart layer position via drag and drop. Addresses the issue where charts are not visible as they are "below" other charts.


### v1.9

- **Added**: Configuration setting to hide vessel wind vectors.

- **Added**: Configuration setting to select position display format.

- **Added**: Storing user _Settings_ on the server. 
    
    Settings are __stored__ on the server automatically when user is logged in.

    Settings from the server are __applied__:
    - During Freeboard startup _(if user is already authenticated on the server)_
    - After _Log In_ or _Changing User_ via the Freeboard UI.

- **Update**: Re-order route points by drag and drop within route _Points_ screen.

- **Update**: Version __1.7__ of __signalk-client-angular__ which adds support for `applicationData` API in _node-server v1.27.0_.


### v1.8.5

- **Update**: `navigation.anchor` delta messages (maxRadius, raise / lower) not being processed.

- **Update**: Destination point / active route point info display. 

- **Fix**: Context menu on touch devices not getting correct location.

### v1.8.4

- **Update**: Support node server fix to correct `aton` delta context (corrected from `atons`).

- **Update**: Support node server implementation of `apps/list`.


### v1.8.3

- **Fix**: Issue where navigation data (bearing, DTG, etc to destination) was not being updated.


### v1.8.2

- **Change**: Created Routes (Draw or from GPX import) no longer create Waypoint records for first and last route coordinates. `start` and `end` attributes are set to `null`.

- **Change**: Normalise coordinates (between -180 and 180) for map actions to cater for map wrapping. 

- **Fix**: Cursor position display showing values <-180 and >180

- **Fix**: Moving a waypoint would set it as the active destination regardless of whether it was set or not.


### v1.8.1

- **Fixed:** When adding a waypoint it was not "selected" for display when a PENDING 202 response is received.

- **Fixed:** Route, Note and Chart list display issue where a long name would
cause the "selection checkbox" not to be displayed.

- **Fixed:** Map button rendering issues in iOS.

- **Fixed:** Issue where OS dark mode was not always being detected correctly.


### v1.8.0
- **Added:** Display `Aids to Navigation` _(AtoN)_ on map. Show AtoN properties. 

- **Added:** Center `Note` or `Waypoint` on map from list display. 

- **Added:** Ability to mark WebApps as favourites and switch between them in the `Instrument Panel`. 

- **Added:** Experimental support for `GRIB2JSON` formatted resources at the path `./resources/grib`.
_(Requires `freeboard-sk-helper` plugin)_

- **Update:** OpenLayers 5.

### v1.7.0
- **Added:** Alternate color scheme (`Dark mode`) configuration setting with options to use either the: 
    1) Device OS setting via the `prefers-color-scheme` css media attribute
    2) Signal K `environment.mode` value.  

- **Added:** `Fullscreen` mode support. _(Note: only available if app is not embedded in another web page / app.)_

- **Added:** Configuration to select `preferred Signal K paths` to use for
vessel `heading`, `True Wind speed` and `direction` from the available paths.

- **Added:** Configuration to specify parameters to the Instrument Panel App. These are appended to url as a query string.


### v1.6.0
- **Added:** `Context menu` when you right click on map with `Navigate to here`,  
`Add Waypoint here`, `Add Note here` and `Measure` options.

- **Added:** Enable / support map keyboard control.

- **Update:** Added `wind.speedOverGround` as a TWS source. 

- **Added:** Initial support for Picture in Picture from video stream for compatible browsers.

- **Fixed:** Display format of `ETA` in vessel information dialog. 

- **Fixed:** Vessel name of `self` not being displayed in vessel popup.


### v1.5.2

- **Fixed:** Display of `callsign` and `destination` in vessel information dialog. 


### v1.5.1

- **Update:** Added `Last Updated` time back to vessel popup. 

- **Update:** Vessel `Info` dialog displays additonal information e.g. Dimensions, Port, Flag, etc.


### v1.5.0

- **Update:** Updated to Angular 8.

- **Update:** Moved Signal K stream processing to Web Worker.

- **Added:** Display `Closest Approach` notifications and show vessel on map 
_(for node server requires signalk-derived-data plugin v 1.23.0 or greater)_.

- **Added:** Display notifications sent from `signalk-buddylist-plugin`. 


### v1.4.1

- **Fixed:** AIS vessel icon orientation when only COG is available.

- **Added:** Clicking on acknowledged alarm opens Alarms screen.

- **Feature:** Initial support for selecting any vessel as the `active` vessel.

_Note: Setting the focus on another vessel will direct all PUT requests destined to a `signalk/v1/api/vessels/` path to the selected vessel. Actions may fail if the server does not support PUT's to these paths._


### v1.4.0

- **Added:** View / add `Notes`.

- **Added:** Create `Regions` and add notes to a region.

- **Added:** Move `Waypoint` and `Note` position as well as modifying `Route` and `Region` vertices. 

_Note: `MultiPolygon` regions are displayed on the map but are not currently supported for modification._

- **Added:** Setting to halt the selected Instrument App when the panel is hidden. This allows
resources to be freed when instruments are not being displayed. Instrument App is re-started 
each time the panel is opened.

- **Deprecated:** Option to use delta updates as a means of submitting resource changes.

- **Fix:** Disable `Add Waypoint at Vessel` menu item when no vessel position is available.

- **Fix:** Disable `Delete` button of Active Route in Route List.

- **Fix:** Orientation of vessel display when only COG value (no HEADING value) is present.


### v1.3.2

- **Update:** Update to `signalk-client-angular` v1.5.1


### v1.3.1

- **Fix:** Issue where measured distance was not using Great Circle calculation. (Closes #69)

- **Fix:** Issue where AIS target heading was not displayed correctly in popover.


### v1.3.0

- **Added:** Raise M.O.B., Sinking, Piracy, Fire, etc. alarms.
- **Enhancement:** Alarm display will now `minimize` acknowledged alarms until the alarm is cleared.
- **Enhancement:** Add ability to choose the miimum zoom level at which `Other Vessels` wind vector is displayed.
- **Change:** Changed the `Preferred Heading` configuration setting to be `Use True / Magnetic Values`. The selection made in this setting will cause Freeboard to use the chosen Signal K (path where a value has both a True and / or Magnetic path) e.g. `environment.windDirectionTrue`,  `environment.windDirectionMagnetic`. 

_Note: If the selected path is not available in the data stream NO value is shown!_

### v1.2.1

- **Fix:** Issue where wind values for AIS targets was not received.
- **Fix:** Display alignment of AIS targets and wind vectors when map is zoomed
- **Fix:** Add default name for vessels in vessels list with no name or mmsi data


### v1.2.0

- **Enhancement:** In Playback mode display timestamp of received data.
- **Added:** Filter display of `Other Vessels`. Select the specific vessels you want to appear on the map.
- **Enhancement:** Display `wind vector` of `Other Vessels` at high zoom levels (>14) when data is available for the vessel. Displayed vector can be either `True` or `Apparent` wind value, this is configured in `Settings` screen.

### v1.1.0

- **Added:** Initial support for History and Playback APIs
- **Added:** Display Navigation data from `navigation.courseGreatCircle.nextPoint` when available
- **Added:** `Navigate To`: Select waypoint as course destination
- Display `Prev / Next` point buttons to cycle through points of `Active Route`
- **Added:** Login / Authentication: Initial support.
- **Enhancement:** Added `Zoom In / Out` buttons to map display
- **Fix:** Heading, TWD and AWA vessel lines to have consistant appearance at all scales
- **Fix**: Bearing line is now displayed only when course destination point data is available
- **Fix:** TWD & AWA lines not updated when SOG=0

### v1.0.2

- **Fix:** platform checks that were causing MS Edge to throw an exception.

### v1.0.1

- **Fix:** Url used to retrieve app list from non-node servers to include api version number.

### v1.0.0

- Port to Angular framework.
- Align operation across both NodeJS and Artemis Signal K server implementations
- Integrate instrumentation via Apps installed on Signal K server


#### Notes:

Freeboard requires that the Signal K server host is able to service requests to specific api paths to support application operation.

**Resources:**

To be able to create, edit or delete Routes and Waypoints the Signal K server will need to action:

1. HTTP PUT requests to the `/reources/routes` or `/resources/waypoints` paths suitable reource provider  OR
2. Delta updates targeting the `/reources/routes` or `/resources/waypoints` paths.

Errors will be display where HTTP PUT requests to the server fail.

If using delta updates, no failure message will be displayed but Route and Waypoint lists will not reflect the intended changes, as these lists are populated by data returned by the server.

**Anchor Watch:**

To be able to set an anchor alarm the Signal K server will need to action HTTP PUT requests to the foloowing paths:
1. `/signalk/v1/api/vessels/self/navigation/anchor/maxRadius` 
2. `/signalk/v1/api/vessels/self/navigation/anchor/position` 

*If notification messages are received for the path `notifications.navigation.anchor` an alarm message will be displayed on the screen regardless of where the alarm was configured.*

**Active Route / Navigate To:**

To be able to set the Active Route or target Waypoint Signal K server will need to action HTTP PUT requests to the foloowing paths:
1. `/signalk/v1/api/vessels/self/navigation/courseGreatCircle/nextPoint.position` 
2. `/signalk/v1/api/vessels/self/navigation/courseGreatCircle/activeRoute.href` 
3. `/signalk/v1/api/vessels/self/navigation/courseGreatCircle/activeRoute.startTime` 

