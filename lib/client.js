
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
            this.clone      = utils.bind(this, this.clone);
        },
        
        specialize: function(owner, namespace) {
            return new root.Service(this.http, {
                scheme: this.scheme,
                host: this.host,   
                port: this.port,       
                username: this.username,
                password: this.password,
                owner: owner,
                namespace: namespace, 
                sessionKey: this.sessionKey
            });
        },
        
        apps: function() {
            return new root.Collection(this, Paths.apps);
        },
        
        configurations: function() {
            return new root.Configurations(this);
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
        
        properties: function() {
            return new root.Properties(this);
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
            this.read        = utils.bind(this, this.read);
            this.isValid     = utils.bind(this, this.isValid);
            this.properties  = utils.bind(this, this.properties);
        },
        
        _invalidate: function() {
            this._maybeValid = false;
        },
        
        _load: function(properties) {
            this._maybeValid = true;
            this._properties = properties;
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
        },
        
        // A prompt way to get the *current* properties of
        // an entity
        properties: function(callback) {
            return this._properties;
        },
        
        // Fetch properties of the object. This will cause
        // a refresh if we are not currently valid.
        read: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
               if (err) {
                   callback(err);
               } 
               else {
                   callback(null, that);
               }
            });
        },
    });
    
    root.Entity = root.Resource.extend({
        init: function(service, path) {
            this._super(service, path);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load      = utils.bind(this, this._load);
            this.refresh    = utils.bind(this, this.refresh);
            this.remove     = utils.bind(this, this.remove);
            this.update     = utils.bind(this, this.update);
        },
        
        _load: function(properties) {
            properties = utils.isArray(properties) ? properties[0] : properties;
            
            this._super(properties);
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
        
        remove: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.del("", {}, function() {
                callback();
            });
        },
        
        update: function(props, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", props, function(err) {
                callback(err, that);
            });
            
            this._invalidate();
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
            this.item     = utils.bind(this, this.item);
            
            var that = this;
            handlers = handlers || {};
            this._item = handlers.item || function(collection, props) { 
                return new root.Entity(collection.service, collection.path + "/" + encodeURIComponent(props.__name));
            };
            this._isSame = handlers.isSame || function(entity, id) { 
                return id === entity.properties().__name;
            };
            this._loadOnCreate = handlers.loadOnCreate || function() { return false; };
            this._loadOnItem = handlers.loadOnItem || function() { return true; };
            
        },
        
        _load: function(properties) {
            this._super(properties);
            
            var entities = [];
            var entitiesByName = {};
            var entityPropertyList = properties.results || [];
            for(var i = 0; i < entityPropertyList.length; i++) {
                var props = entityPropertyList[i];
                var entity = this._item(this, props);
                entity._load(props);
                
                // If we don't want to load when we see the item,
                // we still load it (to get things like ID/name),
                // and just invalidate it
                if (!this._loadOnItem()) {
                    entity._invalidate();
                }
                entities.push(entity);
                entitiesByName[props.__name] = entity;
            }
            this._entities = entities;
            this._entitiesByName = entitiesByName;
        },
        
        item: function(name, callback) {
            callback = callback || function() {};
            var that = this;
            this._validate(function(err) {
                if (err) {
                    callback(err);
                } 
                else {            
                    if (that._entitiesByName.hasOwnProperty(name)) {
                        callback(null, that._entitiesByName[name]);
                    }  
                    else {
                        callback(new Error("No entity with name: " + name));
                    }
                }
            });

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
                    entity._load(props);
                    if (!that._loadOnCreate()) {
                        that._invalidate();
                    }
                    
                    callback(null, entity);
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
    
    root.Properties = root.Collection.extend({
        init: function(service) {
           this._super(service, Paths.properties, {
               item: function(collection, props) {
                   var name = props.__name;
                   return new root.PropertyFile(collection.service, name);
               },
               loadOnItem: function() { return false; }
           });  
        },

        create: function(filename, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", {__conf: filename}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.PropertyFile(that.service, filename);
                    callback(null, entity);
                }
            });
        }
    });
    
    root.PropertyFile = root.Collection.extend({
        init: function(service, name) {
            this._super(service, Paths.properties + "/" + encodeURIComponent(name), {
                loadOnItem: function() { return false; }
            });
        },
        
        create: function(stanzaName, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", {__stanza: stanzaName}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.Entity(that.service, that.path + "/" + stanzaName);
                    callback(null, entity);
                }
            });
        }
    });
    
    root.Configurations = root.Collection.extend({
        init: function(service) {
           this._super(service, Paths.properties, {
               item: function(collection, props) {
                   var name = props.__name;
                   return new root.ConfigurationFile(collection.service, name);
               },
               loadOnItem: function() { return false; }
           });  
        },

        create: function(filename, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", {__conf: filename}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.ConfigurationFile(that.service, filename);
                    callback(null, entity);
                }
            });
        }
    });
    
    root.ConfigurationFile = root.Collection.extend({
        init: function(service, name) {
            var path = Paths.configurations + "/conf-" + encodeURIComponent(name);
            this._super(service, path, {
                loadOnCreate: function() { return true; }
            });
        },
        
        create: function(stanzaName, values, callback) {
            if (utils.isFunction(values) && !callback) {
                callback = values;
                values = {};
            }
            
            values = values || {};
            values["name"] = stanzaName;
            
            this._super(values, callback);
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
                    callback(null, job);
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
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "disablepreview"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        enablePreview: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "enablepreview"}, function(err) {
                callback(err, that);
            });
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