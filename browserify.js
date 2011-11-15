#!/usr/bin/env node

(function(){
    var browserify      = require('browserify'),
        fs              = require('fs'),
        path            = require('path'),
        OptionParser    = require('./contrib/parseopt').OptionParser;

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
                names: ["-u", '--uglify'],
                target: "uglify",
                type: 'flag',
                help: "Minify using UglifyJS",
                default: false,
            },
            {
                names: ['-d', '--dir'],
                target: "dir",
                type: 'string',
                metavar: "DIRECTORY",
                help: "Base directory for browserified files ",
                default: "client/",
            },
        ],
    });

    // Try and parse the command line
    var cmdline = null;
    try {
        cmdline = parser.parse();
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

    if (cmdline.arguments.length === 0) {
        cmdline.arguments.push(cmdline.options.dir + "splunk" + (cmdline.options.uglify ? ".min." : ".") + "js");        
    }

    // UI
    cmdline.arguments.push(cmdline.options.dir + "splunk.ui" + (cmdline.options.uglify ? ".min." : ".") + "js");
    cmdline.arguments.push(cmdline.options.dir + "splunk.test" + (cmdline.options.uglify ? ".min." : ".") + "js");

    if (!path.existsSync(cmdline.options.dir)) {
        fs.mkdirSync(cmdline.options.dir, "755");
    }

    var compiledPackagePath = cmdline.arguments[0];
    var compiledUIPackagePath = cmdline.arguments[1];
    var compiledTestPackagePath = cmdline.arguments[2];

    var compile = function(entry, path) {
        // Compile/combine all the files into the package
        var bundle = browserify({
            entry: entry,
            ignore: ["../contrib/nodeunit/test_reporter", "../contrib/parseopt"],
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

        var js = bundle.bundle();
        fs.writeFileSync(path, js);
        console.log("Compiled " + path);
    };
    
    compile("browser.entry.js", compiledPackagePath);
    //compile("browser.ui.entry.js", compiledUIPackagePath);
    compile("browser.test.entry.js", compiledTestPackagePath);
})();