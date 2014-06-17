
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

var Async = require('../async');

var ModularInputs = {
    utils: require("./utils"),
    ValidationDefinition: require('./validationdefinition'),
    InputDefinition: require('./inputdefinition'),
    Event: require('./event'),
    EventWriter: require('./eventwriter'),
    Argument: require('./argument'),
    Scheme: require('./scheme'),
    ModularInput: require('./modularinput'),
    Logger: require('./logger')
};

/**
 * Executes a modular input script.
 *
 * @param {Object} exports An instance of ModularInput representing a modular input.
 * @param {Object} module The module object, used for determining if it's the main module (`require.main`).
 */
ModularInputs.execute = function(exports, module) {
    if (require.main === module) {
        var args = process.argv;

        // Trim the first argument, if it is the node.js executable.
        if (args[0] === 'node' || ModularInputs.utils.contains(args[0], 'node.exe')) {
            args = args.slice(1, args.length);
        }

        // Default empty functions for life cycle events.
        exports.setup       = exports.setup     || ModularInputs.ModularInput.prototype.setup;
        exports.start       = exports.start     || ModularInputs.ModularInput.prototype.start;
        exports.end         = exports.end       || ModularInputs.ModularInput.prototype.end;
        exports.teardown    = exports.teardown  || ModularInputs.ModularInput.prototype.teardown;

        // Setup the default values.
        exports._inputDefinition = exports._inputDefinition || null;
        exports._service         = exports._service         || null;

        // We will call close() on this EventWriter after streaming events, which is handled internally
        // by ModularInput.runScript().
        var ew = new this.EventWriter();

        var scriptStatus;
        Async.chain([
                function(done) {
                    exports.setup(done);
                },
                function(done) {
                    ModularInputs.ModularInput.runScript(exports, args, ew, process.stdin, done);
                },
                function(status, done) {
                    scriptStatus = status;
                    exports.teardown(done);
                }
            ],
            function(err) {
                if (err) {
                    ModularInputs.Logger.error('', err, ew._err);
                }

                // Wait for process.stdout to drain before exiting the process.
                process.stdout.once("drain", function() {
                    process.exit(scriptStatus || err ? 1 : 0);
                });
            }
        );
    }
};

module.exports = ModularInputs;
