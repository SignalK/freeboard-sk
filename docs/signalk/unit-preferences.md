# Unit Preferences & Value Display

How Freeboard displays numeric values in the units the user wants. **The rule is
simple: render every user-facing value through `AppFacade.formatValueForDisplay()`.**
This document explains what that funnel does and why you should never hand-roll unit
conversion or call `Convert` directly for display.

> **Just need the rule?** Use
> `app.formatValueForDisplay(value, sourceUnit, { path })` for anything shown to the
> user. The rest of this file is the *why*.

## The funnel: `formatValueForDisplay()`

`AppFacade.formatValueForDisplay(value, sourceUnit, options?)` (in
[`src/app/app.facade.ts`](../../src/app/app.facade.ts)) takes a value **in its Signal K
SI base unit** and returns a display string in the user's preferred unit, with symbol.

```ts
formatValueForDisplay(
  value: number,
  sourceUnit: SI_BASE_UNIT,
  options?: {
    path?: string;      // Signal K path this value came from, if any
    category?: string;  // 'depth' | 'length' disambiguation for metre values
    noSymbol?: boolean; // return the number only, no unit symbol
    precision?: number; // decimal places (default 1)
  }
): string
```

**Resolution order:**

1. **Per-path override** — if `options.path` is given *and* the server has published a
   per-path display unit for it (`meta.displayUnits`, cached on the facade), that unit
   wins. This is what lets two paths in the same category display differently (e.g.
   wind speed in m/s while boat speed is in knots).
2. **Category preset** — otherwise the value is converted using the active
   category/source-unit preference (`config.units`, aligned from the server's active
   preset).

**Always pass `path` when the value maps to a Signal K path.** Derived or computed
values that have no path simply omit it and get the category preset — that's why `path`
is optional, and why adding it never breaks an existing caller.

## Do not call `Convert` directly for display

`Convert` ([`src/app/lib/convert.ts`](../../src/app/lib/convert.ts)) is a **pure,
stateless** SI→target math table. It knows nothing about paths, categories, or the
user's preferences. It is the primitive the funnel (and geometry code) build on — use
it for **numeric math and geometry** (bearings, ranges, chart styling), **not** for
formatting a value to show the user. Displaying via `Convert` + a hard-coded target
unit bypasses the user's per-path and category preferences.

## Where the preferences come from (server side)

The user configures units once in **Server Admin → Server → Configuration → Settings →
Unit Preferences** — a preset (e.g. _Nautical (Metric)_) plus optional per-category and
per-path overrides, stored **per user**. Freeboard reads them two ways:

- **Category preset** — `fetchUnitPrefsFromSKServer()` gets
  `/signalk/v1/unitpreferences/active` and `alignUnitPrefs()` maps it into
  `config.units`. Category-level (all speeds, all depths, …).
- **Per-path override** — the server adds a `displayUnits` object to a path's metadata
  (`meta.displayUnits`), delivered over the WebSocket stream with `sendMeta: 'all'` or
  via REST `GET .../<path>/meta`. Its shape (`SKPathDisplayUnits`):

  ```json
  {
    "category": "speed",
    "targetUnit": "kn",
    "formula": "value * 1.94384",
    "inverseFormula": "value / 1.94384",
    "symbol": "kn",
    "displayFormat": "0.0"
  }
  ```

  Cache it via `setPathDisplayUnits(path, displayUnits)`; the funnel reads it via
  `getPathDisplayUnits(path)`. Today the funnel consumes only `targetUnit` and `symbol`
  (converting via `Convert`). The `formula`/`inverseFormula`
  ([Math.js](https://mathjs.org/) strings for units outside `Convert`'s table) and
  `displayFormat` fields are part of the server contract but **not yet consumed** —
  reserved for future use.

Because preferences live on the server, changing one updates every value in Freeboard
that is displayed through the funnel — no per-app settings, no code change.

## Authoritative server docs

- End-user guide: <https://demo.signalk.io/admin/#/documentation/Guides/Unit_Preferences.html>
- Developer guide: <https://demo.signalk.io/admin/#/documentation/Developing/Unit_Preferences.html>
