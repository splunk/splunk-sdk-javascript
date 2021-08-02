
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
    var splunkjs = require('../index');
    var assert = require('chai').assert;

    splunkjs.Logger.setLevel("ALL");

    return (
        describe('Utils tests', function (done) {
            it("Callback#callback to object success", function (done) {
                var successfulFunction = function (callback) {
                    callback(null, "one", "two");
                };

                successfulFunction(function (err, one, two) {
                    assert.strictEqual(one, "one");
                    assert.strictEqual(two, "two");
                    done();
                });
            });

            it("Callback#callback to object error - single argument", function (done) {
                var successfulFunction = function (callback) {
                    callback("one");
                };

                successfulFunction(function (err, one, two) {
                    assert.strictEqual(err, "one");
                    assert.ok(!one);
                    assert.ok(!two);
                    done();
                });
            });

            it("Callback#callback to object error - multi argument", function (done) {
                var successfulFunction = function (callback) {
                    callback(["one", "two"]);
                };

                successfulFunction(function (err, one, two) {
                    assert.strictEqual(err[0], "one");
                    assert.strictEqual(err[1], "two");
                    assert.ok(!one);
                    assert.ok(!two);
                    done();
                });
            });

            it("keyOf works", function (done) {
                assert.ok(splunkjs.Utils.keyOf(3, { a: 3, b: 5 }));
                assert.ok(!splunkjs.Utils.keyOf(3, { a: 12, b: 6 }));
                done();
            });

            it("bind", function (done) {
                var f;
                (function () {
                    f = function (a) {
                        this.a = a;
                    };
                })();
                var q = {};
                var g = splunkjs.Utils.bind(q, f);
                g(12);
                assert.strictEqual(q.a, 12);
                done();
            });

            it("trim", function (done) {
                assert.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");

                var realTrim = String.prototype.trim;
                String.prototype.trim = null;
                assert.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");
                String.prototype.trim = realTrim;

                done();
            });

            it("indexOf", function (done) {
                assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 5], 3), 2);
                assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 3], 3), 2);
                assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 5], 12), -1);
                done();
            });

            it("contains", function (done) {
                assert.ok(splunkjs.Utils.contains([1, 2, 3, 4, 5], 3));
                assert.ok(splunkjs.Utils.contains([1, 2, 3, 4, 3], 3));
                assert.ok(!splunkjs.Utils.contains([1, 2, 3, 4, 5], 12));
                done();
            });

            it("startsWith", function (done) {
                assert.ok(splunkjs.Utils.startsWith("abcdefg", "abc"));
                assert.ok(!splunkjs.Utils.startsWith("bcdefg", "abc"));
                done();
            });

            it("endsWith", function (done) {
                assert.ok(splunkjs.Utils.endsWith("abcdef", "def"));
                assert.ok(!splunkjs.Utils.endsWith("abcdef", "bcd"));
                done();
            });

            it("toArray", function (done) {
                (function () {
                    var found = splunkjs.Utils.toArray(arguments);
                    var expected = [1, 2, 3, 4, 5];
                    for (var i = 0; i < found.length; i++) {
                        assert.strictEqual(found[i], expected[i]);
                    }
                })(1, 2, 3, 4, 5);
                done();
            });

            it("isArray", function (done) {
                var a = [1, 2, 3, 4, 5];
                assert.ok(splunkjs.Utils.isArray(a));
                done();
            });

            it("isFunction", function (done) {
                assert.ok(splunkjs.Utils.isFunction(function () { }));
                assert.ok(!splunkjs.Utils.isFunction(3));
                assert.ok(!splunkjs.Utils.isFunction("abc"));
                assert.ok(!splunkjs.Utils.isFunction({}));
                done();
            });

            it("isNumber", function (done) {
                assert.ok(splunkjs.Utils.isNumber(3));
                assert.ok(splunkjs.Utils.isNumber(-2.55113e12));
                assert.ok(!splunkjs.Utils.isNumber("3"));
                assert.ok(!splunkjs.Utils.isNumber({ 3: 5 }));
                done();
            });

            it("isObject", function (done) {
                assert.ok(splunkjs.Utils.isObject({}));
                assert.ok(!splunkjs.Utils.isObject(3));
                assert.ok(!splunkjs.Utils.isObject("3"));
                done();
            });

            it("isEmpty", function (done) {
                assert.ok(splunkjs.Utils.isEmpty({}));
                assert.ok(splunkjs.Utils.isEmpty([]));
                assert.ok(splunkjs.Utils.isEmpty(""));
                assert.ok(!splunkjs.Utils.isEmpty({ a: 3 }));
                assert.ok(!splunkjs.Utils.isEmpty([1, 2]));
                assert.ok(!splunkjs.Utils.isEmpty("abc"));
                done();
            });

            it("forEach", function (done) {
                var a = [1, 2, 3, 4, 5];
                splunkjs.Utils.forEach(
                    a,
                    function (elem, index, list) {
                        assert.strictEqual(a[index], elem);
                    }
                );
                var b = { 1: 2, 2: 4, 3: 6 };
                splunkjs.Utils.forEach(
                    b,
                    function (elem, key, obj) {
                        assert.strictEqual(b[key], elem);
                    }
                );
                splunkjs.Utils.forEach(null, function (elem, key, obj) { });
                var c = { length: 5, 1: 12, 2: 15, 3: 8 };
                splunkjs.Utils.forEach(
                    c,
                    function (elem, key, obj) {
                        assert.strictEqual(c[key], elem);
                    }
                );
                done();
            });

            it("extend", function (done) {
                var found = splunkjs.Utils.extend({}, { a: 1, b: 2 }, { c: 3, b: 4 });
                var expected = { a: 1, b: 4, c: 3 };
                for (var k in found) {
                    if (found.hasOwnProperty(k)) {
                        assert.strictEqual(found[k], expected[k]);
                    }
                }
                done();
            });

            it("clone", function (done) {
                var a = { a: 1, b: 2, c: { p: 5, q: 6 } };
                var b = splunkjs.Utils.clone(a);
                splunkjs.Utils.forEach(a, function (val, key, obj) { assert.strictEqual(val, b[key]); });
                a.a = 5;
                assert.strictEqual(b.a, 1);
                a.c.p = 4;
                assert.strictEqual(b.c.p, 4);
                done();
                assert.strictEqual(splunkjs.Utils.clone(3), 3);
                assert.strictEqual(splunkjs.Utils.clone("asdf"), "asdf");
                var p = [1, 2, [3, 4], 3];
                var q = splunkjs.Utils.clone(p);
                splunkjs.Utils.forEach(p, function (val, index, arr) { assert.strictEqual(p[index], q[index]); });
                p[0] = 3;
                assert.strictEqual(q[0], 1);
                p[2][0] = 7;
                assert.strictEqual(q[2][0], 7);
            });

            it("namespaceFromProperties", function (done) {
                var a = splunkjs.Utils.namespaceFromProperties(
                    {
                        acl: {
                            owner: "boris",
                            app: "factory",
                            sharing: "system",
                            other: 3
                        },
                        more: 12
                    });
                splunkjs.Utils.forEach(
                    a,
                    function (val, key, obj) {
                        assert.ok((key === "owner" && val === "boris") ||
                            (key === "app" && val === "factory") ||
                            (key === "sharing" && val === "system"));
                    }
                );
                done();
            });

            it("namespaceFromProperties - bad data", function (done) {
                var undefinedProps;
                var a = splunkjs.Utils.namespaceFromProperties(undefinedProps);
                assert.strictEqual(a.owner, '');
                assert.strictEqual(a.app, '');
                assert.strictEqual(a.sharing, '');

                var b = splunkjs.Utils.namespaceFromProperties(undefinedProps);
                assert.strictEqual(b.owner, '');
                assert.strictEqual(b.app, '');
                assert.strictEqual(b.sharing, '');
                done();
            });
        })
    );
}
// Run the individual test suite
if (module.id === __filename && module.parent.id.includes('mocha')) {
    module.exports = exports.setup();
}
