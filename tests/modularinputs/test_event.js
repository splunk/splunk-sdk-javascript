
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

exports.setup = function() {
    var splunkjs        = require('../../index');
    var ModularInput    = splunkjs.ModularInputs;
    var Logger          = splunkjs.ModularInputs.Logger;
    var Event           = ModularInput.Event;
    var EventWriter     = ModularInput.EventWriter;
    var ET              = require("elementtree");
    var utils           = ModularInput.utils;
    var testUtils       = require("./utils");

    splunkjs.Logger.setLevel("ALL");

    return {
        "Event tests": {
            setUp: function(done) {
                done();
            },

            "Event class handles times correctly - Date object": function(test) {
                var now = Date.now();
                var expected = (now / 1000).toFixed(3);
                var found = Event.formatTime(now);
                test.equals(found, expected);

                test.done();
            },

            "Event class handles times correctly - String": function(test) {
                // Test time in seconds
                var stringTime = "1372187084";
                var expected = 1372187084.000;
                var found = Event.formatTime(stringTime);
                test.equals(found, expected);

                // Test a super small time, 4 seconds since the epoch
                var tinyStringTime = "4";
                expected = 4.000;
                found = Event.formatTime(tinyStringTime);
                test.equals(found, expected);

                // Test the time in milliseconds
                var milliStringTime = "1372187084000";
                expected = 1372187084.000;
                found = Event.formatTime(milliStringTime);
                test.equals(found, expected);                

                // Test a huge integer value, just get the first 14 digits
                var hugeStringTime = "13721870840001234";
                expected = 1372187084.000;
                found = Event.formatTime(hugeStringTime);
                test.equals(found, expected);

                // Test a value starting with zeros
                var leadingZeroStringTime = "000000000137218.442";
                expected = 137218.442;
                found = Event.formatTime(leadingZeroStringTime);
                test.equals(found, expected);
                
                test.done();
            },

            "Event class handles times correctly - Number (integer)": function(test) {
                // Test time in seconds
                var intTime = 1372187084;
                var expected = 1372187084.000;
                var found = Event.formatTime(intTime);
                test.equals(found, expected);

                // Test a super small time, 4 seconds since the epoch
                var tinyIntTime = 4;
                expected = 4.000;
                found = Event.formatTime(tinyIntTime);
                test.equals(found, expected);

                // Test the time in milliseconds
                var milliIntTime = 1372187084000;
                expected = 1372187084.000;
                found = Event.formatTime(milliIntTime);
                test.equals(found, expected);                

                // Test a huge integer value, just get the first 14 digits
                var hugeIntTime = 13721870840001234;
                expected = 1372187084.000;
                found = Event.formatTime(hugeIntTime);
                test.equals(found, expected);

                test.done();
            },
            
            "Event class handles times correctly - Number (float)": function(test) {
                // Test a perfect value
                var floatTime = 1372187084.424;
                var expected = 1372187084.424;
                var found = Event.formatTime(floatTime);
                test.equals(found, expected);

                // Test a really long decimal value
                var longDecimalFloatTime = 1372187084.424242425350823423423;
                expected = 1372187084.424;
                found = Event.formatTime(longDecimalFloatTime);
                test.equals(found, expected);

                // Test a date far into the future
                var crazyFloatTime = 13721874084.424242425350823423423;
                expected = 13721874084.420;
                found = Event.formatTime(crazyFloatTime);
                test.equals(found, expected);

                // Test a really really far into the future
                var crazyFloatTime2 = 1372187084555.424242425350823423423;
                expected = 1372187084555.000;
                found = Event.formatTime(crazyFloatTime2);
                test.equals(found, expected);

                // Test a slightly crazy value
                var crazyFloatTime3 = 137218.424242425350823423423;
                expected = 137218.424;
                found = Event.formatTime(crazyFloatTime3);
                test.equals(found, expected);

                // Test a tiny value
                var crazyFloatTime5 = 4.001234235;
                expected = 4.001;
                found = Event.formatTime(crazyFloatTime5);
                test.equals(found, expected);

                test.done();
            },
            
            "Event without enough fields throws error": function(test) {
                try {
                    var myEvent = new Event();
                    myEvent._writeTo(testUtils.getDuplexStream());
                    test.ok(false); // This should not execute if an error is thrown by `Event._writeTo`
                }
                catch (e) {
                    test.equals(e.message, "Events must have at least the data field set to be written to XML.");
                    test.ok(e);
                }
                test.done();
            },
            
            "Event with minimal config matches expected XML": function(test) {
                var out = testUtils.getDuplexStream();

                var myEvent = new Event({
                    data: "This is a test of the emergency broadcast system.",
                    stanza: "fubar",
                    time: 1372187084.000
                });

                var expectedEvent = utils.readFile(__filename, "../data/event_minimal.xml");

                try {
                    myEvent._writeTo(out);
                    var found = ET.parse(out._read());
                    var expected = ET.parse(expectedEvent);
                    test.ok(utils.deepEquals(expected, found));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },
            
            "Event with full config matches expected XML": function(test) {
                var out = testUtils.getDuplexStream();

                var myEvent = new Event({
                    data: "This is a test of the emergency broadcast system.",
                    stanza: "fubar",
                    time: 1372274622.493,
                    host: "localhost",
                    index: "main",
                    source: "hilda",
                    sourcetype: "misc",
                    done: true,
                    unbroken: true
                });

                var expectedEvent = utils.readFile(__filename, "../data/event_maximal.xml");
                
                try {
                    myEvent._writeTo(out);
                    var found = ET.parse(out._read());
                    var expected = ET.parse(expectedEvent);
                    test.ok(utils.deepEquals(expected, found));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },
            
            "EventWriter event writing works": function(test) {
                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();

                var myEvent = new Event({
                    data: "This is a test of the emergency broadcast system.",
                    stanza: "fubar",
                    time: 1372275124.466,
                    host: "localhost",
                    index: "main",
                    source: "hilda",
                    sourcetype: "misc",
                    done: true,
                    unbroken: true
                });

                var expectedOne = utils.readFile(__filename, "../data/stream_with_one_event.xml");
                var expectedTwo = utils.readFile(__filename, "../data/stream_with_two_events.xml");

                var ew = new EventWriter(out, err);
                
                try {
                    ew.writeEvent(myEvent);
                    var found = ET.parse(ew._out._read() + "</stream>");
                    var expected = ET.parse(expectedOne);
                    test.ok(utils.deepEquals(expected, found));

                    ew.writeEvent(myEvent);
                    ew.close();

                    found = ET.parse(ew._out._read());
                    expected = ET.parse(expectedTwo);
                    test.ok(utils.deepEquals(expected, found));

                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },
            
            "EventWriter gets an error from invalid Event": function(test) {
                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();

                var ew = new EventWriter(out, err);

                try {
                    ew.writeEvent(new Event());
                    test.ok(false); // This should not execute if an error is thrown by `EventWriter.writeEvent`
                }
                catch (e) {
                    test.ok(e);
                    test.ok(utils.startsWith(ew._err._read(), Logger.WARN));
                }
                test.done();
            },
            
            "EventWriter logging works": function(test) {
                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();

                var ew = new EventWriter(out, err);
                
                try {
                    Logger.error("", "Something happened!", err);
                    test.ok(utils.startsWith(ew._err._read(), Logger.ERROR));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },
            
            "EventWriter XML writing works": function(test) {
                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();

                var ew = new EventWriter(out, err);

                var expected = ET.parse(utils.readFile(__filename, "../data/event_minimal.xml")).getroot();

                try {
                    ew.writeXMLDocument(expected);
                    test.ok(utils.XMLCompare(expected, ET.parse(ew._out._read()).getroot()));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var test        = require('../../contrib/nodeunit/test_reporter');

    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}