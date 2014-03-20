
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
     * This class represents the XML sent by Splunk for external validation of a
     * new modular input.
     *
     * @example
     *
     *      var v =  new ValidationDefinition();
     *
     * @class splunkjs.modularinput.ValidationDefinition
     */
    function ValidationDefinition(object) {
        this.metadata = {};
        this.parameters = {};
    }

    ValidationDefinition.prototype.equals = function(other) {
        return (JSON.stringify(other.metadata) === JSON.stringify(this.metadata) &&
            JSON.stringify(other.parameters) === JSON.stringify(this.parameters));
    };

    /**
     * Creates a `ValidationDefinition` from a provided stream containing XML.
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
     * @param {stream} stream containing XML to parse.
     * @return {Object} An `ValidationDefinition` object.
     *
     * @class splunkjs.modularinput.ValidationDefinition
     */
    ValidationDefinition.parse = function(stream) {
        var definition = new ValidationDefinition();
        parser.parseString(stream, function(err, result) {
            
            var root = result["items"];
            for (var node in root) {
                // Skip the schema attributes
                if (node === "$") {
                    continue;
                }
                // There should only be one item node
                else if (node === "item") {
                    var item = root[node][0];
                    definition.metadata.name = item["$"].name;
                    definition.parameters = utils.parseParameters(item);
                }
                else {
                    // Store anything else in metadata
                    definition.metadata[node] = root[node][0];
                }
            }
        });
        return definition;
    };
    
    module.exports = ValidationDefinition;
})();