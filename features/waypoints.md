---
id: waypoints
title: Waypoints
category: Waypoints
---

A waypoint marks a position you want to come back to or steer for — a harbour
entrance, a good fishing spot, a mark read off a paper chart. Waypoints are saved
on your Signal K server, so every display aboard shows the same ones.

## Adding a waypoint

- **Drop Waypoint**, in the edit menu (pencil icon): tap the chart where you
  want it.
- **Add Waypoint here**: right-click or long-press the chart.
- **Add Waypoint at Vessel**, in the edit menu or the vessel's popover, or the
  action button set to **Waypoint at vessel** (see *Action Button*): at the
  boat's current position.

Each opens **New Waypoint**, with a name filled in that you can change.

## The waypoint dialog

The same dialog is used to add a waypoint and, as **Waypoint Details**, to
change one: its **Name** (required), a **Description**, its position and its
symbol.

**The position** can be entered in the notation you have in front of you. Pick
it with the chips above the fields:

- **Latitude / Longitude** — decimal degrees, e.g. *47.6375°*
- **DD° MM.MMM'** — degrees and decimal minutes, e.g. *47° 38.250'*
- **DD° MM' SS.SS"** — degrees, minutes and seconds, e.g. *47° 38' 15"*
- **UTM** — zone, N/S, easting and northing in metres

The dialog opens on the format closest to your **Settings → Units → Position
display format**. Each field shows an example. As you type, the ° and ′ marks
are filled in for you; you can also type a hemisphere letter or a minus sign, and
a comma works as the decimal separator. Pick N/S and E/W beside the fields, or
paste a whole value, in any notation, and it is converted to the format you've
chosen. UTM covers 80°S to 84°N only; for a position outside that, the dialog
asks you to use another format.

Whatever you enter is saved as ordinary latitude and longitude. Switching format
only changes how the position is shown, so it never moves the waypoint.
**SAVE** stays greyed out until the name and the position are both valid.

**The symbol** is chosen below: pick a kind (Waypoints, Pseudo AtoN, Sightings,
Alarms, Start Boat or Start Pin), then a symbol. Under Waypoints, **Show all
symbols** adds every symbol your symbol providers offer (see *Custom Map
Symbols*).

A waypoint your server marks as read-only shows its details but can't be
changed.

## On the chart

Tap a waypoint for its popover, with its name and position:

- **MOVE** lets you drag it to a new position. If you're navigating to it, your
  destination moves with it.
- **GO TO** makes it your destination; while you're heading there, a button
  stops navigating.
- **INFO** opens its details. With **Prefer Info-Panel** on (**Settings →
  Display**), the info panel opens instead, and holds its notes and the delete
  button; with it off, the popover has **NOTES** and **DELETE** too.

Routes can be drawn through your waypoints (see *Route Planning*), and waypoints
can be exported to a GPX file (see *Export to GPX*).

## The Waypoints list

Open **Resources → Waypoints** for every waypoint on the server. Type to filter
the list. Tick a waypoint to show it on the chart, or use the box at the top to
show or hide them all. Each waypoint has buttons to delete it, show its notes,
navigate to it (or stop), center the chart on it, add it to a resource group,
and open its details. Deleting a waypoint asks first, and offers to delete the
notes attached to it as well. A waypoint can be part of a route, so take care.
