var assert = require('chai').assert;

var splunkjs = require('../../index');

var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc, loggedOutSvc) {
    return (
        describe("Entity tests", () => {

            beforeEach(function () {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
            });

            it("Accessors function properly", function (done) {
                let entity = new splunkjs.Service.Entity(
                    this.service,
                    "/search/jobs/12345",
                    { owner: "boris", app: "factory", sharing: "app" }
                );
                entity._load(
                    {
                        acl: { owner: "boris", app: "factory", sharing: "app" },
                        links: { link1: 35 },
                        published: "meep",
                        author: "Hilda"
                    }
                );
                assert.ok(entity.acl().owner === "boris");
                assert.ok(entity.acl().app === "factory");
                assert.ok(entity.acl().sharing === "app");
                assert.ok(entity.links().link1 === 35);
                assert.strictEqual(entity.author(), "Hilda");
                assert.strictEqual(entity.published(), "meep");
                done();
            });

            it("Refresh throws error correctly", async function () {
                let entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
                try {
                    let res = await entity.fetch({});
                    assert.ok(!res)
                } catch (error) {
                    assert.ok(error)
                }
            });

            it("Cannot update name of entity", function (done) {
                let entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
                assert.throws(function () { entity.update({ name: "asdf" }); });
                done();
            });

            it("Disable throws error correctly", async function () {
                let entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    { owner: "boris", app: "factory", sharing: "app" }
                );
                let res;
                try {
                    res = await entity.disable();
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            });

            it("Enable throws error correctly", async function () {
                let entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    { owner: "boris", app: "factory", sharing: "app" }
                );
                let res;
                try {
                    res = await entity.enable();
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            });

            it("Does reload work?", async function () {
                let name = "jssdk_testapp_" + getNextId();
                let apps = this.service.apps();

                var that = this;
                let app = await apps.create({ name: name });
                await app.reload();
                let app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                try {
                    await app2.reload();
                } catch (error) {
                    assert.ok(error);
                }
                await app.remove();
            })
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    let cmdline = options.create().parse(process.argv);

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

    let loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc, loggedOutSvc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
