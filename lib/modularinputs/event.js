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

    /**
     * `Event` represents an event or fragment of an event to be written by this
     * modular input to Splunk.
     *
     * @example
     *      
     *      // Minimal configuration
     *      var myEvent =  new Event({
     *          data: "This is a test of my new event.",
     *          stanza: "myStanzaName",
     *          time: parseFloat("1372187084.000")
     *      });
     *
     *      // Full configuration
     *      var myBetterEvent =  new Event({
     *          data: "This is a test of my better event.",
     *          stanza: "myStanzaName",
     *          time: parseFloat("1372187084.000"),
     *          host: "localhost",
     *          index: "main",
     *          source: "Splunk",
     *          sourcetype: "misc",
     *          done: true,
     *          unbroken: true
     *      });
     *
     * @param {Object} eventConfig An object containing the configuration for an `Event`.
     * @class splunkjs.ModularInputs.Event
     */
    function Event(eventConfig) {
        eventConfig = utils.isUndefined(eventConfig) ? {} : eventConfig;

        this.data = utils.isUndefined(eventConfig.data) ? null : eventConfig.data;
        this.done = utils.isUndefined(eventConfig.done) ? true : eventConfig.done;
        this.host = utils.isUndefined(eventConfig.host) ? null : eventConfig.host;
        this.index = utils.isUndefined(eventConfig.index) ? null : eventConfig.index;
        this.source = utils.isUndefined(eventConfig.source) ? null : eventConfig.source;
        this.sourcetype = utils.isUndefined(eventConfig.sourcetype) ? null : eventConfig.sourcetype;
        this.stanza = utils.isUndefined(eventConfig.stanza) ? null : eventConfig.stanza;
        this.unbroken = utils.isUndefined(eventConfig.unbroken) ? true : eventConfig.unbroken;

        // eventConfig.time can be of type Date, Number, or String.
        this.time = utils.isUndefined(eventConfig.time) ? null : eventConfig.time;
    }

    /** 
    * Formats a time for Splunk, should be something like `1372187084.000`.
    *
    * @example
    *
    *   // When the time parameter is a string.
    *   var stringTime = "1372187084";
    *   var stringTimeFormatted = Event.formatTime(stringTime);
    *
    *   // When the time parameter is a number, no decimals.
    *   var numericalTime = 1372187084;
    *   var numericalTimeFormatted = Event.formatTime(numericalTime);
    *
    *   // When the time parameter is a number, with decimals.
    *   var decimalTime = 1372187084.424;
    *   var decimalTimeFormatted = Event.formatTime(decimalTime);
    *
    *   // When the time parameter is a Date object.
    *   var dateObjectTime = Date.now();
    *   var dateObjectTimeFormatted = Event.formatTime(dateObjectTime);
    *
    * @param {Anything} time The unformatted time in seconds or milliseconds, typically a String, Number, or `Date` Object.
    * @return {Number} The formatted time in seconds.
    * @function splunkjs.ModularInputs.Event
    */
    Event.formatTime = function(time) {
        var cleanTime;
        
        // If time is a Date object, return its value.
        if (time instanceof Date) {
            time = time.valueOf();
        }

        if (!time || time === null) {
            return null;
        }

        // Values with decimals
        if (time.toString().indexOf(".") !== -1) {
            time = parseFloat(time).toFixed(3); // Clean up the extra decimals right away.

            // A perfect time in milliseconds, with the decimal in the right spot.
            if (time.toString().indexOf(".") >= 10) {
                cleanTime = parseFloat(time.toString().substring(0,14)).toFixed(3);
            }
            // A time with fewer than expected digits, or with a decimal too far to the left.
            else if (time.toString().length <= 13 || time.toString().indexOf(".") < 10) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 15.
            else {
                cleanTime = (parseFloat(time.toString().substring(0,14))/1000).toFixed(3);
            }
        }
        // Values without decimals
        else {
            // A time in milliseconds, no decimal (ex: Date.now()).
            if (time.toString().length === 13) {
                cleanTime = (parseFloat(time)/1000).toFixed(3);
            }
            // A time with fewer than expected digits.
            else if (time.toString().length <= 12) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 14.
            else {
                cleanTime = parseFloat(time.toString().substring(0, 13)/1000).toFixed(3);
            }
        }
        return cleanTime;
    };

    /** 
    * Writes an XML representation of this, and Event object to the provided `Stream`,
    * starting at the provided offset.
    *
    * If this.data is undefined, or if there is an error writing to the provided `Stream`,
    * an error will be thrown.
    *
    * @param {Object} stream A `Stream` object to write this `Event` to.
    * @function splunkjs.ModularInputs.Event
    */
    Event.prototype._writeTo = function(stream) {
        if (!this.data) {
            throw new Error("Events must have at least the data field set to be written to XML.");
        }
        
        var xmlEvent = ET.Element("event");

        if (this.stanza) {
            xmlEvent.set("stanza", this.stanza);
        }
        // Convert this.unbroken (a boolean) to a number (0 or 1), then to a string
        xmlEvent.set("unbroken", (+this.unbroken).toString());
        
        if (!utils.isUndefined(this.time) && this.time !== null) {
            ET.SubElement(xmlEvent, "time").text = Event.formatTime(this.time).toString();
        }

        // If this.data is a JS object, stringify it
        if (typeof this.data === 'object') {
            this.data = JSON.stringify(this.data);
        }

        var subElements = [
            {tag: "source", text: this.source},
            {tag: "sourcetype", text: this.sourcetype},
            {tag: "index", text: this.index},
            {tag: "host", text: this.host},
            {tag: "data", text: this.data}
        ];
        for (var i = 0; i < subElements.length; i++) {
            var node = subElements[i];
            if (node.text) {
                ET.SubElement(xmlEvent, node.tag).text = node.text;
            }
        }

        if (this.done || !utils.isUndefined(this.done)) {
            ET.SubElement(xmlEvent, "done");
        }

        var eventString = ET.tostring(xmlEvent, {"xml_declaration": false});

        // Throws an exception if there's an error writing to the stream.
        stream.write(eventString);
    };

    module.exports = Event;
})();
