var $ = require('jquery');
var WebSocket = require('ws');
var debug = require('debug')('signalk:ws');
var browser = require('browser');
var Promise = require('bluebird');

var connection;
function connectDelta(hostname, callback, onConnect, onDisconnect) {
	debug("Connecting to " + hostname);
	var url = "ws://"+hostname+":3000/signalk/stream/v1?format=delta&context=self";

	debug("Using ws");
	connection = new WebSocket(url);
	connection.onopen = function(msg) {
		debug("open");
		onConnect();
	};
	connection.onerror = function(error) {
		debug("error:" + error);
	};
	connection.onmessage = function(msg) {

		//for debug
		//console.log(msg.data);
		var mObj = JSON.parse(msg.data);
		callback(mObj);

		//TODO: Note memory leak in native websockets code  - https://code.google.com/p/chromium/issues/detail?id=146304

		//var mArray=m.data.trim().split(",");
		$.each(listenerList, function(i, obj) {
			//console.log("Send msg to "+obj);
			obj.onmessage(mObj, connection);
		});
		//mArray=null;
		msg=null;
	};

}

var listenerList = [];

function send(msg){
	if(connection)connection.send(msg);
}

function disconnect() {
	connection.close();
	debug('Disconnected');
}

function addSocketListener(l){
	console.log("Adding "+l);
	//is it already there, if so remove it
	///$.each(listenerList, function(i){
	//    if(listenerList[i] &&  listenerList[i].constructor === l.constructor) listenerList.splice(i,1);
	//});
	//add new
	listenerList.push(l);
}


function getSelf(host) {
	return new Promise(function(resolve, reject) {
		browser.ajax("http://" + host + "/signalk/api/v1/vessels/self", resolve, reject);
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