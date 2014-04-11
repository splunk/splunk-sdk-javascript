
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
    var splunkjs        = require('../../index');
    var ModularInput    = splunkjs.ModularInput;
    var Script          = ModularInput.Script;
    var Scheme          = ModularInput.Scheme;
    var Argument        = ModularInput.Argument;
    var Async           = splunkjs.Async;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var NewScript = new Script();

    NewScript.getScheme = function() {
        var scheme = new Scheme("Random Numbers");
        scheme.description = "Streams events containing a random number.";

        scheme.useExternalValidation = true;
        scheme.useSingleInstance = true;

        var minArg = new Argument("min");
        minArg.dataType = Argument.dataTypeNumber;
        minArg.description = "Minimum random number to be produced by this input.";
        minArg.requiredOnCreate = true;

        scheme.addArgument(minArg);

        var maxArg = new Argument("max");
        maxArg.dataType = Argument.dataTypeNumber;
        maxArg.description = "Maximum random number to be produced by this input.";
        maxArg.requiredOnCreate = true;
        scheme.addArgument(maxArg);

        return scheme;
    };

    NewScript.validateInput = function(definition, done) {
        var min = parseFloat(definition.parameters["min"]);
        var max = parseFloat(definition.parameters["max"]);

        if (min >= max) {
            throw new Error("min must be less than max; found min=" + min.toString() + ", max=" + max.toString());
        }
        done();
    };

    NewScript.streamEvents = function(inputDefinition, eventWriter, callback) {
        Async.parallel([
                function (done) {

                }
            ],
            function (err) {

            }
        );
        // TODO: functionality
        var inputName = "";
        var min = parseFloat();
        var max = parseFloat();

        var myEvent = new Event({
            data: "number=" + getRandomInt(min, max),
            stanza: "inputName",
        });
        
        Async.chain([
                function (done) {
                    eventWriter.writeEvent(myEvent, done);
                },
                function (buffer, done) {
                    eventWriter.writeEvent(myEvent, done);
                },
                function (buffer, done) {
                    done(null);
                }
            ],
            function (err) {
                if (err) {
                    callback(err, 1);
                    return;
                }
                else {
                    callback(null, 0);
                    return;
                }
            }
        );
    };


    if (module === require.main) {
        NewScript.run(process.argv, function(err){
            if (err) {
                console.log("Error running modular input", err);
            }
        });
    }
})();