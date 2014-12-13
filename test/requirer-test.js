'use strict';

var _ = require('underscore');
var fs = require('fs');
var test = require('tape');

test('requirer', function(t) {

  var Requirer = require('../');

  t.test('Constructor when missing options', function(t) {
    /* jshint nonew: false */
    t.throws(function() { new Requirer(); }, /Requirer must have a "filename"/);
    t.end();
  });

  t.test('Constructor return instances with "new"', function(t) {
    t.ok((new Requirer('test/fixtures/module.js')) instanceof Requirer);
    t.end();
  });

  t.test('Constructor return instances without "new"', function(t) {
    t.ok(Requirer('test/fixtures/module.js') instanceof Requirer);
    t.end();
  });

  t.test('by default no "hotreplacement" in production', function(t) {
    process.env.NODE_ENV = 'production';
    var moduleModule = Requirer('test/fixtures/module.js');
    t.equal(moduleModule._hotreplacement, false);
    t.end();
  });

  t.test('by default have "hotreplacement" in non-production', function(t) {
    process.env.NODE_ENV = 'development';
    var moduleModule = Requirer('test/fixtures/module.js');
    t.equal(moduleModule._hotreplacement, true);
    t.end();
  });

  t.test('honor "hotreplacement" option in production', function(t) {
    process.env.NODE_ENV = 'production';
    var moduleModule;
    moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
    t.equal(moduleModule._hotreplacement, true);
    moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
    t.equal(moduleModule._hotreplacement, false);
    t.end();
  });

  t.test('honor "hotreplacement" option in non-production', function(t) {
    process.env.NODE_ENV = 'development';
    var moduleModule;
    moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
    t.equal(moduleModule._hotreplacement, true);
    moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
    t.equal(moduleModule._hotreplacement, false);
    t.end();
  });

  t.test('#load -> mtime', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js');
    moduleModule.load();
    t.ok(_.isNumber(moduleModule._mtime));
    t.end();
  });

  t.test('#load -> module', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js');
    moduleModule.load();
    t.ok(_.isObject(moduleModule._module));
    t.ok(_.isObject(moduleModule._module.exports));
    t.end();
  });

  t.test('exports()', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js');
    moduleModule.exports();
    t.ok(_.isObject(moduleModule._module));
    t.ok(_.isObject(moduleModule._module.exports));
    t.end();
  });

  t.test('with "hotreplacement" off exported should not change when nothing changed', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
    moduleModule.exports().newValue = 123;
    t.equal(moduleModule.exports().newValue, 123);
    t.end();
  });

  t.test('with "hotreplacement" off exported should not change when file changes', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
    moduleModule.exports().newValue = 123;
    var newTime = (Date.now() / 1000) + Math.floor( Math.random() * 100 );
    fs.utimesSync(moduleModule._filename, newTime, newTime);
    t.equal(moduleModule.exports().newValue, 123);
    t.end();
  });

  t.test('with "hotreplacement" on exported should not change when nothing changed', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
    moduleModule.exports().newValue = 123;
    t.equal(moduleModule.exports().newValue, 123);
    t.end();
  });

  t.test('with "hotreplacement" on exported should change when file changes', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
    moduleModule.exports().newValue = 123;
    var newTime = (Date.now() / 1000) + Math.floor( Math.random() * 100 );
    fs.utimesSync(moduleModule._filename, newTime, newTime);
    t.notEqual(moduleModule.exports().newValue, 123);
    t.end();
  });

  t.test('exported module should not have access to "require"', function(t) {
    var moduleModule = Requirer('test/fixtures/module.js');
    t.throws(moduleModule.exports().fs, /object is not a function/);
    t.end();
  });

  t.end();

});
