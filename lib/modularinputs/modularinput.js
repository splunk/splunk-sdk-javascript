
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
     * @class splunkjs.modularinput.ModularInput
     */
    function ModularInput() {
        this._inputDefinition = null;
        this._service = null;
    }

    /**
     * Handles all the specifics of running a modular input.
     *
     * @param {Object} exports An object representing a modular input script. // TODO: revise
     * @param {Array} args A list of command line arguments passed to this script.
     * @param {Object} eventWriter An `EventWriter` object for writing event.
     * @param {Object} inputStream A `Stream` object for reading inputs.
     * @param {Function} callback The function to call after running this script: `(err, status)`.
     * @class splunkjs.modularinput.ModularInput
     */
    ModularInput.runScript = function(exports, args, eventWriter, inputStream, callback) {
        var that = this;

        // Resume streams before trying to read their data.
        if (inputStream.resume) {
            inputStream.resume();
        }

        if (args.length === 1) {
            var bigBuff = new Buffer(0);

            // If inputStream is a stream, listen for data
            if (inputStream.on) {
                inputStream.on("data", function(chunk) {
                    //chunk.length here is the actual amount of content in the buffer, there's no garbage at the end of it

                    bigBuff = Buffer.concat([bigBuff, chunk]);

                    if (bigBuff.toString("utf8", bigBuff.length-9, bigBuff.length-1) === "</input>") {
                        Async.chain([
                                function(done) {
                                    InputDefinition.parse(bigBuff.toString("utf8", 0, bigBuff.length-1), done);
                                },
                                function (found, done) {
                                    exports._inputDefinition = found;
                                    ModularInput.metadata = found.metadata; // TODO: testing;

                                    // TODO: this piece is the the same code as the stream code
                                    var status = 0;
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
                                                    function(scriptStatus, innerDone) {
                                                        status = scriptStatus;
                                                        // TODO: so, this will only call end() if streamEvents doesn't fail.
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
                                            done(errors);
                                        }
                                    );
                                }
                            ],
                            function (err) {
                                // TODO: do I need to log this error?
                                callback(err, err ? 1: 0);
                            }
                        );
                    }
                });
            }
            // Else, we assume inputStream is a Buffer; TODO: this is jut a temporary hack until buffers are removed.
            else {
                Async.chain([
                        function(done) {
                            InputDefinition.parse(inputStream, done);
                        },
                        function (found, done) {
                            that._inputDefinition = found;

                            // TODO: this piece is the the same code as the stream code
                            var status = 0;
                            var errors = "";
                            Async.seriesEach(
                                Object.keys(that._inputDefinition.inputs),
                                function (name, index, doneEach) {
                                    var input = that._inputDefinition.inputs[name];
                                    that.streamEvents(name, input, eventWriter, function (streamErr, scriptStatus) {
                                        status = scriptStatus;
                                        doneEach();
                                    });
                                }, 
                                function (streamErr) {
                                    if (streamErr) {
                                        errors = streamErr + " " + errors;
                                    }
                                    if (errors.length === 0) {
                                        errors = null;
                                    }
                                    done(errors, status);
                                }
                            );
                        },
                        function (scriptStatus, done) {
                            // Only write </scheme> if something has been written to eventWriter._out
                            if (eventWriter.outPosition > 0) {
                                eventWriter.close(done);
                            }
                            else {
                                done(null);
                            }
                        }
                    ],
                    function (err) {
                        // TODO: do I need to log this error?
                        callback(err, err ? 1 : 0);
                    }
                );
            }
        }
        else if (args[1].toString().toLowerCase() === "--scheme") {
            var scheme = exports.getScheme();
            // TODO: combine these
            if (!scheme) {
                Async.chain([
                        function (done) {
                            eventWriter.log(EventWriter.FATAL, "Modular input script returned a null scheme.", done);
                        }
                    ],
                    function (err) {
                        callback(err, 1);
                    }
                );
            }
            else {
                Async.chain([
                        function (done) {
                            eventWriter.writeXMLDocument(scheme.toXML(), done);
                        }
                    ],
                    function (err) {
                        if (err) {
                            eventWriter.log(EventWriter.FATAL, "Modular input script could not return the scheme, error: " + err, function() {
                                callback(err, 1);
                            });
                        }
                        else {
                            callback(null, 0);
                        }
                    }
                );
            }
        }
        else if (args[1].toString().toLowerCase() === "--validate-arguments") {

            var bigBuff = new Buffer(0);
            var error = null;

            // If inputStream is a stream, listen for data
            if (inputStream.on) {
                inputStream.on("data", function(chunk) {
                    //chunk.length here is the actual amount of content in the buffer, there's no garbage at the end of it

                    bigBuff = Buffer.concat([bigBuff, chunk]);

                    if (bigBuff.toString("utf8", bigBuff.length-9, bigBuff.length-1) === "</items>") {
                        Async.chain([
                                function(done) {
                                    ValidationDefinition.parse(bigBuff.toString("utf8", 0, bigBuff.length-1), done);
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
                                        eventWriter.writeXMLDocument(errorRoot, done);
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
            // Else, we assume inputStream is a Buffer; TODO: this is jut a temporary hack until buffers are removed.
            else {
                Async.chain([
                        function (done) {
                            ValidationDefinition.parse(inputStream, done);
                        },
                        function (validationDefintion, done) {
                            try {
                                that.validateInput(validationDefintion);
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
                                eventWriter.writeXMLDocument(errorRoot, done);
                            }
                            else {
                                done(null, 0);
                            }
                        },
                        function (result, done) {
                            done(error, error ? 1 : 0);
                        }
                    ],
                    function (err, result) {
                        callback(err, err ? 1 : 0);
                    }
                );
            }
        }
        else {
            eventWriter.log(EventWriter.ERROR, "Invalid arguments to modular input script: " + args.join() + "\n", function() {
                callback(null, 1);
            });
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
     * @class splunkjs.modularinput.ModularInput
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

    //Default to empty functions for life cycle events; add docstrings; all are optional
    // Before streaming begins
    ModularInput.prototype.setup = function(done) {
        done();
    };
    // Once the streaming starts, for an input
    ModularInput.prototype.start = function(name, definition, done) {
        done();
    };
    // Once the streaming ends, for an input
    ModularInput.prototype.end = function(name, definition, done) {
        done();
    };
    // After all streaming is done for all inputs
    ModularInput.prototype.teardown = function(done) {
        done();
    };

    /**
     * Executes a modular input script
     *
     * @param {Object} exports An instance of ModularInput representing a modular input
     * @param {Object} module An instance of ModularInput representing a modular input
     * @class splunkjs.modularinput.ModularInput
     */
    ModularInput.execute = function(exports, module) {
        var args = process.argv;
        if (args[0] === "node") {
            args = args.slice(1, args.length);
        }

        // Setup the default values
        exports._inputDefinition = exports._inputDefinition || null;
        exports._service         = exports._service         || null;

        // Default empty functions for life cycle events
        exports.setup       = exports.setup     || ModularInput.prototype.setup;
        exports.start       = exports.start     || ModularInput.prototype.start;
        exports.end         = exports.end       || ModularInput.prototype.end;
        exports.teardown    = exports.teardown  || ModularInput.prototype.teardown;

        var scriptStatus;

        Async.chain([
                function(done) {
                    exports.setup(done);
                },
                function(done) {
                    ModularInput.runScript(exports, args, new EventWriter(), process.stdin, done);
                },
                function(status, done) {
                    scriptStatus = status;
                    exports.teardown(done);
                }
            ],
            function(err) {
                // TODO: any logging after execution
                process.exit(scriptStatus || err ? 1 : 0);

            }
        );
    };

    module.exports = ModularInput;
})();