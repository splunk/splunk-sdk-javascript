
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
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var minitest    = require('../external/minitest');
    var assert      = require('assert');
    var Async       = Splunk.Async;
    var utils       = Splunk.Utils; 

    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: "http",
        host: "localhost",
        port: "8000",
        username: "itay",
        password: "changeme",
    });

    svc.login(function(success) {   
        var jobs = svc.jobs();
        jobs.create('search index=twitter | head 1', {}, utils.bind(this, function(job) {           
            // job.setTTL(1600, function() {
            //     jobs.list(function(list) {
            //         list = list || [];
            //         for(var i = 0; i < list.length; i++) {
            //             console.log("Search " + i + ": " + list[i].__name + " [sid: "+ list[i].sid + "]");
            //             console.log("Search " + i + ": " + list[i].ttl);
            //         }
            //         jobs.contains(job.sid, function(contains) {
            //             console.log("contains: " + contains); 
            //         });
            //     });
            // });
            var jobDispatchState = "";
            Async.while({
               condition: function() { return jobDispatchState !== "DONE"; },
               body: function(iteration_done) {
                   job.read(function(response) {
                       // Get the current dispatch state
                       jobDispatchState = response.odata.results.dispatchState;
                       
                       // Wait for a second
                       setTimeout(iteration_done, 1000); 
                   });
               },
               done: function() {                
                   // Once the loop is done, we try and get some results
                   job.results({count: 2}, function(data) {
                       var results = data.data || [];
                       for(var i = 0; i < results.length; i++) {
                           // This is a bit hairy, and should probably be
                           // abstracted out in some way
                           var result = results[i];
                           console.log(result._raw[0].value[0]);
                       }
                   });
               },
            });
        }));
    });
})();