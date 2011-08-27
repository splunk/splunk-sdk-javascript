
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
    var minitest    = require('../external/minitest');
    var assert      = require('assert');
    var utils       = Splunk.Utils;
    var Promise     = Splunk.Promise;

    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: "http",
        host: "localhost",
        port: "8000",
        username: "itay",
        password: "changeme",
    });

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++);
    };

    svc.login(function(success) {
        minitest.context("Job Tests", function() {
            this.setup(function() {
                this.service = svc;
            });

            this.assertion("Promise#Create+cancel job", function(test) {
                var sid = getNextId();
                var jobP = this.service.jobs().create('search index=_internal | head 1', {id: sid});
                jobP.when(
                    utils.bind(this, function(job) {   
                        assert.ok(job);
                        assert.strictEqual(job.sid, sid);

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
                    assert.ok(job);
                    assert.strictEqual(job.sid, sid);

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
                    success: function () { assert.ok(false); },
                    error: function() { test.finished(); },
                });
            });

            this.assertion("Promise#List jobs", function(test) {
                var jobListP = this.service.jobs().list();
                jobListP.when(
                    function(jobs) {
                        assert.ok(jobs);
                        assert.ok(jobs.length > 0);
                        test.finished();
                    }
                );
            });

            this.assertion("Callback#List jobs", function(test) {
                this.service.jobs().list(function(jobs) {
                    assert.ok(jobs);
                    assert.ok(jobs.length > 0);
                    test.finished();
                });
            });

            this.assertion("Promise#Contains job", function(test) {
                var sid = getNextId();
                var jobP = this.service.jobs().create('search index=_internal | head 1', {id: sid});
                jobP.when(
                    utils.bind(this, function(job) {   
                        assert.ok(job);
                        assert.strictEqual(job.sid, sid);

                        var containsP = this.service.jobs().contains(sid);
                        containsP.when(
                            function(contains) {
                                assert.ok(contains);

                                var cancelP = job.cancel();
                                cancelP.when(
                                    function() {
                                        test.finished();
                                    }
                                );
                            }
                        );
                    })
                );
            });

            this.assertion("Callback#Contains job", function(test) {
                var sid = getNextId();
                this.service.jobs().create('search index=_internal | head 1', {id: sid}, utils.bind(this, function(job) {   
                    assert.ok(job);
                    assert.strictEqual(job.sid, sid);

                    this.service.jobs().contains(sid, function(contains) {
                        assert.ok(contains);

                        job.cancel(function() {
                            test.finished();
                        });
                    });
                })); 
            });

            this.assertion("Promise#job results", function(test) {
                var sid = getNextId();
                var jobP = this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid});
                var service = this.service;
                jobP.when(
                    function(job) {
                        var properties = {};
                        var jobDoneP = Promise.while({
                            condition: function() { return properties.dispatchState !== "DONE"; },
                            body: function() {
                                return job.read().whenResolved(function(response) {
                                    properties = response.odata.results;

                                    return Promise.sleep(1000);
                                });
                            }
                        });

                        var resultsP = jobDoneP.whenResolved(function() {
                             return job.results();
                        });

                        resultsP.whenResolved(function(results) {
                            assert.strictEqual(results.data.length, 1);
                            assert.strictEqual(results.field_list.length, 1);
                            assert.strictEqual(results.field_list[0], "count");
                            assert.strictEqual(results.data[0].count[0].value, "1");
                            
                            job.cancel().whenResolved(function() { test.finished(); });
                        });
                    }
                );
            });
        });
    });
}); 

if (module === require.main) {
    require('../external/minitest').setupListeners();
    exports.run();
}