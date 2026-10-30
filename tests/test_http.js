
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

    var HTTPBIN_URL = process.env.HTTPBIN_URL || "http://localhost:8080";

    return (
        describe("HTTP GET Tests", () => {
            before(function () {
                this.http = http;
            });

            it("Timeout simple", async function () {
                try {
                    // Response timeout set to 1ms i.e service call will abort after 1ms
                    let res = await this.http.get(HTTPBIN_URL + "/delay/1", {}, {}, 0, response_timeout = 1);
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                    assert.strictEqual(error.error, "abort");
                }
            });

            it("Timeout delay", async function () {
                try {
                    let req = await this.http.get(HTTPBIN_URL + "/delay/10", {}, {}, 0, response_timeout = 1000);
                    assert.ok(!req);
                } catch (error) {
                    assert.ok(error);
                    assert.strictEqual(error.error, "abort");
                }
            });

            it("No args", async function () {
                let res = await this.http.get(HTTPBIN_URL + "/get", [], {}, 0);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/get?");
            });

            it("Success and Error", async function () {
                try {
                    let res = await this.http.get(HTTPBIN_URL + "/get", [], {}, 0);
                    assert.strictEqual(res.data.url, HTTPBIN_URL + "/get?");
                } catch (error) {
                    assert.ok(!error);
                }
            });

            it("Error all", async function () {
                this.timeout(40000);
                try {
                    let res = await this.http.get(HTTPBIN_URL + "/status/404", [], {}, 0);
                    assert.ok(!res);
                } catch (error) {
                    assert.strictEqual(error.status, 404);
                }
            });

            it("With args", async function () {
                this.timeout(40000);
                let res = await this.http.get(HTTPBIN_URL + "/get", [], { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                let args = res.data.args;
                assert.deepEqual(args.a, ["1"]);
                assert.deepEqual(args.b, ["2"]);
                assert.deepEqual(args.c, ["1", "2", "3"]);
                assert.deepEqual(args.d, ["a/b"]);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
            });

            it("Args with objects", async function () {
                this.timeout(40000);
                let res = await this.http.get(HTTPBIN_URL + "/get", [], { a: 1, b: { c: "ab", d: 12 } }, 0);
                let args = res.data.args;
                assert.deepEqual(args.a, ["1"]);
                assert.deepEqual(args.b, ["ab", "12"]);
                assert.strictEqual(
                    res.data.url,
                    HTTPBIN_URL + "/get?a=1&b=ab&b=12"
                );
            });

            it("With headers", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };
                let res = await this.http.get(HTTPBIN_URL + "/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    // We have to make the header values into strings
                    assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                }

                assert.strictEqual(res.data.url, HTTPBIN_URL + "/get?");
            });

            it("All", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                let res = await this.http.get(HTTPBIN_URL + "/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    // We have to make the header values into strings
                    assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                }

                let args = res.data.args;
                assert.deepEqual(args.a, ["1"]);
                assert.deepEqual(args.b, ["2"]);
                assert.deepEqual(args.c, ["1", "2", "3"]);
                assert.deepEqual(args.d, ["a/b"]);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
            });
        }),

        describe("HTTP POST Tests", () => {
            before(function () {
                this.http = http;
            });

            it("No args", async function () {
                let res = await this.http.post(HTTPBIN_URL + "/post", {}, {}, 0);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/post?");
            });

            it("Success and error", async function () {
                try {
                    let res = await this.http.post(HTTPBIN_URL + "/post", {}, {}, 0);
                    assert.strictEqual(res.data.url, HTTPBIN_URL + "/post?");
                } catch (error) {
                    assert.ok(!error);
                }
            });

            it("Error all", async function () {
                try {
                    let res = await this.http.post(HTTPBIN_URL + "/status/405", {}, {}, 0);
                    assert.ok(!res);
                } catch (error) {
                    assert.strictEqual(error.status, 405);
                }
            });

            it("With args", async function () {
                let res = await this.http.post(HTTPBIN_URL + "/post", {}, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                let args = res.data.form;
                assert.deepEqual(args.a, ["1"]);
                assert.deepEqual(args.b, ["2"]);
                assert.deepStrictEqual(args.c, ["1", "2", "3"]);
                assert.deepEqual(args.d, ["a/b"]);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/post?");
            });

            it("Headers", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                let res = await this.http.post(HTTPBIN_URL + "/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    // We have to make the header values into strings
                    assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                }
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/post?");
            });

            it("All", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                let res = await this.http.post(HTTPBIN_URL + "/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    // We have to make the header values into strings
                    assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                }

                let args = res.data.form;
                assert.deepEqual(args.a, ["1"]);
                assert.deepEqual(args.b, ["2"]);
                assert.deepStrictEqual(args.c, ["1", "2", "3"]);
                assert.deepEqual(args.d, ["a/b"]);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/post?");
            })
        }),

        describe("HTTP DELETE Tests", () => {
            before(function () {
                this.http = http;
            });

            it("No args", async function () {
                let res = await this.http.del(HTTPBIN_URL + "/delete", [], {}, 0);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/delete?");
            });

            it("Success and error", async function () {
                try {
                    let res = await this.http.del(HTTPBIN_URL + "/delete", [], {}, 0);
                    assert.strictEqual(res.data.url, HTTPBIN_URL + "/delete?");
                } catch (error) {
                    assert.ok(!error);
                }
            });

            it("Error all", async function () {
                try {
                    let res = await this.http.del(HTTPBIN_URL + "/status/405", [], {}, 0);
                    assert.ok(!res);
                } catch (error) {
                    assert.strictEqual(error.status, 405);
                }
            });

            it("Args", async function () {
                let res = await this.http.del(HTTPBIN_URL + "/delete", [], { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
            });

            it("Headers", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                let res = await this.http.del(HTTPBIN_URL + "/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    if (headers.hasOwnProperty(headerName)) {
                        // We have to make the header values into strings
                        assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                    }
                }
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/delete?");
            });

            test("All", async function () {
                let headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                let res = await this.http.del(HTTPBIN_URL + "/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1, 2, 3], d: "a/b" }, 0);
                let returnedHeaders = res.data.headers;
                for (let headerName in headers) {
                    if (headers.hasOwnProperty(headerName)) {
                        // We have to make the header values into strings
                        assert.deepEqual([headers[headerName] + ""], returnedHeaders[headerName]);
                    }
                }
                assert.strictEqual(res.data.url, HTTPBIN_URL + "/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
            });

            it("Provides default arguments to NodeHttp()", function (done) {
                var NodeHttp = splunkjs.NodeHttp;
                var h = new NodeHttp();
                assert.ok(h);
                done();
            });

            it("overrides Http() base class methods", function (done) {
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
