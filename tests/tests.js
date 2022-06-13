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

var describe = require('mocha').describe;
var options = require('./cmdline');
var splunkjs = require('../index');
var utils = require('../lib/utils');
var NodeHttp = splunkjs.NodeHttp;

var parser = new options.create();

// If we found the --quiet flag, remove it
var quiet = utils.contains(process.argv, "--quiet");
if (quiet) {
    splunkjs.Logger.setLevel("NONE");
    var quietIndex = utils.keyOf("--quiet", process.argv);
    process.argv.splice(quietIndex, 1);
}
else {
    splunkjs.Logger.setLevel("ALL");
}

// If $SPLUNK_HOME isn't set, abort the tests
if (!Object.prototype.hasOwnProperty.call(process.env, "SPLUNK_HOME")) {
    console.error("$SPLUNK_HOME is not set, aborting tests.");
    return;
}

// Do the normal parsing
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

describe("Server tests", function () {

    this.beforeAll(function (done) {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
        });
        done();
    })

    require('./test_async').setup();
    require('./test_context').setup(svc);
    require('./test_http').setup(nonSplunkHttp);
    require('./test_log').setup();
    require('./test_service').setup(svc, loggedOutSvc);
    require('./test_utils').setup();
})




