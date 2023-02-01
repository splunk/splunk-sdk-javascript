
var utils       = splunkjs.Utils;

splunkjs.Logger.setLevel("ALL");
const isBrowser = typeof window !== "undefined";

describe('Context tests', function() {
    before(function(){
        this.service = svc;
    })
    describe("General Context Test", () => {
        before(function (done) {
            this.service = svc;
            done();
        });

        it("Service exists", function (done) {
            assert.ok(this.service);
            done();
        });

        it("Create test search", async function () {
            // The search created here is used by several of the following tests, specifically those using get()
            let searchID = "DELETEME_JSSDK_UNITTEST";
            let res = await this.service.post("search/jobs", { search: "search index=_internal | head 1", exec_mode: "blocking", id: searchID });
            assert.ok(res.data.sid);

        });

        it("Login", async function () {
            let newService = new splunkjs.Service(svc.http, {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
            //ASK assert.ok(await newService.login());
            try {
                await newService.login();
            } catch (error) {
                assert.ok(!error);
            }
        });

        it("Login fail", async function () {
            let newService = new splunkjs.Service(svc.http, {
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password + "wrong_password",
                version: svc.version
            });
            if (!isBrowser) {
                try {
                    let res = await newService.login();
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
            }
        });

        it("Get", async function () {
            let res = await this.service.get("search/jobs", { count: 1 });
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);
        });

        it("Get error", async function () {
            try {
                let res = await this.service.get("search/jobs/1234_nosuchjob", {});
                assert.ok(!res);
            } catch (error) {
                assert.strictEqual(error.status, 404);
            }
        });

        it("Get autologin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                version: svc.version
            }
            );
            let res = await service.get("search/jobs", { count: 1 });
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);
        });

        it("Get autologin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                version: svc.version
            }
            );
            try {
                let res = await service.get("search/jobs", { count: 1 });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Get autologin - disabled", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                autologin: false,
                version: svc.version
            });
            let res;
            try {
                res = await service.get("search/jobs", { count: 1 });
            } catch (error) {
                assert.ok(!error);
            }
            assert.ok(res);
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);
            
        });

        it("Get relogin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );

            let res = await service.get("search/jobs", { count: 1 });

            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);
        });

        it("Get relogin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );
            try {
                let res = await service.get("search/jobs", { count: 1 });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Post", async function () {
            let service = this.service;
            let res = await this.service.post("search/jobs", { search: "search index=_internal | head 1" });
            let sid = res.data.sid;
            assert.ok(sid);

            let endpoint = "search/jobs/" + sid + "/control";
            res = await service.post(endpoint, { action: "cancel" });

        });

        it("Post error", async function () {
            try {
                let res = await this.service.post("search/jobs", { search: "index_internal | head 1" });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 400);
            }
        });

        it("Post autologin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                version: svc.version
            }
            );

            let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
            let sid = res.data.sid;
            assert.ok(sid);

            let endpoint = "search/jobs/" + sid + "/control";
            res = await service.post(endpoint, { action: "cancel" });

        });

        it("Post autologin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                version: svc.version
            }
            );
            try {
                let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Post autologin - disabled", async function () {
            var service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                autologin: false,
                version: svc.version
            });
            let res;
            try {
                res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
            } catch (error) {
                assert.ok(!error);
            }
            assert.ok(res);
            let sid = res.data.sid;
            assert.ok(sid);
        });

        it("Post relogin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );

            let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
            let sid = res.data.sid;
            assert.ok(sid);

            let endpoint = "search/jobs/" + sid + "/control";
            service.post(endpoint, { action: "cancel" });
        });

        it("Post relogin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );
            try {
                let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
                assert.ok(res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Delete", async function () {
            let service = this.service;
            let res = await this.service.post("search/jobs", { search: "search index=_internal | head 1" });
            let sid = res.data.sid;
            assert.ok(sid);

            let endpoint = "search/jobs/" + sid;
            await service.del(endpoint, {});
        });

        it("Delete error", async function () {
            try {
                let res = await this.service.del("search/jobs/1234_nosuchjob", {});
                assert.ok(res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 404);
            }
        });

        it("Delete autologin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                version: svc.version
            }
            );

            let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
            let sid = res.data.sid;
            assert.ok(sid);

            service.sessionKey = null;
            let endpoint = "search/jobs/" + sid;
            await service.del(endpoint, {});
        });

        it("Delete autologin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                version: svc.version
            }
            );
            try {
                let res = await service.del("search/jobs/NO_SUCH_SID", {});
                assert.ok(res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Delete autologin - disabled", async function () {
            var service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                autologin: false,
                version: svc.version
            });
            let res;
            try {
                res = await service.del("search/jobs/NO_SUCH_SID", {});
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 404);
            }
            assert.ok(!res);
        });

        it("Delete relogin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );

            let res = await service.post("search/jobs", { search: "search index=_internal | head 1" });
            var sid = res.data.sid;
            assert.ok(sid);

            service.sessionKey = "ABCDEF-not-real";
            let endpoint = "search/jobs/" + sid;
            await service.del(endpoint, {});
        });

        it("Delete relogin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );
            try {
                let res = await service.del("search/jobs/NO_SUCH_SID", {});
                assert.ok(res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Request get", async function () {
            let get = { count: 1 };
            let post = null;
            let body = null;
            let res = await this.service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);

            if (res.response.request) {
                assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
            }
        });

        it("Request post", async function () {
            let body = "search=" + encodeURIComponent("search index=_internal | head 1");
            let headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            };
            let service = this.service;
            let res = await this.service.request("search/jobs", "POST", null, null, body, headers);
            assert.ok(res);
            let sid = res.data.sid;
            assert.ok(sid);

            let endpoint = "search/jobs/" + sid + "/control";
            await service.post(endpoint, { action: "cancel" });

        });

        it("Request error", async function () {
            let res;
            try {
                res = await this.service.request("search/jobs/1234_nosuchjob", "GET", null, null, null, { "X-TestHeader": 1 });
            } catch (error) {
                if (error.response.request) {
                    assert.strictEqual(error.response.request.headers["X-TestHeader"], 1);
                }
                assert.strictEqual(error.status, 404);
            }
            assert.ok(!res);
        });

        it("Request autologin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                version: svc.version
            }
            );

            let get = { count: 1 };
            let post = null;
            let body = null;
            let res = await service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
            assert.ok(res);
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);

            if (res.response.request) {
                assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
            }
        });

        it("Request autologin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                version: svc.version
            }
            );

            let get = { count: 1 };
            let post = null;
            let body = null;
            try {
                let res = await service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Request autologin - disabled", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                autologin: false,
                version: svc.version
            }
            );

            let get = { count: 1 };
            let post = null;
            let body = null;
            let res;
            try {
                res = await service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
            } catch (error) {
                assert.ok(!error);
            }
            assert.ok(res);
        });

        it("Request relogin - success", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );

            let get = { count: 1 };
            let post = null;
            let body = null;
            let res = await service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
            assert.ok(res);
            assert.strictEqual(res.data.paging.offset, 0);
            assert.ok(res.data.entry.length <= res.data.paging.total);
            assert.strictEqual(res.data.entry.length, 1);
            assert.ok(res.data.entry[0].content.sid);

            if (res.response.request) {
                assert.strictEqual(res.response.request.headers["X-TestHeader"], 1);
            }
        });

        it("Request relogin - error", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password + "ABC",
                sessionKey: "ABCDEF-not-real",
                version: svc.version
            }
            );

            let get = { count: 1 };
            let post = null;
            let body = null;
            try {
                let res = await service.request("search/jobs", "GET", get, post, body, { "X-TestHeader": 1 });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.status, 401);
            }
        });

        it("Abort", async function () {
            try {
                let res = await this.service.get("search/jobs", { count: 1 }, response_timeout = 1);
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error.error, "abort");
                assert.strictEqual(error.status, "abort");
            }
        });

        it("Timeout default test", async function () {
            let service = new splunkjs.Service(svc.http,{
                scheme: this.service.scheme,
                host: this.service.host,
                port: this.service.port,
                username: this.service.username,
                password: this.service.password,
                version: svc.version
            }
            );

            assert.strictEqual(0, service.timeout);
            let res = await service.request("search/jobs", "GET", { count: 1 }, null, null, { "X-TestHeader": 1 });
            assert.ok(res);
        });

        it("Timeout timed test", async function () {
            let service = new splunkjs.Service(svc.http,{
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
            let res = await service.request("search/jobs", "GET", { count: 1 }, null, null, { "X-TestHeader": 1 });
            assert.ok(res);
        });

        // This test is not stable, commenting it out until we figure it out
        // "Callback#timeout fail -- FAILS INTERMITTENTLY": function(done){
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

        it("Cancel test search", async function () {
            // Here, the search created for several of the previous tests is terminated, it is no longer necessary
            var endpoint = "search/jobs/DELETEME_JSSDK_UNITTEST/control";
            await this.service.post(endpoint, { action: "cancel" });
        });

        it("Fullpath gets its owner/app from the right places", function (done) {
            var http = DummyHttp;
            var ctx = new splunkjs.Context(http, { /*nothing*/ });

            // Absolute paths are unchanged
            assert.strictEqual(ctx.fullpath("/a/b/c"), "/a/b/c");
            // Fall through to /services if there is no app
            assert.strictEqual(ctx.fullpath("meep"), "/services/meep");
            // Are username and app set properly?
            var ctx2 = new splunkjs.Context(http, { owner: "alpha", app: "beta" });
            assert.strictEqual(ctx2.fullpath("meep"), "/servicesNS/alpha/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", { owner: "boris" }), "/servicesNS/boris/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", { app: "factory" }), "/servicesNS/alpha/factory/meep");
            assert.strictEqual(ctx2.fullpath("meep", { owner: "boris", app: "factory" }), "/servicesNS/boris/factory/meep");
            // Sharing settings
            assert.strictEqual(ctx2.fullpath("meep", { sharing: "app" }), "/servicesNS/nobody/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", { sharing: "global" }), "/servicesNS/nobody/beta/meep");
            assert.strictEqual(ctx2.fullpath("meep", { sharing: "system" }), "/servicesNS/nobody/system/meep");
            // Do special characters get encoded?
            var ctx3 = new splunkjs.Context(http, { owner: "alpha@beta.com", app: "beta" });
            assert.strictEqual(ctx3.fullpath("meep"), "/servicesNS/alpha%40beta.com/beta/meep");
            done();
        });

        it("Version check", function (done) {
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
    }),

    describe("Cookie Tests", () => {
        before(async function () {
            this.service = svc;
            this.skip = false;
            var that = this;
            let info = await svc.serverInfo();
            let majorVersion = parseInt(info.properties().version.split(".")[0], 10);
            let minorVersion = parseInt(info.properties().version.split(".")[1], 10);
            // Skip cookie tests if Splunk older than 6.2
            if (majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                that.skip = true;
                splunkjs.Logger.log("Skipping cookie tests...");
            }
        });

        after(async function () {
            await this.service.logout();
        });

        it("_getCookieString works as expected", function (done) {
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port
            });

            service.http._cookieStore = {
                'cookie': 'format',
                'another': 'one'
            };

            let expectedCookieString = 'cookie=format; another=one; ';
            let cookieString = service.http._getCookieString();

            assert.strictEqual(cookieString, expectedCookieString);
            done();
        });

        it("Login and store cookie", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });

            // Check that there are no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));
            await service.login();
            // Check that cookies were saved
            assert.ok(!utils.isEmpty(service.http._cookieStore));
            assert.notStrictEqual(service.http._getCookieString(), '');
        });

        it("Request with cookie", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
            // Create another service to put valid cookie into, give no other authentication information
            let service2 = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                version: svc.version
            });

            try {
                // Login to service to get a valid cookie
                await service.login();
                // Save the cookie store
                let cookieStore = service.http._cookieStore;
                // Test that there are cookies
                assert.ok(!utils.isEmpty(cookieStore));
                // Add the cookies to a service with no other authentication information
                service2.http._cookieStore = cookieStore;
                // Make a request that requires authentication
                let resp = await service2.get("search/jobs", { count: 1 });
                // Test that a response was returned
                assert.ok(resp);
            } catch (error) {
                // Test that no errors were returned
                assert.ok(!error);
            }
        });

        it("Request fails with bad cookie", async function () {
            if (this.skip) {
                return;
            }
            // Create a service with no login information
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                version: svc.version
            });

            // Put a bad cookie into the service
            service.http._cookieStore = { "bad": "cookie" };

            let resp;
            // Try requesting something that requires authentication
            try {
                resp = await service.get("search/jobs", { count: 1 });
            } catch (err) {
                // Test if an error is returned
                assert.ok(err);
                // Check that it is an unauthorized error
                assert.strictEqual(err.status, 401);
            }
            assert.ok(!resp);
        });

        it("Autologin with cookie", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });

            // Test if service has no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));

            await service.get("search/jobs", { count: 1 });
            // Test if service now has a cookie
            assert.ok(service.http._cookieStore);
        });

        it("Login fails with no cookie and no sessionKey", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
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
            try {
                let res = await service.get("search/jobs", { count: 1 });
                assert.ok(!res);
            } catch (error) {
                // Test if an error is returned
                assert.ok(error);
            }
        });

        it("Login with multiple cookies", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
            // Create another service to put valid cookie into, give no other authentication information
            let service2 = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                version: svc.version
            });

            // Login to service to get a valid cookie
            try {
                await service.login();
                // Save the cookie store
                let cookieStore = service.http._cookieStore;
                // Test that there are cookies
                assert.ok(!utils.isEmpty(cookieStore));

                // Add a bad cookie to the cookieStore
                cookieStore['bad'] = 'cookie';

                // Add the cookies to a service with no other authenitcation information
                service2.http._cookieStore = cookieStore;

                // Make a request that requires authentication
                let res = await service2.get("search/jobs", { count: 1 });
                // Test that a response was returned
                assert.ok(res);
            } catch (error) {
                assert.ok(!error);
            }
        });

        it("Autologin with cookie and bad sessionKey", async function () {
            if (this.skip) {
                return;
            }
            let service = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host, port: svc.port,
                username: svc.username,
                password: svc.password,
                sessionKey: 'ABC-BADKEY',
                version: svc.version
            });

            // Test if service has no cookies
            assert.ok(utils.isEmpty(service.http._cookieStore));
            try {
                await service.get("search/jobs", { count: 1 });
                // Test if service now has a cookie
                assert.ok(service.http._cookieStore);
            } catch (error) {
                assert.ok(!error);
            }

        });
    })
});