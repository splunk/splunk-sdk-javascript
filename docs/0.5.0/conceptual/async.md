## Async

The SDK includes a small asynchronous control flow library, modelled in spirit 
after the excellent [`async.js`][async.js] library. It provides a few helpers
to handle asynchronous execution, as well as a few array functions.

### Basic Usage

You can access the `Async` module of the root `splunkjs` namespace, and all
functions are on that object:

    splunkjs.Async.whilst(....); // async while
    splunkjs.Async.parallel(...); // execute functions in "parallel"
    ...
    
For example, if you wanted to execute two functions in "parallel" and be
notified when they are both complete:

    splunkjs.Async.parallel(
        function(done) { Async.sleep(1000, done); },
        function(done) { Async.sleep(2000, done); },
        function(err) {
            console.log("All done!");
        }
    );

### Utilities

#### Performing actions with a delay

JavaScript's `setTimeout` function can be very useful for performing an 
operation after some interval, but unfortunately, it has the arguments
in a flipped order. Instead, the `Async` module introduces a `sleep` 
function which merely flips these around:

    var timeBegin = new Date();
    splunkjs.Async.sleep(1000, function() {
        var timeEnd = new Date();
        
        // Should be approximately 1000
        console.log(timeEnd - timeBegin);   
    });

#### Augmenting callbacks with additional parameters

Sometimes it can be useful to augment a callback with additional 
parameters, especially in cases where a variable will be out of
scope in the callback. To handle this situation, we have the
`augment` function, which, given a callback and extra data, will
produce a new callback with that extra data appended to the end.

A simple example might look like this:
     
    var callback = function(a, b) {
        console.log(a); //== 1
        console.log(b); //== 2
    };
    
    var augmented = splunkjs.Async.augment(callback, 2);
    augmented(1);

A more common case, when using `Async.chain`, might look like this:

    splunkjs.Async.chain(
        function(done) {
            var a = someComplexOperation();
            
            someAsyncOperation(splunkjs.Async.augment(done, a));
        },
        function(a, done) {
            // we can use 'a' here as well now
        }
    );

### Control Flow

Control flow for asynchronous functions can become cumbersome, especially since 
most operations in the SDK involve HTTP calls, which are asynchronous. A common
operation that is performed using the SDK is waiting until a job is done by
polling the server every 2 seconds.

#### Loops

To peform a loop with asynchronuos operations can become cumbersome, and the
`whilst` function can make it friendlier:

    var i = 0;
    Async.whilst(
        function() { return i++ < 3; }, // condition
        function(done) { // body
            Async.sleep(0, function() { done(); });
        },
        function(err) { // done
            console.log(i) // == 3;
        }
    );
    
A more common example might be a loop that waits until a search job is 
complete:

    var job = ...;
    splunkjs.Async.whilst(
        // Continue looping until the job is done
        function() { return !job.properties().isDone; },
        
        // On every iteration, sleep for 1 second and then
        // refresh the job
        function(done) {
            splunkjs.Async.sleep(1000, function() { 
                job.refresh(done); 
            })
        },
        
        // When the job is complete, print out the job 
        // state
        function(err) {
            console.log(job.properties());      
        }
    );

#### Parallel and serial execution

It can be useful to execute a set of functions either in parallel (start them
all at once) or serially (start each function only when the previous finished),
and be notified when all functions are complete. We also want to preserve the
results and pass them on to the final function.

These functions are called `parallel` and `serial` (respectively), and have
the same signature. `parallel` will start all the functions at once, and 
when they are all done, execute the final callback. `serial` will start the
first function, and when it is done, start the second one, and so on. Both
functions will "exit" immediately upon encountering an error.

Imagine you have the following set of functions:

    var fns = [
        function(done) { 
            splunkjs.Async.sleep(2000, function() { console.log("A"); done(); }); 
        },
        function(done) { 
            splunkjs.Async.sleep(3000, function() { console.log("B"); done(); }); 
        },
        function(done) { 
            splunkjs.Async.sleep(1000, function() { console.log("C"); done(); }); 
        },
    ];

To run them all in parallel:

    splunkjs.Async.parallel(fns, function(err) {
        console.log("DONE PARALLEL");
    });

This will have the following output:

    C
    A
    B
    DONE PARALLEL

If you executed them serially, however:

    splunkjs.Async.series(fns, function(err) {
        console.log("DONE SERIAL");
    });
    
The output would be:

    A
    B
    C
    DONE SERIAL
    
Both functions will also pass results to the final callback, in their original
order. Consider the following functions:

    var fns = [
        function(done) { 
            splunkjs.Async.sleep(2000, function() { done(null, 1, 2); });
        },
        function(done) { 
            splunkjs.Async.sleep(3000, function() { done(null, 2); }); 
        },
        function(done) { 
            splunkjs.Async.sleep(1000, function() { done(null, {a: 1}); }); 
        },
    ];
    
Note that the first argument in each is `null`, to indicate that no error occurred.

Regardless if you execute them using `parallel` or `serial`, you will get the
results in the same order:

    splunkjs.Async.parallel(fns, function(err, a, b, c) {
        console.log(a, b, c); // will be [1 2] 2 {a: 1} 
    });
    
and

    splunkjs.Async.series(fns, function(err, a, b, c) {
        console.log(a, b, c); // will be [1 2] 2 {a: 1} 
    });
    
#### Chaining functions

A common paradigm is to execute an asynchronous function, and when it is done,
execute another one with the result of the previous one, and so on. A more
concrete example might be something like:

1. Create a new search job.
2. Wait until is done.
3. Get the results.
4. Cancel the job.
5. Be told when everything is done or an error occurred anywhere

The `chain` function can help with this. A simple example might look like this:

    splunkjs.Async.chain(
        function(callback) { 
            callback(null, 1, 2);
        },
        function(val1, val2, callback) {
            callback(null, val1 + 1);
        },
        function(val1, callback) {
            callback(null, val1 + 1, 5);
        },
        function(err, val1, val2) {
            console.log(val1); //== 3
            console.log(val2); //== 5
        }
    );
    
The final function (the one with an `err` argument) will be invoked when the
chain has completed, or when an error occurred (by passing in a non-`null` 
error argument).

Converting our previous example, it might look something like this:

    var svc = new splunkjs.Service({username: "admin", password: "changeme"});
    splunkjs.Async.chain(
        function(done) {
            svc.login(done);  
        },
        function(success, done) {
            // Create a job
            svc.search("search * | head 1", {}, done);
        },
        function(job, done) {
            // Wait until is done
            splunkjs.Async.whilst(
                // Continue looping until the job is done
                function() { return !job.properties().isDone; },
                
                // On every iteration, sleep for 1 second and then
                // refresh the job
                function(done) {
                    splunkjs.Async.sleep(1000, function() { 
                        job.refresh(done); 
                    });
                },
                
                // Augment the callback with the job itself
                splunkjs.Async.augment(done, job)
            );
        },
        function(job, done) {
            job.results({}, done);
        },
        function(results, job, done) {
            console.log(results);
            job.cancel(done);
        },
        function(err) {
            console.log("JOB DONE!");
        }
    );

### Collection handling

You can use the control flow functions to do collection operations, but we
also provide more direct operations for collections. We provide asynchronous
versions of `Array.map` and `Array.forEach`, in both `parallel` and `series`
flavors.

#### Asynchronous forEach

The asynchronous `forEach` is provided in both `series` and `parallel`
flavors. A common use case would be to cancel a list of jobs:

    var listOfJobs = [ ... ];
    Async.parallelEach(
        listOfJobs,
        function(job, idx, done) {
            console.log("Cancelling job " + idx);
            job.cancel(done);
        },
        function(err) {
            console.log("We've cancelled all jobs!");
        }
    );
    
#### Asynchronous map

`map` differs from `forEach` in that it results in a new collection
whose members are the members of the old array with the function applied
to them. A common use case in the SDK is to take a list of jobs and 
create saved searches based on them:

    var svc = ...;
    var listOfJobs = [ ... ];
    Async.parallelMap(
        listOfJobs,
        function(job, idx, done) {
            console.log("Saving job " + idx);
            svc.savedSearches().create(
                {
                    name: "Job " + idx,
                    search: job.properties().search 
                },
                done
            );
        },
        function(err, savedSearches) {
            console.log("Look at our saved searches: ", savedSearches);
        }
    );
    
You can of course use `seriesMap` if you need in-order execution (it will
always have in-order results).

[async.js]: https://github.com/caolan/async