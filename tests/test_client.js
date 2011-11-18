
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;
    var tutils      = require('./utils');

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        "Job Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Create+cancel job": function(test) {
                var sid = getNextId();
                this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    job.cancel(function() {
                        test.done();
                    });
                }); 
            },

            "Callback#Create job error": function(test) {
                var sid = getNextId();
                this.service.jobs().create('index=_internal | head 1', {id: sid}, function(err) { 
                    test.ok(!!err);
                    test.done(); 
                });
            },

            "Callback#List jobs": function(test) {
                this.service.jobs().list(function(err, jobs) {
                    test.ok(!err);
                    test.ok(jobs);
                    test.ok(jobs.length > 0);
                    
                    for(var i = 0; i < jobs.length; i++) {
                        test.ok(jobs[i].isValid());
                    }
                    
                    test.done();
                });
            },

            "Callback#Contains job": function(test) {
                var that = this;
                var sid = getNextId();
                this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    that.service.jobs().contains(sid, function(err, contains) {
                        test.ok(contains);

                        job.cancel(function() {
                            test.done();
                        });
                    });
                }); 
            },

            "Callback#job results": function(test) {
                var sid = getNextId();
                var service = this.service;
                this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, function(err, job) {
                    var properties = {};

                    Async.whilst(
                        function() { return properties.dispatchState !== "DONE"; },
                        function(iterationDone) {
                            job.read(function(err, job) {
                                properties = job.properties();
                                Async.sleep(1000, iterationDone); 
                            });
                        },
                        function() {
                            job.results({}, function(err, results) {
                                test.strictEqual(results.rows.length, 1);
                                test.strictEqual(results.fields.length, 1);
                                test.strictEqual(results.fields[0], "count");
                                test.strictEqual(results.rows[0][0], "1");
                                
                                job.cancel(function() { test.done(); });
                            });
                        }
                    );
                });
            },

            "Callback#Enable + disable preview": function(test) {
                var that = this;
                var sid = getNextId();
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.enablePreview(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.disablePreview(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },
        },
        
        "App Tests": {      
            setUp: function(done) {
                this.service = svc;
                done();
            },
                         
            "Callback#list applications": function(test) {
                var apps = this.service.apps();
                apps.list(function(err, appList) {
                    test.ok(appList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains applications": function(test) {
                var apps = this.service.apps();
                apps.contains("search", function(err, found) {
                    test.ok(found);
                    test.done();
                });
            },
            
            "Callback#create + contains app": function(test) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                apps.create({name: name}, function(err, app) {
                    test.ok(app.isValid());
                    var appName = app.properties().__name;
                    apps.contains(appName, function(err, found, entity) {
                        test.ok(found);
                        test.ok(entity);
                        app.remove(function() {
                            test.done();
                        });
                    });
                });
            },
            
            "Callback#create + modify app": function(test) {
                var DESCRIPTION = "TEST DESCRIPTION";
                var VERSION = "1.1";
                
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                Async.chain([
                    function(callback) {
                        apps.create({name: name}, callback);     
                    },
                    function(app, callback) {
                        test.ok(app.isValid());
                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function(app, callback) {
                        test.ok(!!app);
                        test.ok(!app.isValid());
                        app.read(callback);
                    },
                    function(app, callback) {
                        test.ok(app);
                        test.ok(app.isValid());
                        var properties = app.properties();
                        
                        test.strictEqual(properties.description, DESCRIPTION);
                        test.strictEqual(properties.version, VERSION);
                        
                        app.remove(callback);
                    },
                    function(callback) {
                        test.done();
                        callback();
                    }
                ]);
            },
            
            "Callback#delete test applications": function(test) {
                var apps = this.service.apps();
                apps.list(function(err, appList) {
                    test.ok(appList.length > 0);
                    
                    Async.parallelEach(function(app, idx, callback) {
                        if (utils.startsWith(app.properties().__name, "jssdk_")) {
                            app.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, appList, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            }
        },
        
        "Saved Search Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var searches = this.service.savedSearches();
                searches.list(function(err, savedSearches) {
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i].isValid());
                    }
                    
                    test.done();
                });
            },
            
            "Callback#contains": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    test.done();
                });
            },
            
            "Callback#history": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.history(function(err, response) {
                        test.done();
                    });
                });
            },
            
            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.suppressInfo(function(response) {
                        test.done();
                    });
                });
            }
        },
        
        "Properties Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().list(done); },
                    function(files, done) { 
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
                
                Async.chain([
                    function(done) { that.service.properties().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "web");
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
                
                Async.chain([
                    function(done) { that.service.properties().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "web");
                        file.contains("settings", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(!stanza.isValid());
                        stanza.read(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
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
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                Async.chain([
                    function(done) {
                        var properties = that.service.properties(); 
                        test.ok(!properties.isValid());
                        properties.read(done);
                    },
                    function(properties, done) {
                        test.ok(properties.isValid());
                        properties.create(fileName, done);
                    },
                    function(file, done) {
                        test.ok(!file.isValid());
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        test.ok(!stanza.isValid());
                        stanza.update({"jssdk_foobar": value});
                        test.ok(!stanza.isValid());
                        tutils.pollUntil(
                            stanza, function(s) {
                                return !s.isValid() || s.properties()["jssdk_foobar"] !== value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new Splunk.Client.PropertyFile(svc, fileName);
                        test.ok(!file.isValid());
                        file.contains("stanza", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(!stanza.isValid());
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        },
        
        "Configuration Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.configurations().list(done); },
                    function(files, done) { 
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
                
                Async.chain([
                    function(done) { that.service.configurations().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "conf-web");
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
                
                Async.chain([
                    function(done) { that.service.configurations().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "conf-web");
                        file.contains("settings", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(stanza.isValid());
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
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                // We clone the service to get to a specific namespace
                var svc = this.service.specialize("nobody", "system");
                
                Async.chain([
                    function(done) {
                        var configs = svc.configurations(); 
                        test.ok(!configs.isValid());
                        configs.read(done);
                    },
                    function(configs, done) {
                        test.ok(configs.isValid());
                        configs.create(fileName, done);
                    },
                    function(file, done) {
                        test.ok(!file.isValid());
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        stanza.update({"jssdk_foobar": value});
                        test.ok(!stanza.isValid());
                        tutils.pollUntil(
                            stanza, function(s) {
                                return !s.isValid() || s.properties()["jssdk_foobar"] !== value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new Splunk.Client.ConfigurationFile(svc, fileName);
                        test.ok(!file.isValid());
                        file.contains("stanza", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(stanza.isValid());
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        }
    };

};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var cmdline = options.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}