var assert = require('chai').assert;

module.exports = function (svc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            done();
        },

        "Callback#Basic": function (done) {
            var service = this.service;

            service.serverInfo(function (err, info) {
                assert.ok(!err);
                assert.ok(info);
                assert.strictEqual(info.name, "server-info");
                assert.ok(info.properties().hasOwnProperty("version"));
                assert.ok(info.properties().hasOwnProperty("serverName"));
                assert.ok(info.properties().hasOwnProperty("os_version"));

                done();
            });
        }
    };
};