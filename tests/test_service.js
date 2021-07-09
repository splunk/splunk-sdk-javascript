
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

exports.setup = function (svc, loggedOutSvc) {

    var suite = {
        "App Tests": require("./service_tests/app").setup(svc),
        "Collection tests": require("./service_tests/collection").setup(svc, loggedOutSvc),
        "Configuration Tests": require("./service_tests/configuration").setup(svc),
        "Data Model tests": require("./service_tests/datamodels").setup(svc),
        "Endpoint Tests": require("./service_tests/endpoint").setup(svc),
        "Entity tests": require("./service_tests/entity").setup(svc, loggedOutSvc),
        "Fired Alerts Tests": require("./service_tests/firedalerts").setup(svc, loggedOutSvc),
        "Index Tests": require("./service_tests/indexes").setup(svc, loggedOutSvc),
        "Job Tests": require("./service_tests/job").setup(svc),
        "Namespace Tests": require("./service_tests/namespace").setup(svc),
        "Parser Tests": require("./service_tests/parser").setup(svc),
        "Pivot tests": require("./service_tests/pivot").setup(svc),
        "Properties Tests": require("./service_tests/properties").setup(svc),
        "Saved Search Tests": require("./service_tests/savedsearch").setup(svc, loggedOutSvc),
        "Server Info Tests": require("./service_tests/serverinfo").setup(svc),
        "Storage Passwords Tests": require("./service_tests/storagepasswords").setup(svc),
        "Typeahead Tests": require("./service_tests/typeahead").setup(svc, loggedOutSvc),
        "User Tests": require("./service_tests/user").setup(svc, loggedOutSvc),
        "View Tests": require("./service_tests/view").setup(svc),
    };

    return suite;
};

if (module === require.cache[__filename] && !module.parent) {
    var splunkjs = require('../index');
    var options = require('../examples/node/cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    if (!process.env.SPLUNK_HOME) {
        throw new Error("$PATH variable SPLUNK_HOME is not set. Please export SPLUNK_HOME to the splunk instance.");
    }

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

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc, loggedOutSvc));
        });
    });
}
