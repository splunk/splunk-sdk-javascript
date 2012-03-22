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
    
    var Context     = require('./context');
    var Http        = require('./http');
    var Async       = require('./async');
    var Paths       = require('./paths').Paths;
    var Class       = require('./jquery.class').Class;
    var utils       = require('./utils');
    
    var root = exports || this;
    var Service = null;

    /**
     * splunkjs.Service
     * 
     * Root access point to the Splunk REST API
     *
     * This `Service` class provides "typed" access to Splunk concepts
     * such as searches, indexes, apps and more, as well as providing
     * convenience methods to authenticate and get more specialized
     * instances of the service.
     *
     * @moduleRoot splunkjs.Service
     * @extends splunkjs.Context
     */
    module.exports = root = Service = Context.extend({
        /**
         * Constructor for splunkjs.Service
         *
         * @constructor
         * @param {splunkjs.Http} http An instance of a `splunkjs.Http` class
         * @param {Object} params Dictionary of optional parameters: scheme, host, port, username, password, owner, app, sessionKey
         * @return {splunkjs.Service} A splunkjs.Service instance
         *
         * @module splunkjs.Service
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
            this.users          = utils.bind(this, this.users);
            this.currentUser    = utils.bind(this, this.currentUser);
            this.views          = utils.bind(this, this.views);
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
         * @param {String} app The specialized app of the new sevice
         * @return {splunkjs.Service} The specialized service.
         *
         * @module splunkjs.Service
         */
        specialize: function(owner, app) {
            return new Service(this.http, {
                scheme: this.scheme,
                host: this.host,   
                port: this.port,       
                username: this.username,
                password: this.password,
                owner: owner,
                app: app, 
                sessionKey: this.sessionKey
            });
        },
        
        /**
         * Get an instance of the Applications collection 
         *
         * The Applications collection allows you to list installed applications,
         * create new ones, etc.
         *
         * Example:
         *
         *      // List installed apps
         *      var apps = svc.apps();
         *      apps.refresh(function(err) { console.log(apps.list()); });
         *
         * @return {splunkjs.Service.Collection} The Applications collection
         *
         * @endpoint apps/local
         * @module splunkjs.Service
         * @see splunkjs.Service.Collection
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
         * Example:
         *
         *      // List all properties in the 'props.conf' file
         *      var files = svc.configurations();
         *      files.item("props", function(err, propsFile) {
         *          propsFile.refresh(function(err, props) {
         *              console.log(props.properties().content); 
         *          });
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Configurations} The Configurations collection
         *
         * @endpoint configs
         * @module splunkjs.Service
         * @see splunkjs.Service.Configurations
         */
        configurations: function(namespace) {
            return new root.Configurations(this, namespace);
        },
        
        /**
         * Get an instance of the Indexes collection 
         *
         * The Indexes collection allows you to list indexes,
         * create new indexes, update indexes, etc.
         *
         * Example:
         *
         *      // Check if we have an _internal index
         *      var indexes = svc.configurations();
         *      indexes.refresh(function(err, indexes) {
         *          var index = indexes.contains("_internal");
         *          console.log("Was index found: " + !!index);
         *          // `index` contains the Index object.
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Indexes} The Indexes collection
         *
         * @endpoint data/indexes
         * @module splunkjs.Service
         * @see splunkjs.Service.Indexes
         */        
        indexes: function(namespace) { 
            return new root.Indexes(this, namespace);
        },
        
        /**
         * Get an instance of the Properties collection 
         *
         * The Properties collection allows you to list configuration files,
         * create new files, get specific files, etc.
         *
         * Example:
         *
         *      // List all properties in the 'props.conf' file
         *      var files = svc.properties();
         *      files.item("props", function(err, propsFile) {
         *          propsFile.refresh(function(err, props) {
         *              console.log(props.properties().content); 
         *          });
         *      });
         *
         * @return {splunkjs.Service.Properties} The Properties collection
         *
         * @endpoint properties
         * @module splunkjs.Service
         * @see splunkjs.Service.Properties
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
         * Example:
         *
         *      // List all # of saved searches
         *      var savedSearches = svc.savedSearches();
         *      savedSearches.refresh(function(err, savedSearches) {
         *          console.log("# Of Saved Searches: " + savedSearches.list().length);
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.SavedSearches} The SavedSearches collection
         *
         * @endpoint saved/searches
         * @module splunkjs.Service
         * @see splunkjs.Service.SavedSearches
         */
        savedSearches: function(namespace) {
            return new root.SavedSearches(this, namespace);
        },
        
        /**
         * Get an instance of the Jobs collection 
         *
         * The Jobs collection allows you to list jobs,
         * create new ones, get a specific job, etc.
         *
         * Example:
         *
         *      // List all job IDs
         *      var jobs = svc.jobs();
         *      jobs.refresh(function(err, jobs) {
         *          var list = jobs.list();
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("Job " + (i+1) + ": " + list[i].sid);
         *          }
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Jobs} The Jobs collection
         *
         * @endpoint search/jobs
         * @module splunkjs.Service
         * @see splunkjs.Service.Jobs
         */
        jobs: function(namespace) {
            return new root.Jobs(this, namespace);  
        },
        
        /**
         * Get an instance of the Users collection 
         *
         * The Users collection allows you to list users,
         * create new ones, get a specific user, etc.
         *
         * Example:
         *
         *      // List all usernames
         *      var users = svc.users();
         *      users.refresh(function(err, users) {
         *          var list = users.list();
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("User " + (i+1) + ": " + list[i].properties().name);
         *          }
         *      });
         *
         * @return {splunkjs.Service.Users} The Users collection
         *
         * @endpoint authorization/users
         * @module splunkjs.Service
         * @see splunkjs.Service.Users
         */
        users: function() {
            return new root.Users(this);  
        },
        
        /**
         * Get an instance of the Views collection 
         *
         * The Views collection allows you to list views,
         * create new ones, get a specific user, etc.
         *
         * Example:
         *
         *      // List all views
         *      var views = svc.views();
         *      views.refresh(function(err, views) {
         *          var list = views.list();
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("View " + (i+1) + ": " + list[i].properties().name);
         *          }
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Views} The views collection
         *
         * @endpoint data/ui/views
         * @module splunkjs.Service
         * @see splunkjs.Service.Views
         */
        views: function(namespace) {
            return new root.Views(this, namespace);  
        },
        
        /**
         * Create an asyncronous search job
         *
         * Create a search job using the specified query and parameters.
         *
         * Example:
         *
         *      service.search("search ERROR", {id: "myjob_123"}, function(err, newJob) {
         *          console.log("CREATED": newJob.sid);
         *      });
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @endpoint search/jobs
         * @module splunkjs.Service
         */
        search: function(query, params, namespace, callback) {
            if (!callback && utils.isFunction(namespace)) {
                callback = namespace;
                namespace = null;
            }
            
            var jobs = new root.Jobs(this, {}, namespace);
            return jobs.search(query, params, callback);
        },
        
        /**
         * Create a oneshot search job
         *
         * Create a oneshot search job using the specified query and parameters.
         *
         * Example:
         *
         *      service.oneshotSearch("search ERROR", {id: "myjob_123"}, function(err, results) {
         *          console.log("RESULT FIELDS": results.fields);
         *      });
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @param {Function} callback A callback with the results of the job: `(err, results)`
         *
         * @endpoint search/jobs
         * @module splunkjs.Service
         */
        oneshotSearch: function(query, params, namespace, callback) {
            if (!callback && utils.isFunction(namespace)) {
                callback = namespace;
                namespace = null;
            }
            
            var jobs = new root.Jobs(this, {}, namespace);
            return jobs.oneshotSearch(query, params, callback);
        },
        
        /**
         * Get the current user
         *
         * Get the current logged in user
         *
         * Example:
         *
         *      service.currentUser(function(err, user) {
         *          console.log("Real name: ", user.properties().content.realname);
         *      });
         *
         * @param {Function} callback A callback with the user instance: `(err, user)`
         *
         * @endpoint authorization/current-context
         * @module splunkjs.Service
         */
        currentUser: function(callback) {
            var that = this;
            return this.get(Paths.currentUser, {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    var username = response.data.entry[0].content.username;
                    var user = new root.User(that, username);
                    user.refresh(callback);
                }
            });
        }
    });

    /**
     * splunkjs.Service.Endpoint
     * 
     * Base definition for a Splunk endpoint (specific service + path combination).
     *
     * This `Endpoint` class provides convenience methods for the three HTTP verbs
     * used in splunkjs. It will automatically prepare the path correctly, and allows
     * for relative calls.
     *
     * @moduleRoot splunkjs.Service.Endpoint
     * @see splunkjs.Service
     */
    root.Endpoint = Class.extend({
        /**
         * Constructor for splunkjs.Service.Endpoint
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} qualifiedPath A fully-qualified relative endpoint path (e.g. '/services/search/jobs')
         * @return {splunkjs.Service.Endpoint} A splunkjs.Service.Endpoint instance
         *
         * @module splunkjs.Service.Endpoint
         */
        init: function(service, qualifiedPath) {
            if (!service) {
                throw new Error("Passed in a null Service.");
            }

            if (!qualifiedPath) {
                throw new Error("Passed in an empty path.");
            }

            this.service = service;
            this.qualifiedPath = qualifiedPath;

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
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.get("results", {offset: 1}, function() { console.log("DONE"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module splunkjs.Service.Endpoint
         */
        get: function(relpath, params, callback) {
            var url = this.qualifiedPath;

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

        /**
         * Perform a relative POST request
         *
         * Perform a relative POST request on this endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * Example:
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/control
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.post("control", {action: "cancel"}, function() { console.log("CANCELLED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the body
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module splunkjs.Service.Endpoint
         */
        post: function(relpath, params, callback) {
            var url = this.qualifiedPath;

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
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.delete("", {}, function() { console.log("DELETED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @module splunkjs.Service.Endpoint
         */
        del: function(relpath, params, callback) {
            var url = this.qualifiedPath;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            return this.service.del(
                url,
                params,
                callback
            );
        }
    });
    
    /**
     * splunkjs.Service.Resource
     * 
     * Base definition for a Splunk "resource" (e.g. index, jobs, etc)
     *
     * This `Resource` class provides basic methods for handling Splunk resources, such
     * as validation, property accessor, etc. This class should not be used directly,
     * as most methods are meant to be overridden.
     *
     * @moduleRoot splunkjs.Service.Resource
     * @extends splunkjs.Service.Endpoint
     */
    root.Resource = root.Endpoint.extend({
        /**
         * Constructor for splunkjs.Service.Resource
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} namespace Namespace information for this resource (owner, app, sharing)
         * @return {splunkjs.Service.Resource} A splunkjs.Service.Resource instance
         *
         * @module splunkjs.Service.Resource
         */
        init: function(service, path, namespace) {
            var fullpath = service.fullpath(path, namespace);
            
            this._super(service, fullpath);
            this.namespace = namespace;
            this._properties = { content: {}, acl: {}, attributes: {}};
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load       = utils.bind(this, this._load);
            this.refresh     = utils.bind(this, this.refresh);
            this.properties  = utils.bind(this, this.properties);
            this.path        = utils.bind(this, this.path);
        },
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Resource
         */
        path: function() {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Load the resource, also storing the properties.
         *
         * @param {Object} properties The properties for this resource
         *
         * @module splunkjs.Service.Resource
         * @protected
         */
        _load: function(properties) {
            this._properties = properties || {};
        },
        
        /**
         * Refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up.
         *
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @module splunkjs.Service.Resource
         * @protected
         */
        refresh: function(callback) {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Retrieve the properties for this resource
         *
         * This will retrieve the current properties for this
         * resource.
         *
         * @return {Object} The properties for this resource
         *
         * @module splunkjs.Service.Resource
         */
        properties: function(callback) {
            return this._properties;
        }
    });
    
    /**
     * splunkjs.Service.Entity
     * 
     * Base class for a Splunk "entity", which is a well defined construct
     * with certain operations (like "properties", "update", "delete").
     *
     * This `Entity` class provides basic methods for handling Splunk entities, 
     * such as refreshing them, updating, etc.
     *
     * @moduleRoot splunkjs.Service.Entity
     * @extends splunkjs.Service.Resource
     */
    root.Entity = root.Resource.extend({
        /**
         * Whether or not to call `refresh()` after an update
         * to fetch the updated item. By default we don't refresh
         * the entity, as the endpoint will return (echo) the updated
         * entity
         *
         * @module splunkjs.Service.Entity
         */
        refreshOnUpdate: false,
        
        /**
         * Constructor for splunkjs.Service.Entity
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} namespace Namespace information for this entity (owner, app, sharing)
         * @return {splunkjs.Service.Entity} A splunkjs.Service.Entity instance
         *
         * @module splunkjs.Service.Entity
         */
        init: function(service, path, namespace) {
            this._super(service, path, namespace);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load      = utils.bind(this, this._load);
            this.refresh    = utils.bind(this, this.refresh);
            this.remove     = utils.bind(this, this.remove);
            this.update     = utils.bind(this, this.update);
        },
        
        /**
         * Load the resource, also storing the properties.
         *
         * @param {Object} properties The properties for this resource
         *
         * @module splunkjs.Service.Entity
         * @protected
         */
        _load: function(properties) {
            properties = utils.isArray(properties) ? properties[0] : properties;
            
            this._super(properties);
        },
        
        /**
         * Refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up.
         *
         * @param {Object} options Optional dictionary of collection filtering and pagination options
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @module splunkjs.Service.Entity
         */
        refresh: function(options, callback) {
            if (!callback && utils.isFunction(options)) {
                callback = options;
                options = {};
            }
            callback = callback || function() {};
            
            options = options || {};
            
            var that = this;
            return this.get("", options, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    that._load(response.data.entry);
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
         * @module splunkjs.Service.Entity
         * @protected
         */
        remove: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.del("", {}, function(err) {
                callback(err);
            });
        },
        
        /**
         * Update the entity
         *
         * This will update the entity on the server.
         *
         * @param {Object} props Properties to be updated the object with.
         * @param {Function} callback A callback when the object is updated: `(err, entity)`
         *
         * @module splunkjs.Service.Entity
         * @protected
         */
        update: function(props, callback) {
            callback = callback || function() {};
            
            if (props.hasOwnProperty("name")) {
                throw new Error("Cannot set 'name' field in 'update'");
            }
            
            var that = this;
            var req = this.post("", props, function(err, response) {
                if (!err && !that.refreshOnUpdate) {
                    that._load(response.data.entry);
                }
                else if (!err && that.refreshOnUpdate) {
                    that.refresh(callback);
                    return;
                }
                
                callback(err, that);
            });
            
            return req;
        }
    });

    /**
     * splunkjs.Service.Collection
     * 
     * Base class for a Splunk "collection", which is a well defined construct
     * with certain operations (like "list", "create", etc).
     *
     * This `Collection` class provides basic methods for handling Splunk entity 
     * collection, such as creating an entity, listing entities, etc.
     *
     * @moduleRoot splunkjs.Service.Collection
     * @extends splunkjs.Service.Resource
     */
    root.Collection = root.Resource.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.Collection
         */
        refreshOnEntityCreation: false,
        
        /**
         * Whether or not to call `refresh()` after an entity
         * is instantiated locally. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entities when we list it.
         *
         * @module splunkjs.Service.Collection
         */
        refreshOnEntityInstantiation: false,
        
        /**
         * Constructor for splunkjs.Service.Collection
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} namespace Namespace information for this collection (owner, app, sharing)
         * @return {splunkjs.Service.Collection} A splunkjs.Service.Collection instance
         *
         * @module splunkjs.Service.Collection
         */     
        init: function(service, path, namespace) {
            this._super(service, path, namespace);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load    = utils.bind(this, this._load);
            this.refresh  = utils.bind(this, this.refresh);
            this.create   = utils.bind(this, this.create);
            this.list     = utils.bind(this, this.list);
            this.contains = utils.bind(this, this.contains);
            this.item     = utils.bind(this, this.item);
            
            this._entities = [];
            this._entitiesByName = {};            
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Entity} A splunkjs.Service.Entity instance
         
         * @module splunkjs.Service.Collection
         */
        instantiateEntity: function(props) {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Load the resource, also storing the properties.
         *
         * This will load the properties as well as create a map between entity
         * names to entity IDs (for retrieval purposes).
         *
         * @param {Object} properties The properties for this resource
         *
         * @module splunkjs.Service.Collection
         * @private
         */
        _load: function(properties) {
            this._super(properties);
            
            var entities = [];
            var entitiesByName = {};
            var entityPropertyList = properties.entry || [];
            for(var i = 0; i < entityPropertyList.length; i++) {
                var props = entityPropertyList[i];
                var entity = this.instantiateEntity(props);
                entity._load(props);
                entities.push(entity);
                
                if (entitiesByName.hasOwnProperty(entity.name)) {
                    entitiesByName[entity.name].push(entity);
                }
                else {
                    entitiesByName[entity.name] = [entity];
                }
            }
            this._entities = entities;
            this._entitiesByName = entitiesByName;
        },
        
        /**
         * Refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up.
         *
         * @param {Object} options Dictionary of collection filtering and pagination options
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @module splunkjs.Service.Collection
         */
        refresh: function(options, callback) {
            if (!callback && utils.isFunction(options)) {
                callback = options;
                options = {};
            }
            callback = callback || function() {};
            
            options = options || {};
            if (!options.count) {
                options.count = 0;
            }
            
            var recursive = false;
            if (options.hasOwnProperty("recursive")) {
                recursive = options.recursive;
                delete options.recursive;
            }
            
            var that = this;
            return that.get("", options, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    that._load(response.data);
                    
                    if (that.refreshOnEntityInstantiation && recursive) {
                        var fns = [];
                        utils.forEach(that._entities, function(entity) {
                            fns.push(function(done) {
                                entity.refresh({recursive: true}, done); 
                            });
                        });
                        
                        Async.parallel(fns, function(err) {
                            callback(err, that); 
                        });
                    }
                    else {
                        callback(null, that);
                    }
                }
            });
        },
        
        /**
         * Fetch a specific entity.
         *
         * Return a specific entity given its name.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.item("search", function(err, app) {
         *          console.log(app.properties());
         *      })
         *
         * @param {String} name The name of the entity to retrieve
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @returns {splunkjs.Service.Entity} The entity with that name/namespace or null if none is found
         *
         * @module splunkjs.Service.Collection
         */
        item: function(name, namespace) {    
            return this.contains(name, namespace);     
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
         * @returns {Array} Array of splunkjs.Service.Entity objects
         *
         * @module splunkjs.Service.Collection
         */
        create: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var props = response.data.entry;
                    if (utils.isArray(props)) {
                        props = props[0];
                    }
                    
                    var entity = that.instantiateEntity(props);
                    entity._load(props); 
                    
                    if (that.refreshOnEntityCreation) {
                        entity.refresh(callback);
                    }
                    else {                   
                        callback(null, entity);
                    }
                }
            });
            
            return req;
        },
        
        /**
         * Retrieve a list of all entities in the collection
         *
         * Return the list of all the entities in this collection.
         *
         * Example:
         *
         *      var apps = service.apps();
         *      apps.refresh(function(err, apps) {
         *          var appList = apps.list();
         *          console.log(appList.length);
         *      });
         *
         * @param {Function} callback A callback with the list of entities: `(err, list)`
         *
         * @module splunkjs.Service.Collection
         */
        list: function(callback) {
            callback = callback || function() {};
            
            return utils.clone(this._entities);
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
         *      apps.refresh(function(err, apps) {
         *          var app = apps.contains("search");
         *          console.log("Search App Found: " + !!app);
         *          // `app` contains the Application object.
         *      });
         *
         * @param {String} id The name of the entity to retrieve
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @returns {splunkjs.Service.Entity} The entity with that name/namespace or null if none is found
         *
         * @module splunkjs.Service.Collection
         */
        contains: function(id, namespace) {                
            if (utils.isEmpty(namespace)) {
                namespace = null;
            }          
            
            if (!id) {
                throw new Error("Must suply a non-empty name.");
            }
            
            var fullPath = null;
            if (this._entitiesByName.hasOwnProperty(id)) {
                var entities = this._entitiesByName[id];                 
                
                if (entities.length === 1 && !namespace) {
                    // If there is only one entity with the
                    // specified name and the user did not
                    // specify a namespace, then we just
                    // return it
                    return entities[0];
                }
                else if (entities.length === 1 && namespace) {
                    // If we specified a namespace, then we 
                    // only return the entity if it matches
                    // the full path
                    fullPath = this.service.fullpath(entities[0].path(), namespace);
                    if (entities[0].qualifiedPath === fullPath) {
                        return entities[0];
                    }
                    else {
                        return null;
                    }
                }
                else if (entities.length > 1 && !namespace) {
                    // If there is more than one entity and we didn't
                    // specify a namespace, then we return an error
                    // saying the match is ambiguous
                    throw new Error("Ambiguous match for name '" + id + "'");
                }
                else {
                    // There is more than one entity, and we do have
                    // a namespace, so we try and find it
                    for(var i = 0; i < entities.length; i++) {
                        var entity = entities[i];
                        fullPath = this.service.fullpath(entities[i].path(), namespace);
                        if (entity.qualifiedPath === fullPath) {
                            return entity;
                        }
                    }                            
                }
            }
            else {
                return null;
            }
        },
    });
    
    /**
     * splunkjs.Service.SavedSearch
     * 
     * Represents a specific Splunk saved search.  You can update, remove and
     * perform various operations on this saved search.
     *
     * @endpoint saved/searches/{name}
     * @moduleRoot splunkjs.Service.SavedSearch
     * @extends splunkjs.Service.Entity
     */
    root.SavedSearch = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.SavedSearch
         */
        path: function() {
            return Paths.savedSearches + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.SavedSearch
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of saved search
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.SavedSearch} A splunkjs.Service.SavedSearch instance
         *
         * @module splunkjs.Service.SavedSearch
         */     
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
            
            this.acknowledge  = utils.bind(this, this.acknowledge);
            this.dispatch     = utils.bind(this, this.dispatch);
            this.history      = utils.bind(this, this.history);
            this.suppressInfo = utils.bind(this, this.suppressInfo);
        },
        
        /**
         * Acknowledge a saved search
         *
         * Example:
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.acknowledge(function(err, search) {
         *          console.log("ACKNOWLEDGED);
         *      });
         *
         * @param {Function} callback A callback when the saved search was acknowledged: `(err, savedSearch)`
         *
         * @endpoint saved/searches/{name}/acknowledge
         * @module splunkjs.Service.SavedSearch
         */
        acknowledge: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("acknowledge", {}, function(err) {
                callback(err, that);
            });
            
            return req;
        },
        
        /**
         * Dispatch a saved search
         *
         * Example:
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.dispatch(function(err, search) {
         *          console.log("ACKNOWLEDGED);
         *      });
         *
         * @param {Function} callback A callback when the saved search was dispatched: `(err, savedSearch)`
         *
         * @endpoint saved/searches/{name}/dispatch
         * @module splunkjs.Service.SavedSearch
         */
        dispatch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("dispatch", {}, function(err) {
                callback(err, that);
            });
            
            return req;
        },
        
        /**
         * Retrieve the history for a saved search.
         *
         * Example:
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.history(function(err, history, search) {
         *          console.log("HISTORY: ", history);
         *      });
         *
         * @param {Function} callback A callback when the history is retrieved: `(err, history, savedSearch)`
         *
         * @endpoint saved/searches/{name}/history
         * @module splunkjs.Service.SavedSearch
         */
        history: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("history", {}, function(err, response) {
                callback(err, response.data.entry.content, that);
            });
        },
        
        /**
         * Check the suppression state of a saved search.
         *
         * Example:
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.history(function(err, suppressionState, search) {
         *          console.log("STATE: ", suppressionState);
         *      });
         *
         * @param {Function} callback A callback when the suppression state is retrieved: `(err, suppressionState, savedSearch)`
         *
         * @endpoint saved/searches/{name}/suppress
         * @module splunkjs.Service.SavedSearch
         */
        suppressInfo: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("suppress", {}, function(err, response) {
                callback(err, response.data.entry.content, that);
            });
        },
        
        /**
         * Update the saved search
         *
         * This will update the saved search on the server. Because saved searches
         * require the presence of the search parameter, even if it is not being
         * modified, the SDK will fetch it from the server (or from the local
         * cache) if it is not present in the user-supplied input.
         *
         * @param {Object} props Properties to be updated the object with.
         * @param {Function} callback A callback when the object is updated: `(err, entity)`
         *
         * @module splunkjs.Service.SavedSearch
         */
        update: function(params, callback) {
            params = params || {};
            
            if (!params.search) {
                var update = this._super;
                return this.refresh(function(err, search) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        params.search = search.properties().content.search;
                        update.apply(search, [params, callback]);
                    }
                });
            }
            else {
                return this._super(params, callback);
            }
        }
    });
    
    /**
     * splunkjs.Service.SavedSearches
     * 
     * Represents the Splunk collection of saved searches.  You can create and
     * list saved searches using this container, or get a specific one.
     *
     *
     * @endpoint saved/searches
     * @moduleRoot splunkjs.Service.SavedSearches
     * @extends splunkjs.Service.Collection
     */
    root.SavedSearches = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.SavedSearches
         */
        path: function() {
            return Paths.savedSearches;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.SavedSearch} A splunkjs.Service.SavedSearch instance
         
         * @module splunkjs.Service.SavedSearches
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.SavedSearch(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for splunkjs.Service.SavedSearches
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.SavedSearches} A splunkjs.Service.SavedSearches instance
         *
         * @module splunkjs.Service.SavedSearches
         */     
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * splunkjs.Service.Application
     * 
     * Represents a specific Splunk application.  You can update, remove and
     * perform various operations on this application.
     *
     * @endpoint apps/local/{name}
     * @moduleRoot splunkjs.Service.Application
     * @extends splunkjs.Service.Entity
     */
    root.Application = root.Entity.extend({
        /**
         * Whether or not to call `refresh()` after an update
         * to fetch the updated item.
         *
         * @module splunkjs.Service.Application
         */
        refreshOnUpdate: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Application
         */
        path: function() {
            return Paths.apps + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.Application
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of the application
         * @return {splunkjs.Service.Application} A splunkjs.Service.Application instance
         *
         * @module splunkjs.Service.Application
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, this.path(), {});
            
            this.setupInfo  = utils.bind(this, this.setupInfo);
            this.updateInfo = utils.bind(this, this.updateInfo);
        },
        
        /**
         * Retrieve information about the setup for this app
         *
         * Example:
         *
         *      var app = service.apps().item("app");
         *      app.setup(function(err, info, search) {
         *          console.log("SETUP INFO: ", info);
         *      });
         *
         * @param {Function} callback A callback when the setup information is retrieved: `(err, info, app)`
         *
         * @endpoint apps/local/{name}/setup
         * @module splunkjs.Service.Application
         */
        setupInfo: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("setup", {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
        },
        
        /**
         * Retrieve any available update information for this app
         *
         * Example:
         *
         *      var app = service.apps().item("MyApp");
         *      app.updateInfo(function(err, info, app) {
         *          console.log("UPDATE INFO: ", info);
         *      });
         *
         * @param {Function} callback A callback when the update information is retrieved: `(err, info, app)`
         *
         * @endpoint apps/local/{name}/update
         * @module splunkjs.Service.Application
         */
        updateInfo: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("update", {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
        }
    });
    
    /**
     * splunkjs.Service.Applications
     * 
     * Represents the Splunk collection of applications.  You can create and
     * list applications using this container, or get a specific one.
     *
     * @endpoint apps/local
     * @moduleRoot splunkjs.Service.Applications
     * @extends splunkjs.Service.Collection
     */  
    root.Applications = root.Collection.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.Applications
         */
        refreshOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Applications
         */
        path: function() {
            return Paths.apps;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Application} A splunkjs.Service.Application instance
         
         * @module splunkjs.Service.Applications
         */
        instantiateEntity: function(props) {
            return new root.Application(this.service, props.name, {});
        },
                
        /**
         * Constructor for splunkjs.Service.Applications
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @return {splunkjs.Service.Applications} A splunkjs.Service.Applications instance
         *
         * @module splunkjs.Service.Applications
         */  
        init: function(service) {
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * splunkjs.Service.User
     * 
     * Represents a specific Splunk user.  You can update, remove and
     * perform various operations on this user.
     *
     * @endpoint authentication/users/{name}
     * @moduleRoot splunkjs.Service.User
     * @extends splunkjs.Service.Entity
     */
    root.User = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.User
         */
        path: function() {
            return Paths.users + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.User
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The username of the user
         * @return {splunkjs.Service.User} A splunkjs.Service.User instance
         *
         * @module splunkjs.Service.User
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * splunkjs.Service.Users
     * 
     * Represents the Splunk collection of users.  You can create and
     * list users using this container, or get a specific one.
     *
     * @endpoint authentication/users
     * @moduleRoot splunkjs.Service.Users
     * @extends splunkjs.Service.Collection
     */  
    root.Users = root.Collection.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.Users
         */
        refreshOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Users
         */
        path: function() {
            return Paths.users;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.User} A splunkjs.Service.User instance
         
         * @module splunkjs.Service.Users
         */
        instantiateEntity: function(props) {
            return new root.User(this.service, props.name, {});
        },
        
        /**
         * Constructor for splunkjs.Service.Users
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @return {splunkjs.Service.Users} A splunkjs.Service.Users instance
         *
         * @module splunkjs.Service.Users
         */  
        init: function(service) {
            this._super(service, this.path(), {});
        },
        
        /**
         * Create a new user
         *
         * The User endpoint is broken for creates, so we have to have a special-case
         * implementation.
         *
         * @param {Object} params A dictionary of properties to create the entity with.
         * @param {Function} callback A callback with the created entity: `(err, createdEntity)`
         *
         * @module splunkjs.Service.Users
         */
        create: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    // This endpoint is buggy, and we have to use the passed
                    // in name
                    var props = {name: params.name};
                    
                    var entity = that.instantiateEntity(props);                    
                    entity.refresh(callback);
                }
            });
            
            return req;
        }
    });
    
    /**
     * splunkjs.Service.View
     * 
     * Represents a specific Splunk view.  You can update, remove and
     * perform various operations on this view.
     *
     * @endpoint data/ui/views/{name}
     * @moduleRoot splunkjs.Service.View
     * @extends splunkjs.Service.Entity
     */
    root.View = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.View
         */
        path: function() {
            return Paths.views + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.View
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of the view
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.View} A splunkjs.Service.View instance
         *
         * @module splunkjs.Service.View
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * splunkjs.Service.Views
     * 
     * Represents the Splunk collection of views.  You can create and
     * list views using this container, or get a specific one.
     *
     * @endpoint data/ui/views
     * @moduleRoot splunkjs.Service.Views
     * @extends splunkjs.Service.Collection
     */  
    root.Views = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Views
         */
        path: function() {
            return Paths.views;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.View} A splunkjs.Service.View instance
         
         * @module splunkjs.Service.Views
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.View(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for splunkjs.Service.Views
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Views} A splunkjs.Service.Views instance
         *
         * @module splunkjs.Service.Views
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        },
    });
    
    /**
     * splunkjs.Service.Index
     * 
     * Represents a specific Splunk index.  You can update and submit
     * events to this index.
     *
     * @endpoint data/indexes/name
     * @moduleRoot splunkjs.Service.Index
     * @extends splunkjs.Service.Entity
     */
    root.Index = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Index
         */
        path: function() {
            return Paths.indexes + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.Index
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of the index
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Index} A splunkjs.Service.Index instance
         *
         * @module splunkjs.Service.Index
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
            
            this.submitEvent = utils.bind(this, this.submitEvent);
        },
        
        /**
         * Submit an event to this index
         *
         * Example:
         *
         *      var index = service.indexes().item("_internal");
         *      index.submitEvent("A new event", {sourcetype: "mysourcetype"}, function(err, result, index) {
         *          console.log("Submitted event: ", result);
         *      });
         *
         * @param {String} event The text for this event
         * @param {Object} params A dictionary of parameters for indexing: host, host_regex, source, sourcetype
         * @param {Function} callback A callback when the event was submitted: `(err, result, index)`
         *
         * @endpoint receivers/simple?index={name}
         * @module splunkjs.Service.Index
         */
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
            var req = this.service.request(path, method, headers, body, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
            
            return req;
        },
        
        remove: function() {
            throw new Error("Indexes cannot be removed");
        }
    });
        
    /**
     * splunkjs.Service.Indexes
     * 
     * Represents the Splunk collection of indexes.  You can create and
     * list indexes using this container, or get a specific one.
     *
     * @endpoint data/indexes
     * @moduleRoot splunkjs.Service.Indexes
     * @extends splunkjs.Service.Collection
     */  
    root.Indexes = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Indexes
         */
        path: function() {
            return Paths.indexes;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Index} A splunkjs.Service.Index instance
         
         * @module splunkjs.Service.Indexes
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.Index(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for splunkjs.Service.Indexes
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Indexes} A splunkjs.Service.Indexes instance
         *
         * @module splunkjs.Service.Indexes
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Create an index
         *
         * Create an index with the given name and parameters
         *
         * Example:
         *
         *      var indexes = service.indexes();
         *      indexes.create("NewIndex", {assureUTF8: true}, function(err, newIndex) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} name A name for this index
         * @param {Object} params A dictionary of properties to create the entity with.
         * @param {Function} callback A callback with the created entity: `(err, createdIndex)`
         *
         * @endpoint data/indexes
         * @module splunkjs.Service.Indexes
         */
        create: function(name, params, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(name) && utils.isFunction(params) && !callback) {
                callback = params;
                params = name;
                name = params.name;
            }
            
            params = params || {};
            params["name"] = name;
            
            return this._super(params, callback);
        }
    });
    
    /**
     * splunkjs.Service.PropertyStanza
     * 
     * Represents a specific Splunk stanza.  You can update and remove this
     * stanza.
     *
     * @endpoint properties/{file_name}/{stanza_name}
     * @moduleRoot splunkjs.Service.PropertyStanza
     * @extends splunkjs.Service.Entity
     */
    root.PropertyStanza = root.Entity.extend({
        /**
         * Whether or not to call `refresh()` after an update
         * to fetch the updated item.
         *
         * @module splunkjs.Service.PropertyStanza
         */
        refreshOnUpdate: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.PropertyStanza
         */
        path: function() {
            return Paths.properties + "/" + encodeURIComponent(this.file) + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.PropertyStanza
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of the index
         * @return {splunkjs.Service.PropertyStanza} A splunkjs.Service.PropertyStanza instance
         *
         * @module splunkjs.Service.PropertyStanza
         */ 
        init: function(service, file, name) {
            this.name = name;
            this.file = file;
            // We always enforce the "globalness" of properties
            var namespace = {owner: "-", app: "-"};
            this._super(service, this.path(), namespace);
        } 
    });
    
    /**
     * splunkjs.Service.PropertyFile
     * 
     * Represents the Splunk collection of stanzas for a specific property file.  
     * You can create and list stanzas using this container, or get a specific one.
     *
     * @endpoint properties/{file_name}
     * @moduleRoot splunkjs.Service.PropertyFile
     * @extends splunkjs.Service.Collection
     */  
    root.PropertyFile = root.Collection.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.PropertyFile
         */
        refreshOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.PropertyFile
         */
        path: function() {
            return Paths.properties + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.PropertyStanza} A splunkjs.Service.PropertyStanza instance
         
         * @module splunkjs.Service.PropertyFile
         */
        instantiateEntity: function(props) {
            return new root.PropertyStanza(this.service, this.name, props.name);
        },
        
        /**
         * Constructor for splunkjs.Service.PropertyFile
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @return {splunkjs.Service.PropertyFile} A splunkjs.Service.PropertyFile instance
         *
         * @module splunkjs.Service.PropertyFile
         */  
        init: function(service, name) {
            this.name = name;
            
            // We always enforce the "globalness" of properties
            var namespace = {owner: "-", app: "-"};
            
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Refresh the resource
         *
         * This will unconditionally refresh the object from the server
         * and load it up.
         *
         * @param {Object} options Dictionary of collection filtering and pagination options
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @module splunkjs.Service.PropertyFile
         */
        refresh: function(options, callback) {
            if (!callback && utils.isFunction(options)) {
                callback = options;
                options = {};
            }
            
            // Add fillcontents so we get a full stanzas
            options.fillcontents = 1;
            return this._super(options, callback);
        },
        
        /**
         * Create a stanza in this property file
         *
         * Example:
         *
         *      var file = service.properties().item("props");
         *      file.create("my_stanza", function(err, newStanza) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} stanzaName A name for this stanza
         * @param {Function} callback A callback with the created stanza: `(err, createdStanza)`
         *
         * @endpoint property/{file_name}
         * @module splunkjs.Service.PropertyFile
         */
        create: function(stanzaName, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(stanzaName)) {
                stanzaName = stanzaName["__conf"];
            }
            
            callback = callback || function() {};
            
            var that = this;
            return this.post("", {__stanza: stanzaName}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.PropertyStanza(that.service, that.name, stanzaName);
                    entity.refresh(callback);
                }
            });
        }
    });
    
    /**
     * splunkjs.Service.Properties
     * 
     * Represents the Splunk collection of property files.  You can create and
     * list files using this container, or get a specific one.
     *
     * @endpoint properties
     * @moduleRoot splunkjs.Service.Properties
     * @extends splunkjs.Service.Collection
     */  
    root.Properties = root.Collection.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.Properties
         */
        refreshOnEntityCreation: true,
        
        /**
         * Whether or not to call `refresh()` after an entity
         * is instantiated locally. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entities when we list it.
         *
         * @module splunkjs.Service.Properties
         */
        refreshOnEntityInstantiation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Properties
         */
        path: function() {
            return Paths.properties;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.PropertyFile} A splunkjs.Service.PropertyFile instance
         
         * @module splunkjs.Service.Properties
         */
        instantiateEntity: function(props) {
            return new root.PropertyFile(this.service, props.name, this.namespace);
        },
        
        /**
         * Constructor for splunkjs.Service.Properties
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @return {splunkjs.Service.Properties} A splunkjs.Service.Properties instance
         *
         * @module splunkjs.Service.Properties
         */  
        init: function(service) {
            var namespace = {owner: "-", app: "-"};
            this._super(service, this.path(), namespace);
        },

        /**
         * Create a property file
         *
         * Example:
         *
         *      var properties = service.properties();
         *      properties.create("myprops", function(err, newFile) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} filename A name for this property file
         * @param {Function} callback A callback with the created property file: `(err, createdFile)`
         *
         * @endpoint properties
         * @module splunkjs.Service.Properties
         */
        create: function(filename, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(filename)) {
                filename = filename["__conf"];
            }
            
            callback = callback || function() {};
            
            var that = this;
            return this.post("", {__conf: filename}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.PropertyFile(that.service, filename);
                    entity.refresh(callback);
                }
            });
        }
    });
    
    /**
     * splunkjs.Service.ConfigurationStanza
     * 
     * Represents a specific Splunk stanza.  You can update and remove this
     * stanza.
     *
     * @endpoint configs/conf-{file}/{name}`
     * @moduleRoot splunkjs.Service.ConfigurationStanza
     * @extends splunkjs.Service.Entity
     */
    root.ConfigurationStanza = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.ConfigurationStanza
         */
        path: function() {
            return Paths.configurations + "/conf-" + encodeURIComponent(this.file) + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.ConfigurationStanza
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} name The name of the index
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.ConfigurationStanza} A splunkjs.Service.ConfigurationStanza instance
         *
         * @module splunkjs.Service.ConfigurationStanza
         */ 
        init: function(service, file, name, namespace) {
            this.name = name;
            this.file = file;
            this._super(service, this.path(), namespace);
        } 
    });
    
    /**
     * splunkjs.Service.ConfigurationFile
     * 
     * Represents the Splunk collection of stanzas for a specific property file.  
     * You can create and list stanzas using this container, or get a specific one.
     *
     * @endpoint configs/conf-{file}
     * @moduleRoot splunkjs.Service.ConfigurationFile
     * @extends splunkjs.Service.Collection
     */  
    root.ConfigurationFile = root.Collection.extend({ 
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.ConfigurationFile
         */
        path: function() {
            return Paths.configurations + "/conf-" + encodeURIComponent(this.name);
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.ConfigurationStanza} A splunkjs.Service.ConfigurationStanza instance
         
         * @module splunkjs.Service.ConfigurationFile
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.ConfigurationStanza(this.service, this.name, props.name, entityNamespace);
        },
        
        /**
         * Constructor for splunkjs.Service.ConfigurationFile
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.ConfigurationFile} A splunkjs.Service.ConfigurationFile instance
         *
         * @module splunkjs.Service.ConfigurationFile
         */  
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Create a stanza in this configuration file
         *
         * Example:
         *
         *      var file = service.configurations().item("props");
         *      file.create("my_stanza", function(err, newStanza) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} stanzaName A name for this stanza
         * @param {Object} values A dictionary of key-value pairs to put in this stanza
         * @param {Function} callback A callback with the created stanza: `(err, createdStanza)`
         *
         * @endpoint configs/conf-{file}
         * @module splunkjs.Service.ConfigurationFile
         */
        create: function(stanzaName, values, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(stanzaName) && utils.isFunction(values) && !callback) {
                callback = values;
                values = stanzaName;
                stanzaName = values.name;
            }
            
            if (utils.isFunction(values) && !callback) {
                callback = values;
                values = {};
            }
            
            values = values || {};
            values["name"] = stanzaName;
            
            return this._super(values, callback);
        }
    });
    
    /**
     * splunkjs.Service.Configurations
     * 
     * Represents the Splunk collection of configuration files.  You can create and
     * list files using this container, or get a specific one.
     *
     * @endpoint properties
     * @moduleRoot splunkjs.Service.Configurations
     * @extends splunkjs.Service.Collection
     */  
    root.Configurations = root.Collection.extend({
        /**
         * Whether or not to call `refresh()` after an entity
         * is created. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @module splunkjs.Service.Configurations
         */
        refreshOnEntityCreation: true,
        
        /**
         * Whether or not to call `refresh()` after an entity
         * is instantiated locally. By default we don't refresh
         * the entity, as the endpoint will return (echo) the created
         * entities when we list it.
         *
         * @module splunkjs.Service.Configurations
         */
        refreshOnEntityInstantiation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Configurations
         */
        path: function() {
            return Paths.properties;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.ConfigurationFile} A splunkjs.Service.ConfigurationFile instance
         
         * @module splunkjs.Service.Configurations
         */
        instantiateEntity: function(props) {
            return new root.ConfigurationFile(this.service, props.name, this.namespace);
        },
        
        /**
         * Constructor for splunkjs.Service.Configurations
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Configurations} A splunkjs.Service.Configurations instance
         *
         * @module splunkjs.Service.Configurations
         */  
        init: function(service, namespace) {
            if (!namespace || namespace.owner === "-" || namespace.app === "-") {
                throw new Error("Configurations requires a non-wildcard owner/app");
            }
            
            this._super(service, this.path(), namespace);
        },

        /**
         * Create a property file
         *
         * Example:
         *
         *      var properties = service.configurations();
         *      configurations.create("myprops", function(err, newFile) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} filename A name for this property file
         * @param {Function} callback A callback with the created configuration file: `(err, createdFile)`
         *
         * @endpoint properties
         * @module splunkjs.Service.Configurations
         */
        create: function(filename, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(filename)) {
                filename = filename["__conf"];
            }
            
            callback = callback || function() {};
            
            var that = this;
            return this.post("", {__conf: filename}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.ConfigurationFile(that.service, filename);
                    entity.refresh(callback);
                }
            });
        }
    });

    /**
     * splunkjs.Service.Job
     * 
     * Represents a specific Splunk search job.  You can perform various operations
     * on this job, such as reading its status, cancelling it, getting results
     * and so on.
     *
     * @endpoint search/jobs/{search_id}
     * @moduleRoot splunkjs.Service.Job
     * @extends splunkjs.Service.Entity
     */
    root.Job = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Job
         */
        path: function() {
            return Paths.jobs + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for splunkjs.Service.Job
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} sid The search ID for this search
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Job} A splunkjs.Service.Job instance
         *
         * @module splunkjs.Service.Job
         */ 
        init: function(service, sid, namespace) {
            this.name = sid;
            this._super(service, this.path(), namespace);
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

        /**
         * Cancel a search job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.cancel(function(err) {
         *          console.log("CANCELLED");
         *      });
         *
         * @param {Function} callback A callback when the search is done: `(err)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        cancel: function(callback) {
            var req = this.post("control", {action: "cancel"}, callback);
            
            return req;
        },

        /**
         * Disable preview for a job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW DISABLED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        disablePreview: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "disablepreview"}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Enable preview for a job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW ENABLED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        enablePreview: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "enablepreview"}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Get job events
         *
         * Get the events for a job with given parameters.
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.events({count: 10}, function(err, events, job) {
         *          console.log("Fields: ", events.fields);
         *      });
         *
         * @param {Object} params Parameters for event fetching
         * @param {Function} callback A callback with when the events are fetched: `(err, events, job)`
         *
         * @endpoint search/jobs/{search_id}/events
         * @module splunkjs.Service.Job
         */
        events: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("events", params, function(err, response) { 
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data, that); 
                }
            });
        },

        /**
         * Finalize a search job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.finalize(function(err, job) {
         *          console.log("JOB FINALIZED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        finalize: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "finalize"}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Pause a search job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.pause(function(err, job) {
         *          console.log("JOB PAUSED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        pause: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "pause"}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /*
         * Get the preview results for a job
         *
         * Get the preview results for a job with given parameters.
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.preview({count: 10}, function(err, results, job) {
         *          console.log("Fields: ", results.fields);
         *      });
         *
         * @param {Object} params Parameters for results preview fetching
         * @param {Function} callback A callback with when the preview results are fetched: `(err, results, job)`
         *
         * @endpoint search/jobs/{search_id}/results_preview
         * @module splunkjs.Service.Job
         */
        preview: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("results_preview", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data, that);
                }
            });
        },

        /**
         * Get job results
         *
         * Get the results for a job with given parameters.
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.results({count: 10}, function(err, results, job) {
         *          console.log("Fields: ", results.results);
         *      });
         *
         * @param {Object} params Parameters for results fetching
         * @param {Function} callback A callback with when the results are fetched: `(err, results, job)`
         *
         * @endpoint search/jobs/{search_id}/results
         * @module splunkjs.Service.Job
         */
        results: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("results", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data, that);
                }
            });
        },

        /**
         * Get the search log for this job.
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.searchlog(function(err, searchlog, job) {
         *          console.log(searchlog);
         *      });
         *
         * @param {Function} callback A callback with the searchlog and job: `(err, searchlog, job)`
         *
         * @endpoint search/jobs/{search_id}/search.log
         * @module splunkjs.Service.Job
         */
        searchlog: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("search.log", {}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
        },

        /**
         * Set the job priority
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.setPriority(6, function(err, job) {
         *          console.log("JOB PRIORITY SET");
         *      });
         *
         * @param {Number} value Value for the new priority
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        setPriority: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "setpriority", priority: value}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Set the job TTL
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.setTTL(1000, function(err, job) {
         *          console.log("JOB TTL SET");
         *      });
         *
         * @param {Number} value Value for the new priority
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        setTTL: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "setttl", ttl: value}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Get the summary for this job
         *
         * Get the job summary for this job with the given parameters
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.summary({top_count: 5}, function(err, summary, job) {
         *          console.log("Summary: ", summary);
         *      });
         *
         * @param {Object} params Parameters for summary fetching
         * @param {Function} callback A callback with with the summary and this job: `(err, summary, job)`
         *
         * @endpoint search/jobs/{search_id}/summmary
         * @module splunkjs.Service.Job
         */
        summary: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("summary", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
        },

        /**
         * Get the timeline for this job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.timeline({time_format: "%c"}, function(err, job, timeline) {
         *          console.log("Timeline: ", timeline);
         *      });
         *
         * @param {Object} params Parameters for timeline fetching
         * @param {Function} callback A callback with with the timeline and this job: `(err, timeline, job)`
         *
         * @endpoint search/jobs/{search_id}/timeline
         * @module splunkjs.Service.Job
         */
        timeline: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("timeline", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data.entry.content, that);
                }
            });
        },

        /**
         * Touch a job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.touch(function(err) {
         *          console.log("JOB TOUCHED");
         *      });
         *
         * @param {Function} callback A callback with this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        touch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "touch"}, function(err) {
                callback(err, that);
            });
            
            return req;
        },

        /**
         * Unpause a search job
         *
         * Example:
         *
         *      var job = service.jobs().item("mysid");
         *      job.unpause(function(err) {
         *          console.log("JOB UNPAUSED");
         *      });
         *
         * @param {Function} callback A callback with this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @module splunkjs.Service.Job
         */
        unpause: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("control", {action: "unpause"}, function(err) {
                callback(err, that);
            });
            
            return req;
        }
    });

    /**
     * splunkjs.Service.Jobs
     * 
     * Represents the Splunk collection of jobs.  You can create and
     * list search jobs using this container, or get a specific one.
     *
     * @endpoint search/jobs
     * @moduleRoot splunkjs.Service.Jobs
     * @extends splunkjs.Service.Collection
     */  
    root.Jobs = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @module splunkjs.Service.Jobs
         */
        path: function() {
            return Paths.jobs;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Job} A splunkjs.Service.Job instance
         
         * @module splunkjs.Service.Jobs
         */
        instantiateEntity: function(props) {
            var sid = props.content.sid;
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.Job(this.service, sid, entityNamespace);
        },
        
        /**
         * Constructor for splunkjs.Service.Jobs
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Jobs} A splunkjs.Service.Jobs instance
         *
         * @module splunkjs.Service.Jobs
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.create     = utils.bind(this, this.create);
        },

        /**
         * Create an asyncronous search job
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @endpoint search/jobs
         * @module splunkjs.Service.Jobs
         * @see splunkjs.Service.Jobs.search
         */
        create: function(query, params, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(query) && utils.isFunction(params) && !callback) {
                callback = params;
                params = query;
                query = params.search;
            }
            
            callback = callback || function() {};
            params = params || {};
            params.search = query; 
            
            if ((params.exec_mode || "").toLowerCase() === "oneshot") {
                throw new Error("Please use splunkjs.Service.Jobs.oneshotSearch for exec_mode=oneshot");
            }
            
            if (!params.search) {
                callback("Must provide a query to create a search job");
            } 

            var that = this;
            return this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    
                    var job = new root.Job(that.service, response.data.entry.content.sid);
                    callback(null, job);
                }
            });
        },
                
        /**
         * Create an asyncronous search job
         *
         * Create a search job using the specified query and parameters.
         *
         * This method will throw an error if exec_mode=oneshot is passed in the params
         * variable.
         *
         * Example:
         *
         *      var jobs = service.jobs();
         *      jobs.search("search ERROR", {id: "myjob_123"}, function(err, newJob) {
         *          console.log("CREATED": newJob.sid);
         *      });
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @endpoint search/jobs
         * @module splunkjs.Service.Jobs
         */
        search: function(query, params, callback) {
            return this.create(query, params, callback);
        },
                
        /**
         * Create a oneshot search job
         *
         * Create a oneshot search job using the specified query and parameters.
         *
         * Example:
         *
         *      var jobs = service.jobs();
         *      jobs.oneshotSearch("search ERROR", {id: "myjob_123"}, function(err, results) {
         *          console.log("RESULT FIELDS": results.fields);
         *      });
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Function} callback A callback with the results of the job: `(err, results)`
         *
         * @endpoint search/jobs
         * @module splunkjs.Service.Jobs
         */
        oneshotSearch: function(query, params, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(query) && utils.isFunction(params) && !callback) {
                callback = params;
                params = query;
                query = params.search;
            }
            
            callback = callback || function() {};
            params = params || {};
            params.search = query; 
            params.exec_mode = "oneshot";
            
            if (!params.search) {
                callback("Must provide a query to create a search job");
            } 

            var that = this;
            return this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data);
                }
            });
        }
    });
})();