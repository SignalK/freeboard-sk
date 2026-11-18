---
id: position-bar
title: Position Bar
category: Display
---

The bar along the bottom of the chart reads out where the pointer is and how far
the chart is zoomed in. Some settings and other entries call it the *status bar*.

**What it shows.** A latitude and longitude, followed by the zoom level (`Zm:`).
The position is shown in the format chosen in **Settings → Units → Position
display format**, and which position it is depends on what you are doing:

- **While you point at the chart**, it is the point under the mouse pointer, or
  the point you last touched.
- **While the chart follows your vessel**, it returns to the vessel's live
  position once the pointer rests: a mouse left still for 15 seconds, or a
  moment after a tap (the **Tap Fade Speed**, 1.5 seconds by default). While you
  draw, measure or edit, it stays with the pointer.
- **While the chart doesn't follow your vessel**, it shows the center of the
  chart until you point at it, then keeps the last point you pointed at.

The zoom level never claims more than the chart has reached — see *Chart Zoom
Limits*.

**Bearing, distance and ETA.** Turn on **Live ETA at cursor** in **Settings →
Display → Status Bar Options** and the bar adds the bearing (`Brg:`), distance
(`Dist:`) and ETA from your vessel to the point under the pointer. See *Live ETA
at Cursor*.

**In split view** the bar sits along the bottom of the active chart and moves when
you switch charts; its zoom level is the active chart's.

**Hiding it.** Untick **Settings → Display → Show position bar** to remove the bar
from the chart, from both charts in split view. It is on by default. Hiding it
hides the Live ETA readout too, since that is shown in the bar.
