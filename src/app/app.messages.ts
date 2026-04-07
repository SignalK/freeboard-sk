const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Notifications & Alarms',
    message: `
        Notification and alarm features in Freeboard-SK now use the
        <b>Notifications API</b> exclusively.
        <br>&nbsp;<br>
        This requires Signal K server v2.22.0 or later to enable
        notification and alarm features to be used.
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
