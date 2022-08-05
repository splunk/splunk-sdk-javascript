
exports.setup = function (svc) {
    var assert = require('chai').assert;

    return (
        describe("Views ", function () {

            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("List views", async function () {
                var service = this.service;
                const views = await service.views({ owner: "admin", app: "search" }).fetch();
                assert.ok(views);

                const viewsList = views.list();
                assert.ok(viewsList);
                assert.ok(viewsList.length > 0);

                for (let i = 0; i < viewsList.length; i++) {
                    assert.ok(viewsList[i]);
                }
            })

            it("Views - Create, update and delete view", async function () {
                var service = this.service;
                const name = "jssdk_testview";
                const originalData = "<view/>";
                const newData = "<view isVisible='false'></view>";

                const view = await service.views({ owner: "admin", app: "sdkappcollection" }).create({ name: name, "eai:data": originalData });
                assert.ok(view);
                assert.strictEqual(view.name, name);
                assert.strictEqual(view.properties()["eai:data"], originalData);

                const updatedView = await view.update({ "eai:data": newData });
                assert.ok(updatedView);
                assert.strictEqual(updatedView.properties()["eai:data"], newData);

                await updatedView.remove();
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
