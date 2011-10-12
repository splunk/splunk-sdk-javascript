
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

(function() {
    var Splunk          = require('../splunk').Splunk;
    var Class           = require('../lib/jquery.class').Class;
    var utils           = require('../lib/utils');
    var Async           = require('../lib/async');
    var OptionParser    = require('../contrib/parseopt').OptionParser;
    var NodeHttp        = require('../platform/node/node_http').NodeHttp;
    var Promise         = Splunk.Promise;

    var FLAGS_CREATE = [
        "search", "earliest_time", "latest_time", "now", "time_format",
        "exec_mode", "search_mode", "rt_blocking", "rt_queue_size",
        "rt_maxblocksecs", "rt_indexfilter", "id", "status_buckets",
        "max_count", "max_time", "timeout", "auto_finalize_ec", "enable_lookups",
        "reload_macros", "reduce_freq", "spawn_process", "required_field_list",
        "rf", "auto_cancel", "auto_pause",
    ];
    var FLAGS_EVENTS = [
        "offset", "count", "earliest_time", "latest_time", "search",
        "time_format", "output_time_format", "field_list", "f", "max_lines",
        "truncation_mode", "output_mode", "segmentation"
    ];

    // This function will create a set of options for command line parsing
    // and then parse the arguments to the command we're running.
    var _makeCommandLine = function(program, argv, flags, search_required) {
        var opts = {};
        flags = flags || [];

        // Create the parser and add some help information
        var parser = new OptionParser({
            program: program, 
            options: [
                {
                    names: ['--help', '-h'],
                    type: 'flag',
                    help: 'Show this help message.',
                    onOption: function (value) {
                            if (value) {
                                    parser.usage();
                            }
                            // returning true canceles any further option parsing
                            // and parser.parse() returns null
                            return value;
                    }
                },
            ],
        });

        // For each of the flags, add an option to the parser
        for(var i = 0; i < flags.length; i++) {
            parser.add("--" + flags[i], { 
                required: search_required && flags[i] === "search",  // Make search required if necessary
                metavar: flags[i].toUpperCase(), // Give it a proper label
            });
        }

        // Try and parse, and if we fail, print out the error message
        // and the usage information
        var cmdline = null;
        try {
            cmdline = parser.parse(argv);
            delete cmdline.options.help;
        }
        catch(e) {
            console.log(e.message);
            parser.usage();
        }

        return cmdline;
    };

    var _check_sids = function(command, sids) {
        if (!sids || sids.length === 0) {
            throw new Error("'" + command + "' requires at least one SID");
        }
    };

    var Program = Class.extend({
        init: function(service) {
            this.service = service; 
            
            this.run        = utils.bind(this, this.run);
            this.cancel     = utils.bind(this, this.cancel);
            this.create     = utils.bind(this, this.create);
            this.events     = utils.bind(this, this.events);
            this.list       = utils.bind(this, this.list);   
        },

        _foreach: function(sids, fn) {
            sids = sids || [];

            // We get a list of the current jobs, and for each of them,
            // we check whether it is the job we're looking for.
            // If it is, we wrap it up in a Splunk.Job object, and invoke
            // our function on it.
            return this.service.jobs().list().whenResolved(utils.bind(this, function(list) {
                list = list || [];
                var promises = [];
                for(var i = 0; i < list.length; i++) {
                    if (utils.contains(sids, list[i].sid)) {
                        var job = new Splunk.Client.Job(this.service, list[i].sid);
                        promises.push(fn(job));
                    }
                }
                
                return Promise.join.apply(null, promises);
            }));
        },

        run: function(command, args) {
            var commands = {
                'cancel':       this.cancel,
                'create':       this.create,
                'events':       this.events,
                'finalize':     this.finalize,
                'list':         this.list,
                'pause':        this.pause,
                'preview':      this.preview,
                'results':      this.results,
                'searchlog':    this.searchlog,
                'summary':      this.summary,
                'perf':         this.perf,
                'timeline':     this.timeline,
                'touch':        this.touch,
                'unpause':      this.unpause,
            };

            // If we don't have any command, notify the user.
            if (!command) {
                console.error("You must supply a command to run. Options are:");
                for(var key in commands) {
                    if (commands.hasOwnProperty(key)) {
                        console.error("  " + key);
                    }
                }
                
                return Promise.Failure("No command was specified.");
            }

            // Get the handler
            var handler = commands[command];

            // If there is no handler (because the user specified an invalid command,
            // then we notify the user as an error.
            if (!handler) {
                Promise.Failure("Unrecognized command: " + command);
            }

            // Invoke the command
            return handler(args);
        },

        // Cancel the specified search jobs
        cancel: function(sids, callback) {
            _check_sids('cancel', sids);

            // For each of the supplied sids, cancel the job.
            return this._foreach(sids, function(job) {
                return job.cancel(function () { console.log("  Job " + job.sid + " cancelled"); });
            });
        },

        // Retrieve events for the specified search jobs
        events: function(argv, callback) {
            // Create the command line for the event command and parse it
            var cmdline = _makeCommandLine("events", argv, FLAGS_EVENTS, false);

            // For each of the passed in sids, get the relevant events
            return this._foreach(cmdline.arguments, function(job) {
                console.log("Job " + job.sid + ": "); 

                return job.events(cmdline.options).whenResolved(function(data) {
                    var events = data.data || [];
                    for(var i = 0; i < events.length; i++) {
                        console.log("  " + events[i]._raw[0].value[0]);
                    }

                    return events;
                });
            });
        },

        // Create a search job
        create: function(argv, callback) {
            // Create the command line for the create command and parse it
            var cmdline = _makeCommandLine("create", argv, FLAGS_CREATE, true);

            // If nothing was passed in, terminate
            if (!cmdline) {
                return;
            }

            // Get the query and parameters, and remove the extraneous
            // search parameter
            var query = cmdline.options.search;
            var params = cmdline.options;
            delete params.search;

            // Create the job
            return this.service.jobs().create(query, params).whenResolved(function(job) {
                console.log("Created job " + job.sid);
                return job;
            });
        },

        // List all current search jobs if no jobs specified, otherwise
        // list the properties of the specified jobs.
        list: function(sids, callback) {
            sids = sids || [];

            if (sids.length === 0) {
                // If no job SIDs are provided, we list all jobs.
                var jobs = this.service.jobs();
                return jobs.list().whenResolved(function(list) {
                    list = list || [];
                    for(var i = 0; i < list.length; i++) {
                        console.log("  Job " + (i + 1) + " sid: "+ list[i].sid);
                    }

                    return list;
                });
            }
            else {
                // If certain job SIDs are provided,
                // then we simply read the properties of those jobs
                return this._foreach(sids, function(job) {
                    return job.read(function(response) {
                        console.log("Job " + job.sid + ": ");
                        var properties = response.odata.results;
                        for(var key in properties) {
                            // Skip some keys that make the output hard to read
                            if (utils.contains(["performance"], key)) {
                                continue;
                            }

                            console.log("  " + key + ": ", properties[key]);
                        }
                        
                        return properties;
                    });
                });
            }
        },

    });

    var parser = new OptionParser({
        strings: { help: 'N/A', metavars: { integer: 'INT' } },
        options: [
            {
                names: ['--help', '-h'],
                type: 'flag',
                help: 'Show this help message.',
                onOption: function (value) {
                        if (value) {
                                parser.usage();
                        }
                        // returning true canceles any further option parsing
                        // and parser.parse() returns null
                        return value;
                }
            },
            {
                names: ['--username'],
                type: 'string',
                required: true,
                help: "Username to login with",
                metavar: "USERNAME",
            },
            
            {
                names: ['--password'],
                type: 'string',
                required: true,
                help: "Password to login with",
                metavar: "PASSWORD",
            },
            
            {
                names: ['--host'],
                type: 'string',
                required: false,
                help: "Host name",
                default: "localhost",
                metavar: "HOST",
            },
            
            {
                names: ['--port'],
                type: 'string',
                required: false,
                help: "Port number",
                default: "8000",
                metavar: "PORT",
            },
            
            {
                names: ['--scheme'],
                type: 'string',
                required: false,
                help: "Scheme",
                default: "http",
                metavar: "SCHEME",
            },
            
            {
                names: ['--config'],
                type: 'string',
                help: "Load options from config file",
                metavar: "CONFIG",
            },
            
            {
                names: ['--namespace'],
                type: 'string',
                help: "",
                metavar: "NAMESPACE",
            },
        ],

    });

    exports.main = function(argv) {        
        // Try and parse the command line
        var cmdline = null;
        try {
            cmdline = parser.parse(argv);
        }
        catch(e) {
            // If we failed, then we print out the error message, and then the usage
            console.log(e.message);
            parser.usage();
        }
        
        // If there is no command line, we should return
        if (!cmdline) {
            return Promise.Failure("Error in parsing command line parameters");
        }
        
        // Create our HTTP request class for node.js
        var http = new NodeHttp();
        
        // Create our service context using the information from the command line
        var svc = new Splunk.Client.Service(http, { 
            scheme: cmdline.options.scheme,
            host: cmdline.options.host,
            port: cmdline.options.port,
            username: cmdline.options.username,
            password: cmdline.options.password,
        });
        
        var loginP = svc.login();
        var doneP = loginP.whenResolved(function() {
            var program = new Program(svc);
            
            return program.run(cmdline.arguments[0], cmdline.arguments.slice(1)); 
        });
        
        return doneP.when(
            function() {
                console.log("======================");
            },
            function(reason) {
                console.log("Error: " + reason); 
                return Promise.Failure();
            }
        );
    };
    
    if (module === require.main) {
        exports.main();
    }
})();