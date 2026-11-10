---
id: vessel-list
title: Vessel List & Filters
category: AIS & Vessels
---

The **Vessels** list (main menu → **Vessels**) shows every vessel your Signal K
server is reporting — AIS targets and any other vessels it knows about — and lets
you choose which of them are drawn on the chart.

**Finding a vessel.** Type in **Type to filter list** to narrow the list to vessels
whose name contains what you type; the **×** clears it. This only narrows the list —
it doesn't change what the chart shows. **Reload Vessels** (⟳) refreshes the list.

**Each vessel** is listed with its icon, colored by its type, and its name. Tap the
name, or the ⓘ button, to open its properties. Beneath it:

- **FOCUS** makes it the active vessel: Freeboard sends its actions to that vessel's
  data on the server instead of your own. Whether that works depends on your server
  accepting changes for vessels other than your own. **UNFOCUS** goes back to your
  own vessel.
- **CENTER** moves the chart to the vessel. It's unavailable while the chart is
  following your own boat (see *Center & Follow Vessel*).
- **TRACK** and **HISTORY** show the vessel's recent track and its recorded track
  history (see *Vessel Tracks* and *Track History & Playback*).

## Choosing which vessels the chart shows

Every vessel is shown on the chart until you narrow it down:

- **The checkbox beside a vessel** shows or hides it on the chart. The checkbox at
  the top selects or clears them all at once.
- **Ship Type** (in the Filter row) swaps the list for the AIS ship-type groups —
  cargo, tanker, passenger, pleasure and so on, with their type numbers — each with
  its own checkbox, so you can show only the kinds of vessel you want. While it's
  on, the name filter and the per-vessel checkboxes are set aside.
- **IMO Only** shows only vessels with an IMO number: in practice, ships rather than
  yachts and small craft.
- **Buddies Only** shows only the vessels you've marked as buddies (see *Buddy
  List*).

The filters combine: IMO Only together with Ship Type shows only the ticked types
that also have an IMO number.

**When a filter hides vessels**, a line above the list says so — for example
*Chart shows 7 of 61 vessels*, with a filter icon. It stays while any of the
choices above keeps a vessel off the chart, and goes once every vessel is shown
again. If AIS targets seem to have vanished from the chart, look here first: an
**IMO Only** left on in an anchorage full of yachts empties the chart while the
list still names every boat.

If the Vessels layer itself is hidden, nothing in this list is drawn until you show
the layer again.
