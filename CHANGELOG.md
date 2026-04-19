# CHANGELOG: Freeboard

### v2.21.0

#### IMPORTANT
**Freeboard-SK now exclusively uses the Notification API to interact with alarms.<br>_To use this functionality Signal K Server v2.22.0 or later is required._**

- **Update**: Improved support for server unit preferences. Added `fathom` depth unit option and `Length` units category.
- **Update**: Added new S57 layer selection setting. (#339)
- **Update**: Remove multiple feature load requests during start up. (#340)
- **Update**: Defer loading of S57 symbols. (#343)
- **Update**: Declutter chart boundary labels to minimise overlapping. (#344)
- **Fix**: Stop sending null for optional Note properties. (#347)
- **Fix**: Incorrect assignment of alarm last update timestamp. (#353)
- **Fix**: Prevent tiles being requested outside of chart bounds. (#356)
- **Fix**: Fix chart properties 404 response for open street / sea maps. (#358)
- **Fix**: Incorrect css class applied to the map scale. (#360)
- **Fix**: Handling of routes and waypoints with missing feature properties. (#366)
- **Fix**: Uncaught exception in CPA line generation when vessel position is missing.

#### Experiment: 
- Initial `RADAR API` support.
