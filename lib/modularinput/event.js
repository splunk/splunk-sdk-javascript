
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

    // TODO: what's the format for listing types of keys of the eventConfig object?
    /**
     * `Event` Represents an event or fragment of an event to be written by this
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
     * @param {Object} an object containing the configuration for an `Event`.
     * @class splunkjs.modularinput.Event
     */
    function Event(eventConfig) {
        eventConfig = typeof eventConfig !== "undefined" ? eventConfig : {};

        this.data = typeof eventConfig.data !== "undefined" ? eventConfig.data : null;
        this.done = typeof eventConfig.done !== "undefined" ? eventConfig.done : true;
        this.host = typeof eventConfig.host !== "undefined" ? eventConfig.host : null;
        this.index = typeof eventConfig.index !== "undefined" ? eventConfig.index : null;
        this.source = typeof eventConfig.source !== "undefined" ? eventConfig.source : null;
        this.sourcetype = typeof eventConfig.sourcetype !== "undefined" ? eventConfig.sourcetype : null;
        this.stanza = typeof eventConfig.stanza !== "undefined" ? eventConfig.stanza : null;
        // eventConfig.time can be of type Date, Number, or String
        this.time = typeof eventConfig.time !== "undefined" ? eventConfig.time : null;
        this.unbroken = typeof eventConfig.unbroken !== "undefined" ? eventConfig.unbroken : true;
    }

    Event.prototype.equals = function(other) {
        if (!(other instanceof Event)) {
            return false;
        }
        return utils.deepEquals(other, this);
    };
    
    /** 
    * Formats a time for Splunk, should be something like `1372187084.000`.
    *
    * @example
    *
    *   // When the time parameter is a string
    *   var stringTime = "1372187084";
    *   var stringTimeFormatted = Event.formatTime(stringTime);
    *
    *   // When the time parameter is a number, no decimals
    *   var numericalTime = 1372187084;
    *   var numericalTimeFormatted = Event.formatTime(numericalTime);
    *
    *   // When the time parameter is a number, with decimals
    *   var decimalTime = 1372187084.424;
    *   var decimalTimeFormatted = Event.formatTime(decimalTime);
    *
    *   // When the time parameter is a Date object
    *   var dateObjectTime = Date.now();
    *   var dateObjectTimeFormatted = Event.formatTime(dateObjectTime);
    *
    * @param {String}, {Number}, or `Date` {Object} the unformatted time in seconds or milliseconds.
    * @return {Number} the formatted time in seconds
    * @class splunkjs.modularinput.Event
    */
    Event.formatTime = function(time) {
        var cleanTime;
        
        // Values with decimals
        if (time.toString().indexOf(".") !== -1) {
            time = parseFloat(time).toFixed(3); // Clean up the extra decimals right away

            // A perfect time in milliseconds, with the decimal in the right spot
            if (time.toString().indexOf(".") >= 10) {
                cleanTime = parseFloat(time.toString().substring(0,14)).toFixed(3);
            }
            // A time with less than expected digits, or with a decimal too far to the left
            else if (time.toString().length <= 13 || time.toString().indexOf(".") < 10) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 15
            else {
                cleanTime = (parseFloat(time.toString().substring(0,14))/1000).toFixed(3);
            }
        }
        // Values without decimals
        else {
            // A time in milliseconds, no decimal (ex: Date.now())
            if (time.toString().length === 13) {
                cleanTime = (parseFloat(time)/1000).toFixed(3);
            }
            // A time with less than expected digits
            else if (time.toString().length <= 12) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 14
            else {
                cleanTime = parseFloat(time.toString().substring(0,13)/1000).toFixed(3);
            }
        }
        return cleanTime;
    };

    /** 
    * Writes an XML representation of this, and Event object to the provided `Buffer`,
    * starting at the provided offset.
    * 
    * Upon completion of writing the `Event`, this function will pass a null error,
    * the `Buffer` written to, and the position in the `Buffer` after the written `Event`.
    *
    * If this.data is undefined, then an error will be passed to the provided callback.
    *
    * @param {Object} A `Buffer` object to write this `Event` to.
    * @param {Number} The offset position in the `Buffer` to begin writing.
    * @param {Function} A callback function.
    * @class splunkjs.modularinput.Event
    */
    Event.prototype.writeTo = function(buffer, offset, callback) {
        if (typeof offset === "function") {
            callback = offset;
            offset = 0;
        }
        if (!this.data) {
            callback(new Error("Events must have at least the data field set to be written to XML."));
            return;
        }
        
        var xmlEvent = ET.Element("event");

        if (this.stanza) {
            xmlEvent.set("stanza", this.stanza);
        }
        // Convert this.unbroken (a boolean) to a number (0 or 1), then to a string
        xmlEvent.set("unbroken", (+this.unbroken).toString());
        
        if (this.time) {
            ET.SubElement(xmlEvent, "time").text = Event.formatTime(this.time).toString();
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

        if (this.done || typeof this.done === "undefined") {
            ET.SubElement(xmlEvent, "done");
        }

        var eventString = ET.tostring(xmlEvent, {"xml_declaration": false});
        try {
            buffer.write(eventString, offset); // For buffers
        }
        catch (e) {
            buffer.write(eventString); // For streams/sockets   
        }
        callback(null, buffer, eventString.length + offset);
    };

    module.exports = Event;
})();