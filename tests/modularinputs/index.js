
// Copyright 2014 Splunk, Inc.
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
    var fs          = require('fs');
    var test        = require('../../contrib/nodeunit/test_reporter');
    var splunkjs    = require('../../index');

    exports.Tests = {};

    // Modular input tests
    exports.Tests.ValidationDefinition = require('./test_validation_definition').setup();
    exports.Tests.InputDefinition = require('./test_input_definition').setup();
    exports.Tests.Event = require('./test_event').setup();
    exports.Tests.Scheme = require('./test_scheme').setup();
    exports.Tests.ModularInput = require('./test_modularinput').setup();

    splunkjs.Logger.setLevel("ALL");
})();