---
id: chart-zoom-limits
title: Chart Zoom Limits
category: Charts
---

![Fig 1. Setting a chart's minimum zoom — the panel stays open beside the chart list](chart-zoom-limits-1.jpg)

Every chart holds detail down to a certain resolution and no further. Zoom in past that
point and you aren't shown more information — you're shown the last real chart data
magnified, which looks sharper than it is. Freeboard gives you two controls over what
happens at that boundary.

The other end of the range is yours to choose: a chart can be given the lowest zoom it
appears at, so a stack of overlapping charts reveals each one in turn as you zoom in.

## Constrain map zoom

The **Constrain map zoom** button (the `zoom_in_map` icon on the right-hand toolbar) stops
the map at the edge of your chart data. Turn it on and you simply cannot zoom in — or out —
beyond the range your selected charts actually cover. The button highlights while active,
and the zoom **+** / **−** buttons grey out once you reach a limit.

The limits are taken from the **widest** range across all currently selected charts: the
lowest minimum zoom and the highest maximum zoom of any of them. Selecting or deselecting
charts recalculates it, so the constraint always reflects what you have switched on. Charts
that don't declare their own zoom range fall back to a 0–24 range. With the setting off,
the map is free to move between zoom 2 and 28 regardless of what your charts hold.

This is off by default. It matters most when you're working from downloaded or offline
chart sets — a cached raster or MBTiles collection on a boat with no internet — where
zooming past the data can't be rescued by fetching better tiles, and where a magnified
tile can read as detail that was never surveyed.

## Keep tiles visible on max zoom

The companion setting, **Keep tiles visible on max zoom** (Settings → Map), decides what a
chart layer does once you pass *its* maximum zoom. Leave it on — it is on by default — and
the chart keeps drawing, stretched, instead of disappearing. Turn it off and each layer
stops rendering beyond the resolution it genuinely has, leaving the chart blank there.

It also matters when charts of different resolutions are stacked. In a selection mixing a
wide-area chart with a detailed harbour chart, the lower-resolution one keeps rendering
(stretched) up to the map's maximum rather than dropping out as you zoom in.

Those two settings answer different questions: *Constrain map zoom* decides **whether you
can get there at all**, while *Keep tiles visible on max zoom* decides **what you see if
you do**. With the defaults — constrain off, keep-tiles on — you can zoom freely and charts
stay visible but progressively blurrier past their real detail.

## Per-chart minimum zoom

Chart sets covering the same water at different scales are drawn on top of each other, and
a large-scale sheet is clutter until you are zoomed in far enough to want it. Every
hydrographic office publishes raster charts in overlapping bands — NOAA's Overview,
General, Coastal, Approach and Harbor; Finland's Yleiskartat, Merikarttasarjat,
Rannikkokartat and Satamakartat. Freeboard picks the right band on its own for S-57 vector
charts, because the standard records which band a chart belongs to. Raster carries no
equivalent, so the only remedy used to be ticking and unticking charts as you went.

Instead, give each chart the zoom it starts earning its place at — coastal from z9, boating
from z12, harbour from z14 — and each appears as you zoom in, drawn over the coarser charts
already on screen.

The control is in **Charts**, on the row of each image-based chart: **Minimum Zoom Level**
(the downward arrow onto a line), next to opacity and image adjustment. It opens a small
panel beside the chart list, which stays open — balancing an overlapping set means moving
between charts — and can be dragged out of the way by its title bar.

Type a level into **Show from**, or press the target button to take the map's current zoom.
The line beneath the title gives the chart's own data range and where the map is now, for
reference; the line under the box reads back what you have set — *Hidden below z12*, or
*Shown at every zoom level*. The map updates as you go, so you can see the effect.
**APPLY** keeps the level, and closing the panel without applying puts the old one back.
The **X** beside the target button clears the level, so the chart shows at every zoom
again.

A chart carrying a minimum shows **from z12** under its name in the list, and adds *—
hidden at this zoom* while it is not being drawn — so a ticked chart that is not on screen
tells you why rather than looking broken.

The minimum only ever restricts. A chart is never drawn below the zoom its own tiles start
at, so a level set under the chart's own range does nothing, and the top of the range is
untouched — *Keep tiles visible on max zoom* behaves exactly as described above. Which
chart you see where several overlap is still decided by chart order. Levels are saved per
chart on this device, alongside opacity and image adjustment, and persist between sessions.

The zoom readout in the status bar counts up rather than rounding: a view a hair under z14
reads `Zm: 13.9` where it once read `Zm: 14.0`. It never claims a level the map has not
reached, which is what makes "set 14, zoom to 14, see the chart" behave.
