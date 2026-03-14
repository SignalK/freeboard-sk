const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Deprecation Notice',
    message: `
        With the recent release of the <b>Notifications API</b>, Freeboard-SK
        will be moving it's notification and alarm features to use this API
        exclusively in an upcoming release.
        <br>&nbsp;<br>
        Be sure to keep your Signal K server installation up to date
        to ensure notification and alarm features to remain operational.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'New Feature',
    message: `
        <b>Server Unit Preferences</b>
        <br>&nbsp;<br>
        Initial support has been added for unit preferences defined on the Signal K server
        for the speed, depth, distance and temperature unit categories.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html#settings" target="help">HELP</a> 
        for more details.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'Updated Feature',
    message: `
        <b>Range Rings</b>
        <br>&nbsp;<br>
        Define the distance between range rings instead of it being determined by the zoom
        level of the map.
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
