
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
    
    var binding     = require('./binding');
    var Paths       = require('./paths').Paths;
    var Class       = require('./jquery.class').Class;
    var utils       = require('./utils');
    
    var root = exports || this;

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
        
        get: function(path) {
            return this._super.apply(this, arguments);
        },
        
        apps: function() {
            return new root.Collection(this, Paths.apps);
        },
        
        // Configurations
        // Capabilities
        // Deployment client
        
        deploymentServers: function() {
            return new root.Collection(this, Paths.deploymentServers);
        },
        
        deploymentServerClasses: function() {
            return new root.Collection(this, Paths.deploymentServerClasses);
        },
        
        deploymentTenants: function() {
            return new root.Collection(this, Paths.deploymentTenants);
        },
        
        eventTypes: function() {
            return new root.Collection(this, Paths.eventTypes);
        },
        
        // Indexes
        // Server info
        // Inputs

        jobs: function() {
            return new root.Jobs(this);  
        },
        
        licenseGroups: function() {
            return new root.Collection(this, Paths.licenseGroups);
        },
        
        licenseMessages: function() {
            return new root.Collection(this, Paths.licenseMessages);
        },
        
        licensePools: function() {
            return new root.Collection(this, Paths.licensePools);
        },
        
        licenseSlaves: function() {
            return new root.Collection(this, Paths.licenseSlaves);
        },
        
        licenseStacks: function() {
            return new root.Collection(this, Paths.licenseStacks);
        },
        
        licenses: function() {
            return new root.Collection(this, Paths.licenses);
        },
        
        loggers: function() {
            return new root.Collection(this, Paths.loggers);
        },
        
        // Messages
        
        passwords: function() {
            return new root.Collection(this, Paths.passwords);
        },
        
        roles: function() {
            return new root.Collection(this, Paths.roles);
        },
        
        savedSearches: function() {
            return new root.Collection(this, Paths.savedSearches, {
                item: function(collection, props) { 
                    return new root.SavedSearch(collection.service, collection.path + "/" + encodeURIComponent(props.__name));
                }
            });
        },
        
        // Settings
        
        users: function() {
            return new root.Collection(this, Paths.users);
        }
        
    });

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    root.Endpoint = Class.extend({
        init: function(service, path) {
            if (!service) {
                throw new Error("Passed in a null Service.");
            }

            if (!path) {
                throw new Error("Passed in an empty path.");
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

            this.service.get(
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

            this.service.post(
                url,
                params,
                callback
            );
        },

        del: function(relpath, params, callback) {
            var url = this.path;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            this.service.del(
                url,
                params,
                callback
            );
        }
    });
    
    root.Resource = root.Endpoint.extend({
        init: function(service, path) {
            this._super(service, path);
            this._maybeValid = false;
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._invalidate = utils.bind(this, this._invalidate);
            this._load       = utils.bind(this, this._load);
            this._validate   = utils.bind(this, this._validate);
            this.refresh     = utils.bind(this, this.refresh);
            this.isValid     = utils.bind(this, this.isValid);
            this.properties     = utils.bind(this, this.properties);
        },
        
        _invalidate: function() {
            this._maybeValid = false;
        },
        
        _load: function(properties) {
            this._maybeValid = true;
            
            this._id = properties.__id;
        },
        
        _validate: function(callback) {
            callback = callback || function() {};
            
            if (!this._maybeValid) {
                this.refresh(callback);
            }
            else {
                callback(null, this);
            }
        },
        
        refresh: function() {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        isValid: function() {
            return this._maybeValid;
        }
    });
    
    root.Entity = root.Resource.extend({
        init: function(service, path) {
            this._super(service, path);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load      = utils.bind(this, this._load);
            this.refresh    = utils.bind(this, this.refresh);
            this.properties = utils.bind(this, this.properties);
            this.read       = utils.bind(this, this.read);
            this.remove     = utils.bind(this, this.remove);
        },
        
        _load: function(properties) {
            properties = utils.isArray(properties) ? properties[0] : properties;
            
            this._super(properties);
            this._properties = properties;
        },
        
        refresh: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("", {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    that._load(response.odata.results);
                    callback(null, that);
                }
            });
        },
        
        // A prompt way to get the *current* properties of
        // an entity
        properties: function(callback) {
            return this._properties;
        },
        
        // Fetch properties of the object. This will cause
        // a refresh if we are not currently valid.
        fetch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
               if (err) {
                   callback(err);
               } 
               else {
                   callback(null, that._properties);
               }
            });
        },

        // Force a refesh of the entity, such that the returned
        // properties are guaranteed current.
        read: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.refresh(function(err) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, that._properties);
                }
            });
        },
        
        remove: function(callback) {
            this.del("", {}, callback);
        }
    });

    // A collection is just another type of endpoint that represents
    // a collection of entities
    root.Collection = root.Resource.extend({        
        init: function(service, path, handlers) {
            this._super(service, path);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load    = utils.bind(this, this._load);
            this.refresh  = utils.bind(this, this.refresh);
            this.create   = utils.bind(this, this.create);
            this.list     = utils.bind(this, this.list);
            this.contains = utils.bind(this, this.contains);
            
            var that = this;
            handlers = handlers || {};
            this._item = handlers.item || function(collection, props) { 
                return new root.Entity(collection.service, collection.path + "/" + encodeURIComponent(props.__name));
            };
            this._isSame = handlers.isSame || function(entity, id) { 
                return id === entity.properties().__name; 
            };
        },
        
        _load: function(properties) {
            this._super(properties);
            
            var entities = [];
            var entityPropertyList = properties.results || [];
            for(var i = 0; i < entityPropertyList.length; i++) {
                var props = entityPropertyList[i];
                var entity = this._item(this, props);
                entity._load(props);
                entities.push(entity);
            }
            this._entities = entities;
        },
        
        refresh: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            that.get("", {count: 0}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    that._load(response.odata);
                    callback(null, that);
                }
            });
        },

        create: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var props = response.odata.results;
                    if (utils.isArray(props)) {
                        props = props[0];
                    }
                    
                    var entity = that._item(that, props);
                    that._invalidate();
                    
                    entity.refresh(callback);
                }
            });
        },
        
        list: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, that._entities);
                }
            });
        },

        // Find whether a certain job exists
        contains: function(id, callback) {
            callback = callback || function() {};

            var that = this;
            this.list(function(err, list) {
                if (err) {
                    callback(err);
                }
                else {
                    list = list || [];
                    var found = false;
                    var foundEntity = null;
                    for(var i = 0; i < list.length; i++) {
                        // If the job is the same, then call the callback,
                        // and return
                        var entity = list[i];
                        if (that._isSame(entity, id)) {
                            found = true;
                            foundEntity = entity;
                            break;
                        }
                    }
                    
                    // If we didn't find anything, let the callback now.
                    callback(null, found, foundEntity);
                }
            });
        }
    });

    // An endpoint for all the jobs running on the current Splunk instance,
    // allowing us to create and list jobs
    root.Jobs = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.jobs, {
                item: function(collection, props) {
                    var sid = props.sid;
                    return new root.Job(collection.service, sid);
                },
                isSame: function(entity, sid) {
                    return entity.sid === sid;
                }
            });

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.create     = utils.bind(this, this.create);
        },

        // Create a search job with the given query and parameters
        create: function(query, params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.search = query; 
            
            if (!params.search) {
                callback("Must provide a query to create a search job");
            } 

            var that = this;
            this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    that._invalidate();
                    var job = new root.Job(that.service, response.odata.results.sid);
                    job.refresh(callback);
                }
            });
        }
    });
    
    root.SavedSearch = root.Entity.extend({
        init: function() {
            this._super.apply(this, arguments);
            
            this.acknowledge  = utils.bind(this, this.acknowledge);
            this.dispatch     = utils.bind(this, this.dispatch);
            this.history      = utils.bind(this, this.history);
            this.suppressInfo = utils.bind(this, this.suppressInfo);
        },
        
        acknowledge: function(callback) {
            this.post("acknowledge", {}, callback);
            this._invalidate();
        },
        
        dispatch: function(callback) {
            this.post("dispatch", {}, callback);
            this._invalidate();
        },
        
        history: function(callback) {
            this.post("history", {}, callback);
            this._invalidate();
        },
        
        suppressInfo: function(callback) {
            this.get("suppress", {}, callback);
            this._invalidate();
        }
    });

    // An endpoint for an instance of a specific search job. Allows us to perform
    // control operations on that job (such as cancelling, pausing, setting priority),
    // as well as read the job properties, results and events
    root.Job = root.Entity.extend({
        init: function(service, sid) {
            this._super(service, Paths.jobs + "/" + sid);
            this.sid = sid;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.cancel         = utils.bind(this, this.cancel);
            this.disablePreview = utils.bind(this, this.disablePreview);
            this.enablePreview  = utils.bind(this, this.enablePreview);
            this.events         = utils.bind(this, this.events);
            this.finalize       = utils.bind(this, this.finalize);
            this.pause          = utils.bind(this, this.pause);
            this.preview        = utils.bind(this, this.preview);
            this.results        = utils.bind(this, this.results);
            this.searchlog      = utils.bind(this, this.searchlog);
            this.setPriority    = utils.bind(this, this.setPriority);
            this.setTTL         = utils.bind(this, this.setTTL);
            this.summary        = utils.bind(this, this.summary);
            this.timeline       = utils.bind(this, this.timeline);
            this.touch          = utils.bind(this, this.touch);
            this.unpause        = utils.bind(this, this.unpause);
        },

        cancel: function(callback) {
            this.post("control", {action: "cancel"}, callback);
            this._invalidate();
        },

        disablePreview: function(callback) {
            this.post("control", {action: "disablepreview"}, callback);
            this._invalidate();
        },

        enablePreview: function(callback) {
            this.post("control", {action: "enablepreview"}, callback);
            this._invalidate();
        },

        events: function(params, callback) {
            callback = callback || function() {};
            this.get("events", params, function(err, response) { 
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results); 
                }
            });
        },

        finalize: function(callback) {
            this.post("control", {action: "finalize"}, callback);
            this._invalidate();
        },

        pause: function(callback) {
            this.post("control", {action: "pause"}, callback);
            this._invalidate(); 
        },

        preview: function(params, callback) {
            callback = callback || function() {};
            this.get("results_preview", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        results: function(params, callback) {
            callback = callback || function() {};
            this.get("results", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        searchlog: function(params, callback) {
            callback = callback || function() {};
            this.get("log", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        setPriority: function(value, callback) {
            this.post("control", {action: "setpriority", priority: value}, callback);
            this._invalidate();
        },

        setTTL: function(value, callback) {
            this.post("control", {action: "setttl", ttl: value}, callback);
            this._invalidate();
        },

        summary: function(params, callback) {
            this.get("summary", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        timeline: function(params, callback) {
            callback = callback || function() {};
            this.get("timeline", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        touch: function(callback) {
            this.post("control", {action: "touch"}, callback);
            this._invalidate();
        },

        unpause: function(callback) {
            this.post("control", {action: "unpause"}, callback);
            this._invalidate();
        }
    });
})();