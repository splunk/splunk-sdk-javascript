
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

exports.run = (function() {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var minitest    = require('../contrib/minitest');
    var options     = require('../internal/cmdline');
    
    var cmdline = options.parse();
        
    // If there is no command line, we should return
    if (!cmdline) {
        callback("Error in parsing command line parameters");
        return;
    }
    
    // Create our HTTP request class for node.js
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });

    minitest.context("Binding Tests", function() {
        this.setupContext(function(done) {
            var context = this;
            svc.login(function(err, success) {
                context.service = svc;
                context.success = success;
                done();
            });
        });

        this.setupTest(function(done) {
            this.assert.ok(this.context.success);
            this.service = this.context.service; 
            done();
        });

        this.assertion("Service exists", function(test) {
            test.assert.ok(this.service);
            test.finished();
        });

        this.assertion("Login succeeded", function(test) {
            test.assert.ok(this.context.success);
            test.finished();
        });

        this.assertion("Callback#login", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: cmdline.options.scheme,
                host: cmdline.options.host,
                port: cmdline.options.port,
                username: cmdline.options.username,
                password: cmdline.options.password
            });

            var loginP = newService.login(function(err, success) {
                    test.assert.ok(success);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#login fail", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: cmdline.options.scheme,
                host: cmdline.options.host,
                port: cmdline.options.port,
                username: cmdline.options.username,
                password: cmdline.options.password + "wrong_password"
            });

            newService.login(function(err, success) {
                test.assert.ok(!err);
                test.finished();
            });
        });

        this.assertion("Callback#get", function(test) { 
            this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.assert.strictEqual(res.odata.offset, 0);
                test.assert.ok(res.odata.count <= res.odata.total_count);
                test.assert.strictEqual(res.odata.count, 2);
                test.assert.strictEqual(res.odata.count, res.odata.results.length);
                test.assert.ok(res.odata.results[0].sid);
                test.finished();
            });
        });

        this.assertion("Callback#get error", function(test) { 
            var jobsP = this.service.get("search/jobs/1234_nosuchjob", {}, function(res) {
                test.assert.ok(!!res);
                test.assert.strictEqual(res.status, 404);
                test.finished();
            });
        });

        this.assertion("Callback#post", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#post error", function(test) { 
            var jobsP = this.service.post("search/jobs", {search: "index_internal | head 1"}, function(res) {
                test.assert.ok(!!res);
                test.assert.strictEqual(res.status, 400);
                test.finished();
            });
        });

        this.assertion("Callback#delete", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid;
                    var deleteP = service.del(endpoint, {}, function(err, res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#delete error", function(test) { 
            var jobsP = this.service.del("search/jobs/1234_nosuchjob", {}, function(res) {
                test.assert.ok(!!res);
                test.assert.strictEqual(res.status, 404);
                test.finished();
            });
        });

        this.assertion("Callback#request get", function(test) { 
            var jobsP = this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                    test.assert.strictEqual(res.odata.offset, 0);
                    test.assert.ok(res.odata.count <= res.odata.total_count);
                    test.assert.strictEqual(res.odata.count, 2);
                    test.assert.strictEqual(res.odata.count, res.odata.results.length);
                    test.assert.ok(res.odata.results[0].sid);

                    test.assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);

                    test.finished();
                }
            );
        });

        this.assertion("Callback#request post", function(test) { 
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"  
            };
            var service = this.service;
            var jobsP = this.service.request("search/jobs", "POST", headers, body, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#request error", function(test) { 
            var jobsP = this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "", function(res) {
                test.assert.ok(!!res);
                test.assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                test.assert.strictEqual(res.status, 404);
                test.finished();
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();