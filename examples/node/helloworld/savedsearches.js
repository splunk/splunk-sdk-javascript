
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
// printing each saved search's name and search query.

var splunkjs = require('../../../splunk');

exports.main = function(opts, done) {
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

    // First, we log in
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        // Now that we're logged in, let's get a listing of all the saved searches.
        service.savedSearches().refresh(function(err, searches) {
            if (err) {
                console.log("There was an error retrieving the list of saved searches:", err);
                done(err);
                return;
            }
            
            var searchList = searches.list();
            console.log("Saved searches:");
            for(var i = 0; i < searchList.length; i++) {
                var search = searchList[i];
                console.log("  Search " + i + ": " + search.name);
                console.log("    " + search.properties().search);
            } 
            
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}