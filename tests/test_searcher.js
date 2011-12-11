
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;
    var Searcher    = Splunk.Searcher;
    
    Splunk.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        setUp: function(done) {
            this.service = svc; 
            done();
        },

        "Callback#Searcher + Results": function(test) {
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
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },

        "Callback#Searcher + Events": function(test) {
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
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },

        "Callback#Searcher + Preview": function(test) {
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
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}