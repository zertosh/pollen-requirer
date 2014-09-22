/**
 * Requirer lets you "require" modules without having them
 * register in Module._cache or have access to `require`.
 */

'use strict';

var Module = require('module');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var debug = require('debug')('requirer');

/**
 * @param {string} filename
 * @param {object} opts
 * @param {boolean=} opts.hotreplacement
 * @constructor
 */
function Requirer(filename, opts) {
  assert.ok(typeof filename === 'string', 'Requirer must have a "filename"');

  if (!(this instanceof Requirer)) {
    return new Requirer(filename, opts);
  }

  /**
   * @type {string}
   * @private
   */
  this._filename = path.resolve(process.cwd(), filename);

  /**
   * @type {boolean}
   * @private
   */
  this._hotreplacement = opts && ('hotreplacement' in opts)
      ? !!opts.hotreplacement : process.env.NODE_ENV !== 'production';

  /**
   * @type {?Object}
   * @private
   */
  this._module = null;

  /**
   * @type {?number}
   * @private
   */
  this._mtime = null;
}

/**
 * @return {number}
 * @private
 */
Requirer.prototype._readMTime = function() {
  if (debug.enabled) {
    debug('Reading mtime for %s', this._filename);
  }
  var stat = fs.statSync(this._filename);
  var mtime = stat.mtime.getTime();
  return mtime;
};

/**
 * @return {string}
 * @private
 */
var READ_FILE_OPTS = {encoding: 'utf8'};
Requirer.prototype._readSource = function() {
  if (debug.enabled) {
    debug('Reading source for %s', this._filename);
  }
  var source = fs.readFileSync(this._filename, READ_FILE_OPTS);
  return source;
};

/**
 * @return {?object}
 * @private
 */
Requirer.prototype._compile = function() {
  if (debug.enabled) {
    debug('Compiling %s', this._filename);
  }
  var source = this._readSource();
  var wrapper = Module.wrap(source);
  var compiledWrapper = vm.runInThisContext(wrapper, this._filename);
  var module_ = {exports: {}};
  var args = [
    module_.exports,
    null /*require*/,
    module_,
    null /*__filename*/,
    null /*__dirname*/];
  compiledWrapper.apply(module_.exports, args);
  return module_;
};

/**
 * Loads the module.
 * @return {Requirer}
 */
Requirer.prototype.load = function() {
  var currentMTime;
  if (this._hotreplacement) {
    currentMTime = this._readMTime();
    if (debug.enabled && this._mtime && (currentMTime !== this._mtime)) {
      debug('Hotreplacing %s', this._filename);
    }
    if (currentMTime !== this._mtime) {
      this.reset();
    }
  }
  if (!this._mtime) {
    this._mtime = currentMTime || this._readMTime();
  }
  if (!this._module) {
    this._module = this._compile();
  }
  return this;
};

/**
 * Removes the cached module and mtime.
 * @return {Requirer}
 */
Requirer.prototype.reset = function() {
  this._mtime = this._module = null;
  return this;
};

/**
 * @return {Object?}
 */
Requirer.prototype.exports = function() {
  return this.load()._module.exports;
};

module.exports = Requirer;
