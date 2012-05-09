
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

// This example will login to Splunk, and then retrieve the list of saved searchs,
// printing each saved search's name and search query. It is the same as savedsearches.js, 
// except that it uses the Async library

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

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Retrieve the saved searches
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.savedSearches().fetch(done);
            },
            // Print them out
            function(searches, done) {
                var searchList = searches.list();
                console.log("Saved searches:");
                for(var i = 0; i < searchList.length; i++) {
                    var search = searchList[i];
                    console.log("  Search " + i + ": " + search.name);
                    console.log("    " + search.properties().search);
                }
                
                done();
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