'use strict';

var _ = require('underscore');
var fs = require('fs');
var test = require('tape');

test('requirer', function(t) {

  var requirer = require('../');

  t.test('missing options', function(t) {
    /* jshint nonew: false */
    t.throws(function() { requirer(); }, /requirer: "filename" is required/);
    t.end();
  });

  t.test('instances', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    t.ok(modulePack instanceof requirer.Pack, 'is a Pack instance');
    t.equal(requirer('test/fixtures/module.js'), modulePack, 'is the same Pack instance');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('has', function(t) {
    var filename = 'test/fixtures/module.js';
    t.notOk(requirer.has(filename), 'does not have pack');
    var modulePack = requirer(filename);
    t.ok(requirer.has(filename), 'does have pack');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('dispose', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports();
    t.notOk(modulePack._disposed, 'fresh pack is not disposed');
    t.ok(requirer._cache[modulePack._filename], 'pack is in cache');
    requirer.dispose(modulePack);
    t.ok(modulePack._disposed, 'pack is disposed');
    t.notOk(requirer._cache[modulePack._filename], 'pack is not in cache');
    t.notOk(modulePack._mtime, 'cleaned up mtime');
    t.notOk(modulePack._module, 'cleaned up exports');
    t.end();
  });

  t.test('disabled "hotreload" in production', function(t) {
    process.env.NODE_ENV = 'production';
    var modulePack = requirer('test/fixtures/module.js');
    t.equal(modulePack._hotreload, false, 'disabled "hotreload" option');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('enabled "hotreload" in non-production', function(t) {
    process.env.NODE_ENV = 'development';
    var modulePack = requirer('test/fixtures/module.js');
    t.equal(modulePack._hotreload, true, 'enabled "hotreload" option');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('Pack#isFilename', function(t) {
    var filename = 'test/fixtures/module.js';
    var modulePack = requirer(filename);
    t.ok(modulePack.isFilename(filename), 'knows its name');
    t.notOk(modulePack.isFilename(filename + 'x'), 'knows what is not its name');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('Pack#setHotReload', function(t) {
    process.env.NODE_ENV = 'production';
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.setHotReload(false);
    t.equal(modulePack._hotreload, false, 'disabled "hotreload" option');
    modulePack.setHotReload(true);
    t.equal(modulePack._hotreload, true, 'enabled "hotreload" option');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('has "_mtime" after "exports()" when "hotreload" is enabled', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.setHotReload(true);
    modulePack.exports();
    t.ok(_.isNumber(modulePack._mtime), 'mtime is numeric');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('does not have "_mtime" after "exports()" when "hotreload" is disabled', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.setHotReload(false);
    modulePack.exports();
    t.notOk(_.isNumber(modulePack._mtime), 'mtime is not numeric');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('has "_module" after "exports()"', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports();
    t.ok(_.isObject(modulePack._module), '"_module" is object');
    t.ok(_.isObject(modulePack._module.exports), '"_module.exports" is object');
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('exported doesn’t change when "hotreload" is disabled', function(t) {
    process.env.NODE_ENV = 'production';
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports().newValue = 123;
    t.equal(modulePack.exports().newValue, 123);
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('exported doesn’t change even if the file changes when "hotreload" is disabled', function(t) {
    process.env.NODE_ENV = 'production';
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports().newValue = 123;
    var newTime = (Date.now() / 1000) + Math.floor(Math.random() * 100);
    fs.utimesSync(modulePack._filename, newTime, newTime);
    t.equal(modulePack.exports().newValue, 123);
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('exported doesn’t change when "hotreload" is enabled but the file did not change', function(t) {
    process.env.NODE_ENV = 'development';
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports().newValue = 123;
    t.equal(modulePack.exports().newValue, 123);
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('exported changes when "hotreload" is enabled and the file changed', function(t) {
    process.env.NODE_ENV = 'development';
    var modulePack = requirer('test/fixtures/module.js');
    modulePack.exports().newValue = 123;
    var newTime = (Date.now() / 1000) + Math.floor( Math.random() * 100 );
    fs.utimesSync(modulePack._filename, newTime, newTime);
    t.notEqual(modulePack.exports().newValue, 123);
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('exported module doesn’t not have access to "require"', function(t) {
    var modulePack = requirer('test/fixtures/module.js');
    t.throws(modulePack.exports().fs, /object is not a function/);
    requirer.dispose(modulePack);
    t.end();
  });

  t.test('can read json', function(t) {
    var jsonPack = requirer('test/fixtures/json.json');
    t.equal(jsonPack.exports().value, 567);
    requirer.dispose(jsonPack);
    t.end();
  });

  t.test('can read plain text', function(t) {
    var plainTextPack = requirer('test/fixtures/plain.txt');
    t.equal(plainTextPack.exports(), 'hello\n');
    requirer.dispose(plainTextPack);
    t.end();
  });

  t.end();
});
