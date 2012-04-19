## Searching

The most common use of the SDK is to perform searches against your Splunk
instance and fetch those results. The SDK makes this a simple task, providing
useful methods for common operations.

### Splunk's different search modes

Splunk has a few different search modes, and it is useful to understand the 
difference between them and when it is appropriate to use which. These 
are specified by adding an `exec_mode=MODE` parameter to the `POST` request
to the `search/jobs` endpoint.

*   **`exec_mode=normal`**: A normal search is one that is executed
    asynchronously. It will immediately return an instance of the job,
    and a user needs to poll the job if it has completed, and only then
    access the events/results. If preview is enabled for this search,
    you can also ask for previews before the search is completed.
*   **`exec_mode=blocking`**: A blocking search is similar to a
    normal search, with the only exception that it will not return
    until the search has completed. This means that you do not need 
    to poll, but you will also not be able to get previews. You 
    *cannot* use `exec_mode=blocking` with real-time searches.
*   **`exec_mode=oneshot`**: Oneshot searches are the simplest
    and least flexible form of searches. The request will not
    return until the search is complete, and rather than returning a search
    job instance, it will simply return all the results. You *cannot* use
    `exec_mode=oneshot` with real-time searches.

Splunk also has a streaming endpoint at `search/jobs/export`, but the JS SDK
does not support it at the moment.

### Creating searches

Creating a search can be done very easily. For example, to create a normal
search:

    var svc = ...;
    svc.search("search * | head 10", {}, function(err, job) {
        // search is running and job is the instance of that job 
    });
    
or a blocking search:

    var svc = ...;
    svc.search(
        "search * | head 10", 
        { exec_mode: "blocking" },
        function(err, job) {
            // search is done and job is the instance of that job    
        }
    );
    
or a oneshot search:

    var svc = ...;
    svc.oneshotSearch("search * | head 10", {}, function(err, results) {
        console.log(results); 
    });
    
#### Real-time searches

Creating a real-time search is just as easy. To create a real-time search
that has an infinte window (from now to forever):

    var svc = ...;
    svc.search(
        "search * | head 10", 
        { earliest_time: "rt", latest_time: "rt" }, 
        function(err, job) {
            // search is running and job is the instance of that job    
        }
    );
    
or one with a specific sliding window (say, 10 minutes):

    var svc = ...;
    svc.search(
        "search * | head 10", 
        { earliest_time: "rt-10m", latest_time: "rt" }, 
        function(err, job) {
            // search is running and job is the instance of that job    
        }
    );
    
#### Passing parameters when creating a search

It can be useful to be able to pass parameters when creating a search,
so that you can specify various options, like `earliest_time`, `max_count`,
`status_buckets, etc:

    var svc = ...;
    svc.search(
        "search * | head 10", 
        { earliest_time: "-10m", status_buckets: "300" }, 
        function(err, job) {
            // search is running and job is the instance of that job    
        }
    );
    
#### Getting a search to run in the context of a specific app/user namespace

Searches may need to be executed in the context of a specific app/user, for
example if a lookup is only defined for some app:

    var svc = ...;
    svc.search(
        "search * | head 10", 
        {},
        { app: "MyAwesomeApp", owner: "admin" }, 
        function(err, job) {
            // search is running and job is the instance of that job
        }
    );
    
