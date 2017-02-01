goog.provide('basic.one');

goog.require('goog.asserts');
goog.require('goog.array');


/**
 * Constructor.
 * @param {Array.<number>} things Things.
 * @constructor
 */
basic.one.Class = function(things) {

  /**
   * @type {Array.<number>}
   * @private
   */
  this.things_ = things;

};


/**
 * Do something for each thing.
 * @param {function()} fn Function to be called with each thing.
 */
basic.one.Class.prototype.forEach = function(fn) {
  goog.asserts.assert(!goog.isNull(this.things_));
  goog.array.forEach(this.things_, fn);
};
