var assert = require('chai').assert;

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var utils = splunkjs.Utils;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {

    return (
        describe("App tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("Callback#list applications", function (done) {
                var apps = this.service.apps();
                apps.fetch(function (err, apps) {
                    var appList = apps.list();
                    assert.ok(appList.length > 0);
                    done();
                });
            });

            it("Callback#contains applications", function (done) {
                var apps = this.service.apps();
                apps.fetch(function (err, apps) {
                    var app = apps.item("search");
                    assert.ok(app);
                    done();
                });
            });

            it("Callback#create + contains app", function (done) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                apps.create({ name: name }, function (err, app) {
                    var appName = app.name;
                    apps.fetch(function (err, apps) {
                        var entity = apps.item(appName);
                        assert.ok(entity);
                        app.remove(function () {
                            done();
                        });
                    });
                });
            });

            it("Callback#create + modify app", function (done) {
                var DESCRIPTION = "TEST DESCRIPTION";
                var VERSION = "1.1.0";

                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                Async.chain([
                    function (callback) {
                        apps.create({ name: name }, callback);
                    },
                    function (app, callback) {
                        assert.ok(app);
                        assert.strictEqual(app.name, name);
                        var versionMatches = app.properties().version === "1.0" ||
                            app.properties().version === "1.0.0";
                        assert.ok(versionMatches);

                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function (app, callback) {
                        assert.ok(app);
                        var properties = app.properties();

                        assert.strictEqual(properties.description, DESCRIPTION);
                        assert.strictEqual(properties.version, VERSION);

                        app.remove(callback);
                    }
                ], function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Callback#delete test applications", function (done) {

                var apps = this.service.apps();
                apps.fetch(function (err, apps) {

                    var appList = apps.list();

                    Async.parallelEach(appList,

                        function (app, idx, callback) {
                            if (utils.startsWith(app.name, "jssdk_")) {
                                app.remove(callback);
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
            });

            it("list applications with cookies as authentication", function (done) {
                this.service.serverInfo(function (err, info) {
                    // Cookie authentication was added in splunk 6.2
                    var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                    var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                    // Skip cookie test if Splunk older than 6.2
                    if (majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                        splunkjs.Logger.log("Skipping cookie test...");
                        done();
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
                            assert.ok(!utils.isEmpty(cookieStore));

                            // Add the cookies to a service with no other authenitcation information
                            service2.http._cookieStore = cookieStore;

                            var apps = service2.apps();
                            apps.fetch(done);
                        },
                        function (apps, done) {
                            var appList = apps.list();
                            assert.ok(appList.length > 0);
                            assert.ok(!utils.isEmpty(service2.http._cookieStore));
                            done();
                        }
                    ],
                        function (err) {
                            // Test that no errors were returned
                            assert.ok(!err);
                            done();
                        });
                })
            })
        })
    )
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
