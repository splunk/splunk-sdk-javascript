
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

exports.run = (function() {
    var Promise     = require('../splunk').Splunk.Promise;
    var minitest    = require('../external/minitest');
    var fs          = require('fs');
    
    var argv = [
        "--username=itay",
        "--password=changeme"
    ];

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
        
    minitest.context("Job Example Tests", function() {        
        this.setupContext(function(done) {
            this.main = require("../examples/jobs").main;
            done();
        });
        
        this.setupTest(function(done) {            
            var test = this;
            this.run = function(command, args, options) {                
                var combinedArgs = argv.slice();
                if (command) {
                    combinedArgs.push(command);
                }
                
                if (args) {
                    for(var i = 0; i < args.length; i++) {
                        combinedArgs.push(args[i]);
                    }
                }
                
                if (options) {
                    combinedArgs.push("--");
                    for(var key in options) {
                        if (options.hasOwnProperty(key)) {
                            combinedArgs.push("--" + key + "=" + options[key]);
                        }
                    }
                }
          
                return test.context.main(combinedArgs);
            };
            
            done(); 
        });
        
        this.assertion("help", function(test) {
            var doneP = test.run();
            doneP.whenFailed(function() { test.finished(); });
        });
        
        this.assertion("List jobs", function(test) {
            var doneP = test.run("list");
            doneP.whenResolved(function() { test.finished(); });
        });
        
        this.assertion("Create job", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            this.run("create", [], create).whenResolved(function() {
                return test.run("cancel", [create.id]);
            }).whenResolved(function() { 
                test.finished(); 
            });
        });
        
        this.assertion("Cancel job", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            this.run("create", [], create).whenResolved(function() {
                return test.run("cancel", [create.id]);
            }).whenResolved(function() { 
                test.finished(); 
            });
        });
        
        this.assertion("List job properties", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            this.run("create", [], create).whenResolved(function() {
                return test.run("list", [create.id]);
            }).whenResolved(function() {
                return test.run("cancel", [create.id]);
            }).whenResolved(function() { 
                test.finished(); 
            });
        });
        
        this.assertion("List job events", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            this.run("create", [], create).whenResolved(function() {
                return test.run("events", [create.id]);
            }).whenResolved(function() {
                return test.run("cancel", [create.id]);
            }).whenResolved(function() { 
                test.finished(); 
            });
        });
        
        this.assertion("Create+list multiple jobs", function(test) {
            var creates = [];
            for(var i = 0; i < 3; i++) {
                creates[i] = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
            }
            var sids = creates.map(function(create) { return create.id; });
            
            var promises = [];
            for(var i = 0; i < creates.length; i++) {
                promises[i] = this.run("create", [], creates[i]);
            }
            
            Promise.join.apply(null, promises).whenResolved(function() {
                return test.run("list", sids);  
            }).whenResolved(function() {
                return test.run("cancel", sids);
            }).whenResolved(function() {
                test.finished();
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();