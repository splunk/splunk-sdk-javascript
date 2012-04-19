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
    
    var Service         = require('./service');
    var Http            = require('./http').Http;
    var Paths           = require('./paths').Paths;
    var utils           = require('./utils');
    var base64          = require('../contrib/base64');

    var root = exports || this;
    var StormService = null;
    
    /**
     * Root access point to the Splunk Storm REST API
     *
     * @class splunkjs.StormService
     * @extends splunkjs.Service
     */
    module.exports = root = StormService = Service.extend({
        init: function(http, params) {
            if (!(http instanceof Http) && !params) {
                // Move over the params
                params = http;
                http = null;
            }
            
            params = params || {};
            
            var username = params.token || params.username || null;
            var password = "x";
            
            // Setup the parameters
            params.paths         = Paths.storm;
            params.scheme        = "https";
            params.host          = "api.splunkstorm.com";
            params.port          = 443;
            params.sessionKey    = base64.encode(username + ":x");
            params.authorization = "Basic";
            
            // Initialize
            this._super.call(this, http, params);
            
            // Override computed parameters
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/1";
        },
        
        log: function(event, params, callback) {
            if (!callback && utils.isFunction(params)) {
                callback = params;
                params = {};
            }
            
            callback = callback || function() {};
            params = params || {};
            
            if (!params.project && !params.index) {
                throw new Error("Cannot submit events to Storm without specifying a project");
            }
            
            if (params.project) {
                params.index = params.project;
                delete params["project"];
            }
            
            if (utils.isObject(event)) {
                event = JSON.stringify(event);
            }
            
            return this._super(event, params, callback);
        }
    });  
})();