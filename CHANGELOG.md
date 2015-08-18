# Splunk SDK for JavaScript Changelog

## v1.8.0

### New features and APIs

* Added support for cookie-based authentication, for Splunk 6.2+.

### Bug Fixes

* Fixed `Authorization` header always being added to request even when not authenticated.

### Minor changes

* `utils.namespaceFromProperties()` now returns an empty object when given undefined required parameters.
* Added multiple formats of `Content-Type` headers that will be read from a `http` response.
* Added `logout()` method to `context.js`.

## v1.7.1

### Bug Fixes

* Fixed an issue with data being truncated by `node_http` with multi-byte characters (see [GitHub issue #36](https://github.com/splunk/splunk-sdk-javascript/issues/36)).
* Updated request module to version `2.55.0` to include a [bug fix](https://github.com/request/request/issues/1522) for Node.js v0.12.x (see [GitHub issue #38](https://github.com/splunk/splunk-sdk-javascript/issues/38)).
* Fixed a bug in Chrome authorization header handling.

### Minor changes

* Updated mustache dependency to version `0.4.0`.

## v1.7.0

### New features and APIs

* Added support for Node.js v0.12.x and io.js.
* Added `Service.getJob()` method for getting a `Job` by its sid.
* Added `Service.ConfigurationFile.getDefaultStanza()` method for getting the `[default]` stanza of a conf file.
* Can now stream JavaScript objects with modular inputs by passing an object as the `data` parameter to the `Event` constructor; that object will then be passed to `JSON.stringify()`.
  * Updated the GitHub commits example to show this functionality.

### New Examples

* The `node/helloworld/get_job.js` example shows how to get a `Job` by its sid.
* The `node/helloworld/endpoint_instantiation.js` example shows how to access an unsupported REST API endpoint.

### Minor changes

* Added a `--quiet` option for running the tests without printing log messages prefixed with `[SPLUNKD]`.
* Update `nodeunit` dependency to v0.9.1.
* Skip data model and pivot tests for older version of Splunk.

## v1.6.0

### New features and APIs

* Added support for storage passwords.

### Minor changes

* Added "Adding an input" instructions for modular input examples in their respective `readme.md`.
* Clean up various code examples

## v1.5.0

### New features and APIs

* Added support for data models and pivots.

### Breaking changes

* Removed the `xml2json` Splunk app, which was previously bundled with the SDK.

### Bug fixes

* Fixed namespace parameter handling for `Jobs.oneshotSearch` and `Jobs.search` functions.
* Disallow the wildcard operator `-` when retrieving an entity from a `Service` object.

### Minor changes

* Added a timeout parameter to the `Context` class.
* Test suite can now emit JUnit compatible XML
* Replaced all references of the deprecated `path.existsSync` with `fs.existsSync`.
* Removed the template `splunkrc.spec` file.

## v1.4.0

### New features and APIs

* Added support for building modular inputs with node.js using the Splunk
  SDK for JavaScript.
* Added the `elementtree` module as a dependency
* Added the `readable-stream` module as a devDependency (used only in the modular input unit tests)

## v1.3.0

### New features and APIs

* Added support for Splunk alerts through the `service.FiredAlertGroupCollection` collection,
and the `service.FiredAlertGroup` and `service.FiredAlert` entities.

* Added test to verify that URL encoding of serviceNS/ URLs works.

### Breaking Changes

* Added URL encoding of owner and app in servicesNS/ URLs.

### Minor changes

* Updated the node.js `helloworld` example with example uses of the new alerts
functionality, and more accurate descriptions for `savedsearches_create.js`
and `savedsearches_delete.js`

## v1.2.3

* `Job.track` now properly uses the `dispatchState` property to work consistently
across all versions of Splunk.

## v1.2.2

* Fixed a bug in the examples that prevented them from running on Splunk 6.0.0
(due to a HTTP 413 error).

## v1.2.1

* Changed Node.js request module dependency to v2.21.x from v.2.21.1

## v1.2.0

### New features and APIs

* The Splunk SDK for JavaScript now supports Node.js v0.8.x and v0.10.x

* Add back general JQuery HTTP implementation.

* General improvements to unit tests.

### Breaking changes

* The Splunk SDK for JavaScript no longer supports Node.js v0.6.x

* Updated the Node.js request module dependency to v2.21.1

## v1.1.0

### New features and APIs

* The `Service.log` method now auto-encodes any JSON objects passed to it. For
  example, the following code is now valid:

  ```
  service.log({hello: "world"});
  ```

* The new `Job.track` function allows you to track the progress of a job by
  receiving notifications about the job status, such as 'ready', 'done',
  'failed', and 'error', as well as a progress event while the job is still
  running. You can request one or more of these events. For example, this code
  sample shows how to determine when a job is done:

  ```
  job.track({ period: 200 }, {
      done: function(job) {
          console.log("Job is done!")
      }
  });
  ```

  For more about this function, see the
  [**splunkjs.Service.Job.track** function](http://docs.splunk.com/DocumentationStatic/JavaScriptSDK/1.0/splunkjs.Service.Job.html#splunkjs.Service.Job-track),
  see code examples on the
  [How to search your data](http://dev.splunk.com/view/SP-CAAAEFA)
  page on the Developer Portal, or see the Timeline UI example in the
  **/splunk-sdk-javascript/examples/browser/ui** directory.

  This feature replaces the old `splunkjs.JobManager` class.

* The new `Job.iterator` function allows you to get an iterator over the
  results, events, and preview results of a search job. For example, you can
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

  This feature replaces the old
  `splunkjs.JobManager.{events|results|preview}Iterator` methods.

* A new "hello-world"-style code example, `log.js`, has been added to show how
  to do simple application logging using the Splunk SDK for JavaScript.

### Breaking changes

* The easyXDM library is no longer included with the Splunk SDK for JavaScript
  because this library was not being used, and could not work with a Splunk
  instance that had a self-signed SSL certificate.

* The default Splunk version is now 5.0 instead of 4.3. If you previously
  connected to a Splunk 4.3 instance, you must specify `version: "4.3"` when
  you construct your `splunkjs.Service` instance. If you are using the
  **.splunkrc** file with the code examples, include `"version=5.0"`. For more
  about the **.splunkrc** file, see the
  [Utilities](http://dev.splunk.com/view/SP-CAAAEFM) page on the Developer
  Portal.

* The `splunkjs.JobManager` class has been removed, and its functionality has
  been replaced by two functions: `Job.track` and `Job.iterator` (see "New
  features and APIs" above).

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

### Breaking changes

#### Change to `search/typeahead` endpoint

In the next version of Splunk, with native JSON support, the output for the
`search/typeahead` endpoint has changed. Instead of a top level array with
completions, it now returns a top-level object:

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

### Breaking changes

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
