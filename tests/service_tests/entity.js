var assert = require('chai').assert;

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc, loggedOutSvc) {
    return (
        describe("Entity tests", function () {

            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            });

            it("Accessors function properly", function (done) {
                var entity = new splunkjs.Service.Entity(
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

            it("Refresh throws error correctly", function (done) {
                var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
                entity.fetch({}, function (err) { assert.ok(err); done(); });
            });

            it("Cannot update name of entity", function (done) {
                var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
                assert.throws(function () { entity.update({ name: "asdf" }); });
                done();
            });

            it("Disable throws error correctly", function (done) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    { owner: "boris", app: "factory", sharing: "app" }
                );
                entity.disable(function (err) { assert.ok(err); done(); });
            });

            it("Enable throws error correctly", function (done) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    { owner: "boris", app: "factory", sharing: "app" }
                );
                entity.enable(function (err) { assert.ok(err); done(); });
            });

            it("Does reload work?", function (done) {
                var idx = new splunkjs.Service.Index(
                    this.service,
                    "data/indexes/sdk-test",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                var that = this;
                Async.chain(
                    function (done) {
                        apps.create({ name: name }, done);
                    },
                    function (app, done) {
                        app.reload(function (err) {
                            assert.ok(!err);
                            done(null, app);
                        });
                    },
                    function (app, done) {
                        var app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                        app2.reload(function (err) {
                            assert.ok(err);
                            done(null, app);
                        });
                    },
                    function (app, done) {
                        app.remove(done);
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
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

    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc, loggedOutSvc));
        });
    });
}
