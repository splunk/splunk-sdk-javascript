
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
    var minitest    = require('../external/minitest');

    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: "http",
        host: "localhost",
        port: "8000",
        username: "itay",
        password: "changeme",
    });

    minitest.context("Binding Tests", function() {
        this.setupContext(function(done) {
            var context = this;
            svc.login(function(success) {
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
            test.assert.ok(this.service.sessionKey);
            test.finished();
        });

        this.assertion("Login promise", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: "http",
                host: "localhost",
                port: "8000",
                username: "itay",
                password: "changeme",
            });

            var loginP = newService.login();
            loginP.when(
                function(loginSuccess) {
                    test.assert.ok(loginSuccess);
                    test.finished();
                },
                function(loginSuccess) {
                    test.assert.ok(false);
                }
            );
        });

        this.assertion("Login promise fail", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: "http",
                host: "localhost",
                port: "8000",
                username: "itay",
                password: "changeme_wrongpassword",
            });

            var loginP = newService.login();
            loginP.when(
                function(loginSuccess) {
                    test.assert.ok(false);
                },
                function(loginSuccess) {
                    test.assert.ok(!loginSuccess);
                    test.finished();
                }
            );
        });

        this.assertion("Login callback", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: "http",
                host: "localhost",
                port: "8000",
                username: "itay",
                password: "changeme",
            });

            var loginP = newService.login(function(loginSuccess) {
                    test.assert.ok(loginSuccess);
                    test.finished();
                }
            );
        });

        this.assertion("Login callback fail", function(test) {
            var newService = new Splunk.Client.Service(http, { 
                scheme: "http",
                host: "localhost",
                port: "8000",
                username: "itay",
                password: "changeme_wrongpassword",
            });

            var loginP = newService.login(function(loginSuccess) {
                    test.assert.ok(!loginSuccess);
                    test.finished();
                }
            );
        });

        this.assertion("Promise#get", function(test) { 
            var jobsP = this.service.get("search/jobs", {count: 2});
            jobsP.when(
                function(res) {
                    test.assert.strictEqual(res.odata.offset, 0);
                    test.assert.ok(res.odata.count <= res.odata.total_count);
                    test.assert.strictEqual(res.odata.count, 2);
                    test.assert.strictEqual(res.odata.count, res.odata.results.length);
                    test.assert.ok(res.odata.results[0].sid);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#get", function(test) { 
            var jobsP = this.service.get("search/jobs", {count: 2}, function(res) {
                    test.assert.strictEqual(res.odata.offset, 0);
                    test.assert.ok(res.odata.count <= res.odata.total_count);
                    test.assert.strictEqual(res.odata.count, 2);
                    test.assert.strictEqual(res.odata.count, res.odata.results.length);
                    test.assert.ok(res.odata.results[0].sid);
                    test.finished();
                }
            );
        });

        this.assertion("Promise#get error", function(test) { 
            var jobsP = this.service.get("search/jobs/1234_nosuchjob");
            jobsP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#get error", function(test) { 
            var jobsP = this.service.get("search/jobs/1234_nosuchjob", {}, {
                    success: function(res) {
                        test.assert.ok(false);  
                    },
                    error: function(res) {
                        test.assert.strictEqual(res.status, 404);
                        test.finished();
                    }
                }
            );
        });

        this.assertion("Promise#post", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"});
            jobsP.when(
                function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"});
                    return cancelP.when(
                        function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#post", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Promise#post error", function(test) { 
            var jobsP = this.service.post("search/jobs", {search: "index_internal | head 1"});
            jobsP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 400);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#post error", function(test) { 
            var jobsP = this.service.post("search/jobs", {search: "index_internal | head 1"}, {
                    success: function(res) {
                        test.assert.ok(false);  
                    },
                    error: function(res) {
                        test.assert.strictEqual(res.status, 400);
                        test.finished();
                    }
                }
            );
        });

        this.assertion("Promise#delete", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"});
            jobsP.when(
                function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid;
                    var deleteP = service.del(endpoint, {});
                    return deleteP.when(
                        function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#delete", function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid;
                    var deleteP = service.del(endpoint, {}, function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Promise#delete error", function(test) { 
            var jobsP = this.service.del("search/jobs/1234_nosuchjob", {});
            jobsP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#delete error", function(test) { 
            var jobsP = this.service.del("search/jobs/1234_nosuchjob", {}, {
                    success: function(res) {
                        test.assert.ok(false);  
                    },
                    error: function(res) {
                        test.assert.strictEqual(res.status, 404);
                        test.finished();
                    }
                }
            );
        });

        this.assertion("Promise#request get", function(test) { 
            var jobsP = this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "");
            jobsP.when(
                function(res) {
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

        this.assertion("Promise#request post", function(test) { 
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"  
            };
            var service = this.service;
            var jobsP = this.service.request("search/jobs", "POST", headers, body);
            jobsP.when(
                function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"});
                    return cancelP.when(
                        function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Callback#request get", function(test) { 
            var jobsP = this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(res) {
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
            var jobsP = this.service.request("search/jobs", "POST", headers, body, function(res) {
                    var sid = res.odata.results.sid;
                    test.assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(res) {
                            test.finished();
                        }
                    );
                }
            );
        });

        this.assertion("Promise#request error", function(test) { 
            var jobsP = this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "count=2");
            jobsP.when(
                function(res) {
                    test.assert.ok(false);
                },
                function(res) {
                    test.assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            );
        });

        this.assertion("Callback#request error", function(test) { 
            var jobsP = this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "count=2", {
                success: function(res) {
                    test.assert.ok(false);
                },
                error: function(res) {
                    test.assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    test.assert.strictEqual(res.status, 404);
                    test.finished();
                }
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();