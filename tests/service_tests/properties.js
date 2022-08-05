
exports.setup = function (svc) {
    var assert = require('chai').assert;

    var splunkjs = require('../../index');
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Properties Tests", function () {

            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("List", async function () {
                var that = this;
                let namespace = { owner: "admin", app: "search" };
                let props = await that.service.configurations(namespace).fetch();
                let files = props.list();
                assert.ok(files.length > 0);
            })

            it("Item", async function () {
                var that = this;
                let namespace = { owner: "admin", app: "search" };
                let props = await that.service.configurations(namespace).fetch();
                let file = props.item("web");
                assert.ok(file);
                file = await file.fetch();
                assert.strictEqual(file.name, "web");
            })

            it("Contains stanza", async function () {
                var that = this;
                let namespace = { owner: "admin", app: "search" };
                let props = await that.service.configurations(namespace).fetch();
                let file = props.item("web");
                assert.ok(file);
                file = await file.fetch();
                assert.strictEqual(file.name, "web");
                let stanza = file.item("settings");
                assert.ok(stanza);
                stanza = await stanza.fetch();
                assert.ok(stanza.properties().hasOwnProperty("httpport"));
            })

            it("Create file, create stanza and update stanza", async function () {
                var that = this;
                let fileName = "jssdk_file_" + getNextId();
                let value = "barfoo_" + getNextId();
                let namespace = { owner: "admin", app: "search" };
                let properties = await that.service.configurations(namespace).fetch();
                let file = await properties.create(fileName);
                let stanza = await file.create("stanza");
                stanza = await stanza.update({ "jssdk_foobar": value });
                assert.strictEqual(stanza.properties()["jssdk_foobar"], value);

                let configFile = new splunkjs.Service.ConfigurationFile(svc, fileName);
                file = await configFile.fetch();
                stanza = file.item("stanza");
                assert.ok(stanza);
                await stanza.remove();
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

