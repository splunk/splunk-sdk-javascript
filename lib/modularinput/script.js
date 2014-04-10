
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

    // TODO: docstrings

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
            Async.chain([
                    function(done) {
                        InputDefinition.parse(inputStream, done);
                    },
                    function (found, done) {
                        that._inputDefinition = found;
                        that.streamEvents(that._inputDefinition, eventWriter, done);
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
                Async.chain([
                        function (done) {
                            // TODO: this is kind of a patch, because writeXMLDocument should be expecting an object representing the ET.Element instead of a buffer
                            eventWriter.writeXMLDocument(scheme.toXML(), done);
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
            var error = null;
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
                            ET.SubElement(errorRoot, "message").text = err.message;
                            eventWriter.writeXMLDocument(errorRoot, done);
                        }
                        else {
                            done(null, 0);
                        }
                    }
                ],
                function (err, result) {
                    if (err || result === 1) {
                        callback(err, 1);
                        return;
                    }
                    else {
                        callback(null, result);
                        return;
                    }
                }
            );
        }
        else {
            return; //TODO: error invalid args, write to the _err buffer
        }
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