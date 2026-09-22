---
id: temporal-charts
title: Time-varying Charts
category: Charts
---

![Fig 1. NEXRAD weather radar scrubbed back to an earlier frame, with the Time palette open](temporal-charts-1.jpg)

A weather radar, satellite or nowcast chart is not one picture but a run of them,
one every few minutes. Where a chart provider offers those earlier frames, Freeboard
lets you scrub back through them, step frame by frame, and play the run as a loop —
the way you would on a weather app — without the provider having to publish a
separate chart for every frame.

## Which charts

A chart is time-varying when its provider says so. Charts served by a plugin declare
it on the chart resource (see below). A **WMS or WMTS** chart you add yourself
becomes time-varying automatically when the service advertises a time dimension for
the layer you pick — either in the add-chart dialog or later under **Chart
Properties**. An Overlay from an earlier Freeboard that had a time slider appears
in the Chart list as a chart, with this control in its place (see **Overlays**).
Vector charts (Mapbox-style sources, S-57 ENCs) are never time-varying.

A time-varying chart shows a **clock** action on its row in the Chart list,
alongside Opacity, Image Adjustment and Minimum Zoom Level. The action is available
while the chart is displayed.

![Fig 2. The clock action on a chart's row opens the Time palette; the row notes the frame being shown](temporal-charts-2.jpg)

## The Time palette

The palette is small and stays open beside the Chart list, so you can keep the map
in view while you scrub. It shows the chart's frame cadence ("every 5 min"), the
instant currently on the map, and a bar spanning the last 12 hours of frames:

- **Scrub** — drag the blue playhead on the upper lane of the bar. The map keeps the
  frame it has until the new one has loaded, so scrubbing never blanks the chart,
  even on a slow connection.
- **‹ ›** — step back or forward one frame. Stepping past either end of the bar moves
  the bar along, so the whole archive is reachable.
- **Loop** — the two amber dots on the lower lane bracket the frames **Play** cycles
  through; the shaded band between them is the loop, and its range is written out
  beside the speed. It starts as the last hour up to the newest frame. Drag a dot to
  change either end; the two cannot cross.
- **Play / Pause** — cycle the loop at the chosen **Speed** (Slow, Medium, Fast or
  X-fast). Scrubbing, stepping or NOW stops playback.
- **NOW** — return to the newest frame: the live frame for a source that serves one,
  or, for an archive-only source (IEM's NEXRAD history, for instance), the newest
  frame it holds — which the chart then keeps up with as new frames are added.

Dates and times are shown in your local time.

Scrubbing back in time is something you do with the palette in view. **Closing the
palette returns the chart to its newest frame** — whatever you had scrubbed to is
discarded, so a chart is never left drawing old weather with nothing on screen to
say so. While the palette is open, the frame you have selected stays exactly where
you put it: a chart that also auto-refreshes keeps its bar and loop current as new
frames arrive, but never moves your selection.

## What the chart list shows

While a chart is showing a past frame its row carries a small **"at …"** note with
the frame's time, so a ticked chart drawing old weather says why. The note clears
when the chart is back on its newest frame.

## What is remembered

- The **frame you are looking at is not remembered** — every time-varying chart
  starts on its newest frame when Freeboard loads, and returns to it when the
  palette closes.
- The **loop range is remembered per chart**, measured back from the newest frame,
  so a chart you loop over "the last three hours" opens on the last three hours
  next time too.
- The **palette's position** is remembered, like the Image Adjustment palette.

## With auto-refresh

A chart that also auto-refreshes (see **Auto-refreshing Charts**) stops refreshing
while it is showing a past frame — a historical frame does not change — and picks up
again when it returns to its newest frame. For an archive-only source that keeps
adding frames, "newest" moves on with them: on each refresh the chart is drawn from
the newest frame the source now holds. A **WMS or WMTS chart you added yourself**
keeps up the same way.

## For chart-provider plugins

Add a **`time`** block to the chart resource. `current: true` says the source serves
a live frame (so NOW is offered); `from` / `to` / `step` (milliseconds) or an
explicit `values` list describe the frames on offer. For **tile layers and TileJSON**
sources, `time.url` is the tile URL template with a `{time}` placeholder that
Freeboard fills with the ISO 8601 instant; the plain `url` stays the live frame.
**WMS and WMTS** sources need no template — the instant goes out as the standard
`TIME` parameter / `Time` dimension. Instants are requested exactly as the timeline
describes them (`from` plus whole steps), so a service that only serves those
instants is safe. The full convention is the *Time-varying charts* section of the
Plotter Extensions API documentation in the Freeboard-SK repository, which also
lets an extension plugin drive the same control.
