
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
    var splunkjs        = require('./splunk-sdk-javascript/index');
    var ModularInput    = splunkjs.ModularInput;
    var Script          = ModularInput.Script;
    var Event           = ModularInput.Event;
    var EventWriter     = ModularInput.EventWriter;
    var Scheme          = ModularInput.Scheme;
    var Argument        = ModularInput.Argument;
    var utils           = ModularInput.utils;

    var NewScript = new Script();

    NewScript.getScheme = function() {
        var scheme = new Scheme("Random Numbers");
        scheme.description = "Streams events containing a random number.";

        scheme.useExternalValidation = true;
        scheme.useSingleInstance = true;

        var minArg = new Argument({
            name: "min",
            dataType: Argument.dataTypeNumber,
            description: "Minimum random number to be produced by this input.",
            requiredOnCreate: true,
            requiredOnEdit: true
        });

        var maxArg = new Argument({
            name: "max",
            dataType: Argument.dataTypeNumber,
            description: "Maximum random number to be produced by this input.",
            requiredOnCreate: true,
            requiredOnEdit: true
        });

        scheme.args = [minArg, maxArg];

        return scheme;
    };

    NewScript.validateInput = function(definition) {
        var min = parseFloat(definition.parameters["min"]);
        var max = parseFloat(definition.parameters["max"]);

        if (min >= max) {
            throw new Error("min must be less than max; found min=" + min.toString() + ", max=" + max.toString());
        }
    };

    NewScript.streamEvents = function(name, inputDefinition, eventWriter, callback) {
        var getRandomInt = function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        var singleInput = inputDefinition;

        var min = parseFloat(singleInput.min);
        var max = parseFloat(singleInput.max);

        var curEvent = new Event({
            stanza: name,
            data: "number=\"" + getRandomInt(min, max).toString() + "\""
        });

        eventWriter.writeEvent(curEvent, function(err) {
            callback(err, err ? 1 : 0);
        });
    };

    if (module === require.main) {
        
        NewScript.run(process.argv, function(err, scriptStatus) {
            var ew = new EventWriter();
            var title = NewScript.getScheme().title;
            if (err) {
                // TODO: is there a better way to deal w/ the callback so the script doesn't hang?
                ew.log(EventWriter.ERROR, "Error (" + err + ") while running modular input " + title + " with status: " + scriptStatus, function(){
                    throw err; // Throw the error, Splunk knows there's a problem
                    //process.exit(1);
                });
            }
            else {
                ew.log(EventWriter.INFO, "Now running modular input " + title + " with status " + scriptStatus, function() {
                    // TODO: when do I want to exit the process?
                    // The process shouldn't hang when passed --scheme
                    //process.exit(0);
                });

            }
        });
    }
})();