---
id: chart-zoom-limits
title: Chart Zoom Limits
category: Charts
---

Every chart holds detail down to a certain resolution and no further. Zoom in past that
point and you aren't shown more information — you're shown the last real chart data
magnified, which looks sharper than it is. Freeboard gives you two controls over what
happens at that boundary.

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

The two settings answer different questions: *Constrain map zoom* decides **whether you can
get there at all**, while *Keep tiles visible on max zoom* decides **what you see if you
do**. With the defaults — constrain off, keep-tiles on — you can zoom freely and charts
stay visible but progressively blurrier past their real detail.
