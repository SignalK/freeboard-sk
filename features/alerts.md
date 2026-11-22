---
id: alerts
title: Alerts & Alarms
category: Alarms & Notifications
---

Freeboard shows every alert your Signal K server raises, from a routine
warning on the NMEA 2000 bus to a person overboard. How much of the chart an
alert takes up depends on how urgent it is, so the chart stays clear for
routine messages and the alarms that matter are hard to miss.

![Fig 1. Four alarms as one-line rows beside the Alarms button](alerts-1.jpg)

## How alerts appear

- **A full card** for anything you must act on at once: any emergency, the
  standard Signal K alarms (person overboard, fire, sinking, flooding,
  collision, grounding and the like), and a collision (closest approach),
  dragging anchor or shallow-water alert at alarm level.
- **A one-line row** at the top left of the chart for any other alarm, such
  as engine over temperature, low battery or bilge high water, and for
  arriving at a route point. Four rows show at once; scroll for the rest.
- **The Alarms button only** for warnings and lower-priority alerts. They do
  not appear on the chart, even when the server sends them as visual only.

Cards and rows are translucent, so the chart shows through them. A card or row
closes when you acknowledge it. A Person Overboard card stays until the MOB is
ended.

## The Alarms button

The red **Alarms** button at the top of the left toolbar shows how many alerts
are active, and pulses while any of them is unacknowledged. With reduced
motion turned on in your operating system, it shows a red outline instead.
Press it to open the Alarms list, which shows every alert, whatever its
priority, and lets you raise a Person Overboard alarm.

## Mute, acknowledge and dismiss

- **Mute** stops the sound and leaves the alert showing.
- **Acknowledge** closes the card or row and stops the sound. The alert stays
  in the Alarms list. Acknowledging needs a logged-in user.
- An alert that can't be acknowledged shows a countdown bar and closes by
  itself, or you can dismiss it sooner with **×**.

A route-arrival row also carries **Next point** or **End route**, as described
in *Route Following*.

## Being woken by an alarm

A popup wakes nobody. If an alarm needs to wake you, send it to a siren or
buzzer from the Signal K server, for example with Node-RED or Alert Center,
especially when no speaker is near the display.
