
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
    var ET = require("elementtree");
    var url = require("url");
    var utils = require("./utils");
    var Async = require("../async");
    var ValidationDefinition = require("./validationdefinition");
    var InputDefinition = require("./inputdefinition");
    var EventWriter = require("./eventwriter");
    var Scheme = require("./scheme");
    var Service = require("../service");

    /**
     * A base class for implementing modular inputs.
     *
     * Subclasses should implement `getScheme` and `streamEvents`,
     * and optionally `validateInput` if the modular input uses 
     * external validation.
     * 
     * The `run` function is used to run modular inputs; it typically
     * should not be overridden.
     * @class splunkjs.ModularInputs.ModularInput
     */
    function ModularInput() {
        this._inputDefinition = null;
        this._service = null;
    }

    /**
     * Handles all the specifics of running a modular input.
     *
     * @param {Object} exports An object representing a modular input script.
     * @param {Array} args A list of command line arguments passed to this script.
     * @param {Object} eventWriter An `EventWriter` object for writing event.
     * @param {Object} inputStream A `Stream` object for reading inputs.
     * @param {Function} callback The function to call after running this script: `(err, status)`.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.runScript = function(exports, args, eventWriter, inputStream, callback) {
        // Default empty functions for life cycle events, this is mostly used for the unit tests
        exports.setup       = exports.setup     || ModularInput.prototype.setup;
        exports.start       = exports.start     || ModularInput.prototype.start;
        exports.end         = exports.end       || ModularInput.prototype.end;
        exports.teardown    = exports.teardown  || ModularInput.prototype.teardown;

        var that = this;

        // Resume streams before trying to read their data.
        if (inputStream.resume) {
            inputStream.resume();
        }
        var bigBuff = new Buffer(0);

        // When streaming events
        if (args.length === 1) {
            // Listen for data on inputStream
            inputStream.on("data", function(chunk) {
                // chunk will be a Buffer when interacting with Splunk
                bigBuff = Buffer.concat([bigBuff, chunk]);
                // TODO: sometimes, Splunk will have a newline at the end of an input definition
                if (bigBuff.toString("utf8", bigBuff.length-1, bigBuff.length) === "\n") {
                    bigBuff = bigBuff.slice(0, bigBuff.length-1);
                }

                if (bigBuff.toString("utf8", bigBuff.length-8, bigBuff.length) === "</input>") {
                    var found = InputDefinition.parse(bigBuff.toString("utf8", 0, bigBuff.length));
                    exports._inputDefinition = found;
                    that._inputDefinition = found;
                    
                    var errors = "";
                    Async.seriesEach(
                        Object.keys(exports._inputDefinition.inputs),
                        function (name, index, doneEach) {
                            var input = exports._inputDefinition.inputs[name];
                            
                            Async.chain([
                                    function(innerDone) {
                                        exports.start(name, input, innerDone);
                                    },
                                    function(innerDone) {
                                        exports.streamEvents(name, input, eventWriter, innerDone);
                                    },
                                    function(innerDone) {
                                        // end() will only be called if streamEvents doesn't fail.
                                        exports.end(name, input, innerDone);
                                    }
                                ],
                                function(innerErr) {
                                    doneEach(innerErr, innerErr ? 1 : 0);
                                }
                            );
                        }, 
                        function (streamErr) {
                            if (streamErr) {
                                errors = streamErr + " " + errors;
                            }
                            if (errors.length === 0) {
                                errors = null;
                            }
                            callback(errors, errors ? 1 : 0);
                        }
                    );
                }
            });
        }
        // When getting the scheme
        else if (args.length >= 2 && args[1].toString().toLowerCase() === "--scheme") {
            var scheme = exports.getScheme();

            if (!scheme) {
                eventWriter.log(EventWriter.FATAL, "Modular input script returned a null scheme."); 
                callback(null, 1);
            }
            else {
                try {
                    eventWriter.writeXMLDocument(scheme.toXML());
                    callback(null, 0);
                }
                catch (e) {
                    eventWriter.log(EventWriter.FATAL, "Modular input script could not return the scheme, error: " + e);
                    callback(e, 1);
                }
            }
        }
        // When validating arguments
        else if (args.length >= 2 && args[1].toString().toLowerCase() === "--validate-arguments") {
            var error = null;

            // Listen for data on inputStream
            inputStream.on("data", function(chunk) {
                bigBuff = Buffer.concat([bigBuff, chunk]);
                // TODO: sometimes, Splunk will have a newline at the end of an input definition
                if (bigBuff.toString("utf8", bigBuff.length-1, bigBuff.length) === "\n") {
                    bigBuff = bigBuff.slice(0, bigBuff.length-1);
                }

                if (bigBuff.toString("utf8", bigBuff.length-8, bigBuff.length) === "</items>") {
                    Async.chain([
                            function(done) {
                                ValidationDefinition.parse(bigBuff.toString("utf8", 0, bigBuff.length), done);
                            },
                            function (validationDefintion, done) {
                                try {
                                    exports.validateInput(validationDefintion);
                                    done(null, 0);
                                }
                                catch (e) {
                                    error = e;
                                    done(null, 1);
                                }
                            },
                            function (status, done) {
                                if (status === 1) {
                                    var errorRoot = ET.Element("error");
                                    ET.SubElement(errorRoot, "message").text = error.message;
                                    try {
                                        eventWriter.writeXMLDocument(errorRoot);
                                        done(null);    
                                    }
                                    catch (e) {
                                        done(e);
                                    }
                                }
                                else {
                                    done(null);
                                }
                            },
                            function (done) {
                                if (error) {
                                    done(error, 1);
                                }
                                else {
                                    done(null, 0);
                                }
                            }
                        ],
                        function (err) {
                            callback(err, err ? 1 : 0);
                        }
                    );
                }
            });
        }
        // When we get unexpected args
        else {
            eventWriter.log(EventWriter.ERROR, "Invalid arguments to modular input script: " + args.join() + "\n");
            callback(null, 1);
        }
    };

    /**
     * Returns a `splunkjs.Service` object for this script invocation.
     *
     * The service object is crated from the Splunkd URI ans session key
     * passed to the command invocation on the modular input stream. It is
     * available as soon as the `ModularInput.streamEvents` function is called.
     *
     * @return {Object} A `Splunkjs.Service` Object, or null if you call this function before the `ModularInput.streamEvents` function is called.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.service = function() {
        if (this._service) {
            return this._service;
        }

        if (!this._inputDefinition) {
            return null;
        }

        var splunkdURI = this._inputDefinition.metadata["server_uri"];
        var sessionKey = this._inputDefinition.metadata["session_key"];

        var urlParts = url.parse(splunkdURI);

        // urlParts.protocol will have a trailing colon, remove it
        var scheme = urlParts.protocol.replace(":", "");
        var splunkdHost = urlParts.hostname;
        var splunkdPort = urlParts.port;

        this._service = new Service({
            scheme: scheme,
            host: splunkdHost,
            port: splunkdPort,
            token: sessionKey
        });

        return this._service;
    };

    // Default to empty functions for life cycle events

    /**
     * Runs before streaming begins.
     *
     * @param {Function} callback The function to call when done: `(err)`.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.setup = function(done) {
        done();
    };
    /**
     * Runs once the streaming starts, for an input.
     *
     * @param {String} name The name of this modular input.
     * @param {Object} definition An InputDefinition object.
     * @param {Function} callback The function to call when done: `(err)`.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.start = function(name, definition, done) {
        done();
    };
    /**
     * Runs once the streaming ends, for an input (upon successfully streaming all events).
     *
     * @param {String} name The name of this modular input.
     * @param {Object} definition An InputDefinition object.
     * @param {Function} callback The function to call when done: `(err)`.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.end = function(name, definition, done) {
        done();
    };
    /**
     * Runs after all streaming is done for all inputs definitions.
     *
     * @param {Function} callback The function to call when done: `(err)`.
     * @class splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.teardown = function(done) {
        done();
    };

    module.exports = ModularInput;
})();