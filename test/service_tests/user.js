var assert = require("assert");

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var utils = splunkjs.Utils;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc, loggedOutSvc) {
    return {
        beforeEach: function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        afterEach: function (done) {
            this.service.logout(done);
        },

        "Callback#Current user": function (done) {
            var service = this.service;

            service.currentUser(function (err, user) {
                assert.ok(!err);
                assert.ok(user);
                assert.strictEqual(user.name, service.username);
                done();
            });
        },

        "Callback#Current user fails": function (done) {
            var service = this.loggedOutService;

            service.currentUser(function (err, user) {
                assert.ok(err);
                done();
            });
        },

        "Callback#List users": function (done) {
            var service = this.service;

            service.users().fetch(function (err, users) {
                var userList = users.list();
                assert.ok(!err);
                assert.ok(users);

                assert.ok(userList);
                assert.ok(userList.length > 0);
                done();
            });
        },

        "Callback#create user failure": function (done) {
            this.loggedOutService.users().create(
                { name: "jssdk_testuser", password: "abcdefg!", roles: "user" },
                function (err, response) {
                    assert.ok(err);
                    done();
                }
            );
        },

        "Callback#Create + update + delete user": function (done) {
            var service = this.service;
            var name = "jssdk_testuser";

            Async.chain([
                function (done) {
                    service.users().create({ name: "jssdk_testuser", password: "abcdefg!", roles: "user" }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.name, name);
                    assert.strictEqual(user.properties().roles.length, 1);
                    assert.strictEqual(user.properties().roles[0], "user");

                    user.update({ realname: "JS SDK", roles: ["admin", "user"] }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.properties().realname, "JS SDK");
                    assert.strictEqual(user.properties().roles.length, 2);
                    assert.strictEqual(user.properties().roles[0], "admin");
                    assert.strictEqual(user.properties().roles[1], "user");

                    user.remove(done);
                }
            ],
                function (err) {
                    assert.ok(!err);
                    done();
                }
            );
        },

        "Callback#Roles": function (done) {
            var service = this.service;
            var name = "jssdk_testuser_" + getNextId();

            Async.chain([
                function (done) {
                    service.users().create({ name: name, password: "abcdefg!", roles: "user" }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.name, name);
                    assert.strictEqual(user.properties().roles.length, 1);
                    assert.strictEqual(user.properties().roles[0], "user");

                    user.update({ roles: ["admin", "user"] }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.properties().roles.length, 2);
                    assert.strictEqual(user.properties().roles[0], "admin");
                    assert.strictEqual(user.properties().roles[1], "user");

                    user.update({ roles: "user" }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.properties().roles.length, 1);
                    assert.strictEqual(user.properties().roles[0], "user");

                    user.update({ roles: "__unknown__" }, done);
                }
            ],
                function (err) {
                    assert.ok(err);
                    assert.strictEqual(err.status, 400);
                    done();
                }
            );
        },

        "Callback#Passwords": function (done) {
            var service = this.service;
            var newService = null;
            var name = "jssdk_testuser_" + getNextId();

            var firstPassword = "abcdefg!";
            var secondPassword = "hijklmn!";

            var useOldPassword = false;

            Async.chain([
                function (done) {
                    service.serverInfo(done);
                },
                function (info, done) {
                    var versionParts = info.properties().version.split(".");

                    var isDevBuild = versionParts.length === 1;
                    var newerThan72 = (parseInt(versionParts[0], 10) > 7 ||
                        (parseInt(versionParts[0], 10) === 7 && parseInt(versionParts[1], 10) >= 2));

                    if (isDevBuild || newerThan72) {
                        useOldPassword = true;
                    }
                    done();
                },
                function (done) {
                    service.users().create({ name: name, password: firstPassword, roles: "user" }, done);
                },
                function (user, done) {
                    assert.ok(user);
                    assert.strictEqual(user.name, name);
                    assert.strictEqual(user.properties().roles.length, 1);
                    assert.strictEqual(user.properties().roles[0], "user");

                    newService = new splunkjs.Service(service.http, {
                        username: name,
                        password: firstPassword,
                        host: service.host,
                        port: service.port,
                        scheme: service.scheme,
                        version: service.version
                    });

                    newService.login(Async.augment(done, user));
                },
                function (success, user, done) {
                    assert.ok(success);
                    assert.ok(user);

                    var body = {
                        password: secondPassword
                    };
                    if (useOldPassword) {
                        body['oldpassword'] = firstPassword;
                    }

                    user.update(body, done);
                },
                function (user, done) {
                    newService.login(function (err, success) {
                        assert.ok(err);
                        assert.ok(!success);

                        var body = {
                            password: firstPassword
                        };
                        if (useOldPassword) {
                            body['oldpassword'] = secondPassword;
                        }

                        user.update(body, done);
                    });
                },
                function (user, done) {
                    assert.ok(user);
                    newService.login(done);
                }
            ],
                function (err) {
                    assert.ok(!err, JSON.stringify(err));
                    done();
                }
            );
        },

        "Callback#delete test users": function (done) {
            var users = this.service.users();
            users.fetch(function (err, users) {
                var userList = users.list();

                Async.parallelEach(
                    userList,
                    function (user, idx, callback) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            user.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        }
    };
};
