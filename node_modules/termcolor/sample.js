    // require
    var tc = require("./termcolor").define();
    // don't forget to call define(), which define methods under "console" object.

    // simplest usage
    console.green("this is green");
    console.cyan({hoge: "foobar"}, "multi args? N.P.");


    // check which colors can we use ?
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

    // display to STDERR
    console.eblue("blue color, to stderr");
    console.eyellow(["yellow color", "to stderr"], "of course, any value is acceptable");


    // get colored string
    var red    = tc.red("red string");
    var purple = tc.purple("purple string");
    console.log(red, purple);


    // pass a color name as the first argument
    console.color("green", "text with green color");
    console.ecolor("red", "text with red color", "to stderr");

    // bold
    console.bold("hoge")
    console.bold("green", "BOLD GREEN")
    console.purpleB("with B")
    console.eyellowB("e [color] B")
