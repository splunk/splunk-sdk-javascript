
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

var assert = require('chai').assert;

var splunkjs = require('../../index');

exports.setup = function () {
    var ModularInputs = splunkjs.ModularInputs;
    var ValidationDefinition = ModularInputs.ValidationDefinition;
    var utils = ModularInputs.utils;

    splunkjs.Logger.setLevel("ALL");

    return {
        "Validation Definition tests": {
            before: function (done) {
                done();
            },

            "Parse produces expected result": function (done) {
                try {
                    var found = ValidationDefinition.parse(utils.readFile(__filename, "../data/validation.xml"));

                    var expected = new ValidationDefinition();
                    expected.metadata = {
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

                    assert.deepEqual(found.metadata, expected.metadata);
                    assert.equal(found.metadata["server_host"], expected.metadata["server_host"]);
                    assert.equal(found.metadata["server_uri"], expected.metadata["server_uri"]);
                    assert.equal(found.metadata["checkpoint_dir"], expected.metadata["checkpoint_dir"]);
                    assert.equal(found.metadata["session_key"], expected.metadata["session_key"]);
                    assert.equal(found.metadata["name"], expected.metadata["name"]);

                    assert.deepEqual(found.parameters, expected.parameters);
                    assert.equal(found.parameters["param1"], expected.parameters["param1"]);
                    assert.equal(found.parameters["param2"], expected.parameters["param2"]);
                    assert.equal(found.parameters["disabled"], expected.parameters["disabled"]);
                    assert.equal(found.parameters["index"], expected.parameters["index"]);

                    assert.deepEqual(found.parameters["multiValue"], expected.parameters["multiValue"]);
                    assert.equal(found.parameters["multiValue"][0], expected.parameters["multiValue"][0]);
                    assert.equal(found.parameters["multiValue"][1], expected.parameters["multiValue"][1]);

                    assert.deepEqual(found.parameters["multiValue2"], expected.parameters["multiValue2"]);
                    assert.equal(found.parameters["multiValue2"][0], expected.parameters["multiValue2"][0]);
                    assert.equal(found.parameters["multiValue2"][1], expected.parameters["multiValue2"][1]);

                    assert.deepEqual(found, expected);
                }
                catch (e) {
                    assert.ok(!e, JSON.stringify(e));
                }

                done();
            }
        }
    };
};

// Run the individual test suite
if (module === require.cache[__filename] && !module.parent) {
    module.exports = exports.setup();
}
