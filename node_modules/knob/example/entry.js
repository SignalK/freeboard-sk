window.Knob = require('../')

window.append = function(node){ // allow script tags to append elements before themselves
  var scripts = document.getElementsByTagName('script')
  var script = scripts[scripts.length-1]
  script.parentNode.insertBefore(node, script)
}