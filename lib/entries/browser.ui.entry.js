
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

// This file is the entry point for client-side code, so it "exports" the
// important functionality to the "window", such that others can easily
// include it.

(function(exportName) {
    var $script = require('../../contrib/script');
    
    if (!window[exportName]) {
        window[exportName] = {};
    }
    
    if (!window[exportName].UI) {
        window[exportName].UI = {};
    }
    
    var UI = window[exportName].UI;
    
    var root = exports || this;
    
    var token = 0;
        
    var loadComponent = function(path, token, callback) {
        if (!path) {
            throw new Error("Must specify a path to load from.");
        }
        
        callback = callback || function() {};
        
        $script(path, token, callback);
    };
    
    UI.loadTimeline = function(path, callback) {
        var timelineToken = 'timeline' + (token++);
        loadComponent(path, timelineToken, callback);
        return timelineToken;
    };
    
    UI.loadCharting = function(path, callback) {
        var chartToken = 'charting' + (token++);
        loadComponent(path, chartToken, callback);
        return chartToken;
    };
    
    UI.load = function(paths, callback) {
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
    
    UI.ready = function(token, callback) {
        callback = callback || function() {};
        $script.ready(token, callback);
    };
})(__exportName);