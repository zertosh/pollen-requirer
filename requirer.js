/**
 * `requirer` lets you "require" modules without having them register
 * in `Module._cache` or have access to the `require` function. Also
 * works with ".json", treats ".jst"/".tpl" as underscore templates,
 * and others as plain text.
 */

'use strict';

var Module = require('module');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

function endsWith(str, suffix) {
  if (typeof str !== 'string' || typeof suffix !== 'string') {
    return false;
  }
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getMTime(/*string*/ path) /*number*/ {
  return fs.statSync(path).mtime.getTime();
}

function readFile(/*string*/ path) /*string*/ {
  var content = fs.readFileSync(path, 'utf8');
  // remove byte order marker
  var clean = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  return clean;
}

function assertNotDisposed(/*Pack*/ pack) {
  if (pack._disposed) {
    throw new Error('pollen-requirer: Attempting to use a disposed Pack');
  }
}

function load(pack) {
  if (pack._hotreload) {
    var mtime = getMTime(pack._filename);
    if (pack._mtime !== mtime) {
      pack._mtime = mtime;
      pack._module = null;
    }
  }

  if (!pack._module) {
    var source = readFile(pack._filename);
    var _module = {exports: null};

    if (endsWith(pack._filename, '.js')) {
      var wrapper = Module.wrap(source);
      var compiledWrapper = vm.runInThisContext(wrapper, pack._filename);
      _module.exports = {};
      compiledWrapper.apply(_module.exports, [
        _module.exports,
        null /*require*/,
        _module,
        null /*__filename*/,
        null /*__dirname*/]);
    } else if (endsWith(pack._filename, '.json')) {
      _module.exports = JSON.parse(source);
    } else {
      _module.exports = source;
    }

    pack._module = _module;
  }
}

function Pack(/*string*/ filename) /*Pack*/ {
  this._disposed = false;
  this._filename = filename;
  this._hotreload = process.env.NODE_ENV !== 'production';
  this._module = null;
  this._mtime = null;
}

Pack.prototype.exports = function() /*object*/ {
  assertNotDisposed(this);
  load(this);
  return this._module.exports;
};

Pack.prototype.isFilename = function(/*string*/ filename) /*bool*/ {
  assertNotDisposed(this);
  return filename ? this._filename === path.resolve(filename) : false;
};

Pack.prototype.reset = function() /*Pack*/ {
  assertNotDisposed(this);
  this._mtime = this._module = null;
  return this;
};

Pack.prototype.setHotReload = function(/*bool*/ hotreload) /*Pack*/ {
  assertNotDisposed(this);
  if (typeof hotreload !== 'boolean') {
    throw new Error('pollen-requirer: "hotreload" value is required');
  }
  this._hotreload = hotreload;
  return this;
};

function requirer(/*string*/ filename_) /*Pack*/ {
  if (typeof filename_ !== 'string') {
    throw new Error('pollen-requirer: "filename" is required');
  }
  var filename = path.resolve(filename_);
  if (!requirer._cache[filename]) {
    requirer._cache[filename] = new Pack(filename);
  }
  return requirer._cache[filename];
}

requirer.has = function(/*string*/ filename_) /*bool*/ {
  if (!filename_) {
    return false;
  }
  var filename = path.resolve(filename_);
  return !!requirer._cache[filename];
};

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
