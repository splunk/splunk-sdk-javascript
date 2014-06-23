
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
    var request = require('request');
    var Http    = require('../../http');
    var utils   = require('../../utils');

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
                timeout: message.timeout,
                jar: false,
                followAllRedirects: true,
                strictSSL: false
            };
            
            request_options.headers["Content-Length"] = request_options.body.length;

            var that = this;
            var req = request(request_options, function (error, res, data) {
                // If we already aborted this request, then do nothing
                if (req.wasAborted) {
                    return;
                }
                
                var response = {
                    headers: res ? res.headers : {},
                    statusCode: res ? res.statusCode : 600
                };
                
                var complete_response = that._buildResponse(error, response, data);
                callback(complete_response);
            });
            
            req.on("abort", function() {
                var res = { headers: {}, statusCode: "abort" };
                var data = "{}";
                var complete_response = that._buildResponse("abort", res, data);
                
                callback(complete_response);
                
                // Note that we were aborted
                req.wasAborted = true;
            });
            
            return req;
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();
