var splunkjs    = require('../../index');

module.exports = function (svc, loggedOutSvc) {
    return {
        setUp: function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Methods to be overridden throw": function(test) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {owner: "admin",
                    app: "search",
                    sharing: "app"}
            );
            test.throws(function() {
                coll.instantiateEntity({});
            });
            test.done();
        },

        "Accessors work": function(test) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {owner: "admin",
                    app: "search",
                    sharing: "app"}
            );
            coll._load({links: "Hilda", updated: true});
            test.strictEqual(coll.links(), "Hilda");
            test.ok(coll.updated());
            test.done();
        },

        "Contains throws without a good id": function(test) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            test.throws(function() { coll.item(null);});
            test.done();
        }
    };
};