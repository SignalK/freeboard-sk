---
id: person-overboard
title: Person Overboard
category: Alarms & Notifications
---

If someone goes over the side, one press marks where it happened, sounds the
alarm on every Freeboard aboard, and keeps the person's bearing and distance on
screen until the recovery is over.

## Raising the alarm

**The red Person Overboard button** sits at the bottom of the left toolbar, set
apart from the Alarms button. It never moves into the **…** menu, however small
the screen. Press it once: Freeboard raises a MOB alarm on your Signal K server,
which records the boat's position and the time. The display you pressed it on
zooms in on the boat; every other Freeboard aboard sounds the alarm but keeps its
view, so whoever is navigating isn't thrown off their chart.

You can also raise it from the Alert List (**Raise → Overboard!**), or with the
action button when it's set to **Person Overboard** (see *Action Button*).

**When the server can't take it** — nobody is signed in on this display, the
connection is down, or the server doesn't answer within a few seconds — Freeboard
keeps the MOB on this display anyway, at the boat's position when the button was
pressed. Its card says *Only on this display: the server did not take this MOB,
so the other displays do not have it.* It survives a reload of the page until you
end it. If the server takes it late after all, you may see two MOB cards; end the
extra one.

## The MOB card

A MOB card stays at the top of the screen until someone ends the MOB. It shows
how long the person has been in the water (*1:04 in water*), and their bearing
and distance from the boat, updated every second. The bearing is magnetic (M) or
true (T), the same as your course data. **ACK** silences the alarm but leaves the
card up, and the card has no Dismiss.

- **ZOOM** fits the boat and the MOB on the chart.
- **DIRECT-TO** makes the MOB position your destination, with a 10 m arrival
  circle so the arrival alarm doesn't sound long before you reach the person. If
  the autopilot is engaged, Freeboard first warns that the boat will turn towards
  the MOB, with **TURN TO MOB** or **CANCEL**. Nothing changes your course unless
  someone presses it. While you're heading for the MOB, the button reads
  **NAVIGATING**.
- **END MOB** asks *Is the person back on board, or was this a false alarm?*, then
  ends the alarm. The destination stays set until you clear it.

If the MOB has no position, a note replaces ZOOM and DIRECT-TO.

The card appears for any MOB the server knows about: one raised on another
display or by another app, or by a plugin reading an AIS MOB beacon. The MOB is
also marked on the chart.
