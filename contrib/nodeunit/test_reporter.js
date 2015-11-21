/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 *
 * Modified by (2011) Itay Neeman (Splunk)
 *
 * This is a slight modification of the nested
 * test-reporter in nodeunit to only report tests at the end,
 * and also to run based on modules rather than files.
 *
 */

/**
 * Module dependencies
 */

var nodeunit = require('nodeunit'),
    utils = nodeunit.utils,
    fs = require('fs'),
    path = require('path'),
    AssertionError = nodeunit.assert.AssertionError;

/**
 * Reporter info string
 */

exports.info = "Splunk JS SDK Test Reporter";

/*!
 * Simple util module to track tests. Adds a process.exit hook to print
 * the undone tests.
 */
var track = {};

track.createTracker = function (on_exit) {
    var names = {};
    var tracker = {
        failed: 0,
        names: function () {
            var arr = [];
            for (var k in names) {
                if (names.hasOwnProperty(k)) {
                    arr.push(k);
                }
            }
            return arr;
        },
        unfinished: function () {
            return tracker.names().length;
        },
        put: function (testname) {
            names[testname] = testname;
        },
        remove: function (testname) {
            delete names[testname];
        }
    };

    process.on('exit', function() {
        on_exit = on_exit || exports.default_on_exit;
        on_exit(tracker);
    });

    return tracker;
};

track.default_on_exit = function (tracker) {
    if (tracker.unfinished()) {
        console.log('');
        console.log('Undone tests (or their setups/teardowns): ');
        var names = tracker.names();
        for (var i = 0; i < names.length; i += 1) {
            console.log(names[i]);
        }
        process.reallyExit(tracker.unfinished() || tracker.failed);
    }
    process.reallyExit(tracker.failed);

};

/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

exports.run = function (modules, options) {
    if (!options) {
        options = {
            "error_prefix":     "\u001B[31m",
            "error_suffix":     "\u001B[39m",
            "ok_prefix":        "\u001B[32m",
            "ok_suffix":        "\u001B[39m",
            "bold_prefix":      "\u001B[1m",
            "bold_suffix":      "\u001B[22m",
            "assertion_prefix": "\u001B[35m",
            "assertion_suffix": "\u001B[39m"
        }
    }

    var error = function (str) {
        return options.error_prefix + str + options.error_suffix;
    };
    var ok    = function (str) {
        return options.ok_prefix + str + options.ok_suffix;
    };
    var bold  = function (str) {
        return options.bold_prefix + str + options.bold_suffix;
    };
    var assertion_message = function (str) {
        return options.assertion_prefix + str + options.assertion_suffix;
    };

    var spaces_per_indent = options.spaces_per_indent || 4;

    var start = new Date().getTime();
    var tracker = track.createTracker(function (tracker) {
        var i, names;
        if (tracker.unfinished()) {
            console.log('');
            console.log(error(bold(
                'FAILURES: Undone tests (or their setups/teardowns): '
            )));
            names = tracker.names();
            for (i = 0; i < names.length; i += 1) {
                console.log('- ' + names[i]);
            }
            console.log('');
            console.log('To fix this, make sure all tests call test.done()');
            process.reallyExit(tracker.unfinished() || tracker.failed);
        }
        process.reallyExit(tracker.failed);
    });

    // Object to hold status of each 'part' of the testCase/name array,
    // i.e., whether this part has been printed yet.
    tracker.already_printed = {};

    var pass_text = function (txt) {
        // Print in bold green.
        return bold(ok(txt + " (pass)"));
    };

    var fail_text = function (txt) {
        return bold(error(txt + " (fail) ✖ "));
    };

    var status_text = function (txt, status) {
        if (status === 'pass') {
            return pass_text(txt);
        } else {
            return fail_text(txt);
        }
    };

    /**
     *  Slices an array, returns a string by joining the sliced elements.
     *  @example
     *   > name_slice(['TC1', 'TC1.1', 'mytest'], 1);
     *   "TC1,TC1.1"
     */
    var name_slice = function (name_arr, end_index) {
        return name_arr.slice(0, end_index + 1).join(",");
    };

    var indent = (function () {
        var txt = '';
        var i;
        for (i = 0; i < spaces_per_indent; i++) {
            txt += ' ';
        }
        return txt;
    }());

    // Indent once for each indent_level
    var add_indent = function (txt, indent_level) {
        var k;
        for (k = 0; k < indent_level; k++) {
            txt += indent;
        }
        return txt;
    };

    // If it's not the last element of the name_arr, it's a testCase.
    var is_testCase = function (name_arr, index) {
        return index === name_arr.length - 1 ? false : true;
    };

    var testCase_line = function (txt) {
        return txt + "\n";
    };

    /**
     * Prints (console.log) the nested test status line(s).
     *
     * @param {Array} name_arr - Array of name elements.
     * @param {String} status - either 'pass' or 'fail'.
     * @example
     *   > print_status(['TC1', 'TC1.1', 'mytest'], 'pass');
     *   TC1
     *      TC1.1
     *         mytest (pass)
     */
    var get_status = function (name_arr, status) {
        var txt = '';
        var _name_slice, part, i;
        for (i = 0; i < name_arr.length; i++) {
            _name_slice = name_slice(name_arr, i);
            part = name_arr[i];
            if (!tracker.already_printed[_name_slice]) {
                txt = add_indent(txt, i);
                if (is_testCase(name_arr, i)) {
                    txt += testCase_line(part);
                } else {
                    txt += status_text(part, status);
                }
                tracker.already_printed[_name_slice] = true;
            }
        }
        return txt;
    };

    var output = [];
    var addToOutput = function(str) {
        output.push(str);
    };

    var printAndAdd = function(str) {
        console.log(str);
        addToOutput(str);
    }

    nodeunit.runModules(modules, {
        testspec: options.testspec,
        moduleStart: function (name) {
            //output.push('\n' + bold(name));
        },
        testDone: function (name, assertions) {
            tracker.remove(name);


            if (!assertions.failures()) {
                addToOutput(get_status(name, 'pass'));
            } else {
                printAndAdd(get_status(name, 'fail'));
                tracker.failed++;
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        if (a.error instanceof AssertionError && a.message) {
                            printAndAdd(
                                'Assertion Message: ' +
                                    assertion_message(a.message));
                        }
                        printAndAdd(a.error.stack + '\n');
                    }
                });
            }
        },
        done: function (assertions, end) {
            // Print out all the queued output
            for(var i = 0; i < output.length; i++) {
                console.log(output[i]);
            }

            end = end || new Date().getTime();
            var duration = end - start;
            if (assertions.failures()) {
                console.log(
                    '\n' + bold(error('FAILURES: ')) + assertions.failures() +
                        '/' + assertions.length + ' assertions failed (' +
                        assertions.duration + 'ms)'
                );
            } else {
                console.log(
                    '\n' + bold(ok('OK: ')) + assertions.length +
                        ' assertions (' + assertions.duration + 'ms)'
                );
            }
        },
        testStart: function (name) {
            tracker.put(name);
        }
    });
};
