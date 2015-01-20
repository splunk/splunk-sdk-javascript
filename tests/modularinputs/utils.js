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
    "use strict";
    var Stream = require("readable-stream");
    var utils  = require("../../lib/utils"); // Grab the SDK utils
    var root = exports || this;

    root.getDuplexStream = function() {
        var duplex = new Stream.Duplex();
        duplex.data = "";
        duplex._write = function(chunk, enc, next) {
            this.data += chunk.toString();
            next();
        };
        duplex._read = function() {
            return this.data;
        };
        return duplex;
    };

    root.getReadableStream = function() {
        var readable = new Stream.Readable();
        readable.data = "";
        readable._read = function() {
            return this.data;
        };
        return readable;
    };

    /**
     * Takes an array of objects, and sorts the array by the values of each
     * object at the specified key.
     *
     * @param {Array} an array of objects.
     * @param {String} the key to sort by.
     * @return {Boolean} true if they are equal, else false 
     */
    root.sortByKey = function(array, key) {
        return array.sort(function(a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    };

    /**
     * Takes two XML documents represented by `Elementtree` objects and 
     * checks whether their children are equal.
     *
     * @param {Object} an `Elementtree` object.
     * @param {Object} an `Elementtree` object.
     * @return {Boolean} true if their children are equal, else false 
     */
    root.XMLCompareChildren = function(expected, found) {
        if (expected.len !== found.len) {
            return false;
        }

        // If there's no children to compare, we're done
        if (!expected._children && !found._children) {
            return true;
        }

        var expectedChildren = expected.getchildren().sort();
        var foundChildren = found.getchildren().sort();

        // Check if all of expected's children are equal to all of found's children
        for (var i = 0; i < expectedChildren.length; i++) {
            if (!root.XMLCompare(expectedChildren[i], foundChildren[i])) {
                return false;
            }
        }

        return true;
    };

    /**
     * Takes two XML documents represented by `Elementtree` objects and 
     * checks whether they are equal.
     *
     * @param {Object} an `Elementtree` object.
     * @param {Object} an `Elementtree` object.
     * @return {Boolean} true if they are equal, else false 
     */
    root.XMLCompare = function(expected, found) {
        // They're equal if they're the same.
        if (expected === found) {
            return true;
        }

        // Compare the attributes.
        if (typeof expected.items !== typeof found.items) {
            return false;
        }
        if (found.items && expected.items) {
            var expectedItems = expected.items().sort();
            var foundItems = expected.items().sort();

            if (expectedItems.length !== foundItems.length) {
                return false;    
            }
            else {
                for (var i = 0; i < foundItems.length; i++) {
                    if (foundItems[i] && expectedItems[i]) {
                        var f = foundItems[i];
                        var e = expectedItems[i];
                        
                        for (var j = 0; j < e.length; j++) {
                            if (f[j] !== e[j]) {
                                return false;
                            }
                        }
                    }
                    else {
                        return false;
                    }
                }
            }
        }

        // Compare their children
        if (!root.XMLCompareChildren(expected, found)) {
            return false;
        }

        // Compare the root level elements.
        if (!expected.text || utils.trim(expected.text) === "" &&
            !found.text || utils.trim(found.text) === "") {
            return true;
        }
        else {
            return (expected.tag === found.tag && expected.text === found.text);
        }
    };
})();