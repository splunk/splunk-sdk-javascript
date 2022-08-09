exports.setup = function (svc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var idCounter = 0;
    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Storage Password Tests", () => {
            beforeEach(function () {
                this.service = svc;
            });

            it("Create", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                let realm = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create with backslashes", async function () {
                let startcount = -1;
                let name = "\\delete-me-" + getNextId();
                let realm = "\\delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create with slashes", async function () {
                let startcount = -1;
                let name = "/delete-me-" + getNextId();
                let realm = "/delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create without realm", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual("", storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create should fail without user, or realm", async function () {
                var that = this;
                let storagePasswords = that.service.storagePasswords().fetch();
                try {
                    let res = await storagePasswords.create({ name: null, password: "changed!" });
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
            })

            it("Create should fail without password", async function () {
                var that = this;
                let storagePasswords = that.service.storagePasswords().fetch();
                try {
                    let res = await storagePasswords.create({ name: "something", password: null });
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
            })

            it("Create should fail without user, realm, or password", async function () {
                var that = this;
                let storagePasswords = that.service.storagePasswords().fetch();
                try {
                    let res = await storagePasswords.create({ name: null, password: null });
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
            })

            it("Create with colons", async function () {
                let startcount = -1;
                let name = ":delete-me-" + getNextId();
                let realm = ":delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create crazy", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                let realm = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({
                    name: name + ":end!@#$%^&*()_+{}:|<>?",
                    realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                    password: "changed!"
                });
                assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Create with unicode chars", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                let realm = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({
                    name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                    realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                    password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))
                });
                assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                assert.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Read", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                let realm = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                let list = storagePasswords.list();
                let found = false;

                assert.strictEqual(startcount + 1, list.length);
                for (let i = 0; i < list.length; i++) {
                    if (realm + ":" + name + ":" === list[i].name) {
                        found = true;
                    }
                }
                assert.ok(found);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            it("Read with slashes", async function () {
                let startcount = -1;
                let name = "/delete-me-" + getNextId();
                let realm = "/delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                let list = storagePasswords.list();
                let found = false;
                assert.strictEqual(startcount + 1, list.length);
                for (let i = 0; i < list.length; i++) {
                    if (realm + ":" + name + ":" === list[i].name) {
                        found = true;
                    }
                }
                assert.ok(found);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
            })

            // Disabling this test because clear_password field has been removed in Splunk 8.2
            //
            //
            // it("Callback#Update": function(done) {
            //     var startcount = -1;
            //     var name = "delete-me-" + getNextId();
            //     var realm = "delete-me-" + getNextId();
            //     var that = this;
            //     Async.chain([
            //             function(done) {
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 startcount = storagePasswords.list().length;
            //                 storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
            //             },
            //             function(storagePassword, done) {
            //                 assert.strictEqual(name, storagePassword.properties().username);
            //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            //                 assert.strictEqual("changed!", storagePassword.properties().clear_password);
            //                 assert.strictEqual(realm, storagePassword.properties().realm);
            //                 that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
            //             },
            //             function(storagePasswords, storagePassword, done) {
            //                 assert.strictEqual(startcount + 1, storagePasswords.list().length);
            //                 storagePassword.update({password: "changed"}, done);
            //             },
            //             function(storagePassword, done) {
            //                 assert.strictEqual(name, storagePassword.properties().username);
            //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            //                 assert.strictEqual("changed", storagePassword.properties().clear_password);
            //                 assert.strictEqual(realm, storagePassword.properties().realm);
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 var list = storagePasswords.list();
            //                 var found = false;
            //                 var index = -1;

            //                 assert.strictEqual(startcount + 1, list.length);
            //                 for (var i = 0; i < list.length; i ++) {
            //                     if (realm + ":" + name + ":" === list[i].name) {
            //                         found = true;
            //                         index = i;
            //                         assert.strictEqual(name, list[i].properties().username);
            //                         assert.strictEqual(realm + ":" + name + ":", list[i].name);
            //                         assert.strictEqual("changed", list[i].properties().clear_password);
            //                         assert.strictEqual(realm, list[i].properties().realm);
            //                     }
            //                 }
            //                 assert.ok(found);

            //                 if (!found) {
            //                     done(new Error("Didn't find the created password"));
            //                 }
            //                 else {
            //                     list[index].remove(done);
            //                 }
            //             },
            //             function(done) {
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 assert.strictEqual(startcount, storagePasswords.list().length);
            //                 done();
            //             }
            //         ],
            //         function(err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // },

            it("Delete", async function () {
                let startcount = -1;
                let name = "delete-me-" + getNextId();
                let realm = "delete-me-" + getNextId();
                var that = this;
                let storagePasswords = await that.service.storagePasswords().fetch();
                startcount = storagePasswords.list().length;
                let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                assert.strictEqual("changed!", storagePassword.properties().clear_password);
                assert.strictEqual(realm, storagePassword.properties().realm);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                await storagePassword.remove();
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
                storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
                assert.strictEqual(name, storagePassword.properties().username);
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount + 1, storagePasswords.list().length);
                let list = storagePasswords.list();
                let found = false;
                let index = -1;
                assert.strictEqual(startcount + 1, list.length);
                for (let i = 0; i < list.length; i++) {
                    if (realm + ":" + name + ":" === list[i].name) {
                        found = true;
                        index = i;
                        assert.strictEqual(name, list[i].properties().username);
                        assert.strictEqual(realm + ":" + name + ":", list[i].name);
                        assert.strictEqual("changed!", list[i].properties().clear_password);
                        assert.strictEqual(realm, list[i].properties().realm);
                    }
                }
                assert.ok(found);
                if (!found) {
                    throw new Error("Didn't find the created password");
                }
                else {
                    await list[index].remove();
                }
                storagePasswords = await that.service.storagePasswords().fetch();
                assert.strictEqual(startcount, storagePasswords.list().length);
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
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
