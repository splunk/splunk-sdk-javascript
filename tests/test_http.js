
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
    var Splunk      = require('../splunk').Splunk;

    Splunk.Logger.setLevel("ALL");
    return {
        "HTTP GET Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                }); 
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.get("http://www.httpbin.org/status/404", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 404);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.get("http://www.httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", {"X-Test1": 1, "X-Test2": "a/b/c"}, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.json.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
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
                this.http.post("http://www.httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.post("http://www.httpbin.org/status/405", {}, {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.json.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
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
                this.http.del("http://www.httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.del("http://www.httpbin.org/status/405", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = Splunk.NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp(false);
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}