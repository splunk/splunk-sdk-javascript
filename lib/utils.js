/*!*/
// Copyright 2011 Splunk, Inc.
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
    
    var root = exports || this;

    /**
     * Splunk.Utils
     * 
     * Various utility functions for the Splunk SDK
     *
     * @moduleRoot Splunk.Utils
     */

    /**
     * Bind a function to a specific object
     *
     * Example:
     *      
     *      var obj = {a: 1, b: function() { console.log(a); }};
     *      var bound = Splunk.Utils.bind(obj, obj.b);
     *      bound(); // should print 1
     *
     * @param {Object} me Object to bind to
     * @param {Function} fn Function to bind
     * @return {Function} The bound function
     *
     * @globals Splunk.Utils
     */
    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };
    
    /**
     * Strip a string of all leading and trailing whitespace.
     *
     * Example:
     *      
     *      var a = " aaa ";
     *      var b = Splunk.Utils.trim(a); //== "aaa"
     *
     * @param {String} str The string to trim
     * @return {String} The trimmed string
     *
     * @globals Splunk.Utils
     */
    root.trim = function(str) {
        if (String.prototype.trim) {
            return String.prototype.trim.call(str);
        }
        else {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');   
        }
    };
    
    /**
     * Whether an array contains a specific object
     *
     * Example:
     *      
     *      var a = ["a", "b', "c"];
     *      console.log(Splunk.Utils.indexOf(a, "b")) //== 1
     *      console.log(Splunk.Utils.indexOf(a, "d")) //== -1
     *
     * @param {Array} arr The array to search in
     * @param {Anything} search The thing to search for
     * @return {Number} The index of `search` or `-1` if it wasn't found
     *
     * @globals Splunk.Utils
     */
    root.indexOf = function(arr, search) {
        for(var i=0; i<arr.length; i++) {
            if (arr[i] === search) {
                return i;
            }
        }
        return -1;
    };

    /**
     * Whether an array contains a specific object
     *
     * Example:
     *      
     *      var a = {a: 3};
     *      var b = [{}, {c: 1}, {b: 1}, a];
     *      var contained = Splunk.Utils.contains(b, a); // should be tree
     *
     * @param {Array} arr Array to search
     * @param {Anything} obj Whether the array contains the element
     * @return {Boolean} Whether the array contains the element
     *
     * @globals Splunk.Utils
     */
    root.contains = function(arr, obj) {
        arr = arr || [];
        return (root.indexOf(arr, obj) >= 0);
    };

    /**
     * Whether a string starts with a specific prefix.
     *
     * Example:
     *      
     *      var starts = Splunk.Utils.startsWith("splunk-foo", "splunk-");
     *
     * @param {String} original String to search
     * @param {String} prefix Prefix to search with
     * @return {Boolean} Whether the string starts with the prefix
     *
     * @globals Splunk.Utils
     */
    root.startsWith = function(original, prefix) {
        var matches = original.match("^" + prefix);
        return matches && matches.length > 0 && matches[0] === prefix;  
    };

    /**
     * Whether a string ends with a specific suffix.
     *
     * Example:
     *      
     *      var ends = Splunk.Utils.endsWith("foo-splunk", "-splunk");
     *
     * @param {String} original String to search
     * @param {String} suffix Suffix to search with
     * @return {Boolean} Whether the string ends with the suffix
     *
     * @globals Splunk.Utils
     */
    root.endsWith = function(original, suffix) {
        var matches = original.match(suffix + "$");
        return matches && matches.length > 0 && matches[0] === suffix;  
    };
    
    var toString = Object.prototype.toString;
    
    /**
     * Convert an iterable to an array.
     *
     * Example:
     *      
     *      function() { 
     *          console.log(arguments instanceof Array); // false
     *          var arr = console.log(Splunk.Utils.toArray(arguments) instanceof Array); // true
     *      }
     *
     * @param {Arguments} iterable Iterable to conver to an array
     * @return {Array} The converted array
     *
     * @globals Splunk.Utils
     */
    root.toArray = function(iterable) {
        return Array.prototype.slice.call(iterable);
    };
    
    /**
     * Whether or not the argument is an array
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isArray(arguments)); // false
     *          console.log(Splunk.Utils.isArray([1,2,3])); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is an array
     * @return {Boolean} Whether or not the passed in parameter was an array
     *
     * @globals Splunk.Utils
     */
    root.isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    /**
     * Whether or not the argument is a function
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isFunction([1,2,3]); // false
     *          console.log(Splunk.Utils.isFunction(function() {})); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a function
     * @return {Boolean} Whether or not the passed in parameter was a function
     *
     * @globals Splunk.Utils
     */
    root.isFunction = function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    };

    /**
     * Whether or not the argument is a number
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isNumber(1); // true
     *          console.log(Splunk.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a number
     * @return {Boolean} Whether or not the passed in parameter was a number
     *
     * @globals Splunk.Utils
     */
    root.isNumber = function(obj) {
        return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
    };
    
    /**
     * Whether or not the argument is a string
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isNumber("abc"); // true
     *          console.log(Splunk.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a string
     * @return {Boolean} Whether or not the passed in parameter was a string
     *
     * @globals Splunk.Utils
     */
    root.isString = function(obj) {
        return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    };
})();