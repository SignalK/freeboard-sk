---
id: custom-map-symbols
title: Custom Map Symbols
category: Charts
---

![Fig 1. A custom route start marker and a custom anchorage icon shown on the chart](custom-map-symbols-1.jpg)

Freeboard normally marks notes, waypoints, your boat, AIS traffic, aids to
navigation, and route points with its own built-in icons. If you'd rather use
your own artwork — a personal marker for a favorite dive site, a custom boat
icon for your own vessel, a branded buoy — you can, once you install a
**symbol provider** app on your Signal K server. Freeboard picks up whatever
icons the provider offers and uses them automatically — there's nothing to
turn on.

The reference app for this is
[signalk-symbol-manager](https://www.npmjs.com/package/signalk-symbol-manager),
which gives you a simple web page for uploading and organizing your own icons.
Any similar app that publishes icons the standard way works too.

## Two ways to use a custom icon

**Replace one of Freeboard's built-in icons.** Give your icon the same name
as the built-in you want to replace (for example `dive-site`) and mark it as
belonging to Freeboard's icon set. Your version then shows up everywhere that
icon is normally used — on the chart and in the icon pickers — without you
having to touch any existing notes or waypoints. See the reference list below
for which built-in names you can replace.

**Add a brand-new icon.** Give your icon a new name of your choosing and it
shows up as an extra option in the icon pickers, alongside the built-ins.

When you've replaced a built-in, the picker shows only your version — not
both — so the list doesn't get cluttered. Flip the **"Show all symbols"**
toggle in a note or waypoint's icon picker to see everything at once,
built-ins included, in case you ever want to go back to the original. If you
deliberately pick the original built-in this way, Freeboard remembers your
choice and won't swap your custom icon back in later.

## Where custom icons show up

Custom icons work for:

- Notes
- Waypoints
- Your own vessel
- AIS vessels
- Aids to navigation
- Route start / turn / end points

They don't apply to special waypoint markers (start pin, start boat,
sightings, alarms), shaded chart areas, or the dots used for moored vessels
— those always keep their built-in look.

Icons that normally rotate to a heading or bearing — your vessel, AIS
targets, aids to navigation, route turn points — keep rotating correctly even
when you've replaced them with your own artwork.

## Built-in icon names you can replace

To replace one of these, give your icon the matching name below.

**Note and waypoint markers:**

```
anchorage   boatramp   bridge      business    dam
dive-site   ferry      hazard      inlet       lock
marina      dock       turning-basin           radio-call-point
transhipment-dock      notice-to-mariners      diver-down
navigation-structure   fuel        tunnel      waterway-guage
```

**Generic waypoint marker:** `waypoint`

**Your own vessel:** `vessel-self`

**AIS vessels** (by type):

```
ais_active   ais_highspeed   ais_special   ais_passenger   ais_cargo
ais_tanker   ais_other       ais_inactive  ais_buddy       ais_self
```

(`ais_self` is whichever AIS target you currently have selected — not your
own boat, which is `vessel-self`.)

**Aids to navigation** — each comes in a physical (`real-…`) and an AIS-only
(`virtual-…`) version:

```
real-north / virtual-north            real-east / virtual-east
real-south / virtual-south            real-west / virtual-west
real-port / virtual-port              real-starboard / virtual-starboard
real-danger / virtual-danger          real-safe / virtual-safe
real-special / virtual-special        real-basestation / virtual-basestation
real-weatherStation / virtual-weatherStation
real-aton / virtual-aton
```

**Route points:** `route-start`, `route-waypoint`, `route-end`

Your own vessel, AIS, aids-to-navigation, and route icons apply everywhere at
once — Freeboard picks these automatically rather than letting you choose
them per marker, so one custom icon covers every marker of that kind.

## Keeping icons through GPX import and export

If your icon declares a matching GPX symbol name, Freeboard will recognize it
when you import a GPX file — a waypoint tagged with that symbol picks up your
custom icon instead of the default marker. Exporting a waypoint that uses a
custom icon writes the same information back into the GPX file, so the icon
survives a round trip: export, re-import elsewhere, and your custom icon is
still there.

## Without a symbol provider

If you haven't installed a symbol provider — or it isn't publishing any
icons — Freeboard looks and behaves exactly as it always has: built-in icons
everywhere, and "Show all symbols" just shows the built-ins.
