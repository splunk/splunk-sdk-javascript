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

var utils   = require('../utils'); // Get all of the existing utils

/**
 * Parse the parameters from an `InputDefinition` or `ValidationDefinition`.
 *
 * This is a helper function for `parseXMLData`.
 *
 * The XML typically will look like this:
 * 
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
 *
 * @param {Object} an `Elementree` object representing the `<configuration>` XML node.
 * @return {Object} an `Elementree` object representing the parameters of node passed in.
 */
utils.parseParameters = function(paramNode) {
    switch (paramNode.tag) {
        case "param":
            return paramNode.text;
        case "param_list":
            var parameters = [];
            var paramChildren = paramNode.getchildren();
            for (var i = 0; i < paramChildren.length; i++) {
                var mvp = paramChildren[i];
                parameters.push(mvp.text);
            }
            return parameters;
        default:
            throw new Error("Invalid configuration scheme, <" + paramNode.tag + "> tag unexpected.");
    }
};

/**
 * Parses the parameters from `Elementtree` representations of XML for
 * `InputDefinition` and `ValidationDefinition` objects.
 *
 * @param {Object} a parent `Elementtree` element object.
 * @param {String} the name of the child element to parse parameters from.
 * @return {Object} an object of the parameters parsed.
 */
utils.parseXMLData = function(parentNode, childNodeTag) {
    var data = {};
    var children = parentNode.getchildren();
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.tag === childNodeTag) {
            if (childNodeTag === "stanza") {
                data[child.get("name")] = {};
                var stanzaChildren = child.getchildren();
                for (var p = 0; p < stanzaChildren.length; p++) {
                    var param = stanzaChildren[p];
                    data[child.get("name")][param.get("name")] = utils.parseParameters(param);
                }
            }
        }
        else if ("item" === parentNode.tag) {
            data[child.get("name")] = utils.parseParameters(child);
        }
    }
    return data;
};

module.exports = utils;
