
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var utils = splunkjs.Utils;
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("User Tests", () => {

            beforeEach(function () {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
            })

            afterEach(async function () {
                await this.service.logout();
            })

            it("Current user", async function () {
                var service = this.service;
                let user = await service.currentUser();
                assert.ok(user);
                assert.strictEqual(user.name, service.username);
            })

            it("Current user fails", async function () {
                var service = this.loggedOutService;
                let res
                try {
                    res = await service.currentUser();
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("List users", async function () {
                var service = this.service;
                let users = await service.users().fetch();
                let userList = users.list();
                assert.ok(users);
                assert.ok(userList);
                assert.ok(userList.length > 0);
            })

            it("Create user failure", async function () {
                let res;
                try {
                    res = await this.loggedOutService.users().create(
                        { name: "jssdk_testuser", password: "abcdefg!", roles: "user" });
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("User - Create, update and delete user", async function () {
                var service = this.service;
                let name = "jssdk_testuser";
                let users = service.users();
                let user = await users.create({ name: "jssdk_testuser", password: "abcdefg!", roles: "user" });
                assert.ok(user);
                assert.strictEqual(user.name, name);
                assert.strictEqual(user.properties().roles.length, 1);
                assert.strictEqual(user.properties().roles[0], "user");

                let updatedUser = await user.update({ realname: "JS SDK", roles: ["admin", "user"] });
                assert.ok(updatedUser);
                assert.strictEqual(updatedUser.properties().realname, "JS SDK");
                assert.strictEqual(updatedUser.properties().roles.length, 2);
                assert.strictEqual(updatedUser.properties().roles[0], "admin");
                assert.strictEqual(updatedUser.properties().roles[1], "user");

                await updatedUser.remove();
            })

            it("User - Roles", async function () {
                var service = this.service;
                let name = "jssdk_testuser_" + getNextId();

                let user = await service.users().create({ name: name, password: "abcdefg!", roles: "user" });
                assert.ok(user);
                assert.strictEqual(user.name, name);
                assert.strictEqual(user.properties().roles.length, 1);
                assert.strictEqual(user.properties().roles[0], "user");

                user = await user.update({ roles: ["admin", "user"] });
                assert.ok(user);
                assert.strictEqual(user.properties().roles.length, 2);
                assert.strictEqual(user.properties().roles[0], "admin");
                assert.strictEqual(user.properties().roles[1], "user");

                user = await user.update({ roles: "user" });
                assert.ok(user);
                assert.strictEqual(user.properties().roles.length, 1);
                assert.strictEqual(user.properties().roles[0], "user");
                let res;
                try {
                    res = await user.update({ roles: "__unknown__" });
                } catch (error) {
                    assert.ok(error);
                    assert.strictEqual(error[0].status, 400);
                }
                assert.ok(!res);
            })

            it("User - Passwords", async function () {
                var service = this.service;
                let name = "jssdk_testuser_" + getNextId();

                let firstPassword = "abcdefg!";
                let secondPassword = "hijklmn!";

                let useOldPassword = false;

                let info = await service.serverInfo();
                let versionParts = info.properties().version.split(".");

                let isDevBuild = versionParts.length === 1;
                let newerThan72 = (parseInt(versionParts[0], 10) > 7 ||
                    (parseInt(versionParts[0], 10) === 7 && parseInt(versionParts[1], 10) >= 2));

                if (isDevBuild || newerThan72) {
                    useOldPassword = true;
                }
                let user = await service.users().create({ name: name, password: firstPassword, roles: "user" });
                assert.ok(user);
                assert.strictEqual(user.name, name);
                assert.strictEqual(user.properties().roles.length, 1);
                assert.strictEqual(user.properties().roles[0], "user");

                let newService = new splunkjs.Service(service.http, {
                    username: name,
                    password: firstPassword,
                    host: service.host,
                    port: service.port,
                    scheme: service.scheme,
                    version: service.version
                });
                success = await newService.login();
                assert.ok(success);
                assert.ok(user);
                let body = {
                    password: secondPassword
                };
                if (useOldPassword) {
                    body['oldpassword'] = firstPassword;
                }
                user = await user.update(body);
                try {
                    let res = await newService.login();;
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
                body = {
                    password: firstPassword
                };
                if (useOldPassword) {
                    body['oldpassword'] = secondPassword;
                }
                user = await user.update(body);
                assert.ok(user);
                await newService.login();
            })

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
            return resolve(exports.setup(svc, loggedOutSvc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
