
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

        makeRequest: function(url, message) {
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

            if(message.response_timeout != undefined){
                request_options.response_timeout = message.response_timeout;
            }

            // Get the byte-length of the content, which adjusts for multi-byte characters
            request_options.headers["Content-Length"] = Buffer.byteLength(request_options.body, "utf8");
            request_options.headers["User-Agent"] = "splunk-sdk-javascript/" + SDK_VERSION;

            if(message.query && ["xml", "csv"].includes(message.query.output_mode)){
                request_options.parse_response = false;
            }

            var that = this;

            function formatResponse(error = null, res = null) {
                var complete_response;

                var response = {
                    headers: res ? res.headers : {},
                    statusCode: res ? res.statusCode : 600
                };
                var body = res ? res.body : {};

                if(message.query && ["xml", "csv"].includes(message.query.output_mode)){
                    complete_response = that._buildResponse(error, response, body);
                }
                else {
                    complete_response = that._buildResponse(error, response, JSON.stringify(body));
                }

                return complete_response;
            }

            var req = needle(request_options.method, request_options.url, request_options.body, request_options)
                    .then((res) => {
                        return formatResponse(null, res);
                    })
                    .catch((err) => {
                        if(err.code == 'ECONNRESET' && request_options.response_timeout != undefined){
                            var res = { headers: {}, statusCode: "abort", body: {}};
                            throw formatResponse("abort", res);
                        }
                        throw formatResponse(err, null);
                    });

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

            if(message.response_timeout != undefined){
                request_options.response_timeout = message.response_timeout;
            }
            
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
