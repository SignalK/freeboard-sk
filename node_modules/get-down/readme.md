# `get-down`

**Download and optionally extract files.**

This draws heavily from [Bower's](http://bower.io/) download and extract utilities.  Those utilities are [copyright Twitter](https://github.com/bower/bower/blob/master/LICENSE) and carry the MIT license.

## Example use

Download a file and save it to the working directory with the same name:
```js
var download = require('get-down');
download('http://example.com/file.txt');
```

Same as above, but saving to a different directory:
```js
var download = require('get-down');
download('http://example.com/file.txt', {dest: 'different/directory'});
// the provided directory must already exist
```

In addition to providing a `dest` directory, you can provide a new file name:
```js
var download = require('get-down');
download('http://example.com/file.txt', {dest: 'different/name.txt'});
// the provided file must not already exist
```

The `extract` option can be used to extract `tar`, `tgz`, `gz`, or `zip` files:
```js
var download = require('get-down');
download('http://example.com/file.zip', {dest: 'some/directory', extract: true});
// the dest directory must already exist
```

As you might expect, `download` is all async.  You get an event emitter in return:
```js
var download = require('get-down');
download('http://example.com/file.txt').on('end', function(dest) {
  console.log('downloaded', dest);
});
```

## API Docs

## `download(url, [options])`

 * **url** - `string` URL for the resource you want to download.  E.g. `'http://example.com/file.txt'` or `'https://example.com/archive.zip'`.
 * **options** - `Object` An optional object with properties to configure the download operation.  See the available options below.

Download a resource.  Returns an [`EventEmitter`](http://nodejs.org/api/events.html#events_class_events_eventemitter) that emits the events described below.

### Options

#### <a id="optionsdest">options.dest</a>

 * type: `string`
 * default: `process.cwd()`

The destination directory or file path for saving downloaded resources.  If `dest` is a directory, it must already exist.  If `dest` is a path to a file, the parent directory must already exist (existing files will not be overwritten).  If the [`extract` option](#optionsextract) is `false` and you provide a directory here, the filename will be derived from the provided `url` (e.g. a `url` of `'http://example.com/some/file.txt'` and a `dest` of `'local/path'` will result in `'local/path/file.txt'`).  Finally, if the [`extract` option](#optionsextract) is `true`, you must provide the path to an existing directory.

#### <a id="optionsextract">options.extract</a>

 * type: `boolean`
 * default: `false`

Extract the downloaded archive.  If the `url` points to a .zip, .tar, .tgz, or .gz file, you can optionally extract/defalate it after download.  If not obvious from the file extension, the archive type will be determined from the content type header of the response.


### Events

#### `progress` event

Emitted periodically during the download.  Listeners will receive a state object representing one of two types of progress.  As more data is received, the state object will have the following properties:

 * **received** - `number` The cumulative number of bytes received.
 * **total** - `number|null` If the response headers provided it, this will be the total content size in bytes.  If not provided, it will be `null`.
 * **percent** - `number|null` As a convenience, if `total` is available, this will be the percentage of the total file size received (otherwise it will be `null`).

If the download fails due to network issues, it will be retried (up to 5 times).  In the event of a retry, progress listeners will receive a state object with the following properties:

 * **retry** - `boolean` This will always be `true` in the event of a retry.
 * **timeout** - `number` The number of milliseconds before the download is attempted again.
 * **error** - `Error` An error representing the failure.

A progress listener might handle both types of progress with code like this:

```js
  download('http://example.com/big-file.txt').on('progress', function(state) {
    if (state.retry) {
      var delay = Math.round(state.timeout / 1000) + 's';
      console.log('Download failed, retrying again in ' + delay);
    } else {
      var progress = Math.floor(state.received / 1024) + 'K';
      if (state.percent) {
        progress = state.percent + '% (' + progress + ')';
      }
      console.log('Received ' + progress);
    }
  });
```

#### `error` event

Emitted in the event of an error during download or extraction.  Listeners will receive an `Error` object with a message describing what went wrong.  Temporary files created during a download will be removed when your program completes.

#### `end` event

Emitted in upon success.  Listeners will be called with a (`string`) path to the saved resource.  If the [`extract` option](optionsextract) is `true`, this will be a path to the directory where the resource was extracted.  Otherwise, it will be a path to the saved file.

## That's all

Please [report any issues](https://github.com/tschaub/get-down/issues) you find.  To contribute, fork and start out by running the tests.

```
npm install
npm test
```

You can run `npm start` to have the linter and tests run continuously during development.

[![Current Status](https://secure.travis-ci.org/tschaub/get-down.png?branch=master)](https://travis-ci.org/tschaub/get-down)
