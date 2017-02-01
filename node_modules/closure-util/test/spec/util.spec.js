var path = require('path');

var assert = require('../helper').assert;

var like = require('../../lib/util').like;
var globs = require('../../lib/util').globs;
var minimatches = require('../../lib/util').minimatches;

describe('like', function() {

  var node = {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        computed: false,
        object: {
          type: 'Identifier',
          name: 'foo'
        },
        property: {
          type: 'Identifier',
          name: 'bar'
        }
      },
      arguments: [{type: 'Literal', value: 'baz'}]
    }
  };

  it('tests to see if a node matches a template', function() {
    var pass = {
      type: 'ExpressionStatement',
      expression: '*'
    };
    var fail = {
      type: 'CallExpression',
      expression: '*'
    };
    assert.isTrue(like(node, pass));
    assert.isFalse(like(node, fail));
  });

  it('deep tests to see if a node matches a template', function() {
    var pass = {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: {
            type: 'Identifier',
            name: 'foo'
          },
          property: {
            type: 'Identifier',
            name: 'bar'
          }
        },
        arguments: [{type: 'Literal', value: '*'}]
      }
    };
    var fail = {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: {
            type: 'Identifier',
            name: 'foo'
          },
          property: {
            type: 'Identifier',
            name: 'bar'
          }
        },
        arguments: [{type: 'Literal', value: 'bam'}]
      }
    };
    assert.isTrue(like(node, pass));
    assert.isFalse(like(node, fail));
  });

  it('compares arrays', function() {
    assert.isTrue(like(['one', 'two'], ['one', 'two']));
    assert.isFalse(like(['one', 'two'], ['one', 'boo']));
    assert.isTrue(like(['one', 'two'], ['one', '*']));
    assert.isTrue(like(['one', 'two'], '*'));
  });

  it('compares objects', function() {
    assert.isTrue(like({foo: 'bar'}, {foo: 'bar'}));
    assert.isFalse(like({foo: 'bar'}, {foo: 'baz'}));
    assert.isFalse(like({foo: 'bar'}, {foo: 'bar', bam: 'baz'}));
    assert.isFalse(like({foo: 'bar', bam: 'baz'}, {foo: 'bar'}));
    assert.isTrue(like({foo: 'bar'}, {foo: '*'}));
    assert.isTrue(like({foo: 'bar'}, '*'));
  });

  it('compares objects with different key order', function() {
    assert.isTrue(like({foo: 'bar', baz: 'qux'}, {baz: 'qux', foo: 'bar'}));
  });

  it('compares number literals', function() {
    assert.isTrue(like(42, 42));
    assert.isFalse(like(42, 24));
    assert.isTrue(like(42, '*'));
  });

  it('compares string literals', function() {
    assert.isTrue(like('foo', 'foo'));
    assert.isFalse(like('foo', 'bar'));
    assert.isTrue(like('foo', '*'));
  });

  it('compares boolean literals', function() {
    assert.isTrue(like(true, true));
    assert.isTrue(like(false, false));
    assert.isFalse(like(true, false));
    assert.isFalse(like(false, true));
    assert.isFalse(like(true, 1));
    assert.isFalse(like(1, true));
    assert.isFalse(like(false, 0));
    assert.isFalse(like(0, false));
    assert.isFalse(like(true, 'foo'));
    assert.isTrue(like(true, '*'));
  });

});

var fixtures = path.join(__dirname, '..', 'fixtures');

describe('globs', function() {
  it('matches files based on patterns', function(done) {
    globs(path.join(fixtures, 'dependencies', '**/*.js'),
        function(err, result) {
          if (err) {
            return done(err);
          }
          assert.isArray(result);
          assert.lengthOf(result, 4);
          done();
        });
  });
});

describe('minimatches', function() {
  it('returns true if any pattern matches', function() {
    assert.isTrue(minimatches('foo.bar', ['baz', '*.bar']));
    assert.isTrue(minimatches('path/to/foo.bar', ['baz', '**/*.bar']));
  });

  it('returns false if no pattern matches', function() {
    assert.isFalse(minimatches('foo.bar', ['baz', '*.bam']));
    assert.isFalse(minimatches('path/to/foo.bar', ['baz', '*.bar']));
  });
});
