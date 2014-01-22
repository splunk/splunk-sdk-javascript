
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
    
    // Print the result rows
    var printRows = function(results) {        
        for(var i = 0; i < results.rows.length; i++) {
            console.log("Result " + (i + 1) + ": ");
            var row = results.rows[i];
            for(var j = 0; j < results.fields.length; j++) {
                var field = results.fields[j];
                var value = row[j];
                
                console.log("  " + field + " = " + value);
            }
        }
    };
    
    // Instead of trying to print the column-major format, we just
    // transpose it
    var transpose = function(results) {
        var rows = [];
        var cols = results.columns;
        
        var mapFirst = function(col) { return col.shift(); };
        
        while(cols.length > 0 && cols[0].length > 0) {
            rows.push(cols.map(mapFirst));   
        }
        
        results.rows = rows;
        return results;
    };
    
    // Print the results
    var printResults = function(results) {
        if (results) {
            var isRows = !!results.rows;
            var numResults = (results.rows ? results.rows.length : (results.columns[0] || []).length);
            
            console.log("====== " + numResults + " RESULTS (preview: " + !!results.preview + ") ======");
            
            // If it is in column-major form, transpose it.
            if (!isRows) {
                results = transpose(results);
            }
            
            printRows(results);
        }
    };

    exports.main = function(argv, callback) {
        splunkjs.Logger.setLevel("NONE");
        
        // Read data from stdin
        var incomingResults = "";
        var onData = function(data) {
            incomingResults += data.toString("utf-8");
        };
        
        // When there is no more data, parse it and pretty
        // print it
        var onEnd = function() {
            var results = JSON.parse(incomingResults || "{}");
            printResults(results);
            callback();
        };
        
        var onError = function() {
            callback("ERROR");
        };
        
        // Unregister all the listeners when we're done
        var originalCallback = callback || function() {};
        callback = function() {
            process.stdin.removeListener("data", onData);
            process.stdin.removeListener("end", onEnd);
            process.stdin.removeListener("error", onError);
            process.stdin.pause();
            
            originalCallback.apply(null, arguments);
        };
        
        process.stdin.on("data", onData);
        process.stdin.on("end", onEnd);
        process.stdin.on("error", onError);
        
        process.stdin.resume();
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();