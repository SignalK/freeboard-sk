---
id: overlays
title: Overlays
category: Charts
---

Overlays were Freeboard's way of laying a WMS or WMTS layer — typically weather radar
or satellite imagery — over the chart, from an **Overlays** panel of their own. They
no longer exist as a separate feature: everything an Overlay did, a chart now does,
so Overlays have been folded into the **Chart list**.

## What happened to my Overlays

Nothing you need to act on. Any Overlay you had set up appears in the Chart list as a
chart, keeping its name, layer, opacity, zoom range and refresh interval, and stays
shown or hidden as it was. It starts at the top of the chart stack — where an Overlay
always drew — and can be re-ordered from there like any other chart.

Behind the scenes, Freeboard converts each Overlay into an ordinary chart source the
first time it loads with a login that can write to the server. Until then — a
read-only session, or a server whose resources-provider has no `charts` collection —
the Overlay is simply shown *as* a chart, and the conversion happens on a later load.
Either way the chart keeps the same identity, so nothing you set on it — opacity,
order, a playback loop — is lost.

The **Overlays** menu item remains for now as a signpost: choosing it tells you where
your overlays went.

## What a former Overlay can do

It is a chart like any other in the list — **Properties**, **Opacity**, **Remove**
(which deletes it from the server) — and gains what charts have:

- **Auto-refresh** — the interval set on the Overlay carries across and can be changed
  under Properties. See **Auto-refreshing Charts**.
- **The Time palette** — a WMS or WMTS source with a time dimension gets the clock
  action and the full scrub / loop / play control in place of the Overlay's time
  slider. See **Time-varying Charts**.
- **Image Adjustment**, **Minimum Zoom Level**, resource groups and the ordinary
  chart order.

## Adding a new radar or satellite layer

Use **Add Chart Source** in the Chart list (WMS or WMTS), pick the layer, and set a
refresh interval under Properties if the source updates regularly.
