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

/* 
 * This example will login to Splunk, and then retrieve the list of data models,
 * get the "internal_audit_logs", then get the "searches" data model object.
 * Then start a search on the "searches" data model object, track the
 * job until it's done. Then get and print out the results.
 * 
 * Then create a pivot specification and retrieve the pivot searches from
 * the Splunk server, run the search job for that pivot report, track
 * the job until it's done. Then get and print out the results.
 * At the end, the search job is cancelled.
 */

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

    var searches; // We'll use this later

    Async.chain([
            // First, we log in.
            function(done) {
                service.login(done);
            },
            
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }

                // Now that we're logged in, let's get the data models collection
                service.dataModels().fetch(done);
            },
            function(dataModels, done) {
                // ...and the specific data model we're concerned with
                var dm = dataModels.item("internal_audit_logs");
                // Get the "searches" object out of the "internal_audit_logs" data model
                searches = dm.objectByName("searches");

                console.log("Working with object", searches.displayName,
                    "in model", dm.displayName);

                console.log("\t Lineage:", searches.lineage.join(" -> "));
                console.log("\t Internal name: " + searches.name);

                // Run a data model search query, getting the first 5 results
                searches.startSearch({}, "| head 5", done);
            },
            function(job, done) {
                job.track({}, function(job) {
                    job.results({}, done);
                });
            },
            function(results, job, done) {
                // Print out the results
                console.log("Results:");
                for (var i = 0; i < results.rows.length; i++) {
                    var rowString = " result " + i + ":  ";
                    var row = results.rows[i];
                    for (var j = 0; j < results.fields.length; j++) {
                        if (row[j] !== null && row[j] !== undefined) {
                            rowString += results.fields[j] + "=" + row[j] + ", ";
                        }
                    }
                    console.log(rowString);
                    console.log("------------------------------");
                }
                
                var pivotSpecification = searches.createPivotSpecification();
                // Each function call here returns a pivotSpecification so we can chain them
                pivotSpecification
                    .addRowSplit("user", "Executing user")
                    .addRangeColumnSplit("exec_time", {limit: 4})
                    .addCellValue("search", "Search Query", "values")
                    .run(done);
            },
            function(job, pivot, done) {
                console.log("Query for binning search queries by execution time and executing user:");
                console.log("\t", pivot.prettyQuery);
                job.track({}, function(job) {
                    job.results({}, done);
                });
            },
            function(results, job, done) {
                // Print out the results
                console.log("Results:");
                for (var i = 0; i < results.rows.length; i++) {
                    var rowString = " result " + i + ":  ";
                    var row = results.rows[i];
                    for (var j = 0; j < results.fields.length; j++) {
                        if (row[j] !== null && row[j] !== undefined) {
                            rowString += results.fields[j] + "=" + row[j] + ", ";
                        }
                    }
                    console.log(rowString);
                    console.log("------------------------------");
                }
                job.cancel(done);
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
