
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
    var Searcher    = Splunk.Searcher;
    var options     = require('../internal/cmdline');
    
    var cmdline = options.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    // Create our HTTP request class for node.js
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    minitest.context("Searcher Tests", function() {
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

        this.assertion("Callback#Searcher + Results", function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.resultsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
                        },
                        function(err) {
                            test.assert.ok(!err);
                            test.assert.ok(iterationCount > 0);
                            test.assert.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.assert.ok(!err);
                test.finished();  
            });
        });

        this.assertion("Callback#Searcher + Events", function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.eventsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
                        },
                        function(err) {
                            test.assert.ok(!err);
                            test.assert.ok(iterationCount > 0);
                            test.assert.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.assert.ok(!err);
                test.finished();  
            });
        });

        this.assertion("Callback#Searcher + Preview", function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.previewIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
                        },
                        function(err) {
                            test.assert.ok(!err);
                            test.assert.ok(iterationCount > 0);
                            test.assert.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.assert.ok(!err);
                test.finished();  
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();