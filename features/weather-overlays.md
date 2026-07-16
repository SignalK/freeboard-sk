---
id: weather-overlays
title: Wind and Ocean Currents
category: Weather
---

![Fig 1. Wind and ocean current overlays on the chart](weather-overlays-1.jpg)

Two grid overlays sample live weather data across the visible chart area, each
toggled independently from the **Weather** panel (opened from the resources
list):

- **Wind** — "Enable wind layer" toggle. Requires a Signal K Weather Provider
  plugin installed on the server. Freeboard samples a 5×4 grid of points across
  the current view and refreshes them shortly after you pan or zoom. Each point
  renders as a **wind barb** by default (half feather = 5 kn, full = 10 kn,
  pennant = 50 kn, staff pointing into the wind) or, with the
  **Display → Weather → "Wind indicator"** setting set to Arrow, an arrow
  pointing where the wind flows to. Either glyph always shows the sampled wind
  speed as a label. The glyph choice is shared with the wind barbs shown on
  weather-station targets — switching the Wind indicator setting changes both
  at once. The arrow glyph can be replaced with custom artwork through a symbol
  provider plugin by publishing a symbol with the well-known id
  `windIndicator-arrow`.

- **Ocean Currents** — "Enable ocean currents layer" toggle. No server plugin
  needed — Freeboard queries the Open-Meteo Marine API directly. It samples a
  denser 10×8 grid; each arrow points in the current's flow direction, is
  colour-graded from blue (slow) to red (fast), sized by speed, and labelled
  with the current's velocity in knots.

Both overlays refresh automatically as you pan or zoom, and can be shown
together or independently.
