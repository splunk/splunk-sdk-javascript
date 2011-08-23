#!/usr/bin/env node

(function(){
    var browserify      = require('browserify'),
        fs              = require('fs'),
        OptionParser    = require('./external/parseopt').OptionParser;

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
                        // returning true cancels any further option parsing
                        // and parser.parse() returns null
                        return value;
                }
            },
            {
                names: ["-s", '--shim'],
                target: "shim",
                type: 'flag',
                help: "Add Ecmascript 5 shim for browsers that don't support it",
                default: false,
            },
            {
                names: ["-b", '--builtins'],
                target: "builtins",
                type: 'flag',
                help: "Add builtin modules (EventEmitters, vm, path, etc)",
                default: true,
            },
            {
                names: ["-u", '--uglify'],
                target: "uglify",
                type: 'flag',
                help: "Minify using UglifyJS",
                default: false,
            },
            {
                names: ["-w", '--watch'],
                target: "watch",
                type: 'flag',
                help: "Watch for file changes",
                default: false,
            },
            {
                names: ['-d', '--dir'],
                target: "dir",
                type: 'string',
                metavar: "DIRECTORY",
                help: "Base directory for browserified files ",
                default: "build/",
            },
        ],
    });

    // Try and parse the command line
    try {
        var cmdline = parser.parse();
    }
    catch(e) {
        // If we failed, then we print out the error message, and then the usage
        console.log(e.message);
        parser.usage();
    }

    // If there is no command line, we should return
    if (!cmdline) {
        return;
    }

    if (cmdline.arguments.length == 0) {
        cmdline.arguments.push(cmdline.options.dir + "splunk" + (cmdline.options.uglify ? ".min." : ".") + "js");        
    }

    var compiledPackagePath = cmdline.arguments[0];

    // Compile/combine all the files into the package
    var bundle = browserify({
        base: {
            lib: __dirname      + "/lib",
            utils: __dirname    + "/utils",
            splunk: __dirname   + "/splunk",
        },
        watch: (cmdline.options.watch ? { persistent: true, interval: 500 } : false),
        shim: cmdline.options.shim,
        builtins: cmdline.options.builtins,
        filter: function(code) {
            if (cmdline.options.uglify) {
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

    bundle
        .on("ready", function(file) {
            var js = bundle.source();
            fs.writeFileSync(compiledPackagePath, js);
            console.log("Compiled " + compiledPackagePath);
        })
        .on("change", function(file) {
            var js = bundle.source();
            fs.writeFileSync(compiledPackagePath, js);
            console.log("Compiled " + compiledPackagePath);
        });
})();