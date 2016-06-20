var $ = require('jquery');
var signalkClient = require('signalk-client').Client;
var debug = require('debug')('signalk:ws');
var Promise = require('bluebird');

var signalk = new signalkClient;

var thisCallback = function(msg) {

	//for debug
	//console.log(JSON.stringify(msg));

	$.each(listenerList, function(i, obj) {
		//console.log("Send msg to "+obj);
		obj.onmessage(msg, connection);
	});
	msg=null;
};

var connection;
function connectDelta(host, callback, onConnect, onDisconnect) {
	debug("Connecting to " + host);

	console.log("Could not use mdns, falling back to "+host);
	connection=signalk.connectDelta(host,
            thisCallback,
            function(skConnection) {
              skConnection.subscribeAll();
              onConnect();
            },
            disconnect,
            function(error) {
              console.log(error)
            },
            'self'
          );
				}


var listenerList = [];

function send(msg){
	if(connection)connection.send(msg);
}

function disconnect() {
	connection.close();
	debug('Disconnected');
}

function addSocketListener(l, name){
	console.log("Adding "+name);
	//is it already there, if so remove it
	///$.each(listenerList, function(i){
	//    if(listenerList[i] &&  listenerList[i].constructor === l.constructor) listenerList.splice(i,1);
	//});
	//add new
	listenerList.push(l);
}


function getSelf(host) {
	return new Promise(function(resolve, reject) {
		$.ajax("http://" + host + "/signalk/v1/api/vessels/self", resolve, reject);
	});
}

function getSelfMatcher(host) {
	return getSelf(host).then(function(selfData) {
		var selfId = selfData.mmsi || selfData.uuid;
		var selfContext = 'vessels.' + selfId;
		return function(delta) {
			return  delta.context === 'self' || delta.context === 'vessels.self' || delta.context === selfContext;
		}
	});
}

module.exports = {
	connectDelta: connectDelta,
	addSocketListener: addSocketListener,
	send: send,
	disconnect: disconnect,
	getSelf: getSelf,
	getSelfMatcher: getSelfMatcher
}
