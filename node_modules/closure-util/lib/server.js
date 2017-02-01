var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');
var util = require('util');

var async = require('async');
var handlebars = require('handlebars');
var send = require('send');
var socketIO = require('socket.io');


/**
 * Server constructor.
 * @param {Object} config Server config.
 * @constructor
 * @extends {http.Server}
 */
var Server = exports.Server = function Server(config) {
  http.Server.call(this, this._requestListener.bind(this));

  this._manager = config.manager;
  this._root = config.root || process.cwd();

  this._loader = config.loader || '/@';

  /**
   * Connect server to client.
   * @type {[type]}
   */
  this._socket = config.hasOwnProperty('socket') ? config.socket : true;

  // allow override
  if (config.getMain) {
    this.getMain = config.getMain;
  }

  /**
   * Cached handlebars templates.
   * @type {Object.<string, Template>}
   */
  this._templates = {};

  if (this._socket) {
    this.on('listening', this._bindSocket.bind(this));
  }
};
util.inherits(Server, http.Server);


/**
 * Prepare Socket I/O for client messages.
 */
Server.prototype._bindSocket = function() {
  var manager = this._manager;
  var io = socketIO.listen(this, {
    'log level': 0
  });
  io.sockets.on('connection', function(socket) {
    function onError(err) {
      socket.emit('error', {message: err.message});
    }
    function onUpdate(script) {
      socket.emit('update', script && script.path);
    }
    manager.getErrors().forEach(onError);
    manager.on('error', onError);
    manager.on('update', onUpdate);
    socket.on('disconnect', function() {
      manager.removeListener('error', onError);
      manager.removeListener('update', onUpdate);
    });
  });
};


/**
 * Compile the template and provide it to the callback.
 * @param {string} name Template name.
 * @param {function(Error, Template)} callback Callback.
 */
Server.prototype._getTemplate = function(name, callback) {
  var template = this._templates[name];
  var self = this;
  if (template) {
    process.nextTick(function() {
      callback(null, template);
    });
  } else {
    fs.readFile(path.join(__dirname, '..', 'templates', name),
        function(err, data) {
          if (err) {
            return callback(err);
          }
          var template = handlebars.compile(String(data));
          self._templates[name] = template;
          callback(null, template);
        });
  }
};


/**
 * Render the template to the response with the provided context.
 * @param {string} name Template name.
 * @param {Object} context Data.
 * @param {http.ServerResponse} res Response.
 */
Server.prototype._renderTemplate = function(name, context, res) {
  var types = {
    '.js': 'application/javascript; charset=utf-8',
    '.html': 'text/html; charset=utf-8'
  };
  this._getTemplate(name, function(err, template) {
    if (err) {
      res.statusCode = 500;
      return res.end('Cannot find index template');
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(name)] || 'text/plain'
    });
    res.end(template(context));
  });
};


/**
 * Function added to the server's request event.
 * @param {http.IncomingMessage} req Request.
 * @param {http.ServerResponse} res Response.
 * @return {undefined} Undefined.
 */
Server.prototype._requestListener = function(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, {});
    res.end('Not allowed');
    return;
  }
  var parts = url.parse(req.url, true);
  var pathname = parts.pathname;
  var match = this._useLoader(req);
  if (match) {
    // managed script
    var filepath = this._getPath(req, match);
    if (!filepath) {
      // request for loader
      var main = this.getMain(req);
      if (main && !this._manager.getScript(main)) {
        return this._renderTemplate('error.js', {
          message: 'Main script not in manager paths: ' + main
        }, res);
      }
      var deps = this._manager.getDependencies(main);
      var paths = deps.map(function(s) {
        return match + s.path;
      });
      this._renderTemplate('load.js', {
        socket: this._socket,
        paths: JSON.stringify(paths),
        root: 'http://' + req.headers.host
      }, res);
    } else {
      var script = this._manager.getScript(filepath);
      if (!script) {
        res.writeHead(404, {});
        res.end('Script not being managed: ' + filepath);
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Content-Length': script.source.length
        });
        res.end(script.source);
      }
    }
  } else {
    var options = {
      root: this._root
    };
    // assume static
    send(req, pathname, options)
        .on('error', this._handleStaticError.bind(this, req, res))
        .pipe(res);
  }
};


/**
 * Determine if an incoming request is for the script loader.  By default,
 * paths starting with '/@' will be handled by the loader.
 * @param {http.IncomingRequest} req Request.
 * @return {boolean|string} This request should be handled by the loader.
 */
Server.prototype._useLoader = function(req) {
  var match = false;
  if (typeof this._loader === 'string') {
    match = req.url.indexOf(this._loader) === 0 ? this._loader : false;
  } else {
    var matches = req.url.match(this._loader);
    match = matches && matches[0];
  }
  return match;
};


/**
 * Get the absolute path to a script from an incoming request.
 * @param {http.IncomingRequest} req Request.
 * @param {string} loader Matched loader path.
 * @return {string|undefined} Absolute path to script (or undefined if none).
 */
Server.prototype._getPath = function(req, loader) {
  var urlPath = url.parse(req.url).pathname.substring(loader.length);
  return urlPath ? path.resolve(urlPath) : undefined;
};


/**
 * Get the path to the main script from an incoming request.  By default, the
 * main path is taken from the 'main' query string parameter.  For requests
 * with a referer, the path is assumed to be relative to the referer.  For
 * requests without a referer, the path is assumed to be relative to the server
 * root.
 * @param {http.IncomingRequest} req Request.
 * @return {string} Path to main script.
 */
Server.prototype.getMain = function(req) {
  var main;
  var query = url.parse(req.url, true).query;
  if (query.main) {
    var from = this._root;
    var referer = req.headers.referer;
    if (referer) {
      from = path.join(from, path.dirname(url.parse(referer).pathname));
    }
    main = path.resolve(from, query.main);
  }
  return main;
};


/**
 * Get entries representing all items in a directory.  Ignores items that start
 * with a dot.
 * @param {string} dir Path to directory.
 * @param {function(error, Array)} callback Callback.
 */
function getEntries(dir, callback) {
  async.waterfall([
    fs.readdir.bind(fs, dir),
    function(items, done) {
      items = items.filter(function(item) {
        return item.indexOf('.') !== 0;
      });
      var paths = items.map(function(item) {
        return path.join(dir, item);
      });
      async.map(paths, fs.stat, function(err, stats) {
        if (err) {
          return done(err);
        }
        var entries = items.map(function(item, index) {
          var isDir = stats[index].isDirectory();
          return {
            path: item + (isDir ? '/' : ''),
            name: item,
            dir: isDir
          };
        });
        done(null, entries);
      });
    }
  ], callback);
}


/**
 * Handle errors from static server.
 * @param {http.IncomingRequest} req Request.
 * @param {http.ServerResponse} res Response.
 * @param {Error} err Error.
 */
Server.prototype._handleStaticError = function(req, res, err) {
  var self = this;
  if (err.status === 404 && req.url.slice(-1) === '/') {
    // directory listing
    var pathname = url.parse(req.url).pathname;
    var dir = path.join(this._root, pathname);
    if (dir.indexOf(this._root) !== 0) {
      res.statusCode = 403;
      res.end('Outside root');
    } else {
      getEntries(dir, function(err, entries) {
        if (err) {
          res.statusCode = 500;
          return void res.end(err.message);
        }
        if (pathname !== '/') {
          entries.unshift({
            path: '..',
            name: '..',
            dir: true
          });
        }
        self._renderTemplate('index.html', {
          pathname: pathname,
          entries: entries
        }, res);
      });
    }
  } else {
    res.statusCode = err.status || 500;
    res.end(err.message);
  }
};
