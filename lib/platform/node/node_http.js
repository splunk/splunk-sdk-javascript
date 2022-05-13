
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
    var needle = require('needle');
    var Http    = require('../../http');
    var utils   = require('../../utils');
    var SDK_VERSION = require('../../../package.json').version;

    var root = exports || this;

    root.NodeHttp = Http.extend({
        init: function() {
            this._super();
        },

        makeRequest: function(url, message, callback) {
            var request_options = {
                url: url,
                method: message.method,
                headers: message.headers || {},
                body: message.body || "",
                timeout: message.timeout || 0,
                jar: false,
                followAllRedirects: true,
                strictSSL: false,
                rejectUnauthorized : false
            };

            // Get the byte-length of the content, which adjusts for multi-byte characters
            request_options.headers["Content-Length"] = Buffer.byteLength(request_options.body, "utf8");
            request_options.headers["User-Agent"] = "splunk-sdk-javascript/" + SDK_VERSION;

            if(message.query && ["xml", "csv"].includes(message.query.output_mode)){
                request_options.parse_response = false;
            }

            var that = this;
            var req = needle.request(request_options.method, request_options.url, request_options.body, request_options, 
                function (error, res, data) 
                {
                // If we already aborted this request, then do nothing
                if (req.wasAborted) {
                    return;
                }
                
                var response = {
                    headers: res ? res.headers : {},
                    statusCode: res ? res.statusCode : 600
                };

                var complete_response;

                if(message.query && ["xml", "csv"].includes(message.query.output_mode)){
                    complete_response = that._buildResponse(error, response, data);
                }
                else {
                    complete_response = that._buildResponse(error, response, JSON.stringify(data));
                }
                
                callback(complete_response);
            });
            
            req.abort = function () {
                var res = { headers: {}, statusCode: "abort" };
                var data = "{}";
                var complete_response = that._buildResponse("abort", res, data);
                
                callback(complete_response);
                
                // Note that we were aborted
                req.wasAborted = true;
            }
            
            return req;
        },

        makeRequestAsync: async function(url, message) {
            var request_options = {
                url: url,
                method: message.method,
                headers: message.headers || {},
                body: message.body || "",
                timeout: message.timeout || 0,
                jar: false,
                followAllRedirects: true,
                strictSSL: false,
                rejectUnauthorized : false,
            };

            // Get the byte-length of the content, which adjusts for multi-byte characters
            request_options.headers["Content-Length"] = Buffer.byteLength(request_options.body, "utf8");
            request_options.headers["User-Agent"] = "splunk-sdk-javascript/" + SDK_VERSION;

            var that = this;
            var response = needle(request_options.method, request_options.url, request_options.body, request_options);
            
            return response;
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();
