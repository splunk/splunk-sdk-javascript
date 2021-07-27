
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

exports.setup = function (http) {
    var assert = require('chai').assert;
    var splunkjs = require('../index');

    splunkjs.Logger.setLevel("ALL");

    return (
        describe("HTTP GET Tests", function (done) {
            before(function (done) {
                this.http = http;
                done();
            });

            it("Callback#abort simple", function (done) {
                var req = this.http.get("https://httpbin.org/get", {}, {}, 0, function (err, res) {
                    assert.ok(err);
                    assert.strictEqual(err.error, "abort");
                    done();
                });

                req.abort();
            });

            it("Callback#abort delay", function (done) {
                var req = this.http.get("https://httpbin.org/delay/20", {}, {}, 0, function (err, res) {
                    assert.ok(err);
                    assert.strictEqual(err.error, "abort");
                    done();
                });

                splunkjs.Async.sleep(1000, function () {
                    req.abort();
                });
            });

            it("Callback#no args", function (done) {
                this.http.get("https://httpbin.org/get", [], {}, 0, function (err, res) {
                    assert.strictEqual(res.data.url, "https://httpbin.org/get");
                    done();
                });
            });

            it("Callback#success success+error", function (done) {
                this.http.get("https://httpbin.org/get", [], {}, 0, function (err, res) {
                    assert.ok(!err);
                    assert.strictEqual(res.data.url, "https://httpbin.org/get");
                    done();
                });
            });

            it("Callback#error all", function (done) {
                this.timeout(40000);
                this.http.get("https://httpbin.org/status/404", [], {}, 0, function (err, res) {
                    assert.strictEqual(err.status, 404);
                    done();
                });
            });

            it("Callback#args", function (done) {
                this.timeout(40000);
                this.http.get("https://httpbin.org/get", [], { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    var args = res.data.args;
                    assert.strictEqual(args.a, "1");
                    assert.strictEqual(args.b, "2");
                    assert.deepEqual(args.c, ["1", "2", "3"]);
                    assert.strictEqual(args.d, "a/b");
                    assert.strictEqual(res.data.url, "https://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    done();
                });
            });

            it("Callback#args with objects", function (done) {
                this.timeout(40000);
                this.http.get(
                    "https://httpbin.org/get", [],
                    { a: 1, b: { c: "ab", d: 12 } }, 0,
                    function (err, res) {
                        var args = res.data.args;
                        assert.strictEqual(args.a, "1");
                        assert.deepEqual(args.b, ["ab", "12"]);
                        assert.strictEqual(
                            res.data.url,
                            "https://httpbin.org/get?a=1&b=ab&b=12"
                        );
                        done();
                    }
                );
            });

            it("Callback#headers", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("https://httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }

                    assert.strictEqual(res.data.url, "https://httpbin.org/get");
                    done();
                });
            });

            it("Callback#all", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("https://httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }

                    var args = res.data.args;
                    assert.strictEqual(args.a, "1");
                    assert.strictEqual(args.b, "2");
                    assert.deepEqual(args.c, ["1", "2", "3"]);
                    assert.strictEqual(args.d, "a/b");
                    assert.strictEqual(res.data.url, "https://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    done();
                });
            });
        }),

        describe("HTTP POST Tests", function (done) {
            before(function (done) {
                this.http = http;
                done();
            });

            it("Callback#no args", function (done) {
                this.http.post("https://httpbin.org/post", {}, {}, 0, function (err, res) {
                    assert.strictEqual(res.data.url, "https://httpbin.org/post");
                    done();
                });
            });

            it("Callback#success success+error", function (done) {
                this.http.post("https://httpbin.org/post", {}, {}, 0, function (err, res) {
                    assert.ok(!err);
                    assert.strictEqual(res.data.url, "https://httpbin.org/post");
                    done();
                });
            });

            it("Callback#error all", function (done) {
                this.http.post("https://httpbin.org/status/405", {}, {}, 0, function (err, res) {
                    assert.strictEqual(err.status, 405);
                    done();
                });
            });

            it("Callback#args", function (done) {
                this.http.post("https://httpbin.org/post", {}, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    var args = res.data.form;
                    assert.strictEqual(args.a, "1");
                    assert.strictEqual(args.b, "2");
                    assert.deepStrictEqual(args.c, ["1", "2", "3"]);
                    assert.strictEqual(args.d, "a/b");
                    assert.strictEqual(res.data.url, "https://httpbin.org/post");
                    done();
                });
            });

            it("Callback#headers", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("https://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    assert.strictEqual(res.data.url, "https://httpbin.org/post");
                    done();
                });
            });

            it("Callback#all", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("https://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }

                    var args = res.data.form;
                    assert.strictEqual(args.a, "1");
                    assert.strictEqual(args.b, "2");
                    assert.deepStrictEqual(args.c, ["1", "2", "3"]);
                    assert.strictEqual(args.d, "a/b");
                    assert.strictEqual(res.data.url, "https://httpbin.org/post");
                    done();
                });
            })
        }),

        describe("HTTP DELETE Tests", function (done) {
            before(function (done) {
                this.http = http;
                done();
            });

            it("Callback#no args", function (done) {
                this.http.del("https://httpbin.org/delete", [], {}, 0, function (err, res) {
                    assert.strictEqual(res.data.url, "https://httpbin.org/delete");
                    done();
                });
            });

            it("Callback#success success+error", function (done) {
                this.http.del("https://httpbin.org/delete", [], {}, 0, function (err, res) {
                    assert.ok(!err);
                    assert.strictEqual(res.data.url, "https://httpbin.org/delete");
                    done();
                });
            });

            it("Callback#error all", function (done) {
                this.http.del("https://httpbin.org/status/405", [], {}, 0, function (err, res) {
                    assert.strictEqual(err.status, 405);
                    done();
                });
            });

            it("Callback#args", function (done) {
                this.http.del("https://httpbin.org/delete", [], { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    assert.strictEqual(res.data.url, "https://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    done();
                });
            });

            it("Callback#headers", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("https://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    assert.strictEqual(res.data.url, "https://httpbin.org/delete");
                    done();
                });
            });

            it("Callback#all", function (done) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("https://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0, function (err, res) {
                    var returnedHeaders = res.data.headers;
                    for (var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    assert.strictEqual(res.data.url, "https://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    done();
                });
            });

            it("Default arguments to Http work", function (done) {
                var NodeHttp = splunkjs.NodeHttp;
                var h = new NodeHttp();
                assert.ok(h);
                done();
            });

            it("Methods of Http base class that must be overrided", function (done) {
                var h = new splunkjs.Http();
                assert.throws(function () { h.makeRequest("asdf", null, null); });
                assert.throws(function () { h.parseJson("{}"); });
                done();
            })
        })
    )
};

// Run the individual test suite
if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../index');
    var http = new splunkjs.NodeHttp();

    module.exports = exports.setup(http);
}
