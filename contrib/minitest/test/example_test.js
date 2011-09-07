#!/usr/bin/env node

var assert = require("assert");
var minitest = require("../lib/minitest");

// setup listeners
minitest.setupListeners();

// tests
minitest.context("Minitest.js", function () {
  this.assertion("it should succeed", function (test) {
    assert.ok(true);
    test.finished();
  });

  this.assertion("it should fail", function (test) {
    assert.ok(null);
    test.finished();
  });
  
  this.assertion("it should not be finished", function (test) {
    assert.ok(true);
  });
});
