# A Local Signal K Development Environment

How to run a Signal K server locally and get a development build of an extension
(plugin or webapp) in front of it. This is general Signal K knowledge, useful when
testing Freeboard-SK or any extension against a real server.

> **Already run a local Signal K server and link dev modules into it?** Skip this
> file.

Read [`extension-model.md`](extension-model.md) first — it explains how the server
discovers packages and serves webapps; this file is just the mechanics of wiring a
dev checkout into a running server.

## Run a Signal K server locally

The canonical instructions live in the
[signalk-server `CONTRIBUTING.md`](https://github.com/SignalK/signalk-server/blob/master/CONTRIBUTING.md).
In short, from a `signalk-server` checkout:

```sh
npm install
npm run build:all
npm start          # server at http://localhost:3000
```

### Sample data (no hardware needed)

Start the server replaying recorded marine data so the data stream, vessel
position, AIS, etc. are populated:

```sh
bin/n2k-from-file     # NMEA 2000 sample data
bin/nmea-from-file    # NMEA 0183 sample data
```

The data is then available via the REST API at
`http://localhost:3000/signalk/v1/api/` and the WebSocket stream.

## Link a dev extension into the server

The server loads extensions from its `node_modules` (see
[`extension-model.md`](extension-model.md)). For local development you symlink your
dev checkout in, so the server loads your working copy.

### A server plugin — `npm link`

```sh
# in your plugin's directory
npm link

# in the server's directory
npm link <your-plugin-package-name>
```

Run the server with debug output scoped to your plugin:

```sh
DEBUG=<your-plugin-package-name> npm start
```

### A webapp (or any extension package) — direct symlink

A webapp needs no lifecycle code; the server serves its built `public/` at
`/<package-name>/`. Link the checkout and build it:

```sh
# from the server's node_modules, point the package name at your checkout
ln -s ../../path/to/<your-webapp> <your-webapp-package-name>

# build so the server can serve it (output must land in public/, with the
# asset base path set to the mount point — see extension-model.md)
cd path/to/<your-webapp> && npm run build
```

(`npm link <your-webapp-package-name>` from the server directory works too; it
routes through the global npm registry instead of a direct filesystem link.)

## Iterating

- **App source change:** rebuild (`npm run build`) and refresh the browser — the
  symlink picks up the new `public/` automatically; no re-link and no server
  restart for asset changes.
- **New linked module, or a change to `package.json` keywords / a plugin
  manifest:** restart the server so it re-scans `node_modules`.
- **A standalone bundler dev server** (e.g. `ng serve` / `vite` with hot reload)
  is great for rapid UI work in isolation, but that instance is **cross-origin**
  and is *not* the in-server webapp — server auth, the data stream, and
  same-origin APIs behave differently than when launched from the Webapps
  launcher. Use it for fast iteration; verify the real behaviour through the
  in-server build.

## Common gotcha: plugins start disabled

A newly installed/linked **plugin defaults to disabled**. The first time you run a
dev plugin and "nothing happens," confirm it's enabled in the server admin UI
(*Server → Plugin Config*). This is the single most common false alarm in plugin
dev. (Webapps don't have an enable step — they appear in the Webapps launcher once
discovered.)
