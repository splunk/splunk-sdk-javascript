module.exports = function (svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Callback#Basic": function(test) {
            var service = this.service;

            service.serverInfo(function(err, info) {
                test.ok(!err);
                test.ok(info);
                test.strictEqual(info.name, "server-info");
                test.ok(info.properties().hasOwnProperty("version"));
                test.ok(info.properties().hasOwnProperty("serverName"));
                test.ok(info.properties().hasOwnProperty("os_version"));

                test.done();
            });
        }
    };
};