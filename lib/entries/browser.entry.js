
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
    var previousSplunk = window[exportName];
    
    var ourSplunk     = require('../../index');
    var jqueryHttp    = require('../../lib/platform/client/jquery_http').JQueryHttp; 
    var proxyHttps    = require('../../lib/platform/client/proxy_http');
    var proxyHttp     = proxyHttps.ProxyHttp;
    var splunkwebHttp = proxyHttps.SplunkWebHttp;
    
    window[exportName]               = ourSplunk;
    window[exportName].ProxyHttp     = proxyHttp;
    window[exportName].JQueryHttp    = jqueryHttp;
    window[exportName].SplunkWebHttp = splunkwebHttp;
    
    // Add no conflict capabilities
    window[exportName].noConflict = function(name) {
        // Reset the window[exportName] reference
        window[exportName] = previousSplunk;
        
        return ourSplunk;
    };
    
    // Load the UI component loader
    require("../../lib/entries/browser.ui.entry");
})(__exportName);