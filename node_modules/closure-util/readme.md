# Closure Util

Utilities for working with Closure Library projects.

[![Current Status](https://secure.travis-ci.org/openlayers/closure-util.png?branch=master)](https://travis-ci.org/openlayers/closure-util)

## API

### <a id="manager">`new Manager(config)`</a>

A script manager parses scripts for dependencies and watches those scripts for changes, updating dependencies as scripts are added, modified, or deleted.  A manager is used in conjunction with a [server](#server) for providing a debug loader during development.

Main options:

 * **config.lib** - `string|Array.<string>` A list of [path patterns](https://github.com/isaacs/minimatch) for your library scripts (e.g. `'lib/**/*.js'`).  Note that path delimiters in these patterns should always be forward slashes (even on Windows).
 * **config.main** - `string|Array.<string>` Patterns for your main script(s).

More advanced options:

 * **config.ignoreRequires** - `string|undefined` A regular expression string. The manager will ignore matching `goog.require`'s that cannot be satisfied instead of throwing an exception. Optional.

The manager is an [event emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) that emits the following events:

 * **ready** - The manager is ready (all scripts parsed and dependencies resolved).
 * **error** - Listeners will be called with an `Error` instance representing what went wrong.

### <a id="server">`new Server(config)`</a>

Create a development server providing a script loader and static assets.

 * **config.manager** - `Manager` A script manager.
 * **config.root** - `string` Path to root directory for scripts and static assets (default is `process.cwd()`).
 * **config.loader** - `string` URL path for script loader.

```js
var closure = require('closure-util');

var manager = new closure.Manager({
  lib: ['path/to/app/src/**/*.js'],
  main: 'path/to/app/examples/*.js'
});
manager.on('error', function(e) { throw e; });
manager.on('ready', function() {
  var server = new closure.Server({
    manager: manager,
    root: 'path/to/app', // static resources will be served from here
    loader: '/examples/lib.js' // the script loader will be provided here
    // this assumes the main script can be derived from the query string like:
    // <script src='lib.js?main=example-1.js'></script>
    // this can be customized by providing a getMain method that accepts a
    // request object and returns the path to the main script
  });
  server.listen(3000);
});
```

### <a id="getdependencies">`getDependencies(config, callback)`</a>

The `getDependencies` function generates a list of script paths in dependency order.

 * **config** - `Object` A configuration object of the same form as the [manager config](#manager-config).
 * **callback** - `function(Error, Array.<string>)` Called with a list of script paths in dependency order (or a parsing error).

### <a id="compile">`compile(options, callback)`</a>

The `compile` function drives the Closure Compiler.

 * **options.compile** - `Object` [Options](compiler-options.txt) for the compiler (without the `--` prefix).  E.g. the `--output_wrapper` option could be specified with `{output_wrapper: '(function(){%output%})();'}`.  For options that can be specified multiple times, provide an array of values (e.g. `{js: ['one.js', 'two.js']}`).  For options that are flags (no value), provide a boolean (e.g. `{use_types_for_optimization: true}`).
 * **options.cwd** - `string` Optional path to set as the current working directory.  Default is `process.cwd()`.  All relative paths in the compiler options must be relative to `cwd`.
 * **options.jvm** - `Array.<string>` Optional arguments for the JVM.  If this argument is absent (if the function is called with two arguments), `['-server', '-XX:+TieredCompilation']` will be used as JVM arguments.  To use [different arguments](https://github.com/google/closure-compiler/wiki/FAQ#what-are-the-recommended-java-vm-command-line-options), provide an array.
 * **callback** - `function(Error, string)` Called with the compiler output (or any compilation error).

## <a id="configuration">Configuration</a>

The `closure-util` package downloads the Closure Compiler and Closure Library when installed.  To use a different version of these resources, you can provide some basic configuration options before running `npm install`.  Your configuration options can come from a number of different sources.  The most straightforward way is to include a `closure-util.json` file in your project.  You can also provide configuration options via environment variables.  Environment variables have the `closure_` prefix in front of the options described below (e.g. `closure_log_level` to specify the `log_level` option).

Available configuration options (see `default-config.json` for default values):

 * `compiler_url` - URL for the compiler zip archive (e.g. `http://dl.google.com/closure-compiler/compiler-latest.zip`).
 * `library_url` - URL for the Closure Library zip archive (e.g. `https://github.com/google/closure-library/archive/master.zip`).

## CLI

The `closure-util` command line utility provides `update` commands for updating (or installing) specific versions of the Closure Compiler and Closure Library for use with your project, a `build` command for building your project using the Closure Compiler, and a `serve` command for starting a development server for your project.

 * `closure-util update` - Update both the Compiler and Library.
 * `closure-util update-compiler` - Update the Compiler.
 * `closure-util update-library` - Update the Library.
 * `closure-util build` - Build a JavaScript application.
 * `closure-util serve` - Start a development server.
 * `closure-util --help` - Display command usage and options.

See the [configuration](#configuration) section above for information on how to configure URLs for specific versions of the Compiler or Library.  The `closure-util` utility will look for this configuration when executing one of the `update`, `update-compiler` or `update-library` commands.

This is how the `build` command is used:

    closure-util build config.json app.min.js

where `config.json` is a build config file and `app.min.js` in the output file including the compiled code. As an example for a build config file see the [`config.json`](test/fixtures/config.json) file used in the `closure-util` tests. The config file should include a `"lib"` and a `"compile"` sections.

This is how the `serve` command is used:

    closure-util serve config.json

where `config.json` is a config file. You can look at the [`config.json`](test/fixtures/config.json) again. For the `serve` command the config file should include a `"lib"` and a `"serve"` sections.

## Development

Setup:

    npm install

Run tests:

    npm test

Run tests continuously during development:

    npm start

## Publishing

To publish a new version of the `closure-util` package, first create a tag, and then publish.  Creating a tag can be done with the [`npm version` command](https://www.npmjs.org/doc/cli/npm-version.html).  This is a handy way to update `package.json` and create a git tag named like the new version.  The [`npm publish` command](https://www.npmjs.org/doc/cli/npm-publish.html) is used to publish the package to the [registry](https://www.npmjs.org/package/closure-util).

Example of publishing a new minor version (to increment the major version or create a patch release, replace `minor` with `major` or `patch`).  This assumes you have the latest from [`master`](https://github.com/openlayers/closure-util/tree/master) and your remote is named `openlayers`.

```bash
npm version minor
git push --tags openlayers master && npm publish
```

To publish a new version, you need to have [signed up](https://www.npmjs.org/signup) for an account with the registry.  After signing up for an account, contact one of the current `closure-util` maintainers and ask to be added (with [`npm owner`](https://www.npmjs.org/doc/cli/npm-owner.html)).
