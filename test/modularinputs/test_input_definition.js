
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

var assert = require("assert");

const { Logger } = require("../../lib/log");
var splunkjs = require('../../index');

exports.setup = function () {
    var ModularInputs = splunkjs.ModularInputs;
    var InputDefinition = ModularInputs.InputDefinition;
    var utils = ModularInputs.utils;

    splunkjs.Logger.setLevel("ALL");

    return {
        "Input Definition tests": {
            beforeEach: function (done) {
                done();
            },

            "Parse produces expected result - no inputs": function (done) {
                var expected = new InputDefinition();
                expected.metadata = {
                    "server_host": "tiny",
                    "server_uri": "https://127.0.0.1:8089",
                    "checkpoint_dir": "/some/dir",
                    "session_key": "123102983109283019283"
                };

                try {
                    var found = InputDefinition.parse(utils.readFile(__filename, "../data/conf_with_0_inputs.xml"));

                    assert.equal(found.metadata["server_host"], expected.metadata["server_host"]);
                    assert.equal(found.metadata["server_uri"], expected.metadata["server_uri"]);
                    assert.equal(found.metadata["checkpoint_dir"], expected.metadata["checkpoint_dir"]);
                    assert.equal(found.metadata["session_key"], expected.metadata["session_key"]);
                    assert.deepEqual(found, expected);
                }
                catch (e) {
                    Logger.info(JSON.stringify(e));
                    assert.ok(false);
                }
                done();
            },

            "Parse produces expected result - 2 inputs": function (done) {
                var expected = new InputDefinition();
                expected.metadata = {
                    "server_host": "tiny",
                    "server_uri": "https://127.0.0.1:8089",
                    "checkpoint_dir": "/some/dir",
                    "session_key": "123102983109283019283"
                };
                expected.inputs["foobar://aaa"] = {
                    "param1": "value1",
                    "param2": "value2",
                    "disabled": "0",
                    "index": "default"
                };
                expected.inputs["foobar://bbb"] = {
                    "param1": "value11",
                    "param2": "value22",
                    "disabled": "0",
                    "index": "default",
                    "multiValue": ["value1", "value2"],
                    "multiValue2": ["value3", "value4"]
                };

                try {
                    var found = InputDefinition.parse(utils.readFile(__filename, "../data/conf_with_2_inputs.xml"));

                    assert.equal(found.metadata["server_host"], expected.metadata["server_host"]);
                    assert.equal(found.metadata["server_uri"], expected.metadata["server_uri"]);
                    assert.equal(found.metadata["checkpoint_dir"], expected.metadata["checkpoint_dir"]);
                    assert.equal(found.metadata["session_key"], expected.metadata["session_key"]);

                    assert.deepEqual(found.inputs["foobar://bbb"], expected.inputs["foobar://bbb"]);
                    assert.equal(found.inputs["foobar://bbb"]["param1"], expected.inputs["foobar://bbb"]["param1"]);
                    assert.equal(found.inputs["foobar://bbb"]["param2"], expected.inputs["foobar://bbb"]["param2"]);
                    assert.equal(found.inputs["foobar://bbb"]["disabled"], expected.inputs["foobar://bbb"]["disabled"]);
                    assert.equal(found.inputs["foobar://bbb"]["index"], expected.inputs["foobar://bbb"]["index"]);

                    assert.deepEqual(found.inputs["foobar://bbb"], expected.inputs["foobar://bbb"]);
                    assert.equal(found.inputs["foobar://bbb"]["param1"], expected.inputs["foobar://bbb"]["param1"]);
                    assert.equal(found.inputs["foobar://bbb"]["param2"], expected.inputs["foobar://bbb"]["param2"]);
                    assert.equal(found.inputs["foobar://bbb"]["disabled"], expected.inputs["foobar://bbb"]["disabled"]);
                    assert.equal(found.inputs["foobar://bbb"]["index"], expected.inputs["foobar://bbb"]["index"]);
                    assert.deepEqual(found.inputs["foobar://bbb"]["multiValue"], expected.inputs["foobar://bbb"]["multiValue"]);
                    assert.equal(found.inputs["foobar://bbb"]["multiValue"][0], expected.inputs["foobar://bbb"]["multiValue"][0]);
                    assert.equal(found.inputs["foobar://bbb"]["multiValue"][1], expected.inputs["foobar://bbb"]["multiValue"][1]);
                    assert.deepEqual(found.inputs["foobar://bbb"]["multiValue2"], expected.inputs["foobar://bbb"]["multiValue2"]);
                    assert.equal(found.inputs["foobar://bbb"]["multiValue2"][0], expected.inputs["foobar://bbb"]["multiValue2"][0]);
                    assert.equal(found.inputs["foobar://bbb"]["multiValue2"][1], expected.inputs["foobar://bbb"]["multiValue2"][1]);

                    assert.deepEqual(found, expected);
                }
                catch (e) {
                    assert.ok(false);
                }
                done();
            },

            "Parse throws an error with malformed input definition": function (done) {
                try {
                    InputDefinition.parse(utils.readFile(__filename, "../data/conf_with_invalid_inputs.xml"));
                    assert.ok(false);
                }
                catch (e) {
                    assert.ok(true);
                }
                done();
            }
        }
    };
};