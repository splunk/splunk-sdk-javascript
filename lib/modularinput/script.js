
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
    var async = require("../async");
    var ValidationDefinition = require("./validationdefinition");
    var InputDefinition = require("./inputdefinition");
    var EventWriter = require("./eventwriter");
    var Scheme = require("./scheme");
    var Service = require("../service");

    // TODO: docstrings
    // TODO: make this async

    // Constructor
    function Script() {
        this._inputDefinition = null;
        this._service = null;
    }

    // Runs the modular input
    Script.prototype.run = function(args, callback) {
        return this.runScript(args, new EventWriter(), process.stdin, callback);
    };

    // Handles specifics of running a modular input
    Script.prototype.runScript = function(args, eventWriter, inputStream, callback) {
        var that = this;

        if (args.length === 1) {
            async.chain([
                    function(done) {
                        InputDefinition.parse(inputStream, done);
                    },
                    function (found, done) {
                        that._inputDefinition = found;
                        that.streamEvents(that._inputDefinition, eventWriter, done);
                    },
                    function (done) {
                        // TODO: figure out how to get the offset from streamEvents
                        eventWriter.close(100, done);
                    }
                ],
                function (err) {
                    if (err) {
                        callback(err, 0);
                        return;
                    }
                    callback(null, 1);
                    return;
                }
            );
        }
        else if (args[1].toString().toLowerCase() === "--scheme") {
            var scheme = that.getScheme();

            if (!scheme) {
                async.chain([
                        function (done) {
                            eventWriter.log(EventWriter.FATAL, "Modular input script returned a null scheme.", done);
                        }
                    ],
                    function (err) {
                        if (err) {
                            callback(err, 1);
                            return;
                        }
                        callback(null, 1);
                        return;
                    }
                );
            }
            else {
                var schemeString = ET.tostring(scheme.toXML());
                async.chain([
                        function (done) {
                            // TODO: this is kind of a patch, because writeXMLDocument should be expecting an object representing the ET.Element instead of a buffer
                            eventWriter.writeXMLDocument(schemeString, done);
                        }
                    ],
                    function (err) {
                        if (err) {
                            callback(err, 1);
                            return;
                        }
                        callback(null, 0);
                        return;
                    }
                );
            }
        }
        else if (args[1].toString().toLowerCase() === "--validate-arguments") {
            async.chain([
                    function (done) {
                        ValidationDefinition.parse(inputStream, done);
                    },
                    function (validationDefintion, done) {
                        if (that.validateInput(validationDefintion)) {
                            done(null, 0);
                        }
                        else {
                            done(null, 1)
                        }

                    }
                ],
                function (err, result) {
                    if (err) {
                        var errorRoot = ET.Element("error");
                        ET.SubElement(errorRoot, "message").text = err.message;
                        eventWriter.writeXMLDocument(ET.tostring(errorRoot, {"xml_declaration": false}), function() {
                            callback(err, 1);
                            return;
                        });                        
                    }
                    else {
                        callback(null, result);
                        return;
                    }
                }
            );
        }
        else {
            return; //TODO: fix this
        }

        /*
        try {
            if (args.length === 1) {
                // TODO: eventWriter close is async
                this._inputDefinition = InputDefinition.parse(inputStream);
                this.streamEvents(this._inputDefinition, eventWriter);
                eventWriter.close();
                return 0;
            }
            else if (args[1].toString().toLowerCase() === "--scheme") {
                // TODO: writeXMLDocument is actually async
                var scheme = this.getScheme();
                if (!scheme) {
                    eventWriter.log(EventWriter.FATAL, "modular input script returned a null scheme.");
                    return 1;
                }
                else {
                    eventwriter.writeXMLDocument(scheme.toXML());
                    return 0;
                }
            }
            else if (args[1].toString().toLowerCase() === "--validate-arguments") {
                // TODO: writeXMLDocument is actually async
                var validationDefinition = ValidationDefinition.parse(inputStream);
                try {
                    this.validate_input(validationDefinition);
                    return 0;
                }
                catch (e) {
                    var root = ET.Element("error");
                    ET.SubElement(root, "message").text = e.message;
                    eventWriter.writeXMLDocument(root);
                    return 1;
                }
            }
            else {
                // TODO: err.write is actually async
                var errString = "ERROR Invalid arguments to modular input script:" + args.join(" ");
                eventWriter._err.write(errString);
            }
        }
        catch (e) {
            // this should actually be passed to the callback

        }
        */
    };

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

        var scheme = urlParts.protocol;
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