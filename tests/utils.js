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

const { utils } = require('mocha');

(function () {
    "use strict";
    var utils = require('../lib/utils');

    var root = exports || this;

    root.pollUntil = async function (obj, condition, iterations) {

        let i = 0;
        try {
            await utils.whilst(
                function () { return !condition(obj) && (i++ < iterations); },
                async function () {
                    await utils.sleep(500);
                    await obj.fetch();
                }
            );
        } catch (error) {
            throw error;
        }
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
