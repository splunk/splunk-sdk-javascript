
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

exports.setup = function() {
    var Splunk      = require('../splunk').Splunk;

    Splunk.Logger.setLevel("ALL");
    return {        
        "Callback#callback to object success": function(test) {
            var successfulFunction = function(callback) {
                callback(null, "one", "two");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(one, "one"); 
                test.strictEqual(two, "two");
                test.done();
            });
        },
        
        "Callback#callback to object error - single argument": function(test) {
            var successfulFunction = function(callback) {
                callback("one");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err, "one"); 
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        },
        
        "Callback#callback to object error - multi argument": function(test) {
            var successfulFunction = function(callback) {
                callback(["one", "two"]);
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err[0], "one"); 
                test.strictEqual(err[1], "two");
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        }
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}