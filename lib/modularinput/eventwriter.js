
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
    var Async   = require("../async");
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

        this.outPosition = 0;
        this.errPosition = 0;
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
    EventWriter.prototype.writeEvent = function(event, callback) {
        /// TODO: this should take an event object, and convert it to XML when printing to standard out
        if (!this.headerWritten) {
            this._out.write("<stream>");
            this.outPosition += 8;
            this.headerWritten = true;
        }
        var that = this;

        Async.chain([
                function (done) {
                    event.writeTo(that._out, that.outPosition, done);
                },
                function (buffer, offset, done) {
                    if (offset) {
                        that.outPosition += offset;
                    }
                    if (buffer) {
                        that._out = buffer;
                    }
                    done(null);
                }
            ],
            function (err) {
                if (err) {
                    var severity = EventWriter.ERROR;
                    if (err.message === "Events must have at least the data field set to be written to XML.") {
                        severity = EventWriter.WARN;
                    }
                    that.log(severity, err.message, function(subErr){
                        callback(err);
                    });
                    return;
                }
                else {
                    callback(err, that._out);
                }
            }
        );
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
    //TODO: use the offset
    EventWriter.prototype.log = function(severity, message, callback) {
        try {
            var err = severity + " " + message + "\n";
            this._err.write(err);
            this.errPosition += err.length;
            callback();
        }
        catch(e) {
            callback(e);
        }
    };

    // TODO: docstrings
    // TODO: use an offset
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
    // TODO:  remove offset 
    EventWriter.prototype.close = function(callback) {
        try {
            this._out.write("</stream>", this.outPosition);
            callback(null, this._out, this.outPosition + 8);
        }
        catch (e) {
            callback(e);
        }
    };

    module.exports = EventWriter;
})();