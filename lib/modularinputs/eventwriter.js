
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
    var ET      = require("elementtree");
    var utils   = require("./utils");
    var stream  = require("stream");
    var Async   = require("../async");
    /**
     * `EventWriter` writes events and error messages to Splunk from a modular input.
     *
     * Its two important methods are `writeEvent`, which takes an `Event` object,
     * and `log`, which takes a severity and an error message.
     *
     * @param {Object} output A stream to output data, defaults to `process.stdout`
     * @param {Object} error A stream to output errors, defaults to `process.stderr`
     * @class splunkjs.ModularInputs.EventWriter
     */
    function EventWriter(output, error) {

        this._out = typeof output !== "undefined" ? output : process.stdout;
        this._err = typeof error !== "undefined" ? error : process.stderr;

        // Has the opening <stream> tag been written yet?
        this.headerWritten = false;
    }

    // Severities that Splunk understands for log messages from modular inputs.
    // DO NOT CHANGE THESE
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
    * Writes an `Event` object to the `this._out` stream.
    *
    * @param {Object} event An `Event` Object.
    * @param {Function} callback The function to call after writing the `Event`: `(err)`.
    * @class splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeEvent = function(event, callback) {        
        if (!this.headerWritten) {
            this._out.write("<stream>");
            this.headerWritten = true;
        }
        var that = this;

        Async.chain([
                function (done) {
                    event.writeTo(that._out, done);
                },
                function (stream, done) {
                    if (stream) {
                        that._out = stream;
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
                    that.log(severity, err.message, function(subErr) {
                        callback(err);
                    });
                    return;
                }
                else {
                    callback(null);
                }
            }
        );
    };

    /**
    * Logs messages about the state of this modular input to Splunk.
    * These messages will show up in Splunk's internal logs.
    *
    * @param {String} severity The severity of the message, see the severities defined as class constants.
    * @param {String} message The message to log.
    * @param {Function} callback The function to after logging the message: `(err)`.
    * @class splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.log = function(severity, message, callback) {
        try {
            var err = severity + " " + message + "\n";
            this._err.write(err);
            callback();
        }
        catch(e) {
            callback(e);
        }
    };

    /**
    * Writes a string representation of an `Elementtree` Object to the 
    * this._out `Stream`.
    *
    * @param {Object} xmlDocument An `Elementtree` Object representing an XML document.
    * @param {Function} callback The function to call after writing the XML document: `(err)`.
    * @class splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeXMLDocument = function(xmlDocument, callback) {
        try {
            var xmlString = ET.tostring(xmlDocument, {"xml_declaration": false});
            this._out.write(xmlString);
            callback();
        }
        catch (e) {
            callback(e);
        }
    };

    /**
    * Writes the closing </stream> tag to make the XML well formed.
    *
    * @param {Function} callback The callback function to call after writing </stream>: `(err)`.
    * @class splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.close = function(callback) {
        try {
            this._out.write("</stream>");
            callback(null, this._out);
        }
        catch (e) {
            callback(e);
        }
    };

    module.exports = EventWriter;
})();