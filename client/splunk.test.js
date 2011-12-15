(function() {

var __exportName = 'Splunk';

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

    Splunk.Logger.setLevel("ALL");
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

require.define("/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"main":"splunk.js"}
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

    // Declare a process environment so that we can set
    // some globals here and have interop with node
    process.env = process.env || {};

    root.Splunk = {
        Logger          : require('./lib/log').Logger,
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
    
    if (typeof(window) === 'undefined') {
        root.Splunk.NodeHttp = require('./lib/platform/node/node_http').NodeHttp;
    }
})();
});

require.define("/lib/log.js", function (require, module, exports, __dirname, __filename) {
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

    var levels = {
        "ALL": 4,
        "INFO": 3,
        "WARN": 2,
        "ERROR": 1,
        "NONE": 0
    };
    
    var exists = function(key) {
        return typeof(process.env[key]) !== "undefined";
    };
    
    if (exists("LOG_LEVEL")) {
        // If it isn't set, then we default to only errors
        process.env.LOG_LEVEL = levels["ERROR"];
    }
    else if (utils.isString(process.env.LOG_LEVEL)) {
        // If it is a string, try and convert it, but default
        // to error output if we can't convert it.
        if (levels.hasOwnProperty(process.env.LOG_LEVEL)) {
            process.env.LOG_LEVEL = levels[process.env.LOG_LEVEL];
        }
        else {
            process.env.LOG_LEVEL = levels["ERROR"];
        }
    }
    else if (!utils.isNumber(process.env.LOG_LEVEL)) {
        // If it is anything other than a string or number,
        // set it to only error output.
        process.env.LOG_LEVEL = levels["ERROR"];
    }

    // Set the actual output functions
    var _log, _warn, _error, _info;
    _log = _warn = _error = _info = function() {};
    if (typeof(console) !== "undefined") {
        _log   = (console.log   ?
            function(str) { try { console.log.apply(console, arguments);   } catch (ex) { console.log(str);   } }   :
            _log);
        _error = (console.error ?
            function(str) { try { console.error.apply(console, arguments); } catch (ex) { console.error(str); } } :
            _error);
        _warn  = (console.warn  ?
            function(str) { try { console.warn.apply(console, arguments);  } catch (ex) { console.warn(str);  } } :
            _warn);
        _info  = (console.info  ?
            function(str) { try { console.info.apply(console, arguments);  } catch (ex) { console.info(str);  } } :
            _info);
    }

    /**
     * Splunk.Logger
     * 
     * A controllable logging module.
     *
     * @moduleRoot Splunk.Logger
     */
    exports.Logger = {
        /**
         * Log to the console (equivalent to `console.log`)
         *
         * @module Splunk.Logger
         */
        log: function() {
            if (process.env.LOG_LEVEL >= levels.ALL) {
                _log.apply(null, arguments);
            }
        },
        
        /**
         * Log error to the console (equivalent to `console.error`)
         *
         * @module Splunk.Logger
         */
        error: function() {
            if (process.env.LOG_LEVEL >= levels.ERROR) {
                _error.apply(null, arguments);
            }
        },
        
        /**
         * Log warning to the console (equivalent to `console.warn`)
         *
         * @module Splunk.Logger
         */
        warn: function() {
            if (process.env.LOG_LEVEL >= levels.WARN) {
                _warn.apply(null, arguments);
            }
        },
        
        /**
         * Log info to the console (equivalent to `console.info`)
         *
         * @module Splunk.Logger
         */
        info: function() {
            if (process.env.LOG_LEVEL >= levels.INFO) {
                _info.apply(null, arguments);
            }
        },
        
        /**
         * Set the global logging level
         *
         * Example:
         *
         *      Splunk.Logger.setLevel("WARN");
         *      Splunk.Logger.setLevel(0); // equivalent to NONE
         *
         * @param {String|Number} level A string (`ALL` | `INFO` | `WARN` | `ERROR` | `NONE`) or number representing the log level
         *
         * @module Splunk.Logger
         */
        setLevel: function(level) {    
            if (utils.isString(level)) {
                if (levels.hasOwnProperty(level)) {
                    process.env.LOG_LEVEL = levels[level];
                }
                else {
                    process.env.LOG_LEVEL = levels["ERROR"];
                }
            }
            else if (utils.isNumber(level)) {
                process.env.LOG_LEVEL = level;
            }
            else {
                process.env.LOG_LEVEL = levels["ERROR"];
            }
        },
        
        /*!*/
        levels: levels
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
     * Strip a string of all leading and trailing whitespace.
     *
     * Example:
     *      
     *      var a = " aaa ";
     *      var b = Splunk.Utils.trim(a); //== "aaa"
     *
     * @param {String} str The string to trim
     * @return {String} The trimmed string
     *
     * @globals Splunk.Utils
     */
    root.trim = function(str) {
        if (String.prototype.trim) {
            return String.prototype.trim.call(str);
        }
        else {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');   
        }
    };
    
    /**
     * Whether an array contains a specific object
     *
     * Example:
     *      
     *      var a = ["a", "b', "c"];
     *      console.log(Splunk.Utils.indexOf(a, "b")) //== 1
     *      console.log(Splunk.Utils.indexOf(a, "d")) //== -1
     *
     * @param {Array} arr The array to search in
     * @param {Anything} search The thing to search for
     * @return {Number} The index of `search` or `-1` if it wasn't found
     *
     * @globals Splunk.Utils
     */
    root.indexOf = function(arr, search) {
        for(var i=0; i<arr.length; i++) {
            if (arr[i] === search) {
                return i;
            }
        }
        return -1;
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
        return (root.indexOf(arr, obj) >= 0);
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

    /**
     * Whether or not the argument is a number
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isNumber(1); // true
     *          console.log(Splunk.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a number
     * @return {Boolean} Whether or not the passed in parameter was a number
     *
     * @globals Splunk.Utils
     */
    root.isNumber = function(obj) {
        return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
    };
    
    /**
     * Whether or not the argument is a string
     *
     * Example:
     *      
     *      function() { 
     *          console.log(Splunk.Utils.isNumber("abc"); // true
     *          console.log(Splunk.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a string
     * @return {Boolean} Whether or not the passed in parameter was a string
     *
     * @globals Splunk.Utils
     */
    root.isString = function(obj) {
        return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
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
    
    var Paths    = require('./paths').Paths;
    var Class    = require('./jquery.class').Class;
    var Http     = require('./http').Http;
    var utils    = require('./utils');

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
         * @param {Object} params Dictionary of optional parameters: scheme, host, port, username, password, owner, app, sessionKey
         * @return {Splunk.Binding.Context} A Splunk.Binding.Context instance
         *
         * @module Splunk.Binding.Context 
         */
        init: function(http, params) {
            if (!(http instanceof Http) && !params) {
                // Move over the params
                params = http;
                http = null;
            }
            
            params = params || {};
            
            this.scheme     = params.scheme || "https";
            this.host       = params.host || "localhost";
            this.port       = params.port || 8089;
            this.username   = params.username || null;  
            this.password   = params.password || null;  
            this.owner      = params.owner || "-";  
            this.app        = params.app;  
            this.sessionKey = params.sessionKey || "";
            
            if (!http) {
                // If there is no HTTP implementation set, we check what platform
                // we're running on. If we're running in the browser, then we instantiate
                // XdmHttp, else, we instantiate NodeHttp.
                if (typeof(window) !== 'undefined') {
                    var XdmHttp  = require('./platform/client/easyxdm_http').XdmHttp;
                    http = new XdmHttp(this.scheme + "://" + this.host + ":" + this.port);
                }
                else {
                    var NodeHttp = require('./platform/node/node_http').NodeHttp;
                    http = new NodeHttp();
                }
            }
            
            // Store the HTTP implementation
            this.http = http;
            
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
         * owner and app prefixes if necessary
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

            if (!this.app) {
                return "/services/" + path;
            }

            var owner = (this.owner === "*" || !this.owner ? "-" : this.owner);
            var app   = (this.app === "*" ? "-" : this.app);

            return "/servicesNS/" + owner + "/" + app + "/" + path; 
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
    var logger  = require('./log').Logger;

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
            var error = new Error('Invalid JSON object passed; cannot parse into OData.');
            error.json = json;
            throw error;
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
                        logger.error(msg);
                        break;
                    case 'WARN':
                        // TODO
                        logger.warn(msg);
                        break;
                    case 'INFO':
                        // TODO
                        logger.info(msg);
                        break;
                    case 'HTTP':
                        break;
                    default:
                        // TODO
                        logger.info(msg + (list[i].code ? " -- " + list[i].code : ""));
                        break;
                }
            }
        }

        return list;  
    };
})();
});

require.define("/lib/platform/client/easyxdm_http.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Http    = require('../../http').Http;
    var utils   = require('../../utils');
    
    // Include it so it gets put in splunk.js
    require('../../../contrib/easyXDM/easyXDM.min');

    var root = exports || this;
    
    var NAMESPACE_PREFIX = "SPLUNK_XDM_";
    var namespaceCounter = 0;
    var namespace = NAMESPACE_PREFIX + (++namespaceCounter);

    var getHeaders = function(headersString) {
        var headers = {};
        var headerLines = headersString.split("\n");
        for(var i = 0; i < headerLines.length; i++) {
            if (utils.trim(headerLines[i]) !== "") {
                var headerParts = headerLines[i].split(": ");
                headers[headerParts[0]] = headerParts[1];
            }
        }

        return headers;
    };
    
    var getNamespace = function() {
        return NAMESPACE_PREFIX + (++namespaceCounter);
    };
    
    // Store a copy of the easyXDM library we just imported
    var xdmLocal = easyXDM;

    root.XdmHttp = Http.extend({
        init: function(remoteServer) {
            this._super(true);
            
            // Get a no conflict version of easyXDM
            var xdm = xdmLocal.noConflict(getNamespace());
       
            this.xhr = new xdm.Rpc(
                {
                    local: "name.html",
                    swf: remoteServer + "/static/xdm/easyxdm.swf",
                    remote: remoteServer + "/static/xdm/cors/index.html",
                    remoteHelper: remoteServer + "/static/xdm/name.html"
                }, 
                {
                    remote: {
                        request: {}
                    }
                }
            );
        },

        makeRequest: function(url, message, callback) {
            var params = {
                url: url,
                method: message.method,
                headers: message.headers,
                data: message.body
            };

            var success = utils.bind(this, function(res) {
                var data = res.data;
                var status = res.status;
                var headers = res.headers;
                
                var response = {
                    statusCode: status,
                    headers: headers,
                    request: {
                        headers: params.headers
                    }
                };
                
                var complete_response = this._buildResponse(null, response, data);
                callback(complete_response);
            });
            
            var error = utils.bind(this, function(res) {
                var data = res.data.data;
                var status = res.data.status;
                var message = res.message;
                var headers = res.data.headers;
                
                var response = {
                    statusCode: status,
                    headers: headers,
                    request: {
                        headers: params.headers
                    }
                };
                
                var complete_response = this._buildResponse(message, response, data);
                callback(complete_response);
            });
            
            this.xhr.request(params, success, error);
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();
});

require.define("/contrib/easyXDM/easyXDM.min.js", function (require, module, exports, __dirname, __filename) {
    /**
 * easyXDM
 * http://easyxdm.net/
 * Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function(N,d,p,K,k,H){var b=this;var n=Math.floor(Math.random()*10000);var q=Function.prototype;var Q=/^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/;var R=/[\-\w]+\/\.\.\//;var F=/([^:])\/\//g;var I="";var o={};var M=N.easyXDM;var U="easyXDM_";var E;var y=false;var i;var h;function C(X,Z){var Y=typeof X[Z];return Y=="function"||(!!(Y=="object"&&X[Z]))||Y=="unknown"}function u(X,Y){return !!(typeof(X[Y])=="object"&&X[Y])}function r(X){return Object.prototype.toString.call(X)==="[object Array]"}function c(){try{var X=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");i=Array.prototype.slice.call(X.GetVariable("$version").match(/(\d+),(\d+),(\d+),(\d+)/),1);h=parseInt(i[0],10)>9&&parseInt(i[1],10)>0;X=null;return true}catch(Y){return false}}var v,x;if(C(N,"addEventListener")){v=function(Z,X,Y){Z.addEventListener(X,Y,false)};x=function(Z,X,Y){Z.removeEventListener(X,Y,false)}}else{if(C(N,"attachEvent")){v=function(X,Z,Y){X.attachEvent("on"+Z,Y)};x=function(X,Z,Y){X.detachEvent("on"+Z,Y)}}else{throw new Error("Browser not supported")}}var W=false,J=[],L;if("readyState" in d){L=d.readyState;W=L=="complete"||(~navigator.userAgent.indexOf("AppleWebKit/")&&(L=="loaded"||L=="interactive"))}else{W=!!d.body}function s(){if(W){return}W=true;for(var X=0;X<J.length;X++){J[X]()}J.length=0}if(!W){if(C(N,"addEventListener")){v(d,"DOMContentLoaded",s)}else{v(d,"readystatechange",function(){if(d.readyState=="complete"){s()}});if(d.documentElement.doScroll&&N===top){var g=function(){if(W){return}try{d.documentElement.doScroll("left")}catch(X){K(g,1);return}s()};g()}}v(N,"load",s)}function G(Y,X){if(W){Y.call(X);return}J.push(function(){Y.call(X)})}function m(){var Z=parent;if(I!==""){for(var X=0,Y=I.split(".");X<Y.length;X++){Z=Z[Y[X]]}}return Z.easyXDM}function e(X){N.easyXDM=M;I=X;if(I){U="easyXDM_"+I.replace(".","_")+"_"}return o}function z(X){return X.match(Q)[3]}function f(X){return X.match(Q)[4]||""}function j(Z){var X=Z.toLowerCase().match(Q);var aa=X[2],ab=X[3],Y=X[4]||"";if((aa=="http:"&&Y==":80")||(aa=="https:"&&Y==":443")){Y=""}return aa+"//"+ab+Y}function B(X){X=X.replace(F,"$1/");if(!X.match(/^(http||https):\/\//)){var Y=(X.substring(0,1)==="/")?"":p.pathname;if(Y.substring(Y.length-1)!=="/"){Y=Y.substring(0,Y.lastIndexOf("/")+1)}X=p.protocol+"//"+p.host+Y+X}while(R.test(X)){X=X.replace(R,"")}return X}function P(X,aa){var ac="",Z=X.indexOf("#");if(Z!==-1){ac=X.substring(Z);X=X.substring(0,Z)}var ab=[];for(var Y in aa){if(aa.hasOwnProperty(Y)){ab.push(Y+"="+H(aa[Y]))}}return X+(y?"#":(X.indexOf("?")==-1?"?":"&"))+ab.join("&")+ac}var S=(function(X){X=X.substring(1).split("&");var Z={},aa,Y=X.length;while(Y--){aa=X[Y].split("=");Z[aa[0]]=k(aa[1])}return Z}(/xdm_e=/.test(p.search)?p.search:p.hash));function t(X){return typeof X==="undefined"}var O=function(){var Y={};var Z={a:[1,2,3]},X='{"a":[1,2,3]}';if(typeof JSON!="undefined"&&typeof JSON.stringify==="function"&&JSON.stringify(Z).replace((/\s/g),"")===X){return JSON}if(Object.toJSON){if(Object.toJSON(Z).replace((/\s/g),"")===X){Y.stringify=Object.toJSON}}if(typeof String.prototype.evalJSON==="function"){Z=X.evalJSON();if(Z.a&&Z.a.length===3&&Z.a[2]===3){Y.parse=function(aa){return aa.evalJSON()}}}if(Y.stringify&&Y.parse){O=function(){return Y};return Y}return null};function T(X,Y,Z){var ab;for(var aa in Y){if(Y.hasOwnProperty(aa)){if(aa in X){ab=Y[aa];if(typeof ab==="object"){T(X[aa],ab,Z)}else{if(!Z){X[aa]=Y[aa]}}}else{X[aa]=Y[aa]}}}return X}function a(){var Y=d.body.appendChild(d.createElement("form")),X=Y.appendChild(d.createElement("input"));X.name=U+"TEST"+n;E=X!==Y.elements[X.name];d.body.removeChild(Y)}function A(X){if(t(E)){a()}var Z;if(E){Z=d.createElement('<iframe name="'+X.props.name+'"/>')}else{Z=d.createElement("IFRAME");Z.name=X.props.name}Z.id=Z.name=X.props.name;delete X.props.name;if(X.onLoad){v(Z,"load",X.onLoad)}if(typeof X.container=="string"){X.container=d.getElementById(X.container)}if(!X.container){T(Z.style,{position:"absolute",top:"-2000px"});X.container=d.body}var Y=X.props.src;delete X.props.src;T(Z,X.props);Z.border=Z.frameBorder=0;Z.allowTransparency=true;X.container.appendChild(Z);Z.src=Y;X.props.src=Y;return Z}function V(aa,Z){if(typeof aa=="string"){aa=[aa]}var Y,X=aa.length;while(X--){Y=aa[X];Y=new RegExp(Y.substr(0,1)=="^"?Y:("^"+Y.replace(/(\*)/g,".$1").replace(/\?/g,".")+"$"));if(Y.test(Z)){return true}}return false}function l(Z){var ae=Z.protocol,Y;Z.isHost=Z.isHost||t(S.xdm_p);y=Z.hash||false;if(!Z.props){Z.props={}}if(!Z.isHost){Z.channel=S.xdm_c;Z.secret=S.xdm_s;Z.remote=S.xdm_e;ae=S.xdm_p;if(Z.acl&&!V(Z.acl,Z.remote)){throw new Error("Access denied for "+Z.remote)}}else{Z.remote=B(Z.remote);Z.channel=Z.channel||"default"+n++;Z.secret=Math.random().toString(16).substring(2);if(t(ae)){if(j(p.href)==j(Z.remote)){ae="4"}else{if(C(N,"postMessage")||C(d,"postMessage")){ae="1"}else{if(Z.swf&&C(N,"ActiveXObject")&&c()){ae="6"}else{if(navigator.product==="Gecko"&&"frameElement" in N&&navigator.userAgent.indexOf("WebKit")==-1){ae="5"}else{if(Z.remoteHelper){Z.remoteHelper=B(Z.remoteHelper);ae="2"}else{ae="0"}}}}}}}Z.protocol=ae;switch(ae){case"0":T(Z,{interval:100,delay:2000,useResize:true,useParent:false,usePolling:false},true);if(Z.isHost){if(!Z.local){var ac=p.protocol+"//"+p.host,X=d.body.getElementsByTagName("img"),ad;var aa=X.length;while(aa--){ad=X[aa];if(ad.src.substring(0,ac.length)===ac){Z.local=ad.src;break}}if(!Z.local){Z.local=N}}var ab={xdm_c:Z.channel,xdm_p:0};if(Z.local===N){Z.usePolling=true;Z.useParent=true;Z.local=p.protocol+"//"+p.host+p.pathname+p.search;ab.xdm_e=Z.local;ab.xdm_pa=1}else{ab.xdm_e=B(Z.local)}if(Z.container){Z.useResize=false;ab.xdm_po=1}Z.remote=P(Z.remote,ab)}else{T(Z,{channel:S.xdm_c,remote:S.xdm_e,useParent:!t(S.xdm_pa),usePolling:!t(S.xdm_po),useResize:Z.useParent?false:Z.useResize})}Y=[new o.stack.HashTransport(Z),new o.stack.ReliableBehavior({}),new o.stack.QueueBehavior({encode:true,maxLength:4000-Z.remote.length}),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"1":Y=[new o.stack.PostMessageTransport(Z)];break;case"2":Y=[new o.stack.NameTransport(Z),new o.stack.QueueBehavior(),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"3":Y=[new o.stack.NixTransport(Z)];break;case"4":Y=[new o.stack.SameOriginTransport(Z)];break;case"5":Y=[new o.stack.FrameElementTransport(Z)];break;case"6":if(!i){c()}Y=[new o.stack.FlashTransport(Z)];break}Y.push(new o.stack.QueueBehavior({lazy:Z.lazy,remove:true}));return Y}function D(aa){var ab,Z={incoming:function(ad,ac){this.up.incoming(ad,ac)},outgoing:function(ac,ad){this.down.outgoing(ac,ad)},callback:function(ac){this.up.callback(ac)},init:function(){this.down.init()},destroy:function(){this.down.destroy()}};for(var Y=0,X=aa.length;Y<X;Y++){ab=aa[Y];T(ab,Z,true);if(Y!==0){ab.down=aa[Y-1]}if(Y!==X-1){ab.up=aa[Y+1]}}return ab}function w(X){X.up.down=X.down;X.down.up=X.up;X.up=X.down=null}T(o,{version:"2.4.15.118",query:S,stack:{},apply:T,getJSONObject:O,whenReady:G,noConflict:e});o.DomHelper={on:v,un:x,requiresJSON:function(X){if(!u(N,"JSON")){d.write('<script type="text/javascript" src="'+X+'"><\/script>')}}};(function(){var X={};o.Fn={set:function(Y,Z){X[Y]=Z},get:function(Z,Y){var aa=X[Z];if(Y){delete X[Z]}return aa}}}());o.Socket=function(Y){var X=D(l(Y).concat([{incoming:function(ab,aa){Y.onMessage(ab,aa)},callback:function(aa){if(Y.onReady){Y.onReady(aa)}}}])),Z=j(Y.remote);this.origin=j(Y.remote);this.destroy=function(){X.destroy()};this.postMessage=function(aa){X.outgoing(aa,Z)};X.init()};o.Rpc=function(Z,Y){if(Y.local){for(var ab in Y.local){if(Y.local.hasOwnProperty(ab)){var aa=Y.local[ab];if(typeof aa==="function"){Y.local[ab]={method:aa}}}}}var X=D(l(Z).concat([new o.stack.RpcBehavior(this,Y),{callback:function(ac){if(Z.onReady){Z.onReady(ac)}}}]));this.origin=j(Z.remote);this.destroy=function(){X.destroy()};X.init()};o.stack.SameOriginTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa(ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:p.protocol+"//"+p.host+p.pathname,xdm_c:Y.channel,xdm_p:4}),name:U+Y.channel+"_provider"});ab=A(Y);o.Fn.set(Y.channel,function(ac){aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}})}else{aa=m().Fn.get(Y.channel,true)(function(ac){Z.up.incoming(ac,X)});K(function(){Z.up.callback(true)},0)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.FlashTransport=function(aa){var ac,X,ab,ad,Y,ae;function af(ah,ag){K(function(){ac.up.incoming(ah,ad)},0)}function Z(ah){var ag=aa.swf+"?host="+aa.isHost;var aj="easyXDM_swf_"+Math.floor(Math.random()*10000);o.Fn.set("flash_loaded"+ah.replace(/[\-.]/g,"_"),function(){o.stack.FlashTransport[ah].swf=Y=ae.firstChild;var ak=o.stack.FlashTransport[ah].queue;for(var al=0;al<ak.length;al++){ak[al]()}ak.length=0});if(aa.swfContainer){ae=(typeof aa.swfContainer=="string")?d.getElementById(aa.swfContainer):aa.swfContainer}else{ae=d.createElement("div");T(ae.style,h&&aa.swfNoThrottle?{height:"20px",width:"20px",position:"fixed",right:0,top:0}:{height:"1px",width:"1px",position:"absolute",overflow:"hidden",right:0,top:0});d.body.appendChild(ae)}var ai="callback=flash_loaded"+ah.replace(/[\-.]/g,"_")+"&proto="+b.location.protocol+"&domain="+z(b.location.href)+"&port="+f(b.location.href)+"&ns="+I;ae.innerHTML="<object height='20' width='20' type='application/x-shockwave-flash' id='"+aj+"' data='"+ag+"'><param name='allowScriptAccess' value='always'></param><param name='wmode' value='transparent'><param name='movie' value='"+ag+"'></param><param name='flashvars' value='"+ai+"'></param><embed type='application/x-shockwave-flash' FlashVars='"+ai+"' allowScriptAccess='always' wmode='transparent' src='"+ag+"' height='1' width='1'></embed></object>"}return(ac={outgoing:function(ah,ai,ag){Y.postMessage(aa.channel,ah.toString());if(ag){ag()}},destroy:function(){try{Y.destroyChannel(aa.channel)}catch(ag){}Y=null;if(X){X.parentNode.removeChild(X);X=null}},onDOMReady:function(){ad=aa.remote;o.Fn.set("flash_"+aa.channel+"_init",function(){K(function(){ac.up.callback(true)})});o.Fn.set("flash_"+aa.channel+"_onMessage",af);aa.swf=B(aa.swf);var ah=z(aa.swf);var ag=function(){o.stack.FlashTransport[ah].init=true;Y=o.stack.FlashTransport[ah].swf;Y.createChannel(aa.channel,aa.secret,j(aa.remote),aa.isHost);if(aa.isHost){if(h&&aa.swfNoThrottle){T(aa.props,{position:"fixed",right:0,top:0,height:"20px",width:"20px"})}T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:6,xdm_s:aa.secret}),name:U+aa.channel+"_provider"});X=A(aa)}};if(o.stack.FlashTransport[ah]&&o.stack.FlashTransport[ah].init){ag()}else{if(!o.stack.FlashTransport[ah]){o.stack.FlashTransport[ah]={queue:[ag]};Z(ah)}else{o.stack.FlashTransport[ah].queue.push(ag)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.PostMessageTransport=function(aa){var ac,ad,Y,Z;function X(ae){if(ae.origin){return j(ae.origin)}if(ae.uri){return j(ae.uri)}if(ae.domain){return p.protocol+"//"+ae.domain}throw"Unable to retrieve the origin of the event"}function ab(af){var ae=X(af);if(ae==Z&&af.data.substring(0,aa.channel.length+1)==aa.channel+" "){ac.up.incoming(af.data.substring(aa.channel.length+1),ae)}}return(ac={outgoing:function(af,ag,ae){Y.postMessage(aa.channel+" "+af,ag||Z);if(ae){ae()}},destroy:function(){x(N,"message",ab);if(ad){Y=null;ad.parentNode.removeChild(ad);ad=null}},onDOMReady:function(){Z=j(aa.remote);if(aa.isHost){var ae=function(af){if(af.data==aa.channel+"-ready"){Y=("postMessage" in ad.contentWindow)?ad.contentWindow:ad.contentWindow.document;x(N,"message",ae);v(N,"message",ab);K(function(){ac.up.callback(true)},0)}};v(N,"message",ae);T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:1}),name:U+aa.channel+"_provider"});ad=A(aa)}else{v(N,"message",ab);Y=("postMessage" in N.parent)?N.parent:N.parent.document;Y.postMessage(aa.channel+"-ready",Z);K(function(){ac.up.callback(true)},0)}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.FrameElementTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa.call(this,ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:j(p.href),xdm_c:Y.channel,xdm_p:5}),name:U+Y.channel+"_provider"});ab=A(Y);ab.fn=function(ac){delete ab.fn;aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}}}else{if(d.referrer&&j(d.referrer)!=S.xdm_e){N.top.location=S.xdm_e}aa=N.frameElement.fn(function(ac){Z.up.incoming(ac,X)});Z.up.callback(true)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.NameTransport=function(ab){var ac;var ae,ai,aa,ag,ah,Y,X;function af(al){var ak=ab.remoteHelper+(ae?"#_3":"#_2")+ab.channel;ai.contentWindow.sendMessage(al,ak)}function ad(){if(ae){if(++ag===2||!ae){ac.up.callback(true)}}else{af("ready");ac.up.callback(true)}}function aj(ak){ac.up.incoming(ak,Y)}function Z(){if(ah){K(function(){ah(true)},0)}}return(ac={outgoing:function(al,am,ak){ah=ak;af(al)},destroy:function(){ai.parentNode.removeChild(ai);ai=null;if(ae){aa.parentNode.removeChild(aa);aa=null}},onDOMReady:function(){ae=ab.isHost;ag=0;Y=j(ab.remote);ab.local=B(ab.local);if(ae){o.Fn.set(ab.channel,function(al){if(ae&&al==="ready"){o.Fn.set(ab.channel,aj);ad()}});X=P(ab.remote,{xdm_e:ab.local,xdm_c:ab.channel,xdm_p:2});T(ab.props,{src:X+"#"+ab.channel,name:U+ab.channel+"_provider"});aa=A(ab)}else{ab.remoteHelper=ab.remote;o.Fn.set(ab.channel,aj)}ai=A({props:{src:ab.local+"#_4"+ab.channel},onLoad:function ak(){var al=ai||this;x(al,"load",ak);o.Fn.set(ab.channel+"_load",Z);(function am(){if(typeof al.contentWindow.sendMessage=="function"){ad()}else{K(am,50)}}())}})},init:function(){G(ac.onDOMReady,ac)}})};o.stack.HashTransport=function(Z){var ac;var ah=this,af,aa,X,ad,am,ab,al;var ag,Y;function ak(ao){if(!al){return}var an=Z.remote+"#"+(am++)+"_"+ao;((af||!ag)?al.contentWindow:al).location=an}function ae(an){ad=an;ac.up.incoming(ad.substring(ad.indexOf("_")+1),Y)}function aj(){if(!ab){return}var an=ab.location.href,ap="",ao=an.indexOf("#");if(ao!=-1){ap=an.substring(ao)}if(ap&&ap!=ad){ae(ap)}}function ai(){aa=setInterval(aj,X)}return(ac={outgoing:function(an,ao){ak(an)},destroy:function(){N.clearInterval(aa);if(af||!ag){al.parentNode.removeChild(al)}al=null},onDOMReady:function(){af=Z.isHost;X=Z.interval;ad="#"+Z.channel;am=0;ag=Z.useParent;Y=j(Z.remote);if(af){Z.props={src:Z.remote,name:U+Z.channel+"_provider"};if(ag){Z.onLoad=function(){ab=N;ai();ac.up.callback(true)}}else{var ap=0,an=Z.delay/50;(function ao(){if(++ap>an){throw new Error("Unable to reference listenerwindow")}try{ab=al.contentWindow.frames[U+Z.channel+"_consumer"]}catch(aq){}if(ab){ai();ac.up.callback(true)}else{K(ao,50)}}())}al=A(Z)}else{ab=N;ai();if(ag){al=parent;ac.up.callback(true)}else{T(Z,{props:{src:Z.remote+"#"+Z.channel+new Date(),name:U+Z.channel+"_consumer"},onLoad:function(){ac.up.callback(true)}});al=A(Z)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.ReliableBehavior=function(Y){var aa,ac;var ab=0,X=0,Z="";return(aa={incoming:function(af,ad){var ae=af.indexOf("_"),ag=af.substring(0,ae).split(",");af=af.substring(ae+1);if(ag[0]==ab){Z="";if(ac){ac(true)}}if(af.length>0){aa.down.outgoing(ag[1]+","+ab+"_"+Z,ad);if(X!=ag[1]){X=ag[1];aa.up.incoming(af,ad)}}},outgoing:function(af,ad,ae){Z=af;ac=ae;aa.down.outgoing(X+","+(++ab)+"_"+af,ad)}})};o.stack.QueueBehavior=function(Z){var ac,ad=[],ag=true,aa="",af,X=0,Y=false,ab=false;function ae(){if(Z.remove&&ad.length===0){w(ac);return}if(ag||ad.length===0||af){return}ag=true;var ah=ad.shift();ac.down.outgoing(ah.data,ah.origin,function(ai){ag=false;if(ah.callback){K(function(){ah.callback(ai)},0)}ae()})}return(ac={init:function(){if(t(Z)){Z={}}if(Z.maxLength){X=Z.maxLength;ab=true}if(Z.lazy){Y=true}else{ac.down.init()}},callback:function(ai){ag=false;var ah=ac.up;ae();ah.callback(ai)},incoming:function(ak,ai){if(ab){var aj=ak.indexOf("_"),ah=parseInt(ak.substring(0,aj),10);aa+=ak.substring(aj+1);if(ah===0){if(Z.encode){aa=k(aa)}ac.up.incoming(aa,ai);aa=""}}else{ac.up.incoming(ak,ai)}},outgoing:function(al,ai,ak){if(Z.encode){al=H(al)}var ah=[],aj;if(ab){while(al.length!==0){aj=al.substring(0,X);al=al.substring(aj.length);ah.push(aj)}while((aj=ah.shift())){ad.push({data:ah.length+"_"+aj,origin:ai,callback:ah.length===0?ak:null})}}else{ad.push({data:al,origin:ai,callback:ak})}if(Y){ac.down.init()}else{ae()}},destroy:function(){af=true;ac.down.destroy()}})};o.stack.VerifyBehavior=function(ab){var ac,aa,Y,Z=false;function X(){aa=Math.random().toString(16).substring(2);ac.down.outgoing(aa)}return(ac={incoming:function(af,ad){var ae=af.indexOf("_");if(ae===-1){if(af===aa){ac.up.callback(true)}else{if(!Y){Y=af;if(!ab.initiate){X()}ac.down.outgoing(af)}}}else{if(af.substring(0,ae)===Y){ac.up.incoming(af.substring(ae+1),ad)}}},outgoing:function(af,ad,ae){ac.down.outgoing(aa+"_"+af,ad,ae)},callback:function(ad){if(ab.initiate){X()}}})};o.stack.RpcBehavior=function(ad,Y){var aa,af=Y.serializer||O();var ae=0,ac={};function X(ag){ag.jsonrpc="2.0";aa.down.outgoing(af.stringify(ag))}function ab(ag,ai){var ah=Array.prototype.slice;return function(){var aj=arguments.length,al,ak={method:ai};if(aj>0&&typeof arguments[aj-1]==="function"){if(aj>1&&typeof arguments[aj-2]==="function"){al={success:arguments[aj-2],error:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-2)}else{al={success:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-1)}ac[""+(++ae)]=al;ak.id=ae}else{ak.params=ah.call(arguments,0)}if(ag.namedParams&&ak.params.length===1){ak.params=ak.params[0]}X(ak)}}function Z(an,am,ai,al){if(!ai){if(am){X({id:am,error:{code:-32601,message:"Procedure not found."}})}return}var ak,ah;if(am){ak=function(ao){ak=q;X({id:am,result:ao})};ah=function(ao,ap){ah=q;var aq={id:am,error:{code:-32099,message:ao}};if(ap){aq.error.data=ap}X(aq)}}else{ak=ah=q}if(!r(al)){al=[al]}try{var ag=ai.method.apply(ai.scope,al.concat([ak,ah]));if(!t(ag)){ak(ag)}}catch(aj){ah(aj.message)}}return(aa={incoming:function(ah,ag){var ai=af.parse(ah);if(ai.method){if(Y.handle){Y.handle(ai,X)}else{Z(ai.method,ai.id,Y.local[ai.method],ai.params)}}else{var aj=ac[ai.id];if(ai.error){if(aj.error){aj.error(ai.error)}}else{if(aj.success){aj.success(ai.result)}}delete ac[ai.id]}},init:function(){if(Y.remote){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)){ad[ag]=ab(Y.remote[ag],ag)}}}aa.down.init()},destroy:function(){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)&&ad.hasOwnProperty(ag)){delete ad[ag]}}aa.down.destroy()}})};b.easyXDM=o})(window,document,location,window.setTimeout,decodeURIComponent,encodeURIComponent);
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
         * @param {Object} params Dictionary of optional parameters: scheme, host, port, username, password, owner, app, sessionKey
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
         * @param {String} app The specialized app of the new sevice
         * @return {Splunk.Client.Service} The specialized service.
         *
         * @module Splunk.Client.Service
         */
        specialize: function(owner, app) {
            return new root.Service(this.http, {
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
         *      apps.list(function(err, list) { console.log(list); });
         *
         * @return {Splunk.Client.Collection} The Applications collection
         *
         * @endpoint apps/local
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
         * @endpoint configs
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
         * @endpoint data/indexes
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
         * @endpoint properties
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
         * @endpoint saved/searches
         * @module Splunk.Client.Service
         * @see Splunk.Client.SavedSearches
         */
        savedSearches: function() {
            return new root.SavedSearches(this);
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
         *      jobs.list(function(err, list) {
         *          for(var i = 0; i < list.length; i++) {
         *              console.log("Job " + (i+1) + ": " + list[i].sid);
         *          }
         *      });
         *
         * @return {Splunk.Client.Jobs} The Jobs collection
         *
         * @endpoint search/jobs
         * @module Splunk.Client.Service
         * @see Splunk.Client.Jobs
         */
        jobs: function() {
            return new root.Jobs(this);  
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
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @endpoint search/jobs
         * @module Splunk.Client.Service
         */
        search: function(query, params, callback) {
            var jobs = new root.Jobs(this);
            jobs.search(query, params, callback);
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
         * @param {Function} callback A callback with the results of the job: `(err, results)`
         *
         * @endpoint search/jobs
         * @module Splunk.Client.Service
         */
        oneshotSearch: function(query, params, callback) {
            var jobs = new root.Jobs(this);
            jobs.oneshotSearch(query, params, callback);
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
            this._properties = properties || {};
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
         * @param {Function} callback A callback when the object is updated: `(err, entity)`
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
            
            this._invalidate();
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
     *
     * @endpoint saved/searches
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
     * @endpoint saved/searches/{name}
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
     * @endpoint apps/local
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
     * @endpoint apps/local/{name}
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
     * @endpoint data/indexes
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
         * @endpoint data/indexes
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
     * @endpoint data/indexes/name
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
     * @endpoint properties
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
         * @endpoint properties
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
     * @endpoint properties/{file_name}
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
         * @endpoint property/{file_name}
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
     * @endpoint properties/{file_name}/{stanza_name}
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
     * @endpoint properties
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
         * @endpoint properties
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
     * @endpoint configs/conf-{file}
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
         * @endpoint configs/conf-{file}
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
     * @endpoint configs/conf-{file}/{name}`
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
     * @endpoint search/jobs
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
         * Create an asyncronous search job
         *
         * @param {String} query The search query
         * @param {Object} params A dictionary of properties for the job.
         * @param {Function} callback A callback with the created job: `(err, createdJob)`
         *
         * @endpoint search/jobs
         * @module Splunk.Client.Jobs
         * @see Splunk.Client.Jobs.search
         */
        create: function(query, params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.search = query; 
            
            if ((params.exec_mode || "").toLowerCase() === "oneshot") {
                throw new Error("Please use Splunk.Client.Jobs.oneshotSearch for exec_mode=oneshot");
            }
            
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
         * @module Splunk.Client.Jobs
         */
        search: function(query, params, callback) {
            this.create(query, params, callback);
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
         * @module Splunk.Client.Jobs
         */
        oneshotSearch: function(query, params, callback) {
            callback = callback || function() {};
            params = params || {};
            params.search = query; 
            params.exec_mode = "oneshot";
            
            if (!params.search) {
                callback("Must provide a query to create a search job");
            } 

            var that = this;
            this.post("", params, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, response.odata.results);
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
     * @endpoint search/jobs/{search_id}
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
         * @module Splunk.Client.Job
         */
        cancel: function(callback) {
            this.post("control", {action: "cancel"}, callback);
            this._invalidate();
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
        setTimeout(function() {
            callback();   
        }, timeout);
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
                function(iterationDone) {
                    job.refresh(function(err, job) {
                        if (err) {
                            iterationDone(err);
                        }
                        
                        properties = job.properties() || {};
                        
                        // Dispatch for progress
                        manager._dispatchCallbacks(manager.onProgressCallbacks, properties);
                        
                        // Dispatch for failure if necessary
                        if (properties.isFailed) {
                            manager._dispatchCallbacks(manager.onFailCallbacks, properties);
                        }
                        
                        stopLooping = properties.isDone || manager.isJobDone || properties.isFailed;
                        Async.sleep(1000, iterationDone);
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

    Splunk.Logger.setLevel("ALL");
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

    Splunk.Logger.setLevel("ALL");
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
                    test.deepEqual(args.c, ["1", "2", "3"]);
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
                    test.deepEqual(args.c, ["1", "2", "3"]);
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
    var NodeHttp    = Splunk.NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp(false);
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}
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

    Splunk.Logger.setLevel("ALL");
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
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
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
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.strictEqual(res.status, 404);
                test.done();
            });
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
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
    var path         = require('path');
    var fs           = require('fs');
    var commander    = require('../contrib/commander');
    var utils        = require('../lib/utils');
    
    var DEFAULTS_PATHS = [
        process.env.HOME || process.env.HOMEPATH,
        path.resolve(__dirname, "..")
    ];
    
    var readDefaultsFile = function(path, defaults) {
        var contents = fs.readFileSync(path, "utf8") || "";
        var lines = contents.split("\n") || [];
        
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line !== "" && !utils.startsWith(line, "#")) {
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
    
    module.exports.create = function() {
        var parser = new commander.Command();
        var parse = parser.parse;
    
        parser.password = undefined;
    
        parser
            .option('-u, --username <username>', "Username to login with", undefined, true)
            .option('--password <password>', "Username to login with", undefined, false)
            .option('--scheme <scheme>', "Scheme to use", "https", false)
            .option('--host <host>', "Hostname to use", "localhost", false)
            .option('--port <port>', "Port to use", 8089, false)
            .option('--namespace <namespace>', "Namespace to use (of the form app:owner)", undefined, false);
        
        parser.parse = function(argv) {
            argv = (argv || []).slice(2);
            var defaults = getDefaults();
            for(var key in defaults) {
                if (defaults.hasOwnProperty(key) && argv.indexOf("--" + key) < 0) {
                    var value = defaults[key];
                    argv.unshift(value);
                    argv.unshift("--" + key.trim());
                }
            }
            
            argv.unshift("");
            argv.unshift("");
            
            var cmdline = parse.call(parser, argv);
            
            return cmdline;
        };
        
        parser.add = function(commandName, description, args, flags, required_flags, onAction) {
            var opts = {};
            flags = flags || [];
            
            var command = parser.command(commandName + (args ? " " + args : "")).description(description || "");
            
            // For each of the flags, add an option to the parser
            for(var i = 0; i < flags.length; i++) {
                var required = required_flags.indexOf(flags[i]) >= 0;
                var option = "<" + flags[i] + ">";
                command.option("--" + flags[i] + " " + option, "", undefined, required);
            }
            
            command.action(function() {
                var args = utils.toArray(arguments);
                args.unshift(commandName);
                onAction.apply(null, args);
            });
        };
        
        return parser;
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

    Splunk.Logger.setLevel("ALL");
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
                this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    job.cancel(function() {
                        test.done();
                    });
                }); 
            },

            "Callback#Create job error": function(test) {
                var sid = getNextId();
                this.service.jobs().search('index=_internal | head 1', {id: sid}, function(err) { 
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
                this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {   
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
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
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
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
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
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
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
                            service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
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
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
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
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
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
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
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
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
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
                            that.service.jobs().search(
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
                            that.service.jobs().search(
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
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
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
            },

            "Callback#Oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Service oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },
                        
            "Callback#Service search": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.search('search index=_internal | head 1 | stats count', {id: sid}, done);
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
                searches.contains("Indexing workload", function(err, found, search) {
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
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
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
    
    Splunk.Logger.setLevel("ALL");
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
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
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

exports.setup = function(svc, opts) {
    var Splunk  = require('../splunk').Splunk;
    var Async   = Splunk.Async;

    Splunk.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
        
    // initialize it with some dummy values
    var argv = ["program", "script"]; 
      
    return {  
        "Hello World Tests": {
            "Apps": function(test) {
                var main = require("../examples/node/helloworld/apps").main;
                main(opts, test.done);
            },
            
            "Apps#Async": function(test) {
                var main = require("../examples/node/helloworld/apps_async").main;
                main(opts, test.done);
            },
            
            "Saved Searches": function(test) {
                var main = require("../examples/node/helloworld/savedsearches").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Async": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_async").main;
                main(opts, test.done);
            },
            
            "Search#normal": function(test) {
                var main = require("../examples/node/helloworld/search_normal").main;
                main(opts, test.done);
            },
            
            "Search#blocking": function(test) {
                var main = require("../examples/node/helloworld/search_blocking").main;
                main(opts, test.done);
            },
            
            "Search#oneshot": function(test) {
                var main = require("../examples/node/helloworld/search_oneshot").main;
                main(opts, test.done);
            },
            
            "Search#realtime": function(test) {
                var main = require("../examples/node/helloworld/search_realtime").main;
                main(opts, test.done);
            }
        },
        
        "Jobs Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = require("../examples/node/jobs").main;
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "help": function(test) {
                this.run(null, null, null, function(err) {
                    test.ok(!!err);
                    test.done();
                });
            },
            
            "List jobs": function(test) {
                this.run("list", null, null, function(err) {
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
        },
        
        "Conf Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = require("../examples/node/conf").main;
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "help": function(test) {
                this.run(null, null, null, function(err) {
                    test.ok(!!err);
                    test.done();
                });
            },
            
            "List files": function(test) {
                this.run("files", null, null, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "List files with pattern": function(test) {
                this.run("files", ["^v"], null, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "List stanzas": function(test) {
                this.run("stanzas", ["web"], null, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Show non-existent contents": function(test) {
                this.run("contents", ["json", "settings"], null, function(err) {
                    test.ok(err);
                    test.done();
                });
            },
            
            "Show contents with specialization": function(test) {
                this.run("contents", ["json", "settings"], {app: "new_english"}, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Show contents with --global": function(test) {
                this.run("contents", ["json", "settings", "--global"], {}, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Edit contents with no user set": function(test) {
                this.run("edit", ["json", "settings", "foo", "bar"], {app: "new_english"}, function(err) {
                    test.ok(err);
                    test.done();
                });
            },
            
            "Edit contents": function(test) {
                this.run("edit", ["json", "settings", "foo", "bar"], {app: "new_english", user: "admin"}, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create file": function(test) {
                this.run("create", ["foo"], {app: "new_english", user: "admin"}, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create stanza": function(test) {
                var options = {
                    app: "new_english",
                    user: "admin"
                };
                
                var that = this;
                this.run("create", ["foo", "bar"], options, function(err) {
                    test.ok(!err);
                    that.run("delete", ["foo", "bar"], options, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Create key=value": function(test) {
                var options = {
                    app: "new_english",
                    user: "admin"
                };
                
                var that = this;
                this.run("create", ["foo", "bar", "abc", "123"], options, function(err) {
                    test.ok(!err);
                    that.run("delete", ["foo", "bar"], options, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Create+delete stanza": function(test) {
                var options = {
                    app: "new_english",
                    user: "admin"
                };
                
                var that = this;
                this.run("create", ["foo", "bar"], options, function(err) {
                    test.ok(!err);
                    that.run("delete", ["foo", "bar"], options, function(err) {
                        test.ok(!err);
                        test.done();
                    });
                });
            }
        },
        
        "Search Example Tests": {
            setUp: function(done) {   
                var context = this;
                
                this.main = require("../examples/node/search").main;
                this.run = function(command, args, options, callback) {                
                    var combinedArgs = argv.slice();
                    if (command) {
                        combinedArgs.push(command);
                    }
                    
                    if (args) {
                        for(var i = 0; i < args.length; i++) {
                            combinedArgs.push(args[i]);
                        }
                    }
                    
                    if (options) {
                        for(var key in options) {
                            if (options.hasOwnProperty(key)) {
                                combinedArgs.push("--" + key);
                                combinedArgs.push(options[key]);
                            }
                        }
                    }
              
                    return context.main(combinedArgs, callback);
                };
                
                done(); 
            },
            
            "Create regular search": function(test) {
                var options = {
                    search: "search index=_internal | head 5"
                };
                
                this.run(null, null, options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create regular search with verbose": function(test) {
                var options = {
                    search: "search index=_internal | head 5"
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create oneshot search": function(test) {
                var options = {
                    search: "search index=_internal | head 5",
                    exec_mode: "oneshot"
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Create normal search with reduced count": function(test) {
                var options = {
                    search: "search index=_internal | head 20",
                    count: 10
                };
                
                this.run(null, ["--verbose"], options, function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
        },
        
        "Results Example Tests": {
            
            "Parse row results": function(test) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 1 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        test.ok(!err);
                        job.results({json_mode: "rows"}, function(err, results) {
                            test.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });
                    }
                );
                
                main([], function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Parse column results": function(test) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 10 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        test.ok(!err);
                        job.results({json_mode: "column"}, function(err, results) {
                            test.ok(!err);
                            process.stdin.emit("data", JSON.stringify(results));
                            process.stdin.emit("end");
                        });    
                    }
                );
                
                main([], function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
            
            "Close stdin": function(test) {
                process.stdin.destroy();
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var Splunk      = require('../splunk').Splunk;
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var options = require('../internal/cmdline');    
    var parser  = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }    
    
    var svc = new Splunk.Client.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
    });
    
    var suite = exports.setup(svc, cmdline.opts);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
});

require.define("/examples/node/helloworld/apps.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, and then retrieve the list of applications,
// printing each application's name.

var Splunk = require('../../../splunk').Splunk;

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    // First, we log in
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        // Now that we're logged in, let's get a listing of all the apps.
        service.apps().list(function(err, apps) {
            if (err) {
                console.log("There was an error retrieving the list of applications:", err);
                done(err);
                return;
            }
            
            console.log("Applications:");
            for(var i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log("  App " + i + ": " + app.name);
            } 
            
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/apps_async.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, and then retrieve the list of applications,
// printing each application's name. It is the same as apps.js, except that it 
// uses the Async library

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Retrieve the apps
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.apps().list(done);
            },
            // Print them out
            function(apps, done) {            
                console.log("Applications:");
                for(var i = 0; i < apps.length; i++) {
                    var app = apps[i];
                    console.log("  App " + i + ": " + app.name);
                } 
                done();
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/savedsearches.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, and then retrieve the list of saved searchs,
// printing each saved search's name and search query.

var Splunk = require('../../../splunk').Splunk;

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    // First, we log in
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        // Now that we're logged in, let's get a listing of all the saved searches.
        service.savedSearches().list(function(err, searches) {
            if (err) {
                console.log("There was an error retrieving the list of saved searches:", err);
                done(err);
                return;
            }
            
            console.log("Saved searches:");
            for(var i = 0; i < searches.length; i++) {
                var search = searches[i];
                console.log("  Search " + i + ": " + search.name);
                console.log("    " + search.properties().search);
            } 
            
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/savedsearches_async.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, and then retrieve the list of saved searchs,
// printing each saved search's name and search query. It is the same as savedsearches.js, 
// except that it uses the Async library

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Retrieve the saved searches
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.savedSearches().list(done);
            },
            // Print them out
            function(searches, done) {
                console.log("Saved searches:");
                for(var i = 0; i < searches.length; i++) {
                    var search = searches[i];
                    console.log("  Search " + i + ": " + search.name);
                    console.log("    " + search.properties().search);
                } 
                
                done();
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/search_normal.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, perform a regular search, wait until
// it is done, and then print out the raw results and some key-value pairs

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.search("search index=_internal | head 3", {}, done);
            },
            // Wait until the job is done
            function(job, done) {
                Async.whilst(
                    // Loop until it is done
                    function() { return !job.properties().isDone; },
                    // Refresh the job on every iteration, but sleep for 1 second
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            // Refresh the job and note how many events we've looked at so far
                            job.refresh(function(err) {
                                console.log("-- refreshing, " + (job.properties().eventCount || 0) + " events so far");
                                iterationDone();
                            });
                        });
                    },
                    // When we're done, just pass the job forward
                    function(err) {
                        console.log("-- job done --");
                        done(err, job);
                    }
                );
            },
            // Print out the statistics and get the results
            function(job, done) {
                // Print out the statics
                console.log("Job Statistics: ");
                console.log("  Event Count: " + job.properties().eventCount);
                console.log("  Disk Usage: " + job.properties().diskUsage + " bytes");
                console.log("  Priority: " + job.properties().priority);
                
                // Ask the server for the results
                job.results({}, done);
            },
            // Print the raw results out
            function(results, job, done) {
                // Find the index of the fields we want
                var rawIndex = results.fields.indexOf("_raw");
                var sourcetypeIndex = results.fields.indexOf("sourcetype");
                var userIndex = results.fields.indexOf("user");
                
                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                // Once we're done, cancel the job.
                job.cancel(done);
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/search_blocking.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, perform a blocking search, and then print 
// out the raw results and some key-value pairs. A blocking search is one that 
// won't return until the search is complete.

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.search("search index=_internal | head 3", {exec_mode: "blocking"}, done);
            },
            // The job is done, but let's some statistics from the server.
            function(job, done) {
                job.read(done);
            },
            // Print out the statistics and get the results
            function(job, done) {
                // Print out the statics
                console.log("Job Statistics: ");
                console.log("  Event Count: " + job.properties().eventCount);
                console.log("  Disk Usage: " + job.properties().diskUsage + " bytes");
                console.log("  Priority: " + job.properties().priority);
                
                // Ask the server for the results
                job.results({}, done);
            },
            // Print the raw results out
            function(results, job, done) {
                // Find the index of the fields we want
                var rawIndex = results.fields.indexOf("_raw");
                var sourcetypeIndex = results.fields.indexOf("sourcetype");
                var userIndex = results.fields.indexOf("user");
                
                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                // Once we're done, cancel the job.
                job.cancel(done);
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/search_oneshot.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk, perform a oneshot search, and then print 
// out the raw results and some key-value pairs. A one search is one that 
// won't return until the search is complete and return all the search
// results in the response.

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.oneshotSearch("search index=_internal | head 3", {}, done);
            },
            // The job is done, and the results are returned inline
            function(results, done) {
                // Find the index of the fields we want
                var rawIndex = results.fields.indexOf("_raw");
                var sourcetypeIndex = results.fields.indexOf("sourcetype");
                var userIndex = results.fields.indexOf("user");
                
                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                done();
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/search_realtime.js", function (require, module, exports, __dirname, __filename) {
    
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

// This example will login to Splunk and perform a realtime search that counts
// how many events of each sourcetype we have seen. It will then print out
// this information every 1 second for a set number of iterations.

var Splunk = require('../../../splunk').Splunk;
var Async  = Splunk.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new Splunk.Client.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port
    });

    Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.search(
                    "search index=_internal | stats count by sourcetype", 
                    {earliest_time: "rt", latest_time: "rt"}, 
                    done);
            },
            // The search is never going to be done, so we simply poll it every second to get
            // more results
            function(job, done) {
                var MAX_COUNT = 5;
                var count = 0;
                
                Async.whilst(
                    // Loop for N times
                    function() { return MAX_COUNT > count; },
                    // Every second, ask for preview results
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            job.preview({}, function(err, results) {
                                if (err) {
                                    iterationDone(err);
                                }
                                
                                // Only do something if we have results
                                if (results.rows) {                                    
                                    // Up the iteration counter
                                    count++;
                                    
                                    console.log("========== Iteration " + count + " ==========");
                                    var sourcetypeIndex = results.fields.indexOf("sourcetype");
                                    var countIndex = results.fields.indexOf("count");
                                    
                                    for(var i = 0; i < results.rows.length; i++) {
                                        var row = results.rows[i];
                                        
                                        // This is a hacky "padding" solution
                                        var stat = ("  " + row[sourcetypeIndex] + "                         ").slice(0, 30);
                                        
                                        // Print out the sourcetype and the count of the sourcetype so far
                                        console.log(stat + row[countIndex]);   
                                    }
                                    
                                    console.log("=================================");
                                }
                                    
                                // And we're done with this iteration
                                iterationDone();
                            });
                        });
                    },
                    // When we're done looping, just cancel the job
                    function(err) {
                        job.cancel(done);
                    }
                );
            }
        ],
        function(err) {
            callback(err);        
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/jobs.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Splunk          = require('../../splunk').Splunk;
    var Class           = Splunk.Class;
    var utils           = Splunk.Utils;
    var Async           = Splunk.Async;
    var options         = require('../../internal/cmdline');

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

        run: function(command, args, options, callback) {
            var commands = {
                'cancel':       this.cancel,
                'create':       this.create,
                'events':       this.events,
                'list':         this.list,
                'preview':      this.preview,
                'results':      this.results
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
            handler(args, options, callback);
        },

        // Cancel the specified search jobs
        cancel: function(sids, options, callback) {
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
        events: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant events
            this._foreach(sids, function(job, idx, done) {
                job.events(options, function(err, data) {
                    console.log("===== EVENTS @ " + job.sid + " ====="); 
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = options.json_mode || "rows";
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
        create: function(args, options, callback) {
            // Get the query and parameters, and remove the extraneous
            // search parameter
            var query = options.search;
            var params = options;
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
        list: function(sids, options, callback) {
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
        preview: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant results
            this._foreach(sids, function(job, idx, done) {
                job.preview(options, function(err, data) {
                    console.log("===== PREVIEW @ " + job.sid + " ====="); 
                    if (err) {
                        done(err);
                        return;
                    }

                    var json_mode = options.json_mode || "rows";
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
        results: function(sids, options, callback) {
            // For each of the passed in sids, get the relevant results
            this._foreach(sids, function(job, idx, done) {
                job.results(options, function(err, data) {
                    console.log("===== RESULTS @ " + job.sid + " ====="); 
                    if (err) {
                        done(err);
                        return;
                    }
                    
                    var json_mode = options.json_mode || "rows";
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
        var cmdline = options.create();
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        
        var run = function(name) {  
            var options = arguments[arguments.length - 1];
                    
            // Create our service context using the information from the command line
            var svc = new Splunk.Client.Service({ 
                scheme: cmdline.opts.scheme,
                host: cmdline.opts.host,
                port: cmdline.opts.port,
                username: cmdline.opts.username,
                password: cmdline.opts.password
            });
            
            svc.login(function(err, success) {
               if (err) {
                   console.log("Error: " + err);
                   callback(err);
                   return;
               }
               
               var program = new Program(svc);
               
               program.run(name, cmdline.args, options.opts, function(err) {
                   if (err) {
                       callback(err);
                       return;
                   }
                   callback.apply(null, arguments);
               });
            });
        };
        
        cmdline.name = "jobs";
        cmdline.description("List, create and manage search jobs");
        
        cmdline.add("create",  "Create a new search job",                                "",             FLAGS_CREATE,   ["search"], run);
        cmdline.add("results", "Fetch results for the specified search jobs",            "<sids...>",    FLAGS_RESULTS,  [],         run);
        cmdline.add("preview", "Fetch preview results for the specified search jobs",    "<sids...>",    FLAGS_RESULTS,  [],         run);
        cmdline.add("events",  "Fetch events for the specified search jobs",             "<sids...>",    FLAGS_EVENTS,   [],         run);
        cmdline.add("cancel",  "Cancel the specify search jobs",                         "<sids...>",    [],             [],         run);
        cmdline.add("list",    "List all search jobs or properties for those specified", "[sids...]",    [],             [],         run);
        
        cmdline.parse(argv);
        
        // Try and parse the command line
        if (!cmdline.executedCommand) {
            console.log(cmdline.helpInformation());
            callback("You must specify a command to run.");
            return;
        }
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();
});

require.define("/examples/node/conf.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Splunk          = require('../../splunk').Splunk;
    var Class           = Splunk.Class;
    var utils           = Splunk.Utils;
    var Async           = Splunk.Async;
    var options         = require('../../internal/cmdline');

    var createService = function(options) {
        return new Splunk.Client.Service({
            scheme:     options.scheme,
            host:       options.host,
            port:       options.port,
            username:   options.username,
            password:   options.password
        });
    };
    
    var extractError = function(err) {
        if (err && err instanceof Error) {
            err = err.message;
        }
        
        if (err && err.odata) {
            err = err.odata.messages;
        }
        
        return err;
    };
    
    var Program = Class.extend({
        init: function(cmdline, callback) {
            this.cmdline = cmdline;
            this.callback = callback;
        },

        run: function() {
            var args = arguments;
            var that = this;
            
            this.service = createService(this.cmdline.opts);
            
            var commands = {
                files: this.files,
                stanzas: this.stanzas,
                contents: this.contents,
                edit: this.edit,
                create: this.create,
                "delete": this.del
            };
            
            this.service.login(function(err, success) {
                if (err || !success) {
                    that.callback(err || "Login failure");
                    return;
                }
                
                commands[that.cmdline.executedCommand].apply(that, args);    
            });
        },
        
        // List all the conf files that match the specified
        // pattern (or all of them if no pattern is specified).
        files: function(pattern, options, callback) {
            pattern = pattern || ".*";
            
            var service = this.service;
            Async.chain([
                    function(done) {
                        service.properties().list(done);
                    },
                    function(files, done) {
                        // Find all the files that match the pattern
                        var regex = new RegExp(pattern);
                        files = files.filter(function(file) {
                            return file.name.match(regex);
                        });
                        
                        // If there are any files, print their name
                        if (files.length > 0) {
                            console.log("Configuration Files: ");
                            files.forEach(function(file) {
                                console.log("  " + file.name);
                            });
                        }
                        
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // List all the stanzas in the specified conf file.
        stanzas: function(filename, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file '" + filename + "'");
                            return;
                        }
                        file.list(done);
                    },
                    function(stanzas, done) {
                        // If there any stanzas, print their names
                        if (stanzas.length > 0) {
                            console.log("Stanzas for '" + filename + "': ");
                            stanzas.forEach(function(stanza) {
                                console.log("  " + stanza.name);
                            });
                        }
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // List all the properties in the specified conf file::stanza
        contents: function(filename, stanzaName, options, callback) {
            var ignore = ["__id", "__metadata", "__name"];
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        // Find all the properties
                        var keys = [];
                        var properties = stanza.properties();
                        for(var key in properties) {
                            if (properties.hasOwnProperty(key) && ignore.indexOf(key) < 0) {
                                keys.push(key);
                            }
                        }
                        
                        // If there are any properties, print their name and value
                        if (keys.length > 0) {
                            console.log("Properties for " + filename + ".conf [" + stanzaName + "]: ");
                            keys.forEach(function(key) {
                                console.log("  " + key + ": " + properties[key]);
                            });
                        }
                        
                        done();
                    }
                ],
                function(err) {
                    callback(extractError(err));
                }
            );
        },
        
        // Edit the specified property in the specified conf file::stanza
        edit: function(filename, stanzaName, key, value, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        done(null, stanza);
                    },
                    function(stanza, done) {
                        // Update the property
                        var props = {};
                        props[key] = value;
                        stanza.update(props, done);                      
                    }
                ],
                function(err) {                    
                    if (!err) {
                        console.log("Set '" + key + "' to '" + value + "' in stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
        
        // Create the file, stanza and key
        create: function(filename, stanzaName, key, value, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            var collection = null;
            Async.chain([
                    function(done) {
                        collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        // If we can't find the file, create it
                        if (!found) {
                            collection.create(filename, function(err, file) {
                    
                                if (!err) {
                                    console.log("Created file '" + filename + "'");
                                }
                                
                                // Don't do anything with the stanza if we 
                                // didn't specify one
                                if (stanzaName) {
                                    done(null, null, null);
                                    return;   
                                }
                                
                                file.contains(stanzaName, done);
                            });
                            
                            return;
                        }
                        
                        // Don't do anything with the stanza if we 
                        // didn't specify one
                        if (!stanzaName) {
                            done(null, null, null);
                            return;
                        }
                        
                        file.contains(stanzaName, done);
                    },
                    function(found, stanza, done) {
                        if (!stanzaName) {
                            done(null, null);
                            return;
                        }
                        
                        // If we can't find the stanza, then create it
                        if (!found) {
                            var file = options.global ?
                                new Splunk.Client.PropertyFile(service, filename) :
                                new Splunk.Client.ConfigurationFile(service, filename);
                                
                            file.create(stanzaName, {}, function(err, stanza) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                
                                if (!err) {
                                    console.log("Created stanza '" + stanzaName + "' in file '" + filename + "'");
                                }
                                
                                stanza.refresh(done);
                            });
                            return;
                        }
                        
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        // If there is a key to update it,
                        // then update it.
                        if (stanzaName && key && value) {
                            var props = {};
                            props[key] = value;
                            stanza.update(props, done);
                            return;
                        }

                        done();
                    }
                ],
                function(err) {
                    if (key) {
                        console.log("Set '" + key + "' to '" + value + "' in stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
        
        // Delete the specified stanza in the specified conf file
        del: function(filename, stanzaName, options, callback) {
            var service = this.service;
            
            if (options.global && (!!options.app || !!options.user)) {
                callback("Cannot specify both --global and --user or --app");
                return;
            }
            
            // Specialize our service if necessary
            if (options.app || options.user) {
                service = service.specialize(options.user, options.app);
            }
            
            Async.chain([
                    function(done) {
                        var collection = options.global ? service.properties() : service.configurations();
                        collection.contains(filename, done);
                    },
                    function(found, file, done) {
                        if (!found) {
                            done("Could not find file: '" + filename + "'");
                            return;
                        }
                        file.contains(stanzaName, done);  
                    },
                    function(found, stanza, done) {
                        if (!found) {
                            done("Could not find stanza '" + stanzaName + "' in file '" + filename + "'");
                            return;
                        }
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    if (!err) {
                        console.log("Deleted stanza '" + stanzaName + "' in file '" + filename + "'");
                    }
                    
                    callback(extractError(err));
                }
            );
        },
    });

    exports.main = function(argv, callback) {     
        Splunk.Logger.setLevel("ALL");
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                console.log("=============="); 
            }
        };
        var cmdline = options.create();
        
        var program = new Program(cmdline, callback);
        
        cmdline.name = "conf";
        cmdline.description("View and edit configuration properties");
        
        cmdline
            .command("files [pattern]")
            .description("List all configuration files. Optional pattern to filter files")
            .action(function(pattern, options) {
                program.run(pattern, options, callback);
            });
            
        cmdline
            .command("stanzas <filename>")
            .description("List all stanzas in the specified configuration file")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, options) {
                program.run(filename, options, callback);
            });
            
        cmdline
            .command("contents <filename> <stanza>")
            .description("List all key=value properties of the specified file and stanza")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, options) {
                program.run(filename, stanza, options, callback);
            });
            
        cmdline
            .command("edit <filename> <stanza> <key> <value>")
            .description("Edit the specified stanza")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, key, value, options) {
                program.run(filename, stanza, key, value, options, callback);
            });
            
        cmdline
            .command("create <filename> [stanza] [key] [value]")
            .description("Create a file/stanza/key (will create up to the deepest level")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, key, value, options) {
                program.run(filename, stanza, key, value, options, callback);
            });
            
        cmdline
            .command("delete <filename> <stanza>")
            .description("Delete the stanza in the specified file")
            .option("-g, --global", "Get the contents of the file from the global (indexing) view.")
            .option("-u, --user <user>", "User context to look in")
            .option("-a, --app <app>", "App context to look in")
            .action(function(filename, stanza, options) {
                program.run(filename, stanza, options, callback);
            });
        
        cmdline.on('--help', function(){
            console.log("  Examples:");
            console.log("  ");
            console.log("  List all files:");
            console.log("  > node conf.js files");
            console.log("  ");
            console.log("  List all files which start with 'foo':");
            console.log("  > node conf.js files ^foo");
            console.log("  ");
            console.log("  List all stanzas in file 'foo':");
            console.log("  > node conf.js stanzas foo");
            console.log("  ");
            console.log("  List the content of stanza 'bar' in file 'foo':");
            console.log("  > node conf.js content foo bar");
            console.log("  ");
            console.log("  > List the content of stanza 'bar' in file 'foo' in the namespace of user1/app1:");
            console.log("  node conf.js content foo bar --user user1 --app app1");
            console.log("  ");
            console.log("  Set the key 'mykey' to value 'myval' in stanza 'bar' in file 'foo' in the namespace of user1/app1:");
            console.log("  > node conf.js edit foo bar mykey myvalue --user user1 --app app1");
            console.log("  ");
            console.log("  Create a file 'foo' in the namespace of user1/app1:");
            console.log("  > node conf.js create foo --user user1 --app app1");
            console.log("  ");
            console.log("  Create a stanza 'bar' in file 'foo' (and create if it doesn't exist) in the namespace of user1/app1:");
            console.log("  > node conf.js create foo bar --user user1 --app app1");
            console.log("  ");
            console.log("  Delete stanza 'bar' in file 'foo':");
            console.log("  > node conf.js delete foo bar");
            console.log("  ");
            
        });
        cmdline.parse(argv);
        
        // Try and parse the command line
        if (!cmdline.executedCommand) {
            console.log(cmdline.helpInformation());
            cmdline.emit("--help");
            callback("You must specify a command to run.");
            return;
        }
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();
});

require.define("/examples/node/search.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Splunk          = require('../../splunk').Splunk;
    var Class           = Splunk.Class;
    var utils           = Splunk.Utils;
    var Async           = Splunk.Async;
    var options         = require('../../internal/cmdline');
    var print           = require('util').print;
    
    var FLAGS_CREATE = [
        "search", "earliest_time", "latest_time", "now", "time_format",
        "exec_mode", "search_mode", "rt_blocking", "rt_queue_size",
        "rt_maxblocksecs", "rt_indexfilter", "id", "status_buckets",
        "max_count", "max_time", "timeout", "auto_finalize_ec", "enable_lookups",
        "reload_macros", "reduce_freq", "spawn_process", "required_field_list",
        "rf", "auto_cancel", "auto_pause"
    ];

    var createService = function(options) {
        return new Splunk.Client.Service({
            scheme:     options.scheme,
            host:       options.host,
            port:       options.port,
            username:   options.username,
            password:   options.password
        });
    };
    
    var search = function(service, options, callback) {
        // Extract the options we care about and delete them
        // the object
        var query = options.search;
        var isVerbose = options.verbose;
        var count = options.count || 0;
        var mode = options.mode || "row";
        delete options.search;
        delete options.verbose;
        delete options.count;
        delete options.mode;
        
        Async.chain([
                // Create a search
                function(done) {
                    service.search(query, options, done);
                },
                // Poll until the search is complete
                function(job, done) {
                    Async.whilst(
                        function() { return !job.properties().isDone; },
                        function(iterationDone) {
                            job.refresh(function(err, job) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    // If the user asked for verbose output,
                                    // then write out the status of the search
                                    var properties = job.properties();
                                    if (isVerbose) {
                                        var progress    = (properties.doneProgress * 100.0) + "%";
                                        var scanned     = properties.scanCount;
                                        var matched     = properties.eventCount;
                                        var results     = properties.resultCount;
                                        var stats = "-- " +
                                            progress + " done | " +
                                            scanned  + " scanned | " +
                                            matched  + " matched | " +
                                            results  + " results";
                                        print("\r" + stats + "                                          ");
                                    }
                                    
                                    Async.sleep(1000, iterationDone);
                                }
                            });
                        },
                        function(err) {
                            if (isVerbose) {
                                print("\r");
                            }
                            done(err, job);
                        }
                    );
                },
                // Once the search is done, get the results
                function(job, done) {
                    job.results({count: count, json_mode: mode}, done);
                },
                // Print them out (as JSON), and cancel the job
                function(results, job, done) {
                    process.stdout.write(JSON.stringify(results));
                    job.cancel(done);
                }
            ],
            function(err) {
                callback(err);
            }
        );
    };
    
    var oneshotSearch = function(service, options, callback) {
        var query = options.search;
        delete options.search;
        
        // Oneshot searches don't have a job associated with them, so we
        // simply execute it and print out the results.
        service.oneshotSearch(query, options, function(err, results) {
            if (err) {
                callback(err);
            }
            else { 
                console.log(JSON.stringify(results));
                callback();
            }
        });
    };

    exports.main = function(argv, callback) {     
        Splunk.Logger.setLevel("NONE");
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
            }
            else {
                callback();
            }
        };
        var cmdline = options.create();
        
        cmdline.name = "search";
        cmdline.description("Create a search and print the results to stdout");
        cmdline.option("--verbose", "Output job progress as we wait for completion");
        cmdline.option("--count <count>", "How many results to fetch");
        cmdline.option("--mode <mode>", "Row or column mode [row|column]");
        
        // For each of the flags, add an option to the parser
        var flags = FLAGS_CREATE;
        var required_flags = ["search"];
        
        for(var i = 0; i < flags.length; i++) {
            var required = required_flags.indexOf(flags[i]) >= 0;
            var option = "<" + flags[i] + ">";
            cmdline.option("--" + flags[i] + " " + option, "", undefined, required);
        }
        
        cmdline.on('--help', function(){
            console.log("  Examples:");
            console.log("  ");
            console.log("  Create a regular search:");
            console.log("  > node search.js --search 'search index=_internal | head 10'");
            console.log("  ");
            console.log("  Create a oneshot search:");
            console.log("  > node search.js --search 'search index=_internal | head 10' --exec_mode oneshot");
            console.log("  ");
            console.log("  Create a regular search and only return 10 results:");
            console.log("  > node search.js --search 'search index=_internal | head 20' --count 10");
            console.log("  ");
            console.log("  Create a regular search and output the progress while the search is running");
            console.log("  > node search.js --search 'search index=_internal | head 20' --verbose");
            console.log("  ");
        });
        
        cmdline.parse(argv);
        
        var service = createService(cmdline.opts);
        service.login(function(err, success) {
            if (err || !success) {
                callback("Error logging in");
                return;
            }
            
            delete cmdline.username;
            delete cmdline.password;
            delete cmdline.scheme;
            delete cmdline.host;
            delete cmdline.port;
            delete cmdline.namespace;
            
            if (cmdline.opts.exec_mode === "oneshot") {
                oneshotSearch(service, cmdline.opts, callback);
            }
            else {
                search(service, cmdline.opts, callback);
            }
        });
    };
    
    if (module === require.main) {
        exports.main(process.argv);
    }
})();
});

require.define("util", function (require, module, exports, __dirname, __filename) {
    // todo

});

require.define("/examples/node/results.js", function (require, module, exports, __dirname, __filename) {
    
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
    var Splunk          = require('../../splunk').Splunk;
    var Class           = Splunk.Class;
    var utils           = Splunk.Utils;
    var Async           = Splunk.Async;
    var options         = require('../../internal/cmdline');
    
    var createService = function(options) {
        return new Splunk.Client.Service({
            scheme:     options.scheme,
            host:       options.host,
            port:       options.port,
            username:   options.username,
            password:   options.password
        });
    };
    
    // Print the result rows
    var printRows = function(results) {        
        for(var i = 0; i < results.rows.length; i++) {
            console.log("Result " + (i + 1) + ": ");
            var row = results.rows[i];
            for(var j = 0; j < results.fields.length; j++) {
                var field = results.fields[j];
                var value = row[j];
                
                console.log("  " + field + " = " + value);
            }
        }
    };
    
    // Instead of trying to print the column-major format, we just 
    // transpose it
    var transpose = function(results) {
        var rows = [];
        var cols = results.columns;
        
        var mapFirst = function(col) { return col.shift(); };
        
        while(cols.length > 0 && cols[0].length > 0) {
            rows.push(cols.map(mapFirst));   
        }
        
        results.rows = rows;
        return results;
    };
    
    // Print the results
    var printResults = function(results) {
        if (results) {
            var isRows = !!results.rows;
            var numResults = (results.rows ? results.rows.length : (results.columns[0] || []).length);
            
            console.log("====== " + numResults + " RESULTS (preview: " + !!results.preview + ") ======");
            
            // If it is in column-major form, transpose it.
            if (!isRows) {
                results = transpose(results);
            }
            
            printRows(results);
        }
    };

    exports.main = function(argv, callback) {     
        Splunk.Logger.setLevel("NONE");
        
        // Read data from stdin
        var incomingResults = "";
        var onData = function(data) {
            incomingResults += data.toString("utf-8"); 
        };
        
        // When there is no more data, parse it and pretty
        // print it
        var onEnd = function() {
            var results = JSON.parse(incomingResults || "{}");
            printResults(results);
            callback();
        };
        
        var onError = function() {
            callback("ERROR");
        };
        
        // Unregister all the listeners when we're done
        var originalCallback = callback || function() {};
        callback = function() {
            process.stdin.removeListener("data", onData);
            process.stdin.removeListener("end", onEnd);
            process.stdin.removeListener("error", onError);
            process.stdin.pause();
            
            originalCallback.apply(null, arguments);  
        };
        
        process.stdin.on("data", onData);
        process.stdin.on("end", onEnd);
        process.stdin.on("error", onError);
        
        process.stdin.resume();
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

window.SplunkTest = {
    Utils    : require('../tests/test_utils'),
    Async    : require('../tests/test_async'),
    Http     : require('../tests/test_http'),
    Binding  : require('../tests/test_binding'),
    Client   : require('../tests/test_client'),
    Searcher : require('../tests/test_searcher'),
    Examples : require('../tests/test_examples')
};
});
require("/browser.test.entry.js");


})();