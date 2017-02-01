var path = require('path');

var acorn = require('acorn');
var fs = require('graceful-fs');

var like = require('./util').like;


/**
 * Statement identifying goog base (`var goog = goog || {}`).
 * @type {Object}
 */
var googNode = {
  type: 'VariableDeclaration',
  start: '*',
  end: '*',
  declarations: [{
    type: 'VariableDeclarator',
    start: '*',
    end: '*',
    id: {
      type: 'Identifier',
      start: '*',
      end: '*',
      name: 'goog'
    },
    init: {
      type: 'LogicalExpression',
      start: '*',
      end: '*',
      left: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      operator: '||',
      right: {
        type: 'ObjectExpression',
        start: '*',
        end: '*',
        properties: []
      }
    }
  }],
  kind: 'var'
};


/**
 * Statement with goog.provide call.
 * @type {Object}
 */
var provideNode = {
  type: 'ExpressionStatement',
  start: '*',
  end: '*',
  expression: {
    type: 'CallExpression',
    start: '*',
    end: '*',
    callee: {
      type: 'MemberExpression',
      start: '*',
      end: '*',
      object: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      property: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'provide'
      },
      computed: false
    },
    arguments: [{
      type: 'Literal',
      start: '*',
      end: '*',
      value: '*',
      raw: '*'
    }]
  }
};


/**
 * Statement with goog.require call.
 * @type {Object}
 */
var requireNode = {
  type: 'ExpressionStatement',
  start: '*',
  end: '*',
  expression: {
    type: 'CallExpression',
    start: '*',
    end: '*',
    callee: {
      type: 'MemberExpression',
      start: '*',
      end: '*',
      object: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      property: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'require'
      },
      computed: false
    },
    arguments: [{
      type: 'Literal',
      start: '*',
      end: '*',
      value: '*',
      raw: '*'
    }]
  }
};


/**
 * Statement with goog.addDependency call.
 * @type {Object}
 */
var addDependencyNode = {
  type: 'ExpressionStatement',
  start: '*',
  end: '*',
  expression: {
    type: 'CallExpression',
    start: '*',
    end: '*',
    callee: {
      type: 'MemberExpression',
      start: '*',
      end: '*',
      object: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      property: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'addDependency'
      },
      computed: false
    },
    arguments: [{
      type: 'Literal',
      start: '*',
      end: '*',
      value: '*',
      raw: '*'
    }, {
      type: 'ArrayExpression',
      start: '*',
      end: '*',
      elements: '*'
    }, {
      type: 'ArrayExpression',
      start: '*',
      end: '*',
      elements: '*'
    }]
  }
};


/**
 * Script constructor.
 * @param {Object} config Script properties.
 * @constructor
 */
var Script = exports.Script = function Script(config) {

  /**
   * Script path.  This is the absolute filesystem path to the script.
   * @type {string}
   */
  this.path = config.path;

  /**
   * Script source.
   * @type {string}
   */
  this.source = config.source;

  var ast;
  try {
    ast = acorn.parse(this.source, {
      ecmaVersion: 6
    });
  } catch (err) {
    var loc = err.loc;
    if (loc) {
      var lines = String(this.source).split(/\r\n|[\n\r\u2028\u2029]/);
      var line = lines[loc.line - 1].substring(0, loc.column + 4);
      var message = err.name + ': ' + err.message + '\n\n' +
          this.path + ':' + loc.line + '\n' +
          line + '\n' +
          (new Array(loc.column + 1)).join(' ') + '^';
      err.message = message;
      throw err;
    }
    throw err;
  }

  /**
   * AST
   * @type {Object}
   */
  this._ast = ast;

  /**
   * Adds dependencies.
   * @type {boolean}
   */
  this._addsDependencies = undefined;

  /**
   * Provides array.
   * @type {Array.<string>}
   */
  this._provides = null;

  /**
   * Requires array.
   * @type {Array.<string>}
   */
  this._requires = null;

};


/**
 * Determine if the script includes a call to goog.addDependency.
 * @return {boolean} The script includes a call to goog.addDependency.
 */
Script.prototype._getAddsDependencies = function() {
  return this._ast.body.some(function(statement) {
    return like(statement, addDependencyNode);
  });
};


Object.defineProperty(Script.prototype, 'addsDependencies', {
  enumerable: true,
  get: function() {
    if (this._addsDependencies === undefined) {
      this._addsDependencies = this._getAddsDependencies();
    }
    return this._addsDependencies;
  }
});


/**
 * Get provides.
 * @return {Array.<string>} List of arguments to goog.provide calls.
 */
Script.prototype._getProvides = function() {
  var base = false;
  var provides = this._ast.body.reduce(function(provides, statement) {
    if (like(statement, provideNode)) {
      provides.push(statement.expression.arguments[0].value);
    } else if (like(statement, googNode)) {
      base = true;
    }
    return provides;
  }, []);
  // special handling for goog base
  if (base) {
    if (provides.length > 0) {
      throw new Error('Base files should not provide namespaces.');
    }
    provides = ['goog'];
  }
  return provides;
};


Object.defineProperty(Script.prototype, 'provides', {
  enumerable: true,
  get: function() {
    if (!this._provides) {
      this._provides = this._getProvides();
    }
    return this._provides;
  }
});


/**
 * Get requires.
 * @return {Array.<string>} List of arguments to goog.require calls.
 */
Script.prototype._getRequires = function() {
  return this._ast.body.reduce(function(requires, statement) {
    if (like(statement, requireNode)) {
      requires.push(statement.expression.arguments[0].value);
    }
    return requires;
  }, []);
};


Object.defineProperty(Script.prototype, 'requires', {
  enumerable: true,
  get: function() {
    if (!this._requires) {
      this._requires = this._getRequires();
    }
    return this._requires;
  }
});


/**
 * Read a script from a file.
 * @param {string} filepath Path to file.
 * @param {function(Error, Script)} callback Callback.
 */
exports.read = function(filepath, callback) {
  filepath = path.resolve(filepath);
  fs.readFile(filepath, function(err, source) {
    if (err) {
      if (err.code === 'EISDIR') {
        err = new Error('Trouble reading script.  ' +
            'Expected a file name, got a directory name instead: ' +
            filepath);
      } else if (err.code === 'ENOENT') {
        err = new Error('Trouble reading script.  ' +
            'File not found: ' + filepath);
      }
      return callback(err);
    }
    var script;
    try {
      script = new Script({path: filepath, source: source});
    } catch (err2) {
      return callback(err2);
    }
    callback(null, script);
  });
};
