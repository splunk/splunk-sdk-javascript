
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
    var minitest    = require('../contrib/minitest');
    var fs          = require('fs');
    var Async       = require('../splunk').Splunk.Async;

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
            this.run = function(command, args, options, callback) {                
                var combinedArgs = process.argv.slice();
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
          
                return test.context.main(combinedArgs, callback);
            };
            
            done(); 
        });
        
        this.assertion("help", function(test) {
            test.run(null, null, null, function(err) {
                test.assert.ok(err);
                test.finished();
            });
        });
        
        this.assertion("List jobs", function(test) {
            test.run("list", null, null, function(err) {
                test.assert.ok(!err);
                test.finished();
            });
        });
        
        this.assertion("Create job", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            test.run("create", [], create, function(err) {
                test.assert.ok(!err);
                test.run("cancel", [create.id], null, function(err) {
                    test.assert.ok(!err);
                    test.finished();
                });
            });
        });
        
        this.assertion("Cancel job", function(test) {
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
            
            test.run("create", [], create, function(err) {
                test.assert.ok(!err);
                test.run("cancel", [create.id], null, function(err) {
                    test.assert.ok(!err);
                    test.finished();
                });
            });
        });
        
        this.assertion("List job properties", function(test) {          
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
              
            test.run("create", [], create, function(err) {
                test.assert.ok(!err);
                test.run("list", [create.id], null, function(err) {
                    test.assert.ok(!err);
                    test.run("cancel", [create.id], null, function(err) {
                        test.assert.ok(!err);
                        test.finished();
                    });
                });
            });
        });
        
        this.assertion("List job events", function(test) {      
            var create = {
                search: "search index=_internal | head 1",
                id: getNextId()
            };
              
            test.run("create", [], create, function(err) {
                test.assert.ok(!err);
                test.run("events", [create.id], null, function(err) {
                    test.assert.ok(!err);
                    test.run("cancel", [create.id], null, function(err) {
                        test.assert.ok(!err);
                        test.finished();
                    });
                });
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
            
            Async.parallelMap(
                function(create, done) {
                    test.run("create", [], create, function(err, job) {
                        test.assert.ok(!err);
                        test.assert.ok(job);
                        test.assert.strictEqual(job.sid, create.id);
                        done(null, job);
                    });
                },
                creates,
                function(err, created) {
                    for(var i = 0; i < created.length; i++) {
                        test.assert.strictEqual(creates[i].id, created[i].sid);
                    }
                    
                    test.run("list", sids, null, function(err) {
                        test.assert.ok(!err);
                        test.run("cancel", sids, null, function(err) {
                            test.assert.ok(!err);
                            test.finished();
                        });
                    });
                    
                }
            );
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();