# The Signal K Extension Model

General background for anyone working on a Signal K server extension — a plugin, a
webapp, or a package that is both. Freeboard-SK itself is a `signalk-webapp`, so
this explains how the server discovers and serves it (and how the plugins it works
alongside are loaded).

> **Already know how Signal K loads plugins and webapps?** Skip this file. It's
> here so contributors new to the Signal K ecosystem don't have to reverse-engineer
> it.

## "Plugin" vs "webapp" vs "extension"

In casual use, **"plugin"** often means *any npm package the Signal K server
recognizes and loads*, whatever it provides. This document uses **extension** as
that umbrella term and reserves **plugin** for the server-side capability
specifically. The capabilities are independent flags; one package may carry any
combination.

## Discovery

The server scans every package in its `node_modules` (installed from npm, or
symlinked for local dev) and reads the **Signal K keywords** in each
`package.json`. The keywords are composable capability flags; what the server does
with a package depends on which it finds:

- **`signalk-node-server-plugin`** — server-side code with a `start`/`stop`
  lifecycle and a config `schema`. The server `require()`s and starts it.
- **`signalk-webapp`** — a standalone UI, served as static files, mounted at
  `/<package-name>/` and shown in the admin Webapps launcher.
- **`signalk-embeddable-webapp`** — a UI other apps can embed.
- **`signalk-category-<name>`** — App Store category placement.

A standalone webapp needs **no** server-side code — no `index.js`, no lifecycle.
A package may be both a plugin and a webapp (Freeboard-SK ships a small helper
plugin alongside its webapp, for example).

## Webapp serving and the asset base-path rule

For a package with a webapp keyword, the server serves `<package>/public/` when
that directory exists, otherwise the package root, mounted at `/<package-name>/`.
A build that emits to `public/` is served as-is.

Because the webapp is served under `/<package-name>/` (not `/`), its **production
build must set that base path** or its asset URLs 404 — the page loads but its
CSS/JS do not. The setting depends on the bundler:

- **Angular** (Freeboard-SK): the build sets the base href to the mount point.
- **Vite:** `base: command === 'build' ? '/<package-name>/' : '/'` (keep `/` for
  the standalone dev server).

Other bundlers have an equivalent public-path setting.

## Service worker / PWA

If the app ships a service worker and is served over a secure context (HTTPS or
`http://localhost`), a rebuild changes the cached assets, so a hard refresh may be
needed to pick them up. Over plain `http` on a LAN address the service worker is
inactive.

## Why this matters across environments

The discovery/serving model is **the same on every Signal K server**. Only *where*
the server and its `node_modules` live differs — a source checkout for local dev
versus an installed server on a device. Getting a dev build of an extension in
front of a running server is covered in
[`local-dev-environment.md`](local-dev-environment.md); packaging it for npm and
the App Store is in [`plugin-publishing.md`](plugin-publishing.md).
