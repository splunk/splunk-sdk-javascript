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
