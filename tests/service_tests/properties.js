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
                    function(done) {
                        that.service.configurations(namespace).fetch(done);
                    },
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

        "Callback#item": function(test) {
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

        "Callback#create file + create stanza + update stanza": function(test) {
            var that = this;
            var fileName = "jssdk_file_" + getNextId();
            var value = "barfoo_" + getNextId();
            var namespace = {owner: "admin", app: "search"};

            Async.chain([
                    function(done) {
                        var properties = that.service.configurations(namespace);
                        properties.fetch(done);
                    },
                    function(properties, done) {
                        properties.create(fileName, done);
                    },
                    function(file, done) {
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
        }
    };
};