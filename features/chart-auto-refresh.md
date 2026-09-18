---
id: chart-auto-refresh
title: Auto-refreshing Charts
category: Charts
---

![Fig 1. NOAA NEXRAD weather radar served by a storm-intelligence plugin, drawn over the Florida Keys](chart-auto-refresh-1.jpg)

While most charts never change once drawn, certain types of charts like weather radar
and satellite images may need a fresh image every few minutes. Freeboard now supports a
chart that declares itself time-varying and will re-fetch its tiles on its own, at the
cadence the provider asks for.

## How it works

Charts that need a refresh, and how often it is needed, is declared by the plugin that
serves them. Chart providers that don't explicitly ask for a refresh behave exactly as
before. The shortest refresh cadence honoured is **one minute**.

## Offline and poor signal

Being out of range is normal at sea, so a refresh that can't reach the server is not an
error. The chart keeps showing the **last image it loaded** — it never goes blank because
a newer one failed to arrive — and quietly tries again at the next interval. When the
connection returns, the chart catches up.

## Which charts

Any raster chart can opt in: plain tile layers, TileJSON, WMS and WMTS. Vector charts
(Mapbox-style sources, S-57 ENCs) are not refreshed. OpenStreetMap and OpenSeaMap are
unaffected, and the **Overlays** you add from a WMS/WMTS server have their own refresh
interval, set when you create the overlay.

## For chart-provider plugins

Add **`refreshInterval`** (milliseconds) to the chart resource, e.g.
`"refreshInterval": 300000` for five minutes. Omit it or set `0` for a static chart;
values under 60 000 are raised to the floor. Because the tile URL does not change
between refreshes, the tile endpoint must send **`Cache-Control: no-cache`** (or a
`max-age` shorter than the interval), or the browser will serve the tile it already has.
The refresh is non-destructive — the previous tile stays until its replacement has
loaded — so an interval is safe to declare for a product that is sometimes unreachable.
