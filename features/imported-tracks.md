---
id: imported-tracks
title: Imported Tracks
category: Tracks
---

![Fig 1. The Tracks list](imported-tracks-1.jpg)

Bring in a track from a GPX or GeoJSON file, such as a passage a friend
sailed or one recorded on another plotter. Show it on the chart, see when it
was sailed, and turn it into a route you can follow.

## Importing a track

Open the **Resources** menu (the stacked layers button on the left toolbar),
choose **Import**, and pick a GPX file or a GeoJSON file.

- **GPX**: the file's tracks are listed under **Tracks**, beside its
  waypoints and routes. Tick the section's box to select all of them, or
  expand it to pick individual ones, then click **Load Selected**.
- **GeoJSON**: every `MultiLineString` feature is imported as a track. Its
  `name` and `description` properties become the track's name and
  description.

Each track keeps the time of every point: a GPX track point's `<time>`, or a
GeoJSON track's `coordTimes` property. Times are kept only when every point in
the track has one.

An imported track is kept apart from your boat's own recorded track, even when
the file says it was recorded aboard your vessel.

## The Tracks list

Choose **Tracks** in the **Resources** menu to list the stored tracks. When
the server keeps them in the Track API (see below), that includes tracks
imported by other apps, not only by Freeboard.

- Tick a track's **Show on Map** box to draw it, or the box at the top to show
  or hide them all.
- **Type to filter list** narrows the list by name, and **Reload Tracks**
  reads it again.
- **Center Track** moves the chart to the start of the track.
- **Delete Track** removes it from the server, once you confirm.
- **Track Properties** (the pencil) changes its name and description. It is
  offered only for a track kept in Freeboard's own track collection; see
  below.

## When was it sailed?

![Fig 2. A tapped track, with MAKE ROUTE](imported-tracks-2.jpg)

Tap a track on the chart to see its name. A track imported with times also
shows when it was sailed, **From** and **To**, how long it took, and when the
spot you tapped was passed (**Here at**). **MAKE ROUTE** turns that passage
into a route, so a GPX someone shared becomes a route you can follow; see
**Route Planning**.

A track without times says **No recording times available**, and has no
**MAKE ROUTE**.

## Where tracks are kept

On a Signal K server whose Track API can store tracks (server 2.34 or later),
with the Tracks plugin 3.3 or later, Freeboard keeps its tracks in the Track
API. Tracks you imported into earlier versions of Freeboard are moved there
once, when Freeboard connects, and a short message says how many were moved.
A track the Track API won't accept stays where it was and is still listed.

Keeping tracks in the Track API has some trade-offs:

- A stored track can't be edited, because the Track API doesn't change a
  stored track. **Track Properties** isn't offered for it.
- Deleting one needs admin rights when security is turned on.
- A device still running an older version of Freeboard, such as a tablet
  whose browser cached the previous build, shows an empty Tracks list until
  it loads the new version.

On older servers nothing changes: Freeboard keeps its tracks in its own
`tracks` resource collection, which it sets up through the Resources Provider
plugin.

To save a track to a GPX file, see **Export to GPX**. For your own boat's
recorded track and other vessels' tracks, see **Vessel Tracks** and **Track
History & Playback**.
