
// Copyright 2015 Splunk, Inc.
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

// This example will show how to get a `Job` by it's sid without
// fetching a collection of `Job`s.

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
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

    var sid;

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
                
                service.search("search index=_internal | head 1", {}, done);
            },
            function(job, done) {
                // Store the sid for later use
                sid = job.sid;
                console.log("Created a search job with sid: " + job.sid);
                done();
            }
        ],
        function(err) {
            if (err || !sid) {
                if (err.hasOwnProperty("data") && err.data.hasOwnProperty("messages")) {
                    console.log(err.data.messages[0].text);
                }
                else {
                    console.log(err);
                }
                if (!sid) {
                    console.log("Couldn't create search.");
                }
                callback(err);
            }
            else {
                Async.chain([
                        function(done) {
                            // Since we have the job sid, we can get that job directly
                            service.getJob(sid, done);
                        },
                        function(job, done) {
                            console.log("Got the job with sid: " + job.sid);
                            done();
                        }
                    ],
                    function(err) {
                        callback(err);
                    }
                );
            }
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}