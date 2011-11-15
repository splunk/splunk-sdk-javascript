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

require.modules["/package.json"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "/package.json";
    
    var require = function (file) {
        return __require(file, "/");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/");
    };
    
    require.modules = __require.modules;
    __require.modules["/package.json"]._cached = module.exports;
    
    (function () {
        module.exports = {"name":"splunk-sdk","version":"0.1.0","description":"SDK for usage with the Splunk REST API","homepage":"http://dev.splunk.com","main":"splunk.js","directories":{"example":"examples","lib":"lib","test":"tests"},"repository":{"type":"git","url":"http://github.com/splunk/splunk-sdk-javascript.git"},"keywords":["splunk","data","search","logs","javascript"],"dependencies":{"request":"2.1.x"},"devDependencies":{"browserify":"1.6.x","uglify-js":"1.0.x"},"author":{"name":"Splunk","email":"devinfo@splunk.com","url":"http://dev.splunk.com"},"license":"Apache","engine":{"node":">=0.4.9"},"private":true};
    }).call(module.exports);
    
    __require.modules["/package.json"]._cached = module.exports;
    return module.exports;
};

require.modules["/splunk.test.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "/splunk.test.js";
    
    var require = function (file) {
        return __require(file, "/");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/");
    };
    
    require.modules = __require.modules;
    __require.modules["/splunk.test.js"]._cached = module.exports;
    
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

    root.SplunkTest = require('./tests/test.browser.js');
})();;
    }).call(module.exports);
    
    __require.modules["/splunk.test.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test.browser.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test.browser.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test.browser.js"]._cached = module.exports;
    
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
    
    root.Utils    = require('./test_utils');
    root.Async    = require('./test_async');
    root.Http     = require('./test_http');
    root.Binding  = require('./test_binding');
    root.Client   = require('./test_client');
    root.Searcher = require('./test_searcher');
    root.Examples = require('./test_examples');
})();;
    }).call(module.exports);
    
    __require.modules["/tests/test.browser.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_utils.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_utils.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_utils.js"]._cached = module.exports;
    
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
};
    }).call(module.exports);
    
    __require.modules["/tests/test_utils.js"]._cached = module.exports;
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
    var utils   = require('./utils');

    var root = exports || this;

    // Our basic class that stores the context of a specific session, such
    // as login information, host name, port, etc.
    root.Context = Class.extend({
        init: function(http, params) {
            this.http = http;
            this.scheme = params.scheme || "https";
            this.host = params.host || "localhost";
            this.port = params.port || 8089;
            this.username = params.username || null;  
            this.password = params.password || null;  
            this.owner = params.owner || "-";  
            this.namespace = params.namespace || "-";  
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

        // Return any session-specific headers (such as authorization).
        _headers: function (headers) {
            headers = headers || {};
            headers["Authorization"] = "Splunk " + this.sessionKey;
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

            return "/servicesNS/" + owner + "/" + namespace + "/" + path; 
        },

        // Given any path, this function will turn it into a fully
        // qualified URL, using the current context.
        urlify: function(path) {
            return this.prefix + this.fullpath(path);
        },

        // Authorize to the server and store the given session key.
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

        get: function(path, params, callback) {
            this.http.get(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        del: function(path, params, callback) {
            this.http.del(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        post: function(path, params, callback) {
            this.http.post(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

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
        apps: "apps/local",
        capabilities: "authorization/capabilities",
        configuration: null,
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
        roles: "authentication/roles",
        savedSearches: "saved/searches",
        settings: "server/settings",
        users: "authentication/users"
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
        },
        
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
        }
    });
    
    root.Resource = root.Endpoint.extend({
        init: function(service, path) {
            this._super(service, path);
            this._maybeValid = false;
            this._actions = null;
            
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._invalidate = utils.bind(this, this._invalidate);
            this._load       = utils.bind(this, this._load);
            this._validate   = utils.bind(this, this._validate);
            this._invoke     = utils.bind(this, this._invoke);
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
            this._actions = {};
            var links = properties.__metadata.links || [];
            for(var i = 0; i < links.length; i++) {
                var action = links[i].rel;
                var path = links[i].href;
                this._actions[action] = path;
            }
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
        
        _invoke: function(action, method, args, callback) {
            callback = callback || function() {};
            
            var that = this;
            this._validate(function(err) {
                if (err) {
                    callback(err);
                }
                                    
                var path = that._actions[action];
                if (!path) {
                    callback("Invalid action: " + action);
                }
                
                var handler = {
                  "get": that.service.get,
                  "post": that.service.post,
                  "delete": that.service.del
                }[method.toLowerCase()];
                
                handler.call(that.service, path, args, callback);
            });
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
        
        del: function(callback) {
            this._invoke("remove", "DELETE", {}, callback);
        },
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
            this._invoke("acknowledge", "POST", {}, callback);
            this._invalidate();
        },
        
        dispatch: function(callback) {
            this._invoke("dispatch", "POST", {}, callback);
            this._invalidate();
        },
        
        history: function(callback) {
            this._invoke("history", "GET", {}, callback);
            this._invalidate();
        },
        
        suppressInfo: function(callback) {
            this.get("suppress", {}, callback);
            this._invalidate();
        },
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
            this._invoke("control", "POST", {action: "cancel"}, callback);
            this._invalidate();
        },

        disablePreview: function(callback) {
            this._invoke("control", "POST", {action: "disablepreview"}, callback);
            this._invalidate();
        },

        enablePreview: function(callback) {
            this._invoke("control", "POST", {action: "enablepreview"}, callback);
            this._invalidate();
        },

        events: function(params, callback) {
            callback = callback || function() {};
            this._invoke("events", "GET", params, function(err, response) { 
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results); 
                }
            });
        },

        finalize: function(callback) {
            this._invoke("control", "POST", {action: "finalize"}, callback);
            this._invalidate();
        },

        pause: function(callback) {
            this._invoke("control", "POST", {action: "pause"}, callback);
            this._invalidate(); 
        },

        preview: function(params, callback) {
            callback = callback || function() {};
            this._invoke("results_preview", "GET", params, function(err, response) {
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
            this._invoke("results", "GET", params, function(err, response) {
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
            this._invoke("log", "GET", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        setPriority: function(value, callback) {
            this._invoke("control", "POST", {action: "setpriority", priority: value}, callback);
            this._invalidate();
        },

        setTTL: function(value, callback) {
            this._invoke("control", "POST", {action: "setttl", ttl: value}, callback);
            this._invalidate();
        },

        summary: function(params, callback) {
            this._invoke("summary", "GET", params, function(err, response) {
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
            this._invoke("timeline", "GET", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
                }
            });
        },

        touch: function(callback) {
            this._invoke("control", "POST", {action: "touch"}, callback);
            this._invalidate();
        },

        unpause: function(callback) {
            this._invoke("control", "POST", {action: "unpause"}, callback);
            this._invalidate();
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
            message.headers["Accept"] = "*/*";

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
                try {
                    json = this.parseJson(data);
                } catch(e) {
                    console.log("JSON PARSE ERROR");
                    console.log(e);
                    console.log(data);
                    console.log(res);
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
                    } catch(e) {
                        console.log("JSON PARSE ERROR");
                        console.log(e);
                        console.log(data);
                        console.log(res);
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

        output["__metadata"] = d["__metadata"];
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
    var utils = require('./utils');
    var root = exports || this;

    // A definition for an asynchronous while loop. The function takes three parameters:
    // * A condition function, which takes a callback, whose only parameter is whether the condition was met or not.
    // * A body function, which takes a no-parameter callback. The callback should be invoked when the body of the loop has finished.
    // * A done function, which takes no parameter, and will be invoked when the loop has finished.
    root.whilst = function(obj, callback) {        
        callback = callback || function() {};
        var iterationDone = function(err) {
            if (err) {
                callback(err);
            }
            else {
                root.whilst(obj, callback);
            }
        };
        
        if (obj.condition()) {
            obj.body(iterationDone);
        }
        else {
            callback(null);
        }
    };
    
    root.parallel = function(tasks, callback) {
        callback = callback || function() {};
        
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
    
    root.parallelMap = function(fn, vals, callback) {     
        callback = callback || function() {};
        
        var tasks = [];
        var createTask = function(val) {
            return function(done) { fn(val, done); };
        };
        
        for(var i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i]));
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
    
    root.seriesMap = function(fn, vals, callback) {     
        callback = callback || function() {};
        
        var tasks = [];
        var createTask = function(val) {
            return function(done) { fn(val, done); };
        };
        
        for(var i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i]));
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
                {
                    condition: function() { return !stopLooping; },
                    body: function(done) {
                        job.read(function(err, props) {
                            properties = props;
                            
                            // Dispatch for progress
                            manager._dispatchCallbacks(manager.onProgressCallbacks, properties);
                            
                            // Dispatch for failure if necessary
                            if (properties.isFailed) {
                                manager._dispatchCallbacks(manager.onFailCallbacks, properties);
                            }
                            
                            stopLooping = properties.isDone || manager.isJobDone || properties.isFailed;
                            Async.sleep(1000, done);
                        });
                    }
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
})();;
    }).call(module.exports);
    
    __require.modules["/lib/searcher.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_async.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_async.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_async.js"]._cached = module.exports;
    
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

exports.setup = function() {
    var Splunk      = require('../splunk').Splunk;
    var Async       = Splunk.Async;

    var isBrowser = typeof "window" !== "undefined";

    return {        
        "While success": function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < 3; },
                body: function(done) {
                    Async.sleep(0, function() { done(); });
                }
            },
            function(err) {
                test.ok(!err);
                test.done();
            });
        },
        
        "While success deep": function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < (isBrowser ? 100 : 10000); },
                body: function(done) {
                    Async.sleep(0, function() { done(); });
                }
            },
            function(err) {
                test.ok(!err);
                test.done();
            });
        },
        
        "While error": function(test) {
            var i = 0;
            Async.whilst({
                condition: function() { return i++ < (isBrowser ? 100 : 10000); },
                body: function(done) {
                    Async.sleep(0, function() { done(i === (isBrowser ? 50 : 10000) ? 1 : null); });
                }
            },
            function(err) {
                test.ok(err);
                test.strictEqual(err, 1);
                test.done();
            });
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
        
        "Parallel map success": function(test) {
            Async.parallelMap(
                function(val, done) { 
                    done(null, val + 1);
                },
                [1, 2, 3],
                function(err, vals) {
                    test.ok(!err);
                    test.strictEqual(vals[0], 2);
                    test.strictEqual(vals[1], 3);
                    test.strictEqual(vals[2], 4);
                    test.done();
                }
            );
        },
        
        "Parallel map error": function(test) {
            Async.parallelMap(
                function(val, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                [1, 2, 3],
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
                function(val, done) { 
                    test.strictEqual(keeper++, val);
                    done(null, val + 1);
                },
                [1, 2, 3],
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
                function(val, done) { 
                    if (val === 2) {
                        done(5);
                    }
                    else {
                        done(null, val + 1);
                    }
                },
                [1, 2, 3],
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
        }
    }
};

if (module === require.main) {
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var suite = exports.setup();
    test.run([{"Tests": suite}]);
};
    }).call(module.exports);
    
    __require.modules["/tests/test_async.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_http.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_http.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_http.js"]._cached = module.exports;
    
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

exports.setup = function(http) {
    var Splunk      = require('../splunk').Splunk;

    return {
        "HTTP GET Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.done();
                }); 
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.get("http://httpbin.org/status/404", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 404);
                    test.done();
                });
            },
            
            "Callback#error success+error": function(test) {
                this.http.get("http://httpbin.org/status/404", [], {}, 0, function(res) {
                    test.ok(res);
                    test.strictEqual(res.status, 404);
                    test.done();  
                });
            },
            
            "Callback#args": function(test) {
                this.http.get("http://httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.get("http://httpbin.org/get", headers, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.json.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.get("http://httpbin.org/get", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
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
                    test.strictEqual(res.json.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
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
                this.http.post("http://httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.post("http://httpbin.org/status/405", {}, {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#error success+error": function(test) {
                this.http.post("http://httpbin.org/status/405", {}, {}, 0, function(res) {
                    test.ok(!!res);
                    test.strictEqual(res.status, 405);
                    test.done();   
                });
            },
            
            "Callback#args": function(test) {
                this.http.post("http://httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.json.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.post("http://httpbin.org/post", headers, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.post("http://httpbin.org/post", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
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
                    test.strictEqual(res.json.url, "http://httpbin.org/post");
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
                this.http.del("http://httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                var deleteP = this.http.del("http://httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.del("http://httpbin.org/status/405", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#error success+error": function(test) {
                this.http.del("http://httpbin.org/status/405", [], {}, 0, function(res) {
                    test.ok(!!res);
                    test.strictEqual(res.status, 405);
                    test.done();   
                });
            },
            
            "Callback#args": function(test) {
                this.http.del("http://httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    test.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.del("http://httpbin.org/delete", headers, {}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = {
                    "X-Test1": 1,
                    "X-Test2": "a/b/c"
                };

                this.http.del("http://httpbin.org/delete", headers, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.json.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.json.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        }
    }
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp(false);
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
};
    }).call(module.exports);
    
    __require.modules["/tests/test_http.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/platform/node/node_http.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/platform/node";
    var __filename = "/platform/node/node_http.js";
    
    var require = function (file) {
        return __require(file, "/platform/node");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/platform/node");
    };
    
    require.modules = __require.modules;
    __require.modules["/platform/node/node_http.js"]._cached = module.exports;
    
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
                body: message.body || ""
            };
            
            request_options.headers["Content-Length"] = request_options.body.length;

            request(request_options, utils.bind(this, function (error, res, data) {
                var complete_response = this._buildResponse(error, res, data);
                callback(complete_response);
            }));
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();;
    }).call(module.exports);
    
    __require.modules["/platform/node/node_http.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/request/package.json"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/request";
    var __filename = "/node_modules/request/package.json";
    
    var require = function (file) {
        return __require(file, "/node_modules/request");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/request");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/request/package.json"]._cached = module.exports;
    
    (function () {
        module.exports = {"name":"request","description":"Simplified HTTP request client.","tags":["http","simple","util","utility"],"version":"2.1.1","author":"Mikeal Rogers <mikeal.rogers@gmail.com>","repository":{"type":"git","url":"http://github.com/mikeal/request.git"},"bugs":{"web":"http://github.com/mikeal/request/issues"},"engines":["node >= 0.3.6"],"main":"./main"};
    }).call(module.exports);
    
    __require.modules["/node_modules/request/package.json"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/request/main.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/request";
    var __filename = "/node_modules/request/main.js";
    
    var require = function (file) {
        return __require(file, "/node_modules/request");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/request");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/request/main.js"]._cached = module.exports;
    
    (function () {
        // Copyright 2010-2011 Mikeal Rogers
// 
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
// 
//        http://www.apache.org/licenses/LICENSE-2.0
// 
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var http = require('http')
  , https = false
  , tls = false
  , url = require('url')
  , util = require('util')
  , stream = require('stream')
  , qs = require('querystring')
  , mimetypes = require('./mimetypes')
  ;

try {
  https = require('https')
} catch (e) {}

try {
  tls = require('tls')
} catch (e) {}

function toBase64 (str) {
  return (new Buffer(str || "", "ascii")).toString("base64")
}

// Hacky fix for pre-0.4.4 https
if (https && !https.Agent) {
  https.Agent = function (options) {
    http.Agent.call(this, options)
  }
  util.inherits(https.Agent, http.Agent)
  https.Agent.prototype._getConnection = function(host, port, cb) {
    var s = tls.connect(port, host, this.options, function() {
      // do other checks here?
      if (cb) cb()
    })
    return s
  }
}

function isReadStream (rs) {
  if (rs.readable && rs.path && rs.mode) {
    return true  
  }
}

function copy (obj) {
  var o = {}
  for (i in obj) o[i] = obj[i]
  return o
}

var isUrl = /^https?:/

var globalPool = {}

function Request (options) {
  stream.Stream.call(this)
  this.readable = true
  this.writable = true
  
  if (typeof options === 'string') {
    options = {uri:options}
  }
  
  for (i in options) {
    this[i] = options[i]
  }
  if (!this.pool) this.pool = globalPool
  this.dests = []
  this.__isRequestRequest = true
}
util.inherits(Request, stream.Stream)
Request.prototype.getAgent = function (host, port) {
  if (!this.pool[host+':'+port]) {
    this.pool[host+':'+port] = new this.httpModule.Agent({host:host, port:port})
  }
  return this.pool[host+':'+port]
}
Request.prototype.request = function () {  
  var options = this
  if (options.url) {
    // People use this property instead all the time so why not just support it.
    options.uri = options.url
    delete options.url
  }

  if (!options.uri) {
    throw new Error("options.uri is a required argument")
  } else {
    if (typeof options.uri == "string") options.uri = url.parse(options.uri)
  }
  if (options.proxy) {
    if (typeof options.proxy == 'string') options.proxy = url.parse(options.proxy)
  }

  options._redirectsFollowed = options._redirectsFollowed || 0
  options.maxRedirects = (options.maxRedirects !== undefined) ? options.maxRedirects : 10
  options.followRedirect = (options.followRedirect !== undefined) ? options.followRedirect : true
  
  options.headers = options.headers ? copy(options.headers) : {}

  var setHost = false
  if (!options.headers.host) {
    options.headers.host = options.uri.hostname
    if (options.uri.port) {
      if ( !(options.uri.port === 80 && options.uri.protocol === 'http:') &&
           !(options.uri.port === 443 && options.uri.protocol === 'https:') )
      options.headers.host += (':'+options.uri.port)
    }
    setHost = true
  }

  if (!options.uri.pathname) {options.uri.pathname = '/'}
  if (!options.uri.port) {
    if (options.uri.protocol == 'http:') {options.uri.port = 80}
    else if (options.uri.protocol == 'https:') {options.uri.port = 443}
  }

  if (options.bodyStream || options.responseBodyStream) {
    console.error('options.bodyStream and options.responseBodyStream is deprecated. You should now send the request object to stream.pipe()')
    this.pipe(options.responseBodyStream || options.bodyStream)
  }
  
  if (options.proxy) {
    options.port = options.proxy.port
    options.host = options.proxy.hostname
  } else {
    options.port = options.uri.port
    options.host = options.uri.hostname
  }
  
  if (options.onResponse === true) {
    options.onResponse = options.callback
    delete options.callback
  }
  
  var clientErrorHandler = function (error) {
    if (setHost) delete options.headers.host
    options.emit('error', error)
  }
  if (options.onResponse) options.on('error', function (e) {options.onResponse(e)}) 
  if (options.callback) options.on('error', function (e) {options.callback(e)})
  

  if (options.uri.auth && !options.headers.authorization) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth.split(':').map(function(item){ return qs.unescape(item)}).join(':'))
  }
  if (options.proxy && options.proxy.auth && !options.headers['proxy-authorization']) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth.split(':').map(function(item){ return qs.unescape(item)}).join(':'))
  }

  options.path = options.uri.href.replace(options.uri.protocol + '//' + options.uri.host, '')
  if (options.path.length === 0) options.path = '/'

  if (options.proxy) options.path = (options.uri.protocol + '//' + options.uri.host + options.path)

  if (options.json) {
    options.headers['content-type'] = 'application/json'
    if (typeof options.json === 'boolean') {
      if (typeof options.body === 'object') options.body = JSON.stringify(options.body)
    } else {
      options.body = JSON.stringify(options.json)
    }
    
  } else if (options.multipart) {
    options.body = ''
    options.headers['content-type'] = 'multipart/related;boundary="frontier"'
    if (!options.multipart.forEach) throw new Error('Argument error, options.multipart.')
    
    options.multipart.forEach(function (part) {
      var body = part.body
      if(!body) throw Error('Body attribute missing in multipart.')
      delete part.body
      options.body += '--frontier\r\n' 
      Object.keys(part).forEach(function(key){
        options.body += key + ': ' + part[key] + '\r\n'
      })
      options.body += '\r\n' + body + '\r\n'
    })
    options.body += '--frontier--'
  }

  if (options.body) {
    if (!Buffer.isBuffer(options.body)) {
      options.body = new Buffer(options.body)
    }
    if (options.body.length) {
      options.headers['content-length'] = options.body.length
    } else {
      throw new Error('Argument error, options.body.')
    }
  }
  
  options.httpModule = 
    {"http:":http, "https:":https}[options.proxy ? options.proxy.protocol : options.uri.protocol]

  if (!options.httpModule) throw new Error("Invalid protocol")
  
  if (options.pool === false) {
    options.agent = false
  } else {
    if (options.maxSockets) {
      // Don't use our pooling if node has the refactored client
      options.agent = options.httpModule.globalAgent || options.getAgent(options.host, options.port)
      options.agent.maxSockets = options.maxSockets
    }
    if (options.pool.maxSockets) {
      // Don't use our pooling if node has the refactored client
      options.agent = options.httpModule.globalAgent || options.getAgent(options.host, options.port)
      options.agent.maxSockets = options.pool.maxSockets
    }
  }
  
  options.start = function () {
    options._started = true
    options.method = options.method || 'GET'
    
    options.req = options.httpModule.request(options, function (response) {
      options.response = response
      response.request = options
      if (setHost) delete options.headers.host
      if (options.timeout && options.timeoutTimer) clearTimeout(options.timeoutTimer)

      if (response.statusCode >= 300 && 
          response.statusCode < 400  && 
          options.followRedirect     && 
          options.method !== 'PUT' && 
          options.method !== 'POST' &&
          response.headers.location) {
        if (options._redirectsFollowed >= options.maxRedirects) {
          options.emit('error', new Error("Exceeded maxRedirects. Probably stuck in a redirect loop."))
          return
        }
        options._redirectsFollowed += 1
        
        if (!isUrl.test(response.headers.location)) {
          response.headers.location = url.resolve(options.uri.href, response.headers.location)
        }
        options.uri = response.headers.location
        delete options.req
        delete options.agent
        delete options._started
        if (options.headers) {
          delete options.headers.host
        }
        request(options, options.callback)
        return // Ignore the rest of the response
      } else {
        options._redirectsFollowed = 0
        // Be a good stream and emit end when the response is finished.
        // Hack to emit end on close because of a core bug that never fires end
        response.on('close', function () {
          if (!options._ended) options.response.emit('end')
        })

        if (options.encoding) {
          if (options.dests.length !== 0) {
            console.error("Ingoring encoding parameter as this stream is being piped to another stream which makes the encoding option invalid.")
          } else {
            response.setEncoding(options.encoding)
          }
        }

        options.dests.forEach(function (dest) {
          if (dest.headers) {
            dest.headers['content-type'] = response.headers['content-type']
            if (response.headers['content-length']) {
              dest.headers['content-length'] = response.headers['content-length']
            }
          } 
          if (dest.setHeader) {
            for (i in response.headers) {
              dest.setHeader(i, response.headers[i])
            }
            dest.statusCode = response.statusCode
          }
          if (options.pipefilter) options.pipefilter(response, dest)
        })

        response.on("data", function (chunk) {options.emit("data", chunk)})
        response.on("end", function (chunk) {
          options._ended = true 
          options.emit("end", chunk)
        })
        response.on("close", function () {options.emit("close")})

        if (options.onResponse) {
          options.onResponse(null, response)
        }
        if (options.callback) {
          var buffer = ''
          options.on("data", function (chunk) { 
            buffer += chunk 
          })
          options.on("end", function () { 
            response.body = buffer
            if (options.json) {
              try {
                response.body = JSON.parse(response.body)
              } catch (e) {}
            }
            options.callback(null, response, response.body) 
          })  
        }
      }
    })

    if (options.timeout) {
      options.timeoutTimer = setTimeout(function() {
          options.req.abort()
          var e = new Error("ETIMEDOUT")
          e.code = "ETIMEDOUT"
          options.emit("error", e)
      }, options.timeout)
    }

    options.req.on('error', clientErrorHandler)
  }  
    
  options.once('pipe', function (src) {
    if (options.ntick) throw new Error("You cannot pipe to this stream after the first nextTick() after creation of the request stream.")
    options.src = src
    if (isReadStream(src)) {
      if (!options.headers['content-type'] && !options.headers['Content-Type'])
        options.headers['content-type'] = mimetypes.lookup(src.path.slice(src.path.lastIndexOf('.')+1))
    } else {
      if (src.headers) {
        for (i in src.headers) {
          if (!options.headers[i]) {
            options.headers[i] = src.headers[i]
          }
        }
      }
      if (src.method && !options.method) {
        options.method = src.method
      }
    }
    
    options.on('pipe', function () {
      console.error("You have already piped to this stream. Pipeing twice is likely to break the request.")
    })
  })
  
  process.nextTick(function () {
    if (options.body) {
      options.write(options.body)
      options.end()
    } else if (options.requestBodyStream) {
      console.warn("options.requestBodyStream is deprecated, please pass the request object to stream.pipe.")
      options.requestBodyStream.pipe(options)
    } else if (!options.src) {
      options.end()
    }
    options.ntick = true
  })
}
Request.prototype.pipe = function (dest) {
  if (this.response) throw new Error("You cannot pipe after the response event.")
  this.dests.push(dest)
  stream.Stream.prototype.pipe.call(this, dest)
  return dest
}
Request.prototype.write = function () {
  if (!this._started) this.start()
  if (!this.req) throw new Error("This request has been piped before http.request() was called.")
  this.req.write.apply(this.req, arguments)
}
Request.prototype.end = function () {
  if (!this._started) this.start()
  if (!this.req) throw new Error("This request has been piped before http.request() was called.")
  this.req.end.apply(this.req, arguments)
}
Request.prototype.pause = function () {
  if (!this.response) throw new Error("This request has been piped before http.request() was called.")
  this.response.pause.apply(this.response, arguments)
}
Request.prototype.resume = function () {
  if (!this.response) throw new Error("This request has been piped before http.request() was called.")
  this.response.resume.apply(this.response, arguments)
}

function request (options, callback) {
  if (typeof options === 'string') options = {uri:options}
  if (callback) options.callback = callback
  var r = new Request(options)
  r.request()
  return r
}

module.exports = request

request.defaults = function (options) {
  var def = function (method) {
    var d = function (opts, callback) {
      if (typeof opts === 'string') opts = {uri:opts}
      for (i in options) {
        if (opts[i] === undefined) opts[i] = options[i]
      }
      return method(opts, callback)
    }
    return d
  }
  de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  de.del = def(request.del)
  return de
}

request.get = request
request.post = function (options, callback) {
  if (typeof options === 'string') options = {uri:options}
  options.method = 'POST'
  return request(options, callback)
}
request.put = function (options, callback) {
  if (typeof options === 'string') options = {uri:options}
  options.method = 'PUT'
  return request(options, callback)
}
request.head = function (options, callback) {
  if (typeof options === 'string') options = {uri:options}
  options.method = 'HEAD'
  if (options.body || options.requestBodyStream || options.json || options.multipart) {
    throw new Error("HTTP HEAD requests MUST NOT include a request body.")
  }
  return request(options, callback)
}
request.del = function (options, callback) {
  if (typeof options === 'string') options = {uri:options}
  options.method = 'DELETE'
  return request(options, callback)
}
;
    }).call(module.exports);
    
    __require.modules["/node_modules/request/main.js"]._cached = module.exports;
    return module.exports;
};

require.modules["http"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "http";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["http"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["http"]._cached = module.exports;
    return module.exports;
};

require.modules["url"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "url";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["url"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["url"]._cached = module.exports;
    return module.exports;
};

require.modules["util"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "util";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["util"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["util"]._cached = module.exports;
    return module.exports;
};

require.modules["stream"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "stream";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["stream"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["stream"]._cached = module.exports;
    return module.exports;
};

require.modules["querystring"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "querystring";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["querystring"]._cached = module.exports;
    
    (function () {
        var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

/*!
 * querystring
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.3.1';

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Cache non-integer test regexp.
 */

var notint = /[^0-9]/;

/**
 * Parse the given query `str`, returning an object.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};

  function promote(parent, key) {
    if (parent[key].length == 0) return parent[key] = {};
    var t = {};
    for (var i in parent[key]) t[i] = parent[key][i];
    parent[key] = t;
    return t;
  }

  return String(str)
    .split('&')
    .reduce(function(ret, pair){
      try{ 
        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
      } catch(e) {
        // ignore
      }

      var eql = pair.indexOf('=')
        , brace = lastBraceInKey(pair)
        , key = pair.substr(0, brace || eql)
        , val = pair.substr(brace || eql, pair.length)
        , val = val.substr(val.indexOf('=') + 1, val.length)
        , parent = ret;

      // ?foo
      if ('' == key) key = pair, val = '';

      // nested
      if (~key.indexOf(']')) {
        var parts = key.split('[')
          , len = parts.length
          , last = len - 1;

        function parse(parts, parent, key) {
          var part = parts.shift();

          // end
          if (!part) {
            if (isArray(parent[key])) {
              parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
              parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
              parent[key] = val;
            } else {
              parent[key] = [parent[key], val];
            }
          // array
          } else {
            obj = parent[key] = parent[key] || [];
            if (']' == part) {
              if (isArray(obj)) {
                if ('' != val) obj.push(val);
              } else if ('object' == typeof obj) {
                obj[Object.keys(obj).length] = val;
              } else {
                obj = parent[key] = [parent[key], val];
              }
            // prop
            } else if (~part.indexOf(']')) {
              part = part.substr(0, part.length - 1);
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            // key
            } else {
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            }
          }
        }

        parse(parts, parent, 'base');
      // optimize
      } else {
        if (notint.test(key) && isArray(parent.base)) {
          var t = {};
          for(var k in parent.base) t[k] = parent.base[k];
          parent.base = t;
        }
        set(parent.base, key, val);
      }

      return ret;
    }, {base: {}}).base;
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix;
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[]'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = Object.keys(obj)
    , key;
  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  }
  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}
;
    }).call(module.exports);
    
    __require.modules["querystring"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/request/mimetypes.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/request";
    var __filename = "/node_modules/request/mimetypes.js";
    
    var require = function (file) {
        return __require(file, "/node_modules/request");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/request");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/request/mimetypes.js"]._cached = module.exports;
    
    (function () {
        // from http://github.com/felixge/node-paperboy
exports.types = {
  "aiff":"audio/x-aiff",
  "arj":"application/x-arj-compressed",
  "asf":"video/x-ms-asf",
  "asx":"video/x-ms-asx",
  "au":"audio/ulaw",
  "avi":"video/x-msvideo",
  "bcpio":"application/x-bcpio",
  "ccad":"application/clariscad",
  "cod":"application/vnd.rim.cod",
  "com":"application/x-msdos-program",
  "cpio":"application/x-cpio",
  "cpt":"application/mac-compactpro",
  "csh":"application/x-csh",
  "css":"text/css",
  "deb":"application/x-debian-package",
  "dl":"video/dl",
  "doc":"application/msword",
  "drw":"application/drafting",
  "dvi":"application/x-dvi",
  "dwg":"application/acad",
  "dxf":"application/dxf",
  "dxr":"application/x-director",
  "etx":"text/x-setext",
  "ez":"application/andrew-inset",
  "fli":"video/x-fli",
  "flv":"video/x-flv",
  "gif":"image/gif",
  "gl":"video/gl",
  "gtar":"application/x-gtar",
  "gz":"application/x-gzip",
  "hdf":"application/x-hdf",
  "hqx":"application/mac-binhex40",
  "html":"text/html",
  "ice":"x-conference/x-cooltalk",
  "ico":"image/x-icon",
  "ief":"image/ief",
  "igs":"model/iges",
  "ips":"application/x-ipscript",
  "ipx":"application/x-ipix",
  "jad":"text/vnd.sun.j2me.app-descriptor",
  "jar":"application/java-archive",
  "jpeg":"image/jpeg",
  "jpg":"image/jpeg",
  "js":"text/javascript",
  "json":"application/json",
  "latex":"application/x-latex",
  "lsp":"application/x-lisp",
  "lzh":"application/octet-stream",
  "m":"text/plain",
  "m3u":"audio/x-mpegurl",
  "man":"application/x-troff-man",
  "me":"application/x-troff-me",
  "midi":"audio/midi",
  "mif":"application/x-mif",
  "mime":"www/mime",
  "movie":"video/x-sgi-movie",
  "mustache":"text/plain",
  "mp4":"video/mp4",
  "mpg":"video/mpeg",
  "mpga":"audio/mpeg",
  "ms":"application/x-troff-ms",
  "nc":"application/x-netcdf",
  "oda":"application/oda",
  "ogm":"application/ogg",
  "pbm":"image/x-portable-bitmap",
  "pdf":"application/pdf",
  "pgm":"image/x-portable-graymap",
  "pgn":"application/x-chess-pgn",
  "pgp":"application/pgp",
  "pm":"application/x-perl",
  "png":"image/png",
  "pnm":"image/x-portable-anymap",
  "ppm":"image/x-portable-pixmap",
  "ppz":"application/vnd.ms-powerpoint",
  "pre":"application/x-freelance",
  "prt":"application/pro_eng",
  "ps":"application/postscript",
  "qt":"video/quicktime",
  "ra":"audio/x-realaudio",
  "rar":"application/x-rar-compressed",
  "ras":"image/x-cmu-raster",
  "rgb":"image/x-rgb",
  "rm":"audio/x-pn-realaudio",
  "rpm":"audio/x-pn-realaudio-plugin",
  "rtf":"text/rtf",
  "rtx":"text/richtext",
  "scm":"application/x-lotusscreencam",
  "set":"application/set",
  "sgml":"text/sgml",
  "sh":"application/x-sh",
  "shar":"application/x-shar",
  "silo":"model/mesh",
  "sit":"application/x-stuffit",
  "skt":"application/x-koan",
  "smil":"application/smil",
  "snd":"audio/basic",
  "sol":"application/solids",
  "spl":"application/x-futuresplash",
  "src":"application/x-wais-source",
  "stl":"application/SLA",
  "stp":"application/STEP",
  "sv4cpio":"application/x-sv4cpio",
  "sv4crc":"application/x-sv4crc",
  "svg":"image/svg+xml",
  "swf":"application/x-shockwave-flash",
  "tar":"application/x-tar",
  "tcl":"application/x-tcl",
  "tex":"application/x-tex",
  "texinfo":"application/x-texinfo",
  "tgz":"application/x-tar-gz",
  "tiff":"image/tiff",
  "tr":"application/x-troff",
  "tsi":"audio/TSP-audio",
  "tsp":"application/dsptype",
  "tsv":"text/tab-separated-values",
  "unv":"application/i-deas",
  "ustar":"application/x-ustar",
  "vcd":"application/x-cdlink",
  "vda":"application/vda",
  "vivo":"video/vnd.vivo",
  "vrm":"x-world/x-vrml",
  "wav":"audio/x-wav",
  "wax":"audio/x-ms-wax",
  "wma":"audio/x-ms-wma",
  "wmv":"video/x-ms-wmv",
  "wmx":"video/x-ms-wmx",
  "wrl":"model/vrml",
  "wvx":"video/x-ms-wvx",
  "xbm":"image/x-xbitmap",
  "xlw":"application/vnd.ms-excel",
  "xml":"text/xml",
  "xpm":"image/x-xpixmap",
  "xwd":"image/x-xwindowdump",
  "xyz":"chemical/x-pdb",
  "zip":"application/zip",
};

exports.lookup = function(ext, defaultType) {
  defaultType = defaultType || 'application/octet-stream';

  return (ext in exports.types)
    ? exports.types[ext]
    : defaultType;
};;
    }).call(module.exports);
    
    __require.modules["/node_modules/request/mimetypes.js"]._cached = module.exports;
    return module.exports;
};

require.modules["https"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "https";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["https"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["https"]._cached = module.exports;
    return module.exports;
};

require.modules["tls"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "tls";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["tls"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["tls"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_binding.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_binding.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_binding.js"]._cached = module.exports;
    
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

            var loginP = newService.login(function(err, success) {
                    test.ok(success);
                    test.done();
                }
            );
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
            var jobsP = this.service.get("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#post": function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },
        
        "Callback#post error": function(test) { 
            var jobsP = this.service.post("search/jobs", {search: "index_internal | head 1"}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 400);
                test.done();
            });
        },

        "Callback#delete": function(test) { 
            var service = this.service;
            var jobsP = this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid;
                    var deleteP = service.del(endpoint, {}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },

        "Callback#delete error": function(test) { 
            var jobsP = this.service.del("search/jobs/1234_nosuchjob", {}, function(res) {
                test.ok(!!res);
                test.strictEqual(res.status, 404);
                test.done();
            });
        },

        "Callback#request get": function(test) { 
            var jobsP = this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                    test.strictEqual(res.odata.offset, 0);
                    test.ok(res.odata.count <= res.odata.total_count);
                    test.strictEqual(res.odata.count, 2);
                    test.strictEqual(res.odata.count, res.odata.results.length);
                    test.ok(res.odata.results[0].sid);

                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);

                    test.done();
                }
            );
        },

        "Callback#request post": function(test) { 
            var body = "search="+encodeURIComponent("search index=_internal | head 1");
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"  
            };
            var service = this.service;
            var jobsP = this.service.request("search/jobs", "POST", headers, body, function(err, res) {
                    var sid = res.odata.results.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    var cancelP = service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },

        "Callback#request error": function(test) { 
            var jobsP = this.service.request("search/jobs/1234_nosuchjob", "GET", {"X-TestHeader": 1}, "", function(res) {
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
};
    }).call(module.exports);
    
    __require.modules["/tests/test_binding.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/internal/cmdline.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/internal";
    var __filename = "/internal/cmdline.js";
    
    var require = function (file) {
        return __require(file, "/internal");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/internal");
    };
    
    require.modules = __require.modules;
    __require.modules["/internal/cmdline.js"]._cached = module.exports;
    
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
    var path = require('path');
    var fs = require('fs');
    var OptionParser    = require('../contrib/parseopt').OptionParser;
    
    var DEFAULTS_PATHS = [
        process.env.HOME || process.env.HOMEPATH,
        process.cwd()
    ];
    
    var readDefaultsFile = function(path, defaults) {
        var contents = fs.readFileSync(path, "utf8") || "";
        var lines = contents.split("\n") || []
        
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line !== "") {
                var parts = line.split("=");
                var key = parts[0].trim();
                var value = parts[1].trim();
                defaults[key] = value;
            }
        }
    }
    
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
})();;
    }).call(module.exports);
    
    __require.modules["/internal/cmdline.js"]._cached = module.exports;
    return module.exports;
};

require.modules["fs"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "fs";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["fs"]._cached = module.exports;
    
    (function () {
        // nothing to see here... no file methods for the browser
;
    }).call(module.exports);
    
    __require.modules["fs"]._cached = module.exports;
    return module.exports;
};

require.modules["/contrib/parseopt.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/contrib";
    var __filename = "/contrib/parseopt.js";
    
    var require = function (file) {
        return __require(file, "/contrib");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/contrib");
    };
    
    require.modules = __require.modules;
    __require.modules["/contrib/parseopt.js"]._cached = module.exports;
    
    (function () {
        /**
 * JavaScript Option Parser (parseopt)
 * Copyright (C) 2010  Mathias Panzenböck <grosser.meister.morti@gmx.net>
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 * 
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU 
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA 
 */

/**
 * Construct a new OptionParser.
 * See the demo folder the end of this file for example usage.
 *
 * @param object params   optional Parameter-Object
 *
 * ===== Parameter-Object =====
 *   {
 *      minargs: integer, optional
 *      maxargs: integer, optional
 *      program: string, per default inferred from process.argv
 *      strings: object, optional
 *               Table of strings used in the output. See below.
 *      options: array, optional
 *               Array of option definitions. See below.
 *   }
 *
 * ===== String-Table =====
 *   {
 *      help:      string, default: 'No help available for this option.'
 *      usage:     string, default: 'Usage'
 *      options:   string, default: 'OPTIONS'
 *      arguments: string, default: 'ARGUMENTS'
 *      required:  string, default: 'required'
 *      default:   string, default: 'default'
 *      base:      string, default: 'base'
 *      metavars:  object, optional
 *                 Table of default metavar names per type.
 *                 Per default the type name in capital letters or derived
 *                 from the possible values.
 *   }
 *
 * ===== Option Definition =====
 *   {
 *      // Only when passed to the OptionParser constructor:
 *      name:        string or array
 *      names:       string or array, alias of name
 *                   Only one of both may be used at the same time.
 *
 *                   Names can be long options (e.g. '--foo') and short options
 *                   (e.g. '-f'). The first name is used to indentify the option.
 *                   Names musst be unique and may not contain '='.
 *
 *                   Short options may be combined when passed to a programm. E.g.
 *                   the options '-f' and '-b' can be combined to '-fb'. Only one
 *                   of these combined options may require an argument.
 *
 *                   Short options are separated from ther arguments by space,
 *                   long options per '='. If a long option requires an argument
 *                   and none is passed using '=' it also uses the next commandline
 *                   argument as it's argument (like short options).
 *
 *                   If '--' is encountered all remaining arguments are treated as
 *                   arguments and not as options.
 *
 *      // General fields:
 *      target:      string, per deflault inferred from first name
 *                   This defines the name used in the returned options object.
 *                   Multiple options may have the same target.
 *      default:     any, default: undefined
 *                   The default value associated with a certain target and is
 *                   overwritten by each new option with the same target.
 *      type:        string, default: 'string', see below
 *      required:    boolean, default: false
 *      redefinable: boolean, default: true
 *      help:        string, optional
 *      details:     array, optional
 *                   short list of details shown in braces after the option name
 *                   e.g. integer type options add 'base: '+base if base !== undefined
 *      metavar:     string or array, per deflault inferred from type
 *      onOption:    function (value) -> boolean, optional
 *                   Returning true canceles any further option parsing
 *                   and the parse() method returns null.
 *
 *      // Type: string  (alias: str)
 *      // Type: boolean (alias: bool)
 *      // Type: object  (alias: obj)
 *
 *      // Type: integer (alias: int)
 *      min:         integer, optional
 *      max:         integer, optional
 *      NaN:         boolean, default: false
 *      base:        integer, optional
 *
 *      // Type: float   (alias: number)
 *      min:         float, optional
 *      max:         float, optional
 *      NaN:         boolean, default: false
 *
 *      // Type: flag
 *      value:       boolean, default: true
 *      default:     boolean, default: false
 *
 *      // Type: option
 *      value:       any, per default inferred from first name
 *
 *      // Type: enum
 *      ignoreCase:  boolean, default: true
 *      values:      array or object where the user enteres the field name of
 *                   the object and you get the value of the field
 *
 *      // Type: record
 *      create:      function () -> object, default: Array
 *      args:        array of type definitions (type part of option definitions)
 *
 *      // Type: custom
 *      argc:        integer, default: -1
 *                   Number of required arguments.
 *                   -1 means one optional argument.
 *      parse:       function (string, ...) -> value
 *      stringify:   function (value) -> string, optional
 *   }
 *
 * ===== Option-Arguments =====
 * For the following types exactly one argument is required:
 *   integer, float, string, boolean, object, enum
 *
 * The following types have optional arguments:
 *   flag
 *
 * The following types have no arguments:
 *   option
 *
 * Custom types may set this through the argc field.
 */
function OptionParser (params) {
    this.optionsPerName = {};
    this.defaultValues  = {};
    this.options        = [];

    if (params !== undefined) {
        this.minargs = params.minargs == 0 ? undefined : params.minargs;
        this.maxargs = params.maxargs;
        this.program = params.program;
        this.strings = params.strings;

        if (this.minargs > this.maxargs) {
            throw new Error('minargs > maxargs');
        }
    }

    if (this.strings === undefined) {
        this.strings = {};
    }

    defaults(this.strings, {
        help:      'No help available for this option.',
        usage:     'Usage',
        options:   'OPTIONS',
        arguments: 'ARGUMENTS',
        required:  'required',
        default:   'default',
        base:      'base',
        metavars:  {}
    });

    defaults(this.strings.metavars, METAVARS);

    if (this.program === undefined) {
        this.program = process.argv[0] + ' ' + process.argv[1];
    }

    if (params !== undefined && params.options !== undefined) {
        for (var i in params.options) {
            var opt = params.options[i];
            var names;

            if (opt instanceof Array || typeof(opt) == 'string') {
                opt = undefined;
                names = opt;
            }
            else {
                names = opt.names;
                if (names === undefined) {
                    names = opt.name;
                    delete opt.name;
                }
                else {
                    delete opt.names;
                }
            }
            this.add(names, opt);
        }
    }
}

OptionParser.prototype = {
    /**
     * Parse command line options.
     * 
     * @param array args  Commandline arguments.
     *                    If undefined process.argv.slice(2) is used.
     *
     * @return object
     *   {
     *      arguments: array
     *      options:   object, { target -> value }
     *   }
     */
    parse: function (args) {
        if (args === undefined) {
            args = process.argv.slice(2);
        }

        var data = {
            options:   {},
            arguments: []
        };

        for (var name in this.defaultValues) {
            var value = this.defaultValues[name];

            if (value !== undefined) {
                data.options[this.optionsPerName[name].target] = value;
            }
        }

        var got = {};
        var i = 0;
        for (; i < args.length; ++ i) {
            var arg = args[i];

            if (arg == '--') {
                ++ i;
                break;
            }
            else if (/^--.+$/.test(arg)) {
                var j = arg.indexOf('=');
                var name, value = undefined;

                if (j == -1) {
                    name  = arg;
                }
                else {
                    name  = arg.substring(0,j);
                    value = arg.substring(j+1);
                }

                var optdef = this.optionsPerName[name];
                
                if (optdef === undefined) {
                    throw new Error('unknown option: '+name);
                }

                if (value === undefined) {
                    if (optdef.argc < 1) {
                        value = optdef.value;
                    }
                    else if ((i + optdef.argc) >= args.length) {
                        throw new Error('option '+name+' needs '+optdef.argc+' arguments');
                    }
                    else {
                        value = optdef.parse.apply(optdef, args.slice(i+1, i+1+optdef.argc));
                        i += optdef.argc;
                    }
                }
                else if (optdef.argc == 0) {
                    throw new Error('option '+name+' does not need an argument');
                }
                else if (optdef.argc > 1) {
                    throw new Error('option '+name+' needs '+optdef.argc+' arguments');
                }
                else {
                    value = optdef.parse(value);
                }

                if (!optdef.redefinable && optdef.target in got) {
                    throw new Error('cannot redefine option '+name);
                }

                got[optdef.target] = true;
                data.options[optdef.target] = value;

                if (optdef.onOption && optdef.onOption(value) === true) {
                    return null;
                }
            }
            else if (/^-.+$/.test(arg)) {
                if (arg.indexOf('=') != -1) {
                    throw new Error('illegal option syntax: '+arg);
                }

                var tookarg = false;
                arg = arg.substring(1);

                for (var j = 0; j < arg.length; ++ j) {
                    var name = '-'+arg[j];
                    var optdef = this.optionsPerName[name];
                    var value;
                    
                    if (optdef === undefined) {
                        throw new Error('unknown option: '+name);
                    }

                    if (optdef.argc < 1) {
                        value = optdef.value;
                    }
                    else {
                        if (tookarg || (i+optdef.argc) >= args.length) {
                            throw new Error('option '+name+' needs '+optdef.argc+' arguments');
                        }

                        value = optdef.parse.apply(optdef, args.slice(i+1, i+1+optdef.argc));
                        i += optdef.argc;
                        tookarg = true;
                    }

                    if (!optdef.redefinable && optdef.target in got) {
                        throw new Error('redefined option: '+name);
                    }

                    got[optdef.target] = true;
                    data.options[optdef.target] = value;

                    if (optdef.onOption && optdef.onOption(value) === true) {
                        return null;
                    }
                }
            }
            else {
                data.arguments.push(arg);
            }
        }

        for (; i < args.length; ++ i) {
            data.arguments.push(args[i]);
        }

        var argc = data.arguments.length;
        if ((this.maxargs !== undefined && argc > this.maxargs) ||
                (this.minargs !== undefined && argc < this.minargs)) {
            var msg = 'illegal number of arguments: ' + argc;

            if (this.minargs !== undefined) {
                msg += ', minumum is ' + this.minargs;
                if (this.maxargs !== undefined) {
                    msg += ' and maximum is ' + this.maxargs;
                }
            }
            else {
                msg += ', maximum is ' + this.maxargs;
            }

            throw new Error(msg);
        }

        for (var i in this.options) {
            var optdef = this.options[i];
            if (optdef.required && !(optdef.target in got)) {
                throw new Error('missing required option: ' + optdef.names[0]);
            }
        }
        
        return data;
    },
    /**
     * Add an option definition.
     *
     * @param string or array names  Option names
     * @param object optdef          Option definition
     */
    add: function (names, optdef) {
        if (typeof(names) == 'string') {
            names = [names];
        }
        else if (names === undefined || names.length == 0) {
            throw new Error('no option name given');
        }

        if (optdef === undefined) {
            optdef = {};
        }

        optdef.names = names;
        
        for (var i in names) {
            var name = names[i];
            var match = /(-*)(.*)/.exec(name);

            if (name.length == 0 || match[1].length < 1 ||
                    match[1].length > 2 || match[2].length == 0 ||
                    (match[1].length == 1 && match[2].length > 1) ||
                    match[2].indexOf('=') != -1) {
                throw new Error('illegal option name: ' + name);
            }

            if (name in this.optionsPerName) {
                throw new Error('option already exists: '+name);
            }
        }

        if (optdef.target === undefined) {
            var target = names[0].replace(/^--?/,'');
            
            if (target.toUpperCase() == target) {
                // FOO-BAR -> FOO_BAR
                target = target.replace(/[^a-zA-Z0-9]+/,'_');
            }
            else {
                // foo-bar -> fooBar
                target = target.split(/[^a-zA-Z0-9_]+/);
                for (var i = 1; i < target.length; ++ i) {
                    var part = target[i];
    
                    if (part) {
                        target[i] = part[0].toUpperCase() + part.substring(1);
                    }
                }
                target = target.join('');
            }

            optdef.target = target;
        }

        this._initType(optdef, optdef.names[0]);

        if (optdef.redefinable === undefined) {
            optdef.redefinable = true;
        }

        if (optdef.required === undefined) {
            optdef.required = false;
        }

        if (optdef.help === undefined) {
            optdef.help = this.strings.help;
        }
        else {
            optdef.help = optdef.help.trim();
        }
        
        for (var i in names) {
            this.optionsPerName[names[i]] = optdef;
        }
        
        if (optdef.default !== undefined) {
            this.defaultValues[names[0]] = optdef.default;
        }

        this.options.push(optdef);
    },
    /**
     * Show an error message, usage and exit program with exit code 1.
     * 
     * @param string msg       The error message
     * @param WriteStream out  Where to write the message.
     *                         If undefined process.stdout is used.
     */
    error: function (msg, out) {
        if (!out) {
            out = process.stdout;
        }
        out.write('*** '+msg+'\n\n');
        this.usage(undefined, out);
        process.exit(1);
    },
    /**
     * Print usage message.
     *
     * @param string help      Optional additional help message.
     * @param WriteStream out  Where to write the message.
     *                         If undefined process.stdout is used.
     */
    usage: function (help, out) {
        if (!out) {
            out = process.stdout;
        }

        out.write(this.strings.usage+': '+this.program+' ['+
            this.strings.options+']'+(this.maxargs != 0 ?
                ' ['+this.strings.arguments+']\n' : '\n'));
        out.write('\n');
        out.write(this.strings.options+':\n');

        for (var i in this.options) {
            var optdef = this.options[i];
            var optnames = [];
            var metavar = optdef.metavar;

            if (metavar instanceof Array) {
                metavar = metavar.join(' ');
            }

            for (var j in optdef.names) {
                var optname = optdef.names[j];

                if (metavar !== undefined) {
                    if (optdef.argc < 2 && optname.substring(0,2) == '--') {
                        if (optdef.argc < 0) {
                            optname = optname+'[='+metavar+']';
                        }
                        else {
                            optname = optname+'='+metavar;
                        }
                    }
                    else {
                        optname = optname+' '+metavar;
                    }
                }
                optnames.push(optname);
            }

            var details = optdef.details !== undefined ? optdef.details.slice() : [];
            if (optdef.required) {
                details.push(this.strings.required);
            }
            else if (optdef.argc > 0 && optdef.default !== undefined) {
                details.push(this.strings.default+': '+optdef.stringify(optdef.default));
            }

            if (details.length > 0) {
                details = '  (' + details.join(', ') + ')';
            }

            if (metavar !== undefined) {
                optnames[0] += details;
                out.write('  '+optnames.join('\n  '));
            }
            else {
                out.write('  '+optnames.join(', ')+details);
            }
            if (optdef.help) {
                var lines = optdef.help.split('\n');
                for (var j in lines) {
                    out.write('\n        '+lines[j]);
                }
            }
            out.write('\n\n');
        }

        if (help !== undefined) {
            out.write(help);
            if (help[help.length-1] != '\n') {
                out.write('\n');
            }
        }
    },
    _initType: function (optdef, name) {
        optdef.name = name;
    
        if (optdef.type === undefined) {
            optdef.type = 'string';
        }
        else if (optdef.type in TYPE_ALIAS) {
            optdef.type = TYPE_ALIAS[optdef.type];
        }
        
        switch (optdef.type) {
            case 'flag':
                if (optdef.value === undefined) {
                    optdef.value = true;
                }
                optdef.parse = parseBool;
                optdef.argc  = -1;
    
                if (optdef.default === undefined) {
                    optdef.default = this.defaultValues[name];

                    if (optdef.default === undefined) {
                        optdef.default = false;
                    }
                }
                break;
    
            case 'option':
                optdef.argc = 0;
    
                if (optdef.value === undefined) {
                    optdef.value = name.replace(/^--?/,'');
                }
                break;
    
            case 'enum':
                this._initEnum(optdef, name);
                break;
    
            case 'integer':
            case 'float':
                this._initNumber(optdef, name);
                break;
    
            case 'record':
                if (optdef.args === undefined || optdef.args.length == 0) {
                    throw new Error('record '+name+' needs at least one argument');
                }
                optdef.argc = 0;
                var metavar = [];
                for (var i in optdef.args) {
                    var arg = optdef.args[i];
                    if (arg.target === undefined) {
                        arg.target = i;
                    }
                    this._initType(arg, name+'['+i+']');
    
                    if (arg.argc < 1) {
                        throw new Error('argument '+i+' of option '+name+
                            ' has illegal number of arguments');
                    }
                    if (arg.metavar instanceof Array) {
                        for (var j in arg.metavar) {
                            metavar.push(arg.metavar[j]);
                        }
                    }
                    else {
                        metavar.push(arg.metavar);
                    }
                    delete arg.metavar;
                    optdef.argc += arg.argc;
                }
                if (optdef.metavar === undefined) {
                    optdef.metavar = metavar;
                }
                var onOption = optdef.onOption;
                if (onOption !== undefined) {
                    optdef.onOption = function (values) {
                        return onOption.apply(this, values);
                    };
                }
                if (optdef.create === undefined) {
                    optdef.create = Array;
                }
                optdef.parse = function () {
                    var values = this.create();
                    var parserIndex = 0;
                    for (var i = 0; i < arguments.length;) {
                        var arg = optdef.args[parserIndex ++];
                        var raw = [];
                        for (var j = 0; j < arg.argc; ++ j) {
                            raw.push(arguments[i+j]);
                        }
                        values[arg.target] = arg.parse.apply(arg, raw);
                        i += arg.argc;
                    }
                    return values;
                };
                break;
    
            case 'custom':
                if (optdef.argc === undefined || optdef.argc < -1) {
                    optdef.argc = -1;
                }
    
                if (optdef.parse === undefined) {
                    throw new Error(
                        'no parse function defined for custom type option '+name);
                }
                break;
    
            default:
                optdef.argc = 1;
                optdef.parse = PARSERS[optdef.type];
    
                if (optdef.parse === undefined) {
                    throw new Error('type of option '+name+' is unknown: '+optdef.type);
                }
        }
    
        initStringify(optdef);
        
        var count = 1;
        if (optdef.metavar === undefined) {
            optdef.metavar = this.strings.metavars[optdef.type];
        }
        
        if (optdef.metavar === undefined) {
            count = 0;
        }
        else if (optdef.metavar instanceof Array) {
            count = optdef.metavar.length;
        }
    
        if (optdef.argc == -1) {
            if (count > 1) {
                throw new Error('illegal number of metavars for option '+name+
                    ': '+JSON.stringify(optdef.metavar));
            }
        }
        else if (optdef.argc != count) {
            throw new Error('illegal number of metavars for option '+name+
                ': '+JSON.stringify(optdef.metavar));
        }
    },
    _initEnum: function (optdef, name) {
        optdef.argc = 1;
    
        if (optdef.ignoreCase === undefined) {
            optdef.ignoreCase = true;
        }
    
        if (optdef.values === undefined || optdef.values.length == 0) {
            throw new Error('no values for enum '+name+' defined');
        }
    
        initStringify(optdef);

        var labels = [];
        var values = {};
        if (optdef.values instanceof Array) {
            for (var i in optdef.values) {
                var value = optdef.values[i];
                var label = String(value);
                values[optdef.ignoreCase ? label.toLowerCase() : label] = value;
                labels.push(optdef.stringify(value));
            }
        }
        else {
            for (var label in optdef.values) {
                var value = optdef.values[label];
                values[optdef.ignoreCase ? label.toLowerCase() : label] = value;
                labels.push(optdef.stringify(label));
            }
            labels.sort();
        }
        optdef.values = values;
        
        
        if (optdef.metavar === undefined) {
            optdef.metavar = '<'+labels.join(', ')+'>';
        }
    
        optdef.parse = function (s) {
            var value = values[optdef.ignoreCase ? s.toLowerCase() : s];
            if (value !== undefined) {
                return value;
            }
            throw new Error('illegal value for option '+name+': '+s);
        };
    },
    _initNumber: function (optdef, name) {
        optdef.argc = 1;
    
        if (optdef.NaN === undefined) {
            optdef.NaN = false;
        }

        if (optdef.min > optdef.max) {
            throw new Error('min > max for option '+name);
        }
        
        var parse, toStr;
        if (optdef.type == 'integer') {
            parse = function (s) {
                var i = NaN;
                if (s.indexOf('.') == -1) {
                    i = parseInt(s, optdef.base)
                }
                return i;
            };
            if (optdef.base === undefined) {
                toStr = dec;
            }
            else {
                switch (optdef.base) {
                    case  8: toStr = oct; break;
                    case 10: toStr = dec; break;
                    case 16: toStr = hex; break;
                    default: toStr = function (val) {
                            return val.toString(optdef.base);
                        };
                        var detail = this.strings.base+': '+optdef.base;
                        if (optdef.details) {
                            optdef.details.push(detail);
                        }
                        else {
                            optdef.details = [detail];
                        }
                }
            }
        }
        else {
            parse = parseFloat;
            toStr = dec;
        }
    
        if (optdef.metavar === undefined) {
            if (optdef.min === undefined && optdef.max === undefined) {
                optdef.metavar = this.strings.metavars[optdef.type];
            }
            else if (optdef.min === undefined) {
                optdef.metavar = '...'+toStr(optdef.max);
            }
            else if (optdef.max === undefined) {
                optdef.metavar = toStr(optdef.min)+'...';
            }
            else {
                optdef.metavar = toStr(optdef.min)+'...'+toStr(optdef.max);
            }
        }
        optdef.parse = function (s) {
            var n = parse(s);
                    
            if ((!this.NaN && isNaN(n))
                    || (optdef.min !== undefined && n < optdef.min)
                    || (optdef.max !== undefined && n > optdef.max)) {
                throw new Error('illegal value for option '+name+': '+s);
            }
    
            return n;
        };
    }
};

function initStringify (optdef) {
    if (optdef.stringify === undefined) {
        optdef.stringify = STRINGIFIERS[optdef.type];
    }
    
    if (optdef.stringify === undefined) {
        optdef.stringify = stringifyAny;
    }
}

function defaults (target, defaults) {
    for (var name in defaults) {
        if (target[name] === undefined) {
            target[name] = defaults[name];
        }
    }
}

function dec (val) {
    return val.toString();
}

function oct (val) {
    return '0'+val.toString(8);
}

function hex (val) {
    return '0x'+val.toString(16);
}

const TRUE_VALUES  = {true:  true, on:  true, 1: true, yes: true};
const FALSE_VALUES = {false: true, off: true, 0: true, no:  true};

function parseBool (s) {
    s = s.trim().toLowerCase();
    if (s in TRUE_VALUES) {
        return true;
    }
    else if (s in FALSE_VALUES) {
        return false;
    }
    else {
        throw new Error('illegal boolean value: '+s);
    }
}

function id (x) {
    return x;
}

const PARSERS = {
    boolean: parseBool,
    string:  id,
    object:  JSON.parse
};

const TYPE_ALIAS = {
    int:    'integer',
    number: 'float',
    bool:   'boolean',
    str:    'string',
    obj:    'object'
};

const METAVARS = {
    string:  'STRING',
    integer: 'INTEGER',
    float:   'FLOAT',
    boolean: 'BOOLEAN',
    object:  'OBJECT',
    enum:    'VALUE',
    custom:  'VALUE'
};

function stringifyString(s) {
    if (/[\s'"\\<>,]/.test(s)) {
//      s = "'"+s.replace(/\\/g,'\\\\').replace(/'/g, "'\\''")+"'";
        s = JSON.stringify(s);
    }
    return s;
}

function stringifyPrimitive(value) {
    return ''+value;
}

function stringifyAny (value) {
    if (value instanceof Array) {
        var buf = [];
        for (var i in value) {
            buf.push(stringifyAny(value[i]));
        }
        return buf.join(' ');
    }
    else if (typeof(value) == 'string') {
        return stringifyString(value);
    }
    else {
        return String(value);
    }
}

function stringifyInteger (value) {
    if (this.base === undefined) {
        return value.toString();
    }

    switch (this.base) {
        case  8: return oct(value);
        case 16: return hex(value);
        default: return value.toString(this.base);
    }
}

function stringifyRecord (record) {
    var buf = [];
    for (var i = 0; i < this.args.length; ++ i) {
        var arg = this.args[i];
        buf.push(arg.stringify(record[arg.target]));
    }
    return buf.join(' ');
}

const STRINGIFIERS = {
    string:          stringifyString,
    integer:         stringifyInteger,
    boolean:         stringifyPrimitive,
    float:           stringifyPrimitive,
    object:          JSON.stringify,
    enum:            stringifyAny,
    custom:          stringifyAny,
    record:          stringifyRecord
};

exports.OptionParser = OptionParser;
;
    }).call(module.exports);
    
    __require.modules["/contrib/parseopt.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_client.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_client.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_client.js"]._cached = module.exports;
    
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

exports.setup = function(svc) {
    var Splunk      = require('../splunk').Splunk;
    var utils       = Splunk.Utils;
    var Async       = Splunk.Async;

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
                this.service.jobs().create('search index=_internal | head 1 | stats count', {id: sid}, function(err, job) {
                    var properties = {};

                    Async.whilst(
                        {
                            condition: function() { return properties.dispatchState !== "DONE"; },
                            body: function(iterationDone) {
                                job.read(function(err, props) {
                                    properties = props;
                                    Async.sleep(1000, iterationDone); 
                                });
                            },
                        },
                        function() {
                            job.results({}, function(err, results) {
                                test.strictEqual(results.rows.length, 1);
                                test.strictEqual(results.fields.length, 1);
                                test.strictEqual(results.fields[0], "count");
                                test.strictEqual(results.rows[0][0], "1");

                                job.cancel(function() { test.done(); });
                            });
                        }
                    );
                });
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
                        app.del(function() {
                            test.done();
                        });
                    });
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
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.history(function(err, response) {
                        test.done();
                    });
                });
            },
            
            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.contains("gentimes", function(err, found, search) {
                    test.ok(found);
                    test.ok(search.isValid());
                    
                    search.suppressInfo(function(response) {
                        test.done();
                    });
                });
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
};
    }).call(module.exports);
    
    __require.modules["/tests/test_client.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_searcher.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_searcher.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_searcher.js"]._cached = module.exports;
    
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
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
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
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
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
                    var iterateP = Async.whilst(
                        {
                            condition: function() { return hasMore; },
                            body: function(done) {
                                iterator.next(function(err, more, results) {
                                    hasMore = more;
                                    
                                    if (more) {
                                        iterationCount++;
                                        totalResultCount += results.rows.length;
                                    }
                                    
                                    done();
                                });
                            }
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
};
    }).call(module.exports);
    
    __require.modules["/tests/test_searcher.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/tests/test_examples.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/tests";
    var __filename = "/tests/test_examples.js";
    
    var require = function (file) {
        return __require(file, "/tests");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/tests");
    };
    
    require.modules = __require.modules;
    __require.modules["/tests/test_examples.js"]._cached = module.exports;
    
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
                    function(create, done) {
                        context.run("create", [], create, function(err, job) {
                            test.ok(!err);
                            test.ok(job);
                            test.strictEqual(job.sid, create.id);
                            done(null, job);
                        });
                    },
                    creates,
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
};
    }).call(module.exports);
    
    __require.modules["/tests/test_examples.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/examples/jobs.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/examples";
    var __filename = "/examples/jobs.js";
    
    var require = function (file) {
        return __require(file, "/examples");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/examples");
    };
    
    require.modules = __require.modules;
    __require.modules["/examples/jobs.js"]._cached = module.exports;
    
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
                
                Async.parallelMap(fn, jobs, callback);
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
            this._foreach(sids, function(job, done) {
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
            this._foreach(cmdline.arguments, function(job, done) {
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
                this._foreach(sids, function(job, done) {
                    job.read(function(err, props) {
                        if (err) {
                            done(err);
                            return;
                        }
                        
                        console.log("Job " + job.sid + ": ");
                        var properties = props;
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
            this._foreach(cmdline.arguments, function(job, done) {
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
            this._foreach(cmdline.arguments, function(job, done) {
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
})();;
    }).call(module.exports);
    
    __require.modules["/examples/jobs.js"]._cached = module.exports;
    return module.exports;
};

(function () {
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

window.SplunkTest = require('./splunk.test').SplunkTest;;
})();
