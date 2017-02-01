const colors = {
  'clear'  : '0',
  'black'  : '30',
  'red'    : '31',
  'green'  : '32',
  'yellow' : '33',
  'blue'   : '34',
  'purple' : '35',
  'cyan'   : '36',
  'white'  : '37'
};

var noop = function() {};

function getCode(color, boldFlag) {
  boldFlag = boldFlag ? "1" :"0";
  return "\033[" + boldFlag + ';' + colors[color] + 'm';
}

function colorize(str, colorname) {
  if (arguments.length == 0) return colorize;
  return getCode(colorname || 'white') + str + getCode('clear');
}

colorize.colors = Object.keys(colors);


Object.defineProperty(colorize, "define", {
  get: function() {
    if (colorize._defined) return colorize;

    console.color = function()  {
      var colorname = (colors[arguments[0]]) ? Array.prototype.shift.call(arguments) : 'white';
      process.stdout.write(getCode(colorname));
      console.log.apply(console, arguments);
      process.stdout.write(getCode('clear'));
    };

    console.ecolor = function() {
      var colorname = (colors[arguments[0]]) ? Array.prototype.shift.call(arguments) : 'white';
      process.stderr.write(getCode(colorname));
      console.error.apply(console, arguments);
      process.stderr.write(getCode('clear'));
    };

    console.bold = function() {
      var colorname = (colors[arguments[0]]) ? Array.prototype.shift.call(arguments) : 'white';
      process.stdout.write(getCode(colorname, true));
      console.log.apply(console, arguments);
      process.stdout.write(getCode('clear', true));
    };

    console.ebold = function() {
      var colorname = (colors[arguments[0]]) ? Array.prototype.shift.call(arguments) : 'white';
      process.stderr.write(getCode(colorname, true));
      console.error.apply(console, arguments);
      process.stderr.write(getCode('clear', true));
    };

    Object.keys(colors).forEach(function(color) {
      console[color] = function() {
        Array.prototype.unshift.call(arguments, color);
        console.color.apply(console, arguments);
      };
      console['e' + color] = function(v) {
        Array.prototype.unshift.call(arguments, color);
        console.ecolor.apply(console, arguments);
      };

      console[color + 'B'] = function(v) {
        Array.prototype.unshift.call(arguments, color);
        console.bold.apply(console, arguments);
      };

      console['e' + color + 'B'] = function(v) {
        Array.prototype.unshift.call(arguments, color);
        console.ebold.apply(console, arguments);
      };

      colorize[color] = function(v) { return colorize(v, color) };
    });
    colorize._defined = true;

    return colorize;
  },
  set: noop
});

module.exports = colorize;
