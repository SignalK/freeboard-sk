---
id: route-planning
title: Route Planning
category: Routes
---

![Fig 1. Tapping a route brings up its actions — Modify, Start, Points, Notes, Info, Delete](route-planning-1.jpg)

Draw a route on the chart, or make one from a passage you've already sailed,
review and adjust it, then save it for later — or skip saving and just use it
right away.

**To draw a route**, open the edit menu (pencil icon) and choose **Draw
Route**. Tap each point along your intended route. A small editing card
shows the running distance and a **Finish** button — tap **Finish** (or
press Enter) when the route is complete, or **Cancel** to discard it.
Placed a point in the wrong spot? **Undo** (the card's Undo button, or
Ctrl-Z / ⌘-Z) removes the last point, again and again back to the first.
Your new route appears on the chart in amber to show it hasn't been saved
yet.

**Unsaved and saved routes work the same way.** Tap any route on the
chart — freshly drawn or previously saved — to bring up its actions:
**Modify** to reshape it, **Points** to reorder its point list,
**Reverse** to turn it round, **Hide** to take it off the chart, **Delete**
to remove it, and more. An unsaved
route also offers **Save** and **Start** right there: Save turns a quick
sketch into a permanent route in one tap, and Start begins following it
straight away, without saving — see *Following a Route*. Saving keeps the
route right where it is on the chart — it won't disappear on you.

![Fig 2. The editing card while modifying a route — running distance, the active leg, and Undo / Save / Cancel in one place](route-planning-2.jpg)

**Modifying a route** uses the same editing card as drawing, showing the
running distance and the leg you're working on. Drag a point to move it,
drag a leg to add a point, or remove a point with Ctrl-Click or a
press-and-hold. Both delete gestures work the same with a mouse, a
touchscreen or a pen; a press that turns into a drag moves the point instead
of deleting it. To **extend the route**, click open water past its end: the
route grows by a new end point, the same way you drew it, without leaving
Modify.
**Undo** steps back through your edits one at a time. The card's commit
action saves your changes — labeled **Save** for a route that isn't stored
yet, **Finish** for one that is — and **Cancel** (or the ✕) discards them,
with no separate "save changes?" prompt to answer.

**Reordering points** works on any route, saved or not. Open **Points**
from the route's actions to drag its waypoints into a new order; on an
unsaved draft the new order is held with the rest of your draft until you
Save.

**Reversing a route** turns it round: its start and end swap on the chart,
and its points are listed the other way round, names and all. Press
**Reverse** in the route's popover, or in its info panel. What it changes
depends on the route:

- **An unsaved route** is turned round along with the rest of your draft —
  draw it one way, sail it the other. Press **Start** straight after, and
  Freeboard follows it from the new start. A saved route with unsaved edits
  is turned round with those edits.
- **A saved route** is turned round and saved at once, the same as a
  Modify, so every device sees it the new way round.
- **The route you're following** has only its course reversed; the saved
  route stays as it is. See *Following a Route*.

A route from a read-only source can only be reversed while you're following
it.

**Hiding a route** takes it off the chart without deleting it — the same as
unchecking **Show on Map** in the Routes list, but reachable straight from
the route on the chart. The route stays in your Routes list, ready to show
again, and the list's checkbox stays in step. (A route that is currently
active can't be hidden.)

![Fig 3. Make Route in the popover of a tapped track](route-planning-3.jpg)

**Making a route from a recorded track.** A passage you've already made
safely is a good route to follow again, and so is one you've watched another
boat make: a ferry's crossing, or a local boat through a reef pass. Tap the
track on the chart, whether it's your own trail, another vessel's track, or a
Track history line. Its popover shows when that stretch was recorded and, when
Freeboard can pick out the passage, offers **Make Route**.

**Make Route** turns the passage you tapped into an unsaved route named
*Track of* followed by the vessel's name. It opens in the route's info panel,
or in its popover when the info panel is turned off, ready to **Start**,
**Save** or **Reverse** like any route you've drawn.

![Fig 4. The route made from a passage between two anchorages, ready to Start or Save](route-planning-4.jpg)

Which passage you get:

- **It runs from stop to stop.** A stop is where the vessel stayed within
  200 m for an hour (your own boat: an anchorage or a berth), or for 15
  minutes (another vessel, so a ferry's crossing ends at its terminal). Each
  end of the route is the middle of the stop. Tap a stop itself to get the
  passage leaving it.
- **A slow drift counts as stopped.** A boat creeping along too slowly to be
  under way (becalmed, or drifting) is treated as one stop, not a passage.
- **Short stops are smoothed out.** A stop of 10 minutes or more within the
  passage becomes a single point, so the route doesn't zigzag around a swing
  circle. The route then follows the track to within 10 m, with only the
  points that needs.
- **A gap in the recording ends it.** If the recording stopped and the vessel
  moved before it resumed, nobody knows what it did in between, so the
  passage ends at the gap. With no stop or gap on one side, it runs to the
  end of the track.
- **It runs the way it was recorded.** To go the other way, press
  **Reverse**.

For Track history and other vessels' tracks, Freeboard first fetches that
vessel's whole track from your server, so **Make Route** can take a moment to
appear. A route made from another vessel's track is only as safe as that
vessel's draft — a local boat may draw much less than you do.

To turn your whole trail into one route instead, use **Trail to Route** in
the chart's context menu (see *Vessel Tracks*).

The route's info panel offers the same actions — **Save**, **Edit**,
**Delete** — plus the point list, distance, and a description you can write
for the route. A route that hasn't been saved yet is labeled **(unsaved)**
so you always know its status at a glance.

If you have an extension plugin installed that helps you plan routes — an
auto-router that fits a route around land, for instance — it can work with
your route while it's still a draft, before you decide to save it.
