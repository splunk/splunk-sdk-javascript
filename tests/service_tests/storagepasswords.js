
exports.setup = function (svc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var options = require('../cmdline');
    var parser = new options.create();
    var cmdline = parser.parse(process.argv);
    var Async = splunkjs.Async;
    var idCounter = 0;
    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Storage Password Tests", function () {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            it("Callback#Create", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create with backslashes", function (done) {
                var startcount = -1;
                var name = "\\delete-me-" + getNextId();
                var realm = "\\delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create with slashes", function (done) {
                var startcount = -1;
                var name = "/delete-me-" + getNextId();
                var realm = "/delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create without realm", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual("", storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create should fail without user, or realm", function (done) {
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        storagePasswords.create({ name: null, password: "changed!" }, done);
                    }
                ],
                    function (err) {
                        assert.ok(err);
                        done();
                    }
                );
            })

            it("Callback#Create should fail without password", function (done) {
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        storagePasswords.create({ name: "something", password: null }, done);
                    }
                ],
                    function (err) {
                        assert.ok(err);
                        done();
                    }
                );
            })

            it("Callback#Create should fail without user, realm, or password", function (done) {
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        storagePasswords.create({ name: null, password: null }, done);
                    }
                ],
                    function (err) {
                        assert.ok(err);
                        done();
                    }
                );
            })

            it("Callback#Create should fail if app or owner have wildcard", function (done) {
                var service = new splunkjs.Service({
                    scheme: cmdline.opts.scheme,
                    host: cmdline.opts.host,
                    port: cmdline.opts.port,
                    username: cmdline.opts.username,
                    password: cmdline.opts.password,
                    version: cmdline.opts.version,
                    app:'-',
                    owner:'-'
                });
                var storagePasswords = service.storagePasswords();
                assert.throws(function (){
                    storagePasswords.create({ name: "delete-me-" + getNextId(), password: 'changed!' })
                });
                done();
            })
            
            it("Callback#Create with colons", function (done) {
                var startcount = -1;
                var name = ":delete-me-" + getNextId();
                var realm = ":delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create crazy", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                            name: name + ":end!@#$%^&*()_+{}:|<>?",
                            realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                            password: "changed!"
                        },
                            done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                        assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Create with unicode chars", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                            name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                            realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                            password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))
                        },
                            done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                        assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                        assert.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                        assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Read", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        try {
                            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            assert.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        assert.ok(found);

                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Read with slashes", function (done) {
                var startcount = -1;
                var name = "/delete-me-" + getNextId();
                var realm = "/delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        try {
                            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            assert.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        assert.ok(found);

                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            // Disabling this test because clear_password field has been removed in Splunk 8.2
            //
            //
            // it("Callback#Update": function(done) {
            //     var startcount = -1;
            //     var name = "delete-me-" + getNextId();
            //     var realm = "delete-me-" + getNextId();
            //     var that = this;
            //     Async.chain([
            //             function(done) {
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 startcount = storagePasswords.list().length;
            //                 storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
            //             },
            //             function(storagePassword, done) {
            //                 assert.strictEqual(name, storagePassword.properties().username);
            //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            //                 assert.strictEqual("changed!", storagePassword.properties().clear_password);
            //                 assert.strictEqual(realm, storagePassword.properties().realm);
            //                 that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
            //             },
            //             function(storagePasswords, storagePassword, done) {
            //                 assert.strictEqual(startcount + 1, storagePasswords.list().length);
            //                 storagePassword.update({password: "changed"}, done);
            //             },
            //             function(storagePassword, done) {
            //                 assert.strictEqual(name, storagePassword.properties().username);
            //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            //                 assert.strictEqual("changed", storagePassword.properties().clear_password);
            //                 assert.strictEqual(realm, storagePassword.properties().realm);
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 var list = storagePasswords.list();
            //                 var found = false;
            //                 var index = -1;

            //                 assert.strictEqual(startcount + 1, list.length);
            //                 for (var i = 0; i < list.length; i ++) {
            //                     if (realm + ":" + name + ":" === list[i].name) {
            //                         found = true;
            //                         index = i;
            //                         assert.strictEqual(name, list[i].properties().username);
            //                         assert.strictEqual(realm + ":" + name + ":", list[i].name);
            //                         assert.strictEqual("changed", list[i].properties().clear_password);
            //                         assert.strictEqual(realm, list[i].properties().realm);
            //                     }
            //                 }
            //                 assert.ok(found);

            //                 if (!found) {
            //                     done(new Error("Didn't find the created password"));
            //                 }
            //                 else {
            //                     list[index].remove(done);
            //                 }
            //             },
            //             function(done) {
            //                 that.service.storagePasswords().fetch(done);
            //             },
            //             function(storagePasswords, done) {
            //                 assert.strictEqual(startcount, storagePasswords.list().length);
            //                 done();
            //             }
            //         ],
            //         function(err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // },

            it("Callback#Delete", function (done) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function (storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        storagePasswords.create({ name: name, realm: realm, password: "changed!" }, done);
                    },
                    function (storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        var list = storagePasswords.list();
                        var found = false;
                        var index = -1;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                                index = i;
                                assert.strictEqual(name, list[i].properties().username);
                                assert.strictEqual(realm + ":" + name + ":", list[i].name);
                                assert.strictEqual("changed!", list[i].properties().clear_password);
                                assert.strictEqual(realm, list[i].properties().realm);
                            }
                        }
                        assert.ok(found);

                        if (!found) {
                            done(new Error("Didn't find the created password"));
                        }
                        else {
                            list[index].remove(done);
                        }
                    },
                    function (done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function (storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
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
