# CHANGELOG: Freeboard-SK

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

