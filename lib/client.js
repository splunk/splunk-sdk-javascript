/*!*/
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
    
    var Binding     = require('./binding');
    var Http        = require('./http');
    var Paths       = require('./paths').Paths;
    var Class       = require('./jquery.class').Class;
    var utils       = require('./utils');
    
    var root = exports || this;

    /**
     * Splunk.Client.Service
     * 
     * Root access point to the Splunk REST API
     *
     * This `Service` class provides "typed" access to Splunk concepts
     * such as searches, indexes, apps and more, as well as providing
     * convenience methods to authenticate and get more specialized
     * instances of the service.
     *
     * @moduleRoot Splunk.Client.Service
     * @extends Splunk.Binding.Context
     */
    root.Service = Binding.Context.extend({
        /**
         * Constructor for Splunk.Client.Service
         *
         * @constructor
         * @param {Splunk.Http} http An instance of a `Splunk.Http` class
         * @param {Object} params Dictionary of optional parameters: scheme, host, port, username, password, owner, namespace, sessionKey
         * @return {Splunk.Client.Service} A Splunk.Client.Service instance
         *
         * @module Splunk.Client.Service
         */
        init: function() {
            this._super.apply(this, arguments);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.specialize     = utils.bind(this, this.specialize);
            this.apps           = utils.bind(this, this.apps);
            this.configurations = utils.bind(this, this.configurations);
            this.indexes        = utils.bind(this, this.indexes);
            this.properties     = utils.bind(this, this.properties);
            this.savedSearches  = utils.bind(this, this.savedSearches);
            this.jobs           = utils.bind(this, this.jobs);
        },
        
        /**
         * Create a more specialized clone of this service
         *
         * This will create a more specialized version of the current `Service` instance,
         * which is useful in cases where a specific owner or app need to be specified.
         *
         * Example:
         *
         *      var svc = ...;
         *      var newService = svc.specialize("myuser", "unix");
         *
         * @param {String} owner The specialized owner of the new service
         * @param {String} namespace The specialized app of the new sevice
         * @return {Splunk.Client.Service} The specialized service.
         *
         * @module Splunk.Client.Service
         */
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
        
        /**
         * Get an instance of the Applications collection 
         *
         * The Applications collection allows you to list installed applications,
         * create new ones, etc.
         * 
         * This maps to the `apps/local` endpoint
         *
         * Example:
         *
         *      // List installed apps
         *      var apps = svc.apps();
         *      apps.list(function(err, list) { console.log(list); });
         *
         * @return {Splunk.Client.Collection} The Applications collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.Collection
         */
        apps: function() {
            return new root.Applications(this);
        },
        
        /**
         * Get an instance of the Configurations collection 
         *
         * The Configurations collection allows you to list configuration files,
         * create new files, get specific files, etc.
         * 
         * This maps to the `configs` endpoint
         *
         * Example:
         *
         *      // List all properties in the 'props.conf' file
         *      var files = svc.configurations();
         *      files.item("props", function(err, propsFile) {
         *          propsFile.read(function(err, props) {
         *              console.log(props.properties().results); 
         *          });
         *      });
         *
         * @return {Splunk.Client.Configurations} The Configurations collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.Configurations
         */
        configurations: function() {
            return new root.Configurations(this);
        },
        
        /**
         * Get an instance of the Indexes collection 
         *
         * The Indexes collection allows you to list indexes,
         * create new indexes, update indexes, etc.
         * 
         * This maps to the `data/indexes` endpoint
         *
         * Example:
         *
         *      // Check if we have an _internal index
         *      var indexes = svc.configurations();
         *      indexes.contains("_internal", function(err, found, index) {
         *          console.log("Was index found: " + true);
         *          // `index` contains the Index object.
         *      });
         *
         * @return {Splunk.Client.Indexes} The Indexes collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.Indexes
         */        
        indexes: function() { 
            return new root.Indexes(this);
        },
        
        /**
         * Get an instance of the Properties collection 
         *
         * The Properties collection allows you to list configuration files,
         * create new files, get specific files, etc.
         * 
         * This maps to the `properties` endpoint
         *
         * Example:
         *
         *      // List all properties in the 'props.conf' file
         *      var files = svc.properties();
         *      files.item("props", function(err, propsFile) {
         *          propsFile.read(function(err, props) {
         *              console.log(props.properties().results); 
         *          });
         *      });
         *
         * @return {Splunk.Client.Properties} The Properties collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.Properties
         */
        properties: function() {
            return new root.Properties(this);
        },
        
        /**
         * Get an instance of the SavedSearches collection 
         *
         * The SavedSearches collection allows you to list saved searches,
         * create new ones, update a saved search, etc.
         * 
         * This maps to the `saved/searches` endpoint
         *
         * Example:
         *
         *      // List all # of saved searches
         *      var savedSearches = svc.savedSearches();
         *      savedSearches.list(function(err, list) {
         *          console.log("# Of Saved Searches: " + list.length);
         *      });
         *
         * @return {Splunk.Client.SavedSearches} The SavedSearches collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.SavedSearches
         */
        savedSearches: function() {
            return new root.SavedSearches(this);
        },
        
        /**
         * Get an instance of the Jobs collection 
         *
         * The SavedSearches collection allows you to list jobs,
         * create new ones, get a specific job, etc.
         * 
         * This maps to the `search/jobs` endpoint
         *
         * Example:
         *
         *      // List all job IDs
         *      var jobs = svc.jobs();
         *      jobs.list(function(err, list) {
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("Job " + (i+1) + ": " + list[i].sid);
         *          }
         *      });
         *
         * @return {Splunk.Client.Jobs} The Jobs collection
         *
         * @module Splunk.Client.Service
         * @see Splunk.Client.Jobs
         */
        jobs: function() {
            return new root.Jobs(this);  
        }
    });

    /**
     * Splunk.Client.Endpoint
     * 
     * Base definition for a Splunk endpoint (specific service + path combination).
     *
     * This `Endpoint` class provides convenience methods for the three HTTP verbs
     * used in Splunk. It will automatically prepare the path correctly, and allows
     * for relative calls.
     *
     * @moduleRoot Splunk.Client.Endpoint
     * @see Splunk.Client.Service
     */
    root.Endpoint = Class.extend({
        /**
         * Constructor for Splunk.Client.Endpoint
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @return {Splunk.Client.Endpoint} A Splunk.Client.Endpoint instance
         *
         * @module Splunk.Client.Endpoint
         */
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

        /**
         * Perform a relative GET request
         *
         * Perform a relative GET request on this endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * Example:
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/results?offset=1
         *      var endpoint = new Splunk.Client.Endpoint(service, "search/jobs/12345");
         *      endpoint.get("results", {offset: 1}, function() { console.log("DONE"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module Splunk.Client.Endpoint
         */
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

        /**
         * Perform a relative POST request
         *
         * Perform a relative POST request on this endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * Example:
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/control
         *      var endpoint = new Splunk.Client.Endpoint(service, "search/jobs/12345");
         *      endpoint.post("control", {action: "cancel"}, function() { console.log("CANCELLED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the body
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module Splunk.Client.Endpoint
         */
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

        /**
         * Perform a relative DELETE request
         *
         * Perform a relative DELETE request on this endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * Example:
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456
         *      var endpoint = new Splunk.Client.Endpoint(service, "search/jobs/12345");
         *      endpoint.delete("", {}, function() { console.log("DELETED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module Splunk.Client.Endpoint
         */
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
    
    /**
     * Splunk.Client.Resource
     * 
     * Base definition for a Splunk "resource" (e.g. index, jobs, etc)
     *
     * This `Resource` class provides basic methods for handling Splunk resources, such
     * as validation, property accessor, etc. This class should not be used directly,
     * as most methods are meant to be overridden.
     *
     * @moduleRoot Splunk.Client.Resource
     * @extends Splunk.Client.Endpoint
     */
    root.Resource = root.Endpoint.extend({
        /**
         * Constructor for Splunk.Client.Resource
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @return {Splunk.Client.Resource} A Splunk.Client.Resource instance
         *
         * @module Splunk.Client.Resource
         */
        init: function(service, path) {
            this._super(service, path);
            this._maybeValid = false;
            this._properties = {};
            
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
        
        /**
         * Mark the resource as in an invalid state
         *
         * @module Splunk.Client.Resource
         * @private
         */
        _invalidate: function() {
            this._maybeValid = false;
        },
        
        /**
         * Load the resource and mark it as valid, also storing the properties.
         *
         * @param {Object} properties The properties for this resource
         *
         * @module Splunk.Client.Resource
         * @protected
         */
        _load: function(properties) {
            this._maybeValid = true;
            this._properties = properties;
        },
        
        /**
         * Validate if the resource is in a valid state, 
         * and refresh it if it is not.
         *
         * @param {Function} callback A callback when the object is valid: `(err, resource)`
         *
         * @module Splunk.Client.Resource
         * @private
         */
        _validate: function(callback) {
            callback = callback || function() {};
            
            if (!this._maybeValid) {
                this.refresh(callback);
            }
            else {
                callback(null, this);
            }
        },
        
        /**
         * Unconditionally refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up, regardless of whether it is valid or not.
         *
         * @param {Function} callback A callback when the object is valid: `(err, resource)`
         *
         * @module Splunk.Client.Resource
         * @protected
         */
        refresh: function(callback) {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Check whether the resource is in a valid state.
         *
         * @return {Boolean} Is this resource valid
         *
         * @module Splunk.Client.Resource
         */
        isValid: function() {
            return this._maybeValid;
        },
        
        /**
         * Retrieve the properties for this resource
         *
         * This will retrieve the current properties for this
         * resource, whether or not they are valid.
         *
         * @return {Object} The properties for this resource
         *
         * @module Splunk.Client.Resource
         */
        properties: function(callback) {
            return this._properties;
        },
        
        /**
         * Conditionally refresh the resource
         *
         * This will conditionally refresh the object from the server,
         * only if it is not in a valid state.
         *
         * @param {Function} callback A callback when the object is valid: `(err, resource)`
         *
         * @module Splunk.Client.Resource
         * @protected
         */
        read: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
                callback(err, that);
            });
        }
    });
    
    /**
     * Splunk.Client.Entity
     * 
     * Base class for a Splunk "entity", which is a well defined construct
     * with certain operations (like "properties", "update", "delete").
     *
     * This `Entity` class provides basic methods for handling Splunk entities, 
     * such as refreshing them, updating, etc.
     *
     * @moduleRoot Splunk.Client.Entity
     * @extends Splunk.Client.Resource
     */
    root.Entity = root.Resource.extend({
        /**
         * Constructor for Splunk.Client.Entity
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @return {Splunk.Client.Entity} A Splunk.Client.Entity instance
         *
         * @module Splunk.Client.Entity
         */
        init: function(service, path) {
            this._super(service, path);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load      = utils.bind(this, this._load);
            this.refresh    = utils.bind(this, this.refresh);
            this.remove     = utils.bind(this, this.remove);
            this.update     = utils.bind(this, this.update);
        },
        
        /**
         * Load the resource and mark it as valid, also storing the properties.    
         *
         * @param {Object} properties The properties for this resource
         *
         * @module Splunk.Client.Entity
         * @protected
         */
        _load: function(properties) {
            properties = utils.isArray(properties) ? properties[0] : properties;
            
            this._super(properties);
        },
        
        /**
         * Unconditionally refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up, regardless of whether it is valid or not.
         *
         * @param {Function} callback A callback when the object is valid: `(err, resource)`
         *
         * @module Splunk.Client.Entity
         */
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
        
        /**
         * Delete the entity
         *
         * This will tell the server to delete this entity.
         *
         * @param {Function} callback A callback when the object is deleted: `(err)`
         *
         * @module Splunk.Client.Entity
         * @protected
         */
        remove: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.del("", {}, function() {
                callback();
            });
        },
        
        /**
         * Update the entity
         *
         * This will update the entity on the server.
         *
         * @param {Object} props Properties to be updated the object with.
         * @param {Function} callback A callback when the object is deleted: `(err)`
         *
         * @module Splunk.Client.Entity
         * @protected
         */
        update: function(props, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("", props, function(err) {
                callback(err, that);
            });
            
            this._invalidate();
        }
    });

    /**
     * Splunk.Client.Collection
     * 
     * Base class for a Splunk "collection", which is a well defined construct
     * with certain operations (like "list", "create", etc).
     *
     * This `Collection` class provides basic methods for handling Splunk entity 
     * collection, such as creating an entity, listing entities, etc.
     *
     * @moduleRoot Splunk.Client.Collection
     * @extends Splunk.Client.Resource
     */
    root.Collection = root.Resource.extend({   
        /**
         * Constructor for Splunk.Client.Collection
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} handlers A dictionary of functions to perform specialized operations: item, isSame, loadOnCreate, loadOnItem
         * @return {Splunk.Client.Collection} A Splunk.Client.Collection instance
         *
         * @module Splunk.Client.Collection
         */     
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
                throw new Error("SHOULD NEVER BE CALLED!");
                //return new root.Entity(collection.service, collection.path + "/" + encodeURIComponent(props.__name));
            };
            this._isSame = handlers.isSame || function(entity, id) { 
                return id === entity.properties().__name;
            };
            this._loadOnCreate = handlers.loadOnCreate || function() { return false; };
            this._loadOnItem = handlers.loadOnItem || function() { return true; };
            
        },
        
        /**
         * Load the resource and mark it as valid, also storing the properties.    
         *
         * This will load the properties as well as create a map between entity
         * names to entity IDs (for retrieval purposes).
         *
         * @param {Object} properties The properties for this resource
         *
         * @module Splunk.Client.Collection
         * @private
         */
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
        
        /**
         * Unconditionally refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up, regardless of whether it is valid or not.
         *
         * @param {Function} callback A callback when the object is valid: `(err, resource)`
         *
         * @module Splunk.Client.Collection
         */
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
        
        /**
         * Fetch a specific entity.
         *
         * Return a specific entity given its name. This will fetch the list
         * of entities from the server if the collection is not in a valid state.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.item("search", function(err, app) {
         *          console.log(app.properties());
         *      })
         *
         * @param {String} name The name of the entity to retrieve
         * @param {Function} callback A callback with the specified entity: `(err, resource)`
         *
         * @module Splunk.Client.Collection
         */
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
        
        /**
         * Create an entity for this collection.
         *
         * Create an entity on the server for this collection with the specified
         * parameters.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.create({name: "NewSearchApp"}, function(err, newApp) {
         *          console.log("CREATED");
         *      });
         *
         * @param {Object} params A dictionary of properties to create the entity with.
         * @param {Function} callback A callback with the created entity: `(err, createdEntity)`
         *
         * @module Splunk.Client.Collection
         */
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
        
        /**
         * Retrieve a list of all entities in the collection
         *
         * Return the list of all the entities in this collection, fetching them
         * from the server if the collection is not in a valid state.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.list(function(err, appList) {
         *          console.log(appList.length);
         *      });
         *
         * @param {Function} callback A callback with the list of entities: `(err, list)`
         *
         * @module Splunk.Client.Collection
         */
        list: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
                callback(err, that._entities);
            });
        },
        
        /**
         * Check whether a specific entity exists
         *
         * Check to see if the collection contains a specific entity, and if so,
         * return that entity.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.contains("search", function(err, found, searchApp) {
         *          console.log("Search App Found: " + found);
         *      });
         *
         * @param {String} name The name of the entity to retrieve
         * @param {Function} callback A callback with whether the entity was found: `(err, wasFound, entity)`
         *
         * @module Splunk.Client.Collection
         */
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
    
    /*!*/
    root.SavedSearches = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.savedSearches, {
                item: function(collection, props) { 
                    return new root.SavedSearch(collection.service, props.__name);
                }
            });
        } 
    });
    
    root.SavedSearch = root.Entity.extend({
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.savedSearches + "/" + encodeURIComponent(name));
            
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
    
    root.Applications = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.apps, {
                item: function(collection, props) {
                    return new root.Application(collection.service, props.__name);
                }
            });
        }
    });
    
    root.Application = root.Entity.extend({
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.apps + "/" + encodeURIComponent(name));
            
            this.setup             = utils.bind(this, this.setup);
            this.updateApplication = utils.bind(this, this.updateApplication);
        },
        
        setup: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("setup", {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.odata.results, that);
                }
            });
        },
        
        updateApplication: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("update", {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.odata.results, that);
                }
            });
        }
    });
    
    root.Indexes = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.indexes, {
                item: function(collection, props) {
                    return new root.Index(collection.service, props.__name);  
                },
                loadOnCreate: function() { return true; },
                loadOnItem: function() { return true; }
            });
        },
        
        create: function(name, params, callback) {
            params = params || {};
            params["name"] = name;
            
            this._super(params, callback);
        }
    });
    
    root.Index = root.Entity.extend({
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.indexes + "/" + encodeURIComponent(name));
            
            this.submitEvent = utils.bind(this, this.submitEvent);
        },
        
        submitEvent: function(event, params, callback) {
            callback = callback || function() {};
            params = params || {};
            
            // Add the index name to the parameters
            params["index"] = this.name;
            
            var path = Paths.submitEvent + "?" + Http.encode(params);
            var method = "POST";
            var headers = {};
            var body = event;
            
            var that = this;
            this.service.request(path, method, headers, body, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.odata.results, that);
                }
            });
            this._invalidate();
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
            this.name = name;
            this._super(service, Paths.properties + "/" + encodeURIComponent(name), {
                item: function(collection, props) {
                    var name = props.__name;
                    return new root.PropertyStanza(collection.service, collection.name, name);
                },
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
                    var entity = new root.PropertyStanza(that.service, that.name, stanzaName);
                    callback(null, entity);
                }
            });
        }
    });
    
    root.PropertyStanza = root.Entity.extend({
        init: function(service, file, name) {
            this.name = name;
            this._super(service, Paths.properties + "/" + encodeURIComponent(file) + "/" + encodeURIComponent(name));
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
            this.name = name;
            var path = Paths.configurations + "/conf-" + encodeURIComponent(name);
            this._super(service, path, {
                item: function(collection, props) {
                    var name = props.__name;
                    return new root.ConfigurationStanza(collection.service, collection.name, name);
                },
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
    
    root.ConfigurationStanza = root.Entity.extend({
        init: function(service, file, name) {
            this.name = name;
            this._super(service, Paths.configurations + "/conf-" + encodeURIComponent(file) + "/" + encodeURIComponent(name));
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
            
            var that = this;
            this.get("events", params, function(err, response) { 
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results, that); 
                }
            });
        },

        finalize: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "finalize"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        pause: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "pause"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        preview: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("results_preview", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results, that);
                }
            });
        },

        results: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("results", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results, that);
                }
            });
        },

        searchlog: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("search.log", {}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results.log, that);
                }
            });
        },

        setPriority: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "setpriority", priority: value}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        setTTL: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "setttl", ttl: value}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        summary: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("summary", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results, that);
                }
            });
        },

        timeline: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("timeline", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results, that);
                }
            });
        },

        touch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "touch"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        unpause: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "unpause"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        }
    });
})();