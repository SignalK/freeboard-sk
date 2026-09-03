---
id: follow-vessel
title: Center & Follow Vessel
category: Map
---

![Fig 1. Following with a positive Vertical offset — the boat sits low on screen and the chart in front of it gets the room](follow-vessel-1.jpg)

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

- **Vertical** — moves the vessel up or down the screen. A positive value looks ahead,
  putting more chart in front of the boat; `50` puts the boat halfway between the center
  and the bottom edge. A negative value looks behind instead.
- **Horizontal** — moves the vessel left or right. A positive value shifts the map to the
  right, putting the boat toward the left of the screen with more chart visible to the
  right; a negative value does the opposite.

Both are measured against the **screen**, not your course — the offset holds the exact spot
you set it to whether you're underway, drifting, or sitting still, instead of swinging
around as your heading jitters at low speed or with no course at all. In heading-up mode
this comes to the same thing as ahead/abeam, since "up the screen" already tracks your
course; the difference only shows in north-up. Zooming keeps the boat on that same spot
too, scaling the chart around it rather than nudging the boat back toward center.

## Setting the offset by panning

You don't have to work the numbers out at all. With **Map Pan When Following** set to
**Set Follow Offset**, simply pan the chart until the boat sits where you want it.
Freeboard works out the Vertical and Horizontal values from where you dropped it and saves
them, staying in follow mode the whole time — so the boat holds that spot from then on. For
most people this is the only way they will ever set the offset.

Pan the boat clean off the screen and Freeboard takes it as "stop following" instead —
follow mode turns off and the chart stays exactly where you left it, rather than snapping
the boat back into view.

## Map Pan When Following

**Settings → Map → Map Pan When Following** decides what panning the chart does while
follow mode is on:

- **Set Follow Offset** — follow mode stays on and your pan sets the offset, as above.
- **Exit Follow Mode** — panning turns follow mode off and leaves the chart where you put
  it.
- **Do nothing** — follow mode stays on and the vessel returns to its usual position on
  the next position update. Worth choosing at the helm, where a stray touch shouldn't
  disturb the view.

### Getting follow mode back on its own

Choosing **Exit Follow Mode** reveals a companion setting, **Resume Following After**.
Leave it at **Never** and nothing changes — follow mode stays off until you press the
button. Pick a delay instead and the chart hands itself back: pan across to look at what
is ahead, and once you have left it alone that long the boat returns to the screen on its
own.

The wait measures idle time, not time since the pan. Every pan and every zoom starts it
over, so you can take as long as you like looking around and the chart only comes back
once you have actually stopped. Turning follow mode off with the button is left alone —
that stays off, so you can still park the chart somewhere deliberately.

Worth setting when the display is out of easy reach, or when whoever is watching it would
rather not hunt for the Follow button: a quick pan to check the water ahead, then back to
the boat without touching anything.
