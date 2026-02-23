# CHANGELOG: Freeboard

### v2.19.next

- **Update**: Delay display of welcome screen until after config is loaded from server. (#322)
- **Update**: Activating a Route will now start at the closest point that is forward of the vessel. (#319)
- **Update**: End route navigation after arrival at last point using Course "auto-advance" settings. (#326)
- **Update**: Add watch dog to indicate when no messages are received from the server for 8-10 seconds over an open connection. (#317)
- **Update**: Added last position timestamp, CPA and TCPA to vessel details.
- **Fix**: Long press in map popover displays context menu (#323) 

#### Experiment: 
- Initial `RADAR API` support.
