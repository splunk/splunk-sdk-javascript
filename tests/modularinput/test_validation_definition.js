
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

    var splunkjs                = require('../../index');
    var modularinput            = splunkjs.ModularInput;
    var ValidationDefinition    = modularinput.ValidationDefinition;
    var fs                      = require("fs");
    var path                    = require("path");

    splunkjs.Logger.setLevel("ALL");
    return {

        "Validation Defintion tests": {
            setUp: function(done) {
                done();
            },

            "Parse produces expected result": function(test) {
                var expected = new ValidationDefinition();
                expected.metadata =  {
                    "server_host": "tiny",
                    "server_uri": "https://127.0.0.1:8089",
                    "checkpoint_dir": "/opt/splunk/var/lib/splunk/modinputs",
                    "session_key": "123102983109283019283",
                    "name": "aaa"
                };
                expected.parameters = {
                    "param1": "value1",
                    "param2": "value2",
                    "disabled": "0",
                    "index": "default",
                    "multiValue": ["value1", "value2"],
                    "multiValue2": ["value3", "value4"]
                };

                var found = ValidationDefinition.parse(fs.readFileSync(path.resolve(__filename, "../data/validation.xml")));
                test.ok(found.equals(expected));
                test.done();
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