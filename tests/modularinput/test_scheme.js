
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
    var Scheme          = modularinput.Scheme;
    var Argument        = modularinput.Argument;
    var utils           = modularinput.utils;
    var xml2js          = require("xml2js");
    var ET              = require("elementtree");

    splunkjs.Logger.setLevel("ALL");
    return {

        "Scheme tests": {
            setUp: function(done) {
                done();
            },

            "Generate XML from scheme with default values": function(test) {
                var myScheme = new Scheme("abcd");
                
                var constructed = myScheme.toXML();
                var expected = ET.parse(utils.readFile(__filename, "../data/scheme_with_defaults.xml").toString())._root;

                test.ok(utils.XMLCompare(expected, constructed));
                test.done();
            },

            "Generating XML from scheme": function(test) {

                var myScheme = new Scheme("abcd");
                myScheme.description = "쎼 and 쎶 and <&> für";
                myScheme.streamingMode = Scheme.streamingModeSimple;
                myScheme.useExternalValidation = "false";
                myScheme.useSingleInstance = "true";
                
                var arg1 = new Argument({
                    name: "arg1"
                });
                myScheme.addArgument(arg1);

                var arg2 = new Argument({
                    name: "arg2",
                    description: "쎼 and 쎶 and <&> für",
                    validation: "is_pos_int('some_name')",
                    dataType: Argument.dataTypeNumber,
                    requiredOnEdit: true,
                    requiredOnCreate: false
                });
                myScheme.addArgument(arg2);

                var constructed = myScheme.toXML();

                var expected = ET.parse(utils.readFile(__filename, "../data/scheme_without_defaults.xml").toString())._root;
                
                //console.log(expected);

                test.ok(utils.XMLCompare(expected, constructed));

                /*
                xml2js.parseString(expected, {trim: true}, function (err, result) {
                    test.ok(!err);
                    test.ok(utils.compareSchemes(result, constructed));
                    test.done();
                });
                */
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