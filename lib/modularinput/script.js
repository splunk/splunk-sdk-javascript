
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
        //console.log("args", args || "no args"); // TODO: remove

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
        inputStream.resume();
        if (args.length === 1) {
            var bigBuff = new Buffer(0);
            inputStream.on("data", function(chunk) {
                bigBuff = Buffer.concat([bigBuff, chunk]);
                //chunk.length here is the actual amount of content in the buffer, there's no garbage at the end of it
                if (bigBuff.toString("utf8", bigBuff.length-9, bigBuff.length-1) === "</input>") {
                    fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", bigBuff.toString("utf-8", 0, bigBuff.length));
                    InputDefinition.parse(bigBuff.toString("utf-8", 0, bigBuff.length), function(err, inputDef) {
                        if (err) {
                            fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", JSON.stringify(err));
                        }
                        else {
                            fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", JSON.stringify(inputDef));
                        }
                        
                        callback();
                    });
                }
            });
            
            
            /*
            Async.chain([
                    function(done) {
                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "Before parse inputDef\n");
                        InputDefinition.parse(inputStream, done);
                    },
                    function (found, done) {
                        that._inputDefinition = found;
                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "After parse inputDef\n" + "inputDef is: " + found);
                        that.streamEvents(that._inputDefinition, eventWriter, done);
                    },
                    function (scriptStatus, done) {
                        fs.appendFileSync("/Users/smohamed/Downloads/splunk/var/log/splunk/_foo.log", "After streamEvents \n");
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
                        
                        inputStream.resume(); // see http://nodejs.org/docs/v0.4.7/api/process.html#process.stdin
                        inputStream.on('data',function(chunk){ // called on each line of input
                          var line=chunk.toString().replace(/\n/,'\\n');
                          console.log('stdin:received line:'+line);
                        }).on('end',function(){ // called when stdin closes (via ^D)
                          console.log('stdin:closed');
                          callback(err, 1);
                        });
                        
                        callback(err, 1);
                    }
                    else {
                        callback(null, 0);
                        return;
                    }                    
                }
            );
            */
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
                            ET.SubElement(errorRoot, "message").text = error.message;
                            eventWriter.writeXMLDocument(errorRoot, done);
                        }
                        else {
                            done(null, 0);
                        }
                    },
                    function (result, done) {
                        if (error) {
                            done(error, 1);
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
            var errorString = "ERROR Invalid arguments to modular input script: " + args.join() + "\n";
            eventWriter._err.write(errorString);
            eventWriter.errPosition += errorString.length;
            return;
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