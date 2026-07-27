---
id: follow-vessel
title: Center & Follow Vessel
category: Map
---

![Fig 1. Following with an Ahead offset — the boat sits low on screen and the chart in front of it gets the room](follow-vessel-1.jpg)

Keep your boat on screen without touching the chart. Follow Vessel mode centers the
vessel and holds it there as you move, so the chart scrolls under you instead of you
chasing it.

## The button

**Center & Follow Vessel**, on the left-hand toolbar, does both jobs. A press centers the
vessel and turns follow mode on, easing out to your offset a couple of seconds later. The
button stays highlighted while follow mode is on. Press it again to turn follow mode off —
the chart stays exactly where it is, so whatever you'd panned across to study stays in
view. The button is disabled until your boat's position is known.

Just want to center the boat once, without following it? Press again before it eases off
center, and the boat stays where it is.

## Offset Vessel Center

![Fig 2. Offset Vessel Center and Map Pan When Following, in Settings → Map](follow-vessel-2.jpg)

Sitting dead center spends half your screen on water you have already covered.
**Settings → Map → Offset Vessel Center (%)** moves the boat off center so the chart that
matters gets the room. Two values, each a whole percentage up to ±90 of the distance from
the middle of the screen to its edge:

- **Ahead** — moves the vessel back so there is more chart in front of it. `50` puts the
  boat halfway between the center and the trailing edge. A negative value looks behind the
  boat instead.
- **Abeam** — moves the vessel to one side. A positive value shows more to starboard, a
  negative value more to port.

Both are measured against your **course** rather than the screen, so the offset turns with
the boat. That is what keeps it honest in north-up: an offset fixed to the screen would
show a vessel heading south the water it had already passed.

Large values on both axes together would put the boat diagonally outside the corner of the
screen, so Freeboard scales the pair back as a unit when that would happen — the vessel
stays visible, and the offset you are shown is the offset that gets stored. A value on one
axis alone is never affected.

## Setting the offset by panning

You don't have to work the numbers out at all. With **Map Pan When Following** set to
**Set Follow Offset**, simply pan the chart until the boat sits where you want it.
Freeboard works out the Ahead and Abeam values from where you dropped it and saves them,
staying in follow mode the whole time — so the boat holds that spot from then on. For most
people this is the only way they will ever set the offset.

## Map Pan When Following

**Settings → Map → Map Pan When Following** decides what panning the chart does while
follow mode is on:

- **Set Follow Offset** — follow mode stays on and your pan sets the offset, as above.
- **Exit Follow Mode** — panning turns follow mode off and leaves the chart where you put
  it.
- **Do nothing** — follow mode stays on and the vessel returns to its usual position on
  the next position update. Worth choosing at the helm, where a stray touch shouldn't
  disturb the view.
