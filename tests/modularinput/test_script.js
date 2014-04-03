
// Copyright 2014 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

exports.setup = function() {

    var splunkjs        = require('../../index');
    var modularinput    = splunkjs.ModularInput;
    var Script          = modularinput.Script;
    var EventWriter     = modularinput.EventWriter;
    var utils           = modularinput.utils;
    var ET              = require("elementtree");

    splunkjs.Logger.setLevel("ALL");

    var TEST_SCRIPT_PATH = "__IGNORED_SCRIPT_PATH__";

    return {

        "Script tests": {
            setUp: function(done) {
                done();
            },

            "An error happens when a script has a null scheme": function(test) {
                // A script that returns a null scheme should generate no output on stdout
                // and an error on stderr saying that the scheme was null.

                var NewScript = new Script();
                
                NewScript.getScheme = function () {
                    return null;
                };
                NewScript.streamEvents = function () {
                    return; // not used
                }

                // TODO: make this work with streams
                
                var out = new Buffer(2048);
                var err = new Buffer(2048);
                var ew = new EventWriter(out, err);

                var inStream = new Buffer(2048);

                var args = [TEST_SCRIPT_PATH, "--scheme"];
                var returnValue = NewScript.runScript(args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);

                    // TODO: figure out how to check that the out buffer is empty
                    //var output = ew._out.toString("utf-8");
                    var error = ew._err.toString("utf-8", 0, 51);

                    //test.strictEqual("", output);
                    test.strictEqual(error, "FATAL Modular input script returned a null scheme.\n");
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var test        = require('../../contrib/nodeunit/test_reporter');

    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}