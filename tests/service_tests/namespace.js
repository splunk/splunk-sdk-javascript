var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function(svc) {
    return {
        setUp: function (finished) {
            this.service = svc;
            var that = this;

            var appName1 = "jssdk_testapp_" + getNextId();
            var appName2 = "jssdk_testapp_" + getNextId();

            var userName1 = "jssdk_testuser_" + getNextId();
            var userName2 = "jssdk_testuser_" + getNextId();

            var apps = this.service.apps();
            var users = this.service.users();

            this.namespace11 = {owner: userName1, app: appName1};
            this.namespace12 = {owner: userName1, app: appName2};
            this.namespace21 = {owner: userName2, app: appName1};
            this.namespace22 = {owner: userName2, app: appName2};

            Async.chain([
                    function (done) {
                        apps.create({name: appName1}, done);
                    },
                    function (app1, done) {
                        that.app1 = app1;
                        that.appName1 = appName1;
                        apps.create({name: appName2}, done);
                    },
                    function (app2, done) {
                        that.app2 = app2;
                        that.appName2 = appName2;
                        users.create({name: userName1, password: "abcdefg!", roles: ["user"]}, done);
                    },
                    function (user1, done) {
                        that.user1 = user1;
                        that.userName1 = userName1;
                        users.create({name: userName2, password: "abcdefg!", roles: ["user"]}, done);
                    },
                    function (user2, done) {
                        that.user2 = user2;
                        that.userName2 = userName2;

                        done();
                    }
                ],
                function (err) {
                    finished(err);
                }
            );
        },

        "Callback#Namespace protection": function (test) {
            var searchName = "jssdk_search_" + getNextId();
            var search = "search *";
            var service = this.service;

            var savedSearches11 = service.savedSearches(this.namespace11);
            var savedSearches21 = service.savedSearches(this.namespace21);

            Async.chain([
                    function (done) {
                        // Create the saved search only in the 11 namespace
                        savedSearches11.create({name: searchName, search: search}, done);
                    },
                    function (savedSearch, done) {
                        // Refresh the 11 saved searches
                        savedSearches11.fetch(done);
                    },
                    function (savedSearches, done) {
                        // Refresh the 21 saved searches
                        savedSearches21.fetch(done);
                    },
                    function (savedSearches, done) {
                        var entity11 = savedSearches11.item(searchName);
                        var entity21 = savedSearches21.item(searchName);

                        // Make sure the saved search exists in the 11 namespace
                        test.ok(entity11);
                        test.strictEqual(entity11.name, searchName);
                        test.strictEqual(entity11.properties().search, search);

                        // Make sure the saved search doesn't exist in the 11 namespace
                        test.ok(!entity21);
                        done();
                    }
                ],
                function (err) {
                    test.ok(!err, JSON.stringify(err));
                    test.done();
                }
            );
        },

        "Callback#Namespace item": function (test) {
            var searchName = "jssdk_search_" + getNextId();
            var search = "search *";
            var service = this.service;

            var namespace_1 = {owner: "-", app: this.appName1};
            var namespace_nobody1 = {owner: "nobody", app: this.appName1};

            var savedSearches11 = service.savedSearches(this.namespace11);
            var savedSearches21 = service.savedSearches(this.namespace21);
            var savedSearches_1 = service.savedSearches(namespace_1);
            var savedSearches_nobody1 = service.savedSearches(namespace_nobody1);

            var that = this;
            Async.chain([
                    function (done) {
                        // Create a saved search in the 11 namespace
                        savedSearches11.create({name: searchName, search: search}, done);
                    },
                    function (savedSearch, done) {
                        // Create a saved search in the 21 namespace
                        savedSearches21.create({name: searchName, search: search}, done);
                    },
                    function (savedSearch, done) {
                        // Refresh the -/1 namespace
                        savedSearches_1.fetch(done);
                    },
                    function (savedSearches, done) {
                        // Refresh the 1/1 namespace
                        savedSearches11.fetch(done);
                    },
                    function (savedSearches, done) {
                        // Refresh the 2/1 namespace
                        savedSearches21.fetch(done);
                    },
                    function (savedSearches, done) {
                        var entity11 = savedSearches11.item(searchName, that.namespace11);
                        var entity21 = savedSearches21.item(searchName, that.namespace21);

                        // Ensure that the saved search exists in the 11 namespace
                        test.ok(entity11);
                        test.strictEqual(entity11.name, searchName);
                        test.strictEqual(entity11.properties().search, search);
                        test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                        test.strictEqual(entity11.namespace.app, that.namespace11.app);

                        // Ensure that the saved search exists in the 21 namespace
                        test.ok(entity21);
                        test.strictEqual(entity21.name, searchName);
                        test.strictEqual(entity21.properties().search, search);
                        test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                        test.strictEqual(entity21.namespace.app, that.namespace21.app);

                        done();
                    },
                    function (done) {
                        // Create a saved search in the nobody/1 namespace
                        savedSearches_nobody1.create({name: searchName, search: search}, done);
                    },
                    function (savedSearch, done) {
                        // Refresh the 1/1 namespace
                        savedSearches11.fetch(done);
                    },
                    function (savedSearches, done) {
                        // Refresh the 2/1 namespace
                        savedSearches21.fetch(done);
                    },
                    function (savedSearches, done) {
                        // Ensure that we can't get the item from the generic
                        // namespace without specifying a namespace
                        try {
                            savedSearches_1.item(searchName);
                            test.ok(false);
                        } catch (err) {
                            test.ok(err);
                        }

                        // Ensure that we can't get the item using wildcard namespaces.
                        try {
                            savedSearches_1.item(searchName, {owner: '-'});
                            test.ok(false);
                        } catch (err) {
                            test.ok(err);
                        }

                        try {
                            savedSearches_1.item(searchName, {app: '-'});
                            test.ok(false);
                        } catch (err) {
                            test.ok(err);
                        }

                        try {
                            savedSearches_1.item(searchName, {app: '-', owner: '-'});
                            test.ok(false);
                        } catch (err) {
                            test.ok(err);
                        }

                        // Ensure we get the right entities from the -/1 namespace when we
                        // specify it.
                        var entity11 = savedSearches_1.item(searchName, that.namespace11);
                        var entity21 = savedSearches_1.item(searchName, that.namespace21);

                        test.ok(entity11);
                        test.strictEqual(entity11.name, searchName);
                        test.strictEqual(entity11.properties().search, search);
                        test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                        test.strictEqual(entity11.namespace.app, that.namespace11.app);

                        test.ok(entity21);
                        test.strictEqual(entity21.name, searchName);
                        test.strictEqual(entity21.properties().search, search);
                        test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                        test.strictEqual(entity21.namespace.app, that.namespace21.app);

                        done();
                    }
                ],
                function (err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#delete test users": function (test) {
            var users = this.service.users();
            users.fetch(function (err, users) {
                var userList = users.list();

                Async.parallelEach(
                    userList,
                    function (user, idx, callback) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            user.remove(callback);
                        } else {
                            callback();
                        }
                    }, function (err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            });
        }
    };
};


