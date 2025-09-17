const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Deprecation Notice',
    message: `
        <b>Weather Service</b>
        <br>&nbsp;<br>
        With the recent release of the Weather API in Signal K server v2.16.0
        the built-in weather service is now deprecated and will be removed in an
        upcoming release.
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
