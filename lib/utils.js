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
        for(let i=0; i<arr.length; i++) {
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
        let matches = original.match("^" + prefix);
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
        let matches = original.match(suffix + "$");
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
        
        for (let key in obj) {
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
            for (let i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === {}) {
                    return;
                }
            }
        } 
        else {
            for (let key in obj) {
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
            for (let prop in source) {
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
        for (let k in obj) {
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
        let currentVersion = (version + "") || "";
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

    /**
     * can make a function to pause execution for a fixed amount of time
     *
     * @example
     * 
     *      await Utils.sleep(1000);
     * 
     * @param {Number} ms The timeout period, in milliseconds.
     *
     * @function splunkjs.Utils
     */
    root.sleep = function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Runs an asynchronous `while` loop.
     *
     * @example
     *      
     *      let i = 0;
     *      try {
     *          await Utils.whilst(
     *              function() { return i++ < 3; },
     *              async function() {
     *                  await Utils.sleep(0);
     *              });
     *      } catch(err) {
     *          console.log(err);
     *      }
     *
     * @param {Function} condition A function that returns a _boolean_ indicating whether the condition has been met.
     * @param {Function} body A function that runs the body of the loop.
     *
     * @function splunkjs.Utils
     */
    root.whilst = async function(condition, body){
        condition = condition || function() { return false; };
        body = body || function() { return; };

        let iterationDone = function(err) {
            if (err) {
                throw err;
            }
            else {
                return root.whilst(condition, body);
            }
        };

        if(condition()){
            return iterationDone(await body())
        }else{
            return null;
        }
    }

    /**
     * Runs multiple functions (tasks) in parallel. 
     * Each task takes the function as a parameter. 
     * When all tasks have been completed or if an error occurs, the 
     * function returns a combined results of all tasks. 
     *
     * **Note**: Tasks might not be run in the same order as they appear in the array,
     * but the results will be returned in that order. 
     *
     * @example
     *      
     *      let [err, one, two] = await Utils.parallel([
     *          function() {
     *              return [null, 1];
     *          },
     *          function() {
     *              return [null, 2, 3];
     *          }]
     *      );
     *      console.log(err); // == null
     *      console.log(one); // == 1
     *      console.log(two); // == [1,2]
     *
     * @param {Function} tasks An array of functions.
     * @param {Boolean} fromMap set to true when method call is made from parallerMap function. (optional)
     *
     * @function splunkjs.Utils
     */
    root.parallel = async function (tasks, fromMap) {
        let res = [];
        if(!root.isArray(tasks) && root.isFunction(fromMap)){
            let taskList = [];
            Object.keys(arguments).forEach(key => {
                taskList.push(arguments[key]);
            });
            tasks = taskList;
            fromMap = false;
        }
        for(let task of tasks) {
            let result = task();
            res.push(result);
        }
        let result = await Promise.all(res);
        let response = [];
        for(let resp of result){
            if(resp){
                if(resp[0]){
                    return [resp[0], null];
                }
                if(resp.length > 2){
                    response.push(resp.slice(1));
                }else{
                    response.push(resp[1]);
                }
            }
        }
        return fromMap ? [null, response] : [null, ...response];
    }

    /**
     * Runs an asynchronous function (mapping it) over each element in an array, in parallel.
     * When all tasks have been completed or if an error occurs, function
     * returns the resulting array.
     *
     * @example
     *      
     *      let [err, vals] = await Utils.parallelMap(
     *          [1, 2, 3],
     *          async function(val, idx) { 
     *              if (val === 2) {
     *                  await Utils.sleep(100);
     *                  return [null, val+1];
     *               }
     *              else {
     *                  return [null, val + 1];
     *              }
     *          });
     *      console.log(vals); // == [2,3,4]
     *
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element. 
     *
     * @function splunkjs.Utils
     */
    root.parallelMap = async function (vals, fn) {
        vals = vals || [];
        let tasks = [];
        let createTask = function(val, idx) {
            return function() { return fn(val, idx); };
        };
        
        for(let i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i], i));
        }
        return await root.parallel(tasks, true);
    }

    /**
     * Applies an asynchronous function over each element in an array, in parallel.
     * If an error occurs, the function returns an error.
     *
     * @example
     *      
     *      var total = 0;
     *      let err = await Utils.parallelEach(
     *          [1, 2, 3],
     *          async function(val, idx) { 
     *              var go = function() {
     *                  total += val;
     *              };
     *              
     *              if (idx === 1) {
     *                  await Utils.sleep(100);
     *                  go();
     *              }
     *              else {
     *                  go();
     *              }
     *          });
     *      console.log(total); // == 6
     *
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element.
     *
     * @function splunkjs.Utils
     */
    root.parallelEach =  async function (vals, fn) {  
        vals = vals || [];
        let [err,res] = await root.parallelMap(vals, fn);
        return err || null;
    };

    /**
     * Runs multiple functions (tasks) in series. 
     * Each task takes the function as a parameter. 
     * When all tasks have been completed or if an error occurs, the 
     * function returns the combined results of all tasks in the order
     * they were run.
     * 
     * @example
     *      
     *      var keeper = 0;
     *      let [err, one, two] = awiat Utils.series([
     *          async function() {
     *              await Utils.sleep(10);
     *              console.log(keeper++); // == 0
     *              return [null, 1];
     *          },
     *          function() {
     *              console.log(keeper++); // == 1
     *              return [null, 2, 3];
     *          }]
     *      );
     *      console.log(err); // == null
     *      console.log(one); // == 1
     *      console.log(two); // == [2, 3]
     *
     * @param {Function} tasks An array of functions.
     * @param {Boolean} fromMap set to true when method call is made from seriesMap function. (optional)
     *
     * @function splunkjs.Utils
     */
    root.series = async function (tasks, fromMap) {
        let res = [];
        if(!root.isArray(tasks)&& root.isFunction(fromMap)){
            let taskList = [];
            Object.keys(arguments).forEach(key => {
                taskList.push(arguments[key]);
            });
            tasks = taskList;
            fromMap = false;
        }
        for(let task of tasks) {
            let result = await task();
            if(result){
                if(result[0]){
                    return [result[0], null];
                }
                if(result.length > 2){
                    res.push(result.slice(1));
                }else{
                    res.push(result[1]);
                }
            }
        }
        return fromMap ? [null, res] : [null, ...res];
    }

    /**
     * Runs an asynchronous function (mapping it) over each element in an array, in series.
     * When all tasks have been completed or if an error occurs, function
     * returns the resulting array.
     *
     * @example
     *      
     *      var keeper = 1;
     *      let [err, vals] = await Utils.seriesMap(
     *          [1, 2, 3],
     *          function(val, idx) { 
     *              console.log(keeper++); // == 1, then 2, then 3
     *              return [null, val + 1];
     *          }
     *      );
     *      console.log(vals); // == [2,3,4];
     *
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous) to apply to each element.
     *
     * @function splunkjs.Utils
     */
    root.seriesMap = async function (vals, fn) {
        vals = vals || [];
        let tasks = [];
        let createTask = function(val, idx) {
            return function() { 
                return fn(val, idx); 
            };
        };
        for(let i = 0; i < vals.length; i++) {
            tasks.push(createTask(vals[i], i));
        }
        return await root.series(tasks, true);
    }

    /**
     * Applies an asynchronous function over each element in an array, in series.
     * If an error occurs, the function returns an error.
     *
     * @example
     *      
     *      var results = [1, 3, 6];
     *      var total = 0;
     *      let err = await Utils.seriesEach(
     *          [1, 2, 3],
     *          function(val, idx) { 
     *              total += val;
     *              console.log(total === results[idx]); //== true
     *          });
     *      console.log(total); //== 6
     *
     * @param {Array} vals An array of values.
     * @param {Function} fn A function (possibly asynchronous)to apply to each element.
     *
     * @function splunkjs.Utils
     */
    root.seriesEach = async function (vals, fn) {  
        vals = vals || [];
        let [err,res] = await root.seriesMap(vals, fn);
        return err || null;
    };

})();