
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

// This example will login to Splunk, and then try to delete the 
// saved search that was created in savedsearches_create.js

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
        
        var name = "My Awesome Saved Search";
        
        // Now that we're logged in, Let's create a saved search
        service.savedSearches().fetch(function(err, savedSearches) {
            if (err) {
                console.log("There was an error in fetching the saved searches");
                done(err);
                return;
            } 
            
            var savedSearchToDelete = savedSearches.item(name);
            if (!savedSearchToDelete) {
                console.log("Can't delete '" + name + "' because it doesn't exist!");
                done();
            }
            else {                
                savedSearchToDelete.remove();
                console.log("Deleted saved search: " + name + "");
                done();
            }
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}