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
Properties**. Vector charts (Mapbox-style sources, S-57 ENCs) are never
time-varying.

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
- **NOW** — return to the live frame. It is only offered for sources that serve a
  live frame; an archive-only source (IEM's NEXRAD history, for instance) has no
  "now" and instead opens on its newest frame.

Dates and times are shown in your local time.

## What the chart list shows

While a chart is showing a past frame its row carries a small **"at …"** note with
the frame's time, so a ticked chart drawing old weather says why. The note clears
when the chart is back on live.

## What is remembered

- The **frame you are looking at is not remembered** — every time-varying chart
  starts on its live (or newest) frame when Freeboard loads.
- The **loop range is remembered per chart**, measured back from the newest frame,
  so a chart you loop over "the last three hours" opens on the last three hours
  next time too.
- The **palette's position** is remembered, like the Image Adjustment palette.

## With auto-refresh

A chart that also auto-refreshes (see **Auto-refreshing Charts**) stops refreshing
while it is showing a past frame — a historical frame does not change — and picks up
again when it returns to live.

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
