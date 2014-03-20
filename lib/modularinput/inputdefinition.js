
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

(function() {
    var parser = require("xml2js");
    var utils = require("./utils");

    /**
     * `InputDefinition` encodes the XML defining inputs that Splunk passes to
     * a modular input script.
     *
     * @example
     *
     *      var i =  new InputDefinition();
     *
     * @class splunkjs.modularinput.InputDefinition
     */
    function InputDefinition(object) {
        this.metadata = {};
        this.inputs = {};
    }

    InputDefinition.prototype.equals = function(other) {
        return (JSON.stringify(other.metadata) === JSON.stringify(this.metadata) &&
            JSON.stringify(other.inputs) === JSON.stringify(this.inputs));
    };

    /**
     * Parse a stream containing XML into an `InputDefinition`.
     *
     * @param {stream} stream containing XML to parse.
     * @return {Object} An `InputDefinition`.
     *
     * @class splunkjs.modularinput.InputDefinition
     */
    InputDefinition.parse = function(stream) {
        var definition = new InputDefinition();

        parser.parseString(stream, function(err, result) {
            
            if (err) {
                throw new Error("Invalid input definition", err);
            }

            var root = result["input"];
            for (var node in root) {
                // Skip the schema attributes
                if (node === "$") {
                    continue;
                }
                // There should only be one configuration node
                else if (node === "configuration") {
                    var configuration = root[node][0];
                    if (typeof configuration === "string") {
                        // No inputs
                        continue;
                    }
                    else {
                        var stanzas = configuration.stanza;
                        for (var stanza in stanzas) {
                            var input = stanzas[stanza];
                            var inputName = input["$"].name;
                            definition.inputs[inputName] = utils.parseParameters(input);
                        }
                    }
                }
                else {
                    // Store anything else in metadata
                    definition.metadata[node] = root[node][0];
                }
            }
        });
        return definition;
    };

    module.exports = InputDefinition;
})();