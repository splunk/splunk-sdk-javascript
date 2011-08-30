
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
    var runforcover = require("../external/runforcover");
    var minitest = require('../external/minitest');
    
    var coverage = runforcover.cover();

    // Building block tests
    require('./test_http');
    require('./test_promise');

    // Splunk tests
    require('./test_binding');
    require('./test_client');

    minitest.run();

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
        fs.mkdirSync(htmlDirPath, 0755);

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
    });
})();