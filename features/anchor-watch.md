---
id: anchor-watch
title: Anchor Watch
category: Alarms & Notifications
---

Set an anchor alarm from the chart. Tell Freeboard where the anchor is and how
far the boat may swing, and the Signal K server watches your position and
raises an alarm if the boat drags outside that circle.

![Fig 1. The Anchor Watch panel, set to drop with a chosen radius](anchor-watch-1.jpg)

Anchor Watch needs an anchor alarm plugin on your Signal K server: either
[signalk-anchoralarm-plugin](https://www.npmjs.com/package/signalk-anchoralarm-plugin)
or [Hoeken's Anchor Alarm](https://www.npmjs.com/package/hoekens-anchor-alarm)
(`hoekens-anchor-alarm`, version 2.12.0 or later). Without one, Anchor Watch
is missing from the main menu. If both are installed, Freeboard uses
signalk-anchoralarm-plugin.

Open **Anchor Watch** from the main menu, or right-click the chart and choose
**Anchor Watch**. The **RAISE / DROP** toggle stays disabled while your own
vessel isn't shown on the chart, because the anchor is placed from the boat's
position.

## Dropping the anchor

There are three ways to set the watch, depending on what you know:

**Let the radius be measured.** Slide the toggle from **RAISE** to **DROP** as
the anchor goes down. The anchor is marked at the boat's position. Let out the
rode, settle back on it, then tap **Set**. The alarm radius becomes the boat's
current distance from the anchor.

**Give the radius yourself.** Before dropping, tick **Set Radius** and enter
the **Alarm Radius**, then slide the toggle to **DROP**. The anchor is marked
at the boat's position with that radius straight away.

![Fig 2. Manual Set, placing the anchor from the rode length](anchor-watch-2.jpg)

**Place the anchor from the rode length** (signalk-anchoralarm-plugin only).
With the anchor down and the rode out, tick the box beside **Manual Set**,
enter the **Rode Length**, and tap **Manual Set**. The plugin works out the
anchor's position and the alarm radius from the length of rode let out. This
row is hidden when Freeboard is using Hoeken's Anchor Alarm, which has no
rode-length placement.

Lengths are in your chosen distance units. Freeboard remembers your
**Set Radius** and **Manual Set** choices, the radius and the rode length for
next time.

## Adjusting the watch

![Fig 3. The anchor and its alarm circle on the chart](anchor-watch-3.jpg)

Once the anchor is set, the anchor and its alarm circle are drawn on the chart,
and the panel's status shows the current radius.

- **Adjust Radius**: drag the slider to widen or tighten the alarm circle.
- **Shift Anchor**: the arrow buttons move the anchor one meter north, south,
  east or west, for when the mark isn't quite where the anchor went down.
- **Drag the anchor**: tap the anchor on the chart to make it movable, drag
  it to where the anchor really lies, then tap **Finish**.

With Hoeken's Anchor Alarm, moving the anchor or changing the radius keeps
the shape of its watch zone, so a sector stays a sector. Hoeken's zones can
also be polygons, which have no radius. Freeboard reports an error if you try
to change a polygon's radius, so change that zone with Hoeken's plugin
instead.

## When the alarm sounds

If the boat moves outside the alarm radius, the plugin raises an anchor
alarm, which Freeboard displays with **Mute** and **Acknowledge** controls.
See *Anchor Watch* in the online help.

## Raising the anchor

Slide the toggle back to **RAISE**. The watch ends and the anchor and its
circle are removed from the chart.
