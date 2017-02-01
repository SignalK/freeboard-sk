# individual

Garantueed individual values

## Example

```
var Individual = require("individual")

    , moduleCache = Individual("__MY_MODULE_CACHE", {})

// moduleCache is a individual variable local to this file.
// It will always be the same value and defaults to {}.
```

This gives you a singleton value by a unique name (it stores it
as a global variable).

## Use cases

Your module has an internal cache. If your module is loaded
    twice, (someone didn't npm dedup and has two copies of your
    module) you would have two seperate caches that dont talk
    to each other.

Best case your cache is less efficient. Worst case you have a
    cache because the native C++ extension you talk to crashes
    if you instantiate something twice.

You need a garantuee that this value is an individual, there is
    only one of it.

I use it myself because opening a SockJS websocket to the same
    URI twice causes an infinite loop. I need a garantuee that
    I have an individual value for the SockJS connection so I
    can see whether I already have an open connection.

## WHY GLOBALS >:(

I can't imagine any other way to do it. I hate it too. Make a
    pull request if you know the real solution

## Installation

`npm install individual`

## Contributors

 - Raynos

## MIT Licenced
