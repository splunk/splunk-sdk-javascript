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
    var test        = require('../contrib/nodeunit/test_reporter');
    var junit       = require('../contrib/nodeunit/junit_reporter');
    var options     = require('../examples/node/cmdline');
    var splunkjs    = require('../index');
    var utils       = require('../lib/utils');
    var NodeHttp    = splunkjs.NodeHttp;
    
    var parser = new options.create();

    // Extract the "--reporter" and "junit" components
    // from the command line arguments, so they can be
    // appended to the arguments returned from the
    // parsing function.
    var reporterArgs = [];
    var reporterIndex = utils.keyOf("--reporter", process.argv);
    var junitIndex = utils.keyOf("junit", process.argv);

    // If we find both "--reporter" and "junit" and they're
    // exactly 1 position apart in the array of command line args
    if (junitIndex && reporterIndex && (junitIndex - reporterIndex === 1)) {
        reporterArgs.push(process.argv[reporterIndex]);
        reporterArgs.push(process.argv[junitIndex]);
        process.argv.splice(2, reporterIndex);
    }    

    // Do the normal parsing
    var cmdline = parser.parse(process.argv);

    // If we find 2 extracted args, set cmdline.opts["reporter"] equal to "junit"
    // The replace remove the dashes from "--reporter"
    if (reporterArgs.length === 2) {
        cmdline.opts[reporterArgs[0].replace(/-/g, "")] = reporterArgs[1];
    }

    var nonSplunkHttp = new NodeHttp(false);
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var loggedOutSvc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });


    exports.Tests = {};

    // Modular input tests
    exports.Tests.ModularInputs = require('./modularinputs');

    // Building block tests
    exports.Tests.Utils = require('./test_utils').setup();
    exports.Tests.Async = require('./test_async').setup();
    exports.Tests.Http  = require('./test_http').setup(nonSplunkHttp);
    exports.Tests.Log   = require('./test_log').setup();
    
    // Splunk-specific tests
    exports.Tests.Context  = require('./test_context').setup(svc);
    exports.Tests.Service  = require('./test_service').setup(svc, loggedOutSvc);
    exports.Tests.Examples = require('./test_examples').setup(svc, cmdline.opts);


    splunkjs.Logger.setLevel("ALL");
    
    svc.login(function(err, success) {
        // If we determined that we have the "--reporter" and "junit"
        // command line args, use the junit runner instead.
        if (cmdline && cmdline.opts && cmdline.opts.reporter === "junit") {
            // Run all tests under one test suite
            junit.run({"junit_test_results": exports}, {output: "test_logs"});
        }
        else {
            test.run([exports]);
        }
    });
})();
