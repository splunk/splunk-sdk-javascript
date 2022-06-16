// var tutils      = require('./utils');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;

splunkjs.Logger.setLevel("ALL");
var isBrowser = typeof window !== "undefined";

// (function() {
//     "use strict";
//     var Async = require('../lib/async');
    
//     var root = exports || this;

//     root.DummyHttp = {
//         // Required by Context.init()
//         _setSplunkVersion: function(version) {
//             // nothing
//         }
// };
// })();

describe('Context tests', function() {
    before(function(){
        this.service = svc;
    })
    describe('General Context Test', function() {  
        before(function(){
            // console.log(svc);
            this.service = svc;
        })

        it("Service exists", function(done) {
            assert.ok(this.service);
            done();
        });

        it("Create test search", function(done) {
            // The search created here is used by several of the following tests, specifically those using get()
            var searchID = "DELETEME_JSSDK_UNITTEST";
            this.service.post("search/jobs", {search: "search index=_internal | head 1", exec_mode: "blocking", id: searchID}, function(err, res) {
                assert.ok(res.data.sid);
                done();
            });
        });

        it("Callback#login", function(done) {
            var newService = new splunkjs.Service(svc.http, {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });

            newService.login(function(err, success) {
                assert.ok(success);
                done();
            });
        });

        it("Callback#login fail", function(done) {
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
                    assert.ok(err);
                    assert.ok(!success);
                    done();
                });
            }
            else {
                done();
            }
        });

        it("Callback#get", function(done) {
            this.service.get("search/jobs", {count: 1}, function(err, res) {
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);
                done();
            });
        });

        it("Callback#get error", function(done) {
            this.service.get("search/jobs/1234_nosuchjob", {}, function(res) {
                assert.ok(!!res);
                assert.strictEqual(res.status, 404);
                done();
            });
        });

        it("Callback#get autologin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);
                done();
            });
        });

        it("Callback#get autologin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });


        it("Callback#get autologin - disabled", function(done) {
            var service = new splunkjs.Service(svc.http,
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

            service.get("search/jobs", { count: 1 }, function (err, res) {
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);
                done();
            });
        });

        it("Callback#get relogin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(!err);
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);
                done();
            });
        });

        it("Callback#get relogin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#post", function(done) {
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
                    assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            done();
                        }
                    );
                }
            );
        });

        it("Callback#post error", function(done) {
            this.service.post("search/jobs", {search: "index_internal | head 1"}, function(res) {
                assert.ok(!!res);
                assert.strictEqual(res.status, 400);
                done();
            });
        });

        it("Callback#post autologin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                    assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            done();
                        }
                    );
                }
            );
        });

        it("Callback#post autologin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#post autologin - disabled", function(done) {
            var service = new splunkjs.Service(svc.http,
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

            service.post("search/jobs", { search: "search index=_internal | head 1" }, function (err, res) {
                var sid = res.data.sid;
                assert.ok(sid);
                done();
            });
        });

        it("Callback#post relogin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                    assert.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            done();
                        }
                    );
                }
            );
        });

        it("Callback#post relogin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#delete", function(done) {
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.data.sid;
                assert.ok(sid);

                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    done();
                });
            });
        });

        it("Callback#delete error", function(done) {
            this.service.del("search/jobs/1234_nosuchjob", {}, function(res) {
                assert.ok(!!res);
                assert.strictEqual(res.status, 404);
                done();
            });
        });

        it("Callback#delete autologin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(sid);

                service.sessionKey = null;
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    done();
                });
            });
        });

        it("Callback#delete autologin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#delete autologin - disabled", function(done) {
            var service = new splunkjs.Service(svc.http,
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

            service.del("search/jobs/NO_SUCH_SID", {}, function (err, res) {
                assert.ok(err);
                assert.strictEqual(err.status, 404);
                done();
            });
        });

        it("Callback#delete relogin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(sid);

                service.sessionKey = "ABCDEF-not-real";
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    done();
                });
            });
        });

        it("Callback#delete relogin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#request get", function(done) {
            var get = {count: 1};
            var post = null;
            var body = null;
            this.service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);

                if (res.response.request) {
                    assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }

                done();
            });
        });

        it("Callback#request post", function(done) {
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            };
            var service = this.service;
            this.service.request("search/jobs", "POST", null, null, body, headers, function(err, res) {
                var sid = res.data.sid;
                assert.ok(sid);

                var endpoint = "search/jobs/" + sid + "/control";
                service.post(endpoint, {action: "cancel"}, function(err, res) {
                    done();
                });
            });
        });

        it("Callback#request error", function(done) {
            this.service.request("search/jobs/1234_nosuchjob", "GET", null, null, null, {"X-TestHeader": 1}, function(res) {
                assert.ok(!!res);

                if (res.response.request) {
                    assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }

                assert.strictEqual(res.status, 404);
                done();
            });
        });

        it("Callback#request autologin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);

                if (res.response.request) {
                    assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }

                done();
            });
        });

        it("Callback#request autologin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#request autologin - disabled", function(done) {
            var service = new splunkjs.Service(svc.http,
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
            service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 }, function (err, res) {
                assert.ok(res);
                done();
            });
        });

        it("Callback#request relogin - success", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.strictEqual(res.data.paging.offset, 0);
                assert.ok(res.data.entry.length <= res.data.paging.total);
                assert.strictEqual(res.data.entry.length, 1);
                assert.ok(res.data.entry[0].content.sid);

                if (res.response.request) {
                    assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }

                done();
            });
        });

        it("Callback#request relogin - error", function(done) {
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("Callback#abort", function(done) {
            var req = this.service.get("search/jobs", {count: 1}, function(err, res) {
                assert.ok(!res);
                assert.ok(err);
                assert.strictEqual(err.error, "abort");
                assert.strictEqual(err.status, "abort");
                done();
            });

            req.abort();
        });

        it("Callback#timeout default test", function(done){
            var service = new splunkjs.Service(svc.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    version: svc.version
                }
            );

            assert.strictEqual(0, service.timeout);
            service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                assert.ok(res);
                done();
            });
        });

        it("Callback#timeout timed test", function(done){
            var service = new splunkjs.Service(svc.http,
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

            assert.strictEqual(service.timeout, 10000);
            service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                assert.ok(res);
                done();
            });
        });

        // This test is not stable, commenting it out until we figure it out
        // "Callback#timeout fail -- FAILS INTERMITTENTLY", function(done){
        //     var service = new splunkjs.Service(
        //         {
        //             scheme: this.service.scheme,
        //             host: this.service.host,
        //             port: this.service.port,
        //             username: this.service.username,
        //             password: this.service.password,
        //             version: svc.version,
        //             timeout: 3000
        //         }
        //     );

        //     // Having a timeout of 3 seconds, a max_time of 5 seconds with a blocking mode and searching realtime should involve a timeout error.
        //     service.get("search/jobs/export", {search:"search index=_internal", timeout:2, max_time:5, search_mode:"realtime", exec_mode:"blocking"}, function(err, res){
        //         assert.ok(err);
        //         // Prevent test suite from erroring out if `err` is null, just fail the test
        //         if (err) {
        //             assert.strictEqual(err.status, 600);
        //         }
        //         done();
        //     });
        // },

        it("Cancel test search", function(done) {
            // Here, the search created for several of the previous tests is terminated, it is no longer necessary
            var endpoint = "search/jobs/DELETEME_JSSDK_UNITTEST/control";
            this.service.post(endpoint, {action: "cancel"}, function(err, res) {
                done();
            });
        });

        it("fullpath gets its owner/app from the right places", function(done) {
            var http = DummyHttp;
            var ctx = new splunkjs.Context(http, { /*nothing*/ });

            // Absolute paths are unchanged
            assert.strictEqual(ctx.fullpath("/a/b/c"), "/a/b/c");
            // Fall through to /services if there is no app
            assert.strictEqual(ctx.fullpath("meep"), "/services/meep");
            // Are username and app set properly?
            var ctx2 = new splunkjs.Context(http, {owner: "alpha", app: "beta"});
            assert.strictEqual(ctx2.fullpath("meep"), "/servicesNS/alpha/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", {owner: "boris"}), "/servicesNS/boris/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", {app: "factory"}), "/servicesNS/alpha/factory/meep");
            assert.strictEqual(ctx2.fullpath("meep", {owner: "boris", app: "factory"}), "/servicesNS/boris/factory/meep");
            // Sharing settings
            assert.strictEqual(ctx2.fullpath("meep", {sharing: "app"}), "/servicesNS/nobody/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", {sharing: "global"}), "/servicesNS/nobody/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", {sharing: "system"}), "/servicesNS/nobody/system/meep");
            // Do special characters get encoded?
            var ctx3 = new splunkjs.Context(http, {owner: "alpha@beta.com", app: "beta"});
            assert.strictEqual(ctx3.fullpath("meep"), "/servicesNS/alpha%40beta.com/beta/meep");
            done();
        });

        it("version check", function(done) {
            var http = DummyHttp;
            var ctx;

            ctx = new splunkjs.Context(http, { "version": "4.0" });
            assert.ok(ctx.version === "4.0");

            ctx = new splunkjs.Context(http, { "version": "4.0" });
            assert.ok(ctx.versionCompare("5.0") === -1);
            ctx = new splunkjs.Context(http, { "version": "4" });
            assert.ok(ctx.versionCompare("5.0") === -1);
            ctx = new splunkjs.Context(http, { "version": "4.0" });
            assert.ok(ctx.versionCompare("5") === -1);
            ctx = new splunkjs.Context(http, { "version": "4.1" });
            assert.ok(ctx.versionCompare("4.9") === -1);

            ctx = new splunkjs.Context(http, { "version": "4.0" });
            assert.ok(ctx.versionCompare("4.0") === 0);
            ctx = new splunkjs.Context(http, { "version": "4" });
            assert.ok(ctx.versionCompare("4.0") === 0);
            ctx = new splunkjs.Context(http, { "version": "4.0" });
            assert.ok(ctx.versionCompare("4") === 0);

            ctx = new splunkjs.Context(http, { "version": "5.0" });
            assert.ok(ctx.versionCompare("4.0") === 1);
            ctx = new splunkjs.Context(http, { "version": "5.0" });
            assert.ok(ctx.versionCompare("4") === 1);
            ctx = new splunkjs.Context(http, { "version": "5" });
            assert.ok(ctx.versionCompare("4.0") === 1);
            ctx = new splunkjs.Context(http, { "version": "4.9" });
            assert.ok(ctx.versionCompare("4.1") === 1);

            ctx = new splunkjs.Context(http, { /*nothing*/ });
            assert.ok(ctx.versionCompare("5.0") === 0);

            done();
        });
    });

    describe('Cookie Tests', function() {
        before(function(){
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
            });
        })

        afterEach(function(){
            this.service.logout();
        })

        it("_getCookieString works as expected", function(done){
            var service = new splunkjs.Service(svc.http,
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

            assert.strictEqual(cookieString, expectedCookieString);
            done();
        });

        it("login and store cookie", function (done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });

            // Check that there are no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));


            service.login(function(err, success) {
                // Check that cookies were saved
                assert.ok(!utils.isEmpty(service.http._cookieStore));
                assert.notStrictEqual(service.http._getCookieString(), '');
                done();
            });
        });

        it("request with cookie", function(done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
                // Create another service to put valid cookie into, give no other authentication information
            var service2 = new splunkjs.Service(svc.http,
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
                        assert.ok(!utils.isEmpty(cookieStore));
                        // Add the cookies to a service with no other authentication information
                        service2.http._cookieStore = cookieStore;
                        // Make a request that requires authentication
                        service2.get("search/jobs", {count: 1}, done);
                    },
                    function (res, done) {
                        // Test that a response was returned
                        assert.ok(res);
                        done();
                    }
                ],
                function(err) {
                    // Test that no errors were returned
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("request fails with bad cookie", function(done) {
            if(this.skip){
                done();
                return;
            }
            // Create a service with no login information
            var service = new splunkjs.Service(svc.http,
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
                assert.ok(err);
                // Check that it is an unauthorized error
                assert.strictEqual(err.status, 401);
                done();
            });
        });

        it("autologin with cookie", function(done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });

            // Test if service has no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));

            service.get("search/jobs", {count: 1}, function(err, res) {
                // Test if service now has a cookie
                assert.ok(service.http._cookieStore);
                done();
            });
        });

        it("login fails with no cookie and no sessionKey", function(done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                version: svc.version
            });

            // Test there is no authentication information
            assert.ok(utils.isEmpty(service.http._cookieStore));
            assert.strictEqual(service.sessionKey, '');
            assert.ok(!service.username);
            assert.ok(!service.password);

            service.get("search/jobs", {count: 1}, function(err, res) {
                // Test if an error is returned
                assert.ok(err);
                done();
            });
        });

        it("login with multiple cookies", function(done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
                // Create another service to put valid cookie into, give no other authentication information
            var service2 = new splunkjs.Service(svc.http,
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
                        assert.ok(!utils.isEmpty(cookieStore));

                        // Add a bad cookie to the cookieStore
                        cookieStore['bad'] = 'cookie';

                        // Add the cookies to a service with no other authenitcation information
                        service2.http._cookieStore = cookieStore;

                        // Make a request that requires authentication
                        service2.get("search/jobs", {count: 1}, done);
                    },
                    function (res, done) {
                        // Test that a response was returned
                        assert.ok(res);
                        done();
                    }
                ],
                function(err) {
                    // Test that no errors were returned
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("autologin with cookie and bad sessionKey", function(done) {
            if(this.skip){
                done();
                return;
            }
            var service = new splunkjs.Service(svc.http,
            {
                scheme: svc.scheme,
                host: svc.host, port: svc.port,
                username: svc.username,
                password: svc.password,
                sessionKey: 'ABC-BADKEY',
                version: svc.version
            });

            // Test if service has no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));

            service.get("search/jobs", {count: 1}, function(err, res) {
                // Test if service now has a cookie
                assert.ok(service.http._cookieStore);
                done();
            });
         });
    });
});