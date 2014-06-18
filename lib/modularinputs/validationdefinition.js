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
     * This class represents the XML sent by Splunk for external validation of a
     * new modular input.
     *
     * @example
     *
     *      var v =  new ValidationDefinition();
     *
     * @class splunkjs.ModularInputs.ValidationDefinition
     */
    function ValidationDefinition() {
        this.metadata = {};
        this.parameters = {};
    }

    /**
     * Creates a `ValidationDefinition` from a provided string containing XML.
     *
     * This function will throw an exception if `str`
     * contains unexpected XML.
     *
     * The XML typically will look like this:
     * 
     * `<items>`
     * `   <server_host>myHost</server_host>`
     * `     <server_uri>https://127.0.0.1:8089</server_uri>`
     * `     <session_key>123102983109283019283</session_key>`
     * `     <checkpoint_dir>/opt/splunk/var/lib/splunk/modinputs</checkpoint_dir>`
     * `     <item name="myScheme">`
     * `       <param name="param1">value1</param>`
     * `       <param_list name="param2">`
     * `         <value>value2</value>`
     * `         <value>value3</value>`
     * `         <value>value4</value>`
     * `       </param_list>`
     * `     </item>`
     * `</items>`
     *
     * @param {String} str A string containing XML to parse.
     *
     * @function splunkjs.ModularInputs.ValidationDefinition
     */
    ValidationDefinition.parse = function(str) {
        var definition = new ValidationDefinition();
        var rootChildren = ET.parse(str).getroot().getchildren();

        for (var i = 0; i < rootChildren.length; i++) {
            var node = rootChildren[i];            
            if (node.tag === "item") {
                definition.metadata["name"] = node.get("name");
                definition.parameters = utils.parseXMLData(node, "");
            }
            else {
                definition.metadata[node.tag] = node.text;
            }
        }
        return definition;
    };
    
    module.exports = ValidationDefinition;
})();