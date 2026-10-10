---
id: radar-overlay
title: Radar Overlay
category: Radar
---

![Fig 1. Radar returns painted over the chart, centred on the vessel](radar-overlay-1.jpg)

Overlays live radar returns on the chart, centred on your vessel and rotated
to its heading, and lets you operate the radar from the chart, using the
Signal K Radar API. Returns are drawn spoke by spoke as the scanner turns, on
top of the chart layers.

**What it needs.** Server side, the radar must be reaching Signal K — that
means the **signalk-container** and **@marineyachtradar/signalk-plugin**
(MaYaRa) plugins installed and running. The radar controls only appear once the
server reports the Radar API _and_ at least one radar has been discovered; with
no radar found, nothing radar-related is shown. Display side, the browser must
support WebGL — on a device without it, the radar button reports that rather
than opening the panel.

**Showing the radar.** A radar button appears on the toolbar, and **Radar
Overlay** in the map's _More actions_ menu. The button shows the radar on the
chart and opens the **radar control panel**; pressing it again closes the panel
and leaves the radar showing. The **Radar Overlay** menu item is ticked while
the radar shows on this screen — choose it then to hide the radar, otherwise to
show it and open the panel. If you use radar often, **Settings → Display →
Action Button → "Radar Overlay"** promotes it to the main floating action
button.

**The picture follows the radar.** Returns are drawn only while the radar
transmits (or is warming up). Put it in standby and the picture goes; transmit
again and it comes back — whether the change was made here, at the MFD, or from
another device. Showing or hiding the radar is a choice per screen, so one
screen can keep a clean chart while the radar keeps running for the others.

![Fig 2. The radar control panel, transmitting](radar-overlay-2.jpg)

**The control panel.**

- **Power** — a lozenge with the radar's name and state, coloured by it: grey
  Off, amber Standby or warming up, green Transmit, red Fault. Its power button
  switches the radar between Standby and Transmit. It never switches the radar
  Off, and it is disabled while the radar is warming up, in fault, or has not
  reported its state.
- **Choosing the radar** — with more than one radar (including the two ranges
  of a dual-range radar), tap the radar's name to pick another; the chart
  follows.
- **Range rings button** — switches the radar range rings (below) on and off.
- **Eye button** — shows or hides the radar on this screen.
- **Range** — the ranges your radar offers, in its range units (nautical or
  metric) and with its own labels.
- **Opacity** — how strongly the returns paint over the chart underneath.
- **Radar controls** — everything else your radar offers, in collapsible
  sections as in the MaYaRa radar app (such as Base, Targets, Trails, Advanced,
  Installation and Info), with Base open. Freeboard doesn't ship a fixed list
  of knobs: it builds these from the control definitions the radar itself
  advertises, so you see exactly what your unit supports. Gain, sea and rain
  clutter, and any other control with an automatic mode, have an **Auto**
  switch — turn it off to set the level with a slider. Modes with a few
  settings are stepped sliders, longer lists are drop-downs, measurements are
  number fields, actions are buttons, and information the radar only reports is
  plain text. A dash marks a value the radar has not reported yet, and controls
  the radar does not currently allow are disabled. Changes are sent to the
  radar immediately, and changes made elsewhere — at the MFD, or from another
  device — appear here live. Guard zones are set here too; see **Radar Guard
  Zones**.

![Fig 3. Range rings at the radar's 1/2 nm range](radar-overlay-3.jpg)

**Range rings.** While the radar transmits, range circles like those on a
radar screen are drawn around the boat: the outermost on the radar's current
range, the others at round distances, each labelled. They follow range changes
made from any device. The spacing is in your distance unit, or in the radar's
own unit when yours can't divide the range into round steps (a metric user on a
½ NM range, say). They take the place of the vessel range circles while the
radar transmits, so there is only ever one set; in standby they disappear, or
return to the usual spacing if **Settings → Vessels → Display Range Circles**
is on. Switch them with the rings button in the panel or with **Settings →
Radar → Draw range circles at the radar range while it transmits** — the same
setting, on by default.

**More than one radar.** Besides the radar name in the panel, the radar can be
chosen in **Settings → Radar → Radar Devices**, with **REFRESH** to re-query
the server for the current list. That list is locked while the radar shows on
the chart. Your choice is remembered for next time; if that radar is no longer
present, the first one found is used.

**Server versions.** Both Radar API 3.4.0 and earlier servers are supported.
Freeboard detects the version when it discovers the radars and talks to the
right endpoint automatically — there is nothing to configure.

If the radar stream fails, Freeboard reports the error and hides the radar.
