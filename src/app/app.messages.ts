const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'New in this Release',
    message: `
        <b>Resource Groups</b>
        <br>&nbsp;<br>
        Add Routes and Waypoints to groups which can be used to easily 
        display them on the map with a single click.
        <br>&nbsp;<br>
        See <a href="assets/help/index.html#resources" target="help">HELP</a> 
        for more details.
      `
  },
  {
    type: 'signalk-server-node',
    title: 'New in this Release',
    message: `
        <b>Change the vessel Icon size</b>
        <br>&nbsp;<br>
        Added setting to specify the icon size of your vessel.
        <br>&nbsp;<br>
        Go to <i>Settings | Vessels</i> to make your selection.
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
