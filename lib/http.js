/*!*/
// Copyright 2012 Splunk, Inc.
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
    var CookieHandler   = require('cookie');

    var root = exports || this;
    var Http = null;

    var queryBuilderMap = {
        "5": function(message) {
            var query = message.query || {};
            var post = message.post || {};
            var outputMode = query.output_mode || post.output_mode || "json";

            query.output_mode = outputMode;

            return query;
        },
        "4": function(message) {
            return message.query || {};
        },
        "default": function(message) {
            return queryBuilderMap["5"](message);
        },
        "none": function(message) {
            return message.query || {};
        }
    };

    /**
     * A base class for HTTP abstraction that provides the basic functionality
     * for performing GET, POST, DELETE, and REQUEST operations, and provides
     * utilities to construct uniform responses.
     *
     * Base classes should only override `makeRequest` and `parseJSON`.
     *
     * @class splunkjs.Http
     */
    module.exports = root = Http = Class.extend({
        /**
         * Constructor for `splunkjs.Http`.
         *
         * @constructor
         * @return {splunkjs.Http} A new `splunkjs.Http` instance.
         *
         * @method splunkjs.Http
         */
        init: function() {

            // We perform the bindings so that every function works properly
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);

            // Set our default version to "none"
            this._setSplunkVersion("none");

            // Cookie store for cookie based authentication.
            this._cookieStore = {};
        },

        /*!*/
        _setSplunkVersion: function(version) {
            this.version = version;
        },

        /**
         * Returns all cookies formatted as a string to be put into the Cookie Header.
         */
        _getCookieString: function() {
            let cookieString = "";

            utils.forEach(this._cookieStore, function (cookieValue, cookieKey) {
                cookieString += cookieKey;
                cookieString += '=';
                cookieString += cookieValue;
                cookieString += '; ';
            });

            return cookieString;

        },

        /**
         * Takes a cookie header and returns an object of form { key: $cookieKey value: $cookieValue }
         */
        _parseCookieHeader: function(cookieHeader) {
            // Returns an object of form { $cookieKey: $cookieValue, $optionalCookieAttributeName: $""value, ... }
            let parsedCookieObject = CookieHandler.parse(cookieHeader);
            let cookie = {};

            // This gets the first key value pair into an object and just repeatedly returns thereafter
            utils.forEach(parsedCookieObject, function(cookieValue, cookieKey) {
                if(cookie.key) {
                    return;
                }
                cookie.key = cookieKey;
                cookie.value = cookieValue;
            });

            return cookie;
        },

        /**
         * Performs a GET request.
         *
         * @param {String} url The URL of the GET request.
         * @param {Object} headers An object of headers for this request.
         * @param {Object} params Parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Number} response_timeout A timeout period for aborting a request in milisecs (0 means no timeout).
         * @param {Boolean} validateCertificates A flag to enable and disable SSL certificate verification.
         * @param {Buffer} sslCert An authority certificate to check the remote host against.
         *
         * @method splunkjs.Http
         */
        get: function(url, headers, params, timeout, response_timeout, validateCertificates, sslCert, isAsync) {
            let message = {
                method: "GET",
                headers: headers,
                timeout: timeout,
                validateCertificates: validateCertificates,
                sslCert: sslCert,
                response_timeout: response_timeout,
                query: params,
            };
            return this.request(url, message, isAsync);
        },

        /**
         * Performs a POST request.
         *
         * @param {String} url The URL of the POST request.
         * @param {Object} headers  An object of headers for this request.
         * @param {Object} params Parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Number} response_timeout A timeout period for aborting a request in milisecs (0 means no timeout).
         * @param {Boolean} validateCertificates A flag to enable and disable SSL certificate verification.
         * @param {Buffer} sslCert An authority certificate to check the remote host against.
         *
         * @method splunkjs.Http
         */
        post: function(url, headers, params, timeout, response_timeout, validateCertificates, sslCert) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            let message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                validateCertificates: validateCertificates,
                sslCert: sslCert,
                response_timeout: response_timeout,
                post: params
            };

            return this.request(url, message);
        },

        /**
         * Performs a DELETE request.
         *
         * @param {String} url The URL of the DELETE request.
         * @param {Object} headers An object of headers for this request.
         * @param {Object} params Query parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Number} response_timeout A timeout period for aborting a request in milisecs (0 means no timeout).
         * @param {Boolean} validateCertificates A flag to enable and disable SSL certificate verification.
         * @param {Buffer} sslCert An authority certificate to check the remote host against.
         *
         * @method splunkjs.Http
         */
        del: function(url, headers, params, timeout, response_timeout, validateCertificates, sslCert) {
            let message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout,
                validateCertificates: validateCertificates,
                sslCert: sslCert,
                response_timeout: response_timeout,
                query: params
            };

            return this.request(url, message);
        },

        /**
         * Performs a request.
         *
         * This function sets up how to handle a response from a request, but
         * delegates calling the request to the `makeRequest` subclass.
         *
         * @param {String} url The encoded URL of the request.
         * @param {Object} message An object with values for method, headers, timeout, and encoded body.
         *
         * @method splunkjs.Http
         * @see makeRequest
         */
        request: function(url, message, isAsync) {
            var that = this;
            let query = utils.getWithVersion(this.version, queryBuilderMap)(message);
            let post = message.post || {};

            let encodedUrl = url + "?" + Http.encode(query);
            let body = message.body ? message.body : Http.encode(post);

            let cookieString = that._getCookieString();

            if (cookieString.length !== 0) {
                message.headers["Cookie"] = cookieString;

                // Remove Authorization header
                // Splunk will use Authorization header and ignore Cookies if Authorization header is sent
                delete message.headers["Authorization"];
            }

            let options = {
                method: message.method,
                headers: message.headers,
                timeout: message.timeout,
                validateCertificates: message.validateCertificates,
                sslCert: message.sslCert,
                response_timeout: message.response_timeout,
                query: message.query,
                body: body
            };

            if(isAsync) {
                return this.makeRequestAsync(encodedUrl, options);
            }
            else {
                let res = this.makeRequest(encodedUrl, options);
                return res.then((response) => {
                    if(!response){
                        return;
                    }
                    // Handle cookies if 'set-cookie' header is in the response
                    let cookieHeaders = response.response.headers['set-cookie'];
                        if (cookieHeaders) {
                            utils.forEach(cookieHeaders, function (cookieHeader) {
                                let cookie = that._parseCookieHeader(cookieHeader);
                                that._cookieStore[cookie.key] = cookie.value;
                            });
                        }

                        if (response.status < 400 && response.status !== "abort") {
                            return response;
                        }
                        else {
                            throw response;
                        }
                    }).catch((error) => {
                        throw error;
                    });
            }
        },

        /**
         * Encapsulates the client-specific logic for performing a request. This
         * function is meant to be overriden by subclasses.
         *
         * @param {String} url The encoded URL of the request.
         * @param {Object} message An object with values for method, headers, timeout, and encoded body.
         *
         * @method splunkjs.Http
         */
        makeRequest: function(url, message) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Encapsulates the client-specific logic for parsing the JSON response.
         *
         * @param {String} json The JSON response to parse.
         * @return {Object} The parsed JSON.
         *
         * @method splunkjs.Http
         */
        parseJson: function(json) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Generates a unified response with the given parameters.
         *
         * @param {Object} error An error object, if one exists for the request.
         * @param {Object} response The response object.
         * @param {Object} data The response data.
         * @return {Object} A unified response object.
         *
         * @method splunkjs.Http
         */
        _buildResponse: function(error, response, data) {
            let complete_response, json = {};

            let contentType = null;
            if (response && response.headers) {
                contentType = utils.trim(response.headers["content-type"] || response.headers["Content-Type"] || response.headers["Content-type"] || response.headers["contentType"]);
            }

            if (utils.startsWith(contentType, "application/json") && data) {
                try {
                    json = this.parseJson(data) || {};
                }
                catch(e) {
                    logger.error("Error in parsing JSON:", data, e);
                    json = data;
                }
            }
            else {
                json = data;
            }

            if (json) {
                logger.printMessages(json.messages);
            }

            complete_response = {
                response: response,
                status: (response ? response.statusCode : 0),
                data: json,
                error: error
            };

            return complete_response;
        }
    });

    /**
     * Encodes a dictionary of values into a URL-encoded format.
     *
     * @example
     *
     *      // should be a=1&b=2&b=3&b=4
     *      encode({a: 1, b: [2,3,4]})
     *
     * @param {Object} params The parameters to URL encode.
     * @return {String} The URL-encoded string.
     *
     * @function splunkjs.Http
     */
    Http.encode = function(params) {
        let encodedStr = "";

        // We loop over all the keys so we encode them.
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                // Only append the ampersand if we already have
                // something encoded, and the last character isn't
                // already an ampersand
                if (encodedStr && encodedStr[encodedStr.length - 1] !== "&") {
                    encodedStr = encodedStr + "&";
                }

                // Get the value
                let value = params[key];

                // If it's an array, we loop over each value
                // and encode it in the form &key=value[i]
                if (value instanceof Array) {
                    for (let i = 0; i < value.length; i++) {
                        encodedStr = encodedStr + key + "=" + encodeURIComponent(value[i]) + "&";
                    }
                }
                else if (typeof value === "object") {
                    for(let innerKey in value) {
                        if (value.hasOwnProperty(innerKey)) {
                            let innerValue = value[innerKey];
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
})();
