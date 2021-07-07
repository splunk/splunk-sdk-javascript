var assert = require('chai').assert;

var splunkjs = require('../../index');

module.exports = function (svc, loggedOutSvc) {

    return {
        beforeEach: function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Methods to be overridden throw": function (done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            assert.throws(function () {
                coll.instantiateEntity({});
            });
            done();
        },

        "Accessors work": function (done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            coll._load({ links: "Hilda", updated: true });
            assert.strictEqual(coll.links(), "Hilda");
            assert.ok(coll.updated());
            done();
        },

        "Contains throws without a good id": function (done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            assert.throws(function () { coll.item(null); });
            done();
        }
    };
};