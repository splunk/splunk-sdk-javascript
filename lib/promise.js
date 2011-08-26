
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
    var utils   = require('./utils');
    var _       = require('../external/underscore.js');

    var root = exports || this;

    var resolverIdCounter = 0;
    var resolverIdGenerator = function() {
        var id = "Promise.Resolver " + resolverIdCounter;
        resolverIdCounter++;
        return id;
    };

    // OVERALL NOTES
    // 1.   The implementation allows for "varargs" in most places, and so no
    //      explicit parameters are used. As such, many invocations are done using
    //      'apply' rather than direct invocation.

    // The core promise object. It only allows additive operations, and disallows
    // all introspection. Management of it should be done using the Promise.Resolver
    // class. You should never create your own Promise instance.
    root.Promise = Class.extend({
        init: function(resolver) {
            this.name = resolver.name + " -- Promise";

            this.when = utils.bind(this, function(successCallbacks, failureCallbacks) {
                // We create a new resolver
                var newResolver = new root.Promise.Resolver();
                
                // Add a listener with all the parameters to the current
                // promise
                var listener = {
                    success: successCallbacks ? successCallbacks : [],
                    failure: failureCallbacks ? failureCallbacks : [],
                    resolver: newResolver
                };
                resolver._addListener(listener);
                
                // And return the new promise
                return newResolver.promise;
            });

            this.whenResolved = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [_.toArray(arguments), []]);
            });
            
            this.whenFailed = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [[], _.toArray(arguments)]);
            });

            this.onProgress = utils.bind(this, function(/* cb1, cb2, ... */) {
                resolver._addProgressListener.apply(resolver, arguments);
            });
        }
    });

    // This is a utility function to handle the completion (either resolution or 
    // failure) of a resolver. Since both are essentially identical (with the exception
    // of the callback list and what to do with the downchain resolver), we hoist
    // this logic into a separate function.
    var handleCompletion = function(callbacks, completedWith, resolver, complete) {
        // The callbacks will either return immediate values or promises,
        // and we'll store them accordingly.
        var values   = [];
        var promises = [];
        var callback;
        var val;
        
        // We always work with arrays of callbacks.
        callbacks = _.isArray(callbacks) ? callbacks : [callbacks];
        
        // For each callback, we execute it, and then store
        // the returned value appropriately, depending on whether
        // it is a promise or an immediate value.
        for(var i = 0; i < callbacks.length; i++) {
            callback = callbacks[i];
            val = callback.apply(null, completedWith);
            
            if (root.Promise.isPromise(val)) {
                promises[i] = val;
            }
            else {
                values[i] = val;
            }
        }
        
        if (promises.length > 0) {
            // If any of the returned values are promises,
            // then we have to wait until they are all resolved
            // before we can call the downchain resolver.
            root.Promise.join.apply(null, promises).when(
                function() {
                    // If all the promises were successful, then we can
                    // resolve the downchain resolver. Before we do that
                    // though, we need to meld together the results
                    // of each individual promise and all previous 
                    // immediate values.
                    var results = _.toArray(arguments);
                    for(var i = 0; i < results.length; i++) {
                        if (results[i] !== undefined) {
                            values[i] = results[i];
                        }
                    }
                    
                    resolver.resolve.apply(resolver, values);
                },
                function() {
                    // If any of the promises fail, then that is enough
                    // for us to fail the downchain resolver.
                    var args = _.toArray(arguments);
                    
                    resolver.fail.apply(resolver, args);
                }
            );
        }
        else {
            // All returned values were immediate values, so
            // we can immediately complete the downchain resolver.
            complete.apply(resolver, values);
        }
    };

    // The "management" counterpart the Promise class. A resolver is what
    // creates an accompanying promise, and allows you to resolve/fail/report
    // progress to whomever holds the promise. Note that this is a one way
    // relationship - a resolver has a link to its promise, but not the
    // the other way around.
    root.Promise.Resolver = Class.extend({
        init: function() {
            this.name = resolverIdGenerator();

            this.addListener = utils.bind(this, this.addListener);
            this.resolve     = utils.bind(this, this.resolve);
            this.fail        = utils.bind(this, this.fail);

            // Now, we create our internal promise
            this.promise           = new root.Promise(this);
            this.isResolved        = false;
            this.isFailed          = false;
            this.isFinalized       = false;
            this.resolvedWith      = null;
            this.failedWith        = null;
            this.listeners         = [];
            this.progressListeners = [];
        },

        // An internal only function to add a resolve/fail listener
        // to the resolver.
        _addListener: function(listener) {
            var finalizedInvoke = function() {};
            
            // We check to see if it is already finalized
            if (this.isFinalized) {
                // If it is, and it was resolved, then we will re-resolve once
                // we push the new listeners
                if (this.isResolved) {
                    finalizedInvoke = function() { this.resolve.apply(this, this.resolvedWith); };
                }
                else if (this.isFailed) {
                    // And if it is failed, we will re-fail once
                    // we push the new listeners
                    finalizedInvoke = function() { this.fail.apply(this, this.failedWith); };
                }

                // We mark it as "unfinalized" to not hit our "asserts".
                this.isFinalized = false;
            }

            // Push the listener
            this.listeners.push(listener);

            // And invoke the finalization case.
            finalizedInvoke.apply(this, null);
        },

        // An internal only function to add a progress report listener
        // to the resolver
        _addProgressListener: function() {
            // We always store the callbacks in an array, even if there is only one.
            this.progressListeners = _.toArray(arguments);
        },

        // Resolve the promise. Allows any number of values as the 
        // "resolved" result of the promise.
        resolve: function() {                    
            if (!this.isFinalized) {
                // Change our state, and store the values for future listeners
                this.isFinalized = this.isResolved = true;
                this.resolvedWith = _.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();
                    handleCompletion(listener.success, this.resolvedWith, listener.resolver, listener.resolver.resolve);
                }
            }
            else {
                throw new Error("Trying to resolve a finalized resolver: " + this.name);
            }
        },

        // Fail the promise. Allows any number of values as the 
        // "failed" result of the promise.
        fail: function() {
            if (!this.isFinalized) {
                // Change our state, and store the values for future listeners
                this.isFinalized = this.isFailed = true;
                this.failedWith = _.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();
                    handleCompletion(listener.failure, this.failedWith, listener.resolver, listener.resolver.fail);
                }
            }
            else {
                throw new Error("Trying to fail a finalized resolver: " + this.name);
            }
        },

        // Report progress. Allows any number of arguments
        // as the "progress report".
        progress: function() {
            if (!this.isFinalized) {
                var callbacks = this.progressListeners;

                for(var i = 0; i < callbacks.length; i++) {
                    callbacks[i].apply(null, arguments);
                } 
                
                // Report that we did execute the progress listeners.
                return true;
            }
            else {
                // We do not allow progress reports on finalized resolvers, so 
                // we return that we did not execute the progress listeners.
                return false;
            }
        }
    });

    // A factory for a failed promise.
    root.Promise.Failure = function() {
        var failureResolver = new root.Promise.Resolver();
        var failurePromise = failureResolver.promise;
        
        failureResolver.fail.apply(failureResolver, arguments);
        
        return failurePromise;
    };

    // A factory for a successful promise.
    root.Promise.Success = function() {
        var successResolver = new root.Promise.Resolver();
        var successPromise = successResolver.promise;
        
        successResolver.resolve.apply(successResolver, arguments);
        
        return successPromise;
    };

    // A promise that is implicitly resolved
    root.Promise.Done = root.Promise.Success();

    // A promise that will never be resolved.
    root.Promise.NeverDone = (function() {
        var resolver = new root.Promise.Resolver("neverdone");

        // We are essentially losing the resolver, so
        // this promise can never be resolved.
        return resolver.promise;
    })();

    // Join any number of promises and return a promise that will
    // get resolved when all the passed in promises are resolved,
    // or failed as soon as one of them is failed.
    //
    // NOTE: You can pass in non-promise values as well, and they
    // will be treated as if they are already resolved promises.
    // NOTE: In the success case, all resolved results from each
    // of the promises will get passed to the resolved callbacks
    // of the joined promise.
    // NOTE: In the failure case, only the failed result of the
    // specific failed promise will be passed to the failed 
    // callbacks of the joined promise.
    root.Promise.join = function(/* p1, p2, ... */) {
        // Create a new resolver/promise pair for the joined
        // promise.
        var resolver = new root.Promise.Resolver();
        var joinPromise = resolver.promise;

        var args = arguments;
        var promiseCount = 0;
        var hasPromises = false;
        var values = [];
        var promises = [];

        // A helper to get the completion value of a promise.
        // If it is a single value, we'll return it as such,
        // but if there are multiple, we will return it as an
        // array
        var getValue = function() {
            var value;

            var returnedResults = _.toArray(arguments);
            if (returnedResults.length === 1) {
                return returnedResults[0];
            }
            else if (returnedResults.length > 1) {
                return returnedResults;
            }

            return value;
        };

        // A helper to allow us to register resolved/failed callbacks
        // on each of the individual promises.
        var addWhen = function(promise, index) {
            promise.when(              
                function() {                
                    // If the promise resolves successfully,
                    // We'll decrement the count and store the value
                    promiseCount--;
                    values[index] = getValue.apply(null, arguments);
                    
                    // If this is the last promise to resolve, then
                    // we can just resolve the master resolver.
                    if (promiseCount === 0) {
                        resolver.resolve.apply(resolver, values);
                    } 
                },
                
                function() {
                    // If the promise failed, we immediately fail
                    // the master resolver.
                    if (resolver !== null) {
                        resolver.fail(getValue.apply(null, arguments)); 
                        resolver = null;
                    }
                }
            );
        };

        // We iterate over all the passed in alleged promises, and figure
        // out whether they are promises or not.
        for(var i = 0; i < args.length; i++) {
            var val = args[i];
            if (root.Promise.isPromise(val)) {
                promiseCount++;
                var index = i;

                // We can't add the "when" handlers immediately,
                // because they may fire promptly. So we queue them.
                // This lets us get a full count of how many promises
                // we are dealing with, so the counter can go up to N.
                promises.push({index: index, promise: val});
            }
            else {
                // If this isn't a promise, then we just store
                // the final value.
                values[i] = val;
            }
        }

        // If all the values are prompt, we can simply resolve
        // right away.
        if (promiseCount === 0) {
            resolver.resolve.apply(resolver, values);
        }

        // For each promise, we add the "when" handler.
        for (i = 0; i < promises.length; i++) {
            addWhen(promises[i].promise, promises[i].index);
        }

        // Return the promise that represents the join.
        return joinPromise;
    };

    // Checks whether the passed in value is a promise
    root.Promise.isPromise = function(allegedPromise) {
        return allegedPromise instanceof root.Promise;
    };

    // A wrapper around setInterval to return a promise.
    root.Promise.sleep = function(duration) {
        var sleepResolver = new root.Promise.Resolver();
        var sleepP = sleepResolver.promise;

        setTimeout(function() { sleepResolver.resolve(); }, duration);

        return sleepP;
    };
})();