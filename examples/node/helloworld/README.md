# Hello World Examples

This folder contains several "Hello World"-style examples. These examples do
not have any command-line processing or complicated logic. Instead, all
of the examples hard-code the connection information for Splunk.

One note is that we do test the examples in our test harness, so there is
a way to sideload connection information. However, you can safely ignore this.

## `apps.js` and `apps_async.js`

These files demonstrate working with the `Splunk.Client.Applications` collection
and `Splunk.Client.Application` entity. It will list all the apps, and for each
one print its name.

The only difference between the two files is that the latter uses the built-in
`Splunk.Async` module to make asynchronous control-flow easier.

## `savedsearches.js` and `savedsearches_async.js`

These files demonstrate working with the `Splunk.Client.SavedSearches` collection
and `Splunk.Client.SavedSearch` entity. It will list all the saved searches, and 
for each one print its name and the search query associated with it.

The only difference between the two files is that the latter uses the built-in
`Splunk.Async` module to make asynchronous control-flow easier.