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

(function() {
    var ET      = require("elementtree");
    var utils   = require("./utils");
    var Logger  = require("./logger");
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
        this._out = utils.isUndefined(output) ? process.stdout : output;
        this._err = utils.isUndefined(error) ? process.stderr : error;

        // Has the opening <stream> tag been written yet?
        this._headerWritten = false;
    }

    /**
    * Writes an `Event` object to the output stream specified
    * in the constructor.
    *
    * @param {Object} event An `Event` Object.
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeEvent = function(event) {        
        if (!this._headerWritten) {
            this._out.write("<stream>");
            this._headerWritten = true;
        }

        try {
            event._writeTo(this._out);
        }
        catch (e) {
            if (e.message === "Events must have at least the data field set to be written to XML.") {
                Logger.warn("", e.message, this._err);
                throw e;
            }
            Logger.error("", e.message, this._err);
            throw e;
        }
    };

    /**
    * Writes a string representation of an `Elementtree` Object to the 
    * output stream specified in the constructor.
    *
    * This function will throw an exception if there is an error
    * while making a string from `xmlDocument`, or
    * while writing the string created from `xmlDocument`.
    *
    * @param {Object} xmlDocument An `Elementtree` Object representing an XML document.
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeXMLDocument = function(xmlDocument) {
        var xmlString = ET.tostring(xmlDocument, {"xml_declaration": false});
        this._out.write(xmlString);
    };

    /**
    * Writes the closing </stream> tag to make the XML well formed.
    *
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.close = function() {
        this._out.write("</stream>");
    };

    module.exports = EventWriter;
})();
