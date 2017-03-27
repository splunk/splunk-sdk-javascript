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
        },

        "keyOf works": function(test) {
            test.ok(splunkjs.Utils.keyOf(3, {a: 3, b: 5}));
            test.ok(!splunkjs.Utils.keyOf(3, {a: 12, b: 6}));
            test.done();
        },

        "bind": function(test) {
            var f;
            (function() { 
                f = function(a) { 
                    this.a = a; 
                };
            })();
            var q = {};
            var g = splunkjs.Utils.bind(q, f);
            g(12);
            test.strictEqual(q.a, 12);
            test.done();
        },
        
        "trim": function(test) {
            test.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");

            var realTrim = String.prototype.trim;
            String.prototype.trim = null;
            test.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");
            String.prototype.trim = realTrim;

            test.done();
        },

        "indexOf": function(test) {
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,5], 3), 2);
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,3], 3), 2);
            test.strictEqual(splunkjs.Utils.indexOf([1,2,3,4,5], 12), -1);
            test.done();
        },

        "contains": function(test) {
            test.ok(splunkjs.Utils.contains([1,2,3,4,5], 3));
            test.ok(splunkjs.Utils.contains([1,2,3,4,3], 3));
            test.ok(!splunkjs.Utils.contains([1,2,3,4,5], 12));
            test.done();
        },

        "startsWith": function(test) {
            test.ok(splunkjs.Utils.startsWith("abcdefg", "abc"));
            test.ok(!splunkjs.Utils.startsWith("bcdefg", "abc"));
            test.done();
        },

        "endsWith": function(test) {
            test.ok(splunkjs.Utils.endsWith("abcdef", "def"));
            test.ok(!splunkjs.Utils.endsWith("abcdef", "bcd"));
            test.done();
        },

        "toArray": function(test) {
            (function() {
                var found = splunkjs.Utils.toArray(arguments);
                var expected = [1,2,3,4,5];
                for (var i = 0; i < found.length; i++) {
                    test.strictEqual(found[i], expected[i]);
                }
            })(1,2,3,4,5);
            test.done();
        },

        "isArray": function(test) {
            var a = [1,2,3,4,5];
            test.ok(splunkjs.Utils.isArray(a));
            test.done();
        },

        "isFunction": function(test) {
            test.ok(splunkjs.Utils.isFunction(function() {}));
            test.ok(!splunkjs.Utils.isFunction(3));
            test.ok(!splunkjs.Utils.isFunction("abc"));
            test.ok(!splunkjs.Utils.isFunction({}));
            test.done();
        },

        "isNumber": function(test) {
            test.ok(splunkjs.Utils.isNumber(3));
            test.ok(splunkjs.Utils.isNumber(-2.55113e12));
            test.ok(!splunkjs.Utils.isNumber("3"));
            test.ok(!splunkjs.Utils.isNumber({3: 5}));
            test.done();
        },

        "isObject": function(test) {
            test.ok(splunkjs.Utils.isObject({}));
            test.ok(!splunkjs.Utils.isObject(3));
            test.ok(!splunkjs.Utils.isObject("3"));
            test.done();
        },

        "isEmpty": function(test) {
            test.ok(splunkjs.Utils.isEmpty({}));
            test.ok(splunkjs.Utils.isEmpty([]));
            test.ok(splunkjs.Utils.isEmpty(""));
            test.ok(!splunkjs.Utils.isEmpty({a: 3}));
            test.ok(!splunkjs.Utils.isEmpty([1,2]));
            test.ok(!splunkjs.Utils.isEmpty("abc"));
            test.done();
        },

        "forEach": function(test) {
            var a = [1,2,3,4,5];
            splunkjs.Utils.forEach(
                a,
                function(elem, index, list) {
                    test.strictEqual(a[index], elem);
                }
            );
            var b = {1: 2, 2: 4, 3: 6};
            splunkjs.Utils.forEach(
                b,
                function(elem, key, obj) {
                    test.strictEqual(b[key], elem);
                }
            );
            splunkjs.Utils.forEach(null, function(elem, key, obj) {});
            var c = {length: 5, 1: 12, 2: 15, 3: 8};
            splunkjs.Utils.forEach(
                c,
                function(elem, key, obj) {
                    test.strictEqual(c[key], elem);
                }
            );
            test.done();
        },

        "extend": function(test) {
            var found = splunkjs.Utils.extend({}, {a: 1, b: 2}, {c: 3, b: 4});
            var expected = {a: 1, b: 4, c:3};
            for (var k in found) {
                if (found.hasOwnProperty(k)) {
                    test.strictEqual(found[k], expected[k]);
                }
            }
            test.done();
        },

        "clone": function(test) {
            var a = {a: 1, b: 2, c: {p: 5, q: 6}};
            var b = splunkjs.Utils.clone(a);
            splunkjs.Utils.forEach(a, function(val, key, obj) { test.strictEqual(val, b[key]); });
            a.a = 5;
            test.strictEqual(b.a, 1);
            a.c.p = 4;
            test.strictEqual(b.c.p, 4);
            test.done();
            test.strictEqual(splunkjs.Utils.clone(3), 3);
            test.strictEqual(splunkjs.Utils.clone("asdf"), "asdf");
            var p = [1,2,[3,4],3];
            var q = splunkjs.Utils.clone(p);
            splunkjs.Utils.forEach(p, function(val, index, arr) { test.strictEqual(p[index], q[index]); });
            p[0] = 3;
            test.strictEqual(q[0], 1);
            p[2][0] = 7;
            test.strictEqual(q[2][0], 7);
        },

        "namespaceFromProperties": function(test) {
            var a = splunkjs.Utils.namespaceFromProperties(
                {acl: {owner: "boris",
                       app: "factory",
                       sharing: "system",
                       other: 3},
                 more: 12}
            );
            splunkjs.Utils.forEach(
                a,
                function(val, key, obj) {
                    test.ok((key === "owner" && val === "boris") ||
                            (key === "app" && val === "factory") ||
                            (key === "sharing" && val === "system"));
                }
            );
            test.done();
            
        },

        "namespaceFromProperties - bad data": function(test) {
            var undefinedProps;
            var a = splunkjs.Utils.namespaceFromProperties(undefinedProps);
            test.strictEqual(a.owner, '');
            test.strictEqual(a.app, '');
            test.strictEqual(a.sharing, '');

            var undefinedAcl = {};
            var b = splunkjs.Utils.namespaceFromProperties(undefinedProps);
            test.strictEqual(b.owner, '');
            test.strictEqual(b.app, '');
            test.strictEqual(b.sharing, '');
            test.done();
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

        "Whilst sans condition is never": function(test) {
            var i = false;
            Async.whilst(
                undefined, 
                function(done) { i = true; done();},
                function(err) {
                    test.strictEqual(i, false);
                    test.done();
                }
            );
        },

        "Whilst with empty body does nothing": function(test) {
            var i = true;
            Async.whilst(
                function() { 
                    if (i) {
                        i = false;
                        return true;
                    } 
                    else {
                        return i;
                    }
                },
                undefined,
                function (err) {
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

        "Parallel success - outside of arrays": function(test) {
            Async.parallel(
              function(done) { done(null, 1);},
              function(done) { done(null, 2, 3); },
              function(err, one, two) {
                test.ok(!err);
                test.strictEqual(one, 1);
                test.strictEqual(two[0], 2);
                test.strictEqual(two[1], 3);
                test.done();
              });
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

        "Series success - outside of array": function(test) {
            Async.series(
                function(done) {
                    done(null, 1);
                },
                function(done) {
                    done(null, 2, 3);
                },
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
                var req = this.http.get("https://httpbin.org/get", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                req.abort();
            },
            
            "Callback#abort delay": function(test) {
                var req = this.http.get("https://httpbin.org/delay/20", {}, {}, 0, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                splunkjs.Async.sleep(1000, function() {
                    req.abort();
                });
            },
            
            "Callback#no args": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },

            "Callback#success success+error": function(test) {
                this.http.get("http://httpbin.org/get", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.get("http://httpbin.org/status/404", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 404);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.get("http://httpbin.org/get", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.data.args;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.same(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },

            "Callback#args with objects": function(test) {
                this.http.get(
                    "http://httpbin.org/get", [],
                    {a: 1, b: {c: "ab", d: 12}}, 0,
                    function(err, res) {
                        var args = res.data.args;
                        test.strictEqual(args.a, "1");
                        test.same(args.b, ["ab", "12"]);
                        test.strictEqual(
                            res.data.url,
                            "http://httpbin.org/get?a=1&b=ab&b=12"
                        );
                        test.done();
                    }
                );
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://httpbin.org/get", {"X-Test1": 1, "X-Test2": "a/b/c"}, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    
                    test.strictEqual(res.data.url, "http://httpbin.org/get");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.get("http://httpbin.org/get", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
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
                    test.same(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/get?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
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
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },   
            
            "Callback#success success+error": function(test) {
                this.http.post("http://httpbin.org/post", {}, {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.post("http://httpbin.org/status/405", {}, {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.post("http://httpbin.org/post", {}, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var args = res.data.form;
                    test.strictEqual(args.a, "1");
                    test.strictEqual(args.b, "2");
                    test.deepEqual(args.c, ["1", "2", "3"]);
                    test.strictEqual(args.d, "a/b");
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.post("http://httpbin.org/post", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
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
                    test.strictEqual(res.data.url, "http://httpbin.org/post");
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
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },        

            "Callback#success success+error": function(test) {
                this.http.del("http://httpbin.org/delete", [], {}, 0, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#error all": function(test) {
                this.http.del("http://httpbin.org/status/405", [], {}, 0, function(err, res) {
                    test.strictEqual(err.status, 405);
                    test.done();
                });
            },
            
            "Callback#args": function(test) {
                this.http.del("http://httpbin.org/delete", [], { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    test.strictEqual(res.data.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },
            
            "Callback#headers": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, {}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/delete");
                    test.done();
                });
            },
            
            "Callback#all": function(test) {
                var headers = { "X-Test1": 1, "X-Test2": "a/b/c" };

                this.http.del("http://httpbin.org/delete", { "X-Test1": 1, "X-Test2": "a/b/c" }, { a: 1, b: 2, c: [1,2,3], d: "a/b"}, 0, function(err, res) {
                    var returnedHeaders = res.data.headers;
                    for(var headerName in headers) {
                        if (headers.hasOwnProperty(headerName)) {
                            // We have to make the header values into strings
                            test.strictEqual(headers[headerName] + "", returnedHeaders[headerName]);
                        }
                    }
                    test.strictEqual(res.data.url, "http://httpbin.org/delete?a=1&b=2&c=1&c=2&c=3&d=a%2Fb");
                    test.done();
                });
            },

            "Default arguments to Http work": function(test) {
                var NodeHttp = splunkjs.NodeHttp;
                var h = new NodeHttp();
                test.ok(h);
                test.done();
            },

            "Methods of Http base class that must be overrided": function(test) {
                var h = new splunkjs.Http();
                test.throws(function() { h.makeRequest("asdf", null, null); });
                test.throws(function() { h.parseJson("{}"); });
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var NodeHttp    = splunkjs.NodeHttp;
    var test        = require('../contrib/nodeunit/test_reporter');

    var http = new NodeHttp();
    
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
    var tutils      = require('./utils');
    var Async       = splunkjs.Async;
    var utils       = splunkjs.Utils;

    splunkjs.Logger.setLevel("ALL");
    var isBrowser = typeof window !== "undefined";

    var suite = {
        "General Context Test": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Service exists": function(test) {
                test.ok(this.service);
                test.done();
            },

            "Create test search": function(test) {
                // The search created here is used by several of the following tests, specifically those using get()
                var searchID = "DELETEME_JSSDK_UNITTEST";
                this.service.post("search/jobs", {search: "search index=_internal | head 1", exec_mode: "blocking", id: searchID}, function(err, res) {
                    test.ok(res.data.sid);
                    test.done();
                });
            },

            "Callback#login": function(test) {
                var newService = new splunkjs.Service(svc.http, {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
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
                    password: svc.password + "wrong_password",
                    version: svc.version
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
                this.service.get("search/jobs", {count: 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);
                    test.done();
                });
            },

            "Callback#get autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },


            "Callback#get autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#get relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(!err);
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);
                    test.done();
                });
            },

            "Callback#get relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.get("search/jobs", {count: 1}, function(err, res) {
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                service.del("search/jobs/NO_SUCH_SID", {}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request get": function(test) {
                var get = {count: 1};
                var post = null;
                var body = null;
                this.service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
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
                this.service.request("search/jobs", "POST", null, null, body, headers, function(err, res) {
                    var sid = res.data.sid;
                    test.ok(sid);

                    var endpoint = "search/jobs/" + sid + "/control";
                    service.post(endpoint, {action: "cancel"}, function(err, res) {
                        test.done();
                    });
                });
            },

            "Callback#request error": function(test) {
                this.service.request("search/jobs/1234_nosuchjob", "GET", null, null, null, {"X-TestHeader": 1}, function(res) {
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
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);

                    if (res.response.request) {
                        test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    }

                    test.done();
                });
            },

            "Callback#request autologin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request autologin - disabled": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        autologin: false,
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#request relogin - success": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.strictEqual(res.data.paging.offset, 0);
                    test.ok(res.data.entry.length <= res.data.paging.total);
                    test.strictEqual(res.data.entry.length, 1);
                    test.ok(res.data.entry[0].content.sid);

                    if (res.response.request) {
                        test.strictEqual(res.response.request.headers["X-TestHeader"], 1);
                    }

                    test.done();
                });
            },

            "Callback#request relogin - error": function(test) {
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password + "ABC",
                        sessionKey: "ABCDEF-not-real",
                        version: svc.version
                    }
                );

                var get = {count: 1};
                var post = null;
                var body = null;
                service.request("search/jobs", "GET", get, post, body, {"X-TestHeader": 1}, function(err, res) {
                    test.ok(err);
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "Callback#abort": function(test) {
                var req = this.service.get("search/jobs", {count: 1}, function(err, res) {
                    test.ok(!res);
                    test.ok(err);
                    test.strictEqual(err.error, "abort");
                    test.strictEqual(err.status, "abort");
                    test.done();
                });

                req.abort();
            },

            "Callback#timeout default test": function(test){
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version
                    }
                );

                test.strictEqual(0, service.timeout);
                service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                    test.ok(res);
                    test.done();
                });
            },

            "Callback#timeout timed test": function(test){
                var service = new splunkjs.Service(
                    {
                        scheme: this.service.scheme,
                        host: this.service.host,
                        port: this.service.port,
                        username: this.service.username,
                        password: this.service.password,
                        version: svc.version,
                        timeout: 10000
                    }
                );

                test.strictEqual(service.timeout, 10000);
                service.request("search/jobs", "GET", {count:1}, null, null, {"X-TestHeader":1}, function(err, res){
                    test.ok(res);
                    test.done();
                });
            },

            // This test is not stable, commenting it out until we figure it out
            // "Callback#timeout fail -- FAILS INTERMITTENTLY": function(test){
            //     var service = new splunkjs.Service(
            //         {
            //             scheme: this.service.scheme,
            //             host: this.service.host,
            //             port: this.service.port,
            //             username: this.service.username,
            //             password: this.service.password,
            //             version: svc.version,
            //             timeout: 3000
            //         }
            //     );

            //     // Having a timeout of 3 seconds, a max_time of 5 seconds with a blocking mode and searching realtime should involve a timeout error.
            //     service.get("search/jobs/export", {search:"search index=_internal", timeout:2, max_time:5, search_mode:"realtime", exec_mode:"blocking"}, function(err, res){
            //         test.ok(err);
            //         // Prevent test suite from erroring out if `err` is null, just fail the test
            //         if (err) {
            //             test.strictEqual(err.status, 600);
            //         }
            //         test.done();
            //     });
            // },

            "Cancel test search": function(test) {
                // Here, the search created for several of the previous tests is terminated, it is no longer necessary
                var endpoint = "search/jobs/DELETEME_JSSDK_UNITTEST/control";
                this.service.post(endpoint, {action: "cancel"}, function(err, res) {
                    test.done();
                });
            },

            "fullpath gets its owner/app from the right places": function(test) {
                var http = tutils.DummyHttp;
                var ctx = new splunkjs.Context(http, { /*nothing*/ });

                // Absolute paths are unchanged
                test.strictEqual(ctx.fullpath("/a/b/c"), "/a/b/c");
                // Fall through to /services if there is no app
                test.strictEqual(ctx.fullpath("meep"), "/services/meep");
                // Are username and app set properly?
                var ctx2 = new splunkjs.Context(http, {owner: "alpha", app: "beta"});
                test.strictEqual(ctx2.fullpath("meep"), "/servicesNS/alpha/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {owner: "boris"}), "/servicesNS/boris/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {app: "factory"}), "/servicesNS/alpha/factory/meep");
                test.strictEqual(ctx2.fullpath("meep", {owner: "boris", app: "factory"}), "/servicesNS/boris/factory/meep");
                // Sharing settings
                test.strictEqual(ctx2.fullpath("meep", {sharing: "app"}), "/servicesNS/nobody/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {sharing: "global"}), "/servicesNS/nobody/beta/meep");
                test.strictEqual(ctx2.fullpath("meep", {sharing: "system"}), "/servicesNS/nobody/system/meep");
                // Do special characters get encoded?
                var ctx3 = new splunkjs.Context(http, {owner: "alpha@beta.com", app: "beta"});
                test.strictEqual(ctx3.fullpath("meep"), "/servicesNS/alpha%40beta.com/beta/meep");
                test.done();
            },

            "version check": function(test) {
                var http = tutils.DummyHttp;
                var ctx;

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.version === "4.0");

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("5.0") === -1);
                ctx = new splunkjs.Context(http, { "version": "4" });
                test.ok(ctx.versionCompare("5.0") === -1);
                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("5") === -1);
                ctx = new splunkjs.Context(http, { "version": "4.1" });
                test.ok(ctx.versionCompare("4.9") === -1);

                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("4.0") === 0);
                ctx = new splunkjs.Context(http, { "version": "4" });
                test.ok(ctx.versionCompare("4.0") === 0);
                ctx = new splunkjs.Context(http, { "version": "4.0" });
                test.ok(ctx.versionCompare("4") === 0);

                ctx = new splunkjs.Context(http, { "version": "5.0" });
                test.ok(ctx.versionCompare("4.0") === 1);
                ctx = new splunkjs.Context(http, { "version": "5.0" });
                test.ok(ctx.versionCompare("4") === 1);
                ctx = new splunkjs.Context(http, { "version": "5" });
                test.ok(ctx.versionCompare("4.0") === 1);
                ctx = new splunkjs.Context(http, { "version": "4.9" });
                test.ok(ctx.versionCompare("4.1") === 1);

                ctx = new splunkjs.Context(http, { /*nothing*/ });
                test.ok(ctx.versionCompare("5.0") === 0);

                test.done();
            }
        },
        "Cookie Tests": {
            setUp: function(done) {
                this.service = svc;
                this.skip = false;
                var that = this;
                svc.serverInfo(function(err, info) {
                    var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                    var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                    // Skip cookie tests if Splunk older than 6.2
                    if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping cookie tests...");
                    }
                    done();
                });
            },

            tearDown: function(done) {
                this.service.logout(done);
            },

            "_getCookieString works as expected": function(test){
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port
                });

                service.http._cookieStore = {
                    'cookie'  : 'format',
                    'another' : 'one'
                };

                var expectedCookieString = 'cookie=format; another=one; ';
                var cookieString = service.http._getCookieString();

                test.strictEqual(cookieString, expectedCookieString);
                test.done();
            },

            "login and store cookie": function(test){
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });

                // Check that there are no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));


                service.login(function(err, success) {
                    // Check that cookies were saved
                    test.ok(!utils.isEmpty(service.http._cookieStore));
                    test.notStrictEqual(service.http._getCookieString(), '');
                    test.done();
                });
            },

            "request with cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });
                    // Create another service to put valid cookie into, give no other authentication information
                var service2 = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Login to service to get a valid cookie
                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            test.ok(!utils.isEmpty(cookieStore));
                            // Add the cookies to a service with no other authentication information
                            service2.http._cookieStore = cookieStore;
                            // Make a request that requires authentication
                            service2.get("search/jobs", {count: 1}, done);
                        },
                        function (res, done) {
                            // Test that a response was returned
                            test.ok(res);
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "request fails with bad cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                // Create a service with no login information
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Put a bad cookie into the service
                service.http._cookieStore = { "bad" : "cookie" };

                // Try requesting something that requires authentication
                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if an error is returned
                    test.ok(err);
                    // Check that it is an unauthorized error
                    test.strictEqual(err.status, 401);
                    test.done();
                });
            },

            "autologin with cookie": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });

                // Test if service has no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if service now has a cookie
                    test.ok(service.http._cookieStore);
                    test.done();
                });
            },

            "login fails with no cookie and no sessionKey": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Test there is no authentication information
                test.ok(utils.isEmpty(service.http._cookieStore));
                test.strictEqual(service.sessionKey, '');
                test.ok(!service.username);
                test.ok(!service.password);

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if an error is returned
                    test.ok(err);
                    test.done();
                });
            },

            "login with multiple cookies": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    version: svc.version
                });
                    // Create another service to put valid cookie into, give no other authentication information
                var service2 = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host,
                    port: svc.port,
                    version: svc.version
                });

                // Login to service to get a valid cookie
                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            test.ok(!utils.isEmpty(cookieStore));

                            // Add a bad cookie to the cookieStore
                            cookieStore['bad'] = 'cookie';

                            // Add the cookies to a service with no other authenitcation information
                            service2.http._cookieStore = cookieStore;

                            // Make a request that requires authentication
                            service2.get("search/jobs", {count: 1}, done);
                        },
                        function (res, done) {
                            // Test that a response was returned
                            test.ok(res);
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "autologin with cookie and bad sessionKey": function(test) {
                if(this.skip){
                    test.done();
                    return;
                }
                var service = new splunkjs.Service(
                {
                    scheme: svc.scheme,
                    host: svc.host, port: svc.port,
                    username: svc.username,
                    password: svc.password,
                    sessionKey: 'ABC-BADKEY',
                    version: svc.version
                });

                // Test if service has no cookies
                test.ok(utils.isEmpty(service.http._cookieStore));

                service.get("search/jobs", {count: 1}, function(err, res) {
                    // Test if service now has a cookie
                    test.ok(service.http._cookieStore);
                    test.done();
                });
             }
        }
    };
    return suite;
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
        password: cmdline.opts.password,
        version: cmdline.opts.version
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

    root.pollUntil = function(obj, condition, iterations, callback) {
        callback = callback || function() {};
        
        var i = 0;
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
    
    // Minimal Http implementation that is designed to pass the tests
    // done by Context.init(), but nothing more.
    root.DummyHttp = {
        // Required by Context.init()
        _setSplunkVersion: function(version) {
            // nothing
        }
    };
})();
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
            if (fs.existsSync(defaultsPath)) {
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
            .option('--version <version>', "Which version to use", "4", false);
        
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

exports.setup = function(svc, loggedOutSvc) {
    var splunkjs    = require('../index');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');
    var path        = require("path");

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    var suite = {
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
                            try {
                                savedSearches_1.item(searchName);
                                test.ok(false);
                            }
                            catch(err) {
                                test.ok(err);
                            }

                            // Ensure that we can't get the item using wildcard namespaces.
                            try{
                                savedSearches_1.item(searchName, {owner:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

                            try{
                                savedSearches_1.item(searchName, {app:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

                            try{
                                savedSearches_1.item(searchName, {app:'-', owner:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

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
                    test.ok(!err);
                    test.ok(apps);
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
                var service = this.service;
                Async.chain([
                    function(done){
                        var app_name = path.join(process.env.SPLUNK_HOME, ('/etc/apps/sdk-app-collection/build/sleep_command.tar'));
                        // Fix path on Windows if $SPLUNK_HOME contains a space (ex: C:/Program%20Files/Splunk)
                        app_name = app_name.replace("%20", " ");
                        service.post("apps/appinstall", {update:1, name:app_name}, done);
                    },
                    function(done){
                        var sid = getNextId();
                        var options = {id: sid};
                        var jobs = service.jobs({app: "sdk-app-collection"});
                        var req = jobs.oneshotSearch('search index=_internal | head 1 | sleep 10', options, function(err, job) {
                            test.ok(err);
                            test.ok(!job);
                            test.strictEqual(err.error, "abort");
                            test.done();
                        });

                        Async.sleep(1000, function(){
                            req.abort();
                        });
                    }
                ],
                function(err){
                    test.ok(!err);
                    test.done();
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

            "Callback#job results iterator": function(test) {
                var that = this;

                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 10', {}, done);
                        },
                        function(job, done) {
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
                            var iterator = job.iterator("results", { pagesize: 4 });
                            var hasMore = true;
                            var numElements = 0;
                            var pageSizes = [];
                            Async.whilst(
                                function() { return hasMore; },
                                function(nextIteration) {
                                    iterator.next(function(err, results, _hasMore) {
                                        if (err) {
                                            nextIteration(err);
                                            return;
                                        }

                                        hasMore = _hasMore;
                                        if (hasMore) {
                                            pageSizes.push(results.rows.length);
                                        }
                                        nextIteration();
                                    });
                                },
                                function(err) {
                                    test.deepEqual(pageSizes, [4,4,2]);
                                    done(err);
                                }
                            );
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

                var service = this.service.specialize("nobody", "sdk-app-collection");

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

                var service = this.service.specialize("nobody", "sdk-app-collection");

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

                var service = this.service.specialize("nobody", "sdk-app-collection");

                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.track({}, {
                                ready: function(job) {
                                    done(null, job);
                                }
                            });
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
                            that.service.jobs().search('search index=_internal | head 1', {id: sid, exec_mode: "blocking"}, done);
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
                            // Let's sleep for 2 second so
                            // we let the server catch up
                            Async.sleep(2000, function() {
                                job.summary({}, done);
                            });
                        },
                        function(summary, job, done) {
                            test.ok(job);
                            test.ok(summary);
                            test.strictEqual(summary.event_count, 1);
                            test.strictEqual(summary.fields.foo.count, 1);
                            test.strictEqual(summary.fields.foo.distinct_count, 1);
                            test.ok(summary.fields.foo.is_exact, 1);
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

            "Callback#Create failure": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var jobs = this.service.jobs();
                test.throws(function() {jobs.create({search: originalSearch, name: name, exec_mode: "oneshot"}, function() {});});
                test.done();
            },

            "Callback#Create fails with no search string": function(test) {
                var jobs = this.service.jobs();
                jobs.create(
                    "", {},
                    function(err) {
                        test.ok(err);
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
                            var query = 'search index=history MUST_NOT_EXISTABCDEF';
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
                var namespace = {owner: "admin", app: "search"};
                var splunkVersion = 6.1; // Default to pre-6.2 version
                var originalLoggerLevel = "DEBUG";

                Async.chain([
                        function(done) {
                            // If running on Splunk 6.2+, first set the search logger level to DEBUG
                            Async.chain([
                                    function(done1) {
                                        that.service.serverInfo(done1);
                                    },
                                    function(info, done1) {
                                        splunkVersion = parseFloat(info.properties().version);
                                        if (splunkVersion < 6.2) {
                                            done(); // Exit the inner Async.chain
                                        }
                                        else {
                                            done1();
                                        }
                                    },
                                    function(done1) {
                                        that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
                                    },
                                    function(confs, done1) {
                                        try {
                                            confs.item("limits").fetch(done1);
                                        }
                                        catch(e) {
                                            done1(e);
                                        }
                                    },
                                    function(conf, done1) {
                                        var searchInfo = conf.item("search_info");
                                        // Save this so it can be restored later
                                        originalLoggerLevel = searchInfo.properties()["infocsv_log_level"];
                                        searchInfo.update({"infocsv_log_level": "DEBUG"}, done1);
                                    },
                                    function(conf, done1) {
                                        test.strictEqual("DEBUG", conf.properties()["infocsv_log_level"]);
                                        done1();
                                    }
                                ],
                                function(err) {
                                    test.ok(!err);
                                    done();
                                }
                            );
                        },
                        function(done) {
                            that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
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
                            test.ok(results.messages[1].text.indexOf('owner="admin"'));
                            test.ok(results.messages[1].text.indexOf('app="search"'));

                            done();
                        },
                        function(done) {
                            Async.chain([
                                    function(done1) {
                                        if (splunkVersion < 6.2) {
                                            done(); // Exit the inner Async.chain
                                        }
                                        else {
                                            done1();
                                        }
                                    },
                                    function(done1) {
                                        that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
                                    },
                                    function(confs, done1) {
                                        try {
                                            confs.item("limits").fetch(done1);
                                        }
                                        catch(e) {
                                            done1(e);
                                        }
                                    },
                                    function(conf, done1) {
                                        var searchInfo = conf.item("search_info");
                                        // Restore the logger level from before
                                        searchInfo.update({"infocsv_log_level": originalLoggerLevel}, done1);
                                    },
                                    function(conf, done1) {
                                        test.strictEqual(originalLoggerLevel, conf.properties()["infocsv_log_level"]);
                                        done1();
                                    }
                                ],
                                function(err) {
                                    test.ok(!err);
                                    done();
                                }
                            );
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
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                        function(done) {
                            that.service.search('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            test.strictEqual(job.namespace, namespace);
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

            "Callback#Wait until job done": function(test) {
                this.service.search('search index=_internal | head 1000', {}, function(err, job) {
                    test.ok(!err);

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function(job) {
                            test.ok(job);

                            numReadyEvents++;
                        },
                        progress: function(job) {
                            test.ok(job);

                            numProgressEvents++;
                        },
                        done: function(job) {
                            test.ok(job);

                            test.ok(numReadyEvents === 1);      // all done jobs must have become ready
                            test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            test.done();
                        },
                        failed: function(job) {
                            test.ok(job);

                            test.ok(false, "Job failed unexpectedly.");
                            test.done();
                        },
                        error: function(err) {
                            test.ok(err);

                            test.ok(false, "Error while tracking job.");
                            test.done();
                        }
                    });
                });
            },

            "Callback#Wait until job failed": function(test) {
                this.service.search('search index=_internal | head bogusarg', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function(job) {
                            test.ok(job);

                            numReadyEvents++;
                        },
                        progress: function(job) {
                            test.ok(job);

                            numProgressEvents++;
                        },
                        done: function(job) {
                            test.ok(job);

                            test.ok(false, "Job became done unexpectedly.");
                            test.done();
                        },
                        failed: function(job) {
                            test.ok(job);

                            test.ok(numReadyEvents === 1);      // even failed jobs become ready
                            test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            test.done();
                        },
                        error: function(err) {
                            test.ok(err);

                            test.ok(false, "Error while tracking job.");
                            test.done();
                        }
                    });
                });
            },

            "Callback#track() with default params and one function": function(test) {
                this.service.search('search index=_internal | head 1', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    job.track({}, function(job) {
                        test.ok(job);
                        test.done();
                    });
                });
            },

            "Callback#track() should stop polling if only the ready callback is specified": function(test) {
                this.service.search('search index=_internal | head 1', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    job.track({}, {
                        ready: function(job) {
                            test.ok(job);
                        },

                        _stoppedAfterReady: function(job) {
                            test.done();
                        }
                    });
                });
            },

            "Callback#track() a job that is not immediately ready": function(test) {
                /*jshint loopfunc:true */
                var numJobs = 20;
                var numJobsLeft = numJobs;
                var gotJobNotImmediatelyReady = false;
                for (var i = 0; i < numJobs; i++) {
                    this.service.search('search index=_internal | head 10000', {}, function(err, job) {
                        if (err) {
                            test.ok(!err);
                            test.done();
                            return;
                        }

                        job.track({}, {
                            _preready: function(job) {
                                gotJobNotImmediatelyReady = true;
                            },

                            ready: function(job) {
                                numJobsLeft--;

                                if (numJobsLeft === 0) {
                                    if (!gotJobNotImmediatelyReady) {
                                        splunkjs.Logger.error("", "WARNING: Couldn't test code path in track() where job wasn't ready immediately.");
                                    }
                                    test.done();
                                }
                            }
                        });
                    });
                }
            },

            "Callback#Service.getJob() works": function(test) {
                var that = this;
                var sidsMatch = false;
                this.service.search('search index=_internal | head 1', {}, function(err, job){
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }
                    var sid = job.sid;
                    return Async.chain([
                            function(done) {
                                that.service.getJob(sid, done);
                            },
                            function(innerJob, done) {
                                test.strictEqual(sid, innerJob.sid);
                                sidsMatch = sid === innerJob.sid;
                                done();
                            }
                        ],
                        function(err) {
                            test.ok(!err);
                            test.ok(sidsMatch);
                            test.done();
                        }
                    );
                });
            }
        },

        "Data Model tests": {
            setUp: function(done) {
                this.service = svc;
                this.dataModels = svc.dataModels();
                this.skip = false;
                var that = this;
                this.service.serverInfo(function(err, info) {
                    if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping data model tests...");
                    }
                    done(err);
                });
            },

            "Callback#DataModels - fetch a built-in data model": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            // Check for the 3 objects we expect
                            test.ok(dm.objectByName("Audit"));
                            test.ok(dm.objectByName("searches"));
                            test.ok(dm.objectByName("modify"));

                            // Check for an object that shouldn't exist
                            test.strictEqual(null, dm.objectByName(getNextId()));
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create & delete an empty data model": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var initialSize;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            initialSize = dataModels.list().length;
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Make sure we have 1 more data model than we started with
                            test.strictEqual(initialSize + 1, dataModels.list().length);
                            // Delete the data model we just created, by name.
                            dataModels.item(name).remove(done);
                        },
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Make sure we have as many data models as we started with
                            test.strictEqual(initialSize, dataModels.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with spaces in the name, which are swapped for -'s": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me- " + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name.replace(" ", "_"), dataModel.name);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 0 objects": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 0 objects before fetch
                            test.strictEqual(0, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 0 objects after fetch
                            test.strictEqual(0, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 1 search object": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var dataModels = this.service.dataModels();


                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_one_search.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 1 object before fetch
                            test.strictEqual(1, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 1 object after fetch
                            test.strictEqual(1, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 2 search objects": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 2 objects before fetch
                            test.strictEqual(2, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 2 objects after fetch
                            test.strictEqual(2, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - data model objects are created correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.ok(dataModel.hasObject("search1"));
                            test.ok(dataModel.hasObject("search2"));

                            var search1 = dataModel.objectByName("search1");
                            test.ok(search1);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 1", search1.displayName);

                            var search2 = dataModel.objectByName("search2");
                            test.ok(search2);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 2", search2.displayName);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - data model handles unicode characters": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_unicode_headers.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            test.strictEqual("·Ä©·öô‡Øµ", dataModel.displayName);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ", dataModel.description);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create data model with empty headers": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_empty_headers.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            test.strictEqual("", dataModel.displayName);
                            test.strictEqual("", dataModel.description);

                            // Make sure we're not getting a summary of the data model
                            test.strictEqual("0", dataModel.concise);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test acceleration settings": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.acceleration.enabled = true;
                            dataModel.acceleration.earliestTime = "-2mon";
                            dataModel.acceleration.cronSchedule = "5/* * * * *";

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual(true, dataModel.acceleration.enabled);
                            test.strictEqual("-2mon", dataModel.acceleration.earliestTime);
                            test.strictEqual("5/* * * * *", dataModel.acceleration.cronSchedule);

                            dataModel.acceleration.enabled = false;
                            dataModel.acceleration.earliestTime = "-1mon";
                            dataModel.acceleration.cronSchedule = "* * * * *";

                            test.strictEqual(false, dataModel.isAccelerated());
                            test.strictEqual(false, dataModel.acceleration.enabled);
                            test.strictEqual("-1mon", dataModel.acceleration.earliestTime);
                            test.strictEqual("* * * * *", dataModel.acceleration.cronSchedule);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object metadata": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            test.strictEqual("event1 ·Ä©·öô", obj.displayName);
                            test.strictEqual("event1", obj.name);
                            test.same(dataModel, obj.dataModel);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object parent": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            test.ok(obj);
                            test.ok(!obj.parent());

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object lineage": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_0");
                            test.ok(obj);
                            test.strictEqual(1, obj.lineage.length);
                            test.strictEqual("level_0", obj.lineage[0]);
                            test.strictEqual("BaseEvent", obj.parentName);

                            obj = dataModel.objectByName("level_1");
                            test.ok(obj);
                            test.strictEqual(2, obj.lineage.length);
                            test.same(["level_0", "level_1"], obj.lineage);
                            test.strictEqual("level_0", obj.parentName);

                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            test.strictEqual(3, obj.lineage.length);
                            test.same(["level_0", "level_1", "level_2"], obj.lineage);
                            test.strictEqual("level_1", obj.parentName);

                            // Make sure there's no extra children
                            test.ok(!dataModel.objectByName("level_3"));

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object fields": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_2");
                            test.ok(obj);

                            var timeField = obj.fieldByName("_time");
                            test.ok(timeField);
                            test.strictEqual("timestamp", timeField.type);
                            test.ok(timeField.isTimestamp());
                            test.ok(!timeField.isNumber());
                            test.ok(!timeField.isString());
                            test.ok(!timeField.isObjectcount());
                            test.ok(!timeField.isChildcount());
                            test.ok(!timeField.isIPv4());
                            test.same(["BaseEvent"], timeField.lineage);
                            test.strictEqual("_time", timeField.name);
                            test.strictEqual(false, timeField.required);
                            test.strictEqual(false, timeField.multivalued);
                            test.strictEqual(false, timeField.hidden);
                            test.strictEqual(false, timeField.editable);
                            test.strictEqual(null, timeField.comment);

                            var lvl2 = obj.fieldByName("level_2");
                            test.strictEqual("level_2", lvl2.owner);
                            test.same(["level_0", "level_1", "level_2"], lvl2.lineage);
                            test.strictEqual("objectCount", lvl2.type);
                            test.ok(!lvl2.isTimestamp());
                            test.ok(!lvl2.isNumber());
                            test.ok(!lvl2.isString());
                            test.ok(lvl2.isObjectcount());
                            test.ok(!lvl2.isChildcount());
                            test.ok(!lvl2.isIPv4());
                            test.strictEqual("level_2", lvl2.name);
                            test.strictEqual("level 2", lvl2.displayName);
                            test.strictEqual(false, lvl2.required);
                            test.strictEqual(false, lvl2.multivalued);
                            test.strictEqual(false, lvl2.hidden);
                            test.strictEqual(false, lvl2.editable);
                            test.strictEqual(null, lvl2.comment);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object properties": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);
                            test.strictEqual(5, obj.fieldNames().length);
                            test.strictEqual(10, obj.allFieldNames().length);
                            test.ok(obj.fieldByName("has_boris"));
                            test.ok(obj.hasField("has_boris"));
                            test.ok(obj.fieldByName("_time"));
                            test.ok(obj.hasField("_time"));

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create local acceleration job": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);

                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            test.ok(job);

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
                            test.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create local acceleration job with earliest time": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var oldNow = Date.now();
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            obj.createLocalAccelerationJob("-1d", done);
                        },
                        function(job, done) {
                            test.ok(job);
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
                            test.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);

                            // Make sure the earliest time is 1 day behind
                            var yesterday = new Date(Date.now() - (1000 * 60 * 60 * 24));
                            var month = (yesterday.getMonth() + 1);
                            if (month <= 9) {
                                month = "0" + month;
                            }
                            var date = yesterday.getDate();
                            if (date <= 9) {
                                date = "0" + date;
                            }
                            var expectedDate = yesterday.getFullYear() + "-" + month + "-" + date;
                            test.ok(utils.startsWith(job._state.content.earliestTime, expectedDate));

                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model constraints": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);
                            var constraints = obj.constraints;
                            test.ok(constraints);
                            var onlyOne = true;

                            for (var i = 0; i < constraints.length; i++) {
                                var constraint = constraints[i];
                                test.ok(!!onlyOne);

                                test.strictEqual("event1", constraint.owner);
                                test.strictEqual("uri=\"*.php\" OR uri=\"*.py\"\nNOT (referer=null OR referer=\"-\")", constraint.query);
                            }

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model calculations, and the different types": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            var calculations = obj.calculations;
                            test.strictEqual(4, Object.keys(calculations).length);
                            test.strictEqual(4, obj.calculationIDs().length);

                            var evalCalculation = calculations["93fzsv03wa7"];
                            test.ok(evalCalculation);
                            test.strictEqual("event1", evalCalculation.owner);
                            test.same(["event1"], evalCalculation.lineage);
                            test.strictEqual("Eval", evalCalculation.type);
                            test.ok(evalCalculation.isEval());
                            test.ok(!evalCalculation.isLookup());
                            test.ok(!evalCalculation.isGeoIP());
                            test.ok(!evalCalculation.isRex());
                            test.strictEqual(null, evalCalculation.comment);
                            test.strictEqual(true, evalCalculation.isEditable());
                            test.strictEqual("if(cidrmatch(\"192.0.0.0/16\", clientip), \"local\", \"other\")", evalCalculation.expression);

                            test.strictEqual(1, Object.keys(evalCalculation.outputFields).length);
                            test.strictEqual(1, evalCalculation.outputFieldNames().length);

                            var field = evalCalculation.outputFields["new_field"];
                            test.ok(field);
                            test.strictEqual("My New Field", field.displayName);

                            var lookupCalculation = calculations["sr3mc8o3mjr"];
                            test.ok(lookupCalculation);
                            test.strictEqual("event1", lookupCalculation.owner);
                            test.same(["event1"], lookupCalculation.lineage);
                            test.strictEqual("Lookup", lookupCalculation.type);
                            test.ok(lookupCalculation.isLookup());
                            test.ok(!lookupCalculation.isEval());
                            test.ok(!lookupCalculation.isGeoIP());
                            test.ok(!lookupCalculation.isRex());
                            test.strictEqual(null, lookupCalculation.comment);
                            test.strictEqual(true, lookupCalculation.isEditable());
                            test.same({lookupField: "a_lookup_field", inputField: "host"}, lookupCalculation.inputFieldMappings);
                            test.strictEqual(2, Object.keys(lookupCalculation.inputFieldMappings).length);
                            test.strictEqual("a_lookup_field", lookupCalculation.inputFieldMappings.lookupField);
                            test.strictEqual("host", lookupCalculation.inputFieldMappings.inputField);
                            test.strictEqual("dnslookup", lookupCalculation.lookupName);

                            var regexpCalculation = calculations["a5v1k82ymic"];
                            test.ok(regexpCalculation);
                            test.strictEqual("event1", regexpCalculation.owner);
                            test.same(["event1"], regexpCalculation.lineage);
                            test.strictEqual("Rex", regexpCalculation.type);
                            test.ok(regexpCalculation.isRex());
                            test.ok(!regexpCalculation.isLookup());
                            test.ok(!regexpCalculation.isEval());
                            test.ok(!regexpCalculation.isGeoIP());
                            test.strictEqual(2, regexpCalculation.outputFieldNames().length);
                            test.strictEqual("_raw", regexpCalculation.inputField);
                            test.strictEqual(" From: (?<from>.*) To: (?<to>.*) ", regexpCalculation.expression);

                            var geoIPCalculation = calculations["pbe9bd0rp4"];
                            test.ok(geoIPCalculation);
                            test.strictEqual("event1", geoIPCalculation.owner);
                            test.same(["event1"], geoIPCalculation.lineage);
                            test.strictEqual("GeoIP", geoIPCalculation.type);
                            test.ok(geoIPCalculation.isGeoIP());
                            test.ok(!geoIPCalculation.isLookup());
                            test.ok(!geoIPCalculation.isEval());
                            test.ok(!geoIPCalculation.isRex());
                            test.strictEqual("·Ä©·öô‡Øµ comment of pbe9bd0rp4", geoIPCalculation.comment);
                            test.strictEqual(5, geoIPCalculation.outputFieldNames().length);
                            test.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - run queries": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            obj = dm.objectByName("searches");
                            obj.startSearch({}, "", done);
                        },
                        function(job, done) {
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
                            test.strictEqual("| datamodel internal_audit_logs searches search", job.properties().request.search);
                            job.cancel(done);
                        },
                        function(response, done) {
                            obj.startSearch({status_buckets: 5, enable_lookups: false}, "| head 3", done);
                        },
                        function(job, done) {
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
                            test.strictEqual("| datamodel internal_audit_logs searches search | head 3", job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - baseSearch is parsed correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("search1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseSearch", obj.parentName);
                            test.ok(obj.isBaseSearch());
                            test.ok(!obj.isBaseTransaction());
                            test.strictEqual("search index=_internal | head 10", obj.baseSearch);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - baseTransaction is parsed correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("transaction1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseTransaction", obj.parentName);
                            test.ok(obj.isBaseTransaction());
                            test.ok(!obj.isBaseSearch());
                            test.same(["event1"], obj.objectsToGroup);
                            test.same(["host", "from"], obj.groupByFields);
                            test.strictEqual("25s", obj.maxPause);
                            test.strictEqual("100m", obj.maxSpan);

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

        "Pivot tests": {
            setUp: function(done) {
                this.service = svc;
                this.dataModels = svc.dataModels({owner: "nobody", app: "search"});
                this.skip = false;
                var that = this;
                this.service.serverInfo(function(err, info) {
                    if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping pivot tests...");
                    }
                    done(err);
                });
            },

            "Callback#Pivot - test constructor args": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.ok(dataModel.objectByName("test_data"));
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test acceleration, then pivot": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.objectByName("test_data");
                            test.ok(dataModel);

                            dataModel.acceleration.enabled = true;
                            dataModel.acceleration.earliestTime = "-2mon";
                            dataModel.acceleration.cronSchedule = "0 */12 * * *";
                            dataModel.update(done);
                        },
                        function(dataModel, done) {
                            var props = dataModel.properties();

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual(true, !!dataModel.acceleration.enabled);
                            test.strictEqual("-2mon", dataModel.acceleration.earliest_time);
                            test.strictEqual("0 */12 * * *", dataModel.acceleration.cron_schedule);

                            var dataModelObject = dataModel.objectByName("test_data");
                            var pivotSpecification = dataModelObject.createPivotSpecification();

                            test.strictEqual(dataModelObject.dataModel.name, pivotSpecification.accelerationNamespace);

                            var name1 = "delete-me-" + getNextId();
                            pivotSpecification.setAccelerationJob(name1);
                            test.strictEqual("sid=" + name1, pivotSpecification.accelerationNamespace);

                            var namespaceTemp = "delete-me-" + getNextId();
                            pivotSpecification.accelerationNamespace = namespaceTemp;
                            test.strictEqual(namespaceTemp, pivotSpecification.accelerationNamespace);

                            pivotSpecification
                                .addCellValue("test_data", "Source Value", "count")
                                .run(done);
                        },
                        function(job, pivot, done) {
                            test.ok(job);
                            test.ok(pivot);
                            test.notStrictEqual("FAILED", job.properties().dispatchState);

                            job.track({}, function(job) {
                                test.ok(pivot.tstatsSearch);
                                test.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                                test.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                                test.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                                test.strictEqual(pivot.tstatsSearch, job.properties().request.search);
                                done(null, job);
                            });
                        },
                        function(job, done) {
                            test.ok(job);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test illegal filtering (all types)": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Boolean comparisons
                            try {
                                pivotSpecification.addFilter(getNextId(), "boolean", "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addFilter("_time", "boolean", "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add boolean filter on _time because it is of type timestamp");
                            }

                            // String comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "string", "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add string filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "string", "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // IPv4 comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "ipv4", "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add ipv4 filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "ipv4", "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Number comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "number", "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add number filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "number", "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Limit filter
                            try {
                                pivotSpecification.addLimitFilter("has_boris", "host", "DEFAULT", 50, "count");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addLimitFilter(getNextId(), "host", "DEFAULT", 50, "count");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addLimitFilter("source", "host", "DEFAULT", 50, "sum");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found sum");
                            }
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "DEFAULT", 50, "duration");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found duration");
                            }
                            try {
                                pivotSpecification.addLimitFilter("test_data", "host", "DEFAULT", 50, "list");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type object count must be COUNT; found list");
                            }
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test boolean filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("has_boris", "boolean", "=", true);
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("rule"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("has_boris", filter.fieldName);
                                test.strictEqual("boolean", filter.type);
                                test.strictEqual("=", filter.rule.comparator);
                                test.strictEqual(true, filter.rule.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test string filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("host", "string", "contains", "abc");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("rule"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("host", filter.fieldName);
                                test.strictEqual("string", filter.type);
                                test.strictEqual("contains", filter.rule.comparator);
                                test.strictEqual("abc", filter.rule.compareTo);
                                test.strictEqual("BaseEvent", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test IPv4 filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("hostip", "ipv4", "startsWith", "192.168");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("rule"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("hostip", filter.fieldName);
                                test.strictEqual("ipv4", filter.type);
                                test.strictEqual("startsWith", filter.rule.comparator);
                                test.strictEqual("192.168", filter.rule.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test number filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("epsilon", "number", ">=", 2.3);
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("rule"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("epsilon", filter.fieldName);
                                test.strictEqual("number", filter.type);
                                test.strictEqual(">=", filter.rule.comparator);
                                test.strictEqual(2.3, filter.rule.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },
            "Callback#Pivot - test limit filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "ASCENDING", 500, "average");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("owner"));
                                test.ok(filter.hasOwnProperty("attributeName"));
                                test.ok(filter.hasOwnProperty("attributeOwner"));
                                test.ok(filter.hasOwnProperty("limitType"));
                                test.ok(filter.hasOwnProperty("limitAmount"));
                                test.ok(filter.hasOwnProperty("statsFn"));

                                test.strictEqual("epsilon", filter.fieldName);
                                test.strictEqual("number", filter.type);
                                test.strictEqual("test_data", filter.owner);
                                test.strictEqual("host", filter.attributeName);
                                test.strictEqual("BaseEvent", filter.attributeOwner);
                                test.strictEqual("lowest", filter.limitType);
                                test.strictEqual(500, filter.limitAmount);
                                test.strictEqual("average", filter.statsFn);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },
            "Callback#Pivot - test row split": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for row split
                            try {
                                pivotSpecification.addRowSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpecification.addRowSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test row split, number
                            pivotSpecification.addRowSplit("epsilon", "My Label");
                            test.strictEqual(1, pivotSpecification.rows.length);

                            var row = pivotSpecification.rows[0];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("number", row.type);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("all", row.display);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "My Label",
                                    display: "all"
                                },
                                row);

                            // Test row split, string
                            pivotSpecification.addRowSplit("host", "My Label");
                            test.strictEqual(2, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(!row.hasOwnProperty("display"));

                            test.strictEqual("host", row.fieldName);
                            test.strictEqual("BaseEvent", row.owner);
                            test.strictEqual("string", row.type);
                            test.strictEqual("My Label", row.label);
                            test.same({
                                    fieldName: "host",
                                    owner: "BaseEvent",
                                    type: "string",
                                    label: "My Label"
                                },
                                row);

                            // Test error handling on range row split
                            try {
                                pivotSpecification.addRangeRowSplit("has_boris", "Wrong type here", {start: 0, end: 100, step:20, limit:5});
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeRowSplit(field, "Break Me!", {start: 0, end: 100, step:20, limit:5});
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range row split
                            pivotSpecification.addRangeRowSplit("epsilon", "My Label", {start: 0, end: 100, step:20, limit:5});
                            test.strictEqual(3, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));
                            test.ok(row.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("number", row.type);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("ranges", row.display);

                            var ranges = {
                                start: 0,
                                end: 100,
                                size: 20,
                                maxNumberOf: 5
                            };
                            test.same(ranges, row.ranges);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "My Label",
                                    display: "ranges",
                                    ranges: ranges
                                },
                                row);

                            // Test error handling on boolean row split
                            try {
                                pivotSpecification.addBooleanRowSplit("epsilon", "Wrong type here", "t", "f");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanRowSplit(field, "Break Me!", "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean row split
                            pivotSpecification.addBooleanRowSplit("has_boris", "My Label", "is_true", "is_false");
                            test.strictEqual(4, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("trueLabel"));
                            test.ok(row.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("boolean", row.type);
                            test.strictEqual("is_true", row.trueLabel);
                            test.strictEqual("is_false", row.falseLabel);
                            test.same({
                                    fieldName: "has_boris",
                                    label: "My Label",
                                    owner: "test_data",
                                    type: "boolean",
                                    trueLabel: "is_true",
                                    falseLabel: "is_false"
                                },
                                row);

                            // Test error handling on timestamp row split
                            try {
                                pivotSpecification.addTimestampRowSplit("epsilon", "Wrong type here", "some binning");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit(field, "Break Me!", "some binning");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit("_time", "some label", "Bogus binning value");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }

                            // Test timestamp row split
                            pivotSpecification.addTimestampRowSplit("_time", "My Label", "day");
                            test.strictEqual(5, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("period"));

                            test.strictEqual("_time", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("BaseEvent", row.owner);
                            test.strictEqual("timestamp", row.type);
                            test.strictEqual("day", row.period);
                            test.same({
                                    fieldName: "_time",
                                    label: "My Label",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                row);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test column split": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for column split
                            try {
                                pivotSpecification.addColumnSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpecification.addColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test column split, number
                            pivotSpecification.addColumnSplit("epsilon");
                            test.strictEqual(1, pivotSpecification.columns.length);

                            var col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("number", col.type);
                            test.strictEqual("all", col.display);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "all"
                                },
                                col);

                            // Test column split, string
                            pivotSpecification.addColumnSplit("host");
                            test.strictEqual(2, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("display"));

                            test.strictEqual("host", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual("string", col.type);
                            test.same({
                                    fieldName: "host",
                                    owner: "BaseEvent",
                                    type: "string"
                                },
                                col);

                            done();

                            // Test error handling for range column split
                            try {
                                pivotSpecification.addRangeColumnSplit("has_boris", "Wrong type here", {start: 0, end: 100, step:20, limit:5});
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeColumnSplit(field, {start: 0, end: 100, step:20, limit:5});
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range column split
                            pivotSpecification.addRangeColumnSplit("epsilon", {start: 0, end: 100, step:20, limit:5});
                            test.strictEqual(3, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));
                            test.ok(col.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("number", col.type);
                            test.strictEqual("ranges", col.display);
                            var ranges = {
                                start: "0",
                                end: "100",
                                size: "20",
                                maxNumberOf: "5"
                            };
                            test.same(ranges, col.ranges);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "ranges",
                                    ranges: ranges
                                },
                                col);

                            // Test error handling on boolean column split
                            try {
                                pivotSpecification.addBooleanColumnSplit("epsilon", "t", "f");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanColumnSplit(field, "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean column split
                            pivotSpecification.addBooleanColumnSplit("has_boris", "is_true", "is_false");
                            test.strictEqual(4, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("trueLabel"));
                            test.ok(col.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("boolean", col.type);
                            test.strictEqual("is_true", col.trueLabel);
                            test.strictEqual("is_false", col.falseLabel);
                            test.same({
                                    fieldName: "has_boris",
                                    owner: "test_data",
                                    type: "boolean",
                                    trueLabel: "is_true",
                                    falseLabel: "is_false"
                                },
                                col);

                            // Test error handling on timestamp column split
                            try {
                                pivotSpecification.addTimestampColumnSplit("epsilon", "Wrong type here");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit("_time", "Bogus binning value");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }

                            // Test timestamp column split
                            pivotSpecification.addTimestampColumnSplit("_time", "day");
                            test.strictEqual(5, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("period"));

                            test.strictEqual("_time", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual("timestamp", col.type);
                            test.strictEqual("day", col.period);
                            test.same({
                                    fieldName: "_time",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                col);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test cell value": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for cell value, string
                            try {
                                pivotSpecification.addCellValue("iDontExist", "Break Me!", "explosion");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field iDontExist");
                            }
                            try {
                                pivotSpecification.addCellValue("source", "Wrong Stats Function", "stdev");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }

                            // Add cell value, string
                            pivotSpecification.addCellValue("source", "Source Value", "dc");
                            test.strictEqual(1, pivotSpecification.cells.length);

                            var cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("source", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual("string", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("dc", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "source",
                                    owner: "BaseEvent",
                                    type: "string",
                                    label: "Source Value",
                                    value: "dc",
                                    sparkline: false
                                }, cell);

                            // Test error handling for cell value, IPv4
                            try {
                                pivotSpecification.addCellValue("hostip", "Wrong Stats Function", "stdev");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }

                            // Add cell value, IPv4
                            pivotSpecification.addCellValue("hostip", "Source Value", "dc");
                            test.strictEqual(2, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("hostip", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("ipv4", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("dc", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "hostip",
                                    owner: "test_data",
                                    type: "ipv4",
                                    label: "Source Value",
                                    value: "dc",
                                    sparkline: false
                                }, cell);

                            // Test error handling for cell value, boolean
                            try {
                                pivotSpecification.addCellValue("has_boris", "Booleans not allowed", "sum");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot use boolean valued fields as cell values.");
                            }

                            // Test error handling for cell value, number
                            try {
                                pivotSpecification.addCellValue("epsilon", "Wrong Stats Function", "latest");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on number field must be must be one of:" +
                                    " sum, count, average, max, min, stdev, list, or distinct_values; found latest");
                            }

                            // Add cell value, number
                            pivotSpecification.addCellValue("epsilon", "Source Value", "average");
                            test.strictEqual(3, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("epsilon", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("number", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("average", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "Source Value",
                                    value: "average",
                                    sparkline: false
                                }, cell);

                            // Test error handling for cell value, timestamp
                            try {
                                pivotSpecification.addCellValue("_time", "Wrong Stats Function", "max");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on timestamp field must be one of:" +
                                    " duration, earliest, latest, list, or distinct values; found max");
                            }

                            // Add cell value, timestamp
                            pivotSpecification.addCellValue("_time", "Source Value", "earliest");
                            test.strictEqual(4, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("_time", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual("timestamp", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("earliest", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "_time",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    label: "Source Value",
                                    value: "earliest",
                                    sparkline: false
                                }, cell);

                            // Test error handling for cell value, count
                            try {
                                pivotSpecification.addCellValue("test_data", "Wrong Stats Function", "min");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on childcount and objectcount fields " +
                                    "must be count; found " + "min");
                            }

                            // Add cell value, count
                            pivotSpecification.addCellValue("test_data", "Source Value", "count");
                            test.strictEqual(5, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("test_data", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("objectCount", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("count", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "test_data",
                                    owner: "test_data",
                                    type: "objectCount",
                                    label: "Source Value",
                                    value: "count",
                                    sparkline: false
                                }, cell);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot throws HTTP exception": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            obj.createPivotSpecification().pivot(done);
                        },
                        function(pivot, done) {
                            test.ok(false);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        var expectedErr = "In handler 'datamodelpivot': Error in 'PivotReport': Must have non-empty cells or non-empty rows.";
                        test.ok(utils.endsWith(err.message, expectedErr));
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot with simple namespace": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                var obj;
                var pivotSpecification;
                var adhocjob;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("test_data");
                            test.ok(obj);
                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            adhocjob = job;
                            test.ok(job);
                            pivotSpecification = obj.createPivotSpecification();

                            pivotSpecification.addBooleanRowSplit("has_boris", "Has Boris", "meep", "hilda");
                            pivotSpecification.addCellValue("hostip", "Distinct IPs", "count");

                            // Test setting a job
                            pivotSpecification.setAccelerationJob(job);
                            test.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            test.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);

                            // Test setting a job's SID
                            pivotSpecification.setAccelerationJob(job.sid);
                            test.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            test.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);

                            pivotSpecification.pivot(done);
                        },
                        function(pivot, done) {
                            test.ok(pivot.tstatsSearch);
                            test.ok(pivot.tstatsSearch.length > 0);
                            test.strictEqual(0, pivot.tstatsSearch.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            test.strictEqual("| tstats", pivot.tstatsSearch.match("^\\| tstats")[0]);
                            test.strictEqual(1, pivot.tstatsSearch.match("^\\| tstats").length);

                            pivot.run(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().isDone;
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok("FAILED" !== job.properties().dispatchState);

                            test.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            test.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                            test.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                            adhocjob.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot column range split": function(test) {
                // This test is here because we had a problem with fields that were supposed to be
                // numbers being expected as strings in Splunk 6.0. This was fixed in Splunk 6.1, and accepts
                // either strings or numbers.

                if (this.skip) {
                    test.done();
                    return;
                }
                var that = this;
                var search;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            var obj = dm.objectByName("searches");
                            var pivotSpecification = obj.createPivotSpecification();

                            pivotSpecification.addRowSplit("user", "Executing user");
                            pivotSpecification.addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4});
                            pivotSpecification.addCellValue("search", "Search Query", "values");
                            pivotSpecification.pivot(done);
                        },
                        function(pivot, done) {
                            // If tstats is undefined, use pivotSearch
                            search = pivot.tstatsSearch || pivot.pivotSearch;
                            pivot.run(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().isDone;
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.notStrictEqual("FAILED", job.properties().dispatchState);
                            // Make sure the job is run with the correct search query
                            test.strictEqual(search, job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot with PivotSpecification.run and Job.track": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var that = this;
                Async.chain([
                    function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            var obj = dm.objectByName("searches");
                            var pivotSpecification = obj.createPivotSpecification();

                            pivotSpecification.addRowSplit("user", "Executing user");
                            pivotSpecification.addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4});
                            pivotSpecification.addCellValue("search", "Search Query", "values");

                            pivotSpecification.run({}, done);
                        },
                        function(job, pivot, done) {
                            job.track({}, function(job) {
                                test.strictEqual(pivot.tstatsSearch || pivot.pivotSearch, job.properties().request.search);
                                done(null, job);
                            });
                        },
                        function(job, done) {
                            test.notStrictEqual("FAILED", job.properties().dispatchState);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#DataModels - delete any remaining data models created by the SDK tests": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                svc.dataModels().fetch(function(err, dataModels) {
                    if (err) {
                        test.ok(!err);
                    }

                    var dms = dataModels.list();
                    Async.seriesEach(
                        dms,
                        function(datamodel, i, done) {
                            // Delete any test data models that we created
                            if (utils.startsWith(datamodel.name, "delete-me")) {
                                datamodel.remove(done);
                            }
                            else {
                                done();
                            }
                        },
                        function(err) {
                            test.ok(!err);
                            test.done();
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
                    }
                ], function(err) {
                    test.ok(!err);
                    test.done();
                });
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

            "list applications with cookies as authentication": function(test) {
                this.service.serverInfo(function (err, info) {
                    // Cookie authentication was added in splunk 6.2
                    var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                    var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                    // Skip cookie test if Splunk older than 6.2
                    if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                        splunkjs.Logger.log("Skipping cookie test...");
                        test.done();
                        return;
                    }

                    var service = new splunkjs.Service(
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        username: svc.username,
                        password: svc.password,
                        version: svc.version
                    });

                    var service2 = new splunkjs.Service(
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        version: svc.version
                    });

                    Async.chain([
                            function (done) {
                                service.login(done);
                            },
                            function (job, done) {
                                // Save the cookie store
                                var cookieStore = service.http._cookieStore;
                                // Test that there are cookies
                                test.ok(!utils.isEmpty(cookieStore));

                                // Add the cookies to a service with no other authenitcation information
                                service2.http._cookieStore = cookieStore;

                                var apps = service2.apps();
                                apps.fetch(done);
                            },
                            function (apps, done) {
                                var appList = apps.list();
                                test.ok(appList.length > 0);
                                test.ok(!utils.isEmpty(service2.http._cookieStore));
                                done();
                            }
                        ],
                        function(err) {
                            // Test that no errors were returned
                            test.ok(!err);
                            test.done();
                        });
                });
            }
        },

        "Saved Search Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
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

                var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

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
                            test.ok(search.fields().optional.length > 1);
                            test.ok(utils.indexOf(search.fields().optional, "disabled") > -1);

                            search.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#dispatch error": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    {owner: "nobody", app: "search"}
                );
                search.dispatch(function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#dispatch omitting optional arguments": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

                Async.chain(
                    [function(done) {
                        searches.create({search: originalSearch, name: name}, done);
                    },
                    function(search, done) {
                        test.ok(search);

                        test.strictEqual(search.name, name);
                        test.strictEqual(search.properties().search, originalSearch);
                        test.ok(!search.properties().description);

                        search.dispatch(done);
                    },
                    function(job, search, done) {
                        test.ok(job);
                        test.ok(search);
                        test.done();
                    }]
                );
            },

            "Callback#history error": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    {owner: "nobody", app: "search", sharing: "system"}
                );
                search.history(function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#Update error": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    {owner: "nobody", app: "search", sharing: "system"}
                );
                search.update(
                    {},
                    function(err) {
                        test.ok(err);
                        test.done();
                    });
            },

            "Callback#oneshot requires search string": function(test) {
                test.throws(function() { this.service.oneshotSearch({name: "jssdk_oneshot_" + getNextId()}, function(err) {});});
                test.done();
            },

            "Callback#Create + dispatch + history": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

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

            "Callback#job events fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.events({}, function (err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#job preview fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.preview({}, function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#job results fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.results({}, function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#job searchlog fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.searchlog(function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#job summary fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.summary({}, function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#job timeline fails": function(test) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.timeline({}, function(err) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#delete test saved searches": function(test) {
                var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});
                searches.fetch(function(err, searches) {
                    var searchList = searches.list();
                    Async.parallelEach(
                        searchList,
                        function(search, idx, callback) {
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
            },

            "Callback#setupInfo fails": function(test) {
                var searches = new splunkjs.Service.Application(this.loggedOutService, "search");
                searches.setupInfo(function(err, content, that) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#setupInfo succeeds": function(test) {
                var app = new splunkjs.Service.Application(this.service, "sdk-app-collection");
                app.setupInfo(function(err, content, app) {
                    // This error message was removed in modern versions of Splunk
                    if (err) {
                        test.ok(err.data.messages[0].text.match("Setup configuration file does not"));
                        splunkjs.Logger.log("ERR ---", err.data.messages[0].text);
                    }
                    else {
                        test.ok(app);
                    }
                    test.done();
                });
            },

            "Callback#updateInfo": function(test) {
                var app = new splunkjs.Service.Application(this.service, "search");
                app.updateInfo(function(err, info, app) {
                    test.ok(!err);
                    test.ok(app);
                    test.strictEqual(app.name, 'search');
                    test.done();
                });
            },

            "Callback#updateInfo failure": function(test) {
                var app = new splunkjs.Service.Application(this.loggedOutService, "sdk-app-collection");
                app.updateInfo(function(err, info, app) {
                    test.ok(err);
                    test.done();
                });
            }
        },

        "Fired Alerts Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;

                var indexes = this.service.indexes();
                done();
            },

            "Callback#create + verify emptiness + delete new alert group": function(test) {
                var searches = this.service.savedSearches({owner: this.service.username});

                var name = "jssdk_savedsearch_alert_" + getNextId();
                var searchConfig = {
                    "name": name,
                    "search": "index=_internal | head 1",
                    "alert_type": "always",
                    "alert.severity": "2",
                    "alert.suppress": "0",
                    "alert.track": "1",
                    "dispatch.earliest_time": "-1h",
                    "dispatch.latest_time": "now",
                    "is_scheduled": "1",
                    "cron_schedule": "* * * * *"
                };

                Async.chain([
                        function(done) {
                            searches.create(searchConfig, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.strictEqual(search.alertCount(), 0);
                            search.history(done);
                        },
                        function(jobs, search, done) {
                            test.strictEqual(jobs.length, 0);
                            test.strictEqual(search.firedAlertGroup().count(), 0);
                            searches.service.firedAlertGroups().fetch( Async.augment(done, search) );
                        },
                        function(firedAlertGroups, originalSearch, done) {
                            test.strictEqual(firedAlertGroups.list().indexOf(originalSearch.name), -1);
                            done(null, originalSearch);
                        },
                        function(originalSearch, done) {
                            originalSearch.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            // This test is not stable, commenting it out until we figure it out
            // "Callback#alert is triggered + test firedAlert entity -- FAILS INTERMITTENTLY": function(test) {
            //     var searches = this.service.savedSearches({owner: this.service.username});
            //     var indexName = "sdk-tests-alerts";
            //     var name = "jssdk_savedsearch_alert_" + getNextId();

            //     // Real-time search config
            //     var searchConfig = {
            //         "name": name,
            //         "search": "index="+indexName+" sourcetype=sdk-tests-alerts | head 1",
            //         "alert_type": "always",
            //         "alert.severity": "2",
            //         "alert.suppress": "0",
            //         "alert.track": "1",
            //         "dispatch.earliest_time": "rt-1s",
            //         "dispatch.latest_time": "rt",
            //         "is_scheduled": "1",
            //         "cron_schedule": "* * * * *"
            //     };

            //     Async.chain([
            //             function(done) {
            //                 searches.create(searchConfig, done);
            //             },
            //             function(search, done) {
            //                 test.ok(search);
            //                 test.strictEqual(search.alertCount(), 0);
            //                 test.strictEqual(search.firedAlertGroup().count(), 0);

            //                 var indexes = search.service.indexes();
            //                 indexes.create(indexName, {}, function(err, index) {
            //                     if (err && err.status !== 409) {
            //                         done(new Error("Index creation failed for an unknown reason"));
            //                     }
            //                     done(null, search);
            //                 });
            //             },
            //             function(originalSearch, done) {
            //                 var indexes = originalSearch.service.indexes();
            //                 indexes.fetch(function(err, indexes) {
            //                     if (err) {
            //                         done(err);
            //                     }
            //                     else {
            //                         var index = indexes.item(indexName);
            //                         test.ok(index);
            //                         index.enable(Async.augment(done, originalSearch));
            //                     }
            //                 });
            //             },
            //             function(index, originalSearch, done) {
            //                 //Is the index enabled?
            //                 test.ok(!index.properties().disabled);
            //                 //refresh the index
            //                 index.fetch(Async.augment(done, originalSearch));
            //             },
            //             function(index, originalSearch, done) {
            //                 //Store the current event count for a later comparison
            //                 var eventCount = index.properties().totalEventCount;

            //                 test.strictEqual(index.properties().sync, 0);
            //                 test.ok(!index.properties().disabled);

            //                 index.fetch(Async.augment(done, originalSearch, eventCount));
            //             },
            //             function(index, originalSearch, eventCount, done) {
            //                 // submit an event
            //                 index.submitEvent(
            //                     "JS SDK: testing alerts",
            //                     {
            //                         sourcetype: "sdk-tests-alerts"
            //                     },
            //                     Async.augment(done, originalSearch, eventCount)
            //                 );
            //             },
            //             function(result, index, originalSearch, eventCount, done) {
            //                 Async.sleep(1000, function(){
            //                     //refresh the search
            //                     index.fetch(Async.augment(done, originalSearch, eventCount));
            //                 });
            //             },
            //             function(index, originalSearch, eventCount, done) {
            //                 // Did the event get submitted
            //                 test.strictEqual(index.properties().totalEventCount, eventCount+1);
            //                 // Refresh the search
            //                 originalSearch.fetch(Async.augment(done, index));
            //             },
            //             function(originalSearch, index, done) {
            //                 splunkjs.Logger.log("\tAlert count pre-fetch", originalSearch.alertCount());
            //                 var attemptNum = 1;
            //                 var maxAttempts = 20;
            //                 Async.whilst(
            //                     function() {
            //                         // When this returns false, it hits the final function in the chain
            //                         splunkjs.Logger.log("\tFetch attempt", attemptNum, "of", maxAttempts, "alertCount", originalSearch.alertCount());
            //                         if (originalSearch.alertCount() !== 0) {
            //                             return false;
            //                         }
            //                         else {
            //                             attemptNum++;
            //                             return attemptNum < maxAttempts;
            //                         }
            //                     },
            //                     function(callback) {
            //                         Async.sleep(500, function() {
            //                             originalSearch.fetch(callback);
            //                         });
            //                     },
            //                     function(err) {
            //                         splunkjs.Logger.log("Attempted fetching", attemptNum, "of", maxAttempts, "result is", originalSearch.alertCount() !== 0);
            //                         originalSearch.fetch(Async.augment(done, index));
            //                     }
            //                 );
            //             },
            //             function(originalSearch, index, done) {
            //                 splunkjs.Logger.log("about to fetch");
            //                 splunkjs.Logger.log("SavedSearch name was: " + originalSearch.name);
            //                 svc.firedAlertGroups({username: svc.username}).fetch(Async.augment(done, index, originalSearch));
            //             },
            //             function(firedAlertGroups, index, originalSearch, done) {
            //                 Async.seriesEach(
            //                     firedAlertGroups.list(),
            //                     function(firedAlertGroup, innerIndex, seriescallback) {
            //                         Async.chain([
            //                                 function(insideChainCallback) {
            //                                     firedAlertGroup.list(insideChainCallback);
            //                                 },
            //                                 function(firedAlerts, firedAlertGroup, insideChainCallback) {
            //                                     for(var i = 0; i < firedAlerts.length; i++) {
            //                                         var firedAlert = firedAlerts[i];
            //                                         firedAlert.actions();
            //                                         firedAlert.alertType();
            //                                         firedAlert.isDigestMode();
            //                                         firedAlert.expirationTime();
            //                                         firedAlert.savedSearchName();
            //                                         firedAlert.severity();
            //                                         firedAlert.sid();
            //                                         firedAlert.triggerTime();
            //                                         firedAlert.triggerTimeRendered();
            //                                         firedAlert.triggeredAlertCount();
            //                                     }
            //                                     insideChainCallback(null);
            //                                 }
            //                             ],
            //                             function(err) {
            //                                 if (err) {
            //                                     seriescallback(err);
            //                                 }
            //                                     seriescallback(null);
            //                             }
            //                         );
            //                     },
            //                     function(err) {
            //                         if (err) {
            //                             done(err, originalSearch, index);
            //                         }
            //                         done(null, originalSearch, index);
            //                     }
            //                 );
            //             },
            //             function(originalSearch, index, done) {
            //                 // Make sure the event count has incremented, as expected
            //                 test.strictEqual(originalSearch.alertCount(), 1);
            //                 // Remove the search, especially because it's a real-time search
            //                 originalSearch.remove(Async.augment(done, index));
            //             },
            //             function(index, done) {
            //                 Async.sleep(500, function() {
            //                     index.remove(done);
            //                 });
            //             }
            //         ],
            //         function(err) {
            //             test.ok(!err);
            //             test.done();
            //         }
            //     );
            // },

            "Callback#delete all alerts": function(test) {
                var namePrefix = "jssdk_savedsearch_alert_";
                var alertList = this.service.savedSearches().list();

                Async.parallelEach(
                    alertList,
                    function(alert, idx, callback) {
                        if (utils.startsWith(alert.name, namePrefix)) {
                            splunkjs.Logger.log("ALERT ---", alert.name);
                            alert.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Properties Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#list": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) {
                        that.service.configurations(namespace).fetch(done);
                    },
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

            "Callback#item": function(test) {
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
                var fileName = "jssdk_file_" + getNextId();
                var value = "barfoo_" + getNextId();
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) {
                        var properties = that.service.configurations(namespace);
                        properties.fetch(done);
                    },
                    function(properties, done) {
                        properties.create(fileName, done);
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

            "Callback#configurations init": function(test) {
                test.throws(function() {
                    var confs = new splunkjs.Service.Configurations(
                        this.service,
                        {owner: "-", app: "-", sharing: "system"}
                    );
                });
                test.done();
            },

            "Callback#create file + create stanza + update stanza": function(test) {
                var that = this;
                var namespace = {owner: "nobody", app: "system"};
                var fileName = "jssdk_file_" + getNextId();
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
                        if (file.item("stanza")) {
                            file.item("stanza").remove();
                        }
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
            },

            "Callback#can get default stanza": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("savedsearches");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.name, "default");
                        test.strictEqual(namespace, stanza.namespace);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#updating default stanza is noop": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                var backup = null;
                var invalid = "this won't work";

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("savedsearches");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza._properties.hasOwnProperty("max_concurrent"));
                        test.strictEqual(namespace, stanza.namespace);
                        backup = stanza._properties.max_concurrent;
                        stanza.update({"max_concurrent": invalid}, done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        test.strictEqual(stanza.properties()["max_concurrent"], backup);
                        test.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                        test.strictEqual(stanza.properties()["max_concurrent"], backup);
                        test.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
        },

        "Storage Passwords Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Create": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with backslashes": function(test) {
                var startcount = -1;
                var name = "\\delete-me-" + getNextId();
                var realm = "\\delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with slashes": function(test) {
                var startcount = -1;
                var name = "/delete-me-" + getNextId();
                var realm = "/delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create without realm": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual("", storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without user, or realm": function(test) {
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            storagePasswords.create({name: null, password: "changeme"}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without password": function(test) {
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            storagePasswords.create({name: "something", password: null}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without user, realm, or password": function(test) {
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            storagePasswords.create({name: null, password: null}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create with colons": function(test) {
                var startcount = -1;
                var name = ":delete-me-" + getNextId();
                var realm = ":delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create crazy": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({
                                    name: name + ":end!@#$%^&*()_+{}:|<>?",
                                    realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                                    password: "changeme"},
                                done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                            test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with unicode chars": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({
                                    name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                                    realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                                    password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))},
                                done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                            test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                            test.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                            test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Read": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            try {
                                test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            var list = storagePasswords.list();
                            var found = false;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                }
                            }
                            test.ok(found);

                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Read with slashes": function(test) {
                var startcount = -1;
                var name = "/delete-me-" + getNextId();
                var realm = "/delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            try {
                                test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            var list = storagePasswords.list();
                            var found = false;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                }
                            }
                            test.ok(found);

                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Update": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.update({password: "changed"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changed", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            var list = storagePasswords.list();
                            var found = false;
                            var index = -1;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                    index = i;
                                    test.strictEqual(name, list[i].properties().username);
                                    test.strictEqual(realm + ":" + name + ":", list[i].name);
                                    test.strictEqual("changed", list[i].properties().clear_password);
                                    test.strictEqual(realm, list[i].properties().realm);
                                }
                            }
                            test.ok(found);

                            if (!found) {
                                done(new Error("Didn't find the created password"));
                            }
                            else {
                                list[index].remove(done);
                            }
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Delete": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var realm = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            var list = storagePasswords.list();
                            var found = false;
                            var index = -1;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                    index = i;
                                    test.strictEqual(name, list[i].properties().username);
                                    test.strictEqual(realm + ":" + name + ":", list[i].name);
                                    test.strictEqual("changeme", list[i].properties().clear_password);
                                    test.strictEqual(realm, list[i].properties().realm);
                                }
                            }
                            test.ok(found);

                            if (!found) {
                                done(new Error("Didn't find the created password"));
                            }
                            else {
                                list[index].remove(done);
                            }
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
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

        "Index Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;

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

            "Callback#remove index fails on Splunk 4.x": function(test) {
                var original_version = this.service.version;
                this.service.version = "4.0";

                var index = this.service.indexes().item(this.indexName);
                test.throws(function() { index.remove(function(err) {}); });

                this.service.version = original_version;
                test.done();
            },

            "Callback#remove index": function(test) {
                var indexes = this.service.indexes();

                // Must generate a private index because an index cannot
                // be recreated with the same name as a deleted index
                // for a certain period of time after the deletion.
                var salt = Math.floor(Math.random() * 65536);
                var myIndexName = this.indexName + '-' + salt;

                if (this.service.versionCompare("5.0") < 0) {
                    splunkjs.Logger.info("", "Must be running Splunk 5.0+ for this test to work.");
                    test.done();
                    return;
                }

                Async.chain([
                        function(callback) {
                            indexes.create(myIndexName, {}, callback);
                        },
                        function(index, callback) {
                            index.remove(callback);
                        },
                        function(callback) {
                            var numTriesLeft = 50;
                            var delayPerTry = 100;  // ms

                            Async.whilst(
                                 function() { return indexes.item(myIndexName) && ((numTriesLeft--) > 0); },
                                 function(iterDone) {
                                      Async.sleep(delayPerTry, function() { indexes.fetch(iterDone); });
                                 },
                                 function(err) {
                                      if (err) {
                                           callback(err);
                                      }
                                      else {
                                           callback(numTriesLeft <= 0 ? "Timed out" : null);
                                      }
                                 }
                            );
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
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
                var originalSyncMeta = false;

                Async.chain([
                        function(callback) {
                            indexes.fetch(callback);
                        },
                        function(indexes, callback) {
                            var index = indexes.item(name);
                            test.ok(index);

                            originalSyncMeta = index.properties().syncMeta;
                            index.update({
                                syncMeta: !originalSyncMeta
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();

                            test.strictEqual(!originalSyncMeta, properties.syncMeta);

                            index.update({
                                syncMeta: !properties.syncMeta
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();

                            test.strictEqual(originalSyncMeta, properties.syncMeta);
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
                        test.strictEqual(eventInfo.index, indexName);

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

            "Callback#Service submit event, omitting optional arguments": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        service.log(message, done);
                    },
                    function(eventInfo, done) {
                        test.ok(eventInfo);
                        test.strictEqual(eventInfo.bytes, message.length);

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

            "Callback#Service submit events with multi-byte chars": function(test) {
                var service = this.service;
                var messages = [
                    "Ummelner Straße 6",
                    "Ümmelner Straße 6",
                    "Iԉｔéｒԉáｔíòлåɭìƶåｔｉòл",
                    "Iｎｔéｒｎâｔì߀лàɭíƶɑｔïòл",
                    "ãϻéｔ ｄòｎｅｒ ｔｕｒƙëｙ ѵ߀ｌù",
                    "ｐｔãｔｅ ìԉ ｒëρｒèｈëｎԁéｒｉｔ ",
                    "ϻ߀ｌɭｉｔ ｆìɭèｔ ϻìǥｎｏԉ ɭäｂ߀ｒíѕ",
                    " êӽ ｃɦùｃｋ ｃüｐïᏧåｔåｔ Ꮷèѕëｒｕлｔ. ",
                    "D߀ɭｏｒ ѵéｌíｔ ìｒｕｒè, ｓèᏧ ѕｈòｒ",
                    "ｔ ｒｉƅѕ ｃ߀ɰ ɭãｎԁյàéɢêｒ ｄｒúｍｓｔ",
                    "íｃƙ. Mｉｎïｍ ƃàɭｌ ｔｉｐ ѕհòｒｔ ｒìƃѕ,",
                    " ïԁ ａɭïｑúìρ ѕɦàｎƙ ρ߀ｒｃɦéｔｔɑ. Pìǥ",
                    " ｈãｍ ɦòｃｋ ìлｃíｄíԁùԉｔ ｓéԁ ｃüｐïϻ ",
                    "ƙèｖｉл ｌáｂｏｒê. Eｔ ｔａｉɭ ѕｔｒｉρ",
                    " ｓｔｅáｋ úｔ üｌｌãϻｃ߀ ｒｕｍｐ ｄ߀ɭｏｒｅ.",
                    "٩(͡๏̯͡๏)۶ ٩(-̮̮̃•̃).",
                    "Lɑƅòｒé ƃｒëｓãòｌá ｄ߀лèｒ ѕâｌáｍí ",
                    "ｃíｌｌûｍ ìｎ ѕɯìлｅ ϻêàｔɭ߀àｆ ｄûìｓ ",
                    "ρãｎｃｅｔｔä ƅｒìｓƙéｔ ԁèｓêｒûлｔ áúｔè",
                    " յòɰɭ. Lɑｂòｒìѕ ƙìêɭ",
                    "ｂáｓá ԁòｌòｒé ｆａｔƃɑｃｋ ƅêéｆ. Pɑѕｔｒ",
                    "äｍì ｐｉɢ ѕհàлƙ ùɭɭａｍｃò ѕａû",
                    "ѕäǥë ｓɦàｎƙｌë.",
                    " Cúｐíｍ ɭäƃｏｒｕｍ ｄｒｕｍｓｔïｃƙ ｊｅｒｋϒ ｖｅｌｉ",
                    " ｐïｃåԉɦɑ ƙíéɭƅãｓａ. Aｌïｑû",
                    "ｉρ íｒüｒë ｃûｐíϻ, äɭìɋｕâ ǥｒòûлｄ ",
                    "ｒｏúлᏧ ｔｏԉｇüè ρàｒìãｔùｒ ",
                    "ｂｒｉѕｋèｔ ԉｏｓｔｒｕᏧ ｃûɭｐɑ",
                    " ìｄ ｃòлѕèｑûâｔ ｌàƅ߀ｒìｓ."
                ];

                var counter = 0;
                Async.seriesMap(
                    messages,
                    function(val, idx, done) {
                        counter++;
                        service.log(val, done);
                    },
                    function(err, vals) {
                        test.ok(!err);
                        test.strictEqual(counter, messages.length);

                        // Verify that the full byte-length was sent for each message
                        for (var m in messages) {
                            test.notStrictEqual(messages[m].length, vals[m].bytes);
                            try {
                                test.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                            }
                            catch (err) {
                                // Assume Buffer isn't defined, we're probably in the browser
                                test.strictEqual(decodeURI(encodeURIComponent(messages[m])).length, vals[m].bytes);
                            }
                        }

                        test.done();
                    }
                );
            },

            "Callback#Service submit event, failure": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.loggedOutService;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        test.ok(service);
                        service.log(message, done);
                    },
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#remove throws an error": function(test) {
                var index = this.service.indexes().item("_internal");
                test.throws(function() {
                    index.remove();
                });
                test.done();
            },

            "Callback#create an index with alternate argument format": function(test) {
                var indexes = this.service.indexes();
                indexes.create(
                    {name: "_internal"},
                    function(err, newIndex) {
                        test.ok(err.data.messages[0].text.match("name=_internal already exists"));
                        test.done();
                    }
                );
            },

            "Callback#Index submit event with omitted optional arguments": function(test) {
                var message = "Hello world -- " + getNextId();

                var indexName = this.indexName;
                var indexes = this.service.indexes();

                Async.chain(
                    [
                        function(done) {
                            indexes.fetch(done);
                        },
                        function(indexes, done) {
                            var index = indexes.item(indexName);
                            test.ok(index);
                            test.strictEqual(index.name, indexName);
                            index.submitEvent(message, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo.index, indexName);

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
                            test.strictEqual(eventInfo.index, indexName);

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
                this.loggedOutService = loggedOutSvc;
                done();
            },

            tearDown: function(done) {
                this.service.logout(done);
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

            "Callback#Current user fails": function(test) {
                var service = this.loggedOutService;

                service.currentUser(function(err, user) {
                    test.ok(err);
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

            "Callback#create user failure": function(test) {
                this.loggedOutService.users().create(
                    {name: "jssdk_testuser", password: "abc", roles: "user"},
                    function(err, response) {
                        test.ok(err);
                        test.done();
                    }
                );
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
                                scheme: service.scheme,
                                version: service.version
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
                            service.views({owner: "admin", app: "sdk-app-collection"}).create({name: name, "eai:data": originalData}, done);
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
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Callback#Typeahead failure": function(test) {
                var service = this.loggedOutService;
                service.typeahead("index=", 1, function(err, options) {
                    test.ok(err);
                    test.done();
                });
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
            },

            "Typeahead with omitted optional arguments": function(test) {
                var service = this.service;
                service.typeahead("index=", function(err, options) {
                    test.ok(!err);
                    test.ok(options);
                    test.done();
                });
            }
        },

        "Endpoint Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Throws on null arguments to init": function(test) {
                var service = this.service;
                test.throws(function() {
                    var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
                });
                test.throws(function() {
                    var endpoint = new splunkjs.Service.Endpoint(service, null);
                });
                test.done();
            },

            "Endpoint delete on a relative path": function(test) {
                var service = this.service;
                var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
                endpoint.del("search/jobs/12345", {}, function() { test.done();});
            },

            "Methods of Resource to be overridden": function(test) {
                var service = this.service;
                var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
                test.throws(function() { resource.path(); });
                test.throws(function() { resource.fetch(); });
                test.ok(splunkjs.Utils.isEmpty(resource.state()));
                test.done();
            }
        },

        "Entity tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Accessors function properly": function(test) {
                var entity = new splunkjs.Service.Entity(
                    this.service,
                    "/search/jobs/12345",
                    {owner: "boris", app: "factory", sharing: "app"}
                );
                entity._load(
                    {acl: {owner: "boris", app: "factory", sharing: "app"},
                     links: {link1: 35},
                     published: "meep",
                     author: "Hilda"}
                );
                test.ok(entity.acl().owner === "boris");
                test.ok(entity.acl().app === "factory");
                test.ok(entity.acl().sharing === "app");
                test.ok(entity.links().link1 === 35);
                test.strictEqual(entity.author(), "Hilda");
                test.strictEqual(entity.published(), "meep");
                test.done();
            },

            "Refresh throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
                entity.fetch({}, function(err) { test.ok(err); test.done();});
            },

            "Cannot update name of entity": function(test) {
                var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
                test.throws(function() { entity.update({name: "asdf"});});
                test.done();
            },

            "Disable throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    {owner: "boris", app: "factory", sharing: "app"}
                );
                entity.disable(function(err) { test.ok(err); test.done();});
            },

            "Enable throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    {owner: "boris", app: "factory", sharing: "app"}
                );
                entity.enable(function(err) { test.ok(err); test.done();});
            },

            "Does reload work?": function(test) {
                var idx = new splunkjs.Service.Index(
                    this.service,
                    "data/indexes/sdk-test",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                var that = this;
                Async.chain(
                    function(done) {
                        apps.create({name: name}, done);
                    },
                    function(app, done) {
                        app.reload(function(err) {
                            test.ok(!err);
                            done(null, app);
                        });
                    },
                    function(app, done) {
                        var app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                        app2.reload(function(err) {
                            test.ok(err);
                            done(null, app);
                        });
                    },
                    function(app, done) {
                        app.remove(done);
                    },
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Collection tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Methods to be overridden throw": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {owner: "admin",
                     app: "search",
                     sharing: "app"}
                );
                test.throws(function() {
                    coll.instantiateEntity({});
                });
                test.done();
            },

            "Accessors work": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {owner: "admin",
                     app: "search",
                     sharing: "app"}
                );
                coll._load({links: "Hilda", updated: true});
                test.strictEqual(coll.links(), "Hilda");
                test.ok(coll.updated());
                test.done();
            },

            "Contains throws without a good id": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                test.throws(function() { coll.item(null);});
                test.done();
            }
        }
    };
    return suite;
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
    if(!process.env.SPLUNK_HOME){
        throw new Error("$PATH variable SPLUNK_HOME is not set. Please export SPLUNK_HOME to the splunk instance.");
    }



    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    var suite = exports.setup(svc, loggedOutSvc);

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

            "Pivot#Async": function(test) {
                var main = require("../examples/node/helloworld/pivot_async").main;
                main(opts, test.done);
            },

            "Fired Alerts": function(test) {
                var main = require("../examples/node/helloworld/firedalerts").main;
                main(opts, test.done);
            },

            "Fired Alerts#Async": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_async").main;
                main(opts, test.done);
            },

            "Fired Alerts#Create": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_create").main;
                main(opts, test.done);
            },

            "Fired Alerts#Delete": function(test) {
                var main = require("../examples/node/helloworld/firedalerts_delete").main;
                main(opts, test.done);
            },

            "Get Job by sid": function(test) {
                var main = require("../examples/node/helloworld/get_job").main;
                main(opts, test.done);
            },

            "Endpoint Instantiation": function(test) {
                var main = require("../examples/node/helloworld/endpoint_instantiation").main;
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
            },
                        
            "Logging": function(test) {
                var main = require("../examples/node/helloworld/log").main;
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
            
            "List job preview": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("preview", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job results": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("results", [create.id], null, function(err) {
                        test.ok(!err);
                        context.run("cancel", [create.id], null, function(err) {
                            test.ok(!err);
                            test.done();
                        });
                    });
                });
            },
            
            "List job results, by column": function(test) {
                var create = {
                    search: "search index=_internal | head 1",
                    id: getNextId()
                };
                  
                var context = this;
                context.run("create", [], create, function(err) {
                    test.ok(!err);
                    context.run("results", [create.id], {output_mode: "json_cols"}, function(err) {
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
        }
        
        // This test is commented out because it causes a failure/hang on
        // Node >0.6. We need to revisit this test, so disabling it for now.
        /*"Results Example Tests": {
            
            "Parse row results": function(test) {
                var main = require("../examples/node/results").main;
                
                svc.search(
                    "search index=_internal | head 1 | stats count by sourcetype", 
                    {exec_mode: "blocking"}, 
                    function(err, job) {
                        test.ok(!err);
                        job.results({output_mode: "json_rows"}, function(err, results) {
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
        }*/
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
        password: cmdline.opts.password,
        version: cmdline.opts.version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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

require.define("/examples/node/helloworld/pivot_async.js", function (require, module, exports, __dirname, __filename) {
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

/* 
 * This example will login to Splunk, and then retrieve the list of data models,
 * get the "internal_audit_logs", then get the "searches" data model object.
 * Then start a search on the "searches" data model object, track the
 * job until it's done. Then get and print out the results.
 * 
 * Then create a pivot specification and retrieve the pivot searches from
 * the Splunk server, run the search job for that pivot report, track
 * the job until it's done. Then get and print out the results.
 * At the end, the search job is cancelled.
 */

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it.
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    var searches; // We'll use this later

    Async.chain([
            // First, we log in.
            function(done) {
                service.login(done);
            },
            
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }

                // Now that we're logged in, let's get the data models collection
                service.dataModels().fetch(done);
            },
            function(dataModels, done) {
                // ...and the specific data model we're concerned with
                var dm = dataModels.item("internal_audit_logs");
                // Get the "searches" object out of the "internal_audit_logs" data model
                searches = dm.objectByName("searches");

                console.log("Working with object", searches.displayName,
                    "in model", dm.displayName);

                console.log("\t Lineage:", searches.lineage.join(" -> "));
                console.log("\t Internal name: " + searches.name);

                // Run a data model search query, getting the first 5 results
                searches.startSearch({}, "| head 5", done);
            },
            function(job, done) {
                job.track({}, function(job) {
                    job.results({}, done);
                });
            },
            function(results, job, done) {
                // Print out the results
                console.log("Results:");
                for (var i = 0; i < results.rows.length; i++) {
                    var rowString = " result " + i + ":  ";
                    var row = results.rows[i];
                    for (var j = 0; j < results.fields.length; j++) {
                        if (row[j] !== null && row[j] !== undefined) {
                            rowString += results.fields[j] + "=" + row[j] + ", ";
                        }
                    }
                    console.log(rowString);
                    console.log("------------------------------");
                }
                
                var pivotSpecification = searches.createPivotSpecification();
                // Each function call here returns a pivotSpecification so we can chain them
                pivotSpecification
                    .addRowSplit("user", "Executing user")
                    .addRangeColumnSplit("exec_time", {limit: 4})
                    .addCellValue("search", "Search Query", "values")
                    .run(done);
            },
            function(job, pivot, done) {
                console.log("Query for binning search queries by execution time and executing user:");
                console.log("\t", pivot.prettyQuery);
                job.track({}, function(job) {
                    job.results({}, done);
                });
            },
            function(results, job, done) {
                // Print out the results
                console.log("Results:");
                for (var i = 0; i < results.rows.length; i++) {
                    var rowString = " result " + i + ":  ";
                    var row = results.rows[i];
                    for (var j = 0; j < results.fields.length; j++) {
                        if (row[j] !== null && row[j] !== undefined) {
                            rowString += results.fields[j] + "=" + row[j] + ", ";
                        }
                    }
                    console.log(rowString);
                    console.log("------------------------------");
                }
                job.cancel(done);
            }
        ],
        function(err) {
            if (err) {
                console.log("ERROR", err);
                callback(err);
            }
            callback(err);
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}

});

require.define("/examples/node/helloworld/firedalerts.js", function (require, module, exports, __dirname, __filename) {
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

// This example will login to Splunk, and then retrieve the list of fired alerts,
// printing each alert's name and properties.

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    // First, we log in.
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 

        // Now that we're logged in, let's get a listing of all the fired alert groups
        service.firedAlertGroups().fetch(function(err, firedAlertGroups) {
            if (err) {
                console.log("ERROR", err);
                done(err);
                return;
            }

            // Get the list of all fired alert groups, including the all group (represented by "-")
            var groups = firedAlertGroups.list();
            console.log("Fired alert groups:");

            var listGroupCallback = function(err, firedAlerts, firedAlertGroup) {
                // How many times was this alert fired?
                console.log(firedAlertGroup.name, "(Count:", firedAlertGroup.count(), ")");
                // Print the properties for each fired alert (default of 30 per alert group)
                for(var i = 0; i < firedAlerts.length; i++) {
                    var firedAlert = firedAlerts[i];
                    for(var key in firedAlert.properties()) {
                        if (firedAlert.properties().hasOwnProperty(key)) {
                           console.log("\t", key, ":", firedAlert.properties()[key]);
                        }
                    }
                    console.log();
                }
                console.log("======================================");
            };

            for(var a in groups) {
                if (groups.hasOwnProperty(a)) {
                    var firedAlertGroup = groups[a];
                    firedAlertGroup.list(listGroupCallback);
                }
            }

            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}

});

require.define("/examples/node/helloworld/firedalerts_async.js", function (require, module, exports, __dirname, __filename) {
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

// This example will login to Splunk, and then retrieve the list of fired alerts,
// printing each alert's name and properties. It is the same as firedalerts.js, 
// except that it uses the Async library

var splunkjs = require('../../../index');
var Async  = splunkjs.Async;

exports.main = function(opts, callback) {
    // This is just for testing - ignore it.
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    Async.chain([
            // First, we log in.
            function(done) {
                service.login(done);
            },
            
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }

                // Now that we're logged in, let's get a listing of all the fired alert groups.
                service.firedAlertGroups().fetch(done);
            },
            // Print them out.
            function(firedAlertGroups, done) {
                // Get the list of all fired alert groups, including the all group (represented by "-").
                var groups = firedAlertGroups.list();

                console.log("Fired alert groups:");
                Async.seriesEach(
                    groups,
                    function(firedAlertGroup, index, seriescallback) {
                        firedAlertGroup.list(function(err, firedAlerts){
                            // How many times was this alert fired?
                            console.log(firedAlertGroup.name, "(Count:", firedAlertGroup.count(), ")");
                            // Print the properties for each fired alert (default of 30 per alert group).
                            for(var i = 0; i < firedAlerts.length; i++) {
                                var firedAlert = firedAlerts[i];
                                for (var key in firedAlert.properties()) {
                                    if (firedAlert.properties().hasOwnProperty(key)) {
                                        console.log("\t", key, ":", firedAlert.properties()[key]);
                                    }
                                }
                                console.log();
                            }
                            console.log("======================================");
                        });
                        seriescallback();
                    },
                    function(err) {
                        if (err) {
                            done(err);
                        }
                        done();
                    }
                );
            }
        ],
        function(err) {
            if (err) {
                console.log("ERROR", err);
                callback(err);
            }
            callback(err);
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}

});

require.define("/examples/node/helloworld/firedalerts_create.js", function (require, module, exports, __dirname, __filename) {
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

// This example will login to Splunk, and then create an alert.

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it.
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    // First, we log in.
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as if the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        var alertOptions = {
            name: "My Awesome Alert",
            search: "index=_internal error sourcetype=splunkd* | head 10",
            "alert_type": "always",
            "alert.severity": "2",
            "alert.suppress": "0",
            "alert.track": "1",
            "dispatch.earliest_time": "-1h",
            "dispatch.latest_time": "now",
            "is_scheduled": "1",
            "cron_schedule": "* * * * *"
        };
        
        // Now that we're logged in, let's create a saved search.
        service.savedSearches().create(alertOptions, function(err, alert) {
            if (err && err.status === 409) {
                console.error("ERROR: A saved search with the name '" + alertOptions.name + "' already exists");
                done();
                return;
            }
            else if (err) {
                console.error("There was an error creating the saved search:", err);
                done(err);
                return;
            }
            
            console.log("Created saved search as alert: " + alert.name);            
            done();
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}

});

require.define("/examples/node/helloworld/firedalerts_delete.js", function (require, module, exports, __dirname, __filename) {
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

// This example will login to Splunk, and then try to delete the alert
// that was created in savedsearches_create.js

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it.
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    // First, we log in.
    service.login(function(err, success) {
        // We check for both errors in the connection as well
        // as whether the login itself failed.
        if (err || !success) {
            console.log("Error in logging in");
            done(err || "Login failed");
            return;
        } 
        
        var name = "My Awesome Alert";
        
        // Now that we're logged in, let's delete the alert.
        service.savedSearches().fetch(function(err, firedAlertGroups) {
            if (err) {
                console.log("There was an error in fetching the alerts");
                done(err);
                return;
            }

            var alertToDelete = firedAlertGroups.item(name);
            if (!alertToDelete) {
                console.log("Can't delete '" + name + "' because it doesn't exist!");
                done();
            }
            else {
                alertToDelete.remove();
                console.log("Deleted alert: " + name + "");
                done();
            }
        });
    });
};

if (module === require.main) {
    exports.main({}, function() {});
}

});

require.define("/examples/node/helloworld/get_job.js", function (require, module, exports, __dirname, __filename) {

// Copyright 2015 Splunk, Inc.
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

// This example will show how to get a `Job` by it's sid without
// fetching a collection of `Job`s.

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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
    });

    var sid;

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
                
                service.search("search index=_internal | head 1", {}, done);
            },
            function(job, done) {
                // Store the sid for later use
                sid = job.sid;
                console.log("Created a search job with sid: " + job.sid);
                done();
            }
        ],
        function(err) {
            if (err || !sid) {
                if (err.hasOwnProperty("data") && err.data.hasOwnProperty("messages")) {
                    console.log(err.data.messages[0].text);
                }
                else {
                    console.log(err);
                }
                if (!sid) {
                    console.log("Couldn't create search.");
                }
                callback(err);
            }
            else {
                Async.chain([
                        function(done) {
                            // Since we have the job sid, we can get that job directly
                            service.getJob(sid, done);
                        },
                        function(job, done) {
                            console.log("Got the job with sid: " + job.sid);
                            done();
                        }
                    ],
                    function(err) {
                        callback(err);
                    }
                );
            }
        }
    );
};

if (module === require.main) {
    exports.main({}, function() {});
}
});

require.define("/examples/node/helloworld/endpoint_instantiation.js", function (require, module, exports, __dirname, __filename) {

// Copyright 2015 Splunk, Inc.
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

var splunkjs = require('../../../index');

// This example will show you how to add a new REST API endpoint
// to the Splunk SDK for JavaScript.
//
// The JavaScript SDK has the authorization roles REST API endpoint
// path defined, but doesn't implement it.
// To add a new path, we would add the following:
//
// `splunkjs.Paths.roles = "authorization/roles";`
//
// Be sure to avoid naming collisions!
//
// Depending on the endpoint, you may need to prepend `/services/`
// when defining the path.
// For example the server info REST API endpoint path is defined as:
//
// `"/services/server/info"`
//
// For more information, please refer to the REST API documentation
// at http://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog

// Here we're adding a new entity to splunkjs, which will be
// used by the collection we'll add below.
splunkjs.Service.Role = splunkjs.Service.Entity.extend({
    path: function() {
        return splunkjs.Paths.roles + "/" + encodeURIComponent(this.name);
    },

    init: function(service, name, namespace) {
        this.name = name;
        this._super(service, this.path(), namespace);
    }
});

// Here we're adding a new collection to splunkjs, which
// uses the Role entity we just defined.
// See the `instantiateEntity()` function.
splunkjs.Service.Roles = splunkjs.Service.Collection.extend({
    fetchOnEntityCreation: true,
    
    path: function() {
        return splunkjs.Paths.roles;
    },

    instantiateEntity: function(props) {
        var entityNamespace = splunkjs.Utils.namespaceFromProperties(props);
        return new splunkjs.Service.Role(this.service, props.name, entityNamespace);
    },

    init: function(service, namespace) {
        this._super(service, this.path(), namespace);
    }
});

// To finish off integrating the new endpoint,
// we need to add a function to the service object
// which will retrieve the Roles collection.
splunkjs.Service.prototype.roles = function(namespace) {
    return new splunkjs.Service.Roles(this, namespace);
};

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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

        // Now that we're logged in, we can just retrieve system roles!
        service.roles({user:"admin", app: "search"}).fetch(function(rolesErr, roles) {
            if (rolesErr) {
                console.log("There was an error retrieving the list of roles:", err);
                done(err);
                return;
            }

            console.log("System roles:");
            var rolesList = roles.list();
            for (var i = 0; i < rolesList.length; i++) {
                console.log("  " + i + " " + rolesList[i].name);
            }
            done();
        });
    });
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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

// This example will login to Splunk, and then try to delete the 
// saved search that was created in savedsearches_create.js

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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

// This example will login to Splunk, and create a saved search.

var splunkjs = require('../../../index');

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
                job.track({}, function(job) {
                    // Ask the server for the results
                    job.results({}, done);
                });
            },
            // Print out the statistics and get the results
            function(results, job, done) {
                // Print out the statics
                console.log("Job Statistics: ");
                console.log("  Event Count: " + job.properties().eventCount);
                console.log("  Disk Usage: " + job.properties().diskUsage + " bytes");
                console.log("  Priority: " + job.properties().priority);

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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
                                if (results && results.rows) {
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

require.define("/examples/node/helloworld/log.js", function (require, module, exports, __dirname, __filename) {

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

// This example shows a simple log handler that will print to the console
// as well as log the information to a Splunk instance.

var splunkjs = require('../../../index');

var Logger = splunkjs.Class.extend({
    init: function(service, opts) {
        this.service = service;
        
        opts = opts || {};
        
        this.params = {};
        if (opts.index)      { this.params.index      = opts.index; }
        if (opts.host)       { this.params.host       = opts.host; }
        if (opts.source)     { this.params.source     = opts.source; }
        if (opts.sourcetype) { this.params.sourcetype = opts.sourcetype || "demo-logger"; }
        
        if (!this.service) {
            throw new Error("Must supply a valid service");
        }
    },
    
    log: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "LOG",
            data: data
        };
        
        this.service.log(message, this.params);
        console.log(data);
    },
    
    error: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "ERROR",
            data: data
        };
        
        this.service.log(message, this.params);
        console.error(data);
    },
    
    info: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "INFO",
            data: data
        };
        
        this.service.log(message, this.params);
        console.info(data);
    },
    
    warn: function(data) {
        var message = {
            __time: (new Date()).toUTCString(),
            level: "WARN",
            data: data
        };
        
        this.service.log(message, this.params);
        console.warn(data);
    }
});

exports.main = function(opts, done) {
    // This is just for testing - ignore it
    opts = opts || {};
    
    var username = opts.username    || "admin";
    var password = opts.password    || "changeme";
    var scheme   = opts.scheme      || "https";
    var host     = opts.host        || "localhost";
    var port     = opts.port        || "8089";
    var version  = opts.version     || "default";
    
    var service = new splunkjs.Service({
        username: username,
        password: password,
        scheme: scheme,
        host: host,
        port: port,
        version: version
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
        
        // Create our logger
        var logger = new Logger(service, { sourcetype: "mylogger", source: "test" });
        
        // Log the various types of messages. Note how we are sending
        // both strings and JSON objects, which will be auto-encoded and
        // understood by Splunk 4.3+
        logger.log({hello: "world"});
        logger.error("ERROR HAPPENED");
        logger.info(["useful", "info"]);
        logger.warn({"this": {"is": ["a", "warning"]}});
        
        // Say we are done with this sample.
        done();
    });
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
                
                Async.parallelMap(jobsList, fn, callback);
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
                job.track({}, {
                    'done': function(job) {
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
                    },
                    'failed': function(job) {
                        done('failed');
                    },
                    'error': function(err) {
                        done(err);
                    }
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
                password: cmdline.opts.password,
                version: cmdline.opts.version
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
            password:   options.password,
            version:    options.version
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
            delete cmdline.version;
            
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
    Examples : require('../../tests/test_examples')
};
});
require("/browser.test.entry.js");


})();