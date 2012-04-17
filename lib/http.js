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
    
    var Class           = require('./jquery.class').Class;
    var logger          = require('./log').Logger;
    var utils           = require('./utils');

    var root = exports || this;

    /**
     * Helper function to encode a dictionary of values into a URL-encoded
     * format.
     *
     * @example
     *      
     *      // should be a=1&b=2&b=3&b=4
     *      encode({a: 1, b: [2,3,4]})
     *
     * @param {Object} params Parameters to URL-encode
     * @return {String} URL-encoded query string
     *
     * @function splunkjs.Http
     */
    root.encode = function(params) {
        var encodedStr = "";

        // We loop over all the keys so we encode them.
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                // Only append the ampersand if we already have
                // something encoded, and the last character isn't
                // already an ampersand
                if (encodedStr && encodedStr[encodedStr.length - 1] !== "&") {
                    encodedStr = encodedStr + "&";
                }
                
                // Get the value
                var value = params[key];

                // If it's an array, we loop over each value
                // and encode it in the form &key=value[i]
                if (value instanceof Array) {
                    for (var i = 0; i < value.length; i++) {
                        encodedStr = encodedStr + key + "=" + encodeURIComponent(value[i]) + "&";
                    }
                }
                else if (typeof value === "object") {
                    for(var innerKey in value) {
                        if (value.hasOwnProperty(innerKey)) {
                            var innerValue = value[innerKey];
                            encodedStr = encodedStr + key + "=" + encodeURIComponent(value[innerKey]) + "&";
                        }
                    }
                }
                else {
                    // If it's not an array, we just encode it
                    encodedStr = encodedStr + key + "=" + encodeURIComponent(value);
                }
            }
        }

        if (encodedStr[encodedStr.length - 1] === '&') {
            encodedStr = encodedStr.substr(0, encodedStr.length - 1);
        }

        return encodedStr;
    };
     
    /**
     * Base class for HTTP abstraction. 
     *
     * This class provides the basic functionality (get/post/delete/request),
     * as well as utilities to construct uniform responses.
     *
     * Base classes should only override `makeRequest` and `parseJSON`
     *
     * @class splunkjs.Http
     */
    root.Http = Class.extend({
        /**
         * Constructor for splunkjs.Http
         *
         * @constructor
         * @param {Boolean} isSplunk Whether or not this is HTTP instance is for talking with splunkjs.
         * @return {splunkjs.Http} A splunkjs.Http instance
         *
         * @method splunkjs.Http 
         */
        init: function(isSplunk) {
            // Whether or not this HTTP provider is talking to Splunk or not
            this.isSplunk = (isSplunk === undefined ? true : isSplunk);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);
        },

        /**
         * Perform a POST request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Body parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Http 
         */
        get: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + root.encode(params);
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        /**
         * Perform a POST request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Body parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Http 
         */
        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                body: root.encode(params)
            };

            return this.request(url, message, callback);
        },

        /**
         * Perform a DELETE request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Query parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Http 
         */
        del: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + root.encode(params);
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        /**
         * Perform a request
         *
         * This function sets up everything to handle the response from a request,
         * but delegates the actual calling to the subclass using `makeRequest`.
         *
         * @param {String} url URL to request (already encoded)
         * @param {Object} message Object with values for method, headers, timeout and encoded body
         * @param {Function} Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Http 
         * @see makeRequest
         */
        request: function(url, message, callback) {
            var wrappedCallback = function(response) {
                callback = callback || function() {};

                if (response.status < 400 && response.status !== "abort") {
                    callback(null, response);
                }
                else {
                    callback(response);
                }
            };

            // Now we can invoke the user-provided HTTP class,
            // passing in our "wrapped" callback
            return this.makeRequest(url, message, wrappedCallback);
        },

        /**
         * Client-specific request logic
         *
         * This function encapsulates the actual logic for performing
         * a request, and is meant to be overriden by subclasses.
         *
         * @param {String} url URL to request (already encoded)
         * @param {Object} message Object with values for method, headers, timeout and encoded body
         * @param {Function} Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Http 
         */
        makeRequest: function(url, message, callback) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED"); 
        },

        /**
         * Client-specific JSON parsing logic
         *
         * This function encapsulates the actual logic for parsing
         * the JSON response.
         *
         * @param {String} json JSON to parse
         * @returns {Object} Parsed JSON
         *
         * @method splunkjs.Http 
         */
        parseJson: function(json) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Construct a unified response
         *
         * This function will generate a unified response given the
         * parameters
         *
         * @param {Object} error Error object if there was one for the request
         * @param {Object} response The actual response object
         * @param {Object} data The response data
         * @return {Object} A unified response object
         *
         * @method splunkjs.Http 
         */
        _buildResponse: function(error, response, data) {            
            var complete_response, json = {};

            var contentType = null;
            if (response && response.headers) {
                contentType = utils.trim(response.headers["content-type"] || response.headers["Content-Type"]);
            }

            if (utils.startsWith(contentType, "application/json")) {
                json = this.parseJson(data) || {};
            }

            logger.printMessages(json.messages);                
            
            complete_response = {
                response: response,
                status: (response ? response.statusCode : 0),
                data: json,
                error: error
            };

            return complete_response;
        }
    });
})();