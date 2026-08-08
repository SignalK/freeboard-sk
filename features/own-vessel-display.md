---
id: own-vessel-display
title: Own Vessel Display
category: AIS & Vessels
---

![Fig 1. Your boat on the chart among nearby AIS traffic, with its heading and course lines drawn](own-vessel-display-1.jpg)

Your boat is drawn on the chart at the position your Signal K server reports, turned to
point the way you are heading. Around it Freeboard can draw the lines and circles that
turn a dot on a map into a picture of where you are going.

## The vessel icon

The icon sits at your reported position and rotates to your heading, so a glance tells
you both where you are and which way you are pointing. It is drawn above everything else
on the chart, so route lines and chart detail never hide it.

**Settings → Vessels → Vessel Icon Size** scales it. Larger is easier to pick out on a
helm tablet in daylight; smaller keeps more chart visible around you at close zoom.

Want a different boat entirely? A symbol provider can replace the icon with your own
artwork — see **Custom Map Symbols**.

## Lines drawn with your vessel

Each of these can be turned on or off in **Settings → Vessels**, and each appears only
when the underlying data is available:

- **Heading line** — where the bow is pointing. **Heading Line Length** sets how far it
  reaches: a fixed distance in nautical miles, or **Default**, which scales the line from
  your speed and the chart scale so it always means roughly the same thing.
- **COG line** — where you will actually end up, projected from your course and speed
  over ground. **COG Line Length** sets the projection time, so the line answers "where
  will I be in N minutes?" With a cross-current, the gap between this line and the
  heading line is your set and drift, drawn to scale.
- **Wind vectors** — true wind direction and apparent wind angle, when the boat reports
  wind data.
- **Laylines** — when navigating to a destination, the tacking angles that reach it.
- **Range circles** — equidistant rings centered on the boat, for judging distance off
  at a glance. **Number of Range Circles** sets how many; the spacing adapts to the chart
  scale and is labeled next to the boat. **Minimum Zoom Level** stops them cluttering the
  chart when zoomed out.

## When position data stops

![Fig 2. Position data has stopped arriving — the boat dims and a red question mark marks the last known fix](own-vessel-display-2.jpg)

If nothing updates your position for **30 seconds**, the boat icon dims and a red
question mark appears over it. The icon stays where it last was — that position is still
the best information available, but it is no longer current, and the marker says so.

This matters because the ways position data stops are quiet ones. A dropped Wi-Fi link
often does not close the connection cleanly, so the boat can sit on the chart looking
authoritative for minutes. It also covers the case where the server is healthy and
talking but its position source has failed: everything else keeps updating while the one
number you steer by does not.

The marker clears as soon as position data resumes.

It is not shown in Fixed Location Mode, where position updates are not expected.

## Fixed Location Mode

Running Freeboard somewhere that does not move — a shore station, a clubhouse, a desk —
makes a boat icon misleading. **Settings → Vessels → Fixed Location Mode** switches the
icon to a fixed-location marker and lets you enter the latitude and longitude to place it
at. Heading rotation is dropped, since a building does not have one.

## Related

- **Center & Follow Vessel** — keeping the boat on screen as you move.
- **Vessel Tracks** — recording and showing where you have been.
- **Custom Map Symbols** — replacing the boat icon with your own artwork.
