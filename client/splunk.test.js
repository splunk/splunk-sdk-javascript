(function() {
var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
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

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
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

require.define("path", function (require, module, exports, __dirname, __filename) {
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

});

require.define("/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"main":"splunk.js"}
});

require.define("/splunk.test.js", function (require, module, exports, __dirname, __filename) {
    
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

    root.SplunkTest = {
        Utils    : require('./tests/test_utils'),
        Async    : require('./tests/test_async'),
        Http     : require('./tests/test_http'),
        Binding  : require('./tests/test_binding'),
        Client   : require('./tests/test_client'),
        Searcher : require('./tests/test_searcher'),
        Examples : require('./tests/test_examples')
    };
})();
});

require.define("/tests/test_utils.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function() {
    var Splunk      = require('../splunk').Splunk;

    return {        
        "Callback#callback to object success": function(test) {
            var successfulFunction = function(callback) {
                callback(null, "one", "two");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(one, "one"); 
                test.strictEqual(two, "two");
                test.done();
            });
        },
        
        "Callback#callback to object error - single argument": function(test) {
            var successfulFunction = function(callback) {
                callback("one");
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err, "one"); 
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        },
        
        "Callback#callback to object error - multi argument": function(test) {
            var successfulFunction = function(callback) {
                callback(["one", "two"]);
            };
            
            successfulFunction(function(err, one, two) {
                test.strictEqual(err[0], "one"); 
                test.strictEqual(err[1], "two");
                test.ok(!one);
                test.ok(!two);
                test.done();
            });
        }
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}
});

require.define("/splunk.js", function (require, module, exports, __dirname, __filename) {
    
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
        Searcher        : require('./lib/searcher.js')
    };
})();
});

require.define("/lib/binding.js", function (require, module, exports, __dirname, __filename) {
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
    
    var Paths   = require('./paths').Paths;
    var Class   = require('./jquery.class').Class;
    var utils   = require('./utils');

    var root = exports || this;

    /**
     * Splunk.Binding.Context
     * 
     * Abstraction over the Splunk HTTP-wire protocol
     *
     * This class provides the basic functionality for communicating with a Splunk
     * instance over HTTP. It will handle authentication and authorization, and
     * formatting HTTP requests (GET/POST/DELETE) in the format Splunk expects.
     *
     * @moduleRoot Splunk.Binding.Context
     */
    root.Context = Class.extend({
        
        /**
         * Constructor for Splunk.Binding.Context
         *
         * @constructor
         * @param {Splunk.Http} http An instance of a `Splunk.Http` class
         * @param {Object} params Dictionary of optional parameters: scheme, host, port, username, password, owner, namespace, sessionKey
         * @return {Splunk.Binding.Context} A Splunk.Binding.Context instance
         *
         * @module Splunk.Binding.Context 
         */
        init: function(http, params) {
            this.http = http;
            this.scheme = params.scheme || "https";
            this.host = params.host || "localhost";
            this.port = params.port || 8089;
            this.username = params.username || null;  
            this.password = params.password || null;  
            this.owner = params.owner || "-";  
            this.namespace = params.namespace;  
            this.sessionKey = params.sessionKey || "";
            
            // Store our full prefix, which is just combining together
            // the scheme with the host
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/services/json/v1";

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
        
        /**
         * Append Splunk-specific headers
         *
         * @param {Object} headers Dictionary of headers (optional)
         * @return {Object} Augmented dictionary of headers
         *
         * @module Splunk.Binding.Context 
         * @private
         */
        _headers: function (headers) {
            headers = headers || {};
            headers["Authorization"] = "Splunk " + this.sessionKey;
            return headers;
        },

        /**
         * Convert partial paths to fully qualified ones
         *
         * Convert any partial path into a full path containing the full
         * owner and namespace prefixes if necessary
         *
         * @param {String} path Partial path
         * @return {String} Fully qualified path
         *
         * @module Splunk.Binding.Context 
         * @private
         */
        fullpath: function(path) {
            if (utils.startsWith(path, "/")) {
                return path;
            }  

            if (!this.namespace) {
                return "/services/" + path;
            }

            var owner = (this.owner === "*" || !this.owner ? "-" : this.owner);
            var namespace = (this.namespace === "*" ? "-" : this.namespace);

            return "/servicesNS/" + owner + "/" + namespace + "/" + path; 
        },

        /**
         * Convert partial paths to a fully qualified URL
         *
         * Convert any partial path into a fully qualified URL.
         *
         * @param {String} path Partial path
         * @return {String} Fully qualified URL
         *
         * @module Splunk.Binding.Context 
         * @private
         */
        urlify: function(path) {
            return this.prefix + this.fullpath(path);
        },

        /**
         * Login to a Splunk instance
         *
         * Perform authentication to a Splunk instance and store the resulting
         * session key.
         *
         * @param {Function} callback Callback to be executed when login is complete: `(err, wasSuccessful)`
         *
         * @module Splunk.Binding.Context 
         * @private
         */
        login: function(callback) {
            var that = this;
            var url = Paths.login;
            var params = { username: this.username, password: this.password };

            callback = callback || function() {};
            var wrappedCallback = function(err, response) {
                if (err) {
                    callback(err, false);
                }
                else {
                    that.sessionKey = response.odata.results.sessionKey;
                    callback(null, true);
                }
            };
            
            this.post(url, params, wrappedCallback);
        },

        /**
         * Perform a GET request
         *
         * @param {String} path Path to request
         * @param {Object} params Query parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Binding.Context 
         */
        get: function(path, params, callback) {
            this.http.get(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        /**
         * Perform a DELETE request
         *
         * @param {String} path Path to request
         * @param {Object} params Query parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Binding.Context 
         */
        del: function(path, params, callback) {
            this.http.del(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        /**
         * Perform a POST request
         *
         * @param {String} path Path to request
         * @param {Object} params Body parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Binding.Context 
         */
        post: function(path, params, callback) {
            this.http.post(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        /**
         * Perform a request
         *
         * @param {String} path URL to request (with any query parameters already appended and encoded)
         * @param {String} method HTTP method (one of GET | POST | DELETE)
         * @param {Object} headers Object of headers for this request
         * @param {Object} body Body of parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Binding.Context 
         */
        request: function(path, method, headers, body, callback) {
            this.http.request(
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
})();
});

require.define("/lib/paths.js", function (require, module, exports, __dirname, __filename) {
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
    
    var root = exports || this;

    // A list of the Splunk API endpoint paths
    root.Paths = {
        apps: "apps/local",
        capabilities: "authorization/capabilities",
        configurations: "configs",
        deploymentClient: "deployment/client",
        deploymentServers: "deployment/server",
        deploymentServerClasses: "deployment/serverclass",
        deploymentTenants: "deployment/tenants",
        eventTypes: "saved/eventTypes",
        indexes: "data/indexes",
        info: "server/info",
        inputs: null,
        jobs: "search/jobs",
        licenseGroups: "licenser/groups",
        licenseMessages: "licenser/messages",
        licensePools: "licenser/pools",
        licenseSlaves: "licenser/slaves",
        licenseStacks: "licenser/stacks",
        licenses: "licenser/licenses",
        loggers: "server/logger",
        login: "/services/auth/login",
        messages: "messages",
        passwords: "admin/passwords",
        properties: "properties",
        roles: "authentication/roles",
        savedSearches: "saved/searches",
        settings: "server/settings",
        users: "authentication/users",
        
        submitEvent: "receivers/simple"
    };
})();
});

require.define("/lib/jquery.class.js", function (require, module, exports, __dirname, __filename) {
    /*! Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * Inspired by base2 and Prototype
 */
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
})();
});

require.define("/lib/utils.js", function (require, module, exports, __dirname, __filename) {
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
    
    var root = exports || this;

    /**
     * Splunk.Utils
     * 
     * Various utility functions for the Splunk SDK
     *
     * @moduleRoot Splunk.Utils
     */

    /**
     * Bind a function to a specific object
     *
     * Example:
     *      
     *      var obj = {a: 1, b: function() { console.log(a); }};
     *      var bound = Splunk.Utils.bind(obj, obj.b);
     *      bound(); // should print 1
     *
     * @param {Object} me Object to bind to
     * @param {Function} fn Function to bind
     * @return {Function} The bound function
     *
     * @globals Splunk.Utils
     */
    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };

    /**
     * Whether an array contains a specific object
     *
     * Example:
     *      
     *      var a = {a: 3};
     *      var b = [{}, {c: 1}, {b: 1}, a];
     *      var contained = Splunk.Utils.contains(b, a); // should be tree
     *
     * @param {Array} arr Array to search
     * @param {Anything} obj Whether the array contains the element
     * @return {Boolean} Whether the array contains the element
     *
     * @globals Splunk.Utils
     */
    root.contains = function(arr, obj) {
        arr = arr || [];
        return (arr.indexOf(obj) >= 0);
    };

    /**
     * Whether a string starts with a specific prefix.
     *
     * Example:
     *      
     *      var starts = Splunk.Utils.startsWith("splunk-foo", "splunk-");
     *
     * @param {String} original String to search
     * @param {String} prefix Prefix to search with
     * @return {Boolean} Whether the string starts with the prefix
     *
     * @globals Splunk.Utils
     */
    root.startsWith = function(original, prefix) {
        var matches = original.match("^" + prefix);
        return matches && matches.length > 0 && matches[0] === prefix;  
    };

    /**
     * Whether a string ends with a specific suffix.
     *
     * Example:
     *      
     *      var ends = Splunk.Utils.endsWith("foo-splunk", "-splunk");
     *
     * @param {String} original String to search
     * @param {String} suffix Suffix to search with
     * @return {Boolean} Whether the string ends with the suffix
     *
     * @globals Splunk.Utils
     */
    root.endsWith = function(original, suffix) {
        var matches = original.match(suffix + "$");
        return matches && matches.length > 0 && matches[0] === suffix;  
    };
    
    var toString = Object.prototype.toString;
    
    /**
     * Convert an iterable to an array.
     *
     * Example:
     *      
     *      function() { 
     *          console.log(arguments instanceof Array); // false
     *          var arr = console.log(Splunk.Utils.toArray(arguments) instanceof Array); // true
     *      }
     *
     * @param {Arguments} iterable Iterable to conver to an array
     * @return {Array} The converted array
     *
     * @globals Splunk.Utils
     */
    root.toArray = function(iterable) {
        return Array.prototype.slice.call(iterable);
    };
    
    /**
     * Whether or not the argument is an array
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isArray(arguments)); // false
     *          console.log(Splunk.Utils.isArray([1,2,3])); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is an array
     * @return {Boolean} Whether or not the passed in parameter was an array
     *
     * @globals Splunk.Utils
     */
    root.isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    
    /**
     * Whether or not the argument is a function
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isFunction([1,2,3]); // false
     *          console.log(Splunk.Utils.isFunction(function() {})); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a function
     * @return {Boolean} Whether or not the passed in parameter was a function
     *
     * @globals Splunk.Utils
     */
    root.isFunction = function(obj) {
      return !!(obj && obj.constructor && obj.call && obj.apply);
    };
})();
});

require.define("/lib/client.js", function (require, module, exports, __dirname, __filename) {
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
    
    /**
     * Splunk.Client.SavedSearches
     * 
     * Represents the Splunk collection of saved searches.  You can create and
     * list saved searches using this container, or get a specific one.
     *
     * Maps to the `saved/searches`.
     *
     * @moduleRoot Splunk.Client.SavedSearches
     * @extends Splunk.Client.Collection
     */
    root.SavedSearches = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.SavedSearches
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.SavedSearches} A Splunk.Client.SavedSearches instance
         *
         * @module Splunk.Client.SavedSearches
         */     
        init: function(service) {
            this._super(service, Paths.savedSearches, {
                item: function(collection, props) { 
                    return new root.SavedSearch(collection.service, props.__name);
                }
            });
        } 
    });
    
    /**
     * Splunk.Client.SavedSearch
     * 
     * Represents a specific Splunk saved search.  You can update, remove and
     * perform various operations on this saved search.
     *
     * Maps to the `saved/searches/{name}`.
     *
     * @moduleRoot Splunk.Client.SavedSearch
     * @extends Splunk.Client.Entity
     */
    root.SavedSearch = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.SavedSearch
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} name The name of saved search
         * @return {Splunk.Client.SavedSearch} A Splunk.Client.SavedSearch instance
         *
         * @module Splunk.Client.SavedSearch
         */     
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.savedSearches + "/" + encodeURIComponent(name));
            
            this.acknowledge  = utils.bind(this, this.acknowledge);
            this.dispatch     = utils.bind(this, this.dispatch);
            this.history      = utils.bind(this, this.history);
            this.suppressInfo = utils.bind(this, this.suppressInfo);
        },
        
        /**
         * Acknowledge a saved search
         *
         * Maps to `saved/searches/{name}/acknowledge`
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
         * @module Splunk.Client.SavedSearch
         */
        acknowledge: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("acknowledge", {}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },
        
        /**
         * Dispatch a saved search
         *
         * Maps to `saved/searches/{name}/dispatch`
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
         * @module Splunk.Client.SavedSearch
         */
        dispatch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("dispatch", {}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },
        
        /**
         * Retrieve the history for a saved search.
         *
         * Maps to `saved/searches/{name}/history`
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
         * @module Splunk.Client.SavedSearch
         */
        history: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("history", {}, function(err, response) {
                callback(err, response.odata.results, that);
            });
        },
        
        /**
         * Check the suppression state of a saved search.
         *
         * Maps to `saved/searches/{name}/suppress`
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
         * @module Splunk.Client.SavedSearch
         */
        suppressInfo: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.get("suppress", {}, function(err, response) {
                callback(err, response.odata.results, that);
            });
        }
    });
    
    /**
     * Splunk.Client.Applications
     * 
     * Represents the Splunk collection of applications.  You can create and
     * list applications using this container, or get a specific one.
     *
     * Maps to the `apps/local`.
     *
     * @moduleRoot Splunk.Client.Applications
     * @extends Splunk.Client.Collection
     */  
    root.Applications = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.Applications
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.Applications} A Splunk.Client.Applications instance
         *
         * @module Splunk.Client.Applications
         */  
        init: function(service) {
            this._super(service, Paths.apps, {
                item: function(collection, props) {
                    return new root.Application(collection.service, props.__name);
                }
            });
        }
    });
    
    /**
     * Splunk.Client.Application
     * 
     * Represents a specific Splunk application.  You can update, remove and
     * perform various operations on this application.
     *
     * Maps to the `apps/local/{name}`.
     *
     * @moduleRoot Splunk.Client.Application
     * @extends Splunk.Client.Entity
     */
    root.Application = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.Application
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} name The name of the application
         * @return {Splunk.Client.Application} A Splunk.Client.Application instance
         *
         * @module Splunk.Client.Application
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.apps + "/" + encodeURIComponent(name));
            
            this.setupInfo  = utils.bind(this, this.setupInfo);
            this.updateInfo = utils.bind(this, this.updateInfo);
        },
        
        /**
         * Retrieve information about the setup for this app
         *
         * Maps to `apps/local/{name}/setup`
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
         * @module Splunk.Client.Application
         */
        setupInfo: function(callback) {
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
        
        /**
         * Retrieve any available update information for this app
         *
         * Maps to `apps/local/{name}/update`
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
         * @module Splunk.Client.Application
         */
        updateInfo: function(callback) {
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
        
    /**
     * Splunk.Client.Indexes
     * 
     * Represents the Splunk collection of indexes.  You can create and
     * list indexes using this container, or get a specific one.
     *
     * Maps to the `data/indexes`.
     *
     * @moduleRoot Splunk.Client.Indexes
     * @extends Splunk.Client.Collection
     */  
    root.Indexes = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.Indexes
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.Indexes} A Splunk.Client.Indexes instance
         *
         * @module Splunk.Client.Indexes
         */  
        init: function(service) {
            this._super(service, Paths.indexes, {
                item: function(collection, props) {
                    return new root.Index(collection.service, props.__name);  
                },
                loadOnCreate: function() { return true; },
                loadOnItem: function() { return true; }
            });
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
         * @module Splunk.Client.Indexes
         */
        create: function(name, params, callback) {
            params = params || {};
            params["name"] = name;
            
            this._super(params, callback);
        }
    });
    
    /**
     * Splunk.Client.Index
     * 
     * Represents a specific Splunk index.  You can update and submit
     * events to this index.
     *
     * Maps to the `data/indexes/{name}`.
     *
     * @moduleRoot Splunk.Client.Index
     * @extends Splunk.Client.Entity
     */
    root.Index = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.Index
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} name The name of the index
         * @return {Splunk.Client.Index} A Splunk.Client.Index instance
         *
         * @module Splunk.Client.Index
         */ 
        init: function(service, name) {
            this.name = name;
            this._super(service, Paths.indexes + "/" + encodeURIComponent(name));
            
            this.submitEvent = utils.bind(this, this.submitEvent);
        },
        
        /**
         * Submit an event to this index
         *
         * Maps to `receivers/simple?index={name}'
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
         * @module Splunk.Client.Index
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
            this.service.request(path, method, headers, body, function(err, response) {
                if (err) {
                    callback(err);
                } 
                else {
                    callback(null, response.odata.results, that);
                }
            });
            this._invalidate();
        },
        
        remove: function() {
            throw new Error("Indexes cannot be removed");
        }
    });
    
    /**
     * Splunk.Client.Properties
     * 
     * Represents the Splunk collection of property files.  You can create and
     * list files using this container, or get a specific one.
     *
     * Maps to the `properties`.
     *
     * @moduleRoot Splunk.Client.Properties
     * @extends Splunk.Client.Collection
     */  
    root.Properties = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.Properties
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.Properties} A Splunk.Client.Properties instance
         *
         * @module Splunk.Client.Properties
         */  
        init: function(service) {
           this._super(service, Paths.properties, {
               item: function(collection, props) {
                   var name = props.__name;
                   return new root.PropertyFile(collection.service, name);
               },
               loadOnItem: function() { return false; }
           });  
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
         * @module Splunk.Client.Properties
         */
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
    
    /**
     * Splunk.Client.PropertyFile
     * 
     * Represents the Splunk collection of stanzas for a specific property file.  
     * You can create and list stanzas using this container, or get a specific one.
     *
     * Maps to the `properties/{file-name}`.
     *
     * @moduleRoot Splunk.Client.PropertyFile
     * @extends Splunk.Client.Collection
     */  
    root.PropertyFile = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.PropertyFile
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.PropertyFile} A Splunk.Client.PropertyFile instance
         *
         * @module Splunk.Client.PropertyFile
         */  
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
         * @module Splunk.Client.PropertyFile
         */
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
    
    /**
     * Splunk.Client.PropertyStanza
     * 
     * Represents a specific Splunk stanza.  You can update and remove this
     * stanza.
     *
     * Maps to the `properties/{file}/{name}`
     *
     * @moduleRoot Splunk.Client.PropertyStanza
     * @extends Splunk.Client.Entity
     */
    root.PropertyStanza = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.PropertyStanza
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} name The name of the index
         * @return {Splunk.Client.PropertyStanza} A Splunk.Client.PropertyStanza instance
         *
         * @module Splunk.Client.PropertyStanza
         */ 
        init: function(service, file, name) {
            this.name = name;
            this._super(service, Paths.properties + "/" + encodeURIComponent(file) + "/" + encodeURIComponent(name));
        } 
    });
    
    /**
     * Splunk.Client.Configurations
     * 
     * Represents the Splunk collection of configuration files.  You can create and
     * list files using this container, or get a specific one.
     *
     * Maps to the `properties`.
     *
     * @moduleRoot Splunk.Client.Configurations
     * @extends Splunk.Client.Collection
     */  
    root.Configurations = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.Configurations
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.Configurations} A Splunk.Client.Configurations instance
         *
         * @module Splunk.Client.Configurations
         */  
        init: function(service) {
           this._super(service, Paths.properties, {
               item: function(collection, props) {
                   var name = props.__name;
                   return new root.ConfigurationFile(collection.service, name);
               },
               loadOnItem: function() { return false; }
           });  
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
         * @module Splunk.Client.Configurations
         */
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
    
    /**
     * Splunk.Client.ConfigurationFile
     * 
     * Represents the Splunk collection of stanzas for a specific property file.  
     * You can create and list stanzas using this container, or get a specific one.
     *
     * Maps to the `configs/conf-{filename}`.
     *
     * @moduleRoot Splunk.Client.ConfigurationFile
     * @extends Splunk.Client.Collection
     */  
    root.ConfigurationFile = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.ConfigurationFile
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.ConfigurationFile} A Splunk.Client.ConfigurationFile instance
         *
         * @module Splunk.Client.ConfigurationFile
         */  
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
         * @module Splunk.Client.ConfigurationFile
         */
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
    
    /**
     * Splunk.Client.ConfigurationStanza
     * 
     * Represents a specific Splunk stanza.  You can update and remove this
     * stanza.
     *
     * Maps to the `configs/conf-{file}/{name}`
     *
     * @moduleRoot Splunk.Client.ConfigurationStanza
     * @extends Splunk.Client.Entity
     */
    root.ConfigurationStanza = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.ConfigurationStanza
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} name The name of the index
         * @return {Splunk.Client.ConfigurationStanza} A Splunk.Client.ConfigurationStanza instance
         *
         * @module Splunk.Client.ConfigurationStanza
         */ 
        init: function(service, file, name) {
            this.name = name;
            this._super(service, Paths.configurations + "/conf-" + encodeURIComponent(file) + "/" + encodeURIComponent(name));
        } 
    });

    /**
     * Splunk.Client.Jobs
     * 
     * Represents the Splunk collection of jobs.  You can create and
     * list search jobs using this container, or get a specific one.
     *
     * Maps to the `search/jobs`.
     *
     * @moduleRoot Splunk.Client.Jobs
     * @extends Splunk.Client.Collection
     */  
    root.Jobs = root.Collection.extend({
        /**
         * Constructor for Splunk.Client.Jobs
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @return {Splunk.Client.Jobs} A Splunk.Client.Jobs instance
         *
         * @module Splunk.Client.Jobs
         */  
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

        /**
         * Create a search job
         *
         * Create a search job using the specified query and parameters.
         *
         * Maps to `search/jobs`
         *
         * Example:
         *
         *      var jobs = service.jobs();
         *      jobs.create("search ERROR", {id: "myjob_123"}, function(err, newJob) {
         *          console.log("CREATED": newJob.sid);
         *      });
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @module Splunk.Client.Jobs
         */
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

    /**
     * Splunk.Client.Job
     * 
     * Represents a specific Splunk search job.  You can perform various operations
     * on this job, such as reading its status, cancelling it, getting results
     * and so on.
     *
     * Maps to the `search/jobs/{sid}`
     *
     * @moduleRoot Splunk.Client.Job
     * @extends Splunk.Client.Entity
     */
    root.Job = root.Entity.extend({
        /**
         * Constructor for Splunk.Client.Job
         *
         * @constructor
         * @param {Splunk.Client.Service} service A service instance
         * @param {String} sid The search ID for this search
         * @return {Splunk.Client.Job} A Splunk.Client.Job instance
         *
         * @module Splunk.Client.Job
         */ 
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

        /**
         * Cancel a search job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        cancel: function(callback) {
            this.post("control", {action: "cancel"}, callback);
            this._invalidate();
        },

        /**
         * Disable preview for a job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        disablePreview: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "disablepreview"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Enable preview for a job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        enablePreview: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "enablepreview"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Get job events
         *
         * Get the events for a job with given parameters.
         *
         * Maps to `search/jobs/{sid}/events`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Finalize a search job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        finalize: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "finalize"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Pause a search job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        pause: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "pause"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /*
         * Get the preview results for a job
         *
         * Get the preview results for a job with given parameters.
         *
         * Maps to `search/jobs/{sid}/results_preview`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Get job results
         *
         * Get the results for a job with given parameters.
         *
         * Maps to `search/jobs/{sid}/results`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Get the search log for this job.
         *
         * Maps to `search/jobs/{sid}/search.log`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Set the job priority
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        setPriority: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "setpriority", priority: value}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Set the job TTL
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        setTTL: function(value, callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "setttl", ttl: value}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Get the summary for this job
         *
         * Get the job summary for this job with the given parameters
         *
         * Maps to `search/jobs/{sid}/summary`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Get the timeline for this job
         *
         * Maps to `search/jobs/{sid}/timeline`
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
         * @module Splunk.Client.Job
         */
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

        /**
         * Touch a job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
        touch: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            this.post("control", {action: "touch"}, function(err) {
                callback(err, that);
            });
            this._invalidate();
        },

        /**
         * Unpause a search job
         *
         * Maps to `search/jobs/{sid}/control`
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
         * @module Splunk.Client.Job
         */
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
});

require.define("/lib/http.js", function (require, module, exports, __dirname, __filename) {
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
    
    var Class           = require('./jquery.class').Class;
    var ODataResponse   = require('./odata').ODataResponse;
    var utils           = require('./utils');

    var root = exports || this;

    /**
     * Helper function to encode a dictionary of values into a URL-encoded
     * format.
     *
     * Example:
     *      
     *      // should be a=1&b=2&b=3&b=4
     *      encode({a: 1, b: [2,3,4]})
     *
     * @param {Object} params Parameters to URL-encode
     * @return {String} URL-encoded query string
     *
     * @globals Splunk.Http
     */
    root.encode = function(params) {
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
                else if (typeof value === "object") {
                    for(var innerKey in value) {
                        if (value.hasOwnProperty(innerKey)) {
                            var innerValue = value[innerKey];
                            encodedStr = encodedStr + key + "=" + encodeURIComponent(value[innerKey]) + "&";
                        }
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
     
    /**
     * Splunk.Http
     * 
     * Base class for HTTP abstraction. 
     *
     * This class provides the basic functionality (get/post/delete/request),
     * as well as utilities to construct uniform responses.
     *
     * Base classes should only override `makeRequest` and `parseJSON`
     *
     * @moduleRoot Splunk.Http
     */
    root.Http = Class.extend({
        /**
         * Constructor for Splunk.Http
         *
         * @constructor
         * @param {Boolean} isSplunk Whether or not this is HTTP instance is for talking with Splunk.
         * @return {Splunk.Http} A Splunk.Http instance
         *
         * @module Splunk.Http 
         */
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

        /**
         * Perform a POST request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Body parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Http 
         */
        get: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + root.encode(params);
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        /**
         * Perform a POST request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Body parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Http 
         */
        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                body: root.encode(params)
            };

            return this.request(url, message, callback);
        },

        /**
         * Perform a DELETE request
         *
         * @param {String} url URL to request
         * @param {Object} headers Object of headers for this request
         * @param {Object} params Query parameters for this request
         * @param {Number} timeout Timeout (currently ignored)
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Http 
         */
        del: function(url, headers, params, timeout, callback) {
            var encoded_url = url + "?" + root.encode(params);
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout
            };

            return this.request(encoded_url, message, callback);
        },

        /**
         * Perform a request
         *
         * This function sets up everything to handle the response from a request,
         * but delegates the actual calling to the subclass using `makeRequest`.
         *
         * @param {String} url URL to request (already encoded)
         * @param {Object} message Object with values for method, headers, timeout and encoded body
         * @param {Function} Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Http 
         * @see makeRequest
         */
        request: function(url, message, callback) {
            var wrappedCallback = function(response) {
                callback = callback || function() {};

                if (response.status < 400) {
                    callback(null, response);
                }
                else {
                    callback(response);
                }
            };

            // Now we can invoke the user-provided HTTP class,
            // passing in our "wrapped" callback
            this.makeRequest(url, message, wrappedCallback);
        },

        /**
         * Client-specific request logic
         *
         * This function encapsulates the actual logic for performing
         * a request, and is meant to be overriden by subclasses.
         *
         * @param {String} url URL to request (already encoded)
         * @param {Object} message Object with values for method, headers, timeout and encoded body
         * @param {Function} Callback for when the request is complete: `(err, response)`
         *
         * @module Splunk.Http 
         */
        makeRequest: function(url, message, callback) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED"); 
        },

        /**
         * Client-specific JSON parsing logic
         *
         * This function encapsulates the actual logic for parsing
         * the JSON response.
         *
         * @param {String} json JSON to parse
         * @returns {Object} Parsed JSON
         *
         * @module Splunk.Http 
         */
        parseJson: function(json) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Construct a unified response
         *
         * This function will generate a unified response given the
         * parameters
         *
         * @param {Object} error Error object if there was one for the request
         * @param {Object} response The actual response object
         * @param {Object} data The response data
         * @return {Object} A unified response object
         *
         * @module Splunk.Http 
         */
        _buildResponse: function(error, response, data) {
            var complete_response, json, odata;

            // Parse the JSON data and build the OData response
            // object.
            if (this.isSplunk) {
                try {
                    json = this.parseJson(data);
                } catch(err1) {
                    // TODO
                    console.log("JSON PARSE ERROR");
                    console.log(err1.message);
                    console.log(err1.stack);
                    console.log(error);
                    console.log(data);
                }
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
                    try {
                        json = this.parseJson(data);
                    } catch(err2) {
                        // TODO
                        console.log("JSON PARSE ERROR");
                        console.log(err2.message);
                        console.log(err2.stack);
                        console.log(error);
                        console.log(data);
                    }
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
})();
});

require.define("/lib/odata.js", function (require, module, exports, __dirname, __filename) {
    
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
            // TODO
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

        output["__metadata"] = d["__metadata"];
        output["__name"] = d["__name"];
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
                    case 'HTTP':
                    case 'FATAL':
                    case 'ERROR':
                        // TODO
                        console.error(msg);
                        break;
                    case 'WARN':
                        // TODO
                        console.warn(msg);
                        break;
                    case 'INFO':
                        // TODO
                        console.info(msg);
                        break;
                    case 'HTTP':
                        break;
                    default:
                        // TODO
                        console.info('[SPLUNKD] ' + list[i].type + ' - ' + msg);
                        break;
                }
            }
        }

        return list;  
    };
})();
});

require.define("/lib/async.js", function (require, module, exports, __dirname, __filename) {
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
    
    var utils = require('./utils');
    var root = exports || this;

    /**
     * Splunk.Async
     * 
     * Utilities for Async control flow and collection handling
     *
     * @moduleRoot Splunk.Async
     */

    /**
     * An asynchronous while loop
     *
     * Example:
     *      
     *      var i = 0;
     *      Async.whilst(
     *          function() { return i++ < 3; },
     *          function(done) {
     *              Async.sleep(0, function() { done(); });
     *          },
     *          function(err) {
     *              console.log(i) // == 3;
     *          }
     *      );
     *
     * @param {Function} condition A function which returns a boolean depending on whether the condition has been met.
     * @param {Function} body A function which executes the body of the loop: `(done)`
     * @param {Function} callback A function to be executed when the loop is complete: `(err)`
     *
     * @globals Splunk.Async
     */
    root.whilst = function(condition, body, callback) {  
        condition = condition || function() { return false; };
        body = body || function(done) { done(); };
        callback = callback || function() {};
        
        var iterationDone = function(err) {
            if (err) {
                callback(err);
            }
            else {
                root.whilst(condition, body, callback);
            }
        };
        
        if (condition()) {
            body(iterationDone);
        }
        else {
            callback(null);
        }
    };
    
    /**
     * Execute multiple functions in parallel.
     * 
     * Async.parallel will execute multiple tasks (functions) in parallel,
     * and only call the callback if one of them fails, or when all are complete.
     *
     * Each task takes a single parameter, which is a callback to be invoked when the 
     * task is complete.
     *
     * The callback will be invoked with the combined results (in order) of all the 
     * tasks.
     *
     * Note that order of execution is not guaranteed, even though order of results is. 
     *
     * Example:
     *      
     *      Async.parallel([
     *          function(done) {
     *              done(null, 1);
     *          },
     *          function(done) {
     *              done(null, 2, 3);
     *          }],
     *          function(err, one, two) {
     *              console.log(err); // == null
     *              console.log(one); // == 1
     *              console.log(two); // == [1,2]
     *          }
     *      );
     *
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, ...)`
     *
     * @globals Splunk.Async
     */
    root.parallel = function(tasks, callback) {
        tasks = tasks || [];
        callback = callback || function() {};
        
        if (tasks.length === 0) {
            callback();
        }
        
        var tasksLeft = tasks.length;
        var results = [];
        var doneCallback = function(idx) {
            return function(err) {
                
                if (err) {
                    callback(err);
                    callback = null;
                }
                else {
                    var args = utils.toArray(arguments);  
                    args.shift();
                    
                    if (args.length === 1) {
                        args = args[0];
                    }
                    results[idx] = args;
                    
                    if ((--tasksLeft) === 0) {
                        results.unshift(null);
                        if (callback) {
                            callback.apply(null, results);
                        }
                    }
                }
            };
        };
        
        for(var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            task(doneCallback(i));
        }
    };
    
    /**
     * Execute multiple functions in series.
     * 
     * Async.series will execute multiple tasks (functions) in series,
     * and only call the callback if one of them fails, or when all are complete.
     *
     * Each task takes a single parameter, which is a callback to be invoked when the 
     * task is complete.
     *
     * The callback will be invoked with the combined results (in order) of all the 
     * tasks.
     *
     * Example:
     *      
     *      var keeper = 0;
     *      Async.series([
     *          function(done) {
     *              Async.sleep(10, function() {
     *                  console.log(keeper++); // == 0
     *                  done(null, 1);
     *              });
     *          },
     *          function(done) {
     *              console.log(keeper++); // == 1
     *              done(null, 2, 3);
     *          }],
     *          function(err, one, two) {
     *              console.log(err); // == null
     *              console.log(one); // == 1
     *              console.log(two); // == [1,2]
     *          }
     *      );
     *
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, ...)`
     *
     * @globals Splunk.Async
     */
    root.series = function(tasks, callback) {        
        callback = callback || function() {};
        
        var innerSeries = function(task, restOfTasks, resultsSoFar, callback) {
            if (!task) {
                resultsSoFar.unshift(null);
                callback.apply(null, resultsSoFar);
                return;
            }
            
            task(function(err) {
                if (err) {
                    callback(err);
                    callback = null;
                }
                else {
                    var args = utils.toArray(arguments);
                    args.shift();
                    if (args.length === 1) {
                        args = args[0];
                    }
                    resultsSoFar.push(args);
                    
                    innerSeries(restOfTasks[0], restOfTasks.slice(1), resultsSoFar, callback);
                }
            });
        };
        
        innerSeries(tasks[0], tasks.slice(1), [], callback);
    };
    
    /**
     * Map an asynchronous function over an array of values, in parallel.
     * 
     * Async.parallelMap will execute a function over each element in an array in parallel,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with the resulting array.
     *
     * Example:
     *      
     *      Async.parallelMap(
     *          [1, 2, 3],
     *          function(val, idx, done) { 
     *              if (val === 2) {
     *                  Async.sleep(100, function() { done(null, val+1); });   
     *              }
     *              else {
     *                  done(null, val + 1);
     *              }
     *          },
     *          function(err, vals) {
     *              console.log(vals); // == [2,3,4]
     *          }
     *      );
     *
     * @param {Array} vals An array of the values to map over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, mappedVals)`
     *
     * @globals Splunk.Async
     */
    root.parallelMap = function(vals, fn, callback) {     
        callback = callback || function() {};
        
        var tasks = [];
        var createTask = function(val, idx) {
            return function(done) { fn(val, idx, done); };
        };
        
        for(var i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i], i));
        }
        
        root.parallel(tasks, function(err) {
            if (err) {
                callback(err);
                callback = null;
            }
            else {
                var args = utils.toArray(arguments);
                args.shift();
                callback(null, args);
            }
        });
    };
    
    /**
     * Map an asynchronous function over an array of values, in series.
     * 
     * Async.seriesMap will execute a function over each element in an array in series,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with the resulting array.
     *
     * Example:
     *      
     *      var keeper = 1;
     *      Async.seriesMap(
     *          [1, 2, 3],
     *          function(val, idx, done) { 
     *              console.log(keeper++); // == 1, then 2, then 3
     *              done(null, val + 1);
     *          },
     *          function(err, vals) {
     *              console.log(vals); // == [2,3,4];
     *          }
     *      );
     *
     * @param {Array} vals An array of the values to map over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, mappedVals)`
     *
     * @globals Splunk.Async
     */
    root.seriesMap = function(vals, fn, callback) {     
        callback = callback || function() {};
        
        var tasks = [];
        var createTask = function(val, idx) {
            return function(done) { fn(val, idx, done); };
        };
        
        for(var i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i], i));
        }
        
        root.series(tasks, function(err) {
            if (err) {
                callback(err);
            }
            else {
                var args = utils.toArray(arguments);
                args.shift();
                callback(null, args);
            }
        });
    };
    
    /**
     * Apply an asynchronous function over an array of values, in parallel.
     * 
     * Async.parallelEach will execute a function over each element in an array in parallel,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with nothing except a possible error parameter
     *
     * Example:
     *      
     *      var total = 0;
     *      Async.parallelEach(
     *          [1, 2, 3],
     *          function(val, idx, done) { 
     *              var go = function() {
     *                  total += val;
     *                  done();
     *              };
     *              
     *              if (idx === 1) {
     *                  Async.sleep(100, go);    
     *              }
     *              else {
     *                  go();
     *              }
     *          },
     *          function(err) {
     *              console.log(total); // == 6
     *          }
     *      );
     *
     * @param {Array} vals An array of the values to apply over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err)`
     *
     * @globals Splunk.Async
     */
    root.parallelEach = function(vals, fn, callback) {     
        callback = callback || function() {};
        
        root.parallelMap(vals, fn, function(err, result) {
            callback(err); 
        });
    };
    
    /**
     * Apply an asynchronous function over an array of values, in series.
     * 
     * Async.seriesEach will execute a function over each element in an array in series,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with nothing except a possible error parameter
     *
     * Example:
     *      
     *      var results = [1, 3, 6];
     *      var total = 0;
     *      Async.seriesEach(
     *          [1, 2, 3],
     *          function(val, idx, done) { 
     *              total += val;
     *              console.log(total === results[idx]); //== true
     *              done();
     *          },
     *          function(err) {
     *              console.log(total); //== 6
     *          }
     *      );
     *
     * @param {Array} vals An array of the values to apply over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err)`
     *
     * @globals Splunk.Async
     */
    root.seriesEach = function(vals, fn, callback) {     
        callback = callback || function() {};
        
        root.seriesMap(vals, fn, function(err, result) {
            callback(err); 
        });
    };
    
    /**
     * Chain asynchronous tasks.
     * 
     * Async.chain will chain asynchronous together by executing a task, and passing the results
     * to the next task as arguments. If an error occurs at any point, or when the chain completes,
     * the callback will be executed
     *
     * Each task takes 1-N parameters, where the amount is dependent on the previous task in the chain.
     * The last parameter will always be a function to invoke when the task is complete.
     *
     * The callback will be invoked with the result of the final task.
     * 
     * Note that `err` arguments are not passed to individual tasks - they are propagated to the final
     * callback.
     *
     * Example:
     *      
     *     Async.chain([
     *         function(callback) { 
     *             callback(null, 1, 2);
     *         },
     *         function(val1, val2, callback) {
     *             callback(null, val1 + 1);
     *         },
     *         function(val1, callback) {
     *             callback(null, val1 + 1, 5);
     *         }],
     *         function(err, val1, val2) {
     *             console.log(val1); //== 3
     *             console.log(val2); //== 5
     *         }
     *     );
     *     
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when the chain is done or an error occurred: `(err, ...)`
     *
     * @globals Splunk.Async
     */
    root.chain = function(tasks, callback) {
        callback = callback || function() {};
        
        if (!tasks.length) {
            callback();
        }
        else {
            var innerChain = function(task, restOfTasks, result) {
                var chainCallback = function(err) {
                    if (err) {
                        callback(err);
                        callback = function() {};
                    }
                    else {
                        var args = utils.toArray(arguments);
                        args.shift();
                        innerChain(restOfTasks[0], restOfTasks.slice(1), args);
                    }
                };
                
                var args = result;
                if (!restOfTasks.length) {
                    args.push(callback);
                }
                else {
                    args.push(chainCallback);
                }
                
                task.apply(null, args);
            };
            
            innerChain(tasks[0], tasks.slice(1), []);
        }
    };
    
    /**
     * Execute a function after a certain delay.
     * 
     * Async.sleep will execute the given function after the specified timeout period. This function
     * mostly exists to make `setTimeout` adhere to Node.js style function signatures.
     *
     * Example:
     *      
     *     Async.sleep(1000, function() { console.log("TIMEOUT");});
     *     
     * @param {Number} timeout The specified timeout in milliseconds.
     * @param {Function} callback A function to be executed when the timeout occurs.
     *
     * @globals Splunk.Async
     */
    root.sleep = function(timeout, callback) {
        setTimeout(callback, timeout);
    };
    
    /**
     * Augment a callback with extra parameters
     * 
     * Async.augment will cause a callback to be invoked with the extra specified parameters.
     *
     * Note that the augmented parameters are appended to the end of the parameter list.
     *
     * Example:
     *
     *      var callback = function(a, b) {
     *          console.log(a); //== 1
     *          console.log(b); //== 2
     *      };
     *      
     *      var augmented = Async.augment(callback, 2);
     *      augmented(1);
     *     
     * @param {Function} callback The callback to augment.
     * @param {Anything...} rest Variable number of arguments to augment the callback with.
     *
     * @globals Splunk.Async
     */
    root.augment = function(callback) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            var augmentedArgs = Array.prototype.slice.call(arguments);
            for(var i = 0; i < args.length; i++) {
              augmentedArgs.push(args[i]);
            }
            
            callback.apply(null, augmentedArgs);
        };
    };
})();
});

require.define("/lib/searcher.js", function (require, module, exports, __dirname, __filename) {
    
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
    
    var client  = require('./client');
    var Class   = require('./jquery.class').Class;
    var utils   = require('./utils');
    var Async   = require('./async');
    
    var root = exports || this;

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    root.JobManager = Class.extend({
        init: function(service, job) {
            this.service = service;
            this.job = job;
            this.isJobDone = false;
            this.onProgressCallbacks = [];
            this.onFailCallbacks = [];
            
            this._dispatchCallbacks = utils.bind(this, this._dispatchCallbacks);
            this.onProgress         = utils.bind(this, this.onProgress);
            this.onFail             = utils.bind(this, this.onFail);
            this.done               = utils.bind(this, this.done);
            this.cancel             = utils.bind(this, this.cancel);
            this.isDone             = utils.bind(this, this.isDone);
            this.eventsIterator     = utils.bind(this, this.eventsIterator);
            this.resultsIterator    = utils.bind(this, this.resultsIterator);
            this.previewIterator    = utils.bind(this, this.previewIterator);
        },
        
        _dispatchCallbacks: function(callbacks, properties) {
            callbacks = callbacks || [];
            for(var i = 0; i < callbacks.length; i++) {
                var callback = callbacks[i];
                callback.call(null, null, properties, this);
            }
        },
        
        onProgress: function(callback) {
            this.onProgressCallbacks.push(callback);  
        },
        
        onFail: function(callback) {
            this.onFailCallbacks.push(callback); 
        },
        
        done: function(callback) {    
            callback = callback || function() {};
                    
            var manager = this;
            var job = this.job;
            var properties = {};
            var stopLooping = false;
            Async.whilst(
                function() { return !stopLooping; },
                function(done) {
                    job.refresh(function(err, job) {
                        properties = job.properties();
                        
                        // Dispatch for progress
                        manager._dispatchCallbacks(manager.onProgressCallbacks, properties);
                        
                        // Dispatch for failure if necessary
                        if (properties.isFailed) {
                            manager._dispatchCallbacks(manager.onFailCallbacks, properties);
                        }
                        
                        stopLooping = properties.isDone || manager.isJobDone || properties.isFailed;
                        Async.sleep(1000, done);
                    });
                },
                function(err) {
                    manager.isJobDone = true;
                    callback.apply(null, [err, manager]);
                }
            );
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
});

require.define("/tests/test_async.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function() {
    var Splunk      = require('../splunk').Splunk;
    var Async       = Splunk.Async;

    var isBrowser = typeof "window" !== "undefined";

    return {        
        "While success": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < 3; },
                function(done) {
                    Async.sleep(0, function() { done(); });
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "While success deep": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < (isBrowser ? 100 : 10000); },
                function(done) {
                    Async.sleep(0, function() { done(); });
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "While error": function(test) {
            var i = 0;
            Async.whilst(
                function() { return i++ < (isBrowser ? 100 : 10000); },
                function(done) {
                    Async.sleep(0, function() { done(i === (isBrowser ? 50 : 10000) ? 1 : null); });
                },
                function(err) {
                    test.ok(err);
                    test.strictEqual(err, 1);
                    test.done();
                }
            );
        },
        
        "Parallel success": function(test) {
            Async.parallel([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Parallel success - no reordering": function(test) {
            Async.parallel([
                function(done) {
                    Async.sleep(1, function() { done(null, 1); });  
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Parallel error": function(test) {
            Async.parallel([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                },
                function(done) {
                    Async.sleep(0, function() {
                        done("ERROR");
                    });
                }],
                function(err, one, two) {
                    test.ok(err === "ERROR");
                    test.ok(!one);
                    test.ok(!two);
                    test.done();
                }
            );
        },
        
        "Parallel no tasks": function(test) {
            Async.parallel(
                [],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "Series success": function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Series reordering success": function(test) {
            var keeper = 0;
            Async.series([
                function(done) {
                    Async.sleep(10, function() {
                        test.strictEqual(keeper++, 0);
                        done(null, 1);
                    });
                },
                function(done) {
                    test.strictEqual(keeper++, 1);
                    done(null, 2, 3);
                }],
                function(err, one, two) {
                    test.ok(!err);
                    test.strictEqual(keeper, 2);
                    test.strictEqual(one, 1);
                    test.strictEqual(two[0], 2);
                    test.strictEqual(two[1], 3);
                    test.done();
                }
            );
        },
        
        "Series error": function(test) {
            Async.series([
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done("ERROR", 2, 3);
                }],
                function(err, one, two) {
                    test.strictEqual(err, "ERROR");
                    test.ok(!one);
                    test.ok(!two);
                    test.done();
                }
            );
        },
        
        "Series no tasks": function(test) {
            Async.series(
                [],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },
        
        "Parallel map success": function(test) {
            Async.parallelMap(
                [1, 2, 3],
                function(val, idx, done) { 
                    done(null, val + 1);
                },
                function(err, vals) {
                    test.ok(!err);
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.done();
                }
            );
        },
        
        "Parallel map reorder success": function(test) {
            Async.parallelMap(
                [1, 2, 3],
                function(val, idx, done) { 
                    if (val === 2) {
                        Async.sleep(100, function() { done(null, val+1); });   
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                function(err, vals) {
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.done();
                }
            );
        },
        
        "Parallel map error": function(test) {
            Async.parallelMap(
                [1, 2, 3],
                function(val, idx, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                function(err, vals) {
                    test.ok(err);
                    test.ok(!vals);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Series map success": function(test) {
            var keeper = 1;
            Async.seriesMap(
                [1, 2, 3],
                function(val, idx, done) { 
                    test.strictEqual(keeper++, val);
                    done(null, val + 1);
                },
                function(err, vals) {
                    test.ok(!err);
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.strictEqual(vals[2], keeper);
                    test.done();
                }
            );
        },
        
        "Series map error": function(test) {
            Async.seriesMap(
                [1, 2, 3],
                function(val, idx, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                function(err, vals) {
                    test.ok(err);
                    test.ok(!vals);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Chain single success": function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                }],
                function(err, val) {
                    test.ok(!err);
                    test.strictEqual(val, 3);
                    test.done();
                }
            );
        },
        
        "Chain multiple success": function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                }],
                function(err, val1, val2) {
                    test.ok(!err);
                    test.strictEqual(val1, 3);
                    test.strictEqual(val2, 4);
                    test.done();
                }
            );
        },
        
        "Chain arity change success": function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1);
                },
                function(val1, callback) {
                    callback(null, val1 + 1, 5);
                }],
                function(err, val1, val2) {
                    test.ok(!err);
                    test.strictEqual(val1, 3);
                    test.strictEqual(val2, 5);
                    test.done();
                }
            );
        },
        
        "Chain error": function(test) {
            Async.chain([
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(5, val1 + 1);
                },
                function(val1, callback) {
                    callback(null, val1 + 1, 5);
                }],
                function(err, val1, val2) {
                    test.ok(err);
                    test.ok(!val1);
                    test.ok(!val2);
                    test.strictEqual(err, 5);
                    test.done();
                }
            );
        },
        
        "Chain no tasks": function(test) {
            Async.chain([],
                function(err, val1, val2) {
                    test.ok(!err);
                    test.ok(!val1);
                    test.ok(!val2);
                    test.done();
                }
            );
        },
        
        "Parallel each reodrder success": function(test) {
            var total = 0;
            Async.parallelEach(
                [1, 2, 3],
                function(val, idx, done) { 
                    var go = function() {
                        total += val;
                        done();
                    };
                    
                    if (idx === 1) {
                        Async.sleep(100, go);    
                    }
                    else {
                        go();
                    }
                },
                function(err) {
                    test.ok(!err);
                    test.strictEqual(total, 6);
                    test.done();
                }
            );
        },
        
        "Series each success": function(test) {
            var results = [1, 3, 6];
            var total = 0;
            Async.seriesEach(
                [1, 2, 3],
                function(val, idx, done) { 
                    total += val;
                    test.strictEqual(total, results[idx]);
                    done();
                },
                function(err) {
                    test.ok(!err);
                    test.strictEqual(total, 6);
                    test.done();
                }
            );
        },
        
        "Augment callback": function(test) {
            var callback = function(a, b) { 
                test.ok(a);
                test.ok(b);
                test.strictEqual(a, 1);
                test.strictEqual(b, 2);  
                
                test.done();
            };
            
            var augmented = Async.augment(callback, 2);
            augmented(1);
        },
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}
});

require.define("/tests/test_http.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function(http) {
    var Splunk      = require('../splunk').Splunk;

    return {
        "HTTP GET Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                }); 
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.get("http://www.httpbin.org/status/404", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 404);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.get("http://www.httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", {"X-Test1": 1, "X-Test2": "a/b/c"}, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.json.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        },

        "HTTP POST Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#no args": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.post("http://www.httpbin.org/status/405", {}, {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.json.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://www.httpbin.org/post");
                    test.done();
                });
            }
        },

        "HTTP DELETE Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
        
            "Callback#no args": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.del("http://www.httpbin.org/status/405", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp(false);
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}
});

require.define("/platform/node/node_http.js", function (require, module, exports, __dirname, __filename) {
    
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
    var request = require('request');
    var Splunk  = require('../../splunk').Splunk;
    var utils   = Splunk.Utils;

    var root = exports || this;

    root.NodeHttp = Splunk.Http.extend({
        init: function(isSplunk) {
            this._super(isSplunk);
        },

        makeRequest: function(url, message, callback) {
            var request_options = {
                url: url,
                method: message.method,
                headers: message.headers || {},
                body: message.body || "",
                jar: false
            };
            
            request_options.headers["Content-Length"] = request_options.body.length;
            console.log("URL: " + url);

            request(request_options, utils.bind(this, function (error, res, data) {
                var complete_response = this._buildResponse(error, res, data);
                callback(complete_response);
            }));
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();
});

require.define("/tests/test_binding.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;

    var isBrowser = typeof "window" !== "undefined";
    
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },
            
        "Service exists": function(test) {
            test.ok(this.service);
            test.done();
        },

        "Callback#login": function(test) {
            var newService = new Splunk.Client.Service(svc.http, { 
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password
            });

            newService.login(function(err, success) {
                test.ok(success);
                test.done();
            });
        },

        "Callback#login fail": function(test) {
            var newService = new Splunk.Client.Service(svc.http, { 
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password + "wrong_password"
            });

            if (!isBrowser) {
                newService.login(function(err, success) {
                    test.ok(err);
                    test.ok(!success);
                    test.done();
                });
            }
            else {
                test.done();
            }
        },

        "Callback#get": function(test) { 
            this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.strictEqual(res.odata.offset, 0);
                test.ok(res.odata.count <= res.odata.total_count);
                test.strictEqual(res.odata.count, 2);
                test.strictEqual(res.odata.count, res.odata.results.length);
                test.ok(res.odata.results[0].sid);
                test.done();
            });
        },

        "Callback#get error": function(test) { 
            this.service.get("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#post": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },
        
        "Callback#post error": function(test) { 
            this.service.post("search/jobs", {search: "index_internal | head 1"}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 400);
                test.done();
            });
        },

        "Callback#delete": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.odata.results.sid;
                test.ok(sid);
                
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    test.done();
                });
            });
        },

        "Callback#delete error": function(test) { 
            this.service.del("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#request get": function(test) { 
            this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.strictEqual(res.odata.offset, 0);
                test.ok(res.odata.count <= res.odata.total_count);
                test.strictEqual(res.odata.count, 2);
                test.strictEqual(res.odata.count, res.odata.results.length);
                test.ok(res.odata.results[0].sid);
                
                test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                
                test.done();
            });
        },

        "Callback#request post": function(test) { 
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"  
            };
            var service = this.service;
            this.service.request("search/jobs", "POST", headers, body, function(err, res) {
                var sid = res.odata.results.sid;
                test.ok(sid);
                
                var endpoint = "search/jobs/" + sid + "/control";
                service.post(endpoint, {action: "cancel"}, function(err, res) {
                    test.done();
                });
            });
        },

        "Callback#request error": function(test) { 
            this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "", function(res) {
                test.ok(!!res);
                test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                test.strictEqual(res.status, 404);
                test.done();
            });
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var cmdline = options.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
});

require.define("/internal/cmdline.js", function (require, module, exports, __dirname, __filename) {
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
    var path = require('path');
    var fs = require('fs');
    var OptionParser    = require('../contrib/parseopt').OptionParser;
    
    var DEFAULTS_PATHS = [
        process.env.HOME || process.env.HOMEPATH,
        process.cwd()
    ];
    
    var readDefaultsFile = function(path, defaults) {
        var contents = fs.readFileSync(path, "utf8") || "";
        var lines = contents.split("\n") || [];
        
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line !== "") {
                var parts = line.split("=");
                var key = parts[0].trim();
                var value = parts[1].trim();
                defaults[key] = value;
            }
        }
    };
    
    var getDefaults = function() {
        var defaults = {};
        for(var i = 0; i < DEFAULTS_PATHS.length; i++) {
            var defaultsPath = path.join(DEFAULTS_PATHS[i], ".splunkrc");
            if (path.existsSync(defaultsPath)) {
                readDefaultsFile(defaultsPath, defaults);
            }
        }
        
        return defaults;
    };
    
    exports.OptionParser = OptionParser;
    exports.parse = function(argv, additionalOptions) {
        additionalOptions = additionalOptions || [];
        argv = (argv || []).slice(2);
        var defaults = getDefaults();
        for(var key in defaults) {
            if (defaults.hasOwnProperty(key)) {
                var value = defaults[key];
                argv.unshift("--" + key + "=" + value);
            }
        }
        
        var parser = new OptionParser({
            strings: { help: 'N/A', metavars: { integer: 'INT' } },
            options: [
                {
                    names: ['--help', '-h'],
                    type: 'flag',
                    help: 'Show this help message.',
                    onOption: function (value) {
                            if (value) {
                                    parser.usage();
                            }
                            // returning true canceles any further option parsing
                            // and parser.parse() returns null
                            return value;
                    }
                },
                {
                    names: ['--username'],
                    type: 'string',
                    required: true,
                    help: "Username to login with",
                    metavar: "USERNAME",
                },
                
                {
                    names: ['--password'],
                    type: 'string',
                    required: true,
                    help: "Password to login with",
                    metavar: "PASSWORD",
                },
                
                {
                    names: ['--host'],
                    type: 'string',
                    required: false,
                    help: "Host name",
                    default: "localhost",
                    metavar: "HOST",
                },
                
                {
                    names: ['--port'],
                    type: 'string',
                    required: false,
                    help: "Port number",
                    default: "8089",
                    metavar: "PORT",
                },
                
                {
                    names: ['--scheme'],
                    type: 'string',
                    required: false,
                    help: "Scheme",
                    default: "https",
                    metavar: "SCHEME",
                },
                
                {
                    names: ['--config'],
                    type: 'string',
                    help: "Load options from config file",
                    metavar: "CONFIG",
                },
                
                {
                    names: ['--namespace'],
                    type: 'string',
                    help: "",
                    metavar: "NAMESPACE",
                },
            ],

        });
        
        for(var i = 0; i < additionalOptions.length; i++) {
            var option = additionalOptions[i];
            parser.add(option.names[0], option);
        }
        
        // Try and parse the command line
        var cmdline = null;
        try {
            cmdline = parser.parse(argv);
        }
        catch(e) {
            // If we failed, then we print out the error message, and then the usage
            console.log(e.message);
            parser.usage();
        }
        
        return cmdline;
    };
})();
});

require.define("fs", function (require, module, exports, __dirname, __filename) {
    // nothing to see here... no file methods for the browser

});

require.define("/tests/test_client.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;
    var tutils      = require('./utils');

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        "Job Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Create+cancel job": function(test) {
                var sid = getNextId();
                this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    job.cancel(function() {
                        test.done();
                    });
                }); 
            },

            "Callback#Create job error": function(test) {
                var sid = getNextId();
                this.service.jobs().create('index=_internal | head 1', {id: sid}, function(err) { 
                    test.ok(!!err);
                    test.done(); 
                });
            },

            "Callback#List jobs": function(test) {
                this.service.jobs().list(function(err, jobs) {
                    test.ok(!err);
                    test.ok(jobs);
                    test.ok(jobs.length > 0);
                    
                    for(var i = 0; i < jobs.length; i++) {
                        test.ok(jobs[i].isValid());
                    }
                    
                    test.done();
                });
            },

            "Callback#Contains job": function(test) {
                var that = this;
                var sid = getNextId();
                this.service.jobs().create('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    that.service.jobs().contains(sid, function(err, contains) {
                        test.ok(contains);

                        job.cancel(function() {
                            test.done();
                        });
                    });
                }); 
            },

            "Callback#job results": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return j.isValid() && job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.results({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job events": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return j.isValid() && job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.events({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, results.rows[0].length);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job results preview": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return j.isValid() && job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.preview({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Enable + disable preview": function(test) {
                var that = this;
                var sid = getNextId();
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().create('search index=_internal | head 1 | sleep 60', {id: sid}, done);
                        },
                        function(job, done) {
                            job.enablePreview(done);
                            
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.disablePreview(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Pause + unpause + finalize preview": function(test) {
                var that = this;
                var sid = getNextId();
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().create('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.pause(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return j.isValid() && j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            test.ok(job.properties()["isPaused"]);
                            job.unpause(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return j.isValid() && !j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            test.ok(!job.properties()["isPaused"]);
                            job.finalize(done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Set TTL": function(test) {
                var sid = getNextId();
                var originalTTL = 0;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            var ttl = job.properties()["ttl"];
                            originalTTL = ttl;
                            
                            job.setTTL(ttl*2, done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            var ttl = job.properties()["ttl"];
                            test.ok(ttl > originalTTL);
                            test.ok(ttl <= (originalTTL*2));
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Set priority": function(test) {
                var sid = getNextId();
                var originalPriority = 0;
                var that = this;
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().create('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            var priority = job.properties()["priority"];
                            test.ok(priority, 5);
                            job.setPriority(priority + 1, done);
                        },
                        function(job, done) {
                            test.ok(!job.isValid());
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search log": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.searchlog(done);
                        },
                        function(log, job, done) {
                            test.ok(job);
                            test.ok(log);
                            test.ok(log.length > 0);
                            test.ok(log.split("\r\n").length > 0);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search summary": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create(
                                'search index=_internal | head 1 | eval foo="bar" | fields foo', 
                                {
                                    id: sid,
                                    status_buckets: 300,
                                    rf: ["foo"]
                                }, 
                                done);
                        },
                        function(job, done) {
                            job.summary({}, done);
                        },
                        function(summary, job, done) {
                            test.ok(job);
                            test.ok(summary);
                            test.strictEqual(summary.event_count, 1);
                            test.strictEqual(summary.fields.foo.count, 1);
                            test.strictEqual(summary.fields.foo.distinct_count, 1);
                            test.ok(summary.fields.foo.is_exact, 1);
                            test.strictEqual(summary.fields.foo.name, "foo");
                            test.strictEqual(summary.fields.foo.modes.length, 1);
                            test.strictEqual(summary.fields.foo.modes[0].count, 1);
                            test.strictEqual(summary.fields.foo.modes[0].value, "bar");
                            test.ok(summary.fields.foo.modes[0].is_exact);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search timeline": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create(
                                'search index=_internal | head 1 | eval foo="bar" | fields foo', 
                                {
                                    id: sid,
                                    status_buckets: 300,
                                    rf: ["foo"],
                                    exec_mode: "blocking"
                                }, 
                                done);
                        },
                        function(job, done) {
                            job.timeline({}, done);
                        },
                        function(timeline, job, done) {
                            test.ok(job);
                            test.ok(timeline);
                            test.strictEqual(timeline.buckets.length, 1);
                            test.strictEqual(timeline.event_count, 1);
                            test.strictEqual(timeline.buckets[0].available_count, 1);
                            test.strictEqual(timeline.buckets[0].duration, 0.001);
                            test.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
                            test.strictEqual(timeline.buckets[0].total_count, 1);
                            test.ok(timeline.buckets[0].is_finalized);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Touch": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.jobs().create('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job);
                            test.ok(job.isValid());
                            originalTime = job.properties().updated;
                            Async.sleep(1200, function() { job.touch(done); });
                        },
                        function(job, done) {
                            job.read(done);
                        },
                        function(job, done) {
                            test.ok(job.isValid());
                            test.ok(originalTime !== job.properties().updated);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            }            
        },
        
        "App Tests": {      
            setUp: function(done) {
                this.service = svc;
                done();
            },
                         
            "Callback#list applications": function(test) {
                var apps = this.service.apps();
                apps.list(function(err, appList) {
                    test.ok(appList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains applications": function(test) {
                var apps = this.service.apps();
                apps.contains("search", function(err, found) {
                    test.ok(found);
                    test.done();
                });
            },
            
            "Callback#create + contains app": function(test) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                apps.create({name: name}, function(err, app) {
                    test.ok(app.isValid());
                    var appName = app.properties().__name;
                    apps.contains(appName, function(err, found, entity) {
                        test.ok(found);
                        test.ok(entity);
                        app.remove(function() {
                            test.done();
                        });
                    });
                });
            },
            
            "Callback#create + modify app": function(test) {
                var DESCRIPTION = "TEST DESCRIPTION";
                var VERSION = "1.1";
                
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                Async.chain([
                    function(callback) {
                        apps.create({name: name}, callback);     
                    },
                    function(app, callback) {
                        test.ok(app.isValid());
                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function(app, callback) {
                        test.ok(!!app);
                        test.ok(!app.isValid());
                        app.read(callback);
                    },
                    function(app, callback) {
                        test.ok(app);
                        test.ok(app.isValid());
                        var properties = app.properties();
                        
                        test.strictEqual(properties.description, DESCRIPTION);
                        test.strictEqual(properties.version, VERSION);
                        
                        app.remove(callback);
                    },
                    function(callback) {
                        test.done();
                        callback();
                    }
                ]);
            },
            
            "Callback#delete test applications": function(test) {
                var apps = this.service.apps();
                apps.list(function(err, appList) {
                    test.ok(appList.length > 0);
                    
                    Async.parallelEach(
                        appList,
                        function(app, idx, callback) {
                            if (utils.startsWith(app.properties().__name, "jssdk_")) {
                                app.remove(callback);
                            }
                            else {
                                callback();
                            }
                        }, function(err) {
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },
        
        "Saved Search Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var searches = this.service.savedSearches();
                searches.list(function(err, savedSearches) {
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i].isValid());
                    }
                    
                    test.done();
                });
            },
            
            "Callback#contains": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    test.done();
                });
            },
            
            "Callback#history": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("Indexing workload", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.history(function(err, history, search) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("Indexing workload", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.suppressInfo(function(err, info, search) {
                        test.ok(!err);
                        test.done();
                    });
                });
            }
        },
        
        "Properties Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().list(done); },
                    function(files, done) { 
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains stanza": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "web");
                        file.contains("settings", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(!stanza.isValid());
                        stanza.read(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        test.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#create file + create stanza + update stanza": function(test) {
                var that = this;
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                Async.chain([
                    function(done) {
                        var properties = that.service.properties(); 
                        test.ok(!properties.isValid());
                        properties.read(done);
                    },
                    function(properties, done) {
                        test.ok(properties.isValid());
                        properties.create(fileName, done);
                    },
                    function(file, done) {
                        test.ok(!file.isValid());
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        test.ok(!stanza.isValid());
                        stanza.update({"jssdk_foobar": value});
                        test.ok(!stanza.isValid());
                        tutils.pollUntil(
                            stanza, function(s) {
                                return s.isValid() && s.properties()["jssdk_foobar"] === value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new Splunk.Client.PropertyFile(svc, fileName);
                        test.ok(!file.isValid());
                        file.contains("stanza", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(!stanza.isValid());
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        },
        
        "Configuration Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.configurations().list(done); },
                    function(files, done) { 
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.configurations().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "conf-web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains stanza": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.configurations().contains("web", done); },
                    function(found, file, done) { 
                        test.ok(found);
                        test.ok(!file.isValid());
                        file.read(done);
                    },
                    function(file, done) {
                        test.ok(file.isValid());
                        test.strictEqual(file.properties().__name, "conf-web");
                        file.contains("settings", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(stanza.isValid());
                        test.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#create file + create stanza + update stanza": function(test) {
                var that = this;
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                // We clone the service to get to a specific namespace
                var svc = this.service.specialize("nobody", "system");
                
                Async.chain([
                    function(done) {
                        var configs = svc.configurations(); 
                        test.ok(!configs.isValid());
                        configs.read(done);
                    },
                    function(configs, done) {
                        test.ok(configs.isValid());
                        configs.create(fileName, done);
                    },
                    function(file, done) {
                        test.ok(!file.isValid());
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        stanza.update({"jssdk_foobar": value});
                        test.ok(!stanza.isValid());
                        tutils.pollUntil(
                            stanza, function(s) {
                                return s.isValid() || s.properties()["jssdk_foobar"] === value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.ok(stanza.isValid());
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new Splunk.Client.ConfigurationFile(svc, fileName);
                        test.ok(!file.isValid());
                        file.contains("stanza", done);
                    },
                    function(found, stanza, done) {
                        test.ok(found);
                        test.ok(stanza);
                        test.ok(stanza.isValid());
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        },
        
        "Index Tests": {      
            setUp: function(done) {
                this.service = svc;
                
                // Create the index for everyone to use
                var name = this.indexName = "sdk-tests";
                var indexes = this.service.indexes();
                indexes.create(name, {}, function(err, index) {
                    if (err && err.status !== 409) {
                        throw new Error("Index creation failed for an unknown reason");
                    }
                    
                    done();
                });
            },
                         
            "Callback#list indexes": function(test) {
                var indexes = this.service.indexes();
                indexes.list(function(err, indexList) {
                    test.ok(indexList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains index": function(test) {
                var indexes = this.service.indexes();
                indexes.contains(this.indexName, function(err, found) {
                    test.ok(found);
                    test.done();
                });
            },
            
            "Callback#modify index": function(test) {
                
                var name = this.indexName;
                var indexes = this.service.indexes();
                
                Async.chain([
                        function(callback) {
                            indexes.contains(name, callback);     
                        },
                        function(found, index, callback) {
                            test.ok(found);
                            test.ok(index.isValid());
                            index.update({
                                assureUTF8: !index.properties().assureUTF8
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(!!index);
                            test.ok(!index.isValid());
                            index.read(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(index.isValid());
                            var properties = index.properties();
                            
                            test.ok(!properties.assureUTF8);
                            
                            index.update({
                                assureUTF8: !properties.assureUTF8
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(!!index);
                            test.ok(!index.isValid());
                            index.read(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(index.isValid());
                            var properties = index.properties();
                            
                            test.ok(properties.assureUTF8);
                            callback();
                        },
                        function(callback) {
                            callback();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
                   
            "Callback#Index submit event": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";
                
                var originalEventCount = null;
                var indexName = this.indexName;
                var indexes = this.service.indexes();
                Async.chain([
                        function(done) {
                            indexes.item(indexName, done);
                        },
                        function(index, done) {
                            test.ok(index);
                            test.ok(index.isValid());
                            test.strictEqual(index.properties().__name, indexName);
                            originalEventCount = index.properties().totalEventCount;
                            
                            index.submitEvent(message, {sourcetype: sourcetype}, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(!index.isValid());
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.sourcetype, sourcetype);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo._index, indexName);
                            
                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        },
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done(); 
                    }
                );
            }
        }
    };

};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var cmdline = options.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
});

require.define("/tests/utils.js", function (require, module, exports, __dirname, __filename) {
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
    var Async = require('../lib/async');
    
    var root = exports || this;

    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };

    root.pollUntil = function(obj, condition, iterations, callback) {
        callback = callback || function() {};
        
        var i = 0;
        var keepGoing = true;
        Async.whilst(
            function() { return !condition(obj) && (i++ < iterations); },
            function(done) {
                Async.sleep(500, function() {
                    obj.refresh(done); 
                });
            },
            function(err) {
                callback(err, obj);
            }
        );
    };
})();
});

require.define("/tests/test_searcher.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;
    var Searcher    = Splunk.Searcher;
    
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        setUp: function(done) {
            this.service = svc; 
            done();
        },

        "Callback#Searcher + Results": function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.resultsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },

        "Callback#Searcher + Events": function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.eventsIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },

        "Callback#Searcher + Preview": function(test) {
            var sid = getNextId();
            var that = this;
            Async.chain([
                function(callback) {
                    that.service.jobs().create('search index=_internal | head 10', {id: sid}, callback);
                },
                function(job, callback) {
                    var searcher = new Searcher.JobManager(test.service, job);
                    searcher.done(callback);
                },
                function(searcher, callback) {
                    var iterator = searcher.previewIterator(2);
                    
                    var totalResultCount = 0;
                    var iterationCount = 0;
                    var hasMore = true;
                    Async.whilst(
                        function() { return hasMore; },
                        function(done) {
                            iterator.next(function(err, more, results) {
                                hasMore = more;
                                
                                if (more) {
                                    iterationCount++;
                                    totalResultCount += results.rows.length;
                                }
                                
                                done();
                            });
                        },
                        function(err) {
                            test.ok(!err);
                            test.ok(iterationCount > 0);
                            test.strictEqual(totalResultCount, 10);
                            
                            callback(null, searcher);
                        }
                    );
                },
                function(searcher, callback) {
                    searcher.cancel(callback);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();  
            });
        },
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var cmdline = options.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: cmdline.options.scheme,
        host: cmdline.options.host,
        port: cmdline.options.port,
        username: cmdline.options.username,
        password: cmdline.options.password,
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
});

require.define("/tests/test_examples.js", function (require, module, exports, __dirname, __filename) {
    
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

exports.setup = function() {
    var Async       = require('../splunk').Splunk.Async;
    var JobsMain    = require("../examples/jobs").main;

    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
        
    var process = process || {
        argv: ["program", "script"] // initialize it with some dummy values
    };
      
    return {  
        "Jobs Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = JobsMain;      
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = process.argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        combinedArgs.push("--");
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key + "=" + options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "help": function(test) {
                this.run(null, null, null, function(err) {
                    test.ok(err);
                    test.done();
                });
            },
            
            "List jobs": function(test) {
                this.run("list", null, null, function(err) {
                    console.log(err);
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create job": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("cancel", [create.id], null, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Cancel job": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("cancel", [create.id], null, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "List job properties": function(test) {          
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("list", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job events": function(test) {      
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("events", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "Create+list multiple jobs": function(test) {
                var creates = [];
                for(var i = 0; i < 3; i++) {
                    creates[i] = {
                        search: "search index=_internal | head 1",
                        id: getNextId()
                    };
                }
                var sids = creates.map(function(create) { return create.id; });
                
                var context = this;
                Async.parallelMap(
                    creates,
                    function(create, idx, done) {
                        context.run("create", [], create, function(err, job) {
                            test.ok(!err);
                            test.ok(job);
                            test.strictEqual(job.sid, create.id);
                            done(null, job);
                        });
                    },
                    function(err, created) {
                        for(var i = 0; i < created.length; i++) {
                            test.strictEqual(creates[i].id, created[i].sid);
                        }
                        
                        context.run("list", sids, null, function(err) {
                            test.ok(!err);
                            context.run("cancel", sids, null, function(err) {
                                test.ok(!err);
                                test.done();
                            });
                        });
                        
                    }
                );
            }
        }
    };
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}
});

require.define("/examples/jobs.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Splunk          = require('../splunk').Splunk;
    var Class           = require('../lib/jquery.class').Class;
    var utils           = require('../lib/utils');
    var Async           = require('../lib/async');
    var options         = require('../internal/cmdline');
    var OptionParser    = options.OptionParser;
    var NodeHttp        = require('../platform/node/node_http').NodeHttp;

    var FLAGS_CREATE = [
        "search", "earliest_time", "latest_time", "now", "time_format",
        "exec_mode", "search_mode", "rt_blocking", "rt_queue_size",
        "rt_maxblocksecs", "rt_indexfilter", "id", "status_buckets",
        "max_count", "max_time", "timeout", "auto_finalize_ec", "enable_lookups",
        "reload_macros", "reduce_freq", "spawn_process", "required_field_list",
        "rf", "auto_cancel", "auto_pause",
    ];
    var FLAGS_EVENTS = [
        "offset", "count", "earliest_time", "latest_time", "search",
        "time_format", "output_time_format", "field_list", "f", "max_lines",
        "truncation_mode", "json_mode", "segmentation"
    ];
    var FLAGS_RESULTS = [
        "offset", "count", "search", "field_list", "f", "json_mode"
    ];

    // This function will create a set of options for command line parsing
    // and then parse the arguments to the command we're running.
    var _makeCommandLine = function(program, argv, flags, search_required) {
        var opts = {};
        flags = flags || [];

        // Create the parser and add some help information
        var parser = new OptionParser({
            program: program, 
            options: [
                {
                    names: ['--help', '-h'],
                    type: 'flag',
                    help: 'Show this help message.',
                    onOption: function (value) {
                            if (value) {
                                    parser.usage();
                            }
                            // returning true canceles any further option parsing
                            // and parser.parse() returns null
                            return value;
                    }
                },
            ],
        });

        // For each of the flags, add an option to the parser
        for(var i = 0; i < flags.length; i++) {
            parser.add("--" + flags[i], { 
                required: search_required && flags[i] === "search",  // Make search required if necessary
                metavar: flags[i].toUpperCase(), // Give it a proper label
            });
        }

        // Try and parse, and if we fail, print out the error message
        // and the usage information
        var cmdline = null;
        try {
            cmdline = parser.parse(argv);
            delete cmdline.options.help;
        }
        catch(e) {
            console.log(e.message);
            parser.usage();
        }

        return cmdline;
    };
    
    var printRows = function(data) {
        var fields = data.fields;
        var rows = data.rows;
        for(var i = 0; i < rows.length; i++) {
            var values = rows[i];
            console.log("Row " + i + ": ");
            for(var j = 0; j < values.length; j++) {
                var field = fields[j];
                var value = values[j];
                console.log("  " + field + ": " + value);
            }
        }
    };
    
    var printCols = function(data) {
        var fields = data.fields;
        var columns = data.columns;
        for(var i = 0; i < columns.length; i++) {
            var values = columns[i];
            var field = fields[i];
            console.log("Column " + field + " (" + i + "): ");
            for(var j = 0; j < values.length; j++) {
                var value = values[j];
                console.log("  " + value);
            }
        }
    };

    var _check_sids = function(command, sids) {
        if (!sids || sids.length === 0) {
            throw new Error("'" + command + "' requires at least one SID");
        }
    };

    var Program = Class.extend({
        init: function(service) {
            this.service = service; 
            
            this.run        = utils.bind(this, this.run);
            this.cancel     = utils.bind(this, this.cancel);
            this.create     = utils.bind(this, this.create);
            this.events     = utils.bind(this, this.events);
            this.list       = utils.bind(this, this.list);   
            this.preview    = utils.bind(this, this.preview);  
            this.results    = utils.bind(this, this.results);   
        },

        _foreach: function(sids, fn, callback) {
            sids = sids || [];

            // We get a list of the current jobs, and for each of them,
            // we check whether it is the job we're looking for.
            // If it is, we wrap it up in a Splunk.Job object, and invoke
            // our function on it.
            var jobs = [];
            this.service.jobs().list(function(err, list) {
                list = list || [];
                for(var i = 0; i < list.length; i++) {
                    if (utils.contains(sids, list[i].sid)) {
                        var job = list[i];
                        jobs.push(job);
                    }
                }
                
                Async.parallelMap(jobs, fn, callback);
            });
        },

        run: function(command, args, callback) {
            var commands = {
                'cancel':       this.cancel,
                'create':       this.create,
                'events':       this.events,
                'finalize':     this.finalize,
                'list':         this.list,
                'pause':        this.pause,
                'preview':      this.preview,
                'results':      this.results,
                'searchlog':    this.searchlog,
                'summary':      this.summary,
                'perf':         this.perf,
                'timeline':     this.timeline,
                'touch':        this.touch,
                'unpause':      this.unpause,
            };

            // If we don't have any command, notify the user.
            if (!command) {
                console.error("You must supply a command to run. Options are:");
                for(var key in commands) {
                    if (commands.hasOwnProperty(key)) {
                        console.error("  " + key);
                    }
                }
                
                callback("No command was specified.");
                return;
            }

            // Get the handler
            var handler = commands[command];

            // If there is no handler (because the user specified an invalid command,
            // then we notify the user as an error.
            if (!handler) {
                callback("Unrecognized command: " + command);
                return;
            }

            // Invoke the command
            handler(args, callback);
        },

        // Cancel the specified search jobs
        cancel: function(sids, callback) {
            _check_sids('cancel', sids);

            // For each of the supplied sids, cancel the job.
            this._foreach(sids, function(job, idx, done) {
                job.cancel(function (err) { 
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    console.log("  Job " + job.sid + " cancelled"); 
                    done(); 
                });
            }, callback);
        },

        // Retrieve events for the specified search jobs
        events: function(argv, callback) {
            // Create the command line for the event command and parse it
            var cmdline = _makeCommandLine("events", argv, FLAGS_EVENTS, false);

            // For each of the passed in sids, get the relevant events
            this._foreach(cmdline.arguments, function(job, idx, done) {
                console.log("===== EVENTS @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
        },

        // Create a search job
        create: function(argv, callback) {
            // Create the command line for the create command and parse it
            var cmdline = _makeCommandLine("create", argv, FLAGS_CREATE, true);

            // If nothing was passed in, terminate
            if (!cmdline) {
                return;
            }

            // Get the query and parameters, and remove the extraneous
            // search parameter
            var query = cmdline.options.search;
            var params = cmdline.options;
            delete params.search;

            // Create the job
            this.service.jobs().create(query, params, function(err, job) {
                if (err) {
                    callback(err);
                    return;
                }
                
                console.log("Created job " + job.sid);
                callback(null, job);
            });
        },

        // List all current search jobs if no jobs specified, otherwise
        // list the properties of the specified jobs.
        list: function(sids, callback) {
            sids = sids || [];

            if (sids.length === 0) {
                // If no job SIDs are provided, we list all jobs.
                var jobs = this.service.jobs();
                jobs.list(function(err, list) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    
                    list = list || [];
                    for(var i = 0; i < list.length; i++) {
                        console.log("  Job " + (i + 1) + " sid: "+ list[i].sid);
                    }

                    callback(null, list);
                });
            }
            else {
                // If certain job SIDs are provided,
                // then we simply read the properties of those jobs
                this._foreach(sids, function(job, idx, done) {
                    job.refresh(function(err, job) {
                        if (err) {
                            done(err);
                            return;
                        }
                        
                        console.log("Job " + job.sid + ": ");
                        var properties = job.properties();
                        for(var key in properties) {
                            // Skip some keys that make the output hard to read
                            if (utils.contains(["performance"], key)) {
                                continue;
                            }

                            console.log("  " + key + ": ", properties[key]);
                        }
                        
                        done(null, properties);
                    });
                }, callback);
            }
        },

        // Retrieve events for the specified search jobs
        preview: function(argv, callback) {
            // Create the command line for the results_preview command and parse it
            var cmdline = _makeCommandLine("results", argv, FLAGS_RESULTS, false);

            // For each of the passed in sids, get the relevant results
            this._foreach(cmdline.arguments, function(job, idx, done) {
                console.log("===== PREVIEW @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
        },

        // Retrieve events for the specified search jobs
        results: function(argv, callback) {
            // Create the command line for the results command and parse it
            var cmdline = _makeCommandLine("results", argv, FLAGS_RESULTS, false);

            // For each of the passed in sids, get the relevant results
            this._foreach(cmdline.arguments, function(job, idx, done) {
                console.log("===== RESULTS @ " + job.sid + " ====="); 

                job.events(cmdline.options, function(err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = cmdline.options.json_mode || "rows";
                    if (json_mode === "rows") {
                        printRows(data);
                    }
                    else if (json_mode === "column") {
                        console.log(data);
                        printCols(data);
                    }
                    else {
                        console.log(data);
                    }

                    done(null, data);
                });
            }, callback);
        }
    });


    exports.main = function(argv, callback) {        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        // Try and parse the command line
        var cmdline = options.parse(argv);
        
        // If there is no command line, we should return
        if (!cmdline) {
            callback("Error in parsing command line parameters");
            return;
        }
        
        // Create our HTTP request class for node.js
        var http = new NodeHttp();
        
        // Create our service context using the information from the command line
        var svc = new Splunk.Client.Service(http, { 
            scheme: cmdline.options.scheme,
            host: cmdline.options.host,
            port: cmdline.options.port,
            username: cmdline.options.username,
            password: cmdline.options.password,
        });
        
        svc.login(function(err, success) {
            if (err) {
                console.log("Error: " + err);
                callback(err);
                return;
            }
            
            var program = new Program(svc);
            
            program.run(cmdline.arguments[0], cmdline.arguments.slice(1), function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback.apply(null, arguments);
            });
        });
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();
});

require.define("/browser.test.entry.js", function (require, module, exports, __dirname, __filename) {
    
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

window.SplunkTest = require('./splunk.test').SplunkTest;
});
require("/browser.test.entry.js");

})()