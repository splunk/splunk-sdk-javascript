var assert = require('chai').assert;

var splunkjs = require('../../index');

exports.setup = function (svc, loggedOutSvc) {

    return (
        describe("Collection tests", () => {
            beforeEach(function() {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
            });

            it("Methods to be overridden throw", function (done) {
                let coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                assert.throws(function () {
                    coll.instantiateEntity({});
                });
                done();
            });

            it("Accessors work", function (done) {
                let coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                coll._load({ links: "Hilda", updated: true });
                assert.strictEqual(coll.links(), "Hilda");
                assert.ok(coll.updated());
                done();
            });

            it("Contains throws without a good id", function (done) {
                let coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                assert.throws(function () { coll.item(null); });
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
