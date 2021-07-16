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

(function () {
    "use strict";
    var Async = require('../lib/async');
    var assert = require('chai').assert;

    var root = exports || this;

    root.pollUntil = function (obj, condition, iterations, callback) {
        callback = callback || function () { };

        var i = 0;
        Async.whilst(
            function () { return !condition(obj) && (i++ < iterations); },
            function (done) {
                Async.sleep(500, function () {
                    obj.fetch(done);
                });
            },
            function (err) {
                callback(err, obj);
            }
        );
    };

    // Minimal Http implementation that is designed to pass the tests
    // done by Context.init(), but nothing more.
    root.DummyHttp = {
        // Required by Context.init()
        _setSplunkVersion: function (version) {
            // nothing
        }
    };

    var idCounter = 0;
    root.getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

})();
