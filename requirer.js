/**
 * `requirer` lets you "require" modules without having them register
 * in `Module._cache` or have access to the `require` function. Also
 * works with ".json", treats ".html"/".tpl" as underscore templates,
 * and others as plain text.
 */

'use strict';

// TODO: Add method to set "hotreload"
// TODO: Handle symlinks

var _ = require('underscore');
var Module = require('module');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var reIsJs = /\.js$/;
var reIsJson = /\.json$/;
var reIsTemplate = /\.(html|tpl)$/;

function getMTime(/*string*/ path) {
  return fs.statSync(path).mtime.getTime();
}

function readFile(/*string*/ path) {
  var content = fs.readFileSync(path, 'utf8');
  // Remove byte order marker
  var clean = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  return clean;
}

function assertNotDisposed(/*Pack*/ pack) {
  assert(!pack._disposed, 'Attempting to use a disposed Pack');
}

function Pack(/*string*/ filename) /*Pack*/ {
  this._disposed = false;
  this._filename = filename;
  this._hotreload = process.env.NODE_ENV !== 'production';
  this._module = null;
  this._mtime = null;
}

Pack.prototype._load = function() {
  if (this._mtime === null) {
    this._mtime = getMTime(this._filename);
  } else if (this._hotreload) {
    var mtime = getMTime(this._filename);
    if (this._mtime !== mtime) {
      this._mtime = mtime;
      this._module = null;
    }
  }

  if (!this._module) {
    var source = readFile(this._filename);
    var _module = {exports: {}};

    if (reIsJs.test(this._filename)) {
      var wrapper = Module.wrap(source);
      var compiledWrapper = vm.runInThisContext(wrapper, this._filename);
      compiledWrapper.apply(_module.exports, [
        _module.exports,
        null /*require*/,
        _module,
        null /*__filename*/,
        null /*__dirname*/]);
    } else if (reIsJson.test(this._filename)) {
      _module.exports = JSON.parse(source);
    } else if (reIsTemplate.test(this._filename)) {
      _module.exports = _.template(source);
    } else {
      _module.exports = source;
    }

    this._module = _module;
  }

  return this;
};

Pack.prototype.reset = function() /*Pack*/ {
  assertNotDisposed(this);
  this._mtime = this._module = null;
  return this;
};

Pack.prototype.exports = function() /*object*/ {
  assertNotDisposed(this);
  return this._load()._module.exports;
};


function requirer(filename_) {
  assert(typeof filename_ === 'string', 'requirer: "filename" is required');
  var filename = path.resolve(filename_);
  if (!requirer._cache[filename]) {
    requirer._cache[filename] = new Pack(filename);
  }
  return requirer._cache[filename];
}

requirer.dispose = function(/*Pack*/ pack) {
  if (!pack) {
    return;
  }
  assertNotDisposed(pack);
  delete requirer._cache[pack._filename];
  pack._mtime = pack._module = pack._hotreload = null;
  pack._disposed = true;
};

requirer._cache = {};
requirer.Pack = Pack;

module.exports = requirer;
