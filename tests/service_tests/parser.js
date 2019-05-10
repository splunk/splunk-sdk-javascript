module.exports = function (svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Callback#Basic parse": function(test) {
            var service = this.service;

            service.parse("search index=_internal | head 1", function(err, parse) {
                test.ok(!err);
                test.ok(parse);
                test.ok(parse.commands.length > 0);
                test.done();
            });
        },

        "Callback#Parse error": function(test) {
            var service = this.service;

            service.parse("ABCXYZ", function(err, parse) {
                test.ok(err);
                test.strictEqual(err.status, 400);
                test.done();
            });
        }
    };
};