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
    var path = require('path');
    var fs = require('fs');
    var OptionParser    = require('../contrib/parseopt').OptionParser;
    
    var DEFAULTS_PATHS = [
        process.env.HOME || process.env.HOMEPATH,
        process.cwd()
    ];
    
    var readDefaultsFile = function(path, defaults) {
        var contents = fs.readFileSync(path, "utf8") || "";
        var lines = contents.split("\n") || [];
        
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line !== "") {
                var parts = line.split("=");
                var key = parts[0].trim();
                var value = parts[1].trim();
                defaults[key] = value;
            }
        }
    };
    
    var getDefaults = function() {
        var defaults = {};
        for(var i = 0; i < DEFAULTS_PATHS.length; i++) {
            var defaultsPath = path.join(DEFAULTS_PATHS[i], ".splunkrc");
            if (path.existsSync(defaultsPath)) {
                readDefaultsFile(defaultsPath, defaults);
            }
        }
        
        return defaults;
    };
    
    exports.OptionParser = OptionParser;
    exports.parse = function(argv, additionalOptions) {
        additionalOptions = additionalOptions || [];
        argv = (argv || []).slice(2);
        var defaults = getDefaults();
        for(var key in defaults) {
            if (defaults.hasOwnProperty(key)) {
                var value = defaults[key];
                argv.unshift("--" + key + "=" + value);
            }
        }
        
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
                    default: "8089",
                    metavar: "PORT",
                },
                
                {
                    names: ['--scheme'],
                    type: 'string',
                    required: false,
                    help: "Scheme",
                    default: "https",
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
        
        for(var i = 0; i < additionalOptions.length; i++) {
            var option = additionalOptions[i];
            parser.add(option.names[0], option);
        }
        
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
        
        return cmdline;
    };
})();