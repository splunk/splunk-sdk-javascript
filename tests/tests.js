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
    var options     = require('../internal/cmdline');
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = Splunk.NodeHttp;
    
    var parser = new options.create();
    var cmdline = parser.parse(process.argv);
    
    var nonSplunkHttp = new NodeHttp(false);
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
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
    exports.Tests.Examples = require('./test_examples').setup(svc, cmdline.opts);

    Splunk.Logger.setLevel("ALL");
    
    svc.login(function(err, success) {
        test.run([exports]);
    });
})();