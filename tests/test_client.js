
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
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var minitest    = require('../contrib/minitest');
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;

    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: "https",
        host: "localhost",
        port: "8089",
        username: "itay",
        password: "changeme",
    });

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    minitest.context("Job Tests", function() {
        this.setupContext(function(done) {
            var context = this;
            svc.login(function(err, success) {
                context.service = svc;
                context.success = success;
                done();
            });
        });

        this.setupTest(function(done) {
            this.assert.ok(this.context.success);
            this.service = this.context.service; 
            done();
        });

        this.assertion("Callback#Create+cancel job", function(test) {
            var sid = getNextId();
            this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                test.assert.ok(job);
                test.assert.strictEqual(job.sid, sid);

                job.cancel(function() {
                    test.finished();
                });
            }); 
        });

        this.assertion("Callback#Create job error", function(test) {
            var sid = getNextId();
            this.service.jobs().create('index=_internal | head 1', {id: sid}, function(err) { 
                test.assert.ok(!!err);
                test.finished(); 
            });
        });

        this.assertion("Callback#List jobs", function(test) {
            this.service.jobs().list(function(err, jobs) {
                test.assert.ok(jobs);
                test.assert.ok(jobs.length > 0);
                
                for(var i = 0; i < jobs.length; i++) {
                    test.assert.ok(jobs[i].isValid());
                }
                
                test.finished();
            });
        });

        this.assertion("Callback#Contains job", function(test) {
            var that = this;
            var sid = getNextId();
            this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                test.assert.ok(job);
                test.assert.strictEqual(job.sid, sid);

                that.service.jobs().contains(sid, function(err, contains) {
                    test.assert.ok(contains);

                    job.cancel(function() {
                        test.finished();
                    });
                });
            }); 
        });

        this.assertion("Callback#job results", function(test) {
            var sid = getNextId();
            var service = this.service;
            this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, function(err, job) {
                var properties = {};

                Async.whilst(
                    {
                        condition: function() { return properties.dispatchState !== "DONE"; },
                        body: function(iterationDone) {
                            job.read(function(err, props) {
                                properties = props;
                                Async.sleep(1000, iterationDone); 
                            });
                        },
                    },
                    function() {
                        job.results({}, function(err, results) {
                            test.assert.strictEqual(results.rows.length, 1);
                            test.assert.strictEqual(results.fields.length, 1);
                            test.assert.strictEqual(results.fields[0], "count");
                            test.assert.strictEqual(results.rows[0][0], "1");

                            job.cancel(function() { test.finished(); });
                        });
                    }
                );
            });
        });
    });    
    
    minitest.context("App Tests", function() {
        this.setupContext(function(done) {
            var context = this;
            svc.login(function(err, success) {
                context.service = svc;
                context.success = success;
                done();
            });
        });

        this.setupTest(function(done) {
            this.assert.ok(this.context.success);
            this.service = this.context.service; 
            done();
        });
               
        this.assertion("Callback#list applications", function(test) {
            var apps = this.service.apps();
            apps.list(function(err, appList) {
                test.assert.ok(appList.length > 0);
                test.finished();
            });
        });
               
        this.assertion("Callback#contains applications", function(test) {
            var apps = this.service.apps();
            apps.contains("search", function(err, found) {
                test.assert.ok(found);
                test.finished();
            });
        });
        
        this.assertion("Callback#create app", function(test) {
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();
            
            apps.create({name: name}, function(err, app) {
                test.assert.ok(app.isValid());
                var appName = app.properties().__name;
                apps.contains(appName, function(err, found, entity) {
                    test.assert.ok(found);
                    test.assert.ok(entity);
                    app.del(function() {
                        test.finished();
                    });
                });
            });
        });
    });
    
    minitest.context("Saved Search Tests", function() {
        this.setupContext(function(done) {
            var context = this;
            svc.login(function(err, success) {
                context.service = svc;
                context.success = success;
                done();
            });
        });

        this.setupTest(function(done) {
            this.assert.ok(this.context.success);
            this.service = this.context.service; 
            done();
        });
               
        this.assertion("Callback#list", function(test) {
            var searches = this.service.savedSearches();
            searches.list(function(err, savedSearches) {
                test.assert.ok(savedSearches.length > 0);
                
                for(var i = 0; i < savedSearches.length; i++) {
                    test.assert.ok(savedSearches[i].isValid());
                }
                
                test.finished();
            });
        });
        
        this.assertion("Callback#contains", function(test) {
            var searches = this.service.savedSearches();
            searches.contains("gentimes", function(err, found, search) {
                test.assert.ok(found);
                test.assert.ok(search.isValid());
                
                test.finished();
            });
        });
        
        this.assertion("Callback#history", function(test) {
            var searches = this.service.savedSearches();
            searches.contains("gentimes", function(err, found, search) {
                test.assert.ok(found);
                test.assert.ok(search.isValid());
                
                search.history(function(err, response) {
                    test.finished();
                });
            });
        });
        
        this.assertion("Callback#suppress", function(test) {
            var searches = this.service.savedSearches();
            searches.contains("gentimes", function(err, found, search) {
                test.assert.ok(found);
                test.assert.ok(search.isValid());
                
                search.suppressInfo(function(response) {
                    test.finished();
                });
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();