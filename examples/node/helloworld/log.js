
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

// This example shows a simple log handler that will print to the console
// as well as log the information to a Splunk instance.

var splunkjs = require('../../../index');

var Logger = splunkjs.Class.extend({
    init: function(service, opts) {
        this.service = service;
        
        opts = opts || {};
        
        this.params = {};
        if (opts.index)      { this.params.index      = opts.index; }
        if (opts.host)       { this.params.host       = opts.host; }
        if (opts.source)     { this.params.source     = opts.source; }
        if (opts.sourcetype) { this.params.sourcetype = opts.sourcetype || "demo-logger"; }
        
        if (!this.service) {
            throw new Error("Must supply a valid service");
        }
    },
    
    log: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "LOG",
            data: data
        };
        
        this.service.log(message, this.params);
        console.log(data);
    },
    
    error: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "ERROR",
            data: data
        };
        
        this.service.log(message, this.params);
        console.error(data);
    },
    
    info: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "INFO",
            data: data
        };
        
        this.service.log(message, this.params);
        console.info(data);
    },
    
    warn: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "WARN",
            data: data
        };
        
        this.service.log(message, this.params);
        console.warn(data);
    }
});

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
        
        // Create our logger
        var logger = new Logger(service, { sourcetype: "mylogger", source: "test" });
        
        // Log the various types of messages. Note how we are sending
        // both strings and JSON objects, which will be auto-encoded and
        // understood by Splunk 4.3+
        logger.log({hello: "world"});
        logger.error("ERROR HAPPENED");
        logger.info(["useful", "info"]);
        logger.warn({"this": {"is": ["a", "warning"]}});
        
        // Say we are done with this sample.
        done();
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}