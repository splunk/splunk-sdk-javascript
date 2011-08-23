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
    var Splunk  = require('../../splunk').Splunk;
    var utils   = Splunk.Utils;

    var root = exports || this;

    root.NodeHttp = Splunk.Http.extend({
        request: function(url, message, callback) {
            var request_options = {
                url: url,
                method: message.method,
                headers: message.headers,
                body: message.body
            };

            console.log("URL: " + request_options.url);

            request(request_options, utils.bind(this, function (error, res, data) {
                var complete_response = this._buildResponse(error, res, data);
                callback(complete_response);
            }));
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();