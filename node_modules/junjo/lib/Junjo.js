var Junjo = (function(isNode) {
  // "use strict"; // commented out because of is_arguments()
 
  /** utility functions, variables **/
  var A            = Array.prototype,
      O            = Object.defineProperty,
      E            = function() {},
      args2arr     = function(args) { return A.slice.call(args) },
      nextTick     = (isNode) ? process.nextTick : function(fn) { setTimeout(fn, 0) },
      is_arguments = function(v) { return !!(v && v.callee) },
      getSubFunc   = function($j) { return function() { this.sub = $j.inherit(this.junjo) } },
      SHIFT        = 'shift',
      fork         = function() { var f = function() {}; f.prototype = this; return new f },
      getDefined   = function(a, b) { return (typeof a != "undefined") ? a : b },
      shallowCopy  = function(o) { return Object.keys(o).reduce(function(r, k) { r[k] = o[k]; return r }, {}) },
      extend       = function(c, p) { 
        if (c.__proto__) c.__proto__ = p; 
        else Object.getOwnPropertyNames(p).forEach(function(k) { c[k] = p[k] })
      };

  /** preparation for private properties **/
  var props = {}, current_id = 0;
  function _(obj) { return props[obj.tpl_id] }
  function $(obj) { return props[obj.id] || {} }
  function D(key) { delete props[key] }

  var defaultCatcher = function(e, args) {
    if (!this.junjo.options.silent) console.error('ERROR in label ' + this.label, e.stack || e.message || e);
    e.args = args;
    this.err = e;
    this.terminate();
  };

  var optionTypes = {
    timeout   : "number",   // time to check timeout
    noTimeout : "boolean",  // if true, timeout is not set
    catcher   : "function", // default error handler
    result    : "boolean",  // return "out" if all operation is synchronous
    nextTick  : "boolean",  // do each operation in different event loops
    silent    : "boolean",  // no error report to stdout in default catcher
    destroy   : "boolean",  // delete running objects for saving memory, default : true
    nosort    : "boolean"   // skip checking if the operations are valid DAG or not
  };

  var defaultOptions = {
    timeout   : 5,              // time to check timeout
    noTimeout : false,          // if true, timeout is not set
    catcher   : defaultCatcher, // default error handler
    result    : false,          // return "out" if all operation is synchronous
    nextTick  : false,          // do each operation in different event loops
    silent    : false,          // no error report to stdout in default catcher
    destroy   : false,          // delete running objects for saving memory, default : true
    nosort    : false           // skip checking if the operations are valid DAG or not
  };

  /** constructor **/
  var JTemplate = function(options) {
    options || (options = {});

    // this function $J is returned in JTemplate().
    var $J = function() { 
      if (this instanceof $J) return new Junjo($J, arguments[0]);
      return $J.register.apply($J, arguments)
    };

    O($J, 'tpl_id', { value : ++current_id, writable : false});

    // $J extends JTemplate.prototype
    extend($J, JTemplate.prototype);
    $J.constructor = Junjo;

    $J.$ops    = []; // registered operations
    $J.labels  = {}; // {label => position of $ops}
    $J.befores = {}; // list of labels of functions executing after  the function with label of the key (label => [label])
    $J.afters  = {}; // list of labels of functions executing after the function with label of the key (label => [op])
    $J.options = fork.call(defaultOptions); // options for run
    $J.hooks   = { start : null, end: null, terminate: null };
    $J.after   = !!options.after; // if true, registered operations are set after the previously-set operation.
    $J.clear   = !!options.clear; // if true, delete this template after the first Junjo

    // set options
    Object.keys(optionTypes).forEach(function(k) { if (options[k] !== undefined) $J[k](options[k]) });

    props[$J.tpl_id] = $J;
    return $J;
  };

  var Junjo = function() {
    var $j = function() { return $j.register.apply($j, arguments) };

    // $j extends Junjo.prototype
    extend($j, Junjo.prototype);
    $j.constructor = Junjo;

    var $J, options = (arguments.length > 1) ? A.pop.call(arguments) : null;
    if (Junjo.isJunjo(arguments[0])) $J = arguments[0];
    else {
      if (arguments[0]) options = arguments[0];
      $J = new JTemplate(options);
    }
    O($j, 'tpl_id', { value: $J.tpl_id, writable: false});
    O($j, 'id', { value: ++current_id,  writable: false});
    var _this = _($j);
    var $this = props[$j.id] = {
      running   : false, // registered processes are running or not
      results   : {},    // results of each functions
      ended     : false, // emited end event or not
      finished  : 0,     // the number of finished functions
      skips     : {},    // skipped functions (label => arguments)
      counters  : {},    // counters (label => number)
      called    : {},    // called functions (label => number)
      listeners : {}     // Eventlisteners
    };

    $j.err = null;  // error to pass to the "end" event
    $j.out = new E; // final output to pass to the "end" event
    $j.shared = {}; // shared values within $ops

    // set options
    $j.options = fork.call($J.options);
    if (options) Object.keys(optionTypes).forEach(function(k) { if (options[k] !== undefined) $j[k](options[k]) });

    if (options && options.run) nextTick(function() {
      $j.run.apply($j, (is_arguments(options.run)) ? options.run : Junjo.multi(options.run));
    });
    return $j;
  };

  // JTemplate, Junjo extends Function prototype
  extend(JTemplate.prototype, Function.prototype);
  extend(Junjo.prototype, Function.prototype);

  // the number of registered operations
  O(JTemplate.prototype, "size", { get : function () { return this.$ops.length }, set : E });
  O(Junjo.prototype, "size", { get : function () { return _(this).$ops.length }, set : E });

  // getter/setter of each option
  Object.keys(optionTypes).forEach(function(key) {
    JTemplate.prototype[key] = Junjo.prototype[key] = function(v) {
      if (arguments.length == 0) return this.options[key];
      if (typeof v == optionTypes[key]) this.options[key] = v;
      return this;
    };
  });

  /** public functions **/
  JTemplate.builds = {}; // functions callable only when the object is not frozen.

  // register a function
  JTemplate.builds.register = function() {
    var label = (arguments.length > 1) ? A.shift.call(arguments) : undefined;
    if (Junjo.isJunjo(arguments[0])) return this.register(label, getSubFunc(arguments[0]));

    if (this.labels[label]) throw new Error('label ' + label + ' already exists.');
    if (label == undefined) { label = this.$ops.length; while (this.labels[label]) { label++ } }

    var $op = new Operation(arguments[0], label, this);
    this.labels[label] = this.$ops.push($op) -1;
    this.befores[label] = [], this.afters[label] = [];
    return (this.after) ? $op.after() : $op;
  };

  // set names to arguments of $j.run()
  JTemplate.builds.inputs = function() {
    if (arguments.length == 1 && typeof arguments[0] == 'object') {
      var obj = arguments[0];
      if (Array.isArray(obj)) {
        obj.forEach(function(name, k) { this.inputs.apply(this, [name, k]) }, this);
        return this;
      }
      Object.keys(obj).forEach(function(k) {
        var v = Array.isArray(obj[k]) ? obj[k] : [obj[k]];
        v.unshift(k);
        this.inputs.apply(this, v);
      }, this);
      return this;
    }
    var label = A.shift.call(arguments), nums = A.filter.call(arguments, function(v) {return !isNaN(Number(v)) });
    return this.register(label, function() {
      var args = nums.map(function(n) { return this.inputs[n] }, this);
      args.unshift(this.label);
      this.skip.apply(this, args);
    });
  };

  // remove $op by label
  JTemplate.builds.remove = function(lbl) {
    var num = this.labels[lbl], $op = this.$ops[num];
    this.$ops.splice(num, 1);
    delete this.labels[lbl], delete this.afters[lbl], delete this.befores[lbl];
    for (var i=num, l=this.$ops.length; i<l; i++) { this.labels[this.$ops[i].label] = i }
    return this;
  };

  // add catcher to all the functions registered previously, except those already have a catcher.
  JTemplate.builds.catchesAbove = function(fn) {
    _(this).$ops.forEach(function($op) { if (!_($op).catcher) _($op).catcher = fn });
    return this;
  };

  // register a function executed on run()
  ['start', 'end', 'terminate'].forEach(function(name) {
    JTemplate.prototype[name] = function(fn) { if (typeof fn == 'function') this.hooks[name] = fn; return this };
    Junjo.prototype[name] = function(fn) { if (typeof fn == 'function') return this.on(name, fn) };
  });
  
  ["register", "inputs", "remove", "catchesAbove"].forEach(function(name) {
    JTemplate.prototype[name] = function() {
      if (this.frozen) throw new Error("Junjo." + name +  " cannot be called when the template is frozen.");
      return JTemplate.builds[name].apply(this, arguments);
    };
    // delegate to JTemplate
    Junjo.prototype[name] = function() { return JTemplate.prototype[name].apply(_(this), arguments); return this };
  });
  Junjo.prototype.register = function() { return JTemplate.prototype.register.apply(_(this), arguments) };

  JTemplate.prototype.freeze = function() {
    if (this.frozen) return this;
    this.frozen = true;

    this.entries = this.$ops.filter(function($op) {
      var befores = this.befores[$op.label];
      befores.forEach(function(lbl) {
        var before = this.$ops[this.labels[lbl]];
        if (!before) throw new Error('label ' + lbl + ' is not registered. in label ' + $op.label);
        this.afters[before.label].push($op);
      }, this);
      return befores.length == 0;
    }, this);

    // topological sort to operations
    if (!this.options.nosort) {
      var visited = {};
      this.$ops.forEach(function visit($op, ancestors) {
        if (visited[$op.label]) return;
        if (!Array.isArray(ancestors)) ancestors = [];
        ancestors.push($op.label);
        visited[$op.label] = true;
        this.afters[$op.label].forEach(function($ch) {
          if (ancestors.indexOf($ch.label) >= 0) throw new Error('closed chain:' +  $ch.label + ' is in ' + $op.label);
          visit.call(this, $ch, args2arr(ancestors));
        }, this);
      }, this);
    }
    [this, this.$ops, this.labels, this.befores, this.afters, this.options, this.hooks].forEach(Object.freeze);
    return this;
  };

  JTemplate.prototype.clone = function(copyOperations) {
    var $J = new JTemplate();
    ["labels", "befores", "options", "hooks"].forEach(function(k) { $J[k] = shallowCopy(this[k]) }, this);
    $J.$ops  = this.$ops.slice();
    $J.$ops.forEach(function($op) { _($op).referred++; $J.afters[$op.label] = [] });
    ["after", "clear"].forEach(function(name) { $J[name] = this.options.after }, this);
    return $J;
  };

  O(Junjo.prototype, "$", { get : function () { return this.shared }, set : function(v) { this.shared = v } });

  Junjo.prototype.clone = function(copyOperations) {
    var $J = _(this).clone(copyOperations);
    return new Junjo($J, this.options);
  };

  // set eventListener
  Junjo.prototype.on = function(evtname, fn) {
    var $this = $(this), self = this;
    if (evtname == 'end' && $this.ended) {
      return nextTick(function() { fn.call(self, self.err, self.out) }); // pseudo onEnd
    }
    if (!$this.listeners[evtname]) $this.listeners[evtname] = [];
    $this.listeners[evtname].push(fn);
    return this;
  };

  // get $op by label
  Junjo.prototype.get = function(lbl) {
    var _this = _(this), ret = _this.$ops[_this.labels[lbl]]
    if (!ret) throw new Error(lbl + ' : no such label.');
    return ret;
  };

  // register informatino of skipping operations
  Junjo.prototype.replace = function() {
    $(this).skips[A.shift.call(arguments)] = (arguments.length > 1) ? arguments : arguments[0];
    return this;
  };
  Junjo.prototype.shortcut = Junjo.prototype.replace;

  Junjo.prototype.results = function(lbl) { return (lbl) ? $(this).results[lbl] : $(this).results };

  // inherit settings of given Junjo instance
  Junjo.prototype.inherit = function($j) { extend(this.options, $j.options); return this; };

  Junjo.prototype.next = function(jn, options) {
    return this.on('end', Junjo.isJunjo(jn) ? function(err, out) { jn.run(err, out) } : jn);
  };

  Junjo.prototype.fork = function() { return new Junjo(_(this), this.options) }

  // emitting event asynchronously. The similar way as EventEmitter in Node.js
  Junjo.prototype.emit = function() {
    var evtname = A.shift.call(arguments);
    return this.emitArgs(evtname, arguments);
  };

  Junjo.prototype.emitArgs = function(evtname, args, sync) {
    var self = this;
    var listeners = $(this).listeners[evtname] || [];
    if (sync) listeners.forEach(function(listener) { listener.apply(self, args) });
    else listeners.forEach(function(listener) { nextTick(function() { listener.apply(self, args) }) });
    return this;
  };

  // run all the registered operations
  Junjo.prototype.run = function() {
    var $j = this, $this = $(this), _this = _(this), args = arguments, options = this.options;
    if ($this.running) return this;
    $this.running = true;
    if (!_this.frozen) _this.freeze();
    $this.inputs = arguments;
    $this.scopes = _this.$ops.reduce(function(obj, $op) {
      obj[$op.label] = $op.createScope($j);
      return obj;
    }, {}, this);

    if (_this.hooks.start) args = _this.hooks.start.apply(this, arguments) || arguments;
    this.emitArgs("start", args, true);

    _this.$ops.forEach(function($op) { $this.counters[$op.label] = _this.befores[$op.label].length - 1 || 0 });
    if (options.result || !options.nextTick) {
      _this.entries.forEach(function($op) { jExecute.call($this.scopes[$op.label], args2arr(args)) });
      finishCheck.call(this);
      return ($this.ended && options.result) ? this.out : this;
    }
    else _this.entries.forEach(function($op) { nextTick(jExecute.bind($this.scopes[$op.label], args2arr(args))) });
    return this;
  };

  // run with callback
  Junjo.prototype.exec = function() {
    var fn = A.pop.call(arguments);
    this.on('end', fn);
    return this.run.apply(this, arguments);
  };

  /** private functions **/
  // set result and run next operations
  var runNext = function($op, result) {
    var $this = $(this), _this = _(this);
    $($op).finished = true;
    $this.finished++;
    $this.results[$op.label] = result;
    finishCheck.call(this);
    _this.afters[$op.label].forEach(function($c) { 
      if (this.options.result || !this.options.nextTick) { jExecute.call($this.scopes[$c.label]) }
      else { nextTick(jExecute.bind($this.scopes[$c.label])) }
    }, this);
  };

  var finishCheck = function() {
    var _this = _(this), $this = $(this);
    if ($this.finished < _this.$ops.length || $this.ended) return;
    $this.ended = true;
    if (this.out instanceof E && !Object.keys(this.out).length) this.out = $this.results;
    if (_this.clear) this.on("end", function() {
      var scopes = $(this).scopes;
      Object.keys(scopes).forEach(function(k) {
        if (--_(scopes[k]).referred <= 0) D(scopes[k].tpl_id)
      });
      D(this.tpl_id);
    });
    if (this.options.destroy) this.on("end", function() {
      var scopes = $(this).scopes;
      Object.keys(scopes).forEach(function(k) { D(scopes[k].id) });
      D(this.id);
    });
    try {
      if (_this.hooks.end) _this.hooks.end.call(this, this.err, this.out);
    }
    catch (e) {
      this.err = e; // TODO multi error reporting
    }
    this.emit('end', this.err, this.out);
  };

  /** "this" scope in functions **/
  var $Scope = function($op, $j) {
    O(this, 'id',  { value : ++current_id, writable : false});
    O(this, 'tpl_id', { value : $op.tpl_id, writable : false});
    O(this, 'label',  { value : $op.label, writable : false});
    O(this, 'junjo',  { value : $j, writable : false});
  };
  $Scope.proto = {};

  ['shared', 'err', 'out'].forEach(function(p) {
    O($Scope.prototype, p, { get : function() { return this.junjo[p] }, set : function(v) { this.junjo[p] = v } });
  });
  O($Scope.prototype, '$', { get : function() { return this.junjo.shared }, set : function(v) { this.junjo.shared = v }});
  O($Scope.prototype, 'inputs', { get : function() { return $(this.junjo).inputs }, set : E });

  ['callback', 'cb']
  .forEach(function(p) { O($Scope.prototype, p, { get : function() { return this.callbacks(0) }, set : E }) });
  O($Scope.prototype, 'fail', { get : function() { return jFail.bind(this) }, set : E });

  O($Scope.prototype, 'sub', {
    get : function() {
      var $this = $(this);
      if ($this.mask) return null;
      if (!$this.sub) { this.sub = new Junjo().inherit(this.junjo) }
      return $this.sub;
    },
    set : function($j) {
      if (!Junjo.isJunjo($j)) return;
      var $this = $(this);
      if ($this.mask) return;
      $this.sub = $j;
      this.absorbEnd($this.sub, 'sub', true);
      nextTick(function() { $this.sub.run.apply($this.sub, $this.args) });
    }
  });

  $Scope.proto.callbacks = function(key, isSub) {
    var $this = $(this);
    $this.cb_accessed = true;
    key = getCallbackName(key, $this, isSub);
    if ($this.cb_keys[key] === undefined) {
      $this.cb_count++;
      $this.cb_keys[key] = 1;
    }
    return jCallback.bind(this, key, $this.trial);
  };

  var getCallbackName = function(key, $this, isSub) {
    if (key == 'sub' && !isSub) throw new Error("callback key must not be 'sub'.");
    if (key != null) return key;
    key = $this.cb_count;
    while ($this.cb_keys[key] !== undefined) { key++ }
    return key;
  };

  $Scope.proto.iterate = function(obj, fn, interval) {
    if (typeof obj != "object")  throw new Error("first arguments must be an array or an object");
    if (typeof fn != "function") throw new Error("second arguments must be a function");
    var self = this, cb = this.callbacks();
    var next = (function() {
      var k = 0;
      if (Array.isArray(obj)) {
        var last = obj.length;
        return function() { fn.call(self, obj[k], k++); return k < last };
      }
      else {
        var keys = Object.keys(obj), last = keys.length;
        return function() { fn.call(self, obj[keys[k]], keys[k++]); return k < last };
      }
    })();
    (function iterate() { (next()) ? (interval ? setTimeout(iterate, interval) : nextTick(iterate)) : cb() })();
  };
  $Scope.proto.forEach = $Scope.proto.iterate;

  $Scope.proto.absorb = function(emitter, evtname, fn, name) {
    var self = this, $this = $(this);
    name = getCallbackName(name, $this);
    emitter.on(evtname, function() {
      try {
        A.push.call(arguments, $this.absorbs[name], self);
        var ret = fn.apply(emitter, arguments);
        if (ret !== undefined) $this.absorbs[name] = ret;
      }
      catch (e) {
        $this.absorbErrs[name] = e;
      }
    });
    return this.absorbEnd(emitter, name);
  };

  $Scope.proto.absorbEnd = function(emitter, name, isSub) {
    var self = this, $this = $(this);
    name = getCallbackName(name, $this, isSub);
    emitter.on('error', jFail.bind(this));
    var cb = this.callbacks(name, isSub);
    emitter.on('end', function(err, out) {
      if (Junjo.isJunjo(emitter) && !$this.absorbs[name]) $this.absorbErrs[name] = err, $this.absorbs[name] = out;
      cb($this.absorbErrs[name], $this.absorbs[name]);
    });
    return this;
  };

  $Scope.proto.absorbData = function(emitter, name, evtname) {
    var $this = $(this);
    name = getCallbackName(name, $this);
    $this.absorbs[name] = '';
    return this.absorb(emitter, evtname || 'data', function(data) {
      var $op = A.pop.call(arguments), result = A.pop.call(arguments);
      return result + data.toString();
    }, name);
  };
  $Scope.proto.gather = $Scope.proto.absorbData;

  Object.keys($Scope.proto)
  .forEach(function(k) { $Scope.prototype[k] = function() { return (!$(this).mask) ? $Scope.proto[k].apply(this, arguments) : null } });

  // get results of operations.
  $Scope.prototype.results = function(lbl) { return (lbl) ? $(this.junjo).results[lbl] : $(this.junjo).results };

  // terminate operations
  $Scope.prototype.terminate = function() {
   var $J = _(this.junjo);
   $J.$ops.forEach(function($op) { this.skip($op.label) }, this);
   if ($J.hooks.terminate) $J.hooks.terminate.call(this.junjo, this.label);
   this.junjo.emit('terminate', this.label);
  };

  // skip the operation with a given label, and make it return the passed arguments
  $Scope.prototype.skip = function() {
    var lbl = arguments.length ? A.shift.call(arguments) : this.label, $junjo = $(this.junjo);
    if ($junjo.skips[lbl] === undefined) $junjo.skips[lbl] = arguments;
    if (this.label == lbl) nextTick(jResultFilter.bind(this, arguments));
  };

  /** Operation : registered operation **/
  var Operation = function(val, label, $J) {
    O(this, 'tpl_id', { value : ++current_id, writable : false });
    O(this, 'label', { value : label, writable : false });
    props[this.tpl_id] = { val: val, $J: $J, referred: 1 };
  };

  Operation.prototype.timeout = function(v) { if (typeof v == "number") { _(this).timeout = v } return this };
  Operation.prototype.sync  = function(bool) { _(this).async = (bool === undefined) ? false : !bool; return this };
  Operation.prototype.async = function(bool) { _(this).async = (bool === undefined) ? true : !!bool; return this };
  ['pre', 'post']
  .forEach(function(p) { Operation.prototype[p] = function(fn) { if (typeof fn == 'function') { _(this)[p] = mask(fn) } return this } });

  ['err', 'out']
  .forEach(function(p) { Operation.prototype[p] = function(n) { _(this)[p + 'num'] = (!isNaN(Number(n))) ? n : 0; return this } });
  Operation.prototype.errout = function() { this.err(0); return this.out(1) };

  Operation.prototype.reduce = function(fn, prime) {
    if (typeof fn == 'function') { _(this).reduce = fn = mask(fn), fn.prime = prime } return this;
  };

  Operation.prototype.firstError = function(val) {
    if (val != SHIFT && val !== false) val = true;
    _(this).firstError = val;
    return this;
  };
  Operation.prototype.eshift = function(val) { return this.firstError(SHIFT) };

  Operation.prototype.after = function() {
    var _this = _(this), $J = _this.$J, lbl = this.label;
    if (arguments.length == 0 && $J.size > 1)
      A.push.call(arguments, $J.$ops[$J.labels[lbl]-1].label);

    var befores = $J.befores[lbl];
    A.forEach.call(arguments, function(l) { if (l != lbl && befores.indexOf(l) < 0) befores.push(l) });
    return this;
  };
  Operation.prototype.using = Operation.prototype.after;

  Operation.prototype.afterAbove = function(bool) {
    return this.after.apply(this, _(this).$J.$ops.map(function($op) { return $op.label }));
  };

  Operation.prototype.catches = function(fn) { _(this).catcher = fn; return this };
  Operation.prototype.fail = Operation.prototype.catches;
  Operation.prototype.next = function() { var $J = _(this).$J; return $J.register.apply($J, arguments).after(this.label) };

  Operation.prototype.failSafe = function() {
    var args = arguments;
    return this.catches(function() { return args });
  };

  Operation.prototype.retry = function(val) {
    var _this = _(this);
    if (typeof val == 'number') _this.retry = function(e, args, c) { return c < val };
    else if (typeof val == 'function') _this.retry = mask(val);
    return this;
  };

  Operation.prototype.loop = function(val, nextTick) {
    var _this = _(this);
    if (typeof val == 'number') _this.loop = function(a, r, c) { return c < val };
    else if (typeof val == 'function') _this.loop = mask(val);
    _this.loop.nextTick = !!nextTick;
    return this;
  };

  Operation.prototype.createScope = function($j) { return new $Scope(this, $j) };

  /** private functions of Operation **/

  var jResetState = function(prevState) {
    props[this.id] = {
      args         : [],    // arguments passed to this.execute()
      absorbs      : {},    // absorbed data from emitters (name => absorbed data)
      absorbErrs   : {},    // absorbed error from emitters (name => absorbed error)
      done         : false, // execution ended or not
      finished     : false, // whether jResultFilter is normally finished called or not.
      cb_accessed  : false, // whether callback is accessed or not
      trial        : 0,
      cb_count     : 0,
      cb_keys      : {},    // key => 1
      result       : null,
      mask         : false
    };
    if (!prevState) return;
    Object.keys(prevState).forEach(function(k) { props[this.id][k] = prevState[k] }, this);
  };

  var mask = function(fn) { return function() { $(this).mask = true; var r = fn.apply(this, arguments); $(this).mask = false; return r } }

  var jExecute = function(args, prevState, force) {
    var _this  = _(this), label = this.label, $junjo = $(this.junjo);
    if ($junjo.counters[label]-- > 0 || ($junjo.called[label] && !force)) return;
    if (typeof _this.val != 'function') return jNext.call(this, _this.val);

    jResetState.call(this, prevState);
    var $this = $(this);
    $junjo.called[label] = true;
    var befores = _this.$J.befores[label];

    if (befores.length) {
      $this.args = befores.reduce(function(arr, lbl) {
        var val = $junjo.results[lbl];
        if (is_arguments(val)) A.forEach.call(val, function(v) { arr.push(v) });
        else arr.push(val);
        return arr;
      }, []);
    }
    else $this.args = args;

    try {
      if ($junjo.skips[label] != null) return jResultFilter.call(this, $junjo.skips[label]);

      if (_this.loop) {
        if (!$this.loop) $this.loop = { result: null, count: 0};
        var l = $this.loop;
        l.args = args ? args.map(function(v) {return v}) : null;
        $this.args.push(l.result, l.count);
        l.finished = !_this.loop.call(this, l.result, l.args, l.count);
        if (l.finished) return jResultFilter.call(this, l.result);
      }

      if (_this.pre) {
        var preResult = _this.pre.apply(this, $this.args);
        if (preResult !== undefined) $this.args = (is_arguments(preResult)) ? preResult : [preResult];
      }
      var ret = _this.val.apply(this, $this.args); // execution
      $this.done = true;
      if (_this.async === false || _this.async == null && !$this.cb_accessed) return jResultFilter.call(this, ret);
      if ($this.cb_attempted) return $this.cb_attempted.forEach(function(v) { jCallback.apply(this, v, $this.trial) }, this);

      var timeout = getDefined(_this.timeout, this.junjo.options.timeout);
      if (this.junjo.options.noTimeout || !timeout ) return;

      var self = this;
      $this.timeout_id = setTimeout(function() {
        if (!$this.finished) {
          $this.done = true;
          jFail.call(self, new Error('callback wasn\'t called within '+ timeout +' [sec] in function ' + self.label + '.' ));
        }
      }, timeout * 1000);
    }
    catch (e) {
      $this.done = true;
      return jFail.call(this, e);
    }
  };

  var jFail = function(e) {
    if ($(this).finished) return;
    var $this = $(this), _this = _(this), self = this;
    var _retry = _this.retry;
    if (_retry) {
      var num = _retry.call(this, e, $this.args, ++$this.trial);
      if (num) {
        return (!isNaN(num))
          ? setTimeout(function() {jExecute.call(self, null, {trial: $this.trial}, true) }, num)
          : jExecute.call(this, null, {trial: $this.trial}, true);
      }
    }
    var result = mask(getDefined(_this.catcher, this.junjo.options.catcher)).call(this, e, $this.args);
    return jResultFilter.call(this, result, true); // pass the second arg to avoid infinite loop
  };

  var jCallback = function() {
    var $this = $(this), reduce = _(this).reduce;
    if ($this.finished) return;
    if (!$this.done) {
      if (!$this.cb_attempted) $this.cb_attempted = [];
      return $this.cb_attempted.push(arguments);
    }
    var key = A.shift.call(arguments);
    var trial = A.shift.call(arguments);
    if (trial < $this.trial) return;
    if (reduce) {
      var v = _(this).reduce.call(this, $this.result || reduce.prime, arguments, key)
      $this.result =  (v !== undefined) ? v : $this.result;
    }
    else $this.result = arguments;
    if (--$this.cb_count > 0) return;
    return jResultFilter.call(this, $this.result);
  };

  // modify result
  var jResultFilter = function(result, skipFailCheck) {
    try {
      var _this = _(this), $this = $(this), self = this, is_arg = is_arguments(result);
      if ($this.finished) return;

      if ($(this.junjo).skips[this.label] != null)  // if skip flag is on, omit following processes
        return jNext.call(this, $(this.junjo).skips[this.label]);

      var fsterr = getDefined(_this.firstError, this.junjo.options.firstError);
      if (fsterr && is_arg) {
        if (result[0]) throw result[0];
        if (fsterr == SHIFT) A.shift.call(result);
      }

      if ($this.loop && !$this.loop.finished) { // if loop, this operation is executed again.
        var l = $this.loop, args = l.args;
        l.count++, l.result = result;
        if ($this.timeout_id) clearTimeout($this.timeout_id);
        return (_this.loop.nextTick)
          ? nextTick(function() { jExecute.call(self, args, {loop: l}, true) })
          : jExecute.call(this, args, {loop: l}, true);
      }
      if (_this.post) { // post executing process
        var postResult = _this.post.apply(this, is_arg ? result : [result]);
        if (postResult !== undefined) result = postResult;
      }

    }
    catch (e) { if (!skipFailCheck) return jFail.call(this, e) }
    jNext.call(this, result);
  };

  // execute next operations
  var jNext = function(result) {
    var is_arg = is_arguments(result), _this = _(this);
    // setting out, err
    var n = _this.outnum;
    if (n !== undefined && (is_arg || n == 0)) this.junjo.out = is_arg ? result[n] : result;

    if (!this.junjo.err) {
      var n = _this.errnum;
      if (n !== undefined && (is_arg || n == 0)) this.junjo.err = is_arg ? result[n] : result;
    }

    var timeout_id;
    if (timeout_id = $(this).timeout_id) clearTimeout(timeout_id); // remove tracing callback
    runNext.call(this.junjo, this, result);
  };

  Junjo.defaultOptions = defaultOptions;
  Junjo.Template       = JTemplate;
  Junjo.isNode         = isNode;
  Junjo.multi          = Junjo.args = function() { return arguments };
  Junjo.isJunjo        = function($j) { return $j && $j.constructor == Junjo };
  return Junjo;
})(typeof exports == 'object' && exports === this);

if (Junjo.isNode) module.exports = Junjo;
