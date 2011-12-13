
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
    var Splunk          = require('../../splunk').Splunk;
    var Class           = Splunk.Class;
    var utils           = Splunk.Utils;
    var Async           = Splunk.Async;
    var options         = require('../../internal/cmdline');

    var createService = function(options) {
        return new Splunk.Client.Service({
            scheme:     options.scheme,
            host:       options.host,
            port:       options.port,
            username:   options.username,
            password:   options.password
        });
    };
    
    var extractError = function(err) {
        if (err && err instanceof Error) {
            err = err.message;
        }
        
        if (err && err.odata) {
            err = err.odata.messages;
        }
        
        return err;
    };
    
    var Program = Class.extend({
        init: function(cmdline, callback) {
            this.cmdline = cmdline;
            this.callback = callback;
        },

        run: function() {
            var args = arguments;
            var that = this;
            
            this.service = createService(this.cmdline.opts);
            
            var commands = {
                files: this.files,
                stanzas: this.stanzas,
                contents: this.contents,
                edit: this.edit,
                create: this.create,
                "delete": this.del
            };
            
            this.service.login(function(err, success) {
                if (err || !success) {
                    that.callback(err || "Login failure");
                    return;
                }
                
                commands[that.cmdline.executedCommand].apply(that, args);    
            });
        },
        
        // List all the conf files that match the specified
        // pattern (or all of them if no pattern is specified).
        files: function(pattern, options, callback) {
            pattern = pattern || ".*";
            
            var service = this.service;
            Async.chain([
                    function(done) {
                        service.properties().list(done);
                    },
                    function(files, done) {
                        // Find all the files that match the pattern
                        var regex = new RegExp(pattern);
                        files = files.filter(function(file) {
                            return file.name.match(regex);
                        });
                        
                        // If there are any files, print their name
                        if (files.length > 0) {
                            console.log("Configuration Files: ");
                            files.forEach(function(file) {
                                console.log("  " + file.name);
                            });
                        }
                        
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // List all the stanzas in the specified conf file.
        stanzas: function(filename, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file '" + filename + "'");
                            return;
                        }
                        file.list(done);
                    },
                    function(stanzas, done) {
                        // If there any stanzas, print their names
                        if (stanzas.length > 0) {
                            console.log("Stanzas for '" + filename + "': ");
                            stanzas.forEach(function(stanza) {
                                console.log("  " + stanza.name);
                            });
                        }
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // List all the properties in the specified conf file::stanza
        contents: function(filename, stanzaName, options, callback) {
            var ignore = ["__id", "__metadata", "__name"];
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        // Find all the properties
                        var keys = [];
                        var properties = stanza.properties();
                        for(var key in properties) {
                            if (properties.hasOwnProperty(key) && ignore.indexOf(key) < 0) {
                                keys.push(key);
                            }
                        }
                        
                        // If there are any properties, print their name and value
                        if (keys.length > 0) {
                            console.log("Properties for " + filename + ".conf [" + stanzaName + "]: ");
                            keys.forEach(function(key) {
                                console.log("  " + key + ": " + properties[key]);
                            });
                        }
                        
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // Edit the specified property in the specified conf file::stanza
        edit: function(filename, stanzaName, key, value, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        done(null, stanza);
                    },
                    function(stanza, done) {
                        // Update the property
                        var props = {};
                        props[key] = value;
                        stanza.update(props, done);                      
                    }
                ],
                function(err) {                    
                    if (!err) {
                        console.log("Set '" + key + "' to '" + value + "' in stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
        
        // Create the file, stanza and key
        create: function(filename, stanzaName, key, value, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            var collection = null;
            Async.chain([
                    function(done) {
                        collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        // If we can't find the file, create it
                        if (!found) {
                            collection.create(filename, function(err, file) {
                    
                                if (!err) {
                                    console.log("Created file '" + filename + "'");
                                }
                                
                                // Don't do anything with the stanza if we 
                                // didn't specify one
                                if (stanzaName) {
                                    done(null, null, null);
                                    return;   
                                }
                                
                                file.contains(stanzaName, done);
                            });
                            
                            return;
                        }
                        
                        // Don't do anything with the stanza if we 
                        // didn't specify one
                        if (!stanzaName) {
                            done(null, null, null);
                            return;
                        }
                        
                        file.contains(stanzaName, done);
                    },
                    function(found, stanza, done) {
                        if (!stanzaName) {
                            done(null, null);
                            return;
                        }
                        
                        // If we can't find the stanza, then create it
                        if (!found) {
                            var file = options.global ?
                                new Splunk.Client.PropertyFile(service, filename) :
                                new Splunk.Client.ConfigurationFile(service, filename);
                                
                            file.create(stanzaName, {}, function(err, stanza) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                
                                if (!err) {
                                    console.log("Created stanza '" + stanzaName + "' in file '" + filename + "'");
                                }
                                
                                stanza.refresh(done);
                            });
                            return;
                        }
                        
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        // If there is a key to update it,
                        // then update it.
                        if (stanzaName && key && value) {
                            var props = {};
                            props[key] = value;
                            stanza.update(props, done);
                            return;
                        }

                        done();
                    }
                ],
                function(err) {
                    if (key) {
                        console.log("Set '" + key + "' to '" + value + "' in stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
        
        // Delete the specified stanza in the specified conf file
        del: function(filename, stanzaName, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    if (!err) {
                        console.log("Deleted stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
    });

    exports.main = function(argv, callback) {     
        Splunk.Logger.setLevel("ALL");
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        var cmdline = options.create();
        
        var program = new Program(cmdline, callback);
        
        cmdline.name = "conf";
        cmdline.description("View and edit configuration properties");
        
        cmdline
            .command("files [pattern]")
            .description("List all configuration files. Optional pattern to filter files")
            .action(function(pattern, options) {
                program.run(pattern, options, callback);
            });
            
        cmdline
            .command("stanzas <filename>")
            .description("List all stanzas in the specified configuration file")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, options) {
                program.run(filename, options, callback);
            });
            
        cmdline
            .command("contents <filename> <stanza>")
            .description("List all key=value properties of the specified file and stanza")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, options) {
                program.run(filename, stanza, options, callback);
            });
            
        cmdline
            .command("edit <filename> <stanza> <key> <value>")
            .description("Edit the specified stanza")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, key, value, options) {
                program.run(filename, stanza, key, value, options, callback);
            });
            
        cmdline
            .command("create <filename> [stanza] [key] [value]")
            .description("Create a file/stanza/key (will create up to the deepest level")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, key, value, options) {
                program.run(filename, stanza, key, value, options, callback);
            });
            
        cmdline
            .command("delete <filename> <stanza>")
            .description("Delete the stanza in the specified file")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, options) {
                program.run(filename, stanza, options, callback);
            });
        
        cmdline.on('--help', function(){
            console.log("  Examples:");
            console.log("  ");
            console.log("  List all files:");
            console.log("  > node conf.js files");
            console.log("  ");
            console.log("  List all files which start with 'foo':");
            console.log("  > node conf.js files ^foo");
            console.log("  ");
            console.log("  List all stanzas in file 'foo':");
            console.log("  > node conf.js stanzas foo");
            console.log("  ");
            console.log("  List the content of stanza 'bar' in file 'foo':");
            console.log("  > node conf.js content foo bar");
            console.log("  ");
            console.log("  > List the content of stanza 'bar' in file 'foo' in the namespace of user1/app1:");
            console.log("  node conf.js content foo bar --user user1 --app app1");
            console.log("  ");
            console.log("  Set the key 'mykey' to value 'myval' in stanza 'bar' in file 'foo' in the namespace of user1/app1:");
            console.log("  > node conf.js edit foo bar mykey myvalue --user user1 --app app1");
            console.log("  ");
            console.log("  Create a file 'foo' in the namespace of user1/app1:");
            console.log("  > node conf.js create foo --user user1 --app app1");
            console.log("  ");
            console.log("  Create a stanza 'bar' in file 'foo' (and create if it doesn't exist) in the namespace of user1/app1:");
            console.log("  > node conf.js create foo bar --user user1 --app app1");
            console.log("  ");
            console.log("  Delete stanza 'bar' in file 'foo':");
            console.log("  > node conf.js delete foo bar");
            console.log("  ");
            
        });
        cmdline.parse(argv);
        
        // Try and parse the command line
        if (!cmdline.executedCommand) {
            console.log(cmdline.helpInformation());
            cmdline.emit("--help");
            callback("You must specify a command to run.");
            return;
        }
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();