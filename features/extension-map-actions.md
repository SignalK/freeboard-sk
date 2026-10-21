---
id: extension-map-actions
title: Extension Map Actions
category: Extensions
---

A Signal K server plugin can add its own commands to the chart, for a spot on it or for
something drawn on it. A routing plugin might offer **Smart route to here**, say, or a
dead-reckoning plugin **Take bearing** on a charted tower. A plugin can also ask you to
pick a spot or an object on the chart for it.

## Commands in the chart menu

Right-click a spot on the chart, or press and hold it on a touch screen. Plugin commands
for that spot appear at the bottom of the menu, below Freeboard's own items, under the
heading **This position**. The name of the plugin that provides each command is shown
beside it.

Right-click an object and its commands appear as well, in their own group headed by the
object's name, above **This position**. Plugins can offer commands on:

- waypoints, notes, routes, tracks and regions
- your own vessel and other vessels
- aids to navigation
- features of an S-57 chart, such as a light or a tower

Which commands appear is up to the plugin. It may offer a command on some objects only
(lights, say), and it may show or hide a command as its own state changes. The menu
works the same in both panes of a split view.

When a plugin has a command for that spot, the menu opens even where Freeboard's own
menu doesn't: in kiosk mode, and while a popover is open. Freeboard's own items stay
hidden there, as before. While you are drawing, measuring, editing or selecting on the
chart, plugin commands are not shown.

## Commands in a popover

Click or tap an object to open its popover, and its plugin commands appear at the
bottom, after Freeboard's own buttons, grouped under each plugin's name. When there are
more than four, they are gathered behind a single **EXTENSIONS** button.

Choosing a command hands it to the plugin. It may do its work straight away, or open its
panel or a floating window to ask you for more (see *Extension Panels & Windows*).

A plugin's own markers on the chart can offer commands too; see *Extension Map Layers*.

## Picking on the chart

Some plugins need you to show them a place or an object, such as the destination of a
route. When a plugin asks for a pick:

- a small panel at the top left shows the plugin's name and what it wants, for example
  *Tap the destination*, with a **CANCEL** button;
- the cursor becomes a crosshair;
- you can still pan and zoom to find the spot.

Click or tap the spot, or the kind of object the plugin asked for (a waypoint, a
vessel, …). That answers the pick, and nothing else happens: no popover opens. A click
on something the plugin didn't ask for is ignored, and the pick stays on. Where several
objects overlap, the topmost one it accepts is picked.

Only one pick is on at a time. It ends without an answer when you press **CANCEL**, when
you start drawing or measuring from the toolbar, or when another plugin asks for a pick
of its own. While a pick is on, the chart menu doesn't open.

If you haven't installed a plugin that offers commands, the chart menu and popovers look
and work exactly as they always have.
