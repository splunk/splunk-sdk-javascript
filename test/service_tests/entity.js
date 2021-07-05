var assert = require("assert");

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc, loggedOutSvc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Accessors function properly": function (done) {
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
        },

        "Refresh throws error correctly": function (done) {
            var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
            entity.fetch({}, function (err) { assert.ok(err); done(); });
        },

        "Cannot update name of entity": function (done) {
            var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
            assert.throws(function () { entity.update({ name: "asdf" }); });
            done();
        },

        "Disable throws error correctly": function (done) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                { owner: "boris", app: "factory", sharing: "app" }
            );
            entity.disable(function (err) { assert.ok(err); done(); });
        },

        "Enable throws error correctly": function (done) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                { owner: "boris", app: "factory", sharing: "app" }
            );
            entity.enable(function (err) { assert.ok(err); done(); });
        },

        "Does reload work?": function (done) {
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
        }
    };
};