
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
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var minitest    = require('../external/minitest');

    var http = new NodeHttp(false);

    minitest.context("HTTP GET Tests", function() {
        this.setupTest(function(done) {
            this.http = http;
            done();
        });
        
        this.assertion("Promise#no args", function(test) {
            var getP = this.http.get("http://httpbin.org/get", [], {}, 0);
            getP.when(
                function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#error", function(test) {
            var getP = this.http.get("http://httpbin.org/status/404", [], {}, 0);
            getP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#args", function(test) {
            var getP = this.http.get("http://httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            getP.when(
                function(res) {
                    var args = res.json.args;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var getP = this.http.get("http://httpbin.org/get", headers, {}, 0);
            getP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var getP = this.http.get("http://httpbin.org/get", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            getP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    var args = res.json.args;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#no args", function(test) {
            var getP = this.http.get("http://httpbin.org/get", [], {}, 0, function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.finished();
                }
            );
        });        

        this.assertion("Callback#success success+error", function(test) {
            var getP = this.http.get("http://httpbin.org/get", [], {}, 0, {
                success: function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.finished();
                },
                error: function(res) {
                    test.assert.ok(false);
                }
            });
        });
        
        this.assertion("Callback#error all", function(test) {
            var getP = this.http.get("http://httpbin.org/status/404", [], {}, 0, function(res) {
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#error success+error", function(test) {
            var getP = this.http.get("http://httpbin.org/status/404", [], {}, 0, {
                success: function(res) {
                    test.assert.ok(false);
                },
                error: function(res) {
                        test.assert.strictEqual(res.status, 404);
                        test.finished();   
                }
            });
        });
        
        this.assertion("Callback#args", function(test) {
            var getP = this.http.get("http://httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    var args = res.json.args;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var getP = this.http.get("http://httpbin.org/get", headers, {}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var getP = this.http.get("http://httpbin.org/get", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    var args = res.json.args;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise + Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var callbackCount = 0;
            var callback = function(res) {
                var returnedHeaders = res.json.headers;
                for(var headerName in headers) {
                    if (headers.hasOwnProperty(headerName)) {
                        // We have to make the header values into strings
                        test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                    }
                }
                var args = res.json.args;
                test.assert.strictEqual(args.a, "1");
                test.assert.strictEqual(args.b, "2");
                test.assert.strictEqual(args.c, "1");
                test.assert.strictEqual(args.d, "a/b");
                test.assert.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");

                callbackCount++;
            };

            var getP = this.http.get("http://httpbin.org/get", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, callback);
            getP.when(
                function(res) {
                    callback(res);
                    test.assert.strictEqual(callbackCount, 2);
                    test.finished();
                }
            );
        });
    });

    minitest.context("HTTP POST Tests", function() {
        this.setupTest(function(done) {
            this.http = http;
            done();
        });
        
        this.assertion("Promise#no args", function(test) {
            var postP = this.http.post("http://httpbin.org/post", {}, {}, 0);
            postP.when(
                function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });        
        
        this.assertion("Promise#error", function(test) {
            var postP = this.http.post("http://httpbin.org/status/405", {}, {}, 0);
            postP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 405);
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#args", function(test) {
            var postP = this.http.post("http://httpbin.org/post", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            postP.when(
                function(res) {
                    var args = res.json.form;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var postP = this.http.post("http://httpbin.org/post", headers, {}, 0);
            postP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var postP = this.http.post("http://httpbin.org/post", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            postP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    var args = res.json.form;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#no args", function(test) {
            var postP = this.http.post("http://httpbin.org/post", {}, {}, 0, function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });   
        
        this.assertion("Callback#success success+error", function(test) {
            var postP = this.http.post("http://httpbin.org/post", {}, {}, 0, {
                success: function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                },
                error: function(res) {
                    test.assert.ok(false);
                }
            });
        });
        
        this.assertion("Callback#error all", function(test) {
            var postP = this.http.post("http://httpbin.org/status/405", {}, {}, 0, function(res) {
                    test.assert.strictEqual(res.status, 405);
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#error success+error", function(test) {
            var postP = this.http.post("http://httpbin.org/status/405", {}, {}, 0, {
                success: function(res) {
                    test.assert.ok(false);
                },
                error: function(res) {
                        test.assert.strictEqual(res.status, 405);
                        test.finished();   
                }
            });
        });
        
        this.assertion("Callback#args", function(test) {
            var postP = this.http.post("http://httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    var args = res.json.form;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var postP = this.http.post("http://httpbin.org/post", headers, {}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var postP = this.http.post("http://httpbin.org/post", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    var args = res.json.form;
                    test.assert.strictEqual(args.a, "1");
                    test.assert.strictEqual(args.b, "2");
                    test.assert.strictEqual(args.c, "1");
                    test.assert.strictEqual(args.d, "a/b");
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise + Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var callbackCount = 0;
            var callback = function(res) {
                var returnedHeaders = res.json.headers;
                for(var headerName in headers) {
                    if (headers.hasOwnProperty(headerName)) {
                        // We have to make the header values into strings
                        test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                    }
                }
                var args = res.json.form;
                test.assert.strictEqual(args.a, "1");
                test.assert.strictEqual(args.b, "2");
                test.assert.strictEqual(args.c, "1");
                test.assert.strictEqual(args.d, "a/b");
                test.assert.strictEqual(res.json.url, "http://httpbin.org/post");

                callbackCount++;
            };

            var postP = this.http.post("http://httpbin.org/post", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, callback);
            postP.when(
                function(res) {
                    callback(res);
                    test.assert.strictEqual(callbackCount, 2);
                    test.finished();
                }
            );
        });
    });

    minitest.context("HTTP DELETE Tests", function() {
        this.setupTest(function(done) {
            this.http = http;
            done();
        });
        
        this.assertion("Promise#no args", function(test) {
            var deleteP = this.http.del("http://httpbin.org/delete", {}, {}, 0);
            deleteP.when(
                function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#error", function(test) {
            var deleteP = this.http.del("http://httpbin.org/status/405", {}, {}, 0);
            deleteP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 405);
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#args", function(test) {
            var deleteP = this.http.del("http://httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            deleteP.when(
                function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var deleteP = this.http.del("http://httpbin.org/delete", headers, {}, 0);
            deleteP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var deleteP = this.http.del("http://httpbin.org/delete", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0);
            deleteP.when(
                function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#no args", function(test) {
            var deleteP = this.http.del("http://httpbin.org/delete", [], {}, 0, function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.finished();
                }
            );
        });        

        this.assertion("Callback#success success+error", function(test) {
            var deleteP = this.http.del("http://httpbin.org/delete", [], {}, 0, {
                success: function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.finished();
                },
                error: function(res) {
                    test.assert.ok(false);
                }
            });
        });
        
        this.assertion("Callback#error all", function(test) {
            var deleteP = this.http.del("http://httpbin.org/status/405", [], {}, 0, function(res) {
                    test.assert.strictEqual(res.status, 405);
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#error success+error", function(test) {
            var deleteP = this.http.del("http://httpbin.org/status/405", [], {}, 0, {
                success: function(res) {
                    test.assert.ok(false);
                },
                error: function(res) {
                        test.assert.strictEqual(res.status, 405);
                        test.finished();   
                }
            });
        });
        
        this.assertion("Callback#args", function(test) {
            var deleteP = this.http.del("http://httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#headers", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var deleteP = this.http.del("http://httpbin.org/delete", headers, {}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.finished();
                }
            );
        });
        
        this.assertion("Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var deleteP = this.http.del("http://httpbin.org/delete", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.assert.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.finished();
                }
            );
        });
        
        this.assertion("Promise + Callback#all", function(test) {
            var headers = {
                "X-Test1": 1,
                "X-Test2": "a/b/c"
            };

            var callbackCount = 0;
            var callback = function(res) {
                var returnedHeaders = res.json.headers;
                for(var headerName in headers) {
                    if (headers.hasOwnProperty(headerName)) {
                        // We have to make the header values into strings
                        test.assert.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                    }
                }
                test.assert.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");

                callbackCount++;
            };

            var deleteP = this.http.del("http://httpbin.org/delete", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, callback);
            deleteP.when(
                function(res) {
                    callback(res);
                    test.assert.strictEqual(callbackCount, 2);
                    test.finished();
                }
            );
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();