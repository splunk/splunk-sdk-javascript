var splunkjs    = require('../../index');
var Async       = splunkjs.Async;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Callback#list": function(test) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};

            Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var files = props.list();
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        },

        "Callback#contains": function(test) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};

            Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        },

        "Callback#contains stanza": function(test) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};

            Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");

                        var stanza = file.item("settings");
                        test.ok(stanza);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        },

        "Callback#configurations init": function(test) {
            test.throws(function() {
                var confs = new splunkjs.Service.Configurations(
                    this.service,
                    {owner: "-", app: "-", sharing: "system"}
                );
            });
            test.done();
        },

        "Callback#create file + create stanza + update stanza": function(test) {
            var that = this;
            var namespace = {owner: "nobody", app: "system"};
            var fileName = "jssdk_file_" + getNextId();
            var value = "barfoo_" + getNextId();

            Async.chain([
                    function(done) {
                        var configs = svc.configurations(namespace);
                        configs.fetch(done);
                    },
                    function(configs, done) {
                        configs.create({__conf: fileName}, done);
                    },
                    function(file, done) {
                        if (file.item("stanza")) {
                            file.item("stanza").remove();
                        }
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        stanza.update({"jssdk_foobar": value}, done);
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.fetch(done);
                    },
                    function(file, done) {
                        var stanza = file.item("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        },

        "Callback#can get default stanza": function(test) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};

            Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("savedsearches");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.name, "default");
                        test.strictEqual(namespace, stanza.namespace);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        },

        "Callback#updating default stanza is noop": function(test) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
            var backup = null;
            var invalid = "this won't work";

            Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("savedsearches");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza._properties.hasOwnProperty("max_concurrent"));
                        test.strictEqual(namespace, stanza.namespace);
                        backup = stanza._properties.max_concurrent;
                        stanza.update({"max_concurrent": invalid}, done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        test.strictEqual(stanza.properties()["max_concurrent"], backup);
                        test.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        test.strictEqual(stanza.properties()["max_concurrent"], backup);
                        test.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
        }
    };
};