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

exports.setup = function () {
    var assert = require('chai').assert;
    var isBrowser = typeof window !== "undefined";

    var unload = function (name) {
        for (var k in require.cache) {
            if (require.cache[k] && k.match(name + "$")) {
                delete require.cache[k];
            }
        }
    };

    if (isBrowser) {
        return {};
    }
    else {
        return (
            describe('Log tests', function () {
                it("Default level with no environment variable", function (done) {
                    var oldVal = process.env.LOG_LEVEL;
                    delete process.env.LOG_LEVEL;
                    unload("log.js");
                    var logger = require("../lib/log.js");
                    assert.equal(process.env.LOG_LEVEL, logger.Logger.levels.ERROR);
                    process.env.LOG_LEVEL = oldVal;
                    unload("log.js");
                    done();
                });

                it("Setting a nonexistant level default to errors", function (done) {
                    var oldVal = process.env.LOG_LEVEL;
                    process.env.LOG_LEVEL = "25";
                    unload("log.js");
                    var logger = require("../lib/log.js");
                    assert.equal(process.env.LOG_LEVEL, logger.Logger.levels.ERROR);
                    process.env.LOG_LEVEL = oldVal;
                    unload("log.js");
                    done();
                });

                it("Setting logging level as integer works", function (done) {
                    var oldVal = process.env.LOG_LEVEL;
                    process.env.LOG_LEVEL = "3";
                    unload("log.js");
                    var logger = require("../lib/log.js");
                    assert.equal(process.env.LOG_LEVEL, logger.Logger.levels.INFO);
                    process.env.LOG_LEVEL = oldVal;
                    unload("log.js");
                    done();
                });

                it("Setting logging level as string works", function (done) {
                    var oldVal = process.env.LOG_LEVEL;
                    process.env.LOG_LEVEL = "INFO";
                    unload("log.js");
                    var logger = require("../lib/log.js");
                    assert.equal(process.env.LOG_LEVEL, logger.Logger.levels.INFO);
                    process.env.LOG_LEVEL = oldVal;
                    unload("log.js");
                    done();
                });

                it("Setting logging level after the fact works", function (done) {
                    var oldVal = process.env.LOG_LEVEL;
                    unload("log.js");
                    var logger = require("../lib/log.js");
                    logger.Logger.setLevel();
                    process.env.LOG_LEVEL = oldVal;
                    unload("log.js");
                    done();
                });
            })
        )
    };
};

// Run the individual test suite
if (module.id === __filename && module.parent.id.includes('mocha')) {
    module.exports = exports.setup();
}
