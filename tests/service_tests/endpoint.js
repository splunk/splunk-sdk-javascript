var splunkjs    = require('../../index');

module.exports = function(svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Throws on null arguments to init": function(test) {
            var service = this.service;
            test.throws(function() {
                var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
            });
            test.throws(function() {
                var endpoint = new splunkjs.Service.Endpoint(service, null);
            });
            test.done();
        },

        "Endpoint delete on a relative path": function(test) {
            var service = this.service;
            var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
            endpoint.del("search/jobs/12345", {}, function() { test.done();});
        },

        "Methods of Resource to be overridden": function(test) {
            var service = this.service;
            var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
            test.throws(function() { resource.path(); });
            test.throws(function() { resource.fetch(); });
            test.ok(splunkjs.Utils.isEmpty(resource.state()));
            test.done();
        }
    };
};