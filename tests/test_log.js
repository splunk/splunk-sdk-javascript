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
exports.setup = function() {
    var isBrowser = typeof window !== "undefined";

    var unload = function(name) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k) && k.match(name + "$")) {
                delete require.cache[k];
            }
        }
    };
    
    if (isBrowser) {
        return {};
    } 
    else {
        return {
            "Default level with no environment variable": function(test) {
                var oldVal = process.env.LOG_LEVEL;
                delete process.env.LOG_LEVEL;
                unload("log.js");
                var logger = require("../lib/log.js");
                test.equal(process.env.LOG_LEVEL, logger.Logger.levels.ERROR);
                process.env.LOG_LEVEL = oldVal;
                unload("log.js");
                test.done();
            },

            "Setting a nonexistant level default to errors": function(test) {
                var oldVal = process.env.LOG_LEVEL;
                process.env.LOG_LEVEL = "25";
                unload("log.js");
                var logger = require("../lib/log.js");
                test.equal(process.env.LOG_LEVEL, logger.Logger.levels.ERROR);
                process.env.LOG_LEVEL = oldVal;
                unload("log.js");
                test.done();
            },

            "Setting logging level as integer works": function(test) {
                var oldVal = process.env.LOG_LEVEL;
                process.env.LOG_LEVEL = "3";
                unload("log.js");
                var logger = require("../lib/log.js");
                test.equal(process.env.LOG_LEVEL, logger.Logger.levels.INFO);
                process.env.LOG_LEVEL = oldVal;
                unload("log.js");
                test.done();
            },

            "Setting logging level as string works": function(test) {
                var oldVal = process.env.LOG_LEVEL;
                process.env.LOG_LEVEL = "INFO";
                unload("log.js");
                var logger = require("../lib/log.js");
                test.equal(process.env.LOG_LEVEL, logger.Logger.levels.INFO);
                process.env.LOG_LEVEL = oldVal;
                unload("log.js");
                test.done();
            },

            "Setting logging level after the fact works": function(test) {
                var oldVal = process.env.LOG_LEVEL;
                unload("log.js");
                var logger = require("../lib/log.js");
                logger.Logger.setLevel();
                process.env.LOG_LEVEL = oldVal;
                unload("log.js");
                test.done();
            }

        };
    }
};

if (module === require.main) {
    var test        = require("../contrib/nodeunit/test_reporter");
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}
