---
id: extension-map-layers
title: Extension Map Layers
category: Extensions
---

A Signal K server plugin can draw its own layer on the chart, such as depth shading
built from your own soundings, depth contours or a weather picture, without waiting for
a Freeboard update to support it. Freeboard places the layer on the map and keeps it
lined up with the chart as you pan, zoom and rotate.

## Showing and hiding a layer

Plugin layers are listed in the **Chart List** (resources menu, then **Charts**), under
the heading **Plugin layers** at the top of the list, above your charts. Each row shows
the layer's name, with the plugin that provides it beneath.

- **Show in Map**: the checkbox on the right shows or hides the layer. The plugin
  decides whether its layer starts out shown; after that, your choice wins.
- **Set Opacity** (the droplet): fade the layer so the chart beneath shows through. The
  map previews the change as you move the slider; **APPLY** keeps it, and closing the
  dialog without applying puts it back. Only available while the layer is shown.
- **Layer settings** (the *tune* icon): opens the plugin's own settings for that layer,
  such as which depth source to use, a color range or a contour interval. Only shown
  when the plugin offers settings. The dialog has no Remove button, because a layer is
  hidden with its checkbox rather than removed.

Your show/hide and opacity choices are remembered between sessions, like a chart's.

Typing in the list's filter box matches a layer's name or its plugin's name. **In view**
and the select-all checkbox apply to charts only.

## Where plugin layers draw

Every plugin layer draws above every chart, so plugin layers can't be dragged into the
chart stack. Some also draw above your tracks and the radar picture. None ever covers
your own vessel, AIS targets or alarms.

A plugin can limit its layer to a range of zoom levels (detailed soundings only when
zoomed in, say), so a layer that's switched on may disappear as you zoom out.

## Too many layers

Freeboard draws at most four plugin layers at once, to keep the map responsive on
tablets and small computers. If more are shown, the extra layers nearest the top of the
list are paused, and their rows say *Paused — too many plugin layers*. Hide another
layer and a paused one draws again.

## Two kinds of layer

A plugin draws its layer in one of two ways, and you may notice the difference:

- **Picture layers**: the plugin paints the layer itself and hands Freeboard a picture
  of the view. Freeboard asks for a new picture when you zoom, turn the chart, or move
  well away from where it was drawn, so the layer can look soft for a moment after a
  zoom until the new picture arrives. Layers that need fine detail, such as contour
  lines, can ask to be drawn sharper.
- **Data layers**: the plugin supplies the data and how it should look, and Freeboard
  draws it along with the rest of the map. These move smoothly as you pan and zoom, and
  their labels use Freeboard's own font. If a plugin asks for a style Freeboard can't
  draw exactly, Freeboard leaves that part out rather than drawing it wrongly.

## Selecting a plugin's markers

A data layer's markers, such as weather buoys, can be selectable, like Freeboard's own
features:

- **Click or tap** a marker, and the plugin's main command for it runs, or a small
  popover opens, titled with the marker's name, with the plugin's commands as buttons.
- **Right-click** it, or press and hold, and its commands appear in the chart menu,
  above **This position**.
- Where a marker overlaps Freeboard's own features, a click opens the usual
  **Features** list, with the marker in it.
- A marker the plugin offers no commands on stays out of the way: a click goes to
  whatever is beneath it.

A marker only ever offers the commands of the plugin that drew it. See *Extension Menu
Commands & Chart Picks*.

If you haven't installed a plugin that provides a map layer, the **Plugin layers**
heading doesn't appear, and the Chart List looks and works exactly as it always has.
