
exports.setup = function (svc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var Async = splunkjs.Async;
    return (
        describe("Views ", function () {

            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("Callback#List views", function (done) {
                var service = this.service;

                service.views({ owner: "admin", app: "search" }).fetch(function (err, views) {
                    assert.ok(!err);
                    assert.ok(views);

                    var viewsList = views.list();
                    assert.ok(viewsList);
                    assert.ok(viewsList.length > 0);

                    for (var i = 0; i < viewsList.length; i++) {
                        assert.ok(viewsList[i]);
                    }

                    done();
                });
            })

            it("Callback#Create + update + delete view", function (done) {
                var service = this.service;
                var name = "jssdk_testview";
                var originalData = "<view/>";
                var newData = "<view isVisible='false'></view>";

                Async.chain([
                    function (done) {
                        service.views({ owner: "admin", app: "sdkappcollection" }).create({ name: name, "eai:data": originalData }, done);
                    },
                    function (view, done) {
                        assert.ok(view);

                        assert.strictEqual(view.name, name);
                        assert.strictEqual(view.properties()["eai:data"], originalData);

                        view.update({ "eai:data": newData }, done);
                    },
                    function (view, done) {
                        assert.ok(view);
                        assert.strictEqual(view.properties()["eai:data"], newData);

                        view.remove(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
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
