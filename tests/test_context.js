
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

    splunkjs.Logger.setLevel("ALL");
    var isBrowser = typeof window !== "undefined";
    
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
            this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
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
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    version: svc.version
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                test.done();
            });
        },
        
        "Callback#get autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    version: svc.version
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#get autologin - disabled": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
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
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#get relogin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
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
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(!err);
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                test.done();
            });
        },
        
        "Callback#get relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
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
            
            service.get("search/jobs", {count: 2}, function(err, res) {
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
                this.service.http,
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
            var get = {count: 2};
            var post = null;
            var body = null;
            this.service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
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
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    version: svc.version
                }
            );
            
            var get = {count: 2};
            var post = null;
            var body = null;
            service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.done();
            });
        },
        
        "Callback#request autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    version: svc.version
                }
            );
            
            var get = {count: 2};
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
                this.service.http,
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
            
            var get = {count: 2};
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
                this.service.http,
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
            
            var get = {count: 2};
            var post = null;
            var body = null;
            service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.done();
            });
        },
        
        "Callback#request relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
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
            
            var get = {count: 2};
            var post = null;
            var body = null;
            service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#abort": function(test) { 
            var req = this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(!res);
                test.ok(err);
                test.strictEqual(err.error, "abort");
                test.strictEqual(err.status, "abort");
                test.done();
            });
            
            req.abort();
        },

        "fullpath gets its owner/app from the right places": function(test) {
            var ctx = new splunkjs.Context();
            
            // Absolute paths are unchanged
            test.strictEqual(ctx.fullpath("/a/b/c"), "/a/b/c");
            // Fall through to /services if there is no app
            test.strictEqual(ctx.fullpath("meep"), "/services/meep")
            // Are username and app set properly?
            var ctx2 = new splunkjs.Context({owner: "alpha", app: "beta"});
            test.strictEqual(ctx2.fullpath("meep"), "/servicesNS/alpha/beta/meep");
            test.strictEqual(ctx2.fullpath("meep", {owner: "boris"}), "/servicesNS/boris/beta/meep");
            test.strictEqual(ctx2.fullpath("meep", {app: "factory"}), "/servicesNS/alpha/factory/meep");
            test.strictEqual(ctx2.fullpath("meep", {owner: "boris", app: "factory"}), "/servicesNS/boris/factory/meep");
            // Sharing settings
            test.strictEqual(ctx2.fullpath("meep", {sharing: "app"}), "/servicesNS/nobody/beta/meep");
            test.strictEqual(ctx2.fullpath("meep", {sharing: "global"}), "/servicesNS/nobody/beta/meep");
            test.strictEqual(ctx2.fullpath("meep", {sharing: "system"}), "/servicesNS/nobody/system/meep");
            test.done();
        }
    };
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
