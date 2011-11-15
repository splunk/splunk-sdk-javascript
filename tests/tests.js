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
    var path        = require('path');
    var fs          = require('fs');
    var runforcover = require("../contrib/runforcover");    
    var test        = require('../contrib/nodeunit/test_reporter');
    var options     = require('../internal/cmdline');
    
    var cmdline = options.parse(process.argv, [
        {
            names: ['--coverage'],
            type: 'flag',
            help: "Run code coverage analysis",
            default: false,
            metavar: "COVERAGE"
        },    
    ]);
        
    // If there is no command line, we should return
    if (!cmdline) {
        return;
    }
    
    if (cmdline.options.coverage) {
        var coverage = runforcover.cover();
    }
    
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    
    var http = new NodeHttp();
    var nonSplunkHttp = new NodeHttp(false);
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });

    exports.Tests = {};

    // Building block tests
    exports.Tests.Utils = require('./test_utils').setup();
    exports.Tests.Async = require('./test_async').setup();
    exports.Tests.Http = require('./test_http').setup(nonSplunkHttp);
    
    // Splunk-specific tests
    exports.Tests.Binding = require('./test_binding').setup(svc);
    exports.Tests.Client = require('./test_client').setup(svc);
    exports.Tests.Searcher = require('./test_searcher').setup(svc);
    exports.Tests.Examples = require('./test_examples').setup(svc);

    svc.login(function(err, success) {
        test.run([exports]);
    });

    // Delete a directory recursively
    var rmdirRecursiveSync = function(dirPath) {
        var files = fs.readdirSync(dirPath);
        
        for(var i = 0; i < files.length; i++) {
            var filePath = path.join(dirPath, files[i]);
            var file = fs.statSync(filePath);

            if (file.isDirectory()) {
                rmdirRecursiveSync(filePath);
            }
            else {
                fs.unlinkSync(filePath);
            }
        }  

        fs.rmdirSync(dirPath);
    };

    process.addListener("exit", function () {
        // Delete old coverage HTML data
        var htmlDirPath = path.join(path.dirname(__filename), "html");
        if (path.existsSync(htmlDirPath)) {
           rmdirRecursiveSync(htmlDirPath);
        }

        // Make the 'html' directory again
        fs.mkdirSync(htmlDirPath, "0755");

        if (cmdline.options.coverage) {
            coverage(function(coverageData) { 
                var files = [];   
                for(var filename in coverageData) {
                    if (!coverageData.hasOwnProperty(filename)) {
                        continue;
                    }

                    var html = runforcover.formatters.html.format(coverageData[filename]);

                    var filePath = path.join(htmlDirPath, path.basename(filename) + ".html");
                    files.push({name: filename, path: filePath});

                    html = "" + 
                        "<style>" + "\n" + 
                        "  .covered { background: #C9F76F; }" + "\n" + 
                        "  .uncovered { background: #FDD; }" + "\n" + 
                        "  .partialuncovered { background: #FFA; }" + "\n" + 
                        "</style>" + "\n" + 
                        html;
                    fs.writeFileSync(filePath, html);
                }

                var indexHtml = "<ul>";
                for(var i = 0; i < files.length; i++) {
                    var file = files[i];
                    indexHtml += ("  <li>" + "<a href='" + file.path + "'>" + file.name + "</a></li>\n");
                }
                indexHtml += "</ul>";

                fs.writeFileSync(path.join(htmlDirPath, "index.html"), indexHtml);
            });

            // return control back to the original require function
            coverage.release();
        }
    });
})();