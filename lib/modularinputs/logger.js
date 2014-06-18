/*!*/
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

(function () {
    "use strict";
    var utils   = require("./utils");
    var root = exports || this;

    /**
     * `Logger` logs messages to Splunk's internal logs.
     *
     * @class splunkjs.ModularInputs.Logger
     */

    // Severities that Splunk understands for log messages from modular inputs.
    // DO NOT CHANGE THESE
    root.DEBUG = "DEBUG";
    root.INFO  = "INFO";
    root.WARN  = "WARN";
    root.ERROR = "ERROR";
    root.FATAL = "FATAL";

    root._log = function(severity, name, message, logStream) {
        logStream = logStream || process.stderr;

        // Prevent a double space if name isn't passed.
        if (name && name.length > 0) {
            name = name + " ";
        }

        var msg = severity + " Modular input " + name + message + "\n";
        logStream.write(msg);
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.debug = function (name, message, stream) {
        try {
            root._log(root.DEBUG, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.info = function (name, message, stream) {
        try {
            root._log(root.INFO, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.warn = function (name, message, stream) {
        try {
            root._log(root.WARN, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.error = function (name, message, stream) {
        try {
            root._log(root.ERROR, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.fatal = function (name, message, stream) {
        try {
            root._log(root.FATAL, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    module.exports = root;
}());
