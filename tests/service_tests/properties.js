
exports.setup = function (svc) {
    var assert = require('chai').assert;

    var splunkjs = require('../../index');

    var Async = splunkjs.Async;
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Properties Test", function () {

            beforeEach(function (done) {
                this.service = svc;
                done();
            })

            it("Callback#list", function (done) {
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) {
                        that.service.configurations(namespace).fetch(done);
                    },
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
            })

            it("Callback#item", function (done) {
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
            })

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
            })

            it("Callback#create file + create stanza + update stanza", function (done) {
                var that = this;
                var fileName = "jssdk_file_" + getNextId();
                var value = "barfoo_" + getNextId();
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) {
                        var properties = that.service.configurations(namespace);
                        properties.fetch(done);
                    },
                    function (properties, done) {
                        properties.create(fileName, done);
                    },
                    function (file, done) {
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
            })
        })
    );
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

