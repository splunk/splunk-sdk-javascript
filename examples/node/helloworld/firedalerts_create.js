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

// This example will login to Splunk, and then create an alert.

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it.
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    // First, we log in.
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        var alertOptions = {
            name: "My Awesome Alert",
            search: "index=_internal error sourcetype=splunkd* | head 10",
            "alert_type": "always",
            "alert.severity": "2",
            "alert.suppress": "0",
            "alert.track": "1",
            "dispatch.earliest_time": "-1h",
            "dispatch.latest_time": "now",
            "is_scheduled": "1",
            "cron_schedule": "* * * * *"
        };
        
        // Now that we're logged in, let's create a saved search.
        service.savedSearches().create(alertOptions, function(err, alert) {
            if (err && err.status === 409) {
                console.error("ERROR: A saved search with the name '" + alertOptions.name + "' already exists");
                done();
                return;
            }
            else if (err) {
                console.error("There was an error creating the saved search:", err);
                done(err);
                return;
            }
            
            console.log("Created saved search as alert: " + alert.name);            
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}
