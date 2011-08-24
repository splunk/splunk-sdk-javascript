
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
    var Class           = require('./jquery.class').Class;
    var ODataResponse   = require('./odata').ODataResponse;
    var utils           = require('./utils');

    var root = exports || this;
    
    // This is a utility function to encode an object into a URI-compliant
    // URI. It will convert objects into '&key=value' pairs, and arrays into
    // `&key=value1&key=value2...'
    var encode = function(params) {
        var encodedStr = "";

        // We loop over all the keys so we encode them.
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                // Only append the ampersand if we already have
                // something encdoed
                if (encodedStr) {
                    encodedStr = encodedStr + "&";
                }
                    
                // Get the value
                var value = params[key];

                // If it's an array, we loop over each value
                // and encode it in the form &key=value[i]
                if (value instanceof Array) {
                    for (var item in value) {
                        encodedStr = encodedStr + key + "=" + encodeURIComponent(item);
                    }
                }
                else {
                    // If it's not an array, we just encode it
                    encodedStr = encodedStr + key + "=" + encodeURIComponent(value);
                }
            }
        };

        return encodedStr;
    };

    // This is our base class for HTTP implementations. It provides the basic 
    // functionality (get/post/delete), as well as a utility function to build
    // a uniform response object.
    //
    // Base classes should only override 'request' and 'parseJSON'.
    root.Http = Class.extend({
        init: function() {
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);
        },

        get: function(url, headers, params, timeout, callback) {
            var url = url + "?" + encode(params);
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout
            };
            this.request(url, message, callback);
        },

        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                body: encode(params)
            };
            this.request(url, message, callback);
        },

        del: function(url, headers, params, timeout, callback) {
            var url = url + "?" + encode(params);
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout
            };

            this.request(url, message, callback);
        },

        request: function(url, message, callback) {
            throw "UNDEFINED FUNCTION - OVERRIDE REQUIRED";  
        },

        parseJson: function(json) {
            throw "UNDEFINED FUNCTION - OVERRIDE REQUIRED";
        },

        _buildResponse: function(error, response, data) {
            // Parse the JSON data and build the OData response
            // object.
            var json = this.parseJson(data);
            var odata = ODataResponse.fromJson(json);  

            // Print any messages that came with the response
            ODataResponse.printMessages(odata);

            var complete_response = {
                status: (response ? response.statusCode : 0),
                odata: odata,
                error: error
            };

            return complete_response;
        }
    });
})();