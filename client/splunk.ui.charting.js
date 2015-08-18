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

require.define("/ui/charting.js", function (require, module, exports, __dirname, __filename) {

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
    var utils        = require('../utils');
    var Class        = require('../jquery.class').Class;
    var SplunkCharts = require('./charting/js_charting').Splunk;
    
    var root = exports || this;
        
    var JSCharting = SplunkCharts.JSCharting;
    root.ChartType = {
        LINE: "line",
        AREA: "area",
        COLUMN: "column",
        BAR: "bar",
        PIE: "pie",
        SCATTER: "scatter",
        HYBRID: "hybrid",
        RADIALGAUGE: "radialGauge",
        FILLERGAUGE: "fillerGauge",
        MARKERGAUGE: "markerGauge"
    };
    
    root.Chart = Class.extend({
        init: function(el, chartType, orientation, isSplitSeries) {
            this.el = $(el);
            this.chartType = chartType;
            this.chart = JSCharting.createChart(this.el.eq(0)[0], {
                chart: chartType,
                "chart.orientation": orientation,
                "layout.splitSeries": isSplitSeries
            });
        },
        
        destroy: function() {
            this.chart.destroy();
            this.chart = null;
        },
        
        setData: function(data, properties) {
            var fieldInfo = JSCharting.extractFieldInfo(data);
            var chartData = JSCharting.extractChartReadyData(data, fieldInfo);
            
            if (!properties.chart) {
                properties.chart = this.chartType;
            }
            
            this.chart.prepare(chartData, fieldInfo, properties);
        },
        
        draw: function() {
            this.chart.draw(function(){});
        }
    });
})();
});

require.define("/utils.js", function (require, module, exports, __dirname, __filename) {
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

require.define("/jquery.class.js", function (require, module, exports, __dirname, __filename) {
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

require.define("/ui/charting/js_charting.js", function (require, module, exports, __dirname, __filename) {
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
    
    var Splunk     = require('./splunk');
    var i18n       = require('./i18n');
    var Highcharts = require('./highcharts').Highcharts;
    
    require('./util');
    require('./lowpro_for_jquery');
    
    var format_decimal               = i18n.format_decimal;
    var format_percent               = i18n.format_percent;
    var format_scientific            = i18n.format_scientific;
    var format_date                  = i18n.format_date;
    var format_datetime              = i18n.format_datetime;
    var format_time                  = i18n.format_time;
    var format_datetime_microseconds = i18n.format_datetime_microseconds;
    var format_time_microseconds     = i18n.format_time_microseconds;
    var format_datetime_range        = i18n.format_datetime_range;
    var locale_name                  = i18n.locale_name;
    var locale_uses_day_before_month = i18n.locale_uses_day_before_month;
    
    exports.Splunk = Splunk;
    
    ////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting
    //
    // Adding some basic methods/fields to the JSCharting namespace for creating charts
    // and manipulating data from splunkd

    Splunk.JSCharting = {

        // this is copied from the Highcharts source, line 38
        hasSVG: !!document.createElementNS &&
                    !!document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGRect,

        createChart: function(container, properties) {
            // this is a punt to verify that container is a valid dom element
            // not an exhaustive check, but verifies the existence of the first
            // methods HC will call in an attempt to catch the problem here
            if(!container.appendChild || !container.cloneNode) {
                throw new Error("Invalid argument to createChart, container must be a valid DOM element");
            }
            var getConstructorByType = function(chartType) {
                    switch(chartType) {
                        case 'line':
                            return Splunk.JSCharting.LineChart;
                        case 'area':
                            return Splunk.JSCharting.AreaChart;
                        case 'column':
                            return Splunk.JSCharting.ColumnChart;
                        case 'bar':
                            return Splunk.JSCharting.BarChart;
                        case 'pie':
                            return Splunk.JSCharting.PieChart;
                        case 'scatter':
                            return Splunk.JSCharting.ScatterChart;
                        case 'hybrid':
                            return Splunk.JSCharting.HybridChart;
                        case 'radialGauge':
                            return Splunk.JSCharting.RadialGauge;
                        case 'fillerGauge':
                            return (properties['chart.orientation'] === 'x') ?
                                    Splunk.JSCharting.HorizontalFillerGauge : Splunk.JSCharting.VerticalFillerGauge;
                        case 'markerGauge':
                            return (properties['chart.orientation'] === 'x') ?
                                    Splunk.JSCharting.HorizontalMarkerGauge : Splunk.JSCharting.VerticalMarkerGauge;
                        default:
                            return Splunk.JSCharting.ColumnChart;
                    }
                },
                chartConstructor = getConstructorByType(properties.chart);

            // split series only applies to bar/column/line/area charts
            if(properties['layout.splitSeries'] === 'true'
                    && (!properties.chart || properties.chart in {bar: true, column: true, line: true, area: true})) {
                return new Splunk.JSCharting.SplitSeriesChart(container, chartConstructor);
            }
            return new chartConstructor(container);
        },

        extractFieldInfo: function(rawData) {
            if(!rawData || !rawData.columns) {
                return {
                    fieldNames: []
                };
            }
            var i, loopField, xAxisKey, xAxisSeriesIndex, spanSeriesIndex,
                xAxisKeyFound = false,
                isTimeData = false,
                fieldNames = [];

            // SPL-56805, check for the _time field, if it's there use it as the x-axis field
            var _timeIndex = $.inArray('_time', rawData.fields);
            if(_timeIndex > -1) {
                xAxisKey = '_time';
                xAxisSeriesIndex = _timeIndex;
                xAxisKeyFound = true;
            }

            for(i = 0; i < rawData.columns.length; i++) {
                loopField = rawData.fields[i];
                if(loopField == '_span') {
                    spanSeriesIndex = i;
                    continue;
                }
                if(loopField.charAt(0) == '_' && loopField != "_time") {
                    continue;
                }
                if(!xAxisKeyFound) {
                    xAxisKey = loopField;
                    xAxisSeriesIndex = i;
                    xAxisKeyFound = true;
                }
                if(xAxisKey && loopField !== xAxisKey) {
                    fieldNames.push(loopField);
                }
            }
            if(xAxisKey === '_time' && ($.inArray('_span', rawData.fields) > -1 || rawData.columns[xAxisSeriesIndex].length === 1)) {
                // we only treat the data as time data if it has been discretized by the back end
                // (indicated by the existence of a '_span' field)
                isTimeData = true;
            }
            return {
                fieldNames: fieldNames,
                xAxisKey: xAxisKey,
                xAxisSeriesIndex: xAxisSeriesIndex,
                spanSeriesIndex: spanSeriesIndex,
                isTimeData: isTimeData
            };
        },

        extractChartReadyData: function(rawData, fieldInfo) {
            if(!rawData || !rawData.columns) {
                return false;
            }
            var i, j,
                xAxisKey = fieldInfo.xAxisKey,
                xAxisSeriesIndex = fieldInfo.xAxisSeriesIndex,
                xSeries = rawData.columns[xAxisSeriesIndex],
                _spanSeries, xAxisType, categories,
                loopSeries, loopYVal, loopDataPoint,
                series = {};
            if(xAxisKey === '_time' && ($.inArray('_span', rawData.fields) > -1 || xSeries.length === 1)) {
                xAxisType = "time";
                for(i = 0; i < rawData.columns.length; i++) {
                    if(rawData.fields[i] === '_span') {
                        _spanSeries = rawData.columns[i];
                        break;
                    }
                }
            }
            else {
                xAxisType = "category";
                categories = $.extend(true, [], xSeries);
            }

            // extract the data
            for(i = 0; i < rawData.columns.length; i++) {
                loopSeries = rawData.columns[i];
                series[rawData.fields[i]] = [];
                for(j = 0; j < loopSeries.length; j++) {
                    loopYVal = this.MathUtils.parseFloat(loopSeries[j]);
                    loopDataPoint = {
                        name: xSeries[j],
                        y: loopYVal,
                        rawY: loopYVal
                    };
                    if(xAxisType === "time" && _spanSeries) {
                        loopDataPoint._span = _spanSeries[j];
                    }
                    series[rawData.fields[i]].push(loopDataPoint);
                }
            }
            return {
                series: series,
                fieldNames: fieldInfo.fieldNames,
                xAxisKey: fieldInfo.xAxisKey,
                xAxisType: xAxisType,
                categories: categories,
                xSeries: xSeries,
                _spanSeries: _spanSeries
            };
        }

    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractVisualization


    Splunk.JSCharting.AbstractVisualization = $.klass({

        hasSVG: Splunk.JSCharting.hasSVG,

        initialize: function(container) {
            // some shortcuts to the util packages
            this.mathUtils   = Splunk.JSCharting.MathUtils;
            this.parseUtils  = Splunk.JSCharting.ParsingUtils;
            this.colorUtils  = Splunk.JSCharting.ColorUtils;
            this.Throttler   = Splunk.JSCharting.Throttler;

            this.eventMap    = {};

            this.renderTo    = container;
            this.chartWidth  = $(this.renderTo).width();
            this.chartHeight = $(this.renderTo).height();

            this.backgroundColor = "#ffffff";
            this.foregroundColor = "#000000";
            this.fontColor = "#000000";

            this.testMode = false;
            this.exportMode = false;
        },

        applyProperties: function(properties) {
            for(var key in properties) {
                if(properties.hasOwnProperty(key)) {
                    this.applyPropertyByName(key, properties[key], properties);
                }
            }
            this.performPropertyCleanup();
        },

        applyPropertyByName: function(key, value, properties) {
            switch(key) {

                case 'backgroundColor':
                    this.backgroundColor = value;
                    break;
                case 'foregroundColor':
                    this.foregroundColor = value;
                    break;
                case 'fontColor':
                    this.fontColor = value;
                    break;
                case 'testMode':
                    this.testMode = (value === true);
                    break;
                case 'exportMode':
                    if(value === "true") {
                        this.exportMode = true;
                        this.setExportDimensions();
                    }
                    break;
                default:
                    // no-op, ignore unrecognized properties
                    break;

            }
        },

        performPropertyCleanup: function() {
            this.foregroundColorSoft = this.colorUtils.addAlphaToColor(this.foregroundColor, 0.25);
            this.foregroundColorSofter = this.colorUtils.addAlphaToColor(this.foregroundColor, 0.15);
        },

        addEventListener: function(type, callback) {
            if(this.eventMap[type]) {
                this.eventMap[type].push(callback);
            }
            else {
                this.eventMap[type] = [callback];
            }
        },

        removeEventListener: function(type, callback) {
            if(this.eventMap[type] == undefined) {
                return;
            }
            var index = $.inArray(callback, this.eventMap[type]);
            if(this.eventMap[type][index]) {
                this.eventMap[type].splice(index, 1);
            }
        },

        dispatchEvent: function(type, event) {
            event = event || {};
            if(this.eventMap[type]) {
                for(var i in this.eventMap[type]) {
                    this.eventMap[type][i](event);
                }
            }
        },

        // TODO: this should be migrated to another object, formatting helper maybe?
        addClassToElement: function(elem, className) {
            // the className can potentially come from the search results, so make sure it is valid before
            // attempting to insert it...

            // if the className doesn't start with a letter or a '-' followed by a letter, don't insert
            if(!/^[-]?[A-Za-z]/.test(className)) {
                return;
            }
            // now filter out anything that is not a letter, number, '-', or '_'
            className = className.replace(/[^A-Za-z0-9_-]/g, "");
            if(this.hasSVG) {
                if(elem.className.baseVal) {
                    elem.className.baseVal += " " + className;
                }
                else {
                    elem.className.baseVal = className;
                }
            }
            else {
                $(elem).addClass(className);
            }
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractChart


    Splunk.JSCharting.AbstractChart = $.klass(Splunk.JSCharting.AbstractVisualization, {

        axesAreInverted: false,
        HOVER_TIMER: 25,
        focusedElementOpacity: 1,
        fadedElementOpacity: 0.3,
        fadedElementColor: "rgba(150, 150, 150, 0.3)",

        // override
        initialize: function($super, container) {
            $super(container);

            this.needsLegendMapping = true;

            this.hcChart = false;
            this.chartIsDrawing = false;
            this.chartIsStale = false;
            this.processedData = false;
            this.pendingData = false;
            this.pendingColors = false;
            this.pendingCallback = false;
            this.customConfig = false;
            this.chartIsEmpty = false;

            this.logYAxis = false;
            this.legendMaxWidth = 300;
            this.legendEllipsizeMode = 'ellipsisMiddle';
            this.tooMuchData = false;

            this.fieldListMode = "hide_show";
            this.fieldHideList = [];
            this.fieldShowList = [];
            this.legendLabels = [];

            this.colorPalette = new Splunk.JSCharting.ListColorPalette();
        },

        prepare: function(data, fieldInfo, properties) {
            this.properties = properties;
            this.generateDefaultConfig();
            this.addRenderHooks();
            this.applyProperties(properties);
            this.processData(data, fieldInfo, properties);
            if(this.chartIsEmpty) {
                this.configureEmptyChart();
            }
            else {
                this.applyFormatting(properties, this.processedData);
                this.addEventHandlers(properties);
                if(this.customConfig) {
                    $.extend(true, this.hcConfig, this.customConfig);
                }
            }
        },

        getFieldList: function() {
            if(this.chartIsEmpty) {
                return [];
            }
            // response needs to be adjusted if the user has explicitly defined legend label list
            if(this.legendLabels.length > 0) {
                var adjustedList = $.extend(true, [], this.legendLabels);
                for(var i = 0; i < this.processedData.fieldNames.length; i++) {
                    var name = this.processedData.fieldNames[i];
                    if($.inArray(name, adjustedList) === -1) {
                        adjustedList.push(name);
                    }
                }
                return adjustedList;
            }
            return this.processedData.fieldNames;
        },

        setColorMapping: function(list, map, legendSize) {
            var i, color,
                newColors = [];

            for(i = 0; i < list.length; i++) {
                color = this.colorPalette.getColor(list[i], map[list[i]], legendSize);
                newColors.push(this.colorUtils.addAlphaToColor(color, this.focusedElementOpacity));
            }
            this.hcConfig.colors = newColors;
        },

        setColorList: function(list) {
            var i,
                newColors = [];

            for(i = 0; i < list.length; i++) {
                newColors.push(this.colorUtils.addAlphaToColor(list[i], this.focusedElementOpacity));
            }
            this.hcConfig.colors = newColors;
        },

        draw: function(callback) {
            if(this.chartIsDrawing) {
                this.chartIsStale = true;
                this.pendingCallback = callback;
                return;
            }
            this.chartIsDrawing = true;
            if(this.hcChart) {
                this.destroy();
            }

            // SPL-49962: have to make sure there are as many colors as series, or HighCharts will add random colors
            if(this.hcConfig.series.length > this.hcConfig.colors.length) {
                var numInitialColors = this.hcConfig.colors.length;
                for(var i = numInitialColors; i < this.hcConfig.series.length; i++) {
                    this.hcConfig.colors.push(this.hcConfig.colors[i % numInitialColors]);
                }
            }

            this.hcChart = new Highcharts.Chart(this.hcConfig, function(chart) {
                if(this.chartIsStale) {
                    // if new data came in while the chart was rendering, re-draw immediately
                    this.chartIsStale = false;
                    this.draw(this.pendingCallback);
                }
                else {
                    if(!this.chartIsEmpty) {
                        this.onDrawFinished(chart, callback);
                    }
                    // SPL-53261 revealed that the chartIsDrawing flag was not being unset in the case of an empty chart
                    // SPL-48515 and SPL-56383 revealed that the callback was not firing in the case of an empty chart
                    else {
                        this.chartIsDrawing = false;
                        callback(chart);
                    }
                }
            }.bind(this));

        },

        setData: function(data, fieldInfo) {
            clearTimeout(this.drawTimeout);
            this.prepare(data, fieldInfo, this.properties);
        },

        resize: function(width, height) {
            this.chartWidth = width;
            this.chartHeight = height;
            if(this.hcChart) {
                this.hcChart.setSize(width, height, false);
                // need to update the chart options or the stale value will be used
                this.hcChart.options.chart.height = height;
            }
        },

        destroy: function() {
            if(this.hcChart) {
                clearTimeout(this.drawTimeout);
                this.removeLegendHoverEffects();
                this.hcChart.destroy();
                this.hcChart = false;
            }
        },

        // a way to set custom config options on an instance specific basis,
        // will be applied after all other configurations
        setCustomConfig: function(config) {
            this.customConfig = config;
        },

        highlightIndexInLegend: function(index) {
            this.highlightSeriesInLegend(this.hcChart.series[index]);
        },

        unHighlightIndexInLegend: function(index) {
            this.unHighlightSeriesInLegend(this.hcChart.series[index]);
        },

        getChartObject: function() {
            return this.hcChart;
        },

        ///////////////////////////////////////////////////////////////////////////
        // end of "public" interface

        generateDefaultConfig: function() {
            this.hcConfig = $.extend(true, {}, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
                chart: {
                    renderTo: this.renderTo,
                    height: this.chartHeight,
                    className: this.typeName
                }
            });
            this.mapper = new Splunk.JSCharting.PropertyMapper(this.hcConfig);
            this.setColorList(Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS);
        },

        addRenderHooks: function() {
            $.extend(true, this.hcConfig, {
                legend: {
                    hooks: {
                        placementHook: this.legendPlacementHook.bind(this),
                        labelRenderHook: this.legendLabelRenderHook.bind(this)
                    }
                }
            });
        },

        applyFormatting: function(properties, data) {
            this.formatXAxis(properties, data);
            this.formatYAxis(properties, data);
            this.formatTooltip(properties, data);
            this.formatLegend();
        },

        addEventHandlers: function(properties) {
            this.addClickHandlers();
            this.addHoverHandlers();
            this.addLegendHandlers(properties);
            this.addRedrawHandlers();
        },

        processData: function(rawData, fieldInfo, properties) {
            this.processedData = rawData;
            if(!this.processedData || this.processedData.fieldNames.length === 0) {
                this.chartIsEmpty = true;
            }
            else {
                this.chartIsEmpty = false;
                this.addDataToConfig();
            }
        },

        onDrawFinished: function(chart, callback) {
            // SPL-48560: in export mode we need to explicitly close all paths to ensure the fill attr is respected
            if(this.exportMode && chart.options.chart.type === 'area'){
                $.each(chart.series, function(i,series){
                    var d = series.area.attr('d');
                    if(!(d.indexOf('Z') >-1)){
                        series.area.attr({
                            'd': d + ' Z'
                        });
                    }
                });
            }
            if(this.hcConfig.legend.enabled) {
                this.addLegendHoverEffects(chart);

                // SPL-47508: in export mode we have to do a little magic to make the legend symbols align and not overlap
                if(this.exportMode && chart.options.chart.type !== 'scatter') {
                    $(chart.series).each(function(i, loopSeries) {
                        if(!loopSeries.legendSymbol) {
                            return false;
                        }
                        loopSeries.legendSymbol.attr({
                            height: 8,
                            translateY: 4
                        });
                    });
                }
            }
            if(this.testMode) {
                this.addTestingMetadata(chart);
            }
            this.onDrawOrResize(chart);
            this.chartIsDrawing = false;
            this.hcObjectId = chart.container.id;
            if(callback) {
                callback(chart);
            }
        },

        configureEmptyChart: function() {
            $.extend(true, this.hcConfig, {
                yAxis: {
                    tickColor: this.foregroundColorSoft,
                    lineWidth: 1,
                    lineColor: this.foregroundColorSoft,
                    gridLineColor: this.foregroundColorSofter,
                    tickWidth: 1,
                    tickLength: 25,
                    showFirstLabel: false,
                    min: 0,
                    max: (this.logYAxis) ? 2 : 100,
                    tickInterval: (this.logYAxis) ? 1 : 10,
                    labels: {
                        style: {
                            color: this.fontColor
                        },
                        y: 15,
                        formatter: (this.logYAxis) ?
                            function() {
                                return Math.pow(10, this.value);
                            } :
                            function() {
                                return this.value;
                            }
                    },
                    title: {
                        text: null
                    }
                },
                xAxis: {
                    lineColor: this.foregroundColorSoft
                },
                legend: {
                    enabled: false
                },
                series: [
                    {
                        data: [],
                        visible: false,
                        showInLegend: false
                    }
                ]
            });
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for managing chart properties

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);

            switch(key) {

                case 'chart.stackMode':
                    this.mapStackMode(value, properties);
                    break;
                case 'legend.placement':
                    this.mapLegendPlacement(value);
                    break;
                case 'chart.nullValueMode':
                    if(value === 'connect') {
                        this.mapper.mapValue(true, ["plotOptions", "series", "connectNulls"]);
                    }
                    // the distinction between omit and zero is handled by the
                    // extractProcessedData method
                    break;
                case 'secondaryAxis.scale':
                    if(!properties['axisY.scale']) {
                        this.logYAxis = (value === 'log');
                    }
                    break;
                case 'axisY.scale':
                    this.logYAxis = (value === 'log');
                    break;
                case "enableChartClick":
                    this.enableChartClick = value;
                    break;
                case "enableLegendClick":
                    this.enableLegendClick = value;
                    break;
                case 'legend.labelStyle.overflowMode':
                    this.legendEllipsizeMode = value;
                    break;
                case 'legend.masterLegend':
                    // at this point in the partial implementation, the fact that legend.masterLegend is set means
                    // that it has been explicitly disabled
                    this.needsLegendMapping = false;
                    break;
                case 'legend.labels':
                    this.legendLabels = this.parseUtils.stringToArray(value) || [];
                    break;
                case 'seriesColors':
                    var hexArray = this.parseUtils.stringToHexArray(value);
                    if(hexArray && hexArray.length > 0) {
                        this.colorPalette = new Splunk.JSCharting.ListColorPalette(hexArray);
                        this.setColorList(hexArray);
                    }
                    break;
                case 'data.fieldListMode':
                    this.fieldListMode = value;
                    break;
                case 'data.fieldHideList':
                    this.fieldHideList = Splunk.util.stringToFieldList(value) || [];
                    break;
                case 'data.fieldShowList':
                    this.fieldShowList = Splunk.util.stringToFieldList(value) || [];
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        // override
        // this method's purpose is to post-process the properties and resolve any that are interdependent
        performPropertyCleanup: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    backgroundColor: this.backgroundColor,
                    borderColor: this.backgroundColor
                },
                legend: {
                    itemStyle: {
                        color: this.fontColor
                    },
                    itemHoverStyle: {
                        color: this.fontColor
                    }
                },
                tooltip: {
                    borderColor: this.foregroundColorSoft
                }
            });
            if(this.exportMode) {
                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            enableMouseTracking: false,
                            shadow: false
                        }
                    }
                });
            }
        },

        mapStackMode: function(name, properties) {
            if(properties['layout.splitSeries'] == 'true') {
                name = 'default';
            }
            var translation = {
                "default": null,
                "stacked": "normal",
                "stacked100": "percent"
            };
            this.mapper.mapValue(translation[name], ["plotOptions", "series", "stacking"]);
        },

        mapLegendPlacement: function(name) {
            if(name in {left: 1, right: 1}) {
                this.mapper.mapObject({
                    legend: {
                        enabled: true,
                        verticalAlign: 'middle',
                        align: name,
                        layout: 'vertical',
                        x: 0
                    }
                });
            }
            else if(name in {bottom: 1, top: 1}) {
                this.mapper.mapObject({
                    legend: {
                        enabled: true,
                        verticalAlign: name,
                        align: 'center',
                        layout: 'horizontal',
                        margin: 15,
                        y: (name == 'bottom') ? -5 : 0
                    }
                });
            }
            else {
                this.mapper.mapObject({
                    legend: {
                        enabled: false
                    }
                });
            }
        },

        setExportDimensions: function() {
            this.chartWidth = 600;
            this.chartHeight = 400;
            this.mapper.mapObject({
                chart: {
                width: 600,
                height: 400
                }
            });
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for handling label and axis formatting

        formatXAxis: function(properties, data) {
            var axisType = data.xAxisType,
                axisProperties = this.parseUtils.getXAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'vertical' : 'horizontal',
                colorScheme = this.getAxisColorScheme();
            // add some extra info to the axisProperties as needed
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).width();
            if(axisProperties['axisTitle.text']){
                axisProperties['axisTitle.text'] = Splunk.JSCharting.ParsingUtils.escapeHtml(axisProperties['axisTitle.text']);
            }

            switch(axisType) {
                case 'category':
                    this.xAxis = new Splunk.JSCharting.CategoryAxis(axisProperties, data, orientation, colorScheme);
                    break;
                case 'time':
                    this.xAxis = new Splunk.JSCharting.TimeAxis(axisProperties, data, orientation, colorScheme, this.exportMode);
                    break;
                default:
                    // assumes a numeric axis
                    this.xAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
                    break;

            }
            this.hcConfig.xAxis = this.xAxis.getConfig();
            if(this.exportMode && (axisType === 'time')) {
                var xAxisMargin,
                    spanSeries = data._spanSeries,
                    span = (spanSeries && spanSeries.length > 0) ? parseInt(spanSeries[0], 10) : 1,
                    secsPerDay = 60 * 60 * 24,
                    secsPerYear = secsPerDay * 365;

                if(span >= secsPerYear) {
                    xAxisMargin = 15;
                }
                else if(span >= secsPerDay) {
                    xAxisMargin = 25;
                }
                else {
                    xAxisMargin = 35;
                }
                this.hcConfig.xAxis.title.margin = xAxisMargin;
            }
            if(typeof this.hcConfig.xAxis.title.text === 'undefined') {
                this.hcConfig.xAxis.title.text = this.processedData.xAxisKey;
            }
        },

        formatYAxis: function(properties, data) {
            var axisProperties = this.parseUtils.getYAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'horizontal' : 'vertical',
                colorScheme = this.getAxisColorScheme();

            // add some extra info to the axisProperties as needed
            if(axisProperties['axisTitle.text']){
                axisProperties['axisTitle.text'] = Splunk.JSCharting.ParsingUtils.escapeHtml(axisProperties['axisTitle.text']);
            }
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).height();
            axisProperties.percentMode = (this.properties['chart.stackMode'] === 'stacked100');

            this.yAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
            this.hcConfig.yAxis = this.yAxis.getConfig();
            if((typeof this.hcConfig.yAxis.title.text === 'undefined') && this.processedData.fieldNames.length === 1) {
                this.hcConfig.yAxis.title.text = this.processedData.fieldNames[0];
            }
        },

        getAxisColorScheme: function() {
            return {
                foregroundColorSoft: this.foregroundColorSoft,
                foregroundColorSofter: this.foregroundColorSofter,
                fontColor: this.fontColor
            };
        },

        formatTooltip: function(properties, data) {
            var xAxisKey = this.xAxis.getKey(),
                resolveX = this.xAxis.formatTooltipValue.bind(this.xAxis),
                resolveY = this.yAxis.formatTooltipValue.bind(this.yAxis);
            this.mapper.mapObject({
                tooltip: {
                    formatter: function() {
                        var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.point.series.color);
                        return [
                          '<span style="color:#cccccc">', ((data.xAxisType == 'time') ? 'time: ' : xAxisKey + ': '), '</span>',
                          '<span style="color:#ffffff">', resolveX(this, "x"), '</span>', '<br/>',
                          '<span style="color:', seriesColorRgb, '">', Splunk.JSCharting.ParsingUtils.escapeHtml(this.series.name), ': </span>',
                          '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                        ].join('');
                    }
                }
            });
        },

        formatLegend: function() {
            $.extend(true, this.hcConfig, {
                legend: {
                    labelFormatter: function() {
                        return Splunk.JSCharting.ParsingUtils.escapeHtml(this.name);
                    }
                }
            });
        },

        legendPlacementHook: function(options, width, height, spacingBox) {
            if(this.hcConfig.legend.layout === 'vertical') {
                if(height >= spacingBox.height) {
                    // if the legend is taller than the chart height, clip it to the top of the chart
                    options.verticalAlign = 'top';
                    options.y = 0;
                }
                else if(this.properties['layout.splitSeries'] !== "true") {
                    // a bit of a hack here...
                    // at this point in the HighCharts rendering process we don't know the height of the x-axis
                    // and can't factor it into the vertical alignment of the legend
                    // so we make an educated guess based on what we know about the charting configuration
                    var bottomSpacing, timeSpan;
                    if(this.processedData.xAxisType === "time" && !this.axesAreInverted) {
                        timeSpan = (this.processedData._spanSeries) ? parseInt(this.processedData._spanSeries[0], 10) : 1;
                        bottomSpacing = (timeSpan >= (24 * 60 * 60)) ? 28 : 42;
                    }
                    else {
                        bottomSpacing = 13;
                    }
                    options.y = -bottomSpacing / 2;
                }
            }
        },

        legendLabelRenderHook: function(items, options, itemStyle, spacingBox, renderer) {
            var i, adjusted, fixedWidth, maxWidth,
                horizontalLayout = (options.layout === 'horizontal'),
                defaultFontSize = 12,
                minFontSize = 10,
                symbolWidth = options.symbolWidth,
                symbolPadding = options.symbolPadding,
                itemHorizSpacing = 10,
                labels = [],
                formatter = new Splunk.JSCharting.FormattingHelper(renderer),
                ellipsisModeMap = {
                    'default': 'start',
                    'ellipsisStart': 'start',
                    'ellipsisMiddle': 'middle',
                    'ellipsisEnd': 'end',
                    'ellipsisNone': 'none'
                };

            if(horizontalLayout) {
                maxWidth = (items.length > 5) ? Math.floor(spacingBox.width / 6) :
                                Math.floor(spacingBox.width / items.length) - (symbolWidth + symbolPadding + itemHorizSpacing);
            }
            else {
                maxWidth = Math.floor(spacingBox.width / 6);
            }
            // make a copy of the original formatting function, since we're going to clobber it
            if(!options.originalFormatter) {
                options.originalFormatter = options.labelFormatter;
            }
            // get all of the legend labels
            for(i = 0; i < items.length; i++) {
                labels.push(options.originalFormatter.call(items[i]));
            }

            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize,
                    ellipsisModeMap[this.legendEllipsizeMode] || 'middle');

            // in case of horizontal layout with ellipsized labels, set a fixed width for nice alignment
            if(adjusted.areEllipsized && horizontalLayout && items.length > 5) {
                fixedWidth = maxWidth + symbolWidth + symbolPadding + itemHorizSpacing;
                options.itemWidth = fixedWidth;
            }
            else {
                options.itemWidth = undefined;
            }

            // set the new labels to the name field of each item
            for(i = 0; i < items.length; i++) {
                items[i].ellipsizedName = adjusted.labels[i];
                // if the legendItem is already set this is a resize event, so we need to explicitly reformat the item
                if(items[i].legendItem) {
                    formatter.setElementText(items[i].legendItem, adjusted.labels[i]);
                    items[i].legendItem.css({'font-size': adjusted.fontSize + 'px'});
                }
            }
            // now that the ellipsizedName field has the pre-formatted labels, update the label formatter
            options.labelFormatter = function() {
                return this.ellipsizedName;
            };
            // adjust the font size
            itemStyle['font-size'] = adjusted.fontSize + 'px';
            formatter.destroy();
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for attaching event handlers

        addClickHandlers: function() {
            if(this.enableChartClick) {
                var self = this;

                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            point: {
                                events: {
                                    click: function(event) {
                                        self.onPointClick.call(self, this, event);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },

        addHoverHandlers: function() {
            var that = this,
                properties = {
                    highlightDelay: 125,
                    unhighlightDelay: 50,
                    onMouseOver: function(point) {
                        that.onPointMouseOver(point);
                    },
                    onMouseOut: function(point) {
                        that.onPointMouseOut(point);
                    }
                },
            throttle = new this.Throttler(properties);

            $.extend(true, this.hcConfig, {
                plotOptions: {
                    series: {
                        point: {
                            events: {
                                mouseOver: function() {
                                    var point = this;
                                    throttle.mouseOverHappened(point);
                                },
                                mouseOut: function() {
                                    var point = this;
                                    throttle.mouseOutHappened(point);
                                }
                            }
                        }
                    }
                }
            });
        },

        onPointClick: function(point, domEvent) {
            var xAxisKey = this.processedData.xAxisKey,
                xAxisType = this.processedData.xAxisType,
                event = {
                    fields: [xAxisKey, point.series.name],
                    data: {},
                    domEvent: domEvent
                };

            event.data[point.series.name] = point.y;
            if(xAxisType == "time") {
                event.data._span = point._span;
                event.data[xAxisKey] = Splunk.util.getEpochTimeFromISO(point.name);
            }
            else {
                event.data[xAxisKey] = (xAxisType == 'category') ? point.name : point.x;
            }

            // determine the point's index in its series,
            // this allows upstream handlers to add row context to drilldown events
            var i,
                series = point.series;

            if(series && series.data && series.data.length > 0) {
                for(i = 0; i < series.data.length; i++) {
                    if(series.data[i] === point) {
                        event.pointIndex = i;
                        break;
                    }
                }
            }

            this.dispatchEvent('chartClicked', event);
        },

        onPointMouseOver: function(point) {
            var series = point.series;
            this.highlightThisSeries(series);
            this.highlightSeriesInLegend(series);
        },

        onPointMouseOut: function(point) {
            var series = point.series;
            this.unHighlightThisSeries(series);
            this.unHighlightSeriesInLegend(series);
        },

        addLegendHandlers: function(properties) {
            var self = this;
            if(this.enableLegendClick) {
                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            events: {
                                legendItemClick: function(event) {
                                    return self.onLegendClick.call(self, this, event);
                                }
                            }
                        }
                    },
                    legend: {
                        itemStyle: {
                            cursor: 'pointer'
                        },
                        itemHoverStyle: {
                            cursor: 'pointer'
                        }
                    }
                });
            }
        },

        onLegendClick: function(series, domEvent) {
            var event = {
                text: series.name,
                domEvent: domEvent
            };
            this.dispatchEvent('legendClicked', event);
            return false;
        },

        addLegendHoverEffects: function(chart) {
            var that = this,
                properties = {
                    highlightDelay: 125,
                    unhighlightDelay: 50,
                    onMouseOver: function(series) {
                        that.onLegendMouseOver(series);
                    },
                    onMouseOut: function(series) {
                        that.onLegendMouseOut(series);
                    }
                },
            throttle = new this.Throttler(properties);

            $(chart.series).each(function(i, loopSeries) {
                $(that.getSeriesLegendElements(loopSeries)).each(function(j, element) {
                    $(element).bind('mouseover.splunk_jscharting', function() {
                        throttle.mouseOverHappened(loopSeries);
                    });
                    $(element).bind('mouseout.splunk_jscharting', function() {
                       throttle.mouseOutHappened(loopSeries);
                    });
                });
            });
        },

        removeLegendHoverEffects: function() {
            if(this.hcChart) {
                var self = this;
                $(this.hcChart.series).each(function(i, loopSeries) {
                    $(self.getSeriesLegendElements(loopSeries)).each(function(j, element) {
                        $(element).unbind('.splunk_jscharting');
                    });
                });
            }
        },

        onLegendMouseOver: function(series) {
            this.highlightThisSeries(series);
            this.highlightSeriesInLegend(series);
        },

        onLegendMouseOut: function(series) {
            this.unHighlightThisSeries(series);
            this.unHighlightSeriesInLegend(series);
        },

        addRedrawHandlers: function(chart) {
            var self = this;
            $.extend(true, this.hcConfig, {
                chart: {
                    events: {
                        redraw: function() {
                            self.onDrawOrResize.call(self, this);
                        }
                    }
                }
            });
        },

        onDrawOrResize: function(chart) {
            var formatter = new Splunk.JSCharting.FormattingHelper(chart.renderer);
            if(this.xAxis) {
                this.xAxis.onDrawOrResize(chart, formatter);
            }
            if(this.yAxis) {
                this.yAxis.onDrawOrResize(chart, formatter);
            }
            formatter.destroy();
        },

        highlightThisSeries: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var chart = series.chart,
                index = series.index;
            $(chart.series).each(function(i, loopSeries) {
                if(i !== index) {
                    this.fadeSeries(loopSeries);
                } else {
                    this.focusSeries(loopSeries);
                }
            }.bind(this));
        },

        fadeSeries: function(series) {
            if(!series || !series.data) {
                return;
            }
            for(var i = 0; i < series.data.length; i++) {
                this.fadePoint(series.data[i], series);
            }
        },

        fadePoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            point.graphic.attr('fill', this.fadedElementColor);
        },

        unHighlightThisSeries: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var chart = series.chart,
                index = series.index;

            $(chart.series).each(function(i, loopSeries) {
                if(i !== index) {
                    this.focusSeries(loopSeries);
                }
            }.bind(this));
        },

        focusSeries: function(series) {
            if(!series || !series.data) {
                return;
            }
            for(var i = 0; i < series.data.length; i++) {
                this.focusPoint(series.data[i], series);
            }
        },

        focusPoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            series = series || point.series;
            point.graphic.attr({'fill': series.color});
        },

        highlightSeriesInLegend: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var i, loopSeries,
                chart = series.chart,
                index = series.index;

            for(i = 0; i < chart.series.length; i++) {
                loopSeries = chart.series[i];
                if(i !== index) {
                    if(!loopSeries) {
                        break;
                    }
                    if(loopSeries.legendItem) {
                        loopSeries.legendItem.attr('fill-opacity', this.fadedElementOpacity);
                    }
                    if(loopSeries.legendLine) {
                        loopSeries.legendLine.attr('stroke', this.fadedElementColor);
                    }
                    if(loopSeries.legendSymbol) {
                        loopSeries.legendSymbol.attr('fill', this.fadedElementColor);
                    }
                } else {
                    if(loopSeries.legendItem) {
                        loopSeries.legendItem.attr('fill-opacity', 1.0);
                    }
                    if(loopSeries.legendLine) {
                        loopSeries.legendLine.attr({'stroke': loopSeries.color, 'stroke-opacity': 1.0});
                    }
                    if(loopSeries.legendSymbol) {
                        loopSeries.legendSymbol.attr({'fill': loopSeries.color, 'fill-opacity': 1.0});
                    }
                }
            }
        },

        unHighlightSeriesInLegend: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var i, loopSeries,
                chart = series.chart,
                index = series.index;

            for(i = 0; i < chart.series.length; i++) {
                if(i !== index) {
                    loopSeries = chart.series[i];
                    if(!loopSeries) {
                        break;
                    }
                    if(loopSeries.legendItem) {
                        loopSeries.legendItem.attr('fill-opacity', 1.0);
                    }
                    if(loopSeries.legendLine) {
                        loopSeries.legendLine.attr({'stroke': loopSeries.color, 'stroke-opacity': 1.0});
                    }
                    if(loopSeries.legendSymbol) {
                        loopSeries.legendSymbol.attr({'fill': loopSeries.color, 'fill-opacity': 1.0});
                    }
                }
            }
        },

        getSeriesLegendElements: function(series) {
            var elements = [];
            if(series.legendItem) {
                elements.push(series.legendItem.element);
            }
            if(series.legendSymbol) {
                elements.push(series.legendSymbol.element);
            }
            if(series.legendLine) {
                elements.push(series.legendLine.element);
            }
            return elements;
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for processing data

        addDataToConfig: function() {
            var i, j, seriesObject, loopSeries, prevSeries, loopPoint, prevStackedTotal,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series;

            for(i = 0; i < fieldNames.length; i++) {
                if(this.shouldShowSeries(fieldNames[i], this.properties)) {
                    seriesObject = this.constructSeriesObject(fieldNames[i], series[fieldNames[i]], this.properties);
                    this.hcConfig.series.push(seriesObject);
                }
            }
            // if the legend labels have been set by the user, honor them here
            if(this.legendLabels.length > 0) {
                var label, name,
                    newSeriesList = [],

                    // helper function for finding a series by its name
                    findInSeriesList = function(name) {
                        for(var j = 0; j < this.hcConfig.series.length; j++) {
                            if(this.hcConfig.series[j].name === name) {
                                return this.hcConfig.series[j];
                            }
                        }
                        return false;
                    }.bind(this);

                // first loop through the legend labels, either get the series for that field if it already exists
                // or add an empty field if it doesn't
                for(i = 0; i < this.legendLabels.length; i++) {
                    label = this.legendLabels[i];
                    loopSeries = findInSeriesList(label);
                    if(loopSeries) {
                        newSeriesList.push(loopSeries);
                    }
                    else {
                        newSeriesList.push({
                            name: label,
                            data: []
                        });
                    }
                }

                // then loop through the series data and add back any series that weren't in the legend label list
                for(i = 0; i < this.hcConfig.series.length; i++) {
                    name = this.hcConfig.series[i].name;
                    if($.inArray(name, this.legendLabels) === -1) {
                        newSeriesList.push(this.hcConfig.series[i]);
                    }
                }
                this.hcConfig.series = newSeriesList;
            }

            // SPL-50950: to correctly handle stacked mode with log axes, we have to reduce each point's y value to
            // the post-log difference between its value and the sum of the ones before it
            // SPL-55980: bypass this logic for line charts since they are never stacked
            if(this.logYAxis && (this.properties['chart.stackMode'] in { 'stacked': true, 'stacked100': true }) && this.properties['chart'] !== 'line') {
                var numSeries = this.hcConfig.series.length,
                    lastSeries = this.hcConfig.series[numSeries - 1];

                // initialize the 'stackedTotal' of each point in the last (aka bottom) series to its pre-log y value
                for(i = 0; i < lastSeries.data.length; i++) {
                    lastSeries.data[i].stackedTotal = lastSeries.data[i].rawY;
                }
                // loop through the series list backward so that we traverse bottom to top, starting with the
                // second from the bottom
                for(i = numSeries - 2; i >= 0; i--) {
                    loopSeries = this.hcConfig.series[i];
                    prevSeries = this.hcConfig.series[i + 1];
                    for(j = 0; j < loopSeries.data.length; j++) {
                        loopPoint = loopSeries.data[j];
                        prevStackedTotal = prevSeries.data[j].stackedTotal;
                        // adjust the point's y value based on the previous point's stacked total
                        loopPoint.y = this.mathUtils.absLogBaseTen(prevStackedTotal + loopPoint.rawY)
                                            - this.mathUtils.absLogBaseTen(prevStackedTotal);
                        // also update the points stacked total for the next point to use
                        loopPoint.stackedTotal = prevStackedTotal + loopPoint.rawY;
                    }
                }
            }
        },

        // returns false if series should not be added to the chart
        shouldShowSeries: function(name, properties) {
            // first respect the field hide list that came from the parent module
            if(properties.fieldHideList && $.inArray(name, properties.fieldHideList) > -1) {
                return false;
            }
            // next process the field visibility lists from the xml
            if(this.fieldListMode === 'show_hide') {
                if($.inArray(name, this.fieldHideList) > -1 && $.inArray(name, this.fieldShowList) < 0) {
                    return false;
                }
            }
            else {
                // assumes 'hide_show' mode
                if($.inArray(name, this.fieldHideList) > -1) {
                    return false;
                }
            }
            return true;
        },

        constructSeriesObject: function(name, data, properties) {
            for(var i = 0; i < data.length; i++) {
                if(isNaN(data[i].rawY)) {
                    if(properties['chart.nullValueMode'] === 'zero') {
                        data[i].y = 0;
                    }
                    else {
                        // the distinction between gaps and connect is handled by
                        // the applyPropertyByName method
                        data[i].y = null;
                    }
                }
                else if(this.logYAxis) {
                    data[i].y = this.mathUtils.absLogBaseTen(data[i].rawY);
                }
                else {
                    data[i].y = data[i].rawY;
                }
            }
            return {
                name: name,
                data: data
            };
        },

        ////////////////////////////////////////////////////////////////////////////
        // methods for adding testing metadata
        //
        // no other code should rely on the classes added here!

        addTestingMetadata: function(chart) {
            var tooltipRefresh = chart.tooltip.refresh,
                decorateTooltip = (this.processedData.xAxisType === 'time') ?
                        this.addTimeTooltipClasses.bind(this) : this.addTooltipClasses.bind(this);

            this.addDataClasses(chart);
            this.addAxisClasses(chart);
            if(chart.options.legend.enabled) {
                this.addLegendClasses(chart);
            }
            chart.tooltip.refresh = function(point) {
                tooltipRefresh(point);
                decorateTooltip(chart);
            }.bind(this);
        },

        addDataClasses: function(chart) {
            var seriesName, dataElements;

            $('.highcharts-series', $(this.renderTo)).each(function(i, series) {
                seriesName = chart.series[i].name;
                $(series).attr('id', seriesName + '-series');
                if(this.hasSVG) {
                    dataElements = $('rect, path', $(series));
                }
                else {
                    dataElements = $('shape', $(series));
                }
                dataElements.each(function(j, elem) {
                    this.addClassToElement(elem, 'spl-display-object');
                }.bind(this));
            }.bind(this));
        },

        addAxisClasses: function(chart) {
            var i, labelElements;

            $('.highcharts-axis', $(this.renderTo)).each(function(i, elem) {
                if(this.hasSVG) {
                    var loopBBox = elem.getBBox();
                    if(loopBBox.width > loopBBox.height) {
                        this.addClassToElement(elem, 'horizontal-axis');
                    }
                    else {
                        this.addClassToElement(elem, 'vertical-axis');
                    }
                    labelElements = $('text', $(elem));
                }
                else {
                    var firstSpan, secondSpan,
                        $spans = $('span', $(elem));
                    if($spans.length < 2) {
                        return;
                    }
                    firstSpan = $spans[0];
                    secondSpan = $spans[1];
                    if(firstSpan.style.top == secondSpan.style.top) {
                        this.addClassToElement(elem, 'horizontal-axis');
                    }
                    else {
                        this.addClassToElement(elem, 'vertical-axis');
                    }
                    labelElements = $('span', $(elem));
                }
                labelElements.each(function(j, label) {
                    this.addClassToElement(label, 'spl-text-label');
                }.bind(this));
            }.bind(this));

            for(i = 0; i < chart.xAxis.length; i++) {
                if(chart.xAxis[i].axisTitle) {
                    this.addClassToElement(chart.xAxis[i].axisTitle.element, 'x-axis-title');
                }
            }
            for(i = 0; i < chart.yAxis.length; i++) {
                if(chart.yAxis[i].axisTitle) {
                    this.addClassToElement(chart.yAxis[i].axisTitle.element, 'y-axis-title');
                }
            }
        },

        addTooltipClasses: function(chart) {
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                                  $('span > span', $tooltip);

            for(i = 0; i < tooltipElements.length; i += 2) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },

        addTimeTooltipClasses: function(chart) {
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                              $('span > span', $tooltip);

            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');

            for(i = 2; i < tooltipElements.length; i += 2) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },

        addLegendClasses: function(chart) {
            var loopSeriesName;
            $(chart.series).each(function(i, series) {
                loopSeriesName = (this.hasSVG) ? series.legendItem.textStr :
                                                 $(series.legendItem.element).html();
                if(series.legendSymbol) {
                    this.addClassToElement(series.legendSymbol.element, 'symbol');
                    this.addClassToElement(series.legendSymbol.element, loopSeriesName + '-symbol');
                }
                if(series.legendLine) {
                    this.addClassToElement(series.legendLine.element, 'symbol');
                    this.addClassToElement(series.legendLine.element, loopSeriesName + '-symbol');
                }
                if(series.legendItem) {
                    this.addClassToElement(series.legendItem.element, 'legend-label');
                }
            }.bind(this));
        }

    });

    Splunk.JSCharting.DEFAULT_HC_CONFIG = {
        chart: {
            animation: false,
            showAxes: true,
            reflow: true,
            spacingTop: 0,
            spacingBottom: 5,
            spacingLeft: 0
        },
        plotOptions: {
            series: {
                animation: false,
                stickyTracking: false,
                events: {
                    legendItemClick: function() {
                        return false;
                    }
                },
                borderWidth: 0
            }
        },
        series: [],
        title: {
            text: null
        },
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0,
            layout: 'vertical',
            enabled: true,
            itemStyle: {
                cursor: 'auto'
            },
            itemHoverStyle: {
                cursor: 'auto'
            }
        },
        tooltip: {
            backgroundColor: '#000000'
        },
        credits: {
            enabled: false
        }
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.SeriesBasedChart
    //
    // super-class for line and area charts


    Splunk.JSCharting.SeriesBasedChart = $.klass(Splunk.JSCharting.AbstractChart, {

        // override
        generateDefaultConfig: function($super) {
            $super();
            this.mapper.mapValue(true, ['plotOptions', 'series', 'stickyTracking']);
            $.extend(true, this.hcConfig, {
                plotOptions: {
                    series: {
                        hooks: {
                            onSegmentsDefined: this.segmentsDefinedHook.bind(this)
                        }
                    }
                }
            });
        },

        // override
        highlightThisSeries: function($super, series) {
            $super(series);
            if(series && series.group) {
                series.group.toFront();
            }
        },

        addHoverHandlers: function() {
            var self = this;
            $.extend(true, this.hcConfig, {
                plotOptions: {
                    series: {
                        point: {
                            events: {
                                mouseOver: function() {
                                    var point = this;
                                    self.onPointMouseOver.call(self, point);
                                },
                                mouseOut: function() {
                                    var point = this;
                                    self.onPointMouseOut.call(self, point);
                                }
                            }
                        }
                    }
                }
            });
        },

        segmentsDefinedHook: function(segments) {
            // SPL-55213, we want to handle the case where some segments contain a single point and would not be visible
            // if showMarkers is true, the marker will take care of what we want, so we're done
            if(this.showMarkers) {
                return;
            }
            for(var i = 0; i < segments.length; i++) {
                // a segments with a length of one contains a single point
                // extend the point's options to draw a small marker on it
                if(segments[i].length === 1) {
                    $.extend(true, segments[i][0].options, {
                        marker: {
                            enabled: true,
                            radius: 4
                        }
                    });
                }
            }
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PointBasedChart
    //
    // super-class for column, bar, scatter and pie charts


    Splunk.JSCharting.PointBasedChart = $.klass(Splunk.JSCharting.AbstractChart, {

        fadedElementBorderColor: 'rgba(200, 200, 200, 0.3)',

        // override
        // point-based charts need to defensively ignore null-value mode,
        // since 'connect' will lead to unexpected results
        applyPropertyByName: function($super, key, value, properties) {
            var keysToIgnore = {
                'chart.nullValueMode': true
            };

            if(key in keysToIgnore) {
                return;
            }
            $super(key, value, properties);
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            this.mapper.mapValue(false, ['plotOptions', 'series', 'enableMouseTracking']);
        },

        // override
        addEventHandlers: function($super, properties) {
            $super(properties);
            var self = this;
            $.extend(true, this.hcConfig, {
                chart: {
                    events: {
                        load: function() {
                            var chart = this,
                                tooltipSelector = ".highcharts-tooltip *",
                                hoveredPoint = null,
                                tooltipHide = chart.tooltip.hide,
                                // re-usable function to extract the corresponding point from an event
                                extractPoint = function(event) {
                                    var $target = $(event.target);
                                    if(!$target.is(self.pointCssSelector)) {
                                        return false;
                                    }
                                    return (chart.series[$target.attr('data-series')].data[$target.attr('data-point')]);
                                };

                            // with the VML renderer, have to explicitly destroy the tracker so it doesn't block mouse events
                            if(!self.hasSVG && chart.tracker) {
                                chart.tracker.destroy();
                            }
                            // create a closure around the tooltip hide method so that we can make sure we always hide the selected series when it is called
                            // this is a work-around for the situation when the mouse moves out of the chart container element without triggering a mouse event
                            chart.tooltip.hide = function(silent) {
                                tooltipHide();
                                if(!silent && hoveredPoint) {
                                    hoveredPoint.firePointEvent('mouseOut');
                                    hoveredPoint = null;
                                }
                            };

                            // decorate each point element with the info we need to map it to its corresponding data object
                            $(chart.series).each(function(i, series) {
                                $(series.data).each(function(j, point) {
                                    if(point.graphic && point.graphic.element) {
                                        $(point.graphic.element).attr('data-series', i);
                                        $(point.graphic.element).attr('data-point', j);
                                    }
                                });
                            });
                            // we are not using mouse trackers, so attach event handlers to the chart's container element
                            $(chart.container).bind('click.splunk_jscharting', function(event) {
                                var point = extractPoint(event);
                                if(point) {
                                    point.firePointEvent('click', event);
                                }
                            });
                            // handle all mouseover events in the container here
                            // if they are over the tooltip, ignore them (this avoids the dreaded tooltip flicker)
                            // otherwise hide any point that is currently in a 'hover' state and 'hover' the target point as needed
                            $(chart.container).bind('mouseover.splunk_jscharting', function(event) {
                                if($(event.target).is(tooltipSelector)) {
                                    return;
                                }
                                var point = extractPoint(event);
                                if(hoveredPoint && !(point && hoveredPoint === point)) {
                                    hoveredPoint.firePointEvent('mouseOut');
                                    chart.tooltip.hide(true);
                                    hoveredPoint = null;
                                }
                                if(point) {
                                    point.firePointEvent('mouseOver');
                                    chart.tooltip.refresh(point);
                                    hoveredPoint = point;
                                }
                            });
                        }
                    }
                }
            });
        },

        // override
        destroy: function($super) {
            if(this.hcChart) {
                $(this.hcChart.container).unbind('splunk_jscharting');
            }
            $super();
        },

        // override
        onPointMouseOver: function($super, point) {
            $super(point);
            this.highlightPoint(point);
        },

        // override
        onPointMouseOut: function($super, point) {
            $super(point);
            this.unHighlightPoint(point);
        },

        highlightPoint: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;

            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(loopPoint !== point && loopPoint.graphic) {
                    this.fadePoint(loopPoint, series);
                } else {
                    this.focusPoint(loopPoint, series);
                }
            }
        },

        unHighlightPoint: function(point) {
            if(!point || !point.series) {
                return;
            }
            var series = point.series;

            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(loopPoint !== point && loopPoint.graphic) {
                    this.focusPoint(loopPoint, series);
                }
            }
        },

        // doing full overrides here to avoid a double-repaint, even though there is some duplicate code
        // override
        fadePoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            point.graphic.attr({'fill': this.fadedElementColor, 'stroke-width': 1, 'stroke': this.fadedElementBorderColor});
        },

        // override
        focusPoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            series = series || point.series;

            point.graphic.attr({
                'fill': series.color,
                'stroke-width': 0,
                'stroke': series.color
            });
        },

        fadeAllPoints: function() {
            if(!this.hcChart) {
                return;
            }
            for(var i = 0; i < this.hcChart.series.length; i++) {
                this.fadeSeries(this.hcChart.series[i]);
            }
        },

        unFadeAllPoints: function() {
            if(!this.hcChart) {
                return;
            }
            for(var i = 0; i < this.hcChart.series.length; i++) {
                this.focusSeries(this.hcChart.series[i]);
            }
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.LineChart


    Splunk.JSCharting.LineChart = $.klass(Splunk.JSCharting.SeriesBasedChart, {

        typeName: 'line-chart',
        fadedElementColor: 'rgba(200, 200, 200, 1.0)',
        fadedLineColor: 'rgba(150, 150, 150, 0.3)',

        // override
        initialize: function($super, container) {
            $super(container);
            this.markerRadius = 8;
            this.showMarkers = false;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'line'
                }
            });
            this.hcConfig.plotOptions.line.marker.states.hover.radius = this.markerRadius;
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);

            switch(key) {

                case 'chart.showMarkers':
                    this.showMarkers = (value === 'true');
                    this.mapper.mapValue((value === 'true' ? this.markerRadius : 0), ["plotOptions", "line", "marker", "radius"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;

            }
        },

        mapStackMode: function(name, properties) {
            // no-op, line charts ignore stack mode
        },

        fadeSeries: function($super, series) {
            if(!series || !series.graph) {
                return;
            }
            series.graph.attr({'stroke': this.fadedLineColor});
            $super(series);
        },

        focusSeries: function($super, series) {
            if(!series || !series.graph) {
                return;
            }
            series.graph.attr({'stroke': series.color, 'stroke-opacity': this.focusedElementOpacity});
            $super(series);
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            line: {
                marker: {
                    states: {
                        hover: {
                            enabled: true,
                            symbol: 'square'
                        }
                    },
                    radius: 0,
                    symbol: 'square'
                },
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AreaChart


    Splunk.JSCharting.AreaChart = $.klass(Splunk.JSCharting.SeriesBasedChart, {

        typeName: 'area-chart',
        focusedElementOpacity: 0.75,

        // override
        generateDefaultConfig: function($super) {
            $super();
            this.showLines = true;
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'area'
                },
                plotOptions: {
                    area: {
                        fillOpacity: this.focusedElementOpacity
                    }
                }
            });
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {

                case 'chart.showLines':
                    this.showLines = (value === 'false');
                    this.mapper.mapValue((value === 'false') ? 0 : 1, ["plotOptions", "area", "lineWidth"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;

            }
        },

        // override
        fadeSeries: function(series) {
            if(!series || !series.area) {
                return;
            }
            series.area.attr({'fill': this.fadedElementColor});
            if(this.showLines) {
                series.graph.attr({'stroke': this.fadedElementColor});
            }
        },

        // override
        focusSeries: function(series) {
            if(!series || !series.area) {
                return;
            }
            series.area.attr({'fill': series.color, 'fill-opacity': this.focusedElementOpacity});
            if(this.showLines) {
                series.graph.attr({'stroke': series.color, 'stroke-opacity': this.focusedElementOpacity});
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            area: {
                marker: {
                    symbol: 'square',
                    radius: 0,
                    states: {
                        hover: {
                            enabled: true,
                            symbol: 'square',
                            radius: 8
                        }
                    }
                },
                lineWidth: 1,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ColumnChart


    Splunk.JSCharting.ColumnChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        typeName: 'column-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series rect' : '.highcharts-series shape',

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'column'
                }
            });
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);

            switch(key) {

                case 'chart.columnSpacing':
                    this.mapColumnSpacing(value);
                    break;
                case 'chart.seriesSpacing':
                    this.mapSeriesSpacing(value);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        mapColumnSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue((value < 3) ? 0.05 + ((value - 1) / 5) : 0.05 + ((value - 1) / 15), ["plotOptions", "column", "groupPadding"]);
            }
        },

        mapSeriesSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.2 * Math.pow(value, 0.25), ["plotOptions", "column", "pointPadding"]);
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            column: {
                pointPadding: 0,
                groupPadding: 0.05,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.BarChart


    Splunk.JSCharting.BarChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        axesAreInverted: true,
        typeName: 'bar-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series rect' : '.highcharts-series shape',

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'bar',
                    spacingBottom: 15
                }
            });
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);

            switch(key) {

                case 'chart.barSpacing':
                    this.mapBarSpacing(value);
                    break;
                case 'chart.seriesSpacing':
                    this.mapSeriesSpacing(value);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        mapBarSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.05 + ((value - 1) / 20), ["plotOptions", "bar", "groupPadding"]);
            }
        },

        mapSeriesSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.2 * Math.pow(value, 0.25), ["plotOptions", "bar", "pointPadding"]);
            }
        },

        // override
        configureEmptyChart: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                yAxis: {
                    labels: {
                        align: 'right',
                        x: -5
                    }
                }
            });
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            bar: {
                pointPadding: 0,
                groupPadding: 0.05,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ScatterChart


    Splunk.JSCharting.ScatterChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        typeName: 'scatter-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series path' : '.highcharts-series shape',

        initialize: function($super, container) {
            $super(container);
            this.mode = 'multiSeries';
            this.legendFieldNames = [];
            this.logXAxis = false;
        },

        // override
        getFieldList: function() {
            return this.legendFieldNames;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'scatter'
                }
            });
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {

                case 'chart.markerSize':
                    this.mapMarkerSize(value);
                    break;
                case 'primaryAxis.scale':
                    if(!properties['axisX.scale']) {
                        this.logXAxis = (value === 'log');
                    }
                    break;
                case 'axisX.scale':
                    this.logXAxis = (value === 'log');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        mapMarkerSize: function(valueStr) {
            var value = parseInt(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(Math.ceil(value * 7 / 4), ["plotOptions", "scatter", "marker", "radius"]);
            }
        },

        setMode: function(mode) {
            this.mode = mode;
            if(mode === 'singleSeries') {
                $.extend(true, this.hcConfig, {
                    legend: {
                        enabled: false
                    }
                });
            }
        },

        // override
        // force the x axis to be numeric
        formatXAxis: function(properties, data) {
            var axisProperties = this.parseUtils.getXAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'vertical' : 'horizontal',
                colorScheme = this.getAxisColorScheme();

            // add some extra info to the axisProperties as needed
            if(axisProperties.hasOwnProperty('axisTitle.text')){
                axisProperties['axisTitle.text'] = Splunk.JSCharting.ParsingUtils.escapeHtml(axisProperties['axisTitle.text']);
            }
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).width();

            this.xAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
            this.hcConfig.xAxis = $.extend(true, this.xAxis.getConfig(), {
                startOnTick: true,
                endOnTick: true,
                minPadding: 0,
                maxPadding: 0
            });
        },

        // override
        // remove the min/max padding from the y-axis
        formatYAxis: function($super, properties, data) {
            $super(properties, data);
            $.extend(true, this.hcConfig.yAxis, {
                minPadding: 0,
                maxPadding: 0
            });
        },

        // override
        formatTooltip: function(properties, data) {
            var xAxisKey = this.xAxis.getKey(),
                useTimeNames = (data.xAxisType === 'time'),
                xFieldName = Splunk.JSCharting.ParsingUtils.escapeHtml(data.fieldNames[0]),
                yFieldName = Splunk.JSCharting.ParsingUtils.escapeHtml(data.fieldNames[1]),
                resolveX = this.xAxis.formatTooltipValue.bind(this.xAxis),
                resolveY = this.yAxis.formatTooltipValue.bind(this.yAxis),
                resolveName = this.getTooltipName.bind(this);

            if(this.mode === 'multiSeries') {
                $.extend(true, this.hcConfig, {
                    tooltip: {
                        formatter: function() {
                            var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.series.color);
                            return [
                               '<span style="color:#cccccc">', (useTimeNames ? 'time: ' : xAxisKey + ': '), '</span>',
                               '<span style="color:', seriesColorRgb, '">', resolveName(this, useTimeNames), '</span> <br/>',
                               '<span style="color:#cccccc">', xFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveX(this, "x"), '</span> <br/>',
                               '<span style="color:#cccccc">', yFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                            ].join('');
                        }
                    }
                });
            }
            else {
                $.extend(true, this.hcConfig, {
                    tooltip: {
                        formatter: function() {
                            return [
                               '<span style="color:#cccccc">', xAxisKey, ': </span>',
                               '<span style="color:#ffffff">', resolveX(this, "x"), '</span> <br/>',
                               '<span style="color:#cccccc">', xFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                            ].join('');
                        }
                    }
                });
            }
        },

        getTooltipName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.series.name,
                    span = element.point._span || 1;
                return Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span) || _('Invalid timestamp');
            }
            return element.series.name;
        },

        // override
        formatLegend: function() {
            var xAxisKey = this.xAxis.getKey(),
                useTimeNames = (this.processedData.xAxisType === 'time'),
                resolveLabel = this.getLegendName.bind(this);
            $.extend(true, this.hcConfig, {
                legend: {
                    labelFormatter: function() {
                        return resolveLabel(this, useTimeNames);
                    }
                }
            });
        },

        getLegendName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.name,
                    span = this.processedData._spanSeries[0] || 1;
                return Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span) || _('Invalid timestamp');
            }
            return Splunk.JSCharting.ParsingUtils.escapeHtml(element.name);
        },

        // override
        onPointClick: function(point, domEvent) {
            var xAxisKey = this.processedData.xAxisKey,
                xAxisType = this.processedData.xAxisType,
                xFieldName = (this.mode === 'multiSeries') ? this.processedData.fieldNames[0] : xAxisKey,
                yFieldName = (this.mode === 'multiSeries') ? this.processedData.fieldNames[1] : this.processedData.fieldNames[0],
                event = {
                    fields: (this.mode === 'multiSeries') ? [xAxisKey, xFieldName, yFieldName] : [xFieldName, yFieldName],
                    data: {},
                    domEvent: domEvent
                };

            event.data[xAxisKey] = (xAxisType == 'time') ? Splunk.util.getEpochTimeFromISO(point.series.name) : point.series.name;
            event.data[yFieldName] = point.rawY;
            if(xAxisType == "time") {
                event.data._span = point._span;
            }
            event.data[xFieldName] = point.rawX;
            this.dispatchEvent('chartClicked', event);
        },

        // override
        addDataToConfig: function() {
            var fieldNames = this.processedData.fieldNames;

            if(fieldNames.length < 1 || (fieldNames.length === 1 && this.processedData.xAxisType === 'time')) {
                this.chartIsEmpty = true;
                return;
            }
            this.hcConfig.series = [];
            this.legendFieldNames = [];

            if(fieldNames.length === 1) {
                this.setMode('singleSeries');
                this.addSingleSeriesData();
            }
            else {
                this.setMode('multiSeries');
                this.addMultiSeriesData();
            }
        },

        addMultiSeriesData: function() {
            var i, fieldName, loopYVal, loopXVal, loopName, loopDataPoint,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                collapsedSeries = {},
                fieldsAdded = {};

            for(i = 0; i < series[fieldNames[0]].length; i++) {
                loopXVal = series[fieldNames[0]][i].rawY;
                loopYVal = series[fieldNames[1]][i].rawY;
                if(this.logYAxis) {
                    loopYVal = this.mathUtils.absLogBaseTen(loopYVal);
                }
                if(this.logXAxis) {
                    loopXVal = this.mathUtils.absLogBaseTen(loopXVal);
                }
                loopName = series[fieldNames[0]][i].name;
                loopDataPoint = {
                    x: loopXVal,
                    y: loopYVal,
                    rawY: series[fieldNames[1]][i].rawY,
                    rawX: series[fieldNames[0]][i].rawY
                };
                if(this.processedData.xAxisType == 'time') {
                    loopDataPoint._span = series[fieldNames[0]][i]._span;
                }
                if(collapsedSeries[loopName]) {
                    collapsedSeries[loopName].push(loopDataPoint);
                }
                else {
                    collapsedSeries[loopName] = [loopDataPoint];
                }
            }
            for(i = 0; i < series[fieldNames[0]].length; i++) {
                fieldName = series[fieldNames[0]][i].name;
                if(fieldName && !fieldsAdded[fieldName]) {
                    this.hcConfig.series.push({
                        name: fieldName,
                        data: collapsedSeries[fieldName]
                    });
                    this.legendFieldNames.push(fieldName);
                    fieldsAdded[fieldName] = true;
                }
            }
        },

        addSingleSeriesData: function() {
            var i, xValue, loopDataPoint,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                xSeries = this.processedData.xSeries;

            this.hcConfig.series.push({
                name: 'undefined',
                data: []
            });

            for(i = 0; i < xSeries.length; i++) {
                xValue = this.mathUtils.parseFloat(xSeries[i], 10);
                if(!isNaN(xValue)) {
                    loopDataPoint = {
                        rawX: xValue,
                        rawY: series[fieldNames[0]][i].rawY
                    };
                    if(this.logYAxis) {
                        loopDataPoint.y = this.mathUtils.absLogBaseTen(loopDataPoint.rawY);
                    }
                    else {
                        loopDataPoint.y = loopDataPoint.rawY;
                    }
                    if(this.logXAxis) {
                        loopDataPoint.x = this.mathUtils.absLogBaseTen(loopDataPoint.rawX);
                    }
                    else {
                        loopDataPoint.x = loopDataPoint.rawX;
                    }
                    this.hcConfig.series[0].data.push(loopDataPoint);
                }
            }
            // generate a unique field name
            this.legendFieldNames.push(this.hcObjectId + '_scatter');
        },

        addLegendClasses: function() {
            // empty placeholder to avoid errors caused by superclass method
        },

        // we have to override here because the tooltip structure is different
        addTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                                  $('span > span', $tooltip);

            for(i = 0; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },

        // see above
        addTimeTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                              $('span > span', $tooltip);

            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');

            for(i = 3; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            scatter: {
                marker: {
                    radius: 7,
                    symbol: 'square'
                }
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PieChart


    Splunk.JSCharting.PieChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        typeName: 'pie-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-point path' : '.highcharts-point shape',

        // override
        initialize: function($super, container) {
            $super(container);
            this.collapseFieldName = 'other';
            this.collapsePercent = 0.01;
            this.showPercent = false;
            this.useTotalCount = false;
            this.legendFieldNames = [];
        },

        // override
        getFieldList: function() {
            return this.legendFieldNames;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'pie'
                },
                xAxis: {
                    lineWidth: 0
                },
                yAxis: {
                    lineWidth: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions: {
                    pie: {
                        dataLabels: {
                            hooks: {
                                xPositionHook: this.labelXPositionHook.bind(this),
                                connectorPositionHook: this.connectorPositionHook.bind(this)
                            }
                        },
                        hooks: {
                            plotRenderHook: this.plotRenderHook.bind(this),
                            beforeLabelRender: this.beforeLabelRenderHoook.bind(this)
                        }
                    }
                }
            });
        },

        destroy: function($super) {
            if(this.hcChart) {
                this.removeLabelHoverEffects();
            }
            $super();
        },

        applyPropertyByName: function($super, key, value, properties) {
            var keysToIgnore = {
                'secondaryAxis.scale': true,
                'axisY.scale': true,
                'primaryAxisTitle.text': true,
                'axisTitleX.text': true
            };

            if(key in keysToIgnore) {
                return;
            }
            $super(key, value, properties);
            switch(key) {

                case 'chart.sliceCollapsingThreshold':
                    this.mapSliceCollapsingThreshold(value);
                    break;
                case 'chart.sliceCollapsingLabel':
                    this.collapseFieldName = value;
                    break;
                case 'chart.showLabels':
                    this.mapper.mapValue((value === 'true'), ["plotOptions", "pie", "dataLabels", "enabled"]);
                    break;
                case 'chart.showPercent':
                    this.showPercent = (value === 'true');
                    break;
                case 'secondaryAxisTitle.text':
                    // secondaryAxisTitle.text is trumped by axisTitleY.text
                    if(!properties['axisTitleY.text']) {
                        this.mapper.mapValue(((value || value === '') ? value : null), ["yAxis", "title", "text"]);
                    }
                    break;
                case 'axisTitleY.text':
                    this.mapper.mapValue(((value || value === '') ? value : null), ["yAxis", "title", "text"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        performPropertyCleanup: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                yAxis: {
                    title: {
                        style: {
                            color: this.fontColor
                        }
                    }
                },
                plotOptions: {
                    pie: {
                        dataLabels: {
                            color: this.fontColor,
                            connectorColor: this.foregroundColorSoft,
                            distance: 20
                        }
                    }
                }
            });
        },

        // override
        // doing a full override here to avoid double-repaint
        focusPoint: function(point, series) {
            point.graphic.attr({
                'fill': point.color,
                'stroke-width': 0,
                'stroke': point.color
            });
        },

        mapSliceCollapsingThreshold: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                value = (value > 1) ? 1 : value;
                this.collapsePercent = value;
            }
        },

        // override
        // not calling super class method, pie charts don't have axes or legend
        applyFormatting: function(properties, data) {
            var useTimeNames = (this.processedData.xAxisType === 'time'),
                resolveLabel = this.getLabel.bind(this);
            this.formatTooltip(properties, data);
            $.extend(true, this.hcConfig, {
                plotOptions: {
                    pie: {
                        dataLabels: {
                            formatter: function() {
                                return Splunk.JSCharting.ParsingUtils.escapeHtml(resolveLabel(this, useTimeNames));
                            }
                        }
                    }
                }
            });
        },

        // override
        onDrawFinished: function($super, chart, callback) {
            if(this.hcConfig.plotOptions.pie.dataLabels.enabled !== false) {
                this.addLabelHoverEffects(chart);
            }
            $super(chart, callback);
        },

        addLabelHoverEffects: function(chart) {
            var that = this,
                labelElement,
                properties = {
                    highlightDelay: 125,
                    unhighlightDelay: 50,
                    onMouseOver: function(slice) {
                        that.onLabelMouseOver(slice);
                    },
                    onMouseOut: function(slice) {
                        that.onLabelMouseOut(slice);
                    }
                },
            throttle = new this.Throttler(properties);

            $(chart.series[0].data).each(function(i, slice) {
                labelElement = slice.dataLabel.element;
                $(labelElement).bind('mouseover.splunk_jscharting', function() {
                    throttle.mouseOverHappened(slice);
                });
                $(labelElement).bind('mouseout.splunk_jscharting', function() {
                    throttle.mouseOutHappened(slice);
                });
            });
        },

        removeLabelHoverEffects: function() {
            if(this.hcChart) {
                var self = this;
                $(this.hcChart.series[0].data).each(function(i, slice) {
                    labelElement = slice.dataLabel.element;
                    $(labelElement).unbind('.splunk_jscharting');
                });
            }
        },

        // override
        onPointClick: function($super, point, domEvent) {
            if(point.rawName) {
                point = $.extend({}, point, {
                    name: point.rawName
                });
            }
            $super(point, domEvent);
        },

        onPointMouseOver: function($super, point) {
            $super(point);
            this.highlightLabel(point);
        },

        onPointMouseOut: function($super, point) {
            $super(point);
            this.unHighlightLabel(point);
        },

        onLabelMouseOver: function(slice) {
            this.highlightPoint(slice);
            this.highlightLabel(slice);
        },

        onLabelMouseOut: function(slice) {
            this.unHighlightPoint(slice);
            this.unHighlightLabel(slice);
        },

        highlightLabel: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(!loopPoint.dataLabel) {
                    break;
                }
                if(loopPoint !== point) {
                    loopPoint.dataLabel.attr('fill-opacity', this.fadedElementOpacity);
                } else {
                    loopPoint.dataLabel.attr('fill-opacity', 1.0);
                }
            }
        },

        unHighlightLabel: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(!loopPoint.dataLabel) {
                    break;
                }
                if(loopPoint !== point) {
                    loopPoint.dataLabel.attr('fill-opacity', 1.0);
                }
            }
        },

        plotRenderHook: function(series) {
            var chart = series.chart;
            series.options.size = Math.min(chart.plotHeight * 0.70, chart.plotWidth / 3);
        },

        labelXPositionHook: function(series, options, radius, isRightSide) {

            var chart = series.chart,
                distance = options.distance;
            return (chart.plotLeft + series.center[0] + (isRightSide ? (radius + distance / 2) : (-radius - distance)));
        },

        connectorPositionHook: function(path) {
            // the default path consists of three points that create a two-segment line
            // we are going to move the middle point so the outer segment is horizontal
            // first extract the actual points from the SVG-style path declaration
            var firstPoint = {
                    x: path[1],
                    y: path[2]
                },
                secondPoint = {
                    x: path[4],
                    y: path[5]
                },
                thirdPoint = {
                    x: path[7],
                    y: path[8]
                };
            // find the slope of the second line segment, use it to calculate the new middle point
            var secondSegmentSlope = (thirdPoint.y - secondPoint.y) / (thirdPoint.x - secondPoint.x),
                newSecondPoint = {
                    x: thirdPoint.x + (firstPoint.y - thirdPoint.y) / secondSegmentSlope,
                    y: firstPoint.y
                };

            // define the update path and swap it into the original array
            // if the resulting path would back-track on the x-axis (or is a horizontal line),
            // just draw a line directly from the first point to the last
            var wouldBacktrack = isNaN(newSecondPoint.x) || (firstPoint.x >= newSecondPoint.x && newSecondPoint.x <= thirdPoint.x)
                                    || (firstPoint.x <= newSecondPoint.x && newSecondPoint.x >= thirdPoint.x),
                newPath = (wouldBacktrack) ?
                    [
                        "M", firstPoint.x, firstPoint.y,
                        "L", thirdPoint.x, thirdPoint.y
                    ] :
                    [
                        "M", firstPoint.x, firstPoint.y,
                        "L", newSecondPoint.x, newSecondPoint.y,
                        "L", thirdPoint.x, thirdPoint.y
                    ];
            path.length = 0;
            Array.prototype.push.apply(path, newPath);
        },

        beforeLabelRenderHoook: function(series) {
            var i, adjusted,
                options = series.options,
                labelDistance = options.dataLabels.distance,
                size = options.size, // assumes size in pixels TODO: handle percents
                chart = series.chart,
                renderer = chart.renderer,
                formatter = new Splunk.JSCharting.FormattingHelper(renderer),

                defaultFontSize = 11,
                minFontSize = 9,
                maxWidth = (chart.plotWidth - (size + 2 * labelDistance)) / 2,
                labels = [];

            for(i = 0; i < series.data.length; i++) {
                labels.push(series.data[i].rawName);
            }
            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize, 'middle');

            for(i = 0; i < series.data.length; i++) {
                series.data[i].name = adjusted.labels[i];
                // check for a redraw, update the font size in place
                if(series.data[i].dataLabel && series.data[i].dataLabel.css) {
                    series.data[i].dataLabel.css({'font-size': adjusted.fontSize + 'px'});
                }
            }
            $.extend(true, options.dataLabels, {
                style: {
                    fontSize: adjusted.fontSize + 'px'
                },
                y: adjusted.fontSize / 4
            });
            formatter.destroy();
        },

        getLabel: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.point.name,
                    span = element.point._span || 1,
                    formattedTime = Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span) || _('Invalid timestamp');

                return formattedTime || element.point.name;
            }
            return element.point.name;
        },

        // override
        formatTooltip: function(properties, data) {
            var xAxisKey = data.xAxisKey,
                useTimeNames = (data.xAxisType === 'time'),
                resolveName = this.getTooltipName.bind(this),
                useTotalCount = this.useTotalCount;

            $.extend(true, this.hcConfig, {
                tooltip: {
                    formatter: function() {
                        var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.point.color);

                        // SPL-45604, if the series itself is percent, suppress the 'bonus' percent display
                        if(this.series.name === 'percent') {
                            return [
                                '<span style="color:#cccccc">', (useTimeNames ? 'time: ' : xAxisKey + ': '), '</span>',
                                '<span style="color:', seriesColorRgb, '">', Splunk.JSCharting.ParsingUtils.escapeHtml(resolveName(this, useTimeNames)), '</span> <br/>',
                                '<span style="color:#cccccc">', Splunk.JSCharting.ParsingUtils.escapeHtml(this.series.name), ': </span>',
                                '<span style="color:#ffffff">', this.y, '</span>'
                            ].join('');
                        }

                        return [
                            '<span style="color:#cccccc">', (useTimeNames ? 'time: ' : xAxisKey + ': '), '</span>',
                            '<span style="color:', seriesColorRgb, '">', Splunk.JSCharting.ParsingUtils.escapeHtml(resolveName(this, useTimeNames)), '</span> <br/>',
                            '<span style="color:#cccccc">', Splunk.JSCharting.ParsingUtils.escapeHtml(this.series.name), ': </span>',
                            '<span style="color:#ffffff">', this.y, '</span> <br/>',
                            '<span style="color:#cccccc">', ((useTotalCount) ? 'percent' : this.series.name + '%'), ': </span>',
                            '<span style="color:#ffffff">', format_percent(this.percentage / 100), '</span>'
                        ].join('');
                    }
                }
            });
        },

        //override
        getTooltipName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.point.name,
                    span = element.point._span || 1;
                    formattedTime = Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span) || _('Invalid timestamp');

                return formattedTime || element.point.name;
            }
            return element.point.rawName;
        },

        // override
        processData: function($super, rawData, fieldInfo, properties) {
            // at the moment disabling "total count" mode, need a more sophisticated way to handle it
            if(false && rawData.series['_tc'] && rawData.series['_tc'].length > 0) {
                this.useTotalCount = true;
                this.totalCount = parseInt(rawData.series['_tc'][0].rawY, 10);
            }
            else {
                this.useTotalCount = false;
            }
            $super(rawData, fieldInfo, properties);
        },

        // override
        addDataToConfig: function() {
            this.legendFieldNames = [];
            // total-count mode is currently disabled
            if(false && this.useTotalCount) {
                this.addDataWithTotalCount();
            }
            else {
                this.addDataWithCollapsing();
            }
        },

        addDataWithCollapsing: function() {
            var i, loopObject, loopPercent, labelWidth,
                totalY = 0,
                numCollapsed = 0,
                collapsedY = 0,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                firstSeries = series[fieldNames[0]],
                prunedData = [];

            for(i = 0; i < firstSeries.length; i++) {
                totalY += firstSeries[i].rawY;
            }
            for(i = 0; i < firstSeries.length; i++) {
                loopObject = firstSeries[i];
                loopObject.y = loopObject.rawY;
                if(loopObject.y > 0) {
                    loopPercent = loopObject.y / totalY;
                    if(loopPercent < this.collapsePercent) {
                        collapsedY += loopObject.y;
                        numCollapsed++;
                    }
                    else {
                        // push the field name to the legend name list before we possibly decorate it
                        this.legendFieldNames.push(loopObject.name);
                        if(this.showPercent) {
                            loopObject.name += ', ' + format_percent(loopPercent);
                        }
                        // store a raw name which will be used later by the ellipsization routine
                        loopObject.rawName = loopObject.name;
                        prunedData.push(loopObject);
                    }
                }
            }
            if(numCollapsed > 0) {
                var otherFieldName = this.collapseFieldName + ' (' + numCollapsed + ')'
                        + ((this.showPercent) ? ', ' + format_percent(collapsedY / totalY) : '');

                prunedData.push({
                    name: otherFieldName,
                    rawName: otherFieldName,
                    y: collapsedY
                });
                this.legendFieldNames.push('__other');
            }
            this.hcConfig.series = [
                {
                    name: fieldNames[0],
                    data: prunedData
                }
            ];
        },

        /*
         * un-comment this block when total count mode is reactivated
         *
        addDataWithTotalCount: function() {
            var i, loopObject, loopPercent, labelWidth,
                totalY = 0,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                firstSeries = series[fieldNames[0]],
                adjustedData = [];

            for(i = 0; i < firstSeries.length; i++) {
                loopObject = firstSeries[i];
                loopObject.y = loopObject.rawY;
                loopPercent = loopObject.y / this.totalCount;
                loopObject.rawName = loopObject.name;
                totalY += loopObject.y;
                if(this.showPercent) {
                    loopObject.name += ', ' + format_percent(loopPercent);
                }
                adjustedData.push(loopObject);
                this.legendFieldNames.push(loopObject.rawName);
            }
            if(totalY < this.totalCount) {
                adjustedData.push({
                    name: this.collapseFieldName + ((this.showPercent) ?
                                ', ' + format_percent((this.totalCount - totalY) / this.totalCount) : ''),
                    rawName: this.collapseFieldName,
                    y: this.totalCount - totalY
                });
                this.legendFieldNames.push('__other');
            }
            this.hcConfig.series = [
                {
                    name: fieldNames[0],
                    data: adjustedData
                }
            ];
        },
        */

        addLegendClasses: function() {
            // empty placeholder to avoid errors caused by superclass method
        },

        // we have to override here because the tooltip structure is different
        addTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                                  $('span > span', $tooltip);

            for(i = 0; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },

        // see above
        addTimeTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) :
                                              $('span > span', $tooltip);

            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');

            for(i = 3; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            pie: {
                borderWidth: 0,
                shadow: false,
                dataLabels: {
                    softConnector: false,
                    style: {
                        cursor: 'default'
                    }
                }
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HybridChart


    Splunk.JSCharting.HybridChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        seriesTypeMap: {},
        defaultSeriesType: 'column',

        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);

            switch(key) {

                case 'chart.seriesTypeMap':
                    this.seriesTypeMap = this.parseUtils.stringToMap(value) || {};
                    break;
                case 'chart.defaultSeriesType':
                    this.defaultSeriesType = value || this.defaultSeriesType;
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        constructSeriesObject: function($super, name, data, properties) {
            var obj = $super(name, data, properties);

            if(this.seriesTypeMap[name]) {
                obj.type = this.seriesTypeMap[name];
            }
            else {
                obj.type = this.defaultSeriesType;
            }
            return obj;
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.SplitSeriesChart


    Splunk.JSCharting.SplitSeriesChart = $.klass(Splunk.JSCharting.AbstractChart, {

        interChartSpacing: 5,
        hiddenAxisConfig: {
            labels: {
                enabled: false
            },
            tickLength: 0,
            lineWidth: 0,
            title: {
                style: {
                    color: this.fontColor
                }
            }
        },

        // override
        initialize: function($super, container, seriesConstructor) {
            $super(container);
            this.seriesConstructor = seriesConstructor;
            this.innerConstructor = this.generateInnerConstructor(seriesConstructor);
            this.innerHeights = [];
            this.innerTops = [];
            this.innerWidth = 0;
            this.innerLeft = 0;
            this.innerCharts = [];
            this.bottomSpacing = 0;

            this.yMin = Infinity;
            this.yMax = -Infinity;

            this.colorList = Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS;
        },

        // override
        prepare: function($super, data, fieldInfo, properties) {
            $super(data, fieldInfo, properties);
            this.data = data;
            this.fieldInfo = fieldInfo;
            if(!this.chartIsEmpty) {
                this.calculateYExtremes();
                // guessing the bottom spacing based on the data usually gets us pretty close,
                // we'll go through and finalize this after the chart draws
                this.bottomSpacing = this.guessBottomSpacing(data);
            }
        },

        // override
        // the inner charts will handle adding opacity to their color schemes
        setColorMapping: function(list, map, legendSize) {
            var hexColor;
            this.colorList = [];
            this.hcConfig.colors = [];
            for(i = 0; i < list.length; i++) {
                hexColor = this.colorPalette.getColor(list[i], map[list[i]], legendSize);
                this.colorList.push(hexColor);
                this.hcConfig.colors.push(this.colorUtils.addAlphaToColor(hexColor, 1.0));
            }
        },

        setColorList: function($super, list) {
            $super(list);
            this.colorList = list;
        },

        guessBottomSpacing: function(data) {
            if(this.properties['chart'] !== 'bar' && data.xAxisType === "time") {
                var timeSpan = (data._spanSeries) ? parseInt(data._spanSeries[0], 10) : 1;
                return (timeSpan >= (24 * 60 * 60)) ? 28 : 42;
            }
            return 13;
        },

        resize: function($super, width, height) {
            $super(width, height);

            // re-calculate the inner sizes based on the new outer chart size, then resize
            this.calculateInnerSizes();
            this.resizeInnerCharts();
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            // have to do this to get the legend items to correspond to the series type
            $.extend(true, this.hcConfig, {
                chart: {
                    type: this.properties['chart']
                },
                plotOptions: {
                    line: {
                        marker: {
                            radius: (this.properties['chart.showMarkers'] === 'true') ? 8 : 0
                        }
                    }
                }
            });
        },

        // to the outside world, want this chart object to appear to be a single chart with its own series objects,
        // so we delay the callback until the inner charts exist
        onDrawFinished: function($super, chart, callback) {
            this.drawCallback = callback;
            $super(chart);
        },

        onDrawOrResize: function($super, chart) {
            this.calculateInnerSizes(chart);
            // if we already created the inner charts, resize them
            if(this.innerCharts && this.innerCharts.length > 0) {
                this.resizeInnerCharts();
            }
            else {
                // otherwise create them
                this.insertInnerContainers(chart);
                this.drawInnerCharts();
            }
            $super(chart);
        },

        resizeInnerCharts: function() {
            var i, iInverse,
                $innerContainers = $('.sschart-inner-container', $(this.renderTo));

            // loop through and adjust, keeping in mind that we reversed the order of indices for the chart containers
            for(i = 0; i < $innerContainers.length; i++) {
                iInverse = $innerContainers.length - 1 - i;
                $innerContainers.eq(i).css({
                    left: this.innerLeft + 'px',
                    top: this.innerTops[iInverse] + 'px',
                    width: this.innerWidth + 'px',
                    height: this.innerHeights[iInverse] + 'px'
                });
                this.innerCharts[i].resize(this.innerWidth, this.innerHeights[iInverse]);
            }
        },

        destroy: function($super) {
            for(var i = 0; i < this.innerCharts.length; i++) {
                this.innerCharts[i].destroy();
            }
            this.innerCharts = [];
            $super();
            $(this.renderTo).empty();
        },

        // override
        addDataToConfig: function($super) {
            this.fieldsToShow = [];
            $super();
            this.numSeries = this.fieldsToShow.length;
        },

        calculateYExtremes: function() {
            var i, j, fieldName, dataPoint;

            for(i = 0; i < this.data.fieldNames.length; i++) {
                fieldName = this.data.fieldNames[i];
                for(j = 0; j < this.data.series[fieldName].length; j++) {
                    dataPoint = this.data.series[fieldName][j];
                    if(!isNaN(dataPoint.y)) {
                        this.yMin = Math.min(this.yMin, dataPoint.y);
                        this.yMax = Math.max(this.yMax, dataPoint.y);
                    }
                }
            }
            if(this.logYAxis) {
                this.yMin = this.mathUtils.absLogBaseTen(this.yMin);
                this.yMax = this.mathUtils.absLogBaseTen(this.yMax);
            }
        },

        // override
        // return an empty array for each data field, we just want to create an outer shell chart with the correct legend
        constructSeriesObject: function(name, data, properties) {
            this.fieldsToShow.push(name);
            return {
                name: name,
                data: []
            };
        },

        // override
        // only format the x-axis and y-axis (to hide them) and legend
        applyFormatting: function(properties, data) {
            this.formatXAxis(properties, data);
            this.formatYAxis(properties, data);
            this.formatLegend();
        },

        // override
        // only want to add legend and redraw handlers
        addEventHandlers: function(properties, data) {
            this.addLegendHandlers(properties);
            this.addRedrawHandlers();
        },

        formatXAxis: function($super, properties, data) {
            var titleText = null;
            if(properties['axisTitleX.text'] !== undefined) {
                titleText = properties['axisTitleX.text'];
            }
            else if(properties['primaryAxisTitle.text'] !== undefined) {
                titleText = properties['primaryAxisTitle.text'];
            }
            else {
                titleText = this.processedData.xAxisKey;
            }
            $.extend(true, this.hcConfig, {
                xAxis: $.extend(true, this.hiddenAxisConfig, {
                    title: {
                        text: titleText,
                        style: {
                            color: this.fontColor
                        }
                    }
                })
            });
        },

        formatYAxis: function(properties, data) {
            var titleText = null;
            if(properties['axisTitleY.text'] !== undefined) {
                titleText = properties['axisTitleY.text'];
            }
            else if(properties['secondaryAxisTitle.text'] !== undefined) {
                titleText = properties['secondaryAxisTitle.text'];
            }
            else if(this.processedData.fieldNames.length === 1) {
                titleText = this.processedData.fieldNames[0];
            }
            $.extend(true, this.hcConfig, {
                yAxis: $.extend(true, this.hiddenAxisConfig, {
                    title: {
                        text: titleText,
                        style: {
                            color: this.fontColor
                        }
                    }
                })
            });
        },

        calculateInnerSizes: function(chart) {
            chart = chart || this.hcChart;
            var i, loopHeight, loopTop,
                totalHeight = chart.chartHeight - this.bottomSpacing,
                unadjustedInnerHeight = ((totalHeight - (this.numSeries - 1) * this.interChartSpacing) / this.numSeries),
                firstTop = chart.plotTop + totalHeight - unadjustedInnerHeight;

            this.innerWidth = chart.plotWidth;
            this.innerLeft = chart.plotLeft;
            this.innerHeights = [unadjustedInnerHeight + this.bottomSpacing];
            this.innerTops = [firstTop];

            for(i = 1; i < this.fieldsToShow.length; i++) {
                this.innerHeights.push(unadjustedInnerHeight);
                loopTop = firstTop - (i * (unadjustedInnerHeight + this.interChartSpacing));
                this.innerTops.push(loopTop);
            }
        },

        insertInnerContainers: function(chart) {
            // this loop goes backward so that when the charts are added the first field ends up at the top of the display
            for(var i = this.fieldsToShow.length - 1; i >= 0; i--) {
                $('#' + chart.container.id).append(
                    $('<div class="sschart-inner-container"></div>')
                        .css({
                            position: 'absolute',
                            left: this.innerLeft + 'px',
                            top: this.innerTops[i] + 'px',
                            width: this.innerWidth + 'px',
                            height: this.innerHeights[i] + 'px'
                        })
                );
            }
        },

        drawInnerCharts: function() {
            var i, j, innerData, innerProps, loopChart,
                $innerContainers = $('.sschart-inner-container', $(this.renderTo)),
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                numDrawn = 0,
                innerCallback = function() {
                    numDrawn++;
                    if(numDrawn === this.numSeries) {
                        // timing issue here, callback fires before assignment is made
                        setTimeout(this.onInnerChartsDrawn.bind(this), 15);
                    }
                }.bind(this);

            for(i = 0; i < this.fieldsToShow.length; i++) {
                // make a deep copy of the data and reduce it to a single field name
                innerData = $.extend(true, {}, this.data);
                innerData.fieldNames = [fieldNames[i]];

                // loop through and remove fields that are not being used
                for(j = 0; j < fieldNames.length; j++) {
                    if(j !== i) {
                        delete innerData.series[fieldNames[j]];
                    }
                }
                // make a deep copy of the properties and force the legend to hidden
                innerProps = $.extend(true, {}, this.properties, {
                    'legend.placement': 'none'
                });
                // passing the legend labels to the inner charts will disrupt hover effects
                delete(innerProps['legend.labels']);

                loopChart = new this.innerConstructor($innerContainers[i], i, (i === fieldNames.length - 1));
                this.innerCharts.push(loopChart);
                loopChart.prepare(innerData, this.fieldInfo, innerProps);
                // by passing two copies of the same color, make sure the right color will show up in all cases
                loopChart.setColorList([this.colorList[i], this.colorList[i]]);
                loopChart.draw(innerCallback);
            }
        },

        // override to avoid errors from superclass method
        addTestingMetadata: function(chart) {

        },

        onInnerChartsDrawn: function() {
            var i;
            // add event listeners to pass click events up
            for(i = 0; i < this.innerCharts.length; i++) {
                var loopChart = this.innerCharts[i];
                loopChart.addEventListener('chartClicked', function(event) {
                    this.dispatchEvent('chartClicked', event);
                }.bind(this));
            }
            // here is where we create a new chart object for external reference and call the original draw callback
            var externalChartReference = {
                series: []
            };
            for(i = 0; i < this.innerCharts.length; i++) {
                externalChartReference.series.push({
                    data: this.innerCharts[i].hcChart.series[0].data
                });
            }
            if(this.drawCallback) {
                this.drawCallback(externalChartReference);
            }
        },

        // override
        onLegendMouseOver: function(series) {
            this.highlightThisChild(series.index);
            this.highlightSeriesInLegend(series);
        },

        // overide
        onLegendMouseOut: function(series) {
            this.unHighlightThisChild(series.index);
            this.unHighlightSeriesInLegend(series);
        },

        highlightThisChild: function(index) {
            var i, innerChart;
            for(i = 0; i < this.innerCharts.length; i++) {
                if(i !== index) {
                    innerChart = this.innerCharts[i];
                    innerChart.fadeSeries(innerChart.hcChart.series[0]);
                }
            }
        },

        unHighlightThisChild: function(index) {
            var i, innerChart;
            for(i = 0; i < this.innerCharts.length; i++) {
                if(i !== index) {
                    innerChart = this.innerCharts[i];
                    innerChart.focusSeries(innerChart.hcChart.series[0]);
                }
            }
        },

        generateInnerConstructor: function(seriesConstructor) {
            var parent = this,
                axesInverted = (seriesConstructor === Splunk.JSCharting.BarChart);

            return $.klass(seriesConstructor, {

                initialize: function($super, container, index, isBottom) {
                    $super(container);
                    this.index = index;
                    this.isBottom = isBottom;
                },

                generateDefaultConfig: function($super) {
                    $super();
                    $.extend(true, this.hcConfig, {
                        chart: {
                            ignoreHiddenSeries: false,
                            // the parent chart will handle window resize events
                            reflow: false
                        }
                    });
                },

                formatXAxis: function($super, properties, data) {
                    $super(properties, data);
                    if(!this.isBottom && !axesInverted) {
                        $.extend(true, this.hcConfig, {
                            xAxis: parent.hiddenAxisConfig
                        });
                    }
                    $.extend(true, this.hcConfig, {
                        xAxis: {
                            title: {
                                text: null
                            }
                        }
                    });
                },

                formatYAxis: function($super, properties, data) {
                    $super(properties, data);
                    if(!this.isBottom && axesInverted) {
                        $.extend(true, this.hcConfig, {
                            yAxis: parent.hiddenAxisConfig
                        });
                    }
                    $.extend(true, this.hcConfig, {
                        yAxis: {
                            title: {
                                text: null
                            }
                        }
                    });
                },

                addDataToConfig: function($super) {
                    $super();
                    // we add a dummy series with the global min and max values in order to force the charts to have the same y-range
                    this.hcConfig.series.push({
                        name: 'placeholder',
                        data: [parent.yMin, parent.yMax],
                        showInLegend: false,
                        visible: false
                    });
                },

                onPointMouseOver: function($super, point) {
                    $super(point);
                    parent.highlightThisChild(this.index);
                    parent.highlightIndexInLegend(this.index);
                },

                onPointMouseOut: function($super, point) {
                    $super(point);
                    parent.unHighlightThisChild(this.index);
                    parent.unHighlightIndexInLegend(this.index);
                }

            });
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractAxis


    Splunk.JSCharting.AbstractAxis = $.klass({

        hasSVG: Splunk.JSCharting.hasSVG,

        initialize: function(properties, data, orientation, colorScheme) {
            this.properties = properties;
            this.data = data;
            this.isVertical = (orientation === 'vertical');
            this.hcAxis = false;

            this.foregroundColorSoft = colorScheme.foregroundColorSoft;
            this.foregroundColorSofter = colorScheme.foregroundColorSofter;
            this.fontColor = colorScheme.fontColor;

            this.extendsAxisRange = false;

            this.id = "js-charting-axis-" + Splunk.JSCharting.AbstractAxis.idCounter;
            Splunk.JSCharting.AbstractAxis.idCounter++;
            this.mathUtils = Splunk.JSCharting.MathUtils;

            this.generateConfig();
            this.applyProperties();
            this.addRenderHooks();
        },

        getKey: function() {
            return this.data.xAxisKey;
        },

        getType: function() {
            return this.type;
        },

        getConfig: function() {
            return this.hcConfig;
        },

        // FOR TESTING ONLY
        getExtremes: function(chart) {
            if(!this.hcAxis) {
                if(!chart) {
                    return undefined;
                }
                this.hcAxis = this.getAxis(chart);
            }
            return this.hcAxis.getExtremes();
        },

        getAxis: function(chart) {
            return chart.get(this.id);
        },

        formatTooltipValue: function(element, valueKey) {

        },

        onDrawOrResize: function(chart, formatter) {
            this.hcAxis = chart.get(this.id);
            this.postDrawCleanup(this.hcAxis, formatter, chart);
        },

        ////////////////////////////////////////
        // end of "public" interface

        generateConfig: function() {
            var self = this;
            if(this.isVertical) {
                this.hcConfig = $.extend(true, {}, Splunk.JSCharting.AbstractAxis.DEFAULT_VERT_CONFIG);
            }
            else {
                this.hcConfig = $.extend(true, {}, Splunk.JSCharting.AbstractAxis.DEFAULT_HORIZ_CONFIG);
            }
            // apply the color scheme
            $.extend(true, this.hcConfig, {
                lineColor: this.foregroundColorSoft,
                gridLineColor: this.foregroundColorSofter,
                tickColor: this.foregroundColorSoft,
                minorTickColor: this.foregroundColorSoft,
                title: {
                    style: {
                        color: this.fontColor
                    }
                },
                labels: {
                    style: {
                        color: this.fontColor
                    }
                }
            });
            this.mapper = new Splunk.JSCharting.PropertyMapper(this.hcConfig);
            this.hcConfig.id = this.id;
            this.hcConfig.labels.formatter = function() {
                return self.formatLabel.call(self, this);
            };
        },

        applyProperties: function() {
            for(var key in this.properties) {
                if(this.properties.hasOwnProperty(key)) {
                    this.applyPropertyByName(key, this.properties[key]);
                }
            }
            this.postProcessProperties();
        },

        applyPropertyByName: function(key, value) {
            switch(key) {
                case 'axisTitle.text':
                    if(typeof value === 'string') {
                        value = $.trim(value);
                    }
                    this.mapper.mapValue(value, ["title", "text"]);
                    break;
                case 'axisLabels.axisVisibility':
                    this.mapper.mapValue(((value === 'hide') ? 0 : 1), ["lineWidth"]);
                    break;
                case 'axisLabels.majorTickSize':
                    this.mapper.mapIfInt(value, ["tickLength"]);
                    break;
                case 'axisLabels.majorTickVisibility':
                    this.mapper.mapValue(((value === 'hide') ? 0 : 1), ["tickWidth"]);
                    break;
                case 'axisLabels.majorLabelVisibility':
                    this.mapper.mapValue((value !== 'hide'), ["labels", "enabled"]);
                    break;
                case 'axisLabels.majorUnit':
                    this.mapper.mapIfInt(value, ["tickInterval"]);
                    break;
                case 'axisLabels.minorTickSize':
                    this.mapper.mapIfInt(value, ["minTickLength"]);
                    break;
                case 'axisLabels.minorTickVisibility':
                    var visible = (value !== 'hide');
                    this.mapper.mapValue((visible ? 1 : 0), ["minorTickWidth"]);
                    this.mapper.mapValue((visible ? 'auto' : null), ["minorTickInterval"]);
                    break;
                case 'axisLabels.extendsAxisRange':
                    this.extendsAxisRange = (value === 'true');
                    this.mapper.mapValue(this.extendsAxisRange, ["endOnTick"]);
                    break;
                case 'gridLines.showMajorLines':
                    this.mapper.mapValue(((value === 'false') ? 0 : 1), ["gridLineWidth"]);
                    break;
                case 'gridLines.showMinorLines':
                    this.mapper.mapValue(((value === 'true') ? 1 : 0), ["minorGridLineWidth"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        postProcessProperties: function() {

        },

        addRenderHooks: function() {

        },

        formatLabel: function(element) {
            return Splunk.JSCharting.ParsingUtils.escapeHtml(element.value);
        },

        postDrawCleanup: function(axis, formatter, chart) {

        },

        ///////////////////////////////////////////////////////////////////////////////
        // some reusable methods for dealing with the HighCharts ticks object

        getFirstTick: function(ticks) {
            var key, firstTick;

            // iterate over the ticks, keep track of the lowest 'pos' value
            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    if(!firstTick || ticks[key].pos < firstTick.pos) {
                        firstTick = ticks[key];
                    }
                }
            }
            return firstTick;
        },

        getLastTick: function(ticks) {
            var key, lastTick;

            // iterate over the ticks, keep track of the highest 'pos' value
            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    if(!lastTick || ticks[key].pos > lastTick.pos) {
                        lastTick = ticks[key];
                    }
                }
            }
            return lastTick;
        },

        // returns the ticks in an array in ascending order by 'pos'
        getTicksAsOrderedArray: function(ticks) {
            var key,
                tickArray = [];

            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    tickArray.push(ticks[key]);
                }
            }
            tickArray.sort(function(t1, t2) {
                return (t1.pos - t2.pos);
            });
            return tickArray;
        }

    });

    Splunk.JSCharting.AbstractAxis.idCounter = 0;

    Splunk.JSCharting.AbstractAxis.DEFAULT_HORIZ_CONFIG = {
        lineWidth: 1,
        tickLength: 20,
        tickWidth: 1,
        minorTickLength: 10,
        tickPlacement: 'between',
        minorGridLineWidth: 0,
        minPadding: 0,
        maxPadding: 0,
        showFirstLabel: true,
        showLastLabel: true,
        x: 0,
        labels: {
            align: 'left',
            x: 3
        },
        title: {
            margin: 15
        },
        min: null,
        max: null
    };

    Splunk.JSCharting.AbstractAxis.DEFAULT_VERT_CONFIG = {
        title: {
            margin: 15
        },
        tickWidth: 1,
        tickLength: 20,
        minorTickLength: 10,
        showFirstLabel: true,
        showLastLabel: true,
        lineWidth: 1,
        minorGridLineWidth: 0,
        minPadding: 0,
        maxPadding: 0,
        labels: {
            y: (this.hasSVG ? 11 : 13)
        },
        min: null,
        max: null
    };


    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.NumericAxis


    Splunk.JSCharting.NumericAxis = $.klass(Splunk.JSCharting.AbstractAxis, {

        type: 'numeric',

        // override
        initialize: function($super, properties, data, orientation, colorScheme) {
            this.includeZero = (orientation === 'vertical' && properties.chartType !== 'scatter');
            this.percentMode = (properties.percentMode === true);
            this.logScale = false;
            this.userMin = -Infinity;
            this.userMax = Infinity;
            $super(properties, data, orientation, colorScheme);
        },

        // override
        generateConfig: function($super) {
            $super();
            this.mapper.mapObject({
                minPadding: 0.01,
                maxPadding: 0.01
            });

            if(!this.isVertical) {
                this.hcConfig.title.margin = 10;
            }
        },

        // override
        applyPropertyByName: function($super, key, value) {
            $super(key, value);
            var floatVal;
            switch(key) {
                case 'axis.minimumNumber':
                    // in percent mode, ignore any user-defined min/max
                    if(this.percentMode) {
                        return;
                    }
                    floatVal = parseFloat(value, 10);
                    if(!isNaN(floatVal)) {
                        this.userMin = floatVal;
                        if(floatVal > 0) {
                            this.includeZero = false;
                        }
                    }
                    break;
                case 'axis.maximumNumber':
                    // in percent mode, ignore any user-defined min/max
                    if(this.percentMode) {
                        return;
                    }
                    floatVal = parseFloat(value, 10);
                    if(!isNaN(floatVal)) {
                        this.userMax = floatVal;
                        if(floatVal < 0) {
                            this.includeZero = false;
                        }
                    }
                    break;
                case 'axis.includeZero':
                    this.includeZero = (value === 'true');
                    break;
                case 'axisLabels.integerUnits':
                    this.mapper.mapValue((value !== 'true'), ["allowDecimals"]);
                    break;
                case 'axis.scale':
                    this.logScale = (value === 'log');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }

        },

        // override
        postProcessProperties: function($super) {
            $super();
            // if the user-specified min is greater than the max, switch them
            if(this.userMin > this.userMax) {
                var temp = this.userMin;
                this.userMin = this.userMax;
                this.userMax = temp;
            }
            this.adjustUserMin();
            this.adjustUserMax();
        },

        adjustUserMin: function() {
            var minWasSet = (!(isNaN(this.userMin)) && this.userMin !== -Infinity);
            if(this.includeZero && minWasSet && this.userMin > 0) {
                this.userMin = 0;
            }
            if(this.logScale && minWasSet) {
                this.userMin = this.mathUtils.absLogBaseTen(this.userMin);
            }
            if(minWasSet) {
                this.mapper.mapObject({
                    min: this.userMin,
                    minPadding: 0,
                    startOnTick: false
                });
            }
        },

        adjustUserMax: function() {
            var maxWasSet = (!(isNaN(this.userMax)) && this.userMax !== Infinity);
            if(this.includeZero && maxWasSet && this.userMax < 0) {
                this.userMax = 0;
            }
            if(this.logScale && maxWasSet) {
                this.userMax = this.mathUtils.absLogBaseTen(this.userMax);
            }
            if(maxWasSet) {
                this.mapper.mapObject({
                    max: this.userMax,
                    maxPadding: 0,
                    endOnTick: false
                });
            }
        },

        // override
        formatLabel: function(element) {
            if(this.percentMode && this.logScale) {
                // SPL-50950, this is a hack to make the axis labels look correct in the case of log scale and 100% stacked
                value = (element.value === 50) ? 10 : element.value;
            }
            else if(this.logScale) {
                value = this.mathUtils.absPowerTen(element.value);
            }
            else {
                value = element.value;
            }
            return this.formatNumber(value);
        },

        formatTooltipValue: function(element, valueKey) {
            // TODO: this is a little hacked up, maybe the axis object itself should create and store the rawY value?
            if(this.logScale) {
                var toRawMap = {
                    "y": "rawY",
                    "x": "rawX"
                };
                return this.formatNumber(element.point[toRawMap[valueKey]]);
            }
            return this.formatNumber(element[valueKey]);
        },

        formatNumber: function(value) {
            return format_decimal(value);
        },

        addRenderHooks: function() {
            $.extend(this.hcConfig, {
                hooks: {
                    tickRenderStart: this.tickRenderStartHook.bind(this)
                }
            });
        },

        tickRenderStartHook: function(options, extremes, chart) {
            var formatter = Splunk.JSCharting.FormattingHelper(chart.renderer);

            extremes.min = options.min || extremes.dataMin;
            extremes.max = options.max || extremes.dataMax;
            if(this.logScale) {
                this.formatLogAxes(options, extremes);
            }
            else if(this.hcConfig.tickInterval) {
                this.checkMajorUnitFit(this.hcConfig.tickInterval, extremes, options, formatter, chart);
            }
            if(this.includeZero) {
                this.enforceIncludeZero(options, extremes);
            }
            else {
                this.adjustAxisRange(options, extremes);
            }
            if(options.allowDecimals !== false) {
                this.enforceIntegerMajorUnit(options, extremes);
            }
            formatter.destroy();
        },

        formatLogAxes: function(options, extremes) {
            var firstTickValue = Math.ceil(extremes.min),
                lastTickValue = (options.endOnTick) ? Math.ceil(extremes.max) : extremes.max;

            if(this.percentMode) {
                options.tickInterval = 50;
            }
            // if we can show two or more tick marks, we'll clip to a tickInterval of 1
            else if(Math.abs(lastTickValue - firstTickValue) >= 1) {
                options.tickInterval = 1;
            }
            else {
                options.tickInterval = null;
            }
        },

        checkMajorUnitFit: function(unit, extremes, options, formatter, chart) {
            var range = Math.abs(extremes.max - extremes.min),
                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
                tickSpacing = unit * axisLength / range,
                largestExtreme = Math.max(Math.abs(extremes.min), Math.abs(extremes.max)),
                tickLabelPadding = (this.isVertical) ? 2 : 5,
                fontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10),

                translatePixels = function(pixelVal) {
                    return (pixelVal * range / axisLength);
                };

            if(this.isVertical) {
                var maxHeight = formatter.predictTextHeight(largestExtreme, fontSize);
                if(tickSpacing < (maxHeight + 2 * tickLabelPadding)) {
                    options.tickInterval = Math.ceil(translatePixels((maxHeight + 2 * tickLabelPadding), true));
                }
            }
            else {
                var maxWidth = formatter.predictTextWidth(largestExtreme, fontSize);
                if(tickSpacing < (maxWidth + 2 * tickLabelPadding)) {
                    options.tickInterval = Math.ceil(translatePixels((maxWidth + 2 * tickLabelPadding), true));
                }
            }
        },

        enforceIncludeZero: function(options, extremes) {
            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
            if(!extremes.min && !extremes.max) {
                options.min = 0;
                options.max = 100;
                return;
            }
            if(extremes.min >= 0) {
                options.min = 0;
                options.minPadding = 0;
            }
            else if(extremes.max <= 0) {
                options.max = 0;
                options.maxPadding = 0;
            }
        },

        // clean up various issues that can arise from the axis extremes
        adjustAxisRange: function(options, extremes) {
            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
            if(!extremes.min && !extremes.max) {
                options.min = 0;
                options.max = 100;
                return;
            }
            // if the min or max is such that no data makes it onto the chart, we hard-code some reasonable extremes
            if(extremes.min > extremes.dataMax && extremes.min > 0 && this.userMax === Infinity) {
                options.max = (this.logScale) ? extremes.min + 2 : extremes.min * 2;
                return;
            }
            if(extremes.max < extremes.dataMin && extremes.max < 0 && this.userMin === -Infinity) {
                options.min = (this.logScale) ? extremes.max - 2 : extremes.max * 2;
                return;
            }
            // if either data extreme is exactly zero, remove the padding on that side so the axis doesn't extend beyond zero
            if(extremes.dataMin === 0 && this.userMin === -Infinity) {
                options.min = 0;
                options.minPadding = 0;
            }
            if(extremes.dataMax === 0 && this.userMax === Infinity) {
                options.max = 0;
                options.maxPadding = 0;
            }
        },

        enforceIntegerMajorUnit: function(options, extremes) {
            var range = extremes.max - extremes.min;
            // if the axis range is ten or greater, require that the major unit be an integer
            if(range >= 5) {
                options.allowDecimals = false;
            }
        },

        // override
        postDrawCleanup: function($super, axis, formatter, chart) {
            $super(axis, formatter, chart);
            var fontSize = 11,
                tickLabelPadding = 2;

            if(this.isVertical) {
                this.checkFirstLabelFit(axis, formatter, chart, fontSize);
            }
            else {
                this.checkLastLabelFit(axis, formatter, chart, fontSize);
            }
        },

        checkLastLabelFit: function(axis, formatter, chart, fontSize) {
            var lastTick = this.getLastTick(axis.ticks);

            if(!lastTick || !lastTick.label) {
                return;
            }
            var tickLabelPadding = 5,
                availableWidth = (chart.plotWidth - axis.translate(lastTick.pos)) - tickLabelPadding;
            if(availableWidth <= 0 || lastTick.label.getBBox().width > availableWidth) {
                lastTick.label.hide();
            }
            else {
                lastTick.label.show();
            }
        },

        checkFirstLabelFit: function(axis, formatter, chart, fontSize) {
            var firstTick = this.getFirstTick(axis.ticks);

            if(!firstTick || !firstTick.label) {
                return;
            }
            var tickLabelPadding = 2,
                availableHeight = axis.translate(firstTick.pos) - tickLabelPadding;
            if(availableHeight <= 0 || firstTick.label.getBBox().height > availableHeight) {
                firstTick.label.hide();
            }
            else {
                firstTick.label.show();
            }
        }

    });


    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.CategoryAxis


    Splunk.JSCharting.CategoryAxis = $.klass(Splunk.JSCharting.AbstractAxis, {

        type: 'category',

        applyPropertyByName: function($super, key, value) {
            $super(key, value);
            switch(key) {
                case 'axisLabels.hideCategories':
                    if(value === true) {
                        this.mapper.mapValue(false, ['labels', 'enabled']);
                        this.mapper.mapValue(0, ['tickWidth']);
                        break;
                    }
                default:
                    // no-op for unsupported keys
                    break;
            }
        },

        // override
        generateConfig: function($super) {
            $super();
            this.chartIsLineBased = (this.properties.chartType in {line: 1, area: 1});

            this.mapper.mapObject({
                categories: this.data.categories,
                startOnTick: this.chartIsLineBased,
                tickmarkPlacement: (this.chartIsLineBased) ? 'on' : 'between',
                hooks: {
                    tickLabelsRenderStart: this.tickLabelsRenderStartHook.bind(this)
                }
            });

            if(this.isVertical) {
                this.mapper.mapObject({
                    labels: {
                        align: 'right',
                        x: -8
                    }
                });
            }
            else {
                this.mapper.mapObject({
                    labels: {
                        align: 'left'
                    },
                    // pad the x-axis for line-based charts so there will be room for the last label
                    max: (this.chartIsLineBased) ? this.data.categories.length : null,
                    endOnTick: this.chartIsLineBased,
                    showLastLabel: false,
                    title: {
                        margin: 10
                    }
                });
            }
        },

        tickLabelsRenderStartHook: function(options, categories, chart) {
            if(!options.labels.enabled) {
                return;
            }
            var maxWidth,
                formatter = new Splunk.JSCharting.FormattingHelper(chart.renderer);

            if(!options.originalCategories) {
                options.originalCategories = $.extend(true, [], categories);
            }
            if(this.isVertical) {
                var adjustedFontSize, labelHeight;

                maxWidth = Math.floor(chart.chartWidth / 6);
                adjustedFontSize = this.fitLabelsToWidth(options, categories, formatter, maxWidth);
                labelHeight = formatter.predictTextHeight("Test", adjustedFontSize);
                options.labels.y = (labelHeight / 3);
            }
            else {
                var tickLabelPadding = 5,
                    axisWidth = chart.plotWidth,
                    tickSpacing = (categories.length > 0) ? (axisWidth / categories.length) : axisWidth;

                maxWidth = tickSpacing - (2 * tickLabelPadding);
                this.fitLabelsToWidth(options, categories, formatter, maxWidth);
                if(options.tickmarkPlacement === 'between') {
                    options.labels.align = 'left';
                    options.labels.x = -(tickSpacing / 2) + tickLabelPadding;
                }
                else {
                    options.labels.align = 'left';
                    options.labels.x = tickLabelPadding;
                }
            }
            formatter.destroy();
        },

        // override
        formatTooltipValue: function(element, valueKey) {
            return Splunk.JSCharting.ParsingUtils.escapeHtml(element.point.name);
        },

        fitLabelsToWidth: function(options, categories, formatter, maxWidth) {
            var i, label,
                defaultFontSize = 11,
                minFontSize = 9,
                adjusted = formatter.adjustLabels(options.originalCategories, maxWidth, minFontSize, defaultFontSize, 'middle');

            for(i = 0; i < adjusted.labels.length; i++) {
                categories[i] = adjusted.labels[i];
            }
            options.labels.style.fontSize = adjusted.fontSize + 'px';
            return adjusted.fontSize;
        }

    });


    Splunk.JSCharting.TimeAxis = $.klass(Splunk.JSCharting.CategoryAxis, {

        numLabelCutoff: 6,
        type: 'time',

        // override
        initialize: function($super, properties, data, orientation, colorScheme, exportMode) {
            this.timeUtils = Splunk.JSCharting.TimeUtils;
            this.exportMode = exportMode;
            $super(properties, data, orientation, colorScheme);
        },

        // override
        generateConfig: function($super) {
            var xSeries = this.data.xSeries,
                _spanSeries = this.data._spanSeries,
                categoryInfo = this.timeUtils.convertTimeToCategories(xSeries, _spanSeries, this.numLabelCutoff);

            this.data.categories = categoryInfo.categories;
            this.rawLabels = categoryInfo.rawLabels;
            this.span = categoryInfo.span;
            this.granularity = categoryInfo.granularity;
            $super();
            this.mapper.mapObject({
                hooks: {
                    tickPositionsSet: this.tickPositionsSetHook.bind(this)
                }
            });

            if(!this.isVertical) {
                var spanSeries = this.data._spanSeries,
                    span = (spanSeries && spanSeries.length > 0) ? spanSeries[0] : 1,
                    secsPerYear = 60 * 60 * 24 * 365;

                this.hcConfig.title.margin = (span >= secsPerYear) ? 10 : 5;
            }
        },

        //override
        formatLabel: function(element){
            return element.value;
        },

        formatTooltipValue: function(element, valueKey) {
            var isoString = element.point.name,
                span = parseInt(this.span, 10) || 1;
            return this.timeUtils.formatIsoStringAsTooltip(isoString, span) || _('Invalid timestamp');
        },

        tickLabelsRenderStartHook: function(options, categories, chart) {
            var tickLabelPadding = (this.isVertical) ? 2 : 5,
                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
                tickSpacing = (categories.length > 0) ? (axisLength / categories.length) : axisWidth;

            if(this.isVertical) {
                var labelFontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10);
                options.labels.y = (tickSpacing / 2) + labelFontSize + tickLabelPadding;
            }
            else {
                if(options.tickmarkPlacement === 'on') {
                    options.labels.align = 'left';
                    options.labels.x = tickLabelPadding;
                }
                else {
                    options.labels.align = 'left';
                    options.labels.x = (tickSpacing / 2) + tickLabelPadding;
                }
            }
            // for the VML renderer we have to make sure our tick labels won't wrap unnecessarily
            // and will accurately report their own widths
            if(!this.hasSVG) {
                options.labels.style['white-space'] = 'nowrap';
                options.labels.style.width = 'auto';
            }
        },

        tickPositionsSetHook: function(options, categories, tickPositions, chart) {
            if(!options.originalCategories) {
                options.originalCategories = $.extend(true, [], categories);
            }
            var i,
                originalCategories = options.originalCategories;

            // empty the tickPostions array without reassigning the reference
            tickPositions.length = 0;
            for(i = 0; i < originalCategories.length; i++) {
                if(originalCategories[i] && originalCategories[i] !== " ") {
                    if(options.tickmarkPlacement === 'on') {
                        tickPositions.push(i);
                    }
                    else {
                        // if the tickmark placement is 'between', we shift everything back one
                        // interestingly, HighCharts will allow negatives here, and in fact that's what we need to label the first point
                        tickPositions.push(i - 1);
                        categories[i - 1] = originalCategories[i];
                    }
                }
            }
        },

        postDrawCleanup: function($super, axis, formatter, chart) {
            $super(axis, formatter, chart);
            if(!axis.options.labels.enabled) {
                return;
            }
            var i,
                tickArray = this.getTicksAsOrderedArray(axis.ticks),
                lastTick = tickArray[tickArray.length - 1];

            this.resolveLabelCollisions(tickArray, this.rawLabels, formatter, chart);
            // if resolving label collisions did not hide the last tick, make sure its label fits
            if(lastTick && lastTick.mark && formatter.elementIsVisible(lastTick.mark)) {
                if(!this.lastLabelFits(lastTick, axis, chart)) {
                    lastTick.label.hide();
                }
                else {
                    lastTick.label.show();
                }
            }
        },

        lastLabelFits: function(lastTick, axis, chart) {
            if(!lastTick.label) {
                return;
            }
            var tickLabelPadding;
            if(this.isVertical) {
                var availableHeight;
                tickLabelPadding = 3;

                availableHeight = (chart.plotTop + chart.plotHeight - lastTick.label.attr('y')) - tickLabelPadding;
                if(lastTick.labelBBox.height > availableHeight) {
                    return false;
                }
            }
            else {
                var availableWidth;
                tickLabelPadding = 5;

                availableWidth = (chart.plotLeft + chart.plotWidth - lastTick.label.attr('x')) - tickLabelPadding;
                if(lastTick.labelBBox.width > availableWidth) {
                    return false;
                }
            }
            return true;
        },

        resolveLabelCollisions: function(ticks, rawLabels, formatter, chart) {
            if(ticks.length < 2) {
                return;
            }
            var i, bBox1, bBox2, bdTime, prevBdTime, labelText,
                horizontalPadding = 10,
                verticalPadding = 5,
                collisionExists = false,
                dataSpan = this.data._spanSeries[0],
                tickSpacing = (ticks.length > 1) ? (ticks[1].pos - ticks[0].pos) : 1,
                // get a rough estimate of the seconds between tickmarks
                labelSpan = dataSpan * tickSpacing,

                bBoxesCollide = (this.isVertical) ?
                    function(bBox1, bBox2) {
                        return (bBox2.y <= bBox1.y + bBox1.height + verticalPadding);
                    } :
                    function(bBox1, bBox2) {
                        return (bBox2.x <= bBox1.x + bBox1.width + horizontalPadding);
                    };

            for(i = 0; i < ticks.length - 2; i++) {
                bBox1 = formatter.getTickLabelBBox(ticks[i]);
                bBox2 = formatter.getTickLabelBBox(ticks[i + 1]);
                if(bBoxesCollide(bBox1, bBox2)) {
                    collisionExists = true;
                    break;
                }
            }
            if(collisionExists) {
                for(i = 1; i < ticks.length; i++) {
                    if(i % 2 === 0) {
                        bdTime = this.timeUtils.extractBdTime(rawLabels[i]);
                        prevBdTime = this.timeUtils.extractBdTime(rawLabels[i - 2]);
                        formatter.setElementText(ticks[i].label, this.timeUtils.formatBdTimeAsLabel(bdTime, prevBdTime, this.granularity) || "");
                    }
                    else {
                        ticks[i].label.hide();
                        if(ticks[i].mark) {
                            ticks[i].mark.hide();
                        }
                    }
                }
            }
            else {
                for(i = 1; i < ticks.length; i++) {
                    if(i % 2 === 0) {
                        bdTime = this.timeUtils.extractBdTime(rawLabels[i]);
                        prevBdTime = this.timeUtils.extractBdTime(rawLabels[i - 1]);
                        formatter.setElementText(ticks[i].label, this.timeUtils.formatBdTimeAsLabel(bdTime, prevBdTime, this.granularity) || "");
                    }
                    else {
                        ticks[i].label.show();
                        if(ticks[i].mark) {
                            ticks[i].mark.show();
                        }
                    }
                }
            }
        }

    });


    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PropertyMapper

    Splunk.JSCharting.PropertyMapper = function(configObject) {

        var mapper = this;

        mapper.mapIfInt = function(value, path) {
            var intVal = parseInt(value, 10);
            if(isNaN(intVal)) {
                return;
            }
            mapper.mapValue(intVal, path);
        };

        mapper.mapIfFloat = function(value, path) {
            var floatVal = parseFloat(value);
            if(isNaN(floatVal)) {
                return;
            }
            mapper.mapValue(floatVal, path);
        };

        mapper.mapValue = function(value, configPath) {
            var i, loopObject,
                extendObject = {},
                pathHead = extendObject;

            for(i = 0; i < configPath.length - 1; i++) {
                loopObject = pathHead;
                loopObject[configPath[i]] = {};
                pathHead = loopObject[configPath[i]];
            }
            pathHead[configPath[configPath.length - 1]] = value;
            $.extend(true, configObject, extendObject);
        };

        mapper.mapObject = function(extendObject) {
            $.extend(true, configObject, extendObject);
        };

        return mapper;
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.FormattingHelper


    Splunk.JSCharting.FormattingHelper = function(renderer) {

        var formatter = this,
            hasSVG = Splunk.JSCharting.hasSVG;

        // a cross-renderer way to read out an wrapper's element text content
        formatter.getElementText = function(wrapper) {
            return (hasSVG) ? wrapper.textStr : $(wrapper.element).html();
        };

        // a renderer-indpendent way to update an wrapper's element text content
        formatter.setElementText = function(wrapper, text) {
            wrapper.added = true; // the SVG renderer needs this
            wrapper.attr({text: text});
        };

        // a cross-renderer way to find out if a wrapper's element is visible
        formatter.elementIsVisible = function(wrapper) {
            if(hasSVG) {
                return wrapper.attr('visibility') !== "hidden";
            }
            return wrapper.element.style.visibility !== "hidden";
        };

        // a cross-renderer way to get a tick label bounding box, sometimes the VML renderer doesn't
        // accurately report its x and y co-ordinates
        formatter.getTickLabelBBox = function(tick) {
            var labelBBox = tick.label.getBBox();
            if(!hasSVG) {
                labelBBox.x = tick.label.x;
                labelBBox.y = tick.label.y;
            }
            return labelBBox;
        };

        formatter.ellipsize = function(text, width, fontSize, mode) {
            if(text.length <= 3) {
                return text;
            }
            if(!width || isNaN(parseFloat(width, 10))) {
                return "...";
            }
            if(!fontSize || isNaN(parseFloat(fontSize, 10))) {
                return text;
            }
            if(formatter.predictTextWidth(text, fontSize) <= width) {
                return text;
            }
            // memoize the width of the ellipsis
            if(!formatter.ellipsisWidth) {
                formatter.ellipsisWidth = formatter.predictTextWidth("...", fontSize);
            }
            switch(mode) {
                case 'start':
                    var reversedText = formatter.reverseString(text),
                        reversedTrimmed = formatter.trimStringToWidth(reversedText, (width - formatter.ellipsisWidth), fontSize);
                    return "..." + formatter.reverseString(reversedTrimmed);
                case 'end':
                    return formatter.trimStringToWidth(text, (width - formatter.ellipsisWidth), fontSize) + "...";
                default:
                    // default to middle ellipsization
                    var firstHalf = text.substr(0, Math.ceil(text.length / 2)),
                        secondHalf = text.substr(Math.floor(text.length / 2)),
                        halfFitWidth = (width - formatter.ellipsisWidth) / 2,
                        secondHalfReversed = formatter.reverseString(secondHalf),
                        firstHalfTrimmed = formatter.trimStringToWidth(firstHalf, halfFitWidth, fontSize),
                        secondHalfTrimmedReversed = formatter.trimStringToWidth(secondHalfReversed, halfFitWidth, fontSize);

                    return firstHalfTrimmed + "..." + formatter.reverseString(secondHalfTrimmedReversed);
            }
        };

        // NOTE: it is up to caller to test that the entire string does not already fit
        // even if it does, this method will do log N work and may or may not truncate the last character
        formatter.trimStringToWidth = function(text, width, fontSize) {
            var binaryFindEndIndex = function(start, end) {
                    var testIndex;
                    while(end > start + 1) {
                        testIndex = Math.floor((start + end) / 2);
                        if(formatter.predictTextWidth(text.substr(0, testIndex), fontSize) > width) {
                            end = testIndex;
                        }
                        else {
                            start = testIndex;
                        }
                    }
                    return start;
                },
                endIndex = binaryFindEndIndex(0, text.length);

            return text.substr(0, endIndex);
        };

        formatter.reverseString = function(str) {
            return str.split("").reverse().join("");
        };

        formatter.predictTextWidth = function(text, fontSize) {
            if(!fontSize || !text) {
                return 0;
            }
            var bBox = (formatter.getTextBBox(text, fontSize));
            return (bBox) ? bBox.width : 0;
        };

        formatter.predictTextHeight = function(text, fontSize) {
            if(!fontSize || !text) {
                return 0;
            }
            var bBox = (formatter.getTextBBox(text, fontSize));
            return (bBox) ? bBox.height : 0;
        };

        formatter.getTextBBox = function(text, fontSize) {
            if(isNaN(parseFloat(fontSize, 10))) {
                return undefined;
            }
            if(formatter.textPredicter) {
                formatter.textPredicter.destroy();
            }
            formatter.textPredicter = renderer.text(text, 0, 0)
                .attr({
                    visibility: 'hidden'
                })
                .css({
                    fontSize: fontSize + 'px'
                })
                .add();
            return formatter.textPredicter.getBBox();
        };

        formatter.adjustLabels = function(originalLabels, width, minFont, maxFont, ellipsisMode) {
            var i, fontSize, ellipsize,
                labels = $.extend(true, [], originalLabels),
                longestLabel = "",
                longestFits = false;
            // find the longest label
            for(i = 0; i < labels.length; i++) {
                if(labels[i] && labels[i].length > longestLabel.length) {
                    longestLabel = labels[i];
                }
            }
            // adjust font and try to fit longest
            for(fontSize = maxFont; fontSize > minFont; fontSize--) {
                longestFits = (formatter.predictTextWidth(longestLabel, fontSize) <= width);
                if(longestFits) {
                    break;
                }
            }
            var shouldEllipsize = (!longestFits && ellipsisMode !== 'none');
            if(shouldEllipsize) {
                for(i = 0; i < labels.length; i++) {
                    labels[i] = formatter.ellipsize(labels[i], width, fontSize, ellipsisMode);
                }
            }
            return {
                labels: labels,
                fontSize: fontSize,
                areEllipsized: shouldEllipsize,
                longestWidth: formatter.predictTextWidth(longestLabel, fontSize)
            };
        };

        formatter.bBoxesOverlap = function(bBox1, bBox2, marginX, marginY) {
            marginX = marginX || 0;
            marginY = marginY || 0;
            var box1Left = bBox1.x - marginX,
                box2Left = bBox2.x - marginX,
                box1Right = bBox1.x + bBox1.width + 2 * marginX,
                box2Right = bBox2.x + bBox2.width + 2 * marginX,
                box1Top = bBox1.y - marginY,
                box2Top = bBox2.y - marginY,
                box1Bottom = bBox1.y + bBox1.height + 2 * marginY,
                box2Bottom = bBox2.y + bBox2.height + 2 * marginY;

            return ((box1Left < box2Right) && (box1Right > box2Left)
                        && (box1Top < box2Bottom) && (box1Bottom > box2Top));
        };

        formatter.destroy = function() {
            if(formatter.textPredicter) {
                formatter.textPredicter.destroy();
                formatter.textPredicter = false;
            }
        };

        return formatter;

    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ListColorPalette


    Splunk.JSCharting.ListColorPalette = function(colors, useInterpolation) {

        colors = colors || Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS;
        useInterpolation = (useInterpolation) ? true : false;
        var self = this;

        self.getColor = function(field, index, count) {
            var p, index1, index2,
                numColors = colors.length;

            if(numColors == 0) {
                return 0x000000;
            }
            if(index < 0) {
                index = 0;
            }
            if(!useInterpolation) {
                return colors[index % numColors];
            }
            if (count < 1) {
                count = 1;
            }
            if (index > count) {
                index = count;
            }
            p = (count == 1) ? 0 : (numColors - 1) * (index / (count - 1));
            index1 = Math.floor(p);
            index2 = Math.min(index1 + 1, numColors - 1);
            p -= index1;

            return self.interpolateColors(colors[index1], colors[index2], p);
        };

        // this is a direct port from the Flash library, ListColorPalette.as line 85
        self.interpolateColors = function(color1, color2, p) {
            var r1 = (color1 >> 16) & 0xFF,
                g1 = (color1 >> 8) & 0xFF,
                b1 = color1 & 0xFF,

                r2 = (color2 >> 16) & 0xFF,
                g2 = (color2 >> 8) & 0xFF,
                b2 = color2 & 0xFF,

                rInterp = r1 + Math.round((r2 - r1) * p),
                gInterp = g1 + Math.round((g2 - g1) * p),
                bInterp = b1 + Math.round((b2 - b1) * p);

            return ((rInterp << 16) | (gInterp << 8) | bInterp);
        };

        //implicit return this (aka self)
    };

    Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS = [
        0x6BB7C8,
        0xFAC61D,
        0xD85E3D,
        0x956E96,
        0xF7912C,
        0x9AC23C,
        0x998C55,
        0xDD87B0,
        0x5479AF,
        0xE0A93B,
        0x6B8930,
        0xA04558,
        0xA7D4DF,
        0xFCDD77,
        0xE89E8B,
        0xBFA8C0,
        0xFABD80,
        0xC2DA8A,
        0xC2BA99,
        0xEBB7D0,
        0x98AFCF,
        0xECCB89,
        0xA6B883,
        0xC68F9B,
        0x416E79,
        0x967711,
        0x823825,
        0x59425A,
        0x94571A,
        0x5C7424,
        0x5C5433,
        0x85516A,
        0x324969,
        0x866523,
        0x40521D,
        0x602935
    ];


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractGauge


    Splunk.JSCharting.AbstractGauge = $.klass(Splunk.JSCharting.AbstractVisualization, {

        DEFAULT_COLORS: [0x69a847, 0xd5c43b, 0xa6352d],

        needsLegendMapping: false,
        maxTicksPerRange: 10,

        // override
        initialize: function($super, container) {
            $super(container);

            this.gaugeIsRendered = false;
            this.elements = {};
            this.colors = this.DEFAULT_COLORS;
            this.ranges = false;
            this.rangesCameFromXML = false;
            this.showMajorTicks = true;
            this.showMinorTicks = true;
            this.showLabels = true;
            this.showValue = true;
            this.showRangeBand = true;
            this.usePercentageRange = false;
            this.usePercentageValue = false;
            this.isShiny = true;
            this.propertiesAreStale = false;
            this.pendingData = false;
            this.pendingFieldInfo = false;

            $(window).resize(function() {
                var newWidth = $(this.renderTo).width(),
                    newHeight = $(this.renderTo).height();
                if((newWidth && newWidth !== this.chartWidth) || (newHeight && newHeight !== this.chartHeight)) {
                    clearTimeout(this.windowResizeTimeout);
                    this.windowResizeTimeout = setTimeout(function() {
                        this.onWindowResized(newWidth, newHeight);
                    }.bind(this), 100);
                }
            }.bind(this));

        },

        prepare: function(data, fieldInfo, properties) {
            this.properties = properties;
            this.applyProperties(properties);
            this.processData(data, fieldInfo, properties);
            this.colorPalette = new Splunk.JSCharting.ListColorPalette(this.colors, true);
            this.propertiesAreStale = true;

            // in export mode, hard-code a height and width for gauges
            if(this.exportMode) {
                this.chartWidth = 600;
                this.chartHeight = 400;
            }
        },

        draw: function(callback) {
            var needsRedraw = true;
            if(!this.propertiesAreStale && this.pendingData && this.pendingFieldInfo) {
                var oldValue = this.value,
                    oldRanges = this.ranges;

                this.processData(this.pendingData, this.pendingFieldInfo, this.properties);
                // if the ranges haven't changed, we can do an animated update in place
                if(this.parseUtils.arraysAreEquivalent(oldRanges, this.ranges)) {
                    this.updateValue(oldValue, this.value);
                    needsRedraw = false;
                }
                this.pendingData = false;
                this.pendingFieldInfo = false;
            }
            if(needsRedraw) {
                this.destroy();
                this.renderer = new Highcharts.Renderer(this.renderTo, this.chartWidth, this.chartHeight);
                this.formatter = new Splunk.JSCharting.FormattingHelper(this.renderer);
                $(this.renderTo).css('backgroundColor', this.backgroundColor);
                this.renderGauge();
                this.nudgeChart();
                this.gaugeIsRendered = true;
                $(this.renderTo).addClass('highcharts-container');
                // add this class and attribute on successful draw for UI testing
                if(this.testMode) {
                    this.addTestingMetadata();
                }

                // in export mode, need to make sure each circle element has cx and cy attributes
                if(this.exportMode) {
                    $(this.renderTo).find('circle').each(function(i, elem) {
                        var $elem = $(elem);
                        $elem.attr('cx', $elem.attr('x'));
                        $elem.attr('cy', $elem.attr('y'));
                    });
                }
                this.propertiesAreStale = false;
            }
            if(callback) {
                var chartObject = this.getChartObject();
                callback(chartObject);
            }
        },

        setData: function(data, fieldInfo) {
            this.pendingData = data;
            this.pendingFieldInfo = fieldInfo;
        },

        onWindowResized: function(newWidth, newHeight) {
            if(this.gaugeIsRendered) {
                this.resize(newWidth, newHeight);
            }
        },

        resize: function(width, height) {
            this.chartWidth = width;
            this.chartHeight = height;
            this.destroy();
            this.renderer = new Highcharts.Renderer(this.renderTo, this.chartWidth, this.chartHeight);
            this.formatter = new Splunk.JSCharting.FormattingHelper(this.renderer);
            this.renderGauge();
            this.nudgeChart();
            if(this.testMode) {
                this.addTestingMetadata();
            }
            this.gaugeIsRendered = true;
        },

        destroy: function() {
            // stop any running animations
            this.stopWobble();
            $(this.renderTo).stop();
            for(var key in this.elements) {
                if(this.elements.hasOwnProperty(key)) {
                    this.elements[key].destroy();
                }
            }
            this.elements = {};
            $(this.renderTo).empty();
            $(this.renderTo).css('backgroundColor', '');
            $(this.renderTo).removeClass('highcharts-container');
            // remove the UI testing hooks
            if(this.testMode) {
                this.removeTestingMetadata();
            }
            this.gaugeIsRendered = false;
        },

        // this is just creating a stub interface so automated tests won't fail
        getChartObject: function() {
            return {
                series: [
                    {
                        data: [
                               {
                                   y: this.value,
                                   onMouseOver: function() { }
                               }
                        ]
                    }
                ]
            };
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {

                case 'gaugeColors':
                    this.mapGaugeColors(value);
                    break;
                case 'chart.rangeValues':
                    this.mapRangeValues(value);
                    break;
                case 'chart.majorUnit':
                    this.majorUnit = parseInt(value, 10);
                    break;
                case 'chart.showMajorTicks':
                    this.showMajorTicks = (value === 'true');
                    break;
                case 'chart.showMinorTicks':
                    this.showMinorTicks = (value === 'true');
                    break;
                case 'chart.showLabels':
                    this.showLabels = (value === 'true');
                    break;
                case 'chart.showValue':
                    this.showValue = (value === 'true');
                    break;
                case 'chart.showRangeBand':
                    this.showRangeBand = (value === 'true');
                    break;
                case 'chart.usePercentageRange':
                    this.usePercentageRange = (value === 'true');
                    break;
                case 'chart.usePercentageValue':
                    this.usePercentageValue = (value === 'true');
                    break;
                case 'chart.style':
                    this.isShiny = (value !== 'minimal');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        mapGaugeColors: function(value) {
            if(!value) {
                return;
            }
            var colors = this.parseUtils.stringToHexArray(value);
            if(colors && colors.length > 0) {
                this.colors = colors;
            }
        },

        mapRangeValues: function(value) {
            var i, rangeNumber,
                prevRange = -Infinity,
                unprocessedRanges = this.parseUtils.stringToArray(value),
                ranges = [];

            for(i = 0; i < unprocessedRanges.length; i++) {
                rangeNumber = this.mathUtils.parseFloat(unprocessedRanges[i]);
                if(isNaN(rangeNumber)) {
                    // ignore the entire range list if an invalid entry is present
                    return;
                }
                // de-dupe the ranges and ensure ascending order
                if(rangeNumber > prevRange) {
                    ranges.push(rangeNumber);
                    prevRange = rangeNumber;
                }
            }
            // if we couldn't extract at least two valid range numbers, ignore the list altogether
            if(!ranges || ranges.length < 2) {
                return;
            }
            this.ranges = ranges;
            this.rangesCameFromXML = true;
        },

        setExportDimensions: function() {
            this.chartWidth = 600;
            this.chartHeight = 400;
        },

        processData: function(data, fieldInfo, properties) {
            if(!data || !data.series || !data.xSeries) {
                this.value = 0;
                if(!this.rangesCameFromXML) {
                    this.ranges = [0, 30, 70, 100];
                }
                return;
            }

            var i, prevValue, loopField, loopValue, value,
                fieldNames = data.fieldNames,
                xSeries = data.xSeries,
                ranges = [];

            // about to do a bunch of work to make sure we draw a reasonable gauge even if the data
            // is not what we expected, but only if there were no ranges specified in the XML
            if(!this.rangesCameFromXML) {
                prevValue = -Infinity;
                for(i = 0; i < fieldNames.length; i++) {
                    loopField = fieldNames[i];
                    if(data.series[loopField].length > 0) {
                        loopValue = data.series[loopField][0].rawY;
                        if(!isNaN(loopValue) && loopValue > prevValue) {
                            ranges.push(loopValue);
                            prevValue = loopValue;
                        }
                    }
                }
                // if we were not able to extract at least two range values, punt to ranges of [0, 30, 70, 100]
                if(ranges.length < 2) {
                    ranges = [0, 30, 70, 100];
                }

                this.ranges = ranges;
            }
            // javascript likes to incorrectly parse timestamps as the year value, so explicitly set value to NaN for time axes
            value = (data.xAxisType === 'time') ? NaN : parseFloat(xSeries[0]);
            if(isNaN(value)) {
                value = (!this.rangesCameFromXML) ? ranges[0] : 0;
            }
            this.value = value;
        },

        updateValue: function(oldValue, newValue) {
            // if the value didn't change, do nothing
            if(oldValue === newValue) {
                return;
            }
            if(this.shouldAnimateTransition(oldValue, newValue)) {
                this.stopWobble();
                this.animateTransition(oldValue, newValue, this.drawIndicator.bind(this), this.onAnimationFinished.bind(this));
            }
            if(this.showValue) {
                var valueText = this.formatValue(newValue);
                this.updateValueDisplay(valueText);
            }
            if(this.testMode) {
                $(this.renderTo).attr('data-gauge-value', newValue);
            }
        },

        shouldAnimateTransition: function(oldValue, newValue) {
            // if we were already out of range, no need to animate the indicator
            return (this.normalizedTranslateValue(oldValue) !== this.normalizedTranslateValue(newValue));
        },

        drawTicks: function() {
            var i, loopTranslation, loopText,
                tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);

            for(i = 0; i < tickValues.length; i++) {
                loopTranslation = this.translateValue(tickValues[i]);
                if(this.showMajorTicks) {
                    this.elements['tickMark_' + tickValues[i]] = this.drawMajorTick(loopTranslation);
                }
                if(this.showLabels) {
                    loopText = this.formatTickLabel(tickValues[i]);
                    this.elements['tickLabel_' + tickValues[i]] = this.drawMajorTickLabel(loopTranslation, loopText);
                }
            }
            // if the labels are visible, check for collisions and remove ticks if needed before drawing the minors
            if(this.showLabels) {
                tickValues = this.removeTicksIfOverlap(tickValues);
            }

            if(this.showMinorTicks) {
                var majorInterval = tickValues[1] - tickValues[0],
                    minorInterval = majorInterval / this.minorsPerMajor,
                    startValue = (this.usePercentageRange) ?
                            this.ranges[0] :
                            tickValues[0] - Math.floor((tickValues[0] - this.ranges[0]) / minorInterval) * minorInterval;

                for(i = startValue; i <= this.ranges[this.ranges.length - 1]; i += minorInterval) {
                    if(!this.showMajorTicks || $.inArray(i, tickValues) < 0) {
                        loopTranslation = this.translateValue(i);
                        this.elements['minorTickMark_' + i] = this.drawMinorTick(loopTranslation);
                    }
                }
            }
        },

        removeTicksIfOverlap: function(tickValues) {
            while(tickValues.length > 2 && this.tickLabelsOverlap(tickValues)) {
                tickValues = this.removeEveryOtherTick(tickValues);
            }
            return tickValues;
        },

        tickLabelsOverlap: function(tickValues) {
            var i, labelOne, labelTwo,
                marginX = 3,
                marginY = 1;

            for(i = 0; i < tickValues.length - 1; i++) {
                labelOne = this.elements['tickLabel_' + tickValues[i]];
                labelTwo = this.elements['tickLabel_' + tickValues[i + 1]];
                if(this.formatter.bBoxesOverlap(labelOne.getBBox(), labelTwo.getBBox(), marginX, marginY)) {
                    return true;
                }
            }
            return false;
        },

        removeEveryOtherTick: function(tickValues) {
            var i,
                newTickValues = [];

            for(i = 0; i < tickValues.length; i++) {
                if(i % 2 === 0) {
                    newTickValues.push(tickValues[i]);
                }
                else {
                    this.elements['tickMark_' + tickValues[i]].destroy();
                    this.elements['tickLabel_' + tickValues[i]].destroy();
                    delete this.elements['tickMark_' + tickValues[i]];
                    delete this.elements['tickLabel_' + tickValues[i]];
                }
            }
            return newTickValues;
        },

        // we can't use the jQuery animation library explicitly to perform complex SVG animations, but
        // we can take advantage of their implementation using a meaningless css property and a custom step function
        animateTransition: function(startVal, endVal, drawFn, finishCallback) {
            var animationRange = endVal - startVal,
                duration = 500,
                animationProperties = {
                    duration: duration,
                    step: function(now, fx) {
                        drawFn(startVal + now);
                        this.nudgeChart();
                    }.bind(this)
                };

            if(finishCallback) {
                animationProperties.complete = function() {
                    finishCallback(endVal);
                };
            }
            // for the animation start and end values, use 0 and animationRange for consistency with the way jQuery handles
            // css properties that it doesn't recognize
            $(this.renderTo)
                .stop(true, true)
                .css({'animation-progress': 0})
                .animate({'animation-progress': animationRange}, animationProperties);
        },

        onAnimationFinished: function(val) {
            this.checkOutOfRange(val);
        },

        checkOutOfRange: function(val) {
            var totalRange, wobbleCenter, wobbleRange;

            if(val < this.ranges[0]) {
                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
                wobbleRange = totalRange * 0.005;
                wobbleCenter = this.ranges[0] + wobbleRange;
                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
            }
            else if(val > this.ranges[this.ranges.length - 1]) {
                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
                wobbleRange = totalRange * 0.005;
                wobbleCenter = this.ranges[this.ranges.length - 1] - wobbleRange;
                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
            }
        },

        translateValue: function(val) {
            // to be implemented by subclass
        },

        normalizedTranslateValue: function(val) {
            // to be implemented by subclass
        },

        formatValue: function(val) {
            return (this.usePercentageValue) ?
                    this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) :
                    this.formatNumber(val);
        },

        formatTickLabel: function(val) {
            return (this.usePercentageRange) ?
                    this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) :
                    this.formatNumber(val);
        },

        formatNumber: function(val) {
            var parsedVal = parseFloat(val),
                absVal = Math.abs(parsedVal);
            // if the magnitude is 1 billion or greater or less than one thousandth (and non-zero), express it in scientific notation
            if(absVal >= 1e9 || (absVal !== 0 && absVal < 1e-3)) {
                return format_scientific(parsedVal, "#.###E0");
            }
            return format_decimal(parsedVal);
        },

        formatPercent: function(val) {
            return format_percent(val);
        },

        wobble: function(center, range, drawFn) {
            var self = this,
                wobbleCounter = 0;

            this.wobbleInterval = setInterval(function() {
                var wobbleVal = center + (wobbleCounter % 3 - 1) * range;
                drawFn.call(self, wobbleVal);
                self.nudgeChart();
                wobbleCounter = (wobbleCounter + 1) % 3;
            }, 75);

        },

        stopWobble: function() {
            clearInterval(this.wobbleInterval);
        },

        nudgeChart: function() {
            // sometimes the VML renderer needs a "nudge" in the form of adding an invisible
            // element, this is a no-op for the SVG renderer
            if(this.hasSVG) {
                return;
            }
            if(this.elements.nudgeElement) {
                this.elements.nudgeElement.destroy();
            }
            this.elements.nudgeElement = this.renderer.rect(0, 0, 0, 0).add();
        },

        predictTextWidth: function(text, fontSize) {
            return this.formatter.predictTextWidth(text, fontSize);
        },

        calculateTickValues: function(start, end, numTicks) {
            var i, loopStart,
                range = end - start,
                rawTickInterval = range / (numTicks - 1),
                nearestPowerOfTen = this.mathUtils.nearestPowerOfTen(rawTickInterval),
                roundTickInterval = nearestPowerOfTen,
                tickValues = [];

            if(this.usePercentageRange) {
                roundTickInterval = (this.majorUnit && !isNaN(this.majorUnit)) ? this.majorUnit : 10;
                for(i = 0; i <= 100; i += roundTickInterval) {
                    tickValues.push(start + (i / 100) * range);
                }
            }
            else {
                if(this.majorUnit && !isNaN(this.majorUnit)) {
                    roundTickInterval = this.majorUnit;
                }
                else {
                    if(range / roundTickInterval > numTicks) {
                        // if the tick interval creates too many ticks, bump up to a factor of two
                        roundTickInterval *= 2;
                    }
                    if(range / roundTickInterval > numTicks) {
                        // if there are still too many ticks, bump up to a factor of five (of the original)
                        roundTickInterval *= (5 / 2);
                    }
                    if(range / roundTickInterval > numTicks) {
                        // if there are still too many ticks, bump up to a factor of ten (of the original)
                        roundTickInterval *= 2;
                    }
                }
                // in normal mode we label in whole numbers, so the tick discovery loop starts at 0 or an appropriate negative number
                // but in percent mode we force it to label the first range value and go from there
                loopStart = (this.usePercentageRange) ?
                                start :
                                (start >= 0) ? 0 : (start - start % roundTickInterval);
                for(i = loopStart; i <= end; i += roundTickInterval) {
                    if(i >= start) {
                        // work-around to deal with floating-point rounding errors
                        tickValues.push(parseFloat(i.toFixed(14)));
                    }
                }
            }
            return tickValues;
        },

        getColorByIndex: function(index) {
            return this.colorUtils.colorFromHex(this.colorPalette.getColor(null, index, this.ranges.length - 1));
        },

        roundWithMin: function(value, min) {
            return Math.max(Math.round(value), min);
        },

        roundWithMinMax: function(value, min, max) {
            var roundVal = Math.round(value);
            if(roundVal < min) {
                return min;
            }
            if(roundVal > max) {
                return max;
            }
            return roundVal;
        },

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // code to add testing hooks for automated tests, no other code should rely on these classes!

        addTestingMetadata: function() {
            $(this.renderTo).addClass(this.typeName);
            $(this.renderTo).attr('data-gauge-value', this.value);
            if(this.elements.valueDisplay) {
                this.addClassToElement(this.elements.valueDisplay.element, 'gauge-value');
            }
            for(key in this.elements) {
                if(/^tickLabel_/.test(key)) {
                    this.addClassToElement(this.elements[key].element, 'gauge-tick-label');
                }
            }
            for(key in this.elements){
                if(/^colorBand/.test(key)){
                    this.addClassToElement(this.elements[key].element, 'gauge-color-band');
                }
            }
            $('.gauge-color-band').each(function(){
                $(this).attr('data-band-color', $(this).attr('fill'));
            });

            if(this.elements.fill){
                $(this.elements.fill.element).attr('data-indicator-color', $(this.elements.fill.element).attr('fill'));
            }
            // this is bad OOP but I think it's better to keep all of this code in one method
            if(this.elements.needle) {
                this.addClassToElement(this.elements.needle.element, 'gauge-indicator');
            }
            if(this.elements.markerLine) {
                this.addClassToElement(this.elements.markerLine.element, 'gauge-indicator');
            }
        },

        removeTestingMetadata: function() {
            $(this.renderTo).removeClass(this.typeName);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.RadialGauge


    Splunk.JSCharting.RadialGauge = $.klass(Splunk.JSCharting.AbstractGauge, {

        typeName: 'radialGauge-chart',

        // override
        initialize: function($super, container) {
            $super(container);
            // since the gauge is circular, have to handle when the container is narrower than it is tall
            this.chartHeight = (this.chartWidth < this.chartHeight) ? this.chartWidth : this.chartHeight;
            this.verticalPadding = 10;
            this.minorsPerMajor = 10;
            this.tickWidth = 1;

            this.showMinorTicks = false;
        },

        updateValueDisplay: function(valueText) {
            this.elements.valueDisplay.attr({
                text: valueText
            });
        },

        // override
        // since the gauge is circular, have to handle when the container is narrower than it is tall
        resize: function($super, width, height) {
            height = (width < height) ? width : height;
            $super(width, height);
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            var angle;
            $super(key, value, properties);
            switch(key) {

                case 'chart.rangeStartAngle':
                    angle = parseInt(value, 10);
                    if(!isNaN(angle)) {
                        // add 90 to startAngle because we start at south instead of east
                        this.startAngle = this.degToRad(angle + 90);
                    }
                    break;
                case 'chart.rangeArcAngle':
                    angle = parseInt(value, 10);
                    if(!isNaN(angle)) {
                        this.arcAngle = this.degToRad(angle);
                    }
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        // override
        renderGauge: function() {
            this.borderWidth = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLabelOffset = this.borderWidth;
            this.tickFontSize = this.roundWithMin(this.chartHeight / 25, 10);  // in pixels
            if(!this.startAngle) {
                this.startAngle = this.degToRad(45 + 90); // specify in degrees for legibility, + 90 because we start at south
            }
            if(!this.arcAngle) {
                this.arcAngle = this.degToRad(270);  // ditto above comment
            }
            this.valueFontSize = this.roundWithMin(this.chartHeight / 15, 15);  // in pixels
            if(this.isShiny) {
                this.needleTailLength = this.roundWithMin(this.chartHeight / 15, 10);
                this.needleTailWidth = this.roundWithMin(this.chartHeight / 50, 6);
                this.knobWidth = this.roundWithMin(this.chartHeight / 30, 7);
            }
            else {
                this.needleWidth = this.roundWithMin(this.chartHeight / 60, 3);
            }
            if(!this.isShiny) {
                this.bandOffset = 0;
                this.bandThickness = this.roundWithMin(this.chartHeight / 30, 7);
            }
            else {
                this.bandOffset = this.borderWidth;
                this.bandThickness = this.roundWithMin(this.chartHeight / 40, 4);
            }
            this.tickColor = (!this.isShiny) ? this.foregroundColor : 'silver';
            this.tickFontColor = (!this.isShiny) ? this.fontColor : 'silver';
            this.valueColor = (!this.isShiny) ? this.fontColor : '#b8b167';
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.minorTickLength = this.tickLength / 2;
            this.radius = (this.chartHeight - 2 * (this.verticalPadding + this.borderWidth)) / 2;
            this.valueHeight = this.chartHeight - ((this.radius / 4) + this.verticalPadding + this.borderWidth);
            this.needleLength = (!this.isShiny) ? this.radius - (this.bandThickness) / 2 : this.radius;

            this.tickStart = this.radius - this.bandOffset - this.bandThickness - this.tickOffset;
            this.tickEnd = this.tickStart - this.tickLength;
            this.tickLabelPosition = this.tickEnd - this.tickLabelOffset;
            this.minorTickEnd = this.tickStart - this.minorTickLength;

            if(this.isShiny) {
                this.elements.border = this.renderer.circle(this.chartWidth / 2,
                            this.chartHeight / 2, this.radius + this.borderWidth)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();

                this.elements.background = this.renderer.circle(this.chartWidth / 2,
                            this.chartHeight / 2, this.radius)
                    .attr({
                        fill: '#000000'
                    })
                    .add();
            }

            if(this.showRangeBand) {
                this.drawColorBand();
            }
            this.drawTicks();
            this.drawIndicator(this.value);
            if(this.showValue) {
                this.drawValueDisplay();
            }

            this.checkOutOfRange(this.value);
        },

        drawColorBand: function() {
            var i, startAngle, endAngle,
                outerRadius = this.radius - this.bandOffset,
                innerRadius = outerRadius - this.bandThickness;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startAngle = this.translateValue(this.ranges[i]);
                endAngle = this.translateValue(this.ranges[i + 1]);

                this.elements['colorBand' + i] = this.renderer.arc(this.chartWidth / 2, this.chartHeight / 2,
                            outerRadius, innerRadius, startAngle, endAngle)
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }
        },

        drawMajorTick: function(angle) {
            var element = this.renderer.path([
                    'M', (this.chartWidth / 2) + this.tickStart * Math.cos(angle),
                         (this.chartHeight / 2) + this.tickStart * Math.sin(angle),
                    'L', (this.chartWidth / 2) + this.tickEnd * Math.cos(angle),
                         (this.chartHeight / 2) + this.tickEnd * Math.sin(angle)
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();

            return element;
        },

        drawMajorTickLabel: function(angle, text) {
            var sin = Math.sin(angle),
                labelWidth = this.predictTextWidth(text, this.tickFontSize),
                textAlignment = (angle < (1.5 * Math.PI)) ? 'left' : 'right',
                xOffset = (angle < (1.5 * Math.PI)) ? (-labelWidth / 2) * sin *  sin :
                                (labelWidth / 2) * sin * sin,
                yOffset = (this.tickFontSize / 4) * sin,
                element = this.renderer.text(text,
                    (this.chartWidth / 2) + (this.tickLabelPosition) * Math.cos(angle)
                        + xOffset,
                    (this.chartHeight / 2) + (this.tickLabelPosition - 4) * sin
                        + (this.tickFontSize / 4) - yOffset
                )
                .attr({
                    align: textAlignment
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();

            return element;
        },

        drawMinorTick: function(angle) {
            var element = this.renderer.path([
                 'M', (this.chartWidth / 2) + this.tickStart * Math.cos(angle),
                      (this.chartHeight / 2) + this.tickStart * Math.sin(angle),
                 'L', (this.chartWidth / 2) + this.minorTickEnd * Math.cos(angle),
                      (this.chartHeight / 2) + this.minorTickEnd * Math.sin(angle)
             ])
             .attr({
                 stroke: this.tickColor,
                 'stroke-width': this.tickWidth
             })
             .add();

            return element;
        },

        drawIndicator: function(val) {
            var needlePath, needleStroke, needleStrokeWidth,
                needleFill, needleRidgePath, knobFill,
                valueAngle = this.normalizedTranslateValue(val),
                myCos = Math.cos(valueAngle),
                mySin = Math.sin(valueAngle);

            if(!this.isShiny) {
                needlePath = [
                    'M', (this.chartWidth / 2),
                            (this.chartHeight / 2),
                    'L', (this.chartWidth / 2) + myCos * this.needleLength,
                            (this.chartHeight / 2) + mySin * this.needleLength
                ];
                needleStroke = this.foregroundColor;
                needleStrokeWidth = this.needleWidth;
            }
            else {
                needlePath = [
                   'M', (this.chartWidth / 2) - this.needleTailLength * myCos,
                            (this.chartHeight / 2) - this.needleTailLength * mySin,
                   'L', (this.chartWidth / 2) - this.needleTailLength * myCos + this.needleTailWidth * mySin,
                            (this.chartHeight / 2) - this.needleTailLength * mySin - this.needleTailWidth * myCos,
                        (this.chartWidth / 2) + this.needleLength * myCos,
                            (this.chartHeight / 2) + this.needleLength * mySin,
                        (this.chartWidth / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
                            (this.chartHeight / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos,
                        (this.chartWidth / 2) - this.needleTailLength * myCos,
                            (this.chartHeight / 2) - this.needleTailLength * mySin
                ];
                needleFill = {
                    linearGradient: [(this.chartWidth / 2) - this.needleTailLength * myCos,
                                        (this.chartHeight / 2) - this.needleTailLength * mySin,
                                    (this.chartWidth / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
                                        (this.chartHeight / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos],
                    stops: [
                        [0, '#999999'],
                        [0.2, '#cccccc']
                    ]
                };
                needleRidgePath = [
                    'M', (this.chartWidth / 2) - (this.needleTailLength - 2) * myCos,
                            (this.chartHeight / 2) - (this.needleTailLength - 2) * mySin,
                    'L', (this.chartWidth / 2) + (this.needleLength - (this.bandOffset / 2)) * myCos,
                            (this.chartHeight / 2) + (this.needleLength - (this.bandOffset / 2)) * mySin
                ];
                knobFill = {
                    linearGradient: [(this.chartWidth / 2) + this.knobWidth * mySin,
                                         (this.chartHeight / 2) - this.knobWidth * myCos,
                                     (this.chartWidth / 2) - this.knobWidth * mySin,
                                         (this.chartHeight / 2) + this.knobWidth * myCos],
                    stops: [
                        [0, 'silver'],
                        [0.5, 'black'],
                        [1, 'silver']
                    ]
                };
            }
            if(this.isShiny) {
                if(this.elements.centerKnob) {
                    this.elements.centerKnob.destroy();
                }
                this.elements.centerKnob = this.renderer.circle(this.chartWidth / 2, this.chartHeight /2, this.knobWidth)
                    .attr({
                        fill: knobFill
                    })
                    .add();
            }
            if(this.elements.needle) {
                this.elements.needle.destroy();
            }
            this.elements.needle = this.renderer.path(needlePath)
               .attr({
                   fill: needleFill || '',
                   stroke: needleStroke || '',
                   'stroke-width': needleStrokeWidth || ''
               })
               .add();
            if(this.isShiny) {
                if(this.elements.needleRidge) {
                    this.elements.needleRidge.destroy();
                }
                this.elements.needleRidge = this.renderer.path(needleRidgePath)
                    .attr({
                        stroke: '#cccccc',
                        'stroke-width': 1
                    })
                    .add();
            }
        },

        drawValueDisplay: function() {
            var valueText = this.formatValue(this.value);
            this.elements.valueDisplay = this.renderer.text(valueText, this.chartWidth / 2, this.valueHeight)
                .css({
                    color: this.valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return this.translateValue(this.ranges[0]);
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return this.startAngle + ((normalizedValue / dataRange) * this.arcAngle);
        },

        degToRad: function(deg) {
            return (deg * Math.PI) / 180;
        }

    });


    ///////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractFillerGauge


    Splunk.JSCharting.AbstractFillerGauge = $.klass(Splunk.JSCharting.AbstractGauge, {

        typeName: 'fillerGauge-chart',

        // override
        initialize: function($super, container) {
            $super(container);
            this.minorsPerMajor = 5;
            this.minorTickWidth = 1;
        },

        // override
        onAnimationFinished: function(val) {
            // no-op for filler gauges
        },

        // override
        renderGauge: function() {
            this.tickColor = this.foregroundColor;
            this.tickFontColor = this.fontColor;
            this.defaultValueColor = (this.isShiny) ? 'black' : this.fontColor;
            this.drawBackground();
            this.drawTicks();
            this.drawIndicator(this.value);
        },

        // override
        // use the decimal precision of the old and new values to set things up for a smooth animation
        updateValue: function($super, oldValue, newValue) {
            var oldPrecision = this.mathUtils.getDecimalPrecision(oldValue, 3),
                newPrecision = this.mathUtils.getDecimalPrecision(newValue, 3);

            this.valueAnimationPrecision = Math.max(oldPrecision, newPrecision);
            $super(oldValue, newValue);
        },

        getDisplayValue: function(rawVal) {
            // unless this we are displaying a final value, round the value to the animation precision for a smooth transition
            var multiplier = Math.pow(10, this.valueAnimationPrecision);
            return ((rawVal !== this.value) ? (Math.round(rawVal * multiplier) / multiplier) : rawVal);
        },

        // override
        updateValueDisplay: function(valueText) {
            // no-op, value display is updated as part of drawIndicator
        },

        // filler gauges animate the change in the value display,
        // so they always animate transitions, even when the values are out of range
        shouldAnimateTransition: function(oldValue, newValue) {
            return true;
        },

        getFillColor: function(val) {
            var i;
            for(i = 0; i < this.ranges.length - 2; i++) {
                if(val < this.ranges[i + 1]) {
                    break;
                }
            }
            return this.getColorByIndex(i);
        },

        // use the value to determine the fill color, then use that color's luminance determine
        // if a light or dark font color should be used
        getValueColor: function(fillColor) {
            var fillColorHex = this.colorUtils.hexFromColor(fillColor),
                luminanceThreshold = 128,
                darkColor = 'black',
                lightColor = 'white',
                fillLuminance = this.colorUtils.getLuminance(fillColorHex);

            return (fillLuminance < luminanceThreshold) ? lightColor : darkColor;
        }

    });


    ///////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.VerticalFillerGauge


    Splunk.JSCharting.VerticalFillerGauge = $.klass(Splunk.JSCharting.AbstractFillerGauge, {

        // overrride
        initialize: function($super, container) {
            $super(container);
            this.tickWidth = 1;
        },

        // override
        renderGauge: function($super) {
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.tickLabelOffset = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickFontSize = this.roundWithMin(this.chartHeight / 20, 10);  // in pixels
            this.minorTickLength = this.tickLength / 2;
            this.backgroundCornerRad = this.roundWithMin(this.chartHeight / 60, 3);
            this.valueBottomPadding = this.roundWithMin(this.chartHeight / 30, 5);
            this.valueFontSize = this.roundWithMin(this.chartHeight / 20, 12);  // in pixels
            $super();
        },

        drawBackground: function() {
            this.verticalPadding = 10 + this.tickFontSize / 2;
            this.backgroundWidth = this.roundWithMin(this.chartHeight / 4, 50);
            this.backgroundHeight = this.chartHeight - (2 * this.verticalPadding);

            // rather than trying to dynamically increase the width as the values come in, we
            // provide enough room for an order of magnitude greater than the highest range value
            var maxValueWidth = this.determineMaxValueWidth(this.ranges, this.valueFontSize) + 10;

            this.backgroundWidth = Math.max(this.backgroundWidth, maxValueWidth);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect((this.chartWidth - this.backgroundWidth) / 2,
                        this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }

            // these values depend on the adjusted width of the background
            this.tickStartX = (this.chartWidth + this.backgroundWidth) / 2 + this.tickOffset;
            this.tickEndX = this.tickStartX + this.tickLength;
            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
        },

        determineMaxValueWidth: function(ranges, fontSize) {
            // in percent mode, we can hard-code what the max-width value can be
            if(this.usePercentageValue) {
                return this.predictTextWidth("100.00%", fontSize);
            }
            var i, valueString,
                maxWidth = 0;

            // loop through all ranges and determine which has the greatest width (because of scientific notation, we can't just look at the extremes)
            // additionally add an extra digit to the min and max ranges to accomodate out-of-range values
            for(i = 0; i < ranges.length; i++) {
                valueString = "" + ranges[i];
                if(i === 0 || i === ranges.length - 1) {
                    valueString += "0";
                }
                maxWidth = Math.max(maxWidth, this.predictTextWidth(valueString, fontSize));
            }
            return maxWidth;
        },

        drawMajorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

            var element = this.renderer.path([
                    'M', this.tickStartX, tickHeight,
                    'L', this.tickEndX, tickHeight
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();

            return element;
        },

        drawMajorTickLabel: function(height, text) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

            var element = this.renderer.text(text,
                    this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
                )
                .attr({
                    align: 'left'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();

            return element;
        },

        drawMinorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

            var element = this.renderer.path([
                     'M', this.tickStartX, tickHeight,
                     'L', this.tickStartX + this.minorTickLength, tickHeight
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();

            return element;
        },

        drawIndicator: function(val) {
            // TODO: implement calculation of gradient based on user-defined colors
            // for now we are using solid colors

            var //fillGradient = this.getFillGradient(val),
                fillColor = this.getFillColor(val),
                fillHeight = this.normalizedTranslateValue(val),
                fillTopY,
                fillPath;
                if(fillHeight > 0) {
                    fillHeight = Math.max(fillHeight, this.backgroundCornerRad);
                    fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight;
                    if(!this.isShiny) {
                        fillPath = [
                            'M', (this.chartWidth - this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding,
                            'L', (this.chartWidth + this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding
                        ];
                    }
                    else {
                        fillPath = [
                            'M', (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                            'C', (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2 + this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                            'L', (this.chartWidth + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                            'C', (this.chartWidth + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                            'L', (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad
                        ];
                    }
                }
                else {
                    fillPath = [];
                }

            if(this.elements.fill) {
                this.elements.fill.destroy();
            }

            this.elements.fill = this.renderer.path(fillPath)
                .attr({
                    fill: fillColor
                })
                .add();

            if(this.testMode){
                $(this.elements.fill.element).attr('data-indicator-color', $(this.elements.fill.element).attr('fill'));

            }
            if(this.showValue) {
                this.drawValueDisplay(val, fillColor);
            }
        },

        drawValueDisplay: function(val, fillColor) {
            var displayVal = this.getDisplayValue(val),
                fillHeight = this.normalizedTranslateValue(val),
                fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight,
                valueTotalHeight = this.valueFontSize + this.valueBottomPadding,

                valueColor = this.getValueColor(fillColor),
                valueBottomY,
                valueText = this.formatValue(displayVal);

            // determine if the value display can (vertically) fit inside the fill,
            // if not orient it to the bottom of the fill
            if(fillHeight >= valueTotalHeight) {
                valueBottomY = fillTopY + valueTotalHeight - this.valueBottomPadding;
            }
            else {
                valueBottomY = fillTopY - this.valueBottomPadding;
                valueColor = this.defaultValueColor;
            }
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    y: valueBottomY
                })
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                }).toFront();
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                    valueText, this.chartWidth / 2, valueBottomY
                )
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
            }
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]) + 5;
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.backgroundHeight);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HorizontalFillerGauge


    Splunk.JSCharting.HorizontalFillerGauge = $.klass(Splunk.JSCharting.AbstractFillerGauge, {

        // override
        initialize: function($super, container) {
            $super(container);
            this.horizontalPadding = 20;
            this.tickOffset = 5;
            this.tickLength = 15;
            this.tickWidth = 1;
            this.tickLabelOffset = 5;
            this.minorTickLength = Math.floor(this.tickLength / 2);
        },

        renderGauge: function($super) {
            this.tickFontSize = this.roundWithMinMax(this.chartWidth / 50, 10, 20);  // in pixels
            this.backgroundCornerRad = this.roundWithMinMax(this.chartWidth / 120, 3, 5);
            this.valueFontSize = this.roundWithMinMax(this.chartWidth / 40, 15, 25);  // in pixels
            this.backgroundHeight = this.valueFontSize * 3;
            this.valueBottomPadding = this.roundWithMinMax(this.chartWidth / 100, 5, 10);
            $super();
        },

        drawBackground: function() {
            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange),
                maxTickValue = tickValues[tickValues.length - 1],
                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);

            this.horizontalPadding = Math.max(this.horizontalPadding, maxTickWidth);
            this.backgroundWidth = this.chartWidth - (2 * this.horizontalPadding);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect(this.horizontalPadding,
                        (this.chartHeight - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }

            // no actual dependency here, but want to be consistent with sibling class
            this.tickStartY = (this.chartHeight + this.backgroundHeight) / 2 + this.tickOffset;
            this.tickEndY = this.tickStartY + this.tickLength;
            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
        },

        drawMajorTick: function(offset) {
            var tickOffset = this.horizontalPadding + offset;

            var element = this.renderer.path([
                    'M', tickOffset, this.tickStartY,
                    'L', tickOffset, this.tickEndY
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();

            return element;
        },

        drawMajorTickLabel: function(offset, text) {
            var tickOffset = this.horizontalPadding + offset;

            var element = this.renderer.text(text,
                    tickOffset, this.tickLabelStartY + this.tickFontSize
                )
                .attr({
                    align: 'center'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();

            return element;
        },

        drawMinorTick: function(offset) {
            var tickOffset = this.horizontalPadding + offset;

            var element = this.renderer.path([
                     'M', tickOffset, this.tickStartY,
                     'L', tickOffset, this.tickStartY + this.minorTickLength
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();

            return element;
        },

        drawIndicator: function(val) {
            // TODO: implement calculation of gradient based on user-defined colors
            // for not we are using solid colors

            var //fillGradient = this.getFillGradient(val),
                fillColor = this.getFillColor(val),
                fillOffset = this.normalizedTranslateValue(val),
                fillTopX,
                fillPath;
                if(fillOffset > 0) {
                    fillOffset = Math.max(fillOffset, this.backgroundCornerRad);
                    fillTopX = this.horizontalPadding + fillOffset;
                    if(!this.isShiny) {
                        fillPath = [
                            'M', this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight) / 2,
                            'L', fillTopX,
                                    (this.chartHeight - this.backgroundHeight) / 2,
                                 fillTopX,
                                     (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding,
                                     (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding,
                                     (this.chartHeight - this.backgroundHeight) / 2
                        ];
                    }
                    else {
                        fillPath = [
                            'M', this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                            'C', this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2 + this.backgroundCornerRad,
                            'L', this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2 - this.backgroundCornerRad,
                            'C', this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2 - this.backgroundCornerRad,
                                 this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                            'L', fillTopX,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                                 fillTopX,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2
                        ];
                    }
                }
                else {
                    fillPath = [];
                }

            if(this.elements.fill) {
                this.elements.fill.destroy();
            }
            this.elements.fill = this.renderer.path(fillPath)
                .attr({
                    fill: fillColor
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val, fillColor, fillOffset);
            }
        },

        drawValueDisplay: function(val, fillColor, fillOffset) {
            var displayVal = this.getDisplayValue(val),
                fillTopX = this.horizontalPadding + fillOffset,
                valueColor = this.getValueColor(fillColor),
                valueStartX,
                valueText = this.formatValue(displayVal),
                valueTotalWidth = this.predictTextWidth(valueText, this.valueFontSize) + this.valueBottomPadding;

            // determine if the value display can (horizontally) fit inside the fill,
            // if not orient it to the right of the fill
            if(fillOffset >= valueTotalWidth) {
                valueStartX = fillTopX - valueTotalWidth;
            }
            else {
                valueStartX = fillTopX + this.valueBottomPadding;
                valueColor = this.defaultValueColor;
            }
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    x: valueStartX
                })
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                }).toFront();
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                    valueText, valueStartX, (this.chartHeight / 2) + this.valueFontSize / 4
                )
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'left'
                })
                .add();
            }
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.backgroundWidth);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractMarkerGauge


    Splunk.JSCharting.AbstractMarkerGauge = $.klass(Splunk.JSCharting.AbstractGauge, {

        typeName: 'markerGauge-chart',

        // override
        initialize: function($super, container) {
            $super(container);
            this.bandCornerRad = 0;
            this.tickLabelPaddingRight = 10;
            this.minorsPerMajor = 5;
            this.minorTickWidth = 1;
            this.tickWidth = 1;

            this.showValue = false;
        },

        // override
        renderGauge: function() {
            this.tickColor = (this.isShiny) ? 'black' : this.foregroundColor;
            this.tickFontColor = (this.isShiny) ? 'black' : this.fontColor;
            this.valueOffset = (this.isShiny) ? this.markerSideWidth + 10 : this.valueFontSize;
            this.drawBackground();
            if(this.showRangeBand) {
                this.drawBand();
            }
            this.drawTicks();
            this.drawIndicator(this.value);
            this.checkOutOfRange(this.value);
        },

        // override
        updateValueDisplay: function(valueText) {
            // no-op, value display is updated as part of drawIndicator
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.VerticalMarkerGauge


    Splunk.JSCharting.VerticalMarkerGauge = $.klass(Splunk.JSCharting.AbstractMarkerGauge, {

        // override
        initialize: function($super, container) {
            $super(container);
            this.verticalPadding = 10;
        },

        // override
        renderGauge: function($super) {
            this.markerWindowHeight = this.roundWithMin(this.chartHeight / 7, 20);
            this.markerSideWidth = this.markerWindowHeight / 2;
            this.markerSideCornerRad = this.markerSideWidth / 3;
            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.tickLabelOffset = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickFontSize = this.roundWithMin(this.chartHeight / 20, 10);  // in pixels
            this.minorTickLength = this.tickLength / 2;
            this.backgroundCornerRad = this.roundWithMin(this.chartHeight / 60, 3);
            this.valueFontSize = this.roundWithMin(this.chartHeight / 15, 15);  // in pixels

            this.bandOffsetX = (!this.isShiny) ? 0 : this.roundWithMin(this.chartHeight / 60, 3);
            $super();
        },

        drawBackground: function() {
            this.backgroundWidth = this.roundWithMin(this.chartHeight / 4, 50);
            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);
            this.backgroundHeight = this.chartHeight - (2 * this.verticalPadding);
            this.bandHeight = this.backgroundHeight - (this.bandOffsetBottom + this.bandOffsetTop);
            this.bandWidth = (!this.isShiny) ? 30 : 10;

            var maxLabelWidth, totalWidthNeeded,
                maxTickValue = tickValues[tickValues.length - 1];

            maxLabelWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);
            totalWidthNeeded = this.bandOffsetX + this.bandWidth + this.tickOffset + this.tickLength + this.tickLabelOffset
                    + maxLabelWidth + this.tickLabelPaddingRight;

            this.backgroundWidth = Math.max(this.backgroundWidth, totalWidthNeeded);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect((this.chartWidth - this.backgroundWidth) / 2,
                        this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }

            // these values depend on the adjusted background width
            this.tickStartX = (this.chartWidth - this.backgroundWidth) / 2 + (this.bandOffsetX + this.bandWidth)
                            + this.tickOffset;
            this.tickEndX = this.tickStartX + this.tickLength;
            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
        },

        drawBand: function() {
            var i, startHeight, endHeight,
                bandLeftX = ((this.chartWidth - this.backgroundWidth) / 2) + this.bandOffsetX,
                bandBottomY = this.chartHeight - this.verticalPadding - this.bandOffsetBottom;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startHeight = this.translateValue(this.ranges[i]);
                endHeight = this.translateValue(this.ranges[i + 1]);
                this.elements['colorBand' + i] = this.renderer.rect(
                        bandLeftX, bandBottomY - endHeight,
                        this.bandWidth, endHeight - startHeight, this.bandCornerRad
                    )
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }
        },

        drawMajorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

            var element = this.renderer.path([
                    'M', this.tickStartX, tickHeight,
                    'L', this.tickEndX, tickHeight
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();

            return element;
        },

        drawMajorTickLabel: function(height, text) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

            var element = this.renderer.text(text,
                    this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
                )
                .attr({
                    align: 'left'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();

            return element;
        },

        drawMinorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

            var element = this.renderer.path([
                     'M', this.tickStartX, tickHeight,
                     'L', this.tickStartX + this.minorTickLength, tickHeight
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();

            return element;
        },

        drawIndicator: function(val) {
            var markerHeight = this.normalizedTranslateValue(val),
                markerStartY = this.verticalPadding + this.backgroundHeight
                                - (this.bandOffsetBottom + markerHeight),
                markerStartX = (!this.isShiny) ? (this.chartWidth - this.backgroundWidth) / 2 - 10 : (this.chartWidth - this.backgroundWidth) / 2,
                markerEndX = (!this.isShiny) ? markerStartX + this.bandWidth + 20 : markerStartX + this.backgroundWidth,
                markerLineStroke = this.foregroundColor, // will be changed to red for shiny
                markerLineWidth = 3, // wil be changed to 1 for shiny
                markerLinePath = [
                    'M', markerStartX, markerStartY,
                    'L', markerEndX, markerStartY
                ];
            if(this.isShiny) {
                var markerLHSPath = [
                    'M', markerStartX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                    'C', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                         markerStartX - this.markerSideWidth,
                            markerStartY - this.markerWindowHeight / 2,
                         markerStartX - this.markerSideWidth,
                            markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                    'L', markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                    'C', markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                         markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2),
                         markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY + (this.markerWindowHeight / 2),
                    'L', markerStartX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY - this.markerWindowHeight / 2
                ],
                markerRHSPath = [
                    'M', markerEndX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                    'C', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX + this.markerSideWidth,
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX + this.markerSideWidth,
                            markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                    'L', markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                    'C', markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                         markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2),
                         markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY + (this.markerWindowHeight / 2),
                    'L', markerEndX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerEndX,
                            markerStartY - this.markerWindowHeight / 2
                ],
                markerBorderPath = [
                    'M', markerStartX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerEndX,
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY - this.markerWindowHeight / 2
                 ],
                 markerUnderlinePath = [
                     'M', markerStartX,
                             markerStartY + 1,
                     'L', markerEndX,
                             markerStartY + 1
                ];
                markerLineStroke = 'red';
                markerLineWidth = 1;
            }

            if(this.isShiny) {
                if(this.elements.markerLHS) {
                    this.elements.markerLHS.destroy();
                }
                this.elements.markerLHS = this.renderer.path(markerLHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerRHS) {
                    this.elements.markerRHS.destroy();
                }
                this.elements.markerRHS = this.renderer.path(markerRHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerWindow) {
                    this.elements.markerWindow.destroy();
                }
                this.elements.markerWindow = this.renderer.rect(markerStartX,
                        markerStartY - this.markerWindowHeight / 2, this.backgroundWidth,
                                this.markerWindowHeight, 0)
                    .attr({
                        fill: 'rgba(255, 255, 255, 0.3)'
                    })
                    .add();
                if(this.elements.markerBorder) {
                    this.elements.markerBorder.destroy();
                }
                this.elements.markerBorder = this.renderer.path(markerBorderPath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
                if(this.elements.markerUnderline) {
                    this.elements.markerUnderline.destroy();
                }
                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
            }
            if(this.elements.markerLine) {
                this.elements.markerLine.destroy();
            }
            this.elements.markerLine = this.renderer.path(markerLinePath)
                .attr({
                    stroke: markerLineStroke,
                    'stroke-width': markerLineWidth
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val);
            }

        },

        drawValueDisplay: function(val) {
            var valueText = this.formatValue(val),
                markerHeight = this.normalizedTranslateValue(val),
                valueY = this.verticalPadding + this.backgroundHeight - this.bandOffsetBottom - markerHeight;

            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    y: valueY + this.valueFontSize / 4
                });
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                     valueText, (this.chartWidth - this.backgroundWidth) / 2 - this.valueOffset, valueY + this.valueFontSize / 4
                )
                .css({
                    color: 'black',
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'right'
                })
                .add();
            }

        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.bandHeight);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HorizontalMarkerGauge


    Splunk.JSCharting.HorizontalMarkerGauge = $.klass(Splunk.JSCharting.AbstractMarkerGauge, {

        // override
        initialize: function($super, container) {
            $super(container);
            this.horizontalPadding = 20;
            this.tickOffset = 5;
            this.tickLength = 15;
            this.tickWidth = 1;
            this.tickLabelOffset = 5;
            this.minorTickLength = Math.floor(this.tickLength / 2);
            this.bandHeight = (!this.isShiny) ? 35 : 15;
        },

        renderGauge: function($super) {
            this.markerWindowHeight = this.roundWithMinMax(this.chartWidth / 30, 30, 80);
            this.markerSideWidth = this.markerWindowHeight / 2;
            this.markerSideCornerRad = this.markerSideWidth / 3;
            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
            this.tickFontSize = this.roundWithMinMax(this.chartWidth / 50, 10, 20);  // in pixels
            this.backgroundCornerRad = this.roundWithMinMax(this.chartWidth / 120, 3, 5);
            this.valueFontSize = this.roundWithMinMax(this.chartWidth / 40, 15, 25);  // in pixels
            this.valueOffset = this.markerSideWidth + 10;
            this.tickLabelPadding = this.tickFontSize / 2;
            this.bandOffsetX = (!this.isShiny) ? 0 : this.tickLabelPadding;
            this.backgroundHeight = this.bandOffsetX + this.bandHeight + this.tickOffset + this.tickLength +
                                       + this.tickLabelOffset + this.tickFontSize + this.tickLabelPadding;
            $super();
        },

        drawBackground: function(tickValues) {
            tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);
            var maxTickValue = tickValues[tickValues.length - 1],
                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);

            this.bandOffsetBottom = Math.max(this.bandOffsetBottom, maxTickWidth);
            this.bandOffsetTop = Math.max(this.bandOffsetTop, maxTickWidth);
            this.backgroundWidth = this.chartWidth - (2 * this.horizontalPadding);
            this.bandWidth = this.backgroundWidth - (this.bandOffsetBottom + this.bandOffsetTop);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect(this.horizontalPadding,
                        (this.chartHeight - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }
        },

        drawBand: function() {
            var i, startOffset, endOffset,
                bandStartX = this.horizontalPadding + this.bandOffsetBottom,
                bandTopY = ((this.chartHeight - this.backgroundHeight) / 2) + this.bandOffsetX;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startOffset = this.translateValue(this.ranges[i]);
                endOffset = this.translateValue(this.ranges[i + 1]);
                this.elements['colorBand' + i] = this.renderer.rect(
                        bandStartX + startOffset, bandTopY,
                        endOffset - startOffset, this.bandHeight, this.bandCornerRad
                    )
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }

            this.tickStartY = (this.chartHeight - this.backgroundHeight) / 2 + (this.bandOffsetX + this.bandHeight)
                    + this.tickOffset;
            this.tickEndY = this.tickStartY + this.tickLength;
            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
        },

        drawMajorTick: function(offset) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

            var element = this.renderer.path([
                    'M', tickOffset, this.tickStartY,
                    'L', tickOffset, this.tickEndY
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();

            return element;
        },

        drawMajorTickLabel: function(offset, text) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

            var element = this.renderer.text(text,
                    tickOffset, this.tickLabelStartY + this.tickFontSize
                )
                .attr({
                    align: 'center'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();

            return element;
        },

        drawMinorTick: function(offset) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

            var element = this.renderer.path([
                     'M', tickOffset, this.tickStartY,
                     'L', tickOffset, this.tickStartY + this.minorTickLength
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();

            return element;
        },

        drawIndicator: function(val) {
            var markerOffset = this.normalizedTranslateValue(val),
                markerStartY = (!this.isShiny) ? (this.chartHeight - this.backgroundHeight) / 2 - 10 : (this.chartHeight - this.backgroundHeight) / 2,
                markerEndY = (!this.isShiny) ? markerStartY + this.bandHeight + 20 : markerStartY + this.backgroundHeight,
                markerStartX = this.horizontalPadding + this.bandOffsetBottom + markerOffset,
                markerLineWidth = 3, // set to 1 for shiny
                markerLineStroke = this.foregroundColor, // set to red for shiny
                markerLinePath = [
                    'M', markerStartX, markerStartY,
                    'L', markerStartX, markerEndY
                ];

            if(this.isShiny) {
                var markerLHSPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerStartY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
                    'C', markerStartX - this.markerWindowHeight / 2,
                            markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
                         markerStartX - this.markerWindowHeight / 2,
                            markerStartY - this.markerSideWidth,
                         markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                    'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                    'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                            markerStartY - this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                            markerStartY - (this.markerSideWidth - this.markerSideCornerRad),
                    'L', markerStartX + this.markerWindowHeight / 2,
                            markerStartY,
                         markerStartX - this.markerWindowHeight,
                            markerStartY
                ],
                markerRHSPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerEndY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                    'C', markerStartX - this.markerWindowHeight / 2,
                            markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                         markerStartX - this.markerWindowHeight / 2,
                            markerEndY + this.markerSideWidth,
                         markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                    'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                    'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                             markerEndY + this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                             markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                    'L', markerStartX + this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX - this.markerWindowHeight,
                            markerEndY
                ],
                markerBorderPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerStartY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX + this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX + this.markerWindowHeight / 2,
                            markerStartY,
                         markerStartX - this.markerWindowHeight / 2,
                            markerStartY
                ],
                markerUnderlinePath = [
                    'M', markerStartX - 1,
                            markerStartY,
                    'L', markerStartX - 1,
                            markerEndY
                ];
                markerLineStroke = 'red';
                markerLineWidth = 1;

                if(this.elements.markerLHS) {
                    this.elements.markerLHS.destroy();
                }
                this.elements.markerLHS = this.renderer.path(markerLHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerRHS) {
                    this.elements.markerRHS.destroy();
                }
                this.elements.markerRHS = this.renderer.path(markerRHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerWindow) {
                    this.elements.markerWindow.destroy();
                }
                this.elements.markerWindow = this.renderer.rect(markerStartX - this.markerWindowHeight / 2,
                        markerStartY, this.markerWindowHeight, this.backgroundHeight, 0)
                    .attr({
                        fill: 'rgba(255, 255, 255, 0.3)'
                    })
                    .add();
                if(this.elements.markerBorder) {
                    this.elements.markerBorder.destroy();
                }
                this.elements.markerBorder = this.renderer.path(markerBorderPath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
                if(this.elements.markerUnderline) {
                    this.elements.markerUnderline.destroy();
                }
                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
            }

            if(this.elements.markerLine) {
                this.elements.markerLine.destroy();
            }
            this.elements.markerLine = this.renderer.path(markerLinePath)
                .attr({
                    stroke: markerLineStroke,
                    'stroke-width': markerLineWidth
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val);
            }
        },

        drawValueDisplay: function(val) {
            var valueText = this.formatValue(val),
                markerOffset = this.normalizedTranslateValue(val),
                valueX = this.horizontalPadding + this.bandOffsetBottom + markerOffset;

            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    x: valueX
                });
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                     valueText, valueX, (this.chartHeight - this.backgroundHeight) / 2 - this.valueOffset
                )
                .css({
                    color: 'black',
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
            }

        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.bandWidth);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.MathUtils


    Splunk.JSCharting.MathUtils = {

        // shortcut for base-ten log, also rounds to four decimal points of precision to make pretty numbers
        logBaseTen: function(num) {
            var result = Math.log(num) / Math.LN10;
            return (Math.round(result * 10000) / 10000);
        },

        // transforms numbers to a normalized log scale that can handle negative numbers
        // rounds to four decimal points of precision
        absLogBaseTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = (num < 0),
                result;

            if(isNegative) {
                num = -num;
            }
            if(num < 10) {
                num += (10 - num) / 10;
            }
            result = this.logBaseTen(num);
            return (isNegative) ? -result : result;
        },

        // reverses the transformation made by absLogBaseTen above
        // rounds to three decimal points of precision
        absPowerTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = (num < 0),
                result;

            if(isNegative) {
                num = -num;
            }
            result = Math.pow(10, num);
            if(result < 10) {
                result = 10 * (result - 1) / (10 - 1);
            }
            result = (isNegative) ? -result : result;
            return (Math.round(result * 1000) / 1000);
        },

        // calculates the power of ten that is closest to but not greater than the number
        // negative numbers are treated as their absolute value and the sign of the result is flipped before returning
        nearestPowerOfTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = num < 0;
            num = (isNegative) ? -num : num;
            var log = this.logBaseTen(num),
                result = Math.pow(10, Math.floor(log));

            return (isNegative) ? -result: result;
        },

        // an extended version of parseFloat that will handle numbers encoded in hex format (i.e. "0xff")
        // and is stricter than that native JavaScript parseFloat for decimal numbers
        parseFloat: function(str) {
            // determine if the string is a hex number by checking if it begins with '0x' or '-0x', in which case delegate to parseInt with a 16 radix
            if(/^( )*(0x|-0x)/.test(str)) {
                return parseInt(str, 16);
            }
            // if the number is not in decimal or scientific format, return NaN explicitly instead of letting JavaScript do its loose parsing
            if(!(/^[-+]?[0-9]*[.]?[0-9]*$/.test(str) || (/^[-+]?[0-9][.]?[0-9]*e[-+]?[1-9][0-9]*$/).test(str))) {
                return NaN;
            }
            return parseFloat(str);
        },

        // returns the number of digits of precision after the decimal point
        // optionally accepts a maximum number, after which point it will stop looking and return the max
        getDecimalPrecision: function(num, max) {
            max = max || Infinity;
            var precision = 0;

            while(precision < max && num.toFixed(precision) !== num.toString()) {
                precision += 1;
            }

            return precision;
        }
    };


    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.TimeUtils

    Splunk.JSCharting.TimeUtils = {

        BD_TIME_REGEX: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d+[+-]{1}\d{2}:\d{2}$/,

        BdTime: function(isoString) {
            var bdPieces = Splunk.JSCharting.TimeUtils.BD_TIME_REGEX.exec(isoString);
            if(!bdPieces) {
                this.isInvalid = true;
            }
            else {
                this.year   = parseInt(bdPieces[1], 10);
                this.month  = parseInt(bdPieces[2], 10);
                this.day    = parseInt(bdPieces[3], 10);
                this.hour   = parseInt(bdPieces[4], 10);
                this.minute = parseInt(bdPieces[5], 10);
                this.second = parseInt(bdPieces[6], 10);
            }
        },

        SECS_PER_MIN: 60,
        SECS_PER_HOUR: 60 * 60,

        convertTimeToCategories: function(timeData, spanSeries, numLabelCutoff) {
            //debugging
            //console.log('[\n' + JSON.stringify(timeData).replace(/\[|\]/g, '').split(',').join(',\n') + '\n]');
            var i, labelIndex, prettyLabelInfo, prettyLabels, prettyLabel,
                // find the indexes (a list of numbers) where the labels should go
                labelIndexes = this.findLabelIndexes(timeData, numLabelCutoff),
                rawLabels = [],
                categories = [];

            // based on the label indexes, look up the raw labels from the original list
            for(i = 0; i < labelIndexes.length; i++) {
                labelIndex = labelIndexes[i];
                rawLabels.push(timeData[labelIndex]);
            }

            prettyLabelInfo = this.getPrettyLabelInfo(rawLabels);
            prettyLabels = prettyLabelInfo.prettyLabels;

            // now assemble the full category list to return
            // start with a list of all blanks
            for(i = 0; i < timeData.length; i++) {
                categories.push(' ');
            }
            // then put the pretty labels in the right places
            for(i = 0; i < labelIndexes.length; i++) {
                labelIndex = labelIndexes[i];
                prettyLabel = prettyLabels[i];
                categories[labelIndex] = prettyLabel;
            }

            return ({
                categories: categories,
                rawLabels: rawLabels,
                granularity: prettyLabelInfo.granularity,
                span: this.getPointSpan(timeData)
            });
        },

        findLabelIndexes: function(timeData, numLabelCutoff) {
            var i, labelIndex, indexes = [];

            // if there are less data points than the cutoff, should label all points
            if(timeData.length <= numLabelCutoff) {
                for(i = 0; i < timeData.length; i++) {
                    indexes.push(i);
                }
                return indexes;
            }

            var pointSpan = this.getPointSpan(timeData),
                totalSpan = this.getTotalSpan(timeData);

            if(this.couldLabelFirstOfMonth(pointSpan, totalSpan)) {
                var firstIndexes = this.findFirstOfMonthIndexes(timeData);
                if(firstIndexes.length >= 3) {
                    if(firstIndexes.length > numLabelCutoff) {
                        var step = Math.ceil(firstIndexes.length / numLabelCutoff),
                            newIndexes = [];

                        for(i = 0; i < firstIndexes.length; i += step) {
                            labelIndex = firstIndexes[i];
                            newIndexes.push(labelIndex);
                        }
                        firstIndexes = newIndexes;
                    }
                    return firstIndexes;
                }
            }

                // find major unit (in number of points, not time)
            var majorUnit = this.findMajorUnit(timeData, numLabelCutoff, pointSpan, totalSpan),
                firstMajorSlice = timeData.slice(0, majorUnit),
                roundestIndex = this.getRoundestIndex(firstMajorSlice, majorUnit, pointSpan),
                index = roundestIndex;

            if(this.couldLabelMidnight(majorUnit, pointSpan)){
                var midnightIndexes = this.findMidnightIndexes(timeData);
                if(midnightIndexes.length > numLabelCutoff){
                    step = Math.ceil(midnightIndexes.length / numLabelCutoff);
                    newIndexes = [];

                    for(i = 0; i < midnightIndexes.length; i += step) {
                        labelIndex = midnightIndexes[i];
                        newIndexes.push(labelIndex);
                    }
                    midnightIndexes = newIndexes;
                }
                return midnightIndexes;
            }

            while(index < timeData.length) {
                indexes.push(index);
                index += majorUnit;
            }
            return indexes;
        },

        couldLabelMidnight: function(majorUnit, pointSpan){
            return ((majorUnit % 24 === 0) && (pointSpan === 60*60));
        },

        couldLabelFirstOfMonth: function(pointSpan, totalSpan) {
            if(pointSpan > this.MAX_SECS_PER_DAY) {
                return false;
            }
            if(pointSpan < this.SECS_PER_HOUR) {
                return false;
            }
            // prevent a user-defined span like 4003 seconds from derailing things
            if(pointSpan < this.MIN_SECS_PER_DAY && (24 * this.SECS_PER_HOUR) % pointSpan !== 0) {
                return false;
            }
            if(totalSpan < 2 * this.MIN_SECS_PER_MONTH) {
                return false;
            }
            return true;
        },

        findMidnightIndexes: function(timeData){
            var i, bdTime,
                bdTimes = [],
                midnightIndexes = [];
            for(i = 0; i < timeData.length; i++) {
                bdTimes.push(new this.BdTime(timeData[i]));
            }
            for(i = 0; i < bdTimes.length; i++) {
                bdTime = bdTimes[i];
                if((bdTime.hour === 0) && (bdTime.minute === 0)) {
                    midnightIndexes.push(i);
                }
            }
            return midnightIndexes;
        },

        findFirstOfMonthIndexes: function(timeData) {
            var i, bdTime,
                bdTimes = [],
                firstIndexes = [];

            for(i = 0; i < timeData.length; i++) {
                bdTimes.push(new this.BdTime(timeData[i]));
            }
            for(i = 0; i < bdTimes.length; i++) {
                bdTime = bdTimes[i];
                if(bdTime.day === 1 && bdTime.hour === 0) {
                    firstIndexes.push(i);
                }
            }
            return firstIndexes;
        },

        getPointSpan: function(timeData) {
            if(timeData.length < 2) {
                return 1;
            }
            if(timeData.length < 4) {
                return this.getSpanBetween(timeData[0], timeData[1]);
            }
            var firstSpan = this.getSpanBetween(timeData[0], timeData[1]),
                secondSpan = this.getSpanBetween(timeData[1], timeData[2]),
                thirdSpan = this.getSpanBetween(timeData[2], timeData[3]);

            // sample the three spans to avoid the case where daylight savings might produce an erroneous result
            if(firstSpan === secondSpan) {
                return firstSpan;
            }
            if(secondSpan === thirdSpan) {
                return secondSpan;
            }
            if(firstSpan === thirdSpan) {
                return firstSpan;
            }
            return firstSpan;
        },

        getTotalSpan: function(timeData) {
            var i, lastPoint;
            for(i = timeData.length - 1; i >= 0; i--) {
                lastPoint = timeData[i];
                if(this.BD_TIME_REGEX.test(lastPoint)) {
                    break;
                }
            }
            return this.getSpanBetween(timeData[0], lastPoint);
        },

        getSpanBetween: function(start, end) {
            var startDate = new this.isoToDateObject(start),
                endDate = new this.isoToDateObject(end),
                millisDiff = endDate.getTime() - startDate.getTime();

            return millisDiff / 1000;
        },

        isoToDateObject: function(isoString) {
            var bdTime = Splunk.JSCharting.TimeUtils.extractBdTime(isoString);
            return Splunk.JSCharting.TimeUtils.bdTimeToDateObject(bdTime);
        },

        // use a 23-hour day as a minimum to protect against daylight savings errors
        MIN_SECS_PER_DAY: 23 * 60 * 60,
        // use a 25-hour day as a maximum to protect against daylight savings errors
        MAX_SECS_PER_DAY: 25 * 60 * 60,

        MAJOR_UNITS_SECONDS: [
            1,
            2,
            5,
            10,
            15,
            30,
            60,
            2 * 60,
            3 * 60,
            5 * 60,
            10 * 60,
            15 * 60,
            30 * 60,
            60 * 60,
            2 * 60 * 60,
            4 * 60 * 60,
            6 * 60 * 60,
            12 * 60 * 60,
            24 * 60 * 60,
            48 * 60 * 60,
            96 * 60 * 60,
            168 * 60 * 60
        ],

        MAJOR_UNIT_DAYS: [
            1,
            2,
            4,
            7,
            14,
            28,
            56,
            112,
            224,
            364,
            476,
            728
        ],

        // this is ok because daylight savings is never in February
        MIN_SECS_PER_MONTH: 28 * 24 * 60 * 60,

        MAJOR_UNIT_MONTHS: [
            1,
            2,
            4,
            6,
            12,
            24,
            48,
            96
        ],

        findMajorUnit: function(timeData, numLabelCutoff, pointSpan, totalSpan) {
            var i, majorUnit, unitsPerSpan;
            if(pointSpan < this.MIN_SECS_PER_DAY) {
                for(i = 0; i < this.MAJOR_UNITS_SECONDS.length; i++) {
                    majorUnit = this.MAJOR_UNITS_SECONDS[i];
                    unitsPerSpan = totalSpan / majorUnit;
                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % pointSpan === 0)) {
                        // SPL-55264, 3 minutes is included in the major units list to prevent this loop from failing to find
                        // a major unit at all, but if 5 minutes would fit it is preferred over 3 minutes
                        if(majorUnit === 3 * 60 && totalSpan >= 15 * 60) {
                            continue;
                        }
                        return majorUnit / pointSpan;
                    }
                }
            }
            else if(pointSpan < this.MIN_SECS_PER_MONTH) {
                var secsPerDay = 24 * 60 * 60,
                    dayPointSpan = Math.round(pointSpan / secsPerDay),
                    dayTotalSpan = Math.round(totalSpan / secsPerDay);

                for(i = 0; i < this.MAJOR_UNIT_DAYS.length; i++) {
                    majorUnit = this.MAJOR_UNIT_DAYS[i];
                    unitsPerSpan = dayTotalSpan / majorUnit;
                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % dayPointSpan === 0)) {
                        return majorUnit / dayPointSpan;
                    }
                }
            }
            else {
                var secsPerMonth = 30 * 24 * 60 * 60,
                    monthPointSpan = Math.round(pointSpan / secsPerMonth),
                    monthTotalSpan = Math.round(totalSpan / secsPerMonth);

                for(i = 0; i < this.MAJOR_UNIT_MONTHS.length; i++) {
                    majorUnit = this.MAJOR_UNIT_MONTHS[i];
                    unitsPerSpan = monthTotalSpan / majorUnit;
                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % monthPointSpan === 0)) {
                        return majorUnit / monthPointSpan;
                    }
                }
            }
            // if we exit the loop without finding a major unit, we just punt and divide the points evenly
            return Math.ceil(timeData.length / numLabelCutoff);
        },

        getRoundestIndex: function(timeData, majorUnit, pointSpan) {
            var i, roundest, roundestIndex,
                bdTimes = [],
                secsMajorUnit = majorUnit * pointSpan;

            for(i = 0; i < timeData.length; i++) {
                bdTimes.push(new this.BdTime(timeData[i]));
            }
            roundest = bdTimes[0];
            roundestIndex = 0;
            for(i = 1; i < bdTimes.length; i++) {
                if(this.isRounderThan(bdTimes[i], roundest, pointSpan) && this.bdTimeMatchesUnit(bdTimes[i], secsMajorUnit)) {
                    roundest = bdTimes[i];
                    roundestIndex = i;
                }
            }
            return roundestIndex;
        },

        isRounderThan: function(first, second, pointSpan) {
            // when comparing firsts-of-the-month only, January 1st is rounder
            if(first.month === 1 && first.day === 1 && first.hour === 0
                     && second.month !== 1 && second.day === 1 && second.hour === 0) {
                return true;
            }

            if(first.hour === 0 && second.hour !== 0) {
                return true;
            }
            if(first.hour % 12 === 0 && second.hour % 12 !== 0) {
                return true;
            }
            if(first.hour % 6 === 0 && second.hour % 6 !== 0) {
                return true;
            }
            if(first.hour % 4 === 0 && second.hour % 4 !== 0) {
                return true;
            }
            if(first.hour % 2 === 0 && second.hour % 2 !== 0) {
                return true;
            }

            if(first.minute === 0 && second.minute !== 0) {
                return true;
            }
            if(first.minute % 30 === 0 && second.minute % 30 !== 0) {
                return true;
            }
            if(first.minute % 15 === 0 && second.minute % 15 !== 0) {
                return true;
            }
            if(first.minute % 10 === 0 && second.minute % 10 !== 0) {
                return true;
            }
            if(first.minute % 5 === 0 && second.minute % 5 !== 0) {
                return true;
            }
            if(first.minute % 2 === 0 && second.minute % 2 !== 0) {
                return true;
            }

            if(first.second === 0 && second.second !== 0) {
                return true;
            }
            if(first.second % 30 === 0 && second.second % 30 !== 0) {
                return true;
            }
            if(first.second % 15 === 0 && second.second % 15 !== 0) {
                return true;
            }
            if(first.second % 10 === 0 && second.second % 10 !== 0) {
                return true;
            }
            if(first.second % 5 === 0 && second.second % 5 !== 0) {
                return true;
            }
            if(first.second % 2 === 0 && second.second % 2 !== 0) {
                return true;
            }
            return false;
        },

        bdTimeMatchesUnit: function(bdTime, secsMajor) {
            if(secsMajor < 60) {
                return (bdTime.second % secsMajor === 0);
            }
            if(secsMajor < 60 * 60) {
                var minutes = Math.floor(secsMajor / 60);
                return (bdTime.minute % minutes === 0);
            }
            else {
                var hours = Math.floor(secsMajor / (60 * 60));
                return (bdTime.hour % hours === 0);
            }
            return true;
        },

        getPrettyLabelInfo: function(rawLabels) {
            var i, prettyLabel,
                bdTimes = [],
                prettyLabels = [];

            for(i = 0; i < rawLabels.length; i++) {
                bdTimes.push(new this.BdTime(rawLabels[i]));
            }

            var granularity = this.determineLabelGranularity(bdTimes);
            for(i = 0; i < bdTimes.length; i++) {
                if(i === 0) {
                    prettyLabels.push(this.formatBdTimeAsLabel(bdTimes[i], null, granularity));
                }
                else {
                    prettyLabels.push(this.formatBdTimeAsLabel(bdTimes[i], bdTimes[i - 1], granularity));
                }
            }

            return {
                prettyLabels: prettyLabels,
                granularity: granularity
            };
        },

        determineLabelGranularity: function(bdTimes) {
            if(bdTimes.length === 1) {
                return 'second';
            }
            var i, bdTime,
                seconds = [],
                minutes = [],
                hours = [],
                days = [],
                months = [],

                allInListMatch = function(list, matchMe) {
                    for(var i = 0; i < list.length; i++) {
                        if(list[i] !== matchMe) {
                            return false;
                        }
                    }
                    return true;
                };

            for(i = 0; i < bdTimes.length; i++) {
                bdTime = bdTimes[i];
                seconds.push(bdTime.second);
                minutes.push(bdTime.minute);
                hours.push(bdTime.hour);
                days.push(bdTime.day);
                months.push(bdTime.month);
            }

            if(!allInListMatch(seconds, 0)) {
                return 'second';
            }
            if(!allInListMatch(minutes, 0)){
                return 'hour';
            }
            if((!allInListMatch(hours, 0))) {
                return 'hour';
            }
            if(!allInListMatch(days, 1)) {
                return 'day';
            }
            if(!allInListMatch(months, 1)) {
                return 'month';
            }
            return 'year';
        },

        formatBdTimeAsLabel: function(bdTime, prevBdTime, granularity) {
            if(bdTime.isInvalid) {
                return null;
            }
            var i18n = Splunk.JSCharting.i18nUtils,
                dateTime = this.bdTimeToDateObject(bdTime),

                showDay = (granularity in { 'second': true, 'hour': true, 'day': true }),
                showTimes = (granularity in { 'second': true, 'hour': true}),
                showSeconds = (granularity === 'second'),

                timeFormat = (showSeconds) ? 'medium' : 'short',
                dateFormat = (showDay) ? 'ccc MMM d' : 'MMMM';

            if(granularity === 'year') {
                return i18n.format_date(dateTime, 'YYYY');
            }
            if(prevBdTime && prevBdTime.year === bdTime.year && bdTime.month === prevBdTime.month && bdTime.day === prevBdTime.day) {
                return format_time(dateTime, timeFormat);
            }
            if(!prevBdTime || bdTime.year !== prevBdTime.year) {
                dateFormat += '<br/>YYYY';
            }
            return (showTimes) ?
                format_time(dateTime, timeFormat) + '<br/>' + i18n.format_date(dateTime, dateFormat) :
                i18n.format_date(dateTime, dateFormat);
        },

        // returns null if string cannot be parsed
        formatIsoStringAsTooltip: function(isoString, pointSpan) {
            var i18n = Splunk.JSCharting.i18nUtils,
                bdTime = this.extractBdTime(isoString),
                dateObject;

            if(bdTime.isInvalid) {
                return null;
            }
            dateObject = this.bdTimeToDateObject(bdTime);

            if (pointSpan >= this.MIN_SECS_PER_DAY) { // day or larger
                return i18n.format_date(dateObject);
            }
            else if (pointSpan >= this.SECS_PER_MIN) { // minute or longer
                return format_datetime(dateObject, 'medium', 'short');
            }
            return format_datetime(dateObject);
        },

        extractBdTime: function(timeString) {
            return new this.BdTime(timeString);
        },

        bdTimeToDateObject: function(bdTime) {
            var year = bdTime.year,
                month = bdTime.month - 1,
                day = bdTime.day,
                hour = bdTime.hour,
                minute = bdTime.minute,
                second = bdTime.second;

            return new Date(year, month, day, hour, minute, second);
        }

    };

    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ThrottleUtil
    Splunk.JSCharting.Throttler = function(properties){
            properties              = properties || {};
            this.highlightDelay     = properties.highlightDelay || 200;
            this.unhighlightDelay   = properties.unhighlightDelay || 100;
            this.timer              = null;
            this.timer2             = null;
            this.mouseStatus        = 'over';
            this.isSelected         = false;
            this.onMouseOver        = properties.onMouseOver;
            this.onMouseOut         = properties.onMouseOut;
        };

    $.extend(Splunk.JSCharting.Throttler.prototype, {

        setMouseStatus: function(status){ this.mouseStatus = status; },

        getMouseStatus: function(){ return this.mouseStatus; },

        mouseOverHappened: function(someArgs) {
            var that = this,
                args = arguments;
            this.mouseOverFn = function(){
                that.onMouseOver.apply(null, args);
            };
            clearTimeout(this.timer);
            clearTimeout(this.timer2);
            this.setMouseStatus('over');
            this.timeOutManager();
        },

        mouseOutHappened: function(someArgs) {
            var that = this,
                args = arguments;
            this.mouseOutFn = function(){
                that.onMouseOut.apply(null, args);
            };
            this.setMouseStatus('out');
            this.timeOutManager();
        },

        timeOutManager: function(){
            var that = this;

            clearTimeout(this.timer);
            if(this.isSelected){
                if(this.getMouseStatus()==='over'){
                    this.mouseEventManager();
                }else{
                    this.timer2 = setTimeout(function(){
                        that.setMouseStatus('out');
                        that.mouseEventManager();
                    },that.unhighlightDelay);
                }
            }else{
                this.timer = setTimeout(function(){
                    that.isSelected = true;
                    that.mouseEventManager();
                },that.highlightDelay);
            }
        },

        mouseEventManager: function(){
            var that = this;
            if(this.getMouseStatus()==='over'){
                this.mouseOverFn();
                this.isSelected = true;
                this.setMouseStatus('out');
            }else{
                this.mouseOutFn();
                this.isSelected = false;
                this.setMouseStatus('over');
            }
        }
    });



    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ColorUtils


    Splunk.JSCharting.ColorUtils = {

        // converts a hex number to its css-friendly counterpart, with optional alpha transparency field
        // returns undefined if the input is cannot be parsed to a valid number or if the number is out of range
        colorFromHex: function(hexNum, alpha) {
            if(typeof hexNum !== "number") {
                hexNum = parseInt(hexNum, 16);
            }
            if(isNaN(hexNum) || hexNum < 0x000000 || hexNum > 0xffffff) {
                return undefined;
            }
            var r = (hexNum & 0xff0000) >> 16,
                g = (hexNum & 0x00ff00) >> 8,
                b = hexNum & 0x0000ff;

            return ((alpha === undefined) ? ("rgb(" + r + "," + g + "," + b + ")") : ("rgba(" + r + "," + g + "," + b + "," + alpha + ")"));
        },

        // coverts a color string in either hex or rgb format into its corresponding hex number
        // returns zero if the color string can't be parsed as either format
        hexFromColor: function(color) {
            var normalizedColor = Splunk.util.normalizeColor(color);

            return (normalizedColor) ? parseInt(normalizedColor.replace("#", "0x"), 16) : 0;
        },

        // given a color string (in hex or rgb form) or a hex number, formats the color as an rgba string with the given alpha transparency
        addAlphaToColor: function(color, alpha) {
            var colorAsHex = (typeof color === "number") ? color : this.hexFromColor(color);
            return this.colorFromHex(colorAsHex, alpha);
        },

        // given a color string in rgba format, returns the equivalent color in rgb format
        // if the color string is not in valid rgba format, returns the color string un-modified
        removeAlphaFromColor: function(rgbaStr) {
            // lazy create the regex
            if(!this.rgbaRegex) {
                this.rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,[\s\d.]+\)\s*$/;
            }
            var colorComponents = this.rgbaRegex.exec(rgbaStr);
            if(!colorComponents) {
                return rgbaStr;
            }
            return ("rgb(" + colorComponents[1] + ", " + colorComponents[2] + ", " + colorComponents[3] + ")");
        },

        // calculate the luminance of a color based on its hex value
        // returns undefined if the input is cannot be parsed to a valid number or if the number is out of range
        // equation for luminance found at http://en.wikipedia.org/wiki/Luma_(video)
        getLuminance: function(hexNum) {
            if(typeof hexNum !== "number") {
                hexNum = parseInt(hexNum, 16);
            }
            if(isNaN(hexNum) || hexNum < 0x000000 || hexNum > 0xffffff) {
                return undefined;
            }
            var r = (hexNum & 0xff0000) >> 16,
                g = (hexNum & 0x00ff00) >> 8,
                b = hexNum & 0x0000ff;

            return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        }
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ParsingUtils


    Splunk.JSCharting.ParsingUtils = {

        // returns a map of properties that apply either to the x-axis or to x-axis labels
        // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
        getXAxisProperties: function(properties) {
            var key, newKey,
                remapped = {},
                axisProps = this.filterPropsByRegex(properties, /(axisX|primaryAxis|axisLabelsX|axisTitleX|gridLinesX)/);
            for(key in axisProps) {
                if(axisProps.hasOwnProperty(key)) {
                    if(!this.xAxisKeyIsTrumped(key, properties)) {
                        newKey = key.replace(/(axisX|primaryAxis)/, "axis");
                        newKey = newKey.replace(/axisLabelsX/, "axisLabels");
                        newKey = newKey.replace(/axisTitleX/, "axisTitle");
                        newKey = newKey.replace(/gridLinesX/, "gridLines");
                        remapped[newKey] = axisProps[key];
                    }
                }
            }
            return remapped;
        },

        // checks if the given x-axis key is deprecated, and if so returns true if that key's
        // non-deprecated counterpart is set in the properties map, otherwise returns false
        xAxisKeyIsTrumped: function(key, properties) {
            if(!(/primaryAxis/.test(key))) {
                return false;
            }
            if(/primaryAxisTitle/.test(key)) {
                return properties[key.replace(/primaryAxisTitle/, "axisTitleX")];
            }
            return properties[key.replace(/primaryAxis/, "axisX")];
        },

        // returns a map of properties that apply either to the y-axis or to y-axis labels
        // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
        getYAxisProperties: function(properties) {
            var key, newKey,
                remapped = {},
                axisProps = this.filterPropsByRegex(properties, /(axisY|secondaryAxis|axisLabelsY|axisTitleY|gridLinesY)/);
            for(key in axisProps) {
                if(axisProps.hasOwnProperty(key)) {
                    if(!this.yAxisKeyIsTrumped(key, properties)) {
                        newKey = key.replace(/(axisY|secondaryAxis)/, "axis");
                        newKey = newKey.replace(/axisLabelsY/, "axisLabels");
                        newKey = newKey.replace(/axisTitleY/, "axisTitle");
                        newKey = newKey.replace(/gridLinesY/, "gridLines");
                        remapped[newKey] = axisProps[key];
                    }
                }
            }
            return remapped;
        },

        // checks if the given y-axis key is deprecated, and if so returns true if that key's
        // non-deprecated counterpart is set in the properties map, otherwise returns false
        yAxisKeyIsTrumped: function(key, properties) {
            if(!(/secondaryAxis/.test(key))) {
                return false;
            }
            if(/secondaryAxisTitle/.test(key)) {
                return properties[key.replace(/secondaryAxisTitle/, "axisTitleY")];
            }
            return properties[key.replace(/secondaryAxis/, "axisY")];
        },

        // uses the given regex to filter out any properties whose key doesn't match
        // will return an empty object if the props input is not a map
        filterPropsByRegex: function(props, regex) {
            if(!(regex instanceof RegExp)) {
                return props;
            }
            var key,
                filtered = {};

            for(key in props) {
                if(props.hasOwnProperty(key) && regex.test(key)) {
                    filtered[key] = props[key];
                }
            }
            return filtered;
        },

        stringToMap: function(str) {
            var i, propList, loopKv,
                map = {},
                strLen = str.length;

            if(str.charAt(0) !== '{' || str.charAt(strLen - 1) !== '}') {
                return false;
            }
            str = str.substr(1, strLen - 2);
            propList = str.split(',');
            for(i = 0; i < propList.length; i++) {
                loopKv = propList[i].split(':');
                map[loopKv[0]] = loopKv[1];
            }
            return map;
        },

        stringToArray: function(str) {
            var strLen = str.length;

            if(str.charAt(0) !== '[' || str.charAt(strLen - 1) !== ']') {
                return false;
            }
            str = str.substr(1, strLen - 2);
            return Splunk.util.stringToFieldList(str);
        },

        stringToHexArray: function(colorStr) {
            var i, hexColor,
                colors = this.stringToArray(colorStr);

            if(!colors) {
                return false;
            }
            for(i = 0; i < colors.length; i++) {
                hexColor = parseInt(colors[i], 16);
                if(isNaN(hexColor)) {
                    return false;
                }
                colors[i] = hexColor;
            }
            return colors;
        },

        // a simple utility method for comparing arrays, assumes one-dimensional arrays of primitives, performs strict comparisons
        arraysAreEquivalent: function(array1, array2) {
            // make sure these are actually arrays
            if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
                return false;
            }
            if(array1 === array2) {
                // true if they are the same object
                return true;
            }
            if(array1.length !== array2.length) {
                // false if they are different lengths
                return false;
            }
            // false if any of their elements don't match
            for(var i = 0; i < array1.length; i++) {
                if(array1[i] !== array2[i]) {
                    return false;
                }
            }
            return true;
        },

        escapeHtml: function(input) {
            return (""+input).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.i18nUtils

    Splunk.JSCharting.i18nUtils = {

        // maintain a hash of locales where custom string replacements are needed to get correct translation
        CUSTOM_LOCALE_FORMATS: {
            'ja_JP': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ],
            'ko_KR': [
                ['d', 'd\uc77c'],
                ['YYYY', 'YYYY\ub144']
            ],
            'zh_CN': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ],
            'zh_TW': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ]
        },

        // maintain a list of replacements needed when a locale specifies that day comes before month
        DAY_FIRST_FORMATS: [
            ['MMM d', 'd MMM']
        ],

        // a special-case hack to handle some i18n bugs, see SPL-42469
        format_date: function(date, format) {
            var i, replacements,
                locale = locale_name();
            if(format && locale_uses_day_before_month()) {
                replacements = this.DAY_FIRST_FORMATS;
                for(i = 0; i < replacements.length; i++) {
                    format = format.replace(replacements[i][0], replacements[i][1]);
                }
            }
            if(format && locale in this.CUSTOM_LOCALE_FORMATS) {
                replacements = this.CUSTOM_LOCALE_FORMATS[locale];

                for(i = 0; i < replacements.length; i++) {
                    format = format.replace(replacements[i][0], replacements[i][1]);
                }
            }
            return format_date(date, format);
        }

    };

})();
});

require.define("/ui/charting/splunk.js", function (require, module, exports, __dirname, __filename) {

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
    var Splunk = {};
    
    /**
     * Returns the namespace specified and creates it if it doesn't exist
     * <pre>
     * Splunk.namespace("property.package");
     * Splunk.namespace("Splunk.property.package");
     * </pre>
     * Either of the above would create Splunk.property, then
     * Splunk.property.package
     *
     * @method namespace
     * @static
     * @param  {String} name A "." delimited namespace to create
     * @return {Object} A reference to the last namespace object created
     */
    Splunk.namespace = function(name) {
        var parts = name.split(".");
        var obj = Splunk;
        for (var i=(parts[0]=="Splunk")?1:0; i<parts.length; i=i+1) {
            obj[parts[i]] = obj[parts[i]] || {};
            obj = obj[parts[i]];
        }
        return obj;
    };
    
    /****** DON'T CHANGE ANYTHING BELOW THIS LINE ******/
    
    module.exports = Splunk;
})();
});

require.define("/ui/charting/i18n.js", function (require, module, exports, __dirname, __filename) {

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
    
    var Splunk = require('./splunk');
    var util = require('./util');
    var _i18n_locale = require('./i18n_locale')._i18n_locale;
    
    var sprintf = util.sprintf;
    
    /**
    ** i18n / L10n support routines
    */



    /**
    * Translate a simple string
    */
    function _(message) {
        if (_i18n_locale.locale_name == 'en_DEBUG') return __debug_trans_str(message);
        var entry = _i18n_catalog['+-'+message];
        return entry == undefined ? message : entry;
    }

    /**
    * Translate a string containing a number
    *
    * Eg. ungettext('Delete %(files)d file?', 'Delete %(files)d files?', files)
    * Use in conjuction with sprintf():
    *   sprintf( ungettext('Delete %(files)d file?', 'Delete %(files)d files?', files), { files: 14 } )
    */
    function ungettext(msgid1, msgid2, n) {
        if (_i18n_locale.locale_name == 'en_DEBUG') return __debug_trans_str(msgid1);
        var id = ''+_i18n_plural(n)+'-'+msgid1;
        var entry = _i18n_catalog[id];
        return entry == undefined ? (n==1 ? msgid1 : msgid2)  : entry;
    }


    function __debug_trans_str(str) {
        var parts = str.split(/(\%(:?\(\w+\))?\w)|(<[^>]+>)|(\s+)/);
        parts = jQuery.grep(parts, function(en) { return en!==undefined; });
        var result = [];
        for(var i=0; i<parts.length; i++) {
            if (i && parts[i-1].substr(0, 2)=='%(')
                continue;
            if (parts[i][0] == '%') 
                result.push('**'+parts[i]+'**');
            else if (parts[i][0] == '<' || /^\s+/.test(parts[i]))
                result.push(parts[i]);
             else 
                result.push('\u270c'.repeat(parts[i].length));
        }
        return result.join('');
    }

    // Locale routines

    /**
    * Format a number according to the current locale
    * The default format for en_US is #,##0.###
    * See http://babel.edgewall.org/wiki/Documentation/numbers.html for details on format specs
    */
    exports.format_decimal = format_decimal; 
	function format_decimal(num, format) {
        if (!format)
            format = _i18n_locale['number_format'];
        var pattern = parse_number_pattern(format);
        if (_i18n_locale.locale_name == 'en_DEBUG')
            return pattern.apply(num).replace(/\d/g, '0');
        else
            return pattern.apply(num);
    }

    exports.format_number = format_decimal; // Maintain parity with the Python library

    /**
    * Format a percentage
    */
    exports.format_percent = format_percent; 
	function format_percent(num, format) {     
        if (!format)
            format = _i18n_locale['percent_format'];
        var pattern = parse_number_pattern(format);
        pattern.frac_prec = [0, 3]; // Appserver has standardized on between 0 and 3 decimal places for percentages
        return pattern.apply(num);
    }

    /**
    * Format a number in scientific notation
    */
    exports.format_scientific = format_scientific; 
	function format_scientific(num, format) {
        if (!format)
            format = _i18n_locale['scientific_format'];
        var pattern = parse_number_pattern(format);
        return pattern.apply(num);
    }


    /**
    * Format a date according to the user's current locale
    *
    * standard formats (en-US examples):
    * short: 1/31/08
    * medium: Jan 31, 2008
    * long: January 31, 2008
    * full: Thursday, January 31, 2008
    *
    * Custom format can also be used
    *
    * @date Date object or unix timestamp or null for current time
    * @format format specifier ('short', 'medium', 'long', 'full', 'MMM d, yyyy', etc)
    */
    exports.format_date = format_date; 
	function format_date(date, format) {
        if (!date)
            date = new Date();
        if (Splunk.util.isInt(date)) {
            date = new Date(date*1000);
        }
        if (!format)
            format = 'medium';
        if (['full','long','medium','short'].indexOf(format)!==-1)
            format = get_date_format(format);
        var pattern = parse_datetime_pattern(format);
        return pattern.apply(new DateTime(date), _i18n_locale);
    }


    /**
    * Format a date and time according to the user's current locale
    *
    * standard formats (en-US examples)
    * short: 1/31/08 10:00 AM
    * medium: Jan 31, 2008 10:00:00 AM
    * long: January 31, 2008 10:00:00 AM
    * full: Thursday, January 31, 2008 10:00:00 AM
    *
    * Custom format can also be used
    *
    * @date Date object or unix timestamp or null for current time
    * @format format specifier ('short', 'medium', 'long', 'full', 'MMM d, yyyy', etc)
    */
    exports.format_datetime = format_datetime; 
	function format_datetime(datetime, date_format, time_format) {
        if (datetime == undefined)
            datetime = new Date();
        if (Splunk.util.isInt(datetime)) {
            datetime = new Date(datetime*1000);
        }
        datetime = new DateTime(datetime);
        if (!date_format)
            date_format = 'medium';
        if (!time_format)
            time_format = date_format;
        var td_format = get_datetime_format(date_format);
        return td_format.replace('{0}', format_time(datetime, time_format)).replace('{1}', format_date(datetime, date_format));
    }

    /**
    * Format a time according to the user's current locale
    *
    * NOTE: Time is automatically translated to the user's timezone
    *
    * standard formats (en-US only defines short/medium)
    * short: 10:00 AM
    * medium: 10:00:00 AM
    *
    * other locales may also define long/full and may use 24 hour time, etc
    *
    * @time An object of class Time (see below), or a Date object or null for current time
    * @format format specifier ('short', 'medium', 'long', 'full', 'h:mm:ss a', etc)
    */
    exports.format_time = format_time; 
	function format_time(time, format) {
        if (!format)
            format = 'medium';
        if (!time) {
            timenow = new Date();
            time = new Time(timenow.getHours(), timenow.getMinutes(), timenow.getSeconds());
        } else if (time instanceof Date) {
            time = new DateTime(time);
        }
        if (['full','long','medium','short'].indexOf(format)!==-1)
            format = get_time_format(format);
        var pattern = parse_datetime_pattern(format);
        return pattern.apply(time, _i18n_locale);
    }

    /**
    * Like format_datetime, but converts the seconds to seconds+microseconds as ss.QQQ
    * Also lets you specify the format to use for date and time individually
    *
    * For sub-second resolution, dt must be a DateTime object
    */
    exports.format_datetime_microseconds = format_datetime_microseconds; 
	function format_datetime_microseconds(dt, date_base_format, time_base_format) {
        if (!date_base_format)
            date_base_format = 'short';
        if (!time_base_format)
            time_base_format = 'medium';
        if (!dt) {
            var timenow = new Date();
            dt = new Time(timenow.getHours(), timenow.getMinutes(), timenow.getSeconds());
        } else if (dt instanceof Date) {
            dt = new DateTime(dt);
        }

        var locale = _i18n_locale;
        var time_format = locale.time_formats[time_base_format + '-microsecond'];
        if (!time_format) {
            time_format = get_time_format(time_base_format);
            time_format = (time_format instanceof DateTimePattern) ? time_format.pattern  : time_format;
            time_format = time_format.replace(/ss/, 'ss_TTT', 'g'); // seconds.microseconds
            time_format = locale.time_formats[time_base_format + '-microsecond'] = parse_datetime_pattern(time_format);
        }
        
        return get_datetime_format(time_base_format
            ).replace('{0}', format_time(dt, time_format)
            ).replace('{1}', format_date(dt, date_base_format));
    }

    /**
    * Like format_time, but converts the seconds to seconds+microseconds as ss.QQQ
    * Also lets you specify the format to use for date and time individually
    *
    * For sub-second resolution, dt must be a DateTime or Time object
    */
    exports.format_time_microseconds = format_time_microseconds; 
	function format_time_microseconds(time, time_base_format) {
        if (!time_base_format)
            time_base_format = 'medium';

        if (!time) {
            timenow = new Date();
            time = new Time(timenow.getHours(), timenow.getMinutes(), timenow.getSeconds());
        } else if (time instanceof Date) {
            time = new DateTime(time);
        }

        var locale = _i18n_locale;
        var time_format = locale.time_formats[time_base_format + '-microsecond'];
        if (!time_format) {
            time_format = get_time_format(time_base_format);
            time_format = (time_format instanceof DateTimePattern) ? time_format.pattern  : time_format;
            time_format = time_format.replace(/ss/, 'ss_TTT', 'g'); // seconds.microseconds
            time_format = locale.time_formats[time_base_format + '-microsecond'] = parse_datetime_pattern(time_format);
        }

        return format_time(time, time_format);
    }

    exports.locale_name = locale_name; 
    function locale_name() {
        return _i18n_locale.locale_name;
    }

    /**
    * Returns true if the current locale displays times using the 12h clock
    */
    function locale_uses_12h() {
         time_format = get_time_format('medium');
         return time_format.format.indexOf('%(a)')!=-1;
    }
    
    exports.locale_uses_day_before_month = locale_uses_day_before_month; 
    function locale_uses_day_before_month() {
        time_format = get_date_format("short");
        var formatStr = time_format.format.toLowerCase();
        if (formatStr.indexOf('%(d)')>-1 && formatStr.indexOf('%(m)')>-1) {
            return (formatStr.indexOf('%(d)') < formatStr.indexOf('%(m)'));
        }
        return false;
    }

    /**
    * Class to hold time information in lieu of datetime.time
    */
    function Time(hour, minute, second, microsecond) {
        if (_i18n_locale.locale_name == 'en_DEBUG') {
            this.hour = 11;
            this.minute = 22;
            this.second = 33;
            this.microsecond = 123000;
        } else {
            this.hour = hour;
            this.minute = minute;
            this.second = second;
            this.microsecond = microsecond ? microsecond : 0;
        }
    }

    /**
    * Wrapper object for JS Date objects
    */
    function DateTime(date) {
        if (date instanceof DateTime)
            return date;
        if (_i18n_locale.locale_name == 'en_DEBUG') 
            date = new Date(3333, 10, 22, 11, 22, 33, 123);
        if (date instanceof Date) {
            this.date = date;
            this.hour = date.getHours();
            this.minute = date.getMinutes();
            this.second = date.getSeconds();
            this.microsecond = 0;
            this.year = date.getFullYear();
            this.month = date.getMonth()+1;
            this.day = date.getDate();
        } else {
            for(var k in date) {
                this[k] = date[k];
            }
        }
    }

    DateTime.prototype.weekday = function() {
        // python DateTime compatible function
        var d = this.date.getDay()-1;
        if (d<0) d=6;
        return d;
    }


    // No user serviceable parts below
    // See your prefecture's Mr Sparkle representative for quality servicing

    // This is mostly directly ported from Babel

    function parse_number_pattern(pattern) {
        // Parse number format patterns
        var PREFIX_END = '[^0-9@#.,]';
        var NUMBER_TOKEN = '[0-9@#.,E+\-]';

        var PREFIX_PATTERN = "((?:'[^']*'|"+PREFIX_END+")*)";
        var NUMBER_PATTERN = "("+NUMBER_TOKEN+"+)";
        var SUFFIX_PATTERN = "(.*)";

        var number_re = new RegExp(PREFIX_PATTERN + NUMBER_PATTERN + SUFFIX_PATTERN);
        if (pattern instanceof NumberPattern) {
            return pattern;
        }

        var neg_pattern, pos_suffix, pos_prefix, neg_prefix, neg_suffix, num, exp, dum, sp;
        // Do we have a negative subpattern?
        if (pattern.indexOf(';')!==-1) {
            sp = pattern.split(';', 2);
            pattern=sp[0]; neg_pattern=sp[1];

            sp = pattern.match(number_re).slice(1);
            pos_prefix=sp[0]; num=sp[1]; pos_suffix=sp[2];

            sp = neg_pattern.match(number_re).slice(1);
            neg_prefix=sp[0]; neg_suffix=[2];
        } else {
            sp = pattern.match(number_re).slice(1);
            pos_prefix=sp[0]; num=sp[1]; pos_suffix=sp[2];
            neg_prefix = '-' + pos_prefix;
            neg_suffix = pos_suffix;
        }
        if (num.indexOf('E')!==-1) {
            sp = num.split('E', 2);
            num = sp[0]; exp=sp[1];
        } else {
            exp = null;
        }
        if (num.indexOf('@')!==-1) {
            if (num.indexOf('.')!==-1 && num.indexOf('0')!==-1)
                return alert('Significant digit patterns can not contain "@" or "0"')
        }
        var integer, fraction;
        if (num.indexOf('.')!==-1)  {
            sp = num.rsplit('.', 2);
            integer=sp[0]; fraction=sp[1];
        } else {
            integer = num;
            fraction = '';
        }
        var min_frac = 0, max_frac = 0 ;

        function parse_precision(p) {
            // Calculate the min and max allowed digits
            var min = 0; var max = 0;
            for(var i=0; i<p.length; i++) {
                var c = p.substr(i, 1);
                if ('@0'.indexOf(c)!==-1) {
                    min += 1
                    max += 1
                } else if (c == '#') {
                    max += 1
                } else if (c == ',') {
                    continue;
                } else {
                    break;
                }
            }
            return [min, max];
        }

        function parse_grouping(p) {
            /*
            Parse primary and secondary digit grouping

            >>> parse_grouping('##')
            0, 0
            >>> parse_grouping('#,###')
            3, 3
            >>> parse_grouping('#,####,###')
            3, 4
            */
            var width = p.length;
            var g1 = p.lastIndexOf(',');
            if (g1 == -1)
                return [1000, 1000];
            g1 = width - g1 - 1;
            // var g2 = p[:-g1 - 1].lastIndexOf(',')
            var g2 = p.substr(0, p.length-g1-1).lastIndexOf(',');
            if (g2 == -1)
                return [g1, g1];
            g2 = width - g1 - g2 - 2 ;
            return [g1, g2];
        }

        var int_prec = parse_precision(integer);
        var frac_prec = parse_precision(fraction);
        var exp_plus;
        var exp_prec;
        if (exp) {
            frac_prec = parse_precision(integer+fraction);
            exp_plus = exp.substr(0, 1) == '+';
            exp = exp.replace(/^\++/, '');
            exp_prec = parse_precision(exp);
        } else {
            exp_plus = null;
            exp_prec = null;
        }
        var grouping = parse_grouping(integer);
        return new NumberPattern(pattern, [pos_prefix, neg_prefix],
                             [pos_suffix, neg_suffix], grouping,
                             int_prec, frac_prec,
                             exp_prec, exp_plus);
    }

    // Don't instantiate this class directly; use the format_number() function
    function NumberPattern(pattern, prefix, suffix, grouping, int_prec, frac_prec, exp_prec, exp_plus) {
        this.pattern = pattern;
        this.prefix = prefix;
        this.suffix = suffix;
        this.grouping = grouping;
        this.int_prec = int_prec;
        this.frac_prec = frac_prec;
        this.exp_prec = exp_prec;
        this.exp_plus = exp_plus;
        if ((this.prefix+this.suffix).indexOf('%')!==-1)
            this.scale = 100;
        else if ((this.prefix+this.suffix).indexOf('\u2030')!==-1)
            this.scale = 1000;
        else
            this.scale = 1;
    }

    (function() {

         var split_number = exports.split_number = function(value) {
            // Convert a number into a (intasstring, fractionasstring) tuple
            var a, b, sp;
            value = ''+value;
            if (value.indexOf('.')!==-1) {
                sp = (''+value).split('.');
                a=sp[0]; b=sp[1];
                if (b == '0')
                    b = '';
            } else {
                a = value;
                b = '';
            }
            return [a, b];
        };


        var bankersround = exports.split_number = function(value, ndigits) {
            var a, b;
            if (!ndigits)
                ndigits = 0;
            var sign = value < 0 ? -1 : 1;
            value = Math.abs(value);
            var sp = split_number(value);
            a=sp[0]; b=sp[1];
            var digits = a + b;
            var add = 0;
            var i = a.length + ndigits;
            if (i < 0 || i >= digits.length) {
                // pass
                add = 0;
            } else if (digits.substr(i, 1) > '5') {
                add = 1;
            } else if (digits.substr(i, 1) == '5' && '13579'.indexOf(digits[i-1])!==-1) {
                add = 1;
            }
            var scale = Math.pow(10, ndigits);
            return parseInt(value * scale + add, 10) / scale * sign;
        };


        NumberPattern.prototype.apply = function(value, locale) {
            if (!locale)
                locale = _i18n_locale;
            value *= this.scale;
            var is_negative = value < 0 ? 1 : 0;
            if (this.exp_prec) { // Scientific notation
                value = Math.abs(value);
                var exp;
                if (value)
                    exp = Math.floor(Math.log(value) / Math.log(10));
                else
                    exp = 0;

                // Minimum number of integer digits
                if (this.int_prec[0] == this.int_prec[1])
                    exp -= this.int_prec[0] - 1;
                // Exponent grouping
                else if (this.int_prec[1])
                    exp = parseInt(exp, 10) / this.int_prec[1] * this.int_prec[1];

                if (exp < 0)
                    value = value * Math.pow(10, -exp);
                else
                    value = value / Math.pow(10, exp);

                var exp_sign = '';
                if (exp < 0)
                    exp_sign = locale.minus_sign;
                else if (this.exp_plus)
                    exp_sign = locale.plus_sign;
                exp = Math.abs(exp);
                var num = ''+
                     this._format_sigdig(value, this.frac_prec[0], this.frac_prec[1])
                      + locale.exp_symbol
                      + exp_sign
                      + this._format_int(''+exp, this.exp_prec[0], this.exp_prec[1], locale);
            } else if(this.pattern.indexOf('@')!==-1) { //  Is it a siginificant digits pattern?
                var text = this._format_sigdig(Math.abs(value), this.int_prec[0], this.int_prec[1]);
                if (text.indexOf('.')!==-1) {
                    var a, b;
                    var sp = text.split('.');
                    a=sp[0]; b=sp[1];
                    a = this._format_int(a, 0, 1000, locale);
                    if (b)
                        b = locale.decimal_symbol + b;
                    num = a + b;
                } else {
                    num = this._format_int(text, 0, 1000, locale);
                }
            } else { // A normal number pattern
                var c, d;
                var cd_sp = split_number(bankersround(Math.abs(value), this.frac_prec[1]));
                c=cd_sp[0]; d=cd_sp[1];
                d = d || '0';
                c = this._format_int(c, this.int_prec[0], this.int_prec[1], locale);
                d = this._format_frac(d, locale);
                num = c + d;
            }
            retval = '' + this.prefix[is_negative] + num + this.suffix[is_negative];
            return retval;
        };

        NumberPattern.prototype._format_sigdig = function(value, min, max) {
            var a, b;
            var sp = split_number(value);
            a=sp[0]; b=sp[1];
            var ndecimals = a.length;
            if (a=='0' && b!='') {
                ndecimals = 0;
                while(b[0] == '0') {
                    b = b.substr(1);
                    ndecimals -= 1;
                }
            }
            sp = split_number(bankersround(value, max - ndecimals));
            a=sp[0]; b=sp[1];
            var digits = ((a+b).replace(/^0+/, '')).length;
            if (!digits)
                digits = 1
            // Figure out if we need to add any trailing '0':s
            if (a.length >= max && a!= '0')
                return a
            if (digits < min)
                b += ('0'.repeat(min - digits));
            if (b)
                return a+'.'+b;
            return a
        };

        NumberPattern.prototype._format_int = function(value, min, max, locale) {
            var width = value.length;
            if (width < min)
                value = '0'.repeat(min - width) + value;
            var gsize = this.grouping[0];
            var ret = '';
            var symbol = locale.group_symbol;
            while (value.length > gsize) {
                ret = symbol + value.substr(value.length - gsize) + ret;
                value = value.substr(0, value.length - gsize);
                gsize = this.grouping[1];
            }
            return value + ret;
        };

        NumberPattern.prototype._format_frac = function(value, locale) {
            var min = this.frac_prec[0];
            var max = this.frac_prec[1];
            if (value.length < min)
                value += '0'.repeat(min - value.length);
            if (max == 0 || (min == 0 && parseInt(value, 10) == 0))
                return '';
            var width = value.length;
            while (value.length > min && value.substr(value.length-1) == '0')
                value = value.substr(0, value.length-1);
            return locale.decimal_symbol + value;
        };

    })();



    // Date / time routines

    function get_period_names(locale) {
        if (!locale)
            locale = _i18n_locale;
        return locale.periods;
    }

    function get_day_names(width, context, locale) {
        if (!width)
            width = 'wide';
        if (!context)
            context = 'format';
        if (!locale)
            locale = _i18n_locale;
        return locale.days[context][width];
    }


    function get_month_names(width, context, locale) {
        if (!width)
            width = 'wide';
        if (!context)
            context = 'format';
        if (!locale)
            locale = _i18n_locale;
        return locale.months[context][width];
    }


    function get_quarter_names(width, context, locale) {
        if (!width)
            width = 'wide';
        if (!context)
            context = 'format';
        if (!locale)
            locale = _i18n_locale;
        return locale.quarters[context][width];
    }

    function get_erar_names(width, locale) {
        if (!width)
            width = 'wide';
        if (!locale)
            locale = _i18n_locale;
        return locale.eras[width];
    }

    function get_date_format(format, locale) {
        if (!format)
            format = 'medium';
        if (!locale)
            locale = _i18n_locale;
        var dtp = locale.date_formats[format];
        return new DateTimePattern(dtp.pattern, dtp.format);
    }

    function get_datetime_format(format, locale) {
        if (!format)
            format = 'medium';
        if (!locale)
            locale = _i18n_locale;
        if (locale.datetime_formats[format] == undefined)
            return locale.datetime_formats[null];
        return locale.datetime_formats[format];
    }

    function get_time_format(format, locale) {
        if (!format)
            format = 'medium';
        if (!locale)
            locale = _i18n_locale;
        var dtp = locale.time_formats[format];
        return new DateTimePattern(dtp.pattern, dtp.format);
    }

    var PATTERN_CHARS = {
        'G': [1, 2, 3, 4, 5],                                           // era
        'y': null, 'Y': null, 'u': null,                                // year
        'Q': [1, 2, 3, 4], 'q': [1, 2, 3, 4],                           // quarter
        'M': [1, 2, 3, 4, 5], 'L': [1, 2, 3, 4, 5],                     // month
        'w': [1, 2], 'W': [1],                                          // week
        'd': [1, 2], 'D': [1, 2, 3], 'F': [1], 'g': null,               // day
        'E': [1, 2, 3, 4, 5], 'e': [1, 2, 3, 4, 5], 'c': [1, 3, 4, 5],  // week day
        'a': [1],                                                       // period
        'h': [1, 2], 'H': [1, 2], 'K': [1, 2], 'k': [1, 2],             // hour
        'm': [1, 2],                                                    // minute
        's': [1, 2], 'S': null, 'A': null,                              // second
        'T': null,                                                      // decimal microseconds
        'z': [1, 2, 3, 4], 'Z': [1, 2, 3, 4], 'v': [1, 4], 'V': [1, 4],  // zone
        '_': [1]                                                        // locale decimal symbol
    }

    function parse_datetime_pattern(pattern) {
        /*
        Parse date, time, and datetime format patterns.
       
        >>> parse_pattern("MMMMd").format
        u'%(MMMM)s%(d)s'
        >>> parse_pattern("MMM d, yyyy").format
        u'%(MMM)s %(d)s, %(yyyy)s'
       
        Pattern can contain literal strings in single quotes:
       
        >>> parse_pattern("H:mm' Uhr 'z").format
        u'%(H)s:%(mm)s Uhr %(z)s'
       
        An actual single quote can be used by using two adjacent single quote
        characters:
       
        >>> parse_pattern("hh' o''clock'").format
        u"%(hh)s o'clock"
       
        :param pattern: the formatting pattern to parse
        */
        if (pattern instanceof DateTimePattern)
            return pattern;

        var result = [];
        var quotebuf = null;
        var charbuf = [];
        var fieldchar = [''];
        var fieldnum = [0];

        function append_chars() {
            result.push(charbuf.join('').replace('%', '%%'));
            charbuf = [];
        }

        function append_field() {
            var limit = PATTERN_CHARS[fieldchar[0]];
            if (limit && limit.indexOf(fieldnum[0])==-1) {
                return alert('Invalid length for field: '+fieldchar[0].repeat(fieldnum[0]));
            }
            result.push('%('+(fieldchar[0].repeat(fieldnum[0]))+')s');
            fieldchar[0] = '';
            fieldnum[0] = 0;
        }

        //for idx, char in enumerate(pattern.replace("''", '\0')):
        var patterntmp = pattern.replace("''", '\0');
        for(var idx=0; idx<patterntmp.length; idx++) {
            var ch = patterntmp.substr(idx, 1);
            if (quotebuf === null) {
                if (ch == "'") { // # quote started
                    if (fieldchar[0]) {
                        append_field();
                    } else if (charbuf) {
                        append_chars();
                    }
                    quotebuf = [];
                } else if (ch in PATTERN_CHARS) {
                    if (charbuf) {
                        append_chars();
                    }
                    if (ch == fieldchar[0]) {
                        fieldnum[0] += 1;
                    } else {
                        if (fieldchar[0]) {
                            append_field();
                        }
                        fieldchar[0] = ch;
                        fieldnum[0] = 1;
                    }
                } else {
                    if (fieldchar[0]) {
                        append_field();
                    }
                    charbuf.push(ch);
                }
           
            } else if (quotebuf!=null) {
                if (ch == "'") { // end of quote
                    charbuf.extend(quotebuf);
                    quotebuf = null;
                } else { // # inside quote
                    quotebuf.append(ch);
                }
            }
        }
        if (fieldchar[0]) {
            append_field();
        } else if (charbuf) {
            append_chars();
        }

        return new DateTimePattern(pattern, result.join('').replace('\0', "'"));
    }

    function DateTimePattern(pattern, format) {
        this.pattern = pattern;
        this.format = format;
    }

    DateTimePattern.prototype.apply = function(datetime, locale) {
        return sprintf(this.format, new DateTimeFormat(datetime, locale));
    }

    function DateTimeFormat(value, locale) {
        this.value = value;
        this.locale = locale;
    }

    DateTimeFormat.prototype.__getitem__ = function(name) {
        var ch = name.substr(0, 1);
        var num = name.length;
        switch(ch) {
            case 'G':
                return this.format_era(ch, num);
            case 'y':
            case 'Y':
            case 'u':
                return this.format_year(ch, num);
            case 'q':
            case 'Q':
                return this.format_quarter(ch, num);
            case 'M':
            case 'L':
                return this.format_month(ch, num);
            case 'w':
            case 'W':
                return this.format_week(ch, num);
            case 'd':
                return this.format(this.value.day, num);
            case 'D':
                return this.format_day_of_year(num);
            case 'F':
                return this.format_day_of_week_in_month();
            case 'E':
            case 'e':
            case 'c':
                return this.format_weekday(ch, num);
            case 'a':
                return this.format_period(ch);
            case 'h':
                if (this.value.hour % 12 == 0)
                    return this.format(12, num);
                else
                    return this.format(this.value.hour % 12, num);
            case 'H':
                return this.format(this.value.hour, num);
            case 'K':
                return this.format(this.value.hour % 12, num);
            case 'k':
                if (this.value.hour == 0)
                    return this.format(24, num);
                else
                    return this.format(this.value.hour, num);
            case 'm':
                return this.format(this.value.minute, num);
            case 's':
                return this.format(this.value.second, num);
            case 'S':
                return this.format_frac_seconds(num);
            case 'T':
                return this.format_decimal_frac_seconds(num);
            case 'A':
                return this.format_milliseconds_in_day(num);
            case 'z':
            case 'Z':
            case 'v':
            case 'V':
                return this.format_timezone(ch, num);
            case '_':
                return this.locale.decimal_symbol;
            default:
                return alert('Unsupported date/time field '+ch);
        }
    }

    DateTimeFormat.prototype.format_era = function(ch, num) {
        var width = {3: 'abbreviated', 4: 'wide', 5: 'narrow'}[max(3, num)]
        var era = this.value.year >= 0 ? 1 : 0;
        return get_era_names(width, this.locale)[era];
    }

    DateTimeFormat.prototype.format_year = function(ch, num) {
        var value = this.value.year;
        if (ch == ch.toUpperCase()) {
            var week = this.get_week_number(this.get_day_of_year());
            if (week == 0)
                value -= 1;
        }
        var year = this.format(value, num);
        if (num == 2)
            year = year.substr(year.length-2);
        return year;
    }

    DateTimeFormat.prototype.format_quarter = function(ch, num) {
        var quarter = Math.floor( (this.value.month - 1) / 3 + 1 );
        if (num <= 2)
            return sprintf(sprintf('%%0%dd', num),  quarter);
        var width = {3: 'abbreviated', 4: 'wide', 5: 'narrow'}[num];
        var context = {'Q': 'format', 'q': 'stand-alone'}[ch];
        return get_quarter_names(width, context, this.locale)[quarter];
    }

    DateTimeFormat.prototype.format_month = function(ch, num) {
        if (num <= 2)
            return sprintf(sprintf('%%0%dd', num), this.value.month);
        var width = {3: 'abbreviated', 4: 'wide', 5: 'narrow'}[num];
        var context = {'M': 'format', 'L': 'stand-alone'}[ch];
        return get_month_names(width, context, this.locale)[this.value.month];
    }

    DateTimeFormat.prototype.format_week = function(ch, num) {
        if (ch == ch.toLowerCase()) { //  # week of year
            var day_of_year = this.get_day_of_year();
            var week = this.get_week_number(day_of_year);
            if (week == 0) {
                var date = this.value - timedelta(days=day_of_year);
                week = this.get_week_number(this.get_day_of_year(date), date.weekday());
            }
            return this.format(week, num);
        } else { // # week of month
            var mon_week = this.get_week_number(this.value.day);
            if (mon_week == 0) {
                var mon_date = this.value - timedelta(days=this.value.day);
                mon_week = this.get_week_number(mon_date.day, mon_date.weekday());
            }
            return mon_week;
        }
    }

    DateTimeFormat.prototype.format_weekday = function(ch, num) {
        if (num < 3) {
            if (ch == ch.toLowerCase()) {
                var value = 7 - this.locale.first_week_day + this.value.weekday();
                return this.format(value % 7 + 1, num);
            }
            num = 3;
        }
        var weekday = this.value.weekday();
        var width = {3: 'abbreviated', 4: 'wide', 5: 'narrow'}[num];
        var context = {3: 'format', 4: 'format', 5: 'stand-alone'}[num];
        return get_day_names(width, context, this.locale)[weekday];
    }

    DateTimeFormat.prototype.format_day_of_year = function(num) {
        return this.format(this.get_day_of_year(), num);
    }

    DateTimeFormat.prototype.format_day_of_week_in_month = function() {
        return ((this.value.day - 1) / 7 + 1);
    }

    DateTimeFormat.prototype.format_period = function(ch) {
        var period = {0: 'am', 1: 'pm'}[this.value.hour >= 12 ? 1 : 0];
        return get_period_names(this.locale)[period];
    }

    DateTimeFormat.prototype.format_frac_seconds = function(num) {
        var value = this.value.microsecond;
        return this.format(parseFloat('0.'+value) * Math.pow(10, num), num);
    }

    DateTimeFormat.prototype.format_decimal_frac_seconds = function(num) {
        return this.format(this.value.microsecond, 6).substr(0, num);
    }

    DateTimeFormat.prototype.format_milliseconds_in_day = function(num) {
        var msecs = Math.floor(this.value.microsecond / 1000) + this.value.second * 1000 + this.value.minute * 60000 + this.value.hour * 3600000;
        return this.format(msecs, num);
    }

    DateTimeFormat.prototype.format_timezone = function(ch, num) {
        return ''; // XXX
    }

    DateTimeFormat.prototype.format = function(value, length) {
        return sprintf(sprintf('%%0%dd', length), value);
    }

    DateTimeFormat.prototype.get_day_of_year = function(date) {
        if (date == undefined)
            date = this.value;
        var yearstart = new Date(date.year, 0, 1);
        return Math.ceil((date.date - yearstart) / 86400000)+1;
    }

    DateTimeFormat.prototype.get_week_number = function(day_of_period, day_of_week) {
        /*"Return the number of the week of a day within a period. This may be
        the week number in a year or the week number in a month.
       
        Usually this will return a value equal to or greater than 1, but if the
        first week of the period is so short that it actually counts as the last
        week of the previous period, this function will return 0.
       
        >>> format = DateTimeFormat(date(2006, 1, 8), Locale.parse('de_DE'))
        >>> format.get_week_number(6)
        1
       
        >>> format = DateTimeFormat(date(2006, 1, 8), Locale.parse('en_US'))
        >>> format.get_week_number(6)
        2
       
        :param day_of_period: the number of the day in the period (usually
                              either the day of month or the day of year)
        :param day_of_week: the week day; if ommitted, the week day of the
                            current date is assumed
        */
        if (day_of_week==undefined)
            day_of_week = this.value.weekday();
        var first_day = (day_of_week - this.locale.first_week_day - day_of_period + 1) % 7;
        if (first_day < 0)
            first_day += 7;
        var week_number = (day_of_period + first_day - 1) / 7;
        if (7 - first_day >= this.locale.min_week_days)
            week_number += 1;
        return week_number;
    }






    var _i18n_catalog = {};
    var _i18n_plural = undefined;
    function i18n_register(catalog) {
        _i18n_plural = catalog['plural'];
        for(var k in catalog['catalog']) {
            _i18n_catalog[k] = catalog['catalog'][k];
        }
    }



    function BaseTimeRangeFormatter() {
        this.DATE_METHODS  = [
            {name: "year",   getter : "getFullYear",     setter: "setFullYear", minValue: "1974"},
            {name: "month",  getter : "getMonth",        setter: "setMonth",    minValue: "0"},
            {name: "day",    getter : "getDate",         setter: "setDate",     minValue: "1"},
            {name: "hour",   getter : "getHours",        setter: "setHours",    minValue: "0"},
            {name: "minute", getter : "getMinutes",      setter: "setMinutes",  minValue: "0"},
            {name: "second", getter : "getSeconds",      setter: "setSeconds",  minValue: "0"},
            {name: "millisecond", getter : "getMilliseconds", setter: "setMilliseconds",  minValue: "0"}
        ];
        //this.logger = Splunk.Logger.getLogger("i18n.js");
    }
    /*
     * Given absolute args, returns an object literal with four keys:
     * rangeIsSingleUnitOf, rangeIsIntegerUnitsOf, valuesDifferAt, and valuesHighestNonMinimalAt,
     * which are all one of [false, "second", "minute", "hour", "day", "month", "year"]
     */
    BaseTimeRangeFormatter.prototype.get_summary_data = function(absEarliest, absLatest) {

        // Step 1 --  find the highest level at which there is a difference.
        var differAtLevel = this.get_differing_level(absEarliest, absLatest);
        var valuesDifferAt = (differAtLevel < this.DATE_METHODS.length) ? this.DATE_METHODS[differAtLevel].name : false;
        var rangeIsSingleUnitOf = false;
        var rangeIsIntegerUnitsOf = false;
        
        if (differAtLevel >= this.DATE_METHODS.length) {
            //this.logger.error("get_differing_level returned an invalid response");
            return {
                "rangeIsSingleUnitOf"   : false,
                "rangeIsIntegerUnitsOf" : false,
                "valuesDifferAt"    : false,
                "valuesHighestNonMinimalAt": false
            }
        }
        var methodDict = this.DATE_METHODS[differAtLevel];
        var earliestCopy;

        // Step 2 -- find if the range is an exact integral number of any particular unit.
        // for example lets say that valuesDifferAt is 'hour'. 
        var highestNonMinimalLevel = this.get_highest_non_minimal_level(absEarliest, absLatest);
        var valuesHighestNonMinimalAt = (highestNonMinimalLevel < this.DATE_METHODS.length) ? this.DATE_METHODS[highestNonMinimalLevel].name : false;
        if (highestNonMinimalLevel == differAtLevel) {
            rangeIsIntegerUnitsOf = valuesDifferAt;

        // Step 3 -- catch some tricky corner cases that we missed. of 'last day of month',  'last month of year'
        } else if (highestNonMinimalLevel == differAtLevel +1 ) {
            if (absLatest.getFullYear() == "2009") {
                methodDictInner = this.DATE_METHODS[highestNonMinimalLevel];
                earliestCopy = new Date();
                earliestCopy.setTime(absEarliest.valueOf());

                earliestCopy[methodDictInner.setter](earliestCopy[methodDictInner.getter]() + 1);
                if (earliestCopy.getTime() == absLatest.getTime()) {   
                    rangeIsSingleUnitOf = rangeIsIntegerUnitsOf = this.DATE_METHODS[highestNonMinimalLevel].name;
                }
            }
        }
        
        // Step 4 -- if we're an integer number, check if we're also a single unit of something.
        if (rangeIsIntegerUnitsOf && !rangeIsSingleUnitOf) {
            earliestCopy = new Date();
            earliestCopy.setTime(absEarliest.valueOf());

            // in our example this earliest one hour ahead. 
            if (rangeIsIntegerUnitsOf=="hour") {
                // JS resolves the 2AM DST ambiguity in the fall, by picking the 
                // later of the two 2AM's. This avoids the ambiguity for the one 
                // problematic case.
                earliestCopy.setTime(earliestCopy.valueOf() + 3600000);
            } else {
                earliestCopy[methodDict.setter](earliestCopy[methodDict.getter]() + 1);
            }
            // if they are now the same time, it's a single unit.
            if (earliestCopy.getTime() == absLatest.getTime()) {
                rangeIsSingleUnitOf = this.DATE_METHODS[differAtLevel].name;
            }    
        }

        return {
            "rangeIsSingleUnitOf"   : rangeIsSingleUnitOf,
            "rangeIsIntegerUnitsOf" : rangeIsIntegerUnitsOf,
            "valuesDifferAt"    : valuesDifferAt,
            "valuesHighestNonMinimalAt": valuesHighestNonMinimalAt
        }
    }
    BaseTimeRangeFormatter.prototype.get_highest_non_minimal_level = function(absEarliest, absLatest) {
        for (var i=this.DATE_METHODS.length-1; i>=0; i--) {
            var methodDict = this.DATE_METHODS[i];
            var name = methodDict.name;
            var minValue = methodDict.minValue;
            var earliestValue = absEarliest[methodDict["getter"]]();
            var latestValue   = absLatest[methodDict["getter"]]();

            if (earliestValue != minValue || latestValue != minValue) {
                return i;
            }
        }
    }
    BaseTimeRangeFormatter.prototype.get_differing_level= function(absEarliest, absLatest) {
        var differAtLevel = 0;
        for (var i=0; i<this.DATE_METHODS.length; i++) {
            var methodDict = this.DATE_METHODS[i];
            var name = methodDict.name;
            var earliestValue = absEarliest[methodDict["getter"]]();
            var latestValue   = absLatest[methodDict["getter"]]();
            if (earliestValue == latestValue) {
                differAtLevel = i+1;
            } else break;
        }
        return differAtLevel;
    }
    BaseTimeRangeFormatter.prototype.format_range = function(earliestTime, latestTime) {
        var argsDict;
        if (earliestTime && !latestTime) {
            argsDict = {
                startDateTime: format_datetime(earliestTime, 'medium')
            }    
            return sprintf(_("since %(startDateTime)s"), argsDict);
        }    

        if (!earliestTime && latestTime) {
            argsDict = {
                endDateTime: format_datetime(latestTime, 'medium')
            }    
            return sprintf(_("before %(endDateTime)s"), argsDict);
        }
        
        // there's some low hanging fruit for some simple localizable optimizations
        // pull out the 3 salient facts about the time range
        var summary = this.get_summary_data(earliestTime,latestTime);
        switch (summary["rangeIsSingleUnitOf"]) {
            case "day" :
                return format_date(earliestTime, "medium");
            case "second" :
                return format_datetime(earliestTime, "medium");
            default:
                break;
        }
        // if format_date(earliestTime)  and format_date(latestTime) are identical
        // then only display the date once, and then show the difference with just format_time
        var argDict;
        if (format_date(earliestTime, "medium")  == format_date(latestTime, "medium")) {
            argDict = {
                date : format_date(earliestTime, "medium"),
                start             : format_time(earliestTime, 'medium'),
                end               : format_time(latestTime,   'medium')
            }
            // TRANS: in this particular case the date is the same for both start and end.
            return sprintf(_("%(date)s from %(start)s to %(end)s"), argDict);
        }
        
        argDict = {
            start : format_datetime(earliestTime, 'medium'),
            end   : format_datetime(latestTime,   'medium')
        }
        return sprintf(_("from %(start)s to %(end)s"), argDict)
    }

    function EnglishRangeFormatter(use24HourClock,useEuropeanDateAndMonth) {
        this.use24HourClock = use24HourClock || false;
        this.useEuropeanDateAndMonth = useEuropeanDateAndMonth || false;
    }
    EnglishRangeFormatter.prototype = new BaseTimeRangeFormatter();
    EnglishRangeFormatter.prototype.constructor = EnglishRangeFormatter;
    EnglishRangeFormatter.superClass  = BaseTimeRangeFormatter.prototype;

    /*
     * Given a summary dictionary ( see get_summary_data() above ),
     * this method will return a dictionary with two keys "earliest" and "latest"
     * both of whose values are time format strings.
     * THIS IS FOR USE ONLY IN english locales,  
     * NOTICE NO STRINGS ARE LOCALIZED.  THIS IS DELIBERATE
     *
     */
    EnglishRangeFormatter.prototype.get_format_strings= function(summary) {
        switch (summary["rangeIsSingleUnitOf"]) {
            case "year" :
                return {"earliest" : "during %Y"}
            case "month" :
                return {"earliest" : "during %B %Y"};
            case "day" :
                return {"earliest" : "during %A, %B %e, %Y"};
            case "hour" :
                return {"earliest" : "at %l %p on %A, %B %e, %Y"};
            case "minute" :
                return {"earliest" : "at %l:%M %p %A, %B %e, %Y"};
            case "second" :
                return {"earliest" : "at %l:%M:%S %p on %A, %B %e, %Y"};
            default :
                /*  step 2 harder weirder corner cases where the range satisfies both
                  a)  it is an integer number of X where x is months | days | hours | minutes | seconds
                  b)  the range does not span a boundary of X's parent Y.
                */
                switch (summary["rangeIsIntegerUnitsOf"]) {
                    case "year" :
                        return {
                            "earliest" : "from %Y",
                            "latest"   : " through %Y"
                        }
                    case "month" :
                        return {
                            "earliest" : "from %B",
                            "latest"   : " through %B, %Y"
                        }
                    case "day" :
                        return {
                            "earliest" : "from %B %e",
                            "latest"   : " through %B %e, %Y"
                        }
                    case "hour" :
                        return {
                            "earliest" : "from %l %p",
                            "latest"   : " to %l %p %A, %B %e, %Y"
                        }
                    case "minute" :
                        return {
                            "earliest" : "from %l:%M %p",
                            "latest"   : " to %l:%M %p on %A, %B %e, %Y"
                        }
                    //case "second" :
                    //    return {
                    //        "earliest" : "from%l:%M:%S %p",
                    //        "latest"   : " to %l:%M:%S %p on %A, %B %e, %Y"
                    //    }
                    case "millisecond" :
                        return {
                            "earliest" : "from %l:%M:%S.%Q %p",
                            "latest"   : " to %l:%M:%S.%Q %p on %A, %B %e, %Y"
                        }



                    default :
                        switch (summary["valuesDifferAt"]) {
                            case "month" :
                            case "day" :
                                if (summary["valuesHighestNonMinimalAt"] == "millisecond") {
                                    return {
                                        "earliest" : "from %l:%M:%S.%Q %p %B %e to ",
                                        "latest"   : "%l:%M:%S.%Q %p %B %e, %Y"
                                    };
                                }
                                return {
                                    "earliest" : "from %l:%M:%S %p %B %e to ",
                                    "latest"   : "%l:%M:%S %p %B %e, %Y"
                                };
                            case "hour" :
                            case "minute" :
                            case "second" :
                                if (summary["valuesHighestNonMinimalAt"] == "millisecond") {
                                    return {
                                        "earliest" : "from %l:%M:%S.%Q %p to ",
                                        "latest"   : "%l:%M:%S.%Q %p on %A, %B %e, %Y"
                                    };
                                }
                                return {
                                    "earliest" : "from %l:%M:%S %p to ",
                                    "latest"   : "%l:%M:%S %p on %A, %B %e, %Y"
                                };

                            //total fallback. No special cases detected.  Print times with full precision.
                            default :
                                if (summary["valuesHighestNonMinimalAt"] == "millisecond") {
                                    return {
                                        "earliest" : "from %l:%M:%S.%Q %p %B %e, %Y to ",
                                        "latest"   : "%l:%M:%S.%Q %p %B %e, %Y"
                                    };
                                }
                                return {
                                    "earliest" : "from %l:%M:%S %p %B %e, %Y to ",
                                    "latest"   : "%l:%M:%S %p %B %e, %Y"
                                };
                        }
                }
        }
        //this.logger.error("Assertion failed - get_format_strings should have returned in all cases. rangeIsSingleUnitOf=", summary["rangeIsSingleUnitOf"], " rangeIsIntegerUnitsOf=", summary["rangeIsIntegerUnitsOf"]  , " valuesDifferAt=", summary["valuesDifferAt"]);
    };
    /**
     * This implementation would not scale well beyond these two little configs, 
     * NOTE THE ASSUMPTIONS INLINE.  Possibly should be replaced with actual assertions 
     * but that's a lot of regex to add.
     */
    EnglishRangeFormatter.prototype.applyCustomOptions = function(timeFormatStr) {
        if (this.use24HourClock) {
            // ASSUMPTION 1 - where %p appears in the class' internal literals and has 
            //                no :%S value right before it, 
            //                there is always a single space, ie %H %p;
            timeFormatStr = timeFormatStr.replace(/%l %p/g, "%H:00");
            // now that we've rescued relevant ones and replaced with %H:00
            // ASSUMPTION 2 - where %p in the classes internal formatstrings it
            //                is always preceded by a space .
            timeFormatStr = timeFormatStr.replace(/ %p/g, "");
            // And now we safely replace all the instances of 12-hour hours with 24-hour hours. 
            timeFormatStr = timeFormatStr.replace(/%l/g, "%H");
        }
        if (this.useEuropeanDateAndMonth) {
            // ASSUMPTION 3 - where day and month appear in the classes internal formatstrings
            //                they are ALWAYS %B and %e and there is exactly one space in between.
            timeFormatStr = timeFormatStr.replace(/%B %e/g, "%e %B");
        }
        return timeFormatStr;
    };
    EnglishRangeFormatter.prototype.format_range = function(earliestTime, latestTime) {
        // if only earliestTime is defined
        if (earliestTime && !latestTime) {
            return earliestTime.strftime(this.applyCustomOptions("since %l:%M:%S %p %B %e, %Y"));
        }
        // if only latestTime is defined.
        else if (!earliestTime && latestTime) {
            return latestTime.strftime(this.applyCustomOptions("before %l:%M:%S %p %B %e, %Y"));
        }
        // ASSUME BOTH ARE DEFINED
        if (!earliestTime || !latestTime) throw("Assertion failed. format_range expected defined values for both earliest and latest, but one or more was undefined.");

        // pull out the 3 salient facts about the time range
        var summary = this.get_summary_data(earliestTime,latestTime);

        // we pass those salient facts into a function that gives us back
        // a dictionary with either two format strings, 'earliest' and 'latest',
        // or in the case of certain simple searches, just 'earliest'
        var formatStrings = this.get_format_strings(summary);    

        // we cheat a bit here.  For year, month, day, we subtract a day so we can say
        // the more definitive "through 2005" instead of the kinda-confusing "to 2006"
        if (summary["rangeIsIntegerUnitsOf"] && (summary["rangeIsIntegerUnitsOf"] == "year" ||
            summary["rangeIsIntegerUnitsOf"] == "month" || summary["rangeIsIntegerUnitsOf"] == "day")) {
            latestTime.setDate(latestTime.getDate() - 1);
        }
        if (formatStrings["latest"]) {
            return earliestTime.strftime(this.applyCustomOptions(formatStrings["earliest"])) + latestTime.strftime(this.applyCustomOptions(formatStrings["latest"]));
        }
        return earliestTime.strftime(this.applyCustomOptions(formatStrings["earliest"]));
    }
    /**
     * delegates internally to the format_range method of the appropriate instance of 
     * BaseTimeRangeFormatter.  
     * Through this mechanism, if you want to localize your time formatting but you find 
     * that BaseTimeRangeFormatter can be a bit heavy-handed, you can write your own 
     * Formatter class, and you have the option of extending BaseTimeRangeFormatter 
     * to get the summary logic there, but you dont have to if you dont want to.
     */
    exports.format_datetime_range = format_datetime_range; 
	function format_datetime_range(locale, earliestTime, latestTime) {
        //locale = "en-AR";
        var f = null;
        var use24HourClock = !locale_uses_12h();
        var useEuropeanDateAndMonth = locale_uses_day_before_month();
        if (Splunk.util.trim(locale).indexOf("en-") == 0) {
            f = new EnglishRangeFormatter(use24HourClock, useEuropeanDateAndMonth);
        } else {
            f = new BaseTimeRangeFormatter();
        }
        return f.format_range(earliestTime, latestTime);
    }
})();
});

require.define("/ui/charting/util.js", function (require, module, exports, __dirname, __filename) {

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
    var Splunk = require('./splunk');

    Splunk.namespace("util");

    /****** DON'T CHANGE ANYTHING ABOVE THIS LINE ***********/

    Splunk.util = {
        /**
         * Assign empty handlers for logger calls. Overriden by Splunk.Logger if it is imported.
         */
        logger : {
            "info":function(){},
            "log":function(){},
            "debug":function(){},
            "warn":function(){},
            "error":function(){}
        },

        /**
         * Converts an object literal to an encoded querystring key/value string.
         *
         */
        propToQueryString: function(dictionary) {
            var o = [];
            var val;
            for (var prop in dictionary) {
                val = '' + dictionary[prop];
                o.push(encodeURIComponent(prop) + '=' + encodeURIComponent(dictionary[prop]));
            }
            return o.join('&');
        },

        /**
         * Converts a flat querystring into an object literal
         *
         */
        queryStringToProp: function(args) {
            args = this.trim(args, '&\?#');

            var parts = args.split('&');
            var output = {};

            var key;
            var value;
            var equalsSegments;
            var lim = parts.length;
            for (var i=0,l=lim; i<l; i++) {
                equalsSegments = parts[i].split('=');
                key = decodeURIComponent(equalsSegments.shift());
                value = equalsSegments.join("=");
                output[key] = decodeURIComponent(value);
            }
            return output;
        },

        /**
         * Extracts the fragment identifier value.
         */
        getHash: function(){
        var hashPos = window.location.href.indexOf('#');

        if (hashPos == -1) {
            return "";
        }

        var qPos = window.location.href.indexOf('?', hashPos);

        if (qPos != -1)
            return window.location.href.substr(qPos);

        return window.location.href.substr(hashPos);
        },

        /**
         * This was ported, rewritten a bit and greatly simplified from the
         * same method in the old Calendar object we used to use.
         * TODO - it is only here temporarily, and we should continue trying to
         * kill it.
         */
        parseDate : function(str, fmt) {

            if ((!str) || (!str.indexOf) || (str.indexOf("mm")==0)) return null;

            var y = 0;
            var m = -1;
            var d = 0;
            var a = str.split(/\W+/);
            var b = fmt.match(/%./g);
            var i = 0, j = 0;
            var hr = 0;
            var min = 0;
            var sec = 0;

            for (i = 0; i < a.length; ++i) {
                if (!a[i])
                    continue;
                switch (b[i]) {
                    case "%d":
                        d = parseInt(a[i], 10);
                        break;

                    case "%m":
                        m = parseInt(a[i], 10) - 1;
                        break;

                    case "%Y":
                    case "%y":
                        y = parseInt(a[i], 10);
                        (y < 100) && (y += (y > 29) ? 1900 : 2000);
                        break;

                    case "%H":
                        hr = parseInt(a[i], 10);
                        break;

                    case "%M":
                        min = parseInt(a[i], 10);
                        break;

                    case "%S":
                        sec = parseInt(a[i], 10);
                        break;

                    default:
                        break;
                }
            }
            if (y != 0 && m != -1 && d != 0) {
                var ourDate = new Date(y, m, d, hr, min, sec);
                return ourDate;
            } else {
                //this.logger.warn('unable to parse date "' + str + '" into "' + fmt + '"');
                return false;
            }
        },
        /**
         * Given a timezone offset in minutes, and  a JS Date object,
         * returns the delta in milliseconds, of the two timezones.
         * Note that this will include the offset contributions from DST for both.
         */
        getTimezoneOffsetDelta: function(serverOffsetThen, d) {
            if (!Splunk.util.isInt(serverOffsetThen)) {
                return 0;
            }
            // what JS thinks the timezone offset is at the time given by d. This WILL INCLUDE DST
            var clientOffsetThen = d.getTimezoneOffset() * 60;
            // what splunkd told is the actual timezone offset.
            serverOffsetThen     = serverOffsetThen * -60;

            return 1000 * (serverOffsetThen - clientOffsetThen);
        },

        getEpochTimeFromISO: function(isoStr) {
            // lazily init the regex so we only do it only if necessary and only once.
            if (!this._isoTimeRegex) {
                // Nobody doesnt like ISO.
                this._isoTimeRegex = /([\+\-])?(\d{4,})(?:(?:\-(\d{2}))(?:(?:\-(\d{2}))(?:(?:[T ](\d{2}))(?:(?:\:(\d{2}))(?:(?:\:(\d{2}(?:\.\d+)?)))?)?(?:(Z)|([\+\-])(\d{2})(?:\:(\d{2}))?)?)?)?)?/;
            }
            var m = this._isoTimeRegex.exec(isoStr);
            // put it into a string form that JS Date constructors can actually deal with.

            // Being Super Careful: calling substring on undefined variable
            // here throws an exception that kills the stack but doesnt
            // appear in firebug nor even in the Error Console.
            var seconds, milliseconds;
            if (m[7]) {
                seconds = m[7].substring(0,2);
                // Note this includes the period.  ie ".003"
                millisecondsStr = m[7].substring(2);
            } else {
                millisecondsStr = "";
            }
            var offset = eval(m[9] + (60*m[10] + parseInt(m[11], 10)));

            var str = sprintf("%s/%s/%s %s:%s:%s", m[3], m[4], m[2], m[5], m[6], seconds);
            // its still wrong, because JS will interpret this time in localtime,
            // AND if you give IE the timezone part of the string, it passes out in its own vomit.
            var t = new Date(str);

            // so we patch it.
            t.setTime(t.getTime() + this.getTimezoneOffsetDelta(offset, t));
            var startTime = t.getTime() / 1000;

            return startTime + millisecondsStr;
        },

        getConfigValue: function(configKey, optionalDefault) {
            if (window.$C && window.$C.hasOwnProperty(configKey)) return window.$C[configKey];
            else {
                if (typeof optionalDefault != 'undefined') { // ensure optionalDefault can be set to 'false'
                    // util.logger will have been swapped out by the Logger when Logger
                    // has already been setup, but still works when its not.

                    //this.logger.debug('getConfigValue - ' + configKey + ' not set, defaulting to ' + optionalDefault);
                    return optionalDefault;
                }

                throw new Error('getConfigValue - ' + configKey + ' not set, no default provided');
            }
        },

        /**
         * Returns a proper path that is relative to the current appserver location.
         * This is critical to ensure that we are proxy compatible. This method
         * takes 1 or more arguments, which will all be stiched together in sequence.
         *
         * Ex: make_url('search/job'); // "/splunk/search/job"
         * Ex: make_url('/search/job'); // "/splunk/search/job"
         * Ex: make_url('/search', '/job'); // "/splunk/search/job"
         * Ex: make_url('/search', '/job', 1234); // "/splunk/search/job/1234"
         *
         * Static paths are augmented with a cache defeater
         *
         * Ex: make_url('/static/js/foo.js'); // "/splunk/static/@12345/js/foo.js"
         * Ex: make_url('/static/js/foo.js'); // "/splunk/static/@12345.1/js/foo.js"
         *
         * @param path {String} The relative path to extend
         *
         * TODO: lots of fancy URL munging
         *
         */
        make_url: function() {
            var output = '', seg, len;
            for (var i=0,l=arguments.length; i<l; i++) {
                seg = arguments[i].toString();
                len = seg.length;
                if (len > 1 && seg.charAt(len-1) == '/') {
                    seg = seg.substring(0, len-1);
                }
                if (seg.charAt(0) != '/') {
                    output += '/' + seg;
                } else {
                    output += seg;
                }
            }

            // augment static dirs with build number
            if (output!='/') {
                var segments = output.split('/');
                var firstseg = segments[1];
                if (firstseg=='static' || firstseg=='modules') {
                    var postfix = output.substring(firstseg.length+2, output.length);
                    output = '/'+firstseg+'/@' + window.$C['BUILD_NUMBER'];
                    if (window.$C['BUILD_PUSH_NUMBER']) output += '.' + window.$C['BUILD_PUSH_NUMBER'];
                    if (segments[2] == 'app')
                        output += ':'+this.getConfigValue('APP_BUILD', 0);
                    output += '/' + postfix;
                }
            }

            var root = Splunk.util.getConfigValue('MRSPARKLE_ROOT_PATH', '/');
            var locale = Splunk.util.getConfigValue('LOCALE', 'en-US');
            if (root == '' || root == '/') {
                return '/' + locale + output;
            } else {
                return root + '/' + locale + output;
            }
        },

        /**
         * Given a path and a dictionary of options, builds a qualified query string.
         *
         * @param uri {String} required; path to endpoint. eg. "search/jobs"
         * @param options {Object} key / value par of query params eg. {'foo': 'bar'}
         */
        make_full_url: function(url, options) {
            url = this.make_url(url);
            if (options) url = url + '?' + this.propToQueryString(options);
            return url;
        },

        /**
         * Redirects user to a new page.
         *
         * @param uri {String} required
         * @param options {Object} containing parameters like:
         *         sid => attaches optional sid in valid format
         *         s => attaches optional saved search name
         *         q => attaches optional search string in valid format
         *
         *         Example:
         *             util.redirect_to('app/core/search', {
         *                 'sid' : 1234,
         *                 'foo' : 'bar'
         *             });
         *
         *             redirects to 'splunk/app/core/search?sid=1234&foo=bar'
         * @param windowObj {Window Object} an optional window object to target the location change
         * @param focus {Boolean} if true, focus is called on windowObj
         */
        redirect_to: function(uri, options, windowObj, focus) {
            uri = this.make_full_url(uri, options);
            if (!windowObj) windowObj = window;
            windowObj.document.location = uri;
            if (focus && windowObj.focus) windowObj.focus();
            return;
        },

        /**
         * Returns the current app name (not label).
         */
        getCurrentApp: function() {
            return $(document.body).attr("s:app") || 'UNKNOWN_APP';
        },

        /**
         * Returns the current view name (not label).
         */
        getCurrentView: function() {
            return $(document.body).attr("s:view") || 'UNKNOWN_VIEW';
        },
        /**
         * Returns the current 'displayView' name if it differs from the view name, else returns the current view name.
         */
        getCurrentDisplayView: function() {
            return $(document.body).attr("s:displayview") || this.getCurrentView();
        },
        getAutoCancelInterval: function() {
            var interval = $(document.body).attr("s:autoCancelInterval");
            if (!interval) {
                this.logger.error("no autoCancelInterval found. Returning 0");
                interval = 0;
            }
            return interval;
        },
        /**
         * Returns the current viewstate ID as requested via the URI parameter
         * 'vs'.  This is embedded in the <body> tag.
         *
         * If no viewstate has been requested, then all parameter writes will
         * go to the default sticky state, keyed by the reserved token '_current'.
         *
         * NOTE: viewstate is also provided to the modules through context resurrection,
         * And that being the case, the value of this is marginal.
         */
        //getCurrentViewState: function() {
        //    return $(document.body).attr("s:viewstateid") || null;
        //},

        /**
         * Returns a dictionary of all the app, view, and saved search config
         * data that is specified in the current view.  Ex:
         * {
         *    'view': {"template": "builder.html", "displayView": "report_builder_display", "refresh": null, "label": "Display Report", "viewstateId": "*:ft10i02z", "onunloadCancelJobs": false, "id": "report_builder_display"},
         *    'app': {"id": "search", "label": "Search"},
         *    'savedSearch': {"search": "johnvey | timechart count", "name": "jvreport3", "vsid": "*:ft10i02z", "qualifiedSearch": "search  johnvey | timechart count"}
         * }
         */
        getCurrentViewConfig: function() {
            return $.extend({}, Splunk.ViewConfig);
        },

        /**
         * Return the path without the localization segment.
         */
        getPath: function(path) {
            if (path === undefined) {
                path = document.location.pathname;
            }
            var locale = this.getConfigValue('LOCALE').toString();

            // if there is no way to figure out the locale, just return pathname
            if (!this.getConfigValue('LOCALE') || path.indexOf(locale) == -1) {
                return path;
            }
            var start = locale.length + path.indexOf(locale);
            return path.slice(start);
        },

        /**
         * Get the cumulative offsetTop for an element.
         *
         * @param {Object} element A DOM element.
         */
        getCumlativeOffsetTop: function(element){
            if(!element) return 0;
            return element.offsetTop + this.getCumlativeOffsetTop(element.offsetParent);
        },

        /**
         * Get the cumulative offsetLeft for an element.
         *
         * @param {Object} element A DOM element.
         */
        getCumlativeOffsetLeft: function(element){
            if(!element) return 0;
            return element.offsetLeft + this.getCumlativeOffsetLeft(element.offsetParent);
        },

        /**
         * Retrieve the amount of content that has been hidden by scrolling down.
         *
         * @type Number
         * @return 0-n value.
         */
        getPageYOffset: function(){
            var pageYOffset = 0;
            if(window.pageYOffset){
                pageYOffset = window.pageYOffset;
            }else if(document.documentElement && document.documentElement.scrollTop){
                pageYOffset = document.documentElement.scrollTop;
            }
            return pageYOffset;
        },

        /**
         * Retrieve the inner dimensions of the window. This does not work in jQuery.
         *
         * @type Object
         * @return An object literal having width and height attributes.
         */
        getWindowDimensions: function(){
            return {
                width:(!isNaN(window.innerWidth))?window.innerWidth:document.documentElement.clientWidth||0,
                height:(!isNaN(window.innerHeight))?window.innerHeight:document.documentElement.clientHeight||0
            };
        },

        /**
         * Retrieve the computed style from a specified element.
         *
         * @param el
         * @param styleProperty
         * @return The computed style value.
         * @type String
         */
        getComputedStyleHelper: function(el, styleProperty){
            if(el.currentStyle){
                return el.currentStyle[styleProperty];
            }else if(window.getComputedStyle){
                var cssProperty = styleProperty.replace(/([A-Z])/g, "-$1").toLowerCase();
                var computedStyle = window.getComputedStyle(el, "");
                return computedStyle.getPropertyValue(cssProperty);
            }else{
                return "";
            }
        },

        /**
         * Retrieve a GET parameter from the window.location. Type casting is not performed.
         * @param {String} p The param value to retrieve.
         * @param {String} s Optional string to search through instead of window.location.search
         * @return {String || null} The string value or null if it does not exist.
         */
        getParameter: function(p, s){
            s = s || window.location.search;
            if(!s){
                return null;
            }
            if(!(s.indexOf(p+'=')+1)){
                return null;
            }
            return s.split(p+'=')[1].split('&')[0];
        },

        /**
         * Take an RGB value and convert to HEX equivalent.
         *
         * @param {String} rgb A RGB value following rgb(XXX, XXX, XXX) convention.
         * @type String
         * @return A HEX equivalent for a given RGB value with a leading '#' character.
         */
        getHEX: function(rgb){
            var parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            var hex = (parts[1]<<16|parts[2]<<8|parts[3]).toString(16);
            return "#"+Array(6-hex.length).concat([hex]).toString().replace(/,/g, 0);
        },

        /**
         * Take an arbitrary RGB or HEX in long or shorthand notation and normalize to standard long HEX form with leading '#' character.
         *
         * @param {String} color A RGB or HEX color value in long or short notation.
         * @type String or null
         * @return A fully qualified 6 character hexadecimal value or with leading '#' character or null if it can't be processed.
         */
        normalizeColor: function(color){
            normalizedColor = null;
            if(color.charAt(0)==="#"){
                if(color.length===4){
                    normalizedColor = color + color.charAt(1) + color.charAt(2) + color.charAt(3);
                }else{
                    normalizedColor = color;
                }
            }else{
                try{
                    normalizedColor = this.getHEX(color);
                }catch(e){}
            }
            return normalizedColor;
        },

        /**
         * innerHTML substitute when it is not fast enough.
         * @param {HTMLObject} target The target DOM element to replace innerHTML content with.
         * @param {String} innerHTML The innerHTML string to add.
         * @return {HTMLObject} The reference to the target DOM element as it may have been cloned and removed.
         */
        turboInnerHTML: function(target, innerHTML) {
            /*@cc_on //innerHTML is faster for IE
                target.innerHTML = innerHTML;
                return target;
            @*/
            var targetClone = target.cloneNode(false);
            targetClone.innerHTML = innerHTML;
            target.parentNode.replaceChild(targetClone, target);
            return targetClone;
        },
        normalizeBoolean: function(test, strictMode) {

            if (typeof(test) == 'string') {
                test = test.toLowerCase();
            }

            switch (test) {
                case true:
                case 1:
                case '1':
                case 'yes':
                case 'on':
                case 'true':
                    return true;

                case false:
                case 0:
                case '0':
                case 'no':
                case 'off':
                case 'false':
                    return false;

                default:
                    if (strictMode) throw TypeError("Unable to cast value into boolean: " + test);
                    return test;
            }
        },
        getCommaFormattedNumber: function(nStr) {
            nStr += '';
            var x = nStr.split('.');
            var x1 = x[0];
            var x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },


        reLTrim: /^[\s\t\r\n]+/,
        reLTrimCommand: /^[\s\t\r\n\|]+/,
        reRNormalize: /[\s\t\r\n]+$/,

        /**
         * Returns a fully qualified search string by prepending the 'search'
         * command of unqualified searches.  This method deems strings as unqualified
         * if it does not start with a | or 'search '
         *
         * @param {boolean} isUserEntered Indicates if 'q' is expected to be unqualified
         */
        addLeadingSearchCommand: function(q, isUserEntered) {
            var workingQ = '' + q;
            workingQ = workingQ.replace(this.reLTrim, '').replace(this.reRNormalize, ' ');
            if (workingQ.substring(0, 1) == '|') {
                return q;
            }

            // this is specific to the case where searchstring = 'search ',
            // which we conservatively assume does not constitute a search command
            if (!isUserEntered
                && (workingQ.substring(0, 7) == 'search ' && workingQ.length > 7))
            {
                return q;
            }
            return 'search ' + workingQ;
        },

        /**
         * Returns an unqualified search string by removing any leading 'search '
         * command.  This method does a simple search at the beginning of the
         * search.
         */
        stripLeadingSearchCommand: function(q) {
            var workingQ = '' + q;
            workingQ = workingQ.replace(this.reLTrimCommand, '');
            if (workingQ.substring(0, 7) == 'search ') {
                return workingQ.substring(7).replace(this.reLTrimCommand, '');
            }
            return q;
        },

        /**
         * Deserializes a string into a field list.
         */
        stringToFieldList: function(strList) {
            if (typeof(strList) != 'string' || !strList) return [];
            var items = [];
            var field_name_buffer = [];
            var inquote = false;
            var str = $.trim(strList);
            for (var i=0,j=str.length; i<j; i++) {
                if (str.charAt(i) == '\\') {
                    var nextidx = i+1;
                    if (j > nextidx && (str.charAt(nextidx) == '\\' || str.charAt(nextidx) == '"')) {
                        field_name_buffer.push(str.charAt(nextidx));
                        i++;
                        continue;
                    } else {
                        field_name_buffer.push(str.charAt(i));
                        continue;
                    }
                }

                if (str.charAt(i) == '"') {
                    if (!inquote) {
                        inquote = true;
                        continue;
                    } else {
                        inquote = false;
                        items.push(field_name_buffer.join(''));
                        field_name_buffer = [];
                        continue;
                    }
                }

                if ((str.charAt(i) == ' ' || str.charAt(i) == ',') && !inquote) {
                    if (field_name_buffer.length > 0) {
                        items.push(field_name_buffer.join(''));
                    }
                    field_name_buffer = [];
                    continue;
                }
                field_name_buffer.push(str.charAt(i));
            }
            if (field_name_buffer.length > 0) items.push(field_name_buffer.join(''));
            return items;
        },


        /**
         * Serializes a field list array into a string.
         */
        _sflQuotable: /([\\",\s])/,
        _sflEscapable: /([\\"])/g,
        fieldListToString: function(fieldArray) {
            if (!fieldArray) return '';
            var output = [];
            for (var i=0,L=fieldArray.length; i<L; i++) {
                var v = $.trim(fieldArray[i]);
                if (v != '') {
                    // Escape any char with the backslash.
                    if (v.search(this._sflEscapable) > -1) {
                        v = v.replace(this._sflEscapable, "\\$1");
                    }

                    // Quote the entire string if a backslash, comma, space
                    // or double quote is present.
                    if (v.search(this._sflQuotable) > -1) {
                        v = ['"', v, '"'].join('');
                    }

                    output.push(v);
                }
            }
            return output.join(',');
        },
        searchEscape: function(str) {
        if (!str.match(/[\s\,=|\[\]\"]/))
            return str;

        return '"' + str.replace(/(\"|\\)/g, "\\$1") + '"';
        },

        /**
         * Compare the likeness of two objects. Please use with discretion.
         */
        objectSimilarity: function(obj1, obj2){
                if(obj1 instanceof Array && obj2 instanceof Array){
                        if(obj1.length!==obj2.length){
                           return false;
                        }else{
                            for(var i=0; i<obj1.length; i++){
                                if(!this.objectSimilarity(obj1[i], obj2[i])){
                                    return false;
                                }
                            }
                        }
                }else if(obj1 instanceof Object && obj2 instanceof Object){
                    if(obj1!=obj2){
                        for(var j in obj2){
                            if(!obj1.hasOwnProperty(j)){
                                return false;
                            }
                        }
                        for(var k in obj1){
                            if(obj1.hasOwnProperty(k)){
                                if(obj2.hasOwnProperty(k)){
                                    if(!this.objectSimilarity(obj1[k], obj2[k])){
                                        return false;
                                    }
                                }else{
                                    return false;
                                }
                            }
                        }
                    }
                }else if(typeof(obj1)==="function" && typeof(obj2)==="function"){
                    if(obj1.toString()!==obj2.toString()){
                        return false;
                    }
                }else if(obj1!==obj2){
                    return false;
                }
                return true;
        },
        /**
         * Stop watch class.
         */
        StopWatch: function(){
            var self = this,
                startTime = null,
                stopTime = null,
                times = [];
            var isSet = function(prop){
                return (prop==null)?false:true;
            };
            var isStarted = function(){
                return isSet(startTime);
            };
            var isStopped = function(){
                return isSet(stopTime);
            };
            var softReset = function(){
                startTime = null;
                stopTime = null;
            };
            self.start = function(){
                if(isStarted()){
                   throw new Error("cannot call start, start already invoked.");
                }
                startTime = new Date();
            };
            self.stop = function(){
               if(!isStarted()){
                   throw new Error("cannot call stop, start not invoked.");
               }
               if(isStopped()){
                   throw new Error("cannot call stop, stop already invoked.");
               }
               stopTime = new Date();
               time = stopTime - startTime;
               times.push(time);
            };
            self.pause = function(){
                if(!isStarted()){
                   throw new Error("cannot call pause, start not invoked.");
                }
                if(isStopped()){
                   throw new Error("cannot call pause, stop already invoked.");
                }
                self.stop();
                softReset();
            };
            self.reset = function(){
                softReset();
                times = [];
            };
            self.time = function(){
                var total = 0;
                for(i=0; i<times.length; i++){
                    total += times[i];
                }
                if(isStarted() && !isStopped()){
                    total += (new Date() - startTime);
                }
                return total/1000;
            };
        },

        isInt: function(num) {
            return num!=='' && !isNaN(parseInt(num, 10)) && parseInt(num, 10)==(num/1);
        },

        /**
         * Returns a string trimmed to maxLength by removing characters from the
         * middle of the string and replacing with ellipses.
         *
         * Ex: Splunk.util.smartTrim('1234567890', 5) ==> '12...890'
         *
         */
        smartTrim: function(string, maxLength) {
            if (!string) return string;
            if (maxLength < 1) return string;
            if (string.length <= maxLength) return string;
            if (maxLength == 1) return string.substring(0,1) + '...';

            var midpoint = Math.ceil(string.length / 2);
            var toremove = string.length - maxLength;
            var lstrip = Math.ceil(toremove/2);
            var rstrip = toremove - lstrip;
            return string.substring(0, midpoint-lstrip) + '...' + string.substring(midpoint+rstrip);
        },
        _tokenDiscoverer : /\$([^$]+)\$/g,

        /**
         * Finds all instances of any string looking like "$foo$" anywhere in the given object literal.
         * returns an array of all the distinct values it found, eg 'foo'.
         * if a single string value in the struct has two, like "$foo$ $bar$", duplicates are removed.
         * This will also discover any number of "$foo$" substrings that are found within the
         * keys of object literals, not just the values.
         */
        discoverReplacementTokens: function(fragment) {
            var keys = [];
            var tokenDiscoverer = Splunk.util._tokenDiscoverer;
            var keysToAdd;

            if (typeof fragment == 'string') {
                if (fragment.match(tokenDiscoverer)) {
                    keysToAdd = fragment.match(tokenDiscoverer);
                    // TODO - im sure there's a way to write the re so that it doesnt include the '$' chars but im moving on.
                    for (var i=0; i<keysToAdd.length; i++ ) {
                        keysToAdd[i] = keysToAdd[i].substring(1, keysToAdd[i].length-1);
                    }
                    return keysToAdd;
                }
                return [];
            }
            else if (typeof fragment == "function") {
                return [];
            }

            // then fragment is not a string.
            for (var key in fragment) {
                keysToAdd = [];
                keysToAdd = Splunk.util.discoverReplacementTokens(fragment[key]);

                // up until now we've only looked at values. We have to also discover keys in the key itself..
                var matchesInTheKeyItself = key.match(tokenDiscoverer) || [];
                for (var j=0; j<matchesInTheKeyItself.length; j++) {
                    // TODO - im sure there's a way to write the re so that it doesnt include the '$' chars but im moving on.
                    keysToAdd.push(matchesInTheKeyItself[j].substring(1, matchesInTheKeyItself[j].length-1));
                }
                // check against duplicates.
                for (var k=0; k<keysToAdd.length; k++) {
                    if (keys.indexOf(keysToAdd[k]) ==-1) {
                        keys.push(keysToAdd[k]);
                    }
                }
            }
            return keys;
        },

        /**
         * walked through the entirety of fragment to all levels of nesting
         *  and will replace all matches of the given single regex with the given
         *  single value.
         *  replacement will occur in both keys and values.
         */
        replaceTokens: function(fragment, reg, value) {
            if (typeof fragment == 'string') {
                if (fragment.match(reg)) {
                    fragment = fragment.replace(reg, value);
                }
                return fragment;
            }
            else if (typeof fragment == "function") {
                return fragment;
            }
            // watch out for infinite loops.  We make all changes to the array after iteration.

            var keysToRename = {};
            for (var key in fragment) {
                // recurse
                if (typeof fragment[key] == 'object') {
                    Splunk.util.replaceTokens(fragment[key], reg, value);
                }
                // we have hit a string value.
                else if (typeof fragment[key] == 'string' && fragment[key].match(reg)) {
                    fragment[key] = fragment[key].replace(reg, value);
                }
                // now that the value is changed we check the key itself
                if (key.match(reg)) {
                    // mark this to be changed after we're out of the iterator
                    keysToRename[key] = key.replace(reg, value);
                }
            }
            for (oldKey in keysToRename) {
                var newKey = keysToRename[oldKey];
                fragment[newKey] = fragment[oldKey];
                delete(fragment[oldKey]);
            }
            return fragment;
        },


        getServerTimezoneOffset: function() {
            return Splunk.util.getConfigValue('SERVER_TIMEZONE_OFFSET');
        },

        // constants used by Modules as well as ModuleLoader, to denote runtime states
        // WAITING_FOR_INITIALIZATION and WAITING_FOR_HIERARCHY mean that the Modules
        // are still being loaded by ModuleLoader.
        // the remaining two states are relevant BOTH during page load, and in general
        // at runtime thereafter.
        // whether or not the page is still loading is an orthogonal piece of information,
        // and modules can check it on demand by calling Module.isPageLoadComplete().
        moduleLoadStates: {
            WAITING_FOR_INITIALIZATION   : 1,  // waiting for INITIALIZATION
            WAITING_FOR_HIERARCHY   : 2,  // waiting for HIERARCHY
            WAITING_FOR_CONTEXT: 6,
            HAS_CONTEXT         : 7
        },

        /**
         * Returns a wait time (sec) based on the current time elapsed, as mapped
         * onto a cubic easing function.
         *
         * elapsed_time: number of seconds that have elapsed since the first
         *     call to getRetryInterval()
         *
         * min_interval: minimum return value of this method; also the interval
         *     returned when elapsed_time = 0
         *
         * max_interval: maximum return value of this method; also the interval
         *     returned when elapsed_time >= clamp_time
         *
         * clamp_time: total duration over which to calculate a wait time; while
         *     elapsed_time < clamp_time, the return value will be less than
         *     max_interval; when elapsed_time >= clamp_time, the return value will
         *     always be max_interval
         *
         */
        getRetryInterval: function(elapsed_time, min_interval, max_interval, clamp_time) {
            if (elapsed_time >= clamp_time) return parseFloat(max_interval);
            return Math.min(max_interval * Math.pow(elapsed_time/parseFloat(clamp_time), 3) + min_interval, max_interval);
        },


        /**
         * Returns a string with HTML entities escaped.
         * NOTE: IE will not interpret ""&apos;", opting to just render it encoded
         *      we use the alternate decimal version instead
         *
         */
        escapeHtml: function(input) {
            return (""+input).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        /**
         * Returns a string with backslashes escaped
         */
        escapeBackslash: function(input) {
            return (""+input).replace(/\\/g, '\\\\');
        },

        /**
         * From http://blog.stevenlevithan.com/archives/faster-trim-javascript
         * profiler shows this is much faster than the previous implementation in both IE and Firefox.
         *
         * @param {String} str The string to trim.
         * @param {String} (Optional) delim The characters to remove from the start/end of the string.
         *
         * @type String
         * @return A trimmed string.
         */
        trim: function(str, delim) {
            if (delim) return str.replace(new RegExp("^[\\s" + delim + "]+"),'').replace(new RegExp("[\\s" + delim + "]+$"), '');
            else return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },

        focusFirstField: function(popup){ //this puts the focus on the first form element whether an input or select dropdown
            var firstInput = $(":input:visible:enabled:first",popup),
            firstSelect = $("select:visible:enabled:first",popup),
            firstInputOffset = (firstInput.length) ? firstInput.offset().top : false,
            firstSelectOffset = (firstSelect.length) ? firstSelect.offset().top : false,
            firstElem = firstInput;

            if(firstInputOffset && firstSelectOffset){
                if(firstSelectOffset < firstInputOffset){
                    firstElem = firstSelect;
                }
            }
            firstElem.focus();
        }

    };

    /**
     * ----------------------
     * Black magic for Prototype's bind() method which we're still using.
     *
     */
    var $A = function(iterable) {
      if (!iterable) return [];
      if (iterable.toArray) {
        return iterable.toArray();
      } else {
        var results = [];
        for (var i = 0, length = iterable.length; i < length; i++)
          results.push(iterable[i]);
        return results;
      }
    };

    Function.prototype.bind = function() {
      var __method = this, args = $A(arguments), object = args.shift();
      return function() {
        return __method.apply(object, args.concat($A(arguments)));
      };
    };
    /**
     * ----------------------
     * Prototype augmentation.
     * TODO - find another way.
     *
     */

    if (!String.prototype.repeat) {
        String.prototype.repeat = function(count) {
            return new Array(count+1).join(this);
        };
    }

    if (!String.prototype.reverse) {
        String.prototype.reverse = function() {
            return this.split('').reverse().join('');
        };
    }

    if (!String.prototype.rsplit) {
        String.prototype.rsplit = function(sep, limit) {
            var sp = this.split(sep);
            if (limit && sp.length > limit) {
                var r = [];
                for(var i=0; i<limit; i++)
                    r[i] = sp[sp.length-limit+i];
                return r;
            }
            return sp;
        };
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(search, fromIndex) {
            if (!fromIndex) fromIndex = 0;
            for(var i=0; i<this.length; i++) {
                if (this[i] === search)
                    return i;
            }
            return -1;
        };
    }

    if (!Array.prototype.extend) {
        Array.prototype.extend = function(arr) {
            for(var i=0; i<arr.length; i++)
                this.push(arr[i]);
        };
    }

    /**
    * sprintf routine borrowed from http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_sprintf/
    * Licensed under GPL and MIT licenses
    *
    * Modified by Gareth to add support for Python style argument specifiers:
    * sprintf("Hi %(name)s, welcome to %(application)s", { name: 'Gareth', app: 'Splunk })
    * Objects holding named arguments can also implement a python style __getitem__ method to return dynamic values
    */
    exports.sprintf = sprintf;
    function sprintf( ) {
        // Return a formatted string
        //
        // +    discuss at: http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_sprintf/
        // +       version: 810.1015
        // +   original by: Ash Searle (http://hexmen.com/blog/)
        // + namespaced by: Michael White (http://getsprink.com)
        // +    tweaked by: Jack
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // *     example 1: sprintf("%01.2f", 123.1);
        // *     returns 1: 123.10

        var regex = /%%|%(\d+\$)?(\([^)]+\))?([-+#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegEG])/g;
        var a = arguments;
        var i = 0;
        var format = a[i];
        i++;

        // pad()
        var pad = function(str, len, chr, leftJustify) {
            var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str;
        };

        // justify()
        var justify = function(value, prefix, leftJustify, minWidth, zeroPad) {
            var diff = minWidth - value.length;
            if (diff > 0) {
                if (leftJustify || !zeroPad) {
                    value = pad(value, minWidth, ' ', leftJustify);
                } else {
                    value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
                }
            }
            return value;
        };

        // formatBaseX()
        var formatBaseX = function(value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
            // Note: casts negative numbers to positive ones
            var number = value >>> 0;
            prefix = prefix && number && {'2': '0b', '8': '0', '16': '0x'}[base] || '';
            value = prefix + pad(number.toString(base), precision || 0, '0', false);
            return justify(value, prefix, leftJustify, minWidth, zeroPad);
        };

        // formatString()
        var formatString = function(value, leftJustify, minWidth, precision, zeroPad) {
            if (precision != null) {
                value = value.slice(0, precision);
            }
            return justify(value, '', leftJustify, minWidth, zeroPad);
        };

        // finalFormat()
        var doFormat = function(substring, valueIndex, valueName, flags, minWidth, _, precision, type) {
            if (substring == '%%') return '%';

            // parse flags
            var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false;
            var flagsl = flags.length;
            for (var j = 0; flags && j < flagsl; j++) switch (flags.charAt(j)) {
                case ' ': positivePrefix = ' '; break;
                case '+': positivePrefix = '+'; break;
                case '-': leftJustify = true; break;
                case '0': zeroPad = true; break;
                case '#': prefixBaseX = true; break;
                default: break;
            }

            // parameters may be null, undefined, empty-string or real valued
            // we want to ignore null, undefined and empty-string values
            if (!minWidth) {
                minWidth = 0;
            } else if (minWidth == '*') {
                minWidth = +a[i];
                i++;
            } else if (minWidth.charAt(0) == '*') {
                minWidth = +a[minWidth.slice(1, -1)];
            } else {
                minWidth = +minWidth;
            }

            // Note: undocumented perl feature:
            if (minWidth < 0) {
                minWidth = -minWidth;
                leftJustify = true;
            }

            if (!isFinite(minWidth)) {
                throw new Error('sprintf: (minimum-)width must be finite');
            }

            if (!precision) {
                precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void(0);
            } else if (precision == '*') {
                precision = +a[i];
                i++;
            } else if (precision.charAt(0) == '*') {
                precision = +a[precision.slice(1, -1)];
            } else {
                precision = +precision;
            }

            // grab value using valueIndex if required?
            var value;
            if (valueName) {
                valueName = valueName.substr(1, valueName.length-2);
                value = a[1].__getitem__ ? a[1].__getitem__(valueName) : a[1][valueName];
            } else {
                if (valueIndex){
                    value = a[valueIndex.slice(0, -1)];
                }
                else
                {
                    value = a[i];
                    i++;
                }
            }

            var number;
            var prefix;
            switch (type) {
                case 's': return formatString(String(value), leftJustify, minWidth, precision, zeroPad);
                case 'c': return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
                case 'b': return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'o': return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'x': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'X': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
                case 'u': return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'i':
                case 'd': {
                            number = parseInt(+value, 10);
                            prefix = number < 0 ? '-' : positivePrefix;
                            value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                            return justify(value, prefix, leftJustify, minWidth, zeroPad);
                        }
                case 'e':
                case 'E':
                case 'f':
                case 'F':
                case 'g':
                case 'G':
                            {
                            number = +value;
                            prefix = number < 0 ? '-' : positivePrefix;
                            var method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                            var textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                            value = prefix + Math.abs(number)[method](precision);
                            return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
                        }
                default: return substring;
            }
        };

        return format.replace(regex, doFormat);
    }// }}}
})();
});

require.define("/ui/charting/i18n_locale.js", function (require, module, exports, __dirname, __filename) {

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
    exports._i18n_locale = {"date_formats":{"medium":{"pattern":"MMM d, yyyy","format":"%(MMM)s %(d)s, %(yyyy)s"},"full":{"pattern":"EEEE, MMMM d, yyyy","format":"%(EEEE)s, %(MMMM)s %(d)s, %(yyyy)s"},"long":{"pattern":"MMMM d, yyyy","format":"%(MMMM)s %(d)s, %(yyyy)s"},"short":{"pattern":"M/d/yy","format":"%(M)s/%(d)s/%(yy)s"}},"scientific_format":"#E0","exp_symbol":"E","eras":{"wide":{"0":"Before Christ","1":"Anno Domini"},"abbreviated":{"0":"BC","1":"AD"},"narrow":{"0":"B","1":"A"}},"decimal_symbol":".","months":{"stand-alone":{"wide":{"1":"January","2":"February","3":"March","4":"April","5":"May","6":"June","7":"July","8":"August","9":"September","10":"October","11":"November","12":"December"},"abbreviated":{"1":"January","2":"February","3":"March","4":"April","5":"May","6":"June","7":"July","8":"August","9":"September","10":"October","11":"November","12":"December"},"narrow":{"1":"J","2":"F","3":"M","4":"A","5":"M","6":"J","7":"J","8":"A","9":"S","10":"O","11":"N","12":"D"}},"format":{"wide":{"1":"January","2":"February","3":"March","4":"April","5":"May","6":"June","7":"July","8":"August","9":"September","10":"October","11":"November","12":"December"},"abbreviated":{"1":"Jan","2":"Feb","3":"Mar","4":"Apr","5":"May","6":"Jun","7":"Jul","8":"Aug","9":"Sep","10":"Oct","11":"Nov","12":"Dec"},"narrow":{"1":"J","2":"F","3":"M","4":"A","5":"M","6":"J","7":"J","8":"A","9":"S","10":"O","11":"N","12":"D"}}},"group_symbol":",","days":{"stand-alone":{"wide":{"0":"Monday","1":"Tuesday","2":"Wednesday","3":"Thursday","4":"Friday","5":"Saturday","6":"Sunday"},"abbreviated":{"0":"Monday","1":"Tuesday","2":"Wednesday","3":"Thursday","4":"Friday","5":"Saturday","6":"Sunday"},"narrow":{"0":"M","1":"T","2":"W","3":"T","4":"F","5":"S","6":"S"}},"format":{"wide":{"0":"Monday","1":"Tuesday","2":"Wednesday","3":"Thursday","4":"Friday","5":"Saturday","6":"Sunday"},"abbreviated":{"0":"Mon","1":"Tue","2":"Wed","3":"Thu","4":"Fri","5":"Sat","6":"Sun"},"narrow":{"0":"M","1":"T","2":"W","3":"T","4":"F","5":"S","6":"S"}}},"datetime_formats":{"null":"{1} {0}"},"percent_format":"#,##0%","min_week_days":1,"first_week_day":6,"periods":{"am":"AM","pm":"PM"},"minus_sign":"-","time_formats":{"medium":{"pattern":"h:mm:ss a","format":"%(h)s:%(mm)s:%(ss)s %(a)s"},"full":{"pattern":"h:mm:ss a v","format":"%(h)s:%(mm)s:%(ss)s %(a)s %(v)s"},"long":{"pattern":"h:mm:ss a z","format":"%(h)s:%(mm)s:%(ss)s %(a)s %(z)s"},"short":{"pattern":"h:mm a","format":"%(h)s:%(mm)s %(a)s"}},"quarters":{"stand-alone":{"wide":{"1":"1st quarter","2":"2nd quarter","3":"3rd quarter","4":"4th quarter"},"abbreviated":{"1":"1st quarter","2":"2nd quarter","3":"3rd quarter","4":"4th quarter"},"narrow":{"1":"1","2":"2","3":"3","4":"4"}},"format":{"wide":{"1":"1st quarter","2":"2nd quarter","3":"3rd quarter","4":"4th quarter"},"abbreviated":{"1":"Q1","2":"Q2","3":"Q3","4":"Q4"},"narrow":{"1":"1","2":"2","3":"3","4":"4"}}},"plus_sign":"+","number_format":"#,##0.###","locale_name":"en_US"};
})();
});

require.define("/ui/charting/highcharts.js", function (require, module, exports, __dirname, __filename) {
// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS

/**
 * @license Highcharts JS v2.1.7 (2011-10-19)
 *
 * (c) 2009-2011 Torstein Hønsi
 *
 * License: www.highcharts.com/license
 */

// JSLint options:
/*global document, window, navigator, setInterval, clearInterval, clearTimeout, setTimeout, location, jQuery, $ */

(function () {
// encapsulated variables
var doc = document,
	win = window,
	math = Math,
	mathRound = math.round,
	mathFloor = math.floor,
	mathCeil = math.ceil,
	mathMax = math.max,
	mathMin = math.min,
	mathAbs = math.abs,
	mathCos = math.cos,
	mathSin = math.sin,
	mathPI = math.PI,
	deg2rad = mathPI * 2 / 360,


	// some variables
	userAgent = navigator.userAgent,
	isIE = /msie/i.test(userAgent) && !win.opera,
	docMode8 = doc.documentMode === 8,
	isWebKit = /AppleWebKit/.test(userAgent),
	isFirefox = /Firefox/.test(userAgent),
	SVG_NS = 'http://www.w3.org/2000/svg',
	hasSVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, 'svg').createSVGRect,
	hasRtlBug = isFirefox && parseInt(userAgent.split('Firefox/')[1], 10) < 4, // issue #38
	Renderer,
	hasTouch = doc.documentElement.ontouchstart !== undefined,
	symbolSizes = {},
	idCounter = 0,
	timeFactor = 1, // 1 = JavaScript time, 1000 = Unix time
	garbageBin,
	defaultOptions,
	dateFormat, // function
	globalAnimation,
	pathAnim,


	// some constants for frequently used strings
	UNDEFINED,
	DIV = 'div',
	ABSOLUTE = 'absolute',
	RELATIVE = 'relative',
	HIDDEN = 'hidden',
	PREFIX = 'highcharts-',
	VISIBLE = 'visible',
	PX = 'px',
	NONE = 'none',
	M = 'M',
	L = 'L',
	/*
	 * Empirical lowest possible opacities for TRACKER_FILL
	 * IE6: 0.002
	 * IE7: 0.002
	 * IE8: 0.002
	 * IE9: 0.00000000001 (unlimited)
	 * FF: 0.00000000001 (unlimited)
	 * Chrome: 0.000001
	 * Safari: 0.000001
	 * Opera: 0.00000000001 (unlimited)
	 */
	TRACKER_FILL = 'rgba(192,192,192,' + (hasSVG ? 0.000001 : 0.002) + ')', // invisible but clickable
	NORMAL_STATE = '',
	HOVER_STATE = 'hover',
	SELECT_STATE = 'select',

	// time methods, changed based on whether or not UTC is used
	makeTime,
	getMinutes,
	getHours,
	getDay,
	getDate,
	getMonth,
	getFullYear,
	setMinutes,
	setHours,
	setDate,
	setMonth,
	setFullYear,

	// check for a custom HighchartsAdapter defined prior to this file
	globalAdapter = win.HighchartsAdapter,
	adapter = globalAdapter || {},

	// Utility functions. If the HighchartsAdapter is not defined, adapter is an empty object
	// and all the utility functions will be null. In that case they are populated by the
	// default adapters below.
	each = adapter.each,
	grep = adapter.grep,
	map = adapter.map,
	merge = adapter.merge,
	addEvent = adapter.addEvent,
	removeEvent = adapter.removeEvent,
	fireEvent = adapter.fireEvent,
	animate = adapter.animate,
	stop = adapter.stop,

	// lookup over the types and the associated classes
	seriesTypes = {};

/**
 * Extend an object with the members of another
 * @param {Object} a The object to be extended
 * @param {Object} b The object to add to the first one
 */
function extend(a, b) {
	var n;
	if (!a) {
		a = {};
	}
	for (n in b) {
		a[n] = b[n];
	}
	return a;
}

/**
 * Shortcut for parseInt
 * @param {Object} s
 */
function pInt(s, mag) {
	return parseInt(s, mag || 10);
}

/**
 * Check for string
 * @param {Object} s
 */
function isString(s) {
	return typeof s === 'string';
}

/**
 * Check for object
 * @param {Object} obj
 */
function isObject(obj) {
	return typeof obj === 'object';
}

/**
 * Check for array
 * @param {Object} obj
 */
function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

/**
 * Check for number
 * @param {Object} n
 */
function isNumber(n) {
	return typeof n === 'number';
}

function log2lin(num) {
	return math.log(num) / math.LN10;
}
function lin2log(num) {
	return math.pow(10, num);
}

/**
 * Remove last occurence of an item from an array
 * @param {Array} arr
 * @param {Mixed} item
 */
function erase(arr, item) {
	var i = arr.length;
	while (i--) {
		if (arr[i] === item) {
			arr.splice(i, 1);
			break;
		}
	}
	//return arr;
}

/**
 * Returns true if the object is not null or undefined. Like MooTools' $.defined.
 * @param {Object} obj
 */
function defined(obj) {
	return obj !== UNDEFINED && obj !== null;
}

/**
 * Set or get an attribute or an object of attributes. Can't use jQuery attr because
 * it attempts to set expando properties on the SVG element, which is not allowed.
 *
 * @param {Object} elem The DOM element to receive the attribute(s)
 * @param {String|Object} prop The property or an abject of key-value pairs
 * @param {String} value The value if a single property is set
 */
function attr(elem, prop, value) {
	var key,
		setAttribute = 'setAttribute',
		ret;

	// if the prop is a string
	if (isString(prop)) {
		// set the value
		if (defined(value)) {

			elem[setAttribute](prop, value);

		// get the value
		} else if (elem && elem.getAttribute) { // elem not defined when printing pie demo...
			ret = elem.getAttribute(prop);
		}

	// else if prop is defined, it is a hash of key/value pairs
	} else if (defined(prop) && isObject(prop)) {
		for (key in prop) {
			elem[setAttribute](key, prop[key]);
		}
	}
	return ret;
}
/**
 * Check if an element is an array, and if not, make it into an array. Like
 * MooTools' $.splat.
 */
function splat(obj) {
	return isArray(obj) ? obj : [obj];
}


/**
 * Return the first value that is defined. Like MooTools' $.pick.
 */
function pick() {
	var args = arguments,
		i,
		arg,
		length = args.length;
	for (i = 0; i < length; i++) {
		arg = args[i];
		if (typeof arg !== 'undefined' && arg !== null) {
			return arg;
		}
	}
}

/**
 * Set CSS on a given element
 * @param {Object} el
 * @param {Object} styles Style object with camel case property names
 */
function css(el, styles) {
	if (isIE) {
		if (styles && styles.opacity !== UNDEFINED) {
			styles.filter = 'alpha(opacity=' + (styles.opacity * 100) + ')';
		}
	}
	extend(el.style, styles);
}

/**
 * Utility function to create element with attributes and styles
 * @param {Object} tag
 * @param {Object} attribs
 * @param {Object} styles
 * @param {Object} parent
 * @param {Object} nopad
 */
function createElement(tag, attribs, styles, parent, nopad) {
	var el = doc.createElement(tag);
	if (attribs) {
		extend(el, attribs);
	}
	if (nopad) {
		css(el, {padding: 0, border: NONE, margin: 0});
	}
	if (styles) {
		css(el, styles);
	}
	if (parent) {
		parent.appendChild(el);
	}
	return el;
}

/**
 * Extend a prototyped class by new members
 * @param {Object} parent
 * @param {Object} members
 */
function extendClass(parent, members) {
	var object = function () {};
	object.prototype = new parent();
	extend(object.prototype, members);
	return object;
}

/**
 * Format a number and return a string based on input settings
 * @param {Number} number The input number to format
 * @param {Number} decimals The amount of decimals
 * @param {String} decPoint The decimal point, defaults to the one given in the lang options
 * @param {String} thousandsSep The thousands separator, defaults to the one given in the lang options
 */
function numberFormat(number, decimals, decPoint, thousandsSep) {
	var lang = defaultOptions.lang,
		// http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_number_format/
		n = number,
		c = isNaN(decimals = mathAbs(decimals)) ? 2 : decimals,
		d = decPoint === undefined ? lang.decimalPoint : decPoint,
		t = thousandsSep === undefined ? lang.thousandsSep : thousandsSep,
		s = n < 0 ? "-" : "",
		i = String(pInt(n = mathAbs(+n || 0).toFixed(c))),
		j = i.length > 3 ? i.length % 3 : 0;

	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
		(c ? d + mathAbs(n - i).toFixed(c).slice(2) : "");
}

/**
 * Based on http://www.php.net/manual/en/function.strftime.php
 * @param {String} format
 * @param {Number} timestamp
 * @param {Boolean} capitalize
 */
dateFormat = function (format, timestamp, capitalize) {
	function pad(number) {
		return number.toString().replace(/^([0-9])$/, '0$1');
	}

	if (!defined(timestamp) || isNaN(timestamp)) {
		return 'Invalid date';
	}
	format = pick(format, '%Y-%m-%d %H:%M:%S');

	var date = new Date(timestamp * timeFactor),
		key, // used in for constuct below
		// get the basic time values
		hours = date[getHours](),
		day = date[getDay](),
		dayOfMonth = date[getDate](),
		month = date[getMonth](),
		fullYear = date[getFullYear](),
		lang = defaultOptions.lang,
		langWeekdays = lang.weekdays,
		/* // uncomment this and the 'W' format key below to enable week numbers
		weekNumber = function() {
			var clone = new Date(date.valueOf()),
				day = clone[getDay]() == 0 ? 7 : clone[getDay](),
				dayNumber;
			clone.setDate(clone[getDate]() + 4 - day);
			dayNumber = mathFloor((clone.getTime() - new Date(clone[getFullYear](), 0, 1, -6)) / 86400000);
			return 1 + mathFloor(dayNumber / 7);
		},
		*/

		// list all format keys
		replacements = {

			// Day
			'a': langWeekdays[day].substr(0, 3), // Short weekday, like 'Mon'
			'A': langWeekdays[day], // Long weekday, like 'Monday'
			'd': pad(dayOfMonth), // Two digit day of the month, 01 to 31
			'e': dayOfMonth, // Day of the month, 1 through 31

			// Week (none implemented)
			//'W': weekNumber(),

			// Month
			'b': lang.shortMonths[month], // Short month, like 'Jan'
			'B': lang.months[month], // Long month, like 'January'
			'm': pad(month + 1), // Two digit month number, 01 through 12

			// Year
			'y': fullYear.toString().substr(2, 2), // Two digits year, like 09 for 2009
			'Y': fullYear, // Four digits year, like 2009

			// Time
			'H': pad(hours), // Two digits hours in 24h format, 00 through 23
			'I': pad((hours % 12) || 12), // Two digits hours in 12h format, 00 through 11
			'l': (hours % 12) || 12, // Hours in 12h format, 1 through 12
			'M': pad(date[getMinutes]()), // Two digits minutes, 00 through 59
			'p': hours < 12 ? 'AM' : 'PM', // Upper case AM or PM
			'P': hours < 12 ? 'am' : 'pm', // Lower case AM or PM
			'S': pad(date.getSeconds()) // Two digits seconds, 00 through  59

		};


	// do the replaces
	for (key in replacements) {
		format = format.replace('%' + key, replacements[key]);
	}

	// Optionally capitalize the string and return
	return capitalize ? format.substr(0, 1).toUpperCase() + format.substr(1) : format;
};

/**
 * Loop up the node tree and add offsetWidth and offsetHeight to get the
 * total page offset for a given element. Used by Opera and iOS on hover and
 * all browsers on point click.
 *
 * @param {Object} el
 *
 */
function getPosition(el) {
	var p = { left: el.offsetLeft, top: el.offsetTop };
	el = el.offsetParent;
	while (el) {
		p.left += el.offsetLeft;
		p.top += el.offsetTop;
		if (el !== doc.body && el !== doc.documentElement) {
			p.left -= el.scrollLeft;
			p.top -= el.scrollTop;
		}
		el = el.offsetParent;
	}
	return p;
}

/**
 * Helper class that contains variuos counters that are local to the chart.
 */
function ChartCounters() {
	this.color = 0;
	this.symbol = 0;
}

ChartCounters.prototype = {
	/**
	 * Wraps the color counter if it reaches the specified length.
	 */
	wrapColor: function (length) {
		if (this.color >= length) {
			this.color = 0;
		}
	},

	/**
	 * Wraps the symbol counter if it reaches the specified length.
	 */
	wrapSymbol: function (length) {
		if (this.symbol >= length) {
			this.symbol = 0;
		}
	}
};

/**
 * Utility method extracted from Tooltip code that places a tooltip in a chart without spilling over
 * and not covering the point it self.
 */
function placeBox(boxWidth, boxHeight, outerLeft, outerTop, outerWidth, outerHeight, point) {
	// keep the box within the chart area
	var pointX = point.x,
		pointY = point.y,
		x = pointX - boxWidth + outerLeft - 25,
		y = pointY - boxHeight + outerTop + 10,
		alignedRight;

	// it is too far to the left, adjust it
	if (x < 7) {
		x = outerLeft + pointX + 15;
	}

	// Test to see if the tooltip is to far to the right,
	// if it is, move it back to be inside and then up to not cover the point.
	if ((x + boxWidth) > (outerLeft + outerWidth)) {
	    
	    // PATCH by Simon Fishel
	    //
	    // if the tooltip is too wide for the plot area, clip it left not right
	    //
	    // - x -= (x + boxWidth) - (outerLeft + outerWidth);
	    // + if(boxWidth > outerWidth) {
        // +     x = 7;
        // + }
	    // + else {
        // +     x -= (x + boxWidth) - (outerLeft + outerWidth);
        // + }
	    
	    if(boxWidth > outerWidth) {
	        x = 7;
	    }
	    else {
	        x -= (x + boxWidth) - (outerLeft + outerWidth);
	    }
		y -= boxHeight;
		alignedRight = true;
	}

	if (y < 5) {
		y = 5; // above

		// If the tooltip is still covering the point, move it below instead
		if (alignedRight && pointY >= y && pointY <= (y + boxHeight)) {
			y = pointY + boxHeight - 5; // below
		}
	} else if (y + boxHeight > outerTop + outerHeight) {
		y = outerTop + outerHeight - boxHeight - 5; // below
	}

	return {x: x, y: y};
}

/**
 * Utility method that sorts an object array and keeping the order of equal items.
 * ECMA script standard does not specify the behaviour when items are equal.
 */
function stableSort(arr, sortFunction) {
	var length = arr.length,
		i;

	// Add index to each item
	for (i = 0; i < length; i++) {
		arr[i].ss_i = i; // stable sort index
	}

	arr.sort(function (a, b) {
		var sortValue = sortFunction(a, b);
		return sortValue === 0 ? a.ss_i - b.ss_i : sortValue;
	});

	// Remove index from items
	for (i = 0; i < length; i++) {
		delete arr[i].ss_i; // stable sort index
	}
}

/**
 * Utility method that destroys any SVGElement or VMLElement that are properties on the given object.
 * It loops all properties and invokes destroy if there is a destroy method. The property is
 * then delete'ed.
 */
function destroyObjectProperties(obj) {
	var n;
	for (n in obj) {
		// If the object is non-null and destroy is defined
		if (obj[n] && obj[n].destroy) {
			// Invoke the destroy
			obj[n].destroy();
		}

		// Delete the property from the object.
		delete obj[n];
	}
}

/**
 * Path interpolation algorithm used across adapters
 */
pathAnim = {
	/**
	 * Prepare start and end values so that the path can be animated one to one
	 */
	init: function (elem, fromD, toD) {
		fromD = fromD || '';
		var shift = elem.shift,
			bezier = fromD.indexOf('C') > -1,
			numParams = bezier ? 7 : 3,
			endLength,
			slice,
			i,
			start = fromD.split(' '),
			end = [].concat(toD), // copy
			startBaseLine,
			endBaseLine,
			sixify = function (arr) { // in splines make move points have six parameters like bezier curves
				i = arr.length;
				while (i--) {
					if (arr[i] === M) {
						arr.splice(i + 1, 0, arr[i + 1], arr[i + 2], arr[i + 1], arr[i + 2]);
					}
				}
			};

		if (bezier) {
			sixify(start);
			sixify(end);
		}

		// pull out the base lines before padding
		if (elem.isArea) {
			startBaseLine = start.splice(start.length - 6, 6);
			endBaseLine = end.splice(end.length - 6, 6);
		}

		// if shifting points, prepend a dummy point to the end path
		if (shift) {

			end = [].concat(end).splice(0, numParams).concat(end);
			elem.shift = false; // reset for following animations
		}

		// copy and append last point until the length matches the end length
		if (start.length) {
			endLength = end.length;
			while (start.length < endLength) {

				//bezier && sixify(start);
				slice = [].concat(start).splice(start.length - numParams, numParams);
				if (bezier) { // disable first control point
					slice[numParams - 6] = slice[numParams - 2];
					slice[numParams - 5] = slice[numParams - 1];
				}
				start = start.concat(slice);
			}
		}

		if (startBaseLine) { // append the base lines for areas
			start = start.concat(startBaseLine);
			end = end.concat(endBaseLine);
		}
		return [start, end];
	},

	/**
	 * Interpolate each value of the path and return the array
	 */
	step: function (start, end, pos, complete) {
		var ret = [],
			i = start.length,
			startVal;

		if (pos === 1) { // land on the final path without adjustment points appended in the ends
			ret = complete;

		} else if (i === end.length && pos < 1) {
			while (i--) {
				startVal = parseFloat(start[i]);
				ret[i] =
					isNaN(startVal) ? // a letter instruction like M or L
						start[i] :
						pos * (parseFloat(end[i] - startVal)) + startVal;

			}
		} else { // if animation is finished or length not matching, land on right value
			ret = end;
		}
		return ret;
	}
};


/**
 * Set the global animation to either a given value, or fall back to the
 * given chart's animation option
 * @param {Object} animation
 * @param {Object} chart
 */
function setAnimation(animation, chart) {
	globalAnimation = pick(animation, chart.animation);
}

/*
 * Define the adapter for frameworks. If an external adapter is not defined,
 * Highcharts reverts to the built-in jQuery adapter.
 */
if (globalAdapter && globalAdapter.init) {
	// Initialize the adapter with the pathAnim object that takes care
	// of path animations.
	globalAdapter.init(pathAnim);
}
if (!globalAdapter && win.jQuery) {
	var jQ = jQuery;

	/**
	 * Utility for iterating over an array. Parameters are reversed compared to jQuery.
	 * @param {Array} arr
	 * @param {Function} fn
	 */
	each = function (arr, fn) {
		var i = 0,
			len = arr.length;
		for (; i < len; i++) {
			if (fn.call(arr[i], arr[i], i, arr) === false) {
				return i;
			}
		}
	};

	/**
	 * Filter an array
	 */
	grep = jQ.grep;

	/**
	 * Map an array
	 * @param {Array} arr
	 * @param {Function} fn
	 */
	map = function (arr, fn) {
		//return jQuery.map(arr, fn);
		var results = [],
			i = 0,
			len = arr.length;
		for (; i < len; i++) {
			results[i] = fn.call(arr[i], arr[i], i, arr);
		}
		return results;

	};

	/**
	 * Deep merge two objects and return a third object
	 */
	merge = function () {
		var args = arguments;
		return jQ.extend(true, null, args[0], args[1], args[2], args[3]);
	};

	/**
	 * Add an event listener
	 * @param {Object} el A HTML element or custom object
	 * @param {String} event The event type
	 * @param {Function} fn The event handler
	 */
	addEvent = function (el, event, fn) {
		jQ(el).bind(event, fn);
	};

	/**
	 * Remove event added with addEvent
	 * @param {Object} el The object
	 * @param {String} eventType The event type. Leave blank to remove all events.
	 * @param {Function} handler The function to remove
	 */
	removeEvent = function (el, eventType, handler) {
		// workaround for jQuery issue with unbinding custom events:
		// http://forum.jquery.com/topic/javascript-error-when-unbinding-a-custom-event-using-jquery-1-4-2
		var func = doc.removeEventListener ? 'removeEventListener' : 'detachEvent';
		if (doc[func] && !el[func]) {
			el[func] = function () {};
		}

		jQ(el).unbind(eventType, handler);
	};

	/**
	 * Fire an event on a custom object
	 * @param {Object} el
	 * @param {String} type
	 * @param {Object} eventArguments
	 * @param {Function} defaultFunction
	 */
	fireEvent = function (el, type, eventArguments, defaultFunction) {
		var event = jQ.Event(type),
			detachedType = 'detached' + type;
		extend(event, eventArguments);

		// Prevent jQuery from triggering the object method that is named the
		// same as the event. For example, if the event is 'select', jQuery
		// attempts calling el.select and it goes into a loop.
		if (el[type]) {
			el[detachedType] = el[type];
			el[type] = null;
		}

		// trigger it
		jQ(el).trigger(event);

		// attach the method
		if (el[detachedType]) {
			el[type] = el[detachedType];
			el[detachedType] = null;
		}

		if (defaultFunction && !event.isDefaultPrevented()) {
			defaultFunction(event);
		}
	};

	/**
	 * Animate a HTML element or SVG element wrapper
	 * @param {Object} el
	 * @param {Object} params
	 * @param {Object} options jQuery-like animation options: duration, easing, callback
	 */
	animate = function (el, params, options) {
		var $el = jQ(el);
		if (params.d) {
			el.toD = params.d; // keep the array form for paths, used in jQ.fx.step.d
			params.d = 1; // because in jQuery, animating to an array has a different meaning
		}

		$el.stop();
		$el.animate(params, options);

	};
	/**
	 * Stop running animation
	 */
	stop = function (el) {
		jQ(el).stop();
	};


	// extend jQuery
	/*jslint unparam: true*//* allow unused param x in this function */
	jQ.extend(jQ.easing, {
		easeOutQuad: function (x, t, b, c, d) {
			return -c * (t /= d) * (t - 2) + b;
		}
	});
	/*jslint unparam: false*/

	// extend the animate function to allow SVG animations
	var oldStepDefault = jQuery.fx.step._default,
		oldCur = jQuery.fx.prototype.cur;

	// do the step
	jQ.fx.step._default = function (fx) {
		var elem = fx.elem;
		if (elem.attr) { // is SVG element wrapper
			elem.attr(fx.prop, fx.now);
		} else {
			oldStepDefault.apply(this, arguments);
		}
	};
	// animate paths
	jQ.fx.step.d = function (fx) {
		var elem = fx.elem;


		// Normally start and end should be set in state == 0, but sometimes,
		// for reasons unknown, this doesn't happen. Perhaps state == 0 is skipped
		// in these cases
		if (!fx.started) {
			var ends = pathAnim.init(elem, elem.d, elem.toD);
			fx.start = ends[0];
			fx.end = ends[1];
			fx.started = true;
		}


		// interpolate each value of the path
		elem.attr('d', pathAnim.step(fx.start, fx.end, fx.pos, elem.toD));

	};
	// get the current value
	jQ.fx.prototype.cur = function () {
		var elem = this.elem,
			r;
		if (elem.attr) { // is SVG element wrapper
			r = elem.attr(this.prop);
		} else {
			r = oldCur.apply(this, arguments);
		}
		return r;
	};
}


/**
 * Add a global listener for mousemove events
 */
/*addEvent(doc, 'mousemove', function(e) {
	if (globalMouseMove) {
		globalMouseMove(e);
	}
});*/
/**
 * Set the time methods globally based on the useUTC option. Time method can be either
 * local time or UTC (default).
 */
function setTimeMethods() {
	var useUTC = defaultOptions.global.useUTC;

	makeTime = useUTC ? Date.UTC : function (year, month, date, hours, minutes, seconds) {
		return new Date(
			year,
			month,
			pick(date, 1),
			pick(hours, 0),
			pick(minutes, 0),
			pick(seconds, 0)
		).getTime();
	};
	getMinutes = useUTC ? 'getUTCMinutes' : 'getMinutes';
	getHours = useUTC ? 'getUTCHours' : 'getHours';
	getDay = useUTC ? 'getUTCDay' : 'getDay';
	getDate = useUTC ? 'getUTCDate' : 'getDate';
	getMonth = useUTC ? 'getUTCMonth' : 'getMonth';
	getFullYear = useUTC ? 'getUTCFullYear' : 'getFullYear';
	setMinutes = useUTC ? 'setUTCMinutes' : 'setMinutes';
	setHours = useUTC ? 'setUTCHours' : 'setHours';
	setDate = useUTC ? 'setUTCDate' : 'setDate';
	setMonth = useUTC ? 'setUTCMonth' : 'setMonth';
	setFullYear = useUTC ? 'setUTCFullYear' : 'setFullYear';

}

/**
 * Merge the default options with custom options and return the new options structure
 * @param {Object} options The new custom options
 */
function setOptions(options) {
	defaultOptions = merge(defaultOptions, options);

	// apply UTC
	setTimeMethods();

	return defaultOptions;
}

/**
 * Get the updated default options. Merely exposing defaultOptions for outside modules
 * isn't enough because the setOptions method creates a new object.
 */
function getOptions() {
	return defaultOptions;
}

/**
 * Discard an element by moving it to the bin and delete
 * @param {Object} The HTML node to discard
 */
function discardElement(element) {
	// create a garbage bin element, not part of the DOM
	if (!garbageBin) {
		garbageBin = createElement(DIV);
	}

	// move the node and empty bin
	if (element) {
		garbageBin.appendChild(element);
	}
	garbageBin.innerHTML = '';
}

/* ****************************************************************************
 * Handle the options                                                         *
 *****************************************************************************/
var

defaultLabelOptions = {
	enabled: true,
	// rotation: 0,
	align: 'center',
	x: 0,
	y: 15,
	/*formatter: function() {
		return this.value;
	},*/
	style: {
		color: '#666',
		fontSize: '11px',
		lineHeight: '14px'
	}
};

defaultOptions = {
	colors: ['#4572A7', '#AA4643', '#89A54E', '#80699B', '#3D96AE',
		'#DB843D', '#92A8CD', '#A47D7C', '#B5CA92'],
	symbols: ['circle', 'diamond', 'square', 'triangle', 'triangle-down'],
	lang: {
		loading: 'Loading...',
		months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
				'August', 'September', 'October', 'November', 'December'],
		shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		decimalPoint: '.',
		resetZoom: 'Reset zoom',
		resetZoomTitle: 'Reset zoom level 1:1',
		thousandsSep: ','
	},
	global: {
		useUTC: true
	},
	chart: {
		//animation: true,
		//alignTicks: false,
		//reflow: true,
		//className: null,
		//events: { load, selection },
		//margin: [null],
		//marginTop: null,
		//marginRight: null,
		//marginBottom: null,
		//marginLeft: null,
		borderColor: '#4572A7',
		//borderWidth: 0,
		borderRadius: 5,
		defaultSeriesType: 'line',
		ignoreHiddenSeries: true,
		//inverted: false,
		//shadow: false,
		spacingTop: 10,
		spacingRight: 10,
		spacingBottom: 15,
		spacingLeft: 10,
		style: {
			fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif', // default font
			fontSize: '12px'
		},
		backgroundColor: '#FFFFFF',
		//plotBackgroundColor: null,
		plotBorderColor: '#C0C0C0'
		//plotBorderWidth: 0,
		//plotShadow: false,
		//zoomType: ''
	},
	title: {
		text: 'Chart title',
		align: 'center',
		// floating: false,
		// margin: 15,
		// x: 0,
		// verticalAlign: 'top',
		y: 15,
		style: {
			color: '#3E576F',
			fontSize: '16px'
		}

	},
	subtitle: {
		text: '',
		align: 'center',
		// floating: false
		// x: 0,
		// verticalAlign: 'top',
		y: 30,
		style: {
			color: '#6D869F'
		}
	},

	plotOptions: {
		line: { // base series options
			allowPointSelect: false,
			showCheckbox: false,
			animation: {
				duration: 1000
			},
			//connectNulls: false,
			//cursor: 'default',
			//dashStyle: null,
			//enableMouseTracking: true,
			events: {},
			//legendIndex: 0,
			lineWidth: 2,
			shadow: true,
			// stacking: null,
			marker: {
				enabled: true,
				//symbol: null,
				lineWidth: 0,
				radius: 4,
				lineColor: '#FFFFFF',
				//fillColor: null,
				states: { // states for a single point
					hover: {
						//radius: base + 2
					},
					select: {
						fillColor: '#FFFFFF',
						lineColor: '#000000',
						lineWidth: 2
					}
				}
			},
			point: {
				events: {}
			},
			dataLabels: merge(defaultLabelOptions, {
				enabled: false,
				y: -6,
				formatter: function () {
					return this.y;
				}
			}),

			//pointStart: 0,
			//pointInterval: 1,
			showInLegend: true,
			states: { // states for the entire series
				hover: {
					//enabled: false,
					//lineWidth: base + 1,
					marker: {
						// lineWidth: base + 1,
						// radius: base + 1
					}
				},
				select: {
					marker: {}
				}
			},
			stickyTracking: true
			//zIndex: null
		}
	},
	labels: {
		//items: [],
		style: {
			//font: defaultFont,
			position: ABSOLUTE,
			color: '#3E576F'
		}
	},
	legend: {
		enabled: true,
		align: 'center',
		//floating: false,
		layout: 'horizontal',
		labelFormatter: function () {
			return this.name;
		},
		borderWidth: 1,
		borderColor: '#909090',
		borderRadius: 5,
		// margin: 10,
		// reversed: false,
		shadow: false,
		// backgroundColor: null,
		style: {
			padding: '5px'
		},
		itemStyle: {
			cursor: 'pointer',
			color: '#3E576F'
		},
		itemHoverStyle: {
			cursor: 'pointer',
			color: '#000000'
		},
		itemHiddenStyle: {
			color: '#C0C0C0'
		},
		itemCheckboxStyle: {
			position: ABSOLUTE,
			width: '13px', // for IE precision
			height: '13px'
		},
		// itemWidth: undefined,
		symbolWidth: 16,
		symbolPadding: 5,
		verticalAlign: 'bottom',
		// width: undefined,
		x: 0,
		y: 0
	},

	loading: {
		hideDuration: 100,
		labelStyle: {
			fontWeight: 'bold',
			position: RELATIVE,
			top: '1em'
		},
		showDuration: 100,
		style: {
			position: ABSOLUTE,
			backgroundColor: 'white',
			opacity: 0.5,
			textAlign: 'center'
		}
	},

	tooltip: {
		enabled: true,
		//crosshairs: null,
		backgroundColor: 'rgba(255, 255, 255, .85)',
		borderWidth: 2,
		borderRadius: 5,
		//formatter: defaultFormatter,
		shadow: true,
		//shared: false,
		snap: hasTouch ? 25 : 10,
		style: {
			color: '#333333',
			fontSize: '12px',
			padding: '5px',
			whiteSpace: 'nowrap'
		}
	},

	toolbar: {
		itemStyle: {
			color: '#4572A7',
			cursor: 'pointer'
		}
	},

	credits: {
		enabled: true,
		text: 'Highcharts.com',
		href: 'http://www.highcharts.com',
		position: {
			align: 'right',
			x: -10,
			verticalAlign: 'bottom',
			y: -5
		},
		style: {
			cursor: 'pointer',
			color: '#909090',
			fontSize: '10px'
		}
	}
};

// Axis defaults
var defaultXAxisOptions =  {
	// allowDecimals: null,
	// alternateGridColor: null,
	// categories: [],
	dateTimeLabelFormats: {
		second: '%H:%M:%S',
		minute: '%H:%M',
		hour: '%H:%M',
		day: '%e. %b',
		week: '%e. %b',
		month: '%b \'%y',
		year: '%Y'
	},
	endOnTick: false,
	gridLineColor: '#C0C0C0',
	// gridLineDashStyle: 'solid', // docs
	// gridLineWidth: 0,
	// reversed: false,

	labels: defaultLabelOptions,
		// { step: null },
	lineColor: '#C0D0E0',
	lineWidth: 1,
	//linkedTo: null,
	max: null,
	min: null,
	minPadding: 0.01,
	maxPadding: 0.01,
	//maxZoom: null,
	minorGridLineColor: '#E0E0E0',
	// minorGridLineDashStyle: null,
	minorGridLineWidth: 1,
	minorTickColor: '#A0A0A0',
	//minorTickInterval: null,
	minorTickLength: 2,
	minorTickPosition: 'outside', // inside or outside
	//minorTickWidth: 0,
	//opposite: false,
	//offset: 0,
	//plotBands: [{
	//	events: {},
	//	zIndex: 1,
	//	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
	//}],
	//plotLines: [{
	//	events: {}
	//  dashStyle: {}
	//	zIndex:
	//	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
	//}],
	//reversed: false,
	// showFirstLabel: true,
	// showLastLabel: false,
	startOfWeek: 1,
	startOnTick: false,
	tickColor: '#C0D0E0',
	//tickInterval: null,
	tickLength: 5,
	tickmarkPlacement: 'between', // on or between
	tickPixelInterval: 100,
	tickPosition: 'outside',
	tickWidth: 1,
	title: {
		//text: null,
		align: 'middle', // low, middle or high
		//margin: 0 for horizontal, 10 for vertical axes,
		//rotation: 0,
		//side: 'outside',
		style: {
			color: '#6D869F',
			//font: defaultFont.replace('normal', 'bold')
			fontWeight: 'bold'
		}
		//x: 0,
		//y: 0
	},
	type: 'linear' // linear, logarithmic or datetime
},

defaultYAxisOptions = merge(defaultXAxisOptions, {
	endOnTick: true,
	gridLineWidth: 1,
	tickPixelInterval: 72,
	showLastLabel: true,
	labels: {
		align: 'right',
		x: -8,
		y: 3
	},
	lineWidth: 0,
	maxPadding: 0.05,
	minPadding: 0.05,
	startOnTick: true,
	tickWidth: 0,
	title: {
		rotation: 270,
		text: 'Y-values'
	},
	stackLabels: {
		enabled: false,
		//align: dynamic,
		//y: dynamic,
		//x: dynamic,
		//verticalAlign: dynamic,
		//textAlign: dynamic,
		//rotation: 0,
		formatter: function () {
			return this.total;
		},
		style: defaultLabelOptions.style
	}
}),

defaultLeftAxisOptions = {
	labels: {
		align: 'right',
		x: -8,
		y: null
	},
	title: {
		rotation: 270
	}
},
defaultRightAxisOptions = {
	labels: {
		align: 'left',
		x: 8,
		y: null
	},
	title: {
		rotation: 90
	}
},
defaultBottomAxisOptions = { // horizontal axis
	labels: {
		align: 'center',
		x: 0,
		y: 14
		// staggerLines: null
	},
	title: {
		rotation: 0
	}
},
defaultTopAxisOptions = merge(defaultBottomAxisOptions, {
	labels: {
		y: -5
		// staggerLines: null
	}
});




// Series defaults
var defaultPlotOptions = defaultOptions.plotOptions,
	defaultSeriesOptions = defaultPlotOptions.line;
//defaultPlotOptions.line = merge(defaultSeriesOptions);
defaultPlotOptions.spline = merge(defaultSeriesOptions);
defaultPlotOptions.scatter = merge(defaultSeriesOptions, {
	lineWidth: 0,
	states: {
		hover: {
			lineWidth: 0
		}
	}
});
defaultPlotOptions.area = merge(defaultSeriesOptions, {
	// threshold: 0,
	// lineColor: null, // overrides color, but lets fillColor be unaltered
	// fillOpacity: 0.75,
	// fillColor: null

});
defaultPlotOptions.areaspline = merge(defaultPlotOptions.area);
defaultPlotOptions.column = merge(defaultSeriesOptions, {
	borderColor: '#FFFFFF',
	borderWidth: 1,
	borderRadius: 0,
	//colorByPoint: undefined,
	groupPadding: 0.2,
	marker: null, // point options are specified in the base options
	pointPadding: 0.1,
	//pointWidth: null,
	minPointLength: 0,
	states: {
		hover: {
			brightness: 0.1,
			shadow: false
		},
		select: {
			color: '#C0C0C0',
			borderColor: '#000000',
			shadow: false
		}
	},
	dataLabels: {
		y: null,
		verticalAlign: null
	}
});
defaultPlotOptions.bar = merge(defaultPlotOptions.column, {
	dataLabels: {
		align: 'left',
		x: 5,
		y: 0
	}
});
defaultPlotOptions.pie = merge(defaultSeriesOptions, {
	//dragType: '', // n/a
	borderColor: '#FFFFFF',
	borderWidth: 1,
	center: ['50%', '50%'],
	colorByPoint: true, // always true for pies
	dataLabels: {
		// align: null,
		// connectorWidth: 1,
		// connectorColor: point.color,
		// connectorPadding: 5,
		distance: 30,
		enabled: true,
		formatter: function () {
			return this.point.name;
		},
		// softConnector: true,
		y: 5
	},
	//innerSize: 0,
	legendType: 'point',
	marker: null, // point options are specified in the base options
	size: '75%',
	showInLegend: false,
	slicedOffset: 10,
	states: {
		hover: {
			brightness: 0.1,
			shadow: false
		}
	}

});

// set the default time methods
setTimeMethods();


/**
 * Handle color operations. The object methods are chainable.
 * @param {String} input The input color in either rbga or hex format
 */
var Color = function (input) {
	// declare variables
	var rgba = [], result;

	/**
	 * Parse the input color to rgba array
	 * @param {String} input
	 */
	function init(input) {

		// rgba
		result = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/.exec(input);
		if (result) {
			rgba = [pInt(result[1]), pInt(result[2]), pInt(result[3]), parseFloat(result[4], 10)];
		} else { // hex
			result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(input);
			if (result) {
				rgba = [pInt(result[1], 16), pInt(result[2], 16), pInt(result[3], 16), 1];
			}
		}

	}
	/**
	 * Return the color a specified format
	 * @param {String} format
	 */
	function get(format) {
		var ret;

		// it's NaN if gradient colors on a column chart
		if (rgba && !isNaN(rgba[0])) {
			if (format === 'rgb') {
				ret = 'rgb(' + rgba[0] + ',' + rgba[1] + ',' + rgba[2] + ')';
			} else if (format === 'a') {
				ret = rgba[3];
			} else {
				ret = 'rgba(' + rgba.join(',') + ')';
			}
		} else {
			ret = input;
		}
		return ret;
	}

	/**
	 * Brighten the color
	 * @param {Number} alpha
	 */
	function brighten(alpha) {
		if (isNumber(alpha) && alpha !== 0) {
			var i;
			for (i = 0; i < 3; i++) {
				rgba[i] += pInt(alpha * 255);

				if (rgba[i] < 0) {
					rgba[i] = 0;
				}
				if (rgba[i] > 255) {
					rgba[i] = 255;
				}
			}
		}
		return this;
	}
	/**
	 * Set the color's opacity to a given alpha value
	 * @param {Number} alpha
	 */
	function setOpacity(alpha) {
		rgba[3] = alpha;
		return this;
	}

	// initialize: parse the input
	init(input);

	// public methods
	return {
		get: get,
		brighten: brighten,
		setOpacity: setOpacity
	};
};

/**
 * A wrapper object for SVG elements
 */
function SVGElement() {}

SVGElement.prototype = {
	/**
	 * Initialize the SVG renderer
	 * @param {Object} renderer
	 * @param {String} nodeName
	 */
	init: function (renderer, nodeName) {
		this.element = doc.createElementNS(SVG_NS, nodeName);
		this.renderer = renderer;
	},
	/**
	 * Animate a given attribute
	 * @param {Object} params
	 * @param {Number} options The same options as in jQuery animation
	 * @param {Function} complete Function to perform at the end of animation
	 */
	animate: function (params, options, complete) {
		var animOptions = pick(options, globalAnimation, true);
		if (animOptions) {
			animOptions = merge(animOptions);
			if (complete) { // allows using a callback with the global animation without overwriting it
				animOptions.complete = complete;
			}
			animate(this, params, animOptions);
		} else {
			this.attr(params);
			if (complete) {
				complete();
			}
		}
	},
	/**
	 * Set or get a given attribute
	 * @param {Object|String} hash
	 * @param {Mixed|Undefined} val
	 */
	attr: function (hash, val) {
		var key,
			value,
			i,
			child,
			element = this.element,
			nodeName = element.nodeName,
			renderer = this.renderer,
			skipAttr,
			shadows = this.shadows,
			htmlNode = this.htmlNode,
			hasSetSymbolSize,
			ret = this;

		// single key-value pair
		if (isString(hash) && defined(val)) {
			key = hash;
			hash = {};
			hash[key] = val;
		}

		// used as a getter: first argument is a string, second is undefined
		if (isString(hash)) {
			key = hash;
			if (nodeName === 'circle') {
				key = { x: 'cx', y: 'cy' }[key] || key;
			} else if (key === 'strokeWidth') {
				key = 'stroke-width';
			}
			ret = attr(element, key) || this[key] || 0;

			if (key !== 'd' && key !== 'visibility') { // 'd' is string in animation step
				ret = parseFloat(ret);
			}

		// setter
		} else {

			for (key in hash) {
				skipAttr = false; // reset
				value = hash[key];

				// paths
				if (key === 'd') {
					if (value && value.join) { // join path
						value = value.join(' ');
					}
					if (/(NaN| {2}|^$)/.test(value)) {
						value = 'M 0 0';
					}
					this.d = value; // shortcut for animations

				// update child tspans x values
				} else if (key === 'x' && nodeName === 'text') {
					for (i = 0; i < element.childNodes.length; i++) {
						child = element.childNodes[i];
						// if the x values are equal, the tspan represents a linebreak
						if (attr(child, 'x') === attr(element, 'x')) {
							//child.setAttribute('x', value);
							attr(child, 'x', value);
						}
					}

					if (this.rotation) {
						attr(element, 'transform', 'rotate(' + this.rotation + ' ' + value + ' ' +
							pInt(hash.y || attr(element, 'y')) + ')');
					}

				// apply gradients
				} else if (key === 'fill') {
					value = renderer.color(value, element, key);

				// circle x and y
				} else if (nodeName === 'circle' && (key === 'x' || key === 'y')) {
					key = { x: 'cx', y: 'cy' }[key] || key;

				// translation and text rotation
				} else if (key === 'translateX' || key === 'translateY' || key === 'rotation' || key === 'verticalAlign') {
					this[key] = value;
					this.updateTransform();
					skipAttr = true;

				// apply opacity as subnode (required by legacy WebKit and Batik)
				} else if (key === 'stroke') {
					value = renderer.color(value, element, key);

				// emulate VML's dashstyle implementation
				} else if (key === 'dashstyle') {
					key = 'stroke-dasharray';
					value = value && value.toLowerCase();
					if (value === 'solid') {
						value = NONE;
					} else if (value) {
						value = value
							.replace('shortdashdotdot', '3,1,1,1,1,1,')
							.replace('shortdashdot', '3,1,1,1')
							.replace('shortdot', '1,1,')
							.replace('shortdash', '3,1,')
							.replace('longdash', '8,3,')
							.replace(/dot/g, '1,3,')
							.replace('dash', '4,3,')
							.replace(/,$/, '')
							.split(','); // ending comma

						i = value.length;
						while (i--) {
							value[i] = pInt(value[i]) * hash['stroke-width'];
						}

						value = value.join(',');
					}

				// special
				} else if (key === 'isTracker') {
					this[key] = value;

				// IE9/MooTools combo: MooTools returns objects instead of numbers and IE9 Beta 2
				// is unable to cast them. Test again with final IE9.
				} else if (key === 'width') {
					value = pInt(value);

				// Text alignment
				} else if (key === 'align') {
					key = 'text-anchor';
					value = { left: 'start', center: 'middle', right: 'end' }[value];


				// Title requires a subnode, #431
				} else if (key === 'title') {
					var title = doc.createElementNS(SVG_NS, 'title');
					title.appendChild(doc.createTextNode(value));
					element.appendChild(title);
				}



				// jQuery animate changes case
				if (key === 'strokeWidth') {
					key = 'stroke-width';
				}

				// Chrome/Win < 6 bug (http://code.google.com/p/chromium/issues/detail?id=15461)
				if (isWebKit && key === 'stroke-width' && value === 0) {
					value = 0.000001;
				}

				// symbols
				if (this.symbolName && /^(x|y|r|start|end|innerR)/.test(key)) {


					if (!hasSetSymbolSize) {
						this.symbolAttr(hash);
						hasSetSymbolSize = true;
					}
					skipAttr = true;
				}

				// let the shadow follow the main element
				if (shadows && /^(width|height|visibility|x|y|d)$/.test(key)) {
					i = shadows.length;
					while (i--) {
						attr(shadows[i], key, value);
					}
				}

				// validate heights
				if ((key === 'width' || key === 'height') && nodeName === 'rect' && value < 0) {
					value = 0;
				}

				if (key === 'text') {
					// only one node allowed
					this.textStr = value;
					if (this.added) {
						renderer.buildText(this);
					}
				} else if (!skipAttr) {
					//element.setAttribute(key, value);
					attr(element, key, value);
				}

				// Issue #38
				if (htmlNode && (key === 'x' || key === 'y' ||
						key === 'translateX' || key === 'translateY' || key === 'visibility')) {
					var wrapper = this,
						bBox,
						arr = htmlNode.length ? htmlNode : [this],
						length = arr.length,
						itemWrapper,
						j;
					
					for (j = 0; j < length; j++) {
						itemWrapper = arr[j];
						bBox = itemWrapper.getBBox();
						htmlNode = itemWrapper.htmlNode; // reassign to child item
						css(htmlNode, extend(wrapper.styles, {
							left: (bBox.x + (wrapper.translateX || 0)) + PX,
							top: (bBox.y + (wrapper.translateY || 0)) + PX
						}));

						if (key === 'visibility') {
							css(htmlNode, {
								visibility: value
							});
						}
					}
				}

			}

		}
		return ret;
	},

	/**
	 * If one of the symbol size affecting parameters are changed,
	 * check all the others only once for each call to an element's
	 * .attr() method
	 * @param {Object} hash
	 */
	symbolAttr: function (hash) {
		var wrapper = this;

		each(['x', 'y', 'r', 'start', 'end', 'width', 'height', 'innerR'], function (key) {
			wrapper[key] = pick(hash[key], wrapper[key]);
		});

		wrapper.attr({
			d: wrapper.renderer.symbols[wrapper.symbolName](
					mathRound(wrapper.x * 2) / 2, // Round to halves. Issue #274.
					mathRound(wrapper.y * 2) / 2,
					wrapper.r,
					{
						start: wrapper.start,
						end: wrapper.end,
						width: wrapper.width,
						height: wrapper.height,
						innerR: wrapper.innerR
					}
			)
		});
	},

	/**
	 * Apply a clipping path to this object
	 * @param {String} id
	 */
	clip: function (clipRect) {
		return this.attr('clip-path', 'url(' + this.renderer.url + '#' + clipRect.id + ')');
	},

	/**
	 * Calculate the coordinates needed for drawing a rectangle crisply and return the
	 * calculated attributes
	 * @param {Number} strokeWidth
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 */
	crisp: function (strokeWidth, x, y, width, height) {

		var wrapper = this,
			key,
			attr = {},
			values = {},
			normalizer;

		strokeWidth = strokeWidth || wrapper.strokeWidth || 0;
		normalizer = strokeWidth % 2 / 2;

		// normalize for crisp edges
		values.x = mathFloor(x || wrapper.x || 0) + normalizer;
		values.y = mathFloor(y || wrapper.y || 0) + normalizer;
		values.width = mathFloor((width || wrapper.width || 0) - 2 * normalizer);
		values.height = mathFloor((height || wrapper.height || 0) - 2 * normalizer);
		values.strokeWidth = strokeWidth;

		for (key in values) {
			if (wrapper[key] !== values[key]) { // only set attribute if changed
				wrapper[key] = attr[key] = values[key];
			}
		}

		return attr;
	},

	/**
	 * Set styles for the element
	 * @param {Object} styles
	 */
	css: function (styles) {
		/*jslint unparam: true*//* allow unused param a in the regexp function below */
		var elemWrapper = this,
			elem = elemWrapper.element,
			textWidth = styles && styles.width && elem.nodeName === 'text',
			n,
			serializedCss = '',
			hyphenate = function (a, b) { return '-' + b.toLowerCase(); };
		/*jslint unparam: false*/

		// convert legacy
		if (styles && styles.color) {
			styles.fill = styles.color;
		}

		// Merge the new styles with the old ones
		styles = extend(
			elemWrapper.styles,
			styles
		);


		// store object
		elemWrapper.styles = styles;


		// serialize and set style attribute
		if (isIE && !hasSVG) { // legacy IE doesn't support setting style attribute
			if (textWidth) {
				delete styles.width;
			}
			css(elemWrapper.element, styles);
		} else {
			for (n in styles) {
				serializedCss += n.replace(/([A-Z])/g, hyphenate) + ':' + styles[n] + ';';
			}
			elemWrapper.attr({
				style: serializedCss
			});
		}


		// re-build text
		if (textWidth && elemWrapper.added) {
			elemWrapper.renderer.buildText(elemWrapper);
		}

		return elemWrapper;
	},

	/**
	 * Add an event listener
	 * @param {String} eventType
	 * @param {Function} handler
	 */
	on: function (eventType, handler) {
		var fn = handler;
		// touch
		if (hasTouch && eventType === 'click') {
			eventType = 'touchstart';
			fn = function (e) {
				e.preventDefault();
				handler();
			};
		}
		// simplest possible event model for internal use
		this.element['on' + eventType] = fn;
		return this;
	},


	/**
	 * Move an object and its children by x and y values
	 * @param {Number} x
	 * @param {Number} y
	 */
	translate: function (x, y) {
		return this.attr({
			translateX: x,
			translateY: y
		});
	},

	/**
	 * Invert a group, rotate and flip
	 */
	invert: function () {
		var wrapper = this;
		wrapper.inverted = true;
		wrapper.updateTransform();
		return wrapper;
	},

	/**
	 * Private method to update the transform attribute based on internal
	 * properties
	 */
	updateTransform: function () {
		var wrapper = this,
			translateX = wrapper.translateX || 0,
			translateY = wrapper.translateY || 0,
			inverted = wrapper.inverted,
			rotation = wrapper.rotation,
			transform = [];

		// flipping affects translate as adjustment for flipping around the group's axis
		if (inverted) {
			translateX += wrapper.attr('width');
			translateY += wrapper.attr('height');
		}

		// apply translate
		if (translateX || translateY) {
			transform.push('translate(' + translateX + ',' + translateY + ')');
		}

		// apply rotation
		if (inverted) {
			transform.push('rotate(90) scale(-1,1)');
		} else if (rotation) { // text rotation
			transform.push('rotate(' + rotation + ' ' + wrapper.x + ' ' + wrapper.y + ')');
		}

		if (transform.length) {
			attr(wrapper.element, 'transform', transform.join(' '));
		}
	},
	/**
	 * Bring the element to the front
	 */
	toFront: function () {
		var element = this.element;
		element.parentNode.appendChild(element);
		return this;
	},


	/**
	 * Break down alignment options like align, verticalAlign, x and y
	 * to x and y relative to the chart.
	 *
	 * @param {Object} alignOptions
	 * @param {Boolean} alignByTranslate
	 * @param {Object} box The box to align to, needs a width and height
	 *
	 */
	align: function (alignOptions, alignByTranslate, box) {
		var elemWrapper = this;

		if (!alignOptions) { // called on resize
			alignOptions = elemWrapper.alignOptions;
			alignByTranslate = elemWrapper.alignByTranslate;
		} else { // first call on instanciate
			elemWrapper.alignOptions = alignOptions;
			elemWrapper.alignByTranslate = alignByTranslate;
			if (!box) { // boxes other than renderer handle this internally
				elemWrapper.renderer.alignedObjects.push(elemWrapper);
			}
		}

		box = pick(box, elemWrapper.renderer);

		var align = alignOptions.align,
			vAlign = alignOptions.verticalAlign,
			x = (box.x || 0) + (alignOptions.x || 0), // default: left align
			y = (box.y || 0) + (alignOptions.y || 0), // default: top align
			attribs = {};


		// align
		if (/^(right|center)$/.test(align)) {
			x += (box.width - (alignOptions.width || 0)) /
					{ right: 1, center: 2 }[align];
		}
		attribs[alignByTranslate ? 'translateX' : 'x'] = mathRound(x);


		// vertical align
		if (/^(bottom|middle)$/.test(vAlign)) {
			y += (box.height - (alignOptions.height || 0)) /
					({ bottom: 1, middle: 2 }[vAlign] || 1);

		}
		attribs[alignByTranslate ? 'translateY' : 'y'] = mathRound(y);

		// animate only if already placed
		elemWrapper[elemWrapper.placed ? 'animate' : 'attr'](attribs);
		elemWrapper.placed = true;
		elemWrapper.alignAttr = attribs;

		return elemWrapper;
	},

	/**
	 * Get the bounding box (width, height, x and y) for the element
	 */
	getBBox: function () {
		var bBox,
			width,
			height,
			rotation = this.rotation,
			rad = rotation * deg2rad;

		try { // fails in Firefox if the container has display: none
			// use extend because IE9 is not allowed to change width and height in case
			// of rotation (below)
			bBox = extend({}, this.element.getBBox());
		} catch (e) {
			bBox = { width: 0, height: 0 };
		}
		width = bBox.width;
		height = bBox.height;

		// adjust for rotated text
		if (rotation) {
			bBox.width = mathAbs(height * mathSin(rad)) + mathAbs(width * mathCos(rad));
			bBox.height = mathAbs(height * mathCos(rad)) + mathAbs(width * mathSin(rad));
		}

		return bBox;
	},

	/* *
	 * Manually compute width and height of rotated text from non-rotated. Shared by SVG and VML
	 * @param {Object} bBox
	 * @param {number} rotation
	 * /
	rotateBBox: function(bBox, rotation) {
		var rad = rotation * math.PI * 2 / 360, // radians
			width = bBox.width,
			height = bBox.height;


	},*/

	/**
	 * Show the element
	 */
	show: function () {
		return this.attr({ visibility: VISIBLE });
	},

	/**
	 * Hide the element
	 */
	hide: function () {
		return this.attr({ visibility: HIDDEN });
	},

	/**
	 * Add the element
	 * @param {Object|Undefined} parent Can be an element, an element wrapper or undefined
	 *    to append the element to the renderer.box.
	 */
	add: function (parent) {

		var renderer = this.renderer,
			parentWrapper = parent || renderer,
			parentNode = parentWrapper.element || renderer.box,
			childNodes = parentNode.childNodes,
			element = this.element,
			zIndex = attr(element, 'zIndex'),
			otherElement,
			otherZIndex,
			i;

		// mark as inverted
		this.parentInverted = parent && parent.inverted;

		// build formatted text
		if (this.textStr !== undefined) {
			renderer.buildText(this);
		}

		// register html spans in groups
		if (parent && this.htmlNode) {
			if (!parent.htmlNode) {
				parent.htmlNode = [];
			}
			parent.htmlNode.push(this);
		}

		// mark the container as having z indexed children
		if (zIndex) {
			parentWrapper.handleZ = true;
			zIndex = pInt(zIndex);
		}

		// insert according to this and other elements' zIndex
		if (parentWrapper.handleZ) { // this element or any of its siblings has a z index
			for (i = 0; i < childNodes.length; i++) {
				otherElement = childNodes[i];
				otherZIndex = attr(otherElement, 'zIndex');
				if (otherElement !== element && (
						// insert before the first element with a higher zIndex
						pInt(otherZIndex) > zIndex ||
						// if no zIndex given, insert before the first element with a zIndex
						(!defined(zIndex) && defined(otherZIndex))

						)) {
					parentNode.insertBefore(element, otherElement);
					return this;
				}
			}
		}

		// default: append at the end
		parentNode.appendChild(element);

		this.added = true;

		return this;
	},

	/**
	 * Destroy the element and element wrapper
	 */
	destroy: function () {
		var wrapper = this,
			element = wrapper.element || {},
			shadows = wrapper.shadows,
			parentNode = element.parentNode,
			key,
			i;

		// remove events
		element.onclick = element.onmouseout = element.onmouseover = element.onmousemove = null;
		stop(wrapper); // stop running animations

		if (wrapper.clipPath) {
			wrapper.clipPath = wrapper.clipPath.destroy();
		}

		// Destroy stops in case this is a gradient object
		if (wrapper.stops) {
			for (i = 0; i < wrapper.stops.length; i++) {
				wrapper.stops[i] = wrapper.stops[i].destroy();
			}
			wrapper.stops = null;
		}

		// remove element
		if (parentNode) {
			parentNode.removeChild(element);
		}

		// destroy shadows
		if (shadows) {
			each(shadows, function (shadow) {
				parentNode = shadow.parentNode;
				if (parentNode) { // the entire chart HTML can be overwritten
					parentNode.removeChild(shadow);
				}
			});
		}

		// remove from alignObjects
		erase(wrapper.renderer.alignedObjects, wrapper);

		for (key in wrapper) {
			delete wrapper[key];
		}

		return null;
	},

	/**
	 * Empty a group element
	 */
	empty: function () {
		var element = this.element,
			childNodes = element.childNodes,
			i = childNodes.length;

		while (i--) {
			element.removeChild(childNodes[i]);
		}
	},

	/**
	 * Add a shadow to the element. Must be done after the element is added to the DOM
	 * @param {Boolean} apply
	 */
	shadow: function (apply, group) {
		var shadows = [],
			i,
			shadow,
			element = this.element,

			// compensate for inverted plot area
			transform = this.parentInverted ? '(-1,-1)' : '(1,1)';


		if (apply) {
			for (i = 1; i <= 3; i++) {
				shadow = element.cloneNode(0);
				attr(shadow, {
					'isShadow': 'true',
					'stroke': 'rgb(0, 0, 0)',
					'stroke-opacity': 0.05 * i,
					'stroke-width': 7 - 2 * i,
					'transform': 'translate' + transform,
					'fill': NONE
				});

				if (group) {
					group.element.appendChild(shadow);
				} else {
					element.parentNode.insertBefore(shadow, element);
				}

				shadows.push(shadow);
			}

			this.shadows = shadows;
		}
		return this;

	}
};

/**
 * The default SVG renderer
 */
var SVGRenderer = function () {
	this.init.apply(this, arguments);
};
SVGRenderer.prototype = {

	Element: SVGElement,

	/**
	 * Initialize the SVGRenderer
	 * @param {Object} container
	 * @param {Number} width
	 * @param {Number} height
	 * @param {Boolean} forExport
	 */
	init: function (container, width, height, forExport) {
		var renderer = this,
			loc = location,
			boxWrapper;

		boxWrapper = renderer.createElement('svg')
			.attr({
				xmlns: SVG_NS,
				version: '1.1'
			});
		container.appendChild(boxWrapper.element);

		// object properties
		renderer.box = boxWrapper.element;
		renderer.boxWrapper = boxWrapper;
		renderer.alignedObjects = [];
		renderer.url = isIE ? '' : loc.href.replace(/#.*?$/, ''); // page url used for internal references
		renderer.defs = this.createElement('defs').add();
		renderer.forExport = forExport;
		renderer.gradients = []; // Array where gradient SvgElements are stored

		renderer.setSize(width, height, false);

	},

	/**
	 * Destroys the renderer and its allocated members.
	 */
	destroy: function () {
		var renderer = this,
			i,
			rendererGradients = renderer.gradients,
			rendererDefs = renderer.defs;
		renderer.box = null;
		renderer.boxWrapper = renderer.boxWrapper.destroy();

		// Call destroy on all gradient elements
		if (rendererGradients) { // gradients are null in VMLRenderer
			for (i = 0; i < rendererGradients.length; i++) {
				renderer.gradients[i] = rendererGradients[i].destroy();
			}
			renderer.gradients = null;
		}

		// Defs are null in VMLRenderer
		// Otherwise, destroy them here.
		if (rendererDefs) {
			renderer.defs = rendererDefs.destroy();
		}

		renderer.alignedObjects = null;

		return null;
	},

	/**
	 * Create a wrapper for an SVG element
	 * @param {Object} nodeName
	 */
	createElement: function (nodeName) {
		var wrapper = new this.Element();
		wrapper.init(this, nodeName);
		return wrapper;
	},


	/**
	 * Parse a simple HTML string into SVG tspans
	 *
	 * @param {Object} textNode The parent text SVG node
	 */
	buildText: function (wrapper) {
		var textNode = wrapper.element,
			lines = pick(wrapper.textStr, '').toString()
				.replace(/<(b|strong)>/g, '<span style="font-weight:bold">')
				.replace(/<(i|em)>/g, '<span style="font-style:italic">')
				.replace(/<a/g, '<span')
				.replace(/<\/(b|strong|i|em|a)>/g, '</span>')
				.split(/<br.*?>/g),
			childNodes = textNode.childNodes,
			styleRegex = /style="([^"]+)"/,
			hrefRegex = /href="([^"]+)"/,
			parentX = attr(textNode, 'x'),
			textStyles = wrapper.styles,
			renderAsHtml = textStyles && wrapper.useHTML && !this.forExport,
			htmlNode = wrapper.htmlNode,
			//arr, issue #38 workaround
			width = textStyles && pInt(textStyles.width),
			textLineHeight = textStyles && textStyles.lineHeight,
			lastLine,
			GET_COMPUTED_STYLE = 'getComputedStyle',
			i = childNodes.length;

		// remove old text
		while (i--) {
			textNode.removeChild(childNodes[i]);
		}

		if (width && !wrapper.added) {
			this.box.appendChild(textNode); // attach it to the DOM to read offset width
		}

		each(lines, function (line, lineNo) {
			var spans, spanNo = 0, lineHeight;

			line = line.replace(/<span/g, '|||<span').replace(/<\/span>/g, '</span>|||');
			spans = line.split('|||');

			each(spans, function (span) {
				if (span !== '' || spans.length === 1) {
					var attributes = {},
						tspan = doc.createElementNS(SVG_NS, 'tspan');
					if (styleRegex.test(span)) {
						attr(
							tspan,
							'style',
							span.match(styleRegex)[1].replace(/(;| |^)color([ :])/, '$1fill$2')
						);
					}
					if (hrefRegex.test(span)) {
						attr(tspan, 'onclick', 'location.href=\"' + span.match(hrefRegex)[1] + '\"');
						css(tspan, { cursor: 'pointer' });
					}

					span = (span.replace(/<(.|\n)*?>/g, '') || ' ')
						.replace(/&lt;/g, '<')
						.replace(/&gt;/g, '>');

					// issue #38 workaround.
					/*if (reverse) {
						arr = [];
						i = span.length;
						while (i--) {
							arr.push(span.charAt(i));
						}
						span = arr.join('');
					}*/

					// add the text node
					tspan.appendChild(doc.createTextNode(span));

					if (!spanNo) { // first span in a line, align it to the left
						attributes.x = parentX;
					} else {
						// Firefox ignores spaces at the front or end of the tspan
						attributes.dx = 3; // space
					}

					// first span on subsequent line, add the line height
					if (!spanNo) {
						if (lineNo) {

							// allow getting the right offset height in exporting in IE
							if (!hasSVG && wrapper.renderer.forExport) {
								css(tspan, { display: 'block' });
							}

							// Webkit and opera sometimes return 'normal' as the line height. In that
							// case, webkit uses offsetHeight, while Opera falls back to 18
							lineHeight = win[GET_COMPUTED_STYLE] &&
								pInt(win[GET_COMPUTED_STYLE](lastLine, null).getPropertyValue('line-height'));

							if (!lineHeight || isNaN(lineHeight)) {
								lineHeight = textLineHeight || lastLine.offsetHeight || 18;
							}
							attr(tspan, 'dy', lineHeight);
						}
						lastLine = tspan; // record for use in next line
					}

					// add attributes
					attr(tspan, attributes);

					// append it
					textNode.appendChild(tspan);

					spanNo++;

					// check width and apply soft breaks
					
					// PATCH by Simon Fishel
                    // - if (width) {
                    // + if (false && width) {
                    // disabling soft breaks because we are coercing our time-based
                    // axes to categories where we only label a subset of the ticks
					
					if (false && width) {
						var words = span.replace(/-/g, '- ').split(' '),
							tooLong,
							actualWidth,
							rest = [];

						while (words.length || rest.length) {
							actualWidth = textNode.getBBox().width;
							tooLong = actualWidth > width;
							if (!tooLong || words.length === 1) { // new line needed
								words = rest;
								rest = [];
								if (words.length) {
									tspan = doc.createElementNS(SVG_NS, 'tspan');
									attr(tspan, {
										dy: textLineHeight || 16,
										x: parentX
									});
									textNode.appendChild(tspan);

									if (actualWidth > width) { // a single word is pressing it out
										width = actualWidth;
									}
								}
							} else { // append to existing line tspan
								tspan.removeChild(tspan.firstChild);
								rest.unshift(words.pop());
							}
							if (words.length) {
								tspan.appendChild(doc.createTextNode(words.join(' ').replace(/- /g, '-')));
							}
						}
					}
				}
			});
		});

		// Fix issue #38 and allow HTML in tooltips and other labels
		if (renderAsHtml) {
			if (!htmlNode) {
				htmlNode = wrapper.htmlNode = createElement('span', null, extend(textStyles, {
					position: ABSOLUTE,
					top: 0,
					left: 0
				}), this.box.parentNode);
			}
			htmlNode.innerHTML = wrapper.textStr;

			i = childNodes.length;
			while (i--) {
				childNodes[i].style.visibility = HIDDEN;
			}
		}
	},

	/**
	 * Make a straight line crisper by not spilling out to neighbour pixels
	 * @param {Array} points
	 * @param {Number} width
	 */
	crispLine: function (points, width) {
		// points format: [M, 0, 0, L, 100, 0]
		// normalize to a crisp line
		if (points[1] === points[4]) {
			points[1] = points[4] = mathRound(points[1]) + (width % 2 / 2);
		}
		if (points[2] === points[5]) {
			points[2] = points[5] = mathRound(points[2]) + (width % 2 / 2);
		}
		return points;
	},


	/**
	 * Draw a path
	 * @param {Array} path An SVG path in array form
	 */
	path: function (path) {
		return this.createElement('path').attr({
			d: path,
			fill: NONE
		});
	},

	/**
	 * Draw and return an SVG circle
	 * @param {Number} x The x position
	 * @param {Number} y The y position
	 * @param {Number} r The radius
	 */
	circle: function (x, y, r) {
		var attr = isObject(x) ?
			x :
			{
				x: x,
				y: y,
				r: r
			};

		return this.createElement('circle').attr(attr);
	},

	/**
	 * Draw and return an arc
	 * @param {Number} x X position
	 * @param {Number} y Y position
	 * @param {Number} r Radius
	 * @param {Number} innerR Inner radius like used in donut charts
	 * @param {Number} start Starting angle
	 * @param {Number} end Ending angle
	 */
	arc: function (x, y, r, innerR, start, end) {
		// arcs are defined as symbols for the ability to set
		// attributes in attr and animate

		if (isObject(x)) {
			y = x.y;
			r = x.r;
			innerR = x.innerR;
			start = x.start;
			end = x.end;
			x = x.x;
		}

		return this.symbol('arc', x || 0, y || 0, r || 0, {
			innerR: innerR || 0,
			start: start || 0,
			end: end || 0
		});
	},

	/**
	 * Draw and return a rectangle
	 * @param {Number} x Left position
	 * @param {Number} y Top position
	 * @param {Number} width
	 * @param {Number} height
	 * @param {Number} r Border corner radius
	 * @param {Number} strokeWidth A stroke width can be supplied to allow crisp drawing
	 */
	rect: function (x, y, width, height, r, strokeWidth) {
		if (isObject(x)) {
			y = x.y;
			width = x.width;
			height = x.height;
			r = x.r;
			strokeWidth = x.strokeWidth;
			x = x.x;
		}
		var wrapper = this.createElement('rect').attr({
			rx: r,
			ry: r,
			fill: NONE
		});

		return wrapper.attr(wrapper.crisp(strokeWidth, x, y, mathMax(width, 0), mathMax(height, 0)));
	},

	/**
	 * Resize the box and re-align all aligned elements
	 * @param {Object} width
	 * @param {Object} height
	 * @param {Boolean} animate
	 *
	 */
	setSize: function (width, height, animate) {
		var renderer = this,
			alignedObjects = renderer.alignedObjects,
			i = alignedObjects.length;

		renderer.width = width;
		renderer.height = height;

		renderer.boxWrapper[pick(animate, true) ? 'animate' : 'attr']({
			width: width,
			height: height
		});

		while (i--) {
			alignedObjects[i].align();
		}
	},

	/**
	 * Create a group
	 * @param {String} name The group will be given a class name of 'highcharts-{name}'.
	 *     This can be used for styling and scripting.
	 */
	g: function (name) {
		var elem = this.createElement('g');
		return defined(name) ? elem.attr({ 'class': PREFIX + name }) : elem;
	},

	/**
	 * Display an image
	 * @param {String} src
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 */
	image: function (src, x, y, width, height) {
		var attribs = {
				preserveAspectRatio: NONE
			},
			elemWrapper;

		// optional properties
		if (arguments.length > 1) {
			extend(attribs, {
				x: x,
				y: y,
				width: width,
				height: height
			});
		}

		elemWrapper = this.createElement('image').attr(attribs);

		// set the href in the xlink namespace
		if (elemWrapper.element.setAttributeNS) {
			elemWrapper.element.setAttributeNS('http://www.w3.org/1999/xlink',
				'href', src);
		} else {
			// could be exporting in IE
			// using href throws "not supported" in ie7 and under, requries regex shim to fix later
			elemWrapper.element.setAttribute('hc-svg-href', src);
		}

		return elemWrapper;
	},

	/**
	 * Draw a symbol out of pre-defined shape paths from the namespace 'symbol' object.
	 *
	 * @param {Object} symbol
	 * @param {Object} x
	 * @param {Object} y
	 * @param {Object} radius
	 * @param {Object} options
	 */
	symbol: function (symbol, x, y, radius, options) {

		var obj,

			// get the symbol definition function
			symbolFn = this.symbols[symbol],

			// check if there's a path defined for this symbol
			path = symbolFn && symbolFn(
				mathRound(x),
				mathRound(y),
				radius,
				options
			),

			imageRegex = /^url\((.*?)\)$/,
			imageSrc,
			imageSize;

		if (path) {

			obj = this.path(path);
			// expando properties for use in animate and attr
			extend(obj, {
				symbolName: symbol,
				x: x,
				y: y,
				r: radius
			});
			if (options) {
				extend(obj, options);
			}


		// image symbols
		} else if (imageRegex.test(symbol)) {

			var centerImage = function (img, size) {
				img.attr({
					width: size[0],
					height: size[1]
				}).translate(
					-mathRound(size[0] / 2),
					-mathRound(size[1] / 2)
				);
			};

			imageSrc = symbol.match(imageRegex)[1];
			imageSize = symbolSizes[imageSrc];

			// create the image synchronously, add attribs async
			obj = this.image(imageSrc)
				.attr({
					x: x,
					y: y
				});

			if (imageSize) {
				centerImage(obj, imageSize);
			} else {
				// initialize image to be 0 size so export will still function if there's no cached sizes
				obj.attr({ width: 0, height: 0 });

				// create a dummy JavaScript image to get the width and height
				createElement('img', {
					onload: function () {
						var img = this;
						centerImage(obj, symbolSizes[imageSrc] = [img.width, img.height]);
					},
					src: imageSrc
				});
			}

		// default circles
		} else {
			obj = this.circle(x, y, radius);
		}

		return obj;
	},

	/**
	 * An extendable collection of functions for defining symbol paths.
	 */
	symbols: {
		'square': function (x, y, radius) {
			var len = 0.707 * radius;
			return [
				M, x - len, y - len,
				L, x + len, y - len,
				x + len, y + len,
				x - len, y + len,
				'Z'
			];
		},

		'triangle': function (x, y, radius) {
			return [
				M, x, y - 1.33 * radius,
				L, x + radius, y + 0.67 * radius,
				x - radius, y + 0.67 * radius,
				'Z'
			];
		},

		'triangle-down': function (x, y, radius) {
			return [
				M, x, y + 1.33 * radius,
				L, x - radius, y - 0.67 * radius,
				x + radius, y - 0.67 * radius,
				'Z'
			];
		},
		'diamond': function (x, y, radius) {
			return [
				M, x, y - radius,
				L, x + radius, y,
				x, y + radius,
				x - radius, y,
				'Z'
			];
		},
		'arc': function (x, y, radius, options) {
			var start = options.start,
				end = options.end - 0.000001, // to prevent cos and sin of start and end from becoming equal on 360 arcs
				innerRadius = options.innerR,
				cosStart = mathCos(start),
				sinStart = mathSin(start),
				cosEnd = mathCos(end),
				sinEnd = mathSin(end),
				longArc = options.end - start < mathPI ? 0 : 1;

			return [
				M,
				x + radius * cosStart,
				y + radius * sinStart,
				'A', // arcTo
				radius, // x radius
				radius, // y radius
				0, // slanting
				longArc, // long or short arc
				1, // clockwise
				x + radius * cosEnd,
				y + radius * sinEnd,
				L,
				x + innerRadius * cosEnd,
				y + innerRadius * sinEnd,
				'A', // arcTo
				innerRadius, // x radius
				innerRadius, // y radius
				0, // slanting
				longArc, // long or short arc
				0, // clockwise
				x + innerRadius * cosStart,
				y + innerRadius * sinStart,

				'Z' // close
			];
		}
	},

	/**
	 * Define a clipping rectangle
	 * @param {String} id
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 */
	clipRect: function (x, y, width, height) {
		var wrapper,
			id = PREFIX + idCounter++,

			clipPath = this.createElement('clipPath').attr({
				id: id
			}).add(this.defs);

		wrapper = this.rect(x, y, width, height, 0).add(clipPath);
		wrapper.id = id;
		wrapper.clipPath = clipPath;

		return wrapper;
	},


	/**
	 * Take a color and return it if it's a string, make it a gradient if it's a
	 * gradient configuration object
	 *
	 * @param {Object} color The color or config object
	 */
	color: function (color, elem, prop) {
		var colorObject,
			regexRgba = /^rgba/;
		if (color && color.linearGradient) {
			var renderer = this,
				strLinearGradient = 'linearGradient',
				linearGradient = color[strLinearGradient],
				id = PREFIX + idCounter++,
				gradientObject,
				stopColor,
				stopOpacity;
			gradientObject = renderer.createElement(strLinearGradient).attr({
				id: id,
				gradientUnits: 'userSpaceOnUse',
				x1: linearGradient[0],
				y1: linearGradient[1],
				x2: linearGradient[2],
				y2: linearGradient[3]
			}).add(renderer.defs);

			// Keep a reference to the gradient object so it is possible to destroy it later
			renderer.gradients.push(gradientObject);

			// The gradient needs to keep a list of stops to be able to destroy them
			gradientObject.stops = [];
			each(color.stops, function (stop) {
				var stopObject;
				if (regexRgba.test(stop[1])) {
					colorObject = Color(stop[1]);
					stopColor = colorObject.get('rgb');
					stopOpacity = colorObject.get('a');
				} else {
					stopColor = stop[1];
					stopOpacity = 1;
				}
				stopObject = renderer.createElement('stop').attr({
					offset: stop[0],
					'stop-color': stopColor,
					'stop-opacity': stopOpacity
				}).add(gradientObject);

				// Add the stop element to the gradient
				gradientObject.stops.push(stopObject);
			});

			return 'url(' + this.url + '#' + id + ')';

		// Webkit and Batik can't show rgba.
		} else if (regexRgba.test(color)) {
			colorObject = Color(color);
			attr(elem, prop + '-opacity', colorObject.get('a'));

			return colorObject.get('rgb');


		} else {
			// Remove the opacity attribute added above. Does not throw if the attribute is not there.
			elem.removeAttribute(prop + '-opacity');

			return color;
		}

	},


	/**
	 * Add text to the SVG object
	 * @param {String} str
	 * @param {Number} x Left position
	 * @param {Number} y Top position
	 * @param {Boolean} useHTML Use HTML to render the text
	 */
	text: function (str, x, y, useHTML) {

		// declare variables
		var defaultChartStyle = defaultOptions.chart.style,
			wrapper;

		x = mathRound(pick(x, 0));
		y = mathRound(pick(y, 0));

		wrapper = this.createElement('text')
			.attr({
				x: x,
				y: y,
				text: str
			})
			.css({
				fontFamily: defaultChartStyle.fontFamily,
				fontSize: defaultChartStyle.fontSize
			});

		wrapper.x = x;
		wrapper.y = y;
		wrapper.useHTML = useHTML;
		return wrapper;
	}
}; // end SVGRenderer

// general renderer
Renderer = SVGRenderer;



/* ****************************************************************************
 *                                                                            *
 * START OF INTERNET EXPLORER <= 8 SPECIFIC CODE                              *
 *                                                                            *
 * For applications and websites that don't need IE support, like platform    *
 * targeted mobile apps and web apps, this code can be removed.               *
 *                                                                            *
 *****************************************************************************/
var VMLRenderer;
if (!hasSVG) {

/**
 * The VML element wrapper.
 */
var VMLElement = extendClass(SVGElement, {

	/**
	 * Initialize a new VML element wrapper. It builds the markup as a string
	 * to minimize DOM traffic.
	 * @param {Object} renderer
	 * @param {Object} nodeName
	 */
	init: function (renderer, nodeName) {
		var markup =  ['<', nodeName, ' filled="f" stroked="f"'],
			style = ['position: ', ABSOLUTE, ';'];

		// divs and shapes need size
		if (nodeName === 'shape' || nodeName === DIV) {
			style.push('left:0;top:0;width:10px;height:10px;');
		}
		if (docMode8) {
			style.push('visibility: ', nodeName === DIV ? HIDDEN : VISIBLE);
		}

		markup.push(' style="', style.join(''), '"/>');

		// create element with default attributes and style
		if (nodeName) {
			markup = nodeName === DIV || nodeName === 'span' || nodeName === 'img' ?
				markup.join('')
				: renderer.prepVML(markup);
			this.element = createElement(markup);
		}

		this.renderer = renderer;
	},

	/**
	 * Add the node to the given parent
	 * @param {Object} parent
	 */
	add: function (parent) {
		var wrapper = this,
			renderer = wrapper.renderer,
			element = wrapper.element,
			box = renderer.box,
			inverted = parent && parent.inverted,

			// get the parent node
			parentNode = parent ?
				parent.element || parent :
				box;


		// if the parent group is inverted, apply inversion on all children
		if (inverted) { // only on groups
			renderer.invertChild(element, parentNode);
		}

		// issue #140 workaround - related to #61 and #74
		if (docMode8 && parentNode.gVis === HIDDEN) {
			css(element, { visibility: HIDDEN });
		}

		// append it
		parentNode.appendChild(element);

		// align text after adding to be able to read offset
		wrapper.added = true;
		if (wrapper.alignOnAdd) {
			wrapper.updateTransform();
		}

		return wrapper;
	},

	/**
	 * Get or set attributes
	 */
	attr: function (hash, val) {
		var key,
			value,
			i,
			element = this.element || {},
			elemStyle = element.style,
			nodeName = element.nodeName,
			renderer = this.renderer,
			symbolName = this.symbolName,
			childNodes,
			hasSetSymbolSize,
			shadows = this.shadows,
			skipAttr,
			ret = this;

		// single key-value pair
		if (isString(hash) && defined(val)) {
			key = hash;
			hash = {};
			hash[key] = val;
		}

		// used as a getter, val is undefined
		if (isString(hash)) {
			key = hash;
			if (key === 'strokeWidth' || key === 'stroke-width') {
				ret = this.strokeweight;
			} else {
				ret = this[key];
			}

		// setter
		} else {
			for (key in hash) {
				value = hash[key];
				skipAttr = false;

				// prepare paths
				// symbols
				if (symbolName && /^(x|y|r|start|end|width|height|innerR)/.test(key)) {
					// if one of the symbol size affecting parameters are changed,
					// check all the others only once for each call to an element's
					// .attr() method
					if (!hasSetSymbolSize) {
						this.symbolAttr(hash);

						hasSetSymbolSize = true;
					}

					skipAttr = true;

				} else if (key === 'd') {
					value = value || [];
					this.d = value.join(' '); // used in getter for animation

					// convert paths
					i = value.length;
					var convertedPath = [];
					while (i--) {

						// Multiply by 10 to allow subpixel precision.
						// Substracting half a pixel seems to make the coordinates
						// align with SVG, but this hasn't been tested thoroughly
						if (isNumber(value[i])) {
							convertedPath[i] = mathRound(value[i] * 10) - 5;
						} else if (value[i] === 'Z') { // close the path
							convertedPath[i] = 'x';
						} else {
							convertedPath[i] = value[i];
						}

					}
					value = convertedPath.join(' ') || 'x';
					element.path = value;

					// update shadows
					if (shadows) {
						i = shadows.length;
						while (i--) {
							shadows[i].path = value;
						}
					}
					skipAttr = true;

				// directly mapped to css
				} else if (key === 'zIndex' || key === 'visibility') {

					// issue 61 workaround
					if (docMode8 && key === 'visibility' && nodeName === 'DIV') {
						element.gVis = value;
						childNodes = element.childNodes;
						i = childNodes.length;
						while (i--) {
							css(childNodes[i], { visibility: value });
						}
						if (value === VISIBLE) { // issue 74
							value = null;
						}
					}

					if (value) {
						elemStyle[key] = value;
					}



					skipAttr = true;

				// width and height
				} else if (/^(width|height)$/.test(key)) {

					this[key] = value; // used in getter

					// clipping rectangle special
					if (this.updateClipping) {
						this[key] = value;
						this.updateClipping();

					} else {
						// normal
						elemStyle[key] = value;
					}

					skipAttr = true;

				// x and y
				} else if (/^(x|y)$/.test(key)) {

					this[key] = value; // used in getter

					if (element.tagName === 'SPAN') {
						this.updateTransform();

					} else {
						elemStyle[{ x: 'left', y: 'top' }[key]] = value;
					}

				// class name
				} else if (key === 'class') {
					// IE8 Standards mode has problems retrieving the className
					element.className = value;

				// stroke
				} else if (key === 'stroke') {

					value = renderer.color(value, element, key);

					key = 'strokecolor';

				// stroke width
				} else if (key === 'stroke-width' || key === 'strokeWidth') {
					element.stroked = value ? true : false;
					key = 'strokeweight';
					this[key] = value; // used in getter, issue #113
					if (isNumber(value)) {
						value += PX;
					}

				// dashStyle
				} else if (key === 'dashstyle') {
					var strokeElem = element.getElementsByTagName('stroke')[0] ||
						createElement(renderer.prepVML(['<stroke/>']), null, null, element);
					strokeElem[key] = value || 'solid';
					this.dashstyle = value; /* because changing stroke-width will change the dash length
						and cause an epileptic effect */
					skipAttr = true;

				// fill
				} else if (key === 'fill') {

					if (nodeName === 'SPAN') { // text color
						elemStyle.color = value;
					} else {
						element.filled = value !== NONE ? true : false;

						value = renderer.color(value, element, key);

						key = 'fillcolor';
					}

				// translation for animation
				} else if (key === 'translateX' || key === 'translateY' || key === 'rotation' || key === 'align') {
					if (key === 'align') {
						key = 'textAlign';
					}
					this[key] = value;
					this.updateTransform();

					skipAttr = true;
				} else if (key === 'text') { // text for rotated and non-rotated elements
					this.bBox = null;
					element.innerHTML = value;
					skipAttr = true;
				}


				// let the shadow follow the main element
				if (shadows && key === 'visibility') {
					i = shadows.length;
					while (i--) {
						shadows[i].style[key] = value;
					}
				}



				if (!skipAttr) {
					if (docMode8) { // IE8 setAttribute bug
						element[key] = value;
					} else {
						attr(element, key, value);
					}
				}
			}
		}
		return ret;
	},

	/**
	 * Set the element's clipping to a predefined rectangle
	 *
	 * @param {String} id The id of the clip rectangle
	 */
	clip: function (clipRect) {
		var wrapper = this,
			clipMembers = clipRect.members;

		clipMembers.push(wrapper);
		wrapper.destroyClip = function () {
			erase(clipMembers, wrapper);
		};
		return wrapper.css(clipRect.getCSS(wrapper.inverted));
	},

	/**
	 * Set styles for the element
	 * @param {Object} styles
	 */
	css: function (styles) {
		var wrapper = this,
			element = wrapper.element,
			textWidth = styles && element.tagName === 'SPAN' && styles.width;

		/*if (textWidth) {
			extend(styles, {
				display: 'block',
				whiteSpace: 'normal'
			});
		}*/
		if (textWidth) {
			delete styles.width;
			wrapper.textWidth = textWidth;
			wrapper.updateTransform();
		}

		wrapper.styles = extend(wrapper.styles, styles);
		css(wrapper.element, styles);

		return wrapper;
	},

	/**
	 * Extend element.destroy by removing it from the clip members array
	 */
	destroy: function () {
		var wrapper = this;

		if (wrapper.destroyClip) {
			wrapper.destroyClip();
		}

		return SVGElement.prototype.destroy.apply(wrapper);
	},

	/**
	 * Remove all child nodes of a group, except the v:group element
	 */
	empty: function () {
		var element = this.element,
			childNodes = element.childNodes,
			i = childNodes.length,
			node;

		while (i--) {
			node = childNodes[i];
			node.parentNode.removeChild(node);
		}
	},

	/**
	 * VML override for calculating the bounding box based on offsets
	 *
	 * @return {Object} A hash containing values for x, y, width and height
	 */

	getBBox: function () {
		var wrapper = this,
			element = wrapper.element,
			bBox = wrapper.bBox;

		if (!bBox) {
			// faking getBBox in exported SVG in legacy IE
			if (element.nodeName === 'text') {
				element.style.position = ABSOLUTE;
			}

			bBox = wrapper.bBox = {
				x: element.offsetLeft,
				y: element.offsetTop,
				width: element.offsetWidth,
				height: element.offsetHeight
			};
		}
		return bBox;

	},

	/**
	 * Add an event listener. VML override for normalizing event parameters.
	 * @param {String} eventType
	 * @param {Function} handler
	 */
	on: function (eventType, handler) {
		// simplest possible event model for internal use
		this.element['on' + eventType] = function () {
			var evt = win.event;
			evt.target = evt.srcElement;
			handler(evt);
		};
		return this;
	},


	/**
	 * VML override private method to update elements based on internal
	 * properties based on SVG transform
	 */
	updateTransform: function () {
		// aligning non added elements is expensive
		if (!this.added) {
			this.alignOnAdd = true;
			return;
		}

		var wrapper = this,
			elem = wrapper.element,
			translateX = wrapper.translateX || 0,
			translateY = wrapper.translateY || 0,
			x = wrapper.x || 0,
			y = wrapper.y || 0,
			align = wrapper.textAlign || 'left',
			alignCorrection = { left: 0, center: 0.5, right: 1 }[align],
			nonLeft = align && align !== 'left';

		// apply translate
		if (translateX || translateY) {
			wrapper.css({
				marginLeft: translateX,
				marginTop: translateY
			});
		}

		// apply inversion
		if (wrapper.inverted) { // wrapper is a group
			each(elem.childNodes, function (child) {
				wrapper.renderer.invertChild(child, elem);
			});
		}

		if (elem.tagName === 'SPAN') {

			var width, height,
				rotation = wrapper.rotation,
				lineHeight,
				radians = 0,
				costheta = 1,
				sintheta = 0,
				quad,
				textWidth = pInt(wrapper.textWidth),
				xCorr = wrapper.xCorr || 0,
				yCorr = wrapper.yCorr || 0,
				currentTextTransform = [rotation, align, elem.innerHTML, wrapper.textWidth].join(',');

			if (currentTextTransform !== wrapper.cTT) { // do the calculations and DOM access only if properties changed

				if (defined(rotation)) {
					radians = rotation * deg2rad; // deg to rad
					costheta = mathCos(radians);
					sintheta = mathSin(radians);

					// Adjust for alignment and rotation.
					// Test case: http://highcharts.com/tests/?file=text-rotation
					css(elem, {
						filter: rotation ? ['progid:DXImageTransform.Microsoft.Matrix(M11=', costheta,
							', M12=', -sintheta, ', M21=', sintheta, ', M22=', costheta,
							', sizingMethod=\'auto expand\')'].join('') : NONE
					});
				}

				width = elem.offsetWidth;
				height = elem.offsetHeight;

				// update textWidth
				if (width > textWidth) {
					css(elem, {
						width: textWidth + PX,
						display: 'block',
						whiteSpace: 'normal'
					});
					width = textWidth;
				}

				// correct x and y
				lineHeight = mathRound((pInt(elem.style.fontSize) || 12) * 1.2);
				xCorr = costheta < 0 && -width;
				yCorr = sintheta < 0 && -height;

				// correct for lineHeight and corners spilling out after rotation
				quad = costheta * sintheta < 0;
				xCorr += sintheta * lineHeight * (quad ? 1 - alignCorrection : alignCorrection);
				yCorr -= costheta * lineHeight * (rotation ? (quad ? alignCorrection : 1 - alignCorrection) : 1);

				// correct for the length/height of the text
				if (nonLeft) {
					xCorr -= width * alignCorrection * (costheta < 0 ? -1 : 1);
					if (rotation) {
						yCorr -= height * alignCorrection * (sintheta < 0 ? -1 : 1);
					}
					css(elem, {
						textAlign: align
					});
				}

				// record correction
				wrapper.xCorr = xCorr;
				wrapper.yCorr = yCorr;
			}

			// apply position with correction
			css(elem, {
				left: x + xCorr,
				top: y + yCorr
			});

			// record current text transform
			wrapper.cTT = currentTextTransform;
		}
	},

	/**
	 * Apply a drop shadow by copying elements and giving them different strokes
	 * @param {Boolean} apply
	 */
	shadow: function (apply, group) {
		var shadows = [],
			i,
			element = this.element,
			renderer = this.renderer,
			shadow,
			elemStyle = element.style,
			markup,
			path = element.path;

		// some times empty paths are not strings
		if (path && typeof path.value !== 'string') {
			path = 'x';
		}

		if (apply) {
			for (i = 1; i <= 3; i++) {
				markup = ['<shape isShadow="true" strokeweight="', (7 - 2 * i),
					'" filled="false" path="', path,
					'" coordsize="100,100" style="', element.style.cssText, '" />'];
				shadow = createElement(renderer.prepVML(markup),
					null, {
						left: pInt(elemStyle.left) + 1,
						top: pInt(elemStyle.top) + 1
					}
				);

				// apply the opacity
				markup = ['<stroke color="black" opacity="', (0.05 * i), '"/>'];
				createElement(renderer.prepVML(markup), null, null, shadow);


				// insert it
				if (group) {
					group.element.appendChild(shadow);
				} else {
					element.parentNode.insertBefore(shadow, element);
				}

				// record it
				shadows.push(shadow);

			}

			this.shadows = shadows;
		}
		return this;

	}
});

/**
 * The VML renderer
 */
VMLRenderer = function () {
	this.init.apply(this, arguments);
};
VMLRenderer.prototype = merge(SVGRenderer.prototype, { // inherit SVGRenderer

	Element: VMLElement,
	isIE8: userAgent.indexOf('MSIE 8.0') > -1,


	/**
	 * Initialize the VMLRenderer
	 * @param {Object} container
	 * @param {Number} width
	 * @param {Number} height
	 */
	init: function (container, width, height) {
		var renderer = this,
			boxWrapper;

		renderer.alignedObjects = [];

		boxWrapper = renderer.createElement(DIV);
		container.appendChild(boxWrapper.element);


		// generate the containing box
		renderer.box = boxWrapper.element;
		renderer.boxWrapper = boxWrapper;


		renderer.setSize(width, height, false);

		// The only way to make IE6 and IE7 print is to use a global namespace. However,
		// with IE8 the only way to make the dynamic shapes visible in screen and print mode
		// seems to be to add the xmlns attribute and the behaviour style inline.
		if (!doc.namespaces.hcv) {

			doc.namespaces.add('hcv', 'urn:schemas-microsoft-com:vml');

			// setup default css
			doc.createStyleSheet().cssText =
				'hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke' +
				'{ behavior:url(#default#VML); display: inline-block; } ';

		}
	},

	/**
	 * Define a clipping rectangle. In VML it is accomplished by storing the values
	 * for setting the CSS style to all associated members.
	 *
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 */
	clipRect: function (x, y, width, height) {

		// create a dummy element
		var clipRect = this.createElement();

		// mimic a rectangle with its style object for automatic updating in attr
		return extend(clipRect, {
			members: [],
			left: x,
			top: y,
			width: width,
			height: height,
			getCSS: function (inverted) {
				var rect = this,//clipRect.element.style,
					top = rect.top,
					left = rect.left,
					right = left + rect.width,
					bottom = top + rect.height,
					ret = {
						clip: 'rect(' +
							mathRound(inverted ? left : top) + 'px,' +
							mathRound(inverted ? bottom : right) + 'px,' +
							mathRound(inverted ? right : bottom) + 'px,' +
							mathRound(inverted ? top : left) + 'px)'
					};

				// issue 74 workaround
				if (!inverted && docMode8) {
					extend(ret, {
						width: right + PX,
						height: bottom + PX
					});
				}
				return ret;
			},

			// used in attr and animation to update the clipping of all members
			updateClipping: function () {
				each(clipRect.members, function (member) {
					member.css(clipRect.getCSS(member.inverted));
				});
			}
		});

	},


	/**
	 * Take a color and return it if it's a string, make it a gradient if it's a
	 * gradient configuration object, and apply opacity.
	 *
	 * @param {Object} color The color or config object
	 */
	color: function (color, elem, prop) {
		var colorObject,
			regexRgba = /^rgba/,
			markup;

		if (color && color.linearGradient) {

			var stopColor,
				stopOpacity,
				linearGradient = color.linearGradient,
				angle,
				color1,
				opacity1,
				color2,
				opacity2;

			each(color.stops, function (stop, i) {
				if (regexRgba.test(stop[1])) {
					colorObject = Color(stop[1]);
					stopColor = colorObject.get('rgb');
					stopOpacity = colorObject.get('a');
				} else {
					stopColor = stop[1];
					stopOpacity = 1;
				}

				if (!i) { // first
					color1 = stopColor;
					opacity1 = stopOpacity;
				} else {
					color2 = stopColor;
					opacity2 = stopOpacity;
				}
			});



			// calculate the angle based on the linear vector
			angle = 90  - math.atan(
				(linearGradient[3] - linearGradient[1]) / // y vector
				(linearGradient[2] - linearGradient[0]) // x vector
				) * 180 / mathPI;

			// when colors attribute is used, the meanings of opacity and o:opacity2
			// are reversed.
			markup = ['<', prop, ' colors="0% ', color1, ',100% ', color2, '" angle="', angle,
				'" opacity="', opacity2, '" o:opacity2="', opacity1,
				'" type="gradient" focus="100%" />'];
			createElement(this.prepVML(markup), null, null, elem);



		// if the color is an rgba color, split it and add a fill node
		// to hold the opacity component
		} else if (regexRgba.test(color) && elem.tagName !== 'IMG') {

			colorObject = Color(color);

			markup = ['<', prop, ' opacity="', colorObject.get('a'), '"/>'];
			createElement(this.prepVML(markup), null, null, elem);

			return colorObject.get('rgb');


		} else {
			var strokeNodes = elem.getElementsByTagName(prop);
			if (strokeNodes.length) {
				strokeNodes[0].opacity = 1;
			}
			return color;
		}

	},

	/**
	 * Take a VML string and prepare it for either IE8 or IE6/IE7.
	 * @param {Array} markup A string array of the VML markup to prepare
	 */
	prepVML: function (markup) {
		var vmlStyle = 'display:inline-block;behavior:url(#default#VML);',
			isIE8 = this.isIE8;

		markup = markup.join('');

		if (isIE8) { // add xmlns and style inline
			markup = markup.replace('/>', ' xmlns="urn:schemas-microsoft-com:vml" />');
			if (markup.indexOf('style="') === -1) {
				markup = markup.replace('/>', ' style="' + vmlStyle + '" />');
			} else {
				markup = markup.replace('style="', 'style="' + vmlStyle);
			}

		} else { // add namespace
			markup = markup.replace('<', '<hcv:');
		}

		return markup;
	},

	/**
	 * Create rotated and aligned text
	 * @param {String} str
	 * @param {Number} x
	 * @param {Number} y
	 */
	text: function (str, x, y) {

		var defaultChartStyle = defaultOptions.chart.style;

		return this.createElement('span')
			.attr({
				text: str,
				x: mathRound(x),
				y: mathRound(y)
			})
			.css({
				whiteSpace: 'nowrap',
				fontFamily: defaultChartStyle.fontFamily,
				fontSize: defaultChartStyle.fontSize
			});
	},

	/**
	 * Create and return a path element
	 * @param {Array} path
	 */
	path: function (path) {
		// create the shape
		return this.createElement('shape').attr({
			// subpixel precision down to 0.1 (width and height = 10px)
			coordsize: '100 100',
			d: path
		});
	},

	/**
	 * Create and return a circle element. In VML circles are implemented as
	 * shapes, which is faster than v:oval
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} r
	 */
	circle: function (x, y, r) {
		return this.symbol('circle').attr({ x: x, y: y, r: r});
	},

	/**
	 * Create a group using an outer div and an inner v:group to allow rotating
	 * and flipping. A simple v:group would have problems with positioning
	 * child HTML elements and CSS clip.
	 *
	 * @param {String} name The name of the group
	 */
	g: function (name) {
		var wrapper,
			attribs;

		// set the class name
		if (name) {
			attribs = { 'className': PREFIX + name, 'class': PREFIX + name };
		}

		// the div to hold HTML and clipping
		wrapper = this.createElement(DIV).attr(attribs);

		return wrapper;
	},

	/**
	 * VML override to create a regular HTML image
	 * @param {String} src
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 */
	image: function (src, x, y, width, height) {
		var obj = this.createElement('img')
			.attr({ src: src });

		if (arguments.length > 1) {
			obj.css({
				left: x,
				top: y,
				width: width,
				height: height
			});
		}
		return obj;
	},

	/**
	 * VML uses a shape for rect to overcome bugs and rotation problems
	 */
	rect: function (x, y, width, height, r, strokeWidth) {

		if (isObject(x)) {
			y = x.y;
			width = x.width;
			height = x.height;
			r = x.r;
			strokeWidth = x.strokeWidth;
			x = x.x;
		}
		var wrapper = this.symbol('rect');
		wrapper.r = r;

		return wrapper.attr(wrapper.crisp(strokeWidth, x, y, mathMax(width, 0), mathMax(height, 0)));
	},

	/**
	 * In the VML renderer, each child of an inverted div (group) is inverted
	 * @param {Object} element
	 * @param {Object} parentNode
	 */
	invertChild: function (element, parentNode) {
		var parentStyle = parentNode.style;

		css(element, {
			flip: 'x',
			left: pInt(parentStyle.width) - 10,
			top: pInt(parentStyle.height) - 10,
			rotation: -90
		});
	},

	/**
	 * Symbol definitions that override the parent SVG renderer's symbols
	 *
	 */
	symbols: {
		// VML specific arc function
		arc: function (x, y, radius, options) {
			var start = options.start,
				end = options.end,
				cosStart = mathCos(start),
				sinStart = mathSin(start),
				cosEnd = mathCos(end),
				sinEnd = mathSin(end),
				innerRadius = options.innerR,
				circleCorrection = 0.07 / radius,
				innerCorrection = (innerRadius && 0.1 / innerRadius) || 0;

			if (end - start === 0) { // no angle, don't show it.
				return ['x'];

			//} else if (end - start == 2 * mathPI) { // full circle
			} else if (2 * mathPI - end + start < circleCorrection) { // full circle
				// empirical correction found by trying out the limits for different radii
				cosEnd = -circleCorrection;
			} else if (end - start < innerCorrection) { // issue #186, another mysterious VML arc problem
				cosEnd = mathCos(start + innerCorrection);
			}

			return [
				'wa', // clockwise arc to
				x - radius, // left
				y - radius, // top
				x + radius, // right
				y + radius, // bottom
				x + radius * cosStart, // start x
				y + radius * sinStart, // start y
				x + radius * cosEnd, // end x
				y + radius * sinEnd, // end y


				'at', // anti clockwise arc to
				x - innerRadius, // left
				y - innerRadius, // top
				x + innerRadius, // right
				y + innerRadius, // bottom
				x + innerRadius * cosEnd, // start x
				y + innerRadius * sinEnd, // start y
				x + innerRadius * cosStart, // end x
				y + innerRadius * sinStart, // end y

				'x', // finish path
				'e' // close
			];

		},
		// Add circle symbol path. This performs significantly faster than v:oval.
		circle: function (x, y, r) {
			return [
				'wa', // clockwisearcto
				x - r, // left
				y - r, // top
				x + r, // right
				y + r, // bottom
				x + r, // start x
				y,     // start y
				x + r, // end x
				y,     // end y
				//'x', // finish path
				'e' // close
			];
		},
		/**
		 * Add rectangle symbol path which eases rotation and omits arcsize problems
		 * compared to the built-in VML roundrect shape
		 *
		 * @param {Number} left Left position
		 * @param {Number} top Top position
		 * @param {Number} r Border radius
		 * @param {Object} options Width and height
		 */

		rect: function (left, top, r, options) {
			if (!defined(options)) {
				return [];
			}
			var width = options.width,
				height = options.height,
				right = left + width,
				bottom = top + height;

			r = mathMin(r, width, height);

			return [
				M,
				left + r, top,

				L,
				right - r, top,
				'wa',
				right - 2 * r, top,
				right, top + 2 * r,
				right - r, top,
				right, top + r,

				L,
				right, bottom - r,
				'wa',
				right - 2 * r, bottom - 2 * r,
				right, bottom,
				right, bottom - r,
				right - r, bottom,

				L,
				left + r, bottom,
				'wa',
				left, bottom - 2 * r,
				left + 2 * r, bottom,
				left + r, bottom,
				left, bottom - r,

				L,
				left, top + r,
				'wa',
				left, top,
				left + 2 * r, top + 2 * r,
				left, top + r,
				left + r, top,


				'x',
				'e'
			];

		}
	}
});

// general renderer
Renderer = VMLRenderer;
}
/* ****************************************************************************
 *                                                                            *
 * END OF INTERNET EXPLORER <= 8 SPECIFIC CODE                                *
 *                                                                            *
 *****************************************************************************/


/**
 * The chart class
 * @param {Object} options
 * @param {Function} callback Function to run when the chart has loaded
 */
function Chart(options, callback) {

	defaultXAxisOptions = merge(defaultXAxisOptions, defaultOptions.xAxis);
	defaultYAxisOptions = merge(defaultYAxisOptions, defaultOptions.yAxis);
	defaultOptions.xAxis = defaultOptions.yAxis = null;

	// Handle regular options
	options = merge(defaultOptions, options);

	// Define chart variables
	var optionsChart = options.chart,
		optionsMargin = optionsChart.margin,
		margin = isObject(optionsMargin) ?
			optionsMargin :
			[optionsMargin, optionsMargin, optionsMargin, optionsMargin],
		optionsMarginTop = pick(optionsChart.marginTop, margin[0]),
		optionsMarginRight = pick(optionsChart.marginRight, margin[1]),
		optionsMarginBottom = pick(optionsChart.marginBottom, margin[2]),
		optionsMarginLeft = pick(optionsChart.marginLeft, margin[3]),
		spacingTop = optionsChart.spacingTop,
		spacingRight = optionsChart.spacingRight,
		spacingBottom = optionsChart.spacingBottom,
		spacingLeft = optionsChart.spacingLeft,
		spacingBox,
		chartTitleOptions,
		chartSubtitleOptions,
		plotTop,
		marginRight,
		marginBottom,
		plotLeft,
		axisOffset,
		renderTo,
		renderToClone,
		container,
		containerId,
		containerWidth,
		containerHeight,
		chartWidth,
		chartHeight,
		oldChartWidth,
		oldChartHeight,
		chartBackground,
		plotBackground,
		plotBGImage,
		plotBorder,
		chart = this,
		chartEvents = optionsChart.events,
		runChartClick = chartEvents && !!chartEvents.click,
		eventType,
		isInsidePlot, // function
		tooltip,
		mouseIsDown,
		loadingDiv,
		loadingSpan,
		loadingShown,
		plotHeight,
		plotWidth,
		tracker,
		trackerGroup,
		placeTrackerGroup,
		legend,
		legendWidth,
		legendHeight,
		chartPosition,// = getPosition(container),
		hasCartesianSeries = optionsChart.showAxes,
		isResizing = 0,
		axes = [],
		maxTicks, // handle the greatest amount of ticks on grouped axes
		series = [],
		inverted,
		renderer,
		tooltipTick,
		tooltipInterval,
		hoverX,
		drawChartBox, // function
		getMargins, // function
		resetMargins, // function
		setChartSize, // function
		resize,
		zoom, // function
		zoomOut; // function


	/**
	 * Create a new axis object
	 * @param {Object} options
	 */
	function Axis(userOptions) {

		// Define variables
		var isXAxis = userOptions.isX,
			opposite = userOptions.opposite, // needed in setOptions
			horiz = inverted ? !isXAxis : isXAxis,
			side = horiz ?
				(opposite ? 0 : 2) : // top : bottom
				(opposite ? 1 : 3),  // right : left
			stacks = {},

			options = merge(
				isXAxis ? defaultXAxisOptions : defaultYAxisOptions,
				[defaultTopAxisOptions, defaultRightAxisOptions,
					defaultBottomAxisOptions, defaultLeftAxisOptions][side],
				userOptions
			),

			axis = this,
			axisTitle,
			type = options.type,
			isDatetimeAxis = type === 'datetime',
			isLog = type === 'logarithmic',
			offset = options.offset || 0,
			xOrY = isXAxis ? 'x' : 'y',
			axisLength,
			transA, // translation factor
			oldTransA, // used for prerendering
			transB = horiz ? plotLeft : marginBottom, // translation addend
			translate, // fn
			getPlotLinePath, // fn
			axisGroup,
			gridGroup,
			axisLine,
			dataMin,
			dataMax,
			associatedSeries,
			userMin,
			userMax,
			max = null,
			min = null,
			oldMin,
			oldMax,
			minPadding = options.minPadding,
			maxPadding = options.maxPadding,
			isLinked = defined(options.linkedTo),
			ignoreMinPadding, // can be set to true by a column or bar series
			ignoreMaxPadding,
			usePercentage,
			events = options.events,
			eventType,
			plotLinesAndBands = [],
			tickInterval,
			minorTickInterval,
			magnitude,
			tickPositions, // array containing predefined positions
			ticks = {},
			minorTicks = {},
			alternateBands = {},
			tickAmount,
			labelOffset,
			axisTitleMargin,// = options.title.margin,
			dateTimeLabelFormat,
			categories = options.categories,
			labelFormatter = options.labels.formatter ||  // can be overwritten by dynamic format
				function () {
					var value = this.value,
						ret;

					if (dateTimeLabelFormat) { // datetime axis
						ret = dateFormat(dateTimeLabelFormat, value);

					} else if (tickInterval % 1000000 === 0) { // use M abbreviation
						ret = (value / 1000000) + 'M';

					} else if (tickInterval % 1000 === 0) { // use k abbreviation
						ret = (value / 1000) + 'k';

					} else if (!categories && value >= 1000) { // add thousands separators
						ret = numberFormat(value, 0);

					} else { // strings (categories) and small numbers
						ret = value;
					}
					return ret;
				},

			staggerLines = horiz && options.labels.staggerLines,
			reversed = options.reversed,
			tickmarkOffset = (categories && options.tickmarkPlacement === 'between') ? 0.5 : 0;
				
		// PATCH by Simon Fishel
        // 
        // read in hooks from axis options object
        //
        // + var hooks = options.hooks || {};
                
        var hooks = options.hooks || {};

		/**
		 * The Tick class
		 */
		function Tick(pos, minor) {
			var tick = this;
			tick.pos = pos;
			tick.minor = minor;
			tick.isNew = true;

			if (!minor) {
				tick.addLabel();
			}
		}
		Tick.prototype = {
			/**
			 * Write the tick label
			 */
			addLabel: function () {
				var pos = this.pos,
					labelOptions = options.labels,
					str,
					withLabel = !((pos === min && !pick(options.showFirstLabel, 1)) ||
						(pos === max && !pick(options.showLastLabel, 0))),
					width = (categories && horiz && categories.length &&
						!labelOptions.step && !labelOptions.staggerLines &&
						!labelOptions.rotation &&
						plotWidth / categories.length) ||
						(!horiz && plotWidth / 2),
					css,
					value = categories && defined(categories[pos]) ? categories[pos] : pos,
					label = this.label;


				// get the string
				str = labelFormatter.call({
						isFirst: pos === tickPositions[0],
						isLast: pos === tickPositions[tickPositions.length - 1],
						dateTimeLabelFormat: dateTimeLabelFormat,
						value: isLog ? lin2log(value) : value
					});


				// prepare CSS
				css = width && { width: mathMax(1, mathRound(width - 2 * (labelOptions.padding || 10))) + PX };
				css = extend(css, labelOptions.style);

				// first call
				if (label === UNDEFINED) {
					this.label =
						defined(str) && withLabel && labelOptions.enabled ?
							renderer.text(
									str,
									0,
									0,
									labelOptions.useHTML
								)
								.attr({
									align: labelOptions.align,
									rotation: labelOptions.rotation
								})
								// without position absolute, IE export sometimes is wrong
								.css(css)
								.add(axisGroup) :
							null;

				// update
				} else if (label) {
					label.attr({ text: str })
						.css(css);
				}
			},
			/**
			 * Get the offset height or width of the label
			 */
			getLabelSize: function () {
				var label = this.label;
				return label ?
					((this.labelBBox = label.getBBox()))[horiz ? 'height' : 'width'] :
					0;
				},
			/**
			 * Put everything in place
			 *
			 * @param index {Number}
			 * @param old {Boolean} Use old coordinates to prepare an animation into new position
			 */
			render: function (index, old) {
				var tick = this,
					major = !tick.minor,
					label = tick.label,
					pos = tick.pos,
					labelOptions = options.labels,
					gridLine = tick.gridLine,
					gridLineWidth = major ? options.gridLineWidth : options.minorGridLineWidth,
					gridLineColor = major ? options.gridLineColor : options.minorGridLineColor,
					dashStyle = major ?
						options.gridLineDashStyle :
						options.minorGridLineDashStyle,
					gridLinePath,
					mark = tick.mark,
					markPath,
					tickLength = major ? options.tickLength : options.minorTickLength,
					tickWidth = major ? options.tickWidth : (options.minorTickWidth || 0),
					tickColor = major ? options.tickColor : options.minorTickColor,
					tickPosition = major ? options.tickPosition : options.minorTickPosition,
					step = labelOptions.step,
					cHeight = (old && oldChartHeight) || chartHeight,
					attribs,
					x,
					y;

				// get x and y position for ticks and labels
				x = horiz ?
					translate(pos + tickmarkOffset, null, null, old) + transB :
					plotLeft + offset + (opposite ? ((old && oldChartWidth) || chartWidth) - marginRight - plotLeft : 0);

				y = horiz ?
					cHeight - marginBottom + offset - (opposite ? plotHeight : 0) :
					cHeight - translate(pos + tickmarkOffset, null, null, old) - transB;

				// create the grid line
				if (gridLineWidth) {
					gridLinePath = getPlotLinePath(pos + tickmarkOffset, gridLineWidth, old);

					if (gridLine === UNDEFINED) {
						attribs = {
							stroke: gridLineColor,
							'stroke-width': gridLineWidth
						};
						if (dashStyle) {
							attribs.dashstyle = dashStyle;
						}
						if (major) {
							attribs.zIndex = 1;
						}
						tick.gridLine = gridLine =
							gridLineWidth ?
								renderer.path(gridLinePath)
									.attr(attribs).add(gridGroup) :
								null;
					}

					// If the parameter 'old' is set, the current call will be followed
					// by another call, therefore do not do any animations this time
					if (!old && gridLine && gridLinePath) {
						gridLine.animate({
							d: gridLinePath
						});
					}
				}

				// create the tick mark
				if (tickWidth) {

					// negate the length
					if (tickPosition === 'inside') {
						tickLength = -tickLength;
					}
					if (opposite) {
						tickLength = -tickLength;
					}

					markPath = renderer.crispLine([
						M,
						x,
						y,
						L,
						x + (horiz ? 0 : -tickLength),
						y + (horiz ? tickLength : 0)
					], tickWidth);

					if (mark) { // updating
						mark.animate({
							d: markPath
						});
					} else { // first time
						tick.mark = renderer.path(
							markPath
						).attr({
							stroke: tickColor,
							'stroke-width': tickWidth
						}).add(axisGroup);
					}
				}

				// the label is created on init - now move it into place
				if (label && !isNaN(x)) {
					x = x + labelOptions.x - (tickmarkOffset && horiz ?
						tickmarkOffset * transA * (reversed ? -1 : 1) : 0);
					y = y + labelOptions.y - (tickmarkOffset && !horiz ?
						tickmarkOffset * transA * (reversed ? 1 : -1) : 0);

					// vertically centered
					if (!defined(labelOptions.y)) {
						y += pInt(label.styles.lineHeight) * 0.9 - label.getBBox().height / 2;
					}


					// correct for staggered labels
					if (staggerLines) {
						y += (index / (step || 1) % staggerLines) * 16;
					}
					// apply step
					if (step) {
						// show those indices dividable by step
						label[index % step ? 'hide' : 'show']();
					}

					label[tick.isNew ? 'attr' : 'animate']({
						x: x,
						y: y
					});
				}

				tick.isNew = false;
			},
			/**
			 * Destructor for the tick prototype
			 */
			destroy: function () {
				destroyObjectProperties(this);
			}
		};

		/**
		 * The object wrapper for plot lines and plot bands
		 * @param {Object} options
		 */
		function PlotLineOrBand(options) {
			var plotLine = this;
			if (options) {
				plotLine.options = options;
				plotLine.id = options.id;
			}

			//plotLine.render()
			return plotLine;
		}

		PlotLineOrBand.prototype = {

		/**
		 * Render the plot line or plot band. If it is already existing,
		 * move it.
		 */
		render: function () {
			var plotLine = this,
				options = plotLine.options,
				optionsLabel = options.label,
				label = plotLine.label,
				width = options.width,
				to = options.to,
				from = options.from,
				value = options.value,
				toPath, // bands only
				dashStyle = options.dashStyle,
				svgElem = plotLine.svgElem,
				path = [],
				addEvent,
				eventType,
				xs,
				ys,
				x,
				y,
				color = options.color,
				zIndex = options.zIndex,
				events = options.events,
				attribs;

			// logarithmic conversion
			if (isLog) {
				from = log2lin(from);
				to = log2lin(to);
				value = log2lin(value);
			}

			// plot line
			if (width) {
				path = getPlotLinePath(value, width);
				attribs = {
					stroke: color,
					'stroke-width': width
				};
				if (dashStyle) {
					attribs.dashstyle = dashStyle;
				}
			} else if (defined(from) && defined(to)) { // plot band
				// keep within plot area
				from = mathMax(from, min);
				to = mathMin(to, max);

				toPath = getPlotLinePath(to);
				path = getPlotLinePath(from);
				if (path && toPath) {
					path.push(
						toPath[4],
						toPath[5],
						toPath[1],
						toPath[2]
					);
				} else { // outside the axis area
					path = null;
				}
				attribs = {
					fill: color
				};
			} else {
				return;
			}
			// zIndex
			if (defined(zIndex)) {
				attribs.zIndex = zIndex;
			}

			// common for lines and bands
			if (svgElem) {
				if (path) {
					svgElem.animate({
						d: path
					}, null, svgElem.onGetPath);
				} else {
					svgElem.hide();
					svgElem.onGetPath = function () {
						svgElem.show();
					};
				}
			} else if (path && path.length) {
				plotLine.svgElem = svgElem = renderer.path(path)
					.attr(attribs).add();

				// events
				if (events) {
					addEvent = function (eventType) {
						svgElem.on(eventType, function (e) {
							events[eventType].apply(plotLine, [e]);
						});
					};
					for (eventType in events) {
						addEvent(eventType);
					}
				}
			}

			// the plot band/line label
			if (optionsLabel && defined(optionsLabel.text) && path && path.length && plotWidth > 0 && plotHeight > 0) {
				// apply defaults
				optionsLabel = merge({
					align: horiz && toPath && 'center',
					x: horiz ? !toPath && 4 : 10,
					verticalAlign : !horiz && toPath && 'middle',
					y: horiz ? toPath ? 16 : 10 : toPath ? 6 : -4,
					rotation: horiz && !toPath && 90
				}, optionsLabel);

				// add the SVG element
				if (!label) {
					plotLine.label = label = renderer.text(
							optionsLabel.text,
							0,
							0
						)
						.attr({
							align: optionsLabel.textAlign || optionsLabel.align,
							rotation: optionsLabel.rotation,
							zIndex: zIndex
						})
						.css(optionsLabel.style)
						.add();
				}

				// get the bounding box and align the label
				xs = [path[1], path[4], pick(path[6], path[1])];
				ys = [path[2], path[5], pick(path[7], path[2])];
				x = mathMin.apply(math, xs);
				y = mathMin.apply(math, ys);

				label.align(optionsLabel, false, {
					x: x,
					y: y,
					width: mathMax.apply(math, xs) - x,
					height: mathMax.apply(math, ys) - y
				});
				label.show();

			} else if (label) { // move out of sight
				label.hide();
			}

			// chainable
			return plotLine;
		},

		/**
		 * Remove the plot line or band
		 */
		destroy: function () {
			var obj = this;

			destroyObjectProperties(obj);

			// remove it from the lookup
			erase(plotLinesAndBands, obj);
		}
		};

		/**
		 * The class for stack items
		 */
		function StackItem(options, isNegative, x, stackOption) {
			var stackItem = this;

			// Tells if the stack is negative
			stackItem.isNegative = isNegative;

			// Save the options to be able to style the label
			stackItem.options = options;

			// Save the x value to be able to position the label later
			stackItem.x = x;
			
			// Save the stack option on the series configuration object
			stackItem.stack = stackOption;

			// The align options and text align varies on whether the stack is negative and
			// if the chart is inverted or not.
			// First test the user supplied value, then use the dynamic.
			stackItem.alignOptions = {
				align: options.align || (inverted ? (isNegative ? 'left' : 'right') : 'center'),
				verticalAlign: options.verticalAlign || (inverted ? 'middle' : (isNegative ? 'bottom' : 'top')),
				y: pick(options.y, inverted ? 4 : (isNegative ? 14 : -6)),
				x: pick(options.x, inverted ? (isNegative ? -6 : 6) : 0)
			};

			stackItem.textAlign = options.textAlign || (inverted ? (isNegative ? 'right' : 'left') : 'center');
		}

		StackItem.prototype = {
			destroy: function () {
				destroyObjectProperties(this);
			},

			/**
			 * Sets the total of this stack. Should be called when a serie is hidden or shown
			 * since that will affect the total of other stacks.
			 */
			setTotal: function (total) {
				this.total = total;
				this.cum = total;
			},

			/**
			 * Renders the stack total label and adds it to the stack label group.
			 */
			render: function (group) {
				var stackItem = this,									// aliased this
					str = stackItem.options.formatter.call(stackItem);	// format the text in the label

				// Change the text to reflect the new total and set visibility to hidden in case the serie is hidden
				if (stackItem.label) {
					stackItem.label.attr({text: str, visibility: HIDDEN});
				// Create new label
				} else {
					stackItem.label =
						chart.renderer.text(str, 0, 0)				// dummy positions, actual position updated with setOffset method in columnseries
							.css(stackItem.options.style)			// apply style
							.attr({align: stackItem.textAlign,			// fix the text-anchor
								rotation: stackItem.options.rotation,	// rotation
								visibility: HIDDEN })					// hidden until setOffset is called
							.add(group);							// add to the labels-group
				}
			},

			/**
			 * Sets the offset that the stack has from the x value and repositions the label.
			 */
			setOffset: function (xOffset, xWidth) {
				var stackItem = this,										// aliased this
					neg = stackItem.isNegative,								// special treatment is needed for negative stacks
					y = axis.translate(stackItem.total),					// stack value translated mapped to chart coordinates
					yZero = axis.translate(0),								// stack origin
					h = mathAbs(y - yZero),									// stack height
					x = chart.xAxis[0].translate(stackItem.x) + xOffset,	// stack x position
					plotHeight = chart.plotHeight,
					stackBox = {	// this is the box for the complete stack
							x: inverted ? (neg ? y : y - h) : x,
							y: inverted ? plotHeight - x - xWidth : (neg ? (plotHeight - y - h) : plotHeight - y),
							width: inverted ? h : xWidth,
							height: inverted ? xWidth : h
					};

				if (stackItem.label) {
					stackItem.label
						.align(stackItem.alignOptions, null, stackBox)	// align the label to the box
						.attr({visibility: VISIBLE});					// set visibility
				}
			}
		};

		/**
		 * Get the minimum and maximum for the series of each axis
		 */
		function getSeriesExtremes() {
			var posStack = [],
				negStack = [],
				run;

			// reset dataMin and dataMax in case we're redrawing
			dataMin = dataMax = null;

			// get an overview of what series are associated with this axis
			associatedSeries = [];

			each(series, function (serie) {
				run = false;


				// match this axis against the series' given or implicated axis
				each(['xAxis', 'yAxis'], function (strAxis) {
					if (
						// the series is a cartesian type, and...
						serie.isCartesian &&
						// we're in the right x or y dimension, and...
						((strAxis === 'xAxis' && isXAxis) || (strAxis === 'yAxis' && !isXAxis)) && (
							// the axis number is given in the options and matches this axis index, or
							(serie.options[strAxis] === options.index) ||
							// the axis index is not given
							(serie.options[strAxis] === UNDEFINED && options.index === 0)
						)
					) {
						serie[strAxis] = axis;
						associatedSeries.push(serie);

						// the series is visible, run the min/max detection
						run = true;
					}
				});
				// ignore hidden series if opted
				if (!serie.visible && optionsChart.ignoreHiddenSeries) {
					run = false;
				}

				if (run) {

					var stacking,
						posPointStack,
						negPointStack,
						stackKey,
						stackOption,
						negKey;

					if (!isXAxis) {
						stacking = serie.options.stacking;
						usePercentage = stacking === 'percent';

						// create a stack for this particular series type
						if (stacking) {
							stackOption = serie.options.stack;
							stackKey = serie.type + pick(stackOption, '');
							negKey = '-' + stackKey;
							serie.stackKey = stackKey; // used in translate

							posPointStack = posStack[stackKey] || []; // contains the total values for each x
							posStack[stackKey] = posPointStack;

							negPointStack = negStack[negKey] || [];
							negStack[negKey] = negPointStack;
						}
						if (usePercentage) {
							dataMin = 0;
							dataMax = 99;
						}
					}
					if (serie.isCartesian) { // line, column etc. need axes, pie doesn't
						each(serie.data, function (point) {
							var pointX = point.x,
								pointY = point.y,
								isNegative = pointY < 0,
								pointStack = isNegative ? negPointStack : posPointStack,
								key = isNegative ? negKey : stackKey,
								totalPos,
								pointLow;

							// initial values
							if (dataMin === null) {

								// start out with the first point
								dataMin = dataMax = point[xOrY];
							}

							// x axis
							if (isXAxis) {
								if (pointX > dataMax) {
									dataMax = pointX;
								} else if (pointX < dataMin) {
									dataMin = pointX;
								}
							} else if (defined(pointY)) { // y axis
								if (stacking) {
									pointStack[pointX] =
										defined(pointStack[pointX]) ?
										pointStack[pointX] + pointY : pointY;
								}
								totalPos = pointStack ? pointStack[pointX] : pointY;
								pointLow = pick(point.low, totalPos);
								if (!usePercentage) {
									if (totalPos > dataMax) {
										dataMax = totalPos;
									} else if (pointLow < dataMin) {
										dataMin = pointLow;
									}
								}
								if (stacking) {
									// add the series
									if (!stacks[key]) {
										stacks[key] = {};
									}

									// If the StackItem is there, just update the values,
									// if not, create one first
									if (!stacks[key][pointX]) {
										stacks[key][pointX] = new StackItem(options.stackLabels, isNegative, pointX, stackOption);
									}
									stacks[key][pointX].setTotal(totalPos);
								}
							}
						});


						// For column, areas and bars, set the minimum automatically to zero
						// and prevent that minPadding is added in setScale
						if (/(area|column|bar)/.test(serie.type) && !isXAxis) {
							var threshold = 0; // use series.options.threshold?
							if (dataMin >= threshold) {
								dataMin = threshold;
								ignoreMinPadding = true;
							} else if (dataMax < threshold) {
								dataMax = threshold;
								ignoreMaxPadding = true;
							}
						}
					}
				}
			});

		}

		/**
		 * Translate from axis value to pixel position on the chart, or back
		 *
		 */
		translate = function (val, backwards, cvsCoord, old, handleLog) {
			var sign = 1,
				cvsOffset = 0,
				localA = old ? oldTransA : transA,
				localMin = old ? oldMin : min,
				returnValue;

			if (!localA) {
				localA = transA;
			}

			if (cvsCoord) {
				sign *= -1; // canvas coordinates inverts the value
				cvsOffset = axisLength;
			}
			if (reversed) { // reversed axis
				sign *= -1;
				cvsOffset -= sign * axisLength;
			}

			if (backwards) { // reverse translation
				if (reversed) {
					val = axisLength - val;
				}
				returnValue = val / localA + localMin; // from chart pixel to value
				if (isLog && handleLog) {
					returnValue = lin2log(returnValue);
				}

			} else { // normal translation
				if (isLog && handleLog) {
					val = log2lin(val);
				}
				returnValue = sign * (val - localMin) * localA + cvsOffset; // from value to chart pixel
			}

			return returnValue;
		};

		/**
		 * Create the path for a plot line that goes from the given value on
		 * this axis, across the plot to the opposite side
		 * @param {Number} value
		 * @param {Number} lineWidth Used for calculation crisp line
		 * @param {Number] old Use old coordinates (for resizing and rescaling)
		 */
		getPlotLinePath = function (value, lineWidth, old) {
			var x1,
				y1,
				x2,
				y2,
				translatedValue = translate(value, null, null, old),
				cHeight = (old && oldChartHeight) || chartHeight,
				cWidth = (old && oldChartWidth) || chartWidth,
				skip;

			x1 = x2 = mathRound(translatedValue + transB);
			y1 = y2 = mathRound(cHeight - translatedValue - transB);

			if (isNaN(translatedValue)) { // no min or max
				skip = true;

			} else if (horiz) {
				y1 = plotTop;
				y2 = cHeight - marginBottom;
				if (x1 < plotLeft || x1 > plotLeft + plotWidth) {
					skip = true;
				}
			} else {
				x1 = plotLeft;
				x2 = cWidth - marginRight;
				if (y1 < plotTop || y1 > plotTop + plotHeight) {
					skip = true;
				}
			}
			return skip ?
				null :
				renderer.crispLine([M, x1, y1, L, x2, y2], lineWidth || 0);
		};


		/**
		 * Take an interval and normalize it to multiples of 1, 2, 2.5 and 5
		 * @param {Number} interval
		 */
		function normalizeTickInterval(interval, multiples) {
			var normalized, i;

			// round to a tenfold of 1, 2, 2.5 or 5
			magnitude = multiples ? 1 : math.pow(10, mathFloor(math.log(interval) / math.LN10));
			normalized = interval / magnitude;

			// multiples for a linear scale
			if (!multiples) {
				multiples = [1, 2, 2.5, 5, 10];
				//multiples = [1, 2, 2.5, 4, 5, 7.5, 10];

				// the allowDecimals option
				if (options.allowDecimals === false || isLog) {
					if (magnitude === 1) {
						multiples = [1, 2, 5, 10];
					} else if (magnitude <= 0.1) {
						multiples = [1 / magnitude];
					}
				}
			}

			// normalize the interval to the nearest multiple
			for (i = 0; i < multiples.length; i++) {
				interval = multiples[i];
				if (normalized <= (multiples[i] + (multiples[i + 1] || multiples[i])) / 2) {
					break;
				}
			}

			// multiply back to the correct magnitude
			interval *= magnitude;

			return interval;
		}

		/**
		 * Set the tick positions to a time unit that makes sense, for example
		 * on the first of each month or on every Monday.
		 */
		function setDateTimeTickPositions() {
			tickPositions = [];
			var i,
				useUTC = defaultOptions.global.useUTC,
				oneSecond = 1000 / timeFactor,
				oneMinute = 60000 / timeFactor,
				oneHour = 3600000 / timeFactor,
				oneDay = 24 * 3600000 / timeFactor,
				oneWeek = 7 * 24 * 3600000 / timeFactor,
				oneMonth = 30 * 24 * 3600000 / timeFactor,
				oneYear = 31556952000 / timeFactor,

				units = [[
					'second',						// unit name
					oneSecond,						// fixed incremental unit
					[1, 2, 5, 10, 15, 30]			// allowed multiples
				], [
					'minute',						// unit name
					oneMinute,						// fixed incremental unit
					[1, 2, 5, 10, 15, 30]			// allowed multiples
				], [
					'hour',							// unit name
					oneHour,						// fixed incremental unit
					[1, 2, 3, 4, 6, 8, 12]			// allowed multiples
				], [
					'day',							// unit name
					oneDay,							// fixed incremental unit
					[1, 2]							// allowed multiples
				], [
					'week',							// unit name
					oneWeek,						// fixed incremental unit
					[1, 2]							// allowed multiples
				], [
					'month',
					oneMonth,
					[1, 2, 3, 4, 6]
				], [
					'year',
					oneYear,
					null
				]],

				unit = units[6], // default unit is years
				interval = unit[1],
				multiples = unit[2];

			// loop through the units to find the one that best fits the tickInterval
			for (i = 0; i < units.length; i++) {
				unit = units[i];
				interval = unit[1];
				multiples = unit[2];


				if (units[i + 1]) {
					// lessThan is in the middle between the highest multiple and the next unit.
					var lessThan = (interval * multiples[multiples.length - 1] +
								units[i + 1][1]) / 2;

					// break and keep the current unit
					if (tickInterval <= lessThan) {
						break;
					}
				}
			}

			// prevent 2.5 years intervals, though 25, 250 etc. are allowed
			if (interval === oneYear && tickInterval < 5 * interval) {
				multiples = [1, 2, 5];
			}

			// get the minimum value by flooring the date
			var multitude = normalizeTickInterval(tickInterval / interval, multiples),
				minYear, // used in months and years as a basis for Date.UTC()
				minDate = new Date(min * timeFactor);

			minDate.setMilliseconds(0);

			if (interval >= oneSecond) { // second
				minDate.setSeconds(interval >= oneMinute ? 0 :
					multitude * mathFloor(minDate.getSeconds() / multitude));
			}

			if (interval >= oneMinute) { // minute
				minDate[setMinutes](interval >= oneHour ? 0 :
					multitude * mathFloor(minDate[getMinutes]() / multitude));
			}

			if (interval >= oneHour) { // hour
				minDate[setHours](interval >= oneDay ? 0 :
					multitude * mathFloor(minDate[getHours]() / multitude));
			}

			if (interval >= oneDay) { // day
				minDate[setDate](interval >= oneMonth ? 1 :
					multitude * mathFloor(minDate[getDate]() / multitude));
			}

			if (interval >= oneMonth) { // month
				minDate[setMonth](interval >= oneYear ? 0 :
					multitude * mathFloor(minDate[getMonth]() / multitude));
				minYear = minDate[getFullYear]();
			}

			if (interval >= oneYear) { // year
				minYear -= minYear % multitude;
				minDate[setFullYear](minYear);
			}

			// week is a special case that runs outside the hierarchy
			if (interval === oneWeek) {
				// get start of current week, independent of multitude
				minDate[setDate](minDate[getDate]() - minDate[getDay]() +
					options.startOfWeek);
			}


			// get tick positions
			i = 1; // prevent crash just in case
			minYear = minDate[getFullYear]();
			var time = minDate.getTime() / timeFactor,
				minMonth = minDate[getMonth](),
				minDateDate = minDate[getDate]();

			// iterate and add tick positions at appropriate values
			while (time < max && i < plotWidth) {
				tickPositions.push(time);

				// if the interval is years, use Date.UTC to increase years
				if (interval === oneYear) {
					time = makeTime(minYear + i * multitude, 0) / timeFactor;

				// if the interval is months, use Date.UTC to increase months
				} else if (interval === oneMonth) {
					time = makeTime(minYear, minMonth + i * multitude) / timeFactor;

				// if we're using global time, the interval is not fixed as it jumps
				// one hour at the DST crossover
				} else if (!useUTC && (interval === oneDay || interval === oneWeek)) {
					time = makeTime(minYear, minMonth, minDateDate +
						i * multitude * (interval === oneDay ? 1 : 7));

				// else, the interval is fixed and we use simple addition
				} else {
					time += interval * multitude;
				}

				i++;
			}
			// push the last time
			tickPositions.push(time);


			// dynamic label formatter
			dateTimeLabelFormat = options.dateTimeLabelFormats[unit[0]];
		}

		/**
		 * Fix JS round off float errors
		 * @param {Number} num
		 */
		function correctFloat(num) {
			var invMag, ret = num;
			magnitude = pick(magnitude, math.pow(10, mathFloor(math.log(tickInterval) / math.LN10)));

			if (magnitude < 1) {
				invMag = mathRound(1 / magnitude)  * 10;
				ret = mathRound(num * invMag) / invMag;
			}
			return ret;
		}

		/**
		 * Set the tick positions of a linear axis to round values like whole tens or every five.
		 */
		function setLinearTickPositions() {

			var i,
				roundedMin = correctFloat(mathFloor(min / tickInterval) * tickInterval),
				roundedMax = correctFloat(mathCeil(max / tickInterval) * tickInterval);

			tickPositions = [];

			// populate the intermediate values
			i = correctFloat(roundedMin);
			while (i <= roundedMax) {
				tickPositions.push(i);
				i = correctFloat(i + tickInterval);
			}

		}

		/**
		 * Set the tick positions to round values and optionally extend the extremes
		 * to the nearest tick
		 */
		function setTickPositions() {
			var length,
				catPad,
				linkedParent,
				linkedParentExtremes,
				tickIntervalOption = options.tickInterval,
				tickPixelIntervalOption = options.tickPixelInterval,
				maxZoom = options.maxZoom || (
					isXAxis && !defined(options.min) && !defined(options.max) ?
						mathMin(chart.smallestInterval * 5, dataMax - dataMin) :
						null
				),
				zoomOffset;


			axisLength = horiz ? plotWidth : plotHeight;

			// linked axis gets the extremes from the parent axis
			if (isLinked) {
				linkedParent = chart[isXAxis ? 'xAxis' : 'yAxis'][options.linkedTo];
				linkedParentExtremes = linkedParent.getExtremes();
				min = pick(linkedParentExtremes.min, linkedParentExtremes.dataMin);
				max = pick(linkedParentExtremes.max, linkedParentExtremes.dataMax);
			} else { // initial min and max from the extreme data values
				min = pick(userMin, options.min, dataMin);
				max = pick(userMax, options.max, dataMax);
			}

			if (isLog) {
				min = log2lin(min);
				max = log2lin(max);
			}

			// maxZoom exceeded, just center the selection
			if (max - min < maxZoom) {
				zoomOffset = (maxZoom - max + min) / 2;
				// if min and max options have been set, don't go beyond it
				min = mathMax(min - zoomOffset, pick(options.min, min - zoomOffset), dataMin);
				max = mathMin(min + maxZoom, pick(options.max, min + maxZoom), dataMax);
			}

			// pad the values to get clear of the chart's edges
			if (!categories && !usePercentage && !isLinked && defined(min) && defined(max)) {
				length = (max - min) || 1;
				if (!defined(options.min) && !defined(userMin) && minPadding && (dataMin < 0 || !ignoreMinPadding)) {
					min -= length * minPadding;
				}
				if (!defined(options.max) && !defined(userMax)  && maxPadding && (dataMax > 0 || !ignoreMaxPadding)) {
					max += length * maxPadding;
				}
			}

			// get tickInterval
			if (min === max) {
				tickInterval = 1;
			} else if (isLinked && !tickIntervalOption &&
					tickPixelIntervalOption === linkedParent.options.tickPixelInterval) {
				tickInterval = linkedParent.tickInterval;
			} else {
				tickInterval = pick(
					tickIntervalOption,
					categories ? // for categoried axis, 1 is default, for linear axis use tickPix
						1 :
						(max - min) * tickPixelIntervalOption / axisLength
				);
			}

			if (!isDatetimeAxis && !defined(options.tickInterval)) { // linear
				tickInterval = normalizeTickInterval(tickInterval);
			}
			axis.tickInterval = tickInterval; // record for linked axis

			// get minorTickInterval
			minorTickInterval = options.minorTickInterval === 'auto' && tickInterval ?
					tickInterval / 5 : options.minorTickInterval;

			// find the tick positions
			if (isDatetimeAxis) {
				setDateTimeTickPositions();
			} else {
				setLinearTickPositions();
			}

			if (!isLinked) {
				// pad categorised axis to nearest half unit
				if (categories || (isXAxis && chart.hasColumn)) {
					catPad = (categories ? 1 : tickInterval) * 0.5;
					if (categories || !defined(pick(options.min, userMin))) {
						min -= catPad;
					}
					if (categories || !defined(pick(options.max, userMax))) {
						max += catPad;
					}
				}

				// reset min/max or remove extremes based on start/end on tick
				var roundedMin = tickPositions[0],
					roundedMax = tickPositions[tickPositions.length - 1];

				if (options.startOnTick) {
					min = roundedMin;
				} else if (min > roundedMin) {
					tickPositions.shift();
				}

				if (options.endOnTick) {
					max = roundedMax;
				} else if (max < roundedMax) {
					tickPositions.pop();
				}

				// record the greatest number of ticks for multi axis
				if (!maxTicks) { // first call, or maxTicks have been reset after a zoom operation
					maxTicks = {
						x: 0,
						y: 0
					};
				}

				if (!isDatetimeAxis && tickPositions.length > maxTicks[xOrY]) {
					maxTicks[xOrY] = tickPositions.length;
				}
			}
			
			// PATCH
            //
            // call the tickPositionsSet hook after the tick positions have been calculated
            //
            // + if(hooks.tickPositionsSet) {
            // +    hooks.tickPositionsSet(options, categories, tickPositions, chart);
            // + }
            
            if(hooks.tickPositionsSet) {
                hooks.tickPositionsSet(options, categories, tickPositions, chart);
            }

		}

		/**
		 * When using multiple axes, adjust the number of ticks to match the highest
		 * number of ticks in that group
		 */
		function adjustTickAmount() {

			if (maxTicks && !isDatetimeAxis && !categories && !isLinked) { // only apply to linear scale
				var oldTickAmount = tickAmount,
					calculatedTickAmount = tickPositions.length;

				// set the axis-level tickAmount to use below
				tickAmount = maxTicks[xOrY];

				if (calculatedTickAmount < tickAmount) {
					while (tickPositions.length < tickAmount) {
						tickPositions.push(correctFloat(
							tickPositions[tickPositions.length - 1] + tickInterval
						));
					}
					transA *= (calculatedTickAmount - 1) / (tickAmount - 1);
					max = tickPositions[tickPositions.length - 1];

				}
				if (defined(oldTickAmount) && tickAmount !== oldTickAmount) {
					axis.isDirty = true;
				}
			}

		}

		/**
		 * Set the scale based on data min and max, user set min and max or options
		 *
		 */
		function setScale() {
			var type,
				i;

			oldMin = min;
			oldMax = max;

			// get data extremes if needed
			getSeriesExtremes();
			
			// PATCH by Simon Fishel
            // 
            // call the tickRenderStart hook to format the tick spacing based on the axis extremes
            //
            // + if(hooks.tickRenderStart) {
            // +     hooks.tickRenderStart(options, getExtremes(), chart);
            // + }
            
            if(hooks.tickRenderStart) {
                hooks.tickRenderStart(options, getExtremes(), chart);
            }

			// get fixed positions based on tickInterval
			setTickPositions();

			// the translation factor used in translate function
			oldTransA = transA;
			transA = axisLength / ((max - min) || 1);

			// reset stacks
			if (!isXAxis) {
				for (type in stacks) {
					for (i in stacks[type]) {
						stacks[type][i].cum = stacks[type][i].total;
					}
				}
			}

			// mark as dirty if it is not already set to dirty and extremes have changed
			if (!axis.isDirty) {
				axis.isDirty = (min !== oldMin || max !== oldMax);
			}

		}

		/**
		 * Set the extremes and optionally redraw
		 * @param {Number} newMin
		 * @param {Number} newMax
		 * @param {Boolean} redraw
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 *
		 */
		function setExtremes(newMin, newMax, redraw, animation) {

			redraw = pick(redraw, true); // defaults to true

			fireEvent(axis, 'setExtremes', { // fire an event to enable syncing of multiple charts
				min: newMin,
				max: newMax
			}, function () { // the default event handler

				userMin = newMin;
				userMax = newMax;


				// redraw
				if (redraw) {
					chart.redraw(animation);
				}
			});

		}

		/**
		 * Get the actual axis extremes
		 */
		function getExtremes() {
			return {
				min: min,
				max: max,
				dataMin: dataMin,
				dataMax: dataMax,
				userMin: userMin,
				userMax: userMax
			};
		}

		/**
		 * Get the zero plane either based on zero or on the min or max value.
		 * Used in bar and area plots
		 */
		function getThreshold(threshold) {
			if (min > threshold) {
				threshold = min;
			} else if (max < threshold) {
				threshold = max;
			}

			return translate(threshold, 0, 1);
		}

		/**
		 * Add a plot band or plot line after render time
		 *
		 * @param options {Object} The plotBand or plotLine configuration object
		 */
		function addPlotBandOrLine(options) {
			var obj = new PlotLineOrBand(options).render();
			plotLinesAndBands.push(obj);
			return obj;
		}

		/**
		 * Render the tick labels to a preliminary position to get their sizes
		 */
		function getOffset() {

			var hasData = associatedSeries.length && defined(min) && defined(max),
				titleOffset = 0,
				titleMargin = 0,
				axisTitleOptions = options.title,
				labelOptions = options.labels,
				directionFactor = [-1, 1, 1, -1][side],
				n;

			if (!axisGroup) {
				axisGroup = renderer.g('axis')
					.attr({ zIndex: 7 })
					.add();
				gridGroup = renderer.g('grid')
					.attr({ zIndex: 1 })
					.add();
			}

			labelOffset = 0; // reset

			if (hasData || isLinked) {
			    
			    // PATCH by Simon Fishel
                //
                // call the tickLabelsRenderStart hook before initialize the ticks
                //
                // + if(hooks.tickLabelsRenderStart) {
                // +    hooks.tickLabelsRenderStart(options, categories, chart);
                // + }
                
                if(hooks.tickLabelsRenderStart) {
                    hooks.tickLabelsRenderStart(options, categories, chart);
                }
			    
				each(tickPositions, function (pos) {
					if (!ticks[pos]) {
						ticks[pos] = new Tick(pos);
					} else {
						ticks[pos].addLabel(); // update labels depending on tick interval
					}

					// left side must be align: right and right side must have align: left for labels
					if (side === 0 || side === 2 || { 1: 'left', 3: 'right' }[side] === labelOptions.align) {

						// get the highest offset
						labelOffset = mathMax(
							ticks[pos].getLabelSize(),
							labelOffset
						);
					}

				});

				if (staggerLines) {
					labelOffset += (staggerLines - 1) * 16;
				}

			} else { // doesn't have data
				for (n in ticks) {
					ticks[n].destroy();
					delete ticks[n];
				}
			}

			if (axisTitleOptions && axisTitleOptions.text) {
				if (!axisTitle) {
					axisTitle = axis.axisTitle = renderer.text(
						axisTitleOptions.text,
						0,
						0,
						axisTitleOptions.useHTML
					)
					.attr({
						zIndex: 7,
						rotation: axisTitleOptions.rotation || 0,
						align:
							axisTitleOptions.textAlign ||
							{ low: 'left', middle: 'center', high: 'right' }[axisTitleOptions.align]
					})
					.css(axisTitleOptions.style)
					.add();
					axisTitle.isNew = true;
				}

				titleOffset = axisTitle.getBBox()[horiz ? 'height' : 'width'];
				titleMargin = pick(axisTitleOptions.margin, horiz ? 5 : 10);

			}

			// handle automatic or user set offset
			offset = directionFactor * (options.offset || axisOffset[side]);

			axisTitleMargin =
				labelOffset +
				(side !== 2 && labelOffset && directionFactor * options.labels[horiz ? 'y' : 'x']) +
				titleMargin;

			axisOffset[side] = mathMax(
				axisOffset[side],
				axisTitleMargin + titleOffset + directionFactor * offset
			);

		}

		/**
		 * Render the axis
		 */
		function render() {
			var axisTitleOptions = options.title,
				stackLabelOptions = options.stackLabels,
				alternateGridColor = options.alternateGridColor,
				lineWidth = options.lineWidth,
				lineLeft,
				lineTop,
				linePath,
				hasRendered = chart.hasRendered,
				slideInTicks = hasRendered && defined(oldMin) && !isNaN(oldMin),
				hasData = associatedSeries.length && defined(min) && defined(max);

			// update metrics
			axisLength = horiz ? plotWidth : plotHeight;
			transA = axisLength / ((max - min) || 1);
			transB = horiz ? plotLeft : marginBottom; // translation addend

			// If the series has data draw the ticks. Else only the line and title
			if (hasData || isLinked) {

				// minor ticks
				if (minorTickInterval && !categories) {
					var pos = min + (tickPositions[0] - min) % minorTickInterval;
					for (; pos <= max; pos += minorTickInterval) {
						if (!minorTicks[pos]) {
							minorTicks[pos] = new Tick(pos, true);
						}

						// render new ticks in old position
						if (slideInTicks && minorTicks[pos].isNew) {
							minorTicks[pos].render(null, true);
						}


						minorTicks[pos].isActive = true;
						minorTicks[pos].render();
					}
				}

				// major ticks
				each(tickPositions, function (pos, i) {
					// linked axes need an extra check to find out if
					if (!isLinked || (pos >= min && pos <= max)) {

						// render new ticks in old position
						if (slideInTicks && ticks[pos].isNew) {
							ticks[pos].render(i, true);
						}

						ticks[pos].isActive = true;
						ticks[pos].render(i);
					}
				});

				// alternate grid color
				if (alternateGridColor) {
					each(tickPositions, function (pos, i) {
						if (i % 2 === 0 && pos < max) {
							/*plotLinesAndBands.push(new PlotLineOrBand({
								from: pos,
								to: tickPositions[i + 1] !== UNDEFINED ? tickPositions[i + 1] : max,
								color: alternateGridColor
							}));*/

							if (!alternateBands[pos]) {
								alternateBands[pos] = new PlotLineOrBand();
							}
							alternateBands[pos].options = {
								from: pos,
								to: tickPositions[i + 1] !== UNDEFINED ? tickPositions[i + 1] : max,
								color: alternateGridColor
							};
							alternateBands[pos].render();
							alternateBands[pos].isActive = true;
						}
					});
				}

				// custom plot bands (behind grid lines)
				/*if (!hasRendered) { // only first time
					each(options.plotBands || [], function(plotBandOptions) {
						plotLinesAndBands.push(new PlotLineOrBand(
							extend({ zIndex: 1 }, plotBandOptions)
						).render());
					});
				}*/




				// custom plot lines and bands
				if (!hasRendered) { // only first time
					each((options.plotLines || []).concat(options.plotBands || []), function (plotLineOptions) {
						plotLinesAndBands.push(new PlotLineOrBand(plotLineOptions).render());
					});
				}



			} // end if hasData

			// remove inactive ticks
			each([ticks, minorTicks, alternateBands], function (coll) {
				var pos;
				for (pos in coll) {
					if (!coll[pos].isActive) {
						coll[pos].destroy();
						delete coll[pos];
					} else {
						coll[pos].isActive = false; // reset
					}
				}
			});




			// Static items. As the axis group is cleared on subsequent calls
			// to render, these items are added outside the group.
			// axis line
			if (lineWidth) {
				lineLeft = plotLeft + (opposite ? plotWidth : 0) + offset;
				lineTop = chartHeight - marginBottom - (opposite ? plotHeight : 0) + offset;

				linePath = renderer.crispLine([
						M,
						horiz ?
							plotLeft :
							lineLeft,
						horiz ?
							lineTop :
							plotTop,
						L,
						horiz ?
							chartWidth - marginRight :
							lineLeft,
						horiz ?
							lineTop :
							chartHeight - marginBottom
					], lineWidth);
				if (!axisLine) {
					axisLine = renderer.path(linePath)
						.attr({
							stroke: options.lineColor,
							'stroke-width': lineWidth,
							zIndex: 7
						})
						.add();
				} else {
					axisLine.animate({ d: linePath });
				}

			}

			if (axisTitle) {
				// compute anchor points for each of the title align options
				var margin = horiz ? plotLeft : plotTop,
					fontSize = pInt(axisTitleOptions.style.fontSize || 12),
				// the position in the length direction of the axis
				alongAxis = {
					low: margin + (horiz ? 0 : axisLength),
					middle: margin + axisLength / 2,
					high: margin + (horiz ? axisLength : 0)
				}[axisTitleOptions.align],

				// the position in the perpendicular direction of the axis
				offAxis = (horiz ? plotTop + plotHeight : plotLeft) +
					(horiz ? 1 : -1) * // horizontal axis reverses the margin
					(opposite ? -1 : 1) * // so does opposite axes
					axisTitleMargin +
					//(isIE ? fontSize / 3 : 0)+ // preliminary fix for vml's centerline
					(side === 2 ? fontSize : 0);

				axisTitle[axisTitle.isNew ? 'attr' : 'animate']({
					x: horiz ?
						alongAxis :
						offAxis + (opposite ? plotWidth : 0) + offset +
							(axisTitleOptions.x || 0), // x
					y: horiz ?
						offAxis - (opposite ? plotHeight : 0) + offset :
						alongAxis + (axisTitleOptions.y || 0) // y
				});
				axisTitle.isNew = false;
			}

			// Stacked totals:
			if (stackLabelOptions && stackLabelOptions.enabled) {
				var stackKey, oneStack, stackCategory,
					stackTotalGroup = axis.stackTotalGroup;

				// Create a separate group for the stack total labels
				if (!stackTotalGroup) {
					axis.stackTotalGroup = stackTotalGroup =
						renderer.g('stack-labels')
							.attr({
								visibility: VISIBLE,
								zIndex: 6
							})
							.translate(plotLeft, plotTop)
							.add();
				}

				// Render each stack total
				for (stackKey in stacks) {
					oneStack = stacks[stackKey];
					for (stackCategory in oneStack) {
						oneStack[stackCategory].render(stackTotalGroup);
					}
				}
			}
			// End stacked totals

			axis.isDirty = false;
		}

		/**
		 * Remove a plot band or plot line from the chart by id
		 * @param {Object} id
		 */
		function removePlotBandOrLine(id) {
			var i = plotLinesAndBands.length;
			while (i--) {
				if (plotLinesAndBands[i].id === id) {
					plotLinesAndBands[i].destroy();
				}
			}
		}

		/**
		 * Redraw the axis to reflect changes in the data or axis extremes
		 */
		function redraw() {

			// hide tooltip and hover states
			if (tracker.resetTracker) {
				tracker.resetTracker();
			}

			// render the axis
			render();

			// move plot lines and bands
			each(plotLinesAndBands, function (plotLine) {
				plotLine.render();
			});

			// mark associated series as dirty and ready for redraw
			each(associatedSeries, function (series) {
				series.isDirty = true;
			});

		}

		/**
		 * Set new axis categories and optionally redraw
		 * @param {Array} newCategories
		 * @param {Boolean} doRedraw
		 */
		function setCategories(newCategories, doRedraw) {
				// set the categories
				axis.categories = userOptions.categories = categories = newCategories;

				// force reindexing tooltips
				each(associatedSeries, function (series) {
					series.translate();
					series.setTooltipPoints(true);
				});


				// optionally redraw
				axis.isDirty = true;

				if (pick(doRedraw, true)) {
					chart.redraw();
				}
		}

		/**
		 * Destroys an Axis instance.
		 */
		function destroy() {
			var stackKey;

			// Remove the events
			removeEvent(axis);

			// Destroy each stack total
			for (stackKey in stacks) {
				destroyObjectProperties(stacks[stackKey]);

				stacks[stackKey] = null;
			}

			// Destroy stack total group
			if (axis.stackTotalGroup) {
				axis.stackTotalGroup = axis.stackTotalGroup.destroy();
			}

			// Destroy collections
			each([ticks, minorTicks, alternateBands, plotLinesAndBands], function (coll) {
				destroyObjectProperties(coll);
			});

			// Destroy local variables
			each([axisLine, axisGroup, gridGroup, axisTitle], function (obj) {
				if (obj) {
					obj.destroy();
				}
			});
			axisLine = axisGroup = gridGroup = axisTitle = null;
		}


		// Run Axis

		// inverted charts have reversed xAxes as default
		if (inverted && isXAxis && reversed === UNDEFINED) {
			reversed = true;
		}


		// expose some variables
		extend(axis, {
			addPlotBand: addPlotBandOrLine,
			addPlotLine: addPlotBandOrLine,
			adjustTickAmount: adjustTickAmount,
			categories: categories,
			getExtremes: getExtremes,
			getPlotLinePath: getPlotLinePath,
			getThreshold: getThreshold,
			isXAxis: isXAxis,
			options: options,
			plotLinesAndBands: plotLinesAndBands,
			getOffset: getOffset,
			render: render,
			setCategories: setCategories,
			setExtremes: setExtremes,
			setScale: setScale,
			setTickPositions: setTickPositions,
			translate: translate,
			redraw: redraw,
			removePlotBand: removePlotBandOrLine,
			removePlotLine: removePlotBandOrLine,
			reversed: reversed,
			stacks: stacks,
			
			// PATCH by Simon Fishel
            //
            // - destroy: destroy
            // + stacks: stacks,
            // + ticks: ticks
            // exposing the ticks object for post-processing of the chart

            destroy: destroy,
            ticks: ticks
		});

		// register event listeners
		for (eventType in events) {
			addEvent(axis, eventType, events[eventType]);
		}

		// set min and max
		setScale();

	} // end Axis


	/**
	 * The toolbar object
	 */
	function Toolbar() {
		var buttons = {};

		/*jslint unparam: true*//* allow the unused param title until Toolbar rewrite*/
		function add(id, text, title, fn) {
			if (!buttons[id]) {
				var button = renderer.text(
					text,
					0,
					0
				)
				.css(options.toolbar.itemStyle)
				.align({
					align: 'right',
					x: -marginRight - 20,
					y: plotTop + 30
				})
				.on('click', fn)
				/*.on('touchstart', function(e) {
					e.stopPropagation(); // don't fire the container event
					fn();
				})*/
				.attr({
					align: 'right',
					zIndex: 20
				})
				.add();
				buttons[id] = button;
			}
		}
		/*jslint unparam: false*/

		function remove(id) {
			discardElement(buttons[id].element);
			buttons[id] = null;
		}

		// public
		return {
			add: add,
			remove: remove
		};
	}

	/**
	 * The tooltip object
	 * @param {Object} options Tooltip options
	 */
	function Tooltip(options) {
		var currentSeries,
			borderWidth = options.borderWidth,
			crosshairsOptions = options.crosshairs,
			crosshairs = [],
			style = options.style,
			shared = options.shared,
			padding = pInt(style.padding),
			boxOffLeft = borderWidth + padding, // off left/top position as IE can't
				//properly handle negative positioned shapes
			tooltipIsHidden = true,
			boxWidth,
			boxHeight,
			currentX = 0,
			currentY = 0;

		// remove padding CSS and apply padding on box instead
		style.padding = 0;

		// create the elements
		var group = renderer.g('tooltip')
			.attr({	zIndex: 8 })
			.add(),

			box = renderer.rect(boxOffLeft, boxOffLeft, 0, 0, options.borderRadius, borderWidth)
				.attr({
					fill: options.backgroundColor,
					'stroke-width': borderWidth
				})
				.add(group)
				.shadow(options.shadow),
			label = renderer.text('', padding + boxOffLeft, pInt(style.fontSize) + padding + boxOffLeft, options.useHTML)
				.attr({ zIndex: 1 })
				.css(style)
				.add(group);

		group.hide();

		/**
		 * Destroy the tooltip and its elements.
		 */
		function destroy() {
			each(crosshairs, function (crosshair) {
				if (crosshair) {
					crosshair.destroy();
				}
			});

			// Destroy and clear local variables
			each([box, label, group], function (obj) {
				if (obj) {
					obj.destroy();
				}
			});
			box = label = group = null;
		}

		/**
		 * In case no user defined formatter is given, this will be used
		 */
		function defaultFormatter() {
			var pThis = this,
				items = pThis.points || splat(pThis),
				xAxis = items[0].series.xAxis,
				x = pThis.x,
				isDateTime = xAxis && xAxis.options.type === 'datetime',
				useHeader = isString(x) || isDateTime,
				s;

			// build the header
			s = useHeader ?
				['<span style="font-size: 10px">' +
				(isDateTime ? dateFormat('%A, %b %e, %Y', x) :  x) +
				'</span>'] : [];

			// build the values
			each(items, function (item) {
				s.push(item.point.tooltipFormatter(useHeader));
			});
			return s.join('<br/>');
		}

		/**
		 * Provide a soft movement for the tooltip
		 *
		 * @param {Number} finalX
		 * @param {Number} finalY
		 */
		function move(finalX, finalY) {
		    
		    // PATCH here by Simon Fishel
            //
            // - currentX = tooltipIsHidden ? finalX : (2 * currentX + finalX) / 3;
            // - currentY = tooltipIsHidden ? finalY : (currentY + finalY) / 2;
            // + currentX = finalX;
            // + currentY = finalY;
            //
            // disable tooltip animation, instead just jump directly to the final location
            
            currentX = finalX;
            currentY = finalY;

			group.translate(currentX, currentY);


			// run on next tick of the mouse tracker
			if (mathAbs(finalX - currentX) > 1 || mathAbs(finalY - currentY) > 1) {
				tooltipTick = function () {
					move(finalX, finalY);
				};
			} else {
				tooltipTick = null;
			}
		}

		/**
		 * Hide the tooltip
		 */
		function hide() {
			if (!tooltipIsHidden) {
				var hoverPoints = chart.hoverPoints;

				group.hide();

				each(crosshairs, function (crosshair) {
					if (crosshair) {
						crosshair.hide();
					}
				});

				// hide previous hoverPoints and set new
				if (hoverPoints) {
					each(hoverPoints, function (point) {
						point.setState();
					});
				}
				chart.hoverPoints = null;


				tooltipIsHidden = true;
			}

		}

		/**
		 * Refresh the tooltip's text and position.
		 * @param {Object} point
		 *
		 */
		function refresh(point) {
			var x,
				y,
				show,
				bBox,
				plotX,
				plotY = 0,
				textConfig = {},
				text,
				pointConfig = [],
				tooltipPos = point.tooltipPos,
				formatter = options.formatter || defaultFormatter,
				hoverPoints = chart.hoverPoints,
				placedTooltipPoint;

			// shared tooltip, array is sent over
			if (shared) {

				// hide previous hoverPoints and set new
				if (hoverPoints) {
					each(hoverPoints, function (point) {
						point.setState();
					});
				}
				chart.hoverPoints = point;

				each(point, function (item) {
					/*var series = item.series,
						hoverPoint = series.hoverPoint;
					if (hoverPoint) {
						hoverPoint.setState();
					}
					series.hoverPoint = item;*/
					item.setState(HOVER_STATE);
					plotY += item.plotY; // for average

					pointConfig.push(item.getLabelConfig());
				});

				plotX = point[0].plotX;
				plotY = mathRound(plotY) / point.length; // mathRound because Opera 10 has problems here

				textConfig = {
					x: point[0].category
				};
				textConfig.points = pointConfig;
				point = point[0];

			// single point tooltip
			} else {
				textConfig = point.getLabelConfig();
			}
			text = formatter.call(textConfig);

			// register the current series
			currentSeries = point.series;

			// get the reference point coordinates (pie charts use tooltipPos)
			plotX = shared ? plotX : point.plotX;
			plotY = shared ? plotY : point.plotY;
			
			// PATCH here by Simon Fishel
            //
            // + if(point.series.chart.options.chart.type in {column: true, bar: true}) {
            // +     plotY = Math.max(plotY, 0);
            // + }
            //
            // adjust the y position so the tooltip will show up even if the value is off the chart
            // for column/bar charts
            
            if(point.series.chart.options.chart.type in {column: true, bar: true}) {
                plotY = Math.max(plotY, 0);
            }
            
            // PATCH here by Simon Fishel
            //
            // + if(point.series.chart.options.chart.type === 'column') {
            // +     plotX = point.barX;
            // + }
            //
            // adjustment to the tooltip horizontal position for column charts
            
            if(point.series.chart.options.chart.type === 'column') {
                plotX = point.barX;
            }
			
			x = mathRound(tooltipPos ? tooltipPos[0] : (inverted ? plotWidth - plotY : plotX));
			y = mathRound(tooltipPos ? tooltipPos[1] : (inverted ? plotHeight - plotX : plotY));


			// hide tooltip if the point falls outside the plot
			show = shared || !point.series.isCartesian || isInsidePlot(x, y);

			// update the inner HTML
			if (text === false || !show) {
				hide();
			} else {

				// show it
				if (tooltipIsHidden) {
					group.show();
					tooltipIsHidden = false;
				}

				// update text
				label.attr({
					text: text
				});

				// get the bounding box
				bBox = label.getBBox();
				boxWidth = bBox.width + 2 * padding;
				boxHeight = bBox.height + 2 * padding;

				// set the size of the box
				box.attr({
					width: boxWidth,
					height: boxHeight,
					stroke: options.borderColor || point.color || currentSeries.color || '#606060'
				});

				placedTooltipPoint = placeBox(boxWidth, boxHeight, plotLeft, plotTop, plotWidth, plotHeight, {x: x, y: y});

				// do the move
				move(mathRound(placedTooltipPoint.x - boxOffLeft), mathRound(placedTooltipPoint.y - boxOffLeft));
			}


			// crosshairs
			if (crosshairsOptions) {
				crosshairsOptions = splat(crosshairsOptions); // [x, y]

				var path,
					i = crosshairsOptions.length,
					attribs,
					axis;

				while (i--) {
					axis = point.series[i ? 'yAxis' : 'xAxis'];
					if (crosshairsOptions[i] && axis) {
						path = axis
							.getPlotLinePath(point[i ? 'y' : 'x'], 1);
						if (crosshairs[i]) {
							crosshairs[i].attr({ d: path, visibility: VISIBLE });

						} else {
							attribs = {
								'stroke-width': crosshairsOptions[i].width || 1,
								stroke: crosshairsOptions[i].color || '#C0C0C0',
								zIndex: 2
							};
							if (crosshairsOptions[i].dashStyle) {
								attribs.dashstyle = crosshairsOptions[i].dashStyle;
							}
							crosshairs[i] = renderer.path(path)
								.attr(attribs)
								.add();
						}
					}
				}
			}
		}



		// public members
		return {
			shared: shared,
			refresh: refresh,
			hide: hide,
			destroy: destroy
		};
	}

	/**
	 * The mouse tracker object
	 * @param {Object} options
	 */
	function MouseTracker(options) {


		var mouseDownX,
			mouseDownY,
			hasDragged,
			selectionMarker,
			zoomType = optionsChart.zoomType,
			zoomX = /x/.test(zoomType),
			zoomY = /y/.test(zoomType),
			zoomHor = (zoomX && !inverted) || (zoomY && inverted),
			zoomVert = (zoomY && !inverted) || (zoomX && inverted);

		/**
		 * Add crossbrowser support for chartX and chartY
		 * @param {Object} e The event object in standard browsers
		 */
		function normalizeMouseEvent(e) {
			var ePos,
				pageZoomFix = isWebKit &&
					doc.width / doc.body.scrollWidth -
					1, // #224, #348
				chartPosLeft,
				chartPosTop,
				chartX,
				chartY;

			// common IE normalizing
			e = e || win.event;
			if (!e.target) {
				e.target = e.srcElement;
			}

			// iOS
			ePos = e.touches ? e.touches.item(0) : e;

			// in certain cases, get mouse position
			if (e.type !== 'mousemove' || win.opera || pageZoomFix) { // only Opera needs position on mouse move, see below
				chartPosition = getPosition(container);
				chartPosLeft = chartPosition.left;
				chartPosTop = chartPosition.top;
			}

			// chartX and chartY
			if (isIE) { // IE including IE9 that has chartX but in a different meaning
				chartX = e.x;
				chartY = e.y;
			} else {
				if (ePos.layerX === UNDEFINED) { // Opera and iOS
					chartX = ePos.pageX - chartPosLeft;
					chartY = ePos.pageY - chartPosTop;
				} else {
					chartX = e.layerX;
					chartY = e.layerY;
				}
			}

			// correct for page zoom bug in WebKit
			if (pageZoomFix) {
				chartX += mathRound((pageZoomFix + 1) * chartPosLeft - chartPosLeft);
				chartY += mathRound((pageZoomFix + 1) * chartPosTop - chartPosTop);
			}

			return extend(e, {
				chartX: chartX,
				chartY: chartY
			});
		}

		/**
		 * Get the click position in terms of axis values.
		 *
		 * @param {Object} e A mouse event
		 */
		function getMouseCoordinates(e) {
			var coordinates = {
				xAxis: [],
				yAxis: []
			};
			each(axes, function (axis) {
				var translate = axis.translate,
					isXAxis = axis.isXAxis,
					isHorizontal = inverted ? !isXAxis : isXAxis;

				coordinates[isXAxis ? 'xAxis' : 'yAxis'].push({
					axis: axis,
					value: translate(
						isHorizontal ?
							e.chartX - plotLeft  :
							plotHeight - e.chartY + plotTop,
						true
					)
				});
			});
			return coordinates;
		}

		/**
		 * With line type charts with a single tracker, get the point closest to the mouse
		 */
		function onmousemove(e) {
			var point,
				points,
				hoverPoint = chart.hoverPoint,
				hoverSeries = chart.hoverSeries,
				i,
				j,
				distance = chartWidth,
				index = inverted ? e.chartY : e.chartX - plotLeft; // wtf?

			// shared tooltip
			if (tooltip && options.shared) {
				points = [];

				// loop over all series and find the ones with points closest to the mouse
				i = series.length;
				for (j = 0; j < i; j++) {
					if (series[j].visible && series[j].tooltipPoints.length) {
						point = series[j].tooltipPoints[index];
						point._dist = mathAbs(index - point.plotX);
						distance = mathMin(distance, point._dist);
						points.push(point);
					}
				}
				// remove furthest points
				i = points.length;
				while (i--) {
					if (points[i]._dist > distance) {
						points.splice(i, 1);
					}
				}
				// refresh the tooltip if necessary
				if (points.length && (points[0].plotX !== hoverX)) {
					tooltip.refresh(points);
					hoverX = points[0].plotX;
				}
			}

			// separate tooltip and general mouse events
			if (hoverSeries && hoverSeries.tracker) { // only use for line-type series with common tracker

				// get the point
				point = hoverSeries.tooltipPoints[index];

				// a new point is hovered, refresh the tooltip
				if (point && point !== hoverPoint) {

					// trigger the events
					point.onMouseOver();

				}
			}
		}



		/**
		 * Reset the tracking by hiding the tooltip, the hover series state and the hover point
		 */
		function resetTracker() {
			var hoverSeries = chart.hoverSeries,
				hoverPoint = chart.hoverPoint;

			if (hoverPoint) {
				hoverPoint.onMouseOut();
			}

			if (hoverSeries) {
				hoverSeries.onMouseOut();
			}

			if (tooltip) {
				tooltip.hide();
			}

			hoverX = null;
		}

		/**
		 * Mouse up or outside the plot area
		 */
		function drop() {
			if (selectionMarker) {
				var selectionData = {
						xAxis: [],
						yAxis: []
					},
					selectionBox = selectionMarker.getBBox(),
					selectionLeft = selectionBox.x - plotLeft,
					selectionTop = selectionBox.y - plotTop;


				// a selection has been made
				if (hasDragged) {

					// record each axis' min and max
					each(axes, function (axis) {
						var translate = axis.translate,
							isXAxis = axis.isXAxis,
							isHorizontal = inverted ? !isXAxis : isXAxis,
							selectionMin = translate(
								isHorizontal ?
									selectionLeft :
									plotHeight - selectionTop - selectionBox.height,
								true,
								0,
								0,
								1
							),
							selectionMax = translate(
								isHorizontal ?
									selectionLeft + selectionBox.width :
									plotHeight - selectionTop,
								true,
								0,
								0,
								1
							);

							selectionData[isXAxis ? 'xAxis' : 'yAxis'].push({
								axis: axis,
								min: mathMin(selectionMin, selectionMax), // for reversed axes,
								max: mathMax(selectionMin, selectionMax)
							});

					});
					fireEvent(chart, 'selection', selectionData, zoom);

				}
				selectionMarker = selectionMarker.destroy();
			}

			chart.mouseIsDown = mouseIsDown = hasDragged = false;
			removeEvent(doc, hasTouch ? 'touchend' : 'mouseup', drop);

		}

		/**
		 * Special handler for mouse move that will hide the tooltip when the mouse leaves the plotarea.
		 */
		function hideTooltipOnMouseMove(e) {
			var pageX = defined(e.pageX) ? e.pageX : e.page.x, // In mootools the event is wrapped and the page x/y position is named e.page.x
				pageY = defined(e.pageX) ? e.pageY : e.page.y; // Ref: http://mootools.net/docs/core/Types/DOMEvent

			if (chartPosition &&
					!isInsidePlot(pageX - chartPosition.left - plotLeft,
						pageY - chartPosition.top - plotTop)) {
				resetTracker();
			}
		}

		/**
		 * Set the JS events on the container element
		 */
		function setDOMEvents() {
			var lastWasOutsidePlot = true;
			/*
			 * Record the starting position of a dragoperation
			 */
			container.onmousedown = function (e) {
				e = normalizeMouseEvent(e);

				// issue #295, dragging not always working in Firefox
				if (!hasTouch && e.preventDefault) {
					e.preventDefault();
				}

				// record the start position
				chart.mouseIsDown = mouseIsDown = true;
				mouseDownX = e.chartX;
				mouseDownY = e.chartY;

				addEvent(doc, hasTouch ? 'touchend' : 'mouseup', drop);
			};

			// The mousemove, touchmove and touchstart event handler
			var mouseMove = function (e) {

				// let the system handle multitouch operations like two finger scroll
				// and pinching
				if (e && e.touches && e.touches.length > 1) {
					return;
				}

				// normalize
				e = normalizeMouseEvent(e);
				if (!hasTouch) { // not for touch devices
					e.returnValue = false;
				}

				var chartX = e.chartX,
					chartY = e.chartY,
					isOutsidePlot = !isInsidePlot(chartX - plotLeft, chartY - plotTop);

				// cache chart position for issue #149 fix
				if (!chartPosition) {
					chartPosition = getPosition(container);
				}

				// on touch devices, only trigger click if a handler is defined
				if (hasTouch && e.type === 'touchstart') {
					if (attr(e.target, 'isTracker')) {
						if (!chart.runTrackerClick) {
							e.preventDefault();
						}
					} else if (!runChartClick && !isOutsidePlot) {
						e.preventDefault();
					}
				}

				// cancel on mouse outside
				if (isOutsidePlot) {

					/*if (!lastWasOutsidePlot) {
						// reset the tracker
						resetTracker();
					}*/

					// drop the selection if any and reset mouseIsDown and hasDragged
					//drop();
					if (chartX < plotLeft) {
						chartX = plotLeft;
					} else if (chartX > plotLeft + plotWidth) {
						chartX = plotLeft + plotWidth;
					}

					if (chartY < plotTop) {
						chartY = plotTop;
					} else if (chartY > plotTop + plotHeight) {
						chartY = plotTop + plotHeight;
					}

				}

				if (mouseIsDown && e.type !== 'touchstart') { // make selection

					// determine if the mouse has moved more than 10px
					hasDragged = Math.sqrt(
						Math.pow(mouseDownX - chartX, 2) +
						Math.pow(mouseDownY - chartY, 2)
					);
					if (hasDragged > 10) {

						// make a selection
						if (hasCartesianSeries && (zoomX || zoomY) &&
								isInsidePlot(mouseDownX - plotLeft, mouseDownY - plotTop)) {
							if (!selectionMarker) {
								selectionMarker = renderer.rect(
									plotLeft,
									plotTop,
									zoomHor ? 1 : plotWidth,
									zoomVert ? 1 : plotHeight,
									0
								)
								.attr({
									fill: optionsChart.selectionMarkerFill || 'rgba(69,114,167,0.25)',
									zIndex: 7
								})
								.add();
							}
						}

						// adjust the width of the selection marker
						if (selectionMarker && zoomHor) {
							var xSize = chartX - mouseDownX;
							selectionMarker.attr({
								width: mathAbs(xSize),
								x: (xSize > 0 ? 0 : xSize) + mouseDownX
							});
						}
						// adjust the height of the selection marker
						if (selectionMarker && zoomVert) {
							var ySize = chartY - mouseDownY;
							selectionMarker.attr({
								height: mathAbs(ySize),
								y: (ySize > 0 ? 0 : ySize) + mouseDownY
							});
						}
					}

				} else if (!isOutsidePlot) {
					// show the tooltip
					onmousemove(e);
				}

				lastWasOutsidePlot = isOutsidePlot;

				// when outside plot, allow touch-drag by returning true
				return isOutsidePlot || !hasCartesianSeries;
			};

			/*
			 * When the mouse enters the container, run mouseMove
			 */
			container.onmousemove = mouseMove;

			/*
			 * When the mouse leaves the container, hide the tracking (tooltip).
			 */
			addEvent(container, 'mouseleave', resetTracker);

			// issue #149 workaround
			// The mouseleave event above does not always fire. Whenever the mouse is moving
			// outside the plotarea, hide the tooltip
			addEvent(doc, 'mousemove', hideTooltipOnMouseMove);

			container.ontouchstart = function (e) {
				// For touch devices, use touchmove to zoom
				if (zoomX || zoomY) {
					container.onmousedown(e);
				}
				// Show tooltip and prevent the lower mouse pseudo event
				mouseMove(e);
			};

			/*
			 * Allow dragging the finger over the chart to read the values on touch
			 * devices
			 */
			container.ontouchmove = mouseMove;

			/*
			 * Allow dragging the finger over the chart to read the values on touch
			 * devices
			 */
			container.ontouchend = function () {
				if (hasDragged) {
					resetTracker();
				}
			};


			// MooTools 1.2.3 doesn't fire this in IE when using addEvent
			container.onclick = function (e) {
				var hoverPoint = chart.hoverPoint;
				e = normalizeMouseEvent(e);

				e.cancelBubble = true; // IE specific


				if (!hasDragged) {
					if (hoverPoint && attr(e.target, 'isTracker')) {
						var plotX = hoverPoint.plotX,
							plotY = hoverPoint.plotY;

						// add page position info
						extend(hoverPoint, {
							pageX: chartPosition.left + plotLeft +
								(inverted ? plotWidth - plotY : plotX),
							pageY: chartPosition.top + plotTop +
								(inverted ? plotHeight - plotX : plotY)
						});

						// the series click event
						fireEvent(hoverPoint.series, 'click', extend(e, {
							point: hoverPoint
						}));

						// the point click event
						hoverPoint.firePointEvent('click', e);

					} else {
						extend(e, getMouseCoordinates(e));

						// fire a click event in the chart
						if (isInsidePlot(e.chartX - plotLeft, e.chartY - plotTop)) {
							fireEvent(chart, 'click', e);
						}
					}


				}
				// reset mouseIsDown and hasDragged
				hasDragged = false;
			};

		}

		/**
		 * Destroys the MouseTracker object and disconnects DOM events.
		 */
		function destroy() {
			// Destroy the tracker group element
			if (chart.trackerGroup) {
				chart.trackerGroup = trackerGroup = chart.trackerGroup.destroy();
			}

			removeEvent(doc, 'mousemove', hideTooltipOnMouseMove);
			container.onclick = container.onmousedown = container.onmousemove = container.ontouchstart = container.ontouchend = container.ontouchmove = null;
		}

		/**
		 * Create the image map that listens for mouseovers
		 */
		placeTrackerGroup = function () {

			// first create - plot positions is not final at this stage
			if (!trackerGroup) {
				chart.trackerGroup = trackerGroup = renderer.g('tracker')
					.attr({ zIndex: 9 })
					.add();

			// then position - this happens on load and after resizing and changing
			// axis or box positions
			} else {
				trackerGroup.translate(plotLeft, plotTop);
				if (inverted) {
					trackerGroup.attr({
						width: chart.plotWidth,
						height: chart.plotHeight
					}).invert();
				}
			}
		};


		// Run MouseTracker
		placeTrackerGroup();
		if (options.enabled) {
			chart.tooltip = tooltip = Tooltip(options);
		}

		setDOMEvents();

		// set the fixed interval ticking for the smooth tooltip
		tooltipInterval = setInterval(function () {
			if (tooltipTick) {
				tooltipTick();
			}
		}, 32);

		// expose properties
		extend(this, {
			zoomX: zoomX,
			zoomY: zoomY,
			resetTracker: resetTracker,
			destroy: destroy
		});
	}



	/**
	 * The overview of the chart's series
	 */
	var Legend = function () {

		var options = chart.options.legend;

		if (!options.enabled) {
			return;
		}

		var horizontal = options.layout === 'horizontal',
			symbolWidth = options.symbolWidth,
			symbolPadding = options.symbolPadding,
			allItems,
			style = options.style,
			itemStyle = options.itemStyle,
			itemHoverStyle = options.itemHoverStyle,
			itemHiddenStyle = options.itemHiddenStyle,
			padding = pInt(style.padding),
			y = 18,
			initialItemX = 4 + padding + symbolWidth + symbolPadding,
			itemX,
			itemY,
			lastItemY,
			itemHeight = 0,
			box,
			legendBorderWidth = options.borderWidth,
			legendBackgroundColor = options.backgroundColor,
			legendGroup,
			offsetWidth,
			widthOption = options.width,
			series = chart.series,
			reversedLegend = options.reversed;

		// PATCH by Simon Fishel
        //
        // read in hooks from the options object
        //
        // + var hooks = options.hooks || {};
        
        var hooks = options.hooks || {};

		/**
		 * Set the colors for the legend item
		 * @param {Object} item A Series or Point instance
		 * @param {Object} visible Dimmed or colored
		 */
		function colorizeItem(item, visible) {
			var legendItem = item.legendItem,
				legendLine = item.legendLine,
				legendSymbol = item.legendSymbol,
				hiddenColor = itemHiddenStyle.color,
				textColor = visible ? options.itemStyle.color : hiddenColor,
				lineColor = visible ? item.color : hiddenColor,
				symbolAttr = visible ? item.pointAttr[NORMAL_STATE] : {
					stroke: hiddenColor,
					fill: hiddenColor
				};

			if (legendItem) {
				legendItem.css({ fill: textColor });
			}
			if (legendLine) {
				legendLine.attr({ stroke: lineColor });
			}
			if (legendSymbol) {
				legendSymbol.attr(symbolAttr);
			}

		}

		/**
		 * Position the legend item
		 * @param {Object} item A Series or Point instance
		 * @param {Object} visible Dimmed or colored
		 */
		function positionItem(item, itemX, itemY) {
			var legendItem = item.legendItem,
				legendLine = item.legendLine,
				legendSymbol = item.legendSymbol,
				checkbox = item.checkbox;
			if (legendItem) {
				legendItem.attr({
					x: itemX,
					y: itemY
				});
			}
			if (legendLine) {
				legendLine.translate(itemX, itemY - 4);
			}
			if (legendSymbol) {
				legendSymbol.attr({
					x: itemX + legendSymbol.xOff,
					y: itemY + legendSymbol.yOff
				});
			}
			if (checkbox) {
				checkbox.x = itemX;
				checkbox.y = itemY;
			}
		}

		/**
		 * Destroy a single legend item
		 * @param {Object} item The series or point
		 */
		function destroyItem(item) {
			var checkbox = item.checkbox;

			// pull out from the array
			//erase(allItems, item);

			// destroy SVG elements
			each(['legendItem', 'legendLine', 'legendSymbol'], function (key) {
				if (item[key]) {
					item[key].destroy();
				}
			});

			if (checkbox) {
				discardElement(item.checkbox);
			}


		}

		/**
		 * Destroys the legend.
		 */
		function destroy() {
			if (box) {
				box = box.destroy();
			}

			if (legendGroup) {
				legendGroup = legendGroup.destroy();
			}
		}

		/**
		 * Position the checkboxes after the width is determined
		 */
		function positionCheckboxes() {
			each(allItems, function (item) {
				var checkbox = item.checkbox,
					alignAttr = legendGroup.alignAttr;
				if (checkbox) {
					css(checkbox, {
						left: (alignAttr.translateX + item.legendItemWidth + checkbox.x - 40) + PX,
						top: (alignAttr.translateY + checkbox.y - 11) + PX
					});
				}
			});
		}

		/**
		 * Render a single specific legend item
		 * @param {Object} item A series or point
		 */
		function renderItem(item) {
			var bBox,
				itemWidth,
				legendSymbol,
				symbolX,
				symbolY,
				simpleSymbol,
				li = item.legendItem,
				series = item.series || item,
				itemOptions = series.options,
				strokeWidth = (itemOptions && itemOptions.borderWidth) || 0;

			if (!li) { // generate it once, later move it

				// let these series types use a simple symbol
				simpleSymbol = /^(bar|pie|area|column)$/.test(series.type);

				// generate the list item text
				item.legendItem = li = renderer.text(
						options.labelFormatter.call(item),
						0,
						0
					)
					.css(item.visible ? itemStyle : itemHiddenStyle)
					.on('mouseover', function () {
						item.setState(HOVER_STATE);
						li.css(itemHoverStyle);
					})
					.on('mouseout', function () {
						li.css(item.visible ? itemStyle : itemHiddenStyle);
						item.setState();
					})
					
					// PATCH by Simon Fishel
					// 
					// see below
					// 
					// - .on('click', function () {
					// + .on('click', function (event) {
					
					.on('click', function (event) {
						var strLegendItemClick = 'legendItemClick',
							fnLegendItemClick = function () {
								item.setVisible();
							};
						
						// PATCH by Simon Fishel
						//
						// passing any control/command key modifiers to the event handler
						//
						// + var eventArgs = {
                        // +     ctrlKey: event.ctrlKey,
                        // +     metaKey: event.metaKey
                        // + };
						//
						//   // click the name or symbol
	                    //   if (item.firePointEvent) { // point
						// -     item.firePointEvent(strLegendItemClick, null, fnLegendItemClick);
	                    // +     item.firePointEvent(strLegendItemClick, eventArgs, fnLegendItemClick);
	                    //   } else {
						// -     fireEvent(item, strLegendItemClick, null, fnLegendItemClick);
	                    // +     fireEvent(item, strLegendItemClick, eventArgs, fnLegendItemClick);
	                    //   }
							
						var eventArgs = {
						    ctrlKey: event.ctrlKey,
						    metaKey: event.metaKey
						};

						// click the name or symbol
						if (item.firePointEvent) { // point
							item.firePointEvent(strLegendItemClick, eventArgs, fnLegendItemClick);
						} else {
							fireEvent(item, strLegendItemClick, eventArgs, fnLegendItemClick);
						}
					})
					.attr({ zIndex: 2 })
					.add(legendGroup);

				// draw the line
				if (!simpleSymbol && itemOptions && itemOptions.lineWidth) {
					var attrs = {
							'stroke-width': itemOptions.lineWidth,
							zIndex: 2
						};
					if (itemOptions.dashStyle) {
						attrs.dashstyle = itemOptions.dashStyle;
					}
					item.legendLine = renderer.path([
						M,
						-symbolWidth - symbolPadding,
						0,
						L,
						-symbolPadding,
						0
					])
					.attr(attrs)
					.add(legendGroup);
				}

				// draw a simple symbol
				if (simpleSymbol) { // bar|pie|area|column

					legendSymbol = renderer.rect(
						(symbolX = -symbolWidth - symbolPadding),
						(symbolY = -11),
						symbolWidth,
						12,
						2
					).attr({
						//'stroke-width': 0,
						zIndex: 3
					}).add(legendGroup);

				// draw the marker
				} else if (itemOptions && itemOptions.marker && itemOptions.marker.enabled) {
					legendSymbol = renderer.symbol(
						item.symbol,
						(symbolX = -symbolWidth / 2 - symbolPadding),
						(symbolY = -4),
						itemOptions.marker.radius
					)
					//.attr(item.pointAttr[NORMAL_STATE])
					.attr({ zIndex: 3 })
					.add(legendGroup);

				}
				if (legendSymbol) {
					legendSymbol.xOff = symbolX + (strokeWidth % 2 / 2);
					legendSymbol.yOff = symbolY + (strokeWidth % 2 / 2);
				}

				item.legendSymbol = legendSymbol;

				// colorize the items
				colorizeItem(item, item.visible);


				// add the HTML checkbox on top
				if (itemOptions && itemOptions.showCheckbox) {
					item.checkbox = createElement('input', {
						type: 'checkbox',
						checked: item.selected,
						defaultChecked: item.selected // required by IE7
					}, options.itemCheckboxStyle, container);

					addEvent(item.checkbox, 'click', function (event) {
						var target = event.target;
						fireEvent(item, 'checkboxClick', {
								checked: target.checked
							},
							function () {
								item.select();
							}
						);
					});
				}
			}


			// calculate the positions for the next line
			bBox = li.getBBox();

			itemWidth = item.legendItemWidth =
				options.itemWidth || symbolWidth + symbolPadding + bBox.width + padding;
			itemHeight = bBox.height;

			// if the item exceeds the width, start a new line
			if (horizontal && itemX - initialItemX + itemWidth >
					(widthOption || (chartWidth - 2 * padding - initialItemX))) {
				itemX = initialItemX;
				itemY += itemHeight;
			}
			lastItemY = itemY;

			// position the newly generated or reordered items
			positionItem(item, itemX, itemY);

			// advance
			if (horizontal) {
				itemX += itemWidth;
			} else {
				itemY += itemHeight;
			}

			// the width of the widest item
			offsetWidth = widthOption || mathMax(
				horizontal ? itemX - initialItemX : itemWidth,
				offsetWidth
			);



			// add it all to an array to use below
			//allItems.push(item);
		}

		/**
		 * Render the legend. This method can be called both before and after
		 * chart.render. If called after, it will only rearrange items instead
		 * of creating new ones.
		 */
		function renderLegend() {
			itemX = initialItemX;
			itemY = y;
			offsetWidth = 0;
			lastItemY = 0;

			if (!legendGroup) {
				legendGroup = renderer.g('legend')
					.attr({ zIndex: 7 })
					.add();
			}


			// add each series or point
			allItems = [];
			each(series, function (serie) {
				var seriesOptions = serie.options;

				if (!seriesOptions.showInLegend) {
					return;
				}

				// use points or series for the legend item depending on legendType
				allItems = allItems.concat(seriesOptions.legendType === 'point' ?
					serie.data :
					serie
				);

			});

			// sort by legendIndex
			stableSort(allItems, function (a, b) {
				return (a.options.legendIndex || 0) - (b.options.legendIndex || 0);
			});

			// reversed legend
			if (reversedLegend) {
				allItems.reverse();
			}

			// render the items
			
			// PATCH by Simon Fishel
            //
            // call label render hook before rendering the legend items
            //
            // + if(hooks.labelRenderHook) {
            // +    hooks.labelRenderHook(allItems, options, itemStyle, spacingBox, renderer);
            // + }
            
            if(hooks.labelRenderHook) {
                hooks.labelRenderHook(allItems, options, itemStyle, spacingBox, renderer);
            }
			
			each(allItems, renderItem);



			// Draw the border
			legendWidth = widthOption || offsetWidth;
			legendHeight = lastItemY - y + itemHeight;

			if (legendBorderWidth || legendBackgroundColor) {
				legendWidth += 2 * padding;
				legendHeight += 2 * padding;

				if (!box) {
					box = renderer.rect(
						0,
						0,
						legendWidth,
						legendHeight,
						options.borderRadius,
						legendBorderWidth || 0
					).attr({
						stroke: options.borderColor,
						'stroke-width': legendBorderWidth || 0,
						fill: legendBackgroundColor || NONE
					})
					.add(legendGroup)
					.shadow(options.shadow);
					box.isNew = true;

				} else if (legendWidth > 0 && legendHeight > 0) {
					box[box.isNew ? 'attr' : 'animate'](
						box.crisp(null, null, null, legendWidth, legendHeight)
					);
					box.isNew = false;
				}

				// hide the border if no items
				box[allItems.length ? 'show' : 'hide']();
			}

			// 1.x compatibility: positioning based on style
			var props = ['left', 'right', 'top', 'bottom'],
				prop,
				i = 4;
			while (i--) {
				prop = props[i];
				if (style[prop] && style[prop] !== 'auto') {
					options[i < 2 ? 'align' : 'verticalAlign'] = prop;
					options[i < 2 ? 'x' : 'y'] = pInt(style[prop]) * (i % 2 ? -1 : 1);
				}
			}
			
			// PATCH by Simon Fishel
            // 
            // call placement hook before aligning the legend element
            //
            // + if(hooks.placementHook) {
            // +    hooks.placementHook(options, legendWidth, legendHeight, spacingBox);
            // + }
            
            if(hooks.placementHook) {
                hooks.placementHook(options, legendWidth, legendHeight, spacingBox);
            }

			if (allItems.length) {
				legendGroup.align(extend(options, {
					width: legendWidth,
					height: legendHeight
				}), true, spacingBox);
			}

			if (!isResizing) {
				positionCheckboxes();
			}
		}


		// run legend
		renderLegend();

		// move checkboxes
		addEvent(chart, 'endResize', positionCheckboxes);

		// expose
		return {
			colorizeItem: colorizeItem,
			destroyItem: destroyItem,
			renderLegend: renderLegend,
			destroy: destroy
		};
	};






	/**
	 * Initialize an individual series, called internally before render time
	 */
	function initSeries(options) {
		var type = options.type || optionsChart.type || optionsChart.defaultSeriesType,
			typeClass = seriesTypes[type],
			serie,
			hasRendered = chart.hasRendered;

		// an inverted chart can't take a column series and vice versa
		if (hasRendered) {
			if (inverted && type === 'column') {
				typeClass = seriesTypes.bar;
			} else if (!inverted && type === 'bar') {
				typeClass = seriesTypes.column;
			}
		}

		serie = new typeClass();

		serie.init(chart, options);

		// set internal chart properties
		if (!hasRendered && serie.inverted) {
			inverted = true;
		}
		if (serie.isCartesian) {
			hasCartesianSeries = serie.isCartesian;
		}

		series.push(serie);

		return serie;
	}

	/**
	 * Add a series dynamically after  time
	 *
	 * @param {Object} options The config options
	 * @param {Boolean} redraw Whether to redraw the chart after adding. Defaults to true.
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 *
	 * @return {Object} series The newly created series object
	 */
	function addSeries(options, redraw, animation) {
		var series;

		if (options) {
			setAnimation(animation, chart);
			redraw = pick(redraw, true); // defaults to true

			fireEvent(chart, 'addSeries', { options: options }, function () {
				series = initSeries(options);
				series.isDirty = true;

				chart.isDirtyLegend = true; // the series array is out of sync with the display
				if (redraw) {
					chart.redraw();
				}
			});
		}

		return series;
	}

	/**
	 * Check whether a given point is within the plot area
	 *
	 * @param {Number} x Pixel x relative to the coordinateSystem
	 * @param {Number} y Pixel y relative to the coordinateSystem
	 */
	isInsidePlot = function (x, y) {
		return x >= 0 &&
			x <= plotWidth &&
			y >= 0 &&
			y <= plotHeight;
	};

	/**
	 * Adjust all axes tick amounts
	 */
	function adjustTickAmounts() {
		if (optionsChart.alignTicks !== false) {
			each(axes, function (axis) {
				axis.adjustTickAmount();
			});
		}
		maxTicks = null;
	}

	/**
	 * Redraw legend, axes or series based on updated data
	 *
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 */
	function redraw(animation) {
		var redrawLegend = chart.isDirtyLegend,
			hasStackedSeries,
			isDirtyBox = chart.isDirtyBox, // todo: check if it has actually changed?
			seriesLength = series.length,
			i = seriesLength,
			clipRect = chart.clipRect,
			serie;

		setAnimation(animation, chart);

		// link stacked series
		while (i--) {
			serie = series[i];
			if (serie.isDirty && serie.options.stacking) {
				hasStackedSeries = true;
				break;
			}
		}
		if (hasStackedSeries) { // mark others as dirty
			i = seriesLength;
			while (i--) {
				serie = series[i];
				if (serie.options.stacking) {
					serie.isDirty = true;
				}
			}
		}

		// handle updated data in the series
		each(series, function (serie) {
			if (serie.isDirty) { // prepare the data so axis can read it
				serie.cleanData();
				serie.getSegments();

				if (serie.options.legendType === 'point') {
					redrawLegend = true;
				}
			}
		});

		// handle added or removed series
		if (redrawLegend && legend.renderLegend) { // series or pie points are added or removed
			// draw legend graphics
			legend.renderLegend();

			chart.isDirtyLegend = false;
		}

		if (hasCartesianSeries) {
			if (!isResizing) {

				// reset maxTicks
				maxTicks = null;

				// set axes scales
				each(axes, function (axis) {
					axis.setScale();
				});
			}
			adjustTickAmounts();
			getMargins();

			// redraw axes
			each(axes, function (axis) {
				if (axis.isDirty || isDirtyBox) {
					axis.redraw();
					isDirtyBox = true; // always redraw box to reflect changes in the axis labels
				}
			});


		}

		// the plot areas size has changed
		if (isDirtyBox) {
			drawChartBox();
			placeTrackerGroup();

			// move clip rect
			if (clipRect) {
				stop(clipRect);
				clipRect.animate({ // for chart resize
					width: chart.plotSizeX,
					height: chart.plotSizeY
				});
			}

		}


		// redraw affected series
		each(series, function (serie) {
			if (serie.isDirty && serie.visible &&
					(!serie.isCartesian || serie.xAxis)) { // issue #153
				serie.redraw();
			}
		});


		// hide tooltip and hover states
		if (tracker && tracker.resetTracker) {
			tracker.resetTracker();
		}

		// fire the event
		fireEvent(chart, 'redraw');
	}



	/**
	 * Dim the chart and show a loading text or symbol
	 * @param {String} str An optional text to show in the loading label instead of the default one
	 */
	function showLoading(str) {
		var loadingOptions = options.loading;

		// create the layer at the first call
		if (!loadingDiv) {
			loadingDiv = createElement(DIV, {
				className: 'highcharts-loading'
			}, extend(loadingOptions.style, {
				left: plotLeft + PX,
				top: plotTop + PX,
				width: plotWidth + PX,
				height: plotHeight + PX,
				zIndex: 10,
				display: NONE
			}), container);

			loadingSpan = createElement(
				'span',
				null,
				loadingOptions.labelStyle,
				loadingDiv
			);

		}

		// update text
		loadingSpan.innerHTML = str || options.lang.loading;

		// show it
		if (!loadingShown) {
			css(loadingDiv, { opacity: 0, display: '' });
			animate(loadingDiv, {
				opacity: loadingOptions.style.opacity
			}, {
				duration: loadingOptions.showDuration
			});
			loadingShown = true;
		}
	}
	/**
	 * Hide the loading layer
	 */
	function hideLoading() {
		animate(loadingDiv, {
			opacity: 0
		}, {
			duration: options.loading.hideDuration,
			complete: function () {
				css(loadingDiv, { display: NONE });
			}
		});
		loadingShown = false;
	}

	/**
	 * Get an axis, series or point object by id.
	 * @param id {String} The id as given in the configuration options
	 */
	function get(id) {
		var i,
			j,
			data;

		// search axes
		for (i = 0; i < axes.length; i++) {
			if (axes[i].options.id === id) {
				return axes[i];
			}
		}

		// search series
		for (i = 0; i < series.length; i++) {
			if (series[i].options.id === id) {
				return series[i];
			}
		}

		// search points
		for (i = 0; i < series.length; i++) {
			data = series[i].data;
			for (j = 0; j < data.length; j++) {
				if (data[j].id === id) {
					return data[j];
				}
			}
		}
		return null;
	}

	/**
	 * Create the Axis instances based on the config options
	 */
	function getAxes() {
		var xAxisOptions = options.xAxis || {},
			yAxisOptions = options.yAxis || {},
			axis;

		// make sure the options are arrays and add some members
		xAxisOptions = splat(xAxisOptions);
		each(xAxisOptions, function (axis, i) {
			axis.index = i;
			axis.isX = true;
		});

		yAxisOptions = splat(yAxisOptions);
		each(yAxisOptions, function (axis, i) {
			axis.index = i;
		});

		// concatenate all axis options into one array
		axes = xAxisOptions.concat(yAxisOptions);

		// loop the options and construct axis objects
		chart.xAxis = [];
		chart.yAxis = [];
		axes = map(axes, function (axisOptions) {
			axis = new Axis(axisOptions);
			chart[axis.isXAxis ? 'xAxis' : 'yAxis'].push(axis);

			return axis;
		});

		adjustTickAmounts();
	}


	/**
	 * Get the currently selected points from all series
	 */
	function getSelectedPoints() {
		var points = [];
		each(series, function (serie) {
			points = points.concat(grep(serie.data, function (point) {
				return point.selected;
			}));
		});
		return points;
	}

	/**
	 * Get the currently selected series
	 */
	function getSelectedSeries() {
		return grep(series, function (serie) {
			return serie.selected;
		});
	}

	/**
	 * Zoom out to 1:1
	 */
	zoomOut = function () {
		fireEvent(chart, 'selection', { resetSelection: true }, zoom);
		chart.toolbar.remove('zoom');

	};
	/**
	 * Zoom into a given portion of the chart given by axis coordinates
	 * @param {Object} event
	 */
	zoom = function (event) {

		// add button to reset selection
		var lang = defaultOptions.lang,
			animate = chart.pointCount < 100;
		chart.toolbar.add('zoom', lang.resetZoom, lang.resetZoomTitle, zoomOut);

		// if zoom is called with no arguments, reset the axes
		if (!event || event.resetSelection) {
			each(axes, function (axis) {
				axis.setExtremes(null, null, false, animate);
			});
		} else { // else, zoom in on all axes
			each(event.xAxis.concat(event.yAxis), function (axisData) {
				var axis = axisData.axis;

				// don't zoom more than maxZoom
				if (chart.tracker[axis.isXAxis ? 'zoomX' : 'zoomY']) {
					axis.setExtremes(axisData.min, axisData.max, false, animate);
				}
			});
		}

		// redraw chart
		redraw();
	};

	/**
	 * Show the title and subtitle of the chart
	 *
	 * @param titleOptions {Object} New title options
	 * @param subtitleOptions {Object} New subtitle options
	 *
	 */
	function setTitle(titleOptions, subtitleOptions) {

		chartTitleOptions = merge(options.title, titleOptions);
		chartSubtitleOptions = merge(options.subtitle, subtitleOptions);

		// add title and subtitle
		each([
			['title', titleOptions, chartTitleOptions],
			['subtitle', subtitleOptions, chartSubtitleOptions]
		], function (arr) {
			var name = arr[0],
				title = chart[name],
				titleOptions = arr[1],
				chartTitleOptions = arr[2];

			if (title && titleOptions) {
				title = title.destroy(); // remove old
			}
			if (chartTitleOptions && chartTitleOptions.text && !title) {
				chart[name] = renderer.text(
					chartTitleOptions.text,
					0,
					0,
					chartTitleOptions.useHTML
				)
				.attr({
					align: chartTitleOptions.align,
					'class': 'highcharts-' + name,
					zIndex: 1
				})
				.css(chartTitleOptions.style)
				.add()
				.align(chartTitleOptions, false, spacingBox);
			}
		});

	}

	/**
	 * Get chart width and height according to options and container size
	 */
	function getChartSize() {

		containerWidth = (renderToClone || renderTo).offsetWidth;
		containerHeight = (renderToClone || renderTo).offsetHeight;
		chart.chartWidth = chartWidth = optionsChart.width || containerWidth || 600;
		chart.chartHeight = chartHeight = optionsChart.height ||
			// the offsetHeight of an empty container is 0 in standard browsers, but 19 in IE7:
			(containerHeight > 19 ? containerHeight : 400);
	}


	/**
	 * Get the containing element, determine the size and create the inner container
	 * div to hold the chart
	 */
	function getContainer() {
		renderTo = optionsChart.renderTo;
		containerId = PREFIX + idCounter++;

		if (isString(renderTo)) {
			renderTo = doc.getElementById(renderTo);
		}

		// remove previous chart
		renderTo.innerHTML = '';

		// If the container doesn't have an offsetWidth, it has or is a child of a node
		// that has display:none. We need to temporarily move it out to a visible
		// state to determine the size, else the legend and tooltips won't render
		// properly
		if (!renderTo.offsetWidth) {
			renderToClone = renderTo.cloneNode(0);
			css(renderToClone, {
				position: ABSOLUTE,
				top: '-9999px',
				display: ''
			});
			doc.body.appendChild(renderToClone);
		}

		// get the width and height
		getChartSize();

		// create the inner container
		chart.container = container = createElement(DIV, {
				className: 'highcharts-container' +
					(optionsChart.className ? ' ' + optionsChart.className : ''),
				id: containerId
			}, extend({
				position: RELATIVE,
				overflow: HIDDEN, // needed for context menu (avoid scrollbars) and
					// content overflow in IE
				width: chartWidth + PX,
				height: chartHeight + PX,
				textAlign: 'left'
			}, optionsChart.style),
			renderToClone || renderTo
		);

		chart.renderer = renderer =
			optionsChart.forExport ? // force SVG, used for SVG export
				new SVGRenderer(container, chartWidth, chartHeight, true) :
				new Renderer(container, chartWidth, chartHeight);

		// Issue 110 workaround:
		// In Firefox, if a div is positioned by percentage, its pixel position may land
		// between pixels. The container itself doesn't display this, but an SVG element
		// inside this container will be drawn at subpixel precision. In order to draw
		// sharp lines, this must be compensated for. This doesn't seem to work inside
		// iframes though (like in jsFiddle).
		var subPixelFix, rect;
		if (isFirefox && container.getBoundingClientRect) {
			subPixelFix = function () {
				css(container, { left: 0, top: 0 });
				rect = container.getBoundingClientRect();
				css(container, {
					left: (-(rect.left - pInt(rect.left))) + PX,
					top: (-(rect.top - pInt(rect.top))) + PX
				});
			};

			// run the fix now
			subPixelFix();

			// run it on resize
			addEvent(win, 'resize', subPixelFix);

			// remove it on chart destroy
			addEvent(chart, 'destroy', function () {
				removeEvent(win, 'resize', subPixelFix);
			});
		}
	}

	/**
	 * Calculate margins by rendering axis labels in a preliminary position. Title,
	 * subtitle and legend have already been rendered at this stage, but will be
	 * moved into their final positions
	 */
	getMargins = function () {
		var legendOptions = options.legend,
			legendMargin = pick(legendOptions.margin, 10),
			legendX = legendOptions.x,
			legendY = legendOptions.y,
			align = legendOptions.align,
			verticalAlign = legendOptions.verticalAlign,
			titleOffset;

		resetMargins();

		// adjust for title and subtitle
		if ((chart.title || chart.subtitle) && !defined(optionsMarginTop)) {
			titleOffset = mathMax(
				(chart.title && !chartTitleOptions.floating && !chartTitleOptions.verticalAlign && chartTitleOptions.y) || 0,
				(chart.subtitle && !chartSubtitleOptions.floating && !chartSubtitleOptions.verticalAlign && chartSubtitleOptions.y) || 0
			);
			if (titleOffset) {
				plotTop = mathMax(plotTop, titleOffset + pick(chartTitleOptions.margin, 15) + spacingTop);
			}
		}
		// adjust for legend
		if (legendOptions.enabled && !legendOptions.floating) {
			if (align === 'right') { // horizontal alignment handled first
				if (!defined(optionsMarginRight)) {
					marginRight = mathMax(
						marginRight,
						legendWidth - legendX + legendMargin + spacingRight
					);
				}
			} else if (align === 'left') {
				if (!defined(optionsMarginLeft)) {
					plotLeft = mathMax(
						plotLeft,
						legendWidth + legendX + legendMargin + spacingLeft
					);
				}

			} else if (verticalAlign === 'top') {
				if (!defined(optionsMarginTop)) {
					plotTop = mathMax(
						plotTop,
						legendHeight + legendY + legendMargin + spacingTop
					);
				}

			} else if (verticalAlign === 'bottom') {
				if (!defined(optionsMarginBottom)) {
					marginBottom = mathMax(
						marginBottom,
						legendHeight - legendY + legendMargin + spacingBottom
					);
				}
			}
		}

		// pre-render axes to get labels offset width
		if (hasCartesianSeries) {
			each(axes, function (axis) {
				axis.getOffset();
			});
		}

		if (!defined(optionsMarginLeft)) {
			plotLeft += axisOffset[3];
		}
		if (!defined(optionsMarginTop)) {
			plotTop += axisOffset[0];
		}
		if (!defined(optionsMarginBottom)) {
			marginBottom += axisOffset[2];
		}
		if (!defined(optionsMarginRight)) {
			marginRight += axisOffset[1];
		}

		setChartSize();

	};

	/**
	 * Add the event handlers necessary for auto resizing
	 *
	 */
	function initReflow() {
		var reflowTimeout;
		function reflow() {
			var width = optionsChart.width || renderTo.offsetWidth,
				height = optionsChart.height || renderTo.offsetHeight;

			if (width && height) { // means container is display:none
				if (width !== containerWidth || height !== containerHeight) {
					clearTimeout(reflowTimeout);
					reflowTimeout = setTimeout(function () {
						resize(width, height, false);
					}, 100);
				}
				containerWidth = width;
				containerHeight = height;
			}
		}
		addEvent(win, 'resize', reflow);
		addEvent(chart, 'destroy', function () {
			removeEvent(win, 'resize', reflow);
		});
	}

	/**
	 * Fires endResize event on chart instance.
	 */
	function fireEndResize() {
		fireEvent(chart, 'endResize', null, function () {
			isResizing -= 1;
		});
	}

	/**
	 * Resize the chart to a given width and height
	 * @param {Number} width
	 * @param {Number} height
	 * @param {Object|Boolean} animation
	 */
	resize = function (width, height, animation) {
		var chartTitle = chart.title,
			chartSubtitle = chart.subtitle;

		isResizing += 1;

		// set the animation for the current process
		setAnimation(animation, chart);

		oldChartHeight = chartHeight;
		oldChartWidth = chartWidth;
		chart.chartWidth = chartWidth = mathRound(width);
		chart.chartHeight = chartHeight = mathRound(height);

		css(container, {
			width: chartWidth + PX,
			height: chartHeight + PX
		});
		renderer.setSize(chartWidth, chartHeight, animation);

		// update axis lengths for more correct tick intervals:
		plotWidth = chartWidth - plotLeft - marginRight;
		plotHeight = chartHeight - plotTop - marginBottom;

		// handle axes
		maxTicks = null;
		each(axes, function (axis) {
			axis.isDirty = true;
			axis.setScale();
		});

		// make sure non-cartesian series are also handled
		each(series, function (serie) {
			serie.isDirty = true;
		});

		chart.isDirtyLegend = true; // force legend redraw
		chart.isDirtyBox = true; // force redraw of plot and chart border

		getMargins();

		// move titles
		if (chartTitle) {
			chartTitle.align(null, null, spacingBox);
		}
		if (chartSubtitle) {
			chartSubtitle.align(null, null, spacingBox);
		}

		redraw(animation);


		oldChartHeight = null;
		fireEvent(chart, 'resize');

		// fire endResize and set isResizing back
		// If animation is disabled, fire without delay
		if (globalAnimation === false) {
			fireEndResize();
		} else { // else set a timeout with the animation duration
			setTimeout(fireEndResize, (globalAnimation && globalAnimation.duration) || 500);
		}
	};

	/**
	 * Set the public chart properties. This is done before and after the pre-render
	 * to determine margin sizes
	 */
	setChartSize = function () {

		chart.plotLeft = plotLeft = mathRound(plotLeft);
		chart.plotTop = plotTop = mathRound(plotTop);
		chart.plotWidth = plotWidth = mathRound(chartWidth - plotLeft - marginRight);
		chart.plotHeight = plotHeight = mathRound(chartHeight - plotTop - marginBottom);

		chart.plotSizeX = inverted ? plotHeight : plotWidth;
		chart.plotSizeY = inverted ? plotWidth : plotHeight;

		spacingBox = {
			x: spacingLeft,
			y: spacingTop,
			width: chartWidth - spacingLeft - spacingRight,
			height: chartHeight - spacingTop - spacingBottom
		};
	};

	/**
	 * Initial margins before auto size margins are applied
	 */
	resetMargins = function () {
		plotTop = pick(optionsMarginTop, spacingTop);
		marginRight = pick(optionsMarginRight, spacingRight);
		marginBottom = pick(optionsMarginBottom, spacingBottom);
		plotLeft = pick(optionsMarginLeft, spacingLeft);
		axisOffset = [0, 0, 0, 0]; // top, right, bottom, left
	};

	/**
	 * Draw the borders and backgrounds for chart and plot area
	 */
	drawChartBox = function () {
		var chartBorderWidth = optionsChart.borderWidth || 0,
			chartBackgroundColor = optionsChart.backgroundColor,
			plotBackgroundColor = optionsChart.plotBackgroundColor,
			plotBackgroundImage = optionsChart.plotBackgroundImage,
			mgn,
			plotSize = {
				x: plotLeft,
				y: plotTop,
				width: plotWidth,
				height: plotHeight
			};

		// Chart area
		mgn = chartBorderWidth + (optionsChart.shadow ? 8 : 0);

		if (chartBorderWidth || chartBackgroundColor) {
			if (!chartBackground) {
				chartBackground = renderer.rect(mgn / 2, mgn / 2, chartWidth - mgn, chartHeight - mgn,
						optionsChart.borderRadius, chartBorderWidth)
					.attr({
						stroke: optionsChart.borderColor,
						'stroke-width': chartBorderWidth,
						fill: chartBackgroundColor || NONE
					})
					.add()
					.shadow(optionsChart.shadow);
			} else { // resize
				chartBackground.animate(
					chartBackground.crisp(null, null, null, chartWidth - mgn, chartHeight - mgn)
				);
			}
		}


		// Plot background
		if (plotBackgroundColor) {
			if (!plotBackground) {
				plotBackground = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0)
					.attr({
						fill: plotBackgroundColor
					})
					.add()
					.shadow(optionsChart.plotShadow);
			} else {
				plotBackground.animate(plotSize);
			}
		}
		if (plotBackgroundImage) {
			if (!plotBGImage) {
				plotBGImage = renderer.image(plotBackgroundImage, plotLeft, plotTop, plotWidth, plotHeight)
					.add();
			} else {
				plotBGImage.animate(plotSize);
			}
		}

		// Plot area border
		if (optionsChart.plotBorderWidth) {
			if (!plotBorder) {
				plotBorder = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0, optionsChart.plotBorderWidth)
					.attr({
						stroke: optionsChart.plotBorderColor,
						'stroke-width': optionsChart.plotBorderWidth,
						zIndex: 4
					})
					.add();
			} else {
				plotBorder.animate(
					plotBorder.crisp(null, plotLeft, plotTop, plotWidth, plotHeight)
				);
			}
		}

		// reset
		chart.isDirtyBox = false;
	};

	/**
	 * Render all graphics for the chart
	 */
	function render() {
		var labels = options.labels,
			credits = options.credits,
			creditsHref;

		// Title
		setTitle();


		// Legend
		legend = chart.legend = new Legend();

		// Get margins by pre-rendering axes
		getMargins();
		each(axes, function (axis) {
			axis.setTickPositions(true); // update to reflect the new margins
		});
		adjustTickAmounts();
		getMargins(); // second pass to check for new labels


		// Draw the borders and backgrounds
		drawChartBox();

		// Axes
		if (hasCartesianSeries) {
			each(axes, function (axis) {
				axis.render();
			});
		}


		// The series
		if (!chart.seriesGroup) {
			chart.seriesGroup = renderer.g('series-group')
				.attr({ zIndex: 3 })
				.add();
		}
		each(series, function (serie) {
			serie.translate();
			serie.setTooltipPoints();
			serie.render();
		});


		// Labels
		if (labels.items) {
			each(labels.items, function () {
				var style = extend(labels.style, this.style),
					x = pInt(style.left) + plotLeft,
					y = pInt(style.top) + plotTop + 12;

				// delete to prevent rewriting in IE
				delete style.left;
				delete style.top;

				renderer.text(
					this.html,
					x,
					y
				)
				.attr({ zIndex: 2 })
				.css(style)
				.add();

			});
		}

		// Toolbar (don't redraw)
		if (!chart.toolbar) {
			chart.toolbar = Toolbar();
		}

		// Credits
		if (credits.enabled && !chart.credits) {
			creditsHref = credits.href;
			chart.credits = renderer.text(
				credits.text,
				0,
				0
			)
			.on('click', function () {
				if (creditsHref) {
					location.href = creditsHref;
				}
			})
			.attr({
				align: credits.position.align,
				zIndex: 8
			})
			.css(credits.style)
			.add()
			.align(credits.position);
		}

		placeTrackerGroup();

		// Set flag
		chart.hasRendered = true;

		// If the chart was rendered outside the top container, put it back in
		if (renderToClone) {
			renderTo.appendChild(container);
			discardElement(renderToClone);
			//updatePosition(container);
		}
	}

	/**
	 * Clean up memory usage
	 */
	function destroy() {
		var i,
			parentNode = container && container.parentNode;

		// If the chart is destroyed already, do nothing.
		// This will happen if if a script invokes chart.destroy and
		// then it will be called again on win.unload
		if (chart === null) {
			return;
		}

		// fire the chart.destoy event
		fireEvent(chart, 'destroy');

		// remove events
		// PATCH by Simon Fishel
        //
        // use event namespacing to avoid creating a circular reference
        // TODO: would be better to not rely on jQuery's event namespacing here
        //       since this code is no longer agnostic to the event library
        //
        // - removeEvent(win, 'unload', destroy);
        //
        // + removeEvent(win, '.' + containerId);
        
        removeEvent(win, '.' + containerId);
        
		removeEvent(chart);

		// ==== Destroy collections:
		// Destroy axes
		i = axes.length;
		while (i--) {
			axes[i] = axes[i].destroy();
		}

		// Destroy each series
		i = series.length;
		while (i--) {
			series[i] = series[i].destroy();
		}

		// ==== Destroy chart properties:
		each(['title', 'subtitle', 'seriesGroup', 'clipRect', 'credits', 'tracker'], function (name) {
			var prop = chart[name];

			if (prop) {
				chart[name] = prop.destroy();
			}
		});

		// ==== Destroy local variables:
		each([chartBackground, legend, tooltip, renderer, tracker], function (obj) {
			if (obj && obj.destroy) {
				obj.destroy();
			}
		});
		chartBackground = legend = tooltip = renderer = tracker = null;

		// remove container and all SVG
		if (container) { // can break in IE when destroyed before finished loading
			container.innerHTML = '';
			removeEvent(container);
			if (parentNode) {
				parentNode.removeChild(container);
			}

			// IE6 leak
			container = null;
		}

		// memory and CPU leak
		clearInterval(tooltipInterval);

		// clean it all up
		for (i in chart) {
			delete chart[i];
		}

		chart = null;
	}
	/**
	 * Prepare for first rendering after all data are loaded
	 */
	function firstRender() {

		// VML namespaces can't be added until after complete. Listening
		// for Perini's doScroll hack is not enough.
		var ONREADYSTATECHANGE = 'onreadystatechange',
			COMPLETE = 'complete';
		// Note: in spite of JSLint's complaints, win == win.top is required
		/*jslint eqeq: true*/
		if (!hasSVG && win == win.top && doc.readyState !== COMPLETE) {
		/*jslint eqeq: false*/
			doc.attachEvent(ONREADYSTATECHANGE, function () {
				doc.detachEvent(ONREADYSTATECHANGE, firstRender);
				if (doc.readyState === COMPLETE) {
					firstRender();
				}
			});
			return;
		}

		// create the container
		getContainer();

		resetMargins();
		setChartSize();

		// Initialize the series
		each(options.series || [], function (serieOptions) {
			initSeries(serieOptions);
		});

		// Set the common inversion and transformation for inverted series after initSeries
		chart.inverted = inverted = pick(inverted, options.chart.inverted);


		getAxes();


		chart.render = render;

		// depends on inverted and on margins being set
		chart.tracker = tracker = new MouseTracker(options.tooltip);

		//globalAnimation = false;
		render();

		fireEvent(chart, 'load');

		//globalAnimation = true;

		// run callbacks
		if (callback) {
			callback.apply(chart, [chart]);
		}
		each(chart.callbacks, function (fn) {
			fn.apply(chart, [chart]);
		});
	}

	// Run chart


	// Destroy the chart and free up memory.
	
	// PATCH by Simon Fishel
    //
    // move the unload event binding to where the container id has been set
    //
    // - addEvent(win, 'unload', destroy);

	// Set up auto resize
	if (optionsChart.reflow !== false) {
		addEvent(chart, 'load', initReflow);
	}

	// Chart event handlers
	if (chartEvents) {
		for (eventType in chartEvents) {
			addEvent(chart, eventType, chartEvents[eventType]);
		}
	}


	chart.options = options;
	chart.series = series;





	// Expose methods and variables
	chart.addSeries = addSeries;
	chart.animation = pick(optionsChart.animation, true);
	chart.destroy = destroy;
	chart.get = get;
	chart.getSelectedPoints = getSelectedPoints;
	chart.getSelectedSeries = getSelectedSeries;
	chart.hideLoading = hideLoading;
	chart.isInsidePlot = isInsidePlot;
	chart.redraw = redraw;
	chart.setSize = resize;
	chart.setTitle = setTitle;
	chart.showLoading = showLoading;
	chart.pointCount = 0;
	chart.counters = new ChartCounters();
	/*
	if ($) $(function() {
		$container = $('#container');
		var origChartWidth,
			origChartHeight;
		if ($container) {
			$('<button>+</button>')
				.insertBefore($container)
				.click(function() {
					if (origChartWidth === UNDEFINED) {
						origChartWidth = chartWidth;
						origChartHeight = chartHeight;
					}
					chart.resize(chartWidth *= 1.1, chartHeight *= 1.1);
				});
			$('<button>-</button>')
				.insertBefore($container)
				.click(function() {
					if (origChartWidth === UNDEFINED) {
						origChartWidth = chartWidth;
						origChartHeight = chartHeight;
					}
					chart.resize(chartWidth *= 0.9, chartHeight *= 0.9);
				});
			$('<button>1:1</button>')
				.insertBefore($container)
				.click(function() {
					if (origChartWidth === UNDEFINED) {
						origChartWidth = chartWidth;
						origChartHeight = chartHeight;
					}
					chart.resize(origChartWidth, origChartHeight);
				});
		}
	})
	*/




	firstRender();
	
	// PATCH by Simon Fishel
    //
    // use event namespacing when binding the unload event
    //
    // + addEvent(win, 'unload.' + containerId, destroy);
    
    addEvent(win, 'unload.' + containerId, destroy);


} // end Chart

// Hook for exporting module
Chart.prototype.callbacks = [];
/**
 * The Point object and prototype. Inheritable and used as base for PiePoint
 */
var Point = function () {};
Point.prototype = {

	/**
	 * Initialize the point
	 * @param {Object} series The series object containing this point
	 * @param {Object} options The data in either number, array or object format
	 */
	init: function (series, options) {
		var point = this,
			counters = series.chart.counters,
			defaultColors;
		point.series = series;
		point.applyOptions(options);
		point.pointAttr = {};

		if (series.options.colorByPoint) {
			defaultColors = series.chart.options.colors;
			if (!point.options) {
				point.options = {};
			}
			point.color = point.options.color = point.color || defaultColors[counters.color++];

			// loop back to zero
			counters.wrapColor(defaultColors.length);
		}

		series.chart.pointCount++;
		return point;
	},
	/**
	 * Apply the options containing the x and y data and possible some extra properties.
	 * This is called on point init or from point.update.
	 *
	 * @param {Object} options
	 */
	applyOptions: function (options) {
		var point = this,
			series = point.series;

		point.config = options;

		// onedimensional array input
		if (isNumber(options) || options === null) {
			point.y = options;
		} else if (isObject(options) && !isNumber(options.length)) { // object input
			// copy options directly to point
			extend(point, options);
			point.options = options;
		} else if (isString(options[0])) { // categorized data with name in first position
			point.name = options[0];
			point.y = options[1];
		} else if (isNumber(options[0])) { // two-dimentional array
			point.x = options[0];
			point.y = options[1];
		}

		/*
		 * If no x is set by now, get auto incremented value. All points must have an
		 * x value, however the y value can be null to create a gap in the series
		 */
		if (point.x === UNDEFINED) {
			point.x = series.autoIncrement();
		}

	},

	/**
	 * Destroy a point to clear memory. Its reference still stays in series.data.
	 */
	destroy: function () {
		var point = this,
			series = point.series,
			hoverPoints = series.chart.hoverPoints,
			prop;

		series.chart.pointCount--;

		if (hoverPoints) {
			point.setState();
			erase(hoverPoints, point);
		}
		if (point === series.chart.hoverPoint) {
			point.onMouseOut();
		}


		// remove all events
		removeEvent(point);

		each(['graphic', 'tracker', 'group', 'dataLabel', 'connector', 'shadowGroup'], function (prop) {
			if (point[prop]) {
				point[prop].destroy();
			}
		});

		if (point.legendItem) { // pies have legend items
			point.series.chart.legend.destroyItem(point);
		}

		for (prop in point) {
			point[prop] = null;
		}


	},

	/**
	 * Return the configuration hash needed for the data label and tooltip formatters
	 */
	getLabelConfig: function () {
		var point = this;
		return {
			x: point.category,
			y: point.y,
			series: point.series,
			point: point,
			percentage: point.percentage,
			total: point.total || point.stackTotal
		};
	},

	/**
	 * Toggle the selection status of a point
	 * @param {Boolean} selected Whether to select or unselect the point.
	 * @param {Boolean} accumulate Whether to add to the previous selection. By default,
	 *     this happens if the control key (Cmd on Mac) was pressed during clicking.
	 */
	select: function (selected, accumulate) {
		var point = this,
			series = point.series,
			chart = series.chart;

		selected = pick(selected, !point.selected);

		// fire the event with the defalut handler
		point.firePointEvent(selected ? 'select' : 'unselect', { accumulate: accumulate }, function () {
			point.selected = selected;
			point.setState(selected && SELECT_STATE);

			// unselect all other points unless Ctrl or Cmd + click
			if (!accumulate) {
				each(chart.getSelectedPoints(), function (loopPoint) {
					if (loopPoint.selected && loopPoint !== point) {
						loopPoint.selected = false;
						loopPoint.setState(NORMAL_STATE);
						loopPoint.firePointEvent('unselect');
					}
				});
			}
		});
	},

	onMouseOver: function () {
		var point = this,
			chart = point.series.chart,
			tooltip = chart.tooltip,
			hoverPoint = chart.hoverPoint;

		// set normal state to previous series
		if (hoverPoint && hoverPoint !== point) {
			hoverPoint.onMouseOut();
		}

		// trigger the event
		point.firePointEvent('mouseOver');

		// update the tooltip
		if (tooltip && !tooltip.shared) {
			tooltip.refresh(point);
		}

		// hover this
		point.setState(HOVER_STATE);
		chart.hoverPoint = point;
	},

	onMouseOut: function () {
		var point = this;
		point.firePointEvent('mouseOut');

		point.setState();
		point.series.chart.hoverPoint = null;
	},

	/**
	 * Extendable method for formatting each point's tooltip line
	 *
	 * @param {Boolean} useHeader Whether a common header is used for multiple series in the tooltip
	 *
	 * @return {String} A string to be concatenated in to the common tooltip text
	 */
	tooltipFormatter: function (useHeader) {
		var point = this,
			series = point.series;

		return ['<span style="color:' + series.color + '">', (point.name || series.name), '</span>: ',
			(!useHeader ? ('<b>x = ' + (point.name || point.x) + ',</b> ') : ''),
			'<b>', (!useHeader ? 'y = ' : ''), point.y, '</b>'].join('');

	},

	/**
	 * Update the point with new options (typically x/y data) and optionally redraw the series.
	 *
	 * @param {Object} options Point options as defined in the series.data array
	 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 *
	 */
	update: function (options, redraw, animation) {
		var point = this,
			series = point.series,
			graphic = point.graphic,
			chart = series.chart;

		redraw = pick(redraw, true);

		// fire the event with a default handler of doing the update
		point.firePointEvent('update', { options: options }, function () {

			point.applyOptions(options);

			// update visuals
			if (isObject(options)) {
				series.getAttribs();
				if (graphic) {
					graphic.attr(point.pointAttr[series.state]);
				}
			}

			// redraw
			series.isDirty = true;
			if (redraw) {
				chart.redraw(animation);
			}
		});
	},

	/**
	 * Remove a point and optionally redraw the series and if necessary the axes
	 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 */
	remove: function (redraw, animation) {
		var point = this,
			series = point.series,
			chart = series.chart,
			data = series.data;

		setAnimation(animation, chart);
		redraw = pick(redraw, true);

		// fire the event with a default handler of removing the point
		point.firePointEvent('remove', null, function () {

			erase(data, point);

			point.destroy();


			// redraw
			series.isDirty = true;
			if (redraw) {
				chart.redraw();
			}
		});


	},

	/**
	 * Fire an event on the Point object. Must not be renamed to fireEvent, as this
	 * causes a name clash in MooTools
	 * @param {String} eventType
	 * @param {Object} eventArgs Additional event arguments
	 * @param {Function} defaultFunction Default event handler
	 */
	firePointEvent: function (eventType, eventArgs, defaultFunction) {
		var point = this,
			series = this.series,
			seriesOptions = series.options;

		// load event handlers on demand to save time on mouseover/out
		if (seriesOptions.point.events[eventType] ||
			(point.options && point.options.events && point.options.events[eventType])) {
			this.importEvents();
		}

		// add default handler if in selection mode
		if (eventType === 'click' && seriesOptions.allowPointSelect) {
			defaultFunction = function (event) {
				// Control key is for Windows, meta (= Cmd key) for Mac, Shift for Opera
				point.select(null, event.ctrlKey || event.metaKey || event.shiftKey);
			};
		}

		fireEvent(this, eventType, eventArgs, defaultFunction);
	},
	/**
	 * Import events from the series' and point's options. Only do it on
	 * demand, to save processing time on hovering.
	 */
	importEvents: function () {
		if (!this.hasImportedEvents) {
			var point = this,
				options = merge(point.series.options.point, point.options),
				events = options.events,
				eventType;

			point.events = events;

			for (eventType in events) {
				addEvent(point, eventType, events[eventType]);
			}
			this.hasImportedEvents = true;

		}
	},

	/**
	 * Set the point's state
	 * @param {String} state
	 */
	setState: function (state) {
		var point = this,
			series = point.series,
			stateOptions = series.options.states,
			markerOptions = defaultPlotOptions[series.type].marker && series.options.marker,
			normalDisabled = markerOptions && !markerOptions.enabled,
			markerStateOptions = markerOptions && markerOptions.states[state],
			stateDisabled = markerStateOptions && markerStateOptions.enabled === false,
			stateMarkerGraphic = series.stateMarkerGraphic,
			chart = series.chart,
			pointAttr = point.pointAttr;

		state = state || NORMAL_STATE; // empty string

		if (
				// already has this state
				state === point.state ||
				// selected points don't respond to hover
				(point.selected && state !== SELECT_STATE) ||
				// series' state options is disabled
				(stateOptions[state] && stateOptions[state].enabled === false) ||
				// point marker's state options is disabled
				(state && (stateDisabled || (normalDisabled && !markerStateOptions.enabled)))

			) {
			return;
		}

		// apply hover styles to the existing point
		if (point.graphic) {
			point.graphic.attr(pointAttr[state]);
		} else {
			// if a graphic is not applied to each point in the normal state, create a shared
			// graphic for the hover state
			if (state) {
				if (!stateMarkerGraphic) {
					series.stateMarkerGraphic = stateMarkerGraphic = chart.renderer.circle(
						0,
						0,
						pointAttr[state].r
					)
					.attr(pointAttr[state])
					.add(series.group);
				}

				stateMarkerGraphic.translate(
					point.plotX,
					point.plotY
				);
			}

			if (stateMarkerGraphic) {
				stateMarkerGraphic[state ? 'show' : 'hide']();
			}
		}

		point.state = state;
	}
};

/**
 * The base function which all other series types inherit from
 * @param {Object} chart
 * @param {Object} options
 */
var Series = function () {};

Series.prototype = {

	isCartesian: true,
	type: 'line',
	pointClass: Point,
	pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
		stroke: 'lineColor',
		'stroke-width': 'lineWidth',
		fill: 'fillColor',
		r: 'radius'
	},
	init: function (chart, options) {
		var series = this,
			eventType,
			events,
			//pointEvent,
			index = chart.series.length;

		series.chart = chart;
		options = series.setOptions(options); // merge with plotOptions

		// set some variables
		extend(series, {
			index: index,
			options: options,
			name: options.name || 'Series ' + (index + 1),
			state: NORMAL_STATE,
			pointAttr: {},
			visible: options.visible !== false, // true by default
			selected: options.selected === true // false by default
		});

		// register event listeners
		events = options.events;
		for (eventType in events) {
			addEvent(series, eventType, events[eventType]);
		}
		if (
			(events && events.click) ||
			(options.point && options.point.events && options.point.events.click) ||
			options.allowPointSelect
		) {
			chart.runTrackerClick = true;
		}

		series.getColor();
		series.getSymbol();


		// set the data
		series.setData(options.data, false);

	},


	/**
	 * Return an auto incremented x value based on the pointStart and pointInterval options.
	 * This is only used if an x value is not given for the point that calls autoIncrement.
	 */
	autoIncrement: function () {
		var series = this,
			options = series.options,
			xIncrement = series.xIncrement;

		xIncrement = pick(xIncrement, options.pointStart, 0);

		series.pointInterval = pick(series.pointInterval, options.pointInterval, 1);

		series.xIncrement = xIncrement + series.pointInterval;
		return xIncrement;
	},

	/**
	 * Sort the data and remove duplicates
	 */
	cleanData: function () {
		var series = this,
			chart = series.chart,
			data = series.data,
			closestPoints,
			smallestInterval,
			chartSmallestInterval = chart.smallestInterval,
			interval,
			i;

		// sort the data points
		stableSort(data, function (a, b) {
			return (a.x - b.x);
		});

		// remove points with equal x values
		// record the closest distance for calculation of column widths
		/*for (i = data.length - 1; i >= 0; i--) {
			if (data[i - 1]) {
				if (data[i - 1].x == data[i].x)	{
					data[i - 1].destroy();
					data.splice(i - 1, 1); // remove the duplicate
				}
			}
		}*/

		// connect nulls
		if (series.options.connectNulls) {
			for (i = data.length - 1; i >= 0; i--) {
				if (data[i].y === null && data[i - 1] && data[i + 1]) {
					data.splice(i, 1);
				}
			}
		}

		// find the closes pair of points
		for (i = data.length - 1; i >= 0; i--) {
			if (data[i - 1]) {
				interval = data[i].x - data[i - 1].x;
				if (interval > 0 && (smallestInterval === UNDEFINED || interval < smallestInterval)) {
					smallestInterval = interval;
					closestPoints = i;
				}
			}
		}

		if (chartSmallestInterval === UNDEFINED || smallestInterval < chartSmallestInterval) {
			chart.smallestInterval = smallestInterval;
		}
		series.closestPoints = closestPoints;
	},

	/**
	 * Divide the series data into segments divided by null values. Also sort
	 * the data points and delete duplicate values.
	 */
	getSegments: function () {
		var lastNull = -1,
			segments = [],
			data = this.data;

		// create the segments
		each(data, function (point, i) {
			if (point.y === null) {
				if (i > lastNull + 1) {
					segments.push(data.slice(lastNull + 1, i));
				}
				lastNull = i;
			} else if (i === data.length - 1) { // last value
				segments.push(data.slice(lastNull + 1, i + 1));
			}
		});
		this.segments = segments;


	},
	/**
	 * Set the series options by merging from the options tree
	 * @param {Object} itemOptions
	 */
	setOptions: function (itemOptions) {
		var plotOptions = this.chart.options.plotOptions,
			options = merge(
				plotOptions[this.type],
				plotOptions.series,
				itemOptions
			);

		return options;

	},
	/**
	 * Get the series' color
	 */
	getColor: function () {
		var defaultColors = this.chart.options.colors,
			counters = this.chart.counters;
		this.color = this.options.color || defaultColors[counters.color++] || '#0000ff';
		counters.wrapColor(defaultColors.length);
	},
	/**
	 * Get the series' symbol
	 */
	getSymbol: function () {
		var defaultSymbols = this.chart.options.symbols,
			counters = this.chart.counters;
		this.symbol = this.options.marker.symbol || defaultSymbols[counters.symbol++];
		counters.wrapSymbol(defaultSymbols.length);
	},

	/**
	 * Add a point dynamically after chart load time
	 * @param {Object} options Point options as given in series.data
	 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
	 * @param {Boolean} shift If shift is true, a point is shifted off the start
	 *    of the series as one is appended to the end.
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 */
	addPoint: function (options, redraw, shift, animation) {
		var series = this,
			data = series.data,
			graph = series.graph,
			area = series.area,
			chart = series.chart,
			point = (new series.pointClass()).init(series, options);

		setAnimation(animation, chart);

		if (graph && shift) { // make graph animate sideways
			graph.shift = shift;
		}
		if (area) {
			area.shift = shift;
			area.isArea = true;
		}

		redraw = pick(redraw, true);

		data.push(point);
		if (shift) {
			data[0].remove(false);
		}
		series.getAttribs();


		// redraw
		series.isDirty = true;
		if (redraw) {
			chart.redraw();
		}
	},

	/**
	 * Replace the series data with a new set of data
	 * @param {Object} data
	 * @param {Object} redraw
	 */
	setData: function (data, redraw) {
		var series = this,
			oldData = series.data,
			initialColor = series.initialColor,
			chart = series.chart,
			i = (oldData && oldData.length) || 0;

		series.xIncrement = null; // reset for new data
		if (defined(initialColor)) { // reset colors for pie
			chart.counters.color = initialColor;
		}

		data = map(splat(data || []), function (pointOptions) {
			return (new series.pointClass()).init(series, pointOptions);
		});

		// destroy old points
		while (i--) {
			oldData[i].destroy();
		}

		// set the data
		series.data = data;

		series.cleanData();
		series.getSegments();


		// cache attributes for shapes
		series.getAttribs();

		// redraw
		series.isDirty = true;
		chart.isDirtyBox = true;
		if (pick(redraw, true)) {
			chart.redraw(false);
		}
	},

	/**
	 * Remove a series and optionally redraw the chart
	 *
	 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
	 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
	 *    configuration
	 */

	remove: function (redraw, animation) {
		var series = this,
			chart = series.chart;
		redraw = pick(redraw, true);

		if (!series.isRemoving) {  /* prevent triggering native event in jQuery
				(calling the remove function from the remove event) */
			series.isRemoving = true;

			// fire the event with a default handler of removing the point
			fireEvent(series, 'remove', null, function () {


				// destroy elements
				series.destroy();


				// redraw
				chart.isDirtyLegend = chart.isDirtyBox = true;
				if (redraw) {
					chart.redraw(animation);
				}
			});

		}
		series.isRemoving = false;
	},

	/**
	 * Translate data points from raw data values to chart specific positioning data
	 * needed later in drawPoints, drawGraph and drawTracker.
	 */
	translate: function () {
		var series = this,
			chart = series.chart,
			stacking = series.options.stacking,
			categories = series.xAxis.categories,
			yAxis = series.yAxis,
			data = series.data,
			i = data.length;

		// do the translation
		while (i--) {
			var point = data[i],
				xValue = point.x,
				yValue = point.y,
				yBottom = point.low,
				stack = yAxis.stacks[(yValue < 0 ? '-' : '') + series.stackKey],
				pointStack,
				pointStackTotal;
			point.plotX = series.xAxis.translate(xValue);

			// calculate the bottom y value for stacked series
			if (stacking && series.visible && stack && stack[xValue]) {
				pointStack = stack[xValue];
				pointStackTotal = pointStack.total;
				pointStack.cum = yBottom = pointStack.cum - yValue; // start from top
				yValue = yBottom + yValue;

				if (stacking === 'percent') {
					yBottom = pointStackTotal ? yBottom * 100 / pointStackTotal : 0;
					yValue = pointStackTotal ? yValue * 100 / pointStackTotal : 0;
				}

				point.percentage = pointStackTotal ? point.y * 100 / pointStackTotal : 0;
				point.stackTotal = pointStackTotal;
			}

			if (defined(yBottom)) {
				point.yBottom = yAxis.translate(yBottom, 0, 1, 0, 1);
			}

			// set the y value
			if (yValue !== null) {
				point.plotY = yAxis.translate(yValue, 0, 1, 0, 1);
			}

			// set client related positions for mouse tracking
			point.clientX = chart.inverted ?
				chart.plotHeight - point.plotX :
				point.plotX; // for mouse tracking

			// some API data
			point.category = categories && categories[point.x] !== UNDEFINED ?
				categories[point.x] : point.x;

		}
	},
	/**
	 * Memoize tooltip texts and positions
	 */
	setTooltipPoints: function (renew) {
		var series = this,
			chart = series.chart,
			inverted = chart.inverted,
			data = [],
			plotSize = mathRound((inverted ? chart.plotTop : chart.plotLeft) + chart.plotSizeX),
			low,
			high,
			tooltipPoints = []; // a lookup array for each pixel in the x dimension

		// renew
		if (renew) {
			series.tooltipPoints = null;
		}

		// concat segments to overcome null values
		each(series.segments, function (segment) {
			data = data.concat(segment);
		});

		// loop the concatenated data and apply each point to all the closest
		// pixel positions
		if (series.xAxis && series.xAxis.reversed) {
			data = data.reverse();//reverseArray(data);
		}

		each(data, function (point, i) {

			low = data[i - 1] ? data[i - 1]._high + 1 : 0;
			high = point._high = data[i + 1] ?
				(mathFloor((point.plotX + (data[i + 1] ? data[i + 1].plotX : plotSize)) / 2)) :
				plotSize;

			while (low <= high) {
				tooltipPoints[inverted ? plotSize - low++ : low++] = point;
			}
		});
		series.tooltipPoints = tooltipPoints;
	},




	/**
	 * Series mouse over handler
	 */
	onMouseOver: function () {
		var series = this,
			chart = series.chart,
			hoverSeries = chart.hoverSeries;

		if (!hasTouch && chart.mouseIsDown) {
			return;
		}

		// set normal state to previous series
		if (hoverSeries && hoverSeries !== series) {
			hoverSeries.onMouseOut();
		}

		// trigger the event, but to save processing time,
		// only if defined
		if (series.options.events.mouseOver) {
			fireEvent(series, 'mouseOver');
		}


		// bring to front
		// Todo: optimize. This is one of two operations slowing down the tooltip in Firefox.
		// Can the tracking be done otherwise?
		if (series.tracker) {
			series.tracker.toFront();
		}

		// hover this
		series.setState(HOVER_STATE);
		chart.hoverSeries = series;
	},

	/**
	 * Series mouse out handler
	 */
	onMouseOut: function () {
		// trigger the event only if listeners exist
		var series = this,
			options = series.options,
			chart = series.chart,
			tooltip = chart.tooltip,
			hoverPoint = chart.hoverPoint;

		// trigger mouse out on the point, which must be in this series
		if (hoverPoint) {
			hoverPoint.onMouseOut();
		}

		// fire the mouse out event
		if (series && options.events.mouseOut) {
			fireEvent(series, 'mouseOut');
		}


		// hide the tooltip
		if (tooltip && !options.stickyTracking) {
			tooltip.hide();
		}

		// set normal state
		series.setState();
		chart.hoverSeries = null;
	},

	/**
	 * Animate in the series
	 */
	animate: function (init) {
		var series = this,
			chart = series.chart,
			clipRect = series.clipRect,
			animation = series.options.animation;

		if (animation && !isObject(animation)) {
			animation = {};
		}

		if (init) { // initialize the animation
			if (!clipRect.isAnimating) { // apply it only for one of the series
				clipRect.attr('width', 0);
				clipRect.isAnimating = true;
			}

		} else { // run the animation
			clipRect.animate({
				width: chart.plotSizeX
			}, animation);

			// delete this function to allow it only once
			this.animate = null;
		}
	},


	/**
	 * Draw the markers
	 */
	drawPoints: function () {
		var series = this,
			pointAttr,
			data = series.data,
			chart = series.chart,
			plotX,
			plotY,
			i,
			point,
			radius,
			graphic;

		if (series.options.marker.enabled) {
			i = data.length;
			while (i--) {
				point = data[i];
				plotX = point.plotX;
				plotY = point.plotY;
				graphic = point.graphic;

				// only draw the point if y is defined
				if (plotY !== UNDEFINED && !isNaN(plotY)) {

					/* && removed this code because points stayed after zoom
						point.plotX >= 0 && point.plotX <= chart.plotSizeX &&
						point.plotY >= 0 && point.plotY <= chart.plotSizeY*/

					// shortcuts
					pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE];
					radius = pointAttr.r;

					if (graphic) { // update
						graphic.animate({
							x: plotX,
							y: plotY,
							r: radius
						});
					} else {
						point.graphic = chart.renderer.symbol(
							pick(point.marker && point.marker.symbol, series.symbol),
							plotX,
							plotY,
							radius
						)
						.attr(pointAttr)
						.add(series.group);
					}
				}
			}
		}

	},

	/**
	 * Convert state properties from API naming conventions to SVG attributes
	 *
	 * @param {Object} options API options object
	 * @param {Object} base1 SVG attribute object to inherit from
	 * @param {Object} base2 Second level SVG attribute object to inherit from
	 */
	convertAttribs: function (options, base1, base2, base3) {
		var conversion = this.pointAttrToOptions,
			attr,
			option,
			obj = {};

		options = options || {};
		base1 = base1 || {};
		base2 = base2 || {};
		base3 = base3 || {};

		for (attr in conversion) {
			option = conversion[attr];
			obj[attr] = pick(options[option], base1[attr], base2[attr], base3[attr]);
		}
		return obj;
	},

	/**
	 * Get the state attributes. Each series type has its own set of attributes
	 * that are allowed to change on a point's state change. Series wide attributes are stored for
	 * all series, and additionally point specific attributes are stored for all
	 * points with individual marker options. If such options are not defined for the point,
	 * a reference to the series wide attributes is stored in point.pointAttr.
	 */
	getAttribs: function () {
		var series = this,
			normalOptions = defaultPlotOptions[series.type].marker ? series.options.marker : series.options,
			stateOptions = normalOptions.states,
			stateOptionsHover = stateOptions[HOVER_STATE],
			pointStateOptionsHover,
			seriesColor = series.color,
			normalDefaults = {
				stroke: seriesColor,
				fill: seriesColor
			},
			data = series.data,
			i,
			point,
			seriesPointAttr = [],
			pointAttr,
			pointAttrToOptions = series.pointAttrToOptions,
			hasPointSpecificOptions,
			key;

		// series type specific modifications
		if (series.options.marker) { // line, spline, area, areaspline, scatter

			// if no hover radius is given, default to normal radius + 2
			stateOptionsHover.radius = stateOptionsHover.radius || normalOptions.radius + 2;
			stateOptionsHover.lineWidth = stateOptionsHover.lineWidth || normalOptions.lineWidth + 1;

		} else { // column, bar, pie

			// if no hover color is given, brighten the normal color
			stateOptionsHover.color = stateOptionsHover.color ||
				Color(stateOptionsHover.color || seriesColor)
					.brighten(stateOptionsHover.brightness).get();
		}

		// general point attributes for the series normal state
		seriesPointAttr[NORMAL_STATE] = series.convertAttribs(normalOptions, normalDefaults);

		// HOVER_STATE and SELECT_STATE states inherit from normal state except the default radius
		each([HOVER_STATE, SELECT_STATE], function (state) {
			seriesPointAttr[state] =
					series.convertAttribs(stateOptions[state], seriesPointAttr[NORMAL_STATE]);
		});

		// set it
		series.pointAttr = seriesPointAttr;


		// Generate the point-specific attribute collections if specific point
		// options are given. If not, create a referance to the series wide point
		// attributes
		i = data.length;
		while (i--) {
			point = data[i];
			normalOptions = (point.options && point.options.marker) || point.options;
			if (normalOptions && normalOptions.enabled === false) {
				normalOptions.radius = 0;
			}
			hasPointSpecificOptions = false;

			// check if the point has specific visual options
			if (point.options) {
				for (key in pointAttrToOptions) {
					if (defined(normalOptions[pointAttrToOptions[key]])) {
						hasPointSpecificOptions = true;
					}
				}
			}



			// a specific marker config object is defined for the individual point:
			// create it's own attribute collection
			if (hasPointSpecificOptions) {

				pointAttr = [];
				stateOptions = normalOptions.states || {}; // reassign for individual point
				pointStateOptionsHover = stateOptions[HOVER_STATE] = stateOptions[HOVER_STATE] || {};

				// if no hover color is given, brighten the normal color
				if (!series.options.marker) { // column, bar, point
					pointStateOptionsHover.color =
						Color(pointStateOptionsHover.color || point.options.color)
							.brighten(pointStateOptionsHover.brightness ||
								stateOptionsHover.brightness).get();

				}

				// normal point state inherits series wide normal state
				pointAttr[NORMAL_STATE] = series.convertAttribs(normalOptions, seriesPointAttr[NORMAL_STATE]);

				// inherit from point normal and series hover
				pointAttr[HOVER_STATE] = series.convertAttribs(
					stateOptions[HOVER_STATE],
					seriesPointAttr[HOVER_STATE],
					pointAttr[NORMAL_STATE]
				);
				// inherit from point normal and series hover
				pointAttr[SELECT_STATE] = series.convertAttribs(
					stateOptions[SELECT_STATE],
					seriesPointAttr[SELECT_STATE],
					pointAttr[NORMAL_STATE]
				);



			// no marker config object is created: copy a reference to the series-wide
			// attribute collection
			} else {
				pointAttr = seriesPointAttr;
			}

			point.pointAttr = pointAttr;

		}

	},


	/**
	 * Clear DOM objects and free up memory
	 */
	destroy: function () {
		var series = this,
			chart = series.chart,
			seriesClipRect = series.clipRect,
			//chartSeries = series.chart.series,
			issue134 = /\/5[0-9\.]+ (Safari|Mobile)\//.test(userAgent), // todo: update when Safari bug is fixed
			destroy,
			prop;

		// add event hook
		fireEvent(series, 'destroy');

		// remove all events
		removeEvent(series);

		// remove legend items
		if (series.legendItem) {
			series.chart.legend.destroyItem(series);
		}

		// destroy all points with their elements
		each(series.data, function (point) {
			point.destroy();
		});

		// If this series clipRect is not the global one (which is removed on chart.destroy) we
		// destroy it here.
		if (seriesClipRect && seriesClipRect !== chart.clipRect) {
			series.clipRect = seriesClipRect.destroy();
		}

		// destroy all SVGElements associated to the series
		each(['area', 'graph', 'dataLabelsGroup', 'group', 'tracker'], function (prop) {
			if (series[prop]) {

				// issue 134 workaround
				destroy = issue134 && prop === 'group' ?
					'hide' :
					'destroy';

				series[prop][destroy]();
			}
		});

		// remove from hoverSeries
		if (chart.hoverSeries === series) {
			chart.hoverSeries = null;
		}
		erase(chart.series, series);

		// clear all members
		for (prop in series) {
			delete series[prop];
		}
	},

	/**
	 * Draw the data labels
	 */
	drawDataLabels: function () {
		if (this.options.dataLabels.enabled) {
			var series = this,
				x,
				y,
				data = series.data,
				seriesOptions = series.options,
				options = seriesOptions.dataLabels,
				str,
				dataLabelsGroup = series.dataLabelsGroup,
				chart = series.chart,
				renderer = chart.renderer,
				inverted = chart.inverted,
				seriesType = series.type,
				color,
				stacking = seriesOptions.stacking,
				isBarLike = seriesType === 'column' || seriesType === 'bar',
				vAlignIsNull = options.verticalAlign === null,
				yIsNull = options.y === null;

			if (isBarLike) {
				if (stacking) {
					// In stacked series the default label placement is inside the bars
					if (vAlignIsNull) {
						options = merge(options, {verticalAlign: 'middle'});
					}

					// If no y delta is specified, try to create a good default
					if (yIsNull) {
						options = merge(options, {y: {top: 14, middle: 4, bottom: -6}[options.verticalAlign]});
					}
				} else {
					// In non stacked series the default label placement is on top of the bars
					if (vAlignIsNull) {
						options = merge(options, {verticalAlign: 'top'});
					}
				}
			}

			// create a separate group for the data labels to avoid rotation
			if (!dataLabelsGroup) {
				dataLabelsGroup = series.dataLabelsGroup =
					renderer.g('data-labels')
						.attr({
							visibility: series.visible ? VISIBLE : HIDDEN,
							zIndex: 6
						})
						.translate(chart.plotLeft, chart.plotTop)
						.add();
			} else {
				dataLabelsGroup.translate(chart.plotLeft, chart.plotTop);
			}

			// determine the color
			color = options.color;
			if (color === 'auto') { // 1.0 backwards compatibility
				color = null;
			}
			options.style.color = pick(color, series.color, 'black');

			// make the labels for each point
			each(data, function (point) {
				var barX = point.barX,
					plotX = (barX && barX + point.barW / 2) || point.plotX || -999,
					plotY = pick(point.plotY, -999),
					dataLabel = point.dataLabel,
					align = options.align,
					individualYDelta = yIsNull ? (point.y >= 0 ? -6 : 12) : options.y;

				// get the string
				str = options.formatter.call(point.getLabelConfig());
				x = (inverted ? chart.plotWidth - plotY : plotX) + options.x;
				y = (inverted ? chart.plotHeight - plotX : plotY) + individualYDelta;

				// in columns, align the string to the column
				if (seriesType === 'column') {
					x += { left: -1, right: 1 }[align] * point.barW / 2 || 0;
				}

				if (inverted && point.y < 0) {
					align = 'right';
					x -= 10;
				}

				// update existing label
				if (dataLabel) {
					// vertically centered
					if (inverted && !options.y) {
						y = y + pInt(dataLabel.styles.lineHeight) * 0.9 - dataLabel.getBBox().height / 2;
					}
					dataLabel
						.attr({
							text: str
						}).animate({
							x: x,
							y: y
						});
				// create new label
				} else if (defined(str)) {
					dataLabel = point.dataLabel = renderer.text(
						str,
						x,
						y
					)
					.attr({
						align: align,
						rotation: options.rotation,
						zIndex: 1
					})
					.css(options.style)
					.add(dataLabelsGroup);
					// vertically centered
					if (inverted && !options.y) {
						dataLabel.attr({
							y: y + pInt(dataLabel.styles.lineHeight) * 0.9 - dataLabel.getBBox().height / 2
						});
					}
				}


				/*if (series.isCartesian) {
					dataLabel[chart.isInsidePlot(plotX, plotY) ? 'show' : 'hide']();
				}*/

				if (isBarLike && seriesOptions.stacking && dataLabel) {
					var barY = point.barY,
						barW = point.barW,
						barH = point.barH;

					dataLabel.align(options, null,
						{
							x: inverted ? chart.plotWidth - barY - barH : barX,
							y: inverted ? chart.plotHeight - barX - barW : barY,
							width: inverted ? barH : barW,
							height: inverted ? barW : barH
						});
				}
			});
		}
	},

	/**
	 * Draw the actual graph
	 */
	drawGraph: function () {
		var series = this,
			options = series.options,
			chart = series.chart,
			graph = series.graph,
			graphPath = [],
			fillColor,
			area = series.area,
			group = series.group,
			color = options.lineColor || series.color,
			lineWidth = options.lineWidth,
			dashStyle =  options.dashStyle,
			segmentPath,
			renderer = chart.renderer,
			translatedThreshold = series.yAxis.getThreshold(options.threshold || 0),
			useArea = /^area/.test(series.type),
			singlePoints = [], // used in drawTracker
			areaPath = [],
			attribs;


		// divide into segments and build graph and area paths
		each(series.segments, function (segment) {
			segmentPath = [];

			// build the segment line
			each(segment, function (point, i) {

				if (series.getPointSpline) { // generate the spline as defined in the SplineSeries object
					segmentPath.push.apply(segmentPath, series.getPointSpline(segment, point, i));

				} else {

					// moveTo or lineTo
					segmentPath.push(i ? L : M);

					// step line?
					if (i && options.step) {
						var lastPoint = segment[i - 1];
						segmentPath.push(
							point.plotX,
							lastPoint.plotY
						);
					}

					// normal line to next point
					segmentPath.push(
						point.plotX,
						point.plotY
					);
				}
			});

			// add the segment to the graph, or a single point for tracking
			if (segment.length > 1) {
				graphPath = graphPath.concat(segmentPath);
			} else {
				singlePoints.push(segment[0]);
			}

			// build the area
			if (useArea) {
				var areaSegmentPath = [],
					i,
					segLength = segmentPath.length;
				for (i = 0; i < segLength; i++) {
					areaSegmentPath.push(segmentPath[i]);
				}
				if (segLength === 3) { // for animation from 1 to two points
					areaSegmentPath.push(L, segmentPath[1], segmentPath[2]);
				}
				if (options.stacking && series.type !== 'areaspline') {
					// follow stack back. Todo: implement areaspline
					for (i = segment.length - 1; i >= 0; i--) {
						areaSegmentPath.push(segment[i].plotX, segment[i].yBottom);
					}

				} else { // follow zero line back
					areaSegmentPath.push(
						L,
						segment[segment.length - 1].plotX,
						translatedThreshold,
						L,
						segment[0].plotX,
						translatedThreshold
					);
				}
				areaPath = areaPath.concat(areaSegmentPath);
			}
		});

		// used in drawTracker:
		series.graphPath = graphPath;
		series.singlePoints = singlePoints;

		// draw the area if area series or areaspline
		if (useArea) {
			fillColor = pick(
				options.fillColor,
				Color(series.color).setOpacity(options.fillOpacity || 0.75).get()
			);
			if (area) {
				area.animate({ d: areaPath });

			} else {
				// draw the area
				series.area = series.chart.renderer.path(areaPath)
					.attr({
						fill: fillColor
					}).add(group);
			}
		}

		// draw the graph
		if (graph) {
			stop(graph); // cancel running animations, #459
			graph.animate({ d: graphPath });

		} else {
			if (lineWidth) {
				attribs = {
					'stroke': color,
					'stroke-width': lineWidth
				};
				if (dashStyle) {
					attribs.dashstyle = dashStyle;
				}

				series.graph = renderer.path(graphPath)
					.attr(attribs).add(group).shadow(options.shadow);
			}
		}
	},


	/**
	 * Render the graph and markers
	 */
	render: function () {
		var series = this,
			chart = series.chart,
			group,
			setInvert,
			options = series.options,
			animation = options.animation,
			doAnimation = animation && series.animate,
			duration = doAnimation ? (animation && animation.duration) || 500 : 0,
			clipRect = series.clipRect,
			renderer = chart.renderer;


		// Add plot area clipping rectangle. If this is before chart.hasRendered,
		// create one shared clipRect.
		if (!clipRect) {
			clipRect = series.clipRect = !chart.hasRendered && chart.clipRect ?
				chart.clipRect :
				renderer.clipRect(0, 0, chart.plotSizeX, chart.plotSizeY);
			if (!chart.clipRect) {
				chart.clipRect = clipRect;
			}
		}


		// the group
		if (!series.group) {
			group = series.group = renderer.g('series');

			if (chart.inverted) {
				setInvert = function () {
					group.attr({
						width: chart.plotWidth,
						height: chart.plotHeight
					}).invert();
				};

				setInvert(); // do it now
				addEvent(chart, 'resize', setInvert); // do it on resize
				addEvent(series, 'destroy', function () {
					removeEvent(chart, 'resize', setInvert);
				});
			}
			group.clip(series.clipRect)
				.attr({
					visibility: series.visible ? VISIBLE : HIDDEN,
					zIndex: options.zIndex
				})
				.translate(chart.plotLeft, chart.plotTop)
				.add(chart.seriesGroup);
		}

		series.drawDataLabels();

		// initiate the animation
		if (doAnimation) {
			series.animate(true);
		}

		// cache attributes for shapes
		//series.getAttribs();

		// draw the graph if any
		if (series.drawGraph) {
			series.drawGraph();
		}

		// draw the points
		series.drawPoints();

		// draw the mouse tracking area
		if (series.options.enableMouseTracking !== false) {
			series.drawTracker();
		}

		// run the animation
		if (doAnimation) {
			series.animate();
		}

		// finish the individual clipRect
		setTimeout(function () {
			clipRect.isAnimating = false;
			group = series.group; // can be destroyed during the timeout
			if (group && clipRect !== chart.clipRect && clipRect.renderer) {
				group.clip((series.clipRect = chart.clipRect));
				clipRect.destroy();
			}
		}, duration);


		series.isDirty = false; // means data is in accordance with what you see

	},

	/**
	 * Redraw the series after an update in the axes.
	 */
	redraw: function () {
		var series = this,
			chart = series.chart,
			group = series.group;

		/*if (clipRect) {
			stop(clipRect);
			clipRect.animate({ // for chart resize
				width: chart.plotSizeX,
				height: chart.plotSizeY
			});
		}*/

		// reposition on resize
		if (group) {
			if (chart.inverted) {
				group.attr({
					width: chart.plotWidth,
					height: chart.plotHeight
				});
			}

			group.animate({
				translateX: chart.plotLeft,
				translateY: chart.plotTop
			});
		}

		series.translate();
		series.setTooltipPoints(true);
		series.render();
	},

	/**
	 * Set the state of the graph
	 */
	setState: function (state) {
		var series = this,
			options = series.options,
			graph = series.graph,
			stateOptions = options.states,
			lineWidth = options.lineWidth;

		state = state || NORMAL_STATE;

		if (series.state !== state) {
			series.state = state;

			if (stateOptions[state] && stateOptions[state].enabled === false) {
				return;
			}

			if (state) {
				lineWidth = stateOptions[state].lineWidth || lineWidth + 1;
			}

			if (graph && !graph.dashstyle) { // hover is turned off for dashed lines in VML
				graph.attr({ // use attr because animate will cause any other animation on the graph to stop
					'stroke-width': lineWidth
				}, state ? 0 : 500);
			}
		}
	},

	/**
	 * Set the visibility of the graph
	 *
	 * @param vis {Boolean} True to show the series, false to hide. If UNDEFINED,
	 *        the visibility is toggled.
	 */
	setVisible: function (vis, redraw) {
		var series = this,
			chart = series.chart,
			legendItem = series.legendItem,
			seriesGroup = series.group,
			seriesTracker = series.tracker,
			dataLabelsGroup = series.dataLabelsGroup,
			showOrHide,
			i,
			data = series.data,
			point,
			ignoreHiddenSeries = chart.options.chart.ignoreHiddenSeries,
			oldVisibility = series.visible;

		// if called without an argument, toggle visibility
		series.visible = vis = vis === UNDEFINED ? !oldVisibility : vis;
		showOrHide = vis ? 'show' : 'hide';

		// show or hide series
		if (seriesGroup) { // pies don't have one
			seriesGroup[showOrHide]();
		}

		// show or hide trackers
		if (seriesTracker) {
			seriesTracker[showOrHide]();
		} else {
			i = data.length;
			while (i--) {
				point = data[i];
				if (point.tracker) {
					point.tracker[showOrHide]();
				}
			}
		}


		if (dataLabelsGroup) {
			dataLabelsGroup[showOrHide]();
		}

		if (legendItem) {
			chart.legend.colorizeItem(series, vis);
		}


		// rescale or adapt to resized chart
		series.isDirty = true;
		// in a stack, all other series are affected
		if (series.options.stacking) {
			each(chart.series, function (otherSeries) {
				if (otherSeries.options.stacking && otherSeries.visible) {
					otherSeries.isDirty = true;
				}
			});
		}

		if (ignoreHiddenSeries) {
			chart.isDirtyBox = true;
		}
		if (redraw !== false) {
			chart.redraw();
		}

		fireEvent(series, showOrHide);
	},

	/**
	 * Show the graph
	 */
	show: function () {
		this.setVisible(true);
	},

	/**
	 * Hide the graph
	 */
	hide: function () {
		this.setVisible(false);
	},


	/**
	 * Set the selected state of the graph
	 *
	 * @param selected {Boolean} True to select the series, false to unselect. If
	 *        UNDEFINED, the selection state is toggled.
	 */
	select: function (selected) {
		var series = this;
		// if called without an argument, toggle
		series.selected = selected = (selected === UNDEFINED) ? !series.selected : selected;

		if (series.checkbox) {
			series.checkbox.checked = selected;
		}

		fireEvent(series, selected ? 'select' : 'unselect');
	},


	/**
	 * Draw the tracker object that sits above all data labels and markers to
	 * track mouse events on the graph or points. For the line type charts
	 * the tracker uses the same graphPath, but with a greater stroke width
	 * for better control.
	 */
	drawTracker: function () {
		var series = this,
			options = series.options,
			trackerPath = [].concat(series.graphPath),
			trackerPathLength = trackerPath.length,
			chart = series.chart,
			snap = chart.options.tooltip.snap,
			tracker = series.tracker,
			cursor = options.cursor,
			css = cursor && { cursor: cursor },
			singlePoints = series.singlePoints,
			singlePoint,
			i;

		// Extend end points. A better way would be to use round linecaps,
		// but those are not clickable in VML.
		if (trackerPathLength) {
			i = trackerPathLength + 1;
			while (i--) {
				if (trackerPath[i] === M) { // extend left side
					trackerPath.splice(i + 1, 0, trackerPath[i + 1] - snap, trackerPath[i + 2], L);
				}
				if ((i && trackerPath[i] === M) || i === trackerPathLength) { // extend right side
					trackerPath.splice(i, 0, L, trackerPath[i - 2] + snap, trackerPath[i - 1]);
				}
			}
		}

		// handle single points
		for (i = 0; i < singlePoints.length; i++) {
			singlePoint = singlePoints[i];
			trackerPath.push(M, singlePoint.plotX - snap, singlePoint.plotY,
				L, singlePoint.plotX + snap, singlePoint.plotY);
		}

		// draw the tracker
		if (tracker) {
			tracker.attr({ d: trackerPath });

		} else { // create
			series.tracker = chart.renderer.path(trackerPath)
				.attr({
					isTracker: true,
					stroke: TRACKER_FILL,
					fill: NONE,
					'stroke-width' : options.lineWidth + 2 * snap,
					visibility: series.visible ? VISIBLE : HIDDEN,
					zIndex: options.zIndex || 1
				})
				.on(hasTouch ? 'touchstart' : 'mouseover', function () {
					if (chart.hoverSeries !== series) {
						series.onMouseOver();
					}
				})
				.on('mouseout', function () {
					if (!options.stickyTracking) {
						series.onMouseOut();
					}
				})
				.css(css)
				.add(chart.trackerGroup);
		}

	}

}; // end Series prototype


/**
 * LineSeries object
 */
var LineSeries = extendClass(Series);
seriesTypes.line = LineSeries;

/**
 * AreaSeries object
 */
var AreaSeries = extendClass(Series, {
	type: 'area'
});
seriesTypes.area = AreaSeries;




/**
 * SplineSeries object
 */
var SplineSeries = extendClass(Series, {
	type: 'spline',

	/**
	 * Draw the actual graph
	 */
	getPointSpline: function (segment, point, i) {
		var smoothing = 1.5, // 1 means control points midway between points, 2 means 1/3 from the point, 3 is 1/4 etc
			denom = smoothing + 1,
			plotX = point.plotX,
			plotY = point.plotY,
			lastPoint = segment[i - 1],
			nextPoint = segment[i + 1],
			leftContX,
			leftContY,
			rightContX,
			rightContY,
			ret;

		// find control points
		if (i && i < segment.length - 1) {
			var lastX = lastPoint.plotX,
				lastY = lastPoint.plotY,
				nextX = nextPoint.plotX,
				nextY = nextPoint.plotY,
				correction;

			leftContX = (smoothing * plotX + lastX) / denom;
			leftContY = (smoothing * plotY + lastY) / denom;
			rightContX = (smoothing * plotX + nextX) / denom;
			rightContY = (smoothing * plotY + nextY) / denom;

			// have the two control points make a straight line through main point
			correction = ((rightContY - leftContY) * (rightContX - plotX)) /
				(rightContX - leftContX) + plotY - rightContY;

			leftContY += correction;
			rightContY += correction;

			// to prevent false extremes, check that control points are between
			// neighbouring points' y values
			if (leftContY > lastY && leftContY > plotY) {
				leftContY = mathMax(lastY, plotY);
				rightContY = 2 * plotY - leftContY; // mirror of left control point
			} else if (leftContY < lastY && leftContY < plotY) {
				leftContY = mathMin(lastY, plotY);
				rightContY = 2 * plotY - leftContY;
			}
			if (rightContY > nextY && rightContY > plotY) {
				rightContY = mathMax(nextY, plotY);
				leftContY = 2 * plotY - rightContY;
			} else if (rightContY < nextY && rightContY < plotY) {
				rightContY = mathMin(nextY, plotY);
				leftContY = 2 * plotY - rightContY;
			}

			// record for drawing in next point
			point.rightContX = rightContX;
			point.rightContY = rightContY;

		}

		// moveTo or lineTo
		if (!i) {
			ret = [M, plotX, plotY];
		} else { // curve from last point to this
			ret = [
				'C',
				lastPoint.rightContX || lastPoint.plotX,
				lastPoint.rightContY || lastPoint.plotY,
				leftContX || plotX,
				leftContY || plotY,
				plotX,
				plotY
			];
			lastPoint.rightContX = lastPoint.rightContY = null; // reset for updating series later
		}
		return ret;
	}
});
seriesTypes.spline = SplineSeries;



/**
 * AreaSplineSeries object
 */
var AreaSplineSeries = extendClass(SplineSeries, {
	type: 'areaspline'
});
seriesTypes.areaspline = AreaSplineSeries;

/**
 * ColumnSeries object
 */
var ColumnSeries = extendClass(Series, {
	type: 'column',
	pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
		stroke: 'borderColor',
		'stroke-width': 'borderWidth',
		fill: 'color',
		r: 'borderRadius'
	},
	init: function () {
		Series.prototype.init.apply(this, arguments);

		var series = this,
			chart = series.chart;

		// flag the chart in order to pad the x axis
		chart.hasColumn = true;

		// if the series is added dynamically, force redraw of other
		// series affected by a new column
		if (chart.hasRendered) {
			each(chart.series, function (otherSeries) {
				if (otherSeries.type === series.type) {
					otherSeries.isDirty = true;
				}
			});
		}
	},

	/**
	 * Translate each point to the plot area coordinate system and find shape positions
	 */
	translate: function () {
		var series = this,
			chart = series.chart,
			options = series.options,
			stacking = options.stacking,
			borderWidth = options.borderWidth,
			columnCount = 0,
			reversedXAxis = series.xAxis.reversed,
			categories = series.xAxis.categories,
			stackGroups = {},
			stackKey,
			columnIndex;

		Series.prototype.translate.apply(series);

		// Get the total number of column type series.
		// This is called on every series. Consider moving this logic to a
		// chart.orderStacks() function and call it on init, addSeries and removeSeries
		each(chart.series, function (otherSeries) {
			if (otherSeries.type === series.type && otherSeries.visible) {
				if (otherSeries.options.stacking) {
					stackKey = otherSeries.stackKey;
					if (stackGroups[stackKey] === UNDEFINED) {
						stackGroups[stackKey] = columnCount++;
					}
					columnIndex = stackGroups[stackKey];
				} else {
					columnIndex = columnCount++;
				}
				otherSeries.columnIndex = columnIndex;
			}
		});

		// calculate the width and position of each column based on
		// the number of column series in the plot, the groupPadding
		// and the pointPadding options
		var data = series.data,
			closestPoints = series.closestPoints,
			categoryWidth = mathAbs(
				data[1] ? data[closestPoints].plotX - data[closestPoints - 1].plotX :
				chart.plotSizeX / ((categories && categories.length) || 1)
			),
			groupPadding = categoryWidth * options.groupPadding,
			groupWidth = categoryWidth - 2 * groupPadding,
			pointOffsetWidth = groupWidth / columnCount,
			optionPointWidth = options.pointWidth,
			pointPadding = defined(optionPointWidth) ? (pointOffsetWidth - optionPointWidth) / 2 :
				pointOffsetWidth * options.pointPadding,
			pointWidth = mathMax(pick(optionPointWidth, pointOffsetWidth - 2 * pointPadding), 1),
			colIndex = (reversedXAxis ? columnCount -
				series.columnIndex : series.columnIndex) || 0,
			pointXOffset = pointPadding + (groupPadding + colIndex *
				pointOffsetWidth - (categoryWidth / 2)) *
				(reversedXAxis ? -1 : 1),
			threshold = options.threshold || 0,
			translatedThreshold = series.yAxis.getThreshold(threshold),
			minPointLength = pick(options.minPointLength, 5);

		// record the new values
		each(data, function (point) {
			var plotY = point.plotY,
				yBottom = point.yBottom || translatedThreshold,
				barX = point.plotX + pointXOffset,
				barY = mathCeil(mathMin(plotY, yBottom)),
				barH = mathCeil(mathMax(plotY, yBottom) - barY),
				stack = series.yAxis.stacks[(point.y < 0 ? '-' : '') + series.stackKey],
				trackerY,
				shapeArgs;

			// Record the offset'ed position and width of the bar to be able to align the stacking total correctly
			if (stacking && series.visible && stack && stack[point.x]) {
				stack[point.x].setOffset(pointXOffset, pointWidth);
			}

			// handle options.minPointLength and tracker for small points
			if (mathAbs(barH) < minPointLength) {
				if (minPointLength) {
					barH = minPointLength;
					barY =
						mathAbs(barY - translatedThreshold) > minPointLength ? // stacked
							yBottom - minPointLength : // keep position
							translatedThreshold - (plotY <= translatedThreshold ? minPointLength : 0);
				}
				trackerY = barY - 3;
			}

			extend(point, {
				barX: barX,
				barY: barY,
				barW: pointWidth,
				barH: barH
			});

			// create shape type and shape args that are reused in drawPoints and drawTracker
			point.shapeType = 'rect';
			shapeArgs = extend(chart.renderer.Element.prototype.crisp.apply({}, [
				borderWidth,
				barX,
				barY,
				pointWidth,
				barH
			]), {
				r: options.borderRadius
			});
			if (borderWidth % 2) { // correct for shorting in crisp method, visible in stacked columns with 1px border
				shapeArgs.y -= 1;
				shapeArgs.height += 1;
			}
			point.shapeArgs = shapeArgs;

			// make small columns responsive to mouse
			point.trackerArgs = defined(trackerY) && merge(point.shapeArgs, {
				height: mathMax(6, barH + 3),
				y: trackerY
			});
		});

	},

	getSymbol: function () {
	},

	/**
	 * Columns have no graph
	 */
	drawGraph: function () {},

	/**
	 * Draw the columns. For bars, the series.group is rotated, so the same coordinates
	 * apply for columns and bars. This method is inherited by scatter series.
	 *
	 */
	drawPoints: function () {
		var series = this,
			options = series.options,
			renderer = series.chart.renderer,
			graphic,
			shapeArgs;


		// draw the columns
		each(series.data, function (point) {
			var plotY = point.plotY;
			if (plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {
				graphic = point.graphic;
				shapeArgs = point.shapeArgs;
				if (graphic) { // update
					stop(graphic);
					graphic.animate(shapeArgs);

				} else {
					point.graphic = renderer[point.shapeType](shapeArgs)
						.attr(point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE])
						.add(series.group)
						.shadow(options.shadow);
				}

			}
		});
	},
	/**
	 * Draw the individual tracker elements.
	 * This method is inherited by scatter and pie charts too.
	 */
	drawTracker: function () {
		var series = this,
			chart = series.chart,
			renderer = chart.renderer,
			shapeArgs,
			tracker,
			trackerLabel = +new Date(),
			options = series.options,
			cursor = options.cursor,
			css = cursor && { cursor: cursor },
			rel;

		each(series.data, function (point) {
			tracker = point.tracker;
			shapeArgs = point.trackerArgs || point.shapeArgs;
			delete shapeArgs.strokeWidth;
			if (point.y !== null) {
				if (tracker) {// update
					tracker.attr(shapeArgs);

				} else {
					point.tracker =
						renderer[point.shapeType](shapeArgs)
						.attr({
							isTracker: trackerLabel,
							fill: TRACKER_FILL,
							visibility: series.visible ? VISIBLE : HIDDEN,
							zIndex: options.zIndex || 1
						})
						.on(hasTouch ? 'touchstart' : 'mouseover', function (event) {
							rel = event.relatedTarget || event.fromElement;
							if (chart.hoverSeries !== series && attr(rel, 'isTracker') !== trackerLabel) {
								series.onMouseOver();
							}
							point.onMouseOver();

						})
						.on('mouseout', function (event) {
							if (!options.stickyTracking) {
								rel = event.relatedTarget || event.toElement;
								if (attr(rel, 'isTracker') !== trackerLabel) {
									series.onMouseOut();
								}
							}
						})
						.css(css)
						.add(point.group || chart.trackerGroup); // pies have point group - see issue #118
				}
			}
		});
	},


	/**
	 * Animate the column heights one by one from zero
	 * @param {Boolean} init Whether to initialize the animation or run it
	 */
	animate: function (init) {
		var series = this,
			data = series.data;

		if (!init) { // run the animation
			/*
			 * Note: Ideally the animation should be initialized by calling
			 * series.group.hide(), and then calling series.group.show()
			 * after the animation was started. But this rendered the shadows
			 * invisible in IE8 standards mode. If the columns flicker on large
			 * datasets, this is the cause.
			 */

			each(data, function (point) {
				var graphic = point.graphic,
					shapeArgs = point.shapeArgs;

				if (graphic) {
					// start values
					graphic.attr({
						height: 0,
						y: series.yAxis.translate(0, 0, 1)
					});

					// animate
					graphic.animate({
						height: shapeArgs.height,
						y: shapeArgs.y
					}, series.options.animation);
				}
			});


			// delete this function to allow it only once
			series.animate = null;
		}

	},
	/**
	 * Remove this series from the chart
	 */
	remove: function () {
		var series = this,
			chart = series.chart;

		// column and bar series affects other series of the same type
		// as they are either stacked or grouped
		if (chart.hasRendered) {
			each(chart.series, function (otherSeries) {
				if (otherSeries.type === series.type) {
					otherSeries.isDirty = true;
				}
			});
		}

		Series.prototype.remove.apply(series, arguments);
	}
});
seriesTypes.column = ColumnSeries;

var BarSeries = extendClass(ColumnSeries, {
	type: 'bar',
	init: function (chart) {
		chart.inverted = this.inverted = true;
		ColumnSeries.prototype.init.apply(this, arguments);
	}
});
seriesTypes.bar = BarSeries;

/**
 * The scatter series class
 */
var ScatterSeries = extendClass(Series, {
	type: 'scatter',

	/**
	 * Extend the base Series' translate method by adding shape type and
	 * arguments for the point trackers
	 */
	translate: function () {
		var series = this;

		Series.prototype.translate.apply(series);

		each(series.data, function (point) {
			point.shapeType = 'circle';
			point.shapeArgs = {
				x: point.plotX,
				y: point.plotY,
				r: series.chart.options.tooltip.snap
			};
		});
	},


	/**
	 * Create individual tracker elements for each point
	 */
	//drawTracker: ColumnSeries.prototype.drawTracker,
	drawTracker: function () {
		var series = this,
			cursor = series.options.cursor,
			css = cursor && { cursor: cursor },
			graphic;

		each(series.data, function (point) {
			graphic = point.graphic;
			if (graphic) { // doesn't exist for null points
				graphic
					.attr({ isTracker: true })
					.on('mouseover', function () {
						series.onMouseOver();
						point.onMouseOver();
					})
					.on('mouseout', function () {
						if (!series.options.stickyTracking) {
							series.onMouseOut();
						}
					})
					.css(css);
			}
		});

	},

	/**
	 * Cleaning the data is not necessary in a scatter plot
	 */
	cleanData: function () {}
});
seriesTypes.scatter = ScatterSeries;

/**
 * Extended point object for pies
 */
var PiePoint = extendClass(Point, {
	/**
	 * Initiate the pie slice
	 */
	init: function () {

		Point.prototype.init.apply(this, arguments);

		var point = this,
			toggleSlice;

		//visible: options.visible !== false,
		extend(point, {
			visible: point.visible !== false,
			name: pick(point.name, 'Slice')
		});

		// add event listener for select
		toggleSlice = function () {
			point.slice();
		};
		addEvent(point, 'select', toggleSlice);
		addEvent(point, 'unselect', toggleSlice);

		return point;
	},

	/**
	 * Toggle the visibility of the pie slice
	 * @param {Boolean} vis Whether to show the slice or not. If undefined, the
	 *    visibility is toggled
	 */
	setVisible: function (vis) {
		var point = this,
			chart = point.series.chart,
			tracker = point.tracker,
			dataLabel = point.dataLabel,
			connector = point.connector,
			shadowGroup = point.shadowGroup,
			method;

		// if called without an argument, toggle visibility
		point.visible = vis = vis === UNDEFINED ? !point.visible : vis;

		method = vis ? 'show' : 'hide';

		point.group[method]();
		if (tracker) {
			tracker[method]();
		}
		if (dataLabel) {
			dataLabel[method]();
		}
		if (connector) {
			connector[method]();
		}
		if (shadowGroup) {
			shadowGroup[method]();
		}
		if (point.legendItem) {
			chart.legend.colorizeItem(point, vis);
		}
	},

	/**
	 * Set or toggle whether the slice is cut out from the pie
	 * @param {Boolean} sliced When undefined, the slice state is toggled
	 * @param {Boolean} redraw Whether to redraw the chart. True by default.
	 */
	slice: function (sliced, redraw, animation) {
		var point = this,
			series = point.series,
			chart = series.chart,
			slicedTranslation = point.slicedTranslation,
			translation;

		setAnimation(animation, chart);

		// redraw is true by default
		redraw = pick(redraw, true);

		// if called without an argument, toggle
		sliced = point.sliced = defined(sliced) ? sliced : !point.sliced;

		translation = {
			translateX: (sliced ? slicedTranslation[0] : chart.plotLeft),
			translateY: (sliced ? slicedTranslation[1] : chart.plotTop)
		};
		point.group.animate(translation);
		if (point.shadowGroup) {
			point.shadowGroup.animate(translation);
		}

	}
});

/**
 * The Pie series class
 */
var PieSeries = extendClass(Series, {
	type: 'pie',
	isCartesian: false,
	pointClass: PiePoint,
	pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
		stroke: 'borderColor',
		'stroke-width': 'borderWidth',
		fill: 'color'
	},

	/**
	 * Pies have one color each point
	 */
	getColor: function () {
		// record first color for use in setData
		this.initialColor = this.chart.counters.color;
	},

	/**
	 * Animate the column heights one by one from zero
	 */
	animate: function () {
		var series = this,
			data = series.data;

		each(data, function (point) {
			var graphic = point.graphic,
				args = point.shapeArgs,
				up = -mathPI / 2;

			if (graphic) {
				// start values
				graphic.attr({
					r: 0,
					start: up,
					end: up
				});

				// animate
				graphic.animate({
					r: args.r,
					start: args.start,
					end: args.end
				}, series.options.animation);
			}
		});

		// delete this function to allow it only once
		series.animate = null;

	},
	/**
	 * Do translation for pie slices
	 */
	translate: function () {
        
        // PATCH by Simon Fishel
        //
        // execute plotRenderHook hook to pre-process the plotting options
        //
        // + if(series.options.hooks && series.options.hooks.plotRenderHook) {
        // +    series.options.hooks.plotRenderHook(series);
        // + }
        
        if(this.options.hooks && this.options.hooks.plotRenderHook) {
            this.options.hooks.plotRenderHook(this);
        }
        
		var total = 0,
			series = this,
			cumulative = -0.25, // start at top
			precision = 1000, // issue #172
			options = series.options,
			slicedOffset = options.slicedOffset,
			connectorOffset = slicedOffset + options.borderWidth,
			positions = options.center.concat([options.size, options.innerSize || 0]),
			chart = series.chart,
			plotWidth = chart.plotWidth,
			plotHeight = chart.plotHeight,
			start,
			end,
			angle,
			data = series.data,
			circ = 2 * mathPI,
			fraction,
			smallestSize = mathMin(plotWidth, plotHeight),
			isPercent,
			radiusX, // the x component of the radius vector for a given point
			radiusY,
			labelDistance = options.dataLabels.distance;

		// get positions - either an integer or a percentage string must be given
		positions = map(positions, function (length, i) {

			isPercent = /%$/.test(length);
			return isPercent ?
				// i == 0: centerX, relative to width
				// i == 1: centerY, relative to height
				// i == 2: size, relative to smallestSize
				// i == 4: innerSize, relative to smallestSize
				[plotWidth, plotHeight, smallestSize, smallestSize][i] *
					pInt(length) / 100 :
				length;
		});

		// utility for getting the x value from a given y, used for anticollision logic in data labels
		series.getX = function (y, left) {

			angle = math.asin((y - positions[1]) / (positions[2] / 2 + labelDistance));

			return positions[0] +
				(left ? -1 : 1) *
				(mathCos(angle) * (positions[2] / 2 + labelDistance));
		};

		// set center for later use
		series.center = positions;

		// get the total sum
		each(data, function (point) {
			total += point.y;
		});

		each(data, function (point) {
			// set start and end angle
			fraction = total ? point.y / total : 0;
			start = mathRound(cumulative * circ * precision) / precision;
			cumulative += fraction;
			end = mathRound(cumulative * circ * precision) / precision;

			// set the shape
			point.shapeType = 'arc';
			point.shapeArgs = {
				x: positions[0],
				y: positions[1],
				r: positions[2] / 2,
				innerR: positions[3] / 2,
				start: start,
				end: end
			};

			// center for the sliced out slice
			angle = (end + start) / 2;
			point.slicedTranslation = map([
				mathCos(angle) * slicedOffset + chart.plotLeft,
				mathSin(angle) * slicedOffset + chart.plotTop
			], mathRound);

			// set the anchor point for tooltips
			radiusX = mathCos(angle) * positions[2] / 2;
			radiusY = mathSin(angle) * positions[2] / 2;
			point.tooltipPos = [
				positions[0] + radiusX * 0.7,
				positions[1] + radiusY * 0.7
			];

			// set the anchor point for data labels
			point.labelPos = [
				positions[0] + radiusX + mathCos(angle) * labelDistance, // first break of connector
				positions[1] + radiusY + mathSin(angle) * labelDistance, // a/a
				positions[0] + radiusX + mathCos(angle) * connectorOffset, // second break, right outside pie
				positions[1] + radiusY + mathSin(angle) * connectorOffset, // a/a
				positions[0] + radiusX, // landing point for connector
				positions[1] + radiusY, // a/a
				labelDistance < 0 ? // alignment
					'center' :
					angle < circ / 4 ? 'left' : 'right', // alignment
				angle // center angle
			];

			// API properties
			point.percentage = fraction * 100;
			point.total = total;

		});


		this.setTooltipPoints();
	},

	/**
	 * Render the slices
	 */
	render: function () {
		var series = this;

		// cache attributes for shapes
		//series.getAttribs();

		this.drawPoints();

		// draw the mouse tracking area
		if (series.options.enableMouseTracking !== false) {
			series.drawTracker();
		}
        
        // PATCH by Simon Fishel
        //
        // execute beforeLabelRender hook to allow re-formatting of data labels
        //
        // + if(series.options.hooks && series.options.hooks.beforeLabelRender) {
        // +    series.options.hooks.beforeLabelRender(series)
        // + }
        
        if(series.options.hooks && series.options.hooks.beforeLabelRender) {
            series.options.hooks.beforeLabelRender(series)
        }

		this.drawDataLabels();

		if (series.options.animation && series.animate) {
			series.animate();
		}

		series.isDirty = false; // means data is in accordance with what you see
	},

	/**
	 * Draw the data points
	 */
	drawPoints: function () {
		var series = this,
			chart = series.chart,
			renderer = chart.renderer,
			groupTranslation,
			//center,
			graphic,
			group,
			shadow = series.options.shadow,
			shadowGroup,
			shapeArgs;


		// draw the slices
		each(series.data, function (point) {
			graphic = point.graphic;
			shapeArgs = point.shapeArgs;
			group = point.group;
			shadowGroup = point.shadowGroup;

			// put the shadow behind all points
			if (shadow && !shadowGroup) {
				shadowGroup = point.shadowGroup = renderer.g('shadow')
					.attr({ zIndex: 4 })
					.add();
			}

			// create the group the first time
			if (!group) {
				group = point.group = renderer.g('point')
					.attr({ zIndex: 5 })
					.add();
			}

			// if the point is sliced, use special translation, else use plot area traslation
			groupTranslation = point.sliced ? point.slicedTranslation : [chart.plotLeft, chart.plotTop];
			group.translate(groupTranslation[0], groupTranslation[1]);
			if (shadowGroup) {
				shadowGroup.translate(groupTranslation[0], groupTranslation[1]);
			}


			// draw the slice
			if (graphic) {
				graphic.animate(shapeArgs);
			} else {
				point.graphic =
					renderer.arc(shapeArgs)
					.attr(extend(
						point.pointAttr[NORMAL_STATE],
						{ 'stroke-linejoin': 'round' }
					))
					.add(point.group)
					.shadow(shadow, shadowGroup);
			}

			// detect point specific visibility
			if (point.visible === false) {
				point.setVisible(false);
			}

		});

	},

	/**
	 * Override the base drawDataLabels method by pie specific functionality
	 */
	drawDataLabels: function () {
		var series = this,
			data = series.data,
			point,
			chart = series.chart,
			options = series.options.dataLabels,
			connectorPadding = pick(options.connectorPadding, 10),
			connectorWidth = pick(options.connectorWidth, 1),
			connector,
			connectorPath,
			softConnector = pick(options.softConnector, true),
			distanceOption = options.distance,
			seriesCenter = series.center,
			radius = seriesCenter[2] / 2,
			centerY = seriesCenter[1],
			outside = distanceOption > 0,
			dataLabel,
			labelPos,
			labelHeight,
			halves = [// divide the points into right and left halves for anti collision
				[], // right
				[]  // left
			],
			x,
			y,
			visibility,
			rankArr,
			sort,
			i = 2,
			j;

		// get out if not enabled
		if (!options.enabled) {
			return;
		}

		// run parent method
		Series.prototype.drawDataLabels.apply(series);

		// arrange points for detection collision
		each(data, function (point) {
			if (point.dataLabel) { // it may have been cancelled in the base method (#407)
				halves[
					point.labelPos[7] < mathPI / 2 ? 0 : 1
				].push(point);
			}
		});
		halves[1].reverse();

		// define the sorting algorithm
		sort = function (a, b) {
			return b.y - a.y;
		};

		// assume equal label heights
		labelHeight = halves[0][0] && halves[0][0].dataLabel && pInt(halves[0][0].dataLabel.styles.lineHeight);

		/* Loop over the points in each quartile, starting from the top and bottom
		 * of the pie to detect overlapping labels.
		 */
		while (i--) {

			var slots = [],
				slotsLength,
				usedSlots = [],
				points = halves[i],
				pos,
				length = points.length,
				slotIndex;


			// build the slots
			for (pos = centerY - radius - distanceOption; pos <= centerY + radius + distanceOption; pos += labelHeight) {
				slots.push(pos);
				// visualize the slot
				/*
				var //slotX = series.getX(pos, i) + chart.plotLeft - (i ? 100 : 0),
				    slotX = chart.plotLeft + series.center[0] + (i ? (radius + distanceOption) : (-radius - distanceOption - 100)),
					slotY = pos + chart.plotTop;
				if (!isNaN(slotX)) {
					chart.renderer.rect(slotX, slotY - 7, 100, labelHeight)
						.attr({
							'stroke-width': 1,
							stroke: 'silver'
						})
						.add();
					chart.renderer.text('Slot '+ (slots.length - 1), slotX, slotY + 4)
						.attr({
							fill: 'silver'
						}).add();
				}
				// */
			}
			slotsLength = slots.length;

			// if there are more values than available slots, remove lowest values
			if (length > slotsLength) {
				// create an array for sorting and ranking the points within each quarter
				rankArr = [].concat(points);
				rankArr.sort(sort);
				j = length;
				while (j--) {
					rankArr[j].rank = j;
				}
				j = length;
				while (j--) {
					if (points[j].rank >= slotsLength) {
						points.splice(j, 1);
					}
				}
				length = points.length;
			}

			// The label goes to the nearest open slot, but not closer to the edge than
			// the label's index.
			for (j = 0; j < length; j++) {

				point = points[j];
				labelPos = point.labelPos;

				var closest = 9999,
					distance,
					slotI;

				// find the closest slot index
				for (slotI = 0; slotI < slotsLength; slotI++) {
					distance = mathAbs(slots[slotI] - labelPos[1]);
					if (distance < closest) {
						closest = distance;
						slotIndex = slotI;
					}
				}

				// if that slot index is closer to the edges of the slots, move it
				// to the closest appropriate slot
				if (slotIndex < j && slots[j] !== null) { // cluster at the top
					slotIndex = j;
				} else if (slotsLength  < length - j + slotIndex && slots[j] !== null) { // cluster at the bottom
					slotIndex = slotsLength - length + j;
					while (slots[slotIndex] === null) { // make sure it is not taken
						slotIndex++;
					}
				} else {
					// Slot is taken, find next free slot below. In the next run, the next slice will find the
					// slot above these, because it is the closest one
					while (slots[slotIndex] === null) { // make sure it is not taken
						slotIndex++;
					}
				}

				usedSlots.push({ i: slotIndex, y: slots[slotIndex] });
				slots[slotIndex] = null; // mark as taken
			}
			// sort them in order to fill in from the top
			usedSlots.sort(sort);


			// now the used slots are sorted, fill them up sequentially
			for (j = 0; j < length; j++) {

				point = points[j];
				labelPos = point.labelPos;
				dataLabel = point.dataLabel;
				var slot = usedSlots.pop(),
					naturalY = labelPos[1];

				visibility = point.visible === false ? HIDDEN : VISIBLE;
				slotIndex = slot.i;

				// if the slot next to currrent slot is free, the y value is allowed
				// to fall back to the natural position
				y = slot.y;
				if ((naturalY > y && slots[slotIndex + 1] !== null) ||
						(naturalY < y &&  slots[slotIndex - 1] !== null)) {
					y = naturalY;
				}

				// get the x - use the natural x position for first and last slot, to prevent the top
				// and botton slice connectors from touching each other on either side
                
                // PATCH by Simon Fishel
                //
                // execute xPositionHook to override the x positioning of data labels
                //
                // - x = series.getX(slotIndex === 0 || slotIndex === slots.length - 1 ? naturalY : y, i);
                //
                // + if(options.hooks && options.hooks.xPositionHook) {
                // +     x = options.hooks.xPositionHook(series, options, radiusY, (i != 0));
                // + }
                // + else {
                // +     x = series.getX(slotIndex === 0 || slotIndex === slots.length - 1 ? naturalY : y, i);
                // + }
                
                if(options.hooks && options.hooks.xPositionHook) {
                    x = options.hooks.xPositionHook(series, options, radius, (i == 0));
                }
                else {
                    x = series.getX(slotIndex === 0 || slotIndex === slots.length - 1 ? naturalY : y, i);
                }

				// move or place the data label
				dataLabel
					.attr({
						visibility: visibility,
						align: labelPos[6]
					})[dataLabel.moved ? 'animate' : 'attr']({
						x: x + options.x +
							({ left: connectorPadding, right: -connectorPadding }[labelPos[6]] || 0),
						y: y + options.y
					});
				dataLabel.moved = true;

				// draw the connector
				if (outside && connectorWidth) {
					connector = point.connector;

					connectorPath = softConnector ? [
						M,
						x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
						'C',
						x, y, // first break, next to the label
						2 * labelPos[2] - labelPos[4], 2 * labelPos[3] - labelPos[5],
						labelPos[2], labelPos[3], // second break
						L,
						labelPos[4], labelPos[5] // base
					] : [
						M,
						x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
						L,
						labelPos[2], labelPos[3], // second break
						L,
						labelPos[4], labelPos[5] // base
					];
						
					// PATCH by Simon Fishel
                    //
                    // call the connector position hook to allow modifications to the connector line path
                    //
                    // + if(!softConnector && options.hooks && options.hooks.connectorPositionHook) {
                    // +     options.hooks.connectorPositionHook(connectorPath);
                    // + }
                    
                    if(!softConnector && options.hooks && options.hooks.connectorPositionHook) {
                        options.hooks.connectorPositionHook(connectorPath);
                    }

					if (connector) {
						connector.animate({ d: connectorPath });
						connector.attr('visibility', visibility);

					} else {
						point.connector = connector = series.chart.renderer.path(connectorPath).attr({
							'stroke-width': connectorWidth,
							stroke: options.connectorColor || point.color || '#606060',
							visibility: visibility,
							zIndex: 3
						})
						.translate(chart.plotLeft, chart.plotTop)
						.add();
					}
				}
			}
		}
	},

	/**
	 * Draw point specific tracker objects. Inherit directly from column series.
	 */
	drawTracker: ColumnSeries.prototype.drawTracker,

	/**
	 * Pies don't have point marker symbols
	 */
	getSymbol: function () {}

});
seriesTypes.pie = PieSeries;


// global variables
exports.Highcharts = {
	Chart: Chart,
	dateFormat: dateFormat,
	pathAnim: pathAnim,
	getOptions: getOptions,
	hasRtlBug: hasRtlBug,
	numberFormat: numberFormat,
	Point: Point,
	Color: Color,
	Renderer: Renderer,
	seriesTypes: seriesTypes,
	setOptions: setOptions,
	Series: Series,

	// Expose utility funcitons for modules
	addEvent: addEvent,
	createElement: createElement,
	discardElement: discardElement,
	css: css,
	each: each,
	extend: extend,
	map: map,
	merge: merge,
	pick: pick,
	extendClass: extendClass,
	product: 'Highcharts',
	version: '2.1.7'
};
}());

});

require.define("/ui/charting/lowpro_for_jquery.js", function (require, module, exports, __dirname, __filename) {
(function($) {
  
  var addMethods = function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = $.keys(source);

    if (!$.keys({ toString: true }).length) properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && $.isFunction(value) && $.argumentNames(value)[0] == "$super") {
        
        var method = value, value = $.extend($.wrap((function(m) {
          return function() { return ancestor[m].apply(this, arguments) };
        })(property), method), {
          valueOf:  function() { return method },
          toString: function() { return method.toString() }
        });
      }
      this.prototype[property] = value;
    }

    return this;
  }
  
  $.extend({
    keys: function(obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    },

    argumentNames: function(func) {
      var names = func.toString().match(/^[\s\(]*function[^(]*\((.*?)\)/)[1].split(/, ?/);
      return names.length == 1 && !names[0] ? [] : names;
    },

    bind: function(func, scope) {
      return function() {
        return func.apply(scope, $.makeArray(arguments));
      }
    },

    wrap: function(func, wrapper) {
      var __method = func;
      return function() {
        return wrapper.apply(this, [$.bind(__method, this)].concat($.makeArray(arguments)));
      }
    },
    
    klass: function() {
      var parent = null, properties = $.makeArray(arguments);
      if ($.isFunction(properties[0])) parent = properties.shift();

      var klass = function() { 
        this.initialize.apply(this, arguments);
      };

      klass.superclass = parent;
      klass.subclasses = [];
      klass.addMethods = addMethods;

      if (parent) {
        var subclass = function() { };
        subclass.prototype = parent.prototype;
        klass.prototype = new subclass;
        parent.subclasses.push(klass);
      }

      for (var i = 0; i < properties.length; i++)
        klass.addMethods(properties[i]);

      if (!klass.prototype.initialize)
        klass.prototype.initialize = function() {};

      klass.prototype.constructor = klass;

      return klass;
    }
  });
  
  var bindEvents = function(instance) {
    for (var member in instance) {
      if (member.match(/^on(.+)/) && typeof instance[member] == 'function') {
        instance.element.bind(RegExp.$1, $.bind(instance[member], instance));
      }
    }
  }
  
  var behaviorWrapper = function(behavior) {
    return $.klass(behavior, {
      initialize: function($super, element, args) {
        this.element = $(element);
        if ($super) $super.apply(this, args);
      }
    });
  }
  
  var attachBehavior = function(el, behavior, args) {
      var wrapper = behaviorWrapper(behavior);
      instance = new wrapper(el, args);

      bindEvents(instance);

      if (!behavior.instances) behavior.instances = [];

      behavior.instances.push(instance);
      
      return instance;
  };
  
  
  $.fn.extend({
    attach: function() {
      var args = $.makeArray(arguments), behavior = args.shift();
      
      if ($.livequery && this.selector) {
        return this.livequery(function() {
          attachBehavior(this, behavior, args);
        });
      } else {
        return this.each(function() {
          attachBehavior(this, behavior, args);
        });
      }
    },
    attachAndReturn: function() {
      var args = $.makeArray(arguments), behavior = args.shift();
      
      return $.map(this, function(el) {
        return attachBehavior(el, behavior, args);
      });
    },
    attached: function(behavior) {
      var instances = [];
      
      if (!behavior.instances) return instances;
      
      this.each(function(i, element) {
        $.each(behavior.instances, function(i, instance) {
          if (instance.element.get(0) == element) instances.push(instance);
        });
      });
      
      return instances;
    },
    firstAttached: function(behavior) {
      return this.attached(behavior)[0];
    }
  });
  
  var Remote = $.klass({
    initialize: function(options) {
      if (this.element.attr('nodeName') == 'FORM') this.element.attach(Remote.Form, options);
      else this.element.attach(Remote.Link, options);
    }
  });
  
  Remote.Base = $.klass({
    initialize : function(options) {
      this.options = $.extend({
        
      }, options || {});
    },
    _makeRequest : function(options) {
      $.ajax(options);
      return false;
    }
  });
  
  Remote.Link = $.klass(Remote.Base, {
    onclick: function() {
      var options = $.extend({ url: this.element.attr('href'), type: 'GET' }, this.options);
      return this._makeRequest(options);
    }
  });
  
  Remote.Form = $.klass(Remote.Base, {
    onclick: function(e) {
      var target = e.target;
      
      if ($.inArray(target.nodeName.toLowerCase(), ['input', 'button']) >= 0 && target.type.match(/submit|image/))
        this._submitButton = target;
    },
    onsubmit: function() {
      var data = this.element.serializeArray();
      
      if (this._submitButton) data.push({ name: this._submitButton.name, value: this._submitButton.value });
      
      var options = $.extend({
        url : this.element.attr('action'),
        type : this.element.attr('method') || 'GET',
        data : data
      }, this.options);
      
      this._makeRequest(options);
      
      return false;
    }
  });
  
  $.ajaxSetup({ 
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Accept", "text/javascript, text/html, application/xml, text/xml, */*");
    } 
  });
  
})(jQuery);
});

require.define("/browser.ui.charting.entry.js", function (require, module, exports, __dirname, __filename) {
    
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
    if (!window[exportName]) {
        window[exportName] = {};
    }
    
    if (!window[exportName].UI) {
        window[exportName].UI = {};
    }

    window[exportName].UI.Charting = require('../ui/charting.js');
})(__exportName);
});
require("/browser.ui.charting.entry.js");


})();