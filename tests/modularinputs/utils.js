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
    "use strict";
    var Stream = require("stream");

    var root = exports || this;

    root.getDuplexStream = function() {
        var duplex = new Stream.Duplex();
        duplex.data = "";
        duplex._write = function(chunk, enc, next) {
            this.data += chunk.toString();
            next();
        };
        duplex._read = function() {
            return this.data;
        };
        return duplex;
    };

    root.getReadableStream = function() {
        var readable = new Stream.Readable();
        readable.data = "";
        readable._read = function() {
            return this.data;
        };
        return readable;
    };

})();