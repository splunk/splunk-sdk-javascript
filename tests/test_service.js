
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

exports.setup = function(svc, loggedOutSvc) {
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");

    var suite = {
        "Namespace Tests": require("./service_tests/namespace")(svc),
        "Job Tests": require("./service_tests/job")(svc),
        "Data Model tests": require("./service_tests/datamodels")(svc),
        "Pivot tests": require("./service_tests/pivot")(svc),
        "App Tests": require("./service_tests/app")(svc),
        "Saved Search Tests": require("./service_tests/savedsearch")(svc, loggedOutSvc),
        "Fired Alerts Tests": require("./service_tests/firedalerts")(svc, loggedOutSvc),
        "Properties Tests": require("./service_tests/properties")(svc),
        "Configuration Tests": require("./service_tests/configuration")(svc),
        "Storage Passwords Tests": require("./service_tests/storagepasswords")(svc),
        "Index Tests": require("./service_tests/indexes")(svc, loggedOutSvc),
        "User Tests": require("./service_tests/user")(svc, loggedOutSvc),
        "Server Info Tests": require("./service_tests/serverinfo")(svc),
        "View Tests": require("./service_tests/view")(svc),
        "Parser Tests": require("./service_tests/parser")(svc),
        "Typeahead Tests": require("./service_tests/typeahead")(svc, loggedOutSvc),
        "Endpoint Tests": require("./service_tests/endpoint")(svc),
        "Entity tests": require("./service_tests/entity")(svc, loggedOutSvc),
        "Collection tests": require("./service_tests/collection")(svc, loggedOutSvc)
    };
    return suite;
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');

    var parser = options.create();
    var cmdline = parser.parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    if(!process.env.SPLUNK_HOME){
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

    var suite = exports.setup(svc, loggedOutSvc);

    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
