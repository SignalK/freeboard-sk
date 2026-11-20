---
id: s57-charts
title: S-57 Vector Charts
category: Charts
---

Freeboard draws S-57 electronic navigational charts (ENCs) itself, following the
IHO's S-52 presentation rules, so you choose how they look: which symbols, which
colors, where the water shading changes, and which details to show. The charts
reach Freeboard from your Signal K server as vector tiles converted from
unencrypted ENCs — the charts-provider-simple plugin can supply them. Encrypted
(S-63) charts are not supported.

**Settings → Map → Vector Charts** sets how every S-57 chart is drawn, and a change
shows straight away:

- **Graphics Style** — **Paper chart** (the default) or **Simplified**, the two S-52
  symbol sets.
- **Boundaries** — **Plain** (the default) or **Symbolized** area boundaries.
- **Color Table** — **Day Bright** (the default), **Day Black Background** or
  **Day White Background**.
- **Colors** — how many shades the water uses. With **4** (the default) it is shaded
  in bands at the shallow, safety and deep depths; with **2** it is one shade
  shallower than the safety depth and another deeper.
- **Shallow depth**, **Safety depth** and **Deep depth** — in meters; 2, 3 and 6
  by default.
- **Layers** — S-52 puts many kinds of object in its *Other* category, which is drawn
  only for the kinds you pick here: Depth Soundings, Depth Contours, Obstructions,
  Underwater Rocks, Wrecks, Submarine Cable, Submarine Pipelines, Berths, Mooring
  Facilities, Landmarks, Distance Marks, Currents, Magnetic Variation, Rivers,
  Lakes, Buildings and Land Elevation. Depth Soundings, Depth Contours,
  Obstructions, Underwater Rocks, Wrecks, Rivers, Lakes, Buildings and Land
  Elevation are on by default. A layer only shows on charts that contain that
  kind of object. Upgrading keeps the layers you had already chosen; tick
  Buildings and Land Elevation to add them.

**Buildings and Land Elevation** add what you take bearings on near a harbor.
Charts carry them only at harbor and coastal scales, so they appear as you zoom in.
Buildings are filled brown with an outline. Land Elevation draws elevation contours
as thin lines in the land color, and peaks as spot heights with their height; the
contours themselves carry no label.
