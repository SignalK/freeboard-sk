const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Deprecated PyPilot Settings',
    message: `
        This release removes the Pypilot settings from the Plugin Config
        and only uses the Signal K Autopilot API.
        <br>&nbsp;<br>
        <i>Note: To continue Pypilot operation in Freeboard-SK
          install and configure the <a href="https://github.com/panaaj/pypilot-autopilot-provider" target="blank">
          pypilot autopilot provider plugin</a>  on your Signal K server.
        </i>
        <br>&nbsp;<br>
        See Signal K server help for more details.
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
