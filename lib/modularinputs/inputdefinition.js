/*!*/
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
    var ET      = require("elementtree");
    var utils   = require("./utils");

    /**
     * `InputDefinition` encodes the XML defining inputs that Splunk passes to
     * a modular input script.
     *
     * @example
     *
     *      var i =  new InputDefinition();
     *
     * @class splunkjs.ModularInputs.InputDefinition
     */
    function InputDefinition() {
        this.metadata = {};
        this.inputs = {};
    }

    /**
     * Parse a string containing XML into an `InputDefinition`.
     *
     * This function will throw an exception if `str`
     * contains unexpected XML.
     *
     * The XML typically will look like this:
     * 
     * `<input>`
     *   `<server_host>tiny</server_host>`
     *   `<server_uri>https://127.0.0.1:8089</server_uri>`
     *   `<checkpoint_dir>/opt/splunk/var/lib/splunk/modinputs</checkpoint_dir>`
     *   `<session_key>123102983109283019283</session_key>`
     *   `<configuration>`
     *     `<stanza name="foobar://aaa">`
     *       `<param name="param1">value1</param>`
     *       `<param name="param2">value2</param>`
     *       `<param name="disabled">0</param>`
     *       `<param name="index">default</param>`
     *     `</stanza>`
     *     `<stanza name="foobar://bbb">`
     *       `<param name="param1">value11</param>`
     *       `<param name="param2">value22</param>`
     *       `<param name="disabled">0</param>`
     *       `<param name="index">default</param>`
     *       `<param_list name="multiValue">`
     *         `<value>value1</value>`
     *         `<value>value2</value>`
     *       `</param_list>`
     *       `<param_list name="multiValue2">`
     *         `<value>value3</value>`
     *         `<value>value4</value>`
     *       `</param_list>`
     *     `</stanza>`
     *   `</configuration>`
     * `</input>`
     *
     * @param {String} str A string containing XML to parse.
     * @return {Object} An InputDefiniion object.
     * @function splunkjs.ModularInputs.InputDefinition
     */
    InputDefinition.parse = function(str) {
        var definition = new InputDefinition();
        var rootChildren = ET.parse(str).getroot().getchildren();
        for (var i = 0; i < rootChildren.length; i++) {
            var node = rootChildren[i];
            if (node.tag === "configuration") {
                definition.inputs = utils.parseXMLData(node, "stanza");
            }
            else {
                definition.metadata[node.tag] = node.text;
            }
        }
        return definition;
    };

    module.exports = InputDefinition;
})();