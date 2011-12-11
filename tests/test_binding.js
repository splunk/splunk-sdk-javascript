
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;

    Splunk.Logger.setLevel("ALL");
    var isBrowser = typeof "window" !== "undefined";
    
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },
            
        "Service exists": function(test) {
            test.ok(this.service);
            test.done();
        },

        "Callback#login": function(test) {
            var newService = new Splunk.Client.Service(svc.http, { 
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password
            });

            newService.login(function(err, success) {
                test.ok(success);
                test.done();
            });
        },

        "Callback#login fail": function(test) {
            var newService = new Splunk.Client.Service(svc.http, { 
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password + "wrong_password"
            });

            if (!isBrowser) {
                newService.login(function(err, success) {
                    test.ok(err);
                    test.ok(!success);
                    test.done();
                });
            }
            else {
                test.done();
            }
        },

        "Callback#get": function(test) { 
            this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.strictEqual(res.odata.offset, 0);
                test.ok(res.odata.count <= res.odata.total_count);
                test.strictEqual(res.odata.count, 2);
                test.strictEqual(res.odata.count, res.odata.results.length);
                test.ok(res.odata.results[0].sid);
                test.done();
            });
        },

        "Callback#get error": function(test) { 
            this.service.get("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#post": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },
        
        "Callback#post error": function(test) { 
            this.service.post("search/jobs", {search: "index_internal | head 1"}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 400);
                test.done();
            });
        },

        "Callback#delete": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.odata.results.sid;
                test.ok(sid);
                
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    test.done();
                });
            });
        },

        "Callback#delete error": function(test) { 
            this.service.del("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#request get": function(test) { 
            this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.strictEqual(res.odata.offset, 0);
                test.ok(res.odata.count <= res.odata.total_count);
                test.strictEqual(res.odata.count, 2);
                test.strictEqual(res.odata.count, res.odata.results.length);
                test.ok(res.odata.results[0].sid);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.done();
            });
        },

        "Callback#request post": function(test) { 
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"  
            };
            var service = this.service;
            this.service.request("search/jobs", "POST", headers, body, function(err, res) {
                var sid = res.odata.results.sid;
                test.ok(sid);
                
                var endpoint = "search/jobs/" + sid + "/control";
                service.post(endpoint, {action: "cancel"}, function(err, res) {
                    test.done();
                });
            });
        },

        "Callback#request error": function(test) { 
            this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "", function(res) {
                test.ok(!!res);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.strictEqual(res.status, 404);
                test.done();
            });
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}