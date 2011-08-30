var sys = require("sys");
var colours = require("./colours");
var fs = require('fs')
var util = require('util')
var assert = require('assert');

/* suite */
function Suite () {
  this.contexts = [];
};

Suite.prototype.report = function () {
  var suite = this;
  this.contexts.forEach(function(context, index) {
    console.log(context.contextHeader());
    context.report();
    if (suite.contexts.length === index) {
      console.log("");
    };
  });
};

Suite.prototype.register = function (context) {
  this.contexts.push(context);
};

Suite.prototype.run = function(context) {
  if (context) {
    assert.ok(this.contexts.indexOf(context) > -1);
    context.run();
  }
  else {
    this.contexts.forEach(function(context, index) {
      context.run();
    });
  }
}

// there is only one suite instance
var suite = exports.suite = new Suite();

/* context */
function Context (description, block) {
  this.tests = [];
  this.block = block;
  this.description = description;
  this.setupContextBlock = function(done) { done(); }
  this.teardownContextBlock = function(done) { done(); }
  this.setupTestBlock = function(done) { done(); }
  this.teardownTestBlock = function(done) { done(); }
};

Context.prototype.run = function () {
  var context = this;
  context.block.call(context);

  context.setupContextBlock.call(context, function() {
    context.tests.forEach(function(test) {
      test.run();
    })
  });
};

Context.prototype.register = function (test) {
  this.tests.push(test);
};

Context.prototype.report = function () {
  this.tests.forEach(function (test) {
    test.report();
  });
};

Context.prototype.assertion = function (description, block) {
  var test = new Test(this, description, block, this.setupTestBlock, this.teardownTestBlock);
  this.register(test);
};

Context.prototype.setupContext = function (block) {
  this.setupContextBlock = block;
};

Context.prototype.teardownContext = function(block) {
  this.teardownContextBlock = block;
}

Context.prototype.setupTest = function (block) {
  this.setupTestBlock = block;
};

Context.prototype.teardownTest = function(block) {
  this.teardownTestBlock = block;
}

/* test */
function Test (context, description, block, setupBlock, teardownBlock) {
  this.context = context;
  this.description = description;
  this.block = block;
  this.setupBlock = setupBlock;
  this.teardownBlock = teardownBlock;
  this.assert = setupAsserts(this);
};

Test.prototype.run = function () {
  var test = this;
  var runTest = function() {
    try {
      test.block.call(test, test);
    }
    catch (error) {
      test.failed(error);
    }
  };

  try {
    this.setupBlock.call(this, function() {
      runTest();
    });
  } catch(error) {
    this.failed(error);
  };
};

Test.prototype.finished = function () {
  var test = this;
  this.teardownBlock.call(this, function() {
    test.result = test.reportSuccess();
  });
};

Test.prototype.failed = function (error) {
  var test = this;
  this.teardownBlock.call(this, function() {
    test.result = test.reportError(error);
  });
};

Test.prototype.report = function () {
  if (this.result) {
    console.log(this.result);
  } else {
    console.log(this.reportNotFinished());
  };
};

/* output formatters */
Context.prototype.contextHeader = function () {
  return colours.bold.yellow + "[= " + this.description + " =]" + colours.reset;
};

Test.prototype.reportSuccess = function () {
  return colours.bold.green + "  ✔ OK: " + colours.reset + this.description;
};

Test.prototype.reportError = function (exception) {
  var error = exception.stack ? exception.stack : exception;
  var error = error.toString().replace(/^/, "    ");
  if (this.description) {
    return colours.bold.red + "  ✖ Error: " + colours.reset + this.description + "\n" + error;
  } else {
    return colours.bold.red + "  ✖ Error: " + colours.reset + "\n" + error;
  };
};

Test.prototype.reportNotFinished = function () {
  return colours.bold.magenta + "  ✖ Didn't finish: " + colours.reset + this.description;
};

/* DSL */
function context (description, block) {
  var context = new Context(description, block);
  suite.register(context);
};

/*
  Run an example and print if it was successful or not.

  @example
    minitest.context("setup()", function () {
      this.assertion("Default value should be 0", function (test) {
        assert.equal(value, 0);
        test.finished();
      });
    });
*/

function runAtExit () {
  process.addListener("exit", function () {
    console.log = patchedConsoleLog;
    suite.report();
    console.log = originalConsoleLog;
  });
};

function setupUncaughtExceptionListener () {
  // TODO: is there any way how to get the test instance,
  // so we could just set test.result, so everything would be
  // reported properly on the correct place, not in the middle of tests
  process.addListener("uncaughtException", function (error) {
    if (!error.__test) {
      console.log(Test.prototype.reportError(error));
    }
    else {
      var test = error.__test;
      test.failed(error);
    }
  });
};

var areListenersSetup = false;
function setupListeners () {
  if (!areListenersSetup) {
    setupUncaughtExceptionListener();
    runAtExit();
    areListenersSetup = true;
  }
};

/* Monkey patching */
if (!util.format) {
  var formatRegExp = /%[sdj%]/g;
  util.format = function(f) {
    if (typeof f !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        case '%%': return '%';
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof x !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  }
}

var consoleFlush = function(data) {
  if (!Buffer.isBuffer(data)) {
    data= new Buffer(''+ data);
  }
  
  if (data.length) {
    var written= 0;
    do {
      try {
        var len = data.length- written;
        written += fs.writeSync(process.stdout.fd, data, written, len, -1);
      }
      catch (e) {
      }
    } while(written < data.length);
  }
}

var originalConsoleLog = console.log;
var patchedConsoleLog = function() {
    var str = util.format.apply(null, arguments) + "\n";
    consoleFlush(str);
}

var setupAsserts = function(test) {
  var newAssert = {};
  for(var key in assert) {
    if (assert.hasOwnProperty(key) && key !== "AssertionError") {
      (function() {
        var keyName = key;
        newAssert[keyName] = function() {
          try {
            assert[keyName].apply(assert, arguments);
          }
          catch (err) {
            err.__test = test;
            throw err;
          }
        }
      })();
    }
  }

  return newAssert;
};

var run = function() {
  setupListeners();

  suite.run();
}

/* exports */
exports.Context = Context;
exports.Test = Test;
exports.context = context;
exports.runAtExit = runAtExit;
exports.setupUncaughtExceptionListener = setupUncaughtExceptionListener;
exports.setupListeners = setupListeners;
exports.run = run;