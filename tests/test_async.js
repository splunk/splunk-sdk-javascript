
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

exports.setup = function () {
    var assert = require('chai').assert;
    var splunkjs = require('../index');
    var Async = splunkjs.Async;
    var isBrowser = typeof "window" !== "undefined";
    splunkjs.Logger.setLevel("ALL");

    return (
        describe('Async tests', function () {

            it("While success", function (done) {
                var i = 0;
                Async.whilst(
                    function () { return i++ < 3; },
                    function (done) {
                        Async.sleep(0, function () { done(); });
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("While success deep", function (done) {
                var i = 0;
                Async.whilst(
                    function () { return i++ < (isBrowser ? 100 : 10000); },
                    function (done) {
                        Async.sleep(0, function () { done(); });
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("While error", function (done) {
                var i = 0;
                Async.whilst(
                    function () { return i++ < (isBrowser ? 100 : 10000); },
                    function (done) {
                        Async.sleep(0, function () { done(i === (isBrowser ? 50 : 10000) ? 1 : null); });
                    },
                    function (err) {
                        assert.ok(err);
                        assert.strictEqual(err, 1);
                        done();
                    }
                );
            });

            it("Whilst sans condition is never", function (done) {
                var i = false;
                Async.whilst(
                    undefined,
                    function (done) { i = true; done(); },
                    function (err) {
                        assert.strictEqual(i, false);
                        done();
                    }
                );
            });

            it("Whilst with empty body does nothing", function (done) {
                var i = true;
                Async.whilst(
                    function () {
                        if (i) {
                            i = false;
                            return true;
                        }
                        else {
                            return i;
                        }
                    },
                    undefined,
                    function (err) {
                        done();
                    }
                );
            });

            it("Parallel success", function (done) {
                Async.parallel([
                    function (done) {
                        done(null, 1);
                    },
                    function (done) {
                        done(null, 2, 3);
                    }],
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    }
                );
            });

            it("Parallel success - outside of arrays", function (done) {
                Async.parallel(
                    function (done) { done(null, 1); },
                    function (done) { done(null, 2, 3); },
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    });
            });

            it("Parallel success - no reordering", function (done) {
                Async.parallel([
                    function (done) {
                        Async.sleep(1, function () { done(null, 1); });
                    },
                    function (done) {
                        done(null, 2, 3);
                    }],
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    }
                );
            });

            it("Parallel error", function (done) {
                Async.parallel([
                    function (done) {
                        done(null, 1);
                    },
                    function (done) {
                        done(null, 2, 3);
                    },
                    function (done) {
                        Async.sleep(0, function () {
                            done("ERROR");
                        });
                    }],
                    function (err, one, two) {
                        assert.ok(err === "ERROR");
                        assert.ok(!one);
                        assert.ok(!two);
                        done();
                    }
                );
            });

            it("Parallel no tasks", function (done) {
                Async.parallel(
                    [],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Series success", function (done) {
                Async.series([
                    function (done) {
                        done(null, 1);
                    },
                    function (done) {
                        done(null, 2, 3);
                    }],
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    }
                );
            });

            it("Series success - outside of array", function (done) {
                Async.series(
                    function (done) {
                        done(null, 1);
                    },
                    function (done) {
                        done(null, 2, 3);
                    },
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    }
                );
            });

            it("Series reordering success", function (done) {
                var keeper = 0;
                Async.series([
                    function (done) {
                        Async.sleep(10, function () {
                            assert.strictEqual(keeper++, 0);
                            done(null, 1);
                        });
                    },
                    function (done) {
                        assert.strictEqual(keeper++, 1);
                        done(null, 2, 3);
                    }],
                    function (err, one, two) {
                        assert.ok(!err);
                        assert.strictEqual(keeper, 2);
                        assert.strictEqual(one, 1);
                        assert.strictEqual(two[0], 2);
                        assert.strictEqual(two[1], 3);
                        done();
                    }
                );
            });

            it("Series error", function (done) {
                Async.series([
                    function (done) {
                        done(null, 1);
                    },
                    function (done) {
                        done("ERROR", 2, 3);
                    }],
                    function (err, one, two) {
                        assert.strictEqual(err, "ERROR");
                        assert.ok(!one);
                        assert.ok(!two);
                        done();
                    }
                );
            });

            it("Series no tasks", function (done) {
                Async.series(
                    [],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Parallel map success", function (done) {
                Async.parallelMap(
                    [1, 2, 3],
                    function (val, idx, done) {
                        done(null, val + 1);
                    },
                    function (err, vals) {
                        assert.ok(!err);
                        assert.strictEqual(vals[0], 2);
                        assert.strictEqual(vals[1], 3);
                        assert.strictEqual(vals[2], 4);
                        done();
                    }
                );
            });

            it("Parallel map reorder success", function (done) {
                Async.parallelMap(
                    [1, 2, 3],
                    function (val, idx, done) {
                        if (val === 2) {
                            Async.sleep(100, function () { done(null, val + 1); });
                        }
                        else {
                            done(null, val + 1);
                        }
                    },
                    function (err, vals) {
                        assert.strictEqual(vals[0], 2);
                        assert.strictEqual(vals[1], 3);
                        assert.strictEqual(vals[2], 4);
                        done();
                    }
                );
            });

            it("Parallel map error", function (done) {
                Async.parallelMap(
                    [1, 2, 3],
                    function (val, idx, done) {
                        if (val === 2) {
                            done(5);
                        }
                        else {
                            done(null, val + 1);
                        }
                    },
                    function (err, vals) {
                        assert.ok(err);
                        assert.ok(!vals);
                        assert.strictEqual(err, 5);
                        done();
                    }
                );
            });

            it("Series map success", function (done) {
                var keeper = 1;
                Async.seriesMap(
                    [1, 2, 3],
                    function (val, idx, done) {
                        assert.strictEqual(keeper++, val);
                        done(null, val + 1);
                    },
                    function (err, vals) {
                        assert.ok(!err);
                        assert.strictEqual(vals[0], 2);
                        assert.strictEqual(vals[1], 3);
                        assert.strictEqual(vals[2], 4);
                        assert.strictEqual(vals[2], keeper);
                        done();
                    }
                );
            });

            it("Series map error", function (done) {
                Async.seriesMap(
                    [1, 2, 3],
                    function (val, idx, done) {
                        if (val === 2) {
                            done(5);
                        }
                        else {
                            done(null, val + 1);
                        }
                    },
                    function (err, vals) {
                        assert.ok(err);
                        assert.ok(!vals);
                        assert.strictEqual(err, 5);
                        done();
                    }
                );
            });

            it("Chain single success", function (done) {
                Async.chain([
                    function (callback) {
                        callback(null, 1);
                    },
                    function (val, callback) {
                        callback(null, val + 1);
                    },
                    function (val, callback) {
                        callback(null, val + 1);
                    }],
                    function (err, val) {
                        assert.ok(!err);
                        assert.strictEqual(val, 3);
                        done();
                    }
                );
            });

            it("Chain flat single success", function (done) {
                Async.chain(
                    function (callback) {
                        callback(null, 1);
                    },
                    function (val, callback) {
                        callback(null, val + 1);
                    },
                    function (val, callback) {
                        callback(null, val + 1);
                    },
                    function (err, val) {
                        assert.ok(!err);
                        assert.strictEqual(val, 3);
                        done();
                    }
                );
            });

            it("Chain flat multiple success", function (done) {
                Async.chain(
                    function (callback) {
                        callback(null, 1, 2);
                    },
                    function (val1, val2, callback) {
                        callback(null, val1 + 1, val2 + 1);
                    },
                    function (val1, val2, callback) {
                        callback(null, val1 + 1, val2 + 1);
                    },
                    function (err, val1, val2) {
                        assert.ok(!err);
                        assert.strictEqual(val1, 3);
                        assert.strictEqual(val2, 4);
                        done();
                    }
                );
            });

            it("Chain flat arity change success", function (done) {
                Async.chain(
                    function (callback) {
                        callback(null, 1, 2);
                    },
                    function (val1, val2, callback) {
                        callback(null, val1 + 1);
                    },
                    function (val1, callback) {
                        callback(null, val1 + 1, 5);
                    },
                    function (err, val1, val2) {
                        assert.ok(!err);
                        assert.strictEqual(val1, 3);
                        assert.strictEqual(val2, 5);
                        done();
                    }
                );
            });

            it("Chain error", function (done) {
                Async.chain([
                    function (callback) {
                        callback(null, 1, 2);
                    },
                    function (val1, val2, callback) {
                        callback(5, val1 + 1);
                    },
                    function (val1, callback) {
                        callback(null, val1 + 1, 5);
                    }],
                    function (err, val1, val2) {
                        assert.ok(err);
                        assert.ok(!val1);
                        assert.ok(!val2);
                        assert.strictEqual(err, 5);
                        done();
                    }
                );
            });

            it("Chain no tasks", function (done) {
                Async.chain([],
                    function (err, val1, val2) {
                        assert.ok(!err);
                        assert.ok(!val1);
                        assert.ok(!val2);
                        done();
                    }
                );
            });

            it("Parallel each reodrder success", function (done) {
                var total = 0;
                Async.parallelEach(
                    [1, 2, 3],
                    function (val, idx, done) {
                        var go = function () {
                            total += val;
                            done();
                        };

                        if (idx === 1) {
                            Async.sleep(100, go);
                        }
                        else {
                            go();
                        }
                    },
                    function (err) {
                        assert.ok(!err);
                        assert.strictEqual(total, 6);
                        done();
                    }
                );
            });

            it("Series each success", function (done) {
                var results = [1, 3, 6];
                var total = 0;
                Async.seriesEach(
                    [1, 2, 3],
                    function (val, idx, done) {
                        total += val;
                        assert.strictEqual(total, results[idx]);
                        done();
                    },
                    function (err) {
                        assert.ok(!err);
                        assert.strictEqual(total, 6);
                        done();
                    }
                );
            });

            it("Augment callback", function (done) {
                var callback = function (a, b) {
                    assert.ok(a);
                    assert.ok(b);
                    assert.strictEqual(a, 1);
                    assert.strictEqual(b, 2);

                    done();
                };

                var augmented = Async.augment(callback, 2);
                augmented(1);
            });

        })
    );
};

// Run the individual test suite
if (module.id === __filename && module.parent.id.includes('mocha')) {
    module.exports = exports.setup();
}
