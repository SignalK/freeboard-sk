# Signal K Unit Preferences

General background for anyone building a UI that **displays numeric values coming
from Signal K**. Signal K Server has a **Unit Preferences** system that centralises
the user's preferred display units on the server. A unit-preferences–aware client
reads those preferences from path metadata and renders values accordingly, so it does
**not** need to maintain its own unit settings or hard-code conversions.

> **Already know the Unit Preferences `displayUnits` contract?** Skip this file. It's
> here so contributors don't reinvent unit handling or reverse-engineer the metadata.

## Why this matters for Freeboard

Freeboard has historically converted units client-side via
[`src/app/lib/convert.ts`](../../src/app/lib/convert.ts) (the `Convert` class) with a
fixed table of SI-base → target formulas. That still works, but it is **independent of
the user's server-side unit preferences** — the same user can set "knots" once in the
Server Admin UI and have every compatible app honor it.

**When you add or change UI that displays a value to the user, prefer the server's
`displayUnits` metadata over a hard-coded conversion.** The value then follows the
user's chosen units automatically, and updates if they change their preference — with
no app-side settings and no code change.

## How it works

The user configures preferences once in **Server Admin → Server → Configuration →
Settings → Unit Preferences**: either a **preset** (e.g. _Nautical (Metric)_,
_Imperial (US)_) or per-category / per-path overrides. Preferences are stored
**per user**; anonymous clients get the server's global default preset.

Preferences are expressed by **category**, not per path. Every numeric path is assigned
a category (`speed`, `distance`, `depth`, `temperature`, `angle`, `pressure`,
`volume`, `electrical.*`, `percentage`, …), each with a known SI **base unit**
(`speed` → `m/s`, `depth` → `m`, `temperature` → `K`, `angle` → `rad`, …). The active
preset maps each category to a **target unit**. Setting `speed` to knots therefore
applies to boat speed, wind speed, and every other `speed` path at once.

## The developer contract: `displayUnits` in `meta`

When a path has an applicable preference, the server adds a **`displayUnits`** object to
that path's metadata:

```json
{
  "units": "m/s",
  "description": "Speed over ground",
  "displayName": "SOG",
  "displayUnits": {
    "category": "speed",
    "targetUnit": "kn",
    "formula": "value * 1.94384",
    "inverseFormula": "value / 1.94384",
    "symbol": "kn",
    "displayFormat": "0.0"
  }
}
```

`displayUnits` gives you everything needed to render the value:

| Field            | Use                                                                       |
| ---------------- | ------------------------------------------------------------------------- |
| `category`       | The unit category the path belongs to (`speed`, `depth`, …).              |
| `targetUnit`     | The unit the user wants to see (`kn`).                                    |
| `formula`        | A [Math.js](https://mathjs.org/) expression, SI → target. `value` is the raw value. |
| `inverseFormula` | Math.js expression, target → SI. Use it when converting **user input** back to SI. |
| `symbol`         | Symbol to show next to the value (`kn`).                                  |
| `displayFormat`  | Optional format pattern for consistency (e.g. `"0.0"` = one decimal).     |

`formula` / `inverseFormula` are **Math.js expression strings**, not numbers — evaluate
them with a Math.js–compatible evaluator (`value` bound to the raw SI value). Do not
`eval()` them. If `displayUnits` is **absent**, the user has no preference for that path;
fall back to the base `units` (and, in Freeboard, the existing `Convert` behavior).

## Getting the metadata

Two ways to obtain `displayUnits`:

**WebSocket (recommended)** — add `sendMeta: 'all'` to a subscription. Meta is sent once
with the first delta for each path, and again only if it changes, so no separate fetch is
needed:

```javascript
ws.send(
  JSON.stringify({
    context: 'vessels.self',
    subscribe: [
      { path: 'navigation.speedOverGround', policy: 'instant', sendMeta: 'all' }
    ]
  })
)
```

The delta then carries a `meta` object (with `displayUnits`) alongside the `value`.

**REST** — fetch the path's metadata directly:

```
GET /signalk/v1/api/vessels/self/navigation/speedOverGround/meta
```

## Consuming it

1. **Get value + metadata** — subscribe with `sendMeta: 'all'` (preferred), or poll REST
   and fetch `.../meta` separately.
2. **Check for `displayUnits`** — present ⇒ the user has a preference for this path.
3. **Convert** — evaluate `formula` with the raw SI value bound to `value`.
4. **Display** — show the result with `symbol`, formatted per `displayFormat`.

Because the preference lives on the server, changing it (e.g. knots → km/h) updates every
aware client with no code change.

## REST endpoints (reference)

The system also exposes configuration endpoints under `/signalk/v1/unitpreferences/` —
`config`, `categories`, `definitions`, `presets`, `presets/:name`, `active`,
`default-categories`, and the custom-definition/category/preset variants. Most UIs only
need the `displayUnits` metadata above; these endpoints are for inspecting or managing
the preference configuration itself.

## Authoritative docs

- End-user guide: <https://demo.signalk.io/admin/#/documentation/Guides/Unit_Preferences.html>
- Developer guide: <https://demo.signalk.io/admin/#/documentation/Developing/Unit_Preferences.html>
