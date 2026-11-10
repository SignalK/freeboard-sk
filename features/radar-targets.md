---
id: radar-targets
title: Radar & Camera Targets
category: Radar
---

![Fig 1. A radar target (right) in a collision alarm — its ring and course line, with the alarm's danger ring and the lines to closest approach](radar-targets-1.jpg)

A radar that tracks targets (MARPA or ARPA), or a camera or other sensor that
detects boats, can put boats without AIS on your chart: an unlit fishing boat, a
small craft in fog, a panga at night. Freeboard draws the targets your Signal K
server reports from such a source, for example the MaYaRa radar plugin. Without
one, nothing changes.

## On the chart

- **An orange ring with a course line** marks each radar or camera target; the
  line shows where it's heading.
- **A ring turns grey** when the target hasn't been updated for 20 seconds, and
  disappears after a minute. A target the radar reports as lost disappears at
  once.
- **Radar targets show and hide with the radar picture**: the eye button in the
  radar panel switches both (see *Radar Overlay*). Camera and other sensor
  targets show and hide with the **Vessels** layer, like AIS targets.

Tap a ring for its popover. It's titled with the target's name, or with its type
("Radar target") when it has none, and shows its speed and course over ground;
**Target Properties** lists the same. A collision alarm on a radar target is drawn
just like one on an AIS vessel (see *Collision Alarm Display*).

## Boats seen by both AIS and radar

When the signalk-target-fusion plugin links a radar target to an AIS vessel, the
boat is drawn once, as the AIS vessel. It stays at its AIS position while that
position is current, which means within twice the interval AIS expects that kind
of vessel to report at its speed, and never less than 30 seconds. If its AIS goes
quiet, it follows the radar instead, so a boat doesn't vanish when its transponder
drops out. A boat seen by radar and a camera but not by AIS is a single ring.

## Tracking an echo yourself

While the radar picture is shown, right-click or long-press on an echo and choose
**Track Radar Target**. The radar whose picture is shown starts tracking it, and
within a sweep or two it appears as a ring with its course line. From then on it
behaves like any other target: it can raise a collision alarm, and the fusion
plugin links it to its AIS vessel if it has one. The menu item appears only while
a radar is reporting.

To drop a target, tap **Stop Tracking** in its popover. That works for targets
the radar picked up by itself too. When radar targets are drawn as their linked AIS
vessel, the vessel's popover offers **Stop Tracking**, which drops every radar
target linked to it.

Both need you to be signed in with write access, like the radar's other
controls. If the radar refuses, a message says why, for example *The radar could
not start tracking.*
