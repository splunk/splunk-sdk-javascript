
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


    var fs = require("fs"); // TODO: remove after debugging

    /**
     * A base class for implementing modular inputs.
     *
     * Subclasses should implement `getScheme` and `streamEvents`,
     * and optionally `validateInput` if the modular input uses 
     * external validation.
     * 
     * The `run` function is used to run modular inputs; it typically
     * should not be overridden.
     * @class splunkjs.modularinput.Script
     */
    function Script() {
        this._inputDefinition = null;
        this._service = null;
    }

    /**
     * Runs this modular input.
     *
     * @param {Array} List of command line arguments passed to this script.
     * @return {Number} An integer to be used as the exit value of this script.
     * @class splunkjs.modularinput.Script
     */
    Script.prototype.run = function(args, callback) {
        if (args[0] === "node") {
            args = args.slice(1, args.length);
        }
        return this.runScript(args, new EventWriter(), process.stdin, callback);
    };

    /**
     * Handles all the specifics of running a modular input.
     *
     * @param {Array} List of command line arguments passed to this script.
     * @param {Object} An `EventWriter` object for writing event.
     * @param {Object} A `Stream` object for reading inputs.
     * @return {Number} An integer to be used as the exit value of this script.
     * @class splunkjs.modularinput.Script
     */
    Script.prototype.runScript = function(args, eventWriter, inputStream, callback) {
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
                                    that._inputDefinition = found;

                                    // TODO: this piece is the the same code as the stream code
                                    var status = 0;
                                    var errors = "";
                                    Async.seriesEach(
                                        Object.keys(that._inputDefinition.inputs),
                                        function (name, index, doneEach) {
                                            var input = that._inputDefinition.inputs[name];
                                            that.streamEvents(name, input, eventWriter, function (streamErr, scriptStatus) {
                                                if (scriptStatus !== 0) {
                                                    status = scriptStatus;
                                                }
                                                if (streamErr) {
                                                    errors += streamErr + " ";
                                                }
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
                                            done(errors);
                                        }
                                    );
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
                                        if (scriptStatus !== 0) {
                                            status = scriptStatus;
                                        }
                                        if (streamErr) {
                                            errors += streamErr + " ";
                                        }
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
                        callback(err, err ? 1 : 0);
                    }
                );
            }
        }
        else if (args[1].toString().toLowerCase() === "--scheme") {
            var scheme = that.getScheme();

            if (!scheme) {
                Async.chain([
                        function (done) {
                            eventWriter.log(EventWriter.FATAL, "Modular input script returned a null scheme.", done);
                        }
                    ],
                    function (err) {
                        callback(err, err ? 1 : 0);
                        return;
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
                        callback(err, err ? 1 : 0);
                        return;
                    }
                );
            }
        }
        else if (args[1].toString().toLowerCase() === "--validate-arguments") {
            // TODO: make this handle streams, in case inputStream is an actual stream, not just a buffer.

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
                                        that.validateInput(validationDefintion);
                                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", bigBuff.toString("utf8", 0, bigBuff.length-1) + "\n");
                                        done(null, 0);
                                    }
                                    catch (e) {
                                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "caught an error while validating " + e + "\n");
                                        error = e;
                                        done(null, 1);
                                    }
                                },
                                function (status, done) {
                                    if (status === 1) {
                                        var errorRoot = ET.Element("error");
                                        ET.SubElement(errorRoot, "message").text = error.message;
                                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "validating got an error: " + error.message + "\n");
                                        eventWriter.writeXMLDocument(errorRoot, done);
                                    }
                                    else {
                                        done(null, 0);
                                    }
                                },
                                function (done) {
                                    if (error) {
                                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "final validation callback error" + error + "\n");
                                        done(error, 1);
                                    }
                                    else {
                                        done(null, 0);
                                    }
                                }
                            ],
                            function (err) {
                                fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "final done callback error" + err + "\n");
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
                                fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "validating args got an error " + error.message + "\n");
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
            eventWriter.log(EventWriter.ERROR, "Invalid arguments to modular input script: " + args.join() + "\n", callback);
        }
    };

    /**
     * Returns a `splunkjs.Service` object for this script invocation.
     *
     * The service object is crated from the Splunkd URI ans session key
     * passed to the command invocation on the modular input stream. It is
     * available as soon as the `Script.streamEvents` function is called.
     *
     * @return {Object} A `Splunkjs.Service` object, or null if you
     * call this function before the `Script.streamEvents` function is
     * called.
     * @class splunkjs.modularinput.Script
     */
    Script.prototype.service = function() {
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

    module.exports = Script;
})();