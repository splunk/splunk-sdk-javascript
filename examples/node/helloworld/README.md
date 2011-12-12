## Hello World Examples

This folder contains several "Hello World"-style examples. These examples do
not have any command-line processing or complicated logic. Instead, all
of the examples hard-code the connection information for Splunk.

One note is that we do test the examples in our test harness, so there is
a way to sideload connection information. However, you can safely ignore this.

### Files: [`apps.js`] and [`apps_async.js`]

These files demonstrate working with the `Splunk.Client.Applications` collection
and `Splunk.Client.Application` entity. It will list all the apps, and for each
one print its name.

The only difference between the two files is that the latter uses the built-in
`Splunk.Async` module to make asynchronous control-flow easier.

### Files: [`savedsearches.js`] and [`savedsearches_async.js`]

These files demonstrate working with the `Splunk.Client.SavedSearches` collection
and `Splunk.Client.SavedSearch` entity. It will list all the saved searches, and 
for each one print its name and the search query associated with it.

The only difference between the two files is that the latter uses the built-in
`Splunk.Async` module to make asynchronous control-flow easier.

### Files: [`search_normal.js`], [`search_blocking.js`] and [`search_oneshot.js`]

These files demonstrate running searches on Splunk using the SDK. They will
run the search, print out progress (if available), search statistics 
(if available), and finally, print out the search results (including some
key-value fields).

These examples go over the space of possible search types:

* [`search_normal.js`]: execute a search with `exec_mode=normal`, wait untli the 
job is done, and then print out job statistics and the search results.

* [`search_blocking.js`]: execute a search with `exec_mode=blocking`, which will
not return from the REST call until the job is done. Once it is done, it will 
print out job statistics and the search results.

* [`search_oneshot.js`]: execute a search with `exec_mode=oneshot`, which will
not return the REST call until the job is done, and then it will simply return
the search results, rather than the search job ID. Once it is done, we print out
the results.

### Files: [`search_realtime.js`]

This example shows how to work with realtime searches. It will execute a realtime
search that will collect statistics about all events from "now" to infinity (as
noted by the use of `earliest_time=rt` and `latest_time=rt`).

Once the job is created, it will poll the results every second, and print them
out.

Since a realtime search is never "done", we only iterate for 5 times before
we terminate the loop.

[`apps.js`]:                https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/apps.js
[`apps_async.js`]:          https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/apps_async.js
[`savedsearches.js`]:       https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/savedsearches.js
[`savedsearches_async.js`]: https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/savedsearches_async.js
[`search_normal.js`]:       https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/search_normal.js
[`search_blocking.js`]:     https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/search_blocking.js
[`search_oneshot.js`]:      https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/search_oneshot.js
[`search_realtime.js`]:     https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld/search_realtime.js