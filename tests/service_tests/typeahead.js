var assert = require('chai').assert;

module.exports = function (svc, loggedOutSvc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Callback#Typeahead failure": function (done) {
            var service = this.loggedOutService;
            service.typeahead("index=", 1, function (err, options) {
                assert.ok(err);
                done();
            });
        },

        "Callback#Basic typeahead": function (done) {
            var service = this.service;

            service.typeahead("index=", 1, function (err, options) {
                assert.ok(!err);
                assert.ok(options);
                assert.strictEqual(options.length, 1);
                assert.ok(options[0]);
                done();
            });
        },

        "Typeahead with omitted optional arguments": function (done) {
            var service = this.service;
            service.typeahead("index=", function (err, options) {
                assert.ok(!err);
                assert.ok(options);
                done();
            });
        }
    };
};