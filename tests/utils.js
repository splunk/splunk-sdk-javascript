// Copyright 2011 Splunk, Inc.
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
    var Async = require('../lib/async');
    
    var root = exports || this;

    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };

    root.pollUntil = function(obj, condition, iterations, callback) {
        callback = callback || function() {};
        
        var i = 0;
        var keepGoing = true;
        Async.whilst(
            function() { return !condition(obj) && (i++ < iterations); },
            function(done) {
                Async.sleep(500, function() {
                    obj.refresh(done); 
                });
            },
            function(err) {
                callback(err, obj);
            }
        );
    };
})();