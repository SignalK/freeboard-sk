var _object = require('lodash/object'),
  EventEmitter = require('eventemitter3'),
  debug = require('debug')('signalk:client'),
  url = require('url'),
  Promise = require('bluebird'),
  agent = require('superagent-promise')(require('superagent'), Promise);


var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var NodeWebSocket;
if(typeof window === 'undefined') {
  try {
    NodeWebSocket = require('ws');
  } catch(e) {}
}

var WebSocket = BrowserWebSocket;
if(!WebSocket && typeof window === 'undefined') {
  WebSocket = NodeWebSocket;
}


//Workaround for Avahi oddity on RPi
//https://github.com/agnat/node_mdns/issues/130
function getSequence(mdns) {
  return [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({
      families: [4]
    }),
    mdns.rst.makeAddressesUnique()
  ];
}

function Client(host, port) {
  this.host = host;
  this.port = port;
}

require('util').inherits(Client, EventEmitter);

/**
 * @module signalk-client
 */

/**
 * @name Signal K Client Library
 *
 * This library makes it a little easier to interface with Signal K servers via the REST API and WebSockets. To use it,
 * create a new Client object. The contstructor takes three optional parameters: hostname, port, and a flag indicating
 * whether or not to use SSL. If no parameters are passed, connect() will attempt to discover a Signal K server on the
 * network via mDNS. Naturally, this doesn't work in the browser.
 *
 * It inherits from EventEmitter, so EventEmitter conventions apply.
 *
 * @example
 * var client = new Client('localhost');
 * client.connect();
 *
 * @param {string} hostname
 * @param {number} port
 * @param {boolean} useSSL
 */
function Client(hostname, port, useSSL) {
  if(useSSL) {
    this.protocol = 'https';
  } else {
    this.protocol = 'http';
  }
  this.hostname = hostname;
  this.port = port;
}

/**
 */
Client.prototype.connect = function(options) {
  debug('connect');

  var hostname = this.hostname;
  var port = this.port;

  if (options) {
    hostname = options.hostname || hostname;
    port = options.port || port;
  }

  if (hostname && port) {
    return this.connectDelta(
      options.hostname + ":" + options.port,
      options.onData,
      options.onConnect,
      options.onDisconnect,
      options.onError,
      options.onClose,
      options.subscribe
    );
  }
  return this.discoverAndConnect(options);
}

Client.prototype.apiGet = function(path) {
  return this.get('/signalk/v1/api' + path);
}

Client.prototype.get = function(path, hostname, port) {
  return agent('GET', 'http://' + (this.hostname || hostname) + ':' +
      (this.port || port) + path);
}

Client.prototype.startDiscovery = function() {
  debug('startDiscovery');
  var that = this;
  try {
    var mdns = require('mdns');
  } catch (ex) {
    console.log("Discovery requires mdns, please install it with 'npm install mdns' or specify hostname and port");
    return;
  }
  that.browser = mdns.createBrowser(mdns.tcp('signalk-http'), {
    resolverSequence: getSequence(mdns)
  });
  that.browser.on('serviceUp', function(service) {
    debug("Discovered signalk-http:" + JSON.stringify(service.type, null, 2) + "\n" + JSON.stringify(service.txtRecord, null, 2));
    debug("GETting /signalk")
    that.get('/signalk', service.hostname, service.port)
      .then(function(response) {
        debug("Got " + JSON.stringify(response.body.endpoints, null, 2));
        that.emit('discovery', {
          hostname: service.hostname,
          port: service.port,
          discoveryResponse: response.body
        });
      })
  });
  debug("Starting mdns discovery");
  that.browser.start();
}

Client.prototype.stopDiscovery = function() {
  if (this.browser) {
    debug('Stopping discovery');
    this.browser.stop();
  }
}

Client.prototype.discoverAndConnect = function(options) {
  debug('discoverAndConnect');
  var that = this;

  try {
    var mdns = require('mdns');
  } catch (ex) {
    console.log("Discovery requires mdns, please install it with 'npm install mdns' or specify hostname and port");
    return;
  }

  return new Promise(function(resolve, reject) {
    var browser = mdns.createBrowser(mdns.tcp('signalk-http'), {
      resolverSequence: getSequence(mdns)
    });
    browser.on('serviceUp', function(service) {
      debug("Discovered signalk-http:" + JSON.stringify(service.type, null, 2) + "\n" + JSON.stringify(service.txtRecord, null, 2));
      debug("Stopping discovery");
      browser.stop();
      that.hostname = service.hostname;
      that.port = service.port;
      debug("GETting /signalk")
      that.get('/signalk')
        .then(function(response) {
          debug("Got " + JSON.stringify(response.body.endpoints, null, 2));
          that.endpoints = response.body.endpoints;
          resolve(response.body.endpoints);
        });
    });
    debug("Starting mdns discovery");
    browser.start();
  }).then(function(endpoints) {
    that.endpoints = endpoints;
    that.emit('discovery', endpoints);
    debug("Connecting to " + JSON.stringify(_object.values(endpoints)[0]['signalk-ws'], null, 2));
    return that.connectDeltaByUrl(_object.values(endpoints)[0]['signalk-ws'], options.onData, options.onConnect, options.onDisconnect, options.onError, options.onClose);
  });
}

Client.prototype.connectDelta = function(hostname, callback, onConnect, onDisconnect, onError, onClose, subscribe) {
  var url = "ws://" + hostname + "/signalk/v1/stream" + (subscribe ? '?subscribe=' + subscribe : '');
  return this.connectDeltaByUrl(url, callback, onConnect, onDisconnect, onError, onClose);
}

Client.prototype.connectDeltaByUrl = function(wsUrl, callback, onConnect, onDisconnect, onError, onClose) {
  var theUrl = url.parse(wsUrl);
  this.hostname = theUrl.hostname;
  this.port = theUrl.port;
  var sub = {
    "context": "vessels.self",
    "subscribe": [{
      "path": "*"
    }]
  };
  debug("Connecting ws to " + wsUrl);
  var skConnection = {
    hostname: this.hostname
  };

  if (typeof Primus != 'undefined') {
    debug("Using Primus");
    var primus = Primus.connect(wsUrl, {
      reconnect: {
        maxDelay: 15000,
        minDelay: 500,
        retries: Infinity
      }
    });
    primus.on('data', callback);
    skConnection.send = primus.write.bind(primus);
    skConnection.disconnect = function() {
      primus.end();
      debug('Disconnected');
    };
    if (onConnect) {
      primus.on('open', onConnect.bind(this, skConnection));
    } else {
      primus.on('open', function() {
        skConnection.send(sub);
      });
    }
  } else {
    debug("Using ws");
    var connection = new WebSocket(wsUrl);
    skConnection.send = function(data) {
      connection.send(typeof data != 'string' ? JSON.stringify(data) : data);
    };
    skConnection.disconnect = function() {
      connection.close();
      debug('Disconnected');
    };
    connection.onopen = function(msg) {
      debug("open");
      if (onConnect) {
        onConnect(skConnection)
      } else {
        skConnection.send(sub);
      }
    };
    connection.onerror = function(error) {
      debug("error:" + error);
      if (onError) {
        onError(error)
      }
    };
    connection.onmessage = function(msg) {
      callback(JSON.parse(msg.data));
    };
    connection.onclose = function(event) {
      debug("close:" + event);
      if (onClose) {
        onClose(event)
      }
    };
  }
  skConnection.subscribeAll = function() {
    skConnection.send(sub);
  }
  return skConnection;
}

/**
 * getSelf
 *
 * Returns the current contents of the Signal K tree for your vessel (or at
 * least the contents of the Signal K tree pointed to by `self`.
 *
 * @returns {Promise}
 */
Client.prototype.getSelf = function() {
  var skUrl = {
    protocol: this.protocol,
    hostname: this.hostname,
    port: this.port,
    pathname: '/signalk/v1/api/vessels/self'
  };

  return agent('GET', url.format(skUrl));
}

/**
 *
 * getSelfMatcher
 *
 * @returns {function} that can be passed to a filter function to select delta
 * messages just for your vessel.
 */
Client.prototype.getSelfMatcher = function() {
  return this.getSelf().then(function(result) {
    var selfData = result.body;
    var selfId = selfData.mmsi || selfData.uuid;

    if (selfId) {
      var selfContext = 'vessels.' + selfId;
      return function(delta) {
        return (delta.context === 'self' || delta.context === 'vessels.self' ||
          delta.context === selfContext);
      };
    } else {
      return function(delta) {
        return true;
      }
    }
  });
}

Client.prototype.getMeta = function(prefix, path) {
  return this.get(prefix + "/" + path.split('.').join('/') + '/meta');
}

function convertUpdateToHumanUnits(update) {
  if (update.values) {
    update.values.forEach(convertPathValueToHumanUnits)
  }
}

function convertPathValueToHumanUnits(pathValue) {
  if (signalkSchema.metadata[pathValue.path] && conversions[signalkSchema.metadata[pathValue.path].units]) {
    pathValue.value = conversions[signalkSchema.metadata[pathValue.path].units].convert(pathValue.value);
    pathValue.units = conversions[signalkSchema.metadata[pathValue.path].units].to;
  }
}

function isDelta(msg) {
  return typeof msg.context != "undefined"
}

function isHello(msg) {
  return typeof msg.version != "undefined"
}

module.exports = {
  Client: Client,
  isDelta: isDelta,
  isHello: isHello
}
