var splunkjs    = require('../../index');
var Async       = splunkjs.Async;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function(svc, loggedOutSvc) {
    return {
        setUp: function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Accessors function properly": function(test) {
            var entity = new splunkjs.Service.Entity(
                this.service,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity._load(
                {acl: {owner: "boris", app: "factory", sharing: "app"},
                    links: {link1: 35},
                    published: "meep",
                    author: "Hilda"}
            );
            test.ok(entity.acl().owner === "boris");
            test.ok(entity.acl().app === "factory");
            test.ok(entity.acl().sharing === "app");
            test.ok(entity.links().link1 === 35);
            test.strictEqual(entity.author(), "Hilda");
            test.strictEqual(entity.published(), "meep");
            test.done();
        },

        "Refresh throws error correctly": function(test) {
            var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
            entity.fetch({}, function(err) { test.ok(err); test.done();});
        },

        "Cannot update name of entity": function(test) {
            var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
            test.throws(function() { entity.update({name: "asdf"});});
            test.done();
        },

        "Disable throws error correctly": function(test) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity.disable(function(err) { test.ok(err); test.done();});
        },

        "Enable throws error correctly": function(test) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity.enable(function(err) { test.ok(err); test.done();});
        },

        "Does reload work?": function(test) {
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
                function(done) {
                    apps.create({name: name}, done);
                },
                function(app, done) {
                    app.reload(function(err) {
                        test.ok(!err);
                        done(null, app);
                    });
                },
                function(app, done) {
                    var app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                    app2.reload(function(err) {
                        test.ok(err);
                        done(null, app);
                    });
                },
                function(app, done) {
                    app.remove(done);
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        }
    };
};