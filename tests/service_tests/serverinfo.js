
exports.setup = function (svc) {
    var assert = require('chai').assert;
    return (
        describe("Server Info Test", function () {
            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("Basic", async function () {
                let service = this.service;
                const info = await service.serverInfo();
                assert.ok(info);
                assert.strictEqual(info.name, "server-info");
                assert.ok(info.properties().hasOwnProperty("version"));
                assert.ok(info.properties().hasOwnProperty("serverName"));
                assert.ok(info.properties().hasOwnProperty("os_version"));
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
