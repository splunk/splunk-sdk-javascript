var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}
var __require = require;

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require.resolve = (function () {
    var core = {
        'assert': true,
        'events': true,
        'fs': true,
        'path': true,
        'vm': true
    };
    
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (core[x]) return x;
        var path = require.modules.path();
        var y = cwd || '.';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = Object_keys(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = function (fn) {
    setTimeout(fn, 0);
};

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.modules["path"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "path";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["path"]._cached = module.exports;
    
    (function () {
        function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
;
    }).call(module.exports);
    
    __require.modules["path"]._cached = module.exports;
    return module.exports;
};

require.modules["/splunk.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "/splunk.js";
    
    var require = function (file) {
        return __require(file, "/");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/");
    };
    
    require.modules = __require.modules;
    __require.modules["/splunk.js"]._cached = module.exports;
    
    (function () {
        
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
    var root = exports || this;

    root.Splunk = {
        Binding         : require('./lib/binding'),
        Client          : require('./lib/client'),
        Http            : require('./lib/http').Http,
        ODataResponse   : require('./lib/odata').ODataResponse,
        Utils           : require('./lib/utils'),
        Async           : require('./lib/async'),
        Paths           : require('./lib/paths').Paths,
        Class           : require('./lib/jquery.class').Class,
        Promise         : require('./lib/promise').Promise,
        Searcher        : require('./lib/searcher.js')
    };
})();;
    }).call(module.exports);
    
    __require.modules["/splunk.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/binding.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/binding.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/binding.js"]._cached = module.exports;
    
    (function () {
        
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
    var Paths   = require('./paths').Paths;
    var Class   = require('./jquery.class').Class;
    var Promise   = require('./promise').Promise;
    var utils   = require('./utils');

    var root = exports || this;

    // Our basic class that stores the context of a specific session, such
    // as login information, host name, port, etc.
    root.Context = Class.extend({
        init: function(http, params) {
            this.http = http;
            this.scheme = params.scheme || "https";
            this.host = params.host || "localhost";
            this.port = params.port || 8000;
            this.username = params.username || null;  
            this.password = params.password || null;  
            this.owner = params.owner || "-";  
            this.namespace = params.namespace || "-";  
            this.sessionKey = params.sessionKey || "";
            
            // Store our full prefix, which is just combining together
            // the scheme with the host
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/en-US/custom/old_english/svc";

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._headers   = utils.bind(this, this._headers);
            this.fullpath   = utils.bind(this, this.fullpath);
            this.urlify     = utils.bind(this, this.urlify);
            this.get        = utils.bind(this, this.get);
            this.del        = utils.bind(this, this.del);
            this.post       = utils.bind(this, this.post);
            this.login      = utils.bind(this, this.login);
        },

        // Return any session-specific headers (such as authorization).
        _headers: function (headers) {
            headers = headers || {};
            headers["Authorization"] = "Splunk " + this.sessionKey;
            headers["X-SessionKey"] = this.sessionKey;

            return headers;
        },

        // Convert any partial path into a full path containing the full
        // owner and namespace prefixes if necessary.
        fullpath: function(path) {
            if (utils.startsWith(path, "/")) {
                return path;
            }  

            if (!this.namespace) {
                return "/services/" + path;
            }

            var owner = (this.owner === "*" ? "-" : this.owner);
            var namespace = (this.namespace === "*" ? "-" : this.namespace);

            return "/" + owner + "/" + namespace + "/" + path; 
        },

        // Given any path, this function will turn it into a fully
        // qualified URL, using the current context.
        urlify: function(path) {
            return this.prefix + this.fullpath(path);
        },

        // Authorize to the server and store the given session key.
        login: function(callback) {
            var url = Paths.login;
            var params = { username: this.username, password: this.password };

            var successCallback = utils.bind(this, function(response) {

                this.sessionKey = response.odata.results.sessionKey;

                if (callback) {
                    return callback(true);
                }
                else {
                    return Promise.Success(true);
                }
            });
            var errorCallback = function(response) {
                console.log("Error getting login info.");

                if (callback) {
                    return callback(false);
                }
                else {
                    return Promise.Failure(false);
                }
            };

            // We have to handel the case of both promises or callbacks
            // being used, so we register all the callbacks and handle the promise
            // return values.
            var loginP = this.post(url, params);

            return loginP.when(successCallback, errorCallback);
        },

        get: function(path, params, callback) {
            return this.http.get(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        del: function(path, params, callback) {
            return this.http.del(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        post: function(path, params, callback) {
            return this.http.post(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        request: function(path, method, headers, body, callback) {
            return this.http.request(
                this.urlify(path),    
                {
                    method: method,
                    headers: this._headers(headers),
                    body: body,
                    timeout: 0
                },
                callback
            );
        }
    });
})();;
    }).call(module.exports);
    
    __require.modules["/lib/binding.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/paths.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/paths.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/paths.js"]._cached = module.exports;
    
    (function () {
        
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
    var root = exports || this;

    // A list of the Splunk API endpoint paths
    root.Paths = {
        job: "search/jobs/",
        jobs: "search/jobs",
        login: "/auth/login"
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/paths.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/jquery.class.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/jquery.class.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/jquery.class.js"]._cached = module.exports;
    
    (function () {
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

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
    var root = exports || this;

    var initializing = false;
    var fnTest = (/xyz/.test(function() { return xyz; }) ? /\b_super\b/ : /.*/);
    // The base Class implementation (does nothing)
    root.Class = function(){};
    
    // Create a new Class that inherits from this class
    root.Class.extend = function(prop) {
      var _super = this.prototype;
      
      // Instantiate a base class (but only create the instance,
      // don't run the init constructor)
      initializing = true;
      var prototype = new this();
      initializing = false;
      
      // Copy the properties over onto the new prototype
      for (var name in prop) {
        // Check if we're overwriting an existing function
        prototype[name] = typeof prop[name] == "function" && 
          typeof _super[name] == "function" && fnTest.test(prop[name]) ?
          (function(name, fn){
            return function() {
              var tmp = this._super;
              
              // Add a new ._super() method that is the same method
              // but on the super-class
              this._super = _super[name];
              
              // The method only need to be bound temporarily, so we
              // remove it when we're done executing
              var ret = fn.apply(this, arguments);        
              this._super = tmp;
              
              return ret;
            };
          })(name, prop[name]) :
          prop[name];
      }
      
      // The dummy class constructor
      function Class() {
        // All construction is actually done in the init method
        if ( !initializing && this.init )
          this.init.apply(this, arguments);
      }
      
      // Populate our constructed prototype object
      Class.prototype = prototype;
      
      // Enforce the constructor to be what we expect
      Class.constructor = Class;

      // And make this class extendable
      Class.extend = arguments.callee;
       
      return Class;
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/jquery.class.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/promise.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/promise.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/promise.js"]._cached = module.exports;
    
    (function () {
        
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
    var Class   = require('./jquery.class').Class;
    var utils   = require('./utils');

    var root = exports || this;

    var resolverIdCounter = 0;
    var resolverIdGenerator = function() {
        var id = "Promise.Resolver " + resolverIdCounter;
        resolverIdCounter++;
        return id;
    };

    // OVERALL NOTES
    // 1.   The implementation allows for "varargs" in most places, and so no
    //      explicit parameters are used. As such, many invocations are done using
    //      'apply' rather than direct invocation.

    // The core promise object. It only allows additive operations, and disallows
    // all introspection. Management of it should be done using the Promise.Resolver
    // class. You should never create your own Promise instance.
    root.Promise = Class.extend({
        init: function(resolver) {
            this.name = resolver.name + " -- Promise";

            this.when = utils.bind(this, function(successCallbacks, failureCallbacks) {
                // We create a new resolver
                var newResolver = new root.Promise.Resolver();
                
                // Add a listener with all the parameters to the current
                // promise
                var listener = {
                    success: successCallbacks ? successCallbacks : [],
                    failure: failureCallbacks ? failureCallbacks : [],
                    resolver: newResolver
                };
                resolver._addListener(listener);
                
                // And return the new promise
                return newResolver.promise;
            });

            this.whenResolved = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [utils.toArray(arguments), []]);
            });
            
            this.whenFailed = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [[], utils.toArray(arguments)]);
            });

            this.onProgress = utils.bind(this, function(/* cb1, cb2, ... */) {
                resolver._addProgressListener.apply(resolver, arguments);
            });
        }
    });

    // This is a utility function to handle the completion (either resolution or 
    // failure) of a resolver. Since both are essentially identical (with the exception
    // of the callback list and what to do with the downchain resolver), we hoist
    // this logic into a separate function.
    var handleCompletion = function(callbacks, completedWith, resolver, complete) {
        // The callbacks will either return immediate values or promises,
        // and we'll store them accordingly.
        var values   = [];
        var promises = [];
        var promiseCount = 0;
        var callback;
        var val;
        
        // We always work with arrays of callbacks.
        callbacks = utils.isArray(callbacks) ? callbacks : [callbacks];
        
        // For each callback, we execute it, and then store
        // the returned value appropriately, depending on whether
        // it is a promise or an immediate value.
        for(var i = 0; i < callbacks.length; i++) {
            callback = callbacks[i];
            val = callback.apply(null, completedWith);
            
            if (root.Promise.isPromise(val)) {
                promises[i] = val;
                values[i] = undefined;
            }
            else {
                values[i] = val;
            }
        }

        var getValue = function(originalValues) {            
            if (originalValues.length === 0) {
                return completedWith;
            }

            return originalValues;
        };
        
        if (values.length === 1 && promises.length === 1) {
            // If we only have a single value, and it is a promise,
            // then we can do a special case. There's no need to join
            // on the promise (which would return an array of results),
            // instead we can just when on the individual promise
            // and forward the results.
            promises[0].when(
                function() {
                    resolver.resolve.apply(resolver, arguments);
                },
                function() {
                    resolver.fail.apply(resolver, arguments);
                }
            );
        }
        else if (promises.length > 0) {
            // If any of the returned values are promises,
            // then we have to wait until they are all resolved
            // before we can call the downchain resolver.
            root.Promise.join.apply(null, promises).when(
                function() {
                    // If all the promises were successful, then we can
                    // resolve the downchain resolver. Before we do that
                    // though, we need to meld together the results
                    // of each individual promise and all previous 
                    // immediate values.
                    var results = utils.toArray(arguments);
                    for(var i = 0; i < results.length; i++) {
                        if (results[i] !== undefined) {
                            values[i] = results[i];
                        }
                    }
                    
                    resolver.resolve.apply(resolver, values);
                },
                function() {
                    // If any of the promises fail, then that is enough
                    // for us to fail the downchain resolver.
                    resolver.fail.apply(resolver, arguments);
                }
            );
        }
        else {
            // All returned values were immediate values, so
            // we can immediately complete the downchain resolver.

            // We do proper extraction for the 0/1-length
            // case.
            values = getValue(values);

            complete.apply(resolver, values);
        }
    };

    // The "management" counterpart the Promise class. A resolver is what
    // creates an accompanying promise, and allows you to resolve/fail/report
    // progress to whomever holds the promise. Note that this is a one way
    // relationship - a resolver has a link to its promise, but not the
    // the other way around.
    root.Promise.Resolver = Class.extend({
        init: function() {
            this.name = resolverIdGenerator();

            this.addListener = utils.bind(this, this.addListener);
            this.resolve     = utils.bind(this, this.resolve);
            this.fail        = utils.bind(this, this.fail);

            // Now, we create our internal promise
            this.promise           = new root.Promise(this);
            this.isResolved        = false;
            this.isFailed          = false;
            this.isFinalized       = false;
            this.resolvedWith      = null;
            this.failedWith        = null;
            this.listeners         = [];
            this.progressListeners = [];
        },

        // An internal only function to add a resolve/fail listener
        // to the resolver.
        _addListener: function(listener) {
            var finalizedInvoke = function() {};
            
            // We check to see if it is already finalized
            if (this.isFinalized) {
                // If it is, and it was resolved, then we will re-resolve once
                // we push the new listeners
                if (this.isResolved) {
                    finalizedInvoke = function() { this.resolve.apply(this, this.resolvedWith); };
                }
                else if (this.isFailed) {
                    // And if it is failed, we will re-fail once
                    // we push the new listeners
                    finalizedInvoke = function() { this.fail.apply(this, this.failedWith); };
                }

                // We mark it as "unfinalized" to not hit our "asserts".
                this.isFinalized = false;
            }

            // Push the listener
            this.listeners.push(listener);

            // And invoke the finalization case.
            finalizedInvoke.apply(this, null);
        },

        // An internal only function to add a progress report listener
        // to the resolver
        _addProgressListener: function() {
            // We always store the callbacks in an array, even if there is only one.
            this.progressListeners = utils.toArray(arguments);
        },

        // Resolve the promise. Allows any number of values as the 
        // "resolved" result of the promise.
        resolve: function() {                    
            if (!this.isFinalized) {
                // Change our state, and store the values for future listeners
                this.isFinalized = this.isResolved = true;
                this.resolvedWith = utils.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();
                    handleCompletion(listener.success, this.resolvedWith, listener.resolver, listener.resolver.resolve);
                }
            }
            else {
                throw new Error("Trying to resolve a finalized resolver: " + this.name);
            }
        },

        // Fail the promise. Allows any number of values as the 
        // "failed" result of the promise.
        fail: function() {
            if (!this.isFinalized) {
                // Change our state, and store the values for future listeners
                this.isFinalized = this.isFailed = true;
                this.failedWith = utils.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();
                    handleCompletion(listener.failure, this.failedWith, listener.resolver, listener.resolver.fail);
                }
            }
            else {
                throw new Error("Trying to fail a finalized resolver: " + this.name);
            }
        },

        // Report progress. Allows any number of arguments
        // as the "progress report".
        progress: function() {
            if (!this.isFinalized) {
                var callbacks = this.progressListeners;

                for(var i = 0; i < callbacks.length; i++) {
                    callbacks[i].apply(null, arguments);
                } 
                
                // Report that we did execute the progress listeners.
                return true;
            }
            else {
                // We do not allow progress reports on finalized resolvers, so 
                // we return that we did not execute the progress listeners.
                return false;
            }
        }
    });

    // A factory for a failed promise.
    root.Promise.Failure = function() {
        var failureResolver = new root.Promise.Resolver();
        var failurePromise = failureResolver.promise;
        
        failureResolver.fail.apply(failureResolver, arguments);
        
        return failurePromise;
    };

    // A factory for a successful promise.
    root.Promise.Success = function() {
        var successResolver = new root.Promise.Resolver();
        var successPromise = successResolver.promise;
        
        successResolver.resolve.apply(successResolver, arguments);
        
        return successPromise;
    };

    // A promise that is implicitly resolved
    root.Promise.Done = root.Promise.Success();

    // A promise that will never be resolved.
    root.Promise.NeverDone = (function() {
        var resolver = new root.Promise.Resolver("neverdone");

        // We are essentially losing the resolver, so
        // this promise can never be resolved.
        return resolver.promise;
    })();

    // Join any number of promises and return a promise that will
    // get resolved when all the passed in promises are resolved,
    // or failed as soon as one of them is failed.
    //
    // NOTE: You can pass in non-promise values as well, and they
    // will be treated as if they are already resolved promises.
    // NOTE: In the success case, all resolved results from each
    // of the promises will get passed to the resolved callbacks
    // of the joined promise.
    // NOTE: In the failure case, only the failed result of the
    // specific failed promise will be passed to the failed 
    // callbacks of the joined promise.
    root.Promise.join = function(/* p1, p2, ... */) {
        // Create a new resolver/promise pair for the joined
        // promise.
        var resolver = new root.Promise.Resolver();
        var joinPromise = resolver.promise;

        var args = arguments;
        var promiseCount = 0;
        var hasPromises = false;
        var values = [];
        var promises = [];

        // A helper to get the completion value of a promise.
        // If it is a single value, we'll return it as such,
        // but if there are multiple, we will return it as an
        // array
        var getValue = function() {
            var value;

            var returnedResults = utils.toArray(arguments);
            if (returnedResults.length === 1) {
                return returnedResults[0];
            }
            else if (returnedResults.length > 1) {
                return returnedResults;
            }

            return value;
        };

        // A helper to allow us to register resolved/failed callbacks
        // on each of the individual promises.
        var addWhen = function(promise, index) {
            promise.when(              
                function() {                
                    // If the promise resolves successfully,
                    // We'll decrement the count and store the value
                    promiseCount--;
                    values[index] = getValue.apply(null, arguments);
                    
                    // If this is the last promise to resolve, then
                    // we can just resolve the master resolver.
                    if (promiseCount === 0) {
                        resolver.resolve.apply(resolver, values);
                    } 
                },
                
                function() {
                    // If the promise failed, we immediately fail
                    // the master resolver.
                    if (resolver !== null) {
                        resolver.fail(getValue.apply(null, arguments)); 
                        resolver = null;
                    }
                }
            );
        };

        // We iterate over all the passed in alleged promises, and figure
        // out whether they are promises or not.
        for(var i = 0; i < args.length; i++) {
            var val = args[i];
            if (root.Promise.isPromise(val)) {
                promiseCount++;
                var index = i;

                // We can't add the "when" handlers immediately,
                // because they may fire promptly. So we queue them.
                // This lets us get a full count of how many promises
                // we are dealing with, so the counter can go up to N.
                promises.push({index: index, promise: val});
            }
            else {
                // If this isn't a promise, then we just store
                // the final value.
                values[i] = val;
            }
        }

        // If all the values are prompt, we can simply resolve
        // right away.
        if (promiseCount === 0) {
            resolver.resolve.apply(resolver, values);
        }

        // For each promise, we add the "when" handler.
        for (i = 0; i < promises.length; i++) {
            addWhen(promises[i].promise, promises[i].index);
        }

        // Return the promise that represents the join.
        return joinPromise;
    };

    // Checks whether the passed in value is a promise
    root.Promise.isPromise = function(allegedPromise) {
        return allegedPromise instanceof root.Promise;
    };

    // A wrapper around setInterval to return a promise.
    root.Promise.sleep = function(duration) {
        var sleepResolver = new root.Promise.Resolver();
        var sleepP = sleepResolver.promise;

        setTimeout(function() { sleepResolver.resolve(); }, duration);

        return sleepP;
    };

    root.Promise["while"] = function(whileObj) {
        var iteration = whileObj.iteration || 0;

        // We could keep chaining promises, but at some point we are going
        // to hit the stack limit. As such, we keep passing the resolver
        // to each iteration, so that we're only ever dealing with one promise.
        whileObj.resolver = whileObj.resolver || new root.Promise.Resolver();
        whileObj.progress = whileObj.progress || function() {};

        if (whileObj.condition()) {
            whileObj.iteration = iteration + 1;

            // Get the result of executing the body, and conver it
            // into a promise if it isn't already.
            var bodyResult = whileObj.body(iteration);
            var resultP = root.Promise.isPromise(bodyResult) ? bodyResult : root.Promise.Success(bodyResult);

            // As long as it is not a failed promise, we'll keep executing.
            resultP.when(
                function() {
                    // Then a progress report
                    whileObj.resolver.progress(whileObj.progress(iteration));
                    
                    // And do the next iteration
                    root.Promise["while"](whileObj);
                },
                function() {
                    whileObj.resolver.fail.apply(whileObj.resolver, arguments);
                }
            );
            
        }
        else {
            // Report progress one more time
            whileObj.resolver.progress(whileObj.progress(iteration));
            
            // And resolve the promise;
            whileObj.resolver.resolve();
        }

        return whileObj.resolver.promise;
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/promise.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/utils.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/utils.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/utils.js"]._cached = module.exports;
    
    (function () {
        
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
    var root = exports || this;

    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };

    root.contains = function(arr, obj) {
        arr = arr || [];
        for(var i = 0; i < arr.length; i++) {
            if (arr[i] === obj) {
                return true;
            }
        }  
    };

    root.startsWith = function(original, str) {
        var matches = original.match("^" + str);
        return matches && matches.length > 0 && matches[0] === str;  
    };

    root.endsWith = function(original, str) {
        var matches = original.match(str + "$");
        return matches && matches.length > 0 && matches[0] === str;  
    };

    root.callbackToObject = function(callback) {
        callback = callback || function() {};

        return {
            success: callback.success ? callback.success : callback,
            error: callback.error ? callback.error : callback
        };
    };
    
    root.toString = Object.prototype.toString;
    
    root.toArray = function(iterable) {
        return Array.prototype.slice.call(iterable);
    };
    
    root.isArray = Array.isArray || function(obj) {
        return root.toString.call(obj) === '[object Array]';
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/utils.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/client.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/client.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/client.js"]._cached = module.exports;
    
    (function () {
        
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
                throw new Error("Must provide a query to create a search job");
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
            this.cancel         = utils.bind(this, this.cancel);
            this.disablePreview = utils.bind(this, this.disablePreview);
            this.enablePreview  = utils.bind(this, this.enablePreview);
            this.events         = utils.bind(this, this.events);
            this.finalize       = utils.bind(this, this.finalize);
            this.pause          = utils.bind(this, this.pause);
            this.preview        = utils.bind(this, this.preview);
            this.read           = utils.bind(this, this.read);
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
            return this.post("control", {action: "cancel"}, callback);
        },

        disablePreview: function(callback) {
            return this.post("control", {action: "disablepreview"}, callback);  
        },

        enablePreview: function(callback) {
            return this.post("control", {action: "enablepreview"}, callback);  
        },

        events: function(params, callback) {
            callback = utils.callbackToObject(callback);
            return this.get("events", params).when(
                function(response) { 
                    callback.success(response.odata.results); 
                    return response.odata.results;
                },
                generalErrorHandler(callback)
            );
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
})();;
    }).call(module.exports);
    
    __require.modules["/lib/client.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/http.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/http.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/http.js"]._cached = module.exports;
    
    (function () {
        
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
    var Promise         = require('./promise').Promise;
    var Class           = require('./jquery.class').Class;
    var ODataResponse   = require('./odata').ODataResponse;
    var utils           = require('./utils');

    var root = exports || this;
    
    // This is a utility function to encode an object into a URI-compliant
    // URI. It will convert objects into '&key=value' pairs, and arrays into
    // `&key=value1&key=value2...'
    var encode = function(params) {
        var encodedStr = "";

        // We loop over all the keys so we encode them.
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                // Only append the ampersand if we already have
                // something encoded, and the last character isn't
                // already an ampersand
                if (encodedStr && encodedStr[encodedStr.length - 1] !== "&") {
                    encodedStr = encodedStr + "&";
                }
                    
                // Get the value
                var value = params[key];

                // If it's an array, we loop over each value
                // and encode it in the form &key=value[i]
                if (value instanceof Array) {
                    for (var i = 0; i < value.length; i++) {
                        encodedStr = encodedStr + key + "=" + encodeURIComponent(value[i]) + "&";
                    }
                }
                else {
                    // If it's not an array, we just encode it
                    encodedStr = encodedStr + key + "=" + encodeURIComponent(value);
                }
            }
        }

        return encodedStr;
    };

    // This is our base class for HTTP implementations. It provides the basic 
    // functionality (get/post/delete), as well as a utility function to build
    // a uniform response object.
    //
    // Base classes should only override 'request' and 'parseJSON'.
    root.Http = Class.extend({
        init: function(isSplunk) {
            // Whether or not this HTTP provider is talking to Splunk or not
            this.isSplunk = (isSplunk === undefined ? true : isSplunk);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);
        },

        get: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + encode(params);
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                body: encode(params)
            };

            return this.request(url, message, callback);
        },

        del: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + encode(params);
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        request: function(url, message, callback) {
            var requestResolver = new Promise.Resolver();
            var requestP = requestResolver.promise;

            message.headers["Content-Length"] = message.body ? message.body.length : 0;
            message.headers["Accept"] = "*/*";

            // We wrap the original callback with one that will also
            // resolve the promise.
            var callbackWithPromise = function(response) {
                var callbackObj = utils.callbackToObject(callback);

                if (response.status < 400) {
                    callbackObj.success(response);
                    requestResolver.resolve(response);
                }
                else {
                    callbackObj.error(response);
                    requestResolver.fail(response);
                }
            };

            // Now we can invoke the user-provided HTTP class,
            // passing in our "wrapped" callback
            this.makeRequest(url, message, callbackWithPromise);

            return requestP;
        },

        makeRequest: function(url, message, callback) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED"); 
        },

        parseJson: function(json) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        _buildResponse: function(error, response, data) {
            var complete_response, json, odata;

            // Parse the JSON data and build the OData response
            // object.
            if (this.isSplunk) {
                json = this.parseJson(data);
                odata = ODataResponse.fromJson(json);  

                // Print any messages that came with the response
                ODataResponse.printMessages(odata);

                complete_response = {
                    response: response,
                    status: (response ? response.statusCode : 0),
                    odata: odata,
                    error: error
                };
            }
            else {
                json = "";

                // We only try to parse JSON if the headers say it is JSON
                if (response && response.headers["content-type"] === "application/json") {
                    json = this.parseJson(data);
                }

                complete_response = {
                    response: response,
                    status: (response ? response.statusCode : 0),
                    json: json,
                    error: error
                };
            }

            return complete_response;
        }
    });
})();;
    }).call(module.exports);
    
    __require.modules["/lib/http.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/odata.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/odata.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/odata.js"]._cached = module.exports;
    
    (function () {
        
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
    var Class   = require('./jquery.class').Class;

    var root = exports || this;

    // Our basic class to represent an OData resposne object.
    root.ODataResponse = Class.extend({
        offset: 0,
        count: 0,
        totalCount: 0,
        messages: [],
        timings: [],
        results: null,

        init: function() {

        },

        isCollection: function() {
            return this.results instanceof Array;
        }
    });

    // A static utility function to convert an object derived from JSON
    // into an ODataResponse
    root.ODataResponse.fromJson = function(json) {
        if (!json || !json.d) {
            console.log('Invalid JSON object passed; cannot parse into OData.');
            return null;
        }

        var d = json.d;
        
        var output = new root.ODataResponse();

        // Look for our special keys, and add them to the results
        var prefixedKeys = ['messages', 'offset', 'count', 'timings', 'total_count'];
        for (var i=0; i < prefixedKeys.length; i++) {
            if (d.hasOwnProperty('__' + prefixedKeys[i])) {
                output[prefixedKeys[i]] = d['__' + prefixedKeys[i]];
            }
        }

        if (d.results) {
            output.results = d.results;
        }

        return output;
    };

    // Print any messages that came with the response, as encoded
    // in the ODataResponse.
    root.ODataResponse.printMessages = function(struct) {
        var list = struct.messages || struct.__messages || [];

        if (list) {
            for (var i = 0; i < list.length; i++) {
                var msg = '[SPLUNKD] ' + list[i].text;
                switch (list[i].type) {
                    case 'FATAL':
                    case 'ERROR':
                        console.error(msg);
                        break;
                    case 'WARN':
                        console.warn(msg);
                        break;
                    case 'INFO':
                        console.info(msg);
                        break;
                    case 'HTTP':
                        break;
                    default:
                        console.info('[SPLUNKD] ' + list[i].type + ' - ' + msg);
                        break;
                }
            }
        }

        return list;  
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/odata.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/async.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/async.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/async.js"]._cached = module.exports;
    
    (function () {
        
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
    var root = exports || this;

    // A definition for an asynchronous while loop. The "complexity" comes from the
    // fact thathat we allow asynchronisity both in the condition and in the body. The function takes three parameters:
    // * A condition function, which takes a callback, whose only parameter is whether the condition was met or not.
    // * A body function, which takes a no-parameter callback. The callback should be invoked when the body of the loop has finished.
    // * A done function, which takes no parameter, and will be invoked when the loop has finished.
    root["while"] = function(obj, done) {
            if (obj.condition()) {
                obj.body( function() { root["while"](obj, done); });
            }
            else {
                done();
            }
        };

    root.sleep = function(timeout, callback) {
        setTimeout(callback, timeout);
    };
})();;
    }).call(module.exports);
    
    __require.modules["/lib/async.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/lib/searcher.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/lib";
    var __filename = "/lib/searcher.js";
    
    var require = function (file) {
        return __require(file, "/lib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/lib");
    };
    
    require.modules = __require.modules;
    __require.modules["/lib/searcher.js"]._cached = module.exports;
    
    (function () {
        
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
                condition: function() { return properties.dispatchState !== "DONE"; },
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
})();;
    }).call(module.exports);
    
    __require.modules["/lib/searcher.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/platform/client/jquery_http.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/platform/client";
    var __filename = "/platform/client/jquery_http.js";
    
    var require = function (file) {
        return __require(file, "/platform/client");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/platform/client");
    };
    
    require.modules = __require.modules;
    __require.modules["/platform/client/jquery_http.js"]._cached = module.exports;
    
    (function () {
        
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
    var Splunk  = require('../../splunk').Splunk;
    var utils   = Splunk.Utils;

    var root = exports || this;

    var getHeaders = function(headersString) {
        var headers = {};
        var headerLines = headersString.split("\n");
        for(var i = 0; i < headerLines.length; i++) {
            if (headerLines[i].trim() !== "") {
                var headerParts = headerLines[i].split(": ");
                headers[headerParts[0]] = headerParts[1];
            }
        }

        return headers;
    };

    root.JQueryHttp = Splunk.Http.extend({
        init: function(isSplunk) {
            this._super(isSplunk);
        },

        makeRequest: function(url, message, callback) {
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body || "",
                dataType: "json",
                success: utils.bind(this, function(data, error, res) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    var complete_response = this._buildResponse(error, response, data);
                    callback(complete_response);
                }),
                error: utils.bind(this, function(res, data, error) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    var json = JSON.parse(res.responseText);

                    var complete_response = this._buildResponse(error, response, json);
                    callback(complete_response);
                })
            };

            console.log("URL: " + params.url);

            $.ajax(params);
        },

        parseJson: function(json) {
            // JQuery does this for us
            return json;
        }
    });
})();;
    }).call(module.exports);
    
    __require.modules["/platform/client/jquery_http.js"]._cached = module.exports;
    return module.exports;
};

process.nextTick(function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "//Users/itay/Work/splunk-sdk-javascript";
    
    var require = function (file) {
        return __require(file, "/");
    };
    require.modules = __require.modules;
    
    
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

// This file is the entry point for client-side code, so it "exports" the
// important functionality to the "window", such that others can easily
// include it.

window.Splunk = require('./splunk').Splunk;
window.Splunk.JQueryHttp = require('./platform/client/jquery_http').JQueryHttp;;
});
