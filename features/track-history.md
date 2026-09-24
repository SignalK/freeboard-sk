---
id: track-history
title: Track History & Playback
category: Tracks
---

![Fig 1. Track history for your own vessel and an AIS vessel, played back with ghost boats](track-history-1.jpg)

See everywhere a vessel has been, not just its last few hours: your own
boat's past passages, or where another boat has been over the last month.
Then play it back to watch the boats move along their tracks together.

Track history needs a Signal K server with the Track API (server 2.33 or
later with a track provider, such as the Tracks plugin). Without one, the
history button doesn't appear.

## Showing a vessel's history

![Fig 2. The history button in a vessel's popover](track-history-2.jpg)

Tap a vessel on the chart, your own or an AIS vessel, and use the **history**
button in its popover. In the AIS vessel list the same button is labelled
**HISTORY**. The vessel's whole recorded track is drawn as a solid, muted
line behind its usual trail, and the **Track history** window opens.

The button is greyed out for a vessel with nothing recorded. How far back a
track goes depends on your server: the Tracks plugin keeps your own track
indefinitely and other vessels' tracks for 30 days.

The history follows the chart. Pan somewhere else and the passages there are
drawn; zoom in and they are redrawn in more detail.

## The Track history window

![Fig 3. The Track history window](track-history-3.jpg)

- **Vessels** lists every vessel whose history is shown. Remove one with its
  ×, or close the window to hide them all. Add more from their popovers.
- **Range** chooses how far back to look: **7 days**, **30 days** or **All**,
  or drag the two handles under the bar to pick any stretch of time. The same
  range applies to every vessel shown.

The window can be dragged anywhere on the screen, and it reopens where you
left it. History is shown for the current session only.

## Playback

The **Playback** box replays the history. Drag the round playhead on the bar
back in time, or step through with **‹** and **›**. **▶** plays through the
selected range at the chosen **Speed** and starts again from the beginning
when it reaches the end.

At any time other than now, each vessel shown is drawn as a faded "ghost"
where it was at that moment, pointed along its course, so you can see where
two boats were relative to each other. A vessel with nothing recorded at that
time has no ghost. **NOW** puts the ghosts away and returns to the present.

## When was it there?

Tap a history line to see when that stretch was recorded, **From** and
**To**, how long it lasted, and when the vessel was at the spot you tapped
(**Here at**). The same works on your own trail and on other vessels' tracks;
see **Vessel Tracks**.
