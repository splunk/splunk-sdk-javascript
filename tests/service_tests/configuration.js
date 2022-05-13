var assert = require('chai').assert;

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var idCounter = 0;
var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {

    return (
        describe("Configuration tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("Callback#list", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) { that.service.configurations(namespace).fetch(done); },
                    function (props, done) {
                        var files = props.list();
                        assert.ok(files.length > 0);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
            });

            it("Callback#contains", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) { that.service.configurations(namespace).fetch(done); },
                    function (props, done) {
                        var file = props.item("web");
                        assert.ok(file);
                        file.fetch(done);
                    },
                    function (file, done) {
                        assert.strictEqual(file.name, "web");
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
            });

            it("Callback#contains stanza", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) { that.service.configurations(namespace).fetch(done); },
                    function (props, done) {
                        var file = props.item("web");
                        assert.ok(file);
                        file.fetch(done);
                    },
                    function (file, done) {
                        assert.strictEqual(file.name, "web");

                        var stanza = file.item("settings");
                        assert.ok(stanza);
                        stanza.fetch(done);
                    },
                    function (stanza, done) {
                        assert.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
            });

            it("Callback#configurations init", function (done) {
                assert.throws(function () {
                    var confs = new splunkjs.Service.Configurations(
                        this.service,
                        { owner: "-", app: "-", sharing: "system" }
                    );
                });
                done();
            });

            it("Callback#create file + create stanza + update stanza", function (done) {
                var that = this;
                var namespace = { owner: "nobody", app: "system" };
                var fileName = "jssdk_file_" + getNextId();
                var value = "barfoo_" + getNextId();

                Async.chain([
                    function (done) {
                        var configs = svc.configurations(namespace);
                        configs.fetch(done);
                    },
                    function (configs, done) {
                        configs.create({ __conf: fileName }, done);
                    },
                    function (file, done) {
                        if (file.item("stanza")) {
                            file.item("stanza").remove();
                        }
                        file.create("stanza", done);
                    },
                    function (stanza, done) {
                        stanza.update({ "jssdk_foobar": value }, done);
                    },
                    function (stanza, done) {
                        assert.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function (done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.fetch(done);
                    },
                    function (file, done) {
                        var stanza = file.item("stanza");
                        assert.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
            });

            it("Callback#createAsync", function (done) {
                var that = this;
                var namespace = { owner: "nobody", app: "system" };
                var filename = "jssdk_file_new_" + getNextId();
                var stanza = "install"
                var property1 = "state"
                var value1 = "enabled";
                var property2 = "python.version"
                var value2 = "python3";

                Async.chain([
                    function (done) {
                        var configs = svc.configurations(namespace);
                        configs.fetch(done);
                    },
                    function (configs, done) {
                        var keyValueMap = {}
                        keyValueMap[property1] = value1;
                        keyValueMap[property2] = value2;
                        configs.createAsync(filename, stanza, keyValueMap, done);
                    },
                    async function (done) {
                        var configs = svc.configurations(namespace);
                        configs.fetch();

                        // a. File exists: Positive
                        var configFile = await configs.getConfFile(filename);
                        assert.ok(configFile);
                        
                        // b. Stanza exists: Positive
                        configFile = await configFile.fetchAsync();
                        var configStanza = await configs.getStanza(configFile, stanza);
                        assert.ok(configStanza);
                        assert.ok(configStanza._properties);
                        assert.strictEqual(configStanza._properties[property1], value1 );
                        assert.strictEqual(configStanza._properties[property2], value2 );

                        // c. File exists: Negative
                        var invalidConfigFile = await configs.getConfFile("invalid_filename");
                        assert.ok(!invalidConfigFile);
                        
                        // d. Stanza exists: Negative
                        var invalidConfigStanza = await configs.getStanza(configFile, "invalid_stanza_name");
                        assert.ok(!invalidConfigStanza);

                        done();
                    },
                ],
                function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Callback#can get default stanza", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) { that.service.configurations(namespace).fetch(done); },
                    function (props, done) {
                        var file = props.item("savedsearches");
                        assert.strictEqual(namespace, file.namespace);
                        assert.ok(file);
                        file.fetch(done);
                    },
                    function (file, done) {
                        assert.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function (stanza, done) {
                        assert.strictEqual(stanza.name, "default");
                        assert.strictEqual(namespace, stanza.namespace);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
            });

            it("Callback#updating default stanza is noop", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };
                var backup = null;
                var invalid = "this won't work";

                Async.chain([
                    function (done) { that.service.configurations(namespace).fetch(done); },
                    function (props, done) {
                        var file = props.item("savedsearches");
                        assert.strictEqual(namespace, file.namespace);
                        assert.ok(file);
                        file.fetch(done);
                    },
                    function (file, done) {
                        assert.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function (stanza, done) {
                        assert.ok(stanza._properties.hasOwnProperty("max_concurrent"));
                        assert.strictEqual(namespace, stanza.namespace);
                        backup = stanza._properties.max_concurrent;
                        stanza.update({ "max_concurrent": invalid }, done);
                    },
                    function (stanza, done) {
                        assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                        assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        stanza.fetch(done);
                    },
                    function (stanza, done) {
                        assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                        assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    });
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
