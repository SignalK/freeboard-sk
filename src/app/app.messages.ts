const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'RADAR Overlay',
    message: `
        New RADAR API support.
        <br>&nbsp;<br>
        Display a RADAR overlay when your Signal K Server is connected to a
        MAYARA server.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html" target="help">HELP</a> 
        for more details.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'Waypoint Icons',
    message: `
        You can now change waypoint icons in the Waypoint Details screen.
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
