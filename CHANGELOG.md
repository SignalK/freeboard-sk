# CHANGELOG: Freeboard-SK



### v0.1.0

- Port to Angular framework.


#### Notes:

This port of Freeboard to the Angular Framework relies on specific services being available on the host Signal K server for cettain functionality to be available.

**Resources:**

To be able to create, edit or delete Routes and Waypoints the Signal K server will need to respond and action:

1. HTTP PUT requests to the `/reources/routes` or `/resources/waypoints` paths suitable reource provider  OR
2. Delta updates targeting the `/reources/routes` or `/resources/waypoints` paths.

Errors will be display where HTTP PUT requests to the server fail.

If using delta updates, no failure message will be displayed but Route and Waypoint lists will not reflect the intended changes, these lists are populated by data held on the server.

**Anchor Watch:**

To be able to set an anchor alarm Freeboard uses the exposed API of the `signalk-anchor-alarm` plugin. Without this plugin installed the Alarm Watch function will not be available for setting the anchor position or radius.

*If notification messages are received for the path `notifications.anchorAlarm` an alarm message will be displayed on the screen regardless of where the alarm was configured.*



