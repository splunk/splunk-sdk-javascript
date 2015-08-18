
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
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");
    return {        
        "Callback#callback to object success": function(test) {
            var successfulFunction = function(callback) {
                callback(null, "one", "two");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(one, "one"); 
                test.strictEqual(two, "two");
                test.done();
            });
        },
        
        "Callback#callback to object error - single argument": function(test) {
            var successfulFunction = function(callback) {
                callback("one");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err, "one"); 
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        },
        
        "Callback#callback to object error - multi argument": function(test) {
            var successfulFunction = function(callback) {
                callback(["one", "two"]);
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err[0], "one"); 
                test.strictEqual(err[1], "two");
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        },

        "keyOf works": function(test) {
            test.ok(splunkjs.Utils.keyOf(3, {a: 3, b: 5}));
            test.ok(!splunkjs.Utils.keyOf(3, {a: 12, b: 6}));
            test.done();
        },

        "bind": function(test) {
            var f;
            (function() { 
                f = function(a) { 
                    this.a = a; 
                };
            })();
            var q = {};
            var g = splunkjs.Utils.bind(q, f);
            g(12);
            test.strictEqual(q.a, 12);
            test.done();
        },
        
        "trim": function(test) {
            test.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");

            var realTrim = String.prototype.trim;
            String.prototype.trim = null;
            test.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");
            String.prototype.trim = realTrim;

            test.done();
        },

        "indexOf": function(test) {
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,5], 3), 2);
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,3], 3), 2);
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,5], 12), -1);
            test.done();
        },

        "contains": function(test) {
            test.ok(splunkjs.Utils.contains([1,2,3,4,5], 3));
            test.ok(splunkjs.Utils.contains([1,2,3,4,3], 3));
            test.ok(!splunkjs.Utils.contains([1,2,3,4,5], 12));
            test.done();
        },

        "startsWith": function(test) {
            test.ok(splunkjs.Utils.startsWith("abcdefg", "abc"));
            test.ok(!splunkjs.Utils.startsWith("bcdefg", "abc"));
            test.done();
        },

        "endsWith": function(test) {
            test.ok(splunkjs.Utils.endsWith("abcdef", "def"));
            test.ok(!splunkjs.Utils.endsWith("abcdef", "bcd"));
            test.done();
        },

        "toArray": function(test) {
            (function() {
                var found = splunkjs.Utils.toArray(arguments);
                var expected = [1,2,3,4,5];
                for (var i = 0; i < found.length; i++) {
                    test.strictEqual(found[i], expected[i]);
                }
            })(1,2,3,4,5);
            test.done();
        },

        "isArray": function(test) {
            var a = [1,2,3,4,5];
            test.ok(splunkjs.Utils.isArray(a));
            test.done();
        },

        "isFunction": function(test) {
            test.ok(splunkjs.Utils.isFunction(function() {}));
            test.ok(!splunkjs.Utils.isFunction(3));
            test.ok(!splunkjs.Utils.isFunction("abc"));
            test.ok(!splunkjs.Utils.isFunction({}));
            test.done();
        },

        "isNumber": function(test) {
            test.ok(splunkjs.Utils.isNumber(3));
            test.ok(splunkjs.Utils.isNumber(-2.55113e12));
            test.ok(!splunkjs.Utils.isNumber("3"));
            test.ok(!splunkjs.Utils.isNumber({3: 5}));
            test.done();
        },

        "isObject": function(test) {
            test.ok(splunkjs.Utils.isObject({}));
            test.ok(!splunkjs.Utils.isObject(3));
            test.ok(!splunkjs.Utils.isObject("3"));
            test.done();
        },

        "isEmpty": function(test) {
            test.ok(splunkjs.Utils.isEmpty({}));
            test.ok(splunkjs.Utils.isEmpty([]));
            test.ok(splunkjs.Utils.isEmpty(""));
            test.ok(!splunkjs.Utils.isEmpty({a: 3}));
            test.ok(!splunkjs.Utils.isEmpty([1,2]));
            test.ok(!splunkjs.Utils.isEmpty("abc"));
            test.done();
        },

        "forEach": function(test) {
            var a = [1,2,3,4,5];
            splunkjs.Utils.forEach(
                a,
                function(elem, index, list) {
                    test.strictEqual(a[index], elem);
                }
            );
            var b = {1: 2, 2: 4, 3: 6};
            splunkjs.Utils.forEach(
                b,
                function(elem, key, obj) {
                    test.strictEqual(b[key], elem);
                }
            );
            splunkjs.Utils.forEach(null, function(elem, key, obj) {});
            var c = {length: 5, 1: 12, 2: 15, 3: 8};
            splunkjs.Utils.forEach(
                c,
                function(elem, key, obj) {
                    test.strictEqual(c[key], elem);
                }
            );
            test.done();
        },

        "extend": function(test) {
            var found = splunkjs.Utils.extend({}, {a: 1, b: 2}, {c: 3, b: 4});
            var expected = {a: 1, b: 4, c:3};
            for (var k in found) {
                if (found.hasOwnProperty(k)) {
                    test.strictEqual(found[k], expected[k]);
                }
            }
            test.done();
        },

        "clone": function(test) {
            var a = {a: 1, b: 2, c: {p: 5, q: 6}};
            var b = splunkjs.Utils.clone(a);
            splunkjs.Utils.forEach(a, function(val, key, obj) { test.strictEqual(val, b[key]); });
            a.a = 5;
            test.strictEqual(b.a, 1);
            a.c.p = 4;
            test.strictEqual(b.c.p, 4);
            test.done();
            test.strictEqual(splunkjs.Utils.clone(3), 3);
            test.strictEqual(splunkjs.Utils.clone("asdf"), "asdf");
            var p = [1,2,[3,4],3];
            var q = splunkjs.Utils.clone(p);
            splunkjs.Utils.forEach(p, function(val, index, arr) { test.strictEqual(p[index], q[index]); });
            p[0] = 3;
            test.strictEqual(q[0], 1);
            p[2][0] = 7;
            test.strictEqual(q[2][0], 7);
        },

        "namespaceFromProperties": function(test) {
            var a = splunkjs.Utils.namespaceFromProperties(
                {acl: {owner: "boris",
                       app: "factory",
                       sharing: "system",
                       other: 3},
                 more: 12}
            );
            splunkjs.Utils.forEach(
                a,
                function(val, key, obj) {
                    test.ok((key === "owner" && val === "boris") ||
                            (key === "app" && val === "factory") ||
                            (key === "sharing" && val === "system"));
                }
            );
            test.done();
            
        },

        "namespaceFromProperties - bad data": function(test) {
            var undefinedProps;
            var a = splunkjs.Utils.namespaceFromProperties(undefinedProps);
            test.strictEqual(a.owner, '');
            test.strictEqual(a.app, '');
            test.strictEqual(a.sharing, '');

            var undefinedAcl = {};
            var b = splunkjs.Utils.namespaceFromProperties(undefinedProps);
            test.strictEqual(b.owner, '');
            test.strictEqual(b.app, '');
            test.strictEqual(b.sharing, '');
            test.done();
        }
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}
