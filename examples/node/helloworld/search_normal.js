
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

// This example will login to Splunk, perform a regular search, wait until
// it is done, and then print out the raw results and some key-value pairs

var splunkjs = require('../../../splunk');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.search("search index=_internal | head 3", {}, done);
            },
            // Wait until the job is done
            function(job, done) {
                Async.whilst(
                    // Loop until it is done
                    function() { return !job.properties().isDone; },
                    // Refresh the job on every iteration, but sleep for 1 second
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            // Refresh the job and note how many events we've looked at so far
                            job.refresh(function(err) {
                                console.log("-- refreshing, " + (job.properties().eventCount || 0) + " events so far");
                                iterationDone();
                            });
                        });
                    },
                    // When we're done, just pass the job forward
                    function(err) {
                        console.log("-- job done --");
                        done(err, job);
                    }
                );
            },
            // Print out the statistics and get the results
            function(job, done) {
                // Print out the statics
                console.log("Job Statistics: ");
                console.log("  Event Count: " + job.properties().eventCount);
                console.log("  Disk Usage: " + job.properties().diskUsage + " bytes");
                console.log("  Priority: " + job.properties().priority);
                
                // Ask the server for the results
                job.results({}, done);
            },
            // Print the raw results out
            function(results, job, done) {
                // Find the index of the fields we want
                var rawIndex = results.fields.indexOf("_raw");
                var sourcetypeIndex = results.fields.indexOf("sourcetype");
                var userIndex = results.fields.indexOf("user");
                
                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                // Once we're done, cancel the job.
                job.cancel(done);
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}