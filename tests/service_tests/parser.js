exports.setup = function (svc) {
    var assert = require('chai').assert;
    return (
        describe("Parsing Tests", () => {
            beforeEach(function () {
                this.service = svc;
            });

            it("Basic parse", async function () {
                let service = this.service;
                let parse = await service.parse("search index=_internal | head 1");
                assert.ok(parse);
                assert.ok(parse.commands.length > 0);
            });

            it("Parse error", async function () {
                let service = this.service;
                try {
                    await service.parse("ABCXYZ");
                    assert.ok(false);
                } catch (err) {
                    assert.ok(err);
                    assert.strictEqual(err.status, 400);
                }
            });
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

    // Exports tests on a successful login
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
