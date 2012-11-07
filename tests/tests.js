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
    var options     = require('../examples/node/cmdline');
    var splunkjs    = require('../index');
    var NodeHttp    = splunkjs.NodeHttp;
    
    var parser = new options.create();
    var cmdline = parser.parse(process.argv);
    
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
        test.run([exports]);
    });
})();
