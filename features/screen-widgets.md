---
id: screen-widgets
title: Screen Widgets
category: Extensions
---

![Fig 1. Instrument and tide widgets placed around the edges of the chart](screen-widgets-1.jpg)

If you've installed a Signal K server plugin that provides a screen widget,
you can place it directly onto the chart screen — a compact readout like a
speed dial, a wind gauge, or anything else the plugin offers. Two examples
are [signalk-instrument-widgets](https://www.npmjs.com/package/signalk-instrument-widgets),
a set of boat instrument gauges, and
[signalk-basic-tide-widgets](https://www.npmjs.com/package/signalk-basic-tide-widgets),
which shows upcoming tides.

Widgets sit in the corners of the screen and at the centre of the top and
bottom edges *(the top-left corner is reserved for Freeboard's own menu)*.

**To add a widget**, press and hold an empty spot in one of these areas for
about a second and a half (or right-click there if you're using a mouse and
keyboard). A short list of the widgets that fit there appears — choose one
and it's added to your screen. As you place more, widgets stack neatly from
the edge inward.

**To change, move or remove a widget**, press and hold the widget itself.
This opens its settings, where you can adjust it (if it has any options),
remove it from the screen, or **Move** it. Choose **Move** and every spot the
widget fits is outlined in blue, with a bar across the chart: *Drag the
widget, or tap where it should go*. Tap an outlined spot, or drag the widget
onto one, and it moves there with its settings intact. Tap the widget itself,
or **Cancel**, to leave it where it was.

Your layout and each widget's settings are remembered, so the widgets you
place are still there, set up as you left them, the next time you open
Freeboard-SK. When you're signed in to your Signal K server, both are saved
with your Freeboard settings on the server and follow you to every device you
sign in on: set up a gauge on the helm tablet and it's ready on your phone
too. A server administrator can also ship ready-configured widgets to every
device through Freeboard's default settings. A plugin may keep some choices
to the one screen they were made on.

Some widgets can also narrow down what's shown elsewhere on the chart — for
example, showing only certain waypoints. When a widget does this, a small
chip appears near the top of the screen describing the filter; tap its **×**
to clear it and show everything again.

If you haven't installed any plugins that provide screen widgets, none of
this is visible — Freeboard looks and works exactly as it always has.
