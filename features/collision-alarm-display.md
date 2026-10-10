---
id: collision-alarm-display
title: Collision Alarm Display
category: Alarms & Notifications
---

When a collision alarm sounds, the chart shows where the danger lies, not only
which boat it involves.

![Fig 1. A crossing vessel's collision alarm, with both course lines run on to closest approach](collision-alarm-display-1.jpg)

Freeboard doesn't work out collision risk itself. It draws the closest approach
alarms (`notifications.navigation.closestApproach`) raised by a plugin on your
Signal K server. How much it can draw depends on the plugin:

- [signalk-collision-alerts](https://www.npmjs.com/package/signalk-collision-alerts)
  reports where both boats will be at closest approach, so Freeboard can show
  the full picture described below.
- Other producers, such as the CPA alarm in
  [signalk-derived-data](https://www.npmjs.com/package/signalk-derived-data),
  name only the other vessel, so Freeboard joins the two boats with a line.

## What the chart shows

- **A flashing red ring** marks the other boat, so it stands out among the AIS
  targets.
- **Course lines** (dashed red) run from your boat and from the other boat on to
  where each will be at closest approach.
- **The closest approach** is a short solid red line with a marker at each end,
  joining those two points. Its length is how close you will pass, and its
  position shows where. That tells you at a glance which way to turn.

When the alarm doesn't report closest approach positions, the other boat still
gets the flashing ring, and a dashed red line joins it to your boat.

![Fig 2. The same alarm in night mode](collision-alarm-display-2.jpg)

Every vessel with an active collision alarm is drawn, each with its own lines.
If two alarms name the same vessel, the more urgent one is drawn. In night mode
the ring and lines are dimmed with the rest of the display.

## When the alarm sounds

The alarm also appears as an alert card with an **ACK** button, and a **MUTE**
button when the alarm plays a sound. Acknowledging closes the card, but the
drawing stays on the chart until the plugin clears the alarm. See *Alerts &
Alarms* in the online help.
