/*!*/
// Copyright 2012 Splunk, Inc.
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
    
    // /**
    //  * Contains functionality common to Splunk Enterprise and Splunk Storm.
    //  * 
    //  * This class is an implementation detail and is therefore SDK-private.
    //  * 
    //  * @class splunkjs.private.BaseService
    //  * @extends splunkjs.Context
    //  */
    var BaseService = Context.extend({
        init: function() {
            this._super.apply(this, arguments);
        }
    });

    /**
     * Provides a root access point to Splunk functionality with typed access to 
     * Splunk resources such as searches, indexes, inputs, and more. Provides
     * methods to authenticate and create specialized instances of the service.
     *
     * @class splunkjs.Service
     * @extends splunkjs.private.BaseService
     */
    module.exports = root = Service = BaseService.extend({
        /**
         * Constructor for `splunkjs.Service`.
         *
         * @constructor
         * @param {splunkjs.Http} http An instance of a `splunkjs.Http` class.
         * @param {Object} params A dictionary of optional parameters: 
         *    - `scheme` (_string_): The scheme ("http" or "https") for accessing Splunk.
         *    - `host` (_string_): The host name (the default is "localhost").
         *    - `port` (_integer_): The port number (the default is 8089).
         *    - `username` (_string_): The Splunk account username, which is used to authenticate the Splunk instance.
         *    - `password` (_string_): The password, which is used to authenticate the Splunk instance.
         *    - `owner` (_string_): The owner (username) component of the namespace.
         *    - `app` (_string_): The app component of the namespace.
         *    - `sessionKey` (_string_): The current session token.
         *    - `autologin` (_boolean_): `true` to automatically try to log in again if the session terminates, `false` if not (`true` by default).
         *    - `version` (_string_): The version string for Splunk, for example "4.3.2" (the default is "5.0").
         * @return {splunkjs.Service} A new `splunkjs.Service` instance.
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
         * Creates a specialized version of the current `Service` instance for
         * a specific namespace context. 
         *
         * @example
         *
         *      var svc = ...;
         *      var newService = svc.specialize("myuser", "unix");
         *
         * @param {String} owner The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         * @param {String} app The app context for this resource (such as "search"). The "-" wildcard means all apps.
         * @return {splunkjs.Service} The specialized `Service` instance.
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
                sessionKey: this.sessionKey,
                version: this.version
            });
        },
        
        /**
         * Gets the `Applications` collection, which allows you to 
         * list installed apps and retrieve information about them.
         *
         * @example
         *
         *      // List installed apps
         *      var apps = svc.apps();
         *      apps.fetch(function(err) { console.log(apps.list()); });
         *
         * @return {splunkjs.Service.Collection} The `Applications` collection.
         *
         * @endpoint apps/local
         * @method splunkjs.Service
         * @see splunkjs.Service.Applications
         */
        apps: function() {
            return new root.Applications(this);
        },
        
        /**
         * Gets the `Configurations` collection, which lets you 
         * create, list, and retrieve configuration (.conf) files.
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
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Configurations} The `Configurations` collection.
         *
         * @endpoint configs
         * @method splunkjs.Service
         * @see splunkjs.Service.Configurations
         */
        configurations: function(namespace) {
            return new root.Configurations(this, namespace);
        },
        
        /**
         * Gets the `Indexes` collection, which lets you create, 
         * list, and update indexes. 
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
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Indexes} The `Indexes` collection.
         *
         * @endpoint data/indexes
         * @method splunkjs.Service
         * @see splunkjs.Service.Indexes
         */        
        indexes: function(namespace) { 
            return new root.Indexes(this, namespace);
        },
        
        /**
         * Gets the `SavedSearches` collection, which lets you
         * create, list, and update saved searches. 
         *
         * @example
         *
         *      // List all # of saved searches
         *      var savedSearches = svc.savedSearches();
         *      savedSearches.fetch(function(err, savedSearches) {
         *          console.log("# Of Saved Searches: " + savedSearches.list().length);
         *      });
         *
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.SavedSearches} The `SavedSearches` collection.
         *
         * @endpoint saved/searches
         * @method splunkjs.Service
         * @see splunkjs.Service.SavedSearches
         */
        savedSearches: function(namespace) {
            return new root.SavedSearches(this, namespace);
        },
        
        /**
         * Gets the `Jobs` collection, which lets you create, list, 
         * and retrieve search jobs. 
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
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Jobs} The `Jobs` collection.
         *
         * @endpoint search/jobs
         * @method splunkjs.Service
         * @see splunkjs.Service.Jobs
         */
        jobs: function(namespace) {
            return new root.Jobs(this, namespace);  
        },
        
        /**
         * Gets the `Users` collection, which lets you create, 
         * list, and retrieve users. 
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
         * @return {splunkjs.Service.Users} The `Users` collection.
         *
         * @endpoint authorization/users
         * @method splunkjs.Service
         * @see splunkjs.Service.Users
         */
        users: function() {
            return new root.Users(this);  
        },
        
        /**
         * Gets the `Views` collection, which lets you create,
         * list, and retrieve views (custom UIs built in Splunk's app framework). 
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
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Views} The `Views` collection.
         *
         * @endpoint data/ui/views
         * @method splunkjs.Service
         * @see splunkjs.Service.Views
         */
        views: function(namespace) {
            return new root.Views(this, namespace);  
        },
        
        /**
         * Creates a search job with a given search query and optional parameters, including `exec_mode` to specify the type of search:
         *
         *    - Use `exec_mode=normal` to return a search job ID immediately (default).
         *      Poll for completion to find out when you can retrieve search results. 
         *
         *    - Use `exec_mode=blocking` to return the search job ID when the search has finished.
         * 
         * To run a oneshot search, which does not create a job but rather returns the search results, use `Service.oneshotSearch`.
         *
         * @example
         *
         *      service.search("search ERROR", {id: "myjob_123"}, function(err, newJob) {
         *          console.log("CREATED": newJob.sid);
         *      });
         *
         * @param {String} query The search query.
         * @param {Object} params A dictionary of properties for the job. For a list of available parameters, see <a href=" http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Function} callback A function to call with the created job: `(err, createdJob)`.
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
         * Creates a oneshot search from a given search query and optional parameters.
         *
         * @example
         *
         *      service.oneshotSearch("search ERROR", {id: "myjob_123"}, function(err, results) {
         *          console.log("RESULT FIELDS": results.fields);
         *      });
         *
         * @param {String} query The search query.
         * @param {Object} params A dictionary of properties for the search:
         *    - `output_mode` (_string_): Specifies the output format of the results (XML, JSON, or CSV).
         *    - `earliest_time` (_string_): Specifies the earliest time in the time range to search. The time string can be a UTC time (with fractional seconds), a relative time specifier (to now), or a formatted time string.
         *    - `latest_time` (_string_): Specifies the latest time in the time range to search. The time string can be a UTC time (with fractional seconds), a relative time specifier (to now), or a formatted time string.
         *    - `rf` (_string_): Specifies one or more fields to add to the search.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Function} callback A function to call with the results of the search: `(err, results)`.
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
         * Gets the user that is currently logged in.
         *
         * @example
         *
         *      service.currentUser(function(err, user) {
         *          console.log("Real name: ", user.properties().realname);
         *      });
         *
         * @param {Function} callback A function to call with the user instance: `(err, user)`.
         * @return {splunkjs.Service.currentUser} The `User`.
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
         * Gets configuration information about the server.
         *
         * @example
         *
         *      service.serverInfo(function(err, info) {
         *          console.log("Splunk Version: ", info.properties().version);
         *      });
         *
         * @param {Function} callback A function to call with the server info: `(err, info)`.
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
         * Parses a search query.
         *
         * @example
         *
         *      service.parse("search index=_internal | head 1", function(err, parse) {
         *          console.log("Commands: ", parse.commands);
         *      });
         *
         * @param {String} query The search query to parse.
         * @param {Object} params An object of options for the parser:
         *    - `enable_lookups` (_boolean_): If `true`, performs reverse lookups to expand the search expression.
         *    - `output_mode` (_string_): The output format (XML or JSON).
         *    - `parse_only` (_boolean_): If `true`, disables the expansion of search due to evaluation of subsearches, time term expansion, lookups, tags, eventtypes, and sourcetype alias.
         *    - `reload_macros` (_boolean_): If `true`, reloads macro definitions from macros.conf.
         * @param {Function} callback A function to call with the parse info: `(err, parse)`.
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
        
        /**
         * Provides auto-complete suggestions for search queries.
         *
         * @example
         *
         *      service.typeahead("index=", 10, function(err, options) {
         *          console.log("Autocompletion options: ", options);
         *      });
         *
         * @param {String} prefix The query fragment to autocomplete.
         * @param {Number} count The number of options to return (optional).
         * @param {Function} callback A function to call with the autocompletion info: `(err, options)`.
         *
         * @endpoint search/typeahead
         * @method splunkjs.Service
         */
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
                    var results = (response.data || {}).results;
                    callback(null, results || []);
                }
            });
        },
        
        /**
         * Logs an event to Splunk.
         *
         * @example
         *
         *      service.log("A new event", {index: "_internal", sourcetype: "mysourcetype"}, function(err, result) {
         *          console.log("Submitted event: ", result);
         *      });
         *
         * @param {String|Object} event The text for this event, or a JSON object.
         * @param {Object} params A dictionary of parameters for indexing: 
         *    - `index` (_string_): The index to send events from this input to.
         *    - `host` (_string_): The value to populate in the Host field for events from this data input. 
         *    - `host_regex` (_string_): A regular expression used to extract the host value from each event. 
         *    - `source` (_string_): The value to populate in the Source field for events from this data input.
         *    - `sourcetype` (_string_): The value to populate in the Sourcetype field for events from this data input.
         * @param {Function} callback A function to call when the event is submitted: `(err, result)`.
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
            
            // If the event is a JSON object, convert it to a string.
            if (utils.isObject(event)) {
                event = JSON.stringify(event);
            }
            
            var path = this.paths.submitEvent;
            var method = "POST";
            var headers = {"Content-Type": "text/plain"};
            var body = event;
            var get = params;
            var post = {};
            
            var req = this.request(
                path, 
                method, 
                get, 
                post, 
                body, 
                headers, 
                function(err, response) {
                    if (err) {
                        callback(err);
                    } 
                    else {
                        callback(null, response.data);
                    }
                }
            );
            
            return req;
        }
    });

    /**
     * Provides a base definition for a Splunk endpoint, which is a combination of
     * a specific service and path. Provides convenience methods for GET, POST, and
     * DELETE operations used in splunkjs, automatically preparing the path correctly
     * and allowing for relative calls.
     *
     * @class splunkjs.Service.Endpoint
     */
    root.Endpoint = Class.extend({
        /**
         * Constructor for `splunkjs.Service.Endpoint`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} qualifiedPath A fully-qualified relative endpoint path (for example, "/services/search/jobs").
         * @return {splunkjs.Service.Endpoint} A new `splunkjs.Service.Endpoint` instance.
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
         * Performs a relative GET request on an endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/results?offset=1
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.get("results", {offset: 1}, function() { console.log("DONE"))});
         *
         * @param {String} relpath A relative path to append to the endpoint path.
         * @param {Object} params A dictionary of entity-specific parameters to add to the query string.
         * @param {Function} callback A function to call when the request is complete: `(err, response)`.
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
         * Performs a relative POST request on an endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456/control
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.post("control", {action: "cancel"}, function() { console.log("CANCELLED"))});
         *
         * @param {String} relpath A relative path to append to the endpoint path.
         * @param {Object} params A dictionary of entity-specific parameters to add to the body.
         * @param {Function} callback A function to call when the request is complete: `(err, response)`.
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
         * Performs a relative DELETE request on an endpoint's path,
         * combined with the parameters and a relative path if specified.
         *
         * @example
         *
         *      // Will make a request to {service.prefix}/search/jobs/123456
         *      var endpoint = new splunkjs.Service.Endpoint(service, "search/jobs/12345");
         *      endpoint.delete("", {}, function() { console.log("DELETED"))});
         *
         * @param {String} relpath A relative path to append to the endpoint path.
         * @param {Object} params A dictionary of entity-specific parameters to add to the query string.
         * @param {Function} callback A function to call when the request is complete: `(err, response)`.
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
     * Provides a base definition for a Splunk resource (for example, an entity 
     * such as an index or search job, or a collection of entities). Provides 
     * basic methods for handling Splunk resources, such as validation and 
     * accessing properties. 
     *
     * This class should not be used directly because most methods are meant to be overridden.
     *
     * @class splunkjs.Service.Resource
     * @extends splunkjs.Service.Endpoint
     */
    root.Resource = root.Endpoint.extend({
        /**
         * Constructor for `splunkjs.Service.Resource`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} path A relative endpoint path (for example, "search/jobs").
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Resource} A new `splunkjs.Service.Resource` instance.
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
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Resource
         */
        path: function() {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Loads the resource and stores the properties.
         *
         * @param {Object} properties The properties for this resource.
         *
         * @method splunkjs.Service.Resource
         * @protected
         */
        _load: function(properties) {
            this._properties = properties || {};
            this._state = properties || {};
        },
        
        /**
         * Refreshes the resource by fetching the object from the server
         * and loading it.
         *
         * @param {Function} callback A function to call when the object is retrieved: `(err, resource)`.
         *
         * @method splunkjs.Service.Resource
         * @protected
         */
        fetch: function(callback) {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Retrieves the current properties for this resource.
         *
         * @return {Object} The properties.
         *
         * @method splunkjs.Service.Resource
         */
        properties: function() {
            return this._properties;
        },
        
        /**
         * Retrieves the current full state (properties and metadata) of this resource.
         *
         * @return {Object} The current full state of this resource.
         *
         * @method splunkjs.Service.Resource
         */
        state: function() {
            return this._state;
        }
    });
    
    /**
     * Defines a base class for a Splunk entity, which is a well-defined construct
     * with certain operations (such as "properties", "update", and "delete"). 
     * Entities include search jobs, indexes, inputs, apps, and more. 
     *
     * Provides basic methods for working with Splunk entities, such as fetching and
     * updating them.
     *
     * @class splunkjs.Service.Entity
     * @extends splunkjs.Service.Resource
     */
    root.Entity = root.Resource.extend({
        /**
         * A static property that indicates whether to call `fetch` after an 
         * update to get the updated entity. By default, the entity is not 
         * fetched because the endpoint returns (echoes) the updated entity.
         *
         * @method splunkjs.Service.Entity
         */
        fetchOnUpdate: false,
        
        /**
         * Constructor for `splunkjs.Service.Entity`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} path A relative endpoint path (for example, "search/jobs").
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Entity} A new `splunkjs.Service.Entity` instance.
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
         * Loads the entity and stores the properties.
         *
         * @param {Object} properties The properties for this entity.
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
         * Retrieves the fields information for this entity, indicating which 
         * fields are wildcards, required, and optional.
         *
         * @return {Object} The fields information.
         *
         * @method splunkjs.Service.Entity
         */
        fields: function() {
            return this._fields;
        },
        
        /**
         * Retrieves the access control list (ACL) information for this entity,
         * which contains the permissions for accessing the entity.
         *
         * @return {Object} The ACL.
         *
         * @method splunkjs.Service.Entity
         */
        acl: function() {
            return this._acl;
        },
        
        /**
         * Retrieves the links information for this entity, which is the URI of
         * the entity relative to the management port of a Splunk instance.
         *
         * @return {Object} The links information.
         *
         * @method splunkjs.Service.Entity
         */
        links: function() {
            return this._links;
        },
        
        /**
         * Retrieves the author information for this entity.
         *
         * @return {String} The author.
         *
         * @method splunkjs.Service.Entity
         */
        author: function() {
            return this._author;
        },
        
        /**
         * Retrieves the updated time for this entity.
         *
         * @return {String} The updated time.
         *
         * @method splunkjs.Service.Entity
         */
        updated: function() {
            return this._updated;
        },
        
        /**
         * Retrieves the published time for this entity.
         *
         * @return {String} The published time.
         *
         * @method splunkjs.Service.Entity
         */
        published: function() {
            return this._published;
        },
        
        /**
         * Refreshes the entity by fetching the object from the server and 
         * loading it.
         *
         * @param {Object} options An optional dictionary of collection filtering and pagination options:
         *    - `count` (_integer_): The maximum number of items to return.
         *    - `offset` (_integer_): The offset of the first item to return.
         *    - `search` (_string_): The search query to filter responses.
         *    - `sort_dir` (_string_): The direction to sort returned items: “asc” or “desc”.
         *    - `sort_key` (_string_): The field to use for sorting (optional).
         *    - `sort_mode` (_string_): The collating sequence for sorting returned items: “auto”, “alpha”, “alpha_case”, or “num”.
         * @param {Function} callback A function to call when the object is retrieved: `(err, resource)`.
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
                    that._load(response.data ? response.data.entry : null);
                    callback(null, that);
                }
            });
        },
        
        /**
         * Deletes the entity from the server.
         *
         * @param {Function} callback A function to call when the object is deleted: `(err)`.
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
         * Updates the entity on the server.
         *
         * @param {Object} props The properties to update the object with.
         * @param {Function} callback A function to call when the object is updated: `(err, entity)`.
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
         * Disables the entity on the server.
         *
         * @param {Function} callback A function to call when the object is disabled: `(err, entity)`.
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
         * Enables the entity on the server.
         *
         * @param {Function} callback A function to call when the object is enabled: `(err, entity)`.
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
         * Reloads the entity on the server.
         *
         * @param {Function} callback A function to call when the object is reloaded: `(err, entity)`.
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
     * Defines a base class for a Splunk collection, which is a well-defined construct
     * that provides basic methods for working with collections of entities, such as 
     * creating and listing entities.
     *
     * @class splunkjs.Service.Collection
     * @extends splunkjs.Service.Resource
     */
    root.Collection = root.Resource.extend({
        /**
         * A static property that indicates whether to call `fetch` after an 
         * entity has been created. By default, the entity is not fetched 
         * because the endpoint returns (echoes) the new entity.

         * @method splunkjs.Service.Collection
         */
        fetchOnEntityCreation: false,
        
        /**
         * Constructor for `splunkjs.Service.Collection`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} path A relative endpoint path (for example, "search/jobs").
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Collection} A new `splunkjs.Service.Collection` instance.
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
         * Creates a local instance of an entity. 
         *
         * @param {Object} props The properties for this entity.
         * @return {splunkjs.Service.Entity} A new `splunkjs.Service.Entity` instance.
         *
         * @method splunkjs.Service.Collection
         */
        instantiateEntity: function(props) {
            throw new Error("MUST BE OVERRIDDEN");
        },
        
        /**
         * Loads the collection and properties, and creates a map of entity
         * names to entity IDs (for retrieval purposes).
         *
         * @param {Object} properties The properties for this collection.
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
         * Retrieves the links information for this collection, which is the URI of
         * the resource relative to the management port of a Splunk instance.
         *
         * @return {Object} The links information.
         *
         * @method splunkjs.Service.Collection
         */
        links: function() {
            return this._links;
        },
        
        /**
         * Retrieves the author information for this collection.
         *
         * @return {String} The author.
         *
         * @method splunkjs.Service.Collection
         */
        paging: function() {
            return this._paging;
        },
        
        /**
         * Retrieves the updated time for this collection.
         *
         * @return {String} The updated time.
         *
         * @method splunkjs.Service.Collection
         */
        updated: function() {
            return this._updated;
        },
        
        /**
         * Refreshes the resource by fetching the object from the server and 
         * loading it.
         *
         * @param {Object} options A dictionary of collection filtering and pagination options:
         *    - `count` (_integer_): The maximum number of items to return.
         *    - `offset` (_integer_): The offset of the first item to return.
         *    - `search` (_string_): The search query to filter responses.
         *    - `sort_dir` (_string_): The direction to sort returned items: “asc” or “desc”.
         *    - `sort_key` (_string_): The field to use for sorting (optional).
         *    - `sort_mode` (_string_): The collating sequence for sorting returned items: “auto”, “alpha”, “alpha_case”, or “num”.
         * @param {Function} callback A function to call when the object is retrieved: `(err, resource)`.
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
         * Returns a specific entity from the collection.
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
         * @param {String} id The name of the entity to retrieve.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @returns {splunkjs.Service.Entity} The entity, or `null` if one is not found.
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
         * Creates an entity on the server for this collection with the specified
         * parameters.
         *
         * @example
         *
         *      var apps = service.apps();
         *      apps.create({name: "NewSearchApp"}, function(err, newApp) {
         *          console.log("CREATED");
         *      });
         *
         * @param {Object} params A dictionary of entity-specific properties.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         * @returns {Array} An array of `splunkjs.Service.Entity` objects.
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
         * Retrieves a list of all entities in the collection.
         *
         * @example
         *
         *      var apps = service.apps();
         *      apps.fetch(function(err, apps) {
         *          var appList = apps.list();
         *          console.log(appList.length);
         *      });
         *
         * @param {Function} callback A function to call with the list of entities: `(err, list)`.
         *
         * @method splunkjs.Service.Collection
         */
        list: function(callback) {
            callback = callback || function() {};
            
            return utils.clone(this._entities);
        }
    });
    
    /**
     * Represents a specific saved search, which you can then view, modify, and
     * remove.
     *
     * @endpoint saved/searches/{name}
     * @class splunkjs.Service.SavedSearch
     * @extends splunkjs.Service.Entity
     */
    root.SavedSearch = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.SavedSearch
         */
        path: function() {
            return Paths.savedSearches + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.SavedSearch`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new saved search.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.SavedSearch} A new `splunkjs.Service.SavedSearch` instance.
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
         * Acknowledges the suppression of the alerts from a saved search and
         * resumes alerting.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.acknowledge(function(err, search) {
         *          console.log("ACKNOWLEDGED);
         *      });
         *
         * @param {Function} callback A function to call when the saved search is acknowledged: `(err, savedSearch)`.
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
         * Dispatches a saved search, which creates a search job and returns a 
         * `splunkjs.Service.Job` instance in the callback function.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.dispatch({force_dispatch: false}, function(err, job, savedSearch) {
         *          console.log("Job SID: ", job.sid);
         *      });
         *
         * @param {Object} options The options for dispatching this saved search:
         *    - `dispatch.now` (_string_): The time that is used to dispatch the search as though the specified time were the current time.
         *    - `dispatch.*` (_string_): Overwrites the value of the search field specified in *.
         *    - `trigger_actions` (_boolean_): Indicates whether to trigger alert actions.
         *    - `force_dispatch` (_boolean_): Indicates whether to start a new search if another instance of this search is already running.
         * @param {Function} callback A function to call when the saved search is dispatched: `(err, job, savedSearch)`.
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
         * Retrieves the job history for a saved search, which is a list of 
         * `splunkjs.Service.Job` instances.
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
         * @param {Function} callback A function to call when the history is retrieved: `(err, job, savedSearch)`.
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
                var data = response.data.entry || [];
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
         * Retrieves the suppression state of a saved search.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.history(function(err, suppressionState, search) {
         *          console.log("STATE: ", suppressionState);
         *      });
         *
         * @param {Function} callback A function to call when the suppression state is retrieved: `(err, suppressionState, savedSearch)`.
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
         * Updates the saved search on the server. 
         *
         * **Note:** The search query is required, even when it isn't being modified.
         * If you don't provide it, this method will fetch the search string from
         * the server or from the local cache. 
         *
         * @param {Object} props The properties to update the saved search with. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#savedsearchparams" target="_blank">Saved search parameters</a> on Splunk Developer Portal.
         * @param {Function} callback A function to call when the object is updated: `(err, entity)`.
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
     * Represents a collection of saved searches. You can create and list saved 
     * searches using this collection container, or get a specific saved search.
     *
     *
     * @endpoint saved/searches
     * @class splunkjs.Service.SavedSearches
     * @extends splunkjs.Service.Collection
     */
    root.SavedSearches = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.SavedSearches
         */
        path: function() {
            return Paths.savedSearches;
        },
        
        /**
         * Creates a local instance of a saved search.
         *
         * @param {Object} props The properties for the new saved search. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#savedsearchparams" target="_blank">Saved search parameters</a> on Splunk Developer Portal.
         * @return {splunkjs.Service.SavedSearch} A new `splunkjs.Service.SavedSearch` instance.
         *
         * @method splunkjs.Service.SavedSearches
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.SavedSearch(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.SavedSearches`. 
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.SavedSearches} A new `splunkjs.Service.SavedSearches` instance.
         *
         * @method splunkjs.Service.SavedSearches
         */     
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents a specific Splunk app that you can view, modify, and
     * remove.
     *
     * @endpoint apps/local/{name}
     * @class splunkjs.Service.Application
     * @extends splunkjs.Service.Entity
     */
    root.Application = root.Entity.extend({
        /**
         * Indicates whether to call `fetch` after an update to get the updated 
         * item. 
         *
         * @method splunkjs.Service.Application
         */
        fetchOnUpdate: true,
        
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Application
         */
        path: function() {
            return Paths.apps + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.Application`. 
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name of the Splunk app.
         * @return {splunkjs.Service.Application} A new `splunkjs.Service.Application` instance.
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
         * Retrieves the setup information for a Splunk app.
         *
         * @example
         *
         *      var app = service.apps().item("app");
         *      app.setup(function(err, info, search) {
         *          console.log("SETUP INFO: ", info);
         *      });
         *
         * @param {Function} callback A function to call when setup information is retrieved: `(err, info, app)`.
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
         * Retrieves any information for an update to a locally-installed Splunk app.
         *
         * @example
         *
         *      var app = service.apps().item("MyApp");
         *      app.updateInfo(function(err, info, app) {
         *          console.log("UPDATE INFO: ", info);
         *      });
         *
         * @param {Function} callback A function to call when update information is retrieved: `(err, info, app)`.
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
     * Represents a collection of Splunk apps. You can create and list applications 
     * using this collection container, or get a specific app.
     *
     * @endpoint apps/local
     * @class splunkjs.Service.Applications
     * @extends splunkjs.Service.Collection
     */  
    root.Applications = root.Collection.extend({
        /**
         * Indicates whether to call `fetch` after an entity has been created. By 
         * default, the entity is not fetched because the endpoint returns
         * (echoes) the new entity.
         *
         * @method splunkjs.Service.Applications
         */
        fetchOnEntityCreation: true,
        
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Applications
         */
        path: function() {
            return Paths.apps;
        },
        
        /**
         * Creates a local instance of an app.
         *
         * @param {Object} props The properties for the new app. For details, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTapps#POST_apps.2Flocal" target="_blank">POST apps/local</a> endpoint in the REST API documentation.
         * @return {splunkjs.Service.Application} A new `splunkjs.Service.Application` instance.
         *
         * @method splunkjs.Service.Applications
         */
        instantiateEntity: function(props) {
            return new root.Application(this.service, props.name, {});
        },
                
        /**
         * Constructor for `splunkjs.Service.Applications`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @return {splunkjs.Service.Applications} A new `splunkjs.Service.Applications` instance.
         *
         * @method splunkjs.Service.Applications
         */  
        init: function(service) {
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Provides access to configuration information about the server.
     *
     * @endpoint server/info
     * @class splunkjs.Service.ServerInfo
     * @extends splunkjs.Service.Entity
     */
    root.ServerInfo = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.ServerInfo
         */
        path: function() {
            return Paths.info;
        },
        
        /**
         * Constructor for `splunkjs.Service.ServerInfo`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @return {splunkjs.Service.ServerInfo} A new `splunkjs.Service.ServerInfo` instance.
         *
         * @method splunkjs.Service.ServerInfo
         */ 
        init: function(service) {
            this.name = "server-info";
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Represents a specific Splunk user, which you can view, modify, and
     * remove.
     *
     * @endpoint authentication/users/{name}
     * @class splunkjs.Service.User
     * @extends splunkjs.Service.Entity
     */
    root.User = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.User
         */
        path: function() {
            return Paths.users + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.User`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The Splunk username.
         * @return {splunkjs.Service.User} A new `splunkjs.Service.User` instance.
         *
         * @method splunkjs.Service.User
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, this.path(), {});
        }
    });
    
    /**
     * Represents a collection of users. You can create and list users using 
     * this collection container, or get a specific user.
     *
     * @endpoint authentication/users
     * @class splunkjs.Service.Users
     * @extends splunkjs.Service.Collection
     */  
    root.Users = root.Collection.extend({
        /**
         * Indicates whether to call `fetch` after an entity has been created. By 
         * default, the entity is not fetched because the endpoint returns
         * (echoes) the new entity.
         *
         * @method splunkjs.Service.Users
         */
        fetchOnEntityCreation: true,
        
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Users
         */
        path: function() {
            return Paths.users;
        },
        
        /**
         * Creates a local instance of a user.
         *
         * @param {Object} props The properties for this new user. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEJ8#userauthparams" target="_blank">User authentication parameters</a> on Splunk Developer Portal.
         * @return {splunkjs.Service.User} A new `splunkjs.Service.User` instance.
         *
         * @method splunkjs.Service.Users
         */
        instantiateEntity: function(props) {
            return new root.User(this.service, props.name, {});
        },
        
        /**
         * Constructor for `splunkjs.Service.Users`. 
         * 
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @return {splunkjs.Service.Users} A new `splunkjs.Service.Users` instance.
         *
         * @method splunkjs.Service.Users
         */  
        init: function(service) {
            this._super(service, this.path(), {});
        },
        
        /**
         * Creates a new user. 
         *
         * **Note:** This endpoint requires a special implementation.
         *
         * @param {Object} params A dictionary of properties. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEJ8#userauthparams" target="_blank">User authentication parameters</a> on Splunk Developer Portal.
         * @param {Function} callback A function to call with the new entity: `(err, createdEntity)`.
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
                    // This endpoint requires us to use the passed-in name
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
     * Represents a specific Splunk view, which you can view, modify, and
     * remove.
     *
     * @endpoint data/ui/views/{name}
     * @class splunkjs.Service.View
     * @extends splunkjs.Service.Entity
     */
    root.View = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.View
         */
        path: function() {
            return Paths.views + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.View`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name of the view.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.View} A new `splunkjs.Service.View` instance.
         *
         * @method splunkjs.Service.View
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents a collection of views. You can create and list views using 
     * this collection container, or get a specific view.
     *
     * @endpoint data/ui/views
     * @class splunkjs.Service.Views
     * @extends splunkjs.Service.Collection
     */  
    root.Views = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Views
         */
        path: function() {
            return Paths.views;
        },
        
        /**
         * Creates a local instance of a view.
         *
         * @param {Object} props The properties for the new view. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#POST_scheduled.2Fviews.2F.7Bname.7D" target="_blank">POST scheduled/views/{name}</a> endpoint in the REST API documentation.
         * @return {splunkjs.Service.View} A new `splunkjs.Service.View` instance.
         *
         * @method splunkjs.Service.Views
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.View(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.Views`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Views} A new `splunkjs.Service.Views` instance.
         *
         * @method splunkjs.Service.Views
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });
    
    /**
     * Represents an index, which you can update and submit events to.
     *
     * @endpoint data/indexes/name
     * @class splunkjs.Service.Index
     * @extends splunkjs.Service.Entity
     */
    root.Index = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Index
         */
        path: function() {
            return Paths.indexes + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.Index`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name of the index.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Index} A new `splunkjs.Service.Index` instance.
         *
         * @method splunkjs.Service.Index
         */ 
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
            
            this.submitEvent = utils.bind(this, this.submitEvent);
        },
        
        /**
         * Submits an event to this index.
         *
         * @example
         *
         *      var index = service.indexes().item("_internal");
         *      index.submitEvent("A new event", {sourcetype: "mysourcetype"}, function(err, result, index) {
         *          console.log("Submitted event: ", result);
         *      });
         *
         * @param {String} event The text for this event.
         * @param {Object} params A dictionary of parameters for indexing: 
         *    - `host` (_string_): The value to populate in the host field for events from this data input. 
         *    - `host_regex` (_string_): A regular expression used to extract the host value from each event. 
         *    - `source` (_string_): The source value to fill in the metadata for this input's events.
         *    - `sourcetype` (_string_): The sourcetype to apply to events from this input.
         * @param {Function} callback A function to call when the event is submitted: `(err, result, index)`.
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
        
        remove: function(callback) {
            if (this.service.versionCompare("5.0") < 0) {
                throw new Error("Indexes cannot be removed in Splunk 4.x");
            }
            else {
                return this._super(callback);
            }
        }
    });
        
    /**
     * Represents a collection of indexes. You can create and list indexes using 
     * this collection container, or get a specific index.
     *
     * @endpoint data/indexes
     * @class splunkjs.Service.Indexes
     * @extends splunkjs.Service.Collection
     */  
    root.Indexes = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Indexes
         */
        path: function() {
            return Paths.indexes;
        },
        
        /**
         * Creates a local instance of an index.
         *
         * @param {Object} props The properties for the new index. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEJ3#indexparams" target="_blank">Index parameters</a> on Splunk Developer Portal.
         * @return {splunkjs.Service.Index} A new `splunkjs.Service.Index` instance.
         *
         * @method splunkjs.Service.Indexes
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.Index(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.Indexes`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Indexes} A new `splunkjs.Service.Indexes` instance.
         *
         * @method splunkjs.Service.Indexes
         */  
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Creates an index with the given name and parameters.
         *
         * @example
         *
         *      var indexes = service.indexes();
         *      indexes.create("NewIndex", {assureUTF8: true}, function(err, newIndex) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} name A name for this index.
         * @param {Object} params A dictionary of properties. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEJ3#indexparams" target="_blank">Index parameters</a> on Splunk Developer Portal.
         * @param {Function} callback A function to call with the new index: `(err, createdIndex)`.
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
     * Represents a specific stanza, which you can update and remove, from a 
     * configuration file.
     *
     * @endpoint configs/conf-{file}/{name}`
     * @class splunkjs.Service.ConfigurationStanza
     * @extends splunkjs.Service.Entity
     */
    root.ConfigurationStanza = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.ConfigurationStanza
         */
        path: function() {
            return Paths.configurations + "/conf-" + encodeURIComponent(this.file) + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.ConfigurationStanza`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} file The name of the configuration file.
         * @param {String} name The name of the new stanza.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.ConfigurationStanza} A new `splunkjs.Service.ConfigurationStanza` instance.
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
     * Represents a collection of stanzas for a specific property file. You can
     * create and list stanzas using this collection container, or get a specific 
     * stanza.
     *
     * @endpoint configs/conf-{file}
     * @class splunkjs.Service.ConfigurationFile
     * @extends splunkjs.Service.Collection
     */  
    root.ConfigurationFile = root.Collection.extend({ 
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.ConfigurationFile
         */
        path: function() {
            return Paths.configurations + "/conf-" + encodeURIComponent(this.name);
        },
        
        /**
         * Creates a local instance of a stanza in a configuration file.
         *
         * @param {Object} props The key-value properties for the new stanza. 
         * @return {splunkjs.Service.ConfigurationStanza} A new `splunkjs.Service.ConfigurationStanza` instance.
         *
         * @method splunkjs.Service.ConfigurationFile
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.ConfigurationStanza(this.service, this.name, props.name, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.ConfigurationFile`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name of the configuration file.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.ConfigurationFile} A new `splunkjs.Service.ConfigurationFile` instance.
         *
         * @method splunkjs.Service.ConfigurationFile
         */  
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        },
        
        /**
         * Creates a stanza in this configuration file.
         *
         * @example
         *
         *      var file = service.configurations().item("props");
         *      file.create("my_stanza", function(err, newStanza) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} stanzaName A name for this stanza.
         * @param {Object} values A dictionary of key-value pairs to put in this stanza.
         * @param {Function} callback A function to call with the created stanza: `(err, createdStanza)`.
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
     * Represents a collection of configuration files. You can create and list 
     * configuration files using this collection container, or get a specific file.
     *
     * @endpoint properties
     * @class splunkjs.Service.Configurations
     * @extends splunkjs.Service.Collection
     */  
    root.Configurations = root.Collection.extend({
        /**
         * Indicates whether to call `fetch` after an entity has been created. By 
         * default, the entity is not fetched because the endpoint returns
         * (echoes) the new entity.
         *
         * @method splunkjs.Service.Configurations
         */
        fetchOnEntityCreation: true,
        
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Configurations
         */
        path: function() {
            return Paths.properties;
        },
        
        /**
         * Creates a local instance of a configuration file.
         *
         * @param {Object} props The properties for this configuration file.
         * @return {splunkjs.Service.ConfigurationFile} A new `splunkjs.Service.ConfigurationFile` instance.
         *
         * @method splunkjs.Service.Configurations
         */
        instantiateEntity: function(props) {
            return new root.ConfigurationFile(this.service, props.name, this.namespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.Configurations`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Configurations} A new `splunkjs.Service.Configurations` instance.
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
         * Creates a configuration file.
         *
         * @example
         *
         *      var properties = service.configurations();
         *      configurations.create("myprops", function(err, newFile) {
         *          console.log("CREATED");
         *      });
         *
         * @param {String} filename A name for this configuration file.
         * @param {Function} callback A function to call with the new configuration file: `(err, createdFile)`.
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
     * Represents a specific search job. You can perform different operations
     * on this job, such as reading its status, cancelling it, and getting results.
     *
     * @endpoint search/jobs/{search_id}
     * @class splunkjs.Service.Job
     * @extends splunkjs.Service.Entity
     */
    root.Job = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Job
         */
        path: function() {
            return Paths.jobs + "/" + encodeURIComponent(this.name);
        },
        
        /**
         * Constructor for `splunkjs.Service.Job`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} sid The search ID for this search job.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Job} A new `splunkjs.Service.Job` instance.
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
         * Cancels a search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.cancel(function(err) {
         *          console.log("CANCELLED");
         *      });
         *
         * @param {Function} callback A function to call when the search is done: `(err)`.
         *
         * @endpoint search/jobs/{search_id}/control
         * @method splunkjs.Service.Job
         */
        cancel: function(callback) {
            var req = this.post("control", {action: "cancel"}, callback);
            
            return req;
        },

        /**
         * Disables preview generation for a search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW DISABLED");
         *      });
         *
         * @param {Function} callback A function to call with this search job: `(err, job)`.
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
         * Enables preview generation for a search job. 
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.disablePreview(function(err, job) {
         *          console.log("PREVIEW ENABLED");
         *      });
         *
         * @param {Function} callback A function to call with this search job: `(err, job)`.
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
         * Returns the events of a search job with given parameters.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.events({count: 10}, function(err, events, job) {
         *          console.log("Fields: ", events.fields);
         *      });
         *
         * @param {Object} params The parameters for retrieving events. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#GET_search.2Fjobs.2F.7Bsearch_id.7D.2Fevents" target="_blank">GET search/jobs/{search_id}/events</a> endpoint in the REST API documentation.
         * @param {Function} callback A function to call when the events are retrieved: `(err, events, job)`.
         *
         * @endpoint search/jobs/{search_id}/events
         * @method splunkjs.Service.Job
         */
        events: function(params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.output_mode = params.output_mode || "json_rows"; 
            
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
         * Finalizes a search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.finalize(function(err, job) {
         *          console.log("JOB FINALIZED");
         *      });
         *
         * @param {Function} callback A function to call with the job: `(err, job)`.
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
         * Returns an iterator over this search job's events or results.
         *
         * @param {String} type One of {"events", "preview", "results"}.
         * @param {Object} params A dictionary of optional parameters:
         *    - `pagesize` (_integer_): The number of items to return on each request. Defaults to as many as possible.
         * @return {Object} An iterator object with a `next(callback)` method, where `callback` is of the form `(err, results, hasMoreResults)`.
         * 
         * @endpoint search/jobs/{search_id}/results
         * @method splunkjs.Service.Job
         */
        iterator: function(type, params) {
            return new root.PaginatedEndpointIterator(this[type], params);
        },

        /**
         * Pauses a search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.pause(function(err, job) {
         *          console.log("JOB PAUSED");
         *      });
         *
         * @param {Function} callback A function to call with the job: `(err, job)`.
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
         * Gets the preview results for a search job with given parameters.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.preview({count: 10}, function(err, results, job) {
         *          console.log("Fields: ", results.fields);
         *      });
         *
         * @param {Object} params The parameters for retrieving preview results. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#GET_search.2Fjobs.2F.7Bsearch_id.7D.2Fresults_preview" target="_blank">GET search/jobs/{search_id}/results_preview</a> endpoint in the REST API documentation.
         * @param {Function} callback A function to call when the preview results are retrieved : `(err, results, job)`.
         *
         * @endpoint search/jobs/{search_id}/results_preview
         * @method splunkjs.Service.Job
         */
        preview: function(params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.output_mode = params.output_mode || "json_rows"; 
            
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
         * Gets the results for a search job with given parameters.
         * 
         * The callback can get `undefined` for its `results` parameter if the
         * job is not yet done. To avoid this, use the `Job.track()` method to
         * wait until the job is complete prior to fetching the results with
         * this method.
         * 
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.results({count: 10}, function(err, results, job) {
         *          console.log("Fields: ", results.results);
         *      });
         *
         * @param {Object} params The parameters for retrieving search results. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#GET_search.2Fjobs.2F.7Bsearch_id.7D.2Fresults" target="_blank">GET search/jobs/{search_id}/results</a> endpoint in the REST API documentation.
         * @param {Function} callback A function to call when the results are retrieved: `(err, results, job)`.
         *
         * @endpoint search/jobs/{search_id}/results
         * @method splunkjs.Service.Job
         */
        results: function(params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.output_mode = params.output_mode || "json_rows";            
            
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
         * Gets the search log for this search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.searchlog(function(err, searchlog, job) {
         *          console.log(searchlog);
         *      });
         *
         * @param {Function} callback A function to call with the search log and job: `(err, searchlog, job)`.
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
                    callback(null, response.data, that);
                }
            });
        },

        /**
         * Sets the priority for this search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.setPriority(6, function(err, job) {
         *          console.log("JOB PRIORITY SET");
         *      });
         *
         * @param {Number} value The priority (an integer between 1-10). A higher value means a higher priority.
         * @param {Function} callback A function to call with the search job: `(err, job)`.
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
         * Sets the time to live (TTL) for the search job, which is the time before
         * the search job expires after it has been completed and is still available.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.setTTL(1000, function(err, job) {
         *          console.log("JOB TTL SET");
         *      });
         *
         * @param {Number} value The time to live, in seconds. 
         * @param {Function} callback A function to call with the search job: `(err, job)`.
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
         * Gets the summary for this search job with the given parameters.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.summary({top_count: 5}, function(err, summary, job) {
         *          console.log("Summary: ", summary);
         *      });
         *
         * @param {Object} params The parameters for retrieving the summary. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#GET_search.2Fjobs.2F.7Bsearch_id.7D.2Fsummary" target="_blank">GET search/jobs/{search_id}/summary</a> endpoint in the REST API documentation.
         * @param {Function} callback A function to call with the summary and search job: `(err, summary, job)`.
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
         * Gets the timeline for this search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.timeline({time_format: "%c"}, function(err, job, timeline) {
         *          console.log("Timeline: ", timeline);
         *      });
         *
         * @param {Object} params The parameters for retrieving the timeline. For a list of available parameters, see the <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTsearch#GET_search.2Fjobs.2F.7Bsearch_id.7D.2Ftimeline" target="_blank">GET search/jobs/{search_id}/timeline </a> endpoint in the REST API documentation.
         * @param {Function} callback A function to call with the timeline and search job: `(err, timeline, job)`.
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
         * Touches a search job, which means extending the expiration time of 
         * the search to now plus the time to live (TTL).
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.touch(function(err) {
         *          console.log("JOB TOUCHED");
         *      });
         *
         * @param {Function} callback A function to call with the search job: `(err, job)`.
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
         * Starts polling the status of this search job, and fires callbacks
         * upon each status change.
         * 
         * @param {Object} options A dictionary of optional parameters:
         *    - `period` (_integer_): The number of milliseconds to wait between each poll. Defaults to 500.
         * @param {Object|Function} callbacks A dictionary of optional callbacks:
         *    - `ready`: A function `(job)` invoked when the job's properties first become available.
         *    - `progress`: A function `(job)` invoked whenever new job properties are available.
         *    - `done`: A function `(job)` invoked if the job completes successfully. No further polling is done.
         *    - `failed`: A function `(job)` invoked if the job fails executing on the server. No further polling is done.
         *    - `error`: A function `(err)` invoked if an error occurs while polling. No further polling is done.
         * Or, if a function `(job)`, equivalent to passing it as a `done` callback.
         *
         * @method splunkjs.Service.Job
         */
        track: function(options, callbacks) {
            var period = options.period || 500; // ms
            
            if (utils.isFunction(callbacks)) {
                callbacks = {
                    done: callbacks
                };
            }
            
            var noCallbacksAfterReady = (
                !callbacks.progress &&
                !callbacks.done &&
                !callbacks.failed &&
                !callbacks.error
            );
            
            callbacks.ready = callbacks.ready || function() {};
            callbacks.progress = callbacks.progress || function() {};
            callbacks.done = callbacks.done || function() {};
            callbacks.failed = callbacks.failed || function() {};
            callbacks.error = callbacks.error || function() {};
            
            // For use by tests only
            callbacks._preready = callbacks._preready || function() {};
            callbacks._stoppedAfterReady = callbacks._stoppedAfterReady || function() {};
            
            var that = this;
            var emittedReady = false;
            var doneLooping = false;
            Async.whilst(
                function() { return !doneLooping; },
                function(nextIteration) {
                    that.fetch(function(err, job) {
                        if (err) {
                            nextIteration(err);
                            return;
                        }
                        
                        var notReady = (job.properties().isDone === undefined);
                        if (notReady) {
                            callbacks._preready(job);
                        }
                        else {
                            if (!emittedReady) {
                                callbacks.ready(job);
                                emittedReady = true;
                                
                                // Optimization: Don't keep polling the job if the
                                // caller only cares about the `ready` event.
                                if (noCallbacksAfterReady) {
                                    callbacks._stoppedAfterReady(job);
                                    
                                    doneLooping = true;
                                    nextIteration();
                                    return;
                                }
                            }
                            
                            callbacks.progress(job);
                            
                            var props = job.properties();
                            var dispatchState = props.dispatchState;
                            
                            if (dispatchState === "DONE" && props.isDone) {
                                callbacks.done(job);
                                
                                doneLooping = true;
                                nextIteration();
                                return;
                            }
                            else if (dispatchState === "FAILED" && props.isFailed) {
                                callbacks.failed(job);
                                
                                doneLooping = true;
                                nextIteration();
                                return;
                            }
                        }
                        
                        Async.sleep(period, nextIteration);
                    });
                },
                function(err) {
                    if (err) {
                        callbacks.error(err);
                    }
                }
            );
        },

        /**
         * Resumes a search job.
         *
         * @example
         *
         *      var job = service.jobs().item("mysid");
         *      job.unpause(function(err) {
         *          console.log("JOB UNPAUSED");
         *      });
         *
         * @param {Function} callback A function to call with the search job: `(err, job)`.
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
     * Represents a collection of search jobs. You can create and list search 
     * jobs using this collection container, or get a specific search job.
     *
     * @endpoint search/jobs
     * @class splunkjs.Service.Jobs
     * @extends splunkjs.Service.Collection
     */  
    root.Jobs = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Jobs
         */
        path: function() {
            return Paths.jobs;
        },
        
        /**
         * Creates a local instance of a job.
         *
         * @param {Object} props The properties for this new job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         * @return {splunkjs.Service.Job} A new `splunkjs.Service.Job` instance.
         *
         * @method splunkjs.Service.Jobs
         */
        instantiateEntity: function(props) {
            var sid = props.content.sid;
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.Job(this.service, sid, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.Jobs`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.Jobs} A new `splunkjs.Service.Jobs` instance.
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
         * Creates a search job with a given search query and optional parameters, including `exec_mode` to specify the type of search:
         *
         *    - Use `exec_mode=normal` to return a search job ID immediately (default).
         *      Poll for completion to find out when you can retrieve search results. 
         *
         *    - Use `exec_mode=blocking` to return the search job ID when the search has finished.
         * 
         * To run a oneshot search, which does not create a job but rather returns the search results, use `Service.Jobs.oneshotSearch`.
         *
         * @param {String} query The search query.
         * @param {Object} params A dictionary of properties for the search job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         * @param {Function} callback A function to call with the created job: `(err, createdJob)`.
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
         * Creates a search job with a given search query and optional parameters, including `exec_mode` to specify the type of search:
         *
         *    - Use `exec_mode=normal` to return a search job ID immediately (default).
         *      Poll for completion to find out when you can retrieve search results. 
         *
         *    - Use `exec_mode=blocking` to return the search job ID when the search has finished.
         * 
         * To run a oneshot search, which does not create a job but rather returns the search results, use `Service.Jobs.oneshotSearch`.
         *
         * @example
         *
         *      var jobs = service.jobs();
         *      jobs.search("search ERROR", {id: "myjob_123"}, function(err, newJob) {
         *          console.log("CREATED": newJob.sid);
         *      });
         *
         * @param {String} query The search query.
         * @param {Object} params A dictionary of properties for the search job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         * @param {Function} callback A function to call with the new search job: `(err, createdJob)`.
         *
         * @endpoint search/jobs
         * @method splunkjs.Service.Jobs
         */
        search: function(query, params, callback) {
            return this.create(query, params, callback);
        },
                
        /**
         * Creates a oneshot search from a given search query and parameters.
         *
         * @example
         *
         *      var jobs = service.jobs();
         *      jobs.oneshotSearch("search ERROR", {id: "myjob_123"}, function(err, results) {
         *          console.log("RESULT FIELDS": results.fields);
         *      });
         *
         * @param {String} query The search query. 
         * @param {Object} params A dictionary of properties for the search:
         *    - `output_mode` (_string_): Specifies the output format of the results (XML, JSON, or CSV).
         *    - `earliest_time` (_string_): Specifies the earliest time in the time range to search. The time string can be a UTC time (with fractional seconds), a relative time specifier (to now), or a formatted time string.
         *    - `latest_time` (_string_): Specifies the latest time in the time range to search. The time string can be a UTC time (with fractional seconds), a relative time specifier (to now), or a formatted time string.
         *    - `rf` (_string_): Specifies one or more fields to add to the search.
         * @param {Function} callback A function to call with the results of the search: `(err, results)`.
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
            
            var outputMode = params.output_mode || "json_rows";
            
            var path = this.qualifiedPath;
            var method = "POST";
            var headers = {};
            var post = params;
            var get = {output_mode: outputMode};
            var body = null;
            
            var req = this.service.request(
                path, 
                method, 
                get, 
                post, 
                body, 
                headers, 
                function(err, response) {
                    if (err) {
                        callback(err);
                    } 
                    else {
                        callback(null, response.data);
                    }
                }
            );
            
            return req;
        }
    });
    
    /*!*/
    // Iterates over an endpoint's results.
    root.PaginatedEndpointIterator = Class.extend({
        init: function(endpoint, params) {
            params = params || {};
            
            this._endpoint = endpoint;
            this._pagesize = params.pagesize || 0;
            this._offset = 0;
        },
        
        // Fetches the next page from the endpoint.
        next: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            var params = {
                count: this._pagesize,
                offset: this._offset
            };
            return this._endpoint(params, function(err, results) {
                if (err) {
                    callback(err);
                }
                else {                    
                    var numResults = (results.rows ? results.rows.length : 0);
                    that._offset += numResults;
                    
                    callback(null, results, numResults > 0);
                }
            });
        }
    });
})();
