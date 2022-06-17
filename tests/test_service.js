
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
    return (
        describe("Service tests", function (done) {
            require("./service_tests/app").setup(svc);
            require("./service_tests/collection").setup(svc, loggedOutSvc);
            require("./service_tests/configuration").setup(svc);
            require("./service_tests/datamodels").setup(svc);
            require("./service_tests/endpoint").setup(svc);
            require("./service_tests/entity").setup(svc, loggedOutSvc);
            require("./service_tests/firedalerts").setup(svc, loggedOutSvc);
            require("./service_tests/indexes").setup(svc, loggedOutSvc);
            require("./service_tests/job").setup(svc);
            require("./service_tests/namespace").setup(svc);
            require("./service_tests/parser").setup(svc);
            require("./service_tests/pivot").setup(svc);
            require("./service_tests/properties").setup(svc);
            require("./service_tests/savedsearch").setup(svc, loggedOutSvc);
            require("./service_tests/serverinfo").setup(svc);
            require("./service_tests/storagepasswords").setup(svc);
            require("./service_tests/typeahead").setup(svc, loggedOutSvc);
            require("./service_tests/user").setup(svc, loggedOutSvc);
            require("./service_tests/view").setup(svc);
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../index');
    var options = require('./cmdline');

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
