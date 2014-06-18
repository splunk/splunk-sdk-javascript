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

    /**
     * Class representing an argument to a modular input kind.
     *
     * `Argument` is meant to be used with `Scheme` to generate an XML 
     * definition of the modular input kind that Splunk understands.
     *
     * `name` is the only required parameter for the constructor.
     *
     * @example
     *      
     *      // Example with minimal parameters
     *      var myArg1 = new Argument({name: "arg1"});
     *
     *      // Example with all parameters
     *      var myArg2 = new Argument({
     *          name: "arg1",
     *          description: "This an argument with lots of parameters",
     *          validation: "is_pos_int('some_name')",
     *          dataType: Argument.dataTypeNumber,
     *          requiredOnEdit: true,
     *          requiredOnCreate: true
     *      });
     *
     * @param {Object} argumentConfig An object containing at least the name property to configure this Argument
     * @class splunkjs.ModularInputs.Argument
     */
    function Argument(argumentConfig) {
        if (!argumentConfig) {
            argumentConfig = {};
        }

        this.name = utils.isUndefined(argumentConfig.name) ? "" : argumentConfig.name;
        this.description = utils.isUndefined(argumentConfig.description) ? null : argumentConfig.description;
        this.validation = utils.isUndefined(argumentConfig.validation) ? null : argumentConfig.validation;
        this.dataType = utils.isUndefined(argumentConfig.dataType) ? Argument.dataTypeString : argumentConfig.dataType;
        this.requiredOnEdit = utils.isUndefined(argumentConfig.requiredOnEdit) ? false : argumentConfig.requiredOnEdit;
        this.requiredOnCreate = utils.isUndefined(argumentConfig.requiredOnCreate) ? false : argumentConfig.requiredOnCreate;
    }

    // Constant values, do not change
    // These should be used for setting the value of an Argument object's dataType field.
    Argument.dataTypeBoolean = "BOOLEAN";
    Argument.dataTypeNumber = "NUMBER";
    Argument.dataTypeString = "STRING";

    /**
     * Adds an `Argument` object the passed in elementtree object.
     * 
     * Adds an <arg> subelement to the parent element, typically <args>,
     * and sets up its subelements with their respective text.
     *
     * @param {Object} parent An elementtree element object to be the parent of a new <arg> subelement
     * @return {Object} An elementtree element object representing this argument.
     * @function splunkjs.ModularInputs.Argument
     */
    Argument.prototype.addToDocument = function (parent) {
        var arg = ET.SubElement(parent, "arg");
        arg.set("name", this.name);

        if (this.description) {
            ET.SubElement(arg, "description").text = this.description;
        }

        if (this.validation) {
            ET.SubElement(arg, "validation").text = this.validation;
        }

        // Add all other subelements to this <arg>, represented by (tag, text)
        var subElements = [
            {tag: "data_type", value: this.dataType},
            {tag: "required_on_edit", value: this.requiredOnEdit},
            {tag: "required_on_create", value: this.requiredOnCreate}
        ];

        for (var i = 0; i < subElements.length; i++) {
            ET.SubElement(arg, subElements[i].tag).text = subElements[i].value.toString().toLowerCase();
        }

        return arg;
    }; 
    
    module.exports = Argument;
})();