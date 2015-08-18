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

require.define("/ui/timeline.js", function (require, module, exports, __dirname, __filename) {

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
    
    // Import the timeline code
    var jg_global   = require('./timeline/jg_global.js');
    var time        = require('./timeline/splunk_time.js');
    var timeline    = require('./timeline/splunk_timeline.js');
    var format      = require('./timeline/format.js');
        
    var Class = require('../jquery.class').Class;
    var utils = require('../utils');
    
    var root = exports || this;

    var SplunkTimeline = timeline.splunk.Timeline;
    var DateTime = time.splunk.time.DateTime;
    var SimpleTimeZone = time.splunk.time.SimpleTimeZone;
    
    // Setup the exports and our timeline wrapper class
    root.DateTime = DateTime;
    root.SimpleTimeZone = SimpleTimeZone;
    root.Timeline = Class.extend({
        init: function(el) {
            this.timeline = new SplunkTimeline();
            this.timeline.setSeriesColor(0x73A550);    
            $(this.timeline.element).addClass("Timeline");
            
            this.timeline.appendTo($(el).get(0));

            // Add the external interface formatting functions
            this.timeline.externalInterface.formatNumericString = format.formatNumericString;
            this.timeline.externalInterface.formatNumber        = format.formatNumber;
            this.timeline.externalInterface.formatDate          = format.formatDate;
            this.timeline.externalInterface.formatTime          = format.formatTime;
            this.timeline.externalInterface.formatDateTime      = format.formatDateTime;
            this.timeline.externalInterface.formatTooltip       = format.formatTooltip;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.updateWithJSON = utils.bind(this, this.updateWithJSON);
            this.updateWithXML  = utils.bind(this, this.updateWithXML);
            this.updateWithData = utils.bind(this, this.updateWithData);
        },
        
        updateWithJSON: function(timelineData) {
            var data = {
              buckets: [],
              cursorTime: new DateTime(timelineData.cursor_time),
              eventCount: timelineData.event_count,
              earliestOffset: timelineData.earliestOffset || 0
            };
            
            if (data.cursorTime) {
              data.cursorTime = data.cursorTime.toTimeZone(new SimpleTimeZone(data.earliestOffset));
            }
            
            for(var i = 0; i < timelineData.buckets.length; i++) {
              var oldBucket = timelineData.buckets[i];
              var newBucket = {
                earliestTime: new DateTime(oldBucket.earliest_time),
                duration: oldBucket.duration,
                eventCount: oldBucket.total_count,
                eventAvailableCount: oldBucket.available_count,
                isComplete: oldBucket.is_finalized
              };

              if (isNaN(newBucket.duration)) {
                newBucket.duration = 0;
              }
              if (isNaN(newBucket.earliestOffset)) {
                newBucket.earliestOffset = 0;
              }
              if (isNaN(newBucket.latestOffset)) {
                newBucket.latestOffset = 0;
              }

              if (newBucket.earliestTime) {
                newBucket.latestTime = new DateTime(newBucket.earliestTime.getTime() + newBucket.duration);
              }
              
              if (newBucket.earliestTime) {
                newBucket.earliestTime = newBucket.earliestTime.toTimeZone(new SimpleTimeZone(oldBucket.earliest_time_offset));
              }
              if (newBucket.latestTime) {
                newBucket.latestTime = newBucket.latestTime.toTimeZone(new SimpleTimeZone(oldBucket.latest_time_offset));
              }
              
              data.buckets.push(newBucket);
            }
            
            this.timeline._updateTimelineData(data);
        },
        
        updateWithXML: function(xmlNode) {
            this.timeline._parseTimelineData(xmlNode);
        },
        
        updateWithData: function(data) {
            this.timeline._updateTimelineData(data);
        }
    });
})();
});

require.define("/ui/timeline/jg_global.js", function (require, module, exports, __dirname, __filename) {
/**
 * Global functions for defining classes and managing scope.
 * 
 * The following functions are declared globally on the window object:
 * 
 *     jg_namespace
 *     jg_import
 *     jg_extend
 *     jg_static
 *     jg_mixin
 *     jg_has_mixin
 *     jg_delegate
 * 
 * Copyright (c) 2011 Jason Gatt
 * 
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function()
{

	// Private Variables

	var _namespaces = {};
	var _imported = {};
	var _loading = {};
	var _classPaths = {};
	var _classInfo = {};
	var _classDependencyList = [];
	var _mixinCount = 0;
	var _mixinDependencies = null;
	
	var rootNamespace = exports;
	var root = exports;

	// Private Functions

	/**
	 * Function for evaluating dynamically loaded scripts.
	 */
	var _evalScript = function(script)
	{
		// create local undefined vars so that script cannot access private vars
		var _namespaces = undefined;
		var _imported = undefined;
		var _loading = undefined;
		var _classPaths = undefined;
		var _classInfo = undefined;
		var _classDependencyList = undefined;
		var _mixinCount = undefined;
		var _mixinDependencies = undefined;
		var _evalScript = undefined;
		var _appendConstructor = undefined;

		// set arguments to undefined so that script cannot access
		arguments = undefined;

		// eval script in context of window
		eval.call(window, script);
	};

	/**
	 * Function for appending a mixin constructor to a base constructor.
	 */
	var _appendConstructor = function(baseConstructor, mixinConstructor)
	{
		var constructor = function()
		{
			baseConstructor.apply(this, arguments);
			mixinConstructor.call(this);
		};
		return constructor;
	};

	// Global Functions

	/**
	 * Returns a reference to the namespace corresponding to the given path. If the
	 * namespace doesn't exist, it is created.
	 * 
	 * The optional closure function is intended to be used as a sandbox for
	 * defining members of the namespace. If provided, the closure function will be
	 * invoked in the scope of the namespace. The function will also be passed a
	 * reference to the namespace as a parameter. This parameter is not often
	 * needed, however, since it's equivalent to "this" within the closure. But for
	 * cases where an inner scope needs access to the namespace, it may come in
	 * handy.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Define a private variable only accessible within this closure.
	 *     var myPrivateVariable = "private variable";
	 * 
	 *     // Define a public method at my.stuff.myPublicMethod.
	 *     this.myPublicMethod = function()
	 *     {
	 *         ...
	 *     };
	 * 
	 *     // Define a class at my.stuff.MyClass.
	 *     this.MyClass = ...
	 * 
	 * });
	 * </pre>
	 * 
	 * @param path String. The dot delimited path to a namespace. An empty string
	 * corresponds to window. Must be non-null.
	 * @param closure Function. Optional. A function that will be invoked in the
	 * scope of the namespace.
	 * @return A reference to the namespace.
	 */
	var jg_namespace = root.jg_namespace = function(path, closure)
	{
		if (path == null)
			throw new Error("Parameter path must be non-null.");
		if (typeof path !== "string")
			throw new Error("Parameter path must be a string.");
		if ((closure != null) && (typeof closure !== "function"))
			throw new Error("Parameter closure must be a function.");

		var ns = _namespaces[path];
		if (!ns)
		{
			var subPaths = path ? path.split(".") : [];
			var subPath;
			var scope;

			ns = rootNamespace;
			for (var i = 0, l = subPaths.length; i < l; i++)
			{
				subPath = subPaths[i];
				scope = ns[subPath];
				if (!scope)
					scope = ns[subPath] = {};
				ns = scope;
			}

			_namespaces[path] = ns;
		}

		if (closure)
			closure.call(ns, ns);

		return ns;
	};

	/**
	 * Returns a reference to the class corresponding to the given path. If the
	 * class is not found, it is dynamically loaded using a synchronous xhr request.
	 * 
	 * By default, dynamically loaded classes must be defined in a js file located
	 * in a directory structure mirroring the class path. For example, the class
	 * definition for my.stuff.MyClass must be located in the file
	 * /my/stuff/MyClass.js. However, the jg_import.setClassPath method can be used
	 * to set different base directories for different namespaces. For example, you
	 * could locate the my.stuff library in a "libraries" subdirectory by calling
	 * jg_import.setClassPath("my.stuff", "libraries/my/stuff");
	 * 
	 * Note: Some browsers do not allow local xhr requests. In order for dynamic
	 * class loading to function in these browsers, the files must be hosted from a
	 * web server.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Set a class path for the my.stuff library.
	 * jg_import.setClassPath("my.stuff", "libraries/my/stuff");
	 * 
	 * // Import my.stuff.MyClass as MyClass.
	 * var MyClass = jg_import("my.stuff.MyClass");
	 * 
	 * // Create a new instance of MyClass.
	 * var myInstance = new MyClass();
	 * </pre>
	 * 
	 * @param path String. The dot delimited path to a class. Must be non-null and
	 * non-empty.
	 * @return A reference to the class.
	 */
	var jg_import = root.jg_import = function(path)
	{
		if (path == null)
			throw new Error("Parameter path must be non-null.");
		if (typeof path !== "string")
			throw new Error("Parameter path must be a string.");
		if (!path)
			throw new Error("Parameter path must be non-empty.");

		var c = _imported[path];
		if (!c)
		{
			if (_loading[path])
				throw new Error("Recursive dependency on class " + path + ".");

			var classInfo = {};

			var nsIndex = path.lastIndexOf(".");
			var nsPath = (nsIndex < 0) ? "" : path.substring(0, nsIndex);
			var cPath = (nsIndex < 0) ? path : path.substring(nsIndex + 1);
			var ns = jg_namespace(nsPath);

			c = ns[cPath];
			if (!c)
			{
				try
				{
					_loading[path] = true;

					var filePath = jg_import.getClassPath(path) + ".js";
					var script = null;

					try
					{
						var xhr = window.ActiveXObject ? new window.ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
						xhr.open("GET", filePath, false);
						xhr.send(null);
						if ((xhr.status == 200) || (xhr.status == 0))
							script = xhr.responseText;
					}
					catch (e)
					{
					}

					if (script == null)
						throw new Error("Failed to load class " + path + ".");

					_evalScript(script);

					c = ns[cPath];
					if (!c)
						throw new Error("Failed to initialize class " + path + ".");

					classInfo.src = filePath;
					classInfo.script = script;
				}
				finally
				{
					delete _loading[path];
				}
			}

			classInfo.path = path;
			classInfo.reference = c;

			_classInfo[path] = classInfo;
			_classDependencyList.push(path);

			_imported[path] = c;
		}

		return c;
	};

	/**
	 * Sets a base directory from which to load classes for a given namespace.
	 * 
	 * By default, dynamically loaded classes must be defined in a js file located
	 * in a directory structure mirroring the class path. For example, the class
	 * definition for my.stuff.MyClass must be located in the file
	 * /my/stuff/MyClass.js. However, the jg_import.setClassPath method can be used
	 * to set different base directories for different namespaces. For example, you
	 * could locate the my.stuff library in a "libraries" subdirectory by calling
	 * jg_import.setClassPath("my.stuff", "libraries/my/stuff");
	 * 
	 * Note: Some browsers do not allow local xhr requests. In order for dynamic
	 * class loading to function in these browsers, the files must be hosted from a
	 * web server.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Set a class path for the my.stuff library.
	 * jg_import.setClassPath("my.stuff", "libraries/my/stuff");
	 * 
	 * // Import my.stuff.MyClass as MyClass.
	 * var MyClass = jg_import("my.stuff.MyClass");
	 * 
	 * // Create a new instance of MyClass.
	 * var myInstance = new MyClass();
	 * </pre>
	 * 
	 * @param path String. The dot delimited path to a namespace. An empty string
	 * will set a default directory for all namespaces that don't have an explicit
	 * directory assigned. Must be non-null.
	 * @param dir String. The uri path to a directory. An empty string corresponds
	 * to the current directory. Must be non-null.
	 */
	jg_import.setClassPath = function(path, dir)
	{
		if (path == null)
			throw new Error("Parameter path must be non-null.");
		if (typeof path !== "string")
			throw new Error("Parameter path must be a string.");
		if (dir == null)
			throw new Error("Parameter dir must be non-null.");
		if (typeof dir !== "string")
			throw new Error("Parameter dir must be a string.");

		_classPaths[path] = dir;
	};

	/**
	 * Gets the base directory from which classes are loaded for a given namespace.
	 * This reflects the class paths that have been set via jg_import.setClassPath.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Set a class path for the my.stuff library.
	 * jg_import.setClassPath("my.stuff", "libraries/my/stuff");
	 * 
	 * // Get the class path for the my.stuff.morestuff library.
	 * // This will be "libraries/my/stuff/morestuff".
	 * var dir = jg_import.getClassPath("my.stuff.morestuff");
	 * </pre>
	 * 
	 * @param path String. The dot delimited path to a namespace. An empty string
	 * will get the default directory for all namespaces that don't have an explicit
	 * directory assigned. Must be non-null.
	 * @return A String corresponding to the base directory path.
	 */
	jg_import.getClassPath = function(path)
	{
		if (path == null)
			throw new Error("Parameter path must be non-null.");
		if (typeof path !== "string")
			throw new Error("Parameter path must be a string.");

		var classPathList = [];
		var classPath;

		for (classPath in _classPaths)
		{
			if (_classPaths.hasOwnProperty(classPath))
				classPathList.push(classPath);
		}
		classPathList.sort();

		for (var i = classPathList.length - 1; i >= 0; i--)
		{
			classPath = classPathList[i];
			if (path.substring(0, classPath.length) === classPath)
				return _classPaths[classPath] + path.substring(classPath.length).replace(/\./g, "/");
		}

		return path.replace(/\./g, "/");
	};

	/**
	 * Returns information for either an individual class or all classes imported
	 * with jg_import. If a path is given, returns information for the class
	 * corresponding to the given path. If the class is not found, returns null. If
	 * no path is given, returns a list of information for all imported classes. The
	 * list is ordered by class dependency, so that classes with dependencies on
	 * other classes appear after those classes in the list.
	 * 
	 * The information returned for each class includes, at a minimum, the dot
	 * delimited path to the class and a reference to the class. If the class was
	 * dynamically loaded, the information also includes the src path to the loaded
	 * file and the raw script.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Write a list of all imported classes to the console.
	 * var classInfoList = jg_import.getClassInfo();
	 * for (var i = 0, l = classInfoList.length; i < l; i++)
	 *     console.log(classInfoList[i].path);
	 * </pre>
	 * 
	 * @param path String. Optional. The dot delimited path to a class.
	 * @return An Object or an Array of Objects of the form
	 * { path, reference, src, script }.
	 */
	jg_import.getClassInfo = function(path)
	{
		if ((path != null) && (typeof path !== "string"))
			throw new Error("Parameter path must be a string.");

		if (!path)
		{
			var classInfoList = [];
			for (var i = 0, l = _classDependencyList.length; i < l; i++)
				classInfoList.push(jg_import.getClassInfo(_classDependencyList[i]));
			return classInfoList;
		}

		var classInfo = _classInfo[path];
		if (!classInfo)
			return null;

		var classInfo2 = {};
		classInfo2.path = classInfo.path;
		classInfo2.reference = classInfo.reference;
		if (classInfo.src != null)
			classInfo2.src = classInfo.src;
		if (classInfo.script != null)
			classInfo2.script = classInfo.script;

		return classInfo2;
	};

	/**
	 * Creates a new class that derives from the given baseClass, using standard
	 * prototype inheritance.
	 * 
	 * The optional closure function is intended to be used as a sandbox for
	 * defining members of the new class. If provided, the closure function will be
	 * invoked in the scope of the new class's prototype. The function will also be
	 * passed a reference to the new class, a reference to the baseClass's
	 * prototype, and a reference to the new class's prototype as parameters. The
	 * last parameter is not often needed, however, since it's equivalent to "this"
	 * within the closure. But for cases where an inner scope needs access to the
	 * new class's prototype, it may come in handy.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Import my.stuff.MyBaseClass as MyBaseClass.
	 *     var MyBaseClass = jg_import("my.stuff.MyBaseClass");
	 * 
	 *     // Define a class at my.stuff.MyClass that derives from MyBaseClass. The
	 *     // closure receives a reference to MyClass and a reference to
	 *     // MyBaseClass.prototype. By convention, we name these "MyClass" (same
	 *     // name as the class) and "base", respectively. The scope of the closure
	 *     // is MyClass.prototype.
	 *     this.MyClass = jg_extend(MyBaseClass, function(MyClass, base)
	 *     {
	 * 
	 *         // Define a private static variable only accessible within this
	 *         // closure.
	 *         var myPrivateStaticVariable = "private static variable";
	 * 
	 *         // Define a public static method.
	 *         MyClass.myPublicStaticMethod = function()
	 *         {
	 *             ...
	 *         };
	 * 
	 *         // Define a public instance property. Avoid assigning mutable objects
	 *         // to instance properties during definition. Initialize them in the
	 *         // constructor instead.
	 *         this.myPublicProperty = null;
	 * 
	 *         // Define a constructor for instances of MyClass, recursively calling
	 *         // the base constructor. If a constructor is not defined, the base
	 *         // constructor will be called automatically. Here, we also initialize
	 *         // myPublicProperty.
	 *         this.constructor = function(arg1, arg2)
	 *         {
	 *             base.constructor.call(this, arg1, arg2);
	 *             this.myPublicProperty = [ 1, 2, 3 ];
	 *             ...
	 *         };
	 * 
	 *         // Define a public instance method.
	 *         this.myPublicMethod = function()
	 *         {
	 *             ...
	 *         };
	 * 
	 *         // Override an instance method defined in MyBaseClass, recursively
	 *         // calling the base implementation.
	 *         this.myBaseMethod = function(arg1, arg2)
	 *         {
	 *             base.myBaseMethod.call(this, arg1, arg2);
	 *             ...
	 *         };
	 * 
	 *     });
	 * 
	 * });
	 * </pre>
	 * 
	 * @param baseClass Function. The base class from which to derive a new class.
	 * Must be non-null.
	 * @param closure Function. Optional. A function that will be invoked in the
	 * scope of the new class's prototype.
	 * @return A reference to the new class.
	 */
	var jg_extend = root.jg_extend = function(baseClass, closure)
	{
		if (baseClass == null)
			throw new Error("Parameter baseClass must be non-null.");
		if (typeof baseClass !== "function")
			throw new Error("Parameter baseClass must be a class.");
		if ((closure != null) && (typeof closure !== "function"))
			throw new Error("Parameter closure must be a function.");

		var constructor = baseClass;
		var base = baseClass.prototype;

		baseClass = function(){};
		baseClass.prototype = base;

		var c = function()
		{
			constructor.apply(this, arguments);
		};
		var proto = c.prototype = new baseClass();
		proto.constructor = c;

		if (closure)
		{
			closure.call(proto, c, base, proto);

			if (c.prototype !== proto)
				throw new Error("Class member \"prototype\" cannot be overridden.");

			if (proto.constructor !== c)
			{
				if (typeof proto.constructor !== "function")
					throw new Error("Instance member \"constructor\" must be a function.");

				constructor = proto.constructor;
				proto.constructor = c;
			}
		}

		return c;
	};

	/**
	 * Creates a new static or mixin class using the same conventions as jg_extend,
	 * but results in a simple Object instead of a Function with a prototype.
	 * 
	 * The optional closure function is intended to be used as a sandbox for
	 * defining members of the new class. If provided, the closure function will be
	 * invoked in the scope of the new class. The function will also be passed a
	 * reference to the new class as a parameter.
	 * 
	 * Example 1 - defining a static class:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Define a static class at my.stuff.MyStaticClass.
	 *     this.MyStaticClass = jg_static(function(MyStaticClass)
	 *     {
	 * 
	 *         // Define a public static method. By convention, we define static
	 *         // members using the class reference passed to the closure, since
	 *         // this mirrors the way static members are defined when using
	 *         // jg_extend.
	 *         MyStaticClass.myPublicStaticMethod = function()
	 *         {
	 *             ...
	 *         };
	 * 
	 *     });
	 * 
	 * });
	 * </pre>
	 * 
	 * Example 2 - defining a mixin class:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Define a mixin class at my.stuff.MyMixin.
	 *     this.MyMixin = jg_static(function(MyMixin)
	 *     {
	 * 
	 *         // Define a public mixin method. By convention, we define mixin
	 *         // members using "this", since this mirrors the way instance members
	 *         // are defined when using jg_extend.
	 *         this.myPublicMixinMethod = function()
	 *         {
	 *             ...
	 *         };
	 * 
	 *     });
	 * 
	 * });
	 * </pre>
	 * 
	 * @param closure Function. Optional. A function that will be invoked in the
	 * scope of the new class.
	 * @return A reference to the new class.
	 */
	var jg_static = root.jg_static = function(closure)
	{
		if ((closure != null) && (typeof closure !== "function"))
			throw new Error("Parameter closure must be a function.");

		var c = {};

		if (closure)
			closure.call(c, c);

		return c;
	};

	/**
	 * Copies members from a source object to a target object, returning a new
	 * prototype object that encapsulates the resulting state of the target. The
	 * source members "mixin" and "constructor" and members that begin with double
	 * underscore characters ("__") are not copied to the target object. Members
	 * that already exist in the target object are overwritten. Subsequent calls to
	 * this method with the same target and source objects will be ignored.
	 * 
	 * This method is intended for copying mixin class members to a target class's
	 * prototype. The returned prototype object extends the target's base prototype
	 * and contains all the members that are currently mixed into the target. It can
	 * be used in place of references to the base prototype to override both
	 * inherited instance members and newly mixed in members.
	 * 
	 * The source member "mixin" is intended to be a function for implementing more
	 * advanced mixin classes. It can be used to enforce a specific target type,
	 * intelligently override existing target members, or recursively apply other
	 * required mixin classes to the target. If present on the source object, the
	 * mixin function will be invoked in the scope of the target. The function will
	 * also be passed a base prototype object and a reference to the target as
	 * parameters. The last parameter is not often needed, however, since it's
	 * equivalent to "this" within the function. But for cases where an inner scope
	 * needs access to the target, it may come in handy. The mixin function is
	 * called before any other members are copied from the source to the target.
	 * 
	 * The source member "constructor" is intended to be a function for initializing
	 * the mixin on an instance of the target class. If provided on the source
	 * object, it should be implemented as a default constructor that takes no
	 * arguments. The constructor function should not be called directly. Instead,
	 * the returned prototype object contains its own constructor function that
	 * automatically invokes the constructors for the source object, the given base
	 * prototype object, and any other objects that may have been recursively mixed
	 * into the target. The prototype constructor should be called from the
	 * constructor of a target class or manually invoked on a target instance. Any
	 * arguments passed to the prototype constructor are forwarded to the base
	 * prototype constructor.
	 * 
	 * Example 1 - defining an advanced mixin class that implements the "mixin" and
	 * "constructor" members:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Import MyBaseClass and MyBaseMixin.
	 *     var MyBaseClass = jg_import("my.stuff.MyBaseClass");
	 *     var MyBaseMixin = jg_import("my.stuff.MyBaseMixin");
	 * 
	 *     // Define a mixin class at my.stuff.MyMixin.
	 *     this.MyMixin = jg_static(function(MyMixin)
	 *     {
	 * 
	 *         // Define the mixin function to enforce a target type of MyBaseClass,
	 *         // recursively apply MyBaseMixin to the target, and override a public
	 *         // method of the base class.
	 *         this.mixin = function(base)
	 *         {
	 *             if (!(this instanceof MyBaseClass))
	 *                 throw new Error("Mixin target must be an instance of my.stuff.MyBaseClass.");
	 * 
	 *             base = jg_mixin(this, MyBaseMixin, base);
	 * 
	 *             this.myPublicMethod = function()
	 *             {
	 *                 base.myPublicMethod.call(this);
	 *                 ...
	 *             };
	 *         };
	 * 
	 *         // Define the constructor function to initialize MyMixin on the
	 *         // target.
	 *         this.constructor = function()
	 *         {
	 *             ...
	 *         };
	 * 
	 *     });
	 * 
	 * });
	 * </pre>
	 * 
	 * Example 2 - applying the mixin defined above to a class:
	 * 
	 * <pre>
	 * // Declare the namespace we'll be working in.
	 * jg_namespace("my.stuff", function()
	 * {
	 * 
	 *     // Import MyBaseClass and MyMixin.
	 *     var MyBaseClass = jg_import("my.stuff.MyBaseClass");
	 *     var MyMixin = jg_import("my.stuff.MyMixin");
	 * 
	 *     // Define a class at my.stuff.MyClass that derives from MyBaseClass.
	 *     this.MyClass = jg_extend(MyBaseClass, function(MyClass, base)
	 *     {
	 * 
	 *         // Copy members from MyMixin to this (MyClass.prototype).
	 *         base = jg_mixin(this, MyMixin, base);
	 * 
	 *         // Define a constructor for instances of MyClass, recursively calling
	 *         // the base constructor.
	 *         this.constructor = function(arg1, arg2)
	 *         {
	 *             base.constructor.call(this, arg1, arg2);
	 *             ...
	 *         };
	 * 
	 *     });
	 * 
	 * });
	 * </pre>
	 * 
	 * Example 3 - applying the mixin defined above to an existing object instance:
	 * 
	 * <pre>
	 * // Copy members from MyMixin to myInstance.
	 * var mixin = jg_mixin(myInstance, MyMixin);
	 * 
	 * // Manually invoke the mixin constructor on myInstance.
	 * mixin.constructor.call(myInstance);
	 * </pre>
	 * 
	 * @param target Object. The target object to copy members to. Must be non-null.
	 * @param source Object. The source object to copy members from. Must be
	 * non-null.
	 * @param base Object. Optional. A base prototype object whose constructor
	 * function should be called before the constructors of the source object or any
	 * recursively mixed in objects.
	 * @return The resulting prototype object. If the source object was already
	 * mixed into the target object via a previous call to jg_mixin, the given base
	 * prototype object is returned.
	 */
	var jg_mixin = root.jg_mixin = function(target, source, base)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");
		if (source == null)
			throw new Error("Parameter source must be non-null.");

		var id = source.__jg_mixin_id;
		if (!id)
			id = source.__jg_mixin_id = "#" + (++_mixinCount);

		id = "__jg_mixin_has_" + id;

		if (target[id])
			return base;

		var baseConstructor = ((base != null) && base.hasOwnProperty("constructor") && (typeof base.constructor === "function")) ? base.constructor : function(){};
		var baseClass = function(){};
		baseClass.prototype = target.__proto__ || Object.prototype;

		base = new baseClass();
		base.constructor = baseConstructor;

		var member;

		var mixin = source.mixin;
		if ((mixin != null) && (typeof mixin === "function"))
		{
			var mixinBase = new baseClass();
			for (member in target)
			{
				if (target.hasOwnProperty(member))
					mixinBase[member] = target[member];
			}
			mixinBase.constructor = baseConstructor;

			try
			{
				if (!_mixinDependencies)
					_mixinDependencies = [];

				_mixinDependencies.push(base);

				var constructor = target.constructor;

				mixin.call(target, mixinBase, target);

				if (target.constructor !== constructor)
					throw new Error("Target member \"constructor\" cannot be overridden.");
			}
			finally
			{
				_mixinDependencies.pop();
				if (_mixinDependencies.length == 0)
					_mixinDependencies = null;
			}
		}

		for (member in source)
		{
			if (source.hasOwnProperty(member) && (member !== "mixin") && (member !== "constructor") && (member.substring(0, 2) !== "__"))
				target[member] = source[member];
		}

		for (member in target)
		{
			if (target.hasOwnProperty(member) && (member !== "constructor"))
				base[member] = target[member];
		}

		var sourceConstructor = (source.hasOwnProperty("constructor") && (typeof source.constructor === "function")) ? source.constructor : null;
		if (sourceConstructor)
		{
			base.constructor = _appendConstructor(base.constructor, sourceConstructor);

			if (_mixinDependencies)
			{
				var dependentMixin;
				for (var i = _mixinDependencies.length - 1; i >= 0; i--)
				{
					dependentMixin = _mixinDependencies[i];
					dependentMixin.constructor = _appendConstructor(dependentMixin.constructor, sourceConstructor);
				}
			}
		}

		target[id] = true;

		return base;
	};

	/**
	 * Tests whether a source object has been mixed into a target object using
	 * jg_mixin.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Call a mixin method on myInstance only if it has the mixin MyMixin.
	 * if (jg_has_mixin(myInstance, MyMixin))
	 *     myInstance.myMixinMethod();
	 * </pre>
	 * 
	 * @param target Object. The target object to test on. Must be non-null.
	 * @param source Object. The source object to test for. Must be non-null.
	 * @return true if the source object is mixed into the target object; false
	 * otherwise.
	 */
	var jg_has_mixin = root.jg_has_mixin = function(target, source)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");
		if (source == null)
			throw new Error("Parameter source must be non-null.");

		var id = source.__jg_mixin_id;
		if (!id)
			return false;

		id = "__jg_mixin_has_" + id;

		return (target[id] == true);
	};

	/**
	 * Creates a function that delegates to another function, preserving the given
	 * scope. The given method can be either a function object or the name of a
	 * function in the given scope. In the case of the later, the function name is
	 * resolved to a function object dynamically for each invocation of the
	 * delegate. This allows the underlying function to change without requiring a
	 * new delegate. If an underlying function is not found, the delegate function
	 * executes silently and returns undefined.
	 * 
	 * Example:
	 * 
	 * <pre>
	 * // Create a delegate function for this.myMethod.
	 * var myDelegate = jg_delegate(this, "myMethod");
	 * 
	 * // The delegate can be passed around without losing scope. In this case, we
	 * // pass it to setTimeout.
	 * setTimeout(myDelegate, 1000);
	 * </pre>
	 * 
	 * @param scope Object. The scope in which to invoke the method. Must be
	 * non-null if method is a function name.
	 * @param method Function or String. The function object or function name to
	 * invoke. Must be non-null.
	 * @return A function.
	 */
	var jg_delegate = root.jg_delegate = function(scope, method)
	{
		if (method == null)
			throw new Error("Parameter method must be non-null.");

		var isMethodName = (typeof method === "string");
		if (isMethodName)
		{
			if (scope == null)
				throw new Error("Parameter scope must be non-null.");
		}
		else
		{
			if (typeof method !== "function")
				throw new Error("Parameter method must be a string or a function.");
		}

		var f = function()
		{
			if (!isMethodName)
				return method.apply(scope, arguments);

			var m = scope[method];
			if (typeof m === "function")
				return m.apply(scope, arguments);

			return undefined;
		};

		return f;
	};

})();

});

require.define("/ui/timeline/splunk_time.js", function (require, module, exports, __dirname, __filename) {
/**
 * Includes code from the jgatt library
 * Copyright (c) 2011 Jason Gatt
 * Dual licensed under the MIT and GPL licenses
 */
 
(function() {
	
	var jg_global 		= require('./jg_global');
	
	var jg_namespace 	= jg_global.jg_namespace; 
 	var jg_import	 	= jg_global.jg_import;   	
 	var jg_extend	 	= jg_global.jg_extend;  
 	var jg_static    	= jg_global.jg_static; 	
 	var jg_mixin     	= jg_global.jg_mixin;
 	var jg_has_mixin 	= jg_global.jg_has_mixin; 	
 	var jg_delegate	 	= jg_global.jg_jg_delegate; 
 	
 	module.exports = jg_global;
 	
 	/***** ONLY CHANGE THINGS UNDER THIS LINE *****/

	jg_namespace("splunk.time", function()
	{

		this.ITimeZone = jg_extend(Object, function(ITimeZone, base)
		{

			// Public Methods

			this.getStandardOffset = function()
			{
			};

			this.getOffset = function(time)
			{
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.SimpleTimeZone = jg_extend(ITimeZone, function(SimpleTimeZone, base)
		{

			// Private Properties

			this._offset = 0;

			// Constructor

			this.constructor = function(offset)
			{
				this._offset = (offset !== undefined) ? offset : 0;
			};

			// Public Methods

			this.getStandardOffset = function()
			{
				return this._offset;
			};

			this.getOffset = function(time)
			{
				return this._offset;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.LocalTimeZone = jg_extend(ITimeZone, function(LocalTimeZone, base)
		{

			// Public Methods

			this.getStandardOffset = function()
			{
				var date = new Date(0);
				return -date.getTimezoneOffset() * 60;
			};

			this.getOffset = function(time)
			{
				var date = new Date(time * 1000);
				return -date.getTimezoneOffset() * 60;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var LocalTimeZone = jg_import("splunk.time.LocalTimeZone");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");

		this.TimeZones = jg_static(function(TimeZones)
		{

			// Public Static Constants

			TimeZones.LOCAL = new LocalTimeZone();
			TimeZones.UTC = new SimpleTimeZone(0);

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.DateTime = jg_extend(Object, function(DateTime, base)
		{

			// Private Static Constants

			var _ISO_DATE_TIME_PATTERN = /([\+\-])?(\d{4,})(?:(?:\-(\d{2}))(?:(?:\-(\d{2}))(?:(?:[T ](\d{2}))(?:(?:\:(\d{2}))(?:(?:\:(\d{2}(?:\.\d+)?)))?)?(?:(Z)|([\+\-])(\d{2})(?:\:(\d{2}))?)?)?)?)?/;

			// Private Static Methods

			var _normalizePrecision = function(value)
			{
				return Number(value.toFixed(6));
			};

			var _pad = function(value, digits, fractionDigits)
			{
				if (value != value)
					return "NaN";
				if (value == Infinity)
					return "Infinity";
				if (value == -Infinity)
					return "-Infinity";

				digits = (digits !== undefined) ? digits : 0;
				fractionDigits = (fractionDigits !== undefined) ? fractionDigits : 0;

				var str = value.toFixed(20);

				var decimalIndex = str.indexOf(".");
				if (decimalIndex < 0)
					decimalIndex = str.length;
				else if (fractionDigits < 1)
					str = str.substring(0, decimalIndex);
				else
					str = str.substring(0, decimalIndex) + "." + str.substring(decimalIndex + 1, decimalIndex + fractionDigits + 1);

				for (var i = decimalIndex; i < digits; i++)
					str = "0" + str;

				return str;
			};

			// Private Properties

			this._year = 0;
			this._month = 1;
			this._day = 1;
			this._weekday = 0;
			this._hours = 0;
			this._minutes = 0;
			this._seconds = 0;
			this._timeZone = TimeZones.LOCAL;
			this._timeZoneOffset = 0;
			this._time = 0;

			this._isValid = true;

			// Constructor

			this.constructor = function(yearOrTimevalue, month, day, hours, minutes, seconds, timeZone)
			{
				switch (arguments.length)
				{
					case 0:
						var now = new Date();
						this._time = now.getTime() / 1000;
						this._updateProperties();
						break;
					case 1:
						if (typeof yearOrTimevalue === "number")
						{
							this._time = yearOrTimevalue;
							this._updateProperties();
						}
						else if (typeof yearOrTimevalue === "string")
						{
							var matches = _ISO_DATE_TIME_PATTERN.exec(yearOrTimevalue);
							var numMatches = matches ? matches.length : 0;
							var match;

							match = (numMatches > 1) ? matches[1] : null;
							var yearSign = (match == "-") ? -1 : 1;

							match = (numMatches > 2) ? matches[2] : null;
							this._year = match ? yearSign * Number(match) : 0;

							match = (numMatches > 3) ? matches[3] : null;
							this._month = match ? Number(match) : 1;

							match = (numMatches > 4) ? matches[4] : null;
							this._day = match ? Number(match) : 1;

							match = (numMatches > 5) ? matches[5] : null;
							this._hours = match ? Number(match) : 0;

							match = (numMatches > 6) ? matches[6] : null;
							this._minutes = match ? Number(match) : 0;

							match = (numMatches > 7) ? matches[7] : null;
							this._seconds = match ? Number(match) : 0;

							match = (numMatches > 8) ? matches[8] : null;
							var timeZoneUTC = (match == "Z");

							match = (numMatches > 9) ? matches[9] : null;
							var timeZoneSign = (match == "-") ? -1 : 1;

							match = (numMatches > 10) ? matches[10] : null;
							var timeZoneHours = match ? Number(match) : NaN;

							match = (numMatches > 11) ? matches[11] : null;
							var timeZoneMinutes = match ? Number(match) : NaN;

							if (timeZoneUTC)
								this._timeZone = TimeZones.UTC;
							else if (!isNaN(timeZoneHours) && !isNaN(timeZoneMinutes))
								this._timeZone = new SimpleTimeZone(timeZoneSign * (timeZoneHours * 60 + timeZoneMinutes) * 60);
							else
								this._timeZone = TimeZones.LOCAL;

							this._updateTime();
						}
						else
						{
							this._time = NaN;
							this._updateProperties();
						}
						break;
					default:
						if (typeof yearOrTimevalue === "number")
						{
							this._year = yearOrTimevalue;
							this._month = (month !== undefined) ? month : 1;
							this._day = (day !== undefined) ? day : 1;
							this._hours = (hours !== undefined) ? hours : 0;
							this._minutes = (minutes !== undefined) ? minutes : 0;
							this._seconds = (seconds !== undefined) ? seconds : 0;
							this._timeZone = (timeZone instanceof ITimeZone) ? timeZone : TimeZones.LOCAL;
							this._updateTime();
						}
						else
						{
							this._time = NaN;
							this._updateProperties();
						}
						break;
				}
			};

			// Public Getters/Setters

			this.getYear = function()
			{
				return this._year;
			};
			this.setYear = function(value)
			{
				this._year = value;
				this._updateTime();
			};

			this.getMonth = function()
			{
				return this._month;
			};
			this.setMonth = function(value)
			{
				this._month = value;
				this._updateTime();
			};

			this.getDay = function()
			{
				return this._day;
			};
			this.setDay = function(value)
			{
				this._day = value;
				this._updateTime();
			};

			this.getWeekday = function()
			{
				return this._weekday;
			};

			this.getHours = function()
			{
				return this._hours;
			};
			this.setHours = function(value)
			{
				this._hours = value;
				this._updateTime();
			};

			this.getMinutes = function()
			{
				return this._minutes;
			};
			this.setMinutes = function(value)
			{
				this._minutes = value;
				this._updateTime();
			};

			this.getSeconds = function()
			{
				return this._seconds;
			};
			this.setSeconds = function(value)
			{
				this._seconds = value;
				this._updateTime();
			};

			this.getTimeZone = function()
			{
				return this._timeZone;
			};
			this.setTimeZone = function(value)
			{
				this._timeZone = (value instanceof ITimeZone) ? value : TimeZones.LOCAL;
				this._updateTime();
			};

			this.getTimeZoneOffset = function()
			{
				return this._timeZoneOffset;
			};

			this.getTime = function()
			{
				return this._time;
			};
			this.setTime = function(value)
			{
				this._time = value;
				this._updateProperties();
			};

			// Public Methods

			this.toUTC = function()
			{
				return this.toTimeZone(TimeZones.UTC);
			};

			this.toLocal = function()
			{
				return this.toTimeZone(TimeZones.LOCAL);
			};

			this.toTimeZone = function(timeZone)
			{
				var date = new DateTime();
				date.setTimeZone(timeZone);
				date.setTime(this._time);
				return date;
			};

			this.clone = function()
			{
				var date = new DateTime();
				date.setTimeZone(this._timeZone);
				date.setTime(this._time);
				return date;
			};

			this.equals = function(toCompare)
			{
				return ((this._time === toCompare._time) && (this._timeZoneOffset === toCompare._timeZoneOffset));
			};

			this.toString = function()
			{
				if (!this._isValid)
					return "Invalid Date";

				var str = "";
				if (this._year < 0)
					str += "-" + _pad(-this._year, 4);
				else
					str += _pad(this._year, 4);
				str += "-" + _pad(this._month, 2) + "-" + _pad(this._day, 2);
				str += "T" + _pad(this._hours, 2) + ":" + _pad(this._minutes, 2) + ":" + _pad(this._seconds, 2, 3);

				var timeZoneOffset = this._timeZoneOffset / 60;
				if (timeZoneOffset == 0)
				{
					str += "Z";
				}
				else
				{
					if (timeZoneOffset < 0)
						str += "-";
					else
						str += "+";
					if (timeZoneOffset < 0)
						timeZoneOffset = -timeZoneOffset;
					var timeZoneHours = Math.floor(timeZoneOffset / 60);
					var timeZoneMinutes = Math.floor(timeZoneOffset % 60);
					str += _pad(timeZoneHours, 2) + ":" + _pad(timeZoneMinutes, 2);
				}

				return str;
			};

			this.valueOf = function()
			{
				return this._time;
			};

			// Private Methods

			this._updateTime = function()
			{
				if (this._validate())
				{
					var years = this._year;
					var months = this._month - 1;
					var days = this._day - 1;
					var hours = this._hours;
					var minutes = this._minutes;
					var seconds = this._seconds;

					var secondsPerMinute = 60;
					var secondsPerHour = secondsPerMinute * 60;
					var secondsPerDay = secondsPerHour * 24;

					var totalMonths = months + years * 12;
					var wholeMonths = Math.floor(totalMonths);
					var subMonths = totalMonths - wholeMonths;

					var totalSeconds = seconds + (minutes * secondsPerMinute) + (hours * secondsPerHour) + (days * secondsPerDay);
					var wholeSeconds = Math.floor(totalSeconds);
					var subSeconds = totalSeconds - wholeSeconds;

					var date = new Date(0);
					date.setUTCFullYear(0);
					date.setUTCMonth(wholeMonths);

					if (subMonths != 0)
					{
						date.setUTCMonth(date.getUTCMonth() + 1);
						date.setUTCDate(0);

						var monthsTotalSeconds = date.getUTCDate() * subMonths * secondsPerDay;
						var monthsWholeSeconds = Math.floor(monthsTotalSeconds);
						var monthsSubSeconds = monthsTotalSeconds - monthsWholeSeconds;

						wholeSeconds += monthsWholeSeconds;
						subSeconds += monthsSubSeconds;
						if (subSeconds >= 1)
						{
							subSeconds--;
							wholeSeconds++;
						}

						date.setUTCDate(1);
					}

					date.setUTCSeconds(wholeSeconds);

					var time = (date.getTime() / 1000) + subSeconds;
					var timeZone = this._timeZone;

					this._time = time - timeZone.getOffset(time - timeZone.getStandardOffset());

					this._updateProperties();
				}
			};

			this._updateProperties = function()
			{
				if (this._validate())
				{
					var time = _normalizePrecision(this._time);
					var timeZoneOffset = _normalizePrecision(this._timeZone.getOffset(time));

					var totalSeconds = time + timeZoneOffset;
					var wholeSeconds = Math.floor(totalSeconds);
					var subSeconds = _normalizePrecision(totalSeconds - wholeSeconds);
					if (subSeconds >= 1)
					{
						subSeconds = 0;
						wholeSeconds++;
					}

					var date = new Date(wholeSeconds * 1000);

					this._year = date.getUTCFullYear();
					this._month = date.getUTCMonth() + 1;
					this._day = date.getUTCDate();
					this._weekday = date.getUTCDay();
					this._hours = date.getUTCHours();
					this._minutes = date.getUTCMinutes();
					this._seconds = date.getUTCSeconds() + subSeconds;

					this._time = time;
					this._timeZoneOffset = timeZoneOffset;

					this._validate();
				}
			};

			this._validate = function()
			{
				if (this._isValid)
				{
					this._year *= 1;
					this._month *= 1;
					this._day *= 1;
					this._weekday *= 1;
					this._hours *= 1;
					this._minutes *= 1;
					this._seconds *= 1;
					this._timeZoneOffset *= 1;
					this._time *= 1;
					var checksum = this._year + this._month + this._day + this._weekday + this._hours + this._minutes + this._seconds + this._timeZoneOffset + this._time;
					if (isNaN(checksum) || (checksum == Infinity) || (checksum == -Infinity) || !this._timeZone)
						this._isValid = false;
				}
				else
				{
					this._year *= 1;
					this._time *= 1;
					if ((this._year > -Infinity) && (this._year < Infinity))
					{
						this._month = 1;
						this._day = 1;
						this._hours = 0;
						this._minutes = 0;
						this._seconds = 0;
						this._isValid = true;
					}
					else if ((this._time > -Infinity) && (this._time < Infinity))
					{
						this._isValid = true;
					}
				}

				if (!this._isValid)
				{
					this._year = NaN;
					this._month = NaN;
					this._day = NaN;
					this._weekday = NaN;
					this._hours = NaN;
					this._minutes = NaN;
					this._seconds = NaN;
					this._timeZoneOffset = NaN;
					this._time = NaN;
				}

				return this._isValid;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		this.Duration = jg_extend(Object, function(Duration, base)
		{

			// Private Static Constants

			var _ISO_DURATION_PATTERN = /P(?:(\-?\d+(?:\.\d+)?)Y)?(?:(\-?\d+(?:\.\d+)?)M)?(?:(\-?\d+(?:\.\d+)?)D)?(?:T(?:(\-?\d+(?:\.\d+)?)H)?(?:(\-?\d+(?:\.\d+)?)M)?(?:(\-?\d+(?:\.\d+)?)S)?)?/;

			// Public Properties

			this.years = 0;
			this.months = 0;
			this.days = 0;
			this.hours = 0;
			this.minutes = 0;
			this.seconds = 0;

			// Constructor

			this.constructor = function(yearsOrTimestring, months, days, hours, minutes, seconds)
			{
				if ((arguments.length == 1) && (typeof yearsOrTimestring === "string"))
				{
					var matches = _ISO_DURATION_PATTERN.exec(yearsOrTimestring);
					var numMatches = matches ? matches.length : 0;
					var match;

					match = (numMatches > 1) ? matches[1] : null;
					this.years = match ? Number(match) : 0;

					match = (numMatches > 2) ? matches[2] : null;
					this.months = match ? Number(match) : 0;

					match = (numMatches > 3) ? matches[3] : null;
					this.days = match ? Number(match) : 0;

					match = (numMatches > 4) ? matches[4] : null;
					this.hours = match ? Number(match) : 0;

					match = (numMatches > 5) ? matches[5] : null;
					this.minutes = match ? Number(match) : 0;

					match = (numMatches > 6) ? matches[6] : null;
					this.seconds = match ? Number(match) : 0;
				}
				else
				{
					this.years = (typeof yearsOrTimestring === "number") ? yearsOrTimestring : 0;
					this.months = (months !== undefined) ? months : 0;
					this.days = (days !== undefined) ? days : 0;
					this.hours = (hours !== undefined) ? hours : 0;
					this.minutes = (minutes !== undefined) ? minutes : 0;
					this.seconds = (seconds !== undefined) ? seconds : 0;
				}
			};

			// Public Methods

			this.clone = function()
			{
				return new Duration(this.years, this.months, this.days, this.hours, this.minutes, this.seconds);
			};

			this.equals = function(toCompare)
			{
				return ((this.years == toCompare.years) &&
				        (this.months == toCompare.months) &&
				        (this.days == toCompare.days) &&
				        (this.hours == toCompare.hours) &&
				        (this.minutes == toCompare.minutes) &&
				        (this.seconds == toCompare.seconds));
			};

			this.toString = function()
			{
				var str = "";
				str += "P" + this.years + "Y" + this.months + "M" + this.days + "D";
				str += "T" + this.hours + "H" + this.minutes + "M" + this.seconds + "S";
				return str;
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		this.IComparator = jg_extend(Object, function(IComparator, base)
		{

			// Public Methods

			this.compare = function(value1, value2)
			{
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		var IComparator = jg_import("jgatt.utils.IComparator");

		this.NaturalComparator = jg_extend(IComparator, function(NaturalComparator, base)
		{

			// Public Methods

			this.compare = function(value1, value2)
			{
				if (value1 < value2)
					return -1;
				if (value1 > value2)
					return 1;
				return 0;
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		var IComparator = jg_import("jgatt.utils.IComparator");
		var NaturalComparator = jg_import("jgatt.utils.NaturalComparator");

		this.ArrayUtils = jg_static(function(ArrayUtils)
		{

			// Private Static Constants

			var _NATURAL_COMPARATOR = new NaturalComparator();

			// Public Static Methods

			ArrayUtils.indexOf = function(a, value)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");

				for (var i = 0, l = a.length; i < l; i++)
				{
					if (a[i] === value)
						return i;
				}

				return -1;
			};

			ArrayUtils.lastIndexOf = function(a, value)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");

				for (var i = a.length - 1; i >= 0; i--)
				{
					if (a[i] === value)
						return i;
				}

				return -1;
			};

			ArrayUtils.sort = function(a, comparator)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");
				if ((comparator != null) && !(comparator instanceof IComparator))
					throw new Error("Parameter comparator must be an instance of jgatt.utils.IComparator.");

				if (!comparator)
					comparator = _NATURAL_COMPARATOR;

				// use delegate so comparator has scope
				var compare = function(value1, value2)
				{
					return comparator.compare(value1, value2);
				};

				a.sort(compare);
			};

			ArrayUtils.binarySearch = function(a, value, comparator)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");
				if ((comparator != null) && !(comparator instanceof IComparator))
					throw new Error("Parameter comparator must be an instance of jgatt.utils.IComparator.");

				var high = a.length - 1;
				if (high < 0)
					return -1;

				if (!comparator)
					comparator = _NATURAL_COMPARATOR;

				var low = 0;
				var mid;
				var comp;

				while (low <= high)
				{
					mid = low + Math.floor((high - low) / 2);
					comp = comparator.compare(value, a[mid]);
					if (comp < 0)
						high = mid - 1;
					else if (comp > 0)
						low = mid + 1;
					else
						return mid;
				}

				return -low - 1;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ArrayUtils = jg_import("jgatt.utils.ArrayUtils");
		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.SplunkTimeZone = jg_extend(ITimeZone, function(SplunkTimeZone, base)
		{

			// Private Properties

			this._standardOffset = 0;
			this._serializedTimeZone = null;

			this._isConstant = false;
			this._offsetList = null;
			this._timeList = null;
			this._indexList = null;

			// Constructor

			this.constructor = function(serializedTimeZone)
			{
				if (serializedTimeZone == null)
					throw new Error("Parameter serializedTimeZone must be non-null.");
				if (typeof serializedTimeZone !== "string")
					throw new Error("Parameter serializedTimeZone must be a string.");

				this._serializedTimeZone = serializedTimeZone;

				this._offsetList = [];
				this._timeList = [];
				this._indexList = [];

				this._parseSerializedTimeZone(serializedTimeZone);
			};

			// Public Methods

			this.getSerializedTimeZone = function()
			{
				return this._serializedTimeZone;
			};

			this.getStandardOffset = function()
			{
				return this._standardOffset;
			};

			this.getOffset = function(time)
			{
				if (this._isConstant)
					return this._standardOffset;

				var offsetList = this._offsetList;
				var numOffsets = offsetList.length;
				if (numOffsets == 0)
					return 0;

				if (numOffsets == 1)
					return offsetList[0];

				var timeList = this._timeList;
				var numTimes = timeList.length;
				if (numTimes == 0)
					return 0;

				var timeIndex;
				if (numTimes == 1)
				{
					timeIndex = 0;
				}
				else
				{
					timeIndex = ArrayUtils.binarySearch(timeList, time);
					if (timeIndex < -1)
						timeIndex = -timeIndex - 2;
					else if (timeIndex == -1)
						timeIndex = 0;
				}

				var offsetIndex = this._indexList[timeIndex];
				return offsetList[offsetIndex];
			};

			// Private Methods

			this._parseSerializedTimeZone = function(serializedTimeZone)
			{
				// ### SERIALIZED TIMEZONE FORMAT 1.0
				// Y-25200 YW 50 44 54
				// Y-28800 NW 50 53 54
				// Y-25200 YW 50 57 54
				// Y-25200 YG 50 50 54
				// @-1633269600 0
				// @-1615129200 1
				// @-1601820000 0
				// @-1583679600 1

				// ### SERIALIZED TIMEZONE FORMAT 1.0
				// C0
				// Y0 NW 47 4D 54

				if (!serializedTimeZone)
					return;

				var entries = serializedTimeZone.split(";");
				var entry;
				for (var i = 0, l = entries.length; i < l; i++)
				{
					entry = entries[i];
					if (entry)
					{
						switch (entry.charAt(0))
						{
							case "C":
								if (this._parseC(entry.substring(1, entry.length)))
									return;
								break;
							case "Y":
								this._parseY(entry.substring(1, entry.length));
								break;
							case "@":
								this._parseAt(entry.substring(1, entry.length));
								break;
						}
					}
				}

				this._standardOffset = this.getOffset(0);
			};

			this._parseC = function(entry)
			{
				// 0

				if (!entry)
					return false;

				var time = Number(entry);
				if (isNaN(time))
					return false;

				this._standardOffset = time;
				this._isConstant = true;

				return true;
			};

			this._parseY = function(entry)
			{
				// -25200 YW 50 44 54

				if (!entry)
					return;

				var elements = entry.split(" ");
				if (elements.length < 1)
					return;

				var element = elements[0];
				if (!element)
					return;

				var offset = Number(element);
				if (isNaN(offset))
					return;

				this._offsetList.push(offset);
			};

			this._parseAt = function(entry)
			{
				// -1633269600 0

				if (!entry)
					return;

				var elements = entry.split(" ");
				if (elements.length < 2)
					return;

				var element = elements[0];
				if (!element)
					return;

				var time = Number(element);
				if (isNaN(time))
					return;

				element = elements[1];
				if (!element)
					return;

				var index = Number(element);
				if (isNaN(index))
					return;

				index = Math.floor(index);
				if ((index < 0) || (index >= this._offsetList.length))
					return;

				this._timeList.push(time);
				this._indexList.push(index);
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var DateTime = jg_import("splunk.time.DateTime");
		var Duration = jg_import("splunk.time.Duration");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.TimeUtils = jg_static(function(TimeUtils)
		{

			// Public Static Constants

			TimeUtils.EPOCH = new DateTime(0).toUTC();

			// Public Static Methods

			TimeUtils.daysInMonth = function(date)
			{
				date = new DateTime(date.getYear(), date.getMonth() + 1, 0, 0, 0, 0, TimeZones.UTC);
				return date.getDay();
			};

			TimeUtils.addDurations = function(duration1, duration2)
			{
				return new Duration(duration1.years + duration2.years, duration1.months + duration2.months, duration1.days + duration2.days, duration1.hours + duration2.hours, duration1.minutes + duration2.minutes, duration1.seconds + duration2.seconds);
			};

			TimeUtils.addDateDuration = function(date, duration)
			{
				if ((duration.years == 0) && (duration.months == 0) && (duration.days == 0))
					date = date.clone();
				else
					date = new DateTime(date.getYear() + duration.years, date.getMonth() + duration.months, date.getDay() + duration.days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getTimeZone());
				date.setTime(date.getTime() + (duration.hours * 3600 + duration.minutes * 60 + duration.seconds));
				return date;
			};

			TimeUtils.subtractDates = function(date1, date2)
			{
				date2 = date2.toTimeZone(date1.getTimeZone());

				var isNegative = (date1.getTime() < date2.getTime());
				if (isNegative)
				{
					var temp = date1;
					date1 = date2;
					date2 = temp;
				}

				var sameTimeZoneOffset = (date1.getTimeZoneOffset() == date2.getTimeZoneOffset());

				var years;
				var months;
				var days;
				var hours;
				var minutes;
				var seconds;

				var date3;
				if (sameTimeZoneOffset)
				{
					date3 = date1;
				}
				else if ((date1.getYear() == date2.getYear()) && (date1.getMonth() == date2.getMonth()) && (date1.getDay() == date2.getDay()))
				{
					date3 = date2;
				}
				else
				{
					date3 = new DateTime(date1.getYear(), date1.getMonth(), date1.getDay(), date2.getHours(), date2.getMinutes(), date2.getSeconds(), date2.getTimeZone());
					if (date3.getTime() > date1.getTime())
					{
						date3 = new DateTime(date1.getYear(), date1.getMonth(), date1.getDay() - 1, date2.getHours(), date2.getMinutes(), date2.getSeconds(), date2.getTimeZone());
						if ((date3.getTime() < date2.getTime()) || ((date3.getYear() == date2.getYear()) && (date3.getMonth() == date2.getMonth()) && (date3.getDay() == date2.getDay())))
							date3 = date2;
					}
				}

				years = date3.getYear() - date2.getYear();
				months = date3.getMonth() - date2.getMonth();
				days = date3.getDay() - date2.getDay();

				if (sameTimeZoneOffset)
				{
					hours = date3.getHours() - date2.getHours();
					minutes = date3.getMinutes() - date2.getMinutes();
					seconds = date3.getSeconds() - date2.getSeconds();

					if (seconds < 0)
					{
						seconds += 60;
						minutes--;
					}

					if (minutes < 0)
					{
						minutes += 60;
						hours--;
					}

					if (hours < 0)
					{
						hours += 24;
						days--;
					}

					seconds = _normalizePrecision(seconds);
				}
				else
				{
					seconds = date1.getTime() - date3.getTime();
					var wholeSeconds = Math.floor(seconds);
					var subSeconds = _normalizePrecision(seconds - wholeSeconds);
					if (subSeconds >= 1)
					{
						subSeconds = 0;
						wholeSeconds++;
					}

					minutes = Math.floor(wholeSeconds / 60);
					seconds = (wholeSeconds % 60) + subSeconds;

					hours = Math.floor(minutes / 60);
					minutes %= 60;
				}

				if (days < 0)
				{
					date3 = new DateTime(date2.getYear(), date2.getMonth() + 1, 0, 0, 0, 0, TimeZones.UTC);
					days += date3.getDay();
					months--;
				}

				if (months < 0)
				{
					months += 12;
					years--;
				}

				if (isNegative)
				{
					years = -years;
					months = -months;
					days = -days;
					hours = -hours;
					minutes = -minutes;
					seconds = -seconds;
				}

				return new Duration(years, months, days, hours, minutes, seconds);
			};

			TimeUtils.subtractDurations = function(duration1, duration2)
			{
				return new Duration(duration1.years - duration2.years, duration1.months - duration2.months, duration1.days - duration2.days, duration1.hours - duration2.hours, duration1.minutes - duration2.minutes, duration1.seconds - duration2.seconds);
			};

			TimeUtils.subtractDateDuration = function(date, duration)
			{
				if ((duration.years == 0) && (duration.months == 0) && (duration.days == 0))
					date = date.clone();
				else
					date = new DateTime(date.getYear() - duration.years, date.getMonth() - duration.months, date.getDay() - duration.days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getTimeZone());
				date.setTime(date.getTime() - (duration.hours * 3600 + duration.minutes * 60 + duration.seconds));
				return date;
			};

			TimeUtils.multiplyDuration = function(duration, scalar)
			{
				return new Duration(duration.years * scalar, duration.months * scalar, duration.days * scalar, duration.hours * scalar, duration.minutes * scalar, duration.seconds * scalar);
			};

			TimeUtils.divideDuration = function(duration, scalar)
			{
				return new Duration(duration.years / scalar, duration.months / scalar, duration.days / scalar, duration.hours / scalar, duration.minutes / scalar, duration.seconds / scalar);
			};

			TimeUtils.ceilDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_ceilDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.ceilDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_floorDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_ceilDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.floorDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_floorDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.floorDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_ceilDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_floorDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.roundDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_roundDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.roundDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_roundDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_roundDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.normalizeDuration = function(duration, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				return TimeUtils.subtractDates(date, referenceDate);
			};

			TimeUtils.durationToSeconds = function(duration, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				return _normalizePrecision(date.getTime() - referenceDate.getTime());
			};

			TimeUtils.secondsToDuration = function(seconds, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = new DateTime(referenceDate.getTime() + seconds).toTimeZone(referenceDate.getTimeZone());
				return TimeUtils.subtractDates(date, referenceDate);
			};

			// Private Static Methods

			var _ceilDateInternal = function(date, units)
			{
				var ceilYear = (units.years > 0);
				var ceilMonth = ceilYear || (units.months > 0);
				var ceilDay = ceilMonth || (units.days > 0);
				var ceilHours = ceilDay || (units.hours > 0);
				var ceilMinutes = ceilHours || (units.minutes > 0);
				var ceilSeconds = ceilMinutes || (units.seconds > 0);

				if (!ceilSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.min(Math.ceil(date.getSeconds() / units.seconds) * units.seconds, 60));
					else
						date.setSeconds(60);
				}

				if (!ceilMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.min(Math.ceil(date.getMinutes() / units.minutes) * units.minutes, 60));
					else
						date.setMinutes(60);
				}

				if (!ceilHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.min(Math.ceil(date.getHours() / units.hours) * units.hours, 24));
					else
						date.setHours(24);
				}

				if (!ceilDay)
					return;

				if (date.getDay() > 1)
				{
					var daysInMonth = TimeUtils.daysInMonth(date);
					if (units.days > 0)
						date.setDay(Math.min(Math.ceil((date.getDay() - 1) / units.days) * units.days, daysInMonth) + 1);
					else
						date.setDay(daysInMonth + 1);
				}

				if (!ceilMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.min(Math.ceil((date.getMonth() - 1) / units.months) * units.months, 12) + 1);
					else
						date.setMonth(12 + 1);
				}

				if (!ceilYear)
					return;

				if (units.years > 0)
					date.setYear(Math.ceil(date.getYear() / units.years) * units.years);
			};

			var _ceilDurationInternal = function(duration, units, referenceDate)
			{
				var ceilYears = (units.years > 0);
				var ceilMonths = ceilYears || (units.months > 0);
				var ceilDays = ceilMonths || (units.days > 0);
				var ceilHours = ceilDays || (units.hours > 0);
				var ceilMinutes = ceilHours || (units.minutes > 0);
				var ceilSeconds = ceilMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!ceilSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.min(Math.ceil(duration.seconds / units.seconds) * units.seconds, 60);
					else
						duration.seconds = 60;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.min(Math.ceil(duration.minutes / units.minutes) * units.minutes, 60);
					else
						duration.minutes = 60;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.min(Math.ceil(duration.hours / units.hours) * units.hours, 24);
					else
						duration.hours = 24;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.min(Math.ceil(duration.days / units.days) * units.days, daysInMonth);
					else
						duration.days = daysInMonth;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.min(Math.ceil(duration.months / units.months) * units.months, 12);
					else
						duration.months = 12;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.ceil(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _floorDateInternal = function(date, units)
			{
				var floorYear = (units.years > 0);
				var floorMonth = floorYear || (units.months > 0);
				var floorDay = floorMonth || (units.days > 0);
				var floorHours = floorDay || (units.hours > 0);
				var floorMinutes = floorHours || (units.minutes > 0);
				var floorSeconds = floorMinutes || (units.seconds > 0);

				if (!floorSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.floor(date.getSeconds() / units.seconds) * units.seconds);
					else
						date.setSeconds(0);
				}

				if (!floorMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.floor(date.getMinutes() / units.minutes) * units.minutes);
					else
						date.setMinutes(0);
				}

				if (!floorHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.floor(date.getHours() / units.hours) * units.hours);
					else
						date.setHours(0);
				}

				if (!floorDay)
					return;

				if (date.getDay() > 1)
				{
					if (units.days > 0)
						date.setDay(Math.floor((date.getDay() - 1) / units.days) * units.days + 1);
					else
						date.setDay(1);
				}

				if (!floorMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.floor((date.getMonth() - 1) / units.months) * units.months + 1);
					else
						date.setMonth(1);
				}

				if (!floorYear)
					return;

				if (units.years > 0)
					date.setYear(Math.floor(date.getYear() / units.years) * units.years);
			};

			var _floorDurationInternal = function(duration, units, referenceDate)
			{
				var floorYears = (units.years > 0);
				var floorMonths = floorYears || (units.months > 0);
				var floorDays = floorMonths || (units.days > 0);
				var floorHours = floorDays || (units.hours > 0);
				var floorMinutes = floorHours || (units.minutes > 0);
				var floorSeconds = floorMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!floorSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.floor(duration.seconds / units.seconds) * units.seconds;
					else
						duration.seconds = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.floor(duration.minutes / units.minutes) * units.minutes;
					else
						duration.minutes = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.floor(duration.hours / units.hours) * units.hours;
					else
						duration.hours = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.floor(duration.days / units.days) * units.days;
					else
						duration.days = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.floor(duration.months / units.months) * units.months;
					else
						duration.months = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.floor(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _roundDateInternal = function(date, units)
			{
				var roundYear = (units.years > 0);
				var roundMonth = roundYear || (units.months > 0);
				var roundDay = roundMonth || (units.days > 0);
				var roundHours = roundDay || (units.hours > 0);
				var roundMinutes = roundHours || (units.minutes > 0);
				var roundSeconds = roundMinutes || (units.seconds > 0);

				if (!roundSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.min(Math.round(date.getSeconds() / units.seconds) * units.seconds, 60));
					else if (date.getSeconds() >= 30)
						date.setSeconds(60);
					else
						date.setSeconds(0);
				}

				if (!roundMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.min(Math.round(date.getMinutes() / units.minutes) * units.minutes, 60));
					else if (date.getMinutes() >= 30)
						date.setMinutes(60);
					else
						date.setMinutes(0);
				}

				if (!roundHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.min(Math.round(date.getHours() / units.hours) * units.hours, 24));
					else if (date.getHours() >= 12)
						date.setHours(24);
					else
						date.setHours(0);
				}

				if (!roundDay)
					return;

				if (date.getDay() > 1)
				{
					var daysInMonth = TimeUtils.daysInMonth(date);
					if (units.days > 0)
						date.setDay(Math.min(Math.round((date.getDay() - 1) / units.days) * units.days, daysInMonth) + 1);
					else if (date.getDay() >= Math.floor(daysInMonth / 2 + 1))
						date.setDay(daysInMonth + 1);
					else
						date.setDay(1);
				}

				if (!roundMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.min(Math.round((date.getMonth() - 1) / units.months) * units.months, 12) + 1);
					else if (date.getMonth() >= (6 + 1))
						date.setMonth(12 + 1);
					else
						date.setMonth(1);
				}

				if (!roundYear)
					return;

				if (units.years > 0)
					date.setYear(Math.round(date.getYear() / units.years) * units.years);
			};

			var _roundDurationInternal = function(duration, units, referenceDate)
			{
				var roundYears = (units.years > 0);
				var roundMonths = roundYears || (units.months > 0);
				var roundDays = roundMonths || (units.days > 0);
				var roundHours = roundDays || (units.hours > 0);
				var roundMinutes = roundHours || (units.minutes > 0);
				var roundSeconds = roundMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!roundSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.min(Math.round(duration.seconds / units.seconds) * units.seconds, 60);
					else if (duration.seconds >= 30)
						duration.seconds = 60;
					else
						duration.seconds = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.min(Math.round(duration.minutes / units.minutes) * units.minutes, 60);
					else if (duration.minutes >= 30)
						duration.minutes = 60;
					else
						duration.minutes = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.min(Math.round(duration.hours / units.hours) * units.hours, 24);
					else if (duration.hours >= 12)
						duration.hours = 24;
					else
						duration.hours = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.min(Math.round(duration.days / units.days) * units.days, daysInMonth);
					else if (duration.days >= Math.floor(daysInMonth / 2))
						duration.days = daysInMonth;
					else
						duration.days = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.min(Math.round(duration.months / units.months) * units.months, 12);
					else if (duration.months >= 6)
						duration.months = 12;
					else
						duration.months = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.round(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _toTimeZoneStable = function(date, timeZone)
			{
				var date2 = date.toTimeZone(timeZone);
				if ((date2.getYear() == date.getYear()) && (date2.getMonth() == date.getMonth()) && (date2.getDay() == date.getDay()) &&
				    (date2.getHours() == date.getHours()) && (date2.getMinutes() == date.getMinutes()) && (date2.getSeconds() == date.getSeconds()))
					return date2;

				var date3 = date.clone();
				date3.setTimeZone(timeZone);
				if ((date3.getYear() == date.getYear()) && (date3.getMonth() == date.getMonth()) && (date3.getDay() == date.getDay()) &&
				    (date3.getHours() == date.getHours()) && (date3.getMinutes() == date.getMinutes()) && (date3.getSeconds() == date.getSeconds()))
					return date3;

				return date2;
			};

			var _normalizeDuration = function(duration, daysInMonth)
			{
				var years = duration.years;
				var wholeYears = Math.floor(years);
				var subYears = years - wholeYears;

				var months = duration.months + subYears * 12;
				var wholeMonths = Math.floor(months);
				var subMonths = months - wholeMonths;

				var days = duration.days + subMonths * daysInMonth;
				var wholeDays = Math.floor(days);
				var subDays = days - wholeDays;

				var hours = duration.hours + subDays * 24;
				var wholeHours = Math.floor(hours);
				var subHours = hours - wholeHours;

				var minutes = duration.minutes + subHours * 60;
				var wholeMinutes = Math.floor(minutes);
				var subMinutes = minutes - wholeMinutes;

				var seconds = duration.seconds + subMinutes * 60;
				var wholeSeconds = Math.floor(seconds);
				var subSeconds = _normalizePrecision(seconds - wholeSeconds);
				if (subSeconds >= 1)
				{
					subSeconds = 0;
					wholeSeconds++;
				}

				wholeMinutes += Math.floor(wholeSeconds / 60);
				wholeSeconds %= 60;

				wholeHours += Math.floor(wholeMinutes / 60);
				wholeMinutes %= 60;

				wholeDays += Math.floor(wholeHours / 24);
				wholeHours %= 24;

				wholeMonths += Math.floor(wholeDays / daysInMonth);
				wholeDays %= daysInMonth;

				wholeYears += Math.floor(wholeMonths / 12);
				wholeMonths %= 12;

				duration.years = wholeYears;
				duration.months = wholeMonths;
				duration.days = wholeDays;
				duration.hours = wholeHours;
				duration.minutes = wholeMinutes;
				duration.seconds = wholeSeconds + subSeconds;
			};

			var _normalizePrecision = function(value)
			{
				return Number(value.toFixed(6));
			};

		});

	});

})();
});

require.define("/ui/timeline/splunk_timeline.js", function (require, module, exports, __dirname, __filename) {
/**
 * Includes code from the jgatt library
 * Copyright (c) 2011 Jason Gatt
 * Dual licensed under the MIT and GPL licenses
 */
 
(function() {
		
	var jg_global 		= require('./jg_global');
	
	var jg_namespace 	= jg_global.jg_namespace; 
	var jg_import	 	= jg_global.jg_import;   	
	var jg_extend	 	= jg_global.jg_extend;  
	var jg_static    	= jg_global.jg_static; 	
	var jg_mixin     	= jg_global.jg_mixin;
	var jg_has_mixin 	= jg_global.jg_has_mixin; 	
	var jg_delegate	 	= jg_global.jg_delegate; 
	
	module.exports = jg_global;
 	
 	/***** ONLY CHANGE THINGS UNDER THIS LINE *****/
	 	
	jg_namespace("jgatt.geom", function()
	{

		this.Point = jg_extend(Object, function(Point, base)
		{

			// Public Properties

			this.x = 0;
			this.y = 0;

			// Constructor

			this.constructor = function(x, y)
			{
				this.x = (x !== undefined) ? x : 0;
				this.y = (y !== undefined) ? y : 0;
			};

			// Public Methods

			this.length = function()
			{
				return Math.sqrt(this.x * this.x + this.y * this.y);
			};

			this.hasNaN = function()
			{
				return (isNaN(this.x) ||
				        isNaN(this.y));
			};

			this.hasInfinity = function()
			{
				return ((this.x == Infinity) || (this.x == -Infinity) ||
				        (this.y == Infinity) || (this.y == -Infinity));
			};

			this.hasPositiveInfinity = function()
			{
				return ((this.x == Infinity) ||
				        (this.y == Infinity));
			};

			this.hasNegativeInfinity = function()
			{
				return ((this.x == -Infinity) ||
				        (this.y == -Infinity));
			};

			this.isFinite = function()
			{
				return (((this.x - this.x) === 0) &&
				        ((this.y - this.y) === 0));
			};

			this.clone = function()
			{
				return new Point(this.x, this.y);
			};

			this.equals = function(point)
			{
				return ((this.x === point.x) && (this.y === point.y));
			};

			this.toString = function()
			{
				return "(x=" + this.x + ", y=" + this.y + ")";
			};

		});

	});

	jg_namespace("jgatt.geom", function()
	{

		var Point = jg_import("jgatt.geom.Point");

		this.Matrix = jg_extend(Object, function(Matrix, base)
		{

			// Public Properties

			this.a = 1;
			this.b = 0;
			this.c = 0;
			this.d = 1;
			this.tx = 0;
			this.ty = 0;

			// Constructor

			this.constructor = function(a, b, c, d, tx, ty)
			{
				this.a = (a !== undefined) ? a : 1;
				this.b = (b !== undefined) ? b : 0;
				this.c = (c !== undefined) ? c : 0;
				this.d = (d !== undefined) ? d : 1;
				this.tx = (tx !== undefined) ? tx : 0;
				this.ty = (ty !== undefined) ? ty : 0;
			};

			// Public Methods

			this.transformPoint = function(point)
			{
				var x = this.a * point.x + this.c * point.y + this.tx;
				var y = this.b * point.x + this.d * point.y + this.ty;
				return new Point(x, y);
			};

			this.translate = function(x, y)
			{
				this.tx += x;
				this.ty += y;
			};

			this.scale = function(scaleX, scaleY)
			{
				this.a *= scaleX;
				this.b *= scaleY;
				this.c *= scaleX;
				this.d *= scaleY;
				this.tx *= scaleX;
				this.ty *= scaleY;
			};

			this.rotate = function(angle)
			{
				var cosAngle = Math.cos(angle);
				var sinAngle = Math.sin(angle);
				var a = this.a;
				var b = this.b;
				var c = this.c;
				var d = this.d;
				var tx = this.tx;
				var ty = this.ty;

				this.a = a * cosAngle - b * sinAngle;
				this.b = b * cosAngle + a * sinAngle;
				this.c = c * cosAngle - d * sinAngle;
				this.d = d * cosAngle + c * sinAngle;
				this.tx = tx * cosAngle - ty * sinAngle;
				this.ty = ty * cosAngle + tx * sinAngle;
			};

			this.concat = function(matrix)
			{
				var a1 = matrix.a;
				var b1 = matrix.b;
				var c1 = matrix.c;
				var d1 = matrix.d;
				var tx1 = matrix.tx;
				var ty1 = matrix.ty;

				var a2 = this.a;
				var b2 = this.b;
				var c2 = this.c;
				var d2 = this.d;
				var tx2 = this.tx;
				var ty2 = this.ty;

				this.a = a1 * a2 + c1 * b2;
				this.b = b1 * a2 + d1 * b2;
				this.c = a1 * c2 + c1 * d2;
				this.d = b1 * c2 + d1 * d2;
				this.tx = a1 * tx2 + c1 * ty2 + tx1;
				this.ty = b1 * tx2 + d1 * ty2 + ty1;
			};

			this.invert = function()
			{
				var det = this.determinant();
				var a = this.a / det;
				var b = this.b / det;
				var c = this.c / det;
				var d = this.d / det;
				var tx = this.tx;
				var ty = this.ty;

				this.a = d;
				this.b = -b;
				this.c = -c;
				this.d = a;
				this.tx = c * ty - d * tx;
				this.ty = b * tx - a * ty;
			};

			this.identity = function()
			{
				this.a = 1;
				this.b = 0;
				this.c = 0;
				this.d = 1;
				this.tx = 0;
				this.ty = 0;
			};

			this.determinant = function()
			{
				return (this.a * this.d) - (this.b * this.c);
			};

			this.hasInverse = function()
			{
				var det = Math.abs(this.determinant());
				return ((det > 0) && (det < Infinity));
			};

			this.hasNaN = function()
			{
				return (isNaN(this.a) ||
			        	isNaN(this.b) ||
				        isNaN(this.c) ||
				        isNaN(this.d) ||
				        isNaN(this.tx) ||
			        	isNaN(this.ty));
			};

			this.hasInfinity = function()
			{
				return ((this.a == Infinity) || (this.a == -Infinity) ||
			        	(this.b == Infinity) || (this.b == -Infinity) ||
				        (this.c == Infinity) || (this.c == -Infinity) ||
				        (this.d == Infinity) || (this.d == -Infinity) ||
				        (this.tx == Infinity) || (this.tx == -Infinity) ||
			        	(this.ty == Infinity) || (this.ty == -Infinity));
			};

			this.hasPositiveInfinity = function()
			{
				return ((this.a == Infinity) ||
			        	(this.b == Infinity) ||
				        (this.c == Infinity) ||
				        (this.d == Infinity) ||
				        (this.tx == Infinity) ||
			        	(this.ty == Infinity));
			};

			this.hasNegativeInfinity = function()
			{
				return ((this.a == -Infinity) ||
			        	(this.b == -Infinity) ||
				        (this.c == -Infinity) ||
				        (this.d == -Infinity) ||
				        (this.tx == -Infinity) ||
			        	(this.ty == -Infinity));
			};

			this.isFinite = function()
			{
				return (((this.a - this.a) === 0) &&
				        ((this.b - this.b) === 0) &&
				        ((this.c - this.c) === 0) &&
				        ((this.d - this.d) === 0) &&
				        ((this.tx - this.tx) === 0) &&
				        ((this.ty - this.ty) === 0));
			};

			this.isIdentity = function()
			{
				return ((this.a == 1) &&
			        	(this.b == 0) &&
				        (this.c == 0) &&
				        (this.d == 1) &&
				        (this.tx == 0) &&
			        	(this.ty == 0));
			};

			this.clone = function()
			{
				return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
			};

			this.equals = function(matrix)
			{
				return ((this.a === matrix.a) &&
			        	(this.b === matrix.b) &&
				        (this.c === matrix.c) &&
				        (this.d === matrix.d) &&
				        (this.tx === matrix.tx) &&
			        	(this.ty === matrix.ty));
			};

			this.toString = function()
			{
				return "(a=" + this.a + ", b=" + this.b + ", c=" + this.c + ", d=" + this.d + ", tx=" + this.tx + ", ty=" + this.ty + ")";
			};

		});

	});

	jg_namespace("jgatt.geom", function()
	{

		this.Rectangle = jg_extend(Object, function(Rectangle, base)
		{

			// Public Properties

			this.x = 0;
			this.y = 0;
			this.width = 0;
			this.height = 0;

			// Constructor

			this.constructor = function(x, y, width, height)
			{
				this.x = (x !== undefined) ? x : 0;
				this.y = (y !== undefined) ? y : 0;
				this.width = (width !== undefined) ? width : 0;
				this.height = (height !== undefined) ? height : 0;
			};

			// Public Methods

			this.hasNaN = function()
			{
				return (isNaN(this.x) ||
				        isNaN(this.y) ||
				        isNaN(this.width) ||
				        isNaN(this.height));
			};

			this.hasInfinity = function()
			{
				return ((this.x == Infinity) || (this.x == -Infinity) ||
				        (this.y == Infinity) || (this.y == -Infinity) ||
				        (this.width == Infinity) || (this.width == -Infinity) ||
				        (this.height == Infinity) || (this.height == -Infinity));
			};

			this.hasPositiveInfinity = function()
			{
				return ((this.x == Infinity) ||
				        (this.y == Infinity) ||
				        (this.width == Infinity) ||
				        (this.height == Infinity));
			};

			this.hasNegativeInfinity = function()
			{
				return ((this.x == -Infinity) ||
				        (this.y == -Infinity) ||
				        (this.width == -Infinity) ||
				        (this.height == -Infinity));
			};

			this.isFinite = function()
			{
				return (((this.x - this.x) === 0) &&
				        ((this.y - this.y) === 0) &&
				        ((this.width - this.width) === 0) &&
				        ((this.height - this.height) === 0));
			};

			this.clone = function()
			{
				return new Rectangle(this.x, this.y, this.width, this.height);
			};

			this.equals = function(rectangle)
			{
				return ((this.x === rectangle.x) &&
				        (this.y === rectangle.y) &&
				        (this.width === rectangle.width) &&
				        (this.height === rectangle.height));
			};

			this.toString = function()
			{
				return "(x=" + this.x + ", y=" + this.y + ", width=" + this.width + ", height=" + this.height + ")";
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		this.ColorUtils = jg_static(function(ColorUtils)
		{

			ColorUtils.toRGB = function(color)
			{
				var rgb = {};
				rgb.r = (color >> 16) & 0xFF;
				rgb.g = (color >> 8) & 0xFF;
				rgb.b = color & 0xFF;
				return rgb;
			};

			ColorUtils.fromRGB = function(rgb)
			{
				return ((rgb.r << 16) | (rgb.g << 8) | rgb.b);
			};

			ColorUtils.brightness = function(color, brightness)
			{
				var rgb = ColorUtils.toRGB(color);
				var c;

				if (brightness < 0)
				{
					brightness = -brightness;
					c = 0x00;
				}
				else
				{
					c = 0xFF;
				}

				if (brightness > 1)
					brightness = 1;

				rgb.r += Math.round((c - rgb.r) * brightness);
				rgb.g += Math.round((c - rgb.g) * brightness);
				rgb.b += Math.round((c - rgb.b) * brightness);

				return ColorUtils.fromRGB(rgb);
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");

		this.Graphics = jg_extend(Object, function(Graphics, base)
		{

			// Private Properties

			this._width = 1;
			this._height = 1;
			this._strokeStyle = null;
			this._strokeCommands = null;
			this._fillCommands = null;
			this._drawingStack = null;
			this._drawingStackIndex = 0;
			this._penX = 0;
			this._penY = 0;

			this._element = null;
			this._canvas = null;
			this._context = null;

			// Constructor

			this.constructor = function(width, height)
			{
				this._width = ((width > 1) && (width < Infinity)) ? Math.floor(width) : 1;
				this._height = ((height > 1) && (height < Infinity)) ? Math.floor(height) : 1;
				this._strokeStyle = { thickness: 1, caps: "none", joints: "miter", miterLimit: 10, pixelHinting: true };
				this._drawingStack = [];
			};

			// Public Methods

			this.appendTo = function(element)
			{
				if (!element)
					throw new Error("Parameter element must be non-null.");

				if (element === this._element)
					return true;

				this.remove();

				var canvas = document.createElement("canvas");
				if (!canvas)
					return false;

				if (typeof canvas.getContext !== "function")
					return false;

				var context = canvas.getContext("2d");
				if (!context)
					return false;

				canvas.style.position = "absolute";
				canvas.width = this._width;
				canvas.height = this._height;

				element.appendChild(canvas);

				this._element = element;
				this._canvas = canvas;
				this._context = context;

				this._draw(true);

				return true;
			};

			this.remove = function()
			{
				if (!this._element)
					return false;

				var context = this._context;
				context.clearRect(0, 0, context.canvas.width, context.canvas.height);
				context.beginPath();

				var canvas = this._canvas;
				var parentNode = canvas.parentNode;
				if (parentNode)
					parentNode.removeChild(canvas);

				this._element = null;
				this._canvas = null;
				this._context = null;

				return true;
			};

			this.setSize = function(width, height)
			{
				width = ((width > 1) && (width < Infinity)) ? Math.floor(width) : 1;
				height = ((height > 1) && (height < Infinity)) ? Math.floor(height) : 1;

				if ((width === this._width) && (height === this._height))
					return;

				this._width = width;
				this._height = height;

				var canvas = this._canvas;
				if (!canvas)
					return;

				canvas.width = width;
				canvas.height = height;

				this._draw(true);
			};

			this.setStrokeStyle = function(thickness, caps, joints, miterLimit, pixelHinting)
			{
				if ((caps != null) && (caps !== "none") && (caps !== "round") && (caps !== "square"))
					throw new Error("Parameter caps must be one of \"none\", \"round\", or \"square\".");
				if ((joints != null) && (joints !== "miter") && (joints !== "round") && (joints !== "bevel"))
					throw new Error("Parameter joints must be one of \"miter\", \"round\", or \"bevel\".");

				thickness *= 1;
				thickness = ((thickness > 0) && (thickness < Infinity)) ? thickness : 1;

				caps = caps ? caps : "none";

				joints = joints ? joints : "miter";

				miterLimit *= 1;
				miterLimit = ((miterLimit > 0) && (miterLimit < Infinity)) ? miterLimit : 10;

				pixelHinting = (pixelHinting != false);

				this._strokeStyle = { thickness: thickness, caps: caps, joints: joints, miterLimit: miterLimit, pixelHinting: pixelHinting };
			};

			this.beginSolidStroke = function(color, alpha)
			{
				this.endStroke();

				color = !isNaN(color) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;

				alpha = !isNaN(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;

				var strokeCommands = this._strokeCommands = [];
				strokeCommands.push({ name: "solidStroke", strokeStyle: this._strokeStyle, color: color, alpha: alpha });
				strokeCommands.push({ name: "moveTo", x: this._penX, y: this._penY });
			};

			this.beginGradientStroke = function(type, colors, alphas, ratios, matrix, focalPointRatio)
			{
				if (type == null)
					throw new Error("Parameter type must be non-null.");
				if ((type !== "linear") && (type !== "radial"))
					throw new Error("Parameter type must be one of \"linear\" or \"radial\".");
				if (colors == null)
					throw new Error("Parameter colors must be non-null.");
				if (!(colors instanceof Array))
					throw new Error("Parameter colors must be an array.");
				if (alphas == null)
					throw new Error("Parameter alphas must be non-null.");
				if (!(alphas instanceof Array))
					throw new Error("Parameter alphas must be an array.");
				if (ratios == null)
					throw new Error("Parameter ratios must be non-null.");
				if (!(ratios instanceof Array))
					throw new Error("Parameter ratios must be an array.");
				if ((matrix != null) && !(matrix instanceof Matrix))
					throw new Error("Parameter matrix must be an instance of jgatt.geom.Matrix.");

				this.endStroke();

				var numStops = Math.min(colors.length, alphas.length, ratios.length);
				colors = colors.slice(0, numStops);
				alphas = alphas.slice(0, numStops);
				ratios = ratios.slice(0, numStops);
				var color;
				var alpha;
				var ratio;
				for (var i = 0; i < numStops; i++)
				{
					color = colors[i];
					colors[i] = !isNaN(color) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;

					alpha = alphas[i];
					alphas[i] = !isNaN(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;

					ratio = ratios[i];
					ratios[i] = !isNaN(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
				}

				if (matrix)
				{
					matrix = new Matrix(matrix.a * 1, matrix.b * 1, matrix.c * 1, matrix.d * 1, matrix.tx * 1, matrix.ty * 1);
					if ((matrix.tx - matrix.tx) !== 0)
						matrix.tx = 0;
					if ((matrix.ty - matrix.ty) !== 0)
						matrix.ty = 0;
					if (!matrix.hasInverse())
						matrix = null;
				}

				focalPointRatio = !isNaN(focalPointRatio) ? Math.min(Math.max(focalPointRatio, -1), 1) : 0;

				var strokeCommands = this._strokeCommands = [];
				strokeCommands.push({ name: "gradientStroke", strokeStyle: this._strokeStyle, type: type, colors: colors, alphas: alphas, ratios: ratios, matrix: matrix, focalPointRatio: focalPointRatio });
				strokeCommands.push({ name: "moveTo", x: this._penX, y: this._penY });
			};

			this.beginImageStroke = function(image, matrix, repeat)
			{
			};

			this.endStroke = function()
			{
				if (!this._strokeCommands)
					return;

				this._drawingStack.push(this._strokeCommands);
				this._strokeCommands = null;

				this._draw();
			};

			this.beginSolidFill = function(color, alpha)
			{
				this.endFill();

				color = !isNaN(color) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;

				alpha = !isNaN(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;

				var fillCommands = this._fillCommands = [];
				fillCommands.push({ name: "solidFill", color: color, alpha: alpha });
				fillCommands.push({ name: "moveTo", x: this._penX, y: this._penY });
			};

			this.beginGradientFill = function(type, colors, alphas, ratios, matrix, focalPointRatio)
			{
				if (type == null)
					throw new Error("Parameter type must be non-null.");
				if ((type !== "linear") && (type !== "radial"))
					throw new Error("Parameter type must be one of \"linear\" or \"radial\".");
				if (colors == null)
					throw new Error("Parameter colors must be non-null.");
				if (!(colors instanceof Array))
					throw new Error("Parameter colors must be an array.");
				if (alphas == null)
					throw new Error("Parameter alphas must be non-null.");
				if (!(alphas instanceof Array))
					throw new Error("Parameter alphas must be an array.");
				if (ratios == null)
					throw new Error("Parameter ratios must be non-null.");
				if (!(ratios instanceof Array))
					throw new Error("Parameter ratios must be an array.");
				if ((matrix != null) && !(matrix instanceof Matrix))
					throw new Error("Parameter matrix must be an instance of jgatt.geom.Matrix.");

				this.endFill();

				var numStops = Math.min(colors.length, alphas.length, ratios.length);
				colors = colors.slice(0, numStops);
				alphas = alphas.slice(0, numStops);
				ratios = ratios.slice(0, numStops);
				var color;
				var alpha;
				var ratio;
				for (var i = 0; i < numStops; i++)
				{
					color = colors[i];
					colors[i] = !isNaN(color) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;

					alpha = alphas[i];
					alphas[i] = !isNaN(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;

					ratio = ratios[i];
					ratios[i] = !isNaN(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
				}

				if (matrix)
				{
					matrix = new Matrix(matrix.a * 1, matrix.b * 1, matrix.c * 1, matrix.d * 1, matrix.tx * 1, matrix.ty * 1);
					if ((matrix.tx - matrix.tx) !== 0)
						matrix.tx = 0;
					if ((matrix.ty - matrix.ty) !== 0)
						matrix.ty = 0;
					if (!matrix.hasInverse())
						matrix = null;
				}

				focalPointRatio = !isNaN(focalPointRatio) ? Math.min(Math.max(focalPointRatio, -1), 1) : 0;

				var fillCommands = this._fillCommands = [];
				fillCommands.push({ name: "gradientFill", type: type, colors: colors, alphas: alphas, ratios: ratios, matrix: matrix, focalPointRatio: focalPointRatio });
				fillCommands.push({ name: "moveTo", x: this._penX, y: this._penY });
			};

			this.beginImageFill = function(image, matrix, repeat)
			{
			};

			this.endFill = function()
			{
				if (!this._fillCommands)
					return;

				this._drawingStack.push(this._fillCommands);
				this._fillCommands = null;

				this._draw();
			};

			this.moveTo = function(x, y)
			{
				x *= 1;
				if ((x - x) !== 0)
					x = 0;
				y *= 1;
				if ((y - y) !== 0)
					y = 0;

				this._penX = x;
				this._penY = y;

				var command = { name: "moveTo", x: x, y: y };
				if (this._strokeCommands)
					this._strokeCommands.push(command);
				if (this._fillCommands)
					this._fillCommands.push(command);
			};

			this.lineTo = function(x, y)
			{
				x *= 1;
				if ((x - x) !== 0)
					x = 0;
				y *= 1;
				if ((y - y) !== 0)
					y = 0;

				this._penX = x;
				this._penY = y;

				var command = { name: "lineTo", x: x, y: y };
				if (this._strokeCommands)
					this._strokeCommands.push(command);
				if (this._fillCommands)
					this._fillCommands.push(command);
			};

			this.curveTo = function(controlX, controlY, anchorX, anchorY)
			{
				controlX *= 1;
				if ((controlX - controlX) !== 0)
					controlX = 0;
				controlY *= 1;
				if ((controlY - controlY) !== 0)
					controlY = 0;
				anchorX *= 1;
				if ((anchorX - anchorX) !== 0)
					anchorX = 0;
				anchorY *= 1;
				if ((anchorY - anchorY) !== 0)
					anchorY = 0;

				this._penX = anchorX;
				this._penY = anchorY;

				var command = { name: "curveTo", controlX: controlX, controlY: controlY, anchorX: anchorX, anchorY: anchorY };
				if (this._strokeCommands)
					this._strokeCommands.push(command);
				if (this._fillCommands)
					this._fillCommands.push(command);
			};

			this.clear = function()
			{
				this._strokeCommands = null;
				this._fillCommands = null;
				this._drawingStack = [];

				this._draw(true);
			};

			// Private Methods

			this._draw = function(redraw)
			{
				var context = this._context;
				if (!context)
					return;

				if (redraw == true)
				{
					this._drawingStackIndex = 0;

					context.clearRect(0, 0, context.canvas.width, context.canvas.height);
					context.beginPath();
				}

				var drawingStack = this._drawingStack;
				var drawingStackSize = drawingStack.length;
				var commands;
				var i;
				for (i = this._drawingStackIndex; i < drawingStackSize; i++)
				{
					commands = drawingStack[i];
					switch (commands[0].name)
					{
						case "solidStroke":
						case "gradientStroke":
							this._drawStroke(commands);
							break;
						case "solidFill":
						case "gradientFill":
							this._drawFill(commands);
							break;
					}
				}
				this._drawingStackIndex = i;
			};

			this._drawStroke = function(commands)
			{
				var context = this._context;
				if (!context)
					return;

				var numCommands = commands.length;
				var command = commands[0];
				var strokeStyle = command.strokeStyle;
				var offset = strokeStyle.pixelHinting ? (strokeStyle.thickness % 2) / 2 : 0;
				var hasPath = false;
				var startX;
				var startY;
				var endX;
				var endY;
				var gradient;
				var numStops;
				var colors;
				var alphas;
				var ratios;
				var color;
				var alpha;
				var ratio;
				var matrix;
				var i;

				context.beginPath();
				for (i = 1; i < numCommands; i++)
				{
					command = commands[i];
					if (command.name === "moveTo")
					{
						if (hasPath && (startX === endX) && (startY === endY))
							context.closePath();
						hasPath = false;
						startX = command.x;
						startY = command.y;
						context.moveTo(startX + offset, startY + offset);
					}
					else if (command.name === "lineTo")
					{
						hasPath = true;
						endX = command.x;
						endY = command.y;
						context.lineTo(endX + offset, endY + offset);
					}
					else if (command.name === "curveTo")
					{
						hasPath = true;
						endX = command.anchorX;
						endY = command.anchorY;
						context.quadraticCurveTo(command.controlX + offset, command.controlY + offset, endX + offset, endY + offset);
					}
				}
				if (hasPath && (startX === endX) && (startY === endY))
					context.closePath();

				context.save();
				context.lineWidth = strokeStyle.thickness;
				context.lineCap = (strokeStyle.caps === "none") ? "butt" : strokeStyle.caps;
				context.lineJoin = strokeStyle.joints;
				context.miterLimit = strokeStyle.miterLimit;
				command = commands[0];
				if (command.name === "solidStroke")
				{
					color = command.color;
					alpha = command.alpha;
					context.strokeStyle = "rgba(" + ((color >> 16) & 0xFF) + ", " + ((color >> 8) & 0xFF) + ", " + (color & 0xFF) + ", " + alpha + ")";
				}
				else if (command.name === "gradientStroke")
				{
					if (command.type === "radial")
						gradient = context.createRadialGradient(0.5 + 0.49 * command.focalPointRatio, 0.5, 0, 0.5, 0.5, 0.5);
					else
						gradient = context.createLinearGradient(0, 0, 1, 0);
					colors = command.colors;
					alphas = command.alphas;
					ratios = command.ratios;
					numStops = colors.length;
					for (i = 0; i < numStops; i++)
					{
						color = colors[i];
						alpha = alphas[i];
						ratio = ratios[i];
						gradient.addColorStop(ratio, "rgba(" + ((color >> 16) & 0xFF) + ", " + ((color >> 8) & 0xFF) + ", " + (color & 0xFF) + ", " + alpha + ")");
					}
					matrix = command.matrix;
					if (matrix)
						context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
					context.strokeStyle = gradient;
				}
				context.stroke();
				context.restore();
				context.beginPath();
			};

			this._drawFill = function(commands)
			{
				var context = this._context;
				if (!context)
					return;

				var numCommands = commands.length;
				var command;
				var gradient;
				var numStops;
				var colors;
				var alphas;
				var ratios;
				var color;
				var alpha;
				var ratio;
				var matrix;
				var i;

				context.beginPath();
				for (i = 1; i < numCommands; i++)
				{
					command = commands[i];
					if (command.name === "moveTo")
						context.moveTo(command.x, command.y);
					else if (command.name === "lineTo")
						context.lineTo(command.x, command.y);
					else if (command.name === "curveTo")
						context.quadraticCurveTo(command.controlX, command.controlY, command.anchorX, command.anchorY);
				}

				context.save();
				command = commands[0];
				if (command.name === "solidFill")
				{
					color = command.color;
					alpha = command.alpha;
					context.fillStyle = "rgba(" + ((color >> 16) & 0xFF) + ", " + ((color >> 8) & 0xFF) + ", " + (color & 0xFF) + ", " + alpha + ")";
				}
				else if (command.name === "gradientFill")
				{
					if (command.type === "radial")
						gradient = context.createRadialGradient(0.5 + 0.49 * command.focalPointRatio, 0.5, 0, 0.5, 0.5, 0.5);
					else
						gradient = context.createLinearGradient(0, 0, 1, 0);
					colors = command.colors;
					alphas = command.alphas;
					ratios = command.ratios;
					numStops = colors.length;
					for (i = 0; i < numStops; i++)
					{
						color = colors[i];
						alpha = alphas[i];
						ratio = ratios[i];
						gradient.addColorStop(ratio, "rgba(" + ((color >> 16) & 0xFF) + ", " + ((color >> 8) & 0xFF) + ", " + (color & 0xFF) + ", " + alpha + ")");
					}
					matrix = command.matrix;
					if (matrix)
						context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
					context.fillStyle = gradient;
				}
				context.fill();
				context.restore();
				context.beginPath();
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		this.IBrush = jg_extend(Object, function(IBrush, base)
		{

			// Public Methods

			this.beginBrush = function(graphics, matrix, bounds)
			{
			};

			this.endBrush = function()
			{
			};

			this.moveTo = function(x, y)
			{
			};

			this.lineTo = function(x, y)
			{
			};

			this.curveTo = function(controlX, controlY, anchorX, anchorY)
			{
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");
		var Graphics = jg_import("jgatt.graphics.Graphics");
		var IBrush = jg_import("jgatt.graphics.IBrush");

		this.AbstractBrush = jg_extend(IBrush, function(AbstractBrush, base)
		{

			// Private Properties

			this._commands = null;
			this._graphics = null;
			this._matrix = null;
			this._bounds = null;

			// Public Methods

			this.beginBrush = function(graphics, matrix, bounds)
			{
				if (!graphics)
					throw new Error("Parameter graphics must be non-null.");
				if (!(graphics instanceof Graphics))
					throw new Error("Parameter graphics must be an instance of jgatt.graphics.Graphics.");
				if ((matrix != null) && !(matrix instanceof Matrix))
					throw new Error("Parameter matrix must be an instance of jgatt.geom.Matrix.");
				if ((bounds != null) && !(bounds instanceof Array))
					throw new Error("Parameter bounds must be an array.");

				this.endBrush();

				this._commands = [];
				this._graphics = graphics;
				this._matrix = matrix ? matrix.clone() : null;
				if (bounds)
				{
					var bounds2 = this._bounds = [];
					var numPoints = bounds.length;
					var point;
					for (var i = 0; i < numPoints; i++)
					{
						point = bounds[i];
						if (point instanceof Point)
							bounds2.push(point.clone());
					}
				}
			};

			this.endBrush = function()
			{
				if (!this._graphics)
					return;

				this.draw(this._commands, this._graphics, this._matrix, this._bounds);

				this._commands = null;
				this._graphics = null;
				this._matrix = null;
				this._bounds = null;
			};

			this.moveTo = function(x, y)
			{
				if (!this._graphics)
					return;

				this._commands.push({ name: "moveTo", x: x, y: y });
			};

			this.lineTo = function(x, y)
			{
				if (!this._graphics)
					return;

				this._commands.push({ name: "lineTo", x: x, y: y });
			};

			this.curveTo = function(controlX, controlY, anchorX, anchorY)
			{
				if (!this._graphics)
					return;

				this._commands.push({ name: "curveTo", controlX: controlX, controlY: controlY, anchorX: anchorX, anchorY: anchorY });
			};

			// Protected Methods

			this.draw = function(commands, graphics, matrix, bounds)
			{
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");
		var AbstractBrush = jg_import("jgatt.graphics.AbstractBrush");

		this.AbstractTileBrush = jg_extend(AbstractBrush, function(AbstractTileBrush, base)
		{

			// Private Properties

			this._stretchMode = "fill";
			this._alignmentX = 0.5;
			this._alignmentY = 0.5;
			this._tileTransform = null;
			this._renderTransform = null;
			this._fitToDrawing = false;

			// Constructor

			this.constructor = function(stretchMode, alignmentX, alignmentY, tileTransform, renderTransform, fitToDrawing)
			{
				base.constructor.call(this);

				switch (stretchMode)
				{
					case "none":
					case "fill":
					case "uniform":
					case "uniformToFill":
					case "uniformToWidth":
					case "uniformToHeight":
						stretchMode += "";
						break;
					default:
						stretchMode = "fill";
						break;
				}

				this._stretchMode = stretchMode;
				this._alignmentX = ((alignmentX != null) && !isNaN(alignmentX)) ? (alignmentX * 1) : 0.5;
				this._alignmentY = ((alignmentY != null) && !isNaN(alignmentY)) ? (alignmentY * 1) : 0.5;
				this._tileTransform = (tileTransform instanceof Matrix) ? tileTransform.clone() : null;
				this._renderTransform = (renderTransform instanceof Matrix) ? renderTransform.clone() : null;
				this._fitToDrawing = (fitToDrawing == true);
			};

			// Public Getters/Setters

			this.getStretchMode = function()
			{
				return this._stretchMode;
			};
			this.setStretchMode = function(value)
			{
				switch (value)
				{
					case "none":
					case "fill":
					case "uniform":
					case "uniformToFill":
					case "uniformToWidth":
					case "uniformToHeight":
						value += "";
						break;
					default:
						value = "fill";
						break;
				}
				this._stretchMode = value;
			};

			this.getAlignmentX = function()
			{
				return this._alignmentX;
			};
			this.setAlignmentX = function(value)
			{
				this._alignmentX = ((value != null) && !isNaN(value)) ? (value * 1) : this._alignmentX;
			};

			this.getAlignmentY = function()
			{
				return this._alignmentY;
			};
			this.setAlignmentY = function(value)
			{
				this._alignmentY = ((value != null) && !isNaN(value)) ? (value * 1) : this._alignmentY;
			};

			this.getTileTransform = function()
			{
				return this._tileTransform ? this._tileTransform.clone() : null;
			};
			this.setTileTransform = function(value)
			{
				this._tileTransform = (value instanceof Matrix) ? value.clone() : null;
			};

			this.getRenderTransform = function()
			{
				return this._renderTransform ? this._renderTransform.clone() : null;
			};
			this.setRenderTransform = function(value)
			{
				this._renderTransform = (value instanceof Matrix) ? value.clone() : null;
			};

			this.getFitToDrawing = function()
			{
				return this._fitToDrawing;
			};
			this.setFitToDrawing = function(value)
			{
				this._fitToDrawing = (value == true);
			};

			// Protected Methods

			this.computeTileMatrix = function(tileWidth, tileHeight, matrix, bounds, commands)
			{
				var tileMatrix;

				var tileTransform = this._tileTransform;
				if (tileTransform)
				{
					tileMatrix = tileTransform.clone();

					var p1 = new Point(0, 0);
					var p2 = new Point(tileWidth, 0);
					var p3 = new Point(tileWidth, tileHeight);
					var p4 = new Point(0, tileHeight);

					p1 = tileMatrix.transformPoint(p1);
					p2 = tileMatrix.transformPoint(p2);
					p3 = tileMatrix.transformPoint(p3);
					p4 = tileMatrix.transformPoint(p4);

					var left = Math.min(p1.x, p2.x, p3.x, p4.x);
					var right = Math.max(p1.x, p2.x, p3.x, p4.x);
					var top = Math.min(p1.y, p2.y, p3.y, p4.y);
					var bottom = Math.max(p1.y, p2.y, p3.y, p4.y);

					tileWidth = right - left;
					tileHeight = bottom - top;
					tileMatrix.translate(-left, -top);
				}
				else
				{
					tileMatrix = new Matrix();
				}

				var invertedMatrix;
				if (matrix && matrix.hasInverse())
				{
					invertedMatrix = matrix.clone();
					invertedMatrix.invert();
				}

				var minX = Infinity;
				var minY = Infinity;
				var maxX = -Infinity;
				var maxY = -Infinity;
				var point;
				var i;

				if (bounds && !this._fitToDrawing)
				{
					var numPoints = bounds.length;
					for (i = 0; i < numPoints; i++)
					{
						point = bounds[i];

						if (invertedMatrix)
							point = invertedMatrix.transformPoint(point);

						minX = Math.min(point.x, minX);
						minY = Math.min(point.y, minY);
						maxX = Math.max(point.x, maxX);
						maxY = Math.max(point.y, maxY);
					}
				}
				else
				{
					var numCommands = commands.length;
					var command;
					for (i = 0; i < numCommands; i++)
					{
						command = commands[i];
						if (command.name == "moveTo")
							point = new Point(command.x, command.y);
						else if (command.name == "lineTo")
							point = new Point(command.x, command.y);
						else if (command.name == "curveTo")
							point = new Point(command.anchorX, command.anchorY);  // control point tangents need to be properly computed
						else
							continue;

						if (invertedMatrix)
							point = invertedMatrix.transformPoint(point);

						minX = Math.min(point.x, minX);
						minY = Math.min(point.y, minY);
						maxX = Math.max(point.x, maxX);
						maxY = Math.max(point.y, maxY);
					}
				}

				if (minX == Infinity)
					minX = minY = maxX = maxY = 0;

				var width = maxX - minX;
				var height = maxY - minY;
				var scaleX;
				var scaleY;
				var offsetX;
				var offsetY;

				switch (this._stretchMode)
				{
					case "none":
						offsetX = (width - tileWidth) * this._alignmentX;
						offsetY = (height - tileHeight) * this._alignmentY;
						tileMatrix.translate(offsetX, offsetY);
						break;
					case "uniform":
						scaleX = (tileWidth > 0) ? (width / tileWidth) : 1;
						scaleY = (tileHeight > 0) ? (height / tileHeight) : 1;
						scaleX = scaleY = Math.min(scaleX, scaleY);
						offsetX = (width - tileWidth * scaleX) * this._alignmentX;
						offsetY = (height - tileHeight * scaleY) * this._alignmentY;
						tileMatrix.scale(scaleX, scaleY);
						tileMatrix.translate(offsetX, offsetY);
						break;
					case "uniformToFill":
						scaleX = (tileWidth > 0) ? (width / tileWidth) : 1;
						scaleY = (tileHeight > 0) ? (height / tileHeight) : 1;
						scaleX = scaleY = Math.max(scaleX, scaleY);
						offsetX = (width - tileWidth * scaleX) * this._alignmentX;
						offsetY = (height - tileHeight * scaleY) * this._alignmentY;
						tileMatrix.scale(scaleX, scaleY);
						tileMatrix.translate(offsetX, offsetY);
						break;
					case "uniformToWidth":
						scaleX = scaleY = (tileWidth > 0) ? (width / tileWidth) : 1;
						offsetX = (width - tileWidth * scaleX) * this._alignmentX;
						offsetY = (height - tileHeight * scaleY) * this._alignmentY;
						tileMatrix.scale(scaleX, scaleY);
						tileMatrix.translate(offsetX, offsetY);
						break;
					case "uniformToHeight":
						scaleX = scaleY = (tileHeight > 0) ? (height / tileHeight) : 1;
						offsetX = (width - tileWidth * scaleX) * this._alignmentX;
						offsetY = (height - tileHeight * scaleY) * this._alignmentY;
						tileMatrix.scale(scaleX, scaleY);
						tileMatrix.translate(offsetX, offsetY);
						break;
					default:  // "fill"
						scaleX = (tileWidth > 0) ? (width / tileWidth) : 1;
						scaleY = (tileHeight > 0) ? (height / tileHeight) : 1;
						tileMatrix.scale(scaleX, scaleY);
						break;
				}

				var renderTransform = this._renderTransform;
				if (renderTransform)
					tileMatrix.concat(renderTransform);

				tileMatrix.translate(minX, minY);

				if (matrix)
					tileMatrix.concat(matrix);

				return tileMatrix;
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var AbstractTileBrush = jg_import("jgatt.graphics.AbstractTileBrush");

		this.GradientFillBrush = jg_extend(AbstractTileBrush, function(GradientFillBrush, base)
		{

			// Private Properties

			this._type = "linear";
			this._colors = null;
			this._alphas = null;
			this._ratios = null;
			this._focalPointRatio = 0;
			this._gradientWidth = 100;
			this._gradientHeight = 100;

			// Constructor

			this.constructor = function(type, colors, alphas, ratios, focalPointRatio)
			{
				base.constructor.call(this);

				this._type = ((type == "linear") || (type == "radial")) ? (type + "") : "linear";
				this._colors = (colors instanceof Array) ? colors.concat() : [];
				this._alphas = (alphas instanceof Array) ? alphas.concat() : [];
				this._ratios = (ratios instanceof Array) ? ratios.concat() : [];
				this._focalPointRatio = ((focalPointRatio != null) && !isNaN(focalPointRatio)) ? Math.min(Math.max(focalPointRatio, -1), 1) : 0;
				this._gradientWidth = 100;
				this._gradientHeight = 100;
			};

			// Public Getters/Setters

			this.getType = function()
			{
				return this._type;
			};
			this.setType = function(value)
			{
				this._type = ((value == "linear") || (value == "radial")) ? (value + "") : this._type;
			};

			this.getColors = function()
			{
				return this._colors.concat();
			};
			this.setColors = function(value)
			{
				this._colors = (value instanceof Array) ? value.concat() : [];
			};

			this.getAlphas = function()
			{
				return this._alphas.concat();
			};
			this.setAlphas = function(value)
			{
				this._alphas = (value instanceof Array) ? value.concat() : [];
			};

			this.getRatios = function()
			{
				return this._ratios.concat();
			};
			this.setRatios = function(value)
			{
				this._ratios = (value instanceof Array) ? value.concat() : [];
			};

			this.getFocalPointRatio = function()
			{
				return this._focalPointRatio;
			};
			this.setFocalPointRatio = function(value)
			{
				this._focalPointRatio = ((value != null) && !isNaN(value)) ? Math.min(Math.max(value, -1), 1) : this._focalPointRatio;
			};

			this.getGradientWidth = function()
			{
				return this._gradientWidth;
			};
			this.setGradientWidth = function(value)
			{
				this._gradientWidth = ((value > 0) && (value < Infinity)) ? (value * 1) : this._gradientWidth;
			};

			this.getGradientHeight = function()
			{
				return this._gradientHeight;
			};
			this.setGradientHeight = function(value)
			{
				this._gradientHeight = ((value > 0) && (value < Infinity)) ? (value * 1) : this._gradientHeight;
			};

			// Protected Methods

			this.draw = function(commands, graphics, matrix, bounds)
			{
				var gradientWidth = this._gradientWidth;
				var gradientHeight = this._gradientHeight;

				var tileMatrix = new Matrix(gradientWidth, 0, 0, gradientHeight);
				tileMatrix.concat(this.computeTileMatrix(gradientWidth, gradientHeight, matrix, bounds, commands));

				graphics.beginGradientFill(this._type, this._colors, this._alphas, this._ratios, tileMatrix, this._focalPointRatio);

				var numCommands = commands.length;
				var command;
				for (var i = 0; i < numCommands; i++)
				{
					command = commands[i];
					if (command.name == "moveTo")
						graphics.moveTo(command.x, command.y);
					else if (command.name == "lineTo")
						graphics.lineTo(command.x, command.y);
					else if (command.name == "curveTo")
						graphics.curveTo(command.controlX, command.controlY, command.anchorX, command.anchorY);
				}

				graphics.endFill();
			};

		});

	});

	jg_namespace("jgatt.motion", function()
	{

		this.ITween = jg_extend(Object, function(ITween, base)
		{

			// Public Methods

			this.beginTween = function()
			{
				// returns Boolean
			};

			this.endTween = function()
			{
				// returns Boolean
			};

			this.updateTween = function(position)
			{
				// returns Boolean
			};

		});

	});

	jg_namespace("jgatt.motion.easers", function()
	{

		this.IEaser = jg_extend(Object, function(IEaser, base)
		{

			// Public Methods

			this.ease = function(position)
			{
				// returns Number
			};

		});

	});

	jg_namespace("jgatt.motion", function()
	{

		var ITween = jg_import("jgatt.motion.ITween");
		var IEaser = jg_import("jgatt.motion.easers.IEaser");

		this.AbstractTween = jg_extend(ITween, function(AbstractTween, base)
		{

			// Private Properties

			this._easer = null;

			this._isRunning = false;

			// Constructor

			this.constructor = function(easer)
			{
				if ((easer != null) && !(easer instanceof IEaser))
					throw new Error("Parameter easer must be an instance of jgatt.motion.easers.IEaser");

				this._easer = easer ? easer : null;
			};

			// Public Getters/Setters

			this.getEaser = function()
			{
				return this._easer;
			};
			this.setEaser = function(value)
			{
				if ((value != null) && !(value instanceof IEaser))
					throw new Error("Parameter easer must be an instance of jgatt.motion.easers.IEaser");
				this._easer = value ? value : null;
				this.endTween();
			};

			// Public Methods

			this.beginTween = function()
			{
				this.endTween();

				if (!this.beginTweenOverride())
					return false;

				this._isRunning = true;

				//this.dispatchEvent(new TweenEvent(TweenEvent.BEGIN));

				return true;
			};

			this.endTween = function()
			{
				if (!this._isRunning)
					return false;

				this.endTweenOverride();

				this._isRunning = false;

				//this.dispatchEvent(new TweenEvent(TweenEvent.END));

				return true;
			};

			this.updateTween = function(position)
			{
				if (!this._isRunning)
					return false;

				var easer = this._easer;
				if (easer)
					position = easer.ease(position);

				if (!this.updateTweenOverride(position))
					return false;

				//this.dispatchEvent(new TweenEvent(TweenEvent.UPDATE));

				return true;
			};

			// Protected Methods

			this.beginTweenOverride = function()
			{
				return false;
			};

			this.endTweenOverride = function()
			{
			};

			this.updateTweenOverride = function(position)
			{
				return false;
			};

		});

	});

	jg_namespace("jgatt.motion", function()
	{

		var AbstractTween = jg_import("jgatt.motion.AbstractTween");

		this.GroupTween = jg_extend(AbstractTween, function(GroupTween, base)
		{

			// Private Properties

			this._tweens = null;

			this._runningTweens = null;

			// Constructor

			this.constructor = function(tweens, easer)
			{
				base.constructor.call(this, easer);

				if ((tweens != null) && !(tweens instanceof Array))
					throw new Error("Parameter tweens must be an array.");

				this._tweens = tweens ? tweens.concat() : [];
			};

			// Public Getters/Setters

			this.getTweens = function()
			{
				return this._tweens.concat();
			};
			this.setTweens = function(value)
			{
				if ((value != null) && !(value instanceof Array))
					throw new Error("Parameter tweens must be an array.");
				this._tweens = value ? value.concat() : [];
				this.endTween();
			};

			// Protected Methods

			this.beginTweenOverride = function()
			{
				var runningTweens = [];
				var tweens = this._tweens;
				var tween;

				for (var i = 0, l = tweens.length; i < l; i++)
				{
					tween = tweens[i];
					if (tween.beginTween())
						runningTweens.push(tween);
				}

				if (runningTweens.length == 0)
					return false;

				this._runningTweens = runningTweens;

				return true;
			};

			this.endTweenOverride = function()
			{
				var runningTweens = this._runningTweens;

				for (var i = 0, l = runningTweens.length; i < l; i++)
					runningTweens[i].endTween();

				this._runningTweens = null;
			};

			this.updateTweenOverride = function(position)
			{
				var runningTweens = this._runningTweens;
				var numTweens = runningTweens.length;
				var tween;

				for (var i = 0; i < numTweens; i++)
				{
					tween = runningTweens[i];
					if (!tween.updateTween(position))
					{
						tween.endTween();
						runningTweens.splice(i, 1);
						i--;
						numTweens--;
					}
				}

				return (runningTweens.length > 0);
			};

		});

	});

	jg_namespace("jgatt.motion.interpolators", function()
	{

		this.IInterpolator = jg_extend(Object, function(IInterpolator, base)
		{

			// Public Methods

			this.interpolate = function(value1, value2, position)
			{
				// returns value
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		this.NumberUtils = jg_static(function(NumberUtils)
		{

			// Public Static Constants

			NumberUtils.EPSILON = (function()
			{
				var eps = 1;
				var temp = 1;
				while ((1 + temp) > 1)
				{
					eps = temp;
					temp /= 2;
				}
				return eps;
			})();

			NumberUtils.PRECISION = (function()
			{
				var prec = 0;
				var temp = 9;
				while ((temp % 10) == 9)
				{
					prec++;
					temp = temp * 10 + 9;
				}
				return prec;
			})();

			// Public Static Methods

			NumberUtils.parseNumber = function(value)
			{
				if (value == null)
					return NaN;

				switch (typeof value)
				{
					case "number":
						return value;
					case "string":
						return value ? Number(value) : NaN;
					case "boolean":
						return value ? 1 : 0;
				}

				return NaN;
			};

			NumberUtils.toPrecision = function(n, precision)
			{
				precision = (precision !== undefined) ? precision : 0;

				if (precision < 1)
					precision = NumberUtils.PRECISION + precision;

				if (precision < 1)
					precision = 1;
				else if (precision > 21)
					precision = 21;

				return Number(n.toPrecision(precision));
			};

			NumberUtils.toFixed = function(n, decimalDigits)
			{
				decimalDigits = (decimalDigits !== undefined) ? decimalDigits : 0;

				if (decimalDigits < 0)
					decimalDigits = 0;
				else if (decimalDigits > 20)
					decimalDigits = 20;

				return Number(n.toFixed(decimalDigits));
			};

			NumberUtils.roundTo = function(n, units)
			{
				units = (units !== undefined) ? units : 1;

				return NumberUtils.toPrecision(Math.round(n / units) * units, -1);
			};

			NumberUtils.minMax = function(n, min, max)
			{
				if (n < min)
					n = min;
				if (n > max)
					n = max;
				return n;
			};

			NumberUtils.maxMin = function(n, max, min)
			{
				if (n > max)
					n = max;
				if (n < min)
					n = min;
				return n;
			};

			NumberUtils.interpolate = function(n1, n2, f)
			{
				return n1 * (1 - f) + n2 * f;
			};

			NumberUtils.approxZero = function(n, threshold)
			{
				if (n == 0)
					return true;

				threshold = (threshold !== undefined) ? threshold : NaN;
				if (isNaN(threshold))
					threshold = NumberUtils.EPSILON;

				return (n < 0) ? (-n < threshold) : (n < threshold);
			};

			NumberUtils.approxOne = function(n, threshold)
			{
				if (n == 1)
					return true;

				n -= 1;

				threshold = (threshold !== undefined) ? threshold : NaN;
				if (isNaN(threshold))
					threshold = NumberUtils.EPSILON;

				return (n < 0) ? (-n < threshold) : (n < threshold);
			};

			NumberUtils.approxEqual = function(n1, n2, threshold)
			{
				if (n1 == n2)
					return true;

				n1 -= n2;

				threshold = (threshold !== undefined) ? threshold : NaN;
				if (isNaN(threshold))
					threshold = NumberUtils.EPSILON;

				return (n < 0) ? (-n < threshold) : (n < threshold);
			};

			NumberUtils.approxLessThan = function(n1, n2, threshold)
			{
				return ((n1 < n2) && !NumberUtils.approxEqual(n1, n2, threshold));
			};

			NumberUtils.approxLessThanOrEqual = function(n1, n2, threshold)
			{
				return ((n1 < n2) || NumberUtils.approxEqual(n1, n2, threshold));
			};

			NumberUtils.approxGreaterThan = function(n1, n2, threshold)
			{
				return ((n1 > n2) && !NumberUtils.approxEqual(n1, n2, threshold));
			};

			NumberUtils.approxGreaterThanOrEqual = function(n1, n2, threshold)
			{
				return ((n1 > n2) || NumberUtils.approxEqual(n1, n2, threshold));
			};

		});

	});

	jg_namespace("jgatt.motion.interpolators", function()
	{

		var IInterpolator = jg_import("jgatt.motion.interpolators.IInterpolator");
		var NumberUtils = jg_import("jgatt.utils.NumberUtils");

		this.NumberInterpolator = jg_extend(IInterpolator, function(NumberInterpolator, base)
		{

			// Public Properties

			this.snap = 0;

			// Constructor

			this.constructor = function(snap)
			{
				this.snap = (snap !== undefined) ? snap : 0;
			};

			// Public Methods

			this.interpolate = function(value1, value2, position)
			{
				var number1 = Number(value1);
				var number2 = Number(value2);

				var number = NumberUtils.interpolate(number1, number2, position);

				var snap = this.snap;
				if (snap > 0)
					number = Math.round(number / snap) * snap;

				return number;
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		this.Dictionary = jg_extend(Object, function(Dictionary, base)
		{

			// Private Static Constants

			var _HASH_KEY = "__jgatt_utils_Dictionary_hash";

			// Private Static Properties

			var _hashCount = 0;

			// Private Static Methods

			var _hash = function(value)
			{
				switch (typeof value)
				{
					case "number":
					case "boolean":
						return value + "";
					case "string":
						return "\"" + value + "\"";
					default:
						if (value === undefined)
							return "undefined";
						if (value === null)
							return "null";
						var hash = value[_HASH_KEY];
						if (!hash)
							hash = value[_HASH_KEY] = "#" + (++_hashCount);
						return hash;
				}
			};

			// Private Properties

			this._kvs = null;
			this._size = 0;

			// Constructor

			this.constructor = function()
			{
				this._kvs = {};
			};

			// Public Methods

			this.size = function()
			{
				return this._size;
			};

			this.get = function(key)
			{
				var hash = _hash(key);
				var kv = this._kvs[hash];
				if (!kv)
					return undefined;
				return kv.v;
			};

			this.set = function(key, value)
			{
				var hash = _hash(key);
				var kv = this._kvs[hash];
				if (!kv)
				{
					this._kvs[hash] = { k: key, v: value };
					this._size++;
					return value;
				}
				kv.v = value;
				return value;
			};

			this.del = function(key)
			{
				var hash = _hash(key);
				var kv = this._kvs[hash];
				if (!kv)
					return undefined;
				delete this._kvs[hash];
				this._size--;
				return kv.v;
			};

			this.has = function(key)
			{
				var hash = _hash(key);
				var kv = this._kvs[hash];
				return (kv != null);
			};

			this.keys = function()
			{
				var keys = [];
				var kvs = this._kvs;
				for (var hash in kvs)
				{
					if (kvs.hasOwnProperty(hash))
						keys.push(kvs[hash].k);
				}
				return keys;
			};

			this.values = function()
			{
				var values = [];
				var kvs = this._kvs;
				for (var hash in kvs)
				{
					if (kvs.hasOwnProperty(hash))
						values.push(kvs[hash].v);
				}
				return values;
			};

		});

	});

	jg_namespace("jgatt.motion", function()
	{

		var AbstractTween = jg_import("jgatt.motion.AbstractTween");
		var IInterpolator = jg_import("jgatt.motion.interpolators.IInterpolator");
		var NumberInterpolator = jg_import("jgatt.motion.interpolators.NumberInterpolator");
		var Dictionary = jg_import("jgatt.utils.Dictionary");

		this.MethodTween = jg_extend(AbstractTween, function(MethodTween, base)
		{

			// Private Static Constants

			var _DEFAULT_INTERPOLATOR = new NumberInterpolator();

			// Private Static Properties

			var _runningTargets = new Dictionary();

			// Private Properties

			this._target = null;
			this._getter = null;
			this._setter = null;
			this._startValue = null;
			this._endValue = null;
			this._interpolator = null;

			this._runningTarget = null;
			this._runningGetter = null;
			this._runningSetter = null;
			this._runningStartValue = null;
			this._runningEndValue = null;
			this._runningInterpolator= null;

			// Constructor

			this.constructor = function(target, getter, setter, startValue, endValue, easer, interpolator)
			{
				base.constructor.call(this, easer);

				if ((getter != null) && (typeof getter !== "function"))
					throw new Error("Parameter getter must be a function.");
				if ((setter != null) && (typeof setter !== "function"))
					throw new Error("Parameter setter must be a function.");
				if ((interpolator != null) && !(interpolator instanceof IInterpolator))
					throw new Error("Parameter interpolator must be an instance of jgatt.motion.interpolators.IInterpolator.");

				this._target = (target != null) ? target : null;
				this._getter = getter ? getter : null;
				this._setter = setter ? setter : null;
				this._startValue = (startValue != null) ? startValue : null;
				this._endValue = (endValue != null) ? endValue : null;
				this._interpolator = interpolator ? interpolator : null;
			};

			// Public Getters/Setters

			this.getTarget = function()
			{
				return this._target;
			};
			this.setTarget = function(value)
			{
				this._target = (value != null) ? value : null;
				this.endTween();
			};

			this.getGetter = function()
			{
				return this._getter;
			};
			this.setGetter = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter getter must be a function.");
				this._getter = value ? value : null;
				this.endTween();
			};

			this.getSetter = function()
			{
				return this._setter;
			};
			this.setSetter = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter setter must be a function.");
				this._setter = value ? value : null;
				this.endTween();
			};

			this.getStartValue = function()
			{
				return this._startValue;
			};
			this.setStartValue = function(value)
			{
				this._startValue = (value != null) ? value : null;
				this.endTween();
			};

			this.getEndValue = function()
			{
				return this._endValue;
			};
			this.setEndValue = function(value)
			{
				this._endValue = (value != null) ? value : null;
				this.endTween();
			};

			this.getInterpolator = function()
			{
				return this._interpolator;
			};
			this.setInterpolator = function(value)
			{
				if ((value != null) && !(value instanceof IInterpolator))
					throw new Error("Parameter interpolator must be an instance of jgatt.motion.interpolators.IInterpolator.");
				this._interpolator = value ? value : null;
				this.endTween();
			};

			// Protected Methods

			this.beginTweenOverride = function()
			{
				var target = this._target;
				if (target == null)
					return false;

				var getter = this._getter;
				if (getter == null)
					return false;

				var setter = this._setter;
				if (setter == null)
					return false;

				var endValue = this._endValue;
				if (endValue == null)
					return false;

				var startValue = this._startValue;
				if (startValue == null)
				{
					try
					{
						startValue = getter.call(target);
					}
					catch (e)
					{
						return false;
					}
				}

				var interpolator = this._interpolator;
				if (!interpolator)
					interpolator = _DEFAULT_INTERPOLATOR;

				this._runningTarget = target;
				this._runningGetter = getter;
				this._runningSetter = setter;
				this._runningStartValue = startValue;
				this._runningEndValue = endValue;
				this._runningInterpolator = interpolator;

				var runningSetters = _runningTargets.get(target);
				if (!runningSetters)
					runningSetters = _runningTargets.set(target, new Dictionary());

				var runningTween = runningSetters.get(setter);
				runningSetters.set(setter, this);

				if (runningTween)
					runningTween.endTween();

				return true;
			};

			this.endTweenOverride = function()
			{
				var target = this._runningTarget;
				var setter = this._runningSetter;

				this._runningTarget = null;
				this._runningGetter = null;
				this._runningSetter = null;
				this._runningStartValue = null;
				this._runningEndValue = null;
				this._runningInterpolator = null;

				var runningSetters = _runningTargets.get(target);
				if (runningSetters.get(setter) != this)
					return;

				runningSetters.del(setter);

				if (runningSetters.size() > 0)
					return;

				_runningTargets.del(target);
			};

			this.updateTweenOverride = function(position)
			{
				var value = this._runningInterpolator.interpolate(this._runningStartValue, this._runningEndValue, position);

				try
				{
					this._runningSetter.call(this._runningTarget, value);
				}
				catch (e)
				{
					return false;
				}

				return true;
			};

		});

	});

	jg_namespace("jgatt.motion", function()
	{

		var ITween = jg_import("jgatt.motion.ITween");
		var Dictionary = jg_import("jgatt.utils.Dictionary");

		this.TweenRunner = jg_static(function(TweenRunner)
		{

			// Private Static Properties

			var _tweenRunInfo = new Dictionary();
			var _tweenInterval = 0;
			var _tweenTime = 0;

			// Private Static Methods

			var _tweenStep = function()
			{
				var tweenTime = (new Date()).getTime() / 1000;

				var time = tweenTime - _tweenTime;
				if (time < 0)
					time = 0;
				else if (time > 0.1)
					time = 0.1;
				_tweenTime = tweenTime;

				var runInfos = _tweenRunInfo.values();
				var runInfo;
				var position;
				for (var i = 0, l = runInfos.length; i < l; i++)
				{
					runInfo = runInfos[i];

					runInfo.time += time;

					position = runInfo.time / runInfo.duration;
					if (position > 1)
						position = 1;

					if (!runInfo.tween.updateTween(position))
						position = 1;

					if (position == 1)
						TweenRunner.stop(runInfo.tween);
				}
			};

			// Public Static Methods

			TweenRunner.start = function(tween, duration)
			{
				if (tween == null)
					throw new Error("Parameter tween must be non-null.");
				if (!(tween instanceof ITween))
					throw new Error("Parameter tween must be an instance of jgatt.motion.ITween.");

				TweenRunner.stop(tween);

				if (!tween.beginTween())
					return false;

				if (!tween.updateTween(0))
				{
					tween.endTween();
				}
				else if (duration > 0)
				{
					var runInfo = _tweenRunInfo.set(tween, { tween: tween, duration: duration, time: 0 });
					if (_tweenRunInfo.size() == 1)
					{
						_tweenInterval = setInterval(_tweenStep, 1000 / 30);
						_tweenTime = (new Date()).getTime() / 1000;
					}
				}
				else
				{
					tween.updateTween(1);
					tween.endTween();
				}

				return true;
			};

			TweenRunner.stop = function(tween)
			{
				if (tween == null)
					throw new Error("Parameter tween must be non-null.");
				if (!(tween instanceof ITween))
					throw new Error("Parameter tween must be an instance of jgatt.motion.ITween.");

				var runInfo = _tweenRunInfo.get(tween);
				if (!runInfo)
					return false;

				_tweenRunInfo.del(tween);

				if (_tweenRunInfo.size() == 0)
					clearInterval(_tweenInterval);

				tween.endTween();

				return true;
			};

		});

	});

	jg_namespace("jgatt.motion.easers", function()
	{

		var IEaser = jg_import("jgatt.motion.easers.IEaser");

		this.AbstractEaser = jg_extend(IEaser, function(AbstractEaser, base)
		{

			// Public Properties

			this.direction = 1;

			// Constructor

			this.constructor = function(direction)
			{
				this.direction = (direction !== undefined) ? direction : 1;
			};

			// Public Methods

			this.ease = function(position)
			{
				if (this.direction > 0)
					return this.easeOverride(position);
				else if (this.direction < 0)
					return 1 - this.easeOverride(1 - position);

				if (position < 0.5)
					return this.easeOverride(position * 2) / 2;
				return 0.5 + (1 - this.easeOverride(2 - position * 2)) / 2;
			};

			// Protected Methods

			this.easeOverride = function(position)
			{
				return position;
			};

		});

	});

	jg_namespace("jgatt.motion.easers", function()
	{

		var AbstractEaser = jg_import("jgatt.motion.easers.AbstractEaser");

		this.CubicEaser = jg_extend(AbstractEaser, function(CubicEaser, base)
		{

			// Constructor

			this.constructor = function(direction)
			{
				base.constructor.call(this, direction);
			};

			// Protected Methods

			this.easeOverride = function(position)
			{
				return position * position * position;
			};

		});

	});

	jg_namespace("jgatt.motion.easers", function()
	{

		this.EaseDirection = jg_static(function(EaseDirection)
		{

			// Public Static Constants

			EaseDirection.IN = 1;
			EaseDirection.OUT = -1;
			EaseDirection.IN_OUT = 0;

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var Point = jg_import("jgatt.geom.Point");
		var IBrush = jg_import("jgatt.graphics.IBrush");

		this.DrawingUtils = jg_static(function(DrawingUtils)
		{

			// Public Static Methods

			DrawingUtils.arcTo = function(brush, startX, startY, startAngle, arcAngle, radius, radiusY)
			{
				if (brush == null)
					throw new Error("Parameter brush must be non-null.");
				if (!(brush instanceof IBrush))
					throw new Error("Parameter brush must be an instance of jgatt.graphics.IBrush.");

				if (arcAngle > 360)
					arcAngle = 360;
				else if (arcAngle < -360)
					arcAngle = -360;

				if (radiusY === undefined)
					radiusY = radius;

				var segs = Math.ceil(Math.abs(arcAngle) / 45);
				var segAngle = arcAngle / segs;
				var theta = (segAngle / 180) * Math.PI;
				var cosThetaMid = Math.cos(theta / 2);
				var angle = (startAngle / 180) * Math.PI;
				var angleMid;
				var ax = startX - Math.cos(angle) * radius;
				var ay = startY - Math.sin(angle) * radiusY;
				var bx;
				var by;
				var cx;
				var cy;
				var i;

				for (i = 0; i < segs; i++)
				{
					angle += theta;
					angleMid = angle - (theta / 2);
					bx = ax + Math.cos(angle) * radius;
					by = ay + Math.sin(angle) * radiusY;
					cx = ax + Math.cos(angleMid) * (radius / cosThetaMid);
					cy = ay + Math.sin(angleMid) * (radiusY / cosThetaMid);
					brush.curveTo(cx, cy, bx, by);
				}

				return new Point(bx, by);
			};

			DrawingUtils.drawRectangle = function(brush, x, y, width, height)
			{
				if (brush == null)
					throw new Error("Parameter brush must be non-null.");
				if (!(brush instanceof IBrush))
					throw new Error("Parameter brush must be an instance of jgatt.graphics.IBrush.");

				var x2 = x + width;
				var y2 = y + height;

				brush.moveTo(x, y);
				brush.lineTo(x2, y);
				brush.lineTo(x2, y2);
				brush.lineTo(x, y2);
				brush.lineTo(x, y);
			};

			DrawingUtils.drawEllipse = function(brush, x, y, radiusX, radiusY)
			{
				if (brush == null)
					throw new Error("Parameter brush must be non-null.");
				if (!(brush instanceof IBrush))
					throw new Error("Parameter brush must be an instance of jgatt.graphics.IBrush.");

				x += radiusX;

				brush.moveTo(x, y);
				DrawingUtils.arcTo(brush, x, y, 0, 360, radiusX, radiusY);
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var AbstractBrush = jg_import("jgatt.graphics.AbstractBrush");

		this.SolidFillBrush = jg_extend(AbstractBrush, function(SolidFillBrush, base)
		{

			// Private Properties

			this._color = 0x000000;
			this._alpha = 1;

			// Constructor

			this.constructor = function(color, alpha)
			{
				base.constructor.call(this);

				this._color = ((color != null) && !isNaN(color)) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;
				this._alpha = ((alpha != null) && !isNaN(alpha)) ? Math.min(Math.max(alpha, 0), 1) : 1;
			};

			// Public Getters/Setters

			this.getColor = function()
			{
				return this._color;
			};
			this.setColor = function(value)
			{
				this._color = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._color;
			};

			this.getAlpha = function()
			{
				return this._alpha;
			};
			this.setAlpha = function(value)
			{
				this._alpha = ((value != null) && !isNaN(value)) ? Math.min(Math.max(value, 0), 1) : this._alpha;
			};

			// Protected Methods

			this.draw = function(commands, graphics, matrix, bounds)
			{
				graphics.beginSolidFill(this._color, this._alpha);

				var numCommands = commands.length;
				var command;
				for (var i = 0; i < numCommands; i++)
				{
					command = commands[i];
					if (command.name == "moveTo")
						graphics.moveTo(command.x, command.y);
					else if (command.name == "lineTo")
						graphics.lineTo(command.x, command.y);
					else if (command.name == "curveTo")
						graphics.curveTo(command.controlX, command.controlY, command.anchorX, command.anchorY);
				}

				graphics.endFill();
			};

		});

	});

	jg_namespace("jgatt.graphics", function()
	{

		var AbstractBrush = jg_import("jgatt.graphics.AbstractBrush");

		this.SolidStrokeBrush = jg_extend(AbstractBrush, function(SolidStrokeBrush, base)
		{

			// Private Properties

			this._color = 0x000000;
			this._alpha = 1;
			this._thickness = 1;
			this._caps = "none";
			this._joints = "miter";
			this._miterLimit = 10;
			this._pixelHinting = true;

			// Constructor

			this.constructor = function(color, alpha, thickness, caps, joints, miterLimit, pixelHinting)
			{
				base.constructor.call(this);

				this._color = ((color != null) && !isNaN(color)) ? Math.min(Math.max(Math.floor(color), 0x000000), 0xFFFFFF) : 0x000000;
				this._alpha = ((alpha != null) && !isNaN(alpha)) ? Math.min(Math.max(alpha, 0), 1) : 1;
				this._thickness = ((thickness > 0) && (thickness < Infinity)) ? (thickness * 1) : 1;
				this._caps = ((caps == "none") || (caps == "round") || (caps == "square")) ? (caps + "") : "none";
				this._joints = ((joints == "miter") || (joints == "round") || (joints == "bevel")) ? (joints + "") : "miter";
				this._miterLimit = ((miterLimit > 0) && (miterLimit < Infinity)) ? (miterLimit * 1) : 10;
				this._pixelHinting = (pixelHinting != false);
			};

			// Public Getters/Setters

			this.getColor = function()
			{
				return this._color;
			};
			this.setColor = function(value)
			{
				this._color = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._color;
			};

			this.getAlpha = function()
			{
				return this._alpha;
			};
			this.setAlpha = function(value)
			{
				this._alpha = ((value != null) && !isNaN(value)) ? Math.min(Math.max(value, 0), 1) : this._alpha;
			};

			this.getThickness = function()
			{
				return this._thickness;
			};
			this.setThickness = function(value)
			{
				this._thickness = ((value > 0) && (value < Infinity)) ? (value * 1) : this._thickness;
			};

			this.getCaps = function()
			{
				return this._caps;
			};
			this.setCaps = function(value)
			{
				this._caps = ((value == "none") || (value == "round") || (value == "square")) ? (value + "") : this._caps;
			};

			this.getJoints = function()
			{
				return this._joints;
			};
			this.setJoints = function(value)
			{
				this._joints = ((value == "miter") || (value == "round") || (value == "bevel")) ? (value + "") : this._joints;
			};

			this.getMiterLimit = function()
			{
				return this._miterLimit;
			};
			this.setMiterLimit = function(value)
			{
				this._miterLimit = ((value > 0) && (value < Infinity)) ? (value * 1) : this._miterLimit;
			};

			this.getPixelHinting = function()
			{
				return this._pixelHinting;
			};
			this.setPixelHinting = function(value)
			{
				this._pixelHinting = (value != false);
			};

			// Protected Methods

			this.draw = function(commands, graphics, matrix, bounds)
			{
				graphics.setStrokeStyle(this._thickness, this._caps, this._joints, this._miterLimit, this._pixelHinting);
				graphics.beginSolidStroke(this._color, this._alpha);

				var numCommands = commands.length;
				var command;
				for (var i = 0; i < numCommands; i++)
				{
					command = commands[i];
					if (command.name == "moveTo")
						graphics.moveTo(command.x, command.y);
					else if (command.name == "lineTo")
						graphics.lineTo(command.x, command.y);
					else if (command.name == "curveTo")
						graphics.curveTo(command.controlX, command.controlY, command.anchorX, command.anchorY);
				}

				graphics.endStroke();
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		this.StringUtils = jg_static(function(StringUtils)
		{

			// Public Static Methods

			StringUtils.escapeHTML = function(str)
			{
				if (str == null)
					return str;

				str = String(str);

				return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var NumberUtils = jg_import("jgatt.utils.NumberUtils");

		this.LogScale = jg_extend(Object, function(LogScale, base)
		{

			// Private Properties

			this._base = 0;
			this._baseMultiplier = 0;

			// Constructor

			this.constructor = function(base)
			{
				this.setBase((base !== undefined) ? base : 10);
			};

			// Public Getters/Setters

			this.getBase = function()
			{
				return this._base;
			};
			this.setBase = function(value)
			{
				this._base = value;
				this._baseMultiplier = Math.log(this._base);
			};

			// Public Methods

			this.valueToScale = function(value)
			{
				if (this._base <= 1)
					return 0;

				var scale = 0;

				var isNegative = (value < 0);

				if (isNegative)
					value = -value;

				if (value < this._base)
					value += (this._base - value) / this._base;
				scale = Math.log(value) / this._baseMultiplier;

				scale = NumberUtils.toPrecision(scale, -1);

				if (isNegative)
					scale = -scale;

				return scale;
			};

			this.scaleToValue = function(scale)
			{
				if (this._base <= 1)
					return 0;

				var value = 0;

				var isNegative = (scale < 0);

				if (isNegative)
					scale = -scale;

				value = Math.exp(scale * this._baseMultiplier);
				if (value < this._base)
					value = this._base * (value - 1) / (this._base - 1);

				value = NumberUtils.toPrecision(value, -1);

				if (isNegative)
					value = -value;

				return value;
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		this.MEventDispatcher = jg_static(function()
		{

			// Public Properties

			this.isEventDispatcher = true;

			// Private Properties

			this._eventListeners = null;

			// Public Methods

			this.addEventListener = function(eventName, listener)
			{
				if (eventName == null)
					throw new Error("Parameter eventName must be non-null.");
				if (typeof eventName !== "string")
					throw new Error("Parameter eventName must be a string.");
				if (listener == null)
					throw new Error("Parameter listener must be non-null.");
				if (typeof listener !== "function")
					throw new Error("Parameter listener must be a function.");

				var eventListeners = this._eventListeners;
				if (!eventListeners)
					eventListeners = this._eventListeners = {};

				var listeners = eventListeners[eventName];
				if (!listeners)
					listeners = eventListeners[eventName] = [];

				for (var i = 0, l = listeners.length; i < l; i++)
				{
					if (listeners[i] === listener)
						return;
				}

				listeners.push(listener);
			};

			this.removeEventListener = function(eventName, listener)
			{
				if (eventName == null)
					throw new Error("Parameter eventName must be non-null.");
				if (typeof eventName !== "string")
					throw new Error("Parameter eventName must be a string.");
				if (listener == null)
					throw new Error("Parameter listener must be non-null.");
				if (typeof listener !== "function")
					throw new Error("Parameter listener must be a function.");

				var eventListeners = this._eventListeners;
				if (!eventListeners)
					return;

				var listeners = eventListeners[eventName];
				if (!listeners)
					return;

				for (var i = 0, l = listeners.length; i < l; i++)
				{
					if (listeners[i] === listener)
					{
						listeners.splice(i, 1);
						return;
					}
				}
			};

			this.hasEventListener = function(eventName)
			{
				if (eventName == null)
					throw new Error("Parameter eventName must be non-null.");
				if (typeof eventName !== "string")
					throw new Error("Parameter eventName must be a string.");

				var eventListeners = this._eventListeners;
				if (!eventListeners)
					return false;

				var listeners = eventListeners[eventName];
				if (!listeners)
					return false;

				return (listeners.length > 0);
			};

			this.dispatchEvent = function(eventName)
			{
				if (eventName == null)
					throw new Error("Parameter eventName must be non-null.");
				if (typeof eventName !== "string")
					throw new Error("Parameter eventName must be a string.");

				var eventListeners = this._eventListeners;
				if (!eventListeners)
					return;

				var listeners = eventListeners[eventName];
				if (!listeners)
					return;

				var i, l;

				var params = [];
				for (i = 1, l = arguments.length; i < l; i++)
					params.push(arguments[i]);

				listeners = listeners.concat();
				for (i = 0, l = listeners.length; i < l; i++)
					listeners[i].apply(null, params);
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var Point = jg_import("jgatt.geom.Point");
		var Graphics = jg_import("jgatt.graphics.Graphics");
		var MEventDispatcher = jg_import("splunk.charting.MEventDispatcher");

		this.VisualObject = jg_extend(Object, function(VisualObject, base)
		{

			base = jg_mixin(this, MEventDispatcher, base);

			// Events

			//invalidated
			//validated

			// Public Properties

			this.element = null;
			this.graphics = null;

			// Private Properties

			this._x = 0;
			this._y = 0;
			this._width = 0;
			this._height = 0;

			this._passes = null;
			this._invalidPasses = null;
			this._validateDelegate = null;
			this._validateTimeout = 0;
			this._isValidating = false;

			this._parentElement = null;

			// Constructor

			this.constructor = function(passes)
			{
				base.constructor.call(this);

				this._passes = (passes instanceof Array) ? passes.concat() : [ "render" ];
				this._invalidPasses = {};
				this._validateDelegate = jg_delegate(this, "validate");

				this.element = document.createElement("div");
				$(this.element).addClass("VisualObject");
				$(this.element).css({ position: "absolute", left: "0px", top: "0px" });

				this.graphics = new Graphics(this._width, this._height);
				this.graphics.appendTo(this.element);
			};

			// Public Getters/Setters

			this.getX = function()
			{
				return this._x;
			};
			this.setX = function(value)
			{
				value = ((value > -Infinity) && (value < Infinity)) ? Number(value) : 0;
				this._x = value;
				$(this.element).css({ left: value + "px" });
			};

			this.getY = function()
			{
				return this._y;
			};
			this.setY = function(value)
			{
				value = ((value > -Infinity) && (value < Infinity)) ? Number(value) : 0;
				this._y = value;
				$(this.element).css({ top: value + "px" });
			};

			this.getWidth = function()
			{
				return this._width;
			};
			this.setWidth = function(value)
			{
				value = ((value > 0) && (value < Infinity)) ? Number(value) : 0;
				if (value === this._width)
					return;
				this._width = value;
				this.invalidate("render");
			};

			this.getHeight = function()
			{
				return this._height;
			};
			this.setHeight = function(value)
			{
				value = ((value > 0) && (value < Infinity)) ? Number(value) : 0;
				if (value === this._height)
					return;
				this._height = value;
				this.invalidate("render");
			};

			// Public Methods

			this.invalidate = function(pass)
			{
				if (!pass)
					throw new Error("Parameter pass must be non-null.");

				if (this._invalidPasses[pass])
					return;

				this._invalidPasses[pass] = true;

				if (!this._validateTimeout)
					this._validateTimeout = setTimeout(this._validateDelegate, 1);

				this.dispatchEvent("invalidated", pass);
			};

			this.validate = function(pass)
			{
				if (!this._validateTimeout || this._isValidating)
					return;

				try
				{
					if (typeof pass !== "string")  // pass is a number when called by setTimeout
						pass = null;

					if (pass == null)
						this._isValidating = true;

					var passes = this._passes;
					var numPasses = passes ? passes.length : 0;
					var pass2;
					for (var i = 0; i < numPasses; i++)
					{
						pass2 = passes[i];
						if (!this.isValid(pass2))
						{
							this[pass2].call(this);
							this.setValid(pass2);
						}
						if ((pass != null) && (pass == pass2))
							return;
					}
				}
				finally
				{
					if (pass == null)
					{
						clearTimeout(this._validateTimeout);
						this._validateTimeout = 0;
						this._isValidating = false;
					}
				}
			};

			this.setValid = function(pass)
			{
				if (!pass)
					throw new Error("Parameter pass must be non-null.");

				if (!this._invalidPasses[pass])
					return;

				delete this._invalidPasses[pass];

				this.dispatchEvent("validated", pass);
			};

			this.isValid = function(pass)
			{
				if (!pass)
					throw new Error("Parameter pass must be non-null.");

				return !this._invalidPasses[pass];
			};

			this.appendTo = function(parentElement)
			{
				if (!parentElement)
					throw new Error("Parameter parentElement must be non-null.");

				if (parentElement instanceof VisualObject)
					parentElement = parentElement.element;

				if (parentElement === this._parentElement)
					return true;

				this.remove();

				parentElement.appendChild(this.element);

				this._parentElement = parentElement;

				this.invalidate("render");
				this.appendToOverride(this.element);
				this.validate();
			};

			this.appendToOverride = function(element)
			{
			};

			this.remove = function()
			{
				if (!this._parentElement)
					return false;

				this.removeOverride(this.element);

				var parentNode = this.element.parentNode;
				if (parentNode)
					parentNode.removeChild(this.element);

				this._parentElement = null;

				return true;
			};

			this.removeOverride = function(element)
			{
			};

			this.render = function()
			{
				if (this.isValid("render"))
					return;

				this.graphics.setSize(this._width, this._height);

				this.renderOverride(this._width, this._height);

				this.setValid("render");
			};

			this.renderOverride = function(width, height)
			{
			};

			this.localToGlobal = function(point)
			{
				if (point == null)
					throw new Error("Parameter point must be non-null.");
				if (!(point instanceof Point))
					throw new Error("Parameter point must be of type jgatt.geom.Point.");

				var offset = $(this.element).offset();
				return new Point(point.x + offset.left, point.y + offset.top);
			};

			this.globalToLocal = function(point)
			{
				if (point == null)
					throw new Error("Parameter point must be non-null.");
				if (!(point instanceof Point))
					throw new Error("Parameter point must be of type jgatt.geom.Point.");

				var offset = $(this.element).offset();
				return new Point(point.x - offset.left, point.y - offset.top);
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var Point = jg_import("jgatt.geom.Point");
		var Rectangle = jg_import("jgatt.geom.Rectangle");
		var DrawingUtils = jg_import("jgatt.graphics.DrawingUtils");
		var Graphics = jg_import("jgatt.graphics.Graphics");
		var IBrush = jg_import("jgatt.graphics.IBrush");
		var SolidFillBrush = jg_import("jgatt.graphics.SolidFillBrush");
		var ArrayUtils = jg_import("jgatt.utils.ArrayUtils");
		var IComparator = jg_import("jgatt.utils.IComparator");
		var NumberUtils = jg_import("jgatt.utils.NumberUtils");
		var LogScale = jg_import("splunk.charting.LogScale");
		var VisualObject = jg_import("splunk.charting.VisualObject");
		var DateTime = jg_import("splunk.time.DateTime");

		this.Histogram = jg_extend(VisualObject, function(Histogram, base)
		{

			// Events

			//rangeXChanged
			//rangeYChanged
			//containedRangeXChanged
			//containedRangeYChanged

			// Private Properties

			this._data = null;
			this._brush = null;
			this._minimumX = null;
			this._maximumX = null;
			this._minimumY = null;
			this._maximumY = null;
			this._scaleY = null;
			this._containedMinimumX = 0;
			this._containedMaximumX = 0;
			this._containedMinimumY = 0;
			this._containedMaximumY = 100;
			this._actualMinimumX = 0;
			this._actualMaximumX = 0;
			this._actualMinimumY = 0;
			this._actualMaximumY = 100;

			this._actualRangeX = 0;
			this._actualRangeY = 100;
			this._actualScaleY = null;
			this._valueDatasX = null;
			this._valueDatasY = null;
			this._renderDatas = null;
			this._sortComparator = null;
			this._searchComparator = null;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this, [ "processData", "updateRangeX", "updateRangeY", "render" ]);

				$(this.element).addClass("Histogram");

				var now = new DateTime();
				now = now.toUTC();
				now.setMinutes(0);
				now.setSeconds(0);
				this._containedMinimumX = now.getTime();
				this._containedMaximumX = now.getTime() + 3600;
				this._actualMinimumX = this._containedMinimumX;
				this._actualMaximumX = this._containedMaximumX;
				this._actualRangeX = this._actualMaximumX - this._actualMinimumX;

				this._valueDatasX = [];
				this._valueDatasY = [];
				this._renderDatas = [];
				this._sortComparator = new SortComparator();
				this._searchComparator = new SearchComparator();
			};

			// Public Getters/Setters

			this.getData = function()
			{
				return this._data;
			};
			this.setData = function(value)
			{
				this._data = value;
				this.invalidate("processData");
			};

			this.getBrush = function()
			{
				return this._brush;
			};
			this.setBrush = function(value)
			{
				if ((value != null) && !(value instanceof IBrush))
					throw new Error("Parameter brush must be of type jgatt.graphics.IBrush.");
				this._brush = value;
				this.invalidate("render");
			};

			this.getMinimumX = function()
			{
				return this._minimumX;
			};
			this.setMinimumX = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? Number(value) : null;
				if (value === this._minimumX)
					return;
				this._minimumX = value;
				this.invalidate("updateRangeX");
			};

			this.getMaximumX = function()
			{
				return this._maximumX;
			};
			this.setMaximumX = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? Number(value) : null;
				if (value === this._maximumX)
					return;
				this._maximumX = value;
				this.invalidate("updateRangeX");
			};

			this.getMinimumY = function()
			{
				return this.valueToAbsoluteY(this._minimumY);
			};
			this.setMinimumY = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? this.absoluteToValueY(Number(value)) : null;
				if (value === this._minimumY)
					return;
				this._minimumY = value;
				this.invalidate("updateRangeY");
			};

			this.getMaximumY = function()
			{
				return this.valueToAbsoluteY(this._maximumY);
			};
			this.setMaximumY = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? this.absoluteToValueY(Number(value)) : null;
				if (value === this._maximumY)
					return;
				this._maximumY = value;
				this.invalidate("updateRangeY");
			};

			this.getScaleY = function()
			{
				return this._scaleY;
			};
			this.setScaleY = function(value)
			{
				if ((value != null) && !(value instanceof LogScale))
					throw new Error("Parameter scaleY must be of type splunk.charting.LogScale.");
				this._scaleY = value;
				this.invalidate("processData");
			};

			this.getContainedMinimumX = function()
			{
				this.validate("updateRangeX");
				return this._containedMinimumX;
			};

			this.getContainedMaximumX = function()
			{
				this.validate("updateRangeX");
				return this._containedMaximumX;
			};

			this.getContainedMinimumY = function()
			{
				this.validate("updateRangeY");
				return this._containedMinimumY;
			};

			this.getContainedMaximumY = function()
			{
				this.validate("updateRangeY");
				return this._containedMaximumY;
			};

			this.getActualMinimumX = function()
			{
				this.validate("updateRangeX");
				return this._actualMinimumX;
			};

			this.getActualMaximumX = function()
			{
				this.validate("updateRangeX");
				return this._actualMaximumX;
			};

			this.getActualMinimumY = function()
			{
				this.validate("updateRangeY");
				return this._actualMinimumY;
			};

			this.getActualMaximumY = function()
			{
				this.validate("updateRangeY");
				return this._actualMaximumY;
			};

			// Public Methods

			this.processData = function()
			{
				if (this.isValid("processData"))
					return;

				this.invalidate("updateRangeX");
				this.invalidate("updateRangeY");

				var valueDatasX = this._valueDatasX = [];
				var valueDatasY = this._valueDatasY = [];
				var renderDatas = this._renderDatas = [];

				var buckets = this._data;
				var numBuckets = buckets ? buckets.length : 0;
				if (numBuckets > 0)
				{
					var bucket;
					var valueDataX1;
					var valueDataX2;
					var valueDataY1;
					var valueDataY2 = { value: 0, absolute: this.valueToAbsoluteY(0) };
					var renderData;
					var i;

					valueDatasY.push(valueDataY2);

					for (i = 0; i < numBuckets; i++)
					{
						bucket = buckets[i];

						valueDataX1 = { value: bucket.x1, absolute: this.valueToAbsoluteX(bucket.x1) };
						valueDataX2 = { value: bucket.x2, absolute: this.valueToAbsoluteX(bucket.x2) };
						valueDataY1 = { value: bucket.y, absolute: this.valueToAbsoluteY(bucket.y) };

						if ((valueDataX1.absolute > -Infinity) && (valueDataX1.absolute < Infinity) &&
						    (valueDataX2.absolute > -Infinity) && (valueDataX2.absolute < Infinity) &&
						    (valueDataY1.absolute > -Infinity) && (valueDataY1.absolute < Infinity))
						{
							renderData = { valueDataX1: valueDataX1, valueDataX2: valueDataX2, valueDataY1: valueDataY1, valueDataY2: valueDataY2 };
							renderData.data = { x1: valueDataX1.value, x2: valueDataX2.value, y: valueDataY1.value };
							renderData.bounds = null;

							valueDatasX.push(valueDataX1);
							valueDatasX.push(valueDataX2);
							valueDatasY.push(valueDataY1);
							renderDatas.push(renderData);
						}
					}
				}

				this.setValid("processData");
			};

			this.updateRangeX = function()
			{
				if (this.isValid("updateRangeX"))
					return;

				this.invalidate("render");

				var valueDatasX = this._valueDatasX;
				var numValueDatasX = valueDatasX.length;
				var valueDataX1;
				var minimumX = Infinity;
				var maximumX = -Infinity;
				var i;

				for (i = 0; i < numValueDatasX; i++)
				{
					valueDataX1 = valueDatasX[i];
					if (valueDataX1.absolute < minimumX)
						minimumX = valueDataX1.absolute;
					if (valueDataX1.absolute > maximumX)
						maximumX = valueDataX1.absolute;
				}

				if (minimumX == Infinity)
				{
					// default range is current hour
					var now = new DateTime();
					now = now.toUTC();
					now.setMinutes(0);
					now.setSeconds(0);
					minimumX = now.getTime();
					maximumX = now.getTime() + 3600;
				}

				var containedRangeXChanged = ((minimumX != this._containedMinimumX) || (maximumX != this._containedMaximumX));

				this._containedMinimumX = minimumX;
				this._containedMaximumX = maximumX;

				if (this._minimumX != null)
					minimumX = this._minimumX;
				if (this._maximumX != null)
					maximumX = this._maximumX;

				if (minimumX > maximumX)
				{
					var temp = minimumX;
					minimumX = maximumX;
					maximumX = temp;
				}

				var rangeX = maximumX - minimumX;
				for (i = 0; i < numValueDatasX; i++)
				{
					valueDataX1 = valueDatasX[i];
					valueDataX1.relative = (rangeX > 0) ? (valueDataX1.absolute - minimumX) / rangeX : 0;
				}

				ArrayUtils.sort(this._renderDatas, this._sortComparator);

				var rangeXChanged = ((minimumX != this._actualMinimumX) || (maximumX != this._actualMaximumX));

				this._actualMinimumX = minimumX;
				this._actualMaximumX = maximumX;
				this._actualRangeX = rangeX;

				this.setValid("updateRangeX");

				if (containedRangeXChanged)
					this.dispatchEvent("containedRangeXChanged");
				if (rangeXChanged)
					this.dispatchEvent("rangeXChanged");
			};

			this.updateRangeY = function()
			{
				if (this.isValid("updateRangeY"))
					return;

				this.invalidate("render");

				var valueDatasY = this._valueDatasY;
				var numValueDatasY = valueDatasY.length;
				var valueDataY1;
				var minimumY = Infinity;
				var maximumY = -Infinity;
				var i;

				for (i = 0; i < numValueDatasY; i++)
				{
					valueDataY1 = valueDatasY[i];
					if (valueDataY1.absolute < minimumY)
						minimumY = valueDataY1.absolute;
					if (valueDataY1.absolute > maximumY)
						maximumY = valueDataY1.absolute;
				}

				if (minimumY == Infinity)
				{
					// default range is 0-100
					minimumY = this.valueToAbsoluteY(0);
					maximumY = this.valueToAbsoluteY(100);
				}
				else
				{
					// extend range to round units
					var maxUnits = 50;
					var extendedMinimumY = minimumY;
					var extendedMaximumY = maximumY;
					var unit;
					var numUnits;
					for (i = 0; i < 2; i++)
					{
						unit = this._computeAutoUnits(extendedMaximumY - extendedMinimumY);

						// verify unit is greater than zero
						if (unit <= 0)
							break;

						// snap unit to integer if required
						if ((extendedMaximumY - extendedMinimumY) >= 1)
							unit = Math.max(Math.round(unit), 1);

						// scale unit if numUnits is greater than maxUnits
						numUnits = 1 + Math.floor((extendedMaximumY - extendedMinimumY) / unit);
						unit *= Math.ceil(numUnits / maxUnits);

						// snap minimumY and maximumY to unit
						extendedMinimumY = Math.ceil(minimumY / unit) * unit;
						if (extendedMinimumY != minimumY)
							extendedMinimumY -= unit;
						extendedMaximumY = Math.ceil(maximumY / unit) * unit;
					}
					minimumY = extendedMinimumY;
					maximumY = extendedMaximumY;
				}

				var containedRangeYChanged = ((minimumY != this._containedMinimumY) || (maximumY != this._containedMaximumY));

				this._containedMinimumY = minimumY;
				this._containedMaximumY = maximumY;

				if (this._minimumY != null)
					minimumY = this.valueToAbsoluteY(this._minimumY);
				if (this._maximumY != null)
					maximumY = this.valueToAbsoluteY(this._maximumY);

				if (minimumY > maximumY)
				{
					var temp = minimumY;
					minimumY = maximumY;
					maximumY = temp;
				}

				var rangeY = maximumY - minimumY;
				for (i = 0; i < numValueDatasY; i++)
				{
					valueDataY1 = valueDatasY[i];
					valueDataY1.relative = (rangeY > 0) ? (valueDataY1.absolute - minimumY) / rangeY : 0;
				}
				var scaleY = this._scaleY;

				var rangeYChanged = ((minimumY != this._actualMinimumY) || (maximumY != this._actualMaximumY) || (scaleY != this._actualScaleY));

				this._actualMinimumY = minimumY;
				this._actualMaximumY = maximumY;
				this._actualRangeY = rangeY;
				this._actualScaleY = scaleY;

				this.setValid("updateRangeY");

				if (containedRangeYChanged)
					this.dispatchEvent("containedRangeYChanged");
				if (rangeYChanged)
					this.dispatchEvent("rangeYChanged");
			};

			this.renderOverride = function(width, height)
			{
				var valueDatasX = this._valueDatasX;
				var valueDatasY = this._valueDatasY;
				var renderDatas = this._renderDatas;
				var numValueDatasX = valueDatasX.length;
				var numValueDatasY = valueDatasY.length;
				var numRenderDatas = renderDatas.length;
				var valueDataX1;
				var valueDataX2;
				var valueDataY1;
				var valueDataY2;
				var renderData;
				var i;

				for (i = 0; i < numValueDatasX; i++)
				{
					valueDataX1 = valueDatasX[i];
					valueDataX1.pixel = Math.round(width * valueDataX1.relative);
				}

				for (i = 0; i < numValueDatasY; i++)
				{
					valueDataY1 = valueDatasY[i];
					valueDataY1.pixel = Math.round(height * (1 - valueDataY1.relative));
				}

				var zeroData = (valueDatasY.length > 0) ? valueDatasY[0] : null;
				var zeroPixel = zeroData ? zeroData.pixel : height;
				var brushBounds1 = [ new Point(0, 0), new Point(width, 0), new Point(width, zeroPixel), new Point(0, zeroPixel) ];
				var brushBounds2 = [ new Point(0, zeroPixel), new Point(width, zeroPixel), new Point(width, height), new Point(0, height) ];
				var brushBounds;
				var x1;
				var x2;
				var y1;
				var y2;
				var temp;

				var brush = this._brush ? this._brush : new SolidFillBrush(0x000000, 1);

				var graphics = this.graphics;
				graphics.clear();

				for (i = 0; i < numRenderDatas; i++)
				{
					renderData = renderDatas[i];
					valueDataX1 = renderData.valueDataX1;
					valueDataX2 = renderData.valueDataX2;
					valueDataY1 = renderData.valueDataY1;
					valueDataY2 = renderData.valueDataY2;

					if ((Math.max(valueDataX1.relative, valueDataX2.relative) < 0) ||
					    (Math.min(valueDataX1.relative, valueDataX2.relative) > 1) ||
					    (Math.max(valueDataY1.relative, valueDataY2.relative) < 0) ||
					    (Math.min(valueDataY1.relative, valueDataY2.relative) > 1))
						continue;

					x1 = valueDataX1.pixel;
					x2 = valueDataX2.pixel;
					y1 = valueDataY1.pixel;
					y2 = valueDataY2.pixel;

					if (x1 < x2)
						x1++;
					else
						x2++;

					if (x1 == x2)
					{
						if (valueDataX1.relative < valueDataX2.relative)
							x2++;
						else if (valueDataX1.relative > valueDataX2.relative)
							x2--;
					}

					if (y1 == y2)
					{
						if (valueDataY1.relative < valueDataY2.relative)
							y1++;
						else if (valueDataY1.relative > valueDataY2.relative)
							y1--;
					}

					if (x1 > x2)
					{
						temp = x1;
						x1 = x2;
						x2 = temp;
					}

					renderData.bounds = new Rectangle(x1, y1, x2 - x1, 0);

					brushBounds = (y1 <= y2) ? brushBounds1 : brushBounds2;

					brush.beginBrush(graphics, null, brushBounds);
					DrawingUtils.drawRectangle(brush, x1, y1, x2 - x1, y2 - y1);
					brush.endBrush();
				}
			};

			this.valueToAbsoluteX = function(value)
			{
				if (value == null)
					return NaN;
				if (value instanceof DateTime)
					return value.getTime();
				if (value instanceof Date)
					return (value.getTime() / 1000);
				if (typeof value === "string")
				{
					if (!value)
						return NaN;
					var num = Number(value);
					if (!isNaN(num))
						return ((num > -Infinity) && (num < Infinity)) ? num : NaN;
					var date = new DateTime(value);
					return date.getTime();
				}
				if (typeof value === "number")
					return ((value > -Infinity) && (value < Infinity)) ? value : NaN;
				return NaN;
			};

			this.absoluteToValueX = function(absolute)
			{
				if ((absolute > -Infinity) && (absolute < Infinity))
					return (new DateTime(absolute)).toUTC();
				return null;
			};

			this.absoluteToRelativeX = function(absolute)
			{
				return (absolute - this._actualMinimumX) / this._actualRangeX;
			};

			this.relativeToAbsoluteX = function(relative)
			{
				return this._actualMinimumX + this._actualRangeX * relative;
			};

			this.valueToAbsoluteY = function(value)
			{
				var scaleY = this._scaleY;
				if (scaleY)
					return scaleY.valueToScale(NumberUtils.parseNumber(value));
				return NumberUtils.parseNumber(value);
			};

			this.absoluteToValueY = function(absolute)
			{
				if ((absolute > -Infinity) && (absolute < Infinity))
				{
					var scaleY = this._scaleY;
					if (scaleY)
						return scaleY.scaleToValue(Number(absolute));
					return Number(absolute);
				}
				return NaN;
			};

			this.absoluteToRelativeY = function(absolute)
			{
				return (absolute - this._actualMinimumY) / this._actualRangeY;
			};

			this.relativeToAbsoluteY = function(relative)
			{
				return this._actualMinimumY + this._actualRangeY * relative;
			};

			this.getDataUnderPoint = function(x, y)
			{
				this.validate("render");

				if ((y < 0) || (y > this.getHeight()))
					return null;

				var index = ArrayUtils.binarySearch(this._renderDatas, x / this.getWidth(), this._searchComparator);
				if (index < 0)
					return null;

				var renderData = this._renderDatas[index];
				return { data: renderData.data, bounds: renderData.bounds };
			};

			// Private Methods

			this._computeAutoUnits = function(range)
			{
				if (range <= 0)
					return 0;

				var significand = range / 10;
				var exponent = 0;

				if (significand > 0)
				{
					var str = significand.toExponential(20);
					var eIndex = str.indexOf("e");
					if (eIndex >= 0)
					{
						significand = Number(str.substring(0, eIndex));
						exponent = Number(str.substring(eIndex + 1, str.length));
					}
				}

				significand = Math.ceil(significand);

				if (significand > 5)
					significand = 10;
				else if (significand > 2)
					significand = 5;

				return significand * Math.pow(10, exponent);
			};

		});

		// Private Classes

		var SortComparator = jg_extend(IComparator, function(SortComparator, base)
		{

			// Public Methods

			this.compare = function(renderData1, renderData2)
			{
				var x11 = renderData1.valueDataX1.relative;
				var x21 = renderData2.valueDataX1.relative;
				if (x11 < x21)
					return -1;
				if (x11 > x21)
					return 1;
				return 0;
			};

		});

		var SearchComparator = jg_extend(IComparator, function(SearchComparator, base)
		{

			// Public Methods

			this.compare = function(x, renderData)
			{
				var x1 = renderData.valueDataX1.relative;
				var x2 = renderData.valueDataX2.relative;
				if (x < x1)
					return -1;
				if (x >= x2)
					return 1;
				return 0;
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");
		var DrawingUtils = jg_import("jgatt.graphics.DrawingUtils");
		var GradientFillBrush = jg_import("jgatt.graphics.GradientFillBrush");
		var Graphics = jg_import("jgatt.graphics.Graphics");
		var SolidFillBrush = jg_import("jgatt.graphics.SolidFillBrush");
		var SolidStrokeBrush = jg_import("jgatt.graphics.SolidStrokeBrush");
		var MethodTween = jg_import("jgatt.motion.MethodTween");
		var TweenRunner = jg_import("jgatt.motion.TweenRunner");
		var CubicEaser = jg_import("jgatt.motion.easers.CubicEaser");
		var EaseDirection = jg_import("jgatt.motion.easers.EaseDirection");
		var NumberUtils = jg_import("jgatt.utils.NumberUtils");
		var StringUtils = jg_import("jgatt.utils.StringUtils");
		var Histogram = jg_import("splunk.charting.Histogram");
		var VisualObject = jg_import("splunk.charting.VisualObject");

		this.ClickDragRangeMarker = jg_extend(VisualObject, function(ClickDragRangeMarker, base)
		{

			// Events

			//rangeChanged
			//dragStart
			//dragComplete

			// Private Properties

			this._foregroundColor = 0x000000;
			this._histogram = null;
			this._minimum = null;
			this._maximum = null;
			this._minimumSnap = null;
			this._maximumSnap = null;
			this._minimumFormat = null;
			this._maximumFormat = null;
			this._rangeFormat = null;
			this._actualMinimum = null;
			this._actualMaximum = null;
			this._isDragging = false;

			this._relativeMinimum = 0;
			this._relativeMaximum = 1;
			this._fillBrush = null;
			this._lineBrush = null;
			this._backgroundBrush = null;
			this._controlsGraphics = null;
			this._minimumLabel = null;
			this._maximumLabel = null;
			this._rangeLabel = null;
			this._rangeLabelClip = null;
			this._controlsContainer = null;
			this._pressMouseX = 0;
			this._showPosition = 0;
			this._areControlsVisible = false;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this, [ "updateRange", "render" ]);

				$(this.element).addClass("ClickDragRangeMarker");

				this._self_mouseOver = jg_delegate(this, this._self_mouseOver);
				this._self_mouseOut = jg_delegate(this, this._self_mouseOut);
				this._self_mouseMove = jg_delegate(this, this._self_mouseMove);
				this._self_mouseDown = jg_delegate(this, this._self_mouseDown);
				this._document_mouseUp = jg_delegate(this, this._document_mouseUp);
				this._document_mouseMove = jg_delegate(this, this._document_mouseMove);
				this._document_mouseLeave = jg_delegate(this, this._document_mouseLeave);
				this._histogram_rangeXChanged = jg_delegate(this, this._histogram_rangeXChanged);

				this._fillBrush = new GradientFillBrush("linear", [ 0xD1D1D1, 0xB8B8B8 ], [ 1, 1 ], [ 0, 1 ]);
				this._fillBrush.setTileTransform(new Matrix(0, 1, -1, 0));

				this._lineBrush = new SolidStrokeBrush(this._foregroundColor, 0.4, 1, "square");

				this._backgroundBrush = new SolidFillBrush(0xEAEAEA, 0.66);

				this._controlsGraphics = new Graphics();

				this._minimumLabel = document.createElement("span");
				$(this._minimumLabel).addClass("label");
				$(this._minimumLabel).css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });

				this._maximumLabel = document.createElement("span");
				$(this._maximumLabel).addClass("label");
				$(this._maximumLabel).css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });

				this._rangeLabel = document.createElement("span");
				$(this._rangeLabel).addClass("label");
				$(this._rangeLabel).css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });

				this._rangeLabelClip = document.createElement("div");
				this._rangeLabelClip.appendChild(this._rangeLabel);
				$(this._rangeLabelClip).css({ position: "absolute", left: "0px", top: "0px", margin: "0px", padding: "0px", overflow: "hidden" });

				this._controlsContainer = document.createElement("div");
				this._controlsGraphics.appendTo(this._controlsContainer);
				this._controlsContainer.appendChild(this._minimumLabel);
				this._controlsContainer.appendChild(this._maximumLabel);
				this._controlsContainer.appendChild(this._rangeLabelClip);
				$(this._controlsContainer).css({ position: "absolute", left: "0px", top: "0px", margin: "0px", padding: "0px" });

				$(this.element).bind("mouseover", this._self_mouseOver);
				$(this.element).bind("mouseout", this._self_mouseOut);
				$(this.element).bind("mousemove", this._self_mouseMove);
				$(this.element).bind("mousedown", this._self_mouseDown);

				this.element.appendChild(this._controlsContainer);
			};

			// Public Getters/Setters

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._foregroundColor;
				if (value === this._foregroundColor)
					return;
				this._foregroundColor = value;
				this.invalidate("render");
			};

			this.getHistogram = function()
			{
				return this._histogram;
			};
			this.setHistogram = function(value)
			{
				if ((value != null) && !(value instanceof Histogram))
					throw new Error("Parameter histogram must be of type splunk.charting.Histogram.");

				if (this._histogram)
					this._histogram.removeEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this._histogram = value;

				if (this._histogram)
					this._histogram.addEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this.invalidate("updateRange");
			};

			this.getMinimum = function()
			{
				return this._minimum;
			};
			this.setMinimum = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? Number(value) : null;
				if (value === this._minimum)
					return;
				this._minimum = value;
				this.invalidate("updateRange");
			};

			this.getMaximum = function()
			{
				return this._maximum;
			};
			this.setMaximum = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? Number(value) : null;
				if (value === this._maximum)
					return;
				this._maximum = value;
				this.invalidate("updateRange");
			};

			this.getMinimumSnap = function()
			{
				return this._minimumSnap;
			};
			this.setMinimumSnap = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter minimumSnap must be a function.");
				this._minimumSnap = value;
				this.invalidate("updateRange");
			};

			this.getMaximumSnap = function()
			{
				return this._maximumSnap;
			};
			this.setMaximumSnap = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter maximumSnap must be a function.");
				this._maximumSnap = value;
				this.invalidate("updateRange");
			};

			this.getMinimumFormat = function()
			{
				return this._minimumFormat;
			};
			this.setMinimumFormat = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter minimumFormat must be a function.");
				this._minimumFormat = value;
				this.invalidate("render");
			};

			this.getMaximumFormat = function()
			{
				return this._maximumFormat;
			};
			this.setMaximumFormat = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter maximumFormat must be a function.");
				this._maximumFormat = value;
				this.invalidate("render");
			};

			this.getRangeFormat = function()
			{
				return this._rangeFormat;
			};
			this.setRangeFormat = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter rangeFormat must be a function.");
				this._rangeFormat = value;
				this.invalidate("render");
			};

			this.getActualMinimum = function()
			{
				this.validate("updateRange");
				return this._actualMinimum;
			};

			this.getActualMaximum = function()
			{
				this.validate("updateRange");
				return this._actualMaximum;
			};

			this.isDragging = function()
			{
				return this._isDragging;
			};

			// Public Methods

			this.appendToOverride = function(element)
			{
				$(document).bind("mousemove", this._document_mouseMove);
				$(document).bind("mouseleave", this._document_mouseLeave);
			};

			this.removeOverride = function(element)
			{
				$(document).unbind("mouseup", this._document_mouseUp);
				$(document).unbind("mousemove", this._document_mouseMove);
				$(document).unbind("mouseleave", this._document_mouseLeave);
			};

			this.updateRange = function()
			{
				if (this.isValid("updateRange"))
					return;

				var actualMinimum = this._minimum;
				var actualMaximum = this._maximum;
				var relativeMinimum = 0;
				var relativeMaximum = 1;

				var histogram = this._histogram;
				if (histogram)
				{
					var histogramMinimumX = histogram.getActualMinimumX();
					var histogramMaximumX = histogram.getActualMaximumX();
					var histogramRangeX = histogramMaximumX - histogramMinimumX;

					var minimumSnap = this._minimumSnap;
					if ((minimumSnap != null) && (actualMinimum != null))
						actualMinimum = minimumSnap(actualMinimum);

					var maximumSnap = this._maximumSnap;
					if ((maximumSnap != null) && (actualMaximum != null))
						actualMaximum = maximumSnap(actualMaximum);

					if (actualMinimum != null)
						relativeMinimum = (histogramRangeX > 0) ? ((actualMinimum - histogramMinimumX) / histogramRangeX) : 0;
					else
						actualMinimum = histogramMinimumX;

					if (actualMaximum != null)
						relativeMaximum = (histogramRangeX > 0) ? ((actualMaximum - histogramMinimumX) / histogramRangeX) : 1;
					else
						actualMaximum = histogramMaximumX;

					var temp;
					if (actualMinimum > actualMaximum)
					{
						temp = actualMinimum;
						actualMinimum = actualMaximum;
						actualMaximum = temp;

						temp = relativeMinimum;
						relativeMinimum = relativeMaximum;
						relativeMaximum = temp;
					}
				}

				var actualChanged = ((actualMinimum != this._actualMinimum) || (actualMaximum != this._actualMaximum));
				var relativeChanged = ((relativeMinimum != this._relativeMinimum) || (relativeMaximum != this._relativeMaximum));

				this._actualMinimum = actualMinimum;
				this._actualMaximum = actualMaximum;
				this._relativeMinimum = relativeMinimum;
				this._relativeMaximum = relativeMaximum;

				if (actualChanged || relativeChanged)
					this.invalidate("render");

				this.setValid("updateRange");

				if (actualChanged)
					this.dispatchEvent("rangeChanged");
			};

			this.renderOverride = function(width, height)
			{
				var actualMinimum = this._actualMinimum;
				var actualMaximum = this._actualMaximum;
				var relativeMinimum = this._relativeMinimum;
				var relativeMaximum = this._relativeMaximum;
				var minimumLabel = $(this._minimumLabel);
				var maximumLabel = $(this._maximumLabel);
				var rangeLabel = $(this._rangeLabel);
				var rangeLabelClip = $(this._rangeLabelClip);

				// format labels

				var minimumFormat = this._minimumFormat;
				if (actualMinimum == null)
					minimumLabel.html("");
				else if (!minimumFormat)
					minimumLabel.html(StringUtils.escapeHTML(actualMinimum));
				else
					minimumLabel.html(StringUtils.escapeHTML(minimumFormat(actualMinimum)));

				var maximumFormat = this._maximumFormat;
				if (actualMaximum == null)
					maximumLabel.html("");
				else if (!maximumFormat)
					maximumLabel.html(StringUtils.escapeHTML(actualMaximum));
				else
					maximumLabel.html(StringUtils.escapeHTML(maximumFormat(actualMaximum)));

				var rangeFormat = this._rangeFormat;
				if (!rangeFormat || (actualMinimum == null) || (actualMaximum == null))
					rangeLabel.html("");
				else
					rangeLabel.html(StringUtils.escapeHTML(rangeFormat(actualMinimum, actualMaximum)));

				// compute placements

				if (relativeMinimum > relativeMaximum)
				{
					var temp;

					temp = relativeMinimum;
					relativeMinimum = relativeMaximum;
					relativeMaximum = temp;

					temp = minimumLabel;
					minimumLabel = maximumLabel;
					maximumLabel = temp;
				}

				var x1 = 0;
				var x2 = Math.round(width * relativeMinimum);
				var x3 = Math.round(width * relativeMaximum);
				var x4 = Math.round(width);

				var y1 = 0;
				var y2 = Math.round(height);

				x2 = NumberUtils.minMax(x2, x1, x4);
				x3 = NumberUtils.minMax(x3, x1, x4);

				// layout labels

				var minimumLabelBounds = {};
				minimumLabelBounds.width = Math.round(minimumLabel.outerWidth(true));
				minimumLabelBounds.height = 20;
				minimumLabelBounds.x = x2 - minimumLabelBounds.width;
				minimumLabelBounds.y = Math.min(y2 - minimumLabelBounds.height, 0);

				var maximumLabelBounds = {};
				maximumLabelBounds.width = Math.round(maximumLabel.outerWidth(true));
				maximumLabelBounds.height = 20;
				maximumLabelBounds.x = x3;
				maximumLabelBounds.y = Math.min(y2 - maximumLabelBounds.height, 0);

				var rangeLabelBounds = {};
				rangeLabelBounds.width = Math.min(Math.round(rangeLabel.outerWidth(true)), x3 - x2);
				rangeLabelBounds.height = 20;
				rangeLabelBounds.x = x2 + Math.round((x3 - x2 - rangeLabelBounds.width) / 2);
				rangeLabelBounds.y = y2;

				if ((maximumLabelBounds.x + maximumLabelBounds.width) > x4)
					maximumLabelBounds.x = x4 - maximumLabelBounds.width;
				if ((minimumLabelBounds.x + minimumLabelBounds.width) > maximumLabelBounds.x)
					minimumLabelBounds.x = maximumLabelBounds.x - minimumLabelBounds.width;

				if (minimumLabelBounds.x < 0)
					minimumLabelBounds.x = 0;
				if (maximumLabelBounds.x < (minimumLabelBounds.x + minimumLabelBounds.width))
					maximumLabelBounds.x = minimumLabelBounds.x + minimumLabelBounds.width;

				minimumLabel.css(
				{
					left: minimumLabelBounds.x + "px",
					top: minimumLabelBounds.y + Math.round((minimumLabelBounds.height - minimumLabel.outerHeight(true)) / 2) + "px"
				});

				maximumLabel.css(
				{
					left: maximumLabelBounds.x + "px",
					top: maximumLabelBounds.y + Math.round((maximumLabelBounds.height - maximumLabel.outerHeight(true)) / 2) + "px"
				});

				rangeLabel.css(
				{
					top: Math.round((rangeLabelBounds.height - rangeLabel.outerHeight(true)) / 2) + "px"
				});

				rangeLabelClip.css(
				{
					left: rangeLabelBounds.x + "px",
					top: rangeLabelBounds.y + "px",
					width: rangeLabelBounds.width + "px",
					height: rangeLabelBounds.height + "px"
				});

				// draw background

				var graphics = this.graphics;
				graphics.clear();

				var backgroundBrush = this._backgroundBrush;

				backgroundBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(backgroundBrush, Math.min(x1 + 1, x4), y1, Math.max(x2 - 1, 0), y2);
				backgroundBrush.endBrush();

				backgroundBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(backgroundBrush, Math.min(x3 + 1, x4), y1, Math.max(x4 - x3 - 1, 0), y2);
				backgroundBrush.endBrush();

				// draw lines

				graphics = this._controlsGraphics;
				graphics.clear();
				graphics.setSize(width + 1, height + 20);  // pad graphics width and height so we can draw outside bounds

				var lineBrush = this._lineBrush;
				lineBrush.setColor(this._foregroundColor);

				lineBrush.beginBrush(graphics);
				lineBrush.moveTo(x2, minimumLabelBounds.y);
				lineBrush.lineTo(x2, y2 + 20);
				lineBrush.endBrush();

				lineBrush.beginBrush(graphics);
				lineBrush.moveTo(x3, maximumLabelBounds.y);
				lineBrush.lineTo(x3, y2 + 20);
				lineBrush.endBrush();

				// draw fills

				var fillBrush = this._fillBrush;

				fillBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(fillBrush, minimumLabelBounds.x + 1, minimumLabelBounds.y, minimumLabelBounds.width - 1, minimumLabelBounds.height);
				fillBrush.endBrush();

				fillBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(fillBrush, maximumLabelBounds.x + 1, maximumLabelBounds.y, maximumLabelBounds.width - 1, maximumLabelBounds.height);
				fillBrush.endBrush();

				fillBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(fillBrush, x2 + 1, y2, Math.max(x3 - x2 - 1, 0), 20);
				fillBrush.endBrush();

				this._redrawShow();
			};

			// Private Methods

			this._getShowPosition = function()
			{
				return this._showPosition;
			};

			this._setShowPosition = function(value)
			{
				this._showPosition = value;
				this._redrawShow();
			};

			this._redrawShow = function()
			{
				var p = this._showPosition;
				$(this._controlsContainer).css(
				{
					opacity: p + "",
					filter: "alpha(opacity=" + Math.round(p * 100) + ")",
					visibility: (p > 0) ? "visible" : "hidden"
				});
			};

			this._updateShowControls = function(mouseLocal, enableShow)
			{
				if ((mouseLocal.x < 0) || (mouseLocal.x > this.getWidth()) || (mouseLocal.y < 0) || (mouseLocal.y > this.getHeight()))
					this._hideControls();
				else if (enableShow !== false)
					this._showControls();
			};

			this._showControls = function()
			{
				if (this._areControlsVisible)
					return;

				this._areControlsVisible = true;

				var tween = new MethodTween(this, this._getShowPosition, this._setShowPosition, null, 1, new CubicEaser(EaseDirection.OUT));
				TweenRunner.start(tween, 0.3);
			};

			this._hideControls = function()
			{
				if (!this._areControlsVisible)
					return;

				this._areControlsVisible = false;

				var tween = new MethodTween(this, this._getShowPosition, this._setShowPosition, null, 0, new CubicEaser(EaseDirection.OUT));
				TweenRunner.start(tween, 0.3);
			};

			this._beginDrag = function(mouseLocal)
			{
				if (this._isDragging)
					return;

				this._isDragging = true;

				this._pressMouseX = mouseLocal.x;

				this._updateDrag(mouseLocal);

				this.dispatchEvent("dragStart");
			};

			this._endDrag = function()
			{
				if (!this._isDragging)
					return;

				this._isDragging = false;

				this.dispatchEvent("dragComplete");
			};

			this._updateDrag = function(mouseLocal)
			{
				if (!this._isDragging)
					return;

				var histogram = this._histogram;
				if (!histogram)
					return;

				var histogramMinimumX = histogram.getActualMinimumX();
				var histogramMaximumX = histogram.getActualMaximumX();
				var histogramRangeX = histogramMaximumX - histogramMinimumX;

				var width = this.getWidth();
				var pressMouseX = NumberUtils.minMax(this._pressMouseX, 0, width);
				var mouseX = NumberUtils.minMax(mouseLocal.x, 0, width);

				var relativeMinimum = (width > 0) ? (pressMouseX / width) : 0;
				var relativeMaximum = (width > 0) ? (mouseX / width) : 1;
				var minimum = histogramMinimumX + histogramRangeX * relativeMinimum;
				var maximum = histogramMinimumX + histogramRangeX * relativeMaximum;
				if (minimum > maximum)
				{
					var temp = minimum;
					minimum = maximum;
					maximum = temp;
				}

				this.setMinimum(minimum);
				this.setMaximum(maximum);
			};

			this._self_mouseOver = function(e)
			{
				if (this._isDragging)
					return;

				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));
				this._updateShowControls(mouseLocal);
			};

			this._self_mouseOut = function(e)
			{
				if (this._isDragging)
					return;

				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));
				this._updateShowControls(mouseLocal);
			};

			this._self_mouseMove = function(e)
			{
				if (this._isDragging)
					return;

				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));
				this._updateShowControls(mouseLocal);
			};

			this._self_mouseDown = function(e)
			{
				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));
				if ((mouseLocal.x < 0) || (mouseLocal.x > this.getWidth()) || (mouseLocal.y < 0) || (mouseLocal.y > this.getHeight()))
					return;

				$(document).bind("mouseup", this._document_mouseUp);

				this._beginDrag(mouseLocal);
				return false;
			};

			this._document_mouseUp = function(e)
			{
				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));

				$(document).unbind("mouseup", this._document_mouseUp);

				this._endDrag();
				this._updateShowControls(mouseLocal, false);
			};

			this._document_mouseMove = function(e)
			{
				var mouseLocal = this.globalToLocal(new Point(e.pageX, e.pageY));
				if (this._isDragging)
					this._updateDrag(mouseLocal);
				else
					this._updateShowControls(mouseLocal, false);
			};

			this._document_mouseLeave = function(e)
			{
				if (!this._isDragging)
					this._updateShowControls(new Point(-1, -1), false);
			};

			this._histogram_rangeXChanged = function()
			{
				this.invalidate("updateRange");
				this.validate();
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var DrawingUtils = jg_import("jgatt.graphics.DrawingUtils");
		var SolidFillBrush = jg_import("jgatt.graphics.SolidFillBrush");
		var SolidStrokeBrush = jg_import("jgatt.graphics.SolidStrokeBrush");
		var Histogram = jg_import("splunk.charting.Histogram");
		var VisualObject = jg_import("splunk.charting.VisualObject");

		this.CursorMarker = jg_extend(VisualObject, function(CursorMarker, base)
		{

			// Private Properties

			this._foregroundColor = 0x000000;
			this._histogram = null;
			this._value = null;

			this._lineBrush = null;
			this._backgroundBrush = null;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this);

				$(this.element).addClass("CursorMarker");

				this._histogram_rangeXChanged = jg_delegate(this, this._histogram_rangeXChanged);

				this._lineBrush = new SolidStrokeBrush(this._foregroundColor, 0.4, 1, "square");

				this._backgroundBrush = new SolidFillBrush(0xEAEAEA, 0.66);
			};

			// Public Getters/Setters

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._foregroundColor;
				if (value === this._foregroundColor)
					return;
				this._foregroundColor = value;
				this.invalidate("render");
			};

			this.getHistogram = function()
			{
				return this._histogram;
			};
			this.setHistogram = function(value)
			{
				if ((value != null) && !(value instanceof Histogram))
					throw new Error("Parameter histogram must be of type splunk.charting.Histogram.");

				if (this._histogram)
					this._histogram.removeEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this._histogram = value;

				if (this._histogram)
					this._histogram.addEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this.invalidate("render");
			};

			this.getValue = function()
			{
				return this._value;
			};
			this.setValue = function(value)
			{
				value = ((value != null) && (value > -Infinity) && (value < Infinity)) ? Number(value) : null;
				if (value === this._value)
					return;
				this._value = value;
				this.invalidate("render");
			};

			// Public Methods

			this.renderOverride = function(width, height)
			{
				var graphics = this.graphics;
				graphics.clear();

				var histogram = this._histogram;
				if (!histogram)
					return;

				var value = this._value;
				if (value == null)
					return;

				var histogramMinimumX = histogram.getActualMinimumX();
				var histogramMaximumX = histogram.getActualMaximumX();
				var histogramRangeX = histogramMaximumX - histogramMinimumX;

				var relativeValue = (histogramRangeX > 0) ? ((value - histogramMinimumX) / histogramRangeX) : 0;
				if (isNaN(relativeValue) || (relativeValue <= 0))
					return;

				var relativeValue2 = Math.min(relativeValue, 1);

				var x1 = 0;
				var x2 = Math.round(width * relativeValue2);

				var y1 = 0;
				var y2 = Math.round(height);

				// draw background

				var backgroundBrush = this._backgroundBrush;
				backgroundBrush.beginBrush(graphics);
				DrawingUtils.drawRectangle(backgroundBrush, x1, y1, x2 - x1, y2 - y1);
				backgroundBrush.endBrush();

				// draw line

				if (relativeValue == relativeValue2)
				{
					var lineBrush = this._lineBrush;
					lineBrush.setColor(this._foregroundColor);
					lineBrush.beginBrush(graphics);
					lineBrush.moveTo(x2, y1);
					lineBrush.lineTo(x2, y2);
					lineBrush.endBrush();
				}
			};

			// Private Methods

			this._histogram_rangeXChanged = function()
			{
				this.invalidate("render");
				this.validate();
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var SolidStrokeBrush = jg_import("jgatt.graphics.SolidStrokeBrush");
		var StringUtils = jg_import("jgatt.utils.StringUtils");
		var Histogram = jg_import("splunk.charting.Histogram");
		var VisualObject = jg_import("splunk.charting.VisualObject");

		this.NumericAxisLabels = jg_extend(VisualObject, function(NumericAxisLabels, base)
		{

			// Events

			//labelsChanged

			// Private Properties

			this._placement = "left";
			this._foregroundColor = 0x000000;
			this._histogram = null;
			this._labelFormat = null;
			this._actualUnit = 0;

			this._lineBrush = null;
			this._tickBrush = null;
			this._labelInfos = null;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this, [ "updateLabels", "render" ]);

				$(this.element).addClass("NumericAxisLabels");

				this._histogram_rangeYChanged = jg_delegate(this, this._histogram_rangeYChanged);

				this._lineBrush = new SolidStrokeBrush(this._foregroundColor, 0.2, 1, "square");

				this._tickBrush = new SolidStrokeBrush(this._foregroundColor, 0.1, 1);

				this._labelInfos = [];
			};

			// Public Getters/Setters

			this.setWidth = function(value)
			{
				// read-only
			};

			this.getPlacement = function()
			{
				return this._placement;
			};
			this.setPlacement = function(value)
			{
				value = ((value == "left") || (value == "right")) ? String(value) : this._placement;
				if (value === this._placement)
					return;
				this._placement = value;
				this.invalidate("render");
			};

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._foregroundColor;
				if (value === this._foregroundColor)
					return;
				this._foregroundColor = value;
				this.invalidate("render");
			};

			this.getHistogram = function()
			{
				return this._histogram;
			};
			this.setHistogram = function(value)
			{
				if ((value != null) && !(value instanceof Histogram))
					throw new Error("Parameter histogram must be of type splunk.charting.Histogram.");

				if (this._histogram)
					this._histogram.removeEventListener("rangeYChanged", this._histogram_rangeYChanged);

				this._histogram = value;

				if (this._histogram)
					this._histogram.addEventListener("rangeYChanged", this._histogram_rangeYChanged);

				this.invalidate("updateLabels");
			};

			this.getLabelFormat = function()
			{
				return this._labelFormat;
			};
			this.setLabelFormat = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter labelFormat must be a function.");
				this._labelFormat = value;
				this.invalidate("updateLabels");
			};

			this.getActualUnit = function()
			{
				return this._actualUnit;
			};

			this.getPositions = function()
			{
				this.validate("updateLabels");
				var positions = [];
				var labelInfos = this._labelInfos;
				var labelInfo;
				for (var i = 0, l = labelInfos.length; i < l; i++)
				{
					labelInfo = labelInfos[i];
					if (labelInfo.visible)
						positions.push(labelInfo.relative);
				}
				return positions;
			};

			// Public Methods

			this.updateLabels = function()
			{
				if (this.isValid("updateLabels"))
					return;

				this.invalidate("render");

				var element = this.element;
				var labelFormat = this._labelFormat;
				var labelInfos = this._labelInfos;
				var numLabelInfos = labelInfos.length;
				var numNewLabelInfos = 0;
				var labelInfo;

				try
				{
					var maxMajorUnits = 50;

					// set default value for actualUnit
					this._actualUnit = 0;

					// get histogram and verify not null
					var histogram = this._histogram;
					if (!histogram)
						return;

					// get minimum and maximum and verify not equal
					var minimum = histogram.getActualMinimumY();
					var maximum = histogram.getActualMaximumY();
					if (minimum == maximum)
						return;

					// scale minimum and maximum if required
					var scale = histogram.getScaleY();
					var scaleMajorUnit = (scale != null);
					var minimumScaled = minimum;
					var maximumScaled = maximum;
					if (scaleMajorUnit)
					{
						minimum = scale.scaleToValue(minimum);
						maximum = scale.scaleToValue(maximum);
					}
					var rangeScaled = maximumScaled - minimumScaled;

					// compute majorUnit
					var majorUnit = this._computeAutoUnits(rangeScaled);

					// verify majorUnit is greater than zero
					if (majorUnit <= 0)
						return;

					// snap majorUnit to integer
					if (rangeScaled >= 1)
						majorUnit = Math.max(Math.round(majorUnit), 1);

					// scale majorUnit if numMajorUnits is greater than maxMajorUnits
					var numMajorUnits = 1 + Math.floor(rangeScaled / majorUnit);
					majorUnit *= Math.ceil(numMajorUnits / maxMajorUnits);

					// update actualUnit
					this._actualUnit = majorUnit;

					// snap minimum and maximum to majorUnit
					var minimumScaled2 = Math.ceil(minimumScaled / majorUnit) * majorUnit - majorUnit;
					var maximumScaled2 = Math.ceil(maximumScaled / majorUnit) * majorUnit;

					// compute label info
					var majorValue;
					var majorValue2;
					var majorRelative;
					for (majorValue = minimumScaled2; majorValue <= maximumScaled2; majorValue += majorUnit)
					{
						majorValue2 = scaleMajorUnit ? scale.scaleToValue(majorValue) : majorValue;
						majorRelative = (majorValue - minimumScaled) / rangeScaled;
						if ((majorRelative > 0) && (majorRelative <= 1))
						{
							if (numNewLabelInfos < numLabelInfos)
							{
								labelInfo = labelInfos[numNewLabelInfos];
							}
							else
							{
								labelInfo = {};
								labelInfo.label = document.createElement("span");
								labelInfo.queryLabel = $(labelInfo.label);
								labelInfo.queryLabel.addClass("label");
								labelInfo.queryLabel.css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });
								labelInfos.push(labelInfo);
								element.appendChild(labelInfo.label);
							}

							labelInfo.relative = majorRelative;

							if (labelFormat)
								labelInfo.queryLabel.html(StringUtils.escapeHTML(labelFormat(majorValue2)));
							else
								labelInfo.queryLabel.html(StringUtils.escapeHTML(majorValue2));

							numNewLabelInfos++;
						}
					}
				}
				finally
				{
					// remove labels
					for (var i = labelInfos.length - 1; i >= numNewLabelInfos; i--)
					{
						labelInfo = labelInfos.pop();
						element = labelInfo.label.parentNode;
						if (element)
							element.removeChild(labelInfo.label);
					}

					this.setValid("updateLabels");
				}
			};

			this.renderOverride = function(width, height)
			{
				var isPlacementLeft = (this._placement != "right");
				var graphics = this.graphics;
				var lineBrush = this._lineBrush;
				var tickBrush = this._tickBrush;
				var labelInfos = this._labelInfos;
				var numLabelInfos = labelInfos.length;
				var labelInfo;
				var labelInfo2;
				var labelWidth = 0;
				var tickWidth = 25;
				var numOverlaps = 0;
				var i;
				var j;

				// measure labels and prepare for rendering
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];

					labelInfo.y = Math.round(height * (1 - labelInfo.relative));
					labelInfo.width = Math.round(labelInfo.queryLabel.outerWidth(true));
					labelInfo.height = Math.round(labelInfo.queryLabel.outerHeight(true));
					labelInfo.visible = true;

					labelWidth = Math.max(labelWidth, labelInfo.width);
				}
				width = this._width = Math.max(labelWidth, tickWidth);
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];
					labelInfo.x = isPlacementLeft ? (width - labelInfo.width) : 0;
				}

				// compute numOverlaps
				for (i = numLabelInfos - 1; i >= 0; i--)
				{
					labelInfo = labelInfos[i];
					for (j = i - 1; j >= 0; j--)
					{
						labelInfo2 = labelInfos[j];
						if (labelInfo2.y >= (labelInfo.y + labelInfo.height))
							break;
						numOverlaps = Math.max(numOverlaps, i - j);
					}
				}

				// mark overlapping labels as not visible
				if (numOverlaps > 0)
				{
					numOverlaps++;
					for (i = 0; i < numLabelInfos; i++)
					{
						if (((numLabelInfos - i - 1) % numOverlaps) != 0)
							labelInfos[i].visible = false;
					}
				}

				// mark labels that fall outside render bounds as not visible
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];
					if ((labelInfo.y + labelInfo.height) <= height)
						break;
					labelInfo.visible = false;
				}

				// layout labels and render ticks
				graphics.clear();
				graphics.setSize(width + (isPlacementLeft ? 1 : 0), height + 1);  // set graphics size according to computed width plus padding for axis lines
				tickBrush.setColor(this._foregroundColor);
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];
					labelInfo.queryLabel.css(
					{
						left: labelInfo.x + "px",
						top: labelInfo.y + "px",
						visibility: labelInfo.visible ? "visible" : "hidden"
					});

					if (labelInfo.visible)
					{
						tickBrush.beginBrush(graphics);
						if (isPlacementLeft)
						{
							tickBrush.moveTo(width, labelInfo.y);
							tickBrush.lineTo(width - tickWidth, labelInfo.y);
						}
						else
						{
							tickBrush.moveTo(0, labelInfo.y);
							tickBrush.lineTo(tickWidth, labelInfo.y);
						}
						tickBrush.endBrush();
					}
				}
				lineBrush.setColor(this._foregroundColor);
				lineBrush.beginBrush(graphics);
				if (isPlacementLeft)
				{
					lineBrush.moveTo(width, 0);
					lineBrush.lineTo(width, Math.round(height));
				}
				else
				{
					lineBrush.moveTo(0, 0);
					lineBrush.lineTo(0, Math.round(height));
				}
				lineBrush.endBrush();

				this.dispatchEvent("labelsChanged");
			};

			// Private Methods

			this._computeAutoUnits = function(range)
			{
				if (range <= 0)
					return 0;

				var significand = range / 10;
				var exponent = 0;

				if (significand > 0)
				{
					var str = significand.toExponential(20);
					var eIndex = str.indexOf("e");
					if (eIndex >= 0)
					{
						significand = Number(str.substring(0, eIndex));
						exponent = Number(str.substring(eIndex + 1, str.length));
					}
				}

				significand = Math.ceil(significand);

				if (significand > 5)
					significand = 10;
				else if (significand > 2)
					significand = 5;

				return significand * Math.pow(10, exponent);
			};

			this._histogram_rangeYChanged = function()
			{
				this.invalidate("updateLabels");
				this.validate();
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var SolidStrokeBrush = jg_import("jgatt.graphics.SolidStrokeBrush");
		var NumericAxisLabels = jg_import("splunk.charting.NumericAxisLabels");
		var VisualObject = jg_import("splunk.charting.VisualObject");

		this.GridLines = jg_extend(VisualObject, function(GridLines, base)
		{

			// Private Properties

			this._foregroundColor = 0x000000;
			this._axisLabels = null;

			this._lineBrush = null;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this);

				$(this.element).addClass("GridLines");

				this._axisLabels_labelsChanged = jg_delegate(this, this._axisLabels_labelsChanged);

				this._lineBrush = new SolidStrokeBrush(this._foregroundColor, 0.1, 1);
			};

			// Public Getters/Setters

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._foregroundColor;
				if (value === this._foregroundColor)
					return;
				this._foregroundColor = value;
				this.invalidate("render");
			};

			this.getAxisLabels = function()
			{
				return this._axisLabels;
			};
			this.setAxisLabels = function(value)
			{
				if ((value != null) && !(value instanceof NumericAxisLabels))
					throw new Error("Parameter axisLabels must be of type splunk.charting.NumericAxisLabels.");

				if (this._axisLabels)
					this._axisLabels.removeEventListener("labelsChanged", this._axisLabels_labelsChanged);

				this._axisLabels = value;

				if (this._axisLabels)
					this._axisLabels.addEventListener("labelsChanged", this._axisLabels_labelsChanged);

				this.invalidate("render");
			};

			// Public Methods

			this.renderOverride = function(width, height)
			{
				var graphics = this.graphics;
				graphics.clear();

				var axisLabels = this._axisLabels;
				if (!axisLabels)
					return;

				var lineBrush = this._lineBrush;
				lineBrush.setColor(this._foregroundColor);

				var positions = axisLabels.getPositions();
				var numPositions = positions.length;
				var position;
				var y;
				for (var i = 0; i < numPositions; i++)
				{
					position = positions[i];
					y = Math.round(height * (1 - position));
					lineBrush.beginBrush(graphics);
					lineBrush.moveTo(0, y);
					lineBrush.lineTo(width, y);
					lineBrush.endBrush();
				}
			};

			// Private Methods

			this._axisLabels_labelsChanged = function()
			{
				this.invalidate("render");
				this.validate();
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var SolidStrokeBrush = jg_import("jgatt.graphics.SolidStrokeBrush");
		var StringUtils = jg_import("jgatt.utils.StringUtils");
		var Histogram = jg_import("splunk.charting.Histogram");
		var VisualObject = jg_import("splunk.charting.VisualObject");
		var DateTime = jg_import("splunk.time.DateTime");
		var Duration = jg_import("splunk.time.Duration");
		var ITimeZone = jg_import("splunk.time.ITimeZone");
		var TimeUtils = jg_import("splunk.time.TimeUtils");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.TimeAxisLabels = jg_extend(VisualObject, function(TimeAxisLabels, base)
		{

			// Events

			//labelsChanged

			// Private Properties

			this._foregroundColor = 0x000000;
			this._histogram = null;
			this._timeZone = TimeZones.LOCAL;
			this._labelFormat = null;
			this._actualUnit = null;

			this._lineBrush = null;
			this._labelInfos = null;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this, [ "updateLabels", "render" ]);

				$(this.element).addClass("TimeAxisLabels");

				this._histogram_rangeXChanged = jg_delegate(this, this._histogram_rangeXChanged);

				this._actualUnit = new Duration();

				this._lineBrush = new SolidStrokeBrush(this._foregroundColor, 0.2, 1, "square");

				this._labelInfos = [];
			};

			// Public Getters/Setters

			this.setHeight = function(value)
			{
				// read-only
			};

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = ((value != null) && !isNaN(value)) ? Math.min(Math.max(Math.floor(value), 0x000000), 0xFFFFFF) : this._foregroundColor;
				if (value === this._foregroundColor)
					return;
				this._foregroundColor = value;
				this.invalidate("render");
			};

			this.getHistogram = function()
			{
				return this._histogram;
			};
			this.setHistogram = function(value)
			{
				if ((value != null) && !(value instanceof Histogram))
					throw new Error("Parameter histogram must be of type splunk.charting.Histogram.");

				if (this._histogram)
					this._histogram.removeEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this._histogram = value;

				if (this._histogram)
					this._histogram.addEventListener("rangeXChanged", this._histogram_rangeXChanged);

				this.invalidate("updateLabels");
			};

			this.getTimeZone = function()
			{
				return this._timeZone;
			};
			this.setTimeZone = function(value)
			{
				if ((value != null) && !(value instanceof ITimeZone))
					throw new Error("Parameter timeZone must be of type splunk.time.ITimeZone.");
				this._timeZone = value ? value : TimeZones.LOCAL;
				this.invalidate("updateLabels");
			};

			this.getLabelFormat = function()
			{
				return this._labelFormat;
			};
			this.setLabelFormat = function(value)
			{
				if ((value != null) && (typeof value !== "function"))
					throw new Error("Parameter labelFormat must be a function.");
				this._labelFormat = value;
				this.invalidate("updateLabels");
			};

			this.getActualUnit = function()
			{
				return this._actualUnit.clone();
			};

			this.getPositions = function()
			{
				this.validate("updateLabels");
				var positions = [];
				var labelInfos = this._labelInfos;
				var labelInfo;
				for (var i = 0, l = labelInfos.length; i < l; i++)
				{
					labelInfo = labelInfos[i];
					if (labelInfo.visible)
						positions.push(labelInfo.relative);
				}
				return positions;
			};

			// Public Methods

			this.updateLabels = function()
			{
				if (this.isValid("updateLabels"))
					return;

				this.invalidate("render");

				var element = this.element;
				var labelFormat = this._labelFormat;
				var labelInfos = this._labelInfos;
				var numLabelInfos = labelInfos.length;
				var numNewLabelInfos = 0;
				var labelInfo;

				try
				{
					var maxMajorUnits = 50;

					// set default value for actualUnit
					this._actualUnit = new Duration();

					// get histogram and verify not null
					var histogram = this._histogram;
					if (!histogram)
						return;

					// get minimum and maximum and verify not equal
					var minimum = histogram.getActualMinimumX();
					var maximum = histogram.getActualMaximumX();
					var range = maximum - minimum;
					if (range == 0)
						return;

					// adjust minimum and maximum for timeZone
					var timeZone = this._timeZone;
					var minimumTime = new DateTime(minimum);
					var maximumTime = new DateTime(maximum);
					minimumTime = minimumTime.toTimeZone(timeZone);
					maximumTime = maximumTime.toTimeZone(timeZone);

					// compute majorUnit
					var majorUnit = this._computeAutoUnits(TimeUtils.subtractDates(maximumTime, minimumTime));

					// compute majorUnit time and verify greater than zero
					var majorUnitTime = TimeUtils.durationToSeconds(majorUnit, minimumTime);
					if (majorUnitTime <= 0)
						return;

					// scale majorUnit if numMajorUnits is greater than maxMajorUnits
					var numMajorUnits = 1 + Math.floor((maximum - minimum) / majorUnitTime);
					majorUnit = TimeUtils.multiplyDuration(majorUnit, Math.ceil(numMajorUnits / maxMajorUnits));

					// update actualUnit
					this._actualUnit = majorUnit;

					// snap minimum and maximum to majorUnit
					minimumTime = TimeUtils.subtractDateDuration(TimeUtils.ceilDate(minimumTime, majorUnit), majorUnit);
					maximumTime = TimeUtils.ceilDate(maximumTime, majorUnit);

					// compute label info
					var majorValue;
					var majorRelative;
					var majorUnitNum = 1;
					for (majorValue = minimumTime; majorValue.getTime() <= maximumTime.getTime(); majorUnitNum++)
					{
						majorRelative = (majorValue.getTime() - minimum) / range;
						if ((majorRelative >= 0) && (majorRelative < 1))
						{
							if (numNewLabelInfos < numLabelInfos)
							{
								labelInfo = labelInfos[numNewLabelInfos];
							}
							else
							{
								labelInfo = {};
								labelInfo.label = document.createElement("span");
								labelInfo.queryLabel = $(labelInfo.label);
								labelInfo.queryLabel.addClass("label");
								labelInfo.queryLabel.css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });
								labelInfos.push(labelInfo);
								element.appendChild(labelInfo.label);
							}

							labelInfo.relative = majorRelative;

							if (labelFormat)
								labelInfo.queryLabel.html(StringUtils.escapeHTML(labelFormat(majorValue)));
							else
								labelInfo.queryLabel.html(StringUtils.escapeHTML(majorValue));

							numNewLabelInfos++;
						}
						majorValue = TimeUtils.addDateDuration(minimumTime, TimeUtils.multiplyDuration(majorUnit, majorUnitNum));
					}
				}
				finally
				{
					// remove labels
					for (var i = labelInfos.length - 1; i >= numNewLabelInfos; i--)
					{
						labelInfo = labelInfos.pop();
						element = labelInfo.label.parentNode;
						if (element)
							element.removeChild(labelInfo.label);
					}

					this.setValid("updateLabels");
				}
			};

			this.renderOverride = function(width, height)
			{
				var graphics = this.graphics;
				var lineBrush = this._lineBrush;
				var labelInfos = this._labelInfos;
				var numLabelInfos = labelInfos.length;
				var labelInfo;
				var labelInfo2;
				var labelHeight = 0;
				var tickHeight = 25;
				var numOverlaps = 0;
				var i;
				var j;

				// measure labels and prepare for rendering
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];

					labelInfo.x = Math.round(width * labelInfo.relative);
					labelInfo.y = 0;
					labelInfo.width = Math.round(labelInfo.queryLabel.outerWidth(true));
					labelInfo.height = Math.round(labelInfo.queryLabel.outerHeight(true));
					labelInfo.visible = true;

					labelHeight = Math.max(labelHeight, labelInfo.height);
				}
				height = this._height = Math.max(labelHeight, tickHeight);

				// compute numOverlaps
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];
					for (j = i + 1; j < numLabelInfos; j++)
					{
						labelInfo2 = labelInfos[j];
						if (labelInfo2.x >= (labelInfo.x + labelInfo.width))
							break;
						numOverlaps = Math.max(numOverlaps, j - i);
					}
				}

				// mark overlapping labels as not visible
				if (numOverlaps > 0)
				{
					numOverlaps++;
					for (i = 0; i < numLabelInfos; i++)
					{
						if ((i % numOverlaps) != 0)
							labelInfos[i].visible = false;
					}
				}

				// mark labels that fall outside render bounds as not visible
				for (i = numLabelInfos - 1; i >= 0; i--)
				{
					labelInfo = labelInfos[i];
					if ((labelInfo.x + labelInfo.width) <= width)
						break;
					labelInfo.visible = false;
				}

				// layout labels and render ticks
				graphics.clear();
				graphics.setSize(width + 1, height);  // set graphics size according to computed height plus padding for axis lines
				lineBrush.setColor(this._foregroundColor);
				for (i = 0; i < numLabelInfos; i++)
				{
					labelInfo = labelInfos[i];
					labelInfo.queryLabel.css(
					{
						left: labelInfo.x + "px",
						top: labelInfo.y + "px",
						visibility: labelInfo.visible ? "visible" : "hidden"
					});

					if (labelInfo.visible)
					{
						lineBrush.beginBrush(graphics);
						lineBrush.moveTo(labelInfo.x, 0);
						lineBrush.lineTo(labelInfo.x, tickHeight);
						lineBrush.endBrush();
					}
				}
				lineBrush.beginBrush(graphics);
				lineBrush.moveTo(0, 0);
				lineBrush.lineTo(Math.round(width), 0);
				lineBrush.endBrush();

				this.dispatchEvent("labelsChanged");
			};

			// Private Methods

			this._computeAutoUnits = function(range)
			{
				if (TimeUtils.durationToSeconds(range) <= 0)
					return new Duration();

				var date = new DateTime(range.years, range.months + 1, range.days + 1, range.hours, range.minutes, range.seconds, TimeZones.UTC);

				range = new Duration(date.getYear(), date.getMonth() - 1, date.getDay() - 1, date.getHours(), date.getMinutes(), date.getSeconds());

				var diff;
				var significand;
				var exponent;
				var str;
				var eIndex;

				diff = range.years;
				if (diff > 2)
				{
					significand = diff / 10;
					exponent = 0;

					if (significand > 0)
					{
						str = significand.toExponential(20);
						eIndex = str.indexOf("e");
						if (eIndex >= 0)
						{
							significand = Number(str.substring(0, eIndex));
							exponent = Number(str.substring(eIndex + 1, str.length));
						}
					}

					significand = Math.ceil(significand);

					if (significand > 5)
						significand = 10;
					else if (significand > 2)
						significand = 5;

					return new Duration(Math.ceil(significand * Math.pow(10, exponent)));
				}

				diff = range.months + diff * 12;
				if (diff > 2)
				{
					if (diff > 18)
						return new Duration(0, 4);
					else if (diff > 12)
						return new Duration(0, 3);
					else if (diff > 6)
						return new Duration(0, 2);
					else
						return new Duration(0, 1);
				}

				diff = range.days + diff * 30;
				if (diff > 2)
				{
					if (diff > 49)
						return new Duration(0, 0, 14);
					else if (diff > 28)
						return new Duration(0, 0, 7);
					else if (diff > 14)
						return new Duration(0, 0, 4);
					else if (diff > 7)
						return new Duration(0, 0, 2);
					else
						return new Duration(0, 0, 1);
				}

				diff = range.hours + diff * 24;
				if (diff > 2)
				{
					if (diff > 36)
						return new Duration(0, 0, 0, 12);
					else if (diff > 24)
						return new Duration(0, 0, 0, 6);
					else if (diff > 12)
						return new Duration(0, 0, 0, 4);
					else if (diff > 6)
						return new Duration(0, 0, 0, 2);
					else
						return new Duration(0, 0, 0, 1);
				}

				diff = range.minutes + diff * 60;
				if (diff > 2)
				{
					if (diff > 105)
						return new Duration(0, 0, 0, 0, 30);
					else if (diff > 70)
						return new Duration(0, 0, 0, 0, 15);
					else if (diff > 35)
						return new Duration(0, 0, 0, 0, 10);
					else if (diff > 14)
						return new Duration(0, 0, 0, 0, 5);
					else if (diff > 7)
						return new Duration(0, 0, 0, 0, 2);
					else
						return new Duration(0, 0, 0, 0, 1);
				}

				diff = range.seconds + diff * 60;
				if (diff > 2)
				{
					if (diff > 105)
						return new Duration(0, 0, 0, 0, 0, 30);
					else if (diff > 70)
						return new Duration(0, 0, 0, 0, 0, 15);
					else if (diff > 35)
						return new Duration(0, 0, 0, 0, 0, 10);
					else if (diff > 14)
						return new Duration(0, 0, 0, 0, 0, 5);
					else if (diff > 7)
						return new Duration(0, 0, 0, 0, 0, 2);
					else
						return new Duration(0, 0, 0, 0, 0, 1);
				}

				significand = diff / 10;
				exponent = 0;

				if (significand > 0)
				{
					str = significand.toExponential(20);
					eIndex = str.indexOf("e");
					if (eIndex >= 0)
					{
						significand = Number(str.substring(0, eIndex));
						exponent = Number(str.substring(eIndex + 1, str.length));
					}
				}

				significand = Math.ceil(significand);

				if (significand > 5)
					significand = 10;
				else if (significand > 2)
					significand = 5;

				return new Duration(0, 0, 0, 0, 0, significand * Math.pow(10, exponent));
			};

			this._histogram_rangeXChanged = function()
			{
				this.invalidate("updateLabels");
				this.validate();
			};

		});

	});

	jg_namespace("splunk.charting", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");
		var Rectangle = jg_import("jgatt.geom.Rectangle");
		var GradientFillBrush = jg_import("jgatt.graphics.GradientFillBrush");
		var NumberUtils = jg_import("jgatt.utils.NumberUtils");
		var StringUtils = jg_import("jgatt.utils.StringUtils");
		var VisualObject = jg_import("splunk.charting.VisualObject");

		this.Tooltip = jg_extend(VisualObject, function(Tooltip, base)
		{

			// Private Properties

			this._value = null;
			this._viewBounds = null;
			this._targetBounds = null;

			this._backgroundBrush = null;
			this._valueLabel = null;
			this._isShowing = true;

			// Constructor

			this.constructor = function()
			{
				base.constructor.call(this);

				$(this.element).addClass("Tooltip");

				this._viewBounds = new Rectangle();
				this._targetBounds = new Rectangle();

				this._backgroundBrush = new GradientFillBrush("linear", [ 0x333333, 0x000000 ], [ 1, 1 ], [ 0, 1 ]);
				this._backgroundBrush.setTileTransform(new Matrix(0, 1, -1, 0));

				this._valueLabel = document.createElement("span");
				$(this._valueLabel).addClass("label");
				$(this._valueLabel).css({ position: "absolute", left: "0px", top: "0px", "white-space": "pre" });

				this.element.appendChild(this._valueLabel);

				this.hide();
			};

			// Public Getters/Setters

			this.setWidth = function(value)
			{
				// read-only
			};

			this.setHeight = function(value)
			{
				// read-only
			};

			this.getValue = function()
			{
				return this._value;
			};
			this.setValue = function(value)
			{
				value = (value != null) ? String(value) : null;
				if (value === this._value)
					return;
				this._value = value;
				this.invalidate("render");
			};

			this.getViewBounds = function()
			{
				return this._viewBounds.clone();
			};
			this.setViewBounds = function(value)
			{
				if ((value != null) && !(value instanceof Rectangle))
					throw new Error("Parameter viewBounds must be of type jgatt.geom.Rectangle.");
				if (value)
				{
					value = value.clone();
					if (value.width < 0)
					{
						value.x += value.width;
						value.width = -value.width;
					}
					if (value.height < 0)
					{
						value.y += value.height;
						value.height = -value.height;
					}
				}
				else
				{
					value = new Rectangle();
				}
				if (value.equals(this._viewBounds))
					return;
				this._viewBounds = value;
				this.invalidate("render");
			};

			this.getTargetBounds = function()
			{
				return this._targetBounds.clone();
			};
			this.setTargetBounds = function(value)
			{
				if ((value != null) && !(value instanceof Rectangle))
					throw new Error("Parameter targetBounds must be of type jgatt.geom.Rectangle.");
				if (value)
				{
					value = value.clone();
					if (value.width < 0)
					{
						value.x += value.width;
						value.width = -value.width;
					}
					if (value.height < 0)
					{
						value.y += value.height;
						value.height = -value.height;
					}
				}
				else
				{
					value = new Rectangle();
				}
				if (value.equals(this._targetBounds))
					return;
				this._targetBounds = value;
				this.invalidate("render");
			};

			// Public Methods

			this.show = function()
			{
				if (this._isShowing)
					return;

				this._isShowing = true;

				this.validate();

				$(this.element).css({ visibility: "visible" });
			};

			this.hide = function()
			{
				if (!this._isShowing)
					return;

				this._isShowing = false;

				$(this.element).css({ visibility: "hidden" });
			};

			this.renderOverride = function(width, height)
			{
				var valueLabel = $(this._valueLabel);
				var value = this._value;
				if (!value)
					valueLabel.html("");
				else
					valueLabel.html(StringUtils.escapeHTML(value));

				var contentWidth = valueLabel.outerWidth(true);
				var contentHeight = valueLabel.outerHeight(true);

				var pointerLength = 7;
				var pointerThickness = 14 / 2;

				var viewBounds = this._viewBounds;
				var viewWidth = viewBounds.width;
				var viewHeight = viewBounds.height;
				var viewLeft = viewBounds.x;
				var viewRight = viewLeft + viewWidth;
				var viewTop = viewBounds.y;
				var viewBottom = viewTop + viewHeight;

				var targetBounds = this._targetBounds;
				var targetWidth = targetBounds.width;
				var targetHeight = targetBounds.height;
				var targetLeft = targetBounds.x;
				var targetRight = targetLeft + targetWidth;
				var targetTop = targetBounds.y;
				var targetBottom = targetTop + targetHeight;

				var marginLeft = 10;
				var marginRight = 10;
				var marginTop = 10;
				var marginBottom = 10;
				var marginX = marginLeft + marginRight;
				var marginY = marginTop + marginBottom;
				var marginScaleX = (marginX > 0) ? NumberUtils.minMax((viewWidth - contentWidth) / marginX, 0, 1) : 0;
				var marginScaleY = (marginY > 0) ? NumberUtils.minMax((viewHeight - contentHeight) / marginY, 0, 1) : 0;

				var alignmentX = 0.5;
				var alignmentY = 0.5;

				// determine placement

				var placement;
				if (((targetLeft + targetRight) / 2) > ((viewLeft + viewRight) / 2))
					placement = "left";
				else
					placement = "right";

				// compute targetPosition (in global coordinates) and pointerPosition (in local coordinates)

				var targetPosition;
				var pointerPosition;
				if (placement == "left")
				{
					marginTop *= marginScaleY;
					marginBottom *= marginScaleY;
					targetPosition = new Point(targetLeft, targetTop * (1 - alignmentY) + targetBottom * alignmentY);
					targetPosition.x = NumberUtils.minMax(targetPosition.x, viewLeft + marginLeft + contentWidth + pointerLength, targetRight);
					targetPosition.x = NumberUtils.minMax(targetPosition.x, viewLeft + contentWidth + pointerLength, viewRight);
					targetPosition.y = NumberUtils.maxMin(targetPosition.y, viewBottom, viewTop);
					pointerPosition = new Point(contentWidth + pointerLength, contentHeight * alignmentY);
					pointerPosition.y = NumberUtils.minMax(pointerPosition.y, contentHeight - Math.max(viewBottom - marginBottom - targetPosition.y, 0), Math.max(targetPosition.y - viewTop - marginTop, 0));
				}
				else
				{
					marginTop *= marginScaleY;
					marginBottom *= marginScaleY;
					targetPosition = new Point(targetRight, targetTop * (1 - alignmentY) + targetBottom * alignmentY);
					targetPosition.x = NumberUtils.maxMin(targetPosition.x, viewRight - marginRight - contentWidth - pointerLength, targetLeft);
					targetPosition.x = NumberUtils.maxMin(targetPosition.x, viewRight - contentWidth - pointerLength, viewLeft);
					targetPosition.y = NumberUtils.maxMin(targetPosition.y, viewBottom, viewTop);
					pointerPosition = new Point(0, contentHeight * alignmentY);
					pointerPosition.y = NumberUtils.minMax(pointerPosition.y, contentHeight - Math.max(viewBottom - marginBottom - targetPosition.y, 0), Math.max(targetPosition.y - viewTop - marginTop, 0));
				}

				// snap positions to pixels

				targetPosition.x = Math.round(targetPosition.x);
				targetPosition.y = Math.round(targetPosition.y);
				pointerPosition.x = Math.round(pointerPosition.x);
				pointerPosition.y = Math.round(pointerPosition.y);

				// convert targetPosition to local coordinates and offset this position

				targetPosition = this.globalToLocal(targetPosition);
				this.setX(this.getX() + (targetPosition.x - pointerPosition.x));
				this.setY(this.getY() + (targetPosition.y - pointerPosition.y));

				// render

				var graphics = this.graphics;
				graphics.clear();
				graphics.setSize(contentWidth + pointerLength, contentHeight);

				var backgroundBrush = this._backgroundBrush;
				var p1;
				var p2;
				var p3;
				var p4;

				if (placement == "left")
				{
					p1 = new Point(0, 0);
					p2 = new Point(contentWidth, 0);
					p3 = new Point(contentWidth, contentHeight);
					p4 = new Point(0, contentHeight);

					backgroundBrush.beginBrush(graphics, null, [ p1, p2, p3, p4 ]);
					backgroundBrush.moveTo(p1.x, p1.y);
					backgroundBrush.lineTo(p2.x, p2.y);
					backgroundBrush.lineTo(p2.x, NumberUtils.maxMin(pointerPosition.y - pointerThickness, p3.y - pointerThickness, p2.y));
					backgroundBrush.lineTo(pointerPosition.x, pointerPosition.y);
					backgroundBrush.lineTo(p2.x, NumberUtils.minMax(pointerPosition.y + pointerThickness, p2.y + pointerThickness, p3.y));
					backgroundBrush.lineTo(p3.x, p3.y);
					backgroundBrush.lineTo(p4.x, p4.y);
					backgroundBrush.lineTo(p1.x, p1.y);
					backgroundBrush.endBrush();
				}
				else
				{
					p1 = new Point(pointerLength, 0);
					p2 = new Point(pointerLength + contentWidth, 0);
					p3 = new Point(pointerLength + contentWidth, contentHeight);
					p4 = new Point(pointerLength, contentHeight);

					backgroundBrush.beginBrush(graphics, null, [ p1, p2, p3, p4 ]);
					backgroundBrush.moveTo(p1.x, p1.y);
					backgroundBrush.lineTo(p2.x, p2.y);
					backgroundBrush.lineTo(p3.x, p3.y);
					backgroundBrush.lineTo(p4.x, p4.y);
					backgroundBrush.lineTo(p4.x, NumberUtils.minMax(pointerPosition.y + pointerThickness, p1.y + pointerThickness, p4.y));
					backgroundBrush.lineTo(pointerPosition.x, pointerPosition.y);
					backgroundBrush.lineTo(p4.x, NumberUtils.maxMin(pointerPosition.y - pointerThickness, p4.y - pointerThickness, p1.y));
					backgroundBrush.lineTo(p1.x, p1.y);
					backgroundBrush.endBrush();
				}

				// set valueLabel position

				valueLabel.css({ left: p1.x + "px" });
			};

		});

	});

	jg_namespace("splunk", function()
	{

		var Matrix = jg_import("jgatt.geom.Matrix");
		var Point = jg_import("jgatt.geom.Point");
		var Rectangle = jg_import("jgatt.geom.Rectangle");
		var ColorUtils = jg_import("jgatt.graphics.ColorUtils");
		var GradientFillBrush = jg_import("jgatt.graphics.GradientFillBrush");
		var GroupTween = jg_import("jgatt.motion.GroupTween");
		var MethodTween = jg_import("jgatt.motion.MethodTween");
		var TweenRunner = jg_import("jgatt.motion.TweenRunner");
		var CubicEaser = jg_import("jgatt.motion.easers.CubicEaser");
		var EaseDirection = jg_import("jgatt.motion.easers.EaseDirection");
		var NumberUtils = jg_import("jgatt.utils.NumberUtils");
		var ClickDragRangeMarker = jg_import("splunk.charting.ClickDragRangeMarker");
		var CursorMarker = jg_import("splunk.charting.CursorMarker");
		var GridLines = jg_import("splunk.charting.GridLines");
		var Histogram = jg_import("splunk.charting.Histogram");
		var LogScale = jg_import("splunk.charting.LogScale");
		var NumericAxisLabels = jg_import("splunk.charting.NumericAxisLabels");
		var TimeAxisLabels = jg_import("splunk.charting.TimeAxisLabels");
		var Tooltip = jg_import("splunk.charting.Tooltip");
		var VisualObject = jg_import("splunk.charting.VisualObject");
		var DateTime = jg_import("splunk.time.DateTime");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");
		var SplunkTimeZone = jg_import("splunk.time.SplunkTimeZone");
		var TimeUtils = jg_import("splunk.time.TimeUtils");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.Timeline = jg_extend(VisualObject, function(Timeline, base)
		{

			// Events

			// updated
			// viewChanged
			// selectionChanged
			// chartDoubleClicked

			// Public Properties

			this.externalInterface = null;

			// Private Properties

			this._hostPath = null;
			this._basePath = null;

			this._timeZoneString = null;
			this._timeZone = TimeZones.LOCAL;
			this._jobID = null;
			this._bucketCount = 1000;
			this._viewMinimum = NaN;
			this._viewMaximum = NaN;
			this._selectionMinimum = NaN;
			this._selectionMaximum = NaN;
			this._actualSelectionMinimum = NaN;
			this._actualSelectionMaximum = NaN;
			this._timelineData = null;
			this._enableChartClick = false;
			this._scaleY = "linear";
			this._foregroundColor = 0x000000;
			this._seriesColor = 0x73A550;

			this._updateCount = 0;
			this._updatingCount = 0;
			this._updatedCount = 0;
			this._dataLoading = false;
			this._loadJobID = null;

			this._histogram = null;
			this._axisLabelsX = null;
			this._axisLabelsY1 = null;
			this._axisLabelsY2 = null;
			this._gridLines = null;
			this._cursorMarker = null;
			this._rangeMarker = null;
			this._tooltip = null;

			this._prevDate = null;
			this._prevJobID = null;
			this._prevMouseGlobal = null;
			this._tooltipData = null;
			this._elementQuery = null;
			this._updateSizeInterval = 0;

			// Constructor

			this.constructor = function(hostPath, basePath)
			{
				base.constructor.call(this, [ "render", "dispatchUpdated" ]);

				this._elementQuery = $(this.element);
				//this._elementQuery.addClass("Timeline");
				this._elementQuery.css({ position: "relative", width: "100%", height: "100%", overflow: "hidden" });

				hostPath = (typeof hostPath === "string") ? hostPath : null;
				if (!hostPath)
				{
					var url = location.href;
					var colonIndex = url.indexOf("://");
					var slashIndex = url.indexOf("/", colonIndex + 4);
					hostPath = url.substring(0, slashIndex);
				}
				this._hostPath = hostPath;

				basePath = (typeof basePath === "string") ? basePath : null;
				if (basePath == null)
					basePath = "/splunkd";
				this._basePath = basePath;

				this.updateSize = jg_delegate(this, this.updateSize);
				this._histogram_containedRangeXChanged = jg_delegate(this, this._histogram_containedRangeXChanged);
				this._histogram_containedRangeYChanged = jg_delegate(this, this._histogram_containedRangeYChanged);
				this._rangeMarker_dragComplete = jg_delegate(this, this._rangeMarker_dragComplete);
				this._child_invalidated = jg_delegate(this, this._child_invalidated);
				this._self_mouseOver = jg_delegate(this, this._self_mouseOver);
				this._self_mouseOut = jg_delegate(this, this._self_mouseOut);
				this._self_mouseMove = jg_delegate(this, this._self_mouseMove);
				this._self_doubleClick = jg_delegate(this, this._self_doubleClick);
				this._data_success = jg_delegate(this, this._data_success);
				this._data_error = jg_delegate(this, this._data_error);

				this.externalInterface = {};

				var color = this._seriesColor;
				var colorDark = ColorUtils.brightness(color, -0.15);
				var brush = new GradientFillBrush("linear", [ color, colorDark ], [ 1, 1 ], [ 0, 1 ]);
				brush.setTileTransform(new Matrix(0, 1, -1, 0));

				this._histogram = new Histogram();
				this._histogram.setBrush(brush);
				this._histogram.setMinimumX(this._histogram.getActualMinimumX());
				this._histogram.setMaximumX(this._histogram.getActualMaximumX());
				this._histogram.setMinimumY(this._histogram.getActualMinimumY());
				this._histogram.setMaximumY(this._histogram.getActualMaximumY());
				this._histogram.addEventListener("containedRangeXChanged", this._histogram_containedRangeXChanged);
				this._histogram.addEventListener("containedRangeYChanged", this._histogram_containedRangeYChanged);

				this._axisLabelsX = new TimeAxisLabels();
				this._axisLabelsX.setHistogram(this._histogram);
				this._axisLabelsX.setLabelFormat(jg_delegate(this, this._timeAxisFormat));
				this._axisLabelsX.addEventListener("invalidated", this._child_invalidated);

				this._axisLabelsY1 = new NumericAxisLabels();
				this._axisLabelsY1.setHistogram(this._histogram);
				this._axisLabelsY1.setLabelFormat(jg_delegate(this, this._numericAxisFormat));
				this._axisLabelsY1.addEventListener("invalidated", this._child_invalidated);

				this._axisLabelsY2 = new NumericAxisLabels();
				this._axisLabelsY2.setHistogram(this._histogram);
				this._axisLabelsY2.setPlacement("right");
				this._axisLabelsY2.setLabelFormat(jg_delegate(this, this._numericAxisFormat));
				this._axisLabelsY2.addEventListener("invalidated", this._child_invalidated);

				this._gridLines = new GridLines();
				this._gridLines.setAxisLabels(this._axisLabelsY1);

				this._cursorMarker = new CursorMarker();
				this._cursorMarker.setHistogram(this._histogram);

				this._rangeMarker = new ClickDragRangeMarker();
				this._rangeMarker.setHistogram(this._histogram);
				this._rangeMarker.setMinimumSnap(jg_delegate(this, this._minimumSnap));
				this._rangeMarker.setMaximumSnap(jg_delegate(this, this._maximumSnap));
				this._rangeMarker.setMinimumFormat(jg_delegate(this, this._minimumFormat));
				this._rangeMarker.setMaximumFormat(jg_delegate(this, this._maximumFormat));
				this._rangeMarker.setRangeFormat(jg_delegate(this, this._rangeFormat));
				this._rangeMarker.addEventListener("dragComplete", this._rangeMarker_dragComplete);

				this._tooltip = new Tooltip();

				this._elementQuery.bind("mouseover", this._self_mouseOver);
				this._elementQuery.bind("mouseout", this._self_mouseOut);
				this._elementQuery.bind("mousemove", this._self_mouseMove);
				this._elementQuery.bind("dblclick", this._self_doubleClick);

				this._gridLines.appendTo(this);
				this._histogram.appendTo(this);
				this._axisLabelsX.appendTo(this);
				this._axisLabelsY1.appendTo(this);
				this._axisLabelsY2.appendTo(this);
				this._cursorMarker.appendTo(this);
				this._rangeMarker.appendTo(this);
				this._tooltip.appendTo(this);

				this._updateViewRange();
				this._updateCountRange();
			};

			// Public Getters/Setters

			this.getTimeZone = function()
			{
				return this._timeZoneString;
			};
			this.setTimeZone = function(value)
			{
				value = (value != null) ? String(value) : null;
				if (this._timeZoneString === value)
					return;
				this._timeZoneString = value;
				this._timeZone = value ? new SplunkTimeZone(value) : TimeZones.LOCAL;
				this._axisLabelsX.setTimeZone(this._timeZone);
				this._rangeMarker.invalidate("updateRange");
			};

			this.getJobID = function()
			{
				return this._jobID;
			};
			this.setJobID = function(value)
			{
				value = (value != null) ? String(value) : null;
				if (this._jobID === value)
					return;
				this._jobID = value;
			};

			this.getBucketCount = function()
			{
				return this._bucketCount;
			};
			this.setBucketCount = function(value)
			{
				value = ((value > 0) && (value < Infinity)) ? Number(value) : 0;
				if (this._bucketCount === value)
					return;
				this._bucketCount = value;
			};

			this.getViewMinimum = function()
			{
				return this._viewMinimum;
			};

			this.getViewMaximum = function()
			{
				return this._viewMaximum;
			};

			this.getSelectionMinimum = function()
			{
				return this._selectionMinimum;
			};
			this.setSelectionMinimum = function(value)
			{
				if (this._rangeMarker.isDragging())
					return;

				this._rangeMarker.setMinimum(isNaN(value) ? null : Number(value));
				this._updateSelectionRange(false);
			};

			this.getSelectionMaximum = function()
			{
				return this._selectionMaximum;
			};
			this.setSelectionMaximum = function(value)
			{
				if (this._rangeMarker.isDragging())
					return;

				this._rangeMarker.setMaximum(isNaN(value) ? null : Number(value));
				this._updateSelectionRange(false);
			};

			this.getActualSelectionMinimum = function()
			{
				return this._actualSelectionMinimum;
			};

			this.getActualSelectionMaximum = function()
			{
				return this._actualSelectionMaximum;
			};

			this.getTimelineData = function()
			{
				return this._cloneTimelineData(this._timelineData);
			};

			this.getTimelineScale = function()
			{
				var timelineData = this._timelineData;
				if (!timelineData)
					return null;

				var buckets = timelineData.buckets;
				if (buckets.length == 0)
					return null;

				var bucket = buckets[0];
				var duration = TimeUtils.subtractDates(bucket.latestTime, bucket.earliestTime);
				if (duration.years > 0)
					return { value:duration.years, unit:"year" };
				if (duration.months > 0)
					return { value:duration.months, unit:"month" };
				if (duration.days > 0)
					return { value:duration.days, unit:"day" };
				if (duration.hours > 0)
					return { value:duration.hours, unit:"hour" };
				if (duration.minutes > 0)
					return { value:duration.minutes, unit:"minute" };
				if (duration.seconds > 0)
					return { value:duration.seconds, unit:"second" };
				return null;
			};

			this.getEnableChartClick = function()
			{
				return this._enableChartClick;
			};
			this.setEnableChartClick = function(value)
			{
				this._enableChartClick = value;
			};

			this.getScaleY = function()
			{
				return this._scaleY;
			};
			this.setScaleY = function(value)
			{
				value = (value == "log") ? "log" : "linear";
				if (this._scaleY === value)
					return;
				this._scaleY = value;
				this._histogram.setScaleY((value == "log") ? new LogScale() : null);
			};

			this.getForegroundColor = function()
			{
				return this._foregroundColor;
			};
			this.setForegroundColor = function(value)
			{
				value = isNaN(value) ? 0x000000 : Number(value);
				if (this._foregroundColor === value)
					return;
				this._foregroundColor = value;
				this._axisLabelsX.setForegroundColor(value);
				this._axisLabelsY1.setForegroundColor(value);
				this._axisLabelsY2.setForegroundColor(value);
				this._gridLines.setForegroundColor(value);
				this._cursorMarker.setForegroundColor(value);
				this._rangeMarker.setForegroundColor(value);
			};

			this.getSeriesColor = function()
			{
				return this._seriesColor;
			};
			this.setSeriesColor = function(value)
			{
				value = isNaN(value) ? 0x000000 : Number(value);
				if (this._seriesColor === value)
					return;
				this._seriesColor = value;
				var brush = this._histogram.getBrush();
				brush.setColors([ value, ColorUtils.brightness(value, -0.15) ]);
				this._histogram.setBrush(brush);
			};

			// Public Methods

			this.update = function()
			{
				this._updateCount++;
				this._update();
				return this._updateCount;
			};

			this.getSelectedBuckets = function()
			{
				if (!this._timelineData)
					return null;

				var buckets = this._timelineData.buckets;
				if (!buckets)
					return null;

				var selectedBuckets = new Array();

				var selectionMinimum = this._actualSelectionMinimum;
				var selectionMaximum = this._actualSelectionMaximum;
				var bucket;
				var bucketTime;

				for (var i = 0, l = buckets.length; i < l; i++)
				{
					bucket = buckets[i];

					bucketTime = bucket.earliestTime;
					if (!bucketTime || (bucketTime.getTime() < selectionMinimum))
						continue;

					bucketTime = bucket.latestTime;
					if (!bucketTime || (bucketTime.getTime() > selectionMaximum))
						continue;

					selectedBuckets.push(this._cloneTimelineData(bucket));
				}

				return selectedBuckets;
			};

			this.appendToOverride = function(element)
			{
				this._updateSizeInterval = setInterval(this.updateSize, 50);

				this.updateSize();
			};

			this.removeOverride = function(element)
			{
				clearInterval(this._updateSizeInterval);
			};

			this.renderOverride = function(width, height)
			{
				var tl = this.localToGlobal(new Point(0, 0));
				var br = this.localToGlobal(new Point(width, height));

				this._histogram.validate("processData");
				this._histogram.validate("updateRangeX");
				this._histogram.validate("updateRangeY");

				this._axisLabelsX.setWidth(width);
				this._axisLabelsX.validate();
				height = Math.max(height - this._axisLabelsX.getHeight(), 0);

				this._axisLabelsY1.setHeight(height);
				this._axisLabelsY1.validate();
				var x1 = this._axisLabelsY1.getWidth();

				this._axisLabelsY2.setHeight(height);
				this._axisLabelsY2.validate();
				var x2 = Math.max(x1, width - this._axisLabelsY2.getWidth());

				width = x2 - x1;

				this._axisLabelsX.setX(x1);
				this._axisLabelsX.setY(height);
				this._axisLabelsX.setWidth(width);
				this._axisLabelsX.validate();

				this._axisLabelsY2.setX(x2);

				this._histogram.setX(x1);
				this._histogram.setWidth(width);
				this._histogram.setHeight(height);
				this._histogram.validate();

				this._gridLines.setX(x1);
				this._gridLines.setWidth(width);
				this._gridLines.setHeight(height);
				this._gridLines.validate();

				this._cursorMarker.setX(x1);
				this._cursorMarker.setWidth(width);
				this._cursorMarker.setHeight(height);
				this._cursorMarker.validate();

				this._rangeMarker.setX(x1);
				this._rangeMarker.setWidth(width);
				this._rangeMarker.setHeight(height);
				this._rangeMarker.validate();

				this._tooltip.setViewBounds(new Rectangle(tl.x, tl.y, br.x - tl.x, br.y - tl.y));

				this._updateTooltip();
			};

			this.dispatchUpdated = function()
			{
				if (this.isValid("dispatchUpdated"))
					return;

				this.setValid("dispatchUpdated");

				this.dispatchEvent("updated", { updateCount: this._updatedCount });
			};

			this.updateSize = function()
			{
				this.setWidth(this._elementQuery.width());
				this.setHeight(this._elementQuery.height());
			};

			// Private Methods

			this._update = function()
			{
				if (this._dataLoading)
					return;

				this._updatingCount = this._updateCount;
				this._loadJobID = this._jobID;
				if (!this._loadJobID)
				{
					this._updateComplete(null);
					return;
				}

				this._dataLoading = true;
				$.ajax(
				{
					type: "GET",
					url: this._hostPath + this._basePath + "/search/jobs/" + this._loadJobID + "/timeline?offset=0&count=" + this._bucketCount,
					dataType: "xml",
					success: this._data_success,
					error: this._data_error
				});
			};

			this._updateComplete = function(data)
			{
				this._updateTimelineData(data);

				this._dataLoading = false;

				this._updatedCount = this._updatingCount;

				this.invalidate("dispatchUpdated");

				if (this._updatingCount < this._updateCount)
					this._update();
			};

			this._updateTimelineData = function(timelineData)
			{
				this._timelineData = timelineData;

				var jobIDChanged = (this._loadJobID != this._prevJobID);
				this._prevJobID = this._loadJobID;

				if (jobIDChanged)
				{
					this._rangeMarker.setMinimum(null);
					this._rangeMarker.setMaximum(null);
				}

				this._rangeMarker.invalidate("updateRange");

				this._cursorMarker.setValue((timelineData && (timelineData.buckets.length > 0) && timelineData.cursorTime) ? timelineData.cursorTime.getTime() : null);

				var buckets = timelineData ? timelineData.buckets.concat() : null;
				if (buckets)
				{
					var bucket;
					for (var i = 0, l = buckets.length; i < l; i++)
					{
						bucket = buckets[i];
						buckets[i] = { x1: bucket.earliestTime, x2: bucket.latestTime, y: bucket.eventCount };
					}
				}
				this._histogram.setData(buckets);

				this.invalidate("render");
				this.validate();

				this._updateViewRange();
				this._updateSelectionRange();
			};

			this._updateViewRange = function()
			{
				if ((!this._timelineData || (this._timelineData.buckets.length == 0)) && !isNaN(this._viewMinimum))
					return;

				var minimum = this._histogram.getContainedMinimumX();
				var maximum = this._histogram.getContainedMaximumX();

				if ((minimum == this._viewMinimum) && (maximum == this._viewMaximum))
					return;

				this._viewMinimum = minimum;
				this._viewMaximum = maximum;

				this.dispatchEvent("viewChanged", { viewMinimum: this._viewMinimum, viewMaximum: this._viewMaximum });

				var tweenMinimum = new MethodTween(this._histogram, this._histogram.getMinimumX, this._histogram.setMinimumX, this._histogram.getActualMinimumX(), this._histogram.getContainedMinimumX());
				var tweenMaximum = new MethodTween(this._histogram, this._histogram.getMaximumX, this._histogram.setMaximumX, this._histogram.getActualMaximumX(), this._histogram.getContainedMaximumX());
				var tween = new GroupTween([ tweenMinimum, tweenMaximum ], new CubicEaser(EaseDirection.OUT));
				TweenRunner.start(tween, 0.5);

				this._updateSelectionRange();
			};

			this._updateCountRange = function()
			{
				if (!this._timelineData || (this._timelineData.eventCount == 0))
					return;

				var tweenMinimum = new MethodTween(this._histogram, this._histogram.getMinimumY, this._histogram.setMinimumY, this._histogram.getActualMinimumY(), this._histogram.getContainedMinimumY());
				var tweenMaximum = new MethodTween(this._histogram, this._histogram.getMaximumY, this._histogram.setMaximumY, this._histogram.getActualMaximumY(), this._histogram.getContainedMaximumY());
				var tween = new GroupTween([ tweenMinimum, tweenMaximum ], new CubicEaser(EaseDirection.OUT));
				TweenRunner.start(tween, 0.5);
			};

			this._updateSelectionRange = function(dispatchEvent)
			{
				if (this._rangeMarker.isDragging())
					return;

				if (dispatchEvent === undefined)
					dispatchEvent = true;

				var minimum = this._rangeMarker.getMinimum();
				var maximum = this._rangeMarker.getMaximum();

				if (minimum != null)
				{
					this._selectionMinimum = minimum;
					minimum = this._rangeMarker.getActualMinimum();
				}
				else
				{
					this._selectionMinimum = NaN;
					minimum = this._viewMinimum;
				}

				if (maximum != null)
				{
					this._selectionMaximum = maximum;
					maximum = this._rangeMarker.getActualMaximum();
				}
				else
				{
					this._selectionMaximum = NaN;
					maximum = this._viewMaximum;
				}

				if ((minimum == this._actualSelectionMinimum) && (maximum == this._actualSelectionMaximum))
					return;

				this._actualSelectionMinimum = minimum;
				this._actualSelectionMaximum = maximum;

				if (isNaN(this._selectionMinimum) && isNaN(this._selectionMaximum))
					return;

				if (dispatchEvent)
					this.dispatchEvent("selectionChanged", { selectionMinimum: this._actualSelectionMinimum, selectionMaximum: this._actualSelectionMaximum });
			};

			this._updateTooltip = function(mouseGlobal)
			{
				if (mouseGlobal == null)
					mouseGlobal = this._prevMouseGlobal ? this._prevMouseGlobal : new Point();
				else
					this._prevMouseGlobal = mouseGlobal;

				var mouseLocal = this._histogram.globalToLocal(mouseGlobal);
				var bucketData = this._rangeMarker.isDragging() ? null : this._histogram.getDataUnderPoint(mouseLocal.x, mouseLocal.y);
				if (bucketData && bucketData.bounds)
				{
					var bounds = bucketData.bounds;
					var boundsTL = this._histogram.localToGlobal(new Point(bounds.x, bounds.y));
					var boundsBR = this._histogram.localToGlobal(new Point(bounds.x + bounds.width, bounds.y + bounds.height));

					this._tooltip.setTargetBounds(new Rectangle(boundsTL.x, boundsTL.y, boundsBR.x - boundsTL.x, boundsBR.y - boundsTL.y));

					if (this._tooltipData && (this._tooltipData.data === bucketData.data))
						return;

					this._tooltipData = bucketData;

					this._tooltip.setValue(this._tipFormat(bucketData.data));
					this._tooltip.show();

					if (this._enableChartClick)
						this._elementQuery.css({ cursor: "pointer" });
				}
				else
				{
					if (!this._tooltipData)
						return;

					this._tooltipData = null;

					this._tooltip.setValue(null);
					this._tooltip.hide();

					this._elementQuery.css({ cursor: "auto" });
				}
			};

			this._parseTimelineData = function(node)
			{
				if (!node)
					return null;

				var attributes = node.attributes;
				var attribute;
				var childNodes = node.childNodes;
				var childNode;
				var i;
				var l;

				var earliestTime = null;
				var latestTime = null;
				var cursorTime = null;
				var duration = NaN;
				var earliestOffset = NaN;
				var latestOffset = NaN;
				var eventCount = 0;
				var eventAvailableCount = 0;
				var isComplete = false;
				var buckets = [];

				for (i = 0, l = attributes.length; i < l; i++)
				{
					attribute = attributes[i];
					if (attribute.nodeType == 2)
					{
						switch (attribute.nodeName.toLowerCase())
						{
							case "t":
								earliestTime = new DateTime(Number(attribute.nodeValue));
								break;
							case "cursor":
								cursorTime = new DateTime(Number(attribute.nodeValue));
								break;
							case "d":
								duration = Number(attribute.nodeValue);
								break;
							case "etz":
								earliestOffset = Number(attribute.nodeValue);
								break;
							case "ltz":
								latestOffset = Number(attribute.nodeValue);
								break;
							case "c":
								eventCount = Number(attribute.nodeValue);
								break;
							case "a":
								eventAvailableCount = Number(attribute.nodeValue);
								break;
							case "f":
								isComplete = (attribute.nodeValue == "1");
								break;
						}
					}
				}

				for (i = 0, l = childNodes.length; i < l; i++)
				{
					childNode = childNodes[i];
					if (childNode.nodeType == 1)
					{
						switch (childNode.nodeName.toLowerCase())
						{
							case "bucket":
								buckets.push(this._parseTimelineData(childNode));
								break;
						}
					}
				}

				if (isNaN(duration))
					duration = 0;
				if (isNaN(earliestOffset))
					earliestOffset = 0;
				if (isNaN(latestOffset))
					latestOffset = 0;

				if (earliestTime)
					latestTime = new DateTime(earliestTime.getTime() + duration);

				if (buckets.length > 0)
				{
					var earliestBucketTime = buckets[0].earliestTime;
					if (earliestBucketTime && (!earliestTime || (earliestBucketTime.getTime() < earliestTime.getTime())))
						earliestTime = earliestBucketTime.clone();

					var latestBucketTime = buckets[buckets.length - 1].latestTime;
					if (latestBucketTime && (!latestTime || (latestBucketTime.getTime() > latestTime.getTime())))
						latestTime = latestBucketTime.clone();

					if (earliestTime && latestTime)
						duration = latestTime.getTime() - earliestTime.getTime();
				}

				if (earliestTime)
					earliestTime = earliestTime.toTimeZone(new SimpleTimeZone(earliestOffset));
				if (latestTime)
					latestTime = latestTime.toTimeZone(new SimpleTimeZone(latestOffset));
				if (cursorTime)
					cursorTime = cursorTime.toTimeZone(new SimpleTimeZone(earliestOffset));

				var data = {};
				data.earliestTime = earliestTime;
				data.latestTime = latestTime;
				data.cursorTime = cursorTime;
				data.duration = duration;
				data.eventCount = eventCount;
				data.eventAvailableCount = eventAvailableCount;
				data.isComplete = isComplete;
				data.buckets = buckets;
				return data;
			};

			this._cloneTimelineData = function(timelineData)
			{
				if (!timelineData)
					return null;

				var clonedData = {};
				clonedData.earliestTime = timelineData.earliestTime ? timelineData.earliestTime.getTime() : null;
				clonedData.earliestOffset = timelineData.earliestTime ? timelineData.earliestTime.getTimeZoneOffset() : 0;
				clonedData.latestTime = timelineData.latestTime ? timelineData.latestTime.getTime() : null;
				clonedData.latestOffset = timelineData.latestTime ? timelineData.latestTime.getTimeZoneOffset() : 0;
				clonedData.cursorTime = timelineData.cursorTime ? timelineData.cursorTime.getTime() : null;
				clonedData.duration = timelineData.duration;
				clonedData.eventCount = timelineData.eventCount;
				clonedData.eventAvailableCount = timelineData.eventAvailableCount;
				clonedData.isComplete = timelineData.isComplete;

				var buckets = timelineData.buckets;
				var numBuckets = buckets.length;
				var parsedBuckets = clonedData.buckets = [];
				for (var i = 0; i < numBuckets; i++)
					parsedBuckets.push(this._cloneTimelineData(buckets[i]));

				return clonedData;
			};

			this._minimumSnap = function(value)
			{
				var buckets = this._histogram.getData();
				if (buckets)
				{
					var bucket;
					var bucketTime = null;
					for (var i = buckets.length - 1; i >= 0; i--)
					{
						bucket = buckets[i];
						bucketTime = bucket.x1;
						if (bucketTime && (bucketTime.getTime() <= value))
							break;
					}
					if (bucketTime && !isNaN(bucketTime.getTime()))
						value = bucketTime.getTime();
				}
				return value;
			};

			this._maximumSnap = function(value)
			{
				var buckets = this._histogram.getData();
				if (buckets)
				{
					var bucket;
					var bucketTime = null;
					for (var i = 0, l = buckets.length; i < l; i++)
					{
						bucket = buckets[i];
						bucketTime = bucket.x2;
						if (bucketTime && (bucketTime.getTime() >= value))
							break;
					}
					if (bucketTime && !isNaN(bucketTime.getTime()))
						value = bucketTime.getTime();
				}
				return value;
			};

			this._timeAxisFormat = function(date)
			{
				if (!date)
					return "";

				var dateString = "";

				var majorUnit = this._axisLabelsX.getActualUnit();

				var resYears = 0;
				var resMonths = 1;
				var resDays = 2;
				var resHours = 3;
				var resMinutes = 4;
				var resSeconds = 5;
				var resSubSeconds = 6;

				var resMin;
				var resMax;

				var prevDate = this._prevDate;

				if (!prevDate || (prevDate.getTime() > date.getTime()) || (prevDate.getYear() != date.getYear()))
					resMin = resYears;
				else if (prevDate.getMonth() != date.getMonth())
					resMin = resMonths;
				else if (prevDate.getDay() != date.getDay())
					resMin = resDays;
				else
					resMin = resHours;

				this._prevDate = date.clone();

				if ((majorUnit.seconds % 1) > 0)
					resMax = resSubSeconds;
				else if ((majorUnit.seconds > 0) || ((majorUnit.minutes % 1) > 0))
					resMax = resSeconds;
				else if ((majorUnit.minutes > 0) || ((majorUnit.hours % 1) > 0))
					resMax = resMinutes;
				else if ((majorUnit.hours > 0) || ((majorUnit.days % 1) > 0))
					resMax = resHours;
				else if ((majorUnit.days > 0) || ((majorUnit.months % 1) > 0))
					resMax = resDays;
				else if ((majorUnit.months > 0) || ((majorUnit.years % 1) > 0))
					resMax = resMonths;
				else
					resMax = resYears;

				if (resMin > resMax)
					resMin = resMax;

				if (resMax == resSubSeconds)
					dateString += this._formatTime(date, "full");
				else if (resMax == resSeconds)
					dateString += this._formatTime(date, "medium");
				else if (resMax >= resHours)
					dateString += this._formatTime(date, "short");

				if ((resMax >= resDays) && (resMin <= resDays))
					dateString += (dateString ? "\n" : "") + this._formatDate(date, "EEE MMM d");
				else if ((resMax >= resMonths) && (resMin <= resMonths))
					dateString += (dateString ? "\n" : "") + this._formatDate(date, "MMMM");

				if ((resMax >= resYears) && (resMin <= resYears))
					dateString += (dateString ? "\n" : "") + this._formatDate(date, "yyyy");

				return dateString;
			};

			this._numericAxisFormat = function(num)
			{
				return this._formatNumber(num);
			};

			this._minimumFormat = function(value)
			{
				return this._minMaxFormat(this._minimumSnap(value));
			};

			this._maximumFormat = function(value)
			{
				return this._minMaxFormat(this._maximumSnap(value));
			};

			this._minMaxFormat = function(value)
			{
				var dateTime = new DateTime(value);
				dateTime = dateTime.toTimeZone(this._timeZone);

				var dateFormat = "medium";
				var timeFormat;
				if ((dateTime.getSeconds() % 1) >= 0.001)
					timeFormat = "full";
				else if (dateTime.getSeconds() > 0)
					timeFormat = "medium";
				else if (dateTime.getMinutes() > 0)
					timeFormat = "short";
				else if (dateTime.getHours() > 0)
					timeFormat = "short";
				else
					timeFormat = "none";

				if (timeFormat == "none")
					return this._formatDate(dateTime, dateFormat);
				else
					return this._formatDateTime(dateTime, dateFormat, timeFormat);
			};

			this._rangeFormat = function(minimum, maximum)
			{
				var minimumTime = new DateTime(this._minimumSnap(minimum));
				minimumTime = minimumTime.toTimeZone(this._timeZone);

				var maximumTime = new DateTime(this._maximumSnap(maximum));
				maximumTime = maximumTime.toTimeZone(this._timeZone);

				var duration = TimeUtils.subtractDates(maximumTime, minimumTime);

				var str = "";
				if (duration.years > 0)
					str += this._formatNumericString("%s year ", "%s years ", duration.years);
				if (duration.months > 0)
					str += this._formatNumericString("%s month ", "%s months ", duration.months);
				if (duration.days > 0)
					str += this._formatNumericString("%s day ", "%s days ", duration.days);
				if (duration.hours > 0)
					str += this._formatNumericString("%s hour ", "%s hours ", duration.hours);
				if (duration.minutes > 0)
					str += this._formatNumericString("%s minute ", "%s minutes ", duration.minutes);
				if (duration.seconds > 0)
					str += this._formatNumericString("%s second ", "%s seconds ", Math.floor(duration.seconds * 1000) / 1000);

				return str;
			};

			this._tipFormat = function(data)
			{
				if (!data)
					return "";
				return this._formatTooltip(data.x1, data.x2, data.y);
			};

			this._formatNumber = function(num)
			{
				num = NumberUtils.toPrecision(num, 12);

				var format = this.externalInterface.formatNumber;
				if (typeof format === "function")
					return format(num);

				return String(num);
			};

			this._formatNumericString = function(strSingular, strPlural, num)
			{
				num = NumberUtils.toPrecision(num, 12);

				var format = this.externalInterface.formatNumericString;
				if (typeof format === "function")
					return format(strSingular, strPlural, num);

				var str = (Math.abs(num) == 1) ? strSingular : strPlural;
				str = str.split("%s").join(String(num));
				return str;
			};

			this._formatDate = function(dateTime, dateFormat)
			{
				if (dateFormat === undefined)
					dateFormat = "full";

				var format = this.externalInterface.formatDate;
				if (typeof format === "function")
					return format(dateTime.getTime(), dateTime.getTimeZoneOffset(), dateFormat);

				return this._pad(dateTime.getYear(), 4) + "-" + this._pad(dateTime.getMonth(), 2) + "-" + this._pad(dateTime.getDay(), 2);
			};

			this._formatTime = function(dateTime, timeFormat)
			{
				if (timeFormat === undefined)
					timeFormat = "full";

				var format = this.externalInterface.formatTime;
				if (typeof format === "function")
					return format(dateTime.getTime(), dateTime.getTimeZoneOffset(), timeFormat);

				return this._pad(dateTime.getHours(), 2) + ":" + this._pad(dateTime.getMinutes(), 2) + ":" + this._pad(dateTime.getSeconds(), 2, 3);
			};

			this._formatDateTime = function(dateTime, dateFormat, timeFormat)
			{
				if (dateFormat === undefined)
					dateFormat = "full";
				if (timeFormat === undefined)
					timeFormat = "full";

				var format = this.externalInterface.formatDateTime;
				if (typeof format === "function")
					return format(dateTime.getTime(), dateTime.getTimeZoneOffset(), dateFormat, timeFormat);

				return this._pad(dateTime.getYear(), 4) + "-" + this._pad(dateTime.getMonth(), 2) + "-" + this._pad(dateTime.getDay(), 2) + " " + this._pad(dateTime.getHours(), 2) + ":" + this._pad(dateTime.getMinutes(), 2) + ":" + this._pad(dateTime.getSeconds(), 2, 3);
			};

			this._formatTooltip = function(earliestTime, latestTime, eventCount)
			{
				var format = this.externalInterface.formatTooltip;
				if (typeof format === "function")
					return format(earliestTime.getTime(), latestTime.getTime(), earliestTime.getTimeZoneOffset(), latestTime.getTimeZoneOffset(), eventCount);

				return eventCount + " events from " + earliestTime.toString() + " to " + latestTime.toString();
			};

			this._pad = function(value, digits, fractionDigits)
			{
				if (isNaN(value))
					return "NaN";
				if (value === Infinity)
					return "Infinity";
				if (value === -Infinity)
					return "-Infinity";

				if (digits === undefined)
					digits = 0;
				if (fractionDigits === undefined)
					fractionDigits = 0;

				var str = value.toFixed(20);

				var decimalIndex = str.indexOf(".");
				if (decimalIndex < 0)
					decimalIndex = str.length;
				else if (fractionDigits < 1)
					str = str.substring(0, decimalIndex);
				else
					str = str.substring(0, decimalIndex) + "." + str.substring(decimalIndex + 1, decimalIndex + fractionDigits + 1);

				for (var i = decimalIndex; i < digits; i++)
					str = "0" + str;

				return str;
			};

			this._histogram_containedRangeXChanged = function()
			{
				this._updateViewRange();
			};

			this._histogram_containedRangeYChanged = function()
			{
				this._updateCountRange();
			};

			this._rangeMarker_dragComplete = function()
			{
				this._updateSelectionRange();
			};

			this._child_invalidated = function(pass)
			{
				if (pass == "render")
					this.invalidate("render");
			};

			this._self_mouseOver = function(e)
			{
				this._updateTooltip(new Point(e.pageX, e.pageY));
			};

			this._self_mouseOut = function(e)
			{
				this._updateTooltip(new Point(e.pageX, e.pageY));
			};

			this._self_mouseMove = function(e)
			{
				this._updateTooltip(new Point(e.pageX, e.pageY));
			};

			this._self_doubleClick = function(e)
			{
				if (!this._enableChartClick)
					return;

				this._updateTooltip(new Point(e.pageX, e.pageY));

				var bucketData = this._tooltipData;
				if (!bucketData)
					return;

				var data = {};
				data.earliestTime = {};  // flash timeline sends empty objects (due to JABridge conversion of DateTime), so we will emulate
				data.latestTime = {};
				data.eventCount = bucketData.data.y;

				var fields = [ "earliestTime", "latestTime", "eventCount" ];

				this.dispatchEvent("chartDoubleClicked", { data: data, fields: fields, altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
			};

			this._data_success = function(xml, msg, xhr)
			{
				this._updateComplete(this._parseTimelineData(xml.documentElement));
			};

			this._data_error = function(xhr, msg, error)
			{
				this._updateComplete(null);
			};

		});

	});
})();
});

require.define("/ui/timeline/format.js", function (require, module, exports, __dirname, __filename) {
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
    var time = require('./splunk_time.js');
    
    var DateTime = time.splunk.time.DateTime;
    var SimpleTimeZone = time.splunk.time.SimpleTimeZone;
    
    var formatNumber = exports.formatNumber = function(num) {
        var pos = Math.abs(num);
        if ((pos > 0) && ((pos < 1e-3) || (pos >= 1e9))) {
            return num.toExponential(2).replace(/e/g, "E").replace(/\+/g, "");
        }

        var str = String(Number(num.toFixed(3)));
        var dotIndex = str.indexOf(".");
        if (dotIndex < 0) {
            dotIndex = str.length;
        }
        var str2 = str.substring(dotIndex, str.length);
        var i;
        for (i = dotIndex - 3; i > 0; i -= 3) {
            str2 = "," + str.substring(i, i + 3) + str2;
        }
        str2 = str.substring(0, i + 3) + str2;
        return str2;
    };
    
    var formatNumericString = exports.formatNumericString = function(strSingular, strPlural, num) {
        var str = (Math.abs(num) === 1) ? strSingular : strPlural;
        str = str.split("%s").join(formatNumber(num));
        return str;
    };

    var formatDate = exports.formatDate = function(time, timeZoneOffset, dateFormat) {
        var date = new DateTime(time);
        date = date.toTimeZone(new SimpleTimeZone(timeZoneOffset));

        var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
        var monthShortNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
        var weekdayShortNames = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];

        switch (dateFormat) {
            case "EEE MMM d":
                return  weekdayShortNames[date.getWeekday()] + " " + monthShortNames[date.getMonth() - 1] + " " + date.getDay();
            case "MMMM":
                return monthNames[date.getMonth() - 1];
            case "yyyy":
                return String(date.getYear());
            default:
                return monthShortNames[date.getMonth() - 1] + " " + date.getDay() + ", " + date.getYear();
        }
    };

    var formatTime = exports.formatTime = function(time, timeZoneOffset, timeFormat) {
        var date = new DateTime(time);
        date = date.toTimeZone(new SimpleTimeZone(timeZoneOffset));

        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = Math.floor(date.getSeconds());
        var milliseconds = Math.floor((date.getSeconds() - seconds) * 1000);
        var ampm = (hours < 12) ? "AM" : "PM";

        if (hours >= 12) {
            hours -= 12;
        }
        if (hours === 0) {
            hours = 12;
        }

        hours = ("" + hours);
        minutes = (minutes < 10) ? ("0" + minutes) : ("" + minutes);
        seconds = (seconds < 10) ? ("0" + seconds) : ("" + seconds);
        milliseconds = (milliseconds < 100) ? (milliseconds < 10) ? ("00" + milliseconds) : ("0" + milliseconds) : ("" + milliseconds);

        switch (timeFormat)
        {
            case "short":
                return hours + ":" + minutes + " " + ampm;
            case "medium":
                return hours + ":" + minutes + ":" + seconds + " " + ampm;
            case "long":
            case "full":
                return hours + ":" + minutes + ":" + seconds + "." + milliseconds + " " + ampm;
            default:
                if (milliseconds !== "000") {
                    return hours + ":" + minutes + ":" + seconds + "." + milliseconds + " " + ampm;
                }
                if (seconds !== "00") {
                    return hours + ":" + minutes + ":" + seconds + " " + ampm;
                }
                return hours + ":" + minutes + " " + ampm;
        }
    };

    var formatDateTime = exports.formatDateTime = function(time, timeZoneOffset, dateFormat, timeFormat) {
        return formatDate(time, timeZoneOffset, dateFormat) + " " + formatTime(time, timeZoneOffset, timeFormat);
    };

    var formatTooltip = exports.formatTooltip = function(earliestTime, latestTime, earliestOffset, latestOffset, eventCount) {
        return formatNumericString("%s event", "%s events", eventCount) + " from " + formatDateTime(earliestTime, earliestOffset) + " to " + formatDateTime(latestTime, latestOffset);
    };
})();
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

require.define("/browser.ui.timeline.entry.js", function (require, module, exports, __dirname, __filename) {
    
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

    window[exportName].UI.Timeline = require('../ui/timeline.js');
})(__exportName);
});
require("/browser.ui.timeline.entry.js");


})();