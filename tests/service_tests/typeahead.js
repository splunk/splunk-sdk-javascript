
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    return (
        describe("Typeahad Tests", function () {
            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            })

            it("Callback#Typeahead failure", function (done) {
                var service = this.loggedOutService;
                service.typeahead("index=", 1, function (err, options) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#Basic typeahead", function (done) {
                var service = this.service;

                service.typeahead("index=", 1, function (err, options) {
                    assert.ok(!err);
                    assert.ok(options);
                    assert.strictEqual(options.length, 1);
                    assert.ok(options[0]);
                    done();
                });
            })

            it("Typeahead with omitted optional arguments", function (done) {
                var service = this.service;
                service.typeahead("index=", function (err, options) {
                    assert.ok(!err);
                    assert.ok(options);
                    done();
                });
            })
        })
    );
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

    var loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc, loggedOutSvc));
        });
    });
}
