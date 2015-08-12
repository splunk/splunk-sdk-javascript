
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
    var splunkjs    = require('../index');
    var tutils      = require('./utils');
    var Async       = splunkjs.Async;
    var utils       = splunkjs.Utils;

    splunkjs.Logger.setLevel("ALL");
    var isBrowser = typeof window !== "undefined";

    var suite = {
        "General Context Test": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Service exists": function(test) {
                test.ok(this.service);
                test.done();
            },

            "Create test search": function(test) {
                // The search created here is used by several of the following tests, specifically those using get()
                var searchID = "DELETEME_JSSDK_UNITTEST";
                this.service.post("search/jobs", {search: "search index=_internal | head 1", exec_mode: "blocking", id: searchID}, function(err, res) {
                    test.ok(res.data.sid);
                    test.done();
                });
            },

            "Callback#login": function(test) {
                var newService = new splunkjs.Service(svc.http, {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });

                newService.login(function(err, success) {
                    test.ok(success);
                    test.done();
                });
            },

            "Callback#login fail": function(test) {
                var newService = new splunkjs.Service(svc.http, {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password + "wrong_password",
                    version: svc.version
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
                this.service.get("search/jobs", {count: 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);
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

            "Callback#get autologin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);
                    test.done();
                });
            },

            "Callback#get autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },


            "Callback#get autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#get relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);
                    test.done();
                });
            },

            "Callback#get relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#post": function(test) {
                var service = this.service;
                this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                        var sid = res.data.sid;
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

            "Callback#post autologin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                        var sid = res.data.sid;
                        test.ok(sid);

                        var endpoint = "search/jobs/" + sid + "/control";
                        service.post(endpoint, {action: "cancel"}, function(err, res) {
                                test.done();
                            }
                        );
                    }
                );
            },

            "Callback#post autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#post autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#post relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                        var sid = res.data.sid;
                        test.ok(sid);

                        var endpoint = "search/jobs/" + sid + "/control";
                        service.post(endpoint, {action: "cancel"}, function(err, res) {
                                test.done();
                            }
                        );
                    }
                );
            },

            "Callback#post relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#delete": function(test) {
                var service = this.service;
                this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
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

            "Callback#delete autologin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    service.sessionKey = null;
                    var endpoint = "search/jobs/" + sid;
                    service.del(endpoint, {}, function(err, res) {
                        test.done();
                    });
                });
            },

            "Callback#delete autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#delete autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#delete relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    service.sessionKey = "ABCDEF-not-real";
                    var endpoint = "search/jobs/" + sid;
                    service.del(endpoint, {}, function(err, res) {
                        test.done();
                    });
                });
            },

            "Callback#delete relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request get": function(test) {
                var get = {count: 1};
                var post = null;
                var body = null;
                this.service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);

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
                this.service.request("search/jobs", "POST", null, null, body, headers, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                        test.done();
                    });
                });
            },

            "Callback#request error": function(test) {
                this.service.request("search/jobs/1234_nosuchjob", "GET", null, null, null, {"X-TestHeader": 1}, function(res) {
                    test.ok(!!res);

                    if (res.response.request) {
                        test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    }

                    test.strictEqual(res.status, 404);
                    test.done();
                });
            },

            "Callback#request autologin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);

                    if (res.response.request) {
                        test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    }

                    test.done();
                });
            },

            "Callback#request autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);

                    if (res.response.request) {
                        test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    }

                    test.done();
                });
            },

            "Callback#request relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#abort": function(test) {
                var req = this.service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(!res);
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.strictEqual(err.status, "abort");
                    test.done();
                });

                req.abort();
            },

            "Callback#timeout default test": function(test){
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                test.strictEqual(0, service.timeout);
                service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                    test.ok(res);
                    test.done();
                });
            },

            "Callback#timeout timed test": function(test){
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version,
                        timeout: 10000
                    }
                );

                test.strictEqual(service.timeout, 10000);
                service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                    test.ok(res);
                    test.done();
                });
            },

            "Callback#timeout fail -- FAILS INTERMITTENTLY": function(test){
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version,
                        timeout: 3000
                    }
                );

                // Having a timeout of 3 seconds, a max_time of 5 seconds with a blocking mode and searching realtime should involve a timeout error.
                service.get("search/jobs/export", {search:"search index=_internal", timeout:2, max_time:5, search_mode:"realtime", exec_mode:"blocking"}, function(err, res){
                    test.ok(err);
                    // Prevent test suite from erroring out if `err` is null, just fail the test
                    if (err) {
                        test.strictEqual(err.status, 600);
                    }
                    test.done();
                });
            },

            "Cancel test search": function(test) {
                // Here, the search created for several of the previous tests is terminated, it is no longer necessary
                var endpoint = "search/jobs/DELETEME_JSSDK_UNITTEST/control";
                this.service.post(endpoint, {action: "cancel"}, function(err, res) {
                    test.done();
                });
            },

            "fullpath gets its owner/app from the right places": function(test) {
                var http = tutils.DummyHttp;
                var ctx = new splunkjs.Context(http, { /*nothing*/ });

                // Absolute paths are unchanged
                test.strictEqual(ctx.fullpath("/a/b/c"), "/a/b/c");
                // Fall through to /services if there is no app
                test.strictEqual(ctx.fullpath("meep"), "/services/meep");
                // Are username and app set properly?
                var ctx2 = new splunkjs.Context(http, {owner: "alpha", app: "beta"});
                test.strictEqual(ctx2.fullpath("meep"), "/servicesNS/alpha/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {owner: "boris"}), "/servicesNS/boris/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {app: "factory"}), "/servicesNS/alpha/factory/meep");
                test.strictEqual(ctx2.fullpath("meep", {owner: "boris", app: "factory"}), "/servicesNS/boris/factory/meep");
                // Sharing settings
                test.strictEqual(ctx2.fullpath("meep", {sharing: "app"}), "/servicesNS/nobody/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {sharing: "global"}), "/servicesNS/nobody/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {sharing: "system"}), "/servicesNS/nobody/system/meep");
                // Do special characters get encoded?
                var ctx3 = new splunkjs.Context(http, {owner: "alpha@beta.com", app: "beta"});
                test.strictEqual(ctx3.fullpath("meep"), "/servicesNS/alpha%40beta.com/beta/meep");
                test.done();
            },

            "version check": function(test) {
                var http = tutils.DummyHttp;
                var ctx;

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.version === "4.0");

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("5.0") === -1);
                ctx = new splunkjs.Context(http, { "version": "4" });
                test.ok(ctx.versionCompare("5.0") === -1);
                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("5") === -1);
                ctx = new splunkjs.Context(http, { "version": "4.1" });
                test.ok(ctx.versionCompare("4.9") === -1);

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("4.0") === 0);
                ctx = new splunkjs.Context(http, { "version": "4" });
                test.ok(ctx.versionCompare("4.0") === 0);
                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("4") === 0);

                ctx = new splunkjs.Context(http, { "version": "5.0" });
                test.ok(ctx.versionCompare("4.0") === 1);
                ctx = new splunkjs.Context(http, { "version": "5.0" });
                test.ok(ctx.versionCompare("4") === 1);
                ctx = new splunkjs.Context(http, { "version": "5" });
                test.ok(ctx.versionCompare("4.0") === 1);
                ctx = new splunkjs.Context(http, { "version": "4.9" });
                test.ok(ctx.versionCompare("4.1") === 1);

                ctx = new splunkjs.Context(http, { /*nothing*/ });
                test.ok(ctx.versionCompare("5.0") === 0);

                test.done();
            }
        },
        "Cookie Tests": {
            setUp: function(done) {
                this.service = svc;
                this.skip = false;
                var that = this;
                svc.serverInfo(function(err, info) {
                    var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                    var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                    // Skip cookie tests if Splunk older than 6.2
                    if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping cookie tests...");
                    }
                    done();
                });
            },

            tearDown: function(done) {
                this.service.logout(done);
            },

            "_getCookieString works as expected": function(test){
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port
                });

                service.http._cookieStore = {
                    'cookie'  : 'format',
                    'another' : 'one'
                };

                var expectedCookieString = 'cookie=format; another=one; ';
                var cookieString = service.http._getCookieString();

                test.strictEqual(cookieString, expectedCookieString);
                test.done();
            },

            "login and store cookie": function(test){
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });

                // Check that there are no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));


                service.login(function(err, success) {
                    // Check that cookies were saved
                    test.ok(!utils.isEmpty(service.http._cookieStore));
                    test.notStrictEqual(service.http._getCookieString(), '');
                    test.done();
                });
            },

            "request with cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });
                    // Create another service to put valid cookie into, give no other authentication information
                var service2 = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Login to service to get a valid cookie
                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            test.ok(!utils.isEmpty(cookieStore));
                            // Add the cookies to a service with no other authentication information
                            service2.http._cookieStore = cookieStore;
                            // Make a request that requires authentication
                            service2.get("search/jobs", {count: 1}, done);
                        },
                        function (res, done) {
                            // Test that a response was returned
                            test.ok(res);
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "request fails with bad cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                // Create a service with no login information
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Put a bad cookie into the service
                service.http._cookieStore = { "bad" : "cookie" };

                // Try requesting something that requires authentication
                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if an error is returned
                    test.ok(err);
                    // Check that it is an unauthorized error
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "autologin with cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });

                // Test if service has no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if service now has a cookie
                    test.ok(service.http._cookieStore);
                    test.done();
                });
            },

            "login fails with no cookie and no sessionKey": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Test there is no authentication information
                test.ok(utils.isEmpty(service.http._cookieStore));
                test.strictEqual(service.sessionKey, '');
                test.ok(!service.username);
                test.ok(!service.password);

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if an error is returned
                    test.ok(err);
                    test.done();
                });
            },

            "login with multiple cookies": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });
                    // Create another service to put valid cookie into, give no other authentication information
                var service2 = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Login to service to get a valid cookie
                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            test.ok(!utils.isEmpty(cookieStore));

                            // Add a bad cookie to the cookieStore
                            cookieStore['bad'] = 'cookie';

                            // Add the cookies to a service with no other authenitcation information
                            service2.http._cookieStore = cookieStore;

                            // Make a request that requires authentication
                            service2.get("search/jobs", {count: 1}, done);
                        },
                        function (res, done) {
                            // Test that a response was returned
                            test.ok(res);
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "autologin with cookie and bad sessionKey": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host, port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    sessionKey: 'ABC-BADKEY',
                    version: svc.version
                });

                // Test if service has no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if service now has a cookie
                    test.ok(service.http._cookieStore);
                    test.done();
                });
             }
        }
    };
    return suite;
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');

    var parser = options.create();
    var cmdline = parser.parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var suite = exports.setup(svc);

    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
