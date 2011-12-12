
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
    // Polyfill String.prototype.trim
    String.prototype.trim = String.prototype.trim || function(delim) {
        if (delim) return this.replace(new RegExp("^[\\s" + delim + "]+"),'').replace(new RegExp("[\\s" + delim + "]+$"), '');
        else return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
    
    // Polyfill Array.prototype.indexOf
    Array.prototype.indexOf = Array.prototype.indexOf || function(search, fromIndex) {
        if (!fromIndex) fromIndex = 0;
        for(var i=0; i<this.length; i++) {
            if (this[i] === search)
                return i;
        }
        return -1;
    };
    
    var previousSplunk = window[exportName];
    
    var ourSplunk = require('../splunk').Splunk;
    var ourXDM    = require('../lib/platform/client/easyxdm_http').XdmHttp;
    var proxyHttp = require('../lib/platform/client/proxy_http').ProxyHttp;
    
    window[exportName] = ourSplunk;
    window[exportName].XdmHttp = ourXDM;
    window[exportName].ProxyHttp = proxyHttp;
    
    // Add no conflict capabilities
    window[exportName].noConflict = function(name) {
        // Reset the window[exportName] reference
        window[exportName] = previousSplunk;
        
        return ourSplunk;
    };
    
    // Load the UI component loader
    require("../entries/browser.ui.entry");
})(__exportName);