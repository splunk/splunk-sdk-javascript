
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
    var Searcher    = Splunk.Searcher;

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

    minitest.context("Searcher Tests", function() {
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

        this.assertion("Searcher + Results", function(test) {
            var sid = getNextId();
            var jobP = this.service.jobs().create('search index=_internal | head 10', {id: sid});
            var searcher = null;
            var job = null;
            
            jobP.whenResolved(function(createdJob) {
                job = createdJob;
                searcher = new Searcher.JobManager(test.service, job);
                
                var searchDoneP = searcher.done();
                
                // Report progress
                var progressCount = 0;
                searchDoneP.onProgress(function(properties) {
                    progressCount++;
                });
                
                // When the search is done, iterate over the results
                return searchDoneP.whenResolved(function() {
                    var iterator = searcher.resultsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    var iterateP = Promise.while({
                        condition: function() { return hasMore; },
                        body: function(index) {
                            return iterator.next().whenResolved(function(more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                            });
                        }
                    });
                    
                    return iterateP.whenResolved(function() {
                        test.assert.ok(progressCount > 0);
                        test.assert.ok(iterationCount > 0);
                        test.assert.strictEqual(totalResultCount, 10);
                    });
                });
            }).whenResolved(function() {
                return job.cancel();
            }).whenResolved(function() {
                test.finished();
            });
        });

        this.assertion("Searcher + Events", function(test) {
            var sid = getNextId();
            var jobP = this.service.jobs().create('search index=_internal | head 10', {id: sid});
            var searcher = null;
            var job = null;
            
            jobP.whenResolved(function(createdJob) {
                job = createdJob;
                searcher = new Searcher.JobManager(test.service, job);
                
                var searchDoneP = searcher.done();
                
                // Report progress
                var progressCount = 0;
                searchDoneP.onProgress(function(properties) {
                    progressCount++;
                });
                
                // When the search is done, iterate over the results
                return searchDoneP.whenResolved(function() {
                    var iterator = searcher.eventsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    var iterateP = Promise.while({
                        condition: function() { return hasMore; },
                        body: function(index) {
                            return iterator.next().whenResolved(function(more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                            });
                        }
                    });
                    
                    return iterateP.whenResolved(function() {
                        test.assert.ok(progressCount > 0);
                        test.assert.ok(iterationCount > 0);
                        test.assert.strictEqual(totalResultCount, 10);
                    });
                });
            }).whenResolved(function() {
                return job.cancel();
            }).whenResolved(function() {
                test.finished();
            });
        });

        this.assertion("Searcher + Preview", function(test) {
            var sid = getNextId();
            var jobP = this.service.jobs().create('search index=_internal | head 10 | stats count', {id: sid});
            var searcher = null;
            var job = null;
            
            jobP.whenResolved(function(createdJob) {
                job = createdJob;
                searcher = new Searcher.JobManager(test.service, job);
                
                job.enablePreview();
                
                var iterationCount = 0;
                var iterator = searcher.previewIterator(100);
                var iterateP = Promise.while({
                    condition: function() { return !searcher.isDone(); },
                    body: function(index) {
                        return iterator.next().whenResolved(function(more, results) {
                            iterationCount++;
                            iterator.reset();
                            
                            return Promise.sleep(1000);
                        });
                    }
                });
                
                var searchDoneP = searcher.done();
                
                // Report progress
                var progressCount = 0;
                searchDoneP.onProgress(function(properties) {
                    progressCount++;
                });
                    
                return Promise.join(iterateP, searchDoneP).whenResolved(function() {
                    test.assert.ok(progressCount > 0);
                    test.assert.ok(iterationCount > 0);
                });
            }).whenResolved(function() {
                return job.cancel();
            }).whenResolved(function() {
                test.finished();
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();