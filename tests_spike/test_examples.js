// Copyright 2011 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

exports.setup = function (svc, opts) {
    var assert = require('chai').assert;
    var splunkjs = require('../index');
    var Async = splunkjs.Async;
    var idCounter = 0;
    var argv = ["program", "script"];

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    splunkjs.Logger.setLevel("ALL");

    return (
        describe("Hello World Tests", function (done) {
            it("Apps", function (done) {
                var main = require("../examples/node/helloworld/apps").main;
                main(opts, done);
            });

            it("Apps#Async", function (done) {
                var main = require("../examples/node/helloworld/apps_async").main;
                main(opts, done);
            });

            it("Pivot#Async", function (done) {
                var main = require("../examples/node/helloworld/pivot_async").main;
                main(opts, done);
            });

            it("Fired Alerts", function (done) {
                var main = require("../examples/node/helloworld/firedalerts").main;
                main(opts, done);
            });

            it("Fired Alerts#Async", function (done) {
                var main = require("../examples/node/helloworld/firedalerts_async").main;
                main(opts, done);
            });

            it("Fired Alerts#Create", function (done) {
                var main = require("../examples/node/helloworld/firedalerts_create").main;
                main(opts, done);
            });

            it("Fired Alerts#Delete", function (done) {
                var main = require("../examples/node/helloworld/firedalerts_delete").main;
                main(opts, done);
            });

            it("Get Job by sid", function (done) {
                var main = require("../examples/node/helloworld/get_job").main;
                main(opts, done);
            });

            it("Endpoint Instantiation", function (done) {
                var main = require("../examples/node/helloworld/endpoint_instantiation").main;
                main(opts, done);
            });

            it("Saved Searches", function (done) {
                var main = require("../examples/node/helloworld/savedsearches").main;
                main(opts, done);
            });

            it("Saved Searches#Async", function (done) {
                var main = require("../examples/node/helloworld/savedsearches_async").main;
                main(opts, done);
            });

            it("Saved Searches#Delete", function (done) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
                main(opts, done);
            });

            it("Saved Searches#Create", function (done) {
                var main = require("../examples/node/helloworld/savedsearches_create").main;
                main(opts, done);
            });

            it("Saved Searches#Delete Again", function (done) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
                main(opts, done);
            });

            it("Search#normal", function (done) {
                var main = require("../examples/node/helloworld/search_normal").main;
                main(opts, done);
            });

            it("Search#blocking", function (done) {
                var main = require("../examples/node/helloworld/search_blocking").main;
                main(opts, done);
            });

            it("Search#oneshot", function (done) {
                var main = require("../examples/node/helloworld/search_oneshot").main;
                main(opts, done);
            });

            it("Search#realtime", function (done) {

                this.timeout(40000)
                var main = require("../examples/node/helloworld/search_realtime").main;
                main(opts, done);
            });

            it("Logging", function (done) {
                var main = require("../examples/node/helloworld/log").main;
                main(opts, done);
            })
        }),

        describe("Jobs Example Tests", function (done) {
            beforeEach(function (done) {
                var context = this;

                this.main = require("../examples/node/jobs").main;
                this.run = function (command, args, options, callback) {
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }

                    if (args) {
                        for (var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }

                    if (options) {
                        for (var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }

                    return context.main(combinedArgs, callback);
                };

                done();
            });

            it("help", function (done) {
                this.run(null, null, null, function (err) {
                    assert.ok(!!err);
                    done();
                });
            });

            it("List jobs", function (done) {
                this.run("list", null, null, function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Create job", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("cancel", [create.id], null, function (err) {
                        assert.ok(!err);
                        done();
                    });
                });
            });

            it("Cancel job", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("cancel", [create.id], null, function (err) {
                        assert.ok(!err);
                        done();
                    });
                });
            });

            it("List job properties", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("list", [create.id], null, function (err) {
                        assert.ok(!err);
                        context.run("cancel", [create.id], null, function (err) {
                            assert.ok(!err);
                            done();
                        });
                    });
                });
            });

            it("List job events", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("events", [create.id], null, function (err) {
                        assert.ok(!err);
                        context.run("cancel", [create.id], null, function (err) {
                            assert.ok(!err);
                            done();
                        });
                    });
                });
            });

            it("List job preview", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("preview", [create.id], null, function (err) {
                        assert.ok(!err);
                        context.run("cancel", [create.id], null, function (err) {
                            assert.ok(!err);
                            done();
                        });
                    });
                });
            });

            it("List job results", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("results", [create.id], null, function (err) {
                        assert.ok(!err);
                        context.run("cancel", [create.id], null, function (err) {
                            assert.ok(!err);
                            done();
                        });
                    });
                });
            });

            it("List job results, by column", function (done) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };

                var context = this;
                context.run("create", [], create, function (err) {
                    assert.ok(!err);
                    context.run("results", [create.id], { output_mode: "json_cols" }, function (err) {
                        assert.ok(!err);
                        context.run("cancel", [create.id], null, function (err) {
                            assert.ok(!err);
                            done();
                        });
                    });
                });
            });

            it("Create+list multiple jobs", function (done) {
                var creates = [];
                for (var i = 0; i < 3; i++) {
                    creates[i] = {
                        search: "search index=_internal | head 1",
                        id: getNextId()
                    };
                }
                var sids = creates.map(function (create) { return create.id; });

                var context = this;
                Async.parallelMap(
                    creates,
                    function (create, idx, done) {
                        context.run("create", [], create, function (err, job) {
                            assert.ok(!err);
                            assert.ok(job);
                            assert.strictEqual(job.sid, create.id);
                            done(null, job);
                        });
                    },
                    function (err, created) {
                        for (var i = 0; i < created.length; i++) {
                            assert.strictEqual(creates[i].id, created[i].sid);
                        }

                        context.run("list", sids, null, function (err) {
                            assert.ok(!err);
                            context.run("cancel", sids, null, function (err) {
                                assert.ok(!err);
                                done();
                            });
                        });

                    }
                );
            })
        }),

        describe("Search Example Tests", function (done) {
            beforeEach(function (done) {
                var context = this;

                this.main = require("../examples/node/search").main;
                this.run = function (command, args, options, callback) {
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }

                    if (args) {
                        for (var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }

                    if (options) {
                        for (var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }

                    return context.main(combinedArgs, callback);
                };

                done();
            });

            it("Create regular search", function (done) {
                var options = {
                    search: "search index=_internal | head 5"
                };

                this.run(null, null, options, function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Create regular search with verbose", function (done) {
                var options = {
                    search: "search index=_internal | head 5"
                };

                this.run(null, ["--verbose"], options, function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Create oneshot search", function (done) {
                var options = {
                    search: "search index=_internal | head 5",
                    exec_mode: "oneshot"
                };

                this.run(null, ["--verbose"], options, function (err) {
                    assert.ok(!err);
                    done();
                });
            });

            it("Create normal search with reduced count", function (done) {
                var options = {
                    search: "search index=_internal | head 20",
                    count: 10
                };

                this.run(null, ["--verbose"], options, function (err) {
                    assert.ok(!err);
                    done();
                });
            })
        })

        // This test is commented out because it causes a failure/hang on
        // Node >0.6. We need to revisit this test, so disabling it for now.
        /*"Results Example Tests": {
            
            "Parse row results": function(done) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 1 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        assert.ok(!err);
                        job.results({output_mode: "json_rows"}, function(err, results) {
                            assert.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });
                    }
                );
                
                main([], function(err) {
                    assert.ok(!err);
                    done();
                });
            },
            
            "Parse column results": function(done) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 10 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        assert.ok(!err);
                        job.results({output_mode: "json_cols"}, function(err, results) {
                            assert.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });    
                    }
                );
                
                main([], function(err) {
                    assert.ok(!err);
                    done();
                });
            },
            
            "Close stdin": function(done) {
                process.stdin.destroy();
                done();
            }
        }*/
    )
};

// Run the individual test suite
if (module === require.cache[__filename] && !module.parent) {

    var splunkjs = require('../index');
    var options = require('../examples/node/cmdline');

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
            return resolve(exports.setup(svc, cmdline.opts));
        });
    });
}
