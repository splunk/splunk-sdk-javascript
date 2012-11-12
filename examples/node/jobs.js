
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
    var splunkjs        = require('../../index');
    var Class           = splunkjs.Class;
    var utils           = splunkjs.Utils;
    var Async           = splunkjs.Async;
    var options         = require('./cmdline');

    var FLAGS_CREATE = [
        "search", "earliest_time", "latest_time", "now", "time_format",
        "exec_mode", "search_mode", "rt_blocking", "rt_queue_size",
        "rt_maxblocksecs", "rt_indexfilter", "id", "status_buckets",
        "max_count", "max_time", "timeout", "auto_finalize_ec", "enable_lookups",
        "reload_macros", "reduce_freq", "spawn_process", "required_field_list",
        "rf", "auto_cancel", "auto_pause"
    ];
    var FLAGS_EVENTS = [
        "offset", "count", "earliest_time", "latest_time", "search",
        "time_format", "output_time_format", "field_list", "f", "max_lines",
        "truncation_mode", "output_mode", "segmentation"
    ];
    var FLAGS_RESULTS = [
        "offset", "count", "search", "field_list", "f", "output_mode"
    ];
    
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
            // If it is, we wrap it up in a splunkjs.Job object, and invoke
            // our function on it.
            var jobsList = [];
            this.service.jobs().fetch(function(err, jobs) {
                var list = jobs.list() || [];
                for(var i = 0; i < list.length; i++) {
                    if (utils.contains(sids, list[i].sid)) {
                        var job = list[i];
                        jobsList.push(job);
                    }
                }
                
                Async.parallelMap(jobsList, fn, callback);
            });
        },

        run: function(command, args, options, callback) {
            var commands = {
                'cancel':       this.cancel,
                'create':       this.create,
                'events':       this.events,
                'list':         this.list,
                'preview':      this.preview,
                'results':      this.results
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
            handler(args, options, callback);
        },

        // Cancel the specified search jobs
        cancel: function(sids, options, callback) {
            _check_sids('cancel', sids);

            // For each of the supplied sids, cancel the job.
            this._foreach(sids, function(job, idx, done) {
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
        events: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant events
            this._foreach(sids, function(job, idx, done) {
                job.events(options, function(err, data) {
                    console.log("===== EVENTS @ " + job.sid + " ====="); 
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var output_mode = options.output_mode || "rows";
                    if (output_mode === "json_rows") {
                        printRows(data);
                    }
                    else if (output_mode === "json_cols") {
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
        create: function(args, options, callback) {
            // Get the query and parameters, and remove the extraneous
            // search parameter
            var query = options.search;
            var params = options;
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
        list: function(sids, options, callback) {
            sids = sids || [];

            if (sids.length === 0) {
                // If no job SIDs are provided, we list all jobs.
                var jobs = this.service.jobs();
                jobs.fetch(function(err, jobs) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    
                    var list = jobs.list() || [];
                    for(var i = 0; i < list.length; i++) {
                        console.log("  Job " + (i + 1) + " sid: "+ list[i].sid);
                    }

                    callback(null, list);
                });
            }
            else {
                // If certain job SIDs are provided,
                // then we simply read the properties of those jobs
                this._foreach(sids, function(job, idx, done) {
                    job.fetch(function(err, job) {
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
        preview: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant results
            this._foreach(sids, function(job, idx, done) {
                job.preview(options, function(err, data) {
                    console.log("===== PREVIEW @ " + job.sid + " ====="); 
                    if (err) {
                        done(err);
                        return;
                    }

                    var output_mode = options.output_mode || "rows";
                    if (output_mode === "json_rows") {
                        printRows(data);
                    }
                    else if (output_mode === "json_cols") {
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
        results: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant results
            this._foreach(sids, function(job, idx, done) {
                job.track({}, {
                    'done': function(job) {
                        job.results(options, function(err, data) {
                            console.log("===== RESULTS @ " + job.sid + " ====="); 
                            if (err) {
                                done(err);
                                return;
                            }
                            
                            var output_mode = options.output_mode || "rows";
                            if (output_mode === "json_rows") {
                                printRows(data);
                            }
                            else if (output_mode === "json_cols") {
                                console.log(data);
                                printCols(data);
                            }
                            else {
                                console.log(data);
                            }
        
                            done(null, data);
                        });
                    },
                    'failed': function(job) {
                        done('failed');
                    },
                    'error': function(err) {
                        done(err);
                    }
                });
            }, callback);
        }
    });


    exports.main = function(argv, callback) {     
        var cmdline = options.create();
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        
        var run = function(name) {  
            var options = arguments[arguments.length - 1];
                    
            // Create our service context using the information from the command line
            var svc = new splunkjs.Service({ 
                scheme: cmdline.opts.scheme,
                host: cmdline.opts.host,
                port: cmdline.opts.port,
                username: cmdline.opts.username,
                password: cmdline.opts.password,
                version: cmdline.opts.version
            });
            
            svc.login(function(err, success) {
               if (err) {
                   console.log("Error: " + err);
                   callback(err);
                   return;
               }
               
               var program = new Program(svc);
               
               program.run(name, cmdline.args, options.opts, function(err) {
                   if (err) {
                       callback(err);
                       return;
                   }
                   callback.apply(null, arguments);
               });
            });
        };
        
        cmdline.name = "jobs";
        cmdline.description("List, create and manage search jobs");
        
        cmdline.add("create",  "Create a new search job",                                "",             FLAGS_CREATE,   ["search"], run);
        cmdline.add("results", "Fetch results for the specified search jobs",            "<sids...>",    FLAGS_RESULTS,  [],         run);
        cmdline.add("preview", "Fetch preview results for the specified search jobs",    "<sids...>",    FLAGS_RESULTS,  [],         run);
        cmdline.add("events",  "Fetch events for the specified search jobs",             "<sids...>",    FLAGS_EVENTS,   [],         run);
        cmdline.add("cancel",  "Cancel the specify search jobs",                         "<sids...>",    [],             [],         run);
        cmdline.add("list",    "List all search jobs or properties for those specified", "[sids...]",    [],             [],         run);
        
        cmdline.parse(argv);
        
        // Try and parse the command line
        if (!cmdline.executedCommand) {
            console.log(cmdline.helpInformation());
            callback("You must specify a command to run.");
            return;
        }
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();