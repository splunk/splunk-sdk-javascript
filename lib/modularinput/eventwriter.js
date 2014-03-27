
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
    var xml2js  = require("xml2js");
    var utils   = require("./utils");
    var stream  = require("stream");

    /**
     * `EventWriter` writes events and error messages to Splunk from a modular input.
     *
     * Its two important methods are `writeEvent`, which takes an `Event` object,
     * and `log`, which takes a severity and an error message.
     *
     * @param {Object} a stream to output data, defaults to `process.stdout`
     * @param {Object} a stream to output errors, defaults to `process.stderr`
     * @class splunkjs.modularinput.EventWriter
     */
    function EventWriter(output, error) {

        this._out = typeof output !== "undefined" ? output : process.stdout;
        this._err = typeof error !== "undefined" ? error : process.stderr;

        // Has the opening <stream> tag been written yet?
        this.headerWritten = false;
    }

    // Severities that Splunk understands for log messages from modular inputs.
    // Do not change these
    EventWriter.DEBUG = "DEBUG";
    EventWriter.INFO  = "INFO";
    EventWriter.WARN  = "WARN";
    EventWriter.ERROR = "ERROR";
    EventWriter.FATAL = "FATAL";

    EventWriter.prototype.equals = function(other) {
        if (!(other instanceof EventWriter)) {
            return false;
        }
        return utils.deepEquals(other, this);
    };

    /**
    * Writes an `Event` object to Splunk.
    *
    * @param {Object} an `Event` object.
    * @class splunkjs.modularinput.EventWriter
    */
    EventWriter.prototype.writeEvent = function(event, offset, callback) {
        if (typeof offset === "function") {
            callback = offset;
            offset = 0;
        }
        if (!offset) {
            offset = 0;
        }
        /// TODO: this should take an event object, and convert it to XML when printing to standard out
        if (!this.headerWritten) {
            offset = 8;
            this._out.write("<stream>");
            this.headerWritten = true;
        }
        event.writeTo(this._out, offset, callback);
    };

    /**
    * Logs messages about the state of this modular input to Splunk.
    * These messages will show up in Splunk's internal logs.
    *
    * @param {String} severity of message, see severities defined as class constants.
    * @param {String} message to log.
    * @param {Function} a callback function to call after flushing the stream.
    * @class splunkjs.modularinput.EventWriter
    */
    //TODO: add an offset
    EventWriter.prototype.log = function(severity, message, callback) {
        try {
            this._err.write(severity + " " + message + "\n");
            callback();
        }
        catch(e) {
            callback(e);
        }
    };

    // TODO: docstrings
    // TODO: add an offset
    EventWriter.prototype.writeXMLDocument = function(xmlDocument, callback) {
        //TODO
        try {
            this._out.write(xmlDocument.toString());
            callback();
        }
        catch (e) {
            callback(e);
        }
    };

    // TODO: docstrings
    EventWriter.prototype.close = function(offset, callback) {
        if (typeof offset === "function") {
            callback = offset;
            offset = 0;
        }
        if (!offset) {
            offset = 0;
        }
        try {
            this._out.write("</stream>", offset);
            callback(null, this._out, offset + 8);
        }
        catch (e) {
            callback(e);
        }
    };

    module.exports = EventWriter;
})();