---
id: split-view
title: Split View
category: Display
---

![Fig 1. Split view — the main chart close in, the second chart zoomed out. Arrows mark the divider handle and the Split view button](split-view-1.jpg)

See the water right around you and the bigger picture at the same time. Split view
divides the chart area into two charts, each with its own pan and zoom. A typical setup is
the main chart zoomed in and following the boat, with the second chart zoomed out and
north-up as an overview.

## Turning it on

![Fig 2. Enable split view, in Settings → Display](split-view-2.jpg)

Tick **Enable split view** in **Settings → Display** (it's off by default). That adds a
**Split view** button to the right-hand toolbar. Press it to open the second chart, and
press it again to close it. Split view isn't available in kiosk mode.

## The second chart

The second chart sits beside the main one, or below it when the screen is taller than it
is wide, such as a tablet held upright. It shows everything the main chart shows: charts,
routes, waypoints, notes, regions, tracks, AIS targets, weather, radar, and the map layers
extensions add. A dashed box on it outlines the area the main chart is showing, so you can
see where your close-up view sits in the overview.

The main chart stays where it was and works exactly as before.

## Which chart the buttons control

Tap or drag a chart to make it the **active** chart, marked by a blue outline. The map
buttons (North Up / Heading Up, Center & Follow Vessel, and Zoom) act on the active
chart, and so do the keyboard and the Center actions in the resource lists. Each chart
can follow the boat, or not, at its own zoom and orientation. The status bar (position,
zoom and, if you've turned it on, the bearing, distance and ETA to the cursor) sits along
the bottom of the active chart, and moves when you switch charts. Its zoom readout shows
the active chart's zoom.

Center from a list zooms the active chart in just far enough to show the item.

## Working on the second chart

Tap a feature on the second chart and its popover opens there. Right-click or long-press
opens the chart menu for that spot. A few things always happen on the main chart:

- **Modify** moves the main chart to the feature and edits it there.
- Drawing, measuring and box selection take taps on the main chart only, so starting one
  makes the main chart active.
- Extensions that read or move the chart work with the main chart.

The position readout follows the pointer over either chart.

## Resizing

Drag the handle on the divider to change how the space is shared; both charts resize as
you drag. The divider moves between roughly a third and two thirds of the space. From the
keyboard, Tab to the divider and use the arrow keys, or Home and End to jump to either
end.

Each device remembers whether split view is open, where the divider is, and how the
second chart was set up: its view, Follow and orientation.

## Things to know

- Labels, AIS course lines, range-ring spacing, weather grids and data overlays' zoom
  fading follow the **main** chart's zoom on both charts.
- Notes are loaded around the main chart only, so notes well outside it don't appear on
  a zoomed-out second chart.
- An extension's image overlay covers the main chart's area only.
- MapStyle hillshading isn't shown on the second chart.
- The dashed box catches up when you finish dragging the divider, not during the drag.
- On a phone held upright, the main chart's toolbar buttons can sit over the second chart.
- A second chart takes about as much work to draw as a chart on its own, and a zoomed-out
  one full of AIS targets takes more. On a slower device, such as a Raspberry Pi or an older
  tablet, close the split or zoom the second chart in if the display gets sluggish.
