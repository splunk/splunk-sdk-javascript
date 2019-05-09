var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function(svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Callback#list applications": function(test) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                var appList = apps.list();
                test.ok(appList.length > 0);
                test.done();
            });
        },

        "Callback#contains applications": function(test) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                var app = apps.item("search");
                test.ok(app);
                test.done();
            });
        },

        "Callback#create + contains app": function(test) {
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();

            apps.create({name: name}, function(err, app) {
                var appName = app.name;
                apps.fetch(function(err, apps) {
                    var entity = apps.item(appName);
                    test.ok(entity);
                    app.remove(function() {
                        test.done();
                    });
                });
            });
        },

        "Callback#create + modify app": function(test) {
            var DESCRIPTION = "TEST DESCRIPTION";
            var VERSION = "1.1.0";

            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();

            Async.chain([
                function(callback) {
                    apps.create({name: name}, callback);
                },
                function(app, callback) {
                    test.ok(app);
                    test.strictEqual(app.name, name);
                    var versionMatches = app.properties().version === "1.0" ||
                        app.properties().version === "1.0.0";
                    test.ok(versionMatches);

                    app.update({
                        description: DESCRIPTION,
                        version: VERSION
                    }, callback);
                },
                function(app, callback) {
                    test.ok(app);
                    var properties = app.properties();

                    test.strictEqual(properties.description, DESCRIPTION);
                    test.strictEqual(properties.version, VERSION);

                    app.remove(callback);
                }
            ], function(err) {
                test.ok(!err);
                test.done();
            });
        },

        // "Callback#delete test applications": function(test) {
        //     var apps = this.service.apps();
        //     apps.fetch(function(err, apps) {
        //         var appList = apps.list();

        //         Async.parallelEach(
        //             appList,
        //             function(app, idx, callback) {
        //                 if (utils.startsWith(app.name, "jssdk_")) {
        //                     app.remove(callback);
        //                 }
        //                 else {
        //                     callback();
        //                 }
        //             }, function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     });
        // },

        "list applications with cookies as authentication": function(test) {
            this.service.serverInfo(function (err, info) {
                // Cookie authentication was added in splunk 6.2
                var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                // Skip cookie test if Splunk older than 6.2
                if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                    splunkjs.Logger.log("Skipping cookie test...");
                    test.done();
                    return;
                }

                var service = new splunkjs.Service(
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        username: svc.username,
                        password: svc.password,
                        version: svc.version
                    });

                var service2 = new splunkjs.Service(
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        version: svc.version
                    });

                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            test.ok(!utils.isEmpty(cookieStore));

                            // Add the cookies to a service with no other authenitcation information
                            service2.http._cookieStore = cookieStore;

                            var apps = service2.apps();
                            apps.fetch(done);
                        },
                        function (apps, done) {
                            var appList = apps.list();
                            test.ok(appList.length > 0);
                            test.ok(!utils.isEmpty(service2.http._cookieStore));
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        test.ok(!err);
                        test.done();
                    });
            });
        }
    };
};