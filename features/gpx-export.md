---
id: gpx-export
title: Export to GPX
category: Import/Export
---

![Fig 1. Exporting an AIS vessel's track from its popover](gpx-export-1.jpg)

Save routes, waypoints and tracks to a GPX file, to load into another
plotter or app, or to send to a friend so they can follow the same line.

## Routes, waypoints and your trail

Open the **Resources** menu (the stacked layers button on the left toolbar)
and choose **Export**. The **Export to GPX** window lists what can be saved:

- **Waypoints** and **Routes** from your Signal K server. Tick a section's
  box to select all of them, or expand it to pick individual ones.
- **Tracks**: your vessel's trail, whether it is kept on this device or
  comes from the server (see **Vessel Tracks**).

Click **Save** and choose where to save the file. Browsers that can't show a
save window download it as `fb_export.gpx` instead.

## Tracks

![Fig 2. The Export track to GPX button in a vessel's popover](gpx-export-2.jpg)

To save a single vessel's track, your own or another boat's, tap the vessel
on the chart and use **Export track to GPX** (the download button) in its
popover. The button appears while that vessel's track is shown on the chart,
or while its history is shown in **Track History & Playback**. It opens the
same window with just that vessel's track.

**Track to export** chooses which part of the track to save:

- **As displayed**: the track as it is drawn on the chart right now.
- **Last 7 days** or **Last 30 days**.
- **All recorded**: everything the server has kept for that vessel.
- **Track history range**: the range the Track history window is showing.
  Offered while that vessel's history is shown, and the choice the window
  starts on when you opened it with only the history showing.
- **Custom range**: pick a **From** and **To** date and time.

Ranges other than **As displayed** are fetched from the server when you
click **Save**, in the most detail it provides, so a file can hold far more
than is drawn on the chart. They need a Signal K server with the Track API
(server 2.33 or later with a track provider, such as the Tracks plugin).
Without one, the track is saved as displayed. For another vessel that means
only the positions Freeboard gathered while it was open, and the button's
tooltip says so.

Each track is saved under a name that says whose it is and when it was
recorded, such as `Heron (366000012) 2026-09-22 19:06 – 2026-09-24 19:14`.
Every point carries the time it was recorded, where known, so other plotters
can show your speed along it or replay it.

To load a GPX file into Freeboard, use **Import** in the same menu.
