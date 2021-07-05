
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
        "App Tests": require("./service_tests/app")(svc),
        "Collection tests": require("./service_tests/collection")(svc, loggedOutSvc),
        "Configuration Tests": require("./service_tests/configuration")(svc),
        "Data Model tests": require("./service_tests/datamodels")(svc),
        "Endpoint Tests": require("./service_tests/endpoint")(svc),
        "Entity tests": require("./service_tests/entity")(svc, loggedOutSvc),
        "Fired Alerts Tests": require("./service_tests/firedalerts")(svc, loggedOutSvc),
        "Index Tests": require("./service_tests/indexes")(svc, loggedOutSvc),
        "Job Tests": require("./service_tests/job")(svc),
        "Namespace Tests": require("./service_tests/namespace")(svc),
        "Parser Tests": require("./service_tests/parser")(svc),
        "Pivot tests": require("./service_tests/pivot")(svc),
        "Properties Tests": require("./service_tests/properties")(svc),
        "Saved Search Tests": require("./service_tests/savedsearch")(svc, loggedOutSvc),
        "Server Info Tests": require("./service_tests/serverinfo")(svc),
        "Storage Passwords Tests": require("./service_tests/storagepasswords")(svc),
        "Typeahead Tests": require("./service_tests/typeahead")(svc, loggedOutSvc),
        "User Tests": require("./service_tests/user")(svc, loggedOutSvc),
        "View Tests": require("./service_tests/view")(svc),
    };

    return suite;
};