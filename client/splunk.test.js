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
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");
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
        Http            : require('./lib/http').Http,
        Utils           : require('./lib/utils'),
        Async           : require('./lib/async'),
        Paths           : require('./lib/paths').Paths,
        Class           : require('./lib/jquery.class').Class,
        JobManager      : require('./lib/searcher.js'),
        StormService    : require('./lib/storm.js')
    };
    
    if (typeof(window) === 'undefined') {
        root.NodeHttp = require('./lib/platform/node/node_http').NodeHttp;
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
     * A controllable logging module.
     *
     * @module splunkjs.Logger
     */
    exports.Logger = {
        /**
         * Log to the console (equivalent to `console.log`)
         *
         * @function splunkjs.Logger
         */
        log: function() {
            if (process.env.LOG_LEVEL >= levels.ALL) {
                _log.apply(null, arguments);
            }
        },
        
        /**
         * Log error to the console (equivalent to `console.error`)
         *
         * @function splunkjs.Logger
         */
        error: function() {
            if (process.env.LOG_LEVEL >= levels.ERROR) {
                _error.apply(null, arguments);
            }
        },
        
        /**
         * Log warning to the console (equivalent to `console.warn`)
         *
         * @function splunkjs.Logger
         */
        warn: function() {
            if (process.env.LOG_LEVEL >= levels.WARN) {
                _warn.apply(null, arguments);
            }
        },
        
        /**
         * Log info to the console (equivalent to `console.info`)
         *
         * @function splunkjs.Logger
         */
        info: function() {
            if (process.env.LOG_LEVEL >= levels.INFO) {
                _info.apply(null, arguments);
            }
        },
        
        /**
         * Print out all messages retrieved from splunkd
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
         * Set the global logging level
         *
         * @example
         *
         *      splunkjs.Logger.setLevel("WARN");
         *      splunkjs.Logger.setLevel(0); // equivalent to NONE
         *
         * @param {String|Number} level A string (`ALL` | `INFO` | `WARN` | `ERROR` | `NONE`) or number representing the log level
         *
         * @function splunkjs.Logger
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
     * Various utility functions for the Splunk SDK
     *
     * @module splunkjs.Utils
     */

    /**
     * Bind a function to a specific object
     *
     * @example
     *      
     *      var obj = {a: 1, b: function() { console.log(a); }};
     *      var bound = splunkjs.Utils.bind(obj, obj.b);
     *      bound(); // should print 1
     *
     * @param {Object} me Object to bind to
     * @param {Function} fn Function to bind
     * @return {Function} The bound function
     *
     * @function splunkjs.Utils
     */
    root.bind = function(me, fn) { 
        return function() { 
            return fn.apply(me, arguments); 
        }; 
    };
    
    /**
     * Strip a string of all leading and trailing whitespace.
     *
     * @example
     *      
     *      var a = " aaa ";
     *      var b = splunkjs.Utils.trim(a); //== "aaa"
     *
     * @param {String} str The string to trim
     * @return {String} The trimmed string
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
     * Whether an array contains a specific object
     *
     * @example
     *      
     *      var a = ["a", "b', "c"];
     *      console.log(splunkjs.Utils.indexOf(a, "b")) //== 1
     *      console.log(splunkjs.Utils.indexOf(a, "d")) //== -1
     *
     * @param {Array} arr The array to search in
     * @param {Anything} search The thing to search for
     * @return {Number} The index of `search` or `-1` if it wasn't found
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
     * Whether an array contains a specific object
     *
     * @example
     *      
     *      var a = {a: 3};
     *      var b = [{}, {c: 1}, {b: 1}, a];
     *      var contained = splunkjs.Utils.contains(b, a); // should be tree
     *
     * @param {Array} arr Array to search
     * @param {Anything} obj Whether the array contains the element
     * @return {Boolean} Whether the array contains the element
     *
     * @function splunkjs.Utils
     */
    root.contains = function(arr, obj) {
        arr = arr || [];
        return (root.indexOf(arr, obj) >= 0);
    };

    /**
     * Whether a string starts with a specific prefix.
     *
     * @example
     *      
     *      var starts = splunkjs.Utils.startsWith("splunk-foo", "splunk-");
     *
     * @param {String} original String to search
     * @param {String} prefix Prefix to search with
     * @return {Boolean} Whether the string starts with the prefix
     *
     * @function splunkjs.Utils
     */
    root.startsWith = function(original, prefix) {
        var matches = original.match("^" + prefix);
        return matches && matches.length > 0 && matches[0] === prefix;  
    };

    /**
     * Whether a string ends with a specific suffix.
     *
     * @example
     *      
     *      var ends = splunkjs.Utils.endsWith("foo-splunk", "-splunk");
     *
     * @param {String} original String to search
     * @param {String} suffix Suffix to search with
     * @return {Boolean} Whether the string ends with the suffix
     *
     * @function splunkjs.Utils
     */
    root.endsWith = function(original, suffix) {
        var matches = original.match(suffix + "$");
        return matches && matches.length > 0 && matches[0] === suffix;  
    };
    
    var toString = Object.prototype.toString;
    
    /**
     * Convert an iterable to an array.
     *
     * @example
     *      
     *      function() { 
     *          console.log(arguments instanceof Array); // false
     *          var arr = console.log(splunkjs.Utils.toArray(arguments) instanceof Array); // true
     *      }
     *
     * @param {Arguments} iterable Iterable to conver to an array
     * @return {Array} The converted array
     *
     * @function splunkjs.Utils
     */
    root.toArray = function(iterable) {
        return Array.prototype.slice.call(iterable);
    };
    
    /**
     * Whether or not the argument is an array
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isArray(arguments)); // false
     *          console.log(splunkjs.Utils.isArray([1,2,3])); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is an array
     * @return {Boolean} Whether or not the passed in parameter was an array
     *
     * @function splunkjs.Utils
     */
    root.isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    /**
     * Whether or not the argument is a function
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isFunction([1,2,3]); // false
     *          console.log(splunkjs.Utils.isFunction(function() {})); // true
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a function
     * @return {Boolean} Whether or not the passed in parameter was a function
     *
     * @function splunkjs.Utils
     */
    root.isFunction = function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    };

    /**
     * Whether or not the argument is a number
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isNumber(1); // true
     *          console.log(splunkjs.Utils.isNumber(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a number
     * @return {Boolean} Whether or not the passed in parameter was a number
     *
     * @function splunkjs.Utils
     */
    root.isNumber = function(obj) {
        return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
    };
    
    /**
     * Whether or not the argument is a string
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isString("abc"); // true
     *          console.log(splunkjs.Utils.isString(function() {})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is a string
     * @return {Boolean} Whether or not the passed in parameter was a string
     *
     * @function splunkjs.Utils
     */
    root.isString = function(obj) {
        return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    };
    
    /**
     * Whether or not the argument is an object
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isObject({abc: "abc"}); // true
     *          console.log(splunkjs.Utils.isObject("abc"); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is an object
     * @return {Boolean} Whether or not the passed in parameter was a object
     *
     * @function splunkjs.Utils
     */
    root.isObject = function(obj) {
        return obj === Object(obj);
    };
    
    /**
     * Whether or not the argument is empty
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.isEmpty({})); // true
     *          console.log(splunkjs.Utils.isEmpty({a: 1})); // false
     *      }
     *
     * @param {Anything} obj Parameter to check whether it is empty
     * @return {Boolean} Whether or not the passed in parameter was empty
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
     * Apply the iterator function to each element in the object
     *
     * @example
     *      
     *      splunkjs.Utils.forEach([1,2,3], function(el) { console.log(el); }); // 1,2,3
     *
     * @param {Object|Array} obj Object/array to iterate over
     * @param {Function} iterator Function to apply with each element: `(element, list, index)`
     * @param {Object} context An optional context to apply the function on
     *
     * @function splunkjs.Utils
     */
    root.forEach = function(obj, iterator, context) {
        if (obj === null) {
            return;
        }
        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === {}) {
                    return;
                }
            }
        } else {
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
     * Extend a given object with all the properties in passed-in objects
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.extend({foo: "bar"}, {a: 2})); // {foo: "bar", a: 2}
     *      }
     *
     * @param {Object} obj Object to extend
     * @param {Object...} sources Sources to extend from
     * @return {Object} The extended object
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
     * Create a shallow-cloned copy of the object/array
     *
     * @example
     *      
     *      function() { 
     *          console.log(splunkjs.Utils.clone({foo: "bar"})); // {foo: "bar"}
     *          console.log(splunkjs.Utils.clone([1,2,3])); // [1,2,3]
     *      }
     *
     * @param {Object|Array} obj Object/array to clone
     * @return {Object|Array} The cloned object/array
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
     * Extract namespace information from a properties dictionary
     *
     * @param {Object} props Properties dictionary
     * @return {Object} Namespace information (owner, app, sharing) for the given properties
     *
     * @function splunkjs.Utils
     */
    root.namespaceFromProperties = function(props) {
        return {
            owner: props.acl.owner,
            app: props.acl.app,
            sharing: props.acl.sharing
        };
    };  
})();
});

require.define("/lib/context.js", function (require, module, exports, __dirname, __filename) {
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
     * Abstraction over the Splunk HTTP-wire protocol
     *
     * This class provides the basic functionality for communicating with a Splunk
     * instance over HTTP. It will handle authentication and authorization, and
     * formatting HTTP requests (GET/POST/DELETE) in the format Splunk expects.
     *
     * @class splunkjs.Context
     */
    module.exports = root = Class.extend({
        
        /**
         * Constructor for splunkjs.Context
         *
         * @constructor
         * @param {splunkjs.Http} http An instance of a `splunkjs.Http` class
         * @param {Object} params Dictionary of optional parameters: 
         *      - `scheme`: `http` or `https`
         *      - `host`: hostname for Splunk
         *      - `port`: port for Splunk
         *      - `username`: username to login with
         *      - `password`: password to login with
         *      - `owner`: owner component of namespace
         *      - `app`: app component of namespace
         *      - `sessionKey`: optional pre-loaded session key
         * @return {splunkjs.Context} A splunkjs.Context instance
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
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/services/json/v2";

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
         * Append Splunk-specific headers
         *
         * @param {Object} headers Dictionary of headers (optional)
         * @return {Object} Augmented dictionary of headers
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
         * This is an internal function aimed to aid with the autologin feature.
         * It takes two parameters: `task`, which is a function describing an
         * HTTP request, and `callback`, to be invoked when all is said 
         * and done.
         *  
         * @param  {Function} task A function taking a single argument: `(callback)`
         * @param  {Function} callback A callback to be invoked when the request is complete: `(err, response)`
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
         * Convert partial paths to fully qualified ones
         *
         * Convert any partial path into a full path containing the full
         * owner and app prefixes if necessary
         *
         * @param {String} path Partial path
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
         * Convert partial paths to a fully qualified URL
         *
         * Convert any partial path into a fully qualified URL.
         *
         * @param {String} path Partial path
         * @return {String} Fully qualified URL
         *
         * @method splunkjs.Context 
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
         * Perform a GET request
         *
         * @param {String} path Path to request
         * @param {Object} params Query parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
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
         * Perform a DELETE request
         *
         * @param {String} path Path to request
         * @param {Object} params Query parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
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
         * Perform a POST request
         *
         * @param {String} path Path to request
         * @param {Object} params Body parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
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
         * Perform a request
         *
         * @param {String} path URL to request (with any query parameters already appended and encoded)
         * @param {String} method HTTP method (one of GET | POST | DELETE)
         * @param {Object} headers Object of headers for this request
         * @param {Object} body Body of parameters for this request
         * @param {Function} callback Callback for when the request is complete: `(err, response)`
         *
         * @method splunkjs.Context 
         */
        request: function(path, method, headers, body, callback) {
            var that = this;
            var request = function(callback) {
                return that.http.request(
                    that.urlify(path),    
                    {
                        method: method,
                        headers: that._headers(headers),
                        body: body,
                        timeout: 0
                    },
                    callback
                );  
            };
            
            return this._requestWrapper(request, callback);
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
        apps: "/services/apps/local",
        capabilities: "authorization/capabilities",
        configurations: "configs",
        deploymentClient: "deployment/client",
        deploymentServers: "deployment/server",
        deploymentServerClasses: "deployment/serverclass",
        deploymentTenants: "deployment/tenants",
        eventTypes: "saved/eventTypes",
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
        properties: "properties",
        roles: "authentication/roles",
        savedSearches: "saved/searches",
        settings: "server/settings",
        users: "/services/authentication/users",
        typeahead: "search/typeahead",
        views: "data/ui/views",
        
        currentUser: "/services/authentication/current-context",
        submitEvent: "receivers/simple",
        
        storm: {
            submitEvent: "/inputs/http"
        }
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
    var logger          = require('./log').Logger;
    var utils           = require('./utils');

    var root = exports || this;

    /**
     * Helper function to encode a dictionary of values into a URL-encoded
     * format.
     *
     * @example
     *      
     *      // should be a=1&b=2&b=3&b=4
     *      encode({a: 1, b: [2,3,4]})
     *
     * @param {Object} params Parameters to URL-encode
     * @return {String} URL-encoded query string
     *
     * @function splunkjs.Http
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

        if (encodedStr[encodedStr.length - 1] === '&') {
            encodedStr = encodedStr.substr(0, encodedStr.length - 1);
        }

        return encodedStr;
    };
     
    /**
     * Base class for HTTP abstraction. 
     *
     * This class provides the basic functionality (get/post/delete/request),
     * as well as utilities to construct uniform responses.
     *
     * Base classes should only override `makeRequest` and `parseJSON`
     *
     * @class splunkjs.Http
     */
    root.Http = Class.extend({
        /**
         * Constructor for splunkjs.Http
         *
         * @constructor
         * @param {Boolean} isSplunk Whether or not this is HTTP instance is for talking with splunkjs.
         * @return {splunkjs.Http} A splunkjs.Http instance
         *
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
         * @see makeRequest
         */
        request: function(url, message, callback) {
            var wrappedCallback = function(response) {
                callback = callback || function() {};

                if (response.status < 400 && response.status !== "abort") {
                    callback(null, response);
                }
                else {
                    callback(response);
                }
            };

            // Now we can invoke the user-provided HTTP class,
            // passing in our "wrapped" callback
            return this.makeRequest(url, message, wrappedCallback);
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
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
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
         * @method splunkjs.Http 
         */
        _buildResponse: function(error, response, data) {            
            var complete_response, json = {};

            var contentType = null;
            if (response && response.headers) {
                contentType = utils.trim(response.headers["content-type"] || response.headers["Content-Type"]);
            }

            if (utils.startsWith(contentType, "application/json")) {
                json = this.parseJson(data) || {};
            }

            logger.printMessages(json.messages);                
            
            complete_response = {
                response: response,
                status: (response ? response.statusCode : 0),
                data: json,
                error: error
            };

            return complete_response;
        }
    });
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
            
            var that = this;
            var req = {
                abort: function() {
                    // Note that we were aborted
                    req.wasAborted = true;
                    
                    var res = { headers: {}, statusCode: "abort" };
                    var data = "{}";
                    var complete_response = that._buildResponse("abort", res, data);
                    
                    callback(complete_response);
                }
            };

            var success = utils.bind(this, function(res) {
                // If we already aborted this request, then do nothing
                if (req.wasAborted) {
                    return;
                }
                
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
                // If we already aborted this request, then do nothing
                if (req.wasAborted) {
                    return;
                }
                
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
            
            return req;
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

require.define("/lib/service.js", function (require, module, exports, __dirname, __filename) {
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
     * Utilities for Async control flow and collection handling
     *
     * @module splunkjs.Async
     */

    /**
     * An asynchronous while loop
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
     * @param {Function} condition A function which returns a boolean depending on whether the condition has been met.
     * @param {Function} body A function which executes the body of the loop: `(done)`
     * @param {Function} callback A function to be executed when the loop is complete: `(err)`
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
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, ...)`
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
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, ...)`
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
     * Map an asynchronous function over an array of values, in parallel.
     * 
     * Async.parallelMap will execute a function over each element in an array in parallel,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with the resulting array.
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
     * @param {Array} vals An array of the values to map over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, mappedVals)`
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
     * Map an asynchronous function over an array of values, in series.
     * 
     * Async.seriesMap will execute a function over each element in an array in series,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with the resulting array.
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
     * @param {Array} vals An array of the values to map over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err, mappedVals)`
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
     * Apply an asynchronous function over an array of values, in parallel.
     * 
     * Async.parallelEach will execute a function over each element in an array in parallel,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with nothing except a possible error parameter
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
     * @param {Array} vals An array of the values to apply over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err)`
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
     * Apply an asynchronous function over an array of values, in series.
     * 
     * Async.seriesEach will execute a function over each element in an array in series,
     * and only call the callback when all operations are done, or when there is an error.
     *
     * The callback will be invoked with nothing except a possible error parameter
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
     * @param {Array} vals An array of the values to apply over.
     * @param {Function} fn A (possibly asycnhronous) function to apply to each element: `(done)`
     * @param {Function} callback A function to be executed when all tasks are done or an error occurred: `(err)`
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
     * @param {Function} tasks An array of functions: `(done)`
     * @param {Function} callback A function to be executed when the chain is done or an error occurred: `(err, ...)`
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
     * Execute a function after a certain delay.
     * 
     * Async.sleep will execute the given function after the specified timeout period. This function
     * mostly exists to make `setTimeout` adhere to Node.js style function signatures.
     *
     * @example
     *      
     *     Async.sleep(1000, function() { console.log("TIMEOUT");});
     *     
     * @param {Number} timeout The specified timeout in milliseconds.
     * @param {Function} callback A function to be executed when the timeout occurs.
     *
     * @function splunkjs.Async
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
     * @param {Function} callback The callback to augment.
     * @param {Anything...} rest Variable number of arguments to augment the callback with.
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
    
    var Service      = require('./service');
    var Class        = require('./jquery.class').Class;
    var utils        = require('./utils');
    var Async        = require('./async');
    var EventEmitter = require('../contrib/eventemitter').EventEmitter;
    
    var root = exports || this;
    var JobManager = null;

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    module.exports = root = JobManager = Class.extend({
        init: function(service, job, options) {
            options = options || {};
            
            this.service = service;
            this.job = job;
            this.isJobDone = false;
            this.events = new EventEmitter();
            
            this.sleep = options.hasOwnProperty("sleep") ? options.sleep : 1000;
            
            this.on              = utils.bind(this, this.on);
            this._start          = utils.bind(this, this._start);
            this.cancel          = utils.bind(this, this.cancel);
            this.isDone          = utils.bind(this, this.isDone);
            this.eventsIterator  = utils.bind(this, this.eventsIterator);
            this.resultsIterator = utils.bind(this, this.resultsIterator);
            this.previewIterator = utils.bind(this, this.previewIterator);
            
            this._start();
        },
        
        _start: function() {                        
            var that = this;
            var job = this.job;
            var properties = {};
            var stopLooping = false;
            Async.whilst(
                function() { return !stopLooping; },
                function(iterationDone) {
                    job.fetch(function(err, job) {
                        if (err) {
                            iterationDone(err);
                            return;
                        }
                        
                        properties = job.state() || {};
                        
                        // Dispatch for progress
                        that.events.emit("progress", properties);
                        
                        // Dispatch for failure if necessary
                        if (properties.isFailed) {
                            that.events.emit("fail", properties);
                        }
                        
                        stopLooping = properties.content.isDone || that.isJobDone || properties.content.isFailed;
                        Async.sleep(that.sleep, iterationDone);
                    });
                },
                function(err) {
                    that.isJobDone = true;
                    that.events.emit("done", err, that);
                }
            );
        },
        
        on: function(event, action) {
            this.events.on(event, action);  
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

require.define("/contrib/eventemitter.js", function (require, module, exports, __dirname, __filename) {
/**
 * EventEmitter v3.1.4
 * https://github.com/Wolfy87/EventEmitter
 * 
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Oliver Caldwell (olivercaldwell.co.uk)
 */(function(a){function b(){this._events={},this._maxListeners=10}function c(a,b,c,d,e){this.type=a,this.listener=b,this.scope=c,this.once=d,this.instance=e}"use strict",c.prototype.fire=function(a){this.listener.apply(this.scope||this.instance,a);if(this.once)return this.instance.removeListener(this.type,this.listener,this.scope),!1},b.prototype.eachListener=function(a,b){var c=null,d=null,e=null;if(this._events.hasOwnProperty(a)){d=this._events[a];for(c=0;c<d.length;c+=1){e=b.call(this,d[c],c);if(e===!1)c-=1;else if(e===!0)break}}return this},b.prototype.addListener=function(a,b,d,e){return this._events.hasOwnProperty(a)||(this._events[a]=[]),this._events[a].push(new c(a,b,d,e,this)),this.emit("newListener",a,b,d,e),this._maxListeners&&!this._events[a].warned&&this._events[a].length>this._maxListeners&&(typeof console!="undefined"&&console.warn("Possible EventEmitter memory leak detected. "+this._events[a].length+" listeners added. Use emitter.setMaxListeners() to increase limit."),this._events[a].warned=!0),this},b.prototype.on=b.prototype.addListener,b.prototype.once=function(a,b,c){return this.addListener(a,b,c,!0)},b.prototype.removeListener=function(a,b,c){return this.eachListener(a,function(d,e){d.listener===b&&(!c||d.scope===c)&&this._events[a].splice(e,1)}),this._events[a]&&this._events[a].length===0&&delete this._events[a],this},b.prototype.off=b.prototype.removeListener,b.prototype.removeAllListeners=function(a){return a&&this._events.hasOwnProperty(a)?delete this._events[a]:a||(this._events={}),this},b.prototype.listeners=function(a){if(this._events.hasOwnProperty(a)){var b=[];return this.eachListener(a,function(a){b.push(a.listener)}),b}return[]},b.prototype.emit=function(a){var b=[],c=null;for(c=1;c<arguments.length;c+=1)b.push(arguments[c]);return this.eachListener(a,function(a){return a.fire(b)}),this},b.prototype.setMaxListeners=function(a){return this._maxListeners=a,this},typeof define=="function"&&define.amd?define(function(){return b}):a.EventEmitter=b})(this);
});

require.define("/lib/storm.js", function (require, module, exports, __dirname, __filename) {
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
    
    var Service         = require('./service');
    var Http            = require('./http').Http;
    var Paths           = require('./paths').Paths;
    var utils           = require('./utils');
    var base64          = require('../contrib/base64');

    var root = exports || this;
    var StormService = null;
    
    /**
     * Root access point to the Splunk Storm REST API
     *
     * @class splunkjs.StormService
     * @extends splunkjs.Service
     */
    module.exports = root = StormService = Service.extend({
        init: function(http, params) {
            if (!(http instanceof Http) && !params) {
                // Move over the params
                params = http;
                http = null;
            }
            
            params = params || {};
            
            var username = params.token || params.username || null;
            var password = "x";
            
            // Setup the parameters
            params.paths         = Paths.storm;
            params.scheme        = "https";
            params.host          = "api.splunkstorm.com";
            params.port          = 443;
            params.sessionKey    = base64.encode(username + ":x");
            params.authorization = "Basic";
            
            // Initialize
            this._super.call(this, http, params);
            
            // Override computed parameters
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/1";
        },
        
        log: function(event, params, callback) {
            if (!callback && utils.isFunction(params)) {
                callback = params;
                params = {};
            }
            
            callback = callback || function() {};
            params = params || {};
            
            if (!params.project && !params.index) {
                throw new Error("Cannot submit events to Storm without specifying a project");
            }
            
            if (params.project) {
                params.index = params.project;
                delete params["project"];
            }
            
            if (utils.isObject(event)) {
                event = JSON.stringify(event);
            }
            
            return this._super(event, params, callback);
        }
    });  
})();
});

require.define("/contrib/base64.js", function (require, module, exports, __dirname, __filename) {
/*
Copyright (c) 2008 Fred Palmer fred.palmer_at_gmail.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

(function() {
    function StringBuffer()
    { 
        this.buffer = []; 
    } 
    
    StringBuffer.prototype.append = function append(string)
    { 
        this.buffer.push(string); 
        return this; 
    }; 
    
    StringBuffer.prototype.toString = function toString()
    { 
        return this.buffer.join(""); 
    }; 
    
    var Base64 = module.exports = 
    {
        codex : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    
        encode : function (input)
        {
            var output = new StringBuffer();
    
            var enumerator = new Utf8EncodeEnumerator(input);
            while (enumerator.moveNext())
            {
                var chr1 = enumerator.current;
    
                enumerator.moveNext();
                var chr2 = enumerator.current;
    
                enumerator.moveNext();
                var chr3 = enumerator.current;
    
                var enc1 = chr1 >> 2;
                var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                var enc4 = chr3 & 63;
    
                if (isNaN(chr2))
                {
                    enc3 = enc4 = 64;
                }
                else if (isNaN(chr3))
                {
                    enc4 = 64;
                }
    
                output.append(this.codex.charAt(enc1) + this.codex.charAt(enc2) + this.codex.charAt(enc3) + this.codex.charAt(enc4));
            }
    
            return output.toString();
        },
    
        decode : function (input)
        {
            var output = new StringBuffer();
    
            var enumerator = new Base64DecodeEnumerator(input);
            while (enumerator.moveNext())
            {
                var charCode = enumerator.current;
    
                if (charCode < 128)
                    output.append(String.fromCharCode(charCode));
                else if ((charCode > 191) && (charCode < 224))
                {
                    enumerator.moveNext();
                    var charCode2 = enumerator.current;
    
                    output.append(String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)));
                }
                else
                {
                    enumerator.moveNext();
                    var charCode2 = enumerator.current;
    
                    enumerator.moveNext();
                    var charCode3 = enumerator.current;
    
                    output.append(String.fromCharCode(((charCode & 15) << 12) | ((charCode2 & 63) << 6) | (charCode3 & 63)));
                }
            }
    
            return output.toString();
        }
    }
    
    
    function Utf8EncodeEnumerator(input)
    {
        this._input = input;
        this._index = -1;
        this._buffer = [];
    }
    
    Utf8EncodeEnumerator.prototype =
    {
        current: Number.NaN,
    
        moveNext: function()
        {
            if (this._buffer.length > 0)
            {
                this.current = this._buffer.shift();
                return true;
            }
            else if (this._index >= (this._input.length - 1))
            {
                this.current = Number.NaN;
                return false;
            }
            else
            {
                var charCode = this._input.charCodeAt(++this._index);
    
                // "\r\n" -> "\n"
                //
                if ((charCode == 13) && (this._input.charCodeAt(this._index + 1) == 10))
                {
                    charCode = 10;
                    this._index += 2;
                }
    
                if (charCode < 128)
                {
                    this.current = charCode;
                }
                else if ((charCode > 127) && (charCode < 2048))
                {
                    this.current = (charCode >> 6) | 192;
                    this._buffer.push((charCode & 63) | 128);
                }
                else
                {
                    this.current = (charCode >> 12) | 224;
                    this._buffer.push(((charCode >> 6) & 63) | 128);
                    this._buffer.push((charCode & 63) | 128);
                }
    
                return true;
            }
        }
    }
    
    function Base64DecodeEnumerator(input)
    {
        this._input = input;
        this._index = -1;
        this._buffer = [];
    }
    
    Base64DecodeEnumerator.prototype =
    {
        current: 64,
    
        moveNext: function()
        {
            if (this._buffer.length > 0)
            {
                this.current = this._buffer.shift();
                return true;
            }
            else if (this._index >= (this._input.length - 1))
            {
                this.current = 64;
                return false;
            }
            else
            {
                var enc1 = Base64.codex.indexOf(this._input.charAt(++this._index));
                var enc2 = Base64.codex.indexOf(this._input.charAt(++this._index));
                var enc3 = Base64.codex.indexOf(this._input.charAt(++this._index));
                var enc4 = Base64.codex.indexOf(this._input.charAt(++this._index));
    
                var chr1 = (enc1 << 2) | (enc2 >> 4);
                var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                var chr3 = ((enc3 & 3) << 6) | enc4;
    
                this.current = chr1;
    
                if (enc3 != 64)
                    this._buffer.push(chr2);
    
                if (enc4 != 64)
                    this._buffer.push(chr3);
    
                return true;
            }
        }
    };
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
    var splunkjs    = require('../index');
    var Async       = splunkjs.Async;

    splunkjs.Logger.setLevel("ALL");
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
        
        "Chain flat single success": function(test) {
            Async.chain(
                function(callback) { 
                    callback(null, 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                },
                function(val, callback) {
                    callback(null, val + 1);
                },
                function(err, val) {
                    test.ok(!err);
                    test.strictEqual(val, 3);
                    test.done();
                }
            );
        },
        
        "Chain flat multiple success": function(test) {
            Async.chain(
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1, val2 + 1);
                },
                function(err, val1, val2) {
                    test.ok(!err);
                    test.strictEqual(val1, 3);
                    test.strictEqual(val2, 4);
                    test.done();
                }
            );
        },
        
        "Chain flat arity change success": function(test) {
            Async.chain(
                function(callback) { 
                    callback(null, 1, 2);
                },
                function(val1, val2, callback) {
                    callback(null, val1 + 1);
                },
                function(val1, callback) {
                    callback(null, val1 + 1, 5);
                },
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
        }
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
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");
    return {
        "HTTP GET Tests": {
            setUp: function(done) {
                this.http = http;
                done();
            },
            
            "Callback#abort simple": function(test) {
                var req = this.http.get("https://www.httpbin.org/get", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                req.abort();
            },
            
            "Callback#abort delay": function(test) {
                var req = this.http.get("https://www.httpbin.org/delay/20", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                splunkjs.Async.sleep(1000, function() {
                    req.abort();
                });
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://www.httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://www.httpbin.org/get");
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
                    var args = res.data.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", {"X-Test1": 1, "X-Test2": "a/b/c"}, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.data.url, "http://www.httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://www.httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.data.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.strictEqual(args.c, "1");
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://www.httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
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
                    test.strictEqual(res.data.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://www.httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://www.httpbin.org/post");
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
                    var args = res.data.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://www.httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://www.httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    var args = res.data.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://www.httpbin.org/post");
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
                    test.strictEqual(res.data.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                this.http.del("http://www.httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://www.httpbin.org/delete");
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
                    test.strictEqual(res.data.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://www.httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://www.httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://www.httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var NodeHttp    = splunkjs.NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp(false);
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}
});

require.define("/tests/test_context.js", function (require, module, exports, __dirname, __filename) {

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
    var splunkjs    = require('../index');

    splunkjs.Logger.setLevel("ALL");
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
            var newService = new splunkjs.Service(svc.http, { 
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
            var newService = new splunkjs.Service(svc.http, { 
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
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
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
        
        "Callback#get autologin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                test.done();
            });
        },
        
        "Callback#get autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC"
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#get autologin - disabled": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    autologin: false
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#get relogin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(!err);
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                test.done();
            });
        },
        
        "Callback#get relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },

        "Callback#post": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
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
        
        "Callback#post autologin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },
        
        "Callback#post autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC"
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#post autologin - disabled": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    autologin: false
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#post relogin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                            test.done();
                        }
                    );
                }
            );
        },
        
        "Callback#post relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },

        "Callback#delete": function(test) { 
            var service = this.service;
            this.service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.data.sid;
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
        
        "Callback#delete autologin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.data.sid;
                test.ok(sid);
                
                service.sessionKey = null;
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    test.done();
                });
            });
        },
        
        "Callback#delete autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC"
                }
            );
            
            service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#delete autologin - disabled": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    autologin: false
                }
            );
            
            service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#delete relogin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.post("search/jobs", {search: "search index=_internal | head 1"}, function(err, res) {
                var sid = res.data.sid;
                test.ok(sid);
                
                service.sessionKey = "ABCDEF-not-real";
                var endpoint = "search/jobs/" + sid;
                service.del(endpoint, {}, function(err, res) {
                    test.done();
                });
            });
        },
        
        "Callback#delete relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },

        "Callback#request get": function(test) { 
            this.service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                
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
                var sid = res.data.sid;
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
        },
        
        "Callback#request autologin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password
                }
            );
            
            service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.done();
            });
        },
        
        "Callback#request autologin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC"
                }
            );
            
            service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#request autologin - disabled": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    autologin: false
                }
            );
            
            service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#request relogin - success": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password,
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.strictEqual(res.data.paging.offset, 0);
                test.ok(res.data.entry.length <= res.data.paging.total);
                test.strictEqual(res.data.entry.length, 2);
                test.ok(res.data.entry[0].content.sid);
                
                if (res.response.request) {
                    test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                }
                
                test.done();
            });
        },
        
        "Callback#request relogin - error": function(test) { 
            var service = new splunkjs.Service(
                this.service.http,
                {
                    scheme: this.service.scheme,
                    host: this.service.host,
                    port: this.service.port,
                    username: this.service.username,
                    password: this.service.password + "ABC",
                    sessionKey: "ABCDEF-not-real"
                }
            );
            
            service.request("search/jobs?count=2", "GET", {"X-TestHeader": 1}, "", function(err, res) {
                test.ok(err);
                test.strictEqual(err.status, 401);
                test.done();
            });
        },
        
        "Callback#abort": function(test) { 
            var req = this.service.get("search/jobs", {count: 2}, function(err, res) {
                test.ok(!res);
                test.ok(err);
                test.strictEqual(err.error, "abort");
                test.strictEqual(err.status, "abort");
                test.done();
            });
            
            req.abort();
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password
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

require.define("/examples/node/cmdline.js", function (require, module, exports, __dirname, __filename) {
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
    var commander    = require('../../contrib/commander');
    var utils        = require('../../lib/utils');
    
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
            .option('--port <port>', "Port to use", 8089, false);
        
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

require.define("/tests/test_service.js", function (require, module, exports, __dirname, __filename) {

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
    var splunkjs    = require('../index');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        "Namespace Tests": {
            setUp: function(finished) {
                this.service = svc;
                var that = this;
                                
                var appName1 = "jssdk_testapp_" + getNextId();
                var appName2 = "jssdk_testapp_" + getNextId();
                
                var userName1 = "jssdk_testuser_" + getNextId();
                var userName2 = "jssdk_testuser_" + getNextId();
                
                var apps = this.service.apps();
                var users = this.service.users();
                
                this.namespace11 = {owner: userName1, app: appName1};
                this.namespace12 = {owner: userName1, app: appName2};
                this.namespace21 = {owner: userName2, app: appName1};
                this.namespace22 = {owner: userName2, app: appName2};
                
                Async.chain([
                        function(done) {
                            apps.create({name: appName1}, done);
                        },
                        function(app1, done) {
                            that.app1 = app1;
                            that.appName1 = appName1;
                            apps.create({name: appName2}, done);
                        },
                        function(app2, done) {
                            that.app2 = app2;
                            that.appName2 = appName2;
                            users.create({name: userName1, password: "abc", roles: ["user"]}, done);
                        },
                        function(user1, done) {
                            that.user1 = user1;
                            that.userName1 = userName1;
                            users.create({name: userName2, password: "abc", roles: ["user"]}, done);
                        },
                        function(user2, done) {
                            that.user2 = user2;
                            that.userName2 = userName2;
                            
                            done();
                        }
                    ],
                    function(err) {
                        finished(); 
                    }
                );
            },        
            
            "Callback#Namespace protection": function(test) {    
                var searchName = "jssdk_search_" + getNextId();
                var search = "search *";
                var service = this.service;
                
                var savedSearches11 = service.savedSearches(this.namespace11);
                var savedSearches21 = service.savedSearches(this.namespace21);
                
                var that = this;
                Async.chain([
                        function(done) {
                            // Create the saved search only in the 11 namespace
                            savedSearches11.create({name: searchName, search: search}, done);
                        },
                        function(savedSearch, done) {
                            // Refresh the 11 saved searches
                            savedSearches11.fetch(done);
                        },
                        function(savedSearches, done) {
                            // Refresh the 21 saved searches
                            savedSearches21.fetch(done);
                        },
                        function(savedSearches, done) {                            
                            var entity11 = savedSearches11.item(searchName);
                            var entity21 = savedSearches21.item(searchName);
                            
                            // Make sure the saved search exists in the 11 namespace
                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);
                            
                            // Make sure the saved search doesn't exist in the 11 namespace
                            test.ok(!entity21);
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },    
            
            "Callback#Namespace item": function(test) {    
                var searchName = "jssdk_search_" + getNextId();
                var search = "search *";
                var service = this.service;
                
                var namespace_1 = {owner: "-", app: this.appName1};
                var namespace_nobody1 = {owner: "nobody", app: this.appName1};
                
                var savedSearches11 = service.savedSearches(this.namespace11);
                var savedSearches21 = service.savedSearches(this.namespace21);
                var savedSearches_1 = service.savedSearches(namespace_1);
                var savedSearches_nobody1 = service.savedSearches(namespace_nobody1);
                
                var that = this;
                Async.chain([
                        function(done) {
                            // Create a saved search in the 11 namespace
                            savedSearches11.create({name: searchName, search: search}, done);
                        },
                        function(savedSearch, done) {
                            // Create a saved search in the 21 namespace
                            savedSearches21.create({name: searchName, search: search}, done);
                        },
                        function(savedSearch, done) {
                            // Refresh the -/1 namespace
                            savedSearches_1.fetch(done);
                        },
                        function(savedSearches, done) {
                            // Refresh the 1/1 namespace
                            savedSearches11.fetch(done);
                        },
                        function(savedSearches, done) {
                            // Refresh the 2/1 namespace
                            savedSearches21.fetch(done);
                        },
                        function(savedSearches, done) {                            
                            var entity11 = savedSearches11.item(searchName, that.namespace11);
                            var entity21 = savedSearches21.item(searchName, that.namespace21);
                            
                            // Ensure that the saved search exists in the 11 namespace
                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);
                            test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                            test.strictEqual(entity11.namespace.app, that.namespace11.app);
                            
                            // Ensure that the saved search exists in the 21 namespace
                            test.ok(entity21);
                            test.strictEqual(entity21.name, searchName);
                            test.strictEqual(entity21.properties().search, search);
                            test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                            test.strictEqual(entity21.namespace.app, that.namespace21.app);
                            
                            done();
                        },
                        function(done) {
                            // Create a saved search in the nobody/1 namespace
                            savedSearches_nobody1.create({name: searchName, search: search}, done);
                        },
                        function(savedSearch, done) {
                            // Refresh the 1/1 namespace
                            savedSearches11.fetch(done);
                        },
                        function(savedSearches, done) {
                            // Refresh the 2/1 namespace
                            savedSearches21.fetch(done);
                        },
                        function(savedSearches, done) {  
                            // Ensure that we can't get the item from the generic
                            // namespace without specifying a namespace
                            var thrown = false;
                            try {
                                var entity = savedSearches_1.item(searchName);
                            }
                            catch(ex) {
                                thrown = true;
                            }
                            
                            test.ok(thrown);
                                                    
                            // Ensure we get the right entities from the -/1 namespace when we
                            // specify it.  
                            var entity11 = savedSearches_1.item(searchName, that.namespace11);
                            var entity21 = savedSearches_1.item(searchName, that.namespace21);
                            
                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);
                            test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                            test.strictEqual(entity11.namespace.app, that.namespace11.app);
                            
                            test.ok(entity21);
                            test.strictEqual(entity21.name, searchName);
                            test.strictEqual(entity21.properties().search, search);
                            test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                            test.strictEqual(entity21.namespace.app, that.namespace21.app);
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#delete test applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    var appList = apps.list();
                    
                    Async.parallelEach(
                        appList,
                        function(app, idx, callback) {
                            if (utils.startsWith(app.name, "jssdk_")) {
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
            },
            
            "Callback#delete test users": function(test) {
                var users = this.service.users();
                users.fetch(function(err, users) {
                    var userList = users.list();
                    
                    Async.parallelEach(
                        userList,
                        function(user, idx, callback) {
                            if (utils.startsWith(user.name, "jssdk_")) {
                                user.remove(callback);
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
        
        "Job Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Create+abort job": function(test) {
                var sid = getNextId();
                var options = {id: sid};
                var jobs = this.service.jobs({app: "xml2json"});
                var req = jobs.oneshotSearch('search index=_internal |  head 1 | sleep 10', options, function(err, job) {   
                    test.ok(err);
                    test.ok(!job);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                splunkjs.Async.sleep(1000, function() {
                    req.abort();
                });
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
                this.service.jobs().search({search: 'index=_internal | head 1', id: sid}, function(err) { 
                    test.ok(!!err);
                    test.done(); 
                });
            },

            "Callback#List jobs": function(test) {
                this.service.jobs().fetch(function(err, jobs) {
                    test.ok(!err);
                    test.ok(jobs);
                    
                    var jobsList = jobs.list();
                    test.ok(jobsList.length > 0);
                    
                    for(var i = 0; i < jobsList.length; i++) {
                        test.ok(jobsList[i]);
                    }
                    
                    test.done();
                });
            },

            "Callback#Contains job": function(test) {
                var that = this;
                var sid = getNextId();
                var jobs = this.service.jobs();
                
                jobs.search('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(!err);
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    jobs.fetch(function(err, jobs) {
                        test.ok(!err);
                        var job = jobs.item(sid);
                        test.ok(job);

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
                                    return job.properties()["isDone"];
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
                                    return job.properties()["isDone"];
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
                                    return job.properties()["isDone"];
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
                
                var service = this.service.specialize("nobody", "xml2json");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
                        },
                        function(job, done) {
                            job.enablePreview(done);
                            
                        },
                        function(job, done) {
                            job.disablePreview(done);
                        },
                        function(job, done) {
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
                
                var service = this.service.specialize("nobody", "xml2json");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.pause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(job.properties()["isPaused"]);
                            job.unpause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return !j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(!job.properties()["isPaused"]);
                            job.finalize(done);
                        },
                        function(job, done) {
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
                            job.fetch(done);
                        },
                        function(job, done) {
                            var ttl = job.properties()["ttl"];
                            originalTTL = ttl;
                            
                            job.setTTL(ttl*2, done);
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
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
                
                var service = this.service.specialize("nobody", "xml2json");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
                            var priority = job.properties()["priority"];
                            test.ok(priority, 5);
                            job.setPriority(priority + 1, done);
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
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
                            job.fetch(done);
                        },
                        function(job, done) {
                            test.ok(job);
                            originalTime = job.properties().updated;
                            Async.sleep(1200, function() { job.touch(done); });
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
                            test.ok(originalTime !== job.updated());
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

            "Callback#Oneshot search with no results": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            var query = 'search index=history MUST_NOT_EXITABCDEF';
                            that.service.jobs().oneshotSearch(query, {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.strictEqual(results.fields.length, 0);
                            test.strictEqual(results.rows.length, 0);
                            test.ok(!results.preview);
                            
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
                                    return job.properties()["isDone"];
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
            }
        },
        
        "App Tests": {      
            setUp: function(done) {
                this.service = svc;
                done();
            },
                         
            "Callback#list applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    var appList = apps.list();
                    test.ok(appList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    var app = apps.item("search");
                    test.ok(app);
                    test.done();
                });
            },
            
            "Callback#create + contains app": function(test) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                apps.create({name: name}, function(err, app) {
                    var appName = app.name;
                    apps.fetch(function(err, apps) {
                        var entity = apps.item(appName);
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
                        test.ok(app);
                        test.strictEqual(app.name, name);  
                        test.strictEqual(app.properties().version, "1.0");
                        
                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function(app, callback) {
                        test.ok(app);
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
                apps.fetch(function(err, apps) {
                    var appList = apps.list();
                    
                    Async.parallelEach(
                        appList,
                        function(app, idx, callback) {
                            if (utils.startsWith(app.name, "jssdk_")) {
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
                searches.fetch(function(err, searches) {
                    var savedSearches = searches.list();
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#contains": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch(function(err, searches) {
                    var search = searches.item("Indexing workload");
                    test.ok(search);
                    
                    test.done();
                });
            },
            
            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch(function(err, searches) {
                    var search = searches.item("Indexing workload");
                    test.ok(search);
                    
                    search.suppressInfo(function(err, info, search) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Callback#list limit count": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch({count: 2}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.strictEqual(savedSearches.length, 2);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#list filter": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch({search: "Error"}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#list offset": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch({offset: 2, count: 1}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.strictEqual(searches.paging().offset, 2);
                    test.strictEqual(searches.paging().perPage, 1);
                    test.strictEqual(savedSearches.length, 1);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#create + modify + delete saved search": function(test) {
                var name = "jssdk_savedsearch";
                var originalSearch = "search * | head 1";
                var updatedSearch = "search * | head 10";
                var updatedDescription = "description";
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                
                Async.chain([
                        function(done) {
                            searches.create({search: originalSearch, name: name}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            
                            test.strictEqual(search.name, name); 
                            test.strictEqual(search.properties().search, originalSearch);
                            test.ok(!search.properties().description);
                            
                            search.update({search: updatedSearch}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.ok(search);
                            
                            test.strictEqual(search.name, name); 
                            test.strictEqual(search.properties().search, updatedSearch);
                            test.ok(!search.properties().description);
                            
                            search.update({description: updatedDescription}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.ok(search);
                            
                            test.strictEqual(search.name, name); 
                            test.strictEqual(search.properties().search, updatedSearch);
                            test.strictEqual(search.properties().description, updatedDescription);
                            
                            search.fetch(done);
                        },
                        function(search, done) {
                            // Verify that we have the required fields
                            test.strictEqual(search.fields().required[0], "search");
                            
                            search.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#Create + dispatch + history": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                
                Async.chain(
                    function(done) {
                        searches.create({search: originalSearch, name: name}, done);
                    },
                    function(search, done) {
                        test.ok(search);
                        
                        test.strictEqual(search.name, name); 
                        test.strictEqual(search.properties().search, originalSearch);
                        test.ok(!search.properties().description);
                        
                        search.dispatch({force_dispatch: false, "dispatch.buckets": 295}, done);
                    },
                    function(job, search, done) {
                        test.ok(job);
                        test.ok(search);
                        
                        tutils.pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            Async.augment(done, search)
                        );
                    },
                    function(job, search, done) {
                        test.strictEqual(job.properties().statusBuckets, 295);
                        search.history(Async.augment(done, job));
                    },
                    function(jobs, search, originalJob, done) {
                        test.ok(jobs);
                        test.ok(jobs.length > 0);
                        test.ok(search);
                        test.ok(originalJob);
                        
                        var cancel = function(job) {
                            return function(cb) {
                                job.cancel(cb);
                            };
                        };
                        
                        var found = false;
                        var cancellations = [];
                        for(var i = 0; i < jobs.length; i++) {
                            cancellations.push(cancel(jobs[i]));
                            found = found || (jobs[i].sid === originalJob.sid);
                        }
                        
                        test.ok(found);
                        
                        search.remove(function(err) {
                            if (err) {
                                done(err);
                            }
                            else {
                                Async.parallel(cancellations, done);
                            }
                        });
                    },
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#delete test saved searches": function(test) {
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                searches.fetch(function(err, searches) {
                    var searchList = searches.list();            
                    Async.parallelEach(
                        searchList,
                        function(search, idx, callback) {
                            console.log(search.name);
                            if (utils.startsWith(search.name, "jssdk_")) {
                                search.remove(callback);
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
        
        "Configuration Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) { 
                        var files = props.list();
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
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) { 
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
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
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) { 
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
                        
                        var stanza = file.item("settings");
                        test.ok(stanza);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
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
                var namespace = {owner: "nobody", app: "system"};
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                Async.chain([
                    function(done) {
                        var configs = svc.configurations(namespace); 
                        configs.fetch(done);
                    },
                    function(configs, done) {
                        configs.create({__conf: fileName}, done);
                    },
                    function(file, done) {
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        stanza.update({"jssdk_foobar": value}, done);
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.fetch(done);
                    },
                    function(file, done) {
                        var stanza = file.item("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
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
                indexes.fetch(function(err, indexes) {
                    var indexList = indexes.list();
                    test.ok(indexList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains index": function(test) {
                var indexes = this.service.indexes();
                var indexName = this.indexName;
                
                indexes.fetch(function(err, indexes) {
                    var index = indexes.item(indexName);
                    test.ok(index);
                    test.done();
                });
            },
            
            "Callback#modify index": function(test) {
                
                var name = this.indexName;
                var indexes = this.service.indexes();
                var originalAssureUTF8Value = false;
                
                Async.chain([
                        function(callback) {
                            indexes.fetch(callback);     
                        },
                        function(indexes, callback) {
                            var index = indexes.item(name);
                            test.ok(index);
                            
                            originalAssureUTF8Value = index.properties().assureUTF8;
                            index.update({
                                assureUTF8: !originalAssureUTF8Value
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();
                            
                            test.strictEqual(!originalAssureUTF8Value, properties.assureUTF8);
                            
                            index.update({
                                assureUTF8: !properties.assureUTF8
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();
                            
                            test.strictEqual(originalAssureUTF8Value, properties.assureUTF8);
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
            
            "Callback#Enable+disable index": function(test) {
                
                var name = this.indexName;
                var indexes = this.service.indexes();
                
                Async.chain([
                        function(callback) {
                            indexes.fetch(callback);     
                        },
                        function(indexes, callback) {
                            var index = indexes.item(name);
                            test.ok(index);
                            
                            index.disable(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            index.fetch(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(index.properties().disabled);
                            
                            index.enable(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            index.fetch(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(!index.properties().disabled);
                            
                            callback();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
                   
            "Callback#Service submit event": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";
                
                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        service.log(message, {sourcetype: sourcetype, index: indexName}, done);
                    },
                    function(eventInfo, done) {
                        test.ok(eventInfo);
                        test.strictEqual(eventInfo.sourcetype, sourcetype);
                        test.strictEqual(eventInfo.bytes, message.length);
                        test.strictEqual(eventInfo._index, indexName);
                        
                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    },
                    function(err) {
                        test.ok(!err);
                        test.done(); 
                    }
                );
            },
                   
            "Callback#Index submit event": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";
                
                var indexName = this.indexName;
                var indexes = this.service.indexes();
                Async.chain([
                        function(done) {
                            indexes.fetch(done);     
                        },
                        function(indexes, done) {
                            var index = indexes.item(indexName);
                            test.ok(index);
                            test.strictEqual(index.name, indexName);                            
                            index.submitEvent(message, {sourcetype: sourcetype}, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.sourcetype, sourcetype);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo._index, indexName);
                            
                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done(); 
                    }
                );
            }
        },
        
        "User Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Current user": function(test) {
                var service = this.service;
                
                service.currentUser(function(err, user) {
                    test.ok(!err);
                    test.ok(user);
                    test.strictEqual(user.name, service.username);
                    test.done();
                });
            },
            
            "Callback#List users": function(test) {
                var service = this.service;
                
                service.users().fetch(function(err, users) {
                    var userList = users.list();
                    test.ok(!err);
                    test.ok(users);
                    
                    test.ok(userList);
                    test.ok(userList.length > 0);
                    test.done();
                });
            },
            
            "Callback#Create + update + delete user": function(test) {
                var service = this.service;
                var name = "jssdk_testuser";
                
                Async.chain([
                        function(done) {
                            service.users().create({name: "jssdk_testuser", password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");
                        
                            user.update({realname: "JS SDK", roles: ["admin", "user"]}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().realname, "JS SDK");
                            test.strictEqual(user.properties().roles.length, 2);
                            test.strictEqual(user.properties().roles[0], "admin");
                            test.strictEqual(user.properties().roles[1], "user");
                            
                            user.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#Roles": function(test) {
                var service = this.service;
                var name = "jssdk_testuser_" + getNextId();
                
                Async.chain([
                        function(done) {
                            service.users().create({name: name, password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");
                        
                            user.update({roles: ["admin", "user"]}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().roles.length, 2);
                            test.strictEqual(user.properties().roles[0], "admin");
                            test.strictEqual(user.properties().roles[1], "user");
                            
                            user.update({roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");
                            
                            user.update({roles: "__unknown__"}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.strictEqual(err.status, 400);
                        test.done();
                    }
                );
            },
            
            "Callback#Passwords": function(test) {
                var service = this.service;
                var newService = null;
                var name = "jssdk_testuser_" + getNextId();
                
                Async.chain([
                        function(done) {
                            service.users().create({name: name, password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");
                        
                            newService = new splunkjs.Service(service.http, {
                                username: name, 
                                password: "abc",
                                host: service.host,
                                port: service.port,
                                scheme: service.scheme
                            });
                        
                            newService.login(Async.augment(done, user));
                        },
                        function(success, user, done) {
                            test.ok(success);
                            test.ok(user);
                            
                            user.update({password: "abc2"}, done);
                        },
                        function(user, done) {
                            newService.login(function(err, success) {
                                test.ok(err);
                                test.ok(!success);
                                
                                user.update({password: "abc"}, done);
                            });
                        },
                        function(user, done) {
                            test.ok(user);
                            newService.login(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#delete test users": function(test) {
                var users = this.service.users();
                users.fetch(function(err, users) {
                    var userList = users.list();
                    
                    Async.parallelEach(
                        userList,
                        function(user, idx, callback) {
                            if (utils.startsWith(user.name, "jssdk_")) {
                                user.remove(callback);
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
        
        "Server Info Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Basic": function(test) {
                var service = this.service;
                
                service.serverInfo(function(err, info) {
                    test.ok(!err);
                    test.ok(info);
                    test.strictEqual(info.name, "server-info");
                    test.ok(info.properties().hasOwnProperty("version"));
                    test.ok(info.properties().hasOwnProperty("serverName"));
                    test.ok(info.properties().hasOwnProperty("os_version"));
                    
                    test.done();
                });
            }
        },
        
        "View Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#List views": function(test) {
                var service = this.service;
                
                service.views({owner: "admin", app: "search"}).fetch(function(err, views) {
                    test.ok(!err);
                    test.ok(views);
                    
                    var viewsList = views.list();
                    test.ok(viewsList);
                    test.ok(viewsList.length > 0);
                    
                    for(var i = 0; i < viewsList.length; i++) {
                        test.ok(viewsList[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#Create + update + delete view": function(test) {
                var service = this.service;
                var name = "jssdk_testview";
                var originalData = "<view/>";
                var newData = "<view isVisible='false'></view>";
                
                Async.chain([
                        function(done) {
                            service.views({owner: "admin", app: "xml2json"}).create({name: name, "eai:data": originalData}, done);
                        },
                        function(view, done) {
                            test.ok(view);
                            
                            test.strictEqual(view.name, name);
                            test.strictEqual(view.properties()["eai:data"], originalData);
                            
                            view.update({"eai:data": newData}, done);
                        },
                        function(view, done) {
                            test.ok(view);
                            test.strictEqual(view.properties()["eai:data"], newData);
                            
                            view.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },
        
        "Parser Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Basic parse": function(test) {
                var service = this.service;
                
                service.parse("search index=_internal | head 1", function(err, parse) {
                    test.ok(!err);
                    test.ok(parse);
                    test.ok(parse.commands.length > 0); 
                    test.done();
                });
            },
            
            "Callback#Parse error": function(test) {
                var service = this.service;
                
                service.parse("ABCXYZ", function(err, parse) {
                    test.ok(err);
                    test.strictEqual(err.status, 400);
                    test.done();
                });
            }
        },
        
        "Typeahead Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Basic typeahead": function(test) {
                var service = this.service;
                
                service.typeahead("index=", 1, function(err, options) {
                    test.ok(!err);
                    test.ok(options);
                    test.strictEqual(options.length, 1);
                    test.ok(options[0]);
                    test.done();
                });
            }
        }
    };

};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password
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
                    obj.fetch(done); 
                });
            },
            function(err) {
                callback(err, obj);
            }
        );
    };
})();
});

require.define("/tests/test_storm.js", function (require, module, exports, __dirname, __filename) {

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
    var splunkjs    = require('../index');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    
    var token = "p-n8SwuWEqPlyOXdDU4PjxavFdAn1CnJea9LirgTvzmIhMEBys6w7UJUCtxp_7g7Q9XopR5dW0w=";
    var project = "0e8a2df0834211e1a6fe123139335741";
    var svc = null;
    
    if (http) {
        svc = new splunkjs.StormService(http, {token: token});
    }
    else {
        svc = new splunkjs.StormService({token: token});
    }

    return {
        "Storm Input Tests": {
            setUp: function(finished) {
                this.service = svc;
                finished();
            },
            
            "Callback#Submit event no index error 1": function(test) {
                var didFail = false;
                try {
                    this.service.log("SHOULDNT WORK", {sourcetype: "sdk-test"}, function(err) {
                        test.ok(false);
                    });
                }
                catch(ex) {
                    didFail = true;
                }
                
                test.ok(didFail);
                test.done();
            },
            
            "Callback#Submit event no index error 2": function(test) {
                var didFail = false;
                try {
                    this.service.log("SHOULDNT WORK", function(err) {
                        test.ok(false);
                    });
                } 
                catch(ex) {
                    didFail = true;
                }
                
                test.ok(didFail);
                test.done();
            },
            
            "Callback#Submit event text": function(test) {
                var didFail = false;
                var message = "GO GO SDK -- " + getNextId();
                this.service.log(message, {sourcetype: "sdk-test", project: project}, function(err, data) {
                    test.ok(!err);
                    test.strictEqual(data.length, message.length);
                    test.done();
                });
            },
            
            "Callback#Submit event json": function(test) {
                var didFail = false;
                var message = { id: getNextId() };
                this.service.log(message, {sourcetype: "json", project: project}, function(err, data) {
                    test.ok(!err);
                    test.strictEqual(data.length, JSON.stringify(message).length);
                    test.done();
                });
            }
        }
    };
};

if (module === require.main) {
    var suite       = exports.setup();
    var test        = require('../contrib/nodeunit/test_reporter');
    
    test.run([{"Tests": suite}]);
}
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
    var splunkjs    = require('../index');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var JobManager  = splunkjs.JobManager;
    
    splunkjs.Logger.setLevel("ALL");
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
                    var searcher = new JobManager(test.service, job);
                    searcher.on("done", callback);
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
                    var searcher = new JobManager(test.service, job);
                    searcher.on("done", callback);
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
                    var searcher = new JobManager(test.service, job);
                    searcher.on("done", callback);
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
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password
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
    var splunkjs= require('../index');
    var Async   = splunkjs.Async;

    splunkjs.Logger.setLevel("ALL");
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
            
            "Saved Searches#Delete": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Create": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_create").main;
                main(opts, test.done);
            },
            
            "Saved Searches#Delete Again": function(test) {
                var main = require("../examples/node/helloworld/savedsearches_delete").main;
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
                        job.results({output_mode: "rows"}, function(err, results) {
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
                        job.results({output_mode: "json_cols"}, function(err, results) {
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
    var splunkjs    = require('../index');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var options = require('../examples/node/cmdline');    
    var parser  = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }    
    
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password
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

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
        service.apps().fetch(function(err, apps) {
            if (err) {
                console.log("There was an error retrieving the list of applications:", err);
                done(err);
                return;
            }
            
            var appList = apps.list();
            console.log("Applications:");
            for(var i = 0; i < appList.length; i++) {
                var app = appList[i];
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
                
                service.apps().fetch(done);
            },
            // Print them out
            function(apps, done) {           
                var appList = apps.list();
                console.log("Applications:");
                for(var i = 0; i < appList.length; i++) {
                    var app = appList[i];
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

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
        service.savedSearches().fetch(function(err, searches) {
            if (err) {
                console.log("There was an error retrieving the list of saved searches:", err);
                done(err);
                return;
            }
            
            var searchList = searches.list();
            console.log("Saved searches:");
            for(var i = 0; i < searchList.length; i++) {
                var search = searchList[i];
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
                
                service.savedSearches().fetch(done);
            },
            // Print them out
            function(searches, done) {
                var searchList = searches.list();
                console.log("Saved searches:");
                for(var i = 0; i < searchList.length; i++) {
                    var search = searchList[i];
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

require.define("/examples/node/helloworld/savedsearches_delete.js", function (require, module, exports, __dirname, __filename) {

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

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
        
        var name = "My Awesome Saved Search";
        
        // Now that we're logged in, Let's create a saved search
        service.savedSearches().fetch(function(err, savedSearches) {
            if (err) {
                console.log("There was an error in fetching the saved searches");
                done(err);
                return;
            } 
            
            var savedSearchToDelete = savedSearches.item(name);
            if (!savedSearchToDelete) {
                console.log("Can't delete '" + name + "' because it doesn't exist!");
                done();
            }
            else {                
                savedSearchToDelete.remove();
                console.log("Deleted saved search: " + name + "");
                done();
            }
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/savedsearches_create.js", function (require, module, exports, __dirname, __filename) {

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

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
        
        var savedSearchOptions = {
            name: "My Awesome Saved Search",
            search: "index=_internal error sourcetype=splunkd* | head 10"
        };
        
        // Now that we're logged in, Let's create a saved search
        service.savedSearches().create(savedSearchOptions, function(err, savedSearch) {
            if (err && err.status === 409) {
                console.error("ERROR: A saved search with the name '" + savedSearchOptions.name + "' already exists");
                done();
                return;
            }
            else if (err) {
                console.error("There was an error creating the saved search:", err);
                done(err);
                return;
            }
            
            console.log("Created saved search: " + savedSearch.name);            
            done();
        });
    });
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
                            job.fetch(function(err) {
                                console.log("-- fetching, " + (job.properties().eventCount || 0) + " events so far");
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
                job.fetch(done);
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    
    var service = new splunkjs.Service({
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
                                    return;
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
    var splunkjs        = require('../../index');
    var Class           = splunkjs.Class;
    var utils           = splunkjs.Utils;
    var Async           = splunkjs.Async;
    var options         = require('./cmdline');

    var FLAGS_CREATE = [
        "search", "earliest_time", "latest_time", "now", "time_format",
        "exec_mode", "search_mode", "rt_blocking", "rt_queue_size",
        "rt_maxblocksecs", "rt_indexfilter", "id", "status_buckets",
        "max_count", "max_time", "timeout", "auto_finalize_ec", "enable_lookups",
        "reload_macros", "reduce_freq", "spawn_process", "required_field_list",
        "rf", "auto_cancel", "auto_pause"
    ];
    var FLAGS_EVENTS = [
        "offset", "count", "earliest_time", "latest_time", "search",
        "time_format", "output_time_format", "field_list", "f", "max_lines",
        "truncation_mode", "output_mode", "segmentation"
    ];
    var FLAGS_RESULTS = [
        "offset", "count", "search", "field_list", "f", "output_mode"
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
            // If it is, we wrap it up in a splunkjs.Job object, and invoke
            // our function on it.
            var jobsList = [];
            this.service.jobs().fetch(function(err, jobs) {
                var list = jobs.list() || [];
                for(var i = 0; i < list.length; i++) {
                    if (utils.contains(sids, list[i].sid)) {
                        var job = list[i];
                        jobsList.push(job);
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
                    
                    var output_mode = options.output_mode || "rows";
                    if (output_mode === "json_rows") {
                        printRows(data);
                    }
                    else if (output_mode === "json_cols") {
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
                jobs.fetch(function(err, jobs) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    
                    var list = jobs.list() || [];
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
                    job.fetch(function(err, job) {
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

                    var output_mode = options.output_mode || "rows";
                    if (output_mode === "json_rows") {
                        printRows(data);
                    }
                    else if (output_mode === "json_cols") {
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
                    
                    var output_mode = options.output_mode || "rows";
                    if (output_mode === "json_rows") {
                        printRows(data);
                    }
                    else if (output_mode === "json_cols") {
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
            var svc = new splunkjs.Service({ 
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
    var splunkjs        = require('../../index');
    var Class           = splunkjs.Class;
    var utils           = splunkjs.Utils;
    var Async           = splunkjs.Async;
    var options         = require('./cmdline');
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
        return new splunkjs.Service({
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
                            job.fetch(function(err, job) {
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
        splunkjs.Logger.setLevel("NONE");
        
        callback = callback || function(err) { 
            if (err) {
                console.log(err);
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
    var splunkjs        = require('../../index');
    var Class           = splunkjs.Class;
    var utils           = splunkjs.Utils;
    var Async           = splunkjs.Async;
    var options         = require('./cmdline');
    
    var createService = function(options) {
        return new splunkjs.Service({
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
        splunkjs.Logger.setLevel("NONE");
        
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
    Utils    : require('../../tests/test_utils'),
    Async    : require('../../tests/test_async'),
    Http     : require('../../tests/test_http'),
    Context  : require('../../tests/test_context'),
    Service  : require('../../tests/test_service'),
    Storm    : require('../../tests/test_storm'),
    Searcher : require('../../tests/test_searcher'),
    Examples : require('../../tests/test_examples')
};
});
require("/browser.test.entry.js");


})();