
exports.setup = function (svc) {
    var assert = require('chai').assert;
    return (
        describe("Server Info Test", function () {
            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("Callback#Basic", function (done) {
                var service = this.service;

                service.serverInfo(function (err, info) {
                    assert.ok(!err);
                    assert.ok(info);
                    assert.strictEqual(info.name, "server-info");
                    assert.ok(info.properties().hasOwnProperty("version"));
                    assert.ok(info.properties().hasOwnProperty("serverName"));
                    assert.ok(info.properties().hasOwnProperty("os_version"));

                    done();
                });
            })

            it("V2 Search APIs Enable/Disabled", function (done) {
                let service = this.service;
                let flag = service.disableV2SearchApi();
                if(service.instanceType == "cloud"){
                    service.versionCompare("9.0.2209") < 0  ? assert.isTrue(flag) : assert.isFalse(flag);
                }else{
                    service.versionCompare("9.0.2") < 0 ? assert.isTrue(flag) : assert.isFalse(flag);
                }
                done();
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
