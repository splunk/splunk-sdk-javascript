
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
    "use strict";
    
    var Service      = require('./service');
    var Class        = require('./jquery.class').Class;
    var utils        = require('./utils');
    var Async        = require('./async');
    var EventEmitter = require('../contrib/eventemitter').EventEmitter;
    
    var root = exports || this;
    var JobManager = null;

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    module.exports = root = JobManager = Class.extend({
        init: function(service, job, options) {
            options = options || {};
            
            this.service = service;
            this.job = job;
            this.isJobDone = false;
            this.events = new EventEmitter();
            
            this.sleep = options.hasOwnProperty("sleep") ? options.sleep : 1000;
            
            this.on              = utils.bind(this, this.on);
            this._start          = utils.bind(this, this._start);
            this.cancel          = utils.bind(this, this.cancel);
            this.isDone          = utils.bind(this, this.isDone);
            this.eventsIterator  = utils.bind(this, this.eventsIterator);
            this.resultsIterator = utils.bind(this, this.resultsIterator);
            this.previewIterator = utils.bind(this, this.previewIterator);
            
            this._start();
        },
        
        _start: function() {                        
            var that = this;
            var job = this.job;
            var properties = {};
            var stopLooping = false;
            Async.whilst(
                function() { return !stopLooping; },
                function(iterationDone) {
                    job.fetch(function(err, job) {
                        if (err) {
                            iterationDone(err);
                            return;
                        }
                        
                        properties = job.state() || {};
                        
                        // Dispatch for progress
                        that.events.emit("progress", properties);
                        
                        // Dispatch for failure if necessary
                        if (properties.isFailed) {
                            that.events.emit("fail", properties);
                        }
                        
                        stopLooping = properties.content.isDone || that.isJobDone || properties.content.isFailed;
                        Async.sleep(that.sleep, iterationDone);
                    });
                },
                function(err) {
                    that.isJobDone = true;
                    that.events.emit("done", err, that);
                }
            );
        },
        
        on: function(event, action) {
            this.events.on(event, action);  
        },
        
        cancel: function(callback) {
            this.isJobDone = true;
            this.job.cancel(callback);
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
        
        next: function(callback) {
            callback = callback || function() {};
            var iterator = this;
            var params = {
                count: this.resultsPerPage,
                offset: this.currentOffset
            };
            
            return this.endpoint(params, function(err, results) {
                if (err) {
                    callback(err);
                }
                else {
                    var numResults = (results.rows ? results.rows.length : 0);
                    iterator.currentOffset += numResults;
                    
                    callback(null, numResults > 0, results);
                }
            });
        },
        
        reset: function() {
            this.currentOffset = 0;
        }
    });
})();