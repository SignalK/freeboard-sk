[node.js] make an option object for "http(s).request" from url.
===
### features ###
> OK, node-request is really easy to use, but I wanted only the simplest function to get
options object to pass to http(s)Client from url.

### installation ###
    git clone git://github.com/shinout/u2r.git

    OR

    npm install u2r

### usage ###

    var u2r = require('u2r');
    var options = u2r('nodejs.org', {}); // second argument is optional.
    var protocol = require(options.protocol);
    var req = require('http').request(option, function(res) {
      res.on('data', function(d) {
        // do something
      });
    });
    req.end();

### specific options ###
 - protocol : http or https
 - body     : if method != "GET", querystring of options.data is set. options.data is passed by u2r(url, here)

 - all other options are compatible with the one http(s)Clients specify.
