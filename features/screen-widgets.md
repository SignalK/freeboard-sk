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

Each screen remembers its own widgets and their settings, so the widgets you
place are still there, set up as you left them, the next time you open
Freeboard-SK on that screen. A gauge you add on the helm tablet doesn't appear
on your phone. To share widgets between screens, save them as a layout (see
below). A server administrator can also ship ready-configured widgets to new
screens through Freeboard's default settings. A plugin may keep some choices
to the one screen they were made on.

**To show a widget only on larger screens**, use its **Show on** choice —
at the top of the list you pick from when adding a widget, or in the
widget's settings later: **All screens** (the default), **Tablet and up**
(760 px wide or more), or **Monitor only** (1400 px or more). This is how a
large gauge set up for a chart-table monitor stays off your phone, even
when both screens show the same layout. The choice follows the width of
the screen, so turning a tablet or resizing the browser window can show or
hide the widget. A hidden widget still holds its place, so nothing else is
added on top of it — press and hold that empty-looking spot to open its
settings, where you can change **Show on** or remove the widget.

![Fig 2. One layout on a phone, a tablet and a monitor: the clock at top right shows everywhere, the wind dial from tablet up, and the clock at bottom left on the monitor only](screen-widgets-2.jpg)

**Layouts.** A layout is a named set of widgets and their settings, such as
"Helm", "Chart table" or "Phone". Layouts are saved on your Signal K server, so
every screen on the boat can use them. Open the **Resources** menu (the stacked
layers button on the left toolbar), then **Layouts**. At the top, under
**Current layout**, is the layout this screen shows, marked *(changed, not
saved)* once you've changed its widgets. Below it is every layout saved on the
boat.

- **Save** puts this screen's changes into the current layout.
- **Save as new** saves this screen's widgets under a name you choose. If a
  layout already has that name, Freeboard asks before replacing it.
- **New blank** clears this screen's widgets so you can start again.
- **Switch to** shows another layout on this screen.
- The pencil renames a layout and the bin deletes it. Screens showing a
  deleted layout keep their widgets.

If you switch away from changes you haven't saved, Freeboard asks before
discarding them.

When two screens show the same layout, saving on one updates the other at
once, unless the other has unsaved changes of its own. Those changes are kept,
and an icon in the status area and a note in the Layouts panel say the layout
was saved on another screen. **Load theirs** replaces your changes with the
saved version. If you press **Save** instead, Freeboard asks whether to
**Replace** the other screen's version, **Save as new**, or **Discard my
changes**.

A new screen starts on the layout named **Default**, if there is one, so save
your usual set-up as "Default" and every new tablet or phone starts with it.
There is no separate reset: to go back to it, switch to Default. A screen that
already had widgets keeps them, not yet saved as a layout.

Layouts need the Freeboard-SK plugin enabled on your Signal K server. Without
it the panel says so, and each screen still keeps its own widgets.

Some widgets can also narrow down what's shown elsewhere on the chart — for
example, showing only certain waypoints. When a widget does this, a small
chip appears near the top of the screen describing the filter; tap its **×**
to clear it and show everything again.

**Matching Freeboard's look.** A widget draws its own card, so how it looks is
up to its plugin. Widgets that support it follow Freeboard instead: they
switch with Freeboard's light or dark theme (even when that follows your
Signal K server's day and night mode rather than your device's setting), and
take how see-through their card is from Settings → Display →
**Panel background**, so they match the course panel beside them. On
**Default** each widget keeps its plugin's own background; **Opaque** makes
every supporting widget solid.

If you haven't installed any plugins that provide screen widgets, none of
this is visible — Freeboard looks and works exactly as it always has.
