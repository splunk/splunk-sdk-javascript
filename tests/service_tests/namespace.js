var assert = require('chai').assert;

var splunkjs = require('../../index');
const { Logger } = require('../../lib/log');

var utils = splunkjs.Utils;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {
    return (
        describe("Namespace tests", () => {
            beforeEach(async function () {
                this.service = svc;
                let that = this;

                let appName1 = "jssdk_testapp_" + getNextId();
                let appName2 = "jssdk_testapp_" + getNextId();

                let userName1 = "jssdk_testuser_" + getNextId();
                let userName2 = "jssdk_testuser_" + getNextId();

                let apps = this.service.apps();
                let users = this.service.users();

                this.namespace11 = { owner: userName1, app: appName1 };
                this.namespace12 = { owner: userName1, app: appName2 };
                this.namespace21 = { owner: userName2, app: appName1 };
                this.namespace22 = { owner: userName2, app: appName2 };

                let app1 = await apps.create({ name: appName1 });
                that.app1 = app1;
                that.appName1 = appName1;
                let app2 = await apps.create({ name: appName2 });
                that.app2 = app2;
                that.appName2 = appName2;
                let user1 = users.create({ name: userName1, password: "abcdefg!", roles: ["user"] });
                that.user1 = user1;
                that.userName1 = userName1;
                let user2 = users.create({ name: userName2, password: "abcdefg!", roles: ["user"] });
                that.user2 = user2;
                that.userName2 = userName2;
            });

            it("Namespace protection", async function () {
                let searchName = "jssdk_search_" + getNextId();
                let search = "search *";
                let service = this.service;
                let savedSearches11 = service.savedSearches(this.namespace11);
                let savedSearches21 = service.savedSearches(this.namespace21);

                // Create the saved search only in the 11 namespace
                await savedSearches11.create({ name: searchName, search: search });
                // Refresh the 11 saved searches
                await savedSearches11.fetch();
                // Refresh the 21 saved searches
                await savedSearches21.fetch();
                let entity11 = savedSearches11.item(searchName);
                let entity21 = savedSearches21.item(searchName);

                // Make sure the saved search exists in the 11 namespace
                assert.ok(entity11);
                assert.strictEqual(entity11.name, searchName);
                assert.strictEqual(entity11.properties().search, search);

                // Make sure the saved search doesn't exist in the 11 namespace
                assert.ok(!entity21);
            });

            it("Namespace item", async function () {
                let searchName = "jssdk_search_" + getNextId();
                let search = "search *";
                let service = this.service;

                let namespace_1 = { owner: "-", app: this.appName1 };
                let namespace_nobody1 = { owner: "nobody", app: this.appName1 };

                let savedSearches11 = service.savedSearches(this.namespace11);
                let savedSearches21 = service.savedSearches(this.namespace21);
                let savedSearches_1 = service.savedSearches(namespace_1);
                let savedSearches_nobody1 = service.savedSearches(namespace_nobody1);

                let that = this;
                // Create a saved search in the 11 namespace
                await savedSearches11.create({ name: searchName, search: search });
                // Create a saved search in the 21 namespace
                await savedSearches21.create({ name: searchName, search: search });
                // Refresh the -/1 namespace
                await savedSearches_1.fetch();
                // Refresh the 1/1 namespace
                await savedSearches11.fetch();
                // Refresh the 2/1 namespace
                await savedSearches21.fetch();
                let entity11 = savedSearches11.item(searchName, that.namespace11);
                let entity21 = savedSearches21.item(searchName, that.namespace21);

                // Ensure that the saved search exists in the 11 namespace
                assert.ok(entity11);
                assert.strictEqual(entity11.name, searchName);
                assert.strictEqual(entity11.properties().search, search);
                assert.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                assert.strictEqual(entity11.namespace.app, that.namespace11.app);

                // Ensure that the saved search exists in the 21 namespace
                assert.ok(entity21);
                assert.strictEqual(entity21.name, searchName);
                assert.strictEqual(entity21.properties().search, search);
                assert.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                assert.strictEqual(entity21.namespace.app, that.namespace21.app);

                // Create a saved search in the nobody/1 namespace
                await savedSearches_nobody1.create({ name: searchName, search: search });
                // Refresh the 1/1 namespace
                await savedSearches11.fetch();
                // Refresh the 2/1 namespace
                await savedSearches21.fetch();
                // Ensure that we can't get the item from the generic
                // namespace without specifying a namespace
                try {
                    savedSearches_1.item(searchName);
                    assert.ok(false);
                } catch (err) {
                    assert.ok(err);
                }

                // Ensure that we can't get the item using wildcard namespaces.
                try {
                    savedSearches_1.item(searchName, { owner: '-' });
                    assert.ok(false);
                } catch (err) {
                    assert.ok(err);
                }

                try {
                    savedSearches_1.item(searchName, { app: '-' });
                    assert.ok(false);
                } catch (err) {
                    assert.ok(err);
                }

                try {
                    savedSearches_1.item(searchName, { app: '-', owner: '-' });
                    assert.ok(false);
                } catch (err) {
                    assert.ok(err);
                }

                // Ensure we get the right entities from the -/1 namespace when we
                // specify it.
                entity11 = savedSearches_1.item(searchName, that.namespace11);
                entity21 = savedSearches_1.item(searchName, that.namespace21);

                assert.ok(entity11);
                assert.strictEqual(entity11.name, searchName);
                assert.strictEqual(entity11.properties().search, search);
                assert.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                assert.strictEqual(entity11.namespace.app, that.namespace11.app);

                assert.ok(entity21);
                assert.strictEqual(entity21.name, searchName);
                assert.strictEqual(entity21.properties().search, search);
                assert.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                assert.strictEqual(entity21.namespace.app, that.namespace21.app);
            });

            it("Delete test users", async function () {
                let users = this.service.users();
                users = await users.fetch();
                let userList = users.list();
                let err = await utils.parallelEach(
                    userList,
                    async function (user, idx) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            await user.remove();
                        }
                    }
                );
                assert.ok(!err);
            });

            it("Delete test applications", async function () {
                let apps = this.service.apps();
                let response = await apps.fetch();
                let appList = response.list();
                let err = await utils.parallelEach(
                    appList,
                    async function (app, idx) {
                        if (utils.startsWith(app.name, "jssdk_")) {
                            await app.remove();
                        }
                    }
                );
                assert.ok(!err);
            });
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
