
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
    var modularinput    = splunkjs.ModularInput;
    var Event           = modularinput.Event;
    var EventWriter     = modularinput.EventWriter;
    var fs              = require("fs");
    var path            = require("path");
    var Stream          = require("stream");
    var parser          = require("xml2js");
    var utils           = modularinput.utils;

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
                var crazyFloatTime = 1372187084555.424242425350823423423;
                expected = 1372187084555.000;
                found = Event.formatTime(crazyFloatTime);
                test.equals(found, expected);

                // Test a slightly crazy value
                var crazyFloatTime = 137218.424242425350823423423;
                expected = 137218.424;
                found = Event.formatTime(crazyFloatTime);
                test.equals(found, expected);

                // Test a value starting with zeros
                var crazyFloatTime = 000000000137218.442;
                expected = 137218.442;
                found = Event.formatTime(crazyFloatTime);

                // Test a tiny value
                var crazyFloatTime = 4.001234235;
                expected = 4.001;
                found = Event.formatTime(crazyFloatTime);
                test.equals(found, expected);

                test.done();
            },
            
            "Event without enough fields throws error": function(test) {
                var e = new Event();
                var s = new Stream();
                e.writeTo(s, function(err, event) {
                    test.ok(err);
                    test.done();
                });
            },

            "Event with minimal config matches expected XML": function(test) {
                var myEvent = new Event({
                    data: "This is a test of the emergency broadcast system.",
                    stanza: "fubar",
                    time: 1372187084.000
                });

                myEvent.writeTo(new Stream(), function(writeErr, xml) {
                    test.ok(!writeErr);
                    var results = {};

                    parser.parseString(xml, function (parseFoundErr, result) {
                        test.ok(!parseFoundErr);
                        results.found = result;
                    });

                    var expected = utils.readFile(__filename, "../data/event_minimal.xml");
                    parser.parseString(expected.toString(), function (parseExpectedErr, result) {
                        test.ok(!parseExpectedErr);
                        results.expected = result;

                        test.ok(utils.deepEquals(results.expected, results.found));
                        test.done();
                    });
                });
            },

            "Event with full config matches expected XML": function(test) {
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

                myEvent.writeTo(new Stream(), function(writeErr, xml) {
                    test.ok(!writeErr);
                    var results = {};

                    parser.parseString(xml, function (parseFoundErr, result) {
                        test.ok(!parseFoundErr);
                        results.found = result;
                    });

                    var expected = utils.readFile(__filename, "../data/event_maximal.xml");
                    parser.parseString(expected.toString(), function (parseExpectedErr, result) {
                        test.ok(!parseExpectedErr);
                        results.expected = result;

                        test.ok(utils.deepEquals(results.expected, results.found));
                        test.done();
                    });
                });
            },

            "EventWriter gets an error from invalid Event": function(test) {
                var out = new Stream.Writable();
                var err = new Stream.Writable();
                
                var ew = new EventWriter();
                //var ew = new EventWriter(out, err); // TODO: make it work for streams
                var e = new Event();

                ew.writeEvent(e, function(err){
                    test.ok(err);
                    // TODO: port the following test from the Python SDK
                    // self.assertTrue(err.getvalue().startswith(EventWriter.WARN))
                    test.done();
                });
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