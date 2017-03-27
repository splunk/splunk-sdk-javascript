(function() {

var __exportName = 'splunkjs';

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
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
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
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
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

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

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
module.exports = {"main":"index.js"}
});

require.define("/index.js", function (require, module, exports, __dirname, __filename) {

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

    module.exports = root = {
        Logger          : require('./lib/log').Logger,
        Context         : require('./lib/context'),
        Service         : require('./lib/service'),
        Http            : require('./lib/http'),
        Utils           : require('./lib/utils'),
        Async           : require('./lib/async'),
        Paths           : require('./lib/paths').Paths,
        Class           : require('./lib/jquery.class').Class,
        ModularInputs   : require('./lib/modularinputs')
    };
    
    if (typeof(window) === 'undefined') {
        root.NodeHttp = require('./lib/platform/node/node_http').NodeHttp;
    }
})();
});

require.define("/lib/log.js", function (require, module, exports, __dirname, __filename) {
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
    var utils = require('./utils');
    
    var root = exports || this;

    var levels = {
        "ALL": 4,
        "INFO": 3,
        "WARN": 2,
        "ERROR": 1,
        "NONE": 0
    };

    // Normalize the value of the environment variable $LOG_LEVEL to
    // an integer (look up named levels like "ERROR" in levels above),
    // and default to "ERROR" if there is no value or an invalid value
    // set.
    var setLevel = function(level) {    
        if (utils.isString(level) && levels.hasOwnProperty(level)) {
            process.env.LOG_LEVEL = levels[level];
        } 
        else if (!isNaN(parseInt(level, 10)) &&
                   utils.keyOf(parseInt(level, 10), levels)) {
            process.env.LOG_LEVEL = level;
        } 
        else {
            process.env.LOG_LEVEL = levels["ERROR"];                
        }
    };

    if (process.env.LOG_LEVEL) {
        setLevel(process.env.LOG_LEVEL);
    } 
    else {
        process.env.LOG_LEVEL = levels["ERROR"];
    }

    // Set the actual output functions
    // This section is not covered by unit tests, since there's no
    // straightforward way to control what the console object will be.
    var _log, _warn, _error, _info;
    _log = _warn = _error = _info = function() {};
    if (typeof(console) !== "undefined") {

        var logAs = function(level) {
            return function(str) {
                try { 
                    console[level].apply(console, arguments);
                }
                catch(ex) { 
                    console[level](str);
                }
            };
        };

        if (console.log) { _log = logAs("log"); }
        if (console.error) { _error = logAs("error"); }
        if (console.warn) { _warn = logAs("warn"); }
        if (console.info) { _info = logAs("info"); }
    }

    /**
     * A controllable logging module that lets you display different types of
     * debugging information to the console.  
     *
     * @module splunkjs.Logger
     */
    exports.Logger = {
        /**
         * Logs debug messages to the console. This function is the same as 
         * `console.log`.
         *
         * @function splunkjs.Logger
         */
        log: function() {
            if (process.env.LOG_LEVEL >= levels.ALL) {
                _log.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug errors to the console. This function is the same as 
         * `console.error`.
         *
         * @function splunkjs.Logger
         */
        error: function() {
            if (process.env.LOG_LEVEL >= levels.ERROR) {
                _error.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug warnings to the console. This function is the same as 
         * `console.warn`.
         *
         * @function splunkjs.Logger
         */
        warn: function() {
            if (process.env.LOG_LEVEL >= levels.WARN) {
                _warn.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug info to the console. This function is the same as 
         * `console.info`.
         *
         * @function splunkjs.Logger
         */
        info: function() {
            if (process.env.LOG_LEVEL >= levels.INFO) {
                _info.apply(null, arguments);
            }
        },
        
        /**
         * Prints all messages that are retrieved from the splunkd server to the
         * console.
         *
         * @function splunkjs.Logger
         */
        printMessages: function(allMessages) {
            allMessages = allMessages || [];
            
            for(var i = 0; i < allMessages.length; i++) {
                var message = allMessages[i];
                var type = message["type"];
                var text = message["text"];
                var msg = '[SPLUNKD] ' + text;
                switch (type) {
                    case 'HTTP':
                    case 'FATAL':
                    case 'ERROR':
                        this.error(msg);
                        break;
                    case 'WARN':
                        this.warn(msg);
                        break;
                    case 'INFO':
                        this.info(msg);
                        break;
                    case 'HTTP':
                        this.error(msg);
                        break;
                    default:
                        this.info(msg);
                        break;
                }
            }  
        },
        
        /**
         * Sets the global logging level to indicate which information to log.
         *
         * @example
         *
         *      splunkjs.Logger.setLevel("WARN");
         *      splunkjs.Logger.setLevel(0); // equivalent to NONE
         *
         * @param {String|Number} level A string or number ("ALL" = 4 | "INFO" = 3 | "WARN" = 2 | "ERROR" = 1 | "NONE" = 0) indicating the logging level.
         *
         * @function splunkjs.Logger
         */
        setLevel: function(level) { setLevel.apply(this, arguments); },
        
        /*!*/
        levels: levels
    };
})();

});

require.define("/lib/utils.js", function (require, module, exports, __dirname, __filename) {
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

    var fs   = require("fs");
    var path = require("path");
    var root = exports || this;

    /**
     * Provides various utility functions, which are mostly modeled after 
     * [Underscore.js](http://documentcloud.github.com/underscore/).
     *
     * @module splunkjs.Utils
     */

    /**
     * Binds a function to a specific object.
     *
     * @example
     *      
     *      var obj = {a: 1, b: function() { console.log(a); }};
     *      var bound = splunkjs.Utils.bind(obj, obj.b);
     *      bound(); // prints 1
     *
     * @param {Object} me The object to bind to.
     * @param {Function} fn The function to bind.
     * @return {Function} The bound function.
     *
     * @function splunkjs.Utils
     */
    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };
    
    /**
     * Strips a string of all leading and trailing whitespace characters.
     *
     * @example
     *      
     *      var a = " aaa ";
     *      var b = splunkjs.Utils.trim(a); //== "aaa"
     *
     * @param {String} str The string to trim.
     * @return {String} The trimmed string.
     *
     * @function splunkjs.Utils
     */
    root.trim = function(str) {
        str = str || "";
        
        if (String.prototype.trim) {
            return String.prototype.trim.call(str);
        }
        else {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');   
        }
    };
    
    /**
     * Searches an array for a specific object and returns its location.
     *
     * @example
     *      
     *      var a = ["a", "b', "c"];
     *      console.log(splunkjs.Utils.indexOf(a, "b")) //== 1
     *      console.log(splunkjs.Utils.indexOf(a, "d")) //== -1
     *
     * @param {Array} arr The array to search in.
     * @param {Anything} search The object to search for.
     * @return {Number} The index of the object (`search`), or `-1` if the object wasn't found.
     *
     * @function splunkjs.Utils
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
     * Indicates whether an array contains a specific object.
     *
     * @example
     *      
     *      var a = {a: 3};
     *      var b = [{}, {c: 1}, {b: 1}, a];
     *      var contained = splunkjs.Utils.contains(b, a); // true
     *
     * @param {Array} arr The array to search in.
     * @param {Anything} obj The object to search for.
     * @return {Boolean} `true` if the array contains the object, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.contains = function(arr, obj) {
        arr = arr || [];
        return (root.indexOf(arr, obj) >= 0);
    };

    /**
     * Indicates whether a string starts with a specific prefix.
     *
     * @example
     *      
     *      var starts = splunkjs.Utils.startsWith("splunk-foo", "splunk-");
     *
     * @param {String} original The string to search in.
     * @param {String} prefix The prefix to search for.
     * @return {Boolean} `true` if the string starts with the prefix, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.startsWith = function(original, prefix) {
        var matches = original.match("^" + prefix);
        return matches && matches.length > 0 && matches[0] === prefix;  
    };

    /**
     * Indicates whether a string ends with a specific suffix.
     *
     * @example
     *      
     *      var ends = splunkjs.Utils.endsWith("foo-splunk", "-splunk");
     *
     * @param {String} original The string to search in.
     * @param {String} suffix The suffix to search for.
     * @return {Boolean} `true` if the string ends with the suffix, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.endsWith = function(original, suffix) {
        var matches = original.match(suffix + "$");
        return matches && matches.length > 0 && matches[0] === suffix;  
    };
    
    var toString = Object.prototype.toString;
    
    /**
     * Converts an iterable to an array.
     *
     * @example
     *      
     *      function() { 
     *          console.log(arguments instanceof Array); // false
     *          var arr = console.log(splunkjs.Utils.toArray(arguments) instanceof Array); // true
     *      }
     *
     * @param {Arguments} iterable The iterable to convert.
     * @return {Array} The converted array.
     *
     * @function splunkjs.Utils
     */
    root.toArray = function(iterable) {
        return Array.prototype.slice.call(iterable);
    };
    
    /**
     * Indicates whether an argument is an array.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isArray(arguments)); // false
     *          console.log(splunkjs.Utils.isArray([1,2,3])); // true
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is an array, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    /**
     * Indicates whether an argument is a function.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isFunction([1,2,3]); // false
     *          console.log(splunkjs.Utils.isFunction(function() {})); // true
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is a function, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isFunction = function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    };

    /**
     * Indicates whether an argument is a number.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isNumber(1); // true
     *          console.log(splunkjs.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is a number, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isNumber = function(obj) {
        return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
    };
    
    /**
     * Indicates whether an argument is a string.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isString("abc"); // true
     *          console.log(splunkjs.Utils.isString(function() {})); // false
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is a string, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isString = function(obj) {
        return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    };
    
    /**
     * Indicates whether an argument is an object.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isObject({abc: "abc"}); // true
     *          console.log(splunkjs.Utils.isObject("abc"); // false
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is an object, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isObject = function(obj) {
        /*jslint newcap:false */
        return obj === Object(obj);
    };
    
    /**
     * Indicates whether an argument is empty.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isEmpty({})); // true
     *          console.log(splunkjs.Utils.isEmpty({a: 1})); // false
     *      }
     *
     * @param {Anything} obj The argument to evaluate.
     * @return {Boolean} `true` if the argument is empty, `false` if not.
     *
     * @function splunkjs.Utils
     */
    root.isEmpty = function(obj) {
        if (root.isArray(obj) || root.isString(obj)) {
            return obj.length === 0;
        }
        
        for (var key in obj) {
            if (this.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        
        return true;
    };
    
    /**
     * Applies an iterator function to each element in an object.
     *
     * @example
     *      
     *      splunkjs.Utils.forEach([1,2,3], function(el) { console.log(el); }); // 1,2,3
     *
     * @param {Object|Array} obj An object or array.
     * @param {Function} iterator The function to apply to each element: `(element, list, index)`.
     * @param {Object} context A context to apply to the function (optional).
     *
     * @function splunkjs.Utils
     */
    root.forEach = function(obj, iterator, context) {
        if (obj === null) {
            return;
        }
        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
            obj.forEach(iterator, context);
        } 
        else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === {}) {
                    return;
                }
            }
        } 
        else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (iterator.call(context, obj[key], key, obj) === {}) {
                        return;
                    }
                }
            }
        }
    };
    
    /**
     * Extends a given object with all the properties from other source objects.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.extend({foo: "bar"}, {a: 2})); // {foo: "bar", a: 2}
     *      }
     *
     * @param {Object} obj The object to extend.
     * @param {Object...} sources The source objects from which to take properties.
     * @return {Object} The extended object.
     *
     * @function splunkjs.Utils
     */
    root.extend = function(obj) {
        root.forEach(Array.prototype.slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        });
        return obj;
    };
  
    /**
     * Creates a shallow-cloned copy of an object or array.
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.clone({foo: "bar"})); // {foo: "bar"}
     *          console.log(splunkjs.Utils.clone([1,2,3])); // [1,2,3]
     *      }
     *
     * @param {Object|Array} obj The object or array to clone.
     * @return {Object|Array} The cloned object or array.
     *
     * @function splunkjs.Utils
     */
    root.clone = function(obj) {
        if (!root.isObject(obj)) {
            return obj;
        }
        return root.isArray(obj) ? obj.slice() : root.extend({}, obj);
    };
    
    /**
     * Extracts namespace information from a dictionary of properties. Namespace
     * information includes values for _owner_, _app_, and _sharing_.
     *
     * @param {Object} props The dictionary of properties.
     * @return {Object} Namespace information from the properties dictionary.
     *
     * @function splunkjs.Utils
     */
    root.namespaceFromProperties = function(props) {
        if (root.isUndefined(props) || root.isUndefined(props.acl)) {
            return {
                owner: '',
                app: '',
                sharing: ''
            };
        }
        return {
            owner: props.acl.owner,
            app: props.acl.app,
            sharing: props.acl.sharing
        };
    };  

    /**
      * Tests whether a value appears in a given object.
      *
      * @param {Anything} val The value to search for.
      * @param {Object} obj The object to search in.
      *
      * @function splunkjs.Utils
      */
    root.keyOf = function(val, obj) {
        for (var k in obj) {
            if (obj.hasOwnProperty(k) && obj[k] === val) {
                return k;
            }
        }
        return undefined;
    };

    /**
     * Finds a version in a dictionary.
     *
     * @param {String} version The version to search for.
     * @param {Object} map The dictionary to search.
     * @return {Anything} The value of the dictionary at the closest version match.
     *
     * @function splunkjs.Utils
     */
    root.getWithVersion = function(version, map) {
        map = map || {};
        var currentVersion = (version + "") || "";
        while (currentVersion !== "") {
            if (map.hasOwnProperty(currentVersion)) {
                return map[currentVersion];
            }
            else {
                currentVersion = currentVersion.slice(
                    0, 
                    currentVersion.lastIndexOf(".")
                );
            }
        }
        
        return map["default"];
    };

    /**
     * Checks if an object is undefined.
     *
     * @param {Object} obj An object.
     * @return {Boolean} `true` if the object is undefined, `false` if not.
     */
    root.isUndefined = function (obj) {
        return (typeof obj === "undefined");
    };

    /**
     * Read files in a way that makes unit tests work as well.
     *
     * @example
     *
     *      // To read `splunk-sdk-javascript/tests/data/empty_data_model.json`  
     *      // from    `splunk-sdk-javascript/tests/test_service.js`
     *      var fileContents = utils.readFile(__filename, "../data/empty_data_model.json");
     *      
     * @param {String} __filename of the script calling this function.
     * @param {String} a path relative to the script calling this function.
     * @return {String} The contents of the file.
     */
    root.readFile = function(filename, relativePath) {
        return fs.readFileSync(path.resolve(filename, relativePath)).toString();
    };

})();
});

require.define("fs", function (require, module, exports, __dirname, __filename) {
// nothing to see here... no file methods for the browser

});

require.define("/lib/context.js", function (require, module, exports, __dirname, __filename) {
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
        "default": ""
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
         *    - `scheme` (_string_): The scheme ("http" or "https") for accessing Splunk.
         *    - `host` (_string_): The host name (the default is "localhost").
         *    - `port` (_integer_): The port number (the default is 8089).
         *    - `username` (_string_): The Splunk account username, which is used to authenticate the Splunk instance.
         *    - `password` (_string_): The password, which is used to authenticate the Splunk instance.
         *    - `owner` (_string_): The owner (username) component of the namespace.
         *    - `app` (_string_): The app component of the namespace.
         *    - `sessionKey` (_string_): The current session token.
         *    - `autologin` (_boolean_): `true` to automatically try to log in again if the session terminates, `false` if not (`true` by default).
         *    - 'timeout' (_integer): The connection timeout in milliseconds. ('0' by default).
         *    - `version` (_string_): The version string for Splunk, for example "4.3.2" (the default is "5.0").
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
            this.timeout       = params.timeout || 0;
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
            if (this.sessionKey) {
                headers["Authorization"] = this.authorization + " " + this.sessionKey;
            }
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
         * Converts a partial path to a fully-qualified path to a REST endpoint,
         * and if necessary includes the namespace owner and app.
         *
         * @param {String} path The partial path.
         * @param {String} namespace The namespace, in the format "_owner_/_app_".
         * @return {String} The fully-qualified path.
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

            return utils.trim("/servicesNS/" + encodeURIComponent(owner) + "/" + encodeURIComponent(app) + "/" + path);
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
         * @param {Function} callback The function to call when login has finished: `(err, wasSuccessful)`.
         *
         * @method splunkjs.Context
         * @private
         */
        login: function(callback) {
            var that = this;
            var url = this.paths.login;
            var params = {
                username: this.username,
                password: this.password,
                cookie  : '1'
            };

            callback = callback || function() {};
            var wrappedCallback = function(err, response) {
                // Let's make sure that not only did the request succeed, but
                // we actually got a non-empty session key back.
                var hasSessionKey = !!(!err && response.data && response.data.sessionKey);

                if (err || !hasSessionKey) {
                    callback(err || "No session key available", false);
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
                this.timeout,
                wrappedCallback
            );
        },


        /**
         * Logs the session out resulting in the removal of all cookies and the
         * session key.
         *
         * @param {Function} callback The function to call when logout has finished: `()`.
         *
         * @method splunkjs.Context
         * @private
         */
        logout: function(callback) {
            callback = callback || function() {};

            this.sessionKey = null;
            this.http._cookieStore = {};
            callback();
        },

        /**
         * Performs a GET request.
         *
         * @param {String} path The REST endpoint path of the GET request.
         * @param {Object} params The entity-specific parameters for this request.
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
                    that.timeout,
                    callback
                );
            };

            return this._requestWrapper(request, callback);
        },

        /**
         * Performs a DELETE request.
         *
         * @param {String} path The REST endpoint path of the DELETE request.
         * @param {Object} params The entity-specific parameters for this request.
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
                    that.timeout,
                    callback
                );
            };

            return this._requestWrapper(request, callback);
        },

        /**
         * Performs a POST request.
         *
         * @param {String} path The REST endpoint path of the POST request.
         * @param {Object} params The entity-specific parameters for this request.
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
                    that.timeout,
                    callback
                );
            };

            return this._requestWrapper(request, callback);
        },

        /**
         * Issues an arbitrary HTTP request to the REST endpoint path segment.
         *
         * @param {String} path The REST endpoint path segment (with any query parameters already appended and encoded).
         * @param {String} method The HTTP method (can be `GET`, `POST`, or `DELETE`).
         * @param {Object} query The entity-specific parameters for this request.
         * @param {Object} post A dictionary of POST argument that will get form encoded.
         * @param {Object} body The body of the request, mutually exclusive with `post`.
         * @param {Object} headers Headers for this request.
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
                        timeout: that.timeout
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
         * @param {String} otherVersion The other version string, for example "5.0".
         *
         * @method splunkjs.Context
         */
        versionCompare: function(otherVersion) {
            var thisVersion = this.version;
            if (thisVersion === "default") {
                thisVersion = "5.0";
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

});

require.define("/lib/paths.js", function (require, module, exports, __dirname, __filename) {
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
    
    var root = exports || this;

    // A list of the Splunk REST API endpoint paths
    root.Paths = {
        apps: "/services/apps/local",
        capabilities: "authorization/capabilities",
        configurations: "configs",
        dataModels: "datamodel/model",
        deploymentClient: "deployment/client",
        deploymentServers: "deployment/server",
        deploymentServerClasses: "deployment/serverclass",
        deploymentTenants: "deployment/tenants",
        eventTypes: "saved/eventtypes",
        firedAlerts: "alerts/fired_alerts",
        indexes: "data/indexes",
        info: "/services/server/info",
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
        parser: "search/parser",
        pivot: "datamodel/pivot",
        properties: "properties",
        roles: "authorization/roles",
        savedSearches: "saved/searches",
        settings: "server/settings",
        storagePasswords: "storage/passwords",
        users: "/services/authentication/users",
        typeahead: "search/typeahead",
        views: "data/ui/views",
        
        currentUser: "/services/authentication/current-context",
        submitEvent: "/services/receivers/simple"
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

    var Class           = require('./jquery.class').Class;
    var logger          = require('./log').Logger;
    var utils           = require('./utils');
    var CookieHandler   = require('cookie');

    var root = exports || this;
    var Http = null;

    var queryBuilderMap = {
        "5": function(message) {
            var query = message.query || {};
            var post = message.post || {};
            var outputMode = query.output_mode || post.output_mode || "json";

            // If the output mode doesn't start with "json" (e.g. "csv" or
            // "xml"), we change it to "json".
            if (!utils.startsWith(outputMode, "json")) {
                outputMode = "json";
            }

            query.output_mode = outputMode;

            return query;
        },
        "4": function(message) {
            return message.query || {};
        },
        "default": function(message) {
            return queryBuilderMap["5"](message);
        },
        "none": function(message) {
            return message.query || {};
        }
    };

    /**
     * A base class for HTTP abstraction that provides the basic functionality
     * for performing GET, POST, DELETE, and REQUEST operations, and provides
     * utilities to construct uniform responses.
     *
     * Base classes should only override `makeRequest` and `parseJSON`.
     *
     * @class splunkjs.Http
     */
    module.exports = root = Http = Class.extend({
        /**
         * Constructor for `splunkjs.Http`.
         *
         * @constructor
         * @return {splunkjs.Http} A new `splunkjs.Http` instance.
         *
         * @method splunkjs.Http
         */
        init: function() {

            // We perform the bindings so that every function works
            // properly when it is passed as a callback.
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);

            // Set our default version to "none"
            this._setSplunkVersion("none");

            // Cookie store for cookie based authentication.
            this._cookieStore = {};
        },

        /*!*/
        _setSplunkVersion: function(version) {
            this.version = version;
        },

        /**
         * Returns all cookies formatted as a string to be put into the Cookie Header.
         */
        _getCookieString: function() {
            var cookieString = "";

            utils.forEach(this._cookieStore, function (cookieValue, cookieKey) {
                cookieString += cookieKey;
                cookieString += '=';
                cookieString += cookieValue;
                cookieString += '; ';
            });

            return cookieString;

        },

        /**
         * Takes a cookie header and returns an object of form { key: $cookieKey value: $cookieValue }
         */
        _parseCookieHeader: function(cookieHeader) {
            // Returns an object of form { $cookieKey: $cookieValue, $optionalCookieAttributeName: $""value, ... }
            var parsedCookieObject = CookieHandler.parse(cookieHeader);
            var cookie = {};

            // This gets the first key value pair into an object and just repeatedly returns thereafter
            utils.forEach(parsedCookieObject, function(cookieValue, cookieKey) {
                if(cookie.key) {
                    return;
                }
                cookie.key = cookieKey;
                cookie.value = cookieValue;
            });

            return cookie;
        },

        /**
         * Performs a GET request.
         *
         * @param {String} url The URL of the GET request.
         * @param {Object} headers An object of headers for this request.
         * @param {Object} params Parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Http
         */
        get: function(url, headers, params, timeout, callback) {
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout,
                query: params
            };

            return this.request(url, message, callback);
        },

        /**
         * Performs a POST request.
         *
         * @param {String} url The URL of the POST request.
         * @param {Object} headers  An object of headers for this request.
         * @param {Object} params Parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Http
         */
        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                post: params
            };

            return this.request(url, message, callback);
        },

        /**
         * Performs a DELETE request.
         *
         * @param {String} url The URL of the DELETE request.
         * @param {Object} headers An object of headers for this request.
         * @param {Object} params Query parameters for this request.
         * @param {Number} timeout A timeout period.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Http
         */
        del: function(url, headers, params, timeout, callback) {
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout,
                query: params
            };

            return this.request(url, message, callback);
        },

        /**
         * Performs a request.
         *
         * This function sets up how to handle a response from a request, but
         * delegates calling the request to the `makeRequest` subclass.
         *
         * @param {String} url The encoded URL of the request.
         * @param {Object} message An object with values for method, headers, timeout, and encoded body.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Http
         * @see makeRequest
         */
        request: function(url, message, callback) {
            var that = this;
            var wrappedCallback = function(response) {
                callback = callback || function() {};

                // Handle cookies if 'set-cookie' header is in the response

                var cookieHeaders = response.response.headers['set-cookie'];
                if (cookieHeaders) {
                    utils.forEach(cookieHeaders, function (cookieHeader) {
                        var cookie = that._parseCookieHeader(cookieHeader);
                        that._cookieStore[cookie.key] = cookie.value;
                    });
                }

                // Handle callback

                if (response.status < 400 && response.status !== "abort") {
                    callback(null, response);
                }
                else {
                    callback(response);
                }
            };

            var query = utils.getWithVersion(this.version, queryBuilderMap)(message);
            var post = message.post || {};

            var encodedUrl = url + "?" + Http.encode(query);
            var body = message.body ? message.body : Http.encode(post);

            var cookieString = that._getCookieString();

            if (cookieString.length !== 0) {
                message.headers["Cookie"] = cookieString;

                // Remove Authorization header
                // Splunk will use Authorization header and ignore Cookies if Authorization header is sent
                delete message.headers["Authorization"];
            }

            var options = {
                method: message.method,
                headers: message.headers,
                timeout: message.timeout,
                body: body
            };

            // Now we can invoke the user-provided HTTP class,
            // passing in our "wrapped" callback
            return this.makeRequest(encodedUrl, options, wrappedCallback);
        },

        /**
         * Encapsulates the client-specific logic for performing a request. This
         * function is meant to be overriden by subclasses.
         *
         * @param {String} url The encoded URL of the request.
         * @param {Object} message An object with values for method, headers, timeout, and encoded body.
         * @param {Function} callback The function to call when the request is complete: `(err, response)`.
         *
         * @method splunkjs.Http
         */
        makeRequest: function(url, message, callback) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Encapsulates the client-specific logic for parsing the JSON response.
         *
         * @param {String} json The JSON response to parse.
         * @return {Object} The parsed JSON.
         *
         * @method splunkjs.Http
         */
        parseJson: function(json) {
            throw new Error("UNDEFINED FUNCTION - OVERRIDE REQUIRED");
        },

        /**
         * Generates a unified response with the given parameters.
         *
         * @param {Object} error An error object, if one exists for the request.
         * @param {Object} response The response object.
         * @param {Object} data The response data.
         * @return {Object} A unified response object.
         *
         * @method splunkjs.Http
         */
        _buildResponse: function(error, response, data) {
            var complete_response, json = {};

            var contentType = null;
            if (response && response.headers) {
                contentType = utils.trim(response.headers["content-type"] || response.headers["Content-Type"] || response.headers["Content-type"] || response.headers["contentType"]);
            }

            if (utils.startsWith(contentType, "application/json") && data) {
                try {
                    json = this.parseJson(data) || {};
                }
                catch(e) {
                    logger.error("Error in parsing JSON:", data, e);
                    json = data;
                }
            }
            else {
                json = data;
            }

            if (json) {
                logger.printMessages(json.messages);
            }

            complete_response = {
                response: response,
                status: (response ? response.statusCode : 0),
                data: json,
                error: error
            };

            return complete_response;
        }
    });

    /**
     * Encodes a dictionary of values into a URL-encoded format.
     *
     * @example
     *
     *      // should be a=1&b=2&b=3&b=4
     *      encode({a: 1, b: [2,3,4]})
     *
     * @param {Object} params The parameters to URL encode.
     * @return {String} The URL-encoded string.
     *
     * @function splunkjs.Http
     */
    Http.encode = function(params) {
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

        if (encodedStr[encodedStr.length - 1] === '&') {
            encodedStr = encodedStr.substr(0, encodedStr.length - 1);
        }

        return encodedStr;
    };
})();

});

require.define("/node_modules/cookie/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/cookie/index.js", function (require, module, exports, __dirname, __filename) {
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * MIT Licensed
 */

/**
 * Module exports.
 * @public
 */

exports.parse = parse;
exports.serialize = serialize;

/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {}
  var opt = options || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;

  pairs.forEach(function(pair) {
    var eq_idx = pair.indexOf('=')

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      return;
    }

    var key = pair.substr(0, eq_idx).trim()
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  });

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;
  var pairs = [name + '=' + enc(val)];

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    pairs.push('Max-Age=' + maxAge);
  }

  if (opt.domain) pairs.push('Domain=' + opt.domain);
  if (opt.path) pairs.push('Path=' + opt.path);
  if (opt.expires) pairs.push('Expires=' + opt.expires.toUTCString());
  if (opt.httpOnly) pairs.push('HttpOnly');
  if (opt.secure) pairs.push('Secure');
  if (opt.firstPartyOnly) pairs.push('First-Party-Only');

  return pairs.join('; ');
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}

});

require.define("/lib/service.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
     * Contains functionality common to Splunk Enterprise and Splunk Storm.
     * 
     * This class is an implementation detail and is therefore SDK-private.
     * 
     * @class splunkjs.private.BaseService
     * @extends splunkjs.Context
     */
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
            this.specialize         = utils.bind(this, this.specialize);
            this.apps               = utils.bind(this, this.apps);
            this.configurations     = utils.bind(this, this.configurations);
            this.indexes            = utils.bind(this, this.indexes);
            this.savedSearches      = utils.bind(this, this.savedSearches);
            this.jobs               = utils.bind(this, this.jobs);
            this.users              = utils.bind(this, this.users);
            this.currentUser        = utils.bind(this, this.currentUser);
            this.views              = utils.bind(this, this.views);
            this.firedAlertGroups   = utils.bind(this, this.firedAlertGroups);
            this.dataModels         = utils.bind(this, this.dataModels);
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
         *      var indexes = svc.indexes();
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
         * Gets the `StoragePasswords` collection, which lets you
         * create, list, and update storage passwords. 
         *
         * @example
         *
         *      // List all # of storage passwords
         *      var storagePasswords = svc.storagePasswords();
         *      storagePasswords.fetch(function(err, storagePasswords) {
         *          console.log("# of Storage Passwords: " + storagePasswords.list().length);
         *      });
         *
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.StoragePasswords} The `StoragePasswords` collection.
         *
         * @endpoint storage/passwords
         * @method splunkjs.Service
         * @see splunkjs.Service.StoragePasswords
         */
        storagePasswords: function(namespace) {
            return new root.StoragePasswords(this, namespace);
        },

        /**
         * Gets the `FiredAlertGroupCollection` collection, which lets you
         * list alert groups.
         * 
         * @example
         *      
         *      // List all # of fired alert groups
         *      var firedAlertGroups = svc.firedAlertGroups();
         *      firedAlertGroups.fetch(function(err, firedAlertGroups) {
         *          console.log("# of alert groups: " + firedAlertGroups.list().length);
         *      });
         *
         *
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.FiredAlertGroupCollection} The `FiredAlertGroupCollection` collection.
         *
         * @endpoint saved/searches
         * @method splunkjs.Service
         * @see splunkjs.Service.FiredAlertGroupCollection
         */
        firedAlertGroups: function(namespace) {
            return new root.FiredAlertGroupCollection(this, namespace);
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
         * Gets the `DataModels` collection, which lets you create, list,
         * and retrieve data models.
         *
         * @endpoint datamodel/model
         * @method splunkjs.Service
         * @see splunkjs.Service.DataModels
         */
        dataModels: function(namespace) {
            return new root.DataModels(this, namespace);
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
            
            var jobs = new root.Jobs(this, namespace);
            return jobs.search(query, params, callback);
        },

        /**
         * A convenience method to get a `Job` by its sid.
         *
         * @param {String} sid The search ID for a search job.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Function} callback A function to call with the created job: `(err, job)`.
         *
         * @endpoint search/jobs
         * @method splunkjs.Service
         */
        getJob: function(sid, namespace, callback) {
            if (!callback && utils.isFunction(namespace)) {
                callback = namespace;
                namespace = null;
            }
            var job = new root.Job(this, sid, namespace);
            return job.fetch({}, callback);
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
            
            var jobs = new root.Jobs(this, namespace);
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
            this.fetch             = utils.bind(this, this.fetch);
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
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The wildcard value "-", is not acceptable when searching for an entity.
         *    - `app` (_string_): The app context for this resource (such as "search"). The wildcard value "-" is unacceptable when searching for an entity.
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

            if (namespace && (namespace.app === '-' || namespace.owner === '-')) {
                throw new Error("When searching for an entity, wildcards are not allowed in the namespace. Please refine your search.");
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
         * Gets the count of triggered alerts for this savedSearch,
         * defaulting to 0 when undefined.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      var alertCount = savedSearch.alertCount();
         * 
         * @return {Number} The count of triggered alerts.
         *
         * @method splunkjs.Service.SavedSearch
         */
        alertCount: function() {
            return parseInt(this.properties().triggered_alert_count, 10) || 0;
        },

        /**
         * Acknowledges the suppression of the alerts from a saved search and
         * resumes alerting.
         *
         * @example
         *
         *      var savedSearch = service.savedSearches().item("MySavedSearch");
         *      savedSearch.acknowledge(function(err, search) {
         *          console.log("ACKNOWLEDGED");
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
         * Gets the `splunkjs.Service.FiredAlertGroup` for firedAlerts associated with this saved search.
         *
         * @example
         *
         *      var alerts = service.firedAlertGroups().item("MySavedSearch");
         *
         * @return {splunkjs.Service.FiredAlertGroup} An AlertGroup object with the
         * same name as this SavedSearch object.
         *
         * @method splunkjs.Service.SavedSearch
         */
        firedAlertGroup: function() {
            return new root.FiredAlertGroup(this.service, this.name);
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
         *              console.log("Job", i, ":", jobs[i].sid);
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
     * Represents a specific storage password, which you can then view, modify, and
     * remove.
     *
     * @endpoint storage/passwords/{name}
     * @class splunkjs.Service.StoragePassword
     * @extends splunkjs.Service.Entity
     */
    root.StoragePassword = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.StoragePassword
         */
        path: function () {
            return Paths.storagePasswords + "/" + encodeURIComponent(this.name);
        },

        /**
         * Constructor for `splunkjs.Service.StoragePassword`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new storage password.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.StoragePassword} A new `splunkjs.Service.StoragePassword` instance.
         *
         * @method splunkjs.Service.StoragePassword
         */
        init: function (service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        }
    });

    /**
     * Represents a collection of storage passwords. You can create and list storage 
     * passwords using this collection container, or get a specific storage password.
     *
     * @endpoint storage/passwords
     * @class splunkjs.Service.StoragePasswords
     * @extends splunkjs.Service.Collection
     */
    root.StoragePasswords = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.StoragePasswords
         */
        path: function() {
            return Paths.storagePasswords;
        },
        
        /**
         * Creates a local instance of a storage password.
         *
         * @param {Object} props The properties for the new storage password. For a list of available parameters,
         * see <a href="http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI/RESTaccess#POST_storage.2Fpasswords" target="_blank">
         * POST storage/passwords</a> on Splunk Developer Portal.
         * @return {splunkjs.Service.SavedSearch} A new `splunkjs.Service.StoragePassword` instance.
         *
         * @method splunkjs.Service.StoragePasswords
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.StoragePassword(this.service, props.name, entityNamespace);
        },
        
        /**
         * Constructor for `splunkjs.Service.StoragePasswords`. 
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.StoragePasswords} A new `splunkjs.Service.StoragePasswords` instance.
         *
         * @method splunkjs.Service.StoragePasswords
         */     
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);
        }
    });

    /**
     * Represents a fired alert. 
     * You can retrieve several of the fired alert's properties by
     * the corresponding function name.
     *
     * @endpoint alerts/fired_alerts/{name}
     * @class splunkjs.Service.FiredAlert
     * @extends splunkjs.Service.Entity
     */
    root.FiredAlert = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.FiredAlert
         */
        path: function() {
            return Paths.firedAlerts + "/" + encodeURIComponent(this.name);
        },

        /**
         * Returns this alert's actions (such as notifying by email, running a 
         * script, adding to RSS, tracking in Alert Manager, and enabling 
         * summary indexing). 
         *
         * @return {Array} of actions, an empty {Array} if no actions
         * @method splunkjs.Service.FiredAlert
         */
        actions: function() {
            return this.properties().actions || [];
        },

        /**
         * Returns this alert's type.
         *
         * @return {String} the alert's type.
         * @method splunkjs.Service.FiredAlert
         */
        alertType: function() {
            return this.properties().alert_type || null;
        },

        /**
         * Indicates whether the result is a set of events (digest) or a single
         * event (per result).
         *
         * This method is available in Splunk 4.3 and later.
         *
         * @return {Boolean} true if the result is a digest, false if per result
         * @method splunkjs.Service.FiredAlert
         */
        isDigestMode: function() {
            // Convert this property to a Boolean
            return !!this.properties().digest_mode;
        },

        /**
         * Returns the rendered expiration time for this alert.
         *
         * This method is available in Splunk 4.3 and later.
         *
         * @return {String}
         * @method splunkjs.Service.FiredAlert
         */
        expirationTime: function() {
            return this.properties().expiration_time_rendered || null;
        },

        /**
         * Returns the saved search for this alert.
         *
         * @return {String} The saved search name, or {null} if not available.
         * @method splunkjs.Service.FiredAlert
         */
        savedSearchName: function() {
            return this.properties().savedsearch_name || null;
        },

        /**
         * Returns this alert's severity on a scale of 1 to 10, with 1 being the
         * highest severity.
         *
         * @return {Number} this alert's severity, -1 if not specified
         * @method splunkjs.Service.FiredAlert
         */
        severity: function() {
            return parseInt(this.properties().severity, 10) || -1;
        },

        /**
         * Returns this alert's search ID (SID).
         *
         * @return {String} This alert's SID, or {null} if not available.
         * @method splunkjs.Service.FiredAlert
         */
        sid: function() {
            return this.properties().sid || null;
        },

        /**
         * Returns the time this alert was triggered.
         *
         * @return {Number} This alert's trigger time, or {null} if not available.
         * @method splunkjs.Service.FiredAlert
         */
        triggerTime: function() {
            return this.properties().trigger_time || null;
        },

        /**
         * Returns this alert's rendered trigger time.
         *
         * This method is available in Splunk 4.3 and later.
         *
         * @return {String} This alert's rendered trigger time, or {null} if not available.
         * @method splunkjs.Service.FiredAlert
         */
        triggerTimeRendered: function() {
            return this.properties().trigger_time_rendered || null;
        },

        /**
         * Returns the count of triggered alerts.
         *
         * This method is available in Splunk 4.3 and later.
         *
         * @return {Number} The number of triggered alerts, or -1 if not specified.
         * @method splunkjs.Service.FiredAlert
         */
        triggeredAlertCount: function() {
            return parseInt(this.properties().triggered_alerts, 10) || -1;
        },

        /**
         * Constructor for `splunkjs.Service.FiredAlert`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new alert group.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.FiredAlert} A new `splunkjs.Service.FiredAlert` instance.
         *
         * @method splunkjs.Service.FiredAlert
         */     
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);
        }
    });


    /**
     * Represents a specific alert group, which you can then view and
     * remove.
     *
     * @endpoint alerts/fired_alerts/{name}
     * @class splunkjs.Service.FiredAlertGroup
     * @extends splunkjs.Service.Entity
     */
    root.FiredAlertGroup = root.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.FiredAlertGroup
         */
        path: function() {
            return Paths.firedAlerts + "/" + encodeURIComponent(this.name);
        },

        /**
         * Returns the `triggered_alert_count` property, the count
         * of triggered alerts.
         *
         * @return {Number} the count of triggered alerts
         *
         * @method splunkjs.Service.FiredAlertGroup
         */
        count: function() {
            return parseInt(this.properties().triggered_alert_count, 10) || 0;
        },

        /**
         * Returns fired instances of this alert, which is
         * a list of `splunkjs.Service.FiredAlert` instances.
         *
         * @example
         *
         *      var alertGroup = service.firedAlertGroups().item("MyAlert");
         *      alertGroup.list(function(err, firedAlerts, alert) {
         *          for(var i = 0; i < firedAlerts.length; i++) {
         *              console.log("Fired alert", i, ":", firedAlerts[i].sid);
         *          }
         *      });
         *
         * @param {Function} callback A function to call when the fired alerts are retrieved: `(err, firedAlerts, alertGroup)`.
         *
         * @method splunkjs.Service.FiredAlertGroup
         */
        list: function(options, callback) {
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
                    return;
                }
                
                var firedAlerts = [];
                var data = response.data.entry || [];
                for (var i = 0; i < data.length; i++) {
                    var firedAlertData = response.data.entry[i];
                    var namespace = utils.namespaceFromProperties(firedAlertData);
                    var firedAlert = new root.FiredAlert(that.service, firedAlertData.name, namespace);
                    firedAlert._load(firedAlertData);
                    firedAlerts.push(firedAlert);
                }
                
                callback(null, firedAlerts, that);
            });
        },

        /**
         * Constructor for `splunkjs.Service.FiredAlertGroup`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new alert group.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.FiredAlertGroup} A new `splunkjs.Service.FiredAlertGroup` instance.
         *
         * @method splunkjs.Service.FiredAlertGroup
         */
        init: function(service, name, namespace) {
            this.name = name;
            this._super(service, this.path(), namespace);

            this.list = utils.bind(this, this.list);
        }
    });

    /**
     * Represents a collection of fired alerts for a saved search. You can
     * create and list saved searches using this collection container, or
     * get a specific alert group. 
     *
     *
     * @endpoint alerts/fired_alerts
     * @class splunkjs.Service.FiredAlertGroupCollection
     * @extends splunkjs.Service.Collection
     */
    root.FiredAlertGroupCollection = root.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.FiredAlertGroupCollection
         */
        path: function() {
            return Paths.firedAlerts;
        },
        
        /**
         * Creates a local instance of an alert group.
         *
         * @param {Object} props The properties for the alert group.
         * @return {splunkjs.Service.FiredAlertGroup} A new `splunkjs.Service.FiredAlertGroup` instance.
         *
         * @method splunkjs.Service.FiredAlertGroupCollection
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.FiredAlertGroup(this.service, props.name, entityNamespace);
        },

        /**
         * Suppress removing alerts via the fired alerts endpoint.
         *
         * @method splunkjs.Service.FiredAlertGroupCollection
         */
        remove: function() {
            throw new Error("To remove an alert, remove the saved search with the same name.");
        },
        
        /**
         * Constructor for `splunkjs.Service.FiredAlertGroupCollection`. 
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @return {splunkjs.Service.FiredAlertGroupCollection} A new `splunkjs.Service.FiredAlertGroupCollection` instance.
         *
         * @method splunkjs.Service.FiredAlertGroupCollection
         */     
        init: function(service, namespace) {
            this._super(service, this.path(), namespace);

            this.instantiateEntity = utils.bind(this, this.instantiateEntity);
            this.remove = utils.bind(this, this.remove);
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
            var name = this.name === "default" ? "_new" : this.name;
            return Paths.configurations + "/conf-" + encodeURIComponent(this.file) + "/" + encodeURIComponent(name);
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
         * Creates a local instance of the default stanza in a configuration file.
         * You cannot directly update the `ConfigurationStanza` returned by this function.
         *
         * This is equivalent to viewing `configs/conf-{file}/_new`.
         *
         * @return {splunkjs.Service.ConfigurationStanza} A new `splunkjs.Service.ConfigurationStanza` instance.
         *
         * @method splunkjs.Service.ConfigurationFile
         */
        getDefaultStanza: function() {
            return new root.ConfigurationStanza(this.service, this.name, "default", this.namespace);
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
         *      var configurations = service.configurations();
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
     * on this job, such as reading its status, canceling it, and getting results.
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
                        
                        var dispatchState = job.properties().dispatchState;
                        var notReady = dispatchState === "QUEUED" || dispatchState === "PARSING";
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
     
    /**
     * Represents a field of a data model object.
     * This is a helper class for `DataModelCalculation`
     * and `DataModelObject`.
     *
     * Has these properties:
     *    - `fieldName` (_string_): The name of this field.
     *    - `displayName` (_string_):  A human readable name for this field.
     *    - `type` (_string_): The type of this field.
     *    - `multivalued` (_boolean_): Whether this field is multivalued.
     *    - `required` (_boolean_): Whether this field is required.
     *    - `hidden` (_boolean_): Whether this field should be displayed in a data model UI.
     *    - `editable` (_boolean_): Whether this field can be edited.
     *    - `comment` (_string_): A comment for this field, or `null` if there isn't one.
     *    - `fieldSearch` (_string_): A search query fragment for this field.
     *    - `lineage` (_array_): An array of strings of the lineage of the data model
     *          on which this field is defined.
     *    - `owner` (_string_): The name of the data model object on which this field is defined.
     *
     * Possible types for a data model field:
     *    - `string`
     *    - `boolean`
     *    - `number`
     *    - `timestamp`
     *    - `objectCount`
     *    - `childCount`
     *    - `ipv4`
     *
     * @class splunkjs.Service.DataModelField
     */
    root.DataModelField = Class.extend({
        _types: [ "string", "number", "timestamp", "objectCount", "childCount", "ipv4", "boolean"],

        /**
         * Constructor for a data model field.
         * SDK users are not expected to invoke this constructor directly.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `fieldName` (_string_): The name of this field.
         *     - `displayName` (_string_): A human readable name for this field.
         *     - `type` (_string_): The type of this field, see valid types in class docs.
         *     - `multivalue` (_boolean_): Whether this field is multivalued.
         *     - `required` (_boolean_): Whether this field is required on events in the object
         *     - `hidden` (_boolean_): Whether this field should be displayed in a data model UI.
         *     - `editable` (_boolean_): Whether this field can be edited.
         *     - `comment` (_string_): A comment for this field, or `null` if there isn't one.
         *     - `fieldSearch` (_string_): A search query fragment for this field.
         *     - `lineage` (_string_): The lineage of the data model object on which this field
         *          is defined, items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *
         * @method splunkjs.Service.DataModelField
         */
        init: function(props) {
            props = props || {};
            props.owner = props.owner || "";

            this.name           = props.fieldName;
            this.displayName    = props.displayName;
            this.type           = props.type;
            this.multivalued    = props.multivalue;
            this.required       = props.required;
            this.hidden         = props.hidden;
            this.editable       = props.editable;
            this.comment        = props.comment || null;
            this.fieldSearch    = props.fieldSearch;
            this.lineage        = props.owner.split(".");
            this.owner          = this.lineage[this.lineage.length - 1];
        },

        /**
         * Is this data model field of type string?
         *
         * @return {Boolean} True if this data model field is of type string.
         *
         * @method splunkjs.Service.DataModelField
         */
        isString: function() {
            return "string" === this.type;
        },

        /**
         * Is this data model field of type number?
         *
         * @return {Boolean} True if this data model field is of type number.
         *
         * @method splunkjs.Service.DataModelField
         */
        isNumber: function() {
            return "number" === this.type;
        },

        /**
         * Is this data model field of type timestamp?
         *
         * @return {Boolean} True if this data model field is of type timestamp.
         *
         * @method splunkjs.Service.DataModelField
         */
        isTimestamp: function() {
            return "timestamp" === this.type;
        },

        /**
         * Is this data model field of type object count?
         *
         * @return {Boolean} True if this data model field is of type object count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isObjectcount: function() {
            return "objectCount" === this.type;
        },

        /**
         * Is this data model field of type child count?
         *
         * @return {Boolean} True if this data model field is of type child count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isChildcount: function() {
            return "childCount" === this.type;
        },

        /**
         * Is this data model field of type ipv4?
         *
         * @return {Boolean} True if this data model field is of type ipv4.
         *
         * @method splunkjs.Service.DataModelField
         */
        isIPv4: function() {
            return "ipv4" === this.type;
        },

        /**
         * Is this data model field of type boolean?
         *
         * @return {Boolean} True if this data model field is of type boolean.
         *
         * @method splunkjs.Service.DataModelField
         */
        isBoolean: function() {
            return "boolean" === this.type;
        }
    });
    
    /**
     * Represents a constraint on a `DataModelObject` or a `DataModelField`.
     *
     * Has these properties:
     *    - `query` (_string_): The search query defining this data model constraint.
     *    - `lineage` (_array_): The lineage of this data model constraint.
     *    - `owner` (_string_): The name of the data model object that owns
     *          this data model constraint.
     *
     * @class splunkjs.Service.DataModelConstraint
     */
    root.DataModelConstraint = Class.extend({
        /**
         * Constructor for a data model constraint.
         * SDK users are not expected to invoke this constructor directly.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `search` (_string_): The Splunk search query this constraint specifies.
         *     - `owner` (_string_): The lineage of the data model object that owns this
         *          constraint, items are delimited by a dot. This is converted into
         *          an array of strings upon construction.
         *
         * @method splunkjs.Service.DataModelConstraint
         */
        init: function(props) {
            props = props || {};
            props.owner = props.owner || "";

            this.query   = props.search;
            this.lineage = props.owner.split(".");
            this.owner   = this.lineage[this.lineage.length - 1];
        }
    });
    
    /**
     * Used for specifying a calculation on a `DataModelObject`.
     *
     * Has these properties:
     *    - `id` (_string_): The ID for this data model calculation.
     *    - `type` (_string_): The type of this data model calculation.
     *    - `comment` (_string_|_null_): The comment for this data model calculation, or `null`.
     *    - `editable` (_boolean_): True if this calculation can be edited, false otherwise.
     *    - `lineage` (_array_): The lineage of the data model object on which this calculation
     *          is defined in an array of strings.
     *    - `owner` (_string_): The data model that this calculation belongs to.
     *    - `outputFields` (_array_): The fields output by this calculation.
     *
     * The Rex and Eval types have an additional property:
     *    - `expression` (_string_): The expression to use for this calculation.
     *
     * The Rex and GeoIP types have an additional property:
     *    - `inputField` (_string_): The field to use for calculation.
     *
     * The Lookup type has additional properties:
     *    - `lookupName` (_string_): The name of the lookup to perform.
     *    - `inputFieldMappings` (_object_): The mappings from fields in the events to fields in the lookup.
     *
     * Valid types of calculations are:
     *    - `Lookup`
     *    - `Eval`
     *    - `GeoIP`
     *    - `Rex`
     *
     * @class splunkjs.Service.DataModelCalculation
     */
    root.DataModelCalculation = Class.extend({
        _types: ["Lookup", "Eval", "GeoIP", "Rex"],

        /**
         * Constructor for a data model calculation.
         * SDK users are not expected to invoke this constructor directly.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `calculationID` (_string_): The ID of this calculation.
         *     - `calculationType` (_string_): The type of this calculation, see class docs for valid types.
         *     - `editable` (_boolean_): Whether this calculation can be edited.
         *     - `comment` (_string_): A comment for this calculation, or `null` if there isn't one.
         *     - `owner` (_string_): The lineage of the data model object on which this calculation
         *          is defined, items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *     - `outputFields` (_array_): An array of the fields this calculation generates.
         *     - `expression` (_string_): The expression to use for this calculation; exclusive to `Eval` and `Rex` calculations (optional)
         *     - `inputField` (_string_): The field to use for calculation; exclusive to `GeoIP` and `Rex` calculations (optional)
         *     - `lookupName` (_string_): The name of the lookup to perform; exclusive to `Lookup` calculations (optional)
         *     - `inputFieldMappings` (_array_): One element array containing an object with the mappings from fields in the events to fields
         *         in the lookup; exclusive to `Lookup` calculations (optional)
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        init: function(props) {
            props = props || {};
            props.owner = props.owner || "";

            this.id             = props.calculationID;
            this.type           = props.calculationType;
            this.comment        = props.comment || null;
            this.editable       = props.editable;
            this.lineage        = props.owner.split(".");
            this.owner          = this.lineage[this.lineage.length - 1];

            this.outputFields = [];
            for (var i = 0; i < props.outputFields.length; i++) {
                this.outputFields[props.outputFields[i].fieldName] = new root.DataModelField(props.outputFields[i]);
            }

            if ("Eval" === this.type || "Rex" === this.type) {
                this.expression = props.expression;
            }
            if ("GeoIP" === this.type || "Rex" === this.type) {
                this.inputField = props.inputField;
            }
            if ("Lookup" === this.type) {
                this.lookupName = props.lookupName;
                this.inputFieldMappings = props.lookupInputs[0];
            }
        },

        /**
         * Returns an array of strings of output field names.
         *
         * @return {Array} An array of strings of output field names.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        outputFieldNames: function() {
            return Object.keys(this.outputFields);
        },

        /**
         * Is this data model calculation editable?
         *
         * @return {Boolean} True if this data model calculation is editable.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEditable: function() {
            return !!this.editable;
        },

        /**
         * Is this data model calculation of type lookup?
         *
         * @return {Boolean} True if this data model calculation is of type lookup.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isLookup: function() {
            return "Lookup" === this.type;
        },

        /**
         * Is this data model calculation of type eval?
         *
         * @return {Boolean} True if this data model calculation is of type eval.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEval: function() {
            return "Eval" === this.type;
        },
        
        /**
         * Is this data model calculation of type Rex?
         *
         * @return {Boolean} True if this data model calculation is of type Rex.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isRex: function() {
            return "Rex" === this.type;
        },

        /**
         * Is this data model calculation of type GeoIP?
         *
         * @return {Boolean} True if this data model calculation is of type GeoIP.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isGeoIP: function() {
            return "GeoIP" === this.type;
        }
    });
    
    /**
     * Pivot represents data about a pivot report returned by the Splunk Server.
     *
     * Has these properties:
     *    - `service` (_splunkjs.Service_): A `Service` instance.
     *    - `search` (_string_): The search string for running the pivot report.
     *    - `drilldownSearch` (_string_): The search for running this pivot report using drilldown.
     *    - `openInSearch` (_string_): Equivalent to search parameter, but listed more simply.
     *    - `prettyQuery` (_string_): Equivalent to `openInSearch`.
     *    - `pivotSearch` (_string_): A pivot search command based on the named data model.
     *    - `tstatsSearch` (_string_): The search for running this pivot report using tstats.
     *
     * @class splunkjs.Service.Pivot
     */
    root.Pivot = Class.extend({
        /**
         * Constructor for a pivot.
         * SDK users are not expected to invoke this constructor directly.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} props A dictionary of properties to set:
         *    - `search` (_string_): The search string for running the pivot report.
         *    - `drilldown_search` (_string_): The search for running this pivot report using drilldown.
         *    - `open_in_search` (_string_): Equivalent to search parameter, but listed more simply.
         *    - `pivot_search` (_string_): A pivot search command based on the named data model.
         *    - `tstats_search` (_string_|_null_): The search for running this pivot report using tstats, null if acceleration is disabled.
         *
         * @method splunkjs.Service.Pivot
         */
        init: function(service, props) {
            this.service = service;
            this.search = props.search;
            this.drilldownSearch = props.drilldown_search;
            this.prettyQuery = this.openInSearch = props.open_in_search;
            this.pivotSearch = props.pivot_search;
            this.tstatsSearch = props.tstats_search || null;

            this.run = utils.bind(this, this.run);
        },

        /**
         * Starts a search job running this pivot, accelerated if possible.
         *
         * @param {Object} args A dictionary of properties for the search job (optional). For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         * @param {Function} callback A function to call when done creating the search job: `(err, job)`.
         * @method splunkjs.Service.Pivot
         */
        run: function(args, callback) {
            if (utils.isUndefined(callback)) {
                callback = args;
                args = {};
            }
            if (!args || Object.keys(args).length === 0) {
                args = {};
            }

            // If tstats is undefined, use pivotSearch (try to run an accelerated search if possible)
            this.service.search(this.tstatsSearch || this.pivotSearch, args, callback);
        }
    });

    /**
     * PivotSpecification represents a pivot to be done on a particular data model object.
     * The user creates a PivotSpecification on some data model object, adds filters, row splits,
     * column splits, and cell values, then calls the pivot method to query splunkd and
     * get a set of SPL queries corresponding to this specification.
     *
     * Call the `pivot` method to query Splunk for SPL queries corresponding to this pivot.
     *
     * This class supports a fluent API, each function except `init`, `toJsonObject` & `pivot`
     * return the modified `splunkjs.Service.PivotSpecification` instance.
     *
     * @example
     *     service.dataModels().fetch(function(err, dataModels) {
     *         var searches = dataModels.item("internal_audit_logs").objectByName("searches");
     *         var pivotSpecification = searches.createPivotSpecification();
     *         pivotSpecification
     *             .addRowSplit("user", "Executing user")
     *             .addRangeColumnSplit("exec_time", {limit: 4})
     *             .addCellValue("search", "Search Query", "values")
     *             .pivot(function(err, pivot) {
     *                 console.log("Got a Pivot object from the Splunk server!");
     *             });
     *     });
     *
     * Has these properties:
     *    - `dataModelObject` (_splunkjs.Service.DataModelObject_): The `DataModelObject` from which
     *        this `PivotSpecification` was created.
     *    - `columns` (_array_): The column splits on this `PivotSpecification`.
     *    - `rows` (_array_): The row splits on this `PivotSpecification`.
     *    - `filters` (_array_): The filters on this `PivotSpecification`.
     *    - `cells` (_array_): The cell aggregations for this`PivotSpecification`.
     *    - `accelerationNamespace` (_string_|_null_): The name of the `DataModel` that owns the `DataModelObject`
     *        on which this `PivotSpecification` was created if the `DataModel` is accelerated. Alternatively,
     *        you can set this property manually to the sid of an acceleration job in the format `sid=<sid>`.
     *
     * Valid comparison types are:
     *    - `boolean`
     *    - `string`
     *    - `number`
     *    - `ipv4`
     *
     * Valid boolean comparisons are:
     *    - `=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *
     * Valid string comparisons are:
     *    - `=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *    - `contains`
     *    - `doesNotContain`
     *    - `startsWith`
     *    - `endsWith`
     *    - `regex`
     *
     * Valid number comparisons are:
     *    - `=`
     *    - `!=`
     *    - `<`
     *    - `>`
     *    - `<=`
     *    - `>=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *
     * Valid ipv4 comparisons are:
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *    - `contains`
     *    - `doesNotContain`
     *    - `startsWith`
     *
     * Valid binning values are:
     *    - `auto`
     *    - `year`
     *    - `month`
     *    - `day`
     *    - `hour`
     *    - `minute`
     *    - `second`
     *
     * Valid sort directions are:
     *    - `ASCENDING`
     *    - `DECENDING`
     *    - `DEFAULT`
     *
     * Valid stats functions are:
     *    - `list`
     *    - `values`
     *    - `first`
     *    - `last`
     *    - `count`
     *    - `dc`
     *    - `sum`
     *    - `average`
     *    - `max`
     *    - `min`
     *    - `stdev`
     *    - `duration`
     *    - `earliest`
     *    - `latest`
     *
     * @class splunkjs.Service.PivotSpecification
     */
    root.PivotSpecification = Class.extend({
        _comparisons: {
            boolean: ["=", "is", "isNull", "isNotNull"],
            string: ["=", "is", "isNull", "isNotNull", "contains", "doesNotContain", "startsWith", "endsWith", "regex"],
            number: ["=", "!=", "<", ">", "<=", ">=", "is", "isNull", "isNotNull"],
            ipv4: ["is", "isNull", "isNotNull", "contains", "doesNotContain", "startsWith"]
        },
        _binning: ["auto", "year", "month", "day", "hour", "minute", "second"],
        _sortDirection: ["ASCENDING", "DESCENDING", "DEFAULT"],
        _statsFunctions: ["list", "values", "first", "last", "count", "dc", "sum", "average", "max", "min", "stdev", "duration", "earliest", "latest"],

        /**
         * Constructor for a pivot specification.
         *
         * @constructor
         * @param {splunkjs.Service.DataModel} parentDataModel The `DataModel` that owns this data model object.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        init: function(dataModelObject) {
            this.dataModelObject = dataModelObject;
            this.columns = [];
            this.rows = [];
            this.filters = [];
            this.cells = [];

            this.accelerationNamespace = dataModelObject.dataModel.isAccelerated() ? 
                dataModelObject.dataModel.name : null;

            this.run   = utils.bind(this, this.run);
            this.pivot = utils.bind(this, this.pivot);
        },
        
        /**
         * Set the acceleration cache for this pivot specification to a job,
         * usually generated by createLocalAccelerationJob on a DataModelObject
         * instance, as the acceleration cache for this pivot specification.
         *
         * @param {String|splunkjs.Service.Job} sid The sid of an acceleration job,
         *     or, a `splunkjs.Service.Job` instance.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        setAccelerationJob: function(sid) {
            // If a search object is passed in, get its sid
            if (sid && sid instanceof Service.Job) {
                sid = sid.sid;
            }
            
            if (!sid) {
                throw new Error("Sid to use for acceleration must not be null.");
            }

            this.accelerationNamespace = "sid=" + sid;
            return this;
        },

        /**
         * Add a filter on a boolean valued field. The filter will be a constraint of the form
         * `field `comparison` compareTo`, for example: `is_remote = false`.
         *
         * @param {String} fieldName The name of field to filter on
         * @param {String} comparisonType The type of comparison, see class docs for valid types.
         * @param {String} comparisonOp The comparison, see class docs for valid comparisons, based on type.
         * @param {String} compareTo The value to compare the field to.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addFilter: function(fieldName, comparisonType, comparisonOp, compareTo) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Cannot add filter on a nonexistent field.");
            }
            if (comparisonType !== this.dataModelObject.fieldByName(fieldName).type) {
                throw new Error(
                    "Cannot add " + comparisonType +  
                    " filter on " + fieldName + 
                    " because it is of type " +
                    this.dataModelObject.fieldByName(fieldName).type);
            }
            if (!utils.contains(this._comparisons[comparisonType], comparisonOp)) {
                throw new Error(
                    "Cannot add " + comparisonType + 
                    " filter because " + comparisonOp +
                    " is not a valid comparison operator");
            }

            var ret = {
                fieldName: fieldName,
                owner: this.dataModelObject.fieldByName(fieldName).lineage.join("."),
                type: comparisonType
            };
            // These fields are type dependent
            if (utils.contains(["boolean", "string", "ipv4", "number"], ret.type)) {
                ret.rule = {
                    comparator: comparisonOp,
                    compareTo: compareTo
                };
            }
            this.filters.push(ret);
    
            return this;
        },

        /**
         * Add a limit on the events shown in a pivot by sorting them according to some field, then taking
         * the specified number from the beginning or end of the list.
         *
         * @param {String} fieldName The name of field to filter on.
         * @param {String} sortAttribute The name of the field to use for sorting.
         * @param {String} sortDirection The direction to sort events, see class docs for valid types.
         * @param {String} limit The number of values from the sorted list to allow through this filter.
         * @param {String} statsFunction The stats function to use for aggregation before sorting, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addLimitFilter: function(fieldName, sortAttribute, sortDirection, limit, statsFunction) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Cannot add limit filter on a nonexistent field.");
            }

            var f = this.dataModelObject.fieldByName(fieldName);

            if (!utils.contains(["string", "number", "objectCount"], f.type)) {
                throw new Error("Cannot add limit filter on " + fieldName + " because it is of type " + f.type);
            }

            if ("string" === f.type && !utils.contains(["count", "dc"], statsFunction)) {
                throw new Error("Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found " +
                    statsFunction);
            }

            if ("number" === f.type && !utils.contains(["count", "dc", "average", "sum"], statsFunction)) {
                throw new Error("Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found " +
                    statsFunction);
            }

            if ("objectCount" === f.type && !utils.contains(["count"], statsFunction)) {
                throw new Error("Stats function for fields of type object count must be COUNT; found " + statsFunction);
            }

            var filter = {
                fieldName: fieldName,
                owner: f.lineage.join("."),
                type: f.type,
                attributeName: sortAttribute,
                attributeOwner: this.dataModelObject.fieldByName(sortAttribute).lineage.join("."),
                sortDirection: sortDirection,
                limitAmount: limit,
                statsFn: statsFunction
            };
            // Assumed "highest" is preferred for when sortDirection is "DEFAULT"
            filter.limitType = "ASCENDING" === sortDirection ? "lowest" : "highest";
            this.filters.push(filter);

            return this;
        },

        /**
         * Add a row split on a numeric or string valued field, splitting on each distinct value of the field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRowSplit: function(fieldName, label) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains(["number", "string"], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var row = {
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                label: label
            };

            if ("number" === f.type) {
                row.display = "all";
            }

            this.rows.push(row);

            return this;
        },

        /**
         * Add a row split on a numeric field, splitting into numeric ranges.
         *
         * This split generates bins with edges equivalent to the
         * classic loop 'for i in <start> to <end> by <step>' but with a maximum
         * number of bins <limit>. This dispatches to the stats and xyseries search commands.
         * See their documentation for more details.
         *
         * @param {String} fieldName The field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {Object} options An optional dictionary of collection filtering and pagination options:
         *    - `start` (_integer_): The value of the start of the first range, or null to take the lowest value in the events.
         *    - `end` (_integer_): The value for the end of the last range, or null to take the highest value in the events.
         *    - `step` (_integer_): The the width of each range, or null to have Splunk calculate it.
         *    - `limit` (_integer_): The maximum number of ranges to split into, or null for no limit.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRangeRowSplit: function(field, label, ranges) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("number" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }
            var updateRanges = {};
            if (!utils.isUndefined(ranges.start) && ranges.start !== null) {
                updateRanges.start = ranges.start;
            }
            if (!utils.isUndefined(ranges.end) && ranges.end !== null) {
                updateRanges.end = ranges.end;
            }
            if (!utils.isUndefined(ranges.step) && ranges.step !== null) {
                updateRanges.size = ranges.step;
            }
            if (!utils.isUndefined(ranges.limit) && ranges.limit !== null) {
                updateRanges.maxNumberOf = ranges.limit;
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                display: "ranges",
                ranges: updateRanges
            });

            return this;
        },

        /**
         * Add a row split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {String} trueDisplayValue A string to display in the true valued row label.
         * @param {String} falseDisplayValue A string to display in the false valued row label.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addBooleanRowSplit: function(field, label, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("boolean" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected boolean.");
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                trueLabel: trueDisplayValue,
                falseLabel: falseDisplayValue
            });

            return this;
        },

        /**
         * Add a row split on a timestamp valued field, binned by the specified bucket size.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {String} binning The size of bins to use, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addTimestampRowSplit: function(field, label, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("timestamp" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }
            if (!utils.contains(this._binning, binning)) {
                throw new Error("Invalid binning " + binning + " found. Valid values are: " + this._binning.join(", "));
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                period: binning
            });

            return this;            
        },
        
        /**
         * Add a column split on a string or number valued field, producing a column for
         * each distinct value of the field.
         *
         * @param {String} fieldName The name of field to split on.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addColumnSplit: function(fieldName) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains(["number", "string"], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var col = {
                fieldName: fieldName,
                owner: f.owner,
                type: f.type
            };

            if ("number" === f.type) {
                col.display = "all";
            }

            this.columns.push(col);

            return this;
        },

        /**
         * Add a column split on a numeric field, splitting the values into ranges.
         *
         * @param {String} fieldName The field to split on.
         * @param {Object} options An optional dictionary of collection filtering and pagination options:
         *    - `start` (_integer_): The value of the start of the first range, or null to take the lowest value in the events.
         *    - `end` (_integer_): The value for the end of the last range, or null to take the highest value in the events.
         *    - `step` (_integer_): The the width of each range, or null to have Splunk calculate it.
         *    - `limit` (_integer_): The maximum number of ranges to split into, or null for no limit.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRangeColumnSplit: function(fieldName, ranges) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if ("number" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }

            // In Splunk 6.0.1.1, data models incorrectly expect strings for these fields
            // instead of numbers. In 6.1, this is fixed and both are accepted.
            var updatedRanges = {};
            if (!utils.isUndefined(ranges.start) && ranges.start !== null) {
                updatedRanges.start = ranges.start;
            }
            if (!utils.isUndefined(ranges.end) && ranges.end !== null) {
                updatedRanges.end = ranges.end;
            }
            if (!utils.isUndefined(ranges.step) && ranges.step !== null) {
                updatedRanges.size = ranges.step;
            }
            if (!utils.isUndefined(ranges.limit) && ranges.limit !== null) {
                updatedRanges.maxNumberOf = ranges.limit;
            }

            this.columns.push({
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                display: "ranges",
                ranges: updatedRanges
            });

            return this;
        },
        
        /**
         * Add a column split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} trueDisplayValue A string to display in the true valued column label.
         * @param {String} falseDisplayValue A string to display in the false valued column label.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addBooleanColumnSplit: function(fieldName, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if ("boolean" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected boolean.");
            }

            this.columns.push({
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                trueLabel: trueDisplayValue,
                falseLabel: falseDisplayValue
            });

            return this;
        },
        
        /**
         * Add a column split on a timestamp valued field, binned by the specified bucket size.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} binning The size of bins to use, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addTimestampColumnSplit: function(field, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("timestamp" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }
            if (!utils.contains(this._binning, binning)) {
                throw new Error("Invalid binning " + binning + " found. Valid values are: " + this._binning.join(", "));
            }

            this.columns.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                period: binning
            });

            return this;            
        },
        
        /**
         * Add an aggregate to each cell of the pivot.
         *
         * @param {String} fieldName The name of field to aggregate.
         * @param {String} label a human readable name for this aggregate.
         * @param {String} statsFunction The function to use for aggregation, see class docs for valid stats functions.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addCellValue: function(fieldName, label, statsFunction) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }

            var f = this.dataModelObject.fieldByName(fieldName);
            if (utils.contains(["string", "ipv4"], f.type) &&
                !utils.contains([
                    "list",
                    "values",
                    "first",
                    "last",
                    "count",
                    "dc"], statsFunction)
                ) {
                throw new Error("Stats function on string and IPv4 fields must be one of:" +
                    " list, distinct_values, first, last, count, or distinct_count; found " +
                    statsFunction);
            }
            else if ("number" === f.type && 
                !utils.contains([
                    "sum",
                    "count",
                    "average",
                    "min",
                    "max",
                    "stdev",
                    "list",
                    "values"
                    ], statsFunction)
                ) {
                throw new Error("Stats function on number field must be must be one of:" +
                    " sum, count, average, max, min, stdev, list, or distinct_values; found " +
                    statsFunction
                    );
            }
            else if ("timestamp" === f.type &&
                !utils.contains([
                    "duration",
                    "earliest",
                    "latest",
                    "list",
                    "values"
                    ], statsFunction)
                ) {
                throw new Error("Stats function on timestamp field must be one of:" +
                    " duration, earliest, latest, list, or distinct values; found " +
                    statsFunction
                    );
            }
            else if (utils.contains(["objectCount", "childCount"], f.type) &&
                "count" !== statsFunction
                ) {
                throw new Error("Stats function on childcount and objectcount fields must be count; " +
                    "found " + statsFunction);
            }
            else if ("boolean" === f.type) {
                throw new Error("Cannot use boolean valued fields as cell values.");
            }

            this.cells.push({
                fieldName: fieldName,
                owner: f.lineage.join("."),
                type: f.type,
                label: label,
                sparkline: false, // Not properly implemented in core yet.
                value: statsFunction
            });

            return this;
        },
        
        /**
         * Returns a JSON ready object representation of this pivot specification.
         *
         * @return {Object} The JSON ready object representation of this pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        toJsonObject: function() {
            return {
                dataModel: this.dataModelObject.dataModel.name,
                baseClass: this.dataModelObject.name,
                rows: this.rows,
                columns: this.columns,
                cells: this.cells,
                filters: this.filters
            };
        },

        /**
         * Query Splunk for SPL queries corresponding to a pivot report
         * for this data model, defined by this `PivotSpecification`.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var searches = dataModels.item("internal_audit_logs").objectByName("searches");
         *          var pivotSpec = searches.createPivotSpecification();
         *          // Use of the fluent API
         *          pivotSpec.addRowSplit("user", "Executing user")
         *              .addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4})
         *              .addCellValue("search", "Search Query", "values")
         *              .pivot(function(pivotErr, pivot) {
         *                  console.log("Pivot search is:", pivot.search);
         *              });
         *      });
         *
         * @param {Function} callback A function to call when done getting the pivot: `(err, pivot)`.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        pivot: function(callback) {
            var svc = this.dataModelObject.dataModel.service;

            var args = {
                pivot_json: JSON.stringify(this.toJsonObject())
            };

            if (!utils.isUndefined(this.accelerationNamespace)) {
                args.namespace = this.accelerationNamespace;
            }
            
            return svc.get(Paths.pivot + "/" + encodeURIComponent(this.dataModelObject.dataModel.name), args, function(err, response) {
                if (err) {
                    callback(new Error(err.data.messages[0].text), response);
                    return;
                }

                if (response.data.entry && response.data.entry[0]) {
                    callback(null, new root.Pivot(svc, response.data.entry[0].content));
                }
                else {
                    callback(new Error("Didn't get a Pivot report back from Splunk"), response);
                }
            });
        },

        /**
         * Convenience method to wrap up the `PivotSpecification.pivot()` and
         * `Pivot.run()` function calls.
         *
         * Query Splunk for SPL queries corresponding to a pivot report
         * for this data model, defined by this `PivotSpecification`; then,
         * starts a search job running this pivot, accelerated if possible.
         *
         *      service.dataModels().fetch(function(fetchErr, dataModels) {
         *          var searches = dataModels.item("internal_audit_logs").objectByName("searches");
         *          var pivotSpec = searches.createPivotSpecification();
         *          // Use of the fluent API
         *          pivotSpec.addRowSplit("user", "Executing user")
         *              .addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4})
         *              .addCellValue("search", "Search Query", "values")
         *              .run(function(err, job, pivot) {
         *                  console.log("Job SID is:", job.sid);
         *                  console.log("Pivot search is:", pivot.search);
         *              });
         *      });
         * @param {Object} args A dictionary of properties for the search job (optional). For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         * @param {Function} callback A function to call when done getting the pivot: `(err, job, pivot)`.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        run: function(args, callback) {
            if (!callback) {
                callback = args;
                args = {};
            }
            args = args || {};

            this.pivot(function(err, pivot) {
                if (err) {
                    callback(err, null, null);
                }
                else {
                    pivot.run(args, Async.augment(callback, pivot));
                }
            });
        }
    });

    /**
     * Represents one of the structured views in a `DataModel`.
     *
     * Has these properties:
     *    - `dataModel` (_splunkjs.Service.DataModel_): The `DataModel` to which this `DataModelObject` belongs.
     *    - `name` (_string_): The name of this `DataModelObject`.
     *    - `displayName` (_string_): The human readable name of this `DataModelObject`.
     *    - `parentName` (_string_): The name of the parent `DataModelObject` to this one.
     *    - `lineage` (_array_): An array of strings of the lineage of the data model
     *          on which this field is defined.
     *    - `fields` (_object_): A dictionary of `DataModelField` objects, accessible by name.
     *    - `constraints` (_array_): An array of `DataModelConstraint` objects.
     *    - `calculations` (_object_): A dictionary of `DataModelCalculation` objects, accessible by ID.
     *
     * BaseSearch has an additional property:
     *    - `baseSearch` (_string_): The search query wrapped by this data model object.
     *
     * BaseTransaction has additional properties:
     *    - `groupByFields` (_string_): The fields that will be used to group events into transactions.
     *    - `objectsToGroup` (_array_): Names of the data model objects that should be unioned
     *        and split into transactions.
     *    - `maxSpan` (_string_): The maximum time span of a transaction.
     *    - `maxPause` (_string_): The maximum pause time of a transaction.
     *
     * @class splunkjs.Service.DataModelObject
     */
    root.DataModelObject = Class.extend({
        /**
         * Constructor for a data model object.
         * SDK users are not expected to invoke this constructor directly.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `objectName` (_string_): The name for this data model object.
         *     - `displayName` (_string_): A human readable name for this data model object.
         *     - `parentName` (_string_): The name of the data model that owns this data model object.
         *     - `lineage` (_string_): The lineage of the data model that owns this data model object,
         *          items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *     - `fields` (_array_): An array of data model fields.
         *     - `constraints` (_array_): An array of data model constraints.
         *     - `calculations` (_array_): An array of data model calculations.
         *     - `baseSearch` (_string_): The search query wrapped by this data model object; exclusive to BaseSearch (optional)
         *     - `groupByFields` (_array_): The fields that will be used to group events into transactions; exclusive to BaseTransaction (optional)
         *     - `objectsToGroup` (_array_): Names of the data model objects that should be unioned
         *         and split into transactions; exclusive to BaseTransaction (optional)
         *     - `maxSpan` (_string_): The maximum time span of a transaction; exclusive to BaseTransaction (optional)
         *     - `maxPause` (_string_): The maximum pause time of a transaction; exclusive to BaseTransaction (optional)
         *
         * @param {splunkjs.Service.DataModel} parentDataModel The `DataModel` that owns this data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        init: function(props, parentDataModel) {
            props = props || {};
            props.owner = props.owner || "";

            this.dataModel              = parentDataModel;
            this.name                   = props.objectName;
            this.displayName            = props.displayName;
            this.parentName             = props.parentName;
            this.lineage                = props.lineage.split(".");

            // Properties exclusive to BaseTransaction
            if (props.hasOwnProperty("groupByFields")) {
                this.groupByFields = props.groupByFields;
            }
            if (props.hasOwnProperty("objectsToGroup")) {
                this.objectsToGroup = props.objectsToGroup;
            }
            if (props.hasOwnProperty("transactionMaxTimeSpan")) {
                this.maxSpan = props.transactionMaxTimeSpan;
            }
            if (props.hasOwnProperty("transactionMaxPause")) {
                this.maxPause = props.transactionMaxPause;
            }

            // Property exclusive to BaseSearch
            if (props.hasOwnProperty("baseSearch")) {
                this.baseSearch = props.baseSearch;
            }

            // Parse fields
            this.fields = {};
            for (var i = 0; i < props.fields.length; i++) {
                this.fields[props.fields[i].fieldName] = new root.DataModelField(props.fields[i]);
            }

            // Parse constraints
            this.constraints = [];
            for (var j = 0; j < props.constraints.length; j++) {
                this.constraints.push(new root.DataModelConstraint(props.constraints[j]));
            }

            // Parse calculations
            this.calculations = [];
            for (var k = 0; k < props.calculations.length; k++) {
                this.calculations[props.calculations[k].calculationID] = new root.DataModelCalculation(props.calculations[k]);
            }
        },

        /**
         * Is this data model object a BaseSearch?
         *
         * @return {Boolean} Whether this data model object is the root type, BaseSearch.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseSearch: function() {
            return !utils.isUndefined(this.baseSearch);
        },

        /**
         * Is this data model object is a BaseTransaction?
         *
         * @return {Boolean} Whether this data model object is the root type, BaseTransaction.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseTransaction: function() {
            return !utils.isUndefined(this.maxSpan);
        },

        /**
         * Returns a string array of the names of this data model object's fields.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        fieldNames: function() {
            return Object.keys(this.fields);
        },

        /**
         * Returns a data model field instance, representing a field on this
         * data model object. 
         *
         * @return {splunkjs.Service.DataModelField|null} The data model field
         * from this data model object with the specified name, null if it the 
         * field by that name doesn't exist.
         *
         * @method splunkjs.Service.DataModelObject
         */
        fieldByName: function(name) {
            return this.calculatedFields()[name] || this.fields[name] || null;
        },
        
        /**
         * Returns an array of data model fields from this data model object's
         * calculations, and this data model object's fields.
         *
         * @return {Array} An array of `splunk.Service.DataModelField` objects
         * which includes this data model object's fields, and the fields from
         * this data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        allFields: function() {
            // merge fields and calculatedFields()
            var combinedFields = [];

            for (var f in this.fields) {
                if (this.fields.hasOwnProperty(f)) {
                    combinedFields[f] = this.fields[f];
                }
            }

            var calculatedFields = this.calculatedFields();
            for (var cf in calculatedFields) {
                if (calculatedFields.hasOwnProperty(cf)) {
                    combinedFields[cf] = calculatedFields[cf];
                }
            }

            return combinedFields;
        },

        /**
         * Returns a string array of the field names of this data model object's
         * calculations, and the names of this data model object's fields.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object's calculations, and the names of fields on 
         * this data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        allFieldNames: function() {
            return Object.keys(this.allFields());
        },

        /**
         * Returns an array of data model fields from this data model object's
         * calculations.
         *
         * @return {Array} An array of `splunk.Service.DataModelField` objects
         * of the fields from this data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculatedFields: function(){
            var fields = {};
            // Iterate over the calculations, get their fields
            var keys = this.calculationIDs();
            var calculations = this.calculations;
            for (var i = 0; i < keys.length; i++) {
                var calculation = calculations[keys[i]];
                for (var f = 0; f < calculation.outputFieldNames().length; f++) {
                    fields[calculation.outputFieldNames()[f]] = calculation.outputFields[calculation.outputFieldNames()[f]];
                }
            }
            return fields;
        },

        /**
         * Returns a string array of the field names of this data model object's
         * calculations.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculatedFieldNames: function() {
            return Object.keys(this.calculatedFields());
        },

        /**
         * Returns whether this data model object contains the field with the
         * name passed in the `fieldName` parameter.
         *
         * @param {String} fieldName The name of the field to look for.
         * @return {Boolean} True if this data model contains the field by name.
         *
         * @method splunkjs.Service.DataModelObject
         */
        hasField: function(fieldName) {
            return utils.contains(this.allFieldNames(), fieldName);
        },

        /**
         * Returns a string array of the IDs of this data model object's
         * calculations.
         *
         * @return {Array} An array of strings with the IDs of this data model
         * object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculationIDs: function() {
            return Object.keys(this.calculations);
        },

        /**
         * Local acceleration is tsidx acceleration of a data model object that is handled
         * manually by a user. You create a job which generates an index, and then use that
         * index in your pivots on the data model object.
         *
         * The namespace created by the job is 'sid={sid}' where {sid} is the job's sid. You
         * would use it in another job by starting your search query with `| tstats ... from sid={sid} | ...`
         *
         * The tsidx index created by this job is deleted when the job is garbage collected by Splunk.
         *
         * It is the user's responsibility to manage this job, including cancelling it.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var object = dataModels.item("some_data_model").objectByName("some_object");
         *          object.createLocalAccelerationJob("-1d", function(err, accelerationJob) {
         *              console.log("The job has name:", accelerationJob.name);
         *          });
         *      });
         *
         * @param {String} earliestTime A time modifier (e.g., "-2w") setting the earliest time to index.
         * @param {Function} callback A function to call with the search job: `(err, accelerationJob)`.
         *
         * @method splunkjs.Service.DataModelObject
         */
        createLocalAccelerationJob: function(earliestTime, callback) {
            // If earliestTime parameter is not specified, then set callback to its value
            if (!callback && utils.isFunction(earliestTime)) {
                callback = earliestTime;
                earliestTime = undefined;
            }

            var query = "| datamodel \"" + this.dataModel.name + "\" " + this.name + " search | tscollect";
            var args = earliestTime ? {earliest_time: earliestTime} : {};

            this.dataModel.service.search(query, args, callback);
        },

        /**
         * Start a search job that applies querySuffix to all the events in this data model object.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var object = dataModels.item("internal_audit_logs").objectByName("searches");
         *          object.startSearch({}, "| head 5", function(err, job) {
         *              console.log("The job has name:", job.name);
         *          });
         *      });
         *
         * @param {Object} params A dictionary of properties for the search job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         * @param {String} querySuffix A search query, starting with a '|' that will be appended to the command to fetch the contents of this data model object (e.g., "| head 3").
         * @param {Function} callback A function to call with the search job: `(err, job)`.
         *
         * @method splunkjs.Service.DataModelObject
         */
        startSearch: function(params, querySuffix, callback) {
            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search";
            // Prepend a space to the querySuffix, or set it to an empty string if null or undefined
            querySuffix = (querySuffix) ? (" " + querySuffix) : ("");
            this.dataModel.service.search(query + querySuffix, params, callback);
        },
        
        /**
         * Returns the data model object this one inherits from if it is a user defined,
         * otherwise return null.
         *
         * @return {splunkjs.Service.DataModelObject|null} This data model object's parent
         *     or null if this is not a user defined data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        parent: function() {
            return this.dataModel.objectByName(this.parentName);
        },
        
        /**
         * Returns a new Pivot Specification, accepts no parameters.
         *
         * @return {splunkjs.Service.PivotSpecification} A new pivot specification.
         *
         * @method splunkjs.Service.DataModelObject
         */
        createPivotSpecification: function() {
            // Pass in this DataModelObject to create a PivotSpecification
            return new root.PivotSpecification(this);
        }
    });
    
    /**
     * Represents a data model on the server. Data models
     * contain `DataModelObject` instances, which specify structured
     * views on Splunk data.
     *
     * @endpoint datamodel/model/{name}
     * @class splunkjs.Service.DataModel
     * @extends splunkjs.Service.Entity
     */
    root.DataModel = Service.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.DataModel
         */
        path: function() {
            return Paths.dataModels + "/" + encodeURIComponent(this.name);
        },

        /**
         * Constructor for `splunkjs.Service.DataModel`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new data model.
         * @param {Object} namespace (Optional) namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Object} props Properties of this data model:
         *    - `acceleration` (_string_): A JSON object with an `enabled` key, representing if acceleration is enabled or not.
         *    - `concise` (_string_): Indicates whether to list a concise JSON description of the data model, should always be "0".
         *    - `description` (_string_): The JSON describing the data model.
         *    - `displayName` (_string_): The name displayed for the data model in Splunk Web.
         *
         * @method splunkjs.Service.DataModel
         */
        init: function(service, name, namespace, props) {
            // If not given a 4th arg, assume the namespace was omitted
            if (!props) {
                props = namespace;
                namespace = {};
            }

            this.name = name;
            this._super(service, this.path(), namespace);

            this.acceleration = JSON.parse(props.content.acceleration) || {};
            if (this.acceleration.hasOwnProperty("enabled")) {
                // convert the enabled property to a boolean
                this.acceleration.enabled = !!this.acceleration.enabled;
            }

            // concise=0 (false) forces the server to return all details of the newly created data model.
            // we do not want a summary of this data model
            if (!props.hasOwnProperty("concise") || utils.isUndefined(props.concise)) {
                this.concise = "0";
            }

            var dataModelDefinition = JSON.parse(props.content.description);

            this.objectNames = dataModelDefinition.objectNameList;
            this.displayName = dataModelDefinition.displayName;
            this.description = dataModelDefinition.description;

            // Parse the objects for this data model           
            var objs = dataModelDefinition.objects;
            this.objects = [];
            for (var i = 0; i < objs.length; i++) {
                this.objects.push(new root.DataModelObject(objs[i], this));
            }

            this.remove = utils.bind(this, this.remove);
            this.update = utils.bind(this, this.update);
        },

        /**
         * Returns a boolean indicating whether acceleration is enabled or not.
         *
         * @return {Boolean} true if acceleration is enabled, false otherwise.
         *
         * @method splunkjs.Service.DataModel
         */
        isAccelerated: function() {
            return !!this.acceleration.enabled;
        },

        /**
         * Returns a data model object from this data model
         * with the specified name if it exists, null otherwise.
         *
         * @return {Object|null} a data model object.
         *
         * @method splunkjs.Service.DataModel
         */
        objectByName: function(name) {
            for (var i = 0; i < this.objects.length; i++) {
                if (this.objects[i].name === name) {
                    return this.objects[i];
                }
            }
            return null;
        },

        /**
         * Returns a boolean of whether this exists in this data model or not.
         *
         * @return {Boolean} Returns true if this data model has object with specified name, false otherwise.
         *
         * @method splunkjs.Service.DataModel
         */
        hasObject: function(name) {
            return utils.contains(this.objectNames, name);
        },

        /**
         * Updates the data model on the server, used to update acceleration settings.
         *
         * @param {Object} props A dictionary of properties to update the object with:
         *     - `acceleration` (_object_): The acceleration settings for the data model.
         *         Valid keys are: `enabled`, `earliestTime`, `cronSchedule`.
         *         Any keys not set will be pulled from the acceleration settings already
         *         set on this data model.
         * @param {Function} callback A function to call when the data model is updated: `(err, dataModel)`.
         *
         * @method splunkjs.Service.DataModel
         */
        update: function(props, callback) {
            if (utils.isUndefined(callback)) {
                callback = props;
                props = {};
            }
            callback = callback || function() {};

            if (!props) {
                callback(new Error("Must specify a props argument to update a data model."));
                return; // Exit if props isn't set, to avoid calling the callback twice.
            }
            if (props.hasOwnProperty("name")) {
                callback(new Error("Cannot set 'name' field in 'update'"), this);
                return; // Exit if the name is set, to avoid calling the callback twice.
            }

            var updatedProps = {
                acceleration: JSON.stringify({
                    enabled: props.accceleration && props.acceleration.enabled || this.acceleration.enabled,
                    earliest_time: props.accceleration && props.acceleration.earliestTime || this.acceleration.earliestTime,
                    cron_schedule: props.accceleration && props.acceleration.cronSchedule || this.acceleration.cronSchedule
                })
            };

            var that = this;
            return this.post("", updatedProps, function(err, response) {
                if (err) {
                    callback(err, that);
                }
                else {
                    var dataModelNamespace = utils.namespaceFromProperties(response.data.entry[0]);
                    callback(null, new root.DataModel(that.service, response.data.entry[0].name, dataModelNamespace, response.data.entry[0]));
                }
            });
        }
    });
    
    /**
     * Represents a collection of data models. You can create and
     * list data models using this collection container, or
     * get a specific data model.
     *
     * @endpoint datamodel/model
     * @class splunkjs.Service.DataModels
     * @extends splunkjs.Service.Collection
     */
    root.DataModels = Service.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.DataModels
         */
        path: function() {
            return Paths.dataModels;
        },

        /**
         * Constructor for `splunkjs.Service.DataModels`.
         * 
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} namespace (Optional) namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * 
         * @method splunkjs.Service.DataModels
         */
        init: function(service, namespace) {
            namespace = namespace || {};
            this._super(service, this.path(), namespace);
            this.create = utils.bind(this, this.create);
        },

        /**
         * Creates a new `DataModel` object with the given name and parameters.
         * It is preferred that you create data models through the Splunk
         * Enterprise with a browser.
         *
         * @param {String} name The name of the data model to create. If it contains spaces they will be replaced
         *     with underscores.
         * @param {Object} params A dictionary of properties.
         * @param {Function} callback A function to call with the new `DataModel` object: `(err, createdDataModel)`.
         *
         * @method splunkjs.Service.DataModels
         */
        create: function(name, params, callback) {
            // If we get (name, callback) instead of (name, params, callback)
            // do the necessary variable swap
            if (utils.isFunction(params) && !callback) {
                callback = params;
                params = {};
            }

            params = params || {};
            callback = callback || function(){};
            name = name.replace(/ /g, "_");

            var that = this;
            return this.post("", {name: name, description: JSON.stringify(params)}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var dataModel = new root.DataModel(that.service, response.data.entry[0].name, that.namespace, response.data.entry[0]);
                    callback(null, dataModel);
                }
            });
        },

        /**
         * Constructor for `splunkjs.Service.DataModel`.
         *
         * @constructor
         * @param {Object} props A dictionary of properties used to create a 
         * `DataModel` instance.
         * @return {splunkjs.Service.DataModel} A new `DataModel` instance.
         *
         * @method splunkjs.Service.DataModels
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.DataModel(this.service, props.name, entityNamespace, props);
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

});

require.define("/lib/async.js", function (require, module, exports, __dirname, __filename) {
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
    
    var utils = require('./utils');
    var root = exports || this;

    /**
     * Provides utilities for asynchronous control flow and collection handling.
     *
     * @module splunkjs.Async
     */

    /**
     * Runs an asynchronous `while` loop.
     *
     * @example
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
     * @param {Function} condition A function that returns a _boolean_ indicating whether the condition has been met.
     * @param {Function} body A function that runs the body of the loop: `(done)`.
     * @param {Function} callback The function to call when the loop is complete: `(err)`.
     *
     * @function splunkjs.Async
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
     * Runs multiple functions (tasks) in parallel. 
     * Each task takes the callback function as a parameter. 
     * When all tasks have been completed or if an error occurs, the callback 
     * function is called with the combined results of all tasks. 
     *
     * **Note**: Tasks might not be run in the same order as they appear in the array,
     * but the results will be returned in that order. 
     *
     * @example
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
     * @param {Function} tasks An array of functions: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err, ...)`.
     *
     * @function splunkjs.Async
     */
    root.parallel = function(tasks, callback) {
        // Allow for just a list of functions
        if (arguments.length > 1 && utils.isFunction(arguments[0])) {
            var args = utils.toArray(arguments);
            tasks = args.slice(0, args.length - 1);
            callback = args[args.length - 1];
        }
        
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
                    if (callback) {
                        callback(err);
                    }
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
     * Runs multiple functions (tasks) in series. 
     * Each task takes the callback function as a parameter. 
     * When all tasks have been completed or if an error occurs, the callback 
     * function is called with the combined results of all tasks in the order
     * they were run. 
     *
     * @example
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
     * @param {Function} tasks An array of functions: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err, ...)`.
     *
     * @function splunkjs.Async
     */
    root.series = function(tasks, callback) {
        // Allow for just a list of functions
        if (arguments.length > 1 && utils.isFunction(arguments[0])) {
            var args = utils.toArray(arguments);
            tasks = args.slice(0, args.length - 1);
            callback = args[args.length - 1];
        }
        
        tasks = tasks || [];
        callback = callback || function() {};
        
        var innerSeries = function(task, restOfTasks, resultsSoFar, callback) {
            if (!task) {
                resultsSoFar.unshift(null);
                callback.apply(null, resultsSoFar);
                return;
            }
            
            task(function(err) {
                if (err) {
                    if (callback) {
                        callback(err);
                    }
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
     * Runs an asynchronous function (mapping it) over each element in an array, in parallel.
     * When all tasks have been completed or if an error occurs, a callback
     * function is called with the resulting array.
     *
     * @example
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
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element: `(done)`. 
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err, mappedVals)`.
     *
     * @function splunkjs.Async
     */
    root.parallelMap = function(vals, fn, callback) {     
        vals = vals || [];
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
                if (callback) {
                    callback(err);
                }
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
     * Runs an asynchronous function (mapping it) over each element in an array, in series.
     * When all tasks have been completed or if an error occurs, a callback
     * function is called with the resulting array.
     *
     * @example
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
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err, mappedVals)`.
     *
     * @function splunkjs.Async
     */
    root.seriesMap = function(vals, fn, callback) {     
        vals = vals || [];
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
                if (callback) {
                    callback(err);
                }
            }
            else {
                var args = utils.toArray(arguments);
                args.shift();
                callback(null, args);
            }
        });
    };
    
    /**
     * Applies an asynchronous function over each element in an array, in parallel.
     * A callback function is called when all tasks have been completed. If an 
     * error occurs, the callback function is called with an error parameter.
     *
     * @example
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
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err)`.
     *
     * @function splunkjs.Async
     */
    root.parallelEach = function(vals, fn, callback) {  
        vals = vals || [];   
        callback = callback || function() {};
        
        root.parallelMap(vals, fn, function(err, result) {
            callback(err); 
        });
    };
    
    /**
     * Applies an asynchronous function over each element in an array, in series.
     * A callback function is called when all tasks have been completed. If an 
     * error occurs, the callback function is called with an error parameter.
     *
     * @example
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
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous)to apply to each element: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err)`.
     *
     * @function splunkjs.Async
     */
    root.seriesEach = function(vals, fn, callback) {    
        vals = vals || []; 
        callback = callback || function() {};
        
        root.seriesMap(vals, fn, function(err, result) {
            callback(err); 
        });
    };
    
    /**
     * Chains asynchronous tasks together by running a function (task) and
     * passing the results as arguments to the next task. When all tasks have 
     * been completed or if an error occurs, a callback function is called with 
     * the results of the final task.
     *
     * Each task takes one or more parameters, depending on the previous task in the chain.
     * The last parameter is always the function to run when the task is complete.
     *
     * `err` arguments are not passed to individual tasks, but are are propagated 
     * to the final callback function.
     *
     * @example
     *      
     *     Async.chain(
     *         function(callback) { 
     *             callback(null, 1, 2);
     *         },
     *         function(val1, val2, callback) {
     *             callback(null, val1 + 1);
     *         },
     *         function(val1, callback) {
     *             callback(null, val1 + 1, 5);
     *         },
     *         function(err, val1, val2) {
     *             console.log(val1); //== 3
     *             console.log(val2); //== 5
     *         }
     *     );
     *     
     * @param {Function} tasks An array of functions: `(done)`.
     * @param {Function} callback The function to call when all tasks are done or if an error occurred: `(err, ...)`.
     *
     * @function splunkjs.Async
     */
    root.chain = function(tasks, callback) {
        // Allow for just a list of functions
        if (arguments.length > 1 && utils.isFunction(arguments[0])) {
            var args = utils.toArray(arguments);
            tasks = args.slice(0, args.length - 1);
            callback = args[args.length - 1];
        }
        
        tasks = tasks || [];
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
     * Runs a function after a delay (a specified timeout period). 
     * The main purpose of this function is to make `setTimeout` adhere to 
     * Node.js-style function signatures.
     *
     * @example
     *      
     *     Async.sleep(1000, function() { console.log("TIMEOUT");});
     *     
     * @param {Number} timeout The timeout period, in milliseconds.
     * @param {Function} callback The function to call when the timeout occurs.
     *
     * @function splunkjs.Async
     */
    root.sleep = function(timeout, callback) {
        setTimeout(function() {
            callback();   
        }, timeout);
    };
    
    /**
     * Runs a callback function with additional parameters, which are appended to
     * the parameter list. 
     *
     * @example
     *
     *      var callback = function(a, b) {
     *          console.log(a); //== 1
     *          console.log(b); //== 2
     *      };
     *      
     *      var augmented = Async.augment(callback, 2);
     *      augmented(1);
     *     
     * @param {Function} callback The callback function to augment.
     * @param {Anything...} rest The number of arguments to add.
     *
     * @function splunkjs.Async
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

require.define("/lib/modularinputs/index.js", function (require, module, exports, __dirname, __filename) {

// Copyright 2014 Splunk, Inc.
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

var Async = require('../async');

var ModularInputs = {
    utils: require("./utils"),
    ValidationDefinition: require('./validationdefinition'),
    InputDefinition: require('./inputdefinition'),
    Event: require('./event'),
    EventWriter: require('./eventwriter'),
    Argument: require('./argument'),
    Scheme: require('./scheme'),
    ModularInput: require('./modularinput'),
    Logger: require('./logger')
};

/**
 * Executes a modular input script.
 *
 * @param {Object} exports An instance of ModularInput representing a modular input.
 * @param {Object} module The module object, used for determining if it's the main module (`require.main`).
 */
ModularInputs.execute = function(exports, module) {
    if (require.main === module) {
        // Slice process.argv ignoring the first argument as it is the path to the node executable.
        var args = process.argv.slice(1);

        // Default empty functions for life cycle events.
        exports.setup       = exports.setup     || ModularInputs.ModularInput.prototype.setup;
        exports.start       = exports.start     || ModularInputs.ModularInput.prototype.start;
        exports.end         = exports.end       || ModularInputs.ModularInput.prototype.end;
        exports.teardown    = exports.teardown  || ModularInputs.ModularInput.prototype.teardown;

        // Setup the default values.
        exports._inputDefinition = exports._inputDefinition || null;
        exports._service         = exports._service         || null;

        // We will call close() on this EventWriter after streaming events, which is handled internally
        // by ModularInput.runScript().
        var ew = new this.EventWriter();

        // In order to ensure that everything that is written to stdout/stderr is flushed before we exit,
        // set the file handles to blocking. This ensures we exit properly in a timely fashion.
        // https://github.com/nodejs/node/issues/6456
        [process.stdout, process.stderr].forEach(function(s) {
          s && s.isTTY && s._handle && s._handle.setBlocking && s._handle.setBlocking(true);
        });

        var scriptStatus;
        Async.chain([
                function(done) {
                    exports.setup(done);
                },
                function(done) {
                    ModularInputs.ModularInput.runScript(exports, args, ew, process.stdin, done);
                },
                function(status, done) {
                    scriptStatus = status;
                    exports.teardown(done);
                }
            ],
            function(err) {
                if (err) {
                    ModularInputs.Logger.error('', err, ew._err);
                }

                process.exit(scriptStatus || err ? 1 : 0);
            }
        );
    }
};

module.exports = ModularInputs;

});

require.define("/lib/modularinputs/utils.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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

var utils   = require('../utils'); // Get all of the existing utils

/**
 * Parse the parameters from an `InputDefinition` or `ValidationDefinition`.
 *
 * This is a helper function for `parseXMLData`.
 *
 * The XML typically will look like this:
 * 
 *   `<configuration>`
 *     `<stanza name="foobar://aaa">`
 *       `<param name="param1">value1</param>`
 *       `<param name="param2">value2</param>`
 *       `<param name="disabled">0</param>`
 *       `<param name="index">default</param>`
 *     `</stanza>`
 *     `<stanza name="foobar://bbb">`
 *       `<param name="param1">value11</param>`
 *       `<param name="param2">value22</param>`
 *       `<param name="disabled">0</param>`
 *       `<param name="index">default</param>`
 *       `<param_list name="multiValue">`
 *         `<value>value1</value>`
 *         `<value>value2</value>`
 *       `</param_list>`
 *       `<param_list name="multiValue2">`
 *         `<value>value3</value>`
 *         `<value>value4</value>`
 *       `</param_list>`
 *     `</stanza>`
 *   `</configuration>`
 *
 * @param {Object} an `Elementree` object representing the `<configuration>` XML node.
 * @return {Object} an `Elementree` object representing the parameters of node passed in.
 */
utils.parseParameters = function(paramNode) {
    switch (paramNode.tag) {
        case "param":
            return paramNode.text;
        case "param_list":
            var parameters = [];
            var paramChildren = paramNode.getchildren();
            for (var i = 0; i < paramChildren.length; i++) {
                var mvp = paramChildren[i];
                parameters.push(mvp.text);
            }
            return parameters;
        default:
            throw new Error("Invalid configuration scheme, <" + paramNode.tag + "> tag unexpected.");
    }
};

/**
 * Parses the parameters from `Elementtree` representations of XML for
 * `InputDefinition` and `ValidationDefinition` objects.
 *
 * @param {Object} a parent `Elementtree` element object.
 * @param {String} the name of the child element to parse parameters from.
 * @return {Object} an object of the parameters parsed.
 */
utils.parseXMLData = function(parentNode, childNodeTag) {
    var data = {};
    var children = parentNode.getchildren();
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.tag === childNodeTag) {
            if (childNodeTag === "stanza") {
                data[child.get("name")] = {};
                var stanzaChildren = child.getchildren();
                for (var p = 0; p < stanzaChildren.length; p++) {
                    var param = stanzaChildren[p];
                    data[child.get("name")][param.get("name")] = utils.parseParameters(param);
                }
            }
        }
        else if ("item" === parentNode.tag) {
            data[child.get("name")] = utils.parseParameters(child);
        }
    }
    return data;
};

module.exports = utils;

});

require.define("/lib/modularinputs/validationdefinition.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET      = require("elementtree");
    var utils   = require("./utils");

    /**
     * This class represents the XML sent by Splunk for external validation of a
     * new modular input.
     *
     * @example
     *
     *      var v =  new ValidationDefinition();
     *
     * @class splunkjs.ModularInputs.ValidationDefinition
     */
    function ValidationDefinition() {
        this.metadata = {};
        this.parameters = {};
    }

    /**
     * Creates a `ValidationDefinition` from a provided string containing XML.
     *
     * This function will throw an exception if `str`
     * contains unexpected XML.
     *
     * The XML typically will look like this:
     * 
     * `<items>`
     * `   <server_host>myHost</server_host>`
     * `     <server_uri>https://127.0.0.1:8089</server_uri>`
     * `     <session_key>123102983109283019283</session_key>`
     * `     <checkpoint_dir>/opt/splunk/var/lib/splunk/modinputs</checkpoint_dir>`
     * `     <item name="myScheme">`
     * `       <param name="param1">value1</param>`
     * `       <param_list name="param2">`
     * `         <value>value2</value>`
     * `         <value>value3</value>`
     * `         <value>value4</value>`
     * `       </param_list>`
     * `     </item>`
     * `</items>`
     *
     * @param {String} str A string containing XML to parse.
     *
     * @function splunkjs.ModularInputs.ValidationDefinition
     */
    ValidationDefinition.parse = function(str) {
        var definition = new ValidationDefinition();
        var rootChildren = ET.parse(str).getroot().getchildren();

        for (var i = 0; i < rootChildren.length; i++) {
            var node = rootChildren[i];            
            if (node.tag === "item") {
                definition.metadata["name"] = node.get("name");
                definition.parameters = utils.parseXMLData(node, "");
            }
            else {
                definition.metadata[node.tag] = node.text;
            }
        }
        return definition;
    };
    
    module.exports = ValidationDefinition;
})();
});

require.define("/node_modules/elementtree/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"lib/elementtree.js"}
});

require.define("/node_modules/elementtree/lib/elementtree.js", function (require, module, exports, __dirname, __filename) {
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var sprintf = require('./sprintf').sprintf;

var utils = require('./utils');
var ElementPath = require('./elementpath');
var TreeBuilder = require('./treebuilder').TreeBuilder;
var get_parser = require('./parser').get_parser;
var constants = require('./constants');

var element_ids = 0;

function Element(tag, attrib)
{
  this._id = element_ids++;
  this.tag = tag;
  this.attrib = {};
  this.text = null;
  this.tail = null;
  this._children = [];

  if (attrib) {
    this.attrib = utils.merge(this.attrib, attrib);
  }
}

Element.prototype.toString = function()
{
  return sprintf("<Element %s at %s>", this.tag, this._id);
};

Element.prototype.makeelement = function(tag, attrib)
{
  return new Element(tag, attrib);
};

Element.prototype.len = function()
{
  return this._children.length;
};

Element.prototype.getItem = function(index)
{
  return this._children[index];
};

Element.prototype.setItem = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.delItem = function(index)
{
  this._children.splice(index, 1);
};

Element.prototype.getSlice = function(start, stop)
{
  return this._children.slice(start, stop);
};

Element.prototype.setSlice = function(start, stop, elements)
{
  var i;
  var k = 0;
  for (i = start; i < stop; i++, k++) {
    this._children[i] = elements[k];
  }
};

Element.prototype.delSlice = function(start, stop)
{
  this._children.splice(start, stop - start);
};

Element.prototype.append = function(element)
{
  this._children.push(element);
};

Element.prototype.extend = function(elements)
{
  this._children.concat(elements);
};

Element.prototype.insert = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.remove = function(element)
{
  this._children = this._children.filter(function(e) {
    /* TODO: is this the right way to do this? */
    if (e._id === element._id) {
      return false;
    }
    return true;
  });
};

Element.prototype.getchildren = function() {
  return this._children;
};

Element.prototype.find = function(path)
{
  return ElementPath.find(this, path);
};

Element.prototype.findtext = function(path, defvalue)
{
  return ElementPath.findtext(this, path, defvalue);
};

Element.prototype.findall = function(path, defvalue)
{
  return ElementPath.findall(this, path, defvalue);
};

Element.prototype.clear = function()
{
  this.attrib = {};
  this._children = [];
  this.text = null;
  this.tail = null;
};

Element.prototype.get = function(key, defvalue)
{
  if (this.attrib[key] !== undefined) {
    return this.attrib[key];
  }
  else {
    return defvalue;
  }
};

Element.prototype.set = function(key, value)
{
  this.attrib[key] = value;
};

Element.prototype.keys = function()
{
  return Object.keys(this.attrib);
};

Element.prototype.items = function()
{
  return utils.items(this.attrib);
};

/*
 * In python this uses a generator, but in v8 we don't have em,
 * so we use a callback instead.
 **/
Element.prototype.iter = function(tag, callback)
{
  var self = this;
  var i, child;

  if (tag === "*") {
    tag = null;
  }

  if (tag === null || this.tag === tag) {
    callback(self);
  }

  for (i = 0; i < this._children.length; i++) {
    child = this._children[i];
    child.iter(tag, function(e) {
      callback(e);
    });
  }
};

Element.prototype.itertext = function(callback)
{
  this.iter(null, function(e) {
    if (e.text) {
      callback(e.text);
    }

    if (e.tail) {
      callback(e.tail);
    }
  });
};


function SubElement(parent, tag, attrib) {
  var element = parent.makeelement(tag, attrib);
  parent.append(element);
  return element;
}

function Comment(text) {
  var element = new Element(Comment);
  if (text) {
    element.text = text;
  }
  return element;
}

function CData(text) {
  var element = new Element(CData);
  if (text) {
    element.text = text;
  }
  return element;
}

function ProcessingInstruction(target, text)
{
  var element = new Element(ProcessingInstruction);
  element.text = target;
  if (text) {
    element.text = element.text + " " + text;
  }
  return element;
}

function QName(text_or_uri, tag)
{
  if (tag) {
    text_or_uri = sprintf("{%s}%s", text_or_uri, tag);
  }
  this.text = text_or_uri;
}

QName.prototype.toString = function() {
  return this.text;
};

function ElementTree(element)
{
  this._root = element;
}

ElementTree.prototype.getroot = function() {
  return this._root;
};

ElementTree.prototype._setroot = function(element) {
  this._root = element;
};

ElementTree.prototype.parse = function(source, parser) {
  if (!parser) {
    parser = get_parser(constants.DEFAULT_PARSER);
    parser = new parser.XMLParser(new TreeBuilder());
  }

  parser.feed(source);
  this._root = parser.close();
  return this._root;
};

ElementTree.prototype.iter = function(tag, callback) {
  this._root.iter(tag, callback);
};

ElementTree.prototype.find = function(path) {
  return this._root.find(path);
};

ElementTree.prototype.findtext = function(path, defvalue) {
  return this._root.findtext(path, defvalue);
};

ElementTree.prototype.findall = function(path) {
  return this._root.findall(path);
};

/**
 * Unlike ElementTree, we don't write to a file, we return you a string.
 */
ElementTree.prototype.write = function(options) {
  var sb = [];
  options = utils.merge({
    encoding: 'utf-8',
    xml_declaration: null,
    default_namespace: null,
    method: 'xml'}, options);

  if (options.xml_declaration !== false) {
    sb.push("<?xml version='1.0' encoding='"+options.encoding +"'?>\n");
  }

  if (options.method === "text") {
    _serialize_text(sb, self._root, encoding);
  }
  else {
    var qnames, namespaces, indent, indent_string;
    var x = _namespaces(this._root, options.encoding, options.default_namespace);
    qnames = x[0];
    namespaces = x[1];

    if (options.hasOwnProperty('indent')) {
      indent = 0;
      indent_string = new Array(options.indent + 1).join(' ');
    }
    else {
      indent = false;
    }

    if (options.method === "xml") {
      _serialize_xml(function(data) {
        sb.push(data);
      }, this._root, options.encoding, qnames, namespaces, indent, indent_string);
    }
    else {
      /* TODO: html */
      throw new Error("unknown serialization method "+ options.method);
    }
  }

  return sb.join("");
};

var _namespace_map = {
    /* "well-known" namespace prefixes */
    "http://www.w3.org/XML/1998/namespace": "xml",
    "http://www.w3.org/1999/xhtml": "html",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://schemas.xmlsoap.org/wsdl/": "wsdl",
    /* xml schema */
    "http://www.w3.org/2001/XMLSchema": "xs",
    "http://www.w3.org/2001/XMLSchema-instance": "xsi",
    /* dublic core */
    "http://purl.org/dc/elements/1.1/": "dc",
};

function register_namespace(prefix, uri) {
  if (/ns\d+$/.test(prefix)) {
    throw new Error('Prefix format reserved for internal use');
  }

  if (_namespace_map.hasOwnProperty(uri) && _namespace_map[uri] === prefix) {
    delete _namespace_map[uri];
  }

  _namespace_map[uri] = prefix;
}


function _escape(text, encoding, isAttribute, isText) {
  if (text) {
    text = text.toString();
    text = text.replace(/&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    if (!isText) {
        text = text.replace(/\n/g, '&#xA;');
        text = text.replace(/\r/g, '&#xD;');
    }
    if (isAttribute) {
      text = text.replace(/"/g, '&quot;');
    }
  }
  return text;
}

/* TODO: benchmark single regex */
function _escape_attrib(text, encoding) {
  return _escape(text, encoding, true);
}

function _escape_cdata(text, encoding) {
  return _escape(text, encoding, false);
}

function _escape_text(text, encoding) {
  return _escape(text, encoding, false, true);
}

function _namespaces(elem, encoding, default_namespace) {
  var qnames = {};
  var namespaces = {};

  if (default_namespace) {
    namespaces[default_namespace] = "";
  }

  function encode(text) {
    return text;
  }

  function add_qname(qname) {
    if (qname[0] === "{") {
      var tmp = qname.substring(1).split("}", 2);
      var uri = tmp[0];
      var tag = tmp[1];
      var prefix = namespaces[uri];

      if (prefix === undefined) {
        prefix = _namespace_map[uri];
        if (prefix === undefined) {
          prefix = "ns" + Object.keys(namespaces).length;
        }
        if (prefix !== "xml") {
          namespaces[uri] = prefix;
        }
      }

      if (prefix) {
        qnames[qname] = sprintf("%s:%s", prefix, tag);
      }
      else {
        qnames[qname] = tag;
      }
    }
    else {
      if (default_namespace) {
        throw new Error('cannot use non-qualified names with default_namespace option');
      }

      qnames[qname] = qname;
    }
  }


  elem.iter(null, function(e) {
    var i;
    var tag = e.tag;
    var text = e.text;
    var items = e.items();

    if (tag instanceof QName && qnames[tag.text] === undefined) {
      add_qname(tag.text);
    }
    else if (typeof(tag) === "string") {
      add_qname(tag);
    }
    else if (tag !== null && tag !== Comment && tag !== CData && tag !== ProcessingInstruction) {
      throw new Error('Invalid tag type for serialization: '+ tag);
    }

    if (text instanceof QName && qnames[text.text] === undefined) {
      add_qname(text.text);
    }

    items.forEach(function(item) {
      var key = item[0],
          value = item[1];
      if (key instanceof QName) {
        key = key.text;
      }

      if (qnames[key] === undefined) {
        add_qname(key);
      }

      if (value instanceof QName && qnames[value.text] === undefined) {
        add_qname(value.text);
      }
    });
  });
  return [qnames, namespaces];
}

function _serialize_xml(write, elem, encoding, qnames, namespaces, indent, indent_string) {
  var tag = elem.tag;
  var text = elem.text;
  var items;
  var i;

  var newlines = indent || (indent === 0);
  write(Array(indent + 1).join(indent_string));

  if (tag === Comment) {
    write(sprintf("<!--%s-->", _escape_cdata(text, encoding)));
  }
  else if (tag === ProcessingInstruction) {
    write(sprintf("<?%s?>", _escape_cdata(text, encoding)));
  }
  else if (tag === CData) {
    text = text || '';
    write(sprintf("<![CDATA[%s]]>", text));
  }
  else {
    tag = qnames[tag];
    if (tag === undefined) {
      if (text) {
        write(_escape_text(text, encoding));
      }
      elem.iter(function(e) {
        _serialize_xml(write, e, encoding, qnames, null, newlines ? indent + 1 : false, indent_string);
      });
    }
    else {
      write("<" + tag);
      items = elem.items();

      if (items || namespaces) {
        items.sort(); // lexical order

        items.forEach(function(item) {
          var k = item[0],
              v = item[1];

            if (k instanceof QName) {
              k = k.text;
            }

            if (v instanceof QName) {
              v = qnames[v.text];
            }
            else {
              v = _escape_attrib(v, encoding);
            }
            write(sprintf(" %s=\"%s\"", qnames[k], v));
        });

        if (namespaces) {
          items = utils.items(namespaces);
          items.sort(function(a, b) { return a[1] < b[1]; });

          items.forEach(function(item) {
            var k = item[1],
                v = item[0];

            if (k) {
              k = ':' + k;
            }

            write(sprintf(" xmlns%s=\"%s\"", k, _escape_attrib(v, encoding)));
          });
        }
      }

      if (text || elem.len()) {
        if (text && text.toString().match(/^\s*$/)) {
            text = null;
        }

        write(">");
        if (!text && newlines) {
          write("\n");
        }

        if (text) {
          write(_escape_text(text, encoding));
        }
        elem._children.forEach(function(e) {
          _serialize_xml(write, e, encoding, qnames, null, newlines ? indent + 1 : false, indent_string);
        });

        if (!text && indent) {
          write(Array(indent + 1).join(indent_string));
        }
        write("</" + tag + ">");
      }
      else {
        write(" />");
      }
    }
  }

  if (newlines) {
    write("\n");
  }
}

function parse(source, parser) {
  var tree = new ElementTree();
  tree.parse(source, parser);
  return tree;
}

function tostring(element, options) {
  return new ElementTree(element).write(options);
}

exports.PI = ProcessingInstruction;
exports.Comment = Comment;
exports.CData = CData;
exports.ProcessingInstruction = ProcessingInstruction;
exports.SubElement = SubElement;
exports.QName = QName;
exports.ElementTree = ElementTree;
exports.ElementPath = ElementPath;
exports.Element = function(tag, attrib) {
  return new Element(tag, attrib);
};

exports.XML = function(data) {
  var et = new ElementTree();
  return et.parse(data);
};

exports.parse = parse;
exports.register_namespace = register_namespace;
exports.tostring = tostring;

});

require.define("/node_modules/elementtree/lib/sprintf.js", function (require, module, exports, __dirname, __filename) {
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var cache = {};


// Do any others need escaping?
var TO_ESCAPE = {
  '\'': '\\\'',
  '\n': '\\n'
};


function populate(formatter) {
  var i, type,
      key = formatter,
      prev = 0,
      arg = 1,
      builder = 'return \'';

  for (i = 0; i < formatter.length; i++) {
    if (formatter[i] === '%') {
      type = formatter[i + 1];

      switch (type) {
        case 's':
          builder += formatter.slice(prev, i) + '\' + arguments[' + arg + '] + \'';
          prev = i + 2;
          arg++;
          break;
        case 'j':
          builder += formatter.slice(prev, i) + '\' + JSON.stringify(arguments[' + arg + ']) + \'';
          prev = i + 2;
          arg++;
          break;
        case '%':
          builder += formatter.slice(prev, i + 1);
          prev = i + 2;
          i++;
          break;
      }


    } else if (TO_ESCAPE[formatter[i]]) {
      builder += formatter.slice(prev, i) + TO_ESCAPE[formatter[i]];
      prev = i + 1;
    }
  }

  builder += formatter.slice(prev) + '\';';
  cache[key] = new Function(builder);
}


/**
 * A fast version of sprintf(), which currently only supports the %s and %j.
 * This caches a formatting function for each format string that is used, so
 * you should only use this sprintf() will be called many times with a single
 * format string and a limited number of format strings will ever be used (in
 * general this means that format strings should be string literals).
 *
 * @param {String} formatter A format string.
 * @param {...String} var_args Values that will be formatted by %s and %j.
 * @return {String} The formatted output.
 */
exports.sprintf = function(formatter, var_args) {
  if (!cache[formatter]) {
    populate(formatter);
  }

  return cache[formatter].apply(null, arguments);
};

});

require.define("/node_modules/elementtree/lib/utils.js", function (require, module, exports, __dirname, __filename) {
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/**
 * @param {Object} hash.
 * @param {Array} ignored.
 */
function items(hash, ignored) {
  ignored = ignored || null;
  var k, rv = [];

  function is_ignored(key) {
    if (!ignored || ignored.length === 0) {
      return false;
    }

    return ignored.indexOf(key);
  }

  for (k in hash) {
    if (hash.hasOwnProperty(k) && !(is_ignored(ignored))) {
      rv.push([k, hash[k]]);
    }
  }

  return rv;
}


function findall(re, str) {
  var match, matches = [];

  while ((match = re.exec(str))) {
      matches.push(match);
  }

  return matches;
}

function merge(a, b) {
  var c = {}, attrname;

  for (attrname in a) {
    if (a.hasOwnProperty(attrname)) {
      c[attrname] = a[attrname];
    }
  }
  for (attrname in b) {
    if (b.hasOwnProperty(attrname)) {
      c[attrname] = b[attrname];
    }
  }
  return c;
}

exports.items = items;
exports.findall = findall;
exports.merge = merge;

});

require.define("/node_modules/elementtree/lib/elementpath.js", function (require, module, exports, __dirname, __filename) {
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var sprintf = require('./sprintf').sprintf;

var utils = require('./utils');
var SyntaxError = require('./errors').SyntaxError;

var _cache = {};

var RE = new RegExp(
  "(" +
  "'[^']*'|\"[^\"]*\"|" +
  "::|" +
  "//?|" +
  "\\.\\.|" +
  "\\(\\)|" +
  "[/.*:\\[\\]\\(\\)@=])|" +
  "((?:\\{[^}]+\\})?[^/\\[\\]\\(\\)@=\\s]+)|" +
  "\\s+", 'g'
);

var xpath_tokenizer = utils.findall.bind(null, RE);

function prepare_tag(next, token) {
  var tag = token[0];

  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem._children.forEach(function(e) {
        if (e.tag === tag) {
          rv.push(e);
        }
      });
    }

    return rv;
  }

  return select;
}

function prepare_star(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem._children.forEach(function(e) {
        rv.push(e);
      });
    }

    return rv;
  }

  return select;
}

function prepare_dot(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      rv.push(elem);
    }

    return rv;
  }

  return select;
}

function prepare_iter(next, token) {
  var tag;
  token = next();

  if (token[1] === '*') {
    tag = '*';
  }
  else if (!token[1]) {
    tag = token[0] || '';
  }
  else {
    throw new SyntaxError(token);
  }

  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem.iter(tag, function(e) {
        if (e !== elem) {
          rv.push(e);
        }
      });
    }

    return rv;
  }

  return select;
}

function prepare_dot_dot(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [], parent_map = context.parent_map;

    if (!parent_map) {
      context.parent_map = parent_map = {};

      context.root.iter(null, function(p) {
        p._children.forEach(function(e) {
          parent_map[e] = p;
        });
      });
    }

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];

      if (parent_map.hasOwnProperty(elem)) {
        rv.push(parent_map[elem]);
      }
    }

    return rv;
  }

  return select;
}


function prepare_predicate(next, token) {
  var tag, key, value, select;
  token = next();

  if (token[1] === '@') {
    // attribute
    token = next();

    if (token[1]) {
      throw new SyntaxError(token, 'Invalid attribute predicate');
    }

    key = token[0];
    token = next();

    if (token[1] === ']') {
      select = function(context, result) {
        var i, len, elem, rv = [];

        for (i = 0, len = result.length; i < len; i++) {
          elem = result[i];

          if (elem.get(key)) {
            rv.push(elem);
          }
        }

        return rv;
      };
    }
    else if (token[1] === '=') {
      value = next()[1];

      if (value[0] === '"' || value[value.length - 1] === '\'') {
        value = value.slice(1, value.length - 1);
      }
      else {
        throw new SyntaxError(token, 'Ivalid comparison target');
      }

      token = next();
      select = function(context, result) {
        var i, len, elem, rv = [];

        for (i = 0, len = result.length; i < len; i++) {
          elem = result[i];

          if (elem.get(key) === value) {
            rv.push(elem);
          }
        }

        return rv;
      };
    }

    if (token[1] !== ']') {
      throw new SyntaxError(token, 'Invalid attribute predicate');
    }
  }
  else if (!token[1]) {
    tag = token[0] || '';
    token = next();

    if (token[1] !== ']') {
      throw new SyntaxError(token, 'Invalid node predicate');
    }

    select = function(context, result) {
      var i, len, elem, rv = [];

      for (i = 0, len = result.length; i < len; i++) {
        elem = result[i];

        if (elem.find(tag)) {
          rv.push(elem);
        }
      }

      return rv;
    };
  }
  else {
    throw new SyntaxError(null, 'Invalid predicate');
  }

  return select;
}



var ops = {
  "": prepare_tag,
  "*": prepare_star,
  ".": prepare_dot,
  "..": prepare_dot_dot,
  "//": prepare_iter,
  "[": prepare_predicate,
};

function _SelectorContext(root) {
  this.parent_map = null;
  this.root = root;
}

function findall(elem, path) {
  var selector, result, i, len, token, value, select, context;

  if (_cache.hasOwnProperty(path)) {
    selector = _cache[path];
  }
  else {
    // TODO: Use smarter cache purging approach
    if (Object.keys(_cache).length > 100) {
      _cache = {};
    }

    if (path.charAt(0) === '/') {
      throw new SyntaxError(null, 'Cannot use absolute path on element');
    }

    result = xpath_tokenizer(path);
    selector = [];

    function getToken() {
      return result.shift();
    }

    token = getToken();
    while (true) {
      var c = token[1] || '';
      value = ops[c](getToken, token);

      if (!value) {
        throw new SyntaxError(null, sprintf('Invalid path: %s', path));
      }

      selector.push(value);
      token = getToken();

      if (!token) {
        break;
      }
      else if (token[1] === '/') {
        token = getToken();
      }

      if (!token) {
        break;
      }
    }

    _cache[path] = selector;
  }

  // Execute slector pattern
  result = [elem];
  context = new _SelectorContext(elem);

  for (i = 0, len = selector.length; i < len; i++) {
    select = selector[i];
    result = select(context, result);
  }

  return result || [];
}

function find(element, path) {
  var resultElements = findall(element, path);

  if (resultElements && resultElements.length > 0) {
    return resultElements[0];
  }

  return null;
}

function findtext(element, path, defvalue) {
  var resultElements = findall(element, path);

  if (resultElements && resultElements.length > 0) {
    return resultElements[0].text;
  }

  return defvalue;
}


exports.find = find;
exports.findall = findall;
exports.findtext = findtext;

});

require.define("/node_modules/elementtree/lib/errors.js", function (require, module, exports, __dirname, __filename) {
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var util = require('util');

var sprintf = require('./sprintf').sprintf;

function SyntaxError(token, msg) {
  msg = msg || sprintf('Syntax Error at token %s', token.toString());
  this.token = token;
  this.message = msg;
  Error.call(this, msg);
}

util.inherits(SyntaxError, Error);

exports.SyntaxError = SyntaxError;

});

require.define("util", function (require, module, exports, __dirname, __filename) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/node_modules/elementtree/lib/treebuilder.js", function (require, module, exports, __dirname, __filename) {
function TreeBuilder(element_factory) {
  this._data = [];
  this._elem = [];
  this._last = null;
  this._tail = null;
  if (!element_factory) {
    /* evil circular dep */
    element_factory = require('./elementtree').Element;
  }
  this._factory = element_factory;
}

TreeBuilder.prototype.close = function() {
  return this._last;
};

TreeBuilder.prototype._flush = function() {
  if (this._data) {
    if (this._last !== null) {
      var text = this._data.join("");
      if (this._tail) {
        this._last.tail = text;
      }
      else {
        this._last.text = text;
      }
    }
    this._data = [];
  }
};

TreeBuilder.prototype.data = function(data) {
  this._data.push(data);
};

TreeBuilder.prototype.start = function(tag, attrs) {
  this._flush();
  var elem = this._factory(tag, attrs);
  this._last = elem;

  if (this._elem.length) {
    this._elem[this._elem.length - 1].append(elem);
  }

  this._elem.push(elem);

  this._tail = null;
};

TreeBuilder.prototype.end = function(tag) {
  this._flush();
  this._last = this._elem.pop();
  if (this._last.tag !== tag) {
    throw new Error("end tag mismatch");
  }
  this._tail = 1;
  return this._last;
};

exports.TreeBuilder = TreeBuilder;

});

require.define("/node_modules/elementtree/lib/parser.js", function (require, module, exports, __dirname, __filename) {
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/* TODO: support node-expat C++ module optionally */

var util = require('util');
var parsers = require('./parsers/index');

function get_parser(name) {
  if (name === 'sax') {
    return parsers.sax;
  }
  else {
    throw new Error('Invalid parser: ' + name);
  }
}


exports.get_parser = get_parser;

});

require.define("/node_modules/elementtree/lib/parsers/index.js", function (require, module, exports, __dirname, __filename) {
exports.sax = require('./sax');

});

require.define("/node_modules/elementtree/lib/parsers/sax.js", function (require, module, exports, __dirname, __filename) {
var util = require('util');

var sax = require('sax');

var TreeBuilder = require('./../treebuilder').TreeBuilder;

function XMLParser(target) {
  this.parser = sax.parser(true);

  this.target = (target) ? target : new TreeBuilder();

  this.parser.onopentag = this._handleOpenTag.bind(this);
  this.parser.ontext = this._handleText.bind(this);
  this.parser.oncdata = this._handleCdata.bind(this);
  this.parser.ondoctype = this._handleDoctype.bind(this);
  this.parser.oncomment = this._handleComment.bind(this);
  this.parser.onclosetag = this._handleCloseTag.bind(this);
  this.parser.onerror = this._handleError.bind(this);
}

XMLParser.prototype._handleOpenTag = function(tag) {
  this.target.start(tag.name, tag.attributes);
};

XMLParser.prototype._handleText = function(text) {
  this.target.data(text);
};

XMLParser.prototype._handleCdata = function(text) {
  this.target.data(text);
};

XMLParser.prototype._handleDoctype = function(text) {
};

XMLParser.prototype._handleComment = function(comment) {
};

XMLParser.prototype._handleCloseTag = function(tag) {
  this.target.end(tag);
};

XMLParser.prototype._handleError = function(err) {
  throw err;
};

XMLParser.prototype.feed = function(chunk) {
  this.parser.write(chunk);
};

XMLParser.prototype.close = function() {
  this.parser.close();
  return this.target.close();
};

exports.XMLParser = XMLParser;

});

require.define("/node_modules/elementtree/node_modules/sax/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"lib/sax.js"}
});

require.define("/node_modules/elementtree/node_modules/sax/lib/sax.js", function (require, module, exports, __dirname, __filename) {
// wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.tagCase = parser.opt.lowercasetags ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.position = parser.line = parser.column = 0
  emit(parser, "onready")
}

if (!Object.create) Object.create = function (o) {
  function f () { this.__proto__ = o }
  f.prototype = o
  return new f
}

if (!Object.getPrototypeOf) Object.getPrototypeOf = function (o) {
  return o.__proto__
}

if (!Object.keys) Object.keys = function (o) {
  var a = []
  for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
  return a
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  , end: function () { return this.write(null) }
  }

try {
  var Stream = require("stream").Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(me)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this._parser.write(chunk.toString())
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , nameStart = letter+"_:"
  , nameBody = nameStart+number+"-."
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)
nameStart = charClass(nameStart)
nameBody = charClass(nameBody)
quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function is (charclass, c) {
  return charclass[c]
}

function not (charclass, c) {
  return !charclass[c]
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_QUOTED          : S++ // <?hi "there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "apos" : "'"
, "quot" : "\""
, "amp"  : "&"
, "gt"   : ">"
, "lt"   : "<"
}

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  er += "\nLine: "+parser.line+
        "\nColumn: "+parser.column+
        "\nChar: "+parser.c
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (parser.state !== S.TEXT) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.tagCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || qn.prefix

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = tag.ns[prefix] || ""
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }
  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.tagCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity]) return parser.ENTITIES[entity]
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }
  return String.fromCharCode(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    parser.position ++
    if (c === "\n") {
      parser.line ++
      parser.column = 0
    } else parser.column ++
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") parser.state = S.OPEN_WAKA
        else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") parser.state = S.OPEN_WAKA
        else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail("Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          emitNode(parser, "onscript", parser.script)
          parser.state = S.CLOSE_TAG
          parser.script = ""
          parser.tagName = ""
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.startTagPosition = parser.position - 1
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.startTagPosition = parser.position - 1
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(quote, c)) {
          parser.state = S.PROC_INST_QUOTED
          parser.q = c
          parser.procInstBody += c
        } else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.PROC_INST_QUOTED:
        parser.procInstBody += c
        if (c === parser.q) {
          parser.state = S.PROC_INST_BODY
          parser.q = ""
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) strictFail(parser,
            "Invalid tagname in closing tag.")
          else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail("Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail("Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

})(typeof exports === "undefined" ? sax = {} : exports)

});

require.define("stream", function (require, module, exports, __dirname, __filename) {
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

});

require.define("/node_modules/elementtree/lib/constants.js", function (require, module, exports, __dirname, __filename) {
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var DEFAULT_PARSER = 'sax';

exports.DEFAULT_PARSER = DEFAULT_PARSER;

});

require.define("/lib/modularinputs/inputdefinition.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET      = require("elementtree");
    var utils   = require("./utils");

    /**
     * `InputDefinition` encodes the XML defining inputs that Splunk passes to
     * a modular input script.
     *
     * @example
     *
     *      var i =  new InputDefinition();
     *
     * @class splunkjs.ModularInputs.InputDefinition
     */
    function InputDefinition() {
        this.metadata = {};
        this.inputs = {};
    }

    /**
     * Parse a string containing XML into an `InputDefinition`.
     *
     * This function will throw an exception if `str`
     * contains unexpected XML.
     *
     * The XML typically will look like this:
     * 
     * `<input>`
     *   `<server_host>tiny</server_host>`
     *   `<server_uri>https://127.0.0.1:8089</server_uri>`
     *   `<checkpoint_dir>/opt/splunk/var/lib/splunk/modinputs</checkpoint_dir>`
     *   `<session_key>123102983109283019283</session_key>`
     *   `<configuration>`
     *     `<stanza name="foobar://aaa">`
     *       `<param name="param1">value1</param>`
     *       `<param name="param2">value2</param>`
     *       `<param name="disabled">0</param>`
     *       `<param name="index">default</param>`
     *     `</stanza>`
     *     `<stanza name="foobar://bbb">`
     *       `<param name="param1">value11</param>`
     *       `<param name="param2">value22</param>`
     *       `<param name="disabled">0</param>`
     *       `<param name="index">default</param>`
     *       `<param_list name="multiValue">`
     *         `<value>value1</value>`
     *         `<value>value2</value>`
     *       `</param_list>`
     *       `<param_list name="multiValue2">`
     *         `<value>value3</value>`
     *         `<value>value4</value>`
     *       `</param_list>`
     *     `</stanza>`
     *   `</configuration>`
     * `</input>`
     *
     * @param {String} str A string containing XML to parse.
     * @return {Object} An InputDefiniion object.
     * @function splunkjs.ModularInputs.InputDefinition
     */
    InputDefinition.parse = function(str) {
        var definition = new InputDefinition();
        var rootChildren = ET.parse(str).getroot().getchildren();
        for (var i = 0; i < rootChildren.length; i++) {
            var node = rootChildren[i];
            if (node.tag === "configuration") {
                definition.inputs = utils.parseXMLData(node, "stanza");
            }
            else {
                definition.metadata[node.tag] = node.text;
            }
        }
        return definition;
    };

    module.exports = InputDefinition;
})();
});

require.define("/lib/modularinputs/event.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET      = require("elementtree");
    var utils   = require("./utils");

    /**
     * `Event` represents an event or fragment of an event to be written by this
     * modular input to Splunk.
     *
     * @example
     *      
     *      // Minimal configuration
     *      var myEvent =  new Event({
     *          data: "This is a test of my new event.",
     *          stanza: "myStanzaName",
     *          time: parseFloat("1372187084.000")
     *      });
     *
     *      // Full configuration
     *      var myBetterEvent =  new Event({
     *          data: "This is a test of my better event.",
     *          stanza: "myStanzaName",
     *          time: parseFloat("1372187084.000"),
     *          host: "localhost",
     *          index: "main",
     *          source: "Splunk",
     *          sourcetype: "misc",
     *          done: true,
     *          unbroken: true
     *      });
     *
     * @param {Object} eventConfig An object containing the configuration for an `Event`.
     * @class splunkjs.ModularInputs.Event
     */
    function Event(eventConfig) {
        eventConfig = utils.isUndefined(eventConfig) ? {} : eventConfig;

        this.data = utils.isUndefined(eventConfig.data) ? null : eventConfig.data;
        this.done = utils.isUndefined(eventConfig.done) ? true : eventConfig.done;
        this.host = utils.isUndefined(eventConfig.host) ? null : eventConfig.host;
        this.index = utils.isUndefined(eventConfig.index) ? null : eventConfig.index;
        this.source = utils.isUndefined(eventConfig.source) ? null : eventConfig.source;
        this.sourcetype = utils.isUndefined(eventConfig.sourcetype) ? null : eventConfig.sourcetype;
        this.stanza = utils.isUndefined(eventConfig.stanza) ? null : eventConfig.stanza;
        this.unbroken = utils.isUndefined(eventConfig.unbroken) ? true : eventConfig.unbroken;

        // eventConfig.time can be of type Date, Number, or String.
        this.time = utils.isUndefined(eventConfig.time) ? null : eventConfig.time;
    }

    /** 
    * Formats a time for Splunk, should be something like `1372187084.000`.
    *
    * @example
    *
    *   // When the time parameter is a string.
    *   var stringTime = "1372187084";
    *   var stringTimeFormatted = Event.formatTime(stringTime);
    *
    *   // When the time parameter is a number, no decimals.
    *   var numericalTime = 1372187084;
    *   var numericalTimeFormatted = Event.formatTime(numericalTime);
    *
    *   // When the time parameter is a number, with decimals.
    *   var decimalTime = 1372187084.424;
    *   var decimalTimeFormatted = Event.formatTime(decimalTime);
    *
    *   // When the time parameter is a Date object.
    *   var dateObjectTime = Date.now();
    *   var dateObjectTimeFormatted = Event.formatTime(dateObjectTime);
    *
    * @param {Anything} time The unformatted time in seconds or milliseconds, typically a String, Number, or `Date` Object.
    * @return {Number} The formatted time in seconds.
    * @function splunkjs.ModularInputs.Event
    */
    Event.formatTime = function(time) {
        var cleanTime;
        
        // If time is a Date object, return its value.
        if (time instanceof Date) {
            time = time.valueOf();
        }

        if (!time || time === null) {
            return null;
        }

        // Values with decimals
        if (time.toString().indexOf(".") !== -1) {
            time = parseFloat(time).toFixed(3); // Clean up the extra decimals right away.

            // A perfect time in milliseconds, with the decimal in the right spot.
            if (time.toString().indexOf(".") >= 10) {
                cleanTime = parseFloat(time.toString().substring(0,14)).toFixed(3);
            }
            // A time with fewer than expected digits, or with a decimal too far to the left.
            else if (time.toString().length <= 13 || time.toString().indexOf(".") < 10) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 15.
            else {
                cleanTime = (parseFloat(time.toString().substring(0,14))/1000).toFixed(3);
            }
        }
        // Values without decimals
        else {
            // A time in milliseconds, no decimal (ex: Date.now()).
            if (time.toString().length === 13) {
                cleanTime = (parseFloat(time)/1000).toFixed(3);
            }
            // A time with fewer than expected digits.
            else if (time.toString().length <= 12) {
                cleanTime = parseFloat(time).toFixed(3);
            }
            // Any other value has more digits than the expected time format, get the first 14.
            else {
                cleanTime = parseFloat(time.toString().substring(0, 13)/1000).toFixed(3);
            }
        }
        return cleanTime;
    };

    /** 
    * Writes an XML representation of this, and Event object to the provided `Stream`,
    * starting at the provided offset.
    *
    * If this.data is undefined, or if there is an error writing to the provided `Stream`,
    * an error will be thrown.
    *
    * @param {Object} stream A `Stream` object to write this `Event` to.
    * @function splunkjs.ModularInputs.Event
    */
    Event.prototype._writeTo = function(stream) {
        if (!this.data) {
            throw new Error("Events must have at least the data field set to be written to XML.");
        }
        
        var xmlEvent = ET.Element("event");

        if (this.stanza) {
            xmlEvent.set("stanza", this.stanza);
        }
        // Convert this.unbroken (a boolean) to a number (0 or 1), then to a string
        xmlEvent.set("unbroken", (+this.unbroken).toString());
        
        if (!utils.isUndefined(this.time) && this.time !== null) {
            ET.SubElement(xmlEvent, "time").text = Event.formatTime(this.time).toString();
        }

        // If this.data is a JS object, stringify it
        if (typeof this.data === "object") {
            this.data = JSON.stringify(this.data);
        }

        var subElements = [
            {tag: "source", text: this.source},
            {tag: "sourcetype", text: this.sourcetype},
            {tag: "index", text: this.index},
            {tag: "host", text: this.host},
            {tag: "data", text: this.data}
        ];
        for (var i = 0; i < subElements.length; i++) {
            var node = subElements[i];
            if (node.text) {
                ET.SubElement(xmlEvent, node.tag).text = node.text;
            }
        }

        if (this.done || !utils.isUndefined(this.done)) {
            ET.SubElement(xmlEvent, "done");
        }

        var eventString = ET.tostring(xmlEvent, {"xml_declaration": false});

        // Throws an exception if there's an error writing to the stream.
        stream.write(eventString);
    };

    module.exports = Event;
})();

});

require.define("/lib/modularinputs/eventwriter.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET      = require("elementtree");
    var utils   = require("./utils");
    var Logger  = require("./logger");
    var stream  = require("stream");
    var Async   = require("../async");
    /**
     * `EventWriter` writes events and error messages to Splunk from a modular input.
     *
     * Its two important methods are `writeEvent`, which takes an `Event` object,
     * and `log`, which takes a severity and an error message.
     *
     * @param {Object} output A stream to output data, defaults to `process.stdout`
     * @param {Object} error A stream to output errors, defaults to `process.stderr`
     * @class splunkjs.ModularInputs.EventWriter
     */
    function EventWriter(output, error) {
        this._out = utils.isUndefined(output) ? process.stdout : output;
        this._err = utils.isUndefined(error) ? process.stderr : error;

        // Has the opening <stream> tag been written yet?
        this._headerWritten = false;
    }

    /**
    * Writes an `Event` object to the output stream specified
    * in the constructor.
    *
    * @param {Object} event An `Event` Object.
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeEvent = function(event) {        
        if (!this._headerWritten) {
            this._out.write("<stream>");
            this._headerWritten = true;
        }

        try {
            event._writeTo(this._out);
        }
        catch (e) {
            if (e.message === "Events must have at least the data field set to be written to XML.") {
                Logger.warn("", e.message, this._err);
                throw e;
            }
            Logger.error("", e.message, this._err);
            throw e;
        }
    };

    /**
    * Writes a string representation of an `Elementtree` Object to the 
    * output stream specified in the constructor.
    *
    * This function will throw an exception if there is an error
    * while making a string from `xmlDocument`, or
    * while writing the string created from `xmlDocument`.
    *
    * @param {Object} xmlDocument An `Elementtree` Object representing an XML document.
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.writeXMLDocument = function(xmlDocument) {
        var xmlString = ET.tostring(xmlDocument, {"xml_declaration": false});
        this._out.write(xmlString);
    };

    /**
    * Writes the closing </stream> tag to make the XML well formed.
    *
    * @function splunkjs.ModularInputs.EventWriter
    */
    EventWriter.prototype.close = function() {
        this._out.write("</stream>");
    };

    module.exports = EventWriter;
})();

});

require.define("/lib/modularinputs/logger.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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

(function () {
    "use strict";
    var utils   = require("./utils");
    var root = exports || this;

    /**
     * `Logger` logs messages to Splunk's internal logs.
     *
     * @class splunkjs.ModularInputs.Logger
     */

    // Severities that Splunk understands for log messages from modular inputs.
    // DO NOT CHANGE THESE
    root.DEBUG = "DEBUG";
    root.INFO  = "INFO";
    root.WARN  = "WARN";
    root.ERROR = "ERROR";
    root.FATAL = "FATAL";

    root._log = function(severity, name, message, logStream) {
        logStream = logStream || process.stderr;

        // Prevent a double space if name isn't passed.
        if (name && name.length > 0) {
            name = name + " ";
        }

        var msg = severity + " Modular input " + name + message + "\n";
        logStream.write(msg);
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.debug = function (name, message, stream) {
        try {
            root._log(root.DEBUG, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.info = function (name, message, stream) {
        try {
            root._log(root.INFO, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.warn = function (name, message, stream) {
        try {
            root._log(root.WARN, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.error = function (name, message, stream) {
        try {
            root._log(root.ERROR, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    /**
     * Logs messages about the state of this modular input to Splunk.
     * These messages will show up in Splunk's internal logs.
     *
     * @param {String} name The name of this modular input.
     * @param {String} message The message to log.
     * @param {Object} stream (Optional) A stream to write log messages to, defaults to process.stderr.
     * @function splunkjs.ModularInputs.Logger
     */
    root.fatal = function (name, message, stream) {
        try {
            root._log(root.FATAL, name, message, stream);
        }
        catch (e) {
            throw e;
        }
    };

    module.exports = root;
}());

});

require.define("/lib/modularinputs/argument.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET = require("elementtree");
    var utils = require("./utils");

    /**
     * Class representing an argument to a modular input kind.
     *
     * `Argument` is meant to be used with `Scheme` to generate an XML 
     * definition of the modular input kind that Splunk understands.
     *
     * `name` is the only required parameter for the constructor.
     *
     * @example
     *      
     *      // Example with minimal parameters
     *      var myArg1 = new Argument({name: "arg1"});
     *
     *      // Example with all parameters
     *      var myArg2 = new Argument({
     *          name: "arg1",
     *          description: "This an argument with lots of parameters",
     *          validation: "is_pos_int('some_name')",
     *          dataType: Argument.dataTypeNumber,
     *          requiredOnEdit: true,
     *          requiredOnCreate: true
     *      });
     *
     * @param {Object} argumentConfig An object containing at least the name property to configure this Argument
     * @class splunkjs.ModularInputs.Argument
     */
    function Argument(argumentConfig) {
        if (!argumentConfig) {
            argumentConfig = {};
        }

        this.name = utils.isUndefined(argumentConfig.name) ? "" : argumentConfig.name;
        this.description = utils.isUndefined(argumentConfig.description) ? null : argumentConfig.description;
        this.validation = utils.isUndefined(argumentConfig.validation) ? null : argumentConfig.validation;
        this.dataType = utils.isUndefined(argumentConfig.dataType) ? Argument.dataTypeString : argumentConfig.dataType;
        this.requiredOnEdit = utils.isUndefined(argumentConfig.requiredOnEdit) ? false : argumentConfig.requiredOnEdit;
        this.requiredOnCreate = utils.isUndefined(argumentConfig.requiredOnCreate) ? false : argumentConfig.requiredOnCreate;
    }

    // Constant values, do not change
    // These should be used for setting the value of an Argument object's dataType field.
    Argument.dataTypeBoolean = "BOOLEAN";
    Argument.dataTypeNumber = "NUMBER";
    Argument.dataTypeString = "STRING";

    /**
     * Adds an `Argument` object the passed in elementtree object.
     * 
     * Adds an <arg> subelement to the parent element, typically <args>,
     * and sets up its subelements with their respective text.
     *
     * @param {Object} parent An elementtree element object to be the parent of a new <arg> subelement
     * @return {Object} An elementtree element object representing this argument.
     * @function splunkjs.ModularInputs.Argument
     */
    Argument.prototype.addToDocument = function (parent) {
        var arg = ET.SubElement(parent, "arg");
        arg.set("name", this.name);

        if (this.description) {
            ET.SubElement(arg, "description").text = this.description;
        }

        if (this.validation) {
            ET.SubElement(arg, "validation").text = this.validation;
        }

        // Add all other subelements to this <arg>, represented by (tag, text)
        var subElements = [
            {tag: "data_type", value: this.dataType},
            {tag: "required_on_edit", value: this.requiredOnEdit},
            {tag: "required_on_create", value: this.requiredOnCreate}
        ];

        for (var i = 0; i < subElements.length; i++) {
            ET.SubElement(arg, subElements[i].tag).text = subElements[i].value.toString().toLowerCase();
        }

        return arg;
    }; 
    
    module.exports = Argument;
})();
});

require.define("/lib/modularinputs/scheme.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET = require("elementtree");
    var utils = require("./utils");
    var Argument = require("./argument");

    /**
     * Class representing the metadata for a modular input kind.
     *
     * A `Scheme` specifies a title, description, several options of how Splunk 
     * should run modular inputs of this kind, and a set of arguments that define
     * a particular modular input's properties.
     * The primary use of `Scheme` is to abstract away the construction of XML
     * to feed to Splunk.
     *
     * @example
     *
     *      var s =  new Scheme();
     *
     *      var myFullScheme = new Scheme("fullScheme");
     *      myFullScheme.description = "This is how you set the other properties";
     *      myFullScheme.useExternalValidation = true;
     *      myFullScheme.useSingleInstance = false;
     *      myFullScheme.streamingMode = Scheme.streamingModeSimple;
     *
     * @param {String} The identifier for this Scheme in Splunk.
     * @class splunkjs.ModularInputs.Scheme
     */
    function Scheme(title) {
        this.title = utils.isUndefined(title) ? "" : title;

        // Set the defaults.
        this.description = null;
        this.useExternalValidation = true;
        this.useSingleInstance = false;
        this.streamingMode = Scheme.streamingModeXML;

        // List of Argument objects, each to be represented by an <arg> tag.
        this.args = [];
    }

    // Constant values, do not change.
    // These should be used for setting the value of a Scheme object's streamingMode field.
    Scheme.streamingModeSimple = "SIMPLE";
    Scheme.streamingModeXML = "XML";

    /**
     * Add the provided argument, `arg`, to the `this.arguments` Array.
     *
     * @param {Object} arg An Argument object to add to this Scheme's argument list.
     * @function splunkjs.ModularInputs.Scheme
     */
    Scheme.prototype.addArgument = function (arg) {
        if (arg) {
            this.args.push(arg);
        }
    };

    /**
     * Creates an elementtree Element representing this Scheme, then returns it.
     *
     * @return {Object} An elementtree Element object representing this Scheme.
     * @function splunkjs.ModularInputs.Scheme
     */
    Scheme.prototype.toXML = function () {
        var root = ET.Element("scheme");

        ET.SubElement(root, "title").text = this.title;

        if (this.description) {
            ET.SubElement(root, "description").text = this.description;
        }

        // Add all subelements to this <scheme>, represented by (tag, text).
        var subElements = [
            {tag: "use_external_validation", value: this.useExternalValidation},
            {tag: "use_single_instance", value: this.useSingleInstance},
            {tag: "streaming_mode", value: this.streamingMode}
        ];
        
        for (var i = 0; i < subElements.length; i++) {
            ET.SubElement(root, subElements[i].tag).text = subElements[i].value.toString().toLowerCase();
        }

        // Create an <endpoint> subelement in root, then an <args> subelement in endpoint.
        var argsElement = ET.SubElement(ET.SubElement(root, "endpoint"), "args");

        // Add arguments as subelements to <args>.
        for (var j = 0; j < this.args.length; j++) {
            this.args[j].addToDocument(argsElement);
        }

        return root;
    };
    
    module.exports = Scheme;
})();

});

require.define("/lib/modularinputs/modularinput.js", function (require, module, exports, __dirname, __filename) {
/*!*/
// Copyright 2014 Splunk, Inc.
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
    var ET = require("elementtree");
    var url = require("url");
    var utils = require("./utils");
    var Async = require("../async");
    var ValidationDefinition = require("./validationdefinition");
    var InputDefinition = require("./inputdefinition");
    var EventWriter = require("./eventwriter");
    var Scheme = require("./scheme");
    var Service = require("../service");
    var Logger = require("./logger");

    /**
     * A base class for implementing modular inputs.
     *
     * Subclasses should implement `getScheme` and `streamEvents`,
     * and optionally `validateInput` if the modular input uses 
     * external validation.
     * 
     * The `run` function is used to run modular inputs; it typically
     * should not be overridden.
     * @class splunkjs.ModularInputs.ModularInput
     */
    function ModularInput() {
        this._inputDefinition = null;
        this._service = null;
    }

    /**
     * Handles all the specifics of running a modular input.
     *
     * @param {Object} exports An object representing a modular input script.
     * @param {Array} args A list of command line arguments passed to this script.
     * @param {Object} eventWriter An `EventWriter` object for writing event.
     * @param {Object} inputStream A `Stream` object for reading inputs.
     * @param {Function} callback The function to call after running this script: `(err, status)`.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.runScript = function(exports, args, eventWriter, inputStream, callback) {
        // Default empty functions for life cycle events, this is mostly used for the unit tests
        exports.setup       = exports.setup     || ModularInput.prototype.setup;
        exports.start       = exports.start     || ModularInput.prototype.start;
        exports.end         = exports.end       || ModularInput.prototype.end;
        exports.teardown    = exports.teardown  || ModularInput.prototype.teardown;

        var that = this;

        // Resume streams before trying to read their data.
        // If the inputStream is a TTY, we don't want to open the stream as it will hold the process open.
        if (inputStream.resume && !inputStream.isTTY) {
            inputStream.resume();
        }
        var bigBuff = new Buffer(0);

        // When streaming events...
        if (args.length === 1) {
            // After waiting 30.5 seconds for input definitions, assume something bad happened
            var inputDefintionsReceivedTimer = setTimeout(function() {
                callback(new Error("Receiving input definitions prior to streaming timed out."), 1);
            }, 30500);

            // Listen for data on inputStream.
            inputStream.on("data", function(chunk) {
                // Chunk will be a Buffer when interacting with Splunk.
                bigBuff = Buffer.concat([bigBuff, chunk]);

                // Remove any trailing whitespace.
                var bufferString = bigBuff.toString("utf8", 0, bigBuff.length).trim();
                
                if (utils.endsWith(bufferString, "</input>")) {
                    // If we've received all of the input definitions, clear the timeout timer
                    clearTimeout(inputDefintionsReceivedTimer);

                    var found = InputDefinition.parse(bufferString);
                    exports._inputDefinition = found;
                    that._inputDefinition = found;

                    Async.chain([
                            function(done) {
                                Async.parallelEach(
                                    Object.keys(exports._inputDefinition.inputs),
                                    function (name, index, doneEach) {
                                        var input = exports._inputDefinition.inputs[name];
                                        
                                        Async.chain([
                                                function(innerDone) {
                                                    exports.start(name, input, innerDone);
                                                },
                                                function(innerDone) {
                                                    exports.streamEvents(name, input, eventWriter, innerDone);
                                                },
                                                function(innerDone) {
                                                    // end() will only be called if streamEvents doesn't fail.
                                                    exports.end(name, input, innerDone);
                                                }
                                            ],
                                            function(innerErr) {
                                                doneEach(innerErr, innerErr ? 1 : 0);
                                            }
                                        );
                                    }, 
                                    function (streamErr) {
                                        done(streamErr, streamErr ? 1 : 0);
                                    }
                                );
                            }
                        ],
                        function(err) {
                            // Write the closing </stream> tag.
                            if (eventWriter._headerWritten) {
                                eventWriter.close();
                            }
                            callback(err, err ? 1 : 0);
                        }
                    );
                }
            });
        }
        // When getting the scheme...
        else if (args.length >= 2 && args[1].toString().toLowerCase() === "--scheme") {
            var scheme = exports.getScheme();

            if (!scheme) {
                Logger.fatal("", "script returned a null scheme.", eventWriter._err);
                callback(null, 1);
            }
            else {
                try {
                    eventWriter.writeXMLDocument(scheme.toXML());
                    callback(null, 0);
                }
                catch (e) {
                    Logger.fatal("", "script could not return the scheme, error: " + e, eventWriter._err);
                    callback(e, 1);
                }
            }
        }
        // When validating arguments...
        else if (args.length >= 2 && args[1].toString().toLowerCase() === "--validate-arguments") {
            // After waiting 30.5 seconds for a validation definition, assume something bad happened
            var validationDefintionReceivedTimer = setTimeout(function() {
                callback(new Error("Receiving validation definition prior to validating timed out."), 1);
            }, 30500);

            // Listen for data on inputStream.
            inputStream.on("data", function(chunk) {
                bigBuff = Buffer.concat([bigBuff, chunk]);
                
                // Remove any trailing whitespace.
                var bufferString = bigBuff.toString("utf8", 0, bigBuff.length).trim();

                if (utils.endsWith(bufferString, "</items>")) {
                    // If we've received all of the validation definition, clear the timeout timer
                    clearTimeout(validationDefintionReceivedTimer);
                    Async.chain([
                            function (done) {
                                try {
                                    // If there is no validateInput method set, accept all input.
                                    if (utils.isUndefined(exports.validateInput)) {
                                        done();
                                    }
                                    else {
                                        // If exports.validateInput doesn't throw an error, we assume validation succeeded.
                                        var definition = ValidationDefinition.parse(bigBuff.toString("utf8", 0, bigBuff.length));
                                        exports.validateInput(definition, done);
                                    }
                                }
                                catch (e) {
                                    // If exports.validateInput throws an error, we assume validation failed.
                                    done(e);
                                }
                            }
                        ],
                        function (err) {
                            if (err) {
                                Logger.error("", err.message);
                                Logger.error("", "Stack trace for a modular input error: " + err.stack);

                                try {
                                    var errorRoot = ET.Element("error");
                                    ET.SubElement(errorRoot, "message").text = err.message;
                                    eventWriter.writeXMLDocument(errorRoot);
                                    callback(err, 1); // Some error while validating the input.
                                }
                                catch (e) {
                                    callback(e, 1); // Error trying to write the error.
                                }
                            }
                            else {
                                callback(null, 0); // No error
                            }
                        }
                    );
                }
            });
        }
        // When we get unexpected args...
        else {
            var msg = "Invalid arguments to modular input script: " + args.join() + "\n";
            Logger.error("", msg, eventWriter._err);
            callback(msg, 1);
        }
    };

    /**
     * Returns a `splunkjs.Service` object for this script invocation.
     *
     * The service object is created from the Splunkd URI and session key
     * passed to the command invocation on the modular input stream. It is
     * available as soon as the `ModularInput.streamEvents` function is called.
     *
     * @return {Object} A `Splunkjs.Service` Object, or null if you call this function before the `ModularInput.streamEvents` function is called.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.service = function() {
        if (this._service) {
            return this._service;
        }

        if (!this._inputDefinition) {
            return null;
        }

        var splunkdURI = this._inputDefinition.metadata["server_uri"];
        var sessionKey = this._inputDefinition.metadata["session_key"];

        var urlParts = url.parse(splunkdURI);

        // urlParts.protocol will have a trailing colon; remove it.
        var scheme = urlParts.protocol.replace(":", "");
        var splunkdHost = urlParts.hostname;
        var splunkdPort = urlParts.port;

        this._service = new Service({
            scheme: scheme,
            host: splunkdHost,
            port: splunkdPort,
            token: sessionKey
        });

        return this._service;
    };

    // Default to empty functions for life cycle events.

    /**
     * Runs before streaming begins.
     *
     * @param {Function} done The function to call when done: `(err)`.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.setup = function(done) {
        done();
    };
    /**
     * Runs once the streaming starts, for an input.
     *
     * @param {String} name The name of this modular input.
     * @param {Object} definition An InputDefinition object.
     * @param {Function} done The function to call when done: `(err)`.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.start = function(name, definition, done) {
        done();
    };
    /**
     * Runs once the streaming ends, for an input (upon successfully streaming all events).
     *
     * @param {String} name The name of this modular input.
     * @param {Object} definition An InputDefinition object.
     * @param {Function} done The function to call when done: `(err)`.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.end = function(name, definition, done) {
        done();
    };
    /**
     * Runs after all streaming is done for all inputs definitions.
     *
     * @param {Function} done The function to call when done: `(err)`.
     * @function splunkjs.ModularInputs.ModularInput
     */
    ModularInput.prototype.teardown = function(done) {
        done();
    };

    module.exports = ModularInput;
})();

});

require.define("url", function (require, module, exports, __dirname, __filename) {
var punycode = { encode : function (s) { return s } };

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]+$/,
    // RFC 2396: characters reserved for delimiting URLs.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],
    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '~', '[', ']', '`'].concat(delims),
    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''],
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#']
      .concat(unwise).concat(autoEscape),
    nonAuthChars = ['/', '@', '?', '#'].concat(delims),
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,
    hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always have a path component.
    pathedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var out = {},
      rest = url;

  // cut off any delimiters.
  // This is to support parse stuff like "<http://foo.com>"
  for (var i = 0, l = rest.length; i < l; i++) {
    if (delims.indexOf(rest.charAt(i)) === -1) break;
  }
  if (i !== 0) rest = rest.substr(i);


  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    out.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.

    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the first @ sign, unless some non-auth character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    var atSign = rest.indexOf('@');
    if (atSign !== -1) {
      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        var index = rest.indexOf(nonAuthChars[i]);
        if (index !== -1 && index < atSign) {
          // not a valid auth.  Something like http://foo.com/bar@baz/
          hasAuth = false;
          break;
        }
      }
      if (hasAuth) {
        // pluck off the auth portion.
        out.auth = rest.substr(0, atSign);
        rest = rest.substr(atSign + 1);
      }
    }

    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = rest.indexOf(nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }

    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out port.
    var p = parseHost(out.host);
    var keys = Object.keys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';

    // validate a little.
    if (out.hostname.length > hostnameMaxLen) {
      out.hostname = '';
    } else {
      var hostparts = out.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            out.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    // hostnames are always lower case.
    out.hostname = out.hostname.toLowerCase();

    // IDNA Support: Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    var domainArray = out.hostname.split('.');
    var newOut = [];
    for (var i = 0; i < domainArray.length; ++i) {
      var s = domainArray[i];
      newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
          'xn--' + punycode.encode(s) : s);
    }
    out.hostname = newOut.join('.');

    out.host = (out.hostname || '') +
        ((out.port) ? ':' + out.port : '');
    out.href += out.host;
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }

    // Now make sure that delims never appear in a url.
    var chop = rest.length;
    for (var i = 0, l = delims.length; i < l; i++) {
      var c = rest.indexOf(delims[i]);
      if (c !== -1) {
        chop = Math.min(c, chop);
      }
    }
    rest = rest.substr(0, chop);
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.search = '';
    out.query = {};
  }
  if (rest) out.pathname = rest;
  if (slashedProtocol[proto] &&
      out.hostname && !out.pathname) {
    out.pathname = '/';
  }

  //to support http.request
  if (out.pathname || out.search) {
    out.path = (out.pathname ? out.pathname : '') +
               (out.search ? out.search : '');
  }

  // finally, reconstruct the href based on what has been validated.
  out.href = urlFormat(out);
  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var auth = obj.auth || '';
  if (auth) {
    auth = auth.split('@').join('%40');
    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
      var nAC = nonAuthChars[i];
      auth = auth.split(nAC).join(encodeURIComponent(nAC));
    }
    auth += '@';
  }

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? auth + obj.host :
          obj.hostname !== undefined ? (
              auth + obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      query = obj.query &&
              ((typeof obj.query === 'object' &&
                Object.keys(obj.query).length) ?
                 querystring.stringify(obj.query) :
                 '') || '',
      search = obj.search || (query && ('?' + query)) || '',
      hash = obj.hash || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') {
    source.href = urlFormat(source);
    return source;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[relative.protocol] &&
        relative.hostname && !relative.pathname) {
      relative.path = relative.pathname = '/';
    }
    relative.href = urlFormat(relative);
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      relative.href = urlFormat(relative);
      return relative;
    }
    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    source.auth = relative.auth;
    source.hostname = relative.hostname || relative.host;
    source.port = relative.port;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.slashes = source.slashes || relative.slashes;
    source.href = urlFormat(source);
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;
    if (relative.protocol) {
      delete relative.hostname;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : source.hostname;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.hostname = source.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = source.host && source.host.indexOf('@') > 0 ?
                       source.host.split('@') : false;
      if (authInHost) {
        source.auth = authInHost.shift();
        source.host = source.hostname = authInHost.shift();
      }
    }
    source.search = relative.search;
    source.query = relative.query;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.href = urlFormat(source);
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    //to support http.request
    if (!source.search) {
      source.path = '/' + source.search;
    } else {
      delete source.path;
    }
    source.href = urlFormat(source);
    return source;
  }
  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.hostname = source.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = source.host && source.host.indexOf('@') > 0 ?
                     source.host.split('@') : false;
    if (authInHost) {
      source.auth = authInHost.shift();
      source.host = source.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');
  //to support request.http
  if (source.pathname !== undefined || source.search !== undefined) {
    source.path = (source.pathname ? source.pathname : '') +
                  (source.search ? source.search : '');
  }
  source.auth = relative.auth || source.auth;
  source.slashes = source.slashes || relative.slashes;
  source.href = urlFormat(source);
  return source;
}

function parseHost(host) {
  var out = {};
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

});

require.define("querystring", function (require, module, exports, __dirname, __filename) {
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

});

require.define("/lib/platform/client/jquery_http.js", function (require, module, exports, __dirname, __filename) {

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
    var Http    = require('../../http');
    var utils   = require('../../utils');

    var root = exports || this;

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

    root.JQueryHttp = Http.extend({
        init: function(isSplunk) {
            this._super(isSplunk);
        },

        makeRequest: function(url, message, callback) {
            var that = this;
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body || "",
                timeout: message.timeout || 0,
                dataType: "json",
                success: utils.bind(this, function(data, error, res) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    var complete_response = this._buildResponse(error, response, data);
                    callback(complete_response);
                }),
                error: function(res, data, error) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    if (data === "abort") {
                        response.statusCode = "abort";
                        res.responseText = "{}";
                    }
                    var json = JSON.parse(res.responseText);

                    var complete_response = that._buildResponse(error, response, json);
                    callback(complete_response);
                }
            };
            
            return $.ajax(params);
        },

        parseJson: function(json) {
            // JQuery does this for us
            return json;
        }
    });
})();
});

require.define("/lib/platform/client/proxy_http.js", function (require, module, exports, __dirname, __filename) {

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
    var Http    = require('../../http');
    var utils   = require('../../utils');

    var root = exports || this;
    
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
    
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License
    function parseUri (str) {
        var o   = parseUri.options,
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;

        while (i--) {
            uri[o.key[i]] = m[i] || "";
        }

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) {
                uri[o.q.name][$1] = $2;
            }
        });

        return uri;
    }

    parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };
    
    var specials = /[.*+?|()\[\]{}\\$\^]/g; // .*+?|()[]{}\$^
    var escape = function(str) {
        str = str || "";
        return str.replace(specials, "\\$&");
    };

    root.ProxyHttp = Http.extend({
        init: function(prefix) {
            this.prefix = prefix;
            this._super();
        },

        makeRequest: function(url, message, callback) {
            // Add our original destination to to headers,
            // as some proxy implementations would rather
            // use this.
            message.headers["X-ProxyDestination"] = url;
            
            // Need to remove the hostname from the URL
            var parsed = parseUri(url);
            var prefixToRemove = "" + (parsed.protocol ? parsed.protocol : "") + "://" + parsed.authority;
            url = url.replace(new RegExp(escape(prefixToRemove), "i"), "");
            
            // Now, we prepend the prefix
            url = this.prefix + url;
            
            var that = this;
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body || "",
                timeout: message.timeout || 0,
                dataType: "text",
                success: function(data, error, res) {
                    if (req.wasAborted) {
                        return;
                    }
                    
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    var complete_response = that._buildResponse(error, response, data);
                    callback(complete_response);
                },
                error: function(res, data, error) {
                    if (req.wasAborted) {
                        return;
                    }
                    
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    if (data === "abort") {
                        response.statusCode = "abort";
                        res.responseText = "{}";
                    }
                    var json = res.responseText;

                    var complete_response = that._buildResponse(error, response, json);
                    callback(complete_response);
                    
                    // Note the fact that we aborted after we call
                    // our initial callback, otherwise it will never
                    // execute
                    if (data === "abort") {
                        req.wasAborted = true;
                    }
                }
            };
            
            var req = $.ajax(params);
            
            return req;
        },

        parseJson: function(json) {
            // JQuery does this for us
            return JSON.parse(json);
        }
    });

    root.SplunkWebHttp = root.ProxyHttp.extend({
        init: function() {
            this._super("/en-US/splunkd/__raw");
        }
    });
})();
});

require.define("/lib/entries/browser.ui.entry.js", function (require, module, exports, __dirname, __filename) {

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

(function(exportName) {
    var $script = require('../../contrib/script');
    
    if (!window[exportName]) {
        window[exportName] = {};
    }
    
    if (!window[exportName].UI) {
        window[exportName].UI = {};
    }
    
    var UI = window[exportName].UI;
    
    var root = exports || this;
    
    var token = 0;
        
    var loadComponent = function(path, token, callback) {
        if (!path) {
            throw new Error("Must specify a path to load from.");
        }
        
        callback = callback || function() {};
        
        $script(path, token, callback);
    };
    
    UI.loadTimeline = function(path, callback) {
        var timelineToken = 'timeline' + (token++);
        loadComponent(path, timelineToken, callback);
        return timelineToken;
    };
    
    UI.loadCharting = function(path, callback) {
        var chartToken = 'charting' + (token++);
        loadComponent(path, chartToken, callback);
        return chartToken;
    };
    
    UI.load = function(paths, callback) {
        if (!paths) {
            throw new Error("Must specify paths to load components from");
        }  
        
        callback = callback || function() {};
        var token = "all" + (token++);
        $script(paths, token, function() {
            callback();
        });
        
        return token;
    };
    
    UI.ready = function(token, callback) {
        callback = callback || function() {};
        $script.ready(token, callback);
    };
})(__exportName);
});

require.define("/contrib/script.js", function (require, module, exports, __dirname, __filename) {
/*!
  * $script.js JS loader & dependency manager
  * https://github.com/ded/script.js
  * (c) Dustin Diaz 2014 | License MIT
  */
(function(e,t){typeof module!="undefined"&&module.exports?module.exports=t():typeof define=="function"&&define.amd?define(t):this[e]=t()})("$script",function(){function p(e,t){for(var n=0,i=e.length;n<i;++n)if(!t(e[n]))return r;return 1}function d(e,t){p(e,function(e){return t(e),1})}function v(e,t,n){function g(e){return e.call?e():u[e]}function y(){if(!--h){u[o]=1,s&&s();for(var e in f)p(e.split("|"),g)&&!d(f[e],g)&&(f[e]=[])}}e=e[i]?e:[e];var r=t&&t.call,s=r?t:n,o=r?e.join(""):t,h=e.length;return setTimeout(function(){d(e,function t(e,n){if(e===null)return y();!n&&!/^https?:\/\//.test(e)&&c&&(e=e.indexOf(".js")===-1?c+e+".js":c+e);if(l[e])return o&&(a[o]=1),l[e]==2?y():setTimeout(function(){t(e,!0)},0);l[e]=1,o&&(a[o]=1),m(e,y)})},0),v}function m(n,r){var i=e.createElement("script"),u;i.onload=i.onerror=i[o]=function(){if(i[s]&&!/^c|loade/.test(i[s])||u)return;i.onload=i[o]=null,u=1,l[n]=2,r()},i.async=1,i.src=h?n+(n.indexOf("?")===-1?"?":"&")+h:n,t.insertBefore(i,t.lastChild)}var e=document,t=e.getElementsByTagName("head")[0],n="string",r=!1,i="push",s="readyState",o="onreadystatechange",u={},a={},f={},l={},c,h;return v.get=m,v.order=function(e,t,n){(function r(i){i=e.shift(),e.length?v(i,r):v(i,t,n)})()},v.path=function(e){c=e},v.urlArgs=function(e){h=e},v.ready=function(e,t,n){e=e[i]?e:[e];var r=[];return!d(e,function(e){u[e]||r[i](e)})&&p(e,function(e){return u[e]})?t():!function(e){f[e]=f[e]||[],f[e][i](t),n&&n(r)}(e.join("|")),v},v.done=function(e){v([null],e)},v})
});

require.define("/browser.entry.js", function (require, module, exports, __dirname, __filename) {
    
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

(function(exportName) {
    var previousSplunk = window[exportName];
    
    var ourSplunk     = require('../../index');
    var jqueryHttp    = require('../../lib/platform/client/jquery_http').JQueryHttp; 
    var proxyHttps    = require('../../lib/platform/client/proxy_http');
    var proxyHttp     = proxyHttps.ProxyHttp;
    var splunkwebHttp = proxyHttps.SplunkWebHttp;
    
    window[exportName]               = ourSplunk;
    window[exportName].ProxyHttp     = proxyHttp;
    window[exportName].JQueryHttp    = jqueryHttp;
    window[exportName].SplunkWebHttp = splunkwebHttp;
    
    // Add no conflict capabilities
    window[exportName].noConflict = function(name) {
        // Reset the window[exportName] reference
        window[exportName] = previousSplunk;
        
        return ourSplunk;
    };
    
    // Load the UI component loader
    require("../../lib/entries/browser.ui.entry");
})(__exportName);
});
require("/browser.entry.js");


})();