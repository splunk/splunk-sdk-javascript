# Splunk JavaScript SDK Changelog

## v1.1.0

### New Features and APIs

* `Job.track` is a new method to allow you to track the progress of a job. It
  allows you to get notifications when a job is 'ready', 'done', 'failed', 'error' 
  as well as a progress event while a job is still running. You can ask for any 
  one or combination of the above events. Here is a sample usage to know when a 
  job is done:
  
  ```
  job.track({ period: 200 }, {
      done: function(job) {
          console.log("Job is done!")
      }
  });
  ```

  You can read more about this feature in the [documentation](http://docs.splunk.com/Documentation/JavaScriptSDK), 
  or see a sample usage in the Timeline UI example.

  This feature replaces the old `splunkjs.JobManager` class.

* `Job.iterator` is a new method that allows you to get an iterator over the
  results, events, or "results preview" of a search job. For example, you can
  iterate over all the results as follows:
  
  ```
  var iterator = job.iterator("results", { pagesize: 4 });
  var shouldContinue = true;
  Async.whilst(
      function() { return hasMore; },
      function(done) {
          iterator.next(function(err, results, hasMore) {
              if (err) {
                  done(err);
              }
              else {
                  console.log(results);
                  shouldContinue = hasMore;
                  done();
              }
          });
      },
      function(err) {
          console.log("We are done iterating!");
      }
  );
  ```

  This feature replaces the old `splunkjs.JobManager.{events|results|preview}Iterator`
  methods.

### Breaking Changes

* The easyXDM library is no longer included "in-the-box". This library was not
being used, and could not work with a Splunk instance that had a self-signed
SSL certificate.

* The default Splunk version is now 5.0 instead of 4.3. If you were previously
connecting to a Splunk 4.3 instance, you need to specify a `version: "4.3"` when
you construct your `splunkjs.Service` instance or in your `.splunkrc`.

* The `splunkjs.JobManager` has been removed, and it's functionality has been
replaced by two functions: `Job.track` and `Job.iterator`. Read more about them
in the `New features and APIs` section.

* Support for Splunk Storm has been removed, and will be added back once the
Storm API is reactivated and stable.

## v1.0.0

No changes.

## v0.8.0 - Beta

No changes.

## v0.6.0

### xml2json

This version requires you to update the `xml2json` app. You can do this by
copying the xml2json directory (/splunk-sdk-javascript/xml2json) to the
Splunk apps directory ($SPLUNK_HOME/etc/apps).

### Features

#### Versioning of the SDK

The SDK can now handle multiple versions of Splunk. When you create a
`Service` instance, you can pass in an optional `version` parameter,
which will change internal behavior of the SDK, but present a consistent
state of the world to the developer. For example, passing `version: 5.0`
will make the SDK use the native JSON support in the next version of
Splunk.

#### More extensive testing

The SDK now has much higher test coverage.

#### Bug fixes for Charting component

Several bugs in the charting component have been fixed.

### Breaking Changes

#### Change to `search/typeahead` endpoint

In the next version of Splunk, with native JSON support, the output for the
`search/typeahead` endpoint has changed. Instead of a top level array with completions,
it now returns a top-level object:

  {
    "results": [...]
  }

## v0.5.0

Version 0.5.0 of the JavaScript SDK presents a refined SDK with major changes,
some of which will break existing applications.

### Features

#### Improved naming

The root namespace of the SDK has switched from `Splunk` to `splunkjs`.
Furthermore, `Client` has been renamed to `Service`. Before you had:

    new Splunk.Client.Service(...);
    new Splunk.Client.Job(...);

Now you have:

    new splunkjs.Service(...);
    new splunkjs.Service.Job(...);

#### Improvement to state management

In previous versions, the SDK kept a notion of whether an entity or
collection was in a "valid" state. This notion has been taken out, and these
resources now only contain a local cache which can be refreshed at will
by calling `fetch()` on that resource. For example:

    job.fetch(function(err, job) {
        // the local cache is now refreshed
    });

`fetch()` is now the only method of refreshing a resource. When `fetch()` is
called, the returned state from the server will be cached locally, and is
accessible to you. For instances of `Entity` (e.g. `Job`, `SavedSearch`, etc),
the following methods are available:

  - `state()`: the entire state for this entity (everything contained below)
  - `properties()`: the properties of this entity
  - `fields()`: the fields (e.g. required, optional, etc) of this entity
  - `acl()`: the Access Control List for this entity
  - `links()`: the links for this entity
  - `author`: the author field for this entity
  - `updated`: the updated time for this entity
  - `published`: the published time for this entity

And for instances of `Collection` (e.g. `Jobs`, `SavedSearches`):

  - `state()`: the entire state for this collection (everything contained below)
  - `list()`: the list of entities for this collection
  - `paging()`: the paging values for this collection (e.g. total count, offset)
  - `links()`: the links for this collection
  - `updated`: the updated time for this collection

#### Improvement to asynchronous state management functions

In previous versions of the SDK, nearly all functions that interacted with a
given resource (e.g. a `Job` entity) where asynchronous. Now, only three core
functions are asynchronous: `fetch()`, `update()` and `create()`. Both `list()`
and `item()` are now completely synchronous.

#### Proper support for Splunk namespaces (i.e. `owner/app`).

In previous versons of the SDK, the only way to specify which namespace you
wanted a particular resource fetched from was to create a new `Service`
instance. In this version, you can now specify it when the resource is
fetched. For example:

    // Fetch from "user"/"awesome_app" namespace
    var jobs = service.jobs({owner: "user", app: "awesome_app"});

#### Ability to paginate and filter collections.

You can now paginate and filter collections. For example, to get only two
saved searches starting from the 2nd offset:

    var searches = service.savedSearches();
    searches.fetch({count: 2, offset: 2}, function(err, searches) {
        console.log(searches.list().length); // is 2
    });

The full list of options is: `count`, `offset`, `search`, `sort_dir`,
`sort_key`, `sort_mode`.

#### You can now abort asynchronous HTTP requests.

When you issue an asynchronous HTTP request (which is all requests), you can now
abort this request at any time:

    var job = ...;
    var req = job.fetch(function(err) { ... });
    req.abort();

The callback will be invoked with the error value set to `"abort"`.

#### Explicit login is not required if a username and password is provided.

In previous versions of the SDK, you always had to either perform an explicit
login or provide a session key. You can now simply pass in a username and
password, and on the first request, you will be auto-logged in. Furthermore,
if any request returns a `401` error, the SDK will attempt to log you back in
once.

What was once:

    var service = new splunkjs.Service(...);
    service.login(function(err) {
        service.search(...);
    });

is now simply:

    var service = new splunkjs.Service(...);
    service.search(...);

#### Storm support

Splunk Storm is an exciting new offering providing you with the Splunk you know,
on the cloud, and much improved! The SDK now supports Storm, specifically
the ability to send data to Storm over HTTP. To work with Storm, you
simply create a `StormService` rather than a `Service`:

    var storm = new splunkjs.StormService({token: "ABC"});
    storm.log(
        "MY AWESOME LOG MESSAGE",
        {project: "XYZ123", sourcetype: "GO"},
        function(err, response) {
            console.log("DATA IS IN STORM!");
        }
    );

#### Several new entities and collections have been implemented:

We now have support for more of the Splunk REST API, specifically:

  - `Users` and `User`, and the ability to get the current user.
  - `Views` and `View`.
  - `Service.parse()`.
  - `Service.typeahead()`.
  - `Service.serverInfo()`.

#### Streamlining of submitting events to Splunk

Submitting events to Splunk over HTTP is now easier, with a simple method
on the `Service`:

    var service = new splunkjs.Service();
    service.log(
        "MY AWESOME LOG MESSAGE",
        {index: "MY_INDEX", sourcetype: "GO"},
        function(err, response) {
            console.log("DATA IS IN SPLUNK!");
        }
    );

#### `SavedSearch.history` returns actual `Job` instances

Previously, when calling `SavedSearch.history()`, the SDK returned a simple
object containing the information corresponding to that dispatch of the saved
search. The SDK will now create real `Job` instances when you call
`SavedSearch.history`:

    var savedSearch = ...;
    savedSearch.history(function(err, jobs) {
        // jobs is an array of splunkjs.Service.Job instances
    });

#### Improved JSON format

The JSON format that is returned by Splunk (through the `xml2json`, previously
known as `new_english`, translation app) has been improved. It is now much
closer to the JSON format that will be available in core Splunk in a future
version.

#### More unit tests

#### Improved documentation

### Breaking Changes

#### Namespace naming changes

The `Splunk` namespace is now `splunkjs`. `Client` has been renamed to `Service`
and all classes are now rooted there (e.g. `splunkjs.Service.Job`). This will
make it easier to include the SDK in a Splunk app.

#### Method changes

* The `read()` and `refresh()` methods have been removed, and replaced with
`fetch()`, which will always fetch a copy from the server.
* `contains()` has been removed.
* `item()` is now a synchronous method, operating on the local cache of a
collection.
* `list()` is now a synchronous method, returning the local cache of a
collection.
* `properties()` now returns only the properties of an object (the values in
the `<content>`/`content` object).

#### `xml2json`

The XML to JSON translation app previously known as `new_english` has been
renamed to `xml2json`, as well as vastly improved. You will need to delete
your old copy of `new_english` and instead copy `xml2json` to
`$SPLUNK_HOME/etc/apps`.

#### `Properties`, `PropertyFile` and `PropertyStanza` have been removed

The above classes were redundant with `Configurations`, `ConfigurationFile` and
`ConfigurationStanza`.

#### `conf.js` sample has been removed

This sample was an incorrect implementation of the Splunk conf system.

### Bug fixes

The implementation of most methods changed quite a bit, and so no specific
bugs were fixed, but rather overarching issues.

## v0.1.0

* Initial JavaScript SDK release