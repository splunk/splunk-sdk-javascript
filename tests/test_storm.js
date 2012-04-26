
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

exports.setup = function(http) {
    var splunkjs    = require('../splunk');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    
    var token = "p-n8SwuWEqPlyOXdDU4PjxavFdAn1CnJea9LirgTvzmIhMEBys6w7UJUCtxp_7g7Q9XopR5dW0w=";
    var project = "0e8a2df0834211e1a6fe123139335741";
    var svc = null;
    
    if (http) {
        svc = new splunkjs.StormService(http, {token: token});
    }
    else {
        svc = new splunkjs.StormService({token: token});
    }

    return {
        "Storm Input Tests": {
            setUp: function(finished) {
                this.service = svc;
                finished();
            },
            
            "Callback#Submit event no index error 1": function(test) {
                var didFail = false;
                try {
                    this.service.log("SHOULDNT WORK", {sourcetype: "sdk-test"}, function(err) {
                        test.ok(false);
                    });
                }
                catch(ex) {
                    didFail = true;
                }
                
                test.ok(didFail);
                test.done();
            },
            
            "Callback#Submit event no index error 2": function(test) {
                var didFail = false;
                try {
                    this.service.log("SHOULDNT WORK", function(err) {
                        test.ok(false);
                    });
                } 
                catch(ex) {
                    didFail = true;
                }
                
                test.ok(didFail);
                test.done();
            },
            
            "Callback#Submit event text": function(test) {
                var didFail = false;
                var message = "GO GO SDK -- " + getNextId();
                this.service.log(message, {sourcetype: "sdk-test", project: project}, function(err, data) {
                    test.ok(!err);
                    test.strictEqual(data.length, message.length);
                    test.done();
                });
            },
            
            "Callback#Submit event json": function(test) {
                var didFail = false;
                var message = { id: getNextId() };
                this.service.log(message, {sourcetype: "json", project: project}, function(err, data) {
                    test.ok(!err);
                    test.strictEqual(data.length, JSON.stringify(message).length);
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var suite       = exports.setup();
    var test        = require('../contrib/nodeunit/test_reporter');
    
    test.run([{"Tests": suite}]);
}