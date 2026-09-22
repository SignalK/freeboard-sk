---
id: chart-sources
title: Adding a Chart Source
category: Charts
---

![Fig 1. NCEP CONUS radar added as a WMS source and drawn over the chart, sitting at the top of the chart list](chart-sources-1.jpg)

Freeboard draws whatever charts your Signal K server offers, but you can also point it at
a chart or imagery service yourself — a weather radar mosaic, satellite imagery, an aerial
photo layer, a tile set someone publishes. **Add Chart Source** registers that service with
the server, after which it behaves like any other chart in the list.

## Adding one

![Fig 2. Add on the chart list offers WMTS, WMS or JSON Map Source](chart-sources-2.jpg)

Open the chart list (resources menu, then **Charts**) and press **add** — the `+` on the
row with the **Bounds** and **In view** switches. Three kinds of source are offered:

- **WMTS** — a Web Map Tile Service, serving pre-rendered tiles.
- **WMS** — a Web Map Service, which draws an image to fit what you are looking at.
- **JSON Map Source** — a TileJSON or Mapbox Style document; Freeboard works out which
  from the file itself.

## The service address

![Fig 3. Add WMS Source — paste the address the provider publishes](chart-sources-3.jpg)

For WMS and WMTS the dialog asks for the **WMS service URL** (or **WMTS service URL**).
Paste whatever address the provider publishes — the plain service address, or the full
*GetCapabilities* link, which is what most providers actually hand out. Either works.
Freeboard stores the address without the request parameters it supplies itself, and keeps
anything else on the link, so an API key or a MapServer `map=` parameter survives.

Press the arrow. Freeboard asks the service what it offers and opens **Chart Properties**
on the answer.

If the service refuses, the reason it gave is shown rather than a generic failure —
usually enough to tell whether the address is wrong, the service is down, or the layer you
were after is unavailable.

## Choosing the layer

Chart Properties lists what the service offers. A **WMS** source can draw several layers
together, so each row has a checkbox; a **WMTS** source draws one layer, so the list is a
single choice.

Each row shows the layer's title, followed by its identifier in lighter text wherever the
two differ — *NEXRAD BASE REFLECT (GOOGLE)* **(nexrad-n0q-900913-conus)**. Services often
give a whole run of sibling layers the same title and distinguish them only by identifier
— one per region, say — and the identifier is the thing you are really choosing, so it is
shown whenever it tells you something the title doesn't.

A small **clock** icon in front of a layer means it is time-varying: it carries earlier
frames you can scrub back through and play as a loop. Hover it for a one-line summary —
how often it updates and how far back it goes (*Time-varying: every 5 min, last 12 h*), an
archive's date range, or a frame count. See **Time-varying Charts**.

## What gets filled in for you

![Fig 4. Chart Properties after picking a layer — name, description and refresh interval filled in, and a clock icon marking the layer as time-varying](chart-sources-4.jpg)

Picking a layer fills in what the service can tell Freeboard:

- **Name** — the layer's title.
- **Description** — the first clause of the service's own description of that layer. These
  tend to run to a paragraph, and the field is a single line.
- **Auto refresh** — for a time-varying layer only: the cadence the service declares, or
  five minutes when it declares none. *Never* is almost always the wrong answer for radar
  or satellite imagery. See **Auto-refreshing Charts**.

Anything you have typed yourself is left alone — including a refresh interval you
deliberately set to 0. Only the values Freeboard filled in are replaced if you change your
mind and pick a different layer, and a cadence it filled in is cleared again if you
re-point the chart at a layer that doesn't vary with time.

Then press **SAVE**.

## Afterwards

The new chart appears in the chart list among the rest, and can be shown, hidden,
re-ordered, faded and adjusted like any other — see **Chart List**. **Properties** reopens
this same dialog, so the name, description, layer and refresh interval can all be changed
later. **Remove** (the waste bin) deletes it from the server; charts that come from a chart
plugin cannot be removed this way.
