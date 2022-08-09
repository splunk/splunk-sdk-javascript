
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    return (
        describe("Typeahead Tests", () => {
            beforeEach(function () {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
            })

            it("Typeahead failure", async function () {
                let service = this.loggedOutService;
                let res;
                try {
                    res = await service.typeahead("index=", 1);
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("Typeahead basic", async function () {
                let service = this.service;
                let options = await service.typeahead("index=", 1);
                assert.ok(options);
                assert.strictEqual(options.length, 1);
                assert.ok(options[0]);
            })

            it("Typeahead with omitted optional arguments", async function () {
                let service = this.service;
                let options = await service.typeahead("index=");
                assert.ok(options);
            })
        })
    );
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    let cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    let svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    let loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc,loggedOutSvc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
