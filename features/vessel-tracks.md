---
id: vessel-tracks
title: Vessel Tracks
category: Tracks
---

![Fig 1. The "Show vessel track" button in a vessel's popover](vessel-tracks-1.jpg)

See where your own boat has been, and where other AIS vessels have been, as a
track (trail) drawn on the chart.

## Your own track

Turn on **Display Vessel Track** under **Settings → Vessels** to draw your
boat's recent track behind it. It is on by default.

**Track source** chooses where that track comes from:

- **Auto** (the default) uses the track your Signal K server has recorded
  whenever the server can supply one. The track then survives restarts and is
  the same on every device you open Freeboard on. When the server has no
  recorded track, the track is kept on this device instead. The hint under the
  selector shows which one is in use.
- **Server** always asks the server. It is unavailable when the server cannot
  supply a track, and the hint says what is needed: a Track API (v2) provider,
  such as the Tracks plugin.
- **This device** keeps the track in this browser only, recorded while
  Freeboard is open. Each device then shows its own track.

When the track comes from the server, **Length** sets how many hours of it to
show (24 hours by default). The three **Resolution** settings trade detail for
speed. They set how closely spaced the points are for the last hour, for 1 to
24 hours ago, and for anything older.

In the chart's context menu (right-click, or long-press on a touch screen),
**Refresh Trail** reloads a server track. For a track kept on this device, the
same item reads **Clear Trail** and deletes it. **Trail to Route** turns the
track into a route.

## Other vessels' tracks

**To show every vessel's track at once**, turn on **Show Track** under
**Settings → Vessels → Other Vessels**. The tracks of the vessels on screen
draw on the chart, and they follow the chart as you pan to a new area. Tracks
are drawn when you are zoomed in, not when zoomed far out.

**To follow just one or two vessels** instead of cluttering the chart with
everyone's track, leave that setting off and pick vessels individually. Tap a
vessel on the chart to open its popover, or find it in the AIS vessel list.
Then use the **track** button (labelled **TRACK** in the list) to turn its
track on or off. Your picks apply for the current session only; they aren't
saved between visits.

The per-vessel picker is only available while **Show Track** is off. With it
on, every vessel is already shown, so there's nothing to pick.

Vessels hidden by **Hide Moored** or **Hide Anchored** don't have their tracks
drawn either.

## Where the tracks come from

Recorded tracks come from your Signal K server's Track API (server 2.33 and
later, with a track provider such as the Tracks plugin). Freeboard can still
read tracks from the older track interface on older servers and plugins. When
it does, a **Vessel Tracks** notice at start says that support for the older
interface will be removed in a future release, and what is needed instead.
Tick **Don't show this message again** to stop it appearing on that device.

Without any server track source, your own track is kept on this device, and
other vessels show only the short track Freeboard gathers while it is open.
