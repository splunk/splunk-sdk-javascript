var assert = require('chai').assert;

var splunkjs = require('../../index');

var idCounter = 0;
var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {

    return (
        describe("Configuration tests", () => {
            beforeEach(function () {
                this.service = svc;
            });

            it("List configurations", async function () {
                var that = this;
                let namespace = { owner: "admin", app: "search" };
                let props = await that.service.configurations(namespace).fetch();
                let files = props.list();
                assert.ok(files.length > 0);
            });

            it("Contains configurations", async function () {
                var that = this;
                let namespace = { owner: "admin", app: "search" };

                let props = await that.service.configurations(namespace).fetch();
                let file = props.item("web");
                assert.ok(file);
                let fileFetched = await file.fetch();
                assert.strictEqual(fileFetched.name, "web");
            });

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
            });

            it("Configurations init", async function () {
                let res
                try {
                    res = new splunkjs.Service.Configurations(
                        this.service,
                        { owner: "-", app: "-", sharing: "system" }
                    );
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            });

            it("Create file, create stanza, update stanza", async function () {
                let namespace = { owner: "nobody", app: "system" };
                let fileName = "jssdk_file_" + getNextId();
                let value = "barfoo_" + getNextId();

                let configs = svc.configurations(namespace);
                configs = await configs.fetch();
                let file = await configs.create({ __conf: fileName });
                if (file.item("stanza")) {
                    await file.item("stanza").remove();
                }
                let stanza = await file.create("stanza");
                let stanzaUpdated = await stanza.update({ "jssdk_foobar": value });
                assert.strictEqual(stanzaUpdated.properties()["jssdk_foobar"], value);

                let fileFetched = new splunkjs.Service.ConfigurationFile(svc, fileName);
                fileFetched = await fileFetched.fetch();

                let stanzaFetched = fileFetched.item("stanza");
                assert.ok(stanzaFetched);
                await stanzaFetched.remove();
            });

            it("CreateAsync", async function () {
                let namespace = { owner: "nobody", app: "system" };
                let filename = "jssdk_file_new_" + getNextId();
                let stanza = "install"
                let property1 = "state"
                let value1 = "enabled";
                let property2 = "python.version"
                let value2 = "python3";

                let configs = svc.configurations(namespace);
                configs = await configs.fetch();
                let keyValueMap = {}
                keyValueMap[property1] = value1;
                keyValueMap[property2] = value2;
                await configs.createAsync(filename, stanza, keyValueMap);
                configs = svc.configurations(namespace);
                await configs.fetch();

                // a. File exists: Positive
                let configFile = await configs.getConfFile(filename);
                assert.ok(configFile);

                // b. Stanza exists: Positive
                configFile = await configFile.fetchAsync();
                let configStanza = await configs.getStanza(configFile, stanza);
                assert.ok(configStanza);
                assert.ok(configStanza._properties);
                assert.strictEqual(configStanza._properties[property1], value1);
                assert.strictEqual(configStanza._properties[property2], value2);

                // c. File exists: Negative
                let invalidConfigFile = await configs.getConfFile("invalid_filename");
                assert.ok(!invalidConfigFile);

                // d. Stanza exists: Negative
                let invalidConfigStanza = await configs.getStanza(configFile, "invalid_stanza_name");
                assert.ok(!invalidConfigStanza);
            });

            it("Get default stanza", async function () {
                let that = this;
                let namespace = { owner: "admin", app: "search" };

                let props = await that.service.configurations(namespace).fetch();
                let file = props.item("savedsearches");
                assert.strictEqual(namespace, file.namespace);
                assert.ok(file);
                file = await file.fetch();
                assert.strictEqual(namespace, file.namespace);
                let stanza = await file.getDefaultStanza().fetch();
                assert.strictEqual(stanza.name, "default");
                assert.strictEqual(namespace, stanza.namespace);
            });

            it("Updating default stanza is noop", async function () {
                let that = this;
                let namespace = { owner: "admin", app: "search" };
                let backup = null;
                let invalid = "this won't work";

                let props = await that.service.configurations(namespace).fetch();
                let file = props.item("savedsearches");
                assert.strictEqual(namespace, file.namespace);
                assert.ok(file);
                file = await file.fetch();
                assert.strictEqual(namespace, file.namespace);
                let stanza = await file.getDefaultStanza().fetch();
                assert.ok(stanza._properties.hasOwnProperty("max_concurrent"));
                assert.strictEqual(namespace, stanza.namespace);
                backup = stanza._properties.max_concurrent;
                stanza = await stanza.update({ "max_concurrent": invalid });
                assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                stanza = await stanza.fetch();
                assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
            })
        })
    )
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
