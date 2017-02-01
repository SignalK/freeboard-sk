(function(global) {

  global.CLOSURE_DEFINES = {
    'goog.ENABLE_DEBUG_LOADER': false
  };
  global.CLOSURE_NO_DEPS = true;

  var paths = {{{ paths }}};

{{#if socket}}
  paths.push('/socket.io/socket.io.js');
{{/if}}

  for (var i = 0, ii = paths.length; i < ii; ++i) {
    document.write(
        '<script type="text/javascript" src="{{{ root }}}' +
        paths[i] + '"></script>');
  }

{{#if socket}}

  var load = global.onload;
  global.onload = function() {
    var socket = io.connect('{{{ root }}}/');
    socket.on('error', function(error) {
      if (global.console) {
        console.error(error.message);
      } else {
        alert(error.message);
      }
    });
    socket.on('update', function(filepath) {
      global.location.reload();
    });
    if (load) {
      load.call(global);
    }
  };
{{/if}}

}(this));
