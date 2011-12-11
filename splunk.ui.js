
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
    var $script = require('./contrib/script');
    
    var root = exports || this;
    
    var token = 0;

    root.SplunkUI = {};
        
    var loadComponent = function(path, token, callback) {
        if (!path) {
            throw new Error("Must specify a path to load from.");
        }
        
        callback = callback || function() {};
        
        $script(path, token, callback);
    };
    
    root.SplunkUI.loadTimeline = function(path, callback) {
        var token = 'timeline' + (token++);
        loadComponent(path, token, callback);
        return token;
    }
    
    root.SplunkUI.loadCharting = function(path, callback) {
        var token = 'charting' + (token++);
        loadComponent(path, token, callback);
        return token;
    }
    
    root.SplunkUI.load = function(paths, callback) {
        if (!paths) {
            throw new Error("Must specify paths to load components from");
        }  
        
        callback = callback || function() {};
        var token = "all" + (token++);
        $script(paths, token, function() {
            callback();
        });
        
        return token;
    };
    
    root.SplunkUI.ready = function(token, callback) {
        callback = callback || function() {};
        $script.ready(token, callback);
    }
})();