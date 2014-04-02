
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
     * should run modular inputs of this kind, and a set of arguments which define
     * a particular modular input's properties.
     * The primary use of `Scheme` is to abstract away the construction of XML
     * to feed to Splunk.
     *
     * @example
     *
     *      var s =  new Scheme();
     *
     * @class splunkjs.modularinput.Scheme
     */
     //TODO: add param docstring
    function Scheme(title) {
        // TODO: should we throw an error if no title is passed in?
        this.title = typeof title !== "undefined" ? title : "";
        this.description = null;
        this.useExternalValidation = true;
        this.useSingleInstance = false;
        this.streamingMode = Scheme.streamingModeXML;

        // list of Argument objects, each to be represented by an <arg> tag
        this.arguments = [];
    }

    // Constant values, do not change
    // These should be used for setting the value of a Scheme object's streamingMode field.
    Scheme.streamingModeSimple = "SIMPLE";
    Scheme.streamingModeXML = "XML";

    //TODO: add docstrings, param
    /**
     * Add the provided argument, `arg`, to the `this.arguments` Array.
     *
     * @class splunkjs.modularinput.Scheme
     */
    Scheme.prototype.addArgument = function (arg) {
        if (arg)
        {
            this.arguments.push(arg);
        }
    };

    /** TODO: docstrings
    */
    Scheme.prototype.toXML = function () {
        var root = ET.Element("scheme");

        ET.SubElement(root, "title").text = this.title;

        if (this.description) {
            ET.SubElement(root, "description").text = this.description;
        }

        // Add all subelements to this <scheme>, represented by (tag, text)
        var subElements = [
            {tag: "use_external_validation", value: this.useExternalValidation},
            {tag: "use_single_instance", value: this.useSingleInstance},
            {tag: "streaming_mode", value: this.streamingMode}
        ];

        for (var i = 0; i < subElements.length; i++) {
            ET.SubElement(root, subElements[i].tag).text = subElements[i].value.toString().toLowerCase()
        }

        // Create an <endpoint> subelement in root, then an <args> subelement in endpoint
        var args = ET.SubElement(ET.SubElement(root, "endpoint"), "args");

        // Add arguments as subelements to <args>
        for (var i = 0; i < this.arguments.length; i++) {
            this.arguments[i].addToDocument(args);
        }

        return root;

        /*
        var writeMe = {};

        writeMe.title = [this.title];

        // Add the description if it's defined
        if (this.description) {
            writeMe.description = [this.description];
        }

        writeMe.use_external_validation = [this.useExternalValidation.toString().toLowerCase()];
        writeMe.use_single_instance = [this.useSingleInstance.toString().toLowerCase()];
        writeMe.streaming_mode = [this.streamingMode.toString().toLowerCase()];

        var args = [];

        for (var i = 0; i < this.args.length; i++) {
            // TODO: this might not be right
            //this.arguments[i].addToDocument();
            args.push(this.arguments[i].addToDocument());
        }

        // Make args an empty string if there aren't any args
        if (args.length === 0) {
            args[0] = "";
        }
        else {
            args["$"] = {"title": this.title};
        }

        writeMe.endpoint = [{"args": args}];

        return {"scheme": writeMe}; // Returns a JS object representing the XML for a Scheme
        */
    };
    
    module.exports = Scheme;
})();