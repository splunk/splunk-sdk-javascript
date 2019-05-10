module.exports = function(svc, loggedOutSvc) {
    return {
        setUp: function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Callback#Typeahead failure": function(test) {
            var service = this.loggedOutService;
            service.typeahead("index=", 1, function(err, options) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#Basic typeahead": function(test) {
            var service = this.service;

            service.typeahead("index=", 1, function(err, options) {
                test.ok(!err);
                test.ok(options);
                test.strictEqual(options.length, 1);
                test.ok(options[0]);
                test.done();
            });
        },

        "Typeahead with omitted optional arguments": function(test) {
            var service = this.service;
            service.typeahead("index=", function(err, options) {
                test.ok(!err);
                test.ok(options);
                test.done();
            });
        }
    };
};