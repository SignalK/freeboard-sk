const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'AIS Vessels',
    message: `
        The following new features have been added:
        <br>&nbsp;<br>
        <li>Ability to Flag vessels.</li>
        <li>COG line is now displayed for AIS vessels.</li>
      `
  },
  {
    type: 'signalk-server-node',
    title: 'Racing Support',
    message: `
        This release contains initial support for <i>navigation.racing</i> paths.
        <br>&nbsp;<br>
        <li>Display start line.</li>
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
