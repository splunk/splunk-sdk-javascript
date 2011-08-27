
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
    var binding = require('./binding');
    var Paths   = require('./paths').Paths;
    var Class   = require('./jquery.class').Class;
    var utils   = require('./utils');
    
    var root = exports || this;

    // All our error callbacks follow this pattern
    var generalErrorHandler = function(callbackObj) {
        return function() {
            callbackObj.error.apply(null, arguments);
            return arguments;      
        };
    };

    // From here on we start the definition of a client-level API.
    // It is still stateless, but provides reasonable convenience methods
    // in order to access higher-level Splunk functionality (such as
    // jobs and indices).

    // A service is the root of context for the Splunk RESTful API.
    // It defines the host and login information, and makes all the 
    // request using that context.
    root.Service = binding.Context.extend({
        init: function() {
            this._super.apply(this, arguments);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.jobs       = utils.bind(this, this.jobs);
        },

        jobs: function() {
            return new root.Jobs(this);  
        }
    });

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    root.Endpoint = Class.extend({
        init: function(service, path) {
            if (!service) {
                console.log("Passed in a null Service.");
                return;
            }

            if (!path) {
                console.log("Passed in an empty path.");
                return;
            }

            this.service = service;
            this.path = path;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get    = utils.bind(this, this.get);
            this.post   = utils.bind(this, this.post);
        },

        get: function(relpath, params, callback) {
            var url = this.path;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            return this.service.get(
                url,
                params,
                callback
            );
        },

        post: function(relpath, params, callback) {
            var url = this.path;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            return this.service.post(
                url,
                params,
                callback
            );
        }
    });

    // A collection is just another type of endpoint that represents
    // a collection of entities
    root.Collection = root.Endpoint.extend({
        
    });

    // An endpoint for all the jobs running on the current Splunk instance,
    // allowing us to create and list jobs
    root.Jobs = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.jobs);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.create     = utils.bind(this, this.create);
            this.list       = utils.bind(this, this.list);
            this.contains   = utils.bind(this, this.contains);
         },

        
        // Create a search job with the given query and parameters
        create: function(query, params, callback) {
            if (!query) {
                throw "Must provide a query to create a search job";
            }

            callback = utils.callbackToObject(callback);

            params.search = query;  

            return this.post("", params).when(
                utils.bind(this, function(response) {
                    var job = new root.Job(this.service, response.odata.results.sid);
                    callback.success(job);
                    return job;
                }),
                generalErrorHandler(callback)
            );
         },

         // List all search jobs
        list: function(callback) {
            callback = utils.callbackToObject(callback);

            return this.get("", {}).when(
                function(response) {
                    var job_list = response.odata.results;
                    callback.success(job_list);
                    return job_list;
                },
                generalErrorHandler(callback)
            );
        },

        // Find whether a certain job exists
        contains: function(sid, callback) {
            callback = utils.callbackToObject(callback);

            return this.list().when(
                function(list) {
                    list = list || [];
                    var found = false;
                    for(var i = 0; i < list.length; i++) {
                        // If the job is the same, then call the callback,
                        // and return
                        if (list[i].sid === sid) {
                            found = true;
                            break;
                        }
                    }
                    
                    // If we didn't find anything, let the callback now.
                    callback.success(found);
                    return found;
                },
                generalErrorHandler(callback)
            );
        }
    });

    // An endpoint for an instance of a specific search job. Allows us to perform
    // control operations on that job (such as cancelling, pausing, setting priority),
    // as well as read the job properties, results and events
    root.Job = root.Endpoint.extend({
        init: function(service, sid) {
            this._super(service, Paths.job + sid);
            this.sid = sid;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.read = utils.bind(this, this.read);
        },

        cancel: function(callback) {
            return this.post("control", {action: "cancel"}, callback);
        },

        disablePreview: function(callback) {
            return this.post("control", {action: "disablepreview"}, callback);  
        },

        enablePreview: function(callback) {
            return this.post("control", {action: "enablepreview"}, callback);  
        },

        events: function(params, callback) {
            return this.get("events", params, function(response) { callback(response.odata.results); });
        },

        finalize: function(callback) {
            return this.post("control", {action: "finalize"}, callback);  
        },

        pause: function(callback) {
            return this.post("control", {action: "pause"}, callback);  
        },

        preview: function(params, callback) {
            callback = utils.callbackToObject(callback);
            return this.get("results_preview", params).when(
                function(response) {
                    callback.success(response.odata.results);
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
        },

        read: function(callback) {
            return this.get("", {}, callback);
        },

        results: function(params, callback) {
            callback = utils.callbackToObject(callback);
            return this.get("results", params).when(
                function(response) {
                    callback.success(response.odata.results);
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
        },

        searchlog: function(params, callback) {
            callback = utils.callbackToObject(callback);
            return this.get("search.log", params).when(
                function(response) {
                    callback.success(response.odata.results);
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
        },

        setPriority: function(value, callback) {
            return this.post("control", {action: "setpriority", priority: value}, callback);  
        },

        setTTL: function(value, callback) {
            return this.post("control", {action: "setttl", ttl: value}, callback);  
        },

        summary: function(params, callback) {
            return this.get("summary", params).when(
                function(response) {
                    callback.success(response.odata.results);
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
        },

        timeline: function(params, callback) {
            callback = utils.callbackToObject(callback);
            return this.get("timeline", params).when(
                function(response) {
                    callback.success(response.odata.results);
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
        },

        touch: function(callback) {
            return this.post("control", {action: "touch"}, callback);  
        },

        unpause: function(callback) {
            return this.post("control", {action: "unpause"}, callback);  
        }
    });
})();