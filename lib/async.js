
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
    var utils = require('./utils')
    var root = exports || this;

    // A definition for an asynchronous while loop. The function takes three parameters:
    // * A condition function, which takes a callback, whose only parameter is whether the condition was met or not.
    // * A body function, which takes a no-parameter callback. The callback should be invoked when the body of the loop has finished.
    // * A done function, which takes no parameter, and will be invoked when the loop has finished.
    root.whilst = function(obj, callback) {        
        callback = utils.callbackToObject(callback);
        var iterationDone = function(err) {
            if (err) {
                callback.error(err);
            }
            else {
                root.whilst(obj, callback);
            }
        };
        
        if (obj.condition()) {
            obj.body(iterationDone);
        }
        else {
            callback.success();
        }
    };

    root.sleep = function(timeout, callback) {
        setTimeout(callback, timeout);
    };
})();