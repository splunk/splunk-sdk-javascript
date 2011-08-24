
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

    root.Promise = Class.extend({
        init: function(resolver) {
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
                    throw "Promise is cancelled";
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

    root.Promise.join = function(/* p1, p2, ... */) {
        var resolver = new root.Promise.Resolver();

        var args = arguments;
        var promiseCount = 0;
        var values = [];
        var promises = [];

        var addWhen = function(promise, index) {
            promise.when(              
                // If the promise resolves successfully
                function(resolvedVal) {               
                    // We'll decrement the count and store the value
                    promiseCount--;
                    values[index] = resolvedVal;
                    
                    // If this is the last promise to resolve, then
                    // we can just resolve the master resolver.
                    if (promiseCount === 0) {
                        resolver.resolve.apply(resolver, values);
                    } 
                },
                
                // If the promise failed, we immediately fail
                // the master resolver.
                function(failedWith) {
                    resolver.fail(failedWith);  
                }
            );
        };

        for(var i = 0; i < args.length; i++) {
            var val = args[i];
            var isPromise = val instanceof root.Promise;
            if (isPromise) {
                promiseCount++;
                var index = i;

                addWhen(val, index);
            }
            else {
                // If this isn't a promise, then we just store
                // the final value.
                values[i] = val;
            }
        }

        if (promiseCount === 0) {
            resolver.resolve.apply(resolver, values);
        }

        return resolver.promise;
    };

    root.Promise.Resolver = Class.extend({

        init: function(canceller) {
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

        resolve: function() {                    
            if (!this.isFinalized) {
                this.isFinalized = this.isResolved = true;
                this.resolvedWith = _.toArray(arguments);

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();

                    // Store all the values returned by the registered success
                    // callbacks on this listener
                    var values = [];
                    if (_.isArray(listener.success)) {
                        for(var i = 0; i < listener.success.length; i++) {
                            var successCallback = listener.success[i];

                            // Push the success value
                            values.push(successCallback.apply(null, arguments));
                        }
                    }
                    else if (_.isFunction(listener.success)) {
                        // Push the success value
                        values.push(listener.success.apply(null, arguments));
                    }

                    // We resolve the downchain resolver using all the values
                    // we accumulated from the registered success callbacks.
                    listener.resolver.resolve.apply(listener.resolver, values);
                }
            }
            else {
                throw "Trying to resolve a finalized resolver: ";
            }
        },

        fail: function(value) {
            if (!this.isFinalized) {
                this.isFinalized = this.isFailed = true;
                this.failedWith = value;

                while (this.listeners[0]) {
                    var listener = this.listeners.shift();

                    if (_.isArray(listener.failure)) {
                        for(var i = 0; i < listener.failure.length; i++) {
                            var failureCallback = listener.failure[i];
                            failureCallback(value);
                        }
                    }
                    else if (_.isFunction(listener.failure)) {
                        listener.failure(value);
                    }

                    // Note that we do *not* forward the return values
                    // of the registered failure callbacks.
                    listener.resolver.fail(value);
                }
            }
            else {
                throw "Trying to fail a finalized resolver";
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
                throw "Trying to cancel a finalized resolver";
            }
        }
    });
})();