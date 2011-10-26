
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
    var Promise     = Splunk.Promise;
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
            svc.login(function(success) {
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

        this.assertion("Promise#Create+cancel job", function(test) {
            var sid = getNextId();
            var jobP = this.service.jobs().create('search index=_internal | head 1', {id: sid});
            jobP.when(
                utils.bind(this, function(job) {   
                    test.assert.ok(job);
                    test.assert.strictEqual(job.sid, sid);

                    var cancelP = job.cancel();
                    cancelP.when(
                        function() {
                            test.finished();
                        }
                    );
                })
            );
        });

        this.assertion("Callback#Create+cancel job", function(test) {
            var sid = getNextId();
            this.service.jobs().create('search index=_internal | head 1', {id: sid}, utils.bind(this, function(job) {   
                test.assert.ok(job);
                test.assert.strictEqual(job.sid, sid);

                job.cancel(function() {
                    test.finished();
                });
            })); 
        });

        this.assertion("Promise#Create job error", function(test) {
            var sid = getNextId();
            var jobP = this.service.jobs().create('index=_internal | head 1', {id: sid});
            jobP.whenFailed(
                function() {
                    test.finished();
                }
            );
        });

        this.assertion("Callback#Create job error", function(test) {
            var sid = getNextId();
            this.service.jobs().create('index=_internal | head 1', {id: sid}, {
                success: function () { test.assert.ok(false); },
                error: function() { test.finished(); },
            });
        });

        this.assertion("Promise#List jobs", function(test) {
            var jobListP = this.service.jobs().list();
            jobListP.when(
                function(jobs) {
                    test.assert.ok(jobs);
                    test.assert.ok(jobs.length > 0);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#List jobs", function(test) {
            this.service.jobs().list(function(jobs) {
                test.assert.ok(jobs);
                test.assert.ok(jobs.length > 0);
                
                for(var i = 0; i < jobs.length; i++) {
                    test.assert.ok(jobs[i].isValid());
                    console.log(jobs[i]._id)
                }
                
                test.finished();
            });
        });

        this.assertion("Promise#Contains job", function(test) {
            var sid = getNextId();

            var jobP = this.service.jobs().create('search index=_internal | head 1', {id: sid});
            var containsP = jobP.when(utils.bind(this, function(job) {   
                test.assert.ok(job);
                test.assert.strictEqual(job.sid, sid);
                return Promise.join(job, this.service.jobs().contains(sid));
            }));
            var cancelP = containsP.when(function(job, contains) {
                test.assert.ok(contains);
                return job.cancel();
            });
            cancelP.when(function() {
                test.finished(); 
            });
        });

        this.assertion("Callback#Contains job", function(test) {
            var sid = getNextId();
            this.service.jobs().create('search index=_internal | head 1', {id: sid}, utils.bind(this, function(job) {   
                test.assert.ok(job);
                test.assert.strictEqual(job.sid, sid);

                this.service.jobs().contains(sid, function(contains) {
                    test.assert.ok(contains);

                    job.cancel(function() {
                        test.finished();
                    });
                });
            })); 
        });

        this.assertion("Promise#job results", function(test) {
            var sid = getNextId();
            var service = this.service;
            var job = null;

            var jobP = this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid});
            var doneP = jobP.when(function(createdJob) {
                job = createdJob;
                var properties = {};
                return Promise.join(job, Promise.while({
                    condition: function() { return properties.dispatchState !== "DONE"; },
                    body: function() {
                        return job.read().whenResolved(function(props) {
                            properties = props;
                            
                            return Promise.sleep(1000);
                        });
                    }
                }));
            });
            var resultsP = doneP.whenResolved(function(job) {
                return job.results(); 
            });
            var finishedP = resultsP.whenResolved(function(results) {
                test.assert.strictEqual(results.rows.length, 1);
                test.assert.strictEqual(results.fields.length, 1);
                test.assert.strictEqual(results.fields[0], "count");
                test.assert.strictEqual(results.rows[0][0], "1");
                
                job.cancel().whenResolved(function() { test.finished(); });
            });
        });

        this.assertion("Callback#job results", function(test) {
            var sid = getNextId();
            var service = this.service;
            this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, function(job) {
                var properties = {};

                Async.while(
                    {
                        condition: function() { return properties.dispatchState !== "DONE"; },
                        body: function(iterationDone) {
                            job.read(function(props) {
                                properties = props;
                                Async.sleep(1000, iterationDone); 
                            });
                        },
                    },
                    function() {
                        job.results({}, function(results) {
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
               
        this.assertion("Promise#list applications", function(test) {
            var apps = this.service.apps();
            apps.list().whenResolved(function(appList) {
                test.assert.ok(appList.length > 0);
                test.finished();
            });
        });
               
        this.assertion("Promise#contains applications", function(test) {
            var apps = this.service.apps();
            apps.contains("custom_search").whenResolved(function(found) {
                test.assert.ok(found);
                test.finished();
            });
        });
               
        this.assertion("Promise#create app", function(test) {
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();
            
            apps.create({name: name}).whenResolved(function(app) {
                test.assert.ok(!app.isValid());
                return app.refresh();
            }).whenResolved(function(app) {
                test.assert.ok(app.isValid());
                var appName = app.properties().__name;
                return Promise.join(app, apps.contains(appName));
            }).whenResolved(function(app, found) {
                test.assert.ok(found);
                return app.del();
            }).whenResolved(function() {
                test.finished();
            });
        });
        
        this.assertion("Callback#create app", function(test) {
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();
            
            apps.create({name: name}, function(app) {
                test.assert.ok(!app.isValid());
                app.refresh(function(app) {
                    test.assert.ok(app.isValid());
                    var appName = app.properties().__name;
                    apps.contains(appName, function(found) {
                        test.assert.ok(found);
                        app.del(function() {
                            test.finished();
                        });
                    });
                });
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();