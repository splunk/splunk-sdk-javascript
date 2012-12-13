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