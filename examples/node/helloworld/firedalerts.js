
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

// This example will login to Splunk, and then retrieve the list of fired alerts,
// printing each alert's name and properties.

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
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

    // First, we log in
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        // Now that we're logged in, let's get a listing of all the fired alert groups
        service.firedAlertGroups().fetch(function(err, firedAlerts) {
            if (err) {
                console.log("ERROR", err);
                done(err);
                return;
            }

            // Get the list of all alert, including the all group (represented by "-")
            var alertGroups = firedAlerts.list();
            console.log("Fired alerts:");

            for(var a in alertGroups) {
                if (alertGroups.hasOwnProperty(a)) {
                    var group = alertGroups[a];
                    group.list(function(err, jobs, alertGroup){
                        // How many search jobs fired this alert?
                        console.log(group.name, "(Count:", group.count(), ")");
                        // Print the properties for each job that fired this alert (default of 30 per alert)
                        for(var i = 0; i < jobs.length; i++) {
                            var job = jobs[i];
                            for(var key in job.properties()) {
                                console.log(key + ":", job.properties()[key]);
                            }
                            console.log();
                        }
                        console.log("======================================");
                    });
                }
            }

            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}