var assert = require('chai').assert;

var splunkjs = require('../../index');

module.exports = function (svc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            done();
        },

        "Throws on null arguments to init": function (done) {
            var service = this.service;
            assert.throws(function () {
                var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
            });
            assert.throws(function () {
                var endpoint = new splunkjs.Service.Endpoint(service, null);
            });
            done();
        },

        "Endpoint delete on a relative path": function (done) {
            var service = this.service;
            var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
            endpoint.del("search/jobs/12345", {}, function () { done(); });
        },

        "Methods of Resource to be overridden": function (done) {
            var service = this.service;
            var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
            assert.throws(function () { resource.path(); });
            assert.throws(function () { resource.fetch(); });
            assert.ok(splunkjs.Utils.isEmpty(resource.state()));
            done();
        }
    };
};