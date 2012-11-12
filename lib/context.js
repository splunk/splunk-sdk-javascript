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
    
    var Paths    = require('./paths').Paths;
    var Class    = require('./jquery.class').Class;
    var Http     = require('./http');
    var utils    = require('./utils');

    var root = exports || this;

    var prefixMap = {
        "5": "",
        "4.3": "/services/json/v2",
        "default": "/services/json/v2"
    };

    /**
     * An abstraction over the Splunk HTTP-wire protocol that provides the basic
     * functionality for communicating with a Splunk instance over HTTP, handles
     * authentication and authorization, and formats HTTP requests (GET, POST, 
     * and DELETE) in the format that Splunk expects.
     *
     * @class splunkjs.Context
     */
    module.exports = root = Class.extend({
        
        /**
         * Constructor for `splunkjs.Context`.
         *
         * @constructor
         * @param {splunkjs.Http} http An instance of a `splunkjs.Http` class.
         * @param {Object} params A dictionary of optional parameters: 
         *      * `scheme`: The scheme (`http` or `https`) for accessing Splunk.
         *      * `host`: The host name (the default is _localhost_).
         *      * `port`: The port number (the default is _8089_).
         *      * `username`: The Splunk account username, which is used to authenticate the Splunk instance.
         *      * `password`: The password, which is used to authenticate the Splunk instance.
         *      * `owner`: The owner (username) component of the namespace context.
         *      * `app`: The app component of the namespace context.
         *      * `sessionKey`: The current session token.
         *      * `autologin`: Enable or disable autologin functionaly (enabled by default).
         *      * `version`: Version string for Splunk (e.g. 4.3, 4.3.2, 5.0) - defaults to 4.3.
         * @return {splunkjs.Context} A new `splunkjs.Context` instance.
         *
         * @method splunkjs.Context 
         */
        init: function(http, params) {
            if (!(http instanceof Http) && !params) {
                // Move over the params
                params = http;
                http = null;
            }
            
            params = params || {};
            
            this.scheme        = params.scheme || "https";
            this.host          = params.host || "localhost";
            this.port          = params.port || 8089;
            this.username      = params.username || null;  
            this.password      = params.password || null;  
            this.owner         = params.owner;  
            this.app           = params.app;  
            this.sessionKey    = params.sessionKey || "";
            this.authorization = params.authorization || "Splunk";
            this.paths         = params.paths || Paths;
            this.version       = params.version || "default"; 
            this.autologin     = true;
            
            // Initialize autologin
            // The reason we explicitly check to see if 'autologin'
            // is actually set is because we need to distinguish the
            // case of it being set to 'false', and it not being set.
            // Unfortunately, in JavaScript, these are both false-y
            if (params.hasOwnProperty("autologin")) {
                this.autologin = params.autologin;
            }
            
            if (!http) {
                // If there is no HTTP implementation set, we check what platform
                // we're running on. If we're running in the browser, then complain,
                // else, we instantiate NodeHttp.
                if (typeof(window) !== 'undefined') {
                    throw new Error("Http instance required when creating a Context within a browser.");
                }
                else {
                    var NodeHttp = require('./platform/node/node_http').NodeHttp;
                    http = new NodeHttp();
                }
            }
            
            // Store the HTTP implementation
            this.http = http;
            this.http._setSplunkVersion(this.version);
            
            // Store our full prefix, which is just combining together
            // the scheme with the host
            var versionPrefix = utils.getWithVersion(this.version, prefixMap);
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + versionPrefix;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._headers         = utils.bind(this, this._headers);
            this.fullpath         = utils.bind(this, this.fullpath);
            this.urlify           = utils.bind(this, this.urlify);
            this.get              = utils.bind(this, this.get);
            this.del              = utils.bind(this, this.del);
            this.post             = utils.bind(this, this.post);
            this.login            = utils.bind(this, this.login);
            this._shouldAutoLogin = utils.bind(this, this._shouldAutoLogin);
            this._requestWrapper  = utils.bind(this, this._requestWrapper);
        },
        
        /**
         * Appends Splunk-specific headers.
         *
         * @param {Object} headers A dictionary of headers (optional).
         * @return {Object} An augmented dictionary of headers.
         *
         * @method splunkjs.Context 
         * @private
         */
        _headers: function (headers) {
            headers = headers || {};
            headers["Authorization"] = this.authorization + " " + this.sessionKey;
            return headers;
        },   
        
        /*!*/
        _shouldAutoLogin: function() {
            return this.username && this.password && this.autologin;
        },

        /*!*/
        /**
         * This internal function aids with the autologin feature.
         * It takes two parameters: `task`, which is a function describing an
         * HTTP request, and `callback`, to be invoked when all is said 
         * and done.
         *  
         * @param  {Function} task A function taking a single argument: `(callback)`.
         * @param  {Function} callback The function to call when the request is complete: `(err, response)`.
         */
        _requestWrapper: function(task, callback) {
            callback = callback || function() {};
            
            var that = this;
            var req = null;
            
            // This is the callback that will be invoked
            // if we are currently logged in but our session key
            // expired (i.e. we get a 401 response from the server).
            // We will only retry once.
            var reloginIfNecessary = function(err) {
                // If we aborted, ignore it
                if (req.wasAborted) {
                    return;
                }
                
                if (err && err.status === 401 && that._shouldAutoLogin()) {
                    // If we had an authorization error, we'll try and login
                    // again, but only once
                    that.sessionKey = null;
                    that.login(function(err, success) {
                        // If we've already aborted the request,
                        // just do nothing
                        if (req.wasAborted) {
                            return;
                        }
                        
                        if (err) {
                            // If there was an error logging in, send it through
                            callback(err);
                        }
                        else { 
                            // Relogging in was successful, so we execute
                            // our task again.
                            task(callback);
                        }
                    });
                }
                else {
                    callback.apply(null, arguments);
                }
            };
            
            if (!this._shouldAutoLogin() || this.sessionKey) {
                // Since we are not auto-logging in, just execute our task,
                // but intercept any 401s so we can login then
                req = task(reloginIfNecessary);
                return req;
            }
            
            // OK, so we know that we should try and autologin,
            // so we try and login, and if we succeed, execute
            // the original task
            req = this.login(function(err, success) {
                // If we've already aborted the request,
                // just do nothing
                if (req.wasAborted) {
                    return;
                }
                
                if (err) {
                    // If there was an error logging in, send it through
                    callback(err);
                } 
                else {
                    // Logging in was successful, so we execute
                    // our task. 
                    task(callback);
                }
            });
            
            return req;
        },

        /**
         * Converts a partial path to a fully-qualified path, and if necessary
         * includes the owner and app prefixes.
         *
         * @param {String} path Partial path
         * @param {String} namespace The namespace context, as '_owner/app_'. 
         * @return {String} Fully qualified path
         *
         * @method splunkjs.Context 
         */ 
        fullpath: function(path, namespace) {
            namespace = namespace || {};
            
            if (utils.startsWith(path, "/")) {
                return path;
            }

            // If we don't have an app name (explicitly or implicitly), we default to /services/
            if (!namespace.app && !this.app && namespace.sharing !== root.Sharing.SYSTEM) {
                return "/services/" + path;
            }

            // Get the app and owner, first from the passed in namespace, then the service,
            // finally defaulting to wild cards
            var owner = namespace.owner || this.owner || "-";
            var app   = namespace.app || this.app || "-";
            
            namespace.sharing = (namespace.sharing || "").toLowerCase();
            
            // Modify the owner and app appropriately based on the sharing parameter
            if (namespace.sharing === root.Sharing.APP || namespace.sharing === root.Sharing.GLOBAL) {
                owner = "nobody";
            }
            else if (namespace.sharing === root.Sharing.SYSTEM) {
                owner = "nobody";
                app = "system";
            }

            return utils.trim("/servicesNS/" + owner + "/" + app + "/" + path); 
        },

        /**
         * Converts a partial path to a fully-qualified URL.
         *
         * @param {String} path The partial path.
         * @return {String} The fully-qualified URL.
         *
         * @method splunkjs.Context 
         * @private
         */
        urlify: function(path) {
            return this.prefix + this.fullpath(path);
        },

        /**
         * Authenticates and logs in to a Splunk instance, then stores the 
         * resulting session key.
         *
         * @param {Function} callback The function to call when the login has completed: `(err, wasSuccessful)`.
         *
         * @method splunkjs.Context 
         * @private
         */
        login: function(callback) {
            var that = this;
            var url = this.paths.login;
            var params = { username: this.username, password: this.password };

            callback = callback || function() {};
            var wrappedCallback = function(err, response) {
                if (err) {
                    callback(err, false);
                }
                else {
                    that.sessionKey = response.data.sessionKey;
                    callback(null, true);
                }
            };
            
            return this.http.post(
                this.urlify(url),
                this._headers(),
                params,
                0,
                wrappedCallback
            ); 
        },

        /**
         * Performs a GET request.
         *
         * @param {String} path The path of the GET request.
         * @param {Object} params The query parameters for this request.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Context 
         */
        get: function(path, params, callback) {
            var that = this;
            var request = function(callback) {
                return that.http.get(
                    that.urlify(path),
                    that._headers(),
                    params,
                    0,
                    callback
                );
            };
            
            return this._requestWrapper(request, callback);
        },

        /**
         * Performs a DELETE request.
         *
         * @param {String} path The path of the DELETE request.
         * @param {Object} params The query parameters for this request.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Context 
         */
        del: function(path, params, callback) {            
            var that = this;
            var request = function(callback) {
                return that.http.del(
                    that.urlify(path),
                    that._headers(),
                    params,
                    0,
                    callback
                );  
            };
            
            return this._requestWrapper(request, callback);
        },

        /**
         * Performs a POST request.
         *
         * @param {String} path The path of the POST request.
         * @param {Object} params The query parameters for this request.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Context 
         */
        post: function(path, params, callback) {
            var that = this;
            var request = function(callback) {
                return that.http.post(
                    that.urlify(path),
                    that._headers(),
                    params,
                    0,
                    callback
                );  
            };
            
            return this._requestWrapper(request, callback);
        },

        /**
         * Performs a request.
         *
         * @param {String} path The request URL (with any query parameters already appended and encoded).
         * @param {String} method The HTTP method (can be `GET`, `POST`, or `DELETE`).
         * @param {Object} headers An object of headers for this request.
         * @param {Object} body The body parameters for this request.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Context 
         */
        request: function(path, method, query, post, body, headers, callback) {
            var that = this;
            var request = function(callback) {
                return that.http.request(
                    that.urlify(path),    
                    {
                        method: method,
                        headers: that._headers(headers),
                        query: query,
                        post: post,
                        body: body,
                        timeout: 0
                    },
                    callback
                );  
            };
            
            return this._requestWrapper(request, callback);
        },
        
        /**
         * Compares the Splunk server's version to the specified version string.
         * Returns -1 if (this.version <  otherVersion),
         *          0 if (this.version == otherVersion),
         *          1 if (this.version >  otherVersion).
         * 
         * @param {String} otherVersion The other version string (ex: "5.0").
         * 
         * @method splunkjs.Context
         */
        versionCompare: function(otherVersion) {
            var thisVersion = this.version;
            if (thisVersion === "default") {
                thisVersion = "4.3";
            }
            
            var components1 = thisVersion.split(".");
            var components2 = otherVersion.split(".");
            var numComponents = Math.max(components1.length, components2.length);
            
            for (var i = 0; i < numComponents; i++) {
                var c1 = (i < components1.length) ? parseInt(components1[i], 10) : 0;
                var c2 = (i < components2.length) ? parseInt(components2[i], 10) : 0;
                if (c1 < c2) {
                    return -1;
                } else if (c1 > c2) {
                    return 1;
                }
            }
            return 0;
        }
    });

    /*!*/
    root.Sharing = {
        USER: "user",
        APP: "app",
        GLOBAL: "global",
        SYSTEM: "system"  
    };
})();