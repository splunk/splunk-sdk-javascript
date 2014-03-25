
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

    // TODO: add params and datatypes
    // TODO: time can be of type: integer, float, Date, or string
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
    }

    Event.prototype.equals = function(other) {
        if (!(other instanceof Event)) {
            return false;
        }
        return utils.deepEquals(other, this);
    };

    //TODO: docstrings
    /** Formats the time for Splunk, should be like `1372187084.000`
    **/
    //TODO: lots of tests
    //TODO: consider changing up the first default if like so: https://gist.github.com/shakeelmohamed/9697660/revisions
    function formatTime(time) {
        var cleanTime;
        if (typeof time === "Date") {
            cleanTime = (time/1000).toFixed(3);
        }
        else {
            if (time.toString().length >= 10 && time.toString().length <= 12) {
                cleanTime = time.toFixed(3);
            }
            else if (time.toString().length === 13) {
                cleanTime = (time/1000).toFixed(3);
            }
        }
        return cleanTime;
    }

    // TODO: write docstrings
    Event.prototype.writeTo = function(stream, callback) {
        if (!this.data) {
            callback("Events must have at least the data field set to be written to XML.");
            return;
        }

        var writeMe = {"$": {}};
        utils.forEach(this, function(elem, index, obj) {
            switch (index) {
                case "stanza":
                    writeMe["$"][index] = elem;
                    break;
                case "unbroken":
                    writeMe["$"][index] = parseInt(elem, 10);
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

        var builder = new xml2js.Builder({rootName: "event"});
        var xmlEvent = builder.buildObject(writeMe);
        //TODO: the actual writing to the stream
        callback(null, xmlEvent);
    };

    module.exports = Event;
})();