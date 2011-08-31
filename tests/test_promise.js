
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
    var Promise  = require('../splunk').Splunk.Promise;
    var minitest = require('../external/minitest');
    var _        = require('../external/underscore.js');

    minitest.context("Promise Tests", function() {
        this.assertion("Simple promise#when resolve", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function(myInt) {
                    test.assert.strictEqual(myInt, 5);
                    test.finished();
                },
                function(myInt) {
                    test.assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            process.nextTick(function() { resolver.resolve(5); }); 
        }); 
        
        this.assertion("Simple promise#when fail", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function(myInt) {
                    test.assert.strictEqual(myInt, 5);
                    test.finished();
                },
                function(myInt) {
                    test.assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#when fail chain no handler", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function(myInt) {
                    test.assert.ok(false);
                }
            );

            p2.whenFailed(
                function(v1) {
                    test.assert.strictEqual(v1, 4);
                    test.finished();
                } 
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#when return arguments", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return arguments;
                }
            );

            p2.when(
                function(args) {
                    test.assert.ok(_.isArguments(args));
                    args = _.toArray(args);
                    test.assert.strictEqual(args[0] + args[1], 10);
                    test.finished();
                }
            );

            resolver.resolve(2, 8);
        });
        
        this.assertion("Simple promise#when return arguments promise", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.Success(arguments);
                }
            );

            p2.when(
                function(args) {
                    test.assert.ok(_.isArguments(args));
                    args = _.toArray(args);
                    test.assert.strictEqual(args[0] + args[1], 10);
                    test.finished();
                }
            );

            resolver.resolve(2, 8);
        });
        
        this.assertion("Simple promise#whenResolved", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.whenResolved(
                function(myInt) {
                    test.assert.strictEqual(myInt, 5);
                    test.finished();
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#whenFailed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.whenFailed(
                function(myInt) {
                    test.assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#when multiple resolved", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var resolveCount = 0;

            p1.when(
                [
                    function(myInt) {
                        resolveCount++;

                        test.assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        test.assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        test.assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        test.assert.strictEqual(myInt, 5);
                        test.assert.strictEqual(resolveCount, 4);

                        test.finished();
                    }
                ],
                function(myInt) {
                    test.assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#when multiple failed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var failCount = 0;

            p1.when(
                function(myInt) {
                    test.assert.strictEqual(myInt, 5);
                    test.finished();
                },
                [
                    function(myInt) {
                        failCount++;

                        test.assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        test.assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        test.assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        test.assert.strictEqual(myInt, 4);
                        test.assert.strictEqual(failCount, 4);

                        test.finished();
                    }
                ]
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#when resolve chain", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function(myInt) {
                    test.assert.strictEqual(myInt, 5);

                    return myInt + 5;
                },
                function(myInt) {
                    test.assert.ok(false);
                }
            );

            p2.whenResolved(
                function(anotherInt) {
                    test.assert.strictEqual(anotherInt, 10);
                    test.finished();
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#when fail chain", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function(myInt) {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 4);

                    return v1 * 2;
                }
            );

            p2.whenFailed(
                function(anotherInt) {
                    test.assert.strictEqual(anotherInt, 8);
                    test.finished();
                }
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#join one", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pJoined = Promise.join(p1);

            pJoined.when(function(v1) {
                test.assert.strictEqual(v1, 15);
                test.finished();
            });

            resolver.resolve(15);
        });
        
        this.assertion("Simple promise#join two", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var resolver2 = new Promise.Resolver();
            var p2 = resolver2.promise;

            var pJoined = Promise.join(p1, p2);

            pJoined.when(function(v1, v2) {
                test.assert.strictEqual(v1 + v2, 15);
                test.finished();
            });

            resolver.resolve(5);
            resolver2.resolve(10);
        });
        
        this.assertion("Simple promise#join immediate", function(test) {
            var pJoined = Promise.join(5, 10);

            pJoined.when(
                function(v1, v2) {
                    test.assert.strictEqual(v1 + v2, 15);
                    test.finished(); 
                }
            );
        });
        
        this.assertion("Simple promise#join immediate array", function(test) {
            var pJoined = Promise.join(5, 10);
            var resolveCount = 0;

            pJoined.when([
                function(v1, v2) {
                    test.assert.strictEqual(v1 + v2, 15);
                    resolveCount++;
                },
                function(v1, v2) {
                    test.assert.strictEqual((v1 + v2) * 2, 30);
                    resolveCount++;
                },
                function(v1, v2) {
                    test.assert.strictEqual((v1 + v2) * 3, 45);
                    resolveCount++;
                },
                function(v1, v2) {
                    test.assert.strictEqual((v1 + v2) * 4, 60);
                    resolveCount++;

                    test.assert.strictEqual(resolveCount, 4);
                    test.finished(); 
                },
            ]);
        });
        
        this.assertion("Simple promise#join immediate + promise", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pJoined = Promise.join(5, p1);

            pJoined.when(
                function(v1, v2) {
                    test.assert.strictEqual(v1 + v2, 15);
                    test.finished(); 
                }
            );

            resolver.resolve(10);
        });
        
        this.assertion("Simple promise#join mixed results", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var resolver2 = new Promise.Resolver();
            var p2 = resolver2.promise;

            var resolver3 = new Promise.Resolver();
            var p3 = resolver3.promise;

            var pJoined = Promise.join(p1, p2, p3);

            pJoined.when(function(v1, v2, v3) {
                test.assert.strictEqual(v3, undefined);
                test.assert.strictEqual(v1 + v2[0] + v2[1], 35);
                test.finished();
            });

            resolver.resolve(5);
            resolver2.resolve(10, 20);
            resolver3.resolve();
        });
        
        this.assertion("Simple promise#join fail one", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pJoined = Promise.join(p1);

            pJoined.when(
                function(v1, v2) {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 10);
                    test.finished();
                }
            );

            resolver.fail(10);
        });
        
        this.assertion("Simple promise#join fail two", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var resolver2 = new Promise.Resolver();
            var p2 = resolver2.promise;

            var pJoined = Promise.join(p1, p2);

            pJoined.when(
                function(v1, v2) {
                    test.ok(false);
                },
                function(reason) {
                    test.assert.strictEqual(reason, 4);
                    test.finished();
                }
            );

            resolver.fail(4);
            resolver2.fail(8);
        });
        
        this.assertion("Simple promise#already resolved", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;
            resolver.resolve(5);

            p1.when(
                function(v1) {
                    test.assert.strictEqual(v1, 5);
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );
        });
        
        this.assertion("Simple promise#already failed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;
            resolver.fail(4);

            p1.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 4);
                    test.finished();
                }
            );
        });
        
        this.assertion("Simple promise#done", function(test) {
            var pDone = Promise.Done;

            pDone.when(
                function() {
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );
        });
        
        this.assertion("Simple promise#neverdone", function(test) {
            var pNever = Promise.NeverDone;

            pNever.when(
                function() {
                    test.assert.ok(false);
                },
                function() {
                    test.assert.ok(false);
                }
            );

            // This is a bit bogus - there's no way to know
            // that the never done promise will never be done,
            // but this is the closest I can get.
            process.nextTick(function() { test.finished(); });
        });
        
        this.assertion("Simple promise#chain with promise", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pWhen = p1.when(
                function(v1) {
                    test.assert.strictEqual(v1, 5);

                    var resolver2 = new Promise.Resolver();
                    var p2 = resolver2.promise;

                    process.nextTick(function() { resolver2.resolve(v1 * 2); });

                    return p2;
                },
                function(v1) {
                    test.assert.ok(false);
                }
            );

            pWhen.when(
                function(v1) {
                    test.assert.strictEqual(v1, 10);
                    test.finished();  
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain with mixed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pWhen = p1.when(
                [
                    function(v1) {
                        test.assert.strictEqual(v1, 5);
                        
                        var resolver2 = new Promise.Resolver();
                        var p2 = resolver2.promise;
                        
                        process.nextTick(function() { resolver2.resolve(v1 * 2); });
                        
                        return p2;
                    },
                    function(v1) {
                        test.assert.strictEqual(v1, 5);

                        return [v1 * 3, v1 * 4];
                    }
                ],
                function(v1) {
                    test.assert.ok(false);
                }
            );

            pWhen.when(
                function(v1, v2) {
                    test.assert.strictEqual(v1 + v2[0] + v2[1], 45);
                    test.finished();  
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain with promise failure", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pWhen = p1.when(
                function(v1) {
                    test.assert.strictEqual(v1, 5);

                    var resolver2 = new Promise.Resolver();
                    var p2 = resolver2.promise;

                    process.nextTick(function() { resolver2.fail(v1 * 2); });

                    return p2;
                },
                function() {
                    test.assert.ok(false);
                }
            );

            pWhen.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 10);
                    test.finished();  
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#resolve multiple values", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function(v1, v2, v3, v4) {
                    test.assert.strictEqual(v1 + v2 + v3 + v4, 10);
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.resolve(1,2,3,4);
        });
        
        this.assertion("Simple promise#fail multiple values", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1, v2, v3, v4) {
                    test.assert.strictEqual(v1 + v2 + v3 + v4, 10);
                    test.finished();
                }
            );

            resolver.fail(1,2,3,4);
        });
        
        this.assertion("Simple promise#join multiple with multiple resolved values", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var resolver2 = new Promise.Resolver();
            var p2 = resolver2.promise;

            Promise.join(p1, p2).when(
                function(v1, v2) {
                    test.assert.strictEqual(v1[0] + v1[1] + v2[0] + v2[1], 10);
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.resolve(1,2);
            resolver2.resolve(3,4);
        });        

        this.assertion("Simple promise#chain multiple", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                [
                    function(v1) {
                        return Promise.Success(v1 * 2, v1 * 3);
                    },
                    function(v1) { 
                        return Promise.Success(v1 * 2, v1 * 3);
                    }
                ],
                function() {
                    test.assert.ok(false);
                }
            );

            p2.when(
                function(v1, v2) {
                    test.assert.strictEqual(v1[0] + v1[1] + v2[0] + v2[1], 100);
                    test.finished();
                }
            );

            resolver.resolve(10);
        });        

        this.assertion("Simple promise#chain multiple mixed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                [
                    function(v1) {
                        return Promise.Success(v1 * 2, v1 * 3);
                    },
                    function(v1) { 
                        return Promise.Failure(v1 * 3, v1 * 4);
                    }
                ],
                function() {
                    test.assert.ok(false);
                }
            );

            p2.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1[0] + v1[1], 70);
                    test.finished();
                }
            );

            resolver.resolve(10);
        });
        
        this.assertion("Simple promise#chain fail", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.whenFailed(function(reason) {
               var resolverFail = new Promise.Resolver();
               var pFail = resolverFail.promise;

               resolverFail.fail(4);
               return pFail;
            });

            p2.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 4);
                    test.finished();
                }
            );

            resolver.fail();
        });
        
        this.assertion("Simple promise#chain fail2", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.whenFailed(function(reason) {
                return Promise.Failure(4);
            });

            p2.when(
                function() {
                    test.assert.ok(false);
                },
                function(v1) {
                    test.assert.strictEqual(v1, 4);
                    test.finished();
                }
            );

            resolver.fail();
        });
        
        this.assertion("Simple promise#chain fail succeed", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.whenFailed(function(reason) {
                var resolverSuccess = new Promise.Resolver();
                var pSuccess = resolverSuccess.promise;

                resolverSuccess.resolve(5);
                return pSuccess;
            });

            p2.when(
                function(v1) {
                    test.assert.strictEqual(v1, 5);
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.fail();
        });
        
        this.assertion("Simple promise#sleep", function(test) {
            Promise.sleep(100).whenResolved(function() { test.finished(); });
        });
        
        this.assertion("Simple promise#sleep chaining", function(test) {
            var originalDate = new Date();
            var doneP = Promise.sleep(100).whenResolved(
                function() { 
                    return Promise.sleep(100).whenResolved(
                        function() {
                            return Promise.sleep(100);
                        }
                    );
                }
            );

            doneP.whenResolved(
                function() {
                    var newDate = new Date();
                    var delta = newDate - originalDate;
                    test.assert.ok(delta > 200);
                    test.finished();
                }
            );
        });
        
        this.assertion("Simple promise#progress once", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.onProgress(
                function(prg) {
                    test.assert.strictEqual(prg.percent, 0.5);
                },
                function(prg) {
                    test.assert.strictEqual(prg.percent, 0.5);
                }
            );

            p1.when(
                function() {
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.progress({percent: 0.5});
            resolver.resolve();
        });
        
        this.assertion("Simple promise#progress multiple", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;
            
            var reports = [0.25, 0.5];
            var numReports = reports.length;

            var progressReports = 0;
            p1.onProgress(
                function(prg) {
                    var expectedPercent = reports.shift();
                    test.assert.strictEqual(prg.percent, expectedPercent);
                    progressReports++;
                }
            );
            
            for(var i = 0; i < reports.length; i++) {
                (function(index) {
                    var reportsCopy = reports.slice();
                    process.nextTick(function() { 
                        var success = resolver.progress({percent: reportsCopy[index]});
                        test.assert.ok(success);
                    })})(i);
            }

            p1.when(
                function() {
                    test.assert.strictEqual(progressReports, numReports);
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            process.nextTick(
                function() {
                    resolver.resolve();
                }
            );
        });
        
        this.assertion("Simple promise#progress fail", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.onProgress(
                function(prg) { 
                    test.assert.ok(false);
                }
            );

            p1.when(
                function() {
                    test.finished();
                },
                function() {
                    test.assert.ok(false);
                }
            );

            resolver.resolve();

            var reported = resolver.progress({percent: 0.5});
            test.assert.ok(!reported);
        });
        
        this.assertion("Simple promise#when no fail callback", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function() {
                    test.assert.ok(false);
                }
            );

            p1.whenFailed(
                function() {
                    test.finished();
                }
            );

            resolver.fail();
        });
        
        this.assertion("Simple promise#while success", function(test) {
            var counter = 0;

            var whileP = Promise.while({
                condition: function() { return counter < 10; },
                body: function() {
                    counter++;

                    return Promise.sleep(10);
                }
            });

            whileP.whenResolved(function() {
                test.assert.strictEqual(counter, 10);
                test.finished();
            });
        });
        
        this.assertion("Simple promise#while fail", function(test) {
            var counter = 0;

            var whileP = Promise.while({
                condition: function() { return counter < 10; },
                body: function(iteration) {
                    test.assert.strictEqual(iteration, counter);
                    counter++;

                    if (counter === 2) {
                        return Promise.Failure(3);
                    }
                }
            });

            whileP.whenFailed(function(v1) {
                test.assert.strictEqual(counter, 2);
                test.assert.strictEqual(v1, 3);
                test.finished();
            });
        });
        
        this.assertion("Simple promise#chain join two", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join(1, 2);
                }
            );

            p2.when(function(v1, v2) {
                test.assert.strictEqual(v1 + v2, 3);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join none", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join();
                }
            );

            p2.when(function(v1, v2) {
                test.assert.ok(!v1);
                test.assert.ok(!v2);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join one", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join(1);
                }
            );

            p2.when(function(v1) {
                test.assert.strictEqual(v1, 1);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join array", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join([10]);
                }
            );

            p2.when(function(v1) {
                test.assert.strictEqual(v1[0], 10);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join promise array", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join(Promise.Success(10));
                }
            );

            p2.when(function(v1) {
                test.assert.deepEqual(v1, 10);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join array array", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function() {
                    return Promise.join([[10]]);
                }
            );

            p2.when(function(v1) {
                test.assert.strictEqual(v1[0][0], 10);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join chain", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function(v1) {
                    return Promise.join(Promise.join(Promise.join(Promise.join(Promise.Success(v1)))));
                }
            );

            p2.when(function(v1, v2) {
                test.assert.strictEqual(v1, 5);
                test.assert.ok(!v2);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join multiple results", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.whenResolved(
                function(v1) {
                    return Promise.join(Promise.join(Promise.join(Promise.join(Promise.Success(v1)))));
                },
                function(v1) {
                    return v1 * 2;
                }
            );

            p2.when(function(v1, v2) {
                test.assert.strictEqual(v1, 5);
                test.assert.strictEqual(v2, 10);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#chain join multiple promises", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.whenResolved(
                function(v1) {
                    return Promise.join(Promise.join(Promise.join(Promise.join(Promise.Success(v1)))));
                },
                function(v1) {
                    return Promise.join(v1 * 2);
                },
                function(v1) {
                    return Promise.Success(v1 * 3);
                },
                function(v1) {
                    return Promise.join(v1, v1);
                }
            );

            p2.when(function(v1, v2, v3, v4) {
                test.assert.strictEqual(v1, 5);
                test.assert.strictEqual(v2, 10);
                test.assert.strictEqual(v3, 15);
                test.assert.strictEqual(v4[0] + v4[1], 10);
                test.finished();
            });

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#promise failure value", function(test) {
            var p1 = Promise.Failure(4);

            p1.whenFailed(
                function(reason) {
                    test.assert.strictEqual(reason, 4);
                    test.finished();
                }
            );
        });
    });

    if (module === require.main) {
        minitest.run();
    }
})();

