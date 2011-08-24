
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
    var Promise      = require('../splunk').Splunk.Promise;
    var minitest    = require('../external/minitest');
    var assert      = require('assert');

    minitest.setupListeners();

    minitest.context("Promise Tests", function() {
        this.setup(function() {
        });
        
        this.assertion("Simple promise#when resolve", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function(myInt) {
                    assert.strictEqual(myInt, 5);
                    test.finished();
                },
                function(myInt) {
                    assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#when fail", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.when(
                function(myInt) {
                    assert.strictEqual(myInt, 5);
                    test.finished();
                },
                function(myInt) {
                    assert.strictEqual(myInt, 4);
                    test.finished();
                }
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#whenResolved", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            p1.whenResolved(
                function(myInt) {
                    assert.strictEqual(myInt, 5);
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
                    assert.strictEqual(myInt, 4);
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

                        assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        assert.strictEqual(myInt, 5);
                    },
                    function(myInt) {
                        resolveCount++;

                        assert.strictEqual(myInt, 5);
                        assert.strictEqual(resolveCount, 4);

                        test.finished();
                    }
                ],
                function(myInt) {
                    assert.strictEqual(myInt, 4);
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
                    assert.strictEqual(myInt, 5);
                    test.finished();
                },
                [
                    function(myInt) {
                        failCount++;

                        assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        assert.strictEqual(myInt, 4);
                    },
                    function(myInt) {
                        failCount++;

                        assert.strictEqual(myInt, 4);
                        assert.strictEqual(failCount, 4);

                        test.finished();
                    }
                ]
            );

            resolver.fail(4);
        });
        
        this.assertion("Simple promise#when chain", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var p2 = p1.when(
                function(myInt) {
                    assert.strictEqual(myInt, 5);

                    return myInt + 5;
                },
                function(myInt) {
                    assert.ok(false);
                }
            );

            p2.whenResolved(
                function(anotherInt) {
                    assert.strictEqual(anotherInt, 10);
                    test.finished();
                }
            );

            resolver.resolve(5);
        });
        
        this.assertion("Simple promise#join one", function(test) {
            var resolver = new Promise.Resolver();
            var p1 = resolver.promise;

            var pJoined = Promise.join(p1);

            pJoined.when(function(v1) {
                assert.strictEqual(v1, 15);
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
                assert.strictEqual(v1 + v2, 15);
                test.finished();
            });

            resolver.resolve(5);
            resolver2.resolve(10);
        });
        
        this.assertion("Simple promise#join immediate", function(test) {
            var pJoined = Promise.join(5, 10);

            pJoined.when(
                function(v1, v2) {
                    assert.strictEqual(v1 + v2, 15);
                    test.finished(); 
                }
            );
        });
        
        this.assertion("Simple promise#join immediate array", function(test) {
            var pJoined = Promise.join(5, 10);
            var resolveCount = 0;

            pJoined.when([
                function(v1, v2) {
                    assert.strictEqual(v1 + v2, 15);
                    resolveCount++;
                },
                function(v1, v2) {
                    assert.strictEqual((v1 + v2) * 2, 30);
                    resolveCount++;
                },
                function(v1, v2) {
                    assert.strictEqual((v1 + v2) * 3, 45);
                    resolveCount++;
                },
                function(v1, v2) {
                    assert.strictEqual((v1 + v2) * 4, 60);
                    resolveCount++;

                    assert.strictEqual(resolveCount, 4);
                    test.finished(); 
                },
            ]);
        });
    });
})();