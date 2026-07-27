---
id: chart-list
title: Chart List
category: Charts
---

![Fig 1. The chart list, with Bounds turned on so each chart's outline is drawn on the map](chart-list-1.jpg)

The **Chart List** is where you pick which charts are drawn on the screen, what order
they stack in, and how each one looks. Open it from the resources menu, then **Charts**.

Every chart the server offers is listed with its name and description. A **map** icon
marks a chart hosted on your own Signal K server; a **globe** icon marks one fetched from
the internet — worth a glance before you rely on a chart offshore.

**To show or hide a chart**, tick or untick its checkbox. The checkbox at the top of the
panel switches every chart on or off at once, and **refresh** re-reads the list from the
server if you've just installed new charts.

## Finding a chart in a long list

A boat carrying a full regional ENC set can have hundreds of charts, so there are three
ways to narrow the list. They combine, so you can use them together.

- **Type to filter list** — matches on the chart's name.
- **In view** — hides every chart that doesn't cover what you're currently looking at.
  The list re-filters live as you pan and zoom, so it always reflects the current view.
  Charts that don't declare bounds (OpenStreetMap, for instance) count as covering
  everywhere and stay listed whatever the view.
- **Bounds** — draws the outline of every listed chart on the map, so you can see what
  covers where. Clicking an outline brings up the charts at that spot and lets you switch
  one on directly, without finding it in the list.

**In view** and **Bounds** both start off each time you open the list — they're a way to
search, not a setting to leave set.

## Chart order

Charts are drawn stacked, and the one on top is the one you read. **Re-order** (the
`import_export` icon) opens the **Chart Order** screen: drag charts to arrange them, with
the top layer at the top of the list and the base layer — a world map, typically — at the
bottom. Your order is saved and reused next time.

![Fig 2. The Chart Order screen — drag a chart to move it up or down the stack](chart-list-2.jpg)

The chart list itself is shown in that same top-layer-first order, so what you see in the
list is the stack you arranged. Change the order and return, and the list follows
immediately.

Charts you have never re-ordered start out stacked by scale — the largest-area chart at
the bottom, so the most detailed one ends up on top. That is only the starting point:
once you drag anything, your order wins.

## Per-chart actions

![Fig 3. A chart entry, with its actions along the bottom](chart-list-3.jpg)

Along the bottom of each entry is a row of icons — the actions for that chart. Only the
ones that apply are shown, so the row is shorter on some charts than on others. In the
row above, left to right:

- **Properties** (the *i* in a circle) — view and edit the chart's details.
- **Opacity** (the droplet) — fade a chart to let the one beneath show through. Useful
  for laying a harbour chart over an aerial image.
- **Image adjustment** (the sliders) — brightness and contrast; image-based charts only.
  See the **Chart Image Adjustment** feature.
- **Add to Group** (the shapes) — file the chart into a resource group. Only shown when
  your server supports resource groups.

Two more appear where they apply:

- **Cache Tiles** (the download arrow) — select an area of the map to download for
  offline use. Only offered for charts the chart provider serves as proxied.
- **Remove** (the waste bin) — delete a chart you added yourself. Charts that come from
  the server's chart plugin can't be deleted from here.

Opacity and image adjustment are saved per chart and persist between sessions. The
checkbox on the right of the entry is what shows or hides the chart.

## Adding your own chart source

**Add** (the `add` icon) registers a new chart source with the server — **WMTS**, **WMS**,
or a **JSON Map Source**. Added charts appear in the list alongside the rest and can be
removed again with **Remove**.

Freeboard also offers OpenStreetMap and OpenSeaMap without any server-side charts
installed; both need an internet connection to draw.

Note that everything else in the list comes from the Signal K server, so a chart plugin
(such as `@signalk/charts-plugin`) has to be installed and configured before your own
charts appear here.
