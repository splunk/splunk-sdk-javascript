exports.setup = function (svc) {
    var assert = require('chai').assert;
    return (
        describe("Parsing Tests", function () {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("Callback#Basic parse", function (done) {
                var service = this.service;

                service.parse("search index=_internal | head 1", function (err, parse) {
                    assert.ok(!err);
                    assert.ok(parse);
                    assert.ok(parse.commands.length > 0);
                    done();
                });
            });

            it("Callback#Parse error", function (done) {
                var service = this.service;

                service.parse("ABCXYZ", function (err, parse) {
                    assert.ok(err);
                    assert.strictEqual(err.status, 400);
                    done();
                });
            });
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
