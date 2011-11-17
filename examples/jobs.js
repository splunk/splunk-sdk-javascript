
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
    var options         = require('../internal/cmdline');
    var OptionParser    = options.OptionParser;
    var NodeHttp        = require('../platform/node/node_http').NodeHttp;

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
        "truncation_mode", "json_mode", "segmentation"
    ];
    var FLAGS_RESULTS = [
        "offset", "count", "search", "field_list", "f", "json_mode"
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
    
    var printRows = function(data) {
        var fields = data.fields;
        var rows = data.rows;
        for(var i = 0; i < rows.length; i++) {
            var values = rows[i];
            console.log("Row " + i + ": ");
            for(var j = 0; j < values.length; j++) {
                var field = fields[j];
                var value = values[j];
                console.log("  " + field + ": " + value);
            }
        }
    };
    
    var printCols = function(data) {
        var fields = data.fields;
        var columns = data.columns;
        for(var i = 0; i < columns.length; i++) {
            var values = columns[i];
            var field = fields[i];
            console.log("Column " + field + " (" + i + "): ");
            for(var j = 0; j < values.length; j++) {
                var value = values[j];
                console.log("  " + value);
            }
        }
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
            this.preview    = utils.bind(this, this.preview);  
            this.results    = utils.bind(this, this.results);   
        },

        _foreach: function(sids, fn, callback) {
            sids = sids || [];

            // We get a list of the current jobs, and for each of them,
            // we check whether it is the job we're looking for.
            // If it is, we wrap it up in a Splunk.Job object, and invoke
            // our function on it.
            var jobs = [];
            this.service.jobs().list(function(err, list) {
                list = list || [];
                for(var i = 0; i < list.length; i++) {
                    if (utils.contains(sids, list[i].sid)) {
                        var job = list[i];
                        jobs.push(job);
                    }
                }
                
                Async.parallelMap(fn, jobs, callback);
            });
        },

        run: function(command, args, callback) {
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
                
                callback("No command was specified.");
                return;
            }

            // Get the handler
            var handler = commands[command];

            // If there is no handler (because the user specified an invalid command,
            // then we notify the user as an error.
            if (!handler) {
                callback("Unrecognized command: " + command);
                return;
            }

            // Invoke the command
            handler(args, callback);
        },

        // Cancel the specified search jobs
        cancel: function(sids, callback) {
            _check_sids('cancel', sids);

            // For each of the supplied sids, cancel the job.
            this._foreach(sids, function(job, done) {
                job.cancel(function (err) { 
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    console.log("  Job " + job.sid + " cancelled"); 
                    done(); 
                });
            }, callback);
        },

        // Retrieve events for the specified search jobs
        events: function(argv, callback) {
            // Create the command line for the event command and parse it
            var cmdline = _makeCommandLine("events", argv, FLAGS_EVENTS, false);

            // For each of the passed in sids, get the relevant events
            this._foreach(cmdline.arguments, function(job, done) {
                console.log("===== EVENTS @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
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
            this.service.jobs().create(query, params, function(err, job) {
                if (err) {
                    callback(err);
                    return;
                }
                
                console.log("Created job " + job.sid);
                callback(null, job);
            });
        },

        // List all current search jobs if no jobs specified, otherwise
        // list the properties of the specified jobs.
        list: function(sids, callback) {
            sids = sids || [];

            if (sids.length === 0) {
                // If no job SIDs are provided, we list all jobs.
                var jobs = this.service.jobs();
                jobs.list(function(err, list) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    
                    list = list || [];
                    for(var i = 0; i < list.length; i++) {
                        console.log("  Job " + (i + 1) + " sid: "+ list[i].sid);
                    }

                    callback(null, list);
                });
            }
            else {
                // If certain job SIDs are provided,
                // then we simply read the properties of those jobs
                this._foreach(sids, function(job, done) {
                    job.refresh(function(err, job) {
                        if (err) {
                            done(err);
                            return;
                        }
                        
                        console.log("Job " + job.sid + ": ");
                        var properties = job.properties();
                        for(var key in properties) {
                            // Skip some keys that make the output hard to read
                            if (utils.contains(["performance"], key)) {
                                continue;
                            }

                            console.log("  " + key + ": ", properties[key]);
                        }
                        
                        done(null, properties);
                    });
                }, callback);
            }
        },

        // Retrieve events for the specified search jobs
        preview: function(argv, callback) {
            // Create the command line for the results_preview command and parse it
            var cmdline = _makeCommandLine("results", argv, FLAGS_RESULTS, false);

            // For each of the passed in sids, get the relevant results
            this._foreach(cmdline.arguments, function(job, done) {
                console.log("===== PREVIEW @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
        },

        // Retrieve events for the specified search jobs
        results: function(argv, callback) {
            // Create the command line for the results command and parse it
            var cmdline = _makeCommandLine("results", argv, FLAGS_RESULTS, false);

            // For each of the passed in sids, get the relevant results
            this._foreach(cmdline.arguments, function(job, done) {
                console.log("===== RESULTS @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
        }
    });


    exports.main = function(argv, callback) {        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        // Try and parse the command line
        var cmdline = options.parse(argv);
        
        // If there is no command line, we should return
        if (!cmdline) {
            callback("Error in parsing command line parameters");
            return;
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
        
        svc.login(function(err, success) {
            if (err) {
                console.log("Error: " + err);
                callback(err);
                return;
            }
            
            var program = new Program(svc);
            
            program.run(cmdline.arguments[0], cmdline.arguments.slice(1), function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback.apply(null, arguments);
            });
        });
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();