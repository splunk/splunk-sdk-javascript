#!/usr/bin/env node

var assert = require("assert");
var minitest = require("../lib/minitest");

// setup listeners
minitest.setupListeners();

// tests
minitest.context("Namespacing", function () {
  this.setup(function () {
    this.user = {name: "Jakub"};
  });

  this.assertion("instance variable from setup() should exist in assertion", function () {
    assert.ok(this.user);
    this.finished();
  });

  var foobar = true;
  this.assertion("local variable from context of the current context should exist in assertion", function () {
    assert.ok(foobar);
    this.finished();
  });

  this.foobaz = true;
  this.assertion("instance variable from context of the current context should not exist in assertion", function () {
    assert.equal(undefined, this.foobaz);
    this.finished();
  });
});
