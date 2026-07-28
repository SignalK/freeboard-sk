---
id: unit-preferences
title: Units & Value Display
category: Display
---

![Fig 1. The Units settings panel, with Use Server Unit Preferences turned on](unit-preferences-1.jpg)

Freeboard shows every numeric value in the units you prefer. You choose them in
**Settings** on the **Units** tab, under **UNITS & VALUES**.

## Choosing your own units

Five settings, each covering one kind of value:

- **Distance units** - Kilometres or Nautical Miles. Ranges, route legs, distance to
  the next waypoint.
- **Depth units** - metres, feet or fathoms.
- **Length units** - metres or feet. Vessel dimensions and other short lengths, kept
  separate from Distance so you can read a boat's length in feet while navigating in
  nautical miles.
- **Speed units** - knots, m/sec, km/h or mph.
- **Temperature units** - Celsius or Fahrenheit.

A change applies straight away, with no restart.

The depth setting reaches further than the instrument readouts: it also sets the unit
S-57 vector charts label their soundings in, so changing it redraws the chart as well.
Sounder depth and charted depth always agree.

## Taking your units from the Signal K server

The server keeps its own unit preferences, set per user in **Server Admin** under
**Server &rarr; Configuration &rarr; Settings &rarr; Unit Preferences**. Tick
**Use Server Unit Preferences** and Freeboard follows those instead: the five
selections above grey out and take their values from the server.

The point of this is to set your units once, on the server, and have every app that
honours them agree - Freeboard included. Change a unit on the server and Freeboard
picks it up; there is nothing to update here.

The checkbox is only available if your server actually publishes unit preferences. On
a server without them it stays greyed out and your own selections apply.

If the server asks for a unit Freeboard doesn't offer, Freeboard keeps your existing
choice for that category rather than showing a value it cannot convert.

## When one value needs a different unit

A single unit per category isn't always what you want. Wind speed in metres per second
alongside boat speed in knots is the common case, and normal practice in much of
Europe.

The server handles this by publishing a unit against one specific data path rather than
against the whole category. Freeboard honours that for **wind speed**: with **Use
Server Unit Preferences** on, the true and apparent wind speeds in a vessel popover
display in the server's wind-speed unit, while boat speed stays in your Speed unit.

There is nothing to set in Freeboard. Configure the override on the server and it
appears; where the server publishes no override, wind speed falls back to the Speed
unit like everything else. Turning **Use Server Unit Preferences** off drops the
overrides along with the rest of the server's preferences.

The true-wind value Freeboard reads is the one you selected under **Preferred Paths**,
so if you have picked a particular true-wind source the override follows that choice.

Wind speed is currently the only value that uses a per-path unit.

## Also on this tab

Two further settings share the **UNITS & VALUES** panel because they change how values
are shown rather than what they are:

- **Position display format** - how latitude and longitude are written, from decimal
  degrees through to degrees, minutes and seconds.
- **Prefer True / Magnetic values** - which of the two Freeboard uses for paths you
  have not pinned under **Preferred Paths**.
