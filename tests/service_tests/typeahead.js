
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    return (
        describe("Typeahead Tests", function () {
            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            })

            it("Typeahead failure", async function () {
                let service = this.loggedOutService;
                try {
                    await service.typeahead("index=", 1);
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("Typeahead basic", async function () {
                let service = this.service;
                const options = await service.typeahead("index=", 1);
                assert.ok(options);
                assert.strictEqual(options.length, 1);
                assert.ok(options[0]);
            })

            it("Typeahead with omitted optional arguments", async function () {
                let service = this.service;
                const options = await service.typeahead("index=");
                assert.ok(options);
            })
        })
    );
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    const cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    const svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    const loggedOutSvc = new splunkjs.Service({
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
