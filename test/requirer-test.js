/* jshint mocha: true */

'use strict';

var fs = require('fs');
var should = require('should');

describe('requirer', function() {

  var Requirer = require('../requirer');

  describe('Constructor', function() {
    it('should throw when missing options', function() {
      /* jshint nonew: false */
      (function() { new Requirer(); }
        .should.throw('Requirer must have a "filename"'));
    });
    it('should return instances with "new"', function() {
      (new Requirer('test/fixtures/module.js'))
        .should.be.instanceof(Requirer);
    });
    it('should return instances without "new"', function() {
      Requirer('test/fixtures/module.js')
        .should.be.instanceof(Requirer);
    });
  });

  describe('"options" get set', function() {
    var origNodeEnv = process.env.NODE_ENV;

    beforeEach(function() {
      process.env.NODE_ENV = origNodeEnv;
    });

    after(function() {
      process.env.NODE_ENV = origNodeEnv;
    });

    it('should by default not have "hotreplacement" in production', function() {
      process.env.NODE_ENV = 'production';
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule._hotreplacement.should.be.false;
    });

    it('should by default have "hotreplacement" in non-production', function() {
      process.env.NODE_ENV = 'whatever';
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule._hotreplacement.should.be.true;
    });

    it('should honor "hotreplacement" option in production', function() {
      process.env.NODE_ENV = 'production';
      var moduleModule;
      moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
      moduleModule._hotreplacement.should.be.true;
      moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
      moduleModule._hotreplacement.should.be.false;
    });

    it('should honor "hotreplacement" option in non-production', function() {
      process.env.NODE_ENV = 'whatever';
      Requirer('test/fixtures/module.js', { hotreplacement: true })._hotreplacement.should.be.true;
      Requirer('test/fixtures/module.js', { hotreplacement: false })._hotreplacement.should.be.false;
    });
  });

  describe('#load', function() {
    it('should have mtime', function() {
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule.load();
      moduleModule._mtime.should.be.a.Number;
    });
    it('should have module', function() {
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule.load();
      moduleModule._module.should.be.an.Object;
      moduleModule._module.exports.should.be.an.Object;
    });
    it('should have loaded with "exports()"', function() {
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule.exports();
      moduleModule._module.should.be.an.Object;
      moduleModule._module.exports.should.be.an.Object;
    });
  });

  describe('#load with "hotreplacement" off', function() {
    it('exported should not change when nothing changed', function() {
      var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
      moduleModule.exports().newValue = 123;
      moduleModule.exports().newValue.should.equal(123);
    });
    it('exported should not change when file changes', function() {
      var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: false });
      moduleModule.exports().newValue = 123;
      var newTime = (Date.now() / 1000) + Math.floor( Math.random() * 100 );
      fs.utimesSync(moduleModule._filename, newTime, newTime);
      moduleModule.exports().newValue.should.equal(123);
    });
  });

  describe('#load with "hotreplacement" off', function() {
    it('exported should not change when nothing changed', function() {
      var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
      moduleModule.exports().newValue = 123;
      moduleModule.exports().newValue.should.equal(123);
    });
    it('exported should change when file changes', function() {
      var moduleModule = Requirer('test/fixtures/module.js', { hotreplacement: true });
      moduleModule.exports().newValue = 123;
      var newTime = (Date.now() / 1000) + Math.floor( Math.random() * 100 );
      fs.utimesSync(moduleModule._filename, newTime, newTime);
      should(moduleModule.exports().newValue).not.equal(123);
    });
  });

  describe('module limitations', function() {
    it('exported should not have access to "require"', function() {
      var moduleModule = Requirer('test/fixtures/module.js');
      moduleModule.exports().fs.should.throw();
    });
  });

});
