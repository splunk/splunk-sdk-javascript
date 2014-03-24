
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
var fs      = require('fs');
var path    = require('path');

/**
 * Parse the parameters from an `InputDefinition` or `ValidationDefinition`.
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
 * @param {Object} an object representing the `<configuration>` XML node.
 * @return {Object} an object representing the parameters of node passed in.
 */
utils.parseParameters = function (node) {
    var params = {};
    utils.forEach(node, function(elem, key, obj) {
        // Skip the attributes
        if (key === "$") {
            return;
        }
        // Get single value parameters
        else if (key === "param") {
            utils.forEach(node[key], function(singleValue) {
                if (singleValue) {
                    params[singleValue["$"].name] = singleValue["_"];
                }
            });
        }
        // Get multi-value parameters
        else if (key === "param_list") {
            utils.forEach(node[key], function(multiValue) {
                if (multiValue) {
                    params[multiValue["$"].name] = multiValue.value;
                }
            });
        }
        else {
            throw new Error("Invalid configuration scheme, " + node + " tag unexpected.");
        }
    });

    return params;
};

/**
 * Read files in a way that makes unit tests work also
 *
 * @example
 *
 *      // To read `splunk-sdk-javascript/tests/modularinput/data/validation.xml`  
 *      // from    `splunk-sdk-javascript/tests/modularinput/test_validation_definition.js`
 *      var fileContents = utils.readFile(__filename, "../data/validation.xml");
 *      
 * @param {String} __filename of the script calling this function.
 * @param {String} a path relative to the script calling this function.
 * @return {Object} The contents of the file.
 */
utils.readFile = function (filename, relativePath) {
    return fs.readFileSync(path.resolve(filename, relativePath));
};

module.exports = utils;