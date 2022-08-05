var assert = require('chai').assert;

var splunkjs = require('../../index');

var utils = splunkjs.Utils;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {

    return (
        describe("App tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("List applications", async function () {
                let apps = this.service.apps();
                let response = await apps.fetch();
                let appList = response.list()
                assert.ok(appList.length > 0);
            });

            it("Contains applications", async function () {
                let apps = this.service.apps();
                let response = await apps.fetch();
                let app = response.item("search");
                assert.ok(app);
            });

            it("Create, contains app", async function () {
                let name = "jssdk_testapp_" + getNextId();
                let apps = this.service.apps();
                let app = await apps.create({ name: name });
                let appName = app.name;
                let response = await apps.fetch();
                let entity = response.item(appName);
                assert.ok(entity);
                await app.remove();
            });

            it("Create, modify app", async function () {
                let DESCRIPTION = "TEST DESCRIPTION";
                let VERSION = "1.1.0";

                let name = "jssdk_testapp_" + getNextId();
                let apps = this.service.apps();

                let app = await apps.create({ name: name });
                assert.ok(app);
                assert.strictEqual(app.name, name);
                let versionMatches = app.properties().version === "1.0" ||
                    app.properties().version === "1.0.0";
                assert.ok(versionMatches);
                app = await app.update({
                    description: DESCRIPTION,
                    version: VERSION
                });
                assert.ok(app);
                let properties = app.properties();

                assert.strictEqual(properties.description, DESCRIPTION);
                assert.strictEqual(properties.version, VERSION);
                await app.remove();
            });

            it("Delete test applications", async function () {
                let apps = this.service.apps();
                let response = await apps.fetch();
                let appList = response.list();
                await utils.parallelEach(
                    appList,
                    async function (app, idx) {
                        if (utils.startsWith(app.name, "jssdk_")) {
                            await app.remove();
                        }
                    }
                );
            });

            it("list applications with cookies as authentication", async function () {
                let info = await this.service.serverInfo();
                let majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                let minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                // Skip cookie test if Splunk older than 6.2
                if (majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                    splunkjs.Logger.log("Skipping cookie test...");
                    return;
                }
                var service = new splunkjs.Service({
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });
                var service2 = new splunkjs.Service({
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                await service.login();
                // Save the cookie store
                let cookieStore = service.http._cookieStore;
                // Test that there are cookies
                assert.ok(!utils.isEmpty(cookieStore));

                // Add the cookies to a service with no other authenitcation information
                service2.http._cookieStore = cookieStore;

                let apps = service2.apps();
                let response = await apps.fetch();

                let appList = response.list();
                assert.ok(appList.length > 0);
                assert.ok(!utils.isEmpty(service2.http._cookieStore));

            })
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    let svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc));
        });
    });
}
