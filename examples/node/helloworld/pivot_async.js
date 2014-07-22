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
    var password = opts.password    || "1"; // TODO: change to "changeme"
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

                // Now that we're logged in, let's get the data model we're concerned with.
                service.dataModels().fetch(done);
            },
            function(dataModels, done) {
                var dm = dataModels.item("internal_audit_logs");
                // Get the "searches" object out of the "internal_audit_logs" data model.
                searches = dm.objectByName("searches");

                console.log(
                    "Working with object",
                    searches.displayName,
                    "in model",
                    dm.displayName()
                    );

                var lineageString = "\t Lineage:";
                for (var i = 0; i < searches.lineage().length; i++) {
                    lineageString += " -> " + searches.lineage()[i]
                }
                console.log(lineageString);

                console.log("\t Internal name: " + searches.name);

                // Run a data model search query, getting the first 5 results
                searches.runQuery({}, "| head 5", done);
            },
            function(job, done) {
                // Wait until the job is done
                Async.whilst(
                    function() {
                        if (job.properties().isDone) {
                            console.log("The search job is done!");
                        }
                        return !job.properties().isDone;
                    },
                    function(innerDone) {
                        Async.sleep(100, function(err) {
                            if (err) {
                                innerDone(err);
                            }
                            else {
                                job.fetch(innerDone);
                            }
                        });
                    },
                    function(err) {
                        done(null, job);
                    }
                );
            },
            function(job, done) {
                job.results({}, done);
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
                
                var pivotSpec = searches.createPivotSpec();
                // Each function call here returns a pivotSpecification so we can chain them
                pivotSpec
                    .addRowSplit("user", "Executing user")
                    .addRangeColumnSplit("exec_time", null, null, null, 4)
                    .addCellValue("search", "Search Query", pivotSpec.statsFunctions.DISTINCT_VALUES)
                    .pivot(done);
            },
            function(pivot, done) {
                console.log("Query for binning search queries by execution time and executing user:");
                console.log("\t", pivot.prettyQuery());
                pivot.run({}, done);
            },
            function(job, done) {
                // Wait until the job is done
                Async.whilst(
                    function() {
                        if (job.properties().isDone) {
                            console.log("The search job is done!");
                        }
                        return !job.properties().isDone;
                    },
                    function(innerDone) {
                        Async.sleep(100, function(err) {
                            if (err) {
                                innerDone(err);
                            }
                            else {
                                job.fetch(innerDone);
                            }
                        });
                    },
                    function(err) {
                        done(null, job);
                    }
                );
            },
            function(job, done) {
                job.results({}, done);
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
                done();
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
