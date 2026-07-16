---
id: weather-station-wind-barbs
title: Weather Station Wind Barbs
category: Weather
---

![Fig 1. A weather-station target rendered as a wind barb](weather-station-wind-barbs-1.jpg)

Weather-station (`meteo`) targets — AIS Met/Hydro buoys and plugin-published shore
stations such as signalk-viva — show wind as a standard **wind barb**: half
feather = 5 kn, full = 10 kn, pennant = 50 kn. The barb is picked from the
station's reported wind speed in 5-knot buckets (5–75 kn, clamped) and its staff
rotates to point into the reported wind direction. Below 5 kn, or when no wind is
reported, the target falls back to the plain windsock icon, unrotated.

The wind speed is always shown as a label next to the glyph, in your configured
wind-speed units.

All 15 barb glyphs ship with Freeboard, so this works with no setup. Any bucket
can be replaced with custom artwork through a symbol provider plugin by
publishing a symbol whose id matches the well-known bucket id —
`real-weatherStation-<kts>` for real stations, `virtual-weatherStation-<kts>` for
virtual ones, where `<kts>` is one of the buckets 5–75 (e.g.
`real-weatherStation-25`).

A **Display → Weather → "Wind indicator"** setting can switch the glyph to a
plain arrow instead of a barb for every weather-station target on the chart.
