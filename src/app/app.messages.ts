const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Deprecation Notice',
    message: `
        The built-in <b>Weather Service</b> has been removed!
        <br>&nbsp;<br>
        Weather forecast functionality remains available when using 
        Signal K server v2.16 (or later) and a weather provider plugin from the AppStore.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html" target="help">HELP</a> 
        for more details.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'New Feature',
    message: `
        <b>Map Overlays</b>
        <br>&nbsp;<br>
        Overlays allow map data from WMS & WMTS sources to be overlayed onto charts and can be 
        configured to refresh at regular intervals.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html" target="help">HELP</a> 
        for more details.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'New Feature',
    message: `
        <b>Hazardous Area Alarm</b>
        <br>&nbsp;<br>
        Attribute a region as hazardous which will sound an alarm when the vessel enters
        its bounds.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html" target="help">HELP</a> 
        for more details.
      `
  }
];

export const WELCOME_MESSAGES = {
  welcome: {
    title: 'Welcome to Freeboard',
    message: `Freeboard is your Signal K chartplotter WebApp from which
                  you can manage routes, waypoints, notes, alarms, 
                  notifications and more.`
  },
  'signalk-server-node': {
    title: 'Server Plugins',
    message: `Some Freeboard features require that certain plugins are installed to service the 
                  required Signal K API paths.
                  <br>&nbsp;<br>
                  See <a href="assets/help/index.html" target="help">HELP</a> 
                  for more details.`
  },
  experiments: {
    title: 'Experiments',
    message: `
                  Experiments are a means for testing out potential new features
                  in Freeboard.
                  <br>&nbsp;<br>
                  You can enable Experiments in <b><i>Settings</i></b>.
                  <br>&nbsp;<br>
                  Check out <a href="assets/help/index.html#experiments" target="help">HELP</a> 
                  for more details.`
  },
  'whats-new': WHATS_NEW
};
