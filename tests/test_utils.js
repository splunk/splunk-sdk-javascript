
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
    var Splunk      = require('../splunk').Splunk;
    var minitest    = require('../contrib/minitest');


    minitest.context("Utility Function Tests", function() {
        this.setupTest(function(done) {
            done();
        });
        
        this.assertion("Callback#callback to object success", function(test) {
            var successfulFunction = function(callback) {
                callback(null, "one", "two");
            };
            
            successfulFunction(function(err, one, two) {
                test.assert.strictEqual(one, "one"); 
                test.assert.strictEqual(two, "two");
                test.finished();
            });
        });
        
        this.assertion("Callback#callback to object error - single argument", function(test) {
            var successfulFunction = function(callback) {
                callback("one")
            };
            
            successfulFunction(function(err, one, two) {
                test.assert.strictEqual(err, "one"); 
                test.assert.ok(!one);
                test.assert.ok(!two);
                test.finished();
            });
        });
        
        this.assertion("Callback#callback to object error - multi argument", function(test) {
            var successfulFunction = function(callback) {
                callback(["one", "two"])
            };
            
            successfulFunction(function(err, one, two) {
                test.assert.strictEqual(err[0], "one"); 
                test.assert.strictEqual(err[1], "two");
                test.assert.ok(!one);
                test.assert.ok(!two);
                test.finished();
            });
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();