# data-set

Element#dataset abstraction

## Example

```html
<div data-foo="bar"></div>
```

```js
var DataSet = require("data-set")
    , assert = require("assert")

var elem = thatElement
    , ds = DataSet(elem)

assert.equal(ds.foo, "bar")
```

## Installation

`npm install data-set`

## Contributors

 - Raynos

## MIT Licenced
