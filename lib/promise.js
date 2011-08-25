
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
    }

    root.Promise = Class.extend({
        init: function(resolver) {
            this.name = resolver.name + " -- Promise";

            this.when = utils.bind(this, function(successCallbacks, failureCallbacks) {
                if (!resolver.isCancelled) {

                    // We create a new resolver
                    var newResolver = new root.Promise.Resolver();

                    // Add a listener with all the parameters to the current
                    // promise
                    var listener = {
                        success: successCallbacks,
                        failure: failureCallbacks,
                        resolver: newResolver
                    };
                    resolver.addListener(listener);

                    // And return the new promise
                    return newResolver.promise;
                }
                else {
                    throw new Error("Promise is cancelled");
                }
            });            

            this.whenResolved = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [_.toArray(arguments), []]);
            });
            
            this.whenFailed = utils.bind(this, function(/* f1, f2, ... */) {
                return this.when.apply(this, [[], _.toArray(arguments)]);
            });
        }
    });

    root.Promise.Resolver = Class.extend({
        init: function(canceller) {
            this.name = resolverIdGenerator();
            this.canceller = canceller;  

            this.addListener    = utils.bind(this, this.addListener);
            this.resolve        = utils.bind(this, this.resolve);
            this.fail           = utils.bind(this, this.fail);
            this.cancel         = utils.bind(this, this.cancel);

            // Now, we create our internal promise
            this.promise    = new root.Promise(this);
            this.isResolved      = false;
            this.isFailed        = false;
            this.isFinalized     = false;
            this.resolvedWith    = null;
            this.failedWith      = null;
            this.listeners       = [];
        },

        addListener: function(listener) {
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

        handleCompletion: function(callbacks, completedWith, resolver, complete) {
            // The callbacks will either return immediate values or promises,
            // and we'll store them accordingly.
            var values = [];
            var promises = [];
            var callback;
            var val;

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
                    // If all the promises are successful, then we can
                    // resolve the downchain resolver. Before we do that
                    // though, we need to meld together the results
                    // of each individual promise and all previous 
                    // immediate values.
                    function() {
                        var results = _.toArray(arguments);
                        for(var i = 0; i < results.length; i++) {
                            if (results[i] !== undefined) {
                                values[i] = results[i];
                            }
                        }

                        resolver.resolve.apply(resolver, values);
                    },

                    // If any of the promises fail, then that is enough
                    // for us to fail the downchain resolver.
                    function() {
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
        },

        resolve: function() {                    
            if (!this.isFinalized) {
                this.isFinalized = this.isResolved = true;
                this.resolvedWith = _.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();

                    this.handleCompletion(listener.success, this.resolvedWith, listener.resolver, listener.resolver.resolve);
                }
            }
            else {
                throw new Error("Trying to resolve a finalized resolver: " + this.name);
            }
        },

        fail: function() {
            if (!this.isFinalized) {
                this.isFinalized = this.isFailed = true;
                this.failedWith = _.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();
                    this.handleCompletion(listener.failure, this.failedWith, listener.resolver, listener.resolver.fail);
                }
            }
            else {
                throw new Error("Trying to fail a finalized resolver: " + this.name);
            }
        },

        cancel: function(reason) {
            if (!this.isFinalized) {
                this.isCancelled = true;

                if (this.canceller) {
                    // Cancel the downchain promise
                    this.canceller.cancel(reason);
                }

                this.fail(reason);
            }
            else {
                throw new Error("Trying to cancel a finalized resolver: " + this.name);
            }
        }
    });

    // A promise that is implicitly resolved
    root.Promise.Done = (function() {
        var resolver = new root.Promise.Resolver("done");
        resolver.resolve();

        return resolver.promise;
    })();

    root.Promise.NeverDone = (function() {
        var resolver = new root.Promise.Resolver("neverdone");

        // We are essentially losing the resolver, so
        // this promise can never be resolved.
        return resolver.promise;
    })();

    root.Promise.Failure = function() {
        var failureResolver = new root.Promise.Resolver();
        var failurePromise = failureResolver.promise;
        
        failureResolver.fail.apply(failureResolver, arguments);
        
        return failurePromise;
    };

    root.Promise.join = function(/* p1, p2, ... */) {
        var resolver = new root.Promise.Resolver("join");
        var joinPromise = resolver.promise;

        var args = arguments;
        var promiseCount = 0;
        var hasPromises = false;
        var values = [];
        var promises = [];

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

        var addWhen = function(promise, index) {
            promise.when(              
                // If the promise resolves successfully
                function() {                
                    // We'll decrement the count and store the value
                    promiseCount--;
                    values[index] = getValue.apply(null, arguments);
                    
                    // If this is the last promise to resolve, then
                    // we can just resolve the master resolver.
                    if (promiseCount === 0) {
                        resolver.resolve.apply(resolver, values);
                    } 
                },
                
                // If the promise failed, we immediately fail
                // the master resolver.
                function() {
                    if (resolver !== null) {
                        resolver.fail(getValue.apply(null, arguments)); 
                        resolver = null;
                    }
                }
            );
        };

        for(var i = 0; i < args.length; i++) {
            var val = args[i];
            if (root.Promise.isPromise(val)) {
                promiseCount++;
                var index = i;
                hasPromises = true;

                addWhen(val, index);
            }
            else {
                // If this isn't a promise, then we just store
                // the final value.
                values[i] = val;
            }
        }

        if (!hasPromises) {
            resolver.resolve.apply(resolver, values);
        }

        return joinPromise;
    };

    root.Promise.isPromise = function(allegedPromise) {
        return allegedPromise instanceof root.Promise;
    };

    root.Promise.sleep = function(duration) {
        var sleepResolver = new root.Promise.Resolver();
        var sleepP = sleepResolver.promise;

        setTimeout(function() { sleepResolver.resolve(); }, duration);

        return sleepP;
    }
})();