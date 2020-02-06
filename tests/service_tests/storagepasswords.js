var splunkjs    = require('../../index');
var Async       = splunkjs.Async;

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

        "Callback#Create": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create with backslashes": function(test) {
            var startcount = -1;
            var name = "\\delete-me-" + getNextId();
            var realm = "\\delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create with slashes": function(test) {
            var startcount = -1;
            var name = "/delete-me-" + getNextId();
            var realm = "/delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create without realm": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual("", storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create should fail without user, or realm": function(test) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: null, password: "changeme"}, done);
                    }
                ],
                function(err) {
                    test.ok(err);
                    test.done();
                }
            );
        },

        "Callback#Create should fail without password": function(test) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: "something", password: null}, done);
                    }
                ],
                function(err) {
                    test.ok(err);
                    test.done();
                }
            );
        },

        "Callback#Create should fail without user, realm, or password": function(test) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: null, password: null}, done);
                    }
                ],
                function(err) {
                    test.ok(err);
                    test.done();
                }
            );
        },

        "Callback#Create with colons": function(test) {
            var startcount = -1;
            var name = ":delete-me-" + getNextId();
            var realm = ":delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create crazy": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                                name: name + ":end!@#$%^&*()_+{}:|<>?",
                                realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                                password: "changeme"},
                            done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                        test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Create with unicode chars": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                                name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                                realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                                password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))},
                            done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                        test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                        test.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                        test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Read": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        try {
                            test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            test.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        test.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        test.ok(found);

                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Read with slashes": function(test) {
            var startcount = -1;
            var name = "/delete-me-" + getNextId();
            var realm = "/delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        try {
                            test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            test.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        test.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        test.ok(found);

                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Update": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.update({password: "changed"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changed", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        var list = storagePasswords.list();
                        var found = false;
                        var index = -1;

                        test.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                                index = i;
                                test.strictEqual(name, list[i].properties().username);
                                test.strictEqual(realm + ":" + name + ":", list[i].name);
                                test.strictEqual("changed", list[i].properties().clear_password);
                                test.strictEqual(realm, list[i].properties().realm);
                            }
                        }
                        test.ok(found);

                        if (!found) {
                            done(new Error("Didn't find the created password"));
                        }
                        else {
                            list[index].remove(done);
                        }
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#Delete": function(test) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        test.strictEqual("changeme", storagePassword.properties().clear_password);
                        test.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                    },
                    function(storagePassword, done) {
                        test.strictEqual(name, storagePassword.properties().username);
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount + 1, storagePasswords.list().length);
                        var list = storagePasswords.list();
                        var found = false;
                        var index = -1;

                        test.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                                index = i;
                                test.strictEqual(name, list[i].properties().username);
                                test.strictEqual(realm + ":" + name + ":", list[i].name);
                                test.strictEqual("changeme", list[i].properties().clear_password);
                                test.strictEqual(realm, list[i].properties().realm);
                            }
                        }
                        test.ok(found);

                        if (!found) {
                            done(new Error("Didn't find the created password"));
                        }
                        else {
                            list[index].remove(done);
                        }
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        test.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        }
    };
};