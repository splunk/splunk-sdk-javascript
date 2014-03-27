
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
        //TODO: fill this out
        this.title = typeof title !== "undefined" ? title : "";

        this.description = null;
        this.useExternalValidation = true;
        this.useSingleInstance = false;
        this.streamingMode = Scheme.streamingModeXML;

        // list of Argument objects, each to be represented by an <arg> tag
        this.args = [];
    }

    //TODO: add docstrings
    /**
     * Add the provided argument, `arg`, to the `this.args` Array.
     *
     * @class splunkjs.modularinput.Scheme
     */
    Scheme.addArgument = function (arg) {
        if (arg)
        {
            this.args.push(args);
        }
    };

    // Constant values, do not change
    // These should be used for setting the value of a Scheme object's streamingMode field.
    Scheme.streamingModeSimple = "SIMPLE";
    Scheme.streamingModeXML = "XML";
    
    module.exports = Scheme;
})();