termcolor
==========
[Node.js] console.log, console.error with colors

### Installation ###
    git clone git://github.com/shinout/termcolor.git

    OR

    npm install termcolor

### Usage ###
#### require ####
    var tc = require("termcolor").define();
    // remember to call define(), which defines methods under "console" object.

    // var tc = require("termcolor").define;
    // this is the same as define(), as termcolor internally use Object.defineProperty's getter/setter.

#### the simplest usage ####
    console.green("this is green"); // displays "this is green" with green color to STDOUT
    console.cyan({hoge: "foobar"}, "multi args? N.P.");


#### check which colors we can use ####
    console.log(tc.colors);
    /* 
        ['black',
        'red',
        'green',
        'yellow',
        'blue',
        'purple',
        'cyan',
        'white']
     */

#### display to STDERR ####
    console.eblue("blue color, to stderr");
    console.eyellow(["yellow color", "to stderr"], "of course, any value is acceptable");


#### get colored string ####
    var redstr    = tc.red("red string");
    var purplestr = tc.purple("purple string");
    console.log(redstr, purplestr);


#### bold ####
    console.bold("hoge")
    console.bold("green", "BOLD GREEN")
    console.purpleB("with B")
    console.eyellowB("e [color] B")


#### pass a color name as the first argument ####
    console.color("green", "text with green color");
    console.ecolor("red", "text with red color", "to stderr");
