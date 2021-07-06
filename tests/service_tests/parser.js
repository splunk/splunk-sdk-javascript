var assert = require("assert");

module.exports = function (svc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            done();
        },

        "Callback#Basic parse": function (done) {
            var service = this.service;

            service.parse("search index=_internal | head 1", function (err, parse) {
                assert.ok(!err);
                assert.ok(parse);
                assert.ok(parse.commands.length > 0);
                done();
            });
        },

        "Callback#Parse error": function (done) {
            var service = this.service;

            service.parse("ABCXYZ", function (err, parse) {
                assert.ok(err);
                assert.strictEqual(err.status, 400);
                done();
            });
        }
    };
};