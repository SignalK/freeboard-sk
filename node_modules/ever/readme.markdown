# ever

[dom events](http://www.w3.org/TR/DOM-Level-2-Events/events.html)
with a node-style
[EventEmitter](http://nodejs.org/docs/latest/api/events.html#events_class_events_eventemitter)
api

[![browser support](http://ci.testling.com/substack/ever.png)](http://ci.testling.com/substack/ever)

# example

[view the demo](http://substack.net/projects/ever-example/)

``` js
var ever = require('ever');
var box = document.querySelector('#box');

var state = false;
ever(box).on('click', function (ev) {
    ev.stopPropagation();
    state = !state;
    box.style['background-color'] = state ? 'red' : 'rgb(127,127,127)';
});

setInterval(function () {
    ever(box).emit('click');
}, 3000);
```

# methods

``` js
var ever = require('ever')
```

## var ev = ever(element)

Return a new
[EventEmitter](http://nodejs.org/docs/latest/api/events.html#events_class_events_eventemitter)
that wraps the HTML node `element`.

All the usual
[EventEmitter](http://nodejs.org/docs/latest/api/events.html#events_class_events_eventemitter)
methods should work with the caveat that adding and removing listeners are
proxied through to the underlying dom methods, which only expect a single event
object as a parameter.

## ev.emit(name, opts)

Emit an event `name` with options `opts`. This method creates a synthetic event
using `document.createEvent()` and the corresponding variant of `.initEvent()`
that works with the event `name` provided.

The options `opts` will be passed into the matching `.initEvent()` function
signature. Any additional properties will be added to the event object as
properties being calling `.dispatchEvent()`.

The signatures are documented in the file `init.json` in this distribution.
To see which event name maps to which init signature, see the `types.json` file.

## ev.on(name, cb), ev.addListener(name, cb)

Just like node's `EventEmitter.prototype.on()`, listen for events.

Internally this calls `.addEventListener()`.

## ev.removeListener(name, cb)

Just like node's `EventEmitter.prototype.removeListener()`, remove a listener.

Internally this calls `.removeEventListener()`, however there is no way to
obtain a list of all listeners from dom nodes, so only listeners registered by
the current `ever()` instance can be removed.

## ev.removeAllListeners(name)

Just like node `EventEmitter.prototype.removeAllListeners()`, remove all the
listeners with `name` or everything is `name` is falsy.

Unlike in node, this function calls `removeListener()` on each of the events to
remove them so that the underlying `.removeEventListener()` calls get fired.

# install

With [npm](http://npmjs.org) do:

```
npm install ever
```

This module is meant for use in browsers with a node-style module system.
Use [browserify](http://github.com/substack/node-browserify) or similar.

# license

MIT
