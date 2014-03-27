
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

    // TODO: add params and datatypes
    // TODO: time can be of type: integer, float, Date, or string
    // TODO: add return type
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
        this.time = typeof eventConfig.time !== "undefined" ? eventConfig.time : null;
        this.unbroken = typeof eventConfig.unbroken !== "undefined" ? eventConfig.unbroken : true;

        return this;
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
    * @param {String}, {Number}, or {Object} the unformatted time in seconds or milliseconds.
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

    // TODO: write docstrings
    // TODO: the actual writing to the stream, currently trying it out with buffers
    Event.prototype.writeTo = function(buffer, offset, callback) {
        if (typeof offset === "function") {
            callback = offset;
            offset = 0;
        }
        if (!this.data) {
            callback(new Error("Events must have at least the data field set to be written to XML."));
            return;
        }
        
        var writeMe = {"$": {}};
        utils.forEach(this, function(elem, index, obj) {
            switch (index) {
                case "stanza":
                    writeMe["$"][index] = elem;
                    break;
                case "unbroken":
                    writeMe["$"][index] = (elem || typeof elem === "undefined") ? 1 : 0;
                    break;
                case "done":
                    if (elem) {
                        writeMe[index] = null;
                    }
                    break;
                default:
                    if (elem) {
                        writeMe[index] = elem;
                    }
                    break;
            }
        });

        var builder = new xml2js.Builder({rootName: "event", trim:true, xmldec: {}});
        
        var xmlEvent = builder.buildObject(writeMe);
        xmlEvent = xmlEvent.toString().replace("<?xml version=\"1.0\"?>\n","");
        buffer.write(xmlEvent, offset);
        callback(null, buffer, xmlEvent.length + offset);
    };

    module.exports = Event;
})();