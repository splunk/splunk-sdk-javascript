
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

exports.setup = function(svc, opts) {
    var splunkjs= require('../index');
    var Async   = splunkjs.Async;

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
        
    // initialize it with some dummy values
    var argv = ["program", "script"]; 
      
    return {  
        "Hello World Tests": {
            "Apps": function(test) {
                var main = require("../examples/node/helloworld/apps").main;
                main(opts, test.done);
            },
            
            "Apps#Async": function(test) {
                var main = require("../examples/node/helloworld/apps_async").main;
                main(opts, test.done);
            },

            "Pivot#Async": function(test) {
                var main = require("../examples/node/helloworld/pivot_async").main;
                main(opts, test.done);
            },

            "Fired Alerts": function(test) {
                var main = require("../examples/node/helloworld/firedalerts").main;
                main(opts, test.done);
            },

            "Fired Alerts#Async": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_async").main;
                main(opts, test.done);
            },

            "Fired Alerts#Create": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_create").main;
                main(opts, test.done);
            },

            "Fired Alerts#Delete": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_delete").main;
                main(opts, test.done);
            },

            "Get Job by sid": function(test) {
                var main = require("../examples/node/helloworld/get_job").main;
                main(opts, test.done);
            },

            "Endpoint Instantiation": function(test) {
                var main = require("../examples/node/helloworld/endpoint_instantiation").main;
                main(opts, test.done);
            },
            
            "Saved Searches": function(test) {
                var main = require("../examples/node/helloworld/savedsearches").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Async": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_async").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Delete": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Create": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_create").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Delete Again": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
                main(opts, test.done);
            },
            
            "Search#normal": function(test) {
                var main = require("../examples/node/helloworld/search_normal").main;
                main(opts, test.done);
            },
            
            "Search#blocking": function(test) {
                var main = require("../examples/node/helloworld/search_blocking").main;
                main(opts, test.done);
            },
            
            "Search#oneshot": function(test) {
                var main = require("../examples/node/helloworld/search_oneshot").main;
                main(opts, test.done);
            },
            
            "Search#realtime": function(test) {
                var main = require("../examples/node/helloworld/search_realtime").main;
                main(opts, test.done);
            },
                        
            "Logging": function(test) {
                var main = require("../examples/node/helloworld/log").main;
                main(opts, test.done);
            }
        },
        
        "Jobs Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = require("../examples/node/jobs").main;
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "help": function(test) {
                this.run(null, null, null, function(err) {
                    test.ok(!!err);
                    test.done();
                });
            },
            
            "List jobs": function(test) {
                this.run("list", null, null, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create job": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("cancel", [create.id], null, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Cancel job": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("cancel", [create.id], null, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "List job properties": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("list", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job events": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("events", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job preview": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("preview", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job results": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("results", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job results, by column": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("results", [create.id], {output_mode: "json_cols"}, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "Create+list multiple jobs": function(test) {
                var creates = [];
                for(var i = 0; i < 3; i++) {
                    creates[i] = {
                        search: "search index=_internal | head 1",
                        id: getNextId()
                    };
                }
                var sids = creates.map(function(create) { return create.id; });
                
                var context = this;
                Async.parallelMap(
                    creates,
                    function(create, idx, done) {
                        context.run("create", [], create, function(err, job) {
                            test.ok(!err);
                            test.ok(job);
                            test.strictEqual(job.sid, create.id);
                            done(null, job);
                        });
                    },
                    function(err, created) {
                        for(var i = 0; i < created.length; i++) {
                            test.strictEqual(creates[i].id, created[i].sid);
                        }
                        
                        context.run("list", sids, null, function(err) {
                            test.ok(!err);
                            context.run("cancel", sids, null, function(err) {
                                test.ok(!err);
                                test.done();
                            });
                        });
                        
                    }
                );
            }
        },
        
        "Search Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = require("../examples/node/search").main;
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "Create regular search": function(test) {
                var options = {
                    search: "search index=_internal | head 5"
                };
                
                this.run(null, null, options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create regular search with verbose": function(test) {
                var options = {
                    search: "search index=_internal | head 5"
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create oneshot search": function(test) {
                var options = {
                    search: "search index=_internal | head 5",
                    exec_mode: "oneshot"
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create normal search with reduced count": function(test) {
                var options = {
                    search: "search index=_internal | head 20",
                    count: 10
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
        }
        
        // This test is commented out because it causes a failure/hang on
        // Node >0.6. We need to revisit this test, so disabling it for now.
        /*"Results Example Tests": {
            
            "Parse row results": function(test) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 1 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        test.ok(!err);
                        job.results({output_mode: "json_rows"}, function(err, results) {
                            test.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });
                    }
                );
                
                main([], function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Parse column results": function(test) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 10 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        test.ok(!err);
                        job.results({output_mode: "json_cols"}, function(err, results) {
                            test.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });    
                    }
                );
                
                main([], function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Close stdin": function(test) {
                process.stdin.destroy();
                test.done();
            }
        }*/
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var options = require('../examples/node/cmdline');    
    var parser  = options.create();
    var cmdline = parser.parse(process.argv);
        
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
    
    var suite = exports.setup(svc, cmdline.opts);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}