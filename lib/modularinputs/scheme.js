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
    var ET = require("elementtree");
    var utils = require("./utils");
    var Argument = require("./argument");

    /**
     * Class representing the metadata for a modular input kind.
     *
     * A `Scheme` specifies a title, description, several options of how Splunk 
     * should run modular inputs of this kind, and a set of arguments that define
     * a particular modular input's properties.
     * The primary use of `Scheme` is to abstract away the construction of XML
     * to feed to Splunk.
     *
     * @example
     *
     *      var s =  new Scheme();
     *
     *      var myFullScheme = new Scheme("fullScheme");
     *      myFullScheme.description = "This is how you set the other properties";
     *      myFullScheme.useExternalValidation = true;
     *      myFullScheme.useSingleInstance = false;
     *      myFullScheme.streamingMode = Scheme.streamingModeSimple;
     *
     * @param {String} The identifier for this Scheme in Splunk.
     * @class splunkjs.ModularInputs.Scheme
     */
    function Scheme(title) {
        this.title = utils.isUndefined(title) ? "" : title;

        // Set the defaults.
        this.description = null;
        this.useExternalValidation = true;
        this.useSingleInstance = false;
        this.streamingMode = Scheme.streamingModeXML;

        // List of Argument objects, each to be represented by an <arg> tag.
        this.args = [];
    }

    // Constant values, do not change.
    // These should be used for setting the value of a Scheme object's streamingMode field.
    Scheme.streamingModeSimple = "SIMPLE";
    Scheme.streamingModeXML = "XML";

    /**
     * Add the provided argument, `arg`, to the `this.arguments` Array.
     *
     * @param {Object} arg An Argument object to add to this Scheme's argument list.
     * @function splunkjs.ModularInputs.Scheme
     */
    Scheme.prototype.addArgument = function (arg) {
        if (arg) {
            this.args.push(arg);
        }
    };

    /**
     * Creates an elementtree Element representing this Scheme, then returns it.
     *
     * @return {Object} An elementtree Element object representing this Scheme.
     * @function splunkjs.ModularInputs.Scheme
     */
    Scheme.prototype.toXML = function () {
        var root = ET.Element("scheme");

        ET.SubElement(root, "title").text = this.title;

        if (this.description) {
            ET.SubElement(root, "description").text = this.description;
        }

        // Add all subelements to this <scheme>, represented by (tag, text).
        var subElements = [
            {tag: "use_external_validation", value: this.useExternalValidation},
            {tag: "use_single_instance", value: this.useSingleInstance},
            {tag: "streaming_mode", value: this.streamingMode}
        ];
        
        for (var i = 0; i < subElements.length; i++) {
            ET.SubElement(root, subElements[i].tag).text = subElements[i].value.toString().toLowerCase();
        }

        // Create an <endpoint> subelement in root, then an <args> subelement in endpoint.
        var argsElement = ET.SubElement(ET.SubElement(root, "endpoint"), "args");

        // Add arguments as subelements to <args>.
        for (var j = 0; j < this.args.length; j++) {
            this.args[j].addToDocument(argsElement);
        }

        return root;
    };
    
    module.exports = Scheme;
})();
