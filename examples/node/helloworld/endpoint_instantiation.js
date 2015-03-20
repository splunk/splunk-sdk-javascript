
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

var splunkjs = require('../../../index');

// This example will show you how to add a new REST API endpoint
// to the Splunk SDK for JavaScript.
//
// The JavaScript SDK has the authorization roles REST API endpoint
// path defined, but doesn't implement it.
// To add a new path, we would add the following:
//
// `splunkjs.Paths.roles = "authorization/roles";`
//
// Be sure to avoid naming collisions!
//
// Depending on the endpoint, you may need to prepend `/services/`
// when defining the path.
// For example the server info REST API endpoint path is defined as:
//
// `"/services/server/info"`
//
// For more information, please refer to the REST API documentation
// at http://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog

// Here we're adding a new entity to splunkjs, which will be
// used by the collection we'll add below.
splunkjs.Service.Role = splunkjs.Service.Entity.extend({
    path: function() {
        return splunkjs.Paths.roles + "/" + encodeURIComponent(this.name);
    },

    init: function(service, name, namespace) {
        this.name = name;
        this._super(service, this.path(), namespace);
    }
});

// Here we're adding a new collection to splunkjs, which
// uses the Role entity we just defined.
// See the `instantiateEntity()` function.
splunkjs.Service.Roles = splunkjs.Service.Collection.extend({
    fetchOnEntityCreation: true,
    
    path: function() {
        return splunkjs.Paths.roles;
    },

    instantiateEntity: function(props) {
        var entityNamespace = splunkjs.Utils.namespaceFromProperties(props);
        return new splunkjs.Service.Role(this.service, props.name, entityNamespace);
    },

    init: function(service, namespace) {
        this._super(service, this.path(), namespace);
    }
});

// To finish off integrating the new endpoint,
// we need to add a function to the service object
// which will retrieve the Roles collection.
splunkjs.Service.prototype.roles = function(namespace) {
    return new splunkjs.Service.Roles(this, namespace);
};

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

        // Now that we're logged in, we can just retrieve system roles!
        service.roles({user:"admin", app: "search"}).fetch(function(rolesErr, roles) {
            if (rolesErr) {
                console.log("There was an error retrieving the list of roles:", err);
                done(err);
                return;
            }

            console.log("System roles:");
            var rolesList = roles.list();
            for (var i = 0; i < rolesList.length; i++) {
                console.log("  " + i + " " + rolesList[i].name);
            }
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}