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
    var program        = require('../contrib/commander');
    var spawn          = require('child_process').spawn;
    var path           = require('path');
    var fs             = require('fs');
    var browserify     = require('browserify');
    var http           = require('http');
    var url            = require('url');
    var request        = require('request');

    /**
     * Constants
     */
    var DEFAULT_PORT        = 6969;
    var DOC_DIRECTORY       = "docs";
    var REFDOC_DIRECTORY    = "refs";
    var CLIENT_DIRECTORY    = "client";
    var TEST_DIRECTORY      = "tests";
    var TEST_PREFIX         = "test_";
    var ALL_TESTS           = "tests.js";
    var SDK_BROWSER_ENTRY   = "./lib/entries/browser.entry.js";
    var TEST_BROWSER_ENTRY  = "./lib/entries/browser.test.entry.js";
    var UI_BROWSER_ENTRY    = "./lib/entries/browser.ui.entry.js";
    var DOC_FILE            = "index.html";
    var BUILD_CACHE_FILE    = ".buildcache";
    var SDK_VERSION         = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json")).toString("utf-8")).version;
    var IGNORED_MODULES     = [
        "../contrib/nodeunit/test_reporter",
        "../contrib/nodeunit/junit_reporter",
        "../contrib/commander",
        "../../contrib/commander",
        "./platform/node/node_http",
        "./lib/platform/node/node_http",
        "../lib/platform/node/node_http"
    ];

    /**
     * UI Component Entry Points (for async loading)
     */
    var UI_COMPONENT_BROWSER_ENTRY  = {
        timeline: "./lib/entries/browser.ui.timeline.entry.js",
        charting: "./lib/entries/browser.ui.charting.entry.js"
    };

    /**
     * Generated files
     */
    var COMPILED_SDK       = path.join(CLIENT_DIRECTORY, "splunk.js");
    var COMPILED_SDK_MIN   = path.join(CLIENT_DIRECTORY, "splunk.min.js");
    var COMPILED_TEST      = path.join(CLIENT_DIRECTORY, "splunk.test.js");
    var COMPILED_TEST_MIN  = path.join(CLIENT_DIRECTORY, "splunk.test.min.js");
    var COMPILED_UI        = path.join(CLIENT_DIRECTORY, "splunk.ui.js");
    var COMPILED_UI_MIN    = path.join(CLIENT_DIRECTORY, "splunk.ui.min.js");
    var GENERATED_DOCS     = path.join(DOC_DIRECTORY, SDK_VERSION, DOC_FILE);
    var GENERATED_REF_DOCS = path.join(DOC_DIRECTORY, SDK_VERSION, REFDOC_DIRECTORY, DOC_FILE);
    var GENERATED_DOCS_DIR = path.join(DOC_DIRECTORY, SDK_VERSION);

    /**
     * Helpers
     */

    var serverProxy = function(req, res) {
        var error = {d: { __messages: [{ type: "ERROR", text: "Proxy Error", code: "PROXY"}] }};

        var writeError = function() {
            res.writeHead(500, {});
            res.write(JSON.stringify(error));
            res.end();
        };

        try {
            var body = "";
            req.on('data', function(data) {
                body += data.toString("utf-8");
            });

            req.on('end', function() {
                var destination = req.headers["X-ProxyDestination".toLowerCase()];

                var options = {
                    url: destination,
                    method: req.method,
                    headers: {
                        "Content-Length": req.headers["content-length"] || 0,
                        "Content-Type": req.headers["content-type"],
                        "Authorization": req.headers["authorization"]
                    },
                    followAllRedirects: true,
                    body: body,
                    jar: false,
                    strictSSL: false
                };

                try {
                    request(options, function(err, response, data) {
                        try {
                            var statusCode = (response ? response.statusCode : 500) || 500;
                            var headers = (response ? response.headers : {}) || {};

                            res.writeHead(statusCode, headers);
                            res.write(data || JSON.stringify(err));
                            res.end();
                        }
                        catch (ex) {
                            writeError();
                        }
                    });
                }
                catch (ex) {
                    writeError();
                }

            });
        }
        catch (ex) {
            writeError();
        }
    };

    var createServer = function(port) {
        // passing where is going to be the document root of resources.
        var handler = staticResource.createHandler(fs.realpathSync(path.resolve(__dirname, "..")));

        var server = http.createServer(function(request, response) {
            var path = url.parse(request.url).pathname;

            if (utils.startsWith(path, "/proxy")) {
                serverProxy(request, response);
                return;
            }

            // handle method returns true if a resource specified with the path
            // has been handled by handler and returns false otherwise.
            if(!handler.handle(path, request, response)) {
                response.writeHead(404);
                response.write('404');
                response.end();
            }
        });

        port = port || DEFAULT_PORT;
        server.listen(port);
        console.log("Running server on port: " + (port) + " -- Hit CTRL+C to exit");
    };

    var makeOption = function(name, value) {
        return ["--" + name, value];
    };

    var makeURL = function(file, port) {
        return "http://localhost:" + (port ? port : DEFAULT_PORT) + "/" + file;
    };

    var temp = {
        _defaultDirectory: '/tmp',
        _environmentVariables: ['TMPDIR', 'TMP', 'TEMP'],

        _findDirectory: function() {
            for(var i = 0; i < temp._environmentVariables.length; i++) {
                var value = process.env[temp._environmentVariables[i]];
                if (value) {
                    return fs.realpathSync(value);
                }
            }

            return fs.realpathSync(temp._defaultDirectory);
        },

        _generateName: function() {
            var now = new Date();
            var name = ["__",
                        now.getYear(), now.getMonth(), now.getDay(),
                        '-',
                        process.pid,
                        '-',
                        (Math.random() * 0x100000000 + 1).toString(36),
                        "__"].join('');
            return path.join(temp._findDirectory(), name);
        },

        mkdirSync: function() {
            var tempDirPath = temp._generateName();
            fs.mkdirSync(tempDirPath, "755");
            return tempDirPath;
        }
    };

    // Taken from wrench.js
    var copyDirectoryRecursiveSync = function(sourceDir, newDirLocation, opts) {

        if (!opts || !opts.preserve) {
            try {
                if(fs.statSync(newDirLocation).isDirectory()) {
                    exports.rmdirSyncRecursive(newDirLocation);
                }
            }
            catch(e) { }
        }

        /*  Create the directory where all our junk is moving to; read the mode of the source directory and mirror it */
        var checkDir = fs.statSync(sourceDir);
        try {
            fs.mkdirSync(newDirLocation, checkDir.mode);
        }
        catch (e) {
            //if the directory already exists, that's okay
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }

        var files = fs.readdirSync(sourceDir);

        for(var i = 0; i < files.length; i++) {
            var currFile = fs.lstatSync(sourceDir + "/" + files[i]);

            if(currFile.isDirectory()) {
                /*  recursion this thing right on back. */
                copyDirectoryRecursiveSync(sourceDir + "/" + files[i], newDirLocation + "/" + files[i], opts);
            }
            else if(currFile.isSymbolicLink()) {
                var symlinkFull = fs.readlinkSync(sourceDir + "/" + files[i]);
                fs.symlinkSync(symlinkFull, newDirLocation + "/" + files[i]);
            }
            else {
                /*  At this point, we've hit a file actually worth copying... so copy it on over. */
                var contents = fs.readFileSync(sourceDir + "/" + files[i]);
                fs.writeFileSync(newDirLocation + "/" + files[i], contents);
            }
        }
    };

    var rmdirRecursiveSync = function(path, failSilent) {
        var files;

        try {
            files = fs.readdirSync(path);
        }
        catch (err) {
            if(failSilent) {
                return;
            }
            throw new Error(err.message);
        }

        /*  Loop through and delete everything in the sub-tree after checking it */
        for(var i = 0; i < files.length; i++) {
            var currFile = fs.lstatSync(path + "/" + files[i]);

            if(currFile.isDirectory()) {// Recursive function back to the beginning
                rmdirRecursiveSync(path + "/" + files[i]);
            }
            else if(currFile.isSymbolicLink()) {// Unlink symlinks
                fs.unlinkSync(path + "/" + files[i]);
            }
            else { // Assume it's a file - perhaps a try/catch belongs here?
                fs.unlinkSync(path + "/" + files[i]);
            }
        }

        /*  Now that we know everything in the sub-tree has been deleted, we can delete the main
            directory. Huzzah for the shopkeep. */
        return fs.rmdirSync(path);
    };

    var git = {
        execute: function(args, callback) {
            var program = spawn("git", args);

            process.on("exit", function() {
                program.kill();
            });

            program.stderr.on("data", function(data) {
                process.stderr.write(data);
            });

            return program;
        },

        stash: function(callback) {
            var program = git.execute(["stash"], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Stash error");
                }
                else {
                    callback();
                }
            });
        },

        unstash: function(callback) {
            var program = git.execute(["stash", "pop"], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Unstash error");
                }
                else {
                    callback();
                }
            });
        },

        switchBranch: function(toBranch, callback) {
            var program = git.execute(["checkout", toBranch], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Switch branch error error");
                }
                else {
                    callback();
                }
            });
        },

        currentBranch: function(callback) {
            var program = git.execute(["symbolic-ref",  "HEAD"], callback);

            var buffer = "";
            program.stdout.on("data", function(data) {
                buffer = data.toString("utf-8");
            });

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Couldn't determine current branch name");
                }
                else {
                    var branchName = buffer.replace("refs/heads/", "").trim();
                    callback(null, branchName);
                }
            });
        },

        add: function(filename, callback) {
            var program = git.execute(["add", filename], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Add error");
                }
                else {
                    callback(null);
                }
            });
        },

        commit: function(msg, callback) {
            var program = git.execute(["commit", "-m", msg], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("Commit error");
                }
                else {
                    callback(null);
                }
            });
        },

        push: function(branch, callback) {
            var program = git.execute(["push", "origin", branch], callback);

            program.on("exit", function(code) {
                if (code) {
                    throw new Error("push error");
                }
                else {
                    callback(null);
                }
            });
        }
    };

    var launch = function(file, args, done) {
        done = done || function() {};

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

        var exitCode = 0;
        program.on("exit", function(code) {
            if (code) {
                exitCode = code;
                done(code);
            }
            else {
                done();
            }
        });

        process.on("exit", function() {
            program.kill();
            process.reallyExit(exitCode);
        });

        return program;
    };

    var getDependencies = function(entry) {
        var bundle = browserify({
            entry: entry,
            ignore: IGNORED_MODULES,
            cache: BUILD_CACHE_FILE
        });

        var dependencies = [entry];
        for(var file in bundle.files) {
            if (bundle.files.hasOwnProperty(file)) {
                dependencies.push(file);
            }
        }

        return dependencies;
    };

    var compile = function(entry, path, shouldUglify, watch, exportName) {
        exportName = exportName || "splunkjs";

        // Compile/combine all the files into the package
        var bundle = browserify({
            entry: entry,
            ignore: IGNORED_MODULES,
            cache: BUILD_CACHE_FILE,
            filter: function(code) {
                if (shouldUglify) {
                    var uglifyjs = require("uglify-js"),
                        parser = uglifyjs.parser,
                        uglify = uglifyjs.uglify;

                    var ast = parser.parse(code);
                    ast = uglify.ast_mangle(ast);
                    ast = uglify.ast_squeeze(ast);
                    code = uglify.gen_code(ast);
                }

                code = [
                    "(function() {",
                    "",
                    "var __exportName = '" + exportName + "';",
                    "",
                    code,
                    "",
                    "})();"
                ].join("\n");
                return code;
            }
        });

        var js = bundle.bundle();
        fs.writeFileSync(path, js);
        console.log("Compiled " + path);
    };

    var outOfDate = function(dependencies, compiled, compiledMin) {
        if (!fs.existsSync(compiled) || !fs.existsSync(compiledMin)) {
            return true;
        }

        var compiledTime = fs.statSync(compiled).mtime;
        var compiledMinTime = fs.statSync(compiledMin).mtime;
        var latestDependencyTime = Math.max.apply(null, dependencies.map(function(path) {
            return fs.statSync(path).mtime;
        }));

        return latestDependencyTime > compiledTime || latestDependencyTime > compiledMinTime;
    };

    var ensureDirectoryExists = function(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, "755");
        }
    };

    var ensureClientDirectory = function() {
        ensureDirectoryExists(CLIENT_DIRECTORY);
    };

    /**
     * Tasks
     */

    var compileSDK = function(watch, exportName) {
        ensureClientDirectory();

        var dependencies = getDependencies(SDK_BROWSER_ENTRY);
        if (!outOfDate(dependencies, COMPILED_SDK, COMPILED_SDK_MIN)) {
            console.log("Compiled SDK is not out of date -- skipping...");
            return;
        }

        compile(SDK_BROWSER_ENTRY, COMPILED_SDK, false, watch, exportName);
        compile(SDK_BROWSER_ENTRY, COMPILED_SDK_MIN, true, watch, exportName);
    };

    var compileTests = function(watch, exportName) {
        ensureClientDirectory();

        var dependencies = getDependencies(TEST_BROWSER_ENTRY);
        if (!outOfDate(dependencies, COMPILED_TEST, COMPILED_TEST_MIN)) {
            console.log("Compiled tests are not out of date -- skipping...");
            return;
        }

        compile(TEST_BROWSER_ENTRY, COMPILED_TEST, false, watch);
        compile(TEST_BROWSER_ENTRY, COMPILED_TEST_MIN, true, watch);
    };

    var compileUI = function(watch, exportName) {
        ensureClientDirectory();

        var dependencies = getDependencies(UI_BROWSER_ENTRY);
        if (outOfDate(dependencies, COMPILED_UI, COMPILED_UI_MIN)) {
            compile(UI_BROWSER_ENTRY, COMPILED_UI, false, watch, exportName);
            compile(UI_BROWSER_ENTRY, COMPILED_UI_MIN, true, watch, exportName);
        }
        else {
            console.log("Compiled UI is not out of date -- skipping...");
        }

        for(var component in UI_COMPONENT_BROWSER_ENTRY) {
            if (!UI_COMPONENT_BROWSER_ENTRY.hasOwnProperty(component)) {
                continue;
            }

            var entryPath = UI_COMPONENT_BROWSER_ENTRY[component];
            var generatedPath = path.join(CLIENT_DIRECTORY, "splunk.ui." + component + ".js");
            var generatedMinPath = path.join(CLIENT_DIRECTORY, "splunk.ui." + component + ".min.js");

            dependencies = getDependencies(entryPath);
            if (!outOfDate(dependencies, generatedPath, generatedMinPath)) {
                console.log("Compiled " + component + " is not out of date -- skipping...");
                continue;
            }

            compile(entryPath, generatedPath, false, watch, exportName);
            compile(entryPath, generatedMinPath, true, watch, exportName);
        }
    };

    var compileAll = function(watch, exportName) {
        compileSDK(watch, exportName);
        compileTests(watch);
        compileUI(watch, exportName);
    };

    var runServer = function(port) {
        // TODO: compile doesn't work on Windows, so lets not
        // make runServer depend on it
        createServer(port);
    };

    var launchBrowser = function(file, port) {
        if (!fs.existsSync(file)) {
            throw new Error("File does not exist: " + file);
        }

        if (process.platform === "win32") {
            spawn("cmd.exe", ["/C", "start " + makeURL(file, port)]);
        }
        else {
            spawn("open", [makeURL(file, port)]);
        }
    };

    var launchBrowserTests = function(port) {
        runServer(port);
        launchBrowser("tests/tests.browser.html", port);
    };

    var launchBrowserExamples = function(port) {
        runServer(port);
        launchBrowser("examples/browser/index.html", port);
    };

    var generateDocs = function(callback) {
        callback = (callback && utils.isFunction(callback)) ? callback : (function() {});

        var files = [
            "lib/log.js",
            "lib/http.js",
            "lib/utils.js",
            "lib/async.js",
            "lib/context.js",
            "lib/service.js",
            "lib/modularinputs/argument.js",
            "lib/modularinputs/event.js",
            "lib/modularinputs/eventwriter.js",
            "lib/modularinputs/inputdefinition.js",
            "lib/modularinputs/logger.js",
            "lib/modularinputs/modularinput.js",
            "lib/modularinputs/scheme.js",
            "lib/modularinputs/utils.js",
            "lib/modularinputs/validationdefinition.js"
        ];

        var comments = [];
        files.forEach(function(file) {
          var contents = fs.readFileSync(file).toString("utf-8");

          var obj = dox.parseComments(contents, file);
          comments = comments.concat(obj);
        });

        doc_builder.generate(comments, SDK_VERSION, function(err, data) {
            if (err) {
                throw err;
            }

            ensureDirectoryExists(DOC_DIRECTORY);
            ensureDirectoryExists(path.join(DOC_DIRECTORY, SDK_VERSION));
            ensureDirectoryExists(path.join(DOC_DIRECTORY, SDK_VERSION, REFDOC_DIRECTORY));

            for(var name in data) {
                var htmlPath = path.join(DOC_DIRECTORY, SDK_VERSION, REFDOC_DIRECTORY, name + ".html");
                fs.writeFileSync(htmlPath, data[name]);
            }

            callback(null);
        });
    };

    var uploadDocs = function() {
        var originalBranch = "master";
        var tempPath = "";

        Async.chain([
            function(done) {
                git.currentBranch(done);
            },
            function(branchName, done) {
                originalBranch = branchName;
                generateDocs(done);
            },
            function(done) {
                var tempDirPath = temp.mkdirSync();

                tempPath = tempDirPath;
                copyDirectoryRecursiveSync(GENERATED_DOCS_DIR, tempDirPath);

                done();
            },
            function(done) {
                git.stash(done);
            },
            function(done) {
                git.switchBranch("gh-pages", done);
            },
            function(done) {
                if (fs.existsSync(GENERATED_DOCS_DIR)) {
                    rmdirRecursiveSync(GENERATED_DOCS_DIR);
                }

                ensureDirectoryExists(DOC_DIRECTORY);
                ensureDirectoryExists(path.join(DOC_DIRECTORY, SDK_VERSION));

                copyDirectoryRecursiveSync(tempPath, GENERATED_DOCS_DIR);

                done();
            },
            function(done) {
                git.add(GENERATED_DOCS_DIR, done);
            },
            function(done) {
                git.commit("Updating v" + SDK_VERSION + " docs: " + (new Date()), done);
            },
            function(done) {
                git.push("gh-pages", done);
            },
            function(done) {
                git.switchBranch(originalBranch, done);
            },
            function(done) {
                git.unstash(done);
            }],
            function(err) {
               if (err) {
                   console.log(err);
               }
            }
        );
    };

    var runTests = function(tests, cmdline) {
        cmdline = cmdline || {opts: {}};
        var args = (tests || "").split(",").map(function(arg) { return arg.trim(); });

        var files = args.map(function(arg) {
            return path.join(TEST_DIRECTORY, TEST_PREFIX + arg + ".js");
        }).filter(function(file) {
            return fs.existsSync(file);
        });

        if (files.length === 0) {
            files.push(path.join(TEST_DIRECTORY, ALL_TESTS));
        }
        var cmdlineArgs = []
            .concat(cmdline.opts.username  ?   makeOption("username",  cmdline.opts.username)  : "")
            .concat(cmdline.opts.scheme    ?   makeOption("scheme",    cmdline.opts.scheme)    : "")
            .concat(cmdline.opts.host      ?   makeOption("host",      cmdline.opts.host)      : "")
            .concat(cmdline.opts.port      ?   makeOption("port",      cmdline.opts.port)      : "")
            .concat(cmdline.opts.app       ?   makeOption("app",       cmdline.opts.app)       : "")
            .concat(cmdline.opts.version   ?   makeOption("version",   cmdline.opts.version)   : "")
            .concat(cmdline.opts.password  ?   makeOption("password",  cmdline.opts.password)  : "")
            .concat(cmdline.opts.reporter  ?   makeOption("reporter",  cmdline.opts.reporter.toLowerCase())  : "")
            .concat(cmdline.opts.quiet     ?   "--quiet" : "");

        var testFunctions = files.map(function(file) {
            return function(done) {
                launch(file, cmdlineArgs, done);
            };
        });

        Async.series(testFunctions);
    };

    var hint = function() {
        var hintRequirePath = path.join(path.resolve(require.resolve('jshint'), './../../../'), 'lib', 'cli');
        var jshint = require(hintRequirePath);
        jshint.interpret(['node', 'jshint', '.']);
    };

    program
        .version('0.0.1');

    program
        .command('compile-sdk [global]')
        .description('Compile all SDK files into a single, browser-includable file.')
        .action(function(globalName) {
            compileSDK(false, globalName);
        });

    program
        .command('compile-test')
        .description('Compile all test files into a single, browser-includable file.')
        .action(compileTests);

    program
        .command('compile-ui')
        .description('Compile all UI files into a single, browser-includable file.')
        .action(compileUI);

    program
        .command('compile [global]')
        .description('Compile all files into several single, browser-includable files.')
        .action(function(globalName) {
            compileAll(false, globalName);
        });

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
        .option('--username <username>', 'Splunk username')
        .option('--password <password>', 'Splunk password')
        .option('--scheme <scheme>', 'Splunk scheme')
        .option('--host <host>', 'Splunk host')
        .option('--port <port>', 'Splunk port')
        .option('--version <version>', 'Splunk version')
        .option('--namespace <namespace>', 'Splunk namespace (in the form of owner:app)')
        .option('--reporter <reporter>', '(optional) How to report results, currently "junit" is a valid reporter.')
        .option('--quiet', '(optional) Hides splunkd output.')
        .action(runTests);

    program
        .command('tests-browser [port]')
        .description('Launch the browser test suite.')
        .action(launchBrowserTests);

    program
        .command('examples [port]')
        .description('Launch the browser examples index page.')
        .action(launchBrowserExamples);

    program
        .command('hint')
        .description('Run JSHint on the codebase.')
        .action(hint);

    program
        .command('docs')
        .description('Generate reference documentation for the SDK.')
        .action(generateDocs);

    program
        .command('uploaddocs')
        .description('Upload docs to GitHub.')
        .action(uploadDocs);

    program.parse(process.argv);

    if (!program.executedCommand) {
        process.stdout.write(program.helpInformation());
    }
})();
