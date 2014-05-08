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
    var splunkjs        = require('splunk-sdk-javascript'); // TODO: change to splunk-sdk
    var ModularInputs   = splunkjs.ModularInputs;
    var Event           = ModularInputs.Event;
    var Scheme          = ModularInputs.Scheme;
    var Argument        = ModularInputs.Argument;
    var utils           = ModularInputs.utils;

    exports.getScheme = function() {
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

        var countArg = new Argument({
            name: "count",
            dataType: Argument.dataTypeNumber,
            description: "Number of events to generate.",
            requiredOnCreate: true,
            requiredOnEdit: true
        });

        scheme.args = [minArg, maxArg, countArg];

        return scheme;
    };

    exports.validateInput = function(definition) {
        var min = parseFloat(definition.parameters["min"]);
        var max = parseFloat(definition.parameters["max"]);
        var count = parseInt(definition.parameters["count"], 10);

        if (min >= max) {
            throw new Error("min must be less than max; found min=" + min.toString() + ", max=" + max.toString());
        }
        if (count < 0) {
            throw new Error("count must be a positive value; found count=" + count.toString());
        }
    };

    exports.streamEvents = function(name, inputDefinition, eventWriter, callback) {
        var getRandomFloat = function (min, max) {
            return Math.random() * (max - min + 1) + min;
        };

        var singleInput = inputDefinition;

        var min = parseFloat(singleInput.min);
        var max = parseFloat(singleInput.max);
        var count = parseInt(singleInput.count, 10);

        var errorFound = false;
        
        utils.forEach(new Array(count), function() {
            var curEvent = new Event({
                stanza: name,
                data: "number=\"" + getRandomFloat(min, max).toString() + "\""
            });

            try {
                eventWriter.writeEvent(curEvent);
            }
            catch (e) {
                errorFound = true;
                eventWriter.log(ModularInputs.EventWriter.ERROR, e.message);
                callback(e);
            }
        });

        if (!errorFound) {
            callback(null);
        }
    };

    ModularInputs.execute(exports, module);
})();