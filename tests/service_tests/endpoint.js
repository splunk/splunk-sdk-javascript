var assert = require('chai').assert;

var splunkjs = require('../../index');

exports.setup = function (svc) {
    return (
        describe("Endpoint tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("Throws on null arguments to init", function (done) {
                var service = this.service;
                assert.throws(function () {
                    var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
                });
                assert.throws(function () {
                    var endpoint = new splunkjs.Service.Endpoint(service, null);
                });
                done();
            });

            it("Endpoint delete on a relative path", function (done) {
                var service = this.service;
                var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
                endpoint.del("search/jobs/12345", {}, function () { done(); });
            });

            it("Methods of Resource to be overridden", function (done) {
                var service = this.service;
                var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
                assert.throws(function () { resource.path(); });
                assert.throws(function () { resource.fetch(); });
                assert.ok(splunkjs.Utils.isEmpty(resource.state()));
                done();
            })
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc));
        });
    });
}
