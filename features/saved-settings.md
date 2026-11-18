---
id: saved-settings
title: Saved Settings
category: Configuration
---

Freeboard remembers your settings — the charts you show, your units, your display
choices — so it opens the way you left it.

**Where they are kept.** Settings are saved in this browser as you change them.
When you are signed in to the Signal K server, they are also saved with your user
on the server, and that copy wins: sign in on another device and Freeboard opens
with the same settings. Signed out, each browser keeps its own.

**A first visit.** On a device with no saved settings, and when you are signed in
none saved with your user either, Freeboard starts from the defaults the server's
admin has set, or from its built-in defaults when there are none. The README's
*Default Settings* section explains how an admin sets them up.

**Reset to server defaults.** The button beside the close button at the top of the
Settings screen discards your settings and restarts Freeboard with the server's
defaults, as on a first visit. When you are signed in, it clears the settings saved
with your user too, so it applies on every device you sign in on. Use it to pick up
defaults the admin has changed, or to get back to a known state after experimenting.
Your vessel trail is kept, and so is this screen's widget layout, which each screen
keeps for itself: choose **New blank** under Layouts to clear it. If the server
won't clear the settings saved with your user, nothing is reset and Freeboard says so.

**Demo mode.** On a server where many people share one login, such as a public demo,
the admin can turn on demo mode in the server's defaults. Everyone then keeps their
settings in their own browser: signing in no longer loads the shared user's settings,
nothing is saved back to it, and a reset clears only this browser. There is no
setting for this in Freeboard; the README's *Default Settings* section explains it.
