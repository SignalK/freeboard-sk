# CHANGELOG: Freeboard

### v2.24.0

- **Added**: Radar API support - Enable toggle on/off of radar overlay.
- **Update**: Improve custom resource selection probes after connection to server (#377)
- **Added**: Ability to select waypoint icon for more waypoint types (#378)
- **Update**: Add `dive-site` POI icon (#379)
- **Update**: Remove backdrop from chart opacity slider and set opacity as slider moves (#380)
- **Update**: Include "Go fullscreen" button in items hidden when hosted in iframe (#382)
- **Fix**: Updated S57 attribute regex to include underscore in match criteria to stop objects rendering as black (#383)
- **Update**: Lazy-load dialog components on demand (#384)
- **Update**: Adopt `takeUntilDestroyed` for Observable subscriptions outside of lifecycle hooks (#385)
- **Update**: Cache S57 derived text-style config across features (#388)
- **Fix**: Issue where multiple chart opacity dialogs could be opened (#390)
- **update**: Refactor info-panel open / close triggers (#391)
- **Update**: Re-position info-panel to right side of screen.
- **Added**: Configuration setting to prefer use of info-panel. (#397)

