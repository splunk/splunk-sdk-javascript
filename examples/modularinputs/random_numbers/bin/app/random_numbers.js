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
    var splunkjs        = require("splunk-sdk");
    var ModularInputs   = splunkjs.ModularInputs;
    var Logger          = ModularInputs.Logger;
    var Event           = ModularInputs.Event;
    var Scheme          = ModularInputs.Scheme;
    var Argument        = ModularInputs.Argument;
    var utils           = ModularInputs.utils;

    exports.getScheme = function() {
        var scheme = new Scheme("Random Numbers");

        scheme.description = "Streams events containing a random number.";
        scheme.useExternalValidation = true;
        scheme.useSingleInstance = true;

        scheme.args = [
            new Argument({
                name: "min",
                dataType: Argument.dataTypeNumber,
                description: "Minimum random number to be produced by this input.",
                requiredOnCreate: true,
                requiredOnEdit: false
            }),
            new Argument({
                name: "max",
                dataType: Argument.dataTypeNumber,
                description: "Maximum random number to be produced by this input.",
                requiredOnCreate: true,
                requiredOnEdit: false
            }),
            new Argument({
                name: "count",
                dataType: Argument.dataTypeNumber,
                description: "Number of events to generate.",
                requiredOnCreate: true,
                requiredOnEdit: false
            })
        ];

        return scheme;
    };

    exports.validateInput = function(definition, done) {
        var min = parseFloat(definition.parameters.min);
        var max = parseFloat(definition.parameters.max);
        var count = parseInt(definition.parameters.count, 10);

        if (min >= max) {
            done(new Error("min must be less than max; found min=" + min + ", max=" + max));
        }
        else if (count < 0) {
            done(new Error("count must be a positive value; found count=" + count));
        }
        else {
            done();
        }
    };

    exports.streamEvents = function(name, singleInput, eventWriter, done) {
        var getRandomFloat = function (min, max) {
            return Math.random() * (max - min) + min;
        };

        var min = parseFloat(singleInput.min);
        var max = parseFloat(singleInput.max);
        var count = parseInt(singleInput.count, 10);

        var errorFound = false;

        for (var i = 0; i < count && !errorFound; i++) {            
            var curEvent = new Event({
                stanza: name,
                data: "number=" + getRandomFloat(min, max)
            });

            try {
                eventWriter.writeEvent(curEvent);
            }
            catch (e) {
                errorFound = true;
                Logger.error(name, e.message);
                done(e);

                // We had an error, die
                return;
            }
        }

        // We're done
        done();
    };

    ModularInputs.execute(exports, module);
})();