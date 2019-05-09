var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc, loggedOutSvc) {
    return {
        setUp: function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        tearDown: function(done) {
            this.service.logout(done);
        },

        "Callback#Current user": function(test) {
            var service = this.service;

            service.currentUser(function(err, user) {
                test.ok(!err);
                test.ok(user);
                test.strictEqual(user.name, service.username);
                test.done();
            });
        },

        "Callback#Current user fails": function(test) {
            var service = this.loggedOutService;

            service.currentUser(function(err, user) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#List users": function(test) {
            var service = this.service;

            service.users().fetch(function(err, users) {
                var userList = users.list();
                test.ok(!err);
                test.ok(users);

                test.ok(userList);
                test.ok(userList.length > 0);
                test.done();
            });
        },

        "Callback#create user failure": function(test) {
            this.loggedOutService.users().create(
                {name: "jssdk_testuser", password: "abcdefg!", roles: "user"},
                function(err, response) {
                    test.ok(err);
                    test.done();
                }
            );
        },

        "Callback#Create + update + delete user": function(test) {
            var service = this.service;
            var name = "jssdk_testuser";

            Async.chain([
                    function(done) {
                        service.users().create({name: "jssdk_testuser", password: "abcdefg!", roles: "user"}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.name, name);
                        test.strictEqual(user.properties().roles.length, 1);
                        test.strictEqual(user.properties().roles[0], "user");

                        user.update({realname: "JS SDK", roles: ["admin", "user"]}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.properties().realname, "JS SDK");
                        test.strictEqual(user.properties().roles.length, 2);
                        test.strictEqual(user.properties().roles[0], "admin");
                        test.strictEqual(user.properties().roles[1], "user");

                        user.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Roles": function(test) {
            var service = this.service;
            var name = "jssdk_testuser_" + getNextId();

            Async.chain([
                    function(done) {
                        service.users().create({name: name, password: "abcdefg!", roles: "user"}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.name, name);
                        test.strictEqual(user.properties().roles.length, 1);
                        test.strictEqual(user.properties().roles[0], "user");

                        user.update({roles: ["admin", "user"]}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.properties().roles.length, 2);
                        test.strictEqual(user.properties().roles[0], "admin");
                        test.strictEqual(user.properties().roles[1], "user");

                        user.update({roles: "user"}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.properties().roles.length, 1);
                        test.strictEqual(user.properties().roles[0], "user");

                        user.update({roles: "__unknown__"}, done);
                    }
                ],
                function(err) {
                    test.ok(err);
                    test.strictEqual(err.status, 400);
                    test.done();
                }
            );
        },

        "Callback#Passwords": function(test) {
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
                        var newerThan72 = (parseInt(versionParts[0], 10) >= 7 &&  parseInt(versionParts[1], 10) >= 2);

                        if (isDevBuild || newerThan72) {
                            useOldPassword = true;
                        }
                        done();
                    },
                    function(done) {
                        service.users().create({name: name, password: firstPassword, roles: "user"}, done);
                    },
                    function(user, done) {
                        test.ok(user);
                        test.strictEqual(user.name, name);
                        test.strictEqual(user.properties().roles.length, 1);
                        test.strictEqual(user.properties().roles[0], "user");

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
                    function(success, user, done) {
                        test.ok(success);
                        test.ok(user);

                        var body = {
                            password: secondPassword
                        };
                        if (useOldPassword) {
                            body['oldpassword'] = firstPassword;
                        }

                        user.update(body, done);
                    },
                    function(user, done) {
                        newService.login(function(err, success) {
                            test.ok(err);
                            test.ok(!success);

                            var body = {
                                password: firstPassword
                            };
                            if (useOldPassword) {
                                body['oldpassword'] = secondPassword;
                            }

                            user.update(body, done);
                        });
                    },
                    function(user, done) {
                        test.ok(user);
                        newService.login(done);
                    }
                ],
                function(err) {
                    test.ok(!err, JSON.stringify(err));
                    test.done();
                }
            );
        },

        "Callback#delete test users": function(test) {
            var users = this.service.users();
            users.fetch(function(err, users) {
                var userList = users.list();

                Async.parallelEach(
                    userList,
                    function(user, idx, callback) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            user.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            });
        }
    };
};