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
     * Root access point to the Splunk REST API
     *
     * This `Service` class provides "typed" access to Splunk concepts
     * such as searches, indexes, apps and more, as well as providing
     * convenience methods to authenticate and get more specialized
     * instances of the service.
     *
     * @class splunkjs.Service
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
         * @method splunkjs.Service
         */
        init: function() {
            this._super.apply(this, arguments);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.specialize     = utils.bind(this, this.specialize);
            this.apps           = utils.bind(this, this.apps);
            this.configurations = utils.bind(this, this.configurations);
            this.indexes        = utils.bind(this, this.indexes);
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
         * @example
         *
         *      var svc = ...;
         *      var newService = svc.specialize("myuser", "unix");
         *
         * @param {String} owner The specialized owner of the new service
         * @param {String} app The specialized app of the new sevice
         * @return {splunkjs.Service} The specialized service.
         *
         * @method splunkjs.Service
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
         * @example
         *
         *      // List installed apps
         *      var apps = svc.apps();
         *      apps.fetch(function(err) { console.log(apps.list()); });
         *
         * @return {splunkjs.Service.Collection} The Applications collection
         *
         * @endpoint apps/local
         * @method splunkjs.Service
         * @see splunkjs.Service.Applications
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
         * @example
         *
         *      // List all properties in the 'props.conf' file
         *      var files = svc.configurations();
         *      files.item("props", function(err, propsFile) {
         *          propsFile.fetch(function(err, props) {
         *              console.log(props.properties()); 
         *          });
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Configurations} The Configurations collection
         *
         * @endpoint configs
         * @method splunkjs.Service
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
         * @example
         *
         *      // Check if we have an _internal index
         *      var indexes = svc.configurations();
         *      indexes.fetch(function(err, indexes) {
         *          var index = indexes.item("_internal");
         *          console.log("Was index found: " + !!index);
         *          // `index` is an Index object.
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.Indexes} The Indexes collection
         *
         * @endpoint data/indexes
         * @method splunkjs.Service
         * @see splunkjs.Service.Indexes
         */        
        indexes: function(namespace) { 
            return new root.Indexes(this, namespace);
        },
        
        /**
         * Get an instance of the SavedSearches collection 
         *
         * The SavedSearches collection allows you to list saved searches,
         * create new ones, update a saved search, etc.
         *
         * @example
         *
         *      // List all # of saved searches
         *      var savedSearches = svc.savedSearches();
         *      savedSearches.fetch(function(err, savedSearches) {
         *          console.log("# Of Saved Searches: " + savedSearches.list().length);
         *      });
         *
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @return {splunkjs.Service.SavedSearches} The SavedSearches collection
         *
         * @endpoint saved/searches
         * @method splunkjs.Service
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
         * @example
         *
         *      // List all job IDs
         *      var jobs = svc.jobs();
         *      jobs.fetch(function(err, jobs) {
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
         * @method splunkjs.Service
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
         * @example
         *
         *      // List all usernames
         *      var users = svc.users();
         *      users.fetch(function(err, users) {
         *          var list = users.list();
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("User " + (i+1) + ": " + list[i].properties().name);
         *          }
         *      });
         *
         * @return {splunkjs.Service.Users} The Users collection
         *
         * @endpoint authorization/users
         * @method splunkjs.Service
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
         * @example
         *
         *      // List all views
         *      var views = svc.views();
         *      views.fetch(function(err, views) {
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
         * @method splunkjs.Service
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
         * @example
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
         * @method splunkjs.Service
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
         * @example
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
         * @method splunkjs.Service
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
         * @example
         *
         *      service.currentUser(function(err, user) {
         *          console.log("Real name: ", user.properties().realname);
         *      });
         *
         * @param {Function} callback A callback with the user instance: `(err, user)`
         *
         * @endpoint authorization/current-context
         * @method splunkjs.Service
         */
        currentUser: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = this.get(Paths.currentUser, {}, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    var username = response.data.entry[0].content.username;
                    var user = new root.User(that, username);
                    user.fetch(function() {
                        if (req.wasAborted) {
                            return; // aborted, so ignore
                        }
                        else {
                            callback.apply(null, arguments);
                        }
                    });
                }
            });
            
            return req;
        },
        
        /**
         * Get the server info
         *
         * @example
         *
         *      service.serverInfo(function(err, info) {
         *          console.log("Splunk Version: ", info.properties().version);
         *      });
         *
         * @param {Function} callback A callback with the server info: `(err, info)`
         *
         * @endpoint server/info
         * @method splunkjs.Service
         */
        serverInfo: function(callback) {
            callback = callback || function() {};
            
            var serverInfo = new root.ServerInfo(this);
            return serverInfo.fetch(callback);
        },
        
        /**
         * Parse a search string
         *
         * @example
         *
         *      service.parse("search index=_internal | head 1", function(err, parse) {
         *          console.log("Commands: ", parse.commands);
         *      });
         *
         * @param {String} query The search query to parse
         * @param {Object} params An object of options for the parser
         * @param {Function} callback A callback with the parse info: `(err, parse)`
         *
         * @endpoint search/parser
         * @method splunkjs.Service
         */
        parse: function(query, params, callback) {
            if (!callback && utils.isFunction(params)) {
                callback = params;
                params = {};
            }
            
            callback = callback || function() {};
            params = params || {};
            
            params.q = query;
            
            return this.get(Paths.parser, params, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {                    
                    callback(null, response.data);
                }
            });
        },
        
        typeahead: function(prefix, count, callback) {
            if (!callback && utils.isFunction(count)) {
                callback = count;
                count = 10;
            }
            
            callback = callback || function() {};
            var params = {
                count: count || 10,
                prefix: prefix
            };
            
            return this.get(Paths.typeahead, params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data);
                }
            });
        },
        
        /**
         * Log an event to splunk
         *
         * @example
         *
         *      service.log("A new event", {index: "_internal", sourcetype: "mysourcetype"}, function(err, result) {
         *          console.log("Submitted event: ", result);
         *      });
         *
         * @param {String} event The text for this event
         * @param {Object} params A dictionary of parameters for indexing: index, host, host_regex, source, sourcetype
         * @param {Function} callback A callback when the event was submitted: `(err, result)`
         *
         * @endpoint receivers/simple
         * @method splunkjs.Service
         */
        log: function(event, params, callback) {
            if (!callback && utils.isFunction(params)) {
                callback = params;
                params = {};
            }
            
            callback = callback || function() {};
            params = params || {};
            
            var path = this.paths.submitEvent + "?" + Http.encode(params);
            var method = "POST";
            var headers = {};
            var body = event;
            
            var req = this.request(path, method, headers, body, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.data);
                }
            });
            
            return req;
        }
    });

    /**
     * Base definition for a Splunk endpoint (specific service + path combination).
     *
     * This `Endpoint` class provides convenience methods for the three HTTP verbs
     * used in splunkjs. It will automatically prepare the path correctly, and allows
     * for relative calls.
     *
     * @class splunkjs.Service.Endpoint
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
         * @method splunkjs.Service.Endpoint
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
            this.del    = utils.bind(this, this.del);
        },

        /**
         * Perform a relative GET request
         *
         * Perform a relative GET request on this endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/results?offset=1
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.get("results", {offset: 1}, function() { console.log("DONE"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @method splunkjs.Service.Endpoint
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
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/control
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.post("control", {action: "cancel"}, function() { console.log("CANCELLED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the body
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @method splunkjs.Service.Endpoint
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
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.delete("", {}, function() { console.log("DELETED"))});
         *
         * @param {String} relpath A relative path to append at the end of the path
         * @param {Object} params A dictionary of parameters to add to the query string
         * @param {Function} callback A callback to be invoked when the request is complete: `(err, response)`
         *
         * @method splunkjs.Service.Endpoint
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
     * Base definition for a Splunk "resource" (e.g. index, jobs, etc)
     *
     * This `Resource` class provides basic methods for handling Splunk resources, such
     * as validation, property accessor, etc. This class should not be used directly,
     * as most methods are meant to be overridden.
     *
     * @class splunkjs.Service.Resource
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
         * @method splunkjs.Service.Resource
         */
        init: function(service, path, namespace) {
            var fullpath = service.fullpath(path, namespace);
            
            this._super(service, fullpath);
            this.namespace = namespace;
            this._properties = {};
            this._state = {};
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load       = utils.bind(this, this._load);
            this.fetch       = utils.bind(this, this.fetch);
            this.properties  = utils.bind(this, this.properties);
            this.state       = utils.bind(this, this.state);
            this.path        = utils.bind(this, this.path);
        },
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Resource
         */
        path: function() {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Load the resource, also storing the properties.
         *
         * @param {Object} properties The properties for this resource
         *
         * @method splunkjs.Service.Resource
         * @protected
         */
        _load: function(properties) {
            this._properties = properties || {};
            this._state = properties || {};
        },
        
        /**
         * Refresh the resource
         *
         * This will fetch the object from the server
         * and load it up.
         *
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @method splunkjs.Service.Resource
         * @protected
         */
        fetch: function(callback) {
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
         * @method splunkjs.Service.Resource
         */
        properties: function() {
            return this._properties;
        },
        
        /**
         * Retrieve the state for this resource
         *
         * This will retrieve the current full state for this
         * resource.
         *
         * @return {Object} The full state for this resource
         *
         * @method splunkjs.Service.Resource
         */
        state: function() {
            return this._state;
        }
    });
    
    /**
     * Base class for a Splunk "entity", which is a well defined construct
     * with certain operations (like "properties", "update", "delete").
     *
     * This `Entity` class provides basic methods for handling Splunk entities, 
     * such as fetching them, updating, etc.
     *
     * @class splunkjs.Service.Entity
     * @extends splunkjs.Service.Resource
     */
    root.Entity = root.Resource.extend({
        /**
         * Whether or not to call `fetch()` after an update
         * to fetch the updated item. By default we don't fetch
         * the entity, as the endpoint will return (echo) the updated
         * entity
         *
         * @method splunkjs.Service.Entity
         */
        fetchOnUpdate: false,
        
        /**
         * Constructor for splunkjs.Service.Entity
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} namespace Namespace information for this entity (owner, app, sharing)
         * @return {splunkjs.Service.Entity} A splunkjs.Service.Entity instance
         *
         * @method splunkjs.Service.Entity
         */
        init: function(service, path, namespace) {
            this._super(service, path, namespace);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load     = utils.bind(this, this._load);
            this.fetch     = utils.bind(this, this.fetch);
            this.remove    = utils.bind(this, this.remove);
            this.update    = utils.bind(this, this.update);
            this.fields    = utils.bind(this, this.fields);
            this.links     = utils.bind(this, this.links);
            this.acl       = utils.bind(this, this.acl);
            this.author    = utils.bind(this, this.author);
            this.updated   = utils.bind(this, this.updated);
            this.published = utils.bind(this, this.published);
            this.enable    = utils.bind(this, this.enable);
            this.disable   = utils.bind(this, this.disable);
            this.reload    = utils.bind(this, this.reload);
            
            // Initial values
            this._properties = {};
            this._fields     = {};
            this._acl        = {};
            this._links      = {};
        },
        
        /**
         * Load the resource, also storing the properties.
         *
         * @param {Object} properties The properties for this resource
         *
         * @method splunkjs.Service.Entity
         * @protected
         */
        _load: function(properties) {
            properties = utils.isArray(properties) ? properties[0] : properties;
            
            // Initialize the properties to
            // empty values
            properties = properties || {
                content: {},
                fields: {},
                acl: {},
                links: {}
            };
            
            this._super(properties);
            
            // Take out the entity-specific content
            this._properties = properties.content   || {};
            this._fields     = properties.fields    || this._fields || {};
            this._acl        = properties.acl       || {};
            this._links      = properties.links     || {};
            this._author     = properties.author    || null;
            this._updated    = properties.updated   || null;
            this._published  = properties.published || null;
        },
        
        /**
         * Retrieve the fields information for this entity
         *
         * @return {Object} The fields for this entity
         *
         * @method splunkjs.Service.Entity
         */
        fields: function() {
            return this._fields;
        },
        
        /**
         * Retrieve the ACL information for this entity
         *
         * @return {Object} The ACL for this entity
         *
         * @method splunkjs.Service.Entity
         */
        acl: function() {
            return this._acl;
        },
        
        /**
         * Retrieve the links information for this entity
         *
         * @return {Object} The links for this entity
         *
         * @method splunkjs.Service.Entity
         */
        links: function() {
            return this._links;
        },
        
        /**
         * Retrieve the author information for this entity
         *
         * @return {String} The author for this entity
         *
         * @method splunkjs.Service.Entity
         */
        author: function() {
            return this._author;
        },
        
        /**
         * Retrieve the updated time for this entity
         *
         * @return {String} The updated time for this entity
         *
         * @method splunkjs.Service.Entity
         */
        updated: function() {
            return this._updated;
        },
        
        /**
         * Retrieve the published time for this entity
         *
         * @return {String} The published time for this entity
         *
         * @method splunkjs.Service.Entity
         */
        published: function() {
            return this._published;
        },
        
        /**
         * Refresh the resource
         *
         * This will fetch the object from the server
         * and load it up.
         *
         * @param {Object} options Optional dictionary of collection filtering and pagination options
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @method splunkjs.Service.Entity
         */
        fetch: function(options, callback) {
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
         * @method splunkjs.Service.Entity
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
         * @method splunkjs.Service.Entity
         * @protected
         */
        update: function(props, callback) {
            callback = callback || function() {};
            
            if (props.hasOwnProperty("name")) {
                throw new Error("Cannot set 'name' field in 'update'");
            }
            
            var that = this;
            var req = this.post("", props, function(err, response) {
                if (!err && !that.fetchOnUpdate) {
                    that._load(response.data.entry);
                    callback(err, that);
                }
                else if (!err && that.fetchOnUpdate) {
                    that.fetch(function() {
                        if (req.wasAborted) {
                            return; // aborted, so ignore
                        }
                        else {
                            callback.apply(null, arguments);
                        }
                    });
                }
                else {
                    callback(err, that);
                }
            });
            
            return req;
        },
        
        /**
         * Disable the entity
         *
         * This will disable the entity on the server.
         *
         * @param {Function} callback A callback when the object is disabled: `(err, entity)`
         *
         * @method splunkjs.Service.Entity
         * @protected
         */
        disable: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("disable", {}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, that);
                }
            });
        },
        
        /**
         * Enable the entity
         *
         * This will enable the entity on the server.
         *
         * @param {Function} callback A callback when the object is enabled: `(err, entity)`
         *
         * @method splunkjs.Service.Entity
         * @protected
         */
        enable: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("enable", {}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, that);
                }
            });
        },
        
        /**
         * Reload the entity
         *
         * This will reload the entity on the server.
         *
         * @param {Function} callback A callback when the object is reloaded: `(err, entity)`
         *
         * @method splunkjs.Service.Entity
         * @protected
         */
        reload: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("_reload", {}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, that);
                }
            });
        }
    });

    /**
     * Base class for a Splunk "collection", which is a well defined construct
     * with certain operations (like "list", "create", etc).
     *
     * This `Collection` class provides basic methods for handling Splunk entity 
     * collection, such as creating an entity, listing entities, etc.
     *
     * @class splunkjs.Service.Collection
     * @extends splunkjs.Service.Resource
     */
    root.Collection = root.Resource.extend({
        /**
         * Whether or not to call `fetch()` after an entity
         * is created. By default we don't fetch
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @method splunkjs.Service.Collection
         */
        fetchOnEntityCreation: false,
        
        /**
         * Constructor for splunkjs.Service.Collection
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @param {String} path A relative endpoint path (e.g. 'search/jobs')
         * @param {Object} namespace Namespace information for this collection (owner, app, sharing)
         * @return {splunkjs.Service.Collection} A splunkjs.Service.Collection instance
         *
         * @method splunkjs.Service.Collection
         */     
        init: function(service, path, namespace) {
            this._super(service, path, namespace);
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._load             = utils.bind(this, this._load);
            this.fetch           = utils.bind(this, this.fetch);
            this.create            = utils.bind(this, this.create);
            this.list              = utils.bind(this, this.list);
            this.item              = utils.bind(this, this.item);
            this.instantiateEntity = utils.bind(this, this.instantiateEntity);
            
            // Initial values
            this._entities       = [];
            this._entitiesByName = {};    
            this._properties     = {};
            this._paging         = {};
            this._links          = {}; 
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Entity} A splunkjs.Service.Entity instance
         
         * @method splunkjs.Service.Collection
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
         * @method splunkjs.Service.Collection
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
            this._entities       = entities;
            this._entitiesByName = entitiesByName;
            this._paging         = properties.paging    || {};
            this._links          = properties.links     || {};
            this._updated        = properties.updated   || null;
        },
        
        /**
         * Retrieve the links information for this collection
         *
         * @return {Object} The links for this collection
         *
         * @method splunkjs.Service.Collection
         */
        links: function() {
            return this._links;
        },
        
        /**
         * Retrieve the author information for this collection
         *
         * @return {String} The author for this collection
         *
         * @method splunkjs.Service.Collection
         */
        paging: function() {
            return this._paging;
        },
        
        /**
         * Retrieve the updated time for this collection
         *
         * @return {String} The updated time for this collection
         *
         * @method splunkjs.Service.Collection
         */
        updated: function() {
            return this._updated;
        },
        
        /**
         * Refresh the resource
         *
         * This will unconditionally fetch the object from the server
         * and load it up.
         *
         * @param {Object} options Dictionary of collection filtering and pagination options
         * @param {Function} callback A callback when the object is retrieved: `(err, resource)`
         *
         * @method splunkjs.Service.Collection
         */
        fetch: function(options, callback) {
            if (!callback && utils.isFunction(options)) {
                callback = options;
                options = {};
            }
            callback = callback || function() {};
            
            options = options || {};
            if (!options.count) {
                options.count = 0;
            }
            
            var that = this;
            var req = that.get("", options, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    that._load(response.data);
                    callback(null, that);
                }
            });
            
            return req;
        },
        
        /**
         * Get a specific entity.
         *
         * Return a specific entity given its name from the
         * collection
         *
         * @example
         *
         *      var apps = service.apps();
         *      apps.fetch(function(err, apps) {
         *          var app = apps.item("search");
         *          console.log("Search App Found: " + !!app);
         *          // `app` is an Application object.
         *      });
         *
         * @param {String} id The name of the entity to retrieve
         * @param {Object} namespace Namespace information (owner, app, sharing)
         * @returns {splunkjs.Service.Entity} The entity with that name/namespace or null if none is found
         *
         * @method splunkjs.Service.Collection
         */
        item: function(id, namespace) {                
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
        
        /**
         * Create an entity for this collection.
         *
         * Create an entity on the server for this collection with the specified
         * parameters.
         *
         * @example
         *
         *      var apps = service.apps();
         *      apps.create({name: "NewSearchApp"}, function(err, newApp) {
         *          console.log("CREATED");
         *      });
         *
         * @param {Object} params A dictionary of properties to create the entity with.
         * @returns {Array} Array of splunkjs.Service.Entity objects
         *
         * @method splunkjs.Service.Collection
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
                    
                    if (that.fetchOnEntityCreation) {
                        entity.fetch(function() {
                            if (req.wasAborted) {
                                return; // aborted, so ignore
                            }
                            else {
                                callback.apply(null, arguments);
                            }
                        });
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
         * @example
         *
         *      var apps = service.apps();
         *      apps.fetch(function(err, apps) {
         *          var appList = apps.list();
         *          console.log(appList.length);
         *      });
         *
         * @param {Function} callback A callback with the list of entities: `(err, list)`
         *
         * @method splunkjs.Service.Collection
         */
        list: function(callback) {
            callback = callback || function() {};
            
            return utils.clone(this._entities);
        }
    });
    
    /**
     * Represents a specific Splunk saved search.  You can update, remove and
     * perform various operations on this saved search.
     *
     * @endpoint saved/searches/{name}
     * @class splunkjs.Service.SavedSearch
     * @extends splunkjs.Service.Entity
     */
    root.SavedSearch = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.SavedSearch
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
         * @method splunkjs.Service.SavedSearch
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
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.acknowledge(function(err, search) {
         *          console.log("ACKNOWLEDGED);
         *      });
         *
         * @param {Function} callback A callback when the saved search was acknowledged: `(err, savedSearch)`
         *
         * @endpoint saved/searches/{name}/acknowledge
         * @method splunkjs.Service.SavedSearch
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
         * Dispatching a saved search will result in a search job being
         * created and a splunkjs.Service.Job instance returned in the
         * callback.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.dispatch({force:dispatch: false}, function(err, job) {
         *          console.log("Job SID: ", job.sid);
         *      });
         *
         * @param {Object} options An object of options for dispatching this saved search
         * @param {Function} callback A callback when the saved search was dispatched: `(err, job)`
         *
         * @endpoint saved/searches/{name}/dispatch
         * @method splunkjs.Service.SavedSearch
         */
        dispatch: function(options, callback) {
            if (!callback && utils.isFunction(options)) {
                callback = options;
                options = {};
            }
            
            callback = callback || function() {};
            options = options || {};
            
            var that = this;
            var req = this.post("dispatch", options, function(err, response) {
                if (err) {
                    callback(err);
                    return;
                }
                
                var sid = response.data.sid;
                var job = new root.Job(that.service, sid, that.namespace);
                
                callback(null, job, that);
            });
            
            return req;
        },
        
        /**
         * Retrieve the job history for a saved search.
         *
         * The history is a list of splunkjs.Service.Job instances
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.history(function(err, jobs, search) {
         *          for(var i = 0; i < jobs.length; i++) {
         *              console.log("Job " + i + ": ", jobs[i].sid);
         *          }
         *      });
         *
         * @param {Function} callback A callback when the history is retrieved: `(err, job, savedSearch)`
         *
         * @endpoint saved/searches/{name}/history
         * @method splunkjs.Service.SavedSearch
         */
        history: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("history", {}, function(err, response) {
                if (err) {
                    callback(err);
                    return;
                }
                
                var jobs = [];
                var data = response.data.entry;
                for(var i = 0; i < data.length; i++) {
                    var jobData = response.data.entry[i];
                    var namespace = utils.namespaceFromProperties(jobData);
                    var job = new root.Job(that.service, jobData.name, namespace);
                    
                    job._load(jobData);
                    jobs.push(job);
                }
                
                callback(null, jobs, that);
            });
        },
        
        /**
         * Check the suppression state of a saved search.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.history(function(err, suppressionState, search) {
         *          console.log("STATE: ", suppressionState);
         *      });
         *
         * @param {Function} callback A callback when the suppression state is retrieved: `(err, suppressionState, savedSearch)`
         *
         * @endpoint saved/searches/{name}/suppress
         * @method splunkjs.Service.SavedSearch
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
         * @method splunkjs.Service.SavedSearch
         */
        update: function(params, callback) {
            params = params || {};
            
            if (!params.search) {
                var update = this._super;
                var req = this.fetch(function(err, search) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        params.search = search.properties().search;
                        update.call(search, params, function() {
                            if (req.wasAborted) {
                                return; // aborted, so ignore
                            }
                            else {
                                callback.apply(null, arguments);
                            }
                        });
                    }
                });
                
                return req;
            }
            else {
                return this._super(params, callback);
            }
        }
    });
    
    /**
     * Represents the Splunk collection of saved searches.  You can create and
     * list saved searches using this container, or get a specific one.
     *
     *
     * @endpoint saved/searches
     * @class splunkjs.Service.SavedSearches
     * @extends splunkjs.Service.Collection
     */
    root.SavedSearches = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.SavedSearches
         */
        path: function() {
            return Paths.savedSearches;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.SavedSearch} A splunkjs.Service.SavedSearch instance
         
         * @method splunkjs.Service.SavedSearches
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
         * @method splunkjs.Service.SavedSearches
         */     
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents a specific Splunk application.  You can update, remove and
     * perform various operations on this application.
     *
     * @endpoint apps/local/{name}
     * @class splunkjs.Service.Application
     * @extends splunkjs.Service.Entity
     */
    root.Application = root.Entity.extend({
        /**
         * Whether or not to call `fetch()` after an update
         * to fetch the updated item.
         *
         * @method splunkjs.Service.Application
         */
        fetchOnUpdate: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Application
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
         * @method splunkjs.Service.Application
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
         * @example
         *
         *      var app = service.apps().item("app");
         *      app.setup(function(err, info, search) {
         *          console.log("SETUP INFO: ", info);
         *      });
         *
         * @param {Function} callback A callback when the setup information is retrieved: `(err, info, app)`
         *
         * @endpoint apps/local/{name}/setup
         * @method splunkjs.Service.Application
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
         * @example
         *
         *      var app = service.apps().item("MyApp");
         *      app.updateInfo(function(err, info, app) {
         *          console.log("UPDATE INFO: ", info);
         *      });
         *
         * @param {Function} callback A callback when the update information is retrieved: `(err, info, app)`
         *
         * @endpoint apps/local/{name}/update
         * @method splunkjs.Service.Application
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
     * Represents the Splunk collection of applications.  You can create and
     * list applications using this container, or get a specific one.
     *
     * @endpoint apps/local
     * @class splunkjs.Service.Applications
     * @extends splunkjs.Service.Collection
     */  
    root.Applications = root.Collection.extend({
        /**
         * Whether or not to call `fetch()` after an entity
         * is created. By default we don't fetch
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @method splunkjs.Service.Applications
         */
        fetchOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Applications
         */
        path: function() {
            return Paths.apps;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Application} A splunkjs.Service.Application instance
         
         * @method splunkjs.Service.Applications
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
         * @method splunkjs.Service.Applications
         */  
        init: function(service) {
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Represents the server info
     *
     * @endpoint server/info
     * @class splunkjs.Service.ServerInfo
     * @extends splunkjs.Service.Entity
     */
    root.ServerInfo = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.ServerInfo
         */
        path: function() {
            return Paths.info;
        },
        
        /**
         * Constructor for splunkjs.Service.ServerInfo
         *
         * @constructor
         * @param {splunkjs.Service} service A service instance
         * @return {splunkjs.Service.ServerInfo} A splunkjs.Service.ServerInfo instance
         *
         * @method splunkjs.Service.ServerInfo
         */ 
        init: function(service) {
            this.name = "server-info";
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Represents a specific Splunk user.  You can update, remove and
     * perform various operations on this user.
     *
     * @endpoint authentication/users/{name}
     * @class splunkjs.Service.User
     * @extends splunkjs.Service.Entity
     */
    root.User = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.User
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
         * @method splunkjs.Service.User
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Represents the Splunk collection of users.  You can create and
     * list users using this container, or get a specific one.
     *
     * @endpoint authentication/users
     * @class splunkjs.Service.Users
     * @extends splunkjs.Service.Collection
     */  
    root.Users = root.Collection.extend({
        /**
         * Whether or not to call `fetch()` after an entity
         * is created. By default we don't fetch
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @method splunkjs.Service.Users
         */
        fetchOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Users
         */
        path: function() {
            return Paths.users;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.User} A splunkjs.Service.User instance
         
         * @method splunkjs.Service.Users
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
         * @method splunkjs.Service.Users
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
         * @method splunkjs.Service.Users
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
                    entity.fetch(function() {
                        if (req.wasAborted) {
                            return; // aborted, so ignore
                        }
                        else {
                            callback.apply(null, arguments);
                        }
                    });
                }
            });
            
            return req;
        }
    });
    
    /**
     * Represents a specific Splunk view.  You can update, remove and
     * perform various operations on this view.
     *
     * @endpoint data/ui/views/{name}
     * @class splunkjs.Service.View
     * @extends splunkjs.Service.Entity
     */
    root.View = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.View
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
         * @method splunkjs.Service.View
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents the Splunk collection of views.  You can create and
     * list views using this container, or get a specific one.
     *
     * @endpoint data/ui/views
     * @class splunkjs.Service.Views
     * @extends splunkjs.Service.Collection
     */  
    root.Views = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Views
         */
        path: function() {
            return Paths.views;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.View} A splunkjs.Service.View instance
         
         * @method splunkjs.Service.Views
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
         * @method splunkjs.Service.Views
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents a specific Splunk index.  You can update and submit
     * events to this index.
     *
     * @endpoint data/indexes/name
     * @class splunkjs.Service.Index
     * @extends splunkjs.Service.Entity
     */
    root.Index = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Index
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
         * @method splunkjs.Service.Index
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
            
            this.submitEvent = utils.bind(this, this.submitEvent);
        },
        
        /**
         * Submit an event to this index
         *
         * @example
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
         * @method splunkjs.Service.Index
         */
        submitEvent: function(event, params, callback) {
            if (!callback && utils.isFunction(params)) {
                callback = params;
                params = {};
            }
            
            callback = callback || function() {};
            params = params || {};
            
            // Add the index name
            params["index"] = this.name;
            
            var that = this;
            return this.service.log(event, params, function(err, result) {
                callback(err, result, that); 
            });
        },
        
        remove: function() {
            throw new Error("Indexes cannot be removed");
        }
    });
        
    /**
     * Represents the Splunk collection of indexes.  You can create and
     * list indexes using this container, or get a specific one.
     *
     * @endpoint data/indexes
     * @class splunkjs.Service.Indexes
     * @extends splunkjs.Service.Collection
     */  
    root.Indexes = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Indexes
         */
        path: function() {
            return Paths.indexes;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Index} A splunkjs.Service.Index instance
         
         * @method splunkjs.Service.Indexes
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
         * @method splunkjs.Service.Indexes
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Create an index
         *
         * Create an index with the given name and parameters
         *
         * @example
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
         * @method splunkjs.Service.Indexes
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
     * Represents a specific Splunk stanza.  You can update and remove this
     * stanza.
     *
     * @endpoint configs/conf-{file}/{name}`
     * @class splunkjs.Service.ConfigurationStanza
     * @extends splunkjs.Service.Entity
     */
    root.ConfigurationStanza = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.ConfigurationStanza
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
         * @method splunkjs.Service.ConfigurationStanza
         */ 
        init: function(service, file, name, namespace) {
            this.name = name;
            this.file = file;
            this._super(service, this.path(), namespace);
        } 
    });
    
    /**
     * Represents the Splunk collection of stanzas for a specific property file.  
     * You can create and list stanzas using this container, or get a specific one.
     *
     * @endpoint configs/conf-{file}
     * @class splunkjs.Service.ConfigurationFile
     * @extends splunkjs.Service.Collection
     */  
    root.ConfigurationFile = root.Collection.extend({ 
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.ConfigurationFile
         */
        path: function() {
            return Paths.configurations + "/conf-" + encodeURIComponent(this.name);
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.ConfigurationStanza} A splunkjs.Service.ConfigurationStanza instance
         
         * @method splunkjs.Service.ConfigurationFile
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
         * @method splunkjs.Service.ConfigurationFile
         */  
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Create a stanza in this configuration file
         *
         * @example
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
         * @method splunkjs.Service.ConfigurationFile
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
     * Represents the Splunk collection of configuration files.  You can create and
     * list files using this container, or get a specific one.
     *
     * @endpoint properties
     * @class splunkjs.Service.Configurations
     * @extends splunkjs.Service.Collection
     */  
    root.Configurations = root.Collection.extend({
        /**
         * Whether or not to call `fetch()` after an entity
         * is created. By default we don't fetch
         * the entity, as the endpoint will return (echo) the created
         * entity
         *
         * @method splunkjs.Service.Configurations
         */
        fetchOnEntityCreation: true,
        
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Configurations
         */
        path: function() {
            return Paths.properties;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.ConfigurationFile} A splunkjs.Service.ConfigurationFile instance
         
         * @method splunkjs.Service.Configurations
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
         * @method splunkjs.Service.Configurations
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
         * @example
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
         * @method splunkjs.Service.Configurations
         */
        create: function(filename, callback) {
            // If someone called us with the default style of (params, callback),
            // lets make it work
            if (utils.isObject(filename)) {
                filename = filename["__conf"];
            }
            
            callback = callback || function() {};
            
            var that = this;
            var req = this.post("", {__conf: filename}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var entity = new root.ConfigurationFile(that.service, filename);
                    entity.fetch(function() {
                        if (req.wasAborted) {
                            return; // aborted, so ignore
                        }
                        else {
                            callback.apply(null, arguments);
                        }
                    });
                }
            });
            
            return req;
        }
    });

    /**
     * Represents a specific Splunk search job.  You can perform various operations
     * on this job, such as reading its status, cancelling it, getting results
     * and so on.
     *
     * @endpoint search/jobs/{search_id}
     * @class splunkjs.Service.Job
     * @extends splunkjs.Service.Entity
     */
    root.Job = root.Entity.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Job
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
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.cancel(function(err) {
         *          console.log("CANCELLED");
         *      });
         *
         * @param {Function} callback A callback when the search is done: `(err)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
         */
        cancel: function(callback) {
            var req = this.post("control", {action: "cancel"}, callback);
            
            return req;
        },

        /**
         * Disable preview for a job
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW DISABLED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW ENABLED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.finalize(function(err, job) {
         *          console.log("JOB FINALIZED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.pause(function(err, job) {
         *          console.log("JOB PAUSED");
         *      });
         *
         * @param {Function} callback A callback with the this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.searchlog(function(err, searchlog, job) {
         *          console.log(searchlog);
         *      });
         *
         * @param {Function} callback A callback with the searchlog and job: `(err, searchlog, job)`
         *
         * @endpoint search/jobs/{search_id}/search.log
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
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
         * @example
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
         * @method splunkjs.Service.Job
         */
        summary: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("summary", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data, that);
                }
            });
        },

        /**
         * Get the timeline for this job
         *
         * @example
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
         * @method splunkjs.Service.Job
         */
        timeline: function(params, callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.get("timeline", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.data, that);
                }
            });
        },

        /**
         * Touch a job
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.touch(function(err) {
         *          console.log("JOB TOUCHED");
         *      });
         *
         * @param {Function} callback A callback with this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.unpause(function(err) {
         *          console.log("JOB UNPAUSED");
         *      });
         *
         * @param {Function} callback A callback with this job: `(err, job)`
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
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
     * Represents the Splunk collection of jobs.  You can create and
     * list search jobs using this container, or get a specific one.
     *
     * @endpoint search/jobs
     * @class splunkjs.Service.Jobs
     * @extends splunkjs.Service.Collection
     */  
    root.Jobs = root.Collection.extend({
        /**
         * REST path for this resource (with no namespace)
         *
         * @method splunkjs.Service.Jobs
         */
        path: function() {
            return Paths.jobs;
        },
        
        /**
         * Create a local instance of an entity
         *
         * @param {Object} props The properties for this entity
         * @return {splunkjs.Service.Job} A splunkjs.Service.Job instance
         
         * @method splunkjs.Service.Jobs
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
         * @method splunkjs.Service.Jobs
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
         * @method splunkjs.Service.Jobs
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
                return;
            } 

            var that = this;
            return this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var job = new root.Job(that.service, response.data.sid, that.namespace);
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
         * @example
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
         * @method splunkjs.Service.Jobs
         */
        search: function(query, params, callback) {
            return this.create(query, params, callback);
        },
                
        /**
         * Create a oneshot search job
         *
         * Create a oneshot search job using the specified query and parameters.
         *
         * @example
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
         * @method splunkjs.Service.Jobs
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