
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

exports.setup = function() {
    var Splunk      = require('../splunk').Splunk;
    var Async       = Splunk.Async;

    var isBrowser = typeof "window" !== "undefined";

    return {        
        "While success": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < 3; },
                function(done) {
                    Async.sleep(0, function() { done(); });
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "While success deep": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < (isBrowser ? 100 : 10000); },
                function(done) {
                    Async.sleep(0, function() { done(); });
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "While error": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < (isBrowser ? 100 : 10000); },
                function(done) {
                    Async.sleep(0, function() { done(i === (isBrowser ? 50 : 10000) ? 1 : null); });
                },
                function(err) {
                    test.ok(err);
                    test.strictEqual(err, 1);
                    test.done();
                }
            );
        },
        
        "Parallel success": function(test) {
            Async.parallel([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Parallel success - no reordering": function(test) {
            Async.parallel([
                function(done) {
                    Async.sleep(1, function() { done(null, 1); });  
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Parallel error": function(test) {
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
                    test.ok(err === "ERROR");
                    test.ok(!one);
                    test.ok(!two);
                    test.done();
                }
            );
        },
        
        "Series success": function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Series reordering success": function(test) {
            var keeper = 0;
            Async.series([
                function(done) {
                    Async.sleep(10, function() {
                        test.strictEqual(keeper++, 0);
                        done(null, 1);
                    });
                },
                function(done) {
                    test.strictEqual(keeper++, 1);
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(keeper, 2);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Series error": function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done("ERROR", 2, 3);
                }],
                function(err, one, two) {
                    test.strictEqual(err, "ERROR");
                    test.ok(!one);
                    test.ok(!two);
                    test.done();
                }
            );
        },
        
        "Parallel map success": function(test) {
            Async.parallelMap(
                function(val, done) { 
                    done(null, val + 1);
                },
                [1, 2, 3],
                function(err, vals) {
                    test.ok(!err);
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.done();
                }
            );
        },
        
        "Parallel map error": function(test) {
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
                    test.ok(err);
                    test.ok(!vals);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Series map success": function(test) {
            var keeper = 1;
            Async.seriesMap(
                function(val, done) { 
                    test.strictEqual(keeper++, val);
                    done(null, val + 1);
                },
                [1, 2, 3],
                function(err, vals) {
                    test.ok(!err);
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.strictEqual(vals[2], keeper);
                    test.done();
                }
            );
        },
        
        "Series map error": function(test) {
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
                    test.ok(err);
                    test.ok(!vals);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Chain single success": function(test) {
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
                    test.ok(!err);
                    test.strictEqual(val, 3);
                    test.done();
                }
            );
        },
        
        "Chain multiple success": function(test) {
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
                    test.ok(!err);
                    test.strictEqual(val1, 3);
                    test.strictEqual(val2, 4);
                    test.done();
                }
            );
        },
        
        "Chain arity change success": function(test) {
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
                    test.ok(!err);
                    test.strictEqual(val1, 3);
                    test.strictEqual(val2, 5);
                    test.done();
                }
            );
        },
        
        "Chain error": function(test) {
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
                    test.ok(err);
                    test.ok(!val1);
                    test.ok(!val2);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Chain no tasks": function(test) {
            Async.chain([],
                function(err, val1, val2) {
                    test.ok(!err);
                    test.ok(!val1);
                    test.ok(!val2);
                    test.done();
                }
            );
        }
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}