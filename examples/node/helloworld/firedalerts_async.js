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

// This example will login to Splunk, and then retrieve the list of fired alerts,
// printing each alert's name and properties. It is the same as firedalerts.js, 
// except that it uses the Async library

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
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

    Async.chain([
            // First, we log in.
            function(done) {
                service.login(done);
            },
            
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }

                // Now that we're logged in, let's get a listing of all the fired alert groups.
                service.firedAlertGroups().fetch(done);
            },
            // Print them out.
            function(firedAlertGroups, done) {
                // Get the list of all fired alert groups, including the all group (represented by "-").
                var groups = firedAlertGroups.list();

                console.log("Fired alert groups:");
                Async.seriesEach(
                    groups,
                    function(firedAlertGroup, index, seriescallback) {
                        firedAlertGroup.list(function(err, firedAlerts){
                            // How many times was this alert fired?
                            console.log(firedAlertGroup.name, "(Count:", firedAlertGroup.count(), ")");
                            // Print the properties for each fired alert (default of 30 per alert group).
                            for(var i = 0; i < firedAlerts.length; i++) {
                                var firedAlert = firedAlerts[i];
                                for (var key in firedAlert.properties()) {
                                    if (firedAlert.properties().hasOwnProperty(key)) {
                                        console.log("\t", key, ":", firedAlert.properties()[key]);
                                    }
                                }
                                console.log();
                            }
                            console.log("======================================");
                        });
                        seriescallback();
                    },
                    function(err) {
                        if (err) {
                            done(err);
                        }
                        done();
                    }
                );
            }
        ],
        function(err) {
            if (err) {
                console.log("ERROR", err);
                callback(err);
            }
            callback(err);
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
