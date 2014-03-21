
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

var utils = require('../utils'); // Get all of the existing utils

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
 * @param {node} an object representing `<configuration>`.
 * @param {callback} a callback function.
 *
 */
utils.parseParameters = function (node, callback) {
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
        // Call the callback with an error if an unexpected tag is found
        else {
            callback("Invalid configuration scheme, " + node + " tag unexpected.");
        }
    });
    callback(null, params);
};

// TODO: verify that this is a legitimate way of doing a deep equals
/**
 * Compare 2 objects for deep equality.
 *
 *
 * @param {actual} an object.
 * @param {expected} another object.
 *
 */
utils.deepEquals = function (actual, expected) {
    var a = [], b = [];
    utils.forEach(actual, function (elem, key, obj) {
        a.push(key);
        a.push(elem);
    });
    utils.forEach(expected, function (elem, key, obj) {
        b.push(key);
        b.push(elem);
    });

    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }

    var areEqual = true;
    a = a.sort();
    b = b.sort();
    utils.forEach(actual, function (elem, i, obj) {
        if (a[i] !== b[i]) {
            areEqual =  false;
        }
    });
    return areEqual;
};

module.exports = utils;