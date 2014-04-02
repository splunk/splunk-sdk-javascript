
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
            throw new Error("Invalid configuration scheme, <" + key + "> tag unexpected.");
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

/**
* TODO: docstrings, also this looks really ugly
* @param {Object} a parsed object 
* @param {Object}
*/
/* TODO: remove completely
utils.compareSchemes = function (expected, found) {
    if (!expected.hasOwnProperty("scheme") || !found.hasOwnProperty("scheme")) {
        return false;
    }
    var args = ["title", "use_external_validation", "use_single_instance", "streaming_mode"];
    var areEqual = true;
    utils.forEach(args, function (elem, index, object) {
        if (!areEqual) {
            // We already know they're not equal
            return;
        }
        else {
            areEqual = expected.scheme[elem][0] === found.scheme[elem][0];
        }
    });

    if (!areEqual) {
        return false;  
    }
    if (!expected.scheme.hasOwnProperty("endpoint") && !found.scheme.hasOwnProperty("endpoint")) {
        return false;
    }
    if (!expected.scheme["endpoint"][0].hasOwnProperty("args") && !found.scheme["endpoint"][0].hasOwnProperty("args")) {
        return false;
    }

    if (areEqual) {
        var expectedArgs = expected.scheme["endpoint"][0]["args"];
        var foundArgs = found.scheme["endpoint"][0]["args"];
        console.log(expectedArgs[0]["arg"]);
        console.log(foundArgs[0]);
        utils.forEach(expectedArgs, function (elem, index, object) {
            if (!areEqual) {
                // We already know they're not equal
                return;
            }
            if (typeof elem !== typeof foundArgs[index]) {
                areEqual = false;
                // TODO: fix this w/ args
                //console.log(typeof elem, elem);
                //console.log(typeof foundArgs[index], foundArgs[index]);
                return;
            }
            if (typeof elem === "string") {
                // Remove whitespace, then compare (this is most common with empty args nodes)
                areEqual = elem.replace(/\s/gm, "") === foundArgs[index].replace(/\s/gm, "");
                return;
            }
            else {
                //console.log(foundArgs[index]);
                // TODO: compare the individual arg
                utils.forEach(elem, function(argElem, argIndex, argObject) {
                    if (!areEqual) {
                        return;
                    }
                    else {
                        //console.log(argElem, argIndex);
                        //console.log(foundArgs[index]);
                        //areEqual = argElem[0], foundArgs[index][0];
                    }
                });
            }
        });
    }
    return areEqual;  // Assumed everything is equal at this point
};
*/

/** TODO: docstrings
*/
utils.XMLCompare = function(expected, found) {

    if (expected === found) {
        return true;
    }

    if (!utils.deepEquals(expected.items(), found.items())) {
        return false;
    }

    if (expected.len !== found.len) {
        return false;
    }

    // TODO: compare children

    // TODO: compare elements

    //TODO: remove
    return true;
};

module.exports = utils;