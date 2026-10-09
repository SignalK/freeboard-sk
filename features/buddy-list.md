---
id: buddy-list
title: Buddy List
category: AIS & Vessels
---

Keep track of boats you know — friends, other boats in your flotilla — by
marking them as **buddies**, then filter the vessel list down to just them
when you want to find one quickly.

This requires the [signalk-buddylist-plugin](https://www.npmjs.com/package/signalk-buddylist-plugin)
installed on your Signal K server. Without it, Freeboard behaves as before —
there's no buddy marking or filtering available.

**To mark a vessel as a buddy**, tap it on the chart to open its popover and
tap the **Is Buddy** button. Tap it again to remove the mark.

**To see just your buddies**, open **Vessels** from the main menu and switch
on the **Buddies Only** toggle in the filter row. The list narrows to the
vessels you've marked. Buddies Only can be combined with the list's other
filters — Ship Type and IMO Only — to narrow things down further.

**When a buddy comes near**, the buddy list plugin sends a notification and
Freeboard shows it as a message at the bottom of the screen, for example
*"Your buddy Mako is near"*. You set how close counts as near in the plugin's
settings. If Freeboard has received a position for that buddy, the message
has a **LOCATE** button: tap it to center the chart on where the buddy is
right now. If the map was following your own vessel, following stops so the
view stays on the buddy. The message clears itself after 10 seconds.
