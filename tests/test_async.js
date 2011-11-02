
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

(function() {
    var Splunk      = require('../splunk').Splunk;
    var Async       = Splunk.Async;
    var minitest    = require('../contrib/minitest');


    minitest.context("Async Function Tests", function() {
        this.setupTest(function(done) {
            done();
        });
        
        this.assertion("While success", function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < 3; },
                body: function(done) {
                    Async.sleep(0, function() { done(); });
                }
            },
            function(err) {
                test.assert.ok(!err);
                test.finished();
            });
        });
        
        this.assertion("While success deep", function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < 10000; },
                body: function(done) {
                    Async.sleep(0, function() { done(); });
                }
            },
            function(err) {
                test.assert.ok(!err);
                test.finished();
            });
        });
        
        this.assertion("While error", function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < 10000; },
                body: function(done) {
                    Async.sleep(0, function() { done(i === 1000 ? 1 : null); });
                }
            },
            function(err) {
                test.assert.ok(err);
                test.assert.strictEqual(err, 1);
                test.finished();
            });
        });
        
        this.assertion("Parallel success", function(test) {
            Async.parallel([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(one, 1);
                    test.assert.strictEqual(two[0], 2);
                    test.assert.strictEqual(two[1], 3);
                    test.finished();
                }
            );
        });
        
        this.assertion("Parallel success - no reordering", function(test) {
            Async.parallel([
                function(done) {
                    Async.sleep(1, function() { done(null, 1); });  
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(one, 1);
                    test.assert.strictEqual(two[0], 2);
                    test.assert.strictEqual(two[1], 3);
                    test.finished();
                }
            );
        });
        
        this.assertion("Parallel error", function(test) {
            Async.parallel([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                },
                function(done) {
                    Async.sleep(0, function() {
                        done("ERROR");
                    });
                }],
                function(err, one, two) {
                    test.assert.ok(err === "ERROR");
                    test.assert.ok(!one);
                    test.assert.ok(!two);
                    test.finished();
                }
            );
        });
        
        this.assertion("Series success", function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(one, 1);
                    test.assert.strictEqual(two[0], 2);
                    test.assert.strictEqual(two[1], 3);
                    test.finished();
                }
            );
        });
        
        this.assertion("Series reordering success", function(test) {
            var keeper = 0;
            Async.series([
                function(done) {
                    Async.sleep(10, function() {
                        test.assert.strictEqual(keeper++, 0);
                        done(null, 1);
                    });
                },
                function(done) {
                    test.assert.strictEqual(keeper++, 1);
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(keeper, 2);
                    test.assert.strictEqual(one, 1);
                    test.assert.strictEqual(two[0], 2);
                    test.assert.strictEqual(two[1], 3);
                    test.finished();
                }
            );
        });
        
        this.assertion("Series error", function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done("ERROR", 2, 3);
                }],
                function(err, one, two) {
                    test.assert.strictEqual(err, "ERROR");
                    test.assert.ok(!one);
                    test.assert.ok(!two);
                    test.finished();
                }
            );
        });
        
        this.assertion("Parallel map success", function(test) {
            Async.parallelMap(
                function(val, done) { 
                    done(null, val + 1);
                },
                [1, 2, 3],
                function(err, vals) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(vals[0], 2);
                    test.assert.strictEqual(vals[1], 3);
                    test.assert.strictEqual(vals[2], 4);
                    test.finished();
                }
            );
        });
        
        this.assertion("Parallel map error", function(test) {
            Async.parallelMap(
                function(val, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                [1, 2, 3],
                function(err, vals) {
                    test.assert.ok(err);
                    test.assert.ok(!vals);
                    test.assert.strictEqual(err, 5);
                    test.finished();
                }
            );
        });
        
        this.assertion("Series map success", function(test) {
            var keeper = 1;
            Async.seriesMap(
                function(val, done) { 
                    test.assert.strictEqual(keeper++, val);
                    done(null, val + 1);
                },
                [1, 2, 3],
                function(err, vals) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(vals[0], 2);
                    test.assert.strictEqual(vals[1], 3);
                    test.assert.strictEqual(vals[2], 4);
                    test.assert.strictEqual(vals[2], keeper);
                    test.finished();
                }
            );
        });
        
        this.assertion("Series map error", function(test) {
            Async.seriesMap(
                function(val, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                [1, 2, 3],
                function(err, vals) {
                    test.assert.ok(err);
                    test.assert.ok(!vals);
                    test.assert.strictEqual(err, 5);
                    test.finished();
                }
            );
        });
        
        this.assertion("Chain single success", function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                }],
                function(err, val) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(val, 3);
                    test.finished();
                }
            );
        });
        
        this.assertion("Chain multiple success", function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                }],
                function(err, val1, val2) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(val1, 3);
                    test.assert.strictEqual(val2, 4);
                    test.finished();
                }
            );
        });
        
        this.assertion("Chain arity change success", function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1);
                },
                function(val1, callback) {
                    callback(null, val1 + 1, 5);
                }],
                function(err, val1, val2) {
                    test.assert.ok(!err);
                    test.assert.strictEqual(val1, 3);
                    test.assert.strictEqual(val2, 5);
                    test.finished();
                }
            );
        });
        
        this.assertion("Chain error", function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(5, val1 + 1);
                },
                function(val1, callback) {
                    callback(null, val1 + 1, 5);
                }],
                function(err, val1, val2) {
                    test.assert.ok(err);
                    test.assert.ok(!val1);
                    test.assert.ok(!val2);
                    test.assert.strictEqual(err, 5);
                    test.finished();
                }
            );
        });
        
        this.assertion("Chain no tasks", function(test) {
            Async.chain([],
                function(err, val1, val2) {
                    test.assert.ok(!err);
                    test.assert.ok(!val1);
                    test.assert.ok(!val2);
                    test.finished();
                }
            );
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();