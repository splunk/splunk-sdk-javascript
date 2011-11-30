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
    var utils          = require('../lib/utils');
    var Async          = require('../lib/async');
    var staticResource = require('../contrib/static-resource/index');
    var dox            = require('../contrib/dox/dox');
    var doc_builder    = require('../contrib/dox/doc_builder');
    var spawn          = require('child_process').spawn;
    var path           = require('path');
    var fs             = require('fs');
    var browserify     = require('browserify');
    var program        = require('commander');
    var http           = require('http');
    var url            = require('url');
    
    /**
     * Constants
     */
    var DEFAULT_PORT        = 6969;
    var DOC_DIRECTORY       = "docs";
    var CLIENT_DIRECTORY    = "client";
    var TEST_DIRECTORY      = "tests";
    var TEST_PREFIX         = "test_";
    var ALL_TESTS           = "tests.js";
    var SDK_BROWSER_ENTRY   = "browser.entry.js";
    var TEST_BROWSER_ENTRY  = "browser.test.entry.js";
    var UI_BROWSER_ENTRY    = "browser.ui.entry.js";
    var DOC_FILE            = "index.html";
    var SDK_VERSION         = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json")).toString("utf-8")).version;
    
    /**
     * Generated files
     */
    var COMPILED_SDK      = path.join(CLIENT_DIRECTORY, "splunk.js");
    var COMPILED_SDK_MIN  = path.join(CLIENT_DIRECTORY, "splunk.min.js");
    var COMPILED_TEST     = path.join(CLIENT_DIRECTORY, "splunk.test.js");
    var COMPILED_TEST_MIN = path.join(CLIENT_DIRECTORY, "splunk.test.min.js");
    var COMPILED_UI       = path.join(CLIENT_DIRECTORY, "splunk.ui.js");
    var COMPILED_UI_MIN   = path.join(CLIENT_DIRECTORY, "splunk.ui.min.js");
    var GENERATED_DOCS    = path.join(DOC_DIRECTORY, SDK_VERSION, DOC_FILE);
    
    var createServer = function(port) {
        // passing where is going to be the document root of resources.
        var handler = staticResource.createHandler(fs.realpathSync(path.resolve(__dirname, "..")));

        var server = http.createServer(function(request, response) {
            var path = url.parse(request.url).pathname;
            // handle method returns true if a resource specified with the path
            // has been handled by handler and returns false otherwise.
            if(!handler.handle(path, request, response)) {
                response.writeHead(404);
                response.write('404');
                response.end();
            }
        });
        
        server.listen(port || DEFAULT_PORT);  
    };
    
    var makeOption = function(name, value) {
        return "--" + name + "=" + value;  
    };
    
    var makeURL = function(file, port) {
        return "http://localhost:" + (port ? port : DEFAULT_PORT) + "/" + file;  
    };
    
    var launch = function(file, args, done) {
        done = function() {};
        
        // Add the file to the arguments
        args = args || [];
        args = args.slice();
        args.unshift(file);
        
        // Spawn
        var program = spawn("node", args);
        
        program.stdout.on("data", function(data) {
            var str = data.toString("utf-8");
            process.stdout.write(str); 
        });
        
        program.stderr.on("data", function(data) {
            var str = data.toString("utf-8");
            process.stderr.write(str); 
        });
        
        program.on("exit", function(code) {
            if (code) {
                done(code);
            }
            else {
                done();
            }
        });
        
        process.on("exit", function() {
            program.kill();
        });
        
        return program;
    };
    
    var compile = function(entry, path, shouldUglify, watch) {
        // Compile/combine all the files into the package
        var bundle = browserify({
            entry: entry,
            ignore: ["../contrib/nodeunit/test_reporter", "../contrib/parseopt"],
            filter: function(code) {
                if (shouldUglify) {
                    var uglifyjs = require("uglify-js"),
                        parser = uglifyjs.parser,
                        uglify = uglifyjs.uglify;
                        
                    var ast = parser.parse(code);
                    ast = uglify.ast_mangle(ast);
                    ast = uglify.ast_squeeze(ast);
                    return uglify.gen_code(ast);
                }
                else {
                    return code;
                }
            },
        });

        var js = bundle.bundle();
        fs.writeFileSync(path, js);
        console.log("Compiled " + path);
    };
    
    var ensureDirectoryExists = function(dir) {
        if (!path.existsSync(dir)) {
            fs.mkdirSync(dir, "755");  
        }
    };
    
    var ensureClientDirectory = function() {
        ensureDirectoryExists(CLIENT_DIRECTORY);
    };
    
    var compileSDK = function(watch) {
        
        compile(SDK_BROWSER_ENTRY, COMPILED_SDK, false, watch);
        compile(SDK_BROWSER_ENTRY, COMPILED_SDK_MIN, true, watch);
    };
    
    var compileTests = function(watch) {
        compile(TEST_BROWSER_ENTRY, COMPILED_TEST, false, watch);
        compile(TEST_BROWSER_ENTRY, COMPILED_TEST_MIN, true, watch);
    };
    
    var compileUI = function(watch) {
        compile(UI_BROWSER_ENTRY, COMPILED_TEST, false, watch);
        compile(UI_BROWSER_ENTRY, COMPILED_TEST_MIN, true, watch);
    };
    
    var compileAll = function(watch) {
        compileSDK(watch);
        compileTests(watch);
        // TODO: compileUI(watch);  
    };
    
    var runServer = function(port) {
        // TODO: compile doesn't work on Windows, so lets not
        // make runServer depend on it
        //compileAll(true);
        createServer(port);
    };
    
    var launchBrowser = function(file, port) {
        if (!path.existsSync(file)) {
            throw new Error("File does not exist: " + file);
        } 
        
        spawn("open", [makeURL(file, port)]);
    };
    
    var launchBrowserTests = function(port) {
        runServer(port);
        launchBrowser("tests/tests.browser.html", port);
    };
    
    var generateDocs = function() {        
        var files = [
            "lib/http.js",
            "lib/utils.js",
            "lib/async.js",
            "lib/binding.js"
        ];
        
        var comments = [];
        files.forEach(function(file) {
          var contents = fs.readFileSync(file).toString("utf-8");
          var obj = dox.parseComments(contents);
          comments = comments.concat(obj);
        });
        
        doc_builder.generate(comments, SDK_VERSION, function(err, data) {
            if (err) {
                throw err;
            }
            
            ensureDirectoryExists(DOC_DIRECTORY);
            ensureDirectoryExists(path.join(DOC_DIRECTORY, SDK_VERSION));
            
            fs.writeFileSync(GENERATED_DOCS, data);
        });
    };
    
    var runTests = function(tests, options) {
        options = options || {};        
        var args = (tests || "").split(",").map(function(arg) { return arg.trim(); });
        
        var files = args.map(function(arg) {
            return path.join(TEST_DIRECTORY, TEST_PREFIX + arg + ".js");
        }).filter(function(file) {
            return path.existsSync(file);
        });
        
        if (files.length === 0) {
            files.push(path.join(TEST_DIRECTORY, ALL_TESTS));
        }
        
        var cmdline = [
            (options.username   ?                   makeOption("username",     options.username)      : ""),
            (options.scheme     ?                   makeOption("scheme",       options.scheme)        : ""),
            (options.host       ?                   makeOption("host",         options.host)          : ""),
            (options.port       ?                   makeOption("port",         options.port)          : ""),
            (options.namespace  ?                   makeOption("namespace",    options.namespace)     : ""),
            (!utils.isFunction(options.password) ?  makeOption("password",     options.password)      : "")
        ];
        
        var testFunctions = files.map(function(file) {
            return function(done) {
                launch(file, cmdline, done);
            };
        });
        
        Async.series(testFunctions);
    };
    
    var hint = function() {
        var hintRequirePath = path.join(path.resolve(require.resolve('jshint'), './../../../'), 'lib', 'cli');  
        var jshint = require(hintRequirePath);
        jshint.interpret(['node', 'jshint', '.'])
    };

    program
        .version('0.0.1');
    
    program
        .command('compile-sdk')
        .description('Compile all SDK files into a single, browser-includable file.')
        .action(compileSDK);
    
    program
        .command('compile-test')
        .description('Compile all test files into a single, browser-includable file.')
        .action(compileTests);
    
    program
        .command('compile')
        .description('Compile all files into several single, browser-includable file.')
        .action(compileAll);
    
    program
        .command('runserver [port]')
        .description('Run a local server to serve tests and examples.')
        .action(runServer);
    
    program
        .command('launch-browser <file> [port]')
        .description('Launch the browser to the specified file, running on the local server.')
        .action(launchBrowser);
    
    program
        .command('tests [files]')
        .description('Run the specified test files (comma-separated), or all of them if no file is specified.')
        .option('--username=<username>', 'Splunk username')
        .option('--password <password>', 'Splunk password')
        .option('--scheme <scheme>', 'Splunk scheme')
        .option('--host <host>', 'Splunk host')
        .option('--port <port>', 'Splunk port')
        .option('--namespace <namespace>', 'Splunk namespace (in the form of owner:app)')
        .action(runTests);
    
    program
        .command('tests-browser [port]')
        .description('Launch the browser test suite.')
        .action(launchBrowserTests);
    
    program
        .command('hint')
        .description('Run JSHint on the codebase.')
        .action(hint);
    
    program
        .command('docs')
        .description('Generate reference documentation for the SDK.')
        .action(generateDocs);
        
    program.parse(process.argv);
    
    if (program.args.length === 0) {       
        process.stdout.write(program.helpInformation());
        process.exit(0);
    }
})();