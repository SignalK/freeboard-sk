---
id: radar-overlay
title: Radar Overlay
category: Radar
---

![Fig 1. Radar returns painted over the chart, centred on the vessel](radar-overlay-1.jpg)

Overlays live radar returns on the chart, centred on your vessel and rotated
to its heading, using the Signal K Radar API. Returns are drawn spoke by spoke
as the scanner turns, on top of the chart layers.

**What it needs.** Server side, the radar must be reaching Signal K — that
means the **signalk-container** and **@marineyachtradar/signalk-plugin**
(MaYaRa) plugins installed and running. The radar controls only appear once the
server reports the Radar API _and_ at least one radar has been discovered; with
no radar found, nothing radar-related is shown. Display side, the browser must
support WebGL — on a device without it, the radar button reports that rather
than opening the panel.

**Turning it on.** A radar button appears on the toolbar, and **Radar Overlay**
in the map's _More actions_ menu. Either one connects to the radar and opens
the **radar control panel**. If you use radar often, **Settings → Display →
Action Button → "Radar Overlay"** promotes it to the main floating action
button.

**The control panel** shows the selected radar's name and brand, and:

- **Off / On** — the connection to the radar. Switching Off drops the spoke
  stream and clears the overlay while leaving the panel open.
- **Opacity** — how strongly the returns paint over the chart underneath.
- **Radar controls** — range, gain, sea clutter, rain and whatever else your
  radar exposes. Freeboard doesn't ship a fixed list of knobs: it builds these
  from the control definitions the radar itself advertises, so you see exactly
  what your unit supports. Controls with a fixed set of values become
  drop-downs, numeric ones a value field, and anything the radar reports as
  read-only stays read-only. Changes are sent to the radar immediately, and
  changes made elsewhere — at the MFD, or from another device — appear here
  live. All controls are disabled while the overlay is Off.

**More than one radar.** Pick the one to use in **Settings → Radar → Radar
Devices**, with **REFRESH** to re-query the server for the current list. The
selection is locked while the overlay is running — switch it Off first. Your
choice is remembered for next time; if that radar is no longer present, the
first one found is used.

**Server versions.** Both Radar API 3.4.0 and earlier servers are supported.
Freeboard detects the version when it discovers the radars and talks to the
right endpoint automatically — there is nothing to configure.

If the radar stream fails, Freeboard reports the error and switches the overlay
off.
