---
id: radar-guard-zones
title: Radar Guard Zones
category: Radar
---

![Fig 1. Editing a guard zone: handles on the chart, its bearings and distances in the panel](radar-guard-zones-1.jpg)

A radar's guard zones are the areas around the boat it watches for targets —
ARPA acquires targets inside them. Freeboard shows them on the chart and lets
you draw and edit them there, so you can see and set where the radar is
watching without switching to the MaYaRa radar app. Requires the
**Radar Overlay**.

**On the chart.** While the radar shows on the chart, the guard zones of the
selected radar are drawn around the boat and turn with its heading. An armed
zone is filled; a zone that is switched off is a dashed outline. Zone 1 is
green and zone 2 blue, the same colours as in the MaYaRa radar app. A zone
whose start and end bearings are the same is a full ring around the boat.

![Fig 2. An armed guard zone, with each zone's controls in the panel](radar-guard-zones-2.jpg)

**In the radar panel**, each guard zone has:

- **On** — arms or disarms the zone.
- **Draw** — turns the chart into a drawing surface, with a crosshair cursor:
  drag from one corner of the zone to the opposite corner, and the zone appears
  around the boat, armed.
- **Edit** — puts four handles on the zone, for its two bearings and its inner
  and outer distance, big enough to drag with a finger.
- **Clear** — removes the zone.

**Draw** and **Edit** need the radar showing on the chart. While drawing or
editing, the panel also shows the zone's **From** and **To** bearings, in
degrees from the bow, and its **Inner** and **Outer** distances, in your
distance unit; you can type them instead of dragging. **Save** sends the zone
to the radar; **Cancel** drops the change, as does closing the panel or hiding
the radar. A zone is at least 50 m deep and is kept within the radar's reach.

**The radar holds the zones.** Freeboard keeps no copy of its own: a zone
saved here appears in every other Freeboard and in the MaYaRa radar app, and a
zone changed there appears here as soon as the radar reports it. Until the
radar confirms a zone you saved, the chart keeps showing your version, so it
doesn't jump back to the old one.
