# CHANGELOG: Freeboard-SK



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



