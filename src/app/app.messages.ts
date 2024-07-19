const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Material 3.0 Theming',
    message: `
        Freeboard-SK user interface now uses Material 3 themes. 
        <br>&nbsp;<br>
        The result is a refreshed user interface appearance, components and light / dark themes.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'S57 Updates',
    message: `
        This release contains updates to S57 map styles:
        <br>&nbsp;<br>
        <li>Show only layers from Base and Standard categories.</li>
        <li>Buoy top markings.</li>
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
