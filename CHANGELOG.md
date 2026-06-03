# CHANGELOG: Freeboard

### v2.24.0-beta.1

- **Added**: Preview Radar API support - Enable toggle on/off of radar overlay.
- **Update**: Improve custom resource selection probes after connection to server (#377)
- **Added**: Ability to select waypoint icon for more waypoint types (#378)
- **Update**: Add `dive-site` POI icon (#379)
- **Update**: Remove backdrop from chart opacity slider and set opacity as slider moves (#380)
- **Update**: Include "Go fullscreen" button in items hidden when hosted in iframe (#382)
- **Fix**: Updated S57 attribute regex to include underscore in match criteria to stop objects rendering as black (#383)
- **Update**: Lazy-load dialog components on demand (#384)
- **Update**: Adopt `takeUntilDestroyed` for Observable subscriptions outside of lifecycle hooks (#385)
- **Update**: Cache S57 derived text-style config across features (#388)
- **Update**: Re-position info-panel to right side of screen.


### v2.23.0

- **New**: Information panel providing a more complete display of resource details and actions. Includes support for displaying formatted markdown content in resource descriptons. (#373)
- **Added**: Settings to enable configuration COG and Heading line styles. (#375)  
- **Fix**: S-57 popover to tolerate chart attributes in differing formats. (#372)  


