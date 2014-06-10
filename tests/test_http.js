
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

exports.setup = function(http) {
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");
    return {

        "HTTP GET Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },

            "Callback#abort simple": function(test) {
                var req = this.http.get("https://httpbin.org/get", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                req.abort();
            },
            
            "Callback#abort delay": function(test) {
                var req = this.http.get("https://httpbin.org/delay/20", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                splunkjs.Async.sleep(1000, function() {
                    req.abort();
                });
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.get("http://httpbin.org/status/404", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 404);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.get("http://httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.data.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.same(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },

            "Callback#args with objects": function(test) {
                this.http.get(
                    "http://httpbin.org/get", [],
                    {a: 1, b: {c: "ab", d: 12}}, 0,
                    function(err, res) {
                        var args = res.data.args;
                        test.strictEqual(args.a, "1");
                        test.same(args.b, ["ab", "12"]);
                        test.strictEqual(
                            res.data.url,
                            "http://httpbin.org/get?a=1&b=ab&b=12"
                        );
                        test.done();
                    }
                );
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://httpbin.org/get", {"X-Test1": 1, "X-Test2": "a/b/c"}, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.data.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.same(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        },

        "HTTP POST Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#no args": function(test) {
                this.http.post("http://httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.post("http://httpbin.org/status/405", {}, {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.post("http://httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.data.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.data.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            }
        },

        "HTTP DELETE Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
        
            "Callback#no args": function(test) {
                this.http.del("http://httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                this.http.del("http://httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.del("http://httpbin.org/status/405", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.del("http://httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },

            "Default arguments to Http work": function(test) {
                var NodeHttp = splunkjs.NodeHttp;
                var h = new NodeHttp();
                test.ok(h);
                test.done();
            },

            "Methods of Http base class that must be overrided": function(test) {
                var h = new splunkjs.Http();
                test.throws(function() { h.makeRequest("asdf", null, null); });
                test.throws(function() { h.parseJson("{}"); });
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var NodeHttp    = splunkjs.NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp();
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}
