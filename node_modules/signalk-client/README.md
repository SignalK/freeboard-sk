# signalk-js-client
Signal K JavaScript client library
Install:
=======

`npm install signalk/signalk-js-client`

Mdns is an optional dependency for doing [automatic discovery](http://signalk.org/specification/master/connection.html). It is not relevant in browser environment, but Browserify will fail if you don't ignore or exclude it explicitly as in `--exclude mdns`. For Webpack you can [declare it as an external](https://github.com/SignalK/instrumentpanel/blob/b66047dd6c3382d5981601ed0c7c58d39505fdb6/webpack.config.js#L36).


Usage:
=====

Add:
```
var signalkClient = require('signalk-client').Client;
var signalk = new signalkClient;

var thisCallback = function(msg) {

	//for debug
	//console.log(JSON.stringify(msg));
        //do handling of messages here eg.

	$.each(listenerList, function(i, obj) {
		//console.log("Send msg to "+obj);
		obj.onmessage(msg, connection);
	});
	msg=null;
};

var connection;
// needs (hostname:port, callbackForOnMessage, onConnect, onDisconnect, onError, subscribe)
function connectDelta(host, thisCallback, onConnect, onDisconnect) {
    debug("Connecting to " + host);

    //try mdns
    connection = signalk.discoverAndConnect();
    if(connection){
	 return;
    }
    console.log("Could not use mdns, falling back to "+host);
  
    connection=signalk.connectDelta(host, thisCallback,
        function(skConnection) {
            skConnection.subscribeAll();
            onConnect();
        },
        function (skConnection){
                skConnection.close();
                debug('Disconnected');
        },
        function(error) {
            console.log(error)
        },
        'self'
        );
}

