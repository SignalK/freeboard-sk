---
id: chart-auto-refresh
title: Auto-refreshing Charts
category: Charts
---

![Fig 1. NOAA NEXRAD weather radar served by a storm-intelligence plugin, drawn over the Florida Keys](chart-auto-refresh-1.jpg)

While most charts never change once drawn, certain types of charts like weather radar
and satellite images may need a fresh image every few minutes. Freeboard supports a
chart that declares itself time-varying and will re-fetch its tiles on its own, at the
cadence the chart asks for.

## How it works

A chart's refresh cadence comes from whoever added it: a chart-provider plugin declares
it on the charts it serves, and a chart source you add yourself carries the interval you
give it (see below). Charts with no interval behave exactly as before. The shortest
refresh cadence honoured is **one minute**.

A provider can go further and offer the **earlier** frames too, which turns the chart
into one you can scrub back through and play as a loop — see **Time-varying Charts**.
While such a chart is showing a past frame its auto-refresh pauses, and resumes when
it returns to live.

## For sources you add yourself

Any WMS, WMTS or JSON map source added through **Add Chart Source** can be given a
refresh interval from its **Properties** dialog: enter the number of minutes in
**Auto refresh** (0 means never) and **SAVE**. The same field lets you change or turn
off the interval later. Public weather-radar and satellite services — NOAA nowCOAST,
the Iowa State Mesonet NEXRAD mosaics, and the like — are the typical candidates.

Provider-served charts show their declared interval here but cannot be changed — the
plugin that serves them owns it.

## Offline and poor signal

Being out of range is normal at sea, so a refresh that can't reach the server is not an
error. The chart keeps showing the **last image it loaded** — it never goes blank because
a newer one failed to arrive — and quietly tries again at the next interval. When the
connection returns, the chart catches up.

## Which charts

Any raster chart can opt in: plain tile layers, TileJSON, WMS and WMTS. Vector charts
(Mapbox-style sources, S-57 ENCs) are not refreshed. OpenStreetMap and OpenSeaMap are
unaffected. An Overlay from an earlier Freeboard now appears in the Chart list as a
chart and keeps the refresh interval it was given (see **Overlays**).

## For chart-provider plugins

Add **`refreshInterval`** (milliseconds) to the chart resource, e.g.
`"refreshInterval": 300000` for five minutes. Omit it or set `0` for a static chart;
values under 60 000 are raised to the floor. Each refresh requests the tiles with a
fresh `_refresh` query parameter, so the browser never hands back the image it already
has, whatever caching headers the tile endpoint sends. The refresh is non-destructive —
the previous tile stays until its replacement has loaded — so an interval is safe to
declare for a product that is sometimes unreachable.
