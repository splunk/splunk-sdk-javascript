
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
    var client  = require('./client');
    var Class   = require('./jquery.class').Class;
    var Promise = require('./promise').Promise;
    
    var root = exports || this;

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    root.JobManager = Class.extend({
        init: function(service, job) {
            this.service = service;
            this.job = job;
            this.isJobDone = false;
        },
        
        done: function() {
            if (this.donePromise) {
                return this.donePromise;
            }
            
            var manager = this;
            var job = this.job;
            var properties = {};
            this.donePromise = Promise.while({
                condition: function() { return properties.dispatchState !== "DONE" && !manager.isJobDone; },
                body: function(index) {
                    return job.read().whenResolved(function(response) {
                        properties = response.odata.results;
                        return Promise.sleep(1000); 
                    });
                },
                progress: function(index) {
                    return properties;
                }
            });
            
            this.donePromise.when(
                function() {
                    manager.isJobDone = true;
                },
                function() {
                    manager.isJobDone = true;
                }
            );
            
            return this.donePromise;
        },
        
        cancel: function() {
            this.job.cancel();
            this.isJobDone = true;
        },
        
        isDone: function() {
            return this.isJobDone;
        },
        
        eventsIterator: function(resultsPerPage) {
            return new root.Iterator(this, this.job.events, resultsPerPage);  
        },
        
        resultsIterator: function(resultsPerPage) {
            return new root.Iterator(this, this.job.results, resultsPerPage);  
        },
        
        previewIterator: function(resultsPerPage) {
            return new root.Iterator(this, this.job.preview, resultsPerPage);  
        }
    });
    
    root.Iterator = Class.extend({
        init: function(manager, endpoint, resultsPerPage) {
            this.manager = manager;
            this.endpoint = endpoint;
            this.resultsPerPage = resultsPerPage || 0;
            this.currentOffset = 0;
        },
        
        next: function() {
            var iterator = this;
            var params = {
                count: this.resultsPerPage,
                offset: this.currentOffset
            }
            
            return this.endpoint(params).whenResolved(function(results) {
                var numResults = (results.data ? results.data.length : 0);
                iterator.currentOffset += numResults;
                
                return Promise.Success(numResults > 0, results);
            });
        },
        
        reset: function() {
            this.currentOffset = 0;
        }
    });
})();