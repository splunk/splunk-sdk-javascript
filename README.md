**NOTE**: The version of Node.js (0.6.6) released on 12/15/11 has a [bug]
(https://github.com/isaacs/npm/issues/1888) in npm that prevents the SDK from 
being installed. You can install Node 0.6.5 to avoid this issue for now.

# The Splunk Software Development Kit for JavaScript (Preview Release)

This SDK contains library code and examples designed to enable developers to
build applications using Splunk.

Splunk is a search engine and analytic environment that uses a distributed
map-reduce architecture to efficiently index, search and process large 
time-varying data sets.

The Splunk product is popular with system administrators for aggregation and
monitoring of IT machine data, security, compliance and a wide variety of other
scenarios that share a requirement to efficiently index, search, analyze and
generate real-time notifications from large volumes of time series data.

The Splunk developer platform enables developers to take advantage of the same
technology used by the Splunk product to build exciting new applications that
are enabled by Splunk's unique capabilities.

## License

The Splunk Software Development Kit for JavaScript is licensed under the Apache
License 2.0. Details can be found in the file LICENSE.

## This SDK is a Preview Release

1.  This Preview release a pre-beta release.  There will also be a beta release 
    prior to a general release. It is incomplete and may have bugs.

2.  The Apache license only applies to the SDK and no other Software provided 
    by Splunk.

3.  Splunk in using the Apache license is not providing any warranties, 
    indemnification or accepting any liabilities  with the Preview SDK.

4.  Splunk is not accepting any Contributions to the Preview release of the SDK.
    All Contributions during the Preview SDK will be returned without review.

## Getting started with the Splunk JavaScript SDK

The Splunk JavaScript SDK contains library code and examples that show how to 
programmatically interact with Splunk for a variety of scenarios including 
searching, saved searches, data inputs, and many more, along with building 
complete applications. 

The Splunk JavaScript SDK supports both server- and client-side JavaScript. 
Depending on what you want to do—use server tools, use client tools, run 
examples, or run unit tests — read the sections below to find out what you need 
to do to get going. 

*   **Requirements**. Lists the things you must set up to use the SDK. 
*   **SDK tools for server-side JavaScript**. Describes what you need to install
    to use the tools for creating server-side JavaScript applications. 
*   **Server-side examples and tests**. Describes how to set up the .splunkrc 
    file and install dependencies that you need to run examples and tests. 
*   **SDK tools for client-side JavaScript**. Describes what you need to do to 
    use the browser tools, including a description of dependencies and examples. 
*   **Client-side examples**. Describes what you need to do if you want to run 
    the client-side examples. 
*   **Building files and running unit tests**. Tells you want you need to do to 
    build files, run examples, run tests, or generate documentation. 

### Requirements

Whether you are interested in running the JavaScript SDK on the server or 
client, the following requirements apply to both.

#### Splunk

If you haven't already installed Splunk, download it here: 
http://www.splunk.com/download. For more about installing and running Splunk and
system requirements, see [Installing & Running Splunk][SplunkInstall]. 

#### Splunk JavaScript SDK

Get the Splunk JavaScript SDK from GitHub and clone the resources to your 
computer. For example, use the following command: 

> git clone https://github.com/splunk/splunk-sdk-javascript.git

#### The XML to JSON Splunk App

JavaScript uses the JavaScript Object Notation (JSON) format for structured 
data. However, Splunk uses XML to communicate with the REST API, and XML is not 
well suited for JavaScript. Until Splunk has native JSON support, the Splunk 
JavaScript SDK is providing a Splunk app, [`new_english`][new_english], that 
translates the XML that Splunk returns into JSON. This app is required for the 
Splunk JavaScript SDK. 

To install new_english, you can either copy the 
[`splunk-sdk-javascript/new_english`][new_english] directory to the Splunk apps 
directory or you can create a symbolic link to it. Then, restart Splunk. 

**Note**: The `new_english app performs a domain check by comparing the 
requester's domain and IP address against the list of allowed ones in the 
`new_english/default/json.conf` file. If the requester's domain and IP address 
are not in this list, the app returns an error. If you are accessing Splunk from
a domain and IP address other than `localhost` and `127.0.0.1`, add your domain 
and IP address to the conf file.

**Examples for Mac OS X**:

The following example command shows how to copy the `new_english` directory to 
the apps directory (assuming the command prompt is in the 
`splunk-sdk-javascript` directory:  
    
> cp -r new_english /applications/splunk/etc/apps/new_english

The following example command shows how to create a symbolic link: 

> ln -s /users/currentusername/splunk-sdk-javascript/new_english $SPLUNK_HOME/etc/apps/new_english

Then, restart Splunk. From the command line, go to `/Applications/splunk/bin/`, 
then enter:

> ./splunk restart

**Examples for Windows**:

The following example command shows how to copy the new_english directory to the
apps directory:

> xcopy C:\splunk-sdk-javascript\new_english "C:\Program Files\Splunk\etc\apps\new_english" /s

Then, restart Splunk. From the command line, go to 
`C:\Program Files\Splunk\bin`, then enter: 

> splunk.exe restart

### SDK tools for server-side JavaScript

To use the Splunk JavaScript SDK for server-side JavaScript, you'll need to
install Node.js. This SDK also uses Node.js for other features such as running
server and client examples, running unit tests, building files, and generating
documentation. Download Node.js from the Node.js website
(http://nodejs.org/#download) and install the version for your platform.
Versions 0.6.4 and higher include the Node Package Manager (NPM), which is also
required for the SDK.  

**Note**: If you need to install an earlier version of NPM to
work with an earlier version of Node.js, see the Super Easy Install instructions
(http://npmjs.org/doc/README.html#Super-Easy-Install).  

You'll need to install the development dependencies to run the server-side 
examples and tests. At the command line, go to the `splunk-sdk-javascript` 
directory and enter:

> npm install

**Note**: You may get a warning about one of the dependencies 
"preferring global". Feel free to ignore it.

**Note**: If you just want to use the SDK in your own Node.js program, you can 
just install it using `npm install splunk-sdk` in your project's directory. This 
will only install the SDK itself, without any samples, tests or utilities.

#### Including the SDK in your own Node.js code
    
To include the Splunk JavaScript SDK in your projects, use the `require()` 
function. The following example shows how: 

    var Splunk = require('splunk-sdk').Splunk;

    var service = new Splunk.Client.Service({username: "admin", password: "changeme"});
    service.login(function(err, success) {
        if (err) {
            throw err;
        }

        console.log("Login was successful: " + success);
        service.jobs().list(function(err, jobs) {
            for(var i = 0; i < jobs.length; i++) {
                console.log("Job " + i + ": " + jobs[i].sid);
            } 
        });
    });

#### Set up the `.splunkrc` file

To connect to Splunk, many of the SDK examples and unit tests take command-line
arguments that specify values for the host, port, and login credentials for
Splunk. For convenience during development, you can store these arguments as
key-value pairs in a text file named `.splunkrc`. Then, when you don't specify
these arguments at the command line, the SDK examples and unit tests use the
values from the `.splunkrc` file.  To use a `.splunkrc` file, create a text file
with the following format:
    
    # Host at which Splunk is reachable (OPTIONAL)
    host=localhost
    # Port at which Splunk is reachable (OPTIONAL)
    # Use the admin port, which is 8089 by default.
    port=8089
    # Splunk username
    username=admin
    # Splunk password
    password=changeme
    # Access scheme (OPTIONAL)
    scheme=https
    # Namespace to use (OPTIONAL)
    namespace=*:*

Save the file as `.splunkrc` in the current user's home directory or in the root 
directory of the Splunk JavaScript SDK.

*   For example, on Mac OS X and Linux, save the file as: `~/.splunkrc`
*   On Windows, save the file as: `C:\Users\currentusername\.splunkrc`

You might get errors in Windows when you try to name the file because `.splunkrc` 
looks like a nameless file with an extension. You can use the command line to 
create this file — go to the `C:\Users\currentusername` directory and enter the 
following command: 

> Notepad.exe .splunkrc

Click Yes, then continue creating the file.

**Note** Storing login credentials in the `.splunkrc` file is only for 
convenience during development—this file isn't part of the Splunk platform and 
shouldn't be used for storing user credentials for production. And, if you're at 
all concerned about the security of your credentials, just enter them at the
command line rather than saving them in the `.splunkrc` file.

#### Run examples

The JavaScript SDK includes several command-line examples, which are located in 
the [`/splunk-sdk-javascript/examples/node`][node_examples_dir] directory. These
examples run with Node.js and use the command-line arguments from the 
`.splunkrc` file. 

For example, to run the jobs.js sample, go to the 
[`splunk-sdk-javascript/examples/node`][node_examples_dir] directory and enter: 

> node jobs.js list

If you aren't storing your login credentials in .splunkrc, enter the following 
command: 

> node jobs.js --username yourusername --password yourpassword list

If it executed correctly, your output will look something like this:

    ~\splunk-sdk-javascript\examples\node> node .\jobs.js list
      Job 1 sid: scheduler__nobody__search_VG9wIGZpdmUgc291cmNldHlwZXM_at_1323917700_79740ae7e22350d6
      Job 2 sid: scheduler__nobody__search_VG9wIGZpdmUgc291cmNldHlwZXM_at_1323917400_0dceb302931a2b3f
      Job 3 sid: scheduler__nobody__search_SW5kZXhpbmcgd29ya2xvYWQ_at_1323917100_48fb4cc65a25c5b1
      Job 4 sid: scheduler__nobody__search_SW5kZXhpbmcgd29ya2xvYWQ_at_1323916200_b2f239fef7834523
      Job 5 sid: scheduler__nobody__unix_QWxlcnQgLSBzeXNsb2cgZXJyb3JzIGxhc3QgaG91cg_at_1323914400_96cb9084680b25d7
      Job 6 sid: admin__admin__search_TXkgQXdlc29tZSBTYXZlZCBTZWFyY2g_1323901055.6
    ==============

### SDK tools for client-side JavaScript

The Splunk JavaScript SDK includes pre-built client-side files that run in a web
browser. To use these files, copy the 
[`splunk-sdk-javascript/client`][client_dir] directory to your site and include
one of the following `<script>` tags, specifying the correct path to the files 
on your site:

    <script type="text/javascript" src="/yourpath/splunk.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/splunk.min.js"></script>

This tag creates a global variable called `Splunk`, which is the root of the SDK. 
No other global variables are introduced.

#### UI Components

Beyond the ability to interact with Splunk data, the SDK also provides you with
UI components you can use on your site in conjunction with this data. As of
the preview launch, these components include:

* Timeline Control: this is the event timeline view that shows you how many
events are available for every timeslice in your query.

* Charting Control: this is the charting control that is included in Splunk,
allowing you to derive types of charts when supplied with Splunk data.

These are the same components that ship with Splunk 4.3 (no flash!). Because the
timeline control uses the `<canvas>` tag, it will only work in browsers that
support it (which means it does not support versions of IE before IE9).

#### Dependencies and Cross Domain Communication

When running in a web browser, the SDK's only dependency is JSON support. If
your site supports older browsers, you might need to include JSON handling for
compatibility. You can learn more about this on the JSON website
(http://www.json.org/).

For cross-domain communication, the Splunk JavaScript SDK includes the 
[easyXDM][easyxdm] library in the pre-built client files. Due to Single Origin 
Policy (SOP) browser security policies, cross-domain messaging is not possible 
when you use the `file://` protocol, so you must serve the HTML pages from a 
server. The Splunk JavaScript SDK includes a simple server you can use.

**Note**: Splunk ships with a self-signed SSL certificate, which prevents us 
from doing IFrame cross-domain messaging (as the browser rejects any IFrame
from an untrusted source by default). As such, if you want to use the `XdmHttp`
class (which is the default), you will either have to put an exception in your
browser for the Splunk certificate (OK for development purposes, but can be 
annoying), or get a real SSL certificate for your Splunk instance. Another 
option is to use a small proxy to forward requests to Splunk (this is what the 
browser examples in the SDK do).

**Note**: Node.js is required to run the server. For more about Node.js, see
"SDK tools for server-side JavaScript".  

To start it, open a command prompt and go to the `splunk-sdk-javascript` 
directory, then enter the following command:

> node sdkdo runserver

**Tip**: On Mac OSX and Linux, you can type `./sdkdo` instead of `node sdkdo`.
On Windows, you can use `.\sdkdo`.  

Then, navigate to http://localhost:6969/path/filename.html to see your HTML file.

#### Client-side code example

The following contains sample HTML that uses the Splunk JavaScript SDK: 
    
    <script type="text/javascript" src="splunk.js"></script>
    
    <script type="text/javascript" charset="utf-8">
        var service = new Splunk.Client.Service({username: "admin", password: "changeme"});
        service.login(function(err, success) {
            if (err) {
                throw err;
            }

            console.log("Login was successful: " + success);
            service.jobs().list(function(err, jobs) {
                for(var i = 0; i < jobs.length; i++) {
                    console.log("Job " + i + ": " + jobs[i].sid);
                } 
            });
        });
    </script>

#### Using multiple SDKs per page
If you want to run multiple instances of the SDK on the same page, or your code
is on a page that you don't control, you can use the `noConflict()` method:
    
    var MySplunk = Splunk.noConflict();

This method returns control of the global Splunk variable to the previous owner,
and returns an instance of the SDK to you.

#### Client-side examples

The Splunk JavaScript SDK includes several examples that run in the browser, and
are located in the [`/splunk-sdk-javascript/examples/browser`][browser_examples_dir] 
directory. 

**Note**: Node.js is required to run the examples. For more about Node.js, 
see "SDK tools for server-side JavaScript". 

To run these examples, open a command prompt and go to the 
`splunk-sdk-javascript` directory, then enter the following command: 

> node sdkdo examples

This will start our development webserver and open your browser up to the 
example index page. If you prefer to start the server manually, you can execute:

> node sdkdo runserver

And then open your browser and go to the following page: 
http://localhost:6969/examples/browser/index.html

**Note**: As noted above, the SDK requires the usage of cross-domain 
communication when running in the browser. Unfortunately, Splunk ships with a 
self-signed SSL certificate, and so the browser rejects any requests to it. In 
order to avoid this hindering your usage of the SDK, all the browser examples 
use a tiny proxy (you can see the implementation in [`bin/cli.js`][cli]) that 
will forward all requests to Splunk. In a real scenario, you would either have 
the proxy on your own webserver, or get a properly signed certificate for 
Splunk itself.

### Building files and running unit tests

The Splunk JavaScript SDK infrastructure relies on Node.js, so if you want to
build files, run examples, run tests, or generate documentation, you must
install Node.js. For more about Node.js, see "SDK tools for server-side
JavaScript".

All development activities are managed by a helper script called sdkdo. For a
list of possible commands and options, open a command prompt and go to the
splunk-sdk-javascript directory, then enter the following command:

> node sdkdo --help

To rebuild the browser files, enter:

> node sdkdo compile

The SDK includes several unit tests for each component. You can run individual
test modules or run all tests. Open a command prompt and go to the splunk-sdk-
javascript directory. To run all tests, enter the following command:

> node sdkdo tests

To run the HTTP and the Async tests, enter:

> node sdkdo tests http,async

To run the browser tests, enter:

> node sdkdo tests-browser

## Architecture and Components

The Splunk JavaScript SDK is divided into two areas: 
*   The Data SDK allows you
    to interact with Splunk. For example, you can manage Splunk (such as creating
    and removing indexes, and user creation), input data (through the HTTP input),
    and search data. 
*   The UI SDK includes popular Splunk UI components, such as
    charting and timeline, so that you can provide rich and engaging material to
    your clients.

The Splunk JavaScript SDK support server-side and client-side JavaScript, and
you can decide which components to install. The SDK includes a Splunk app as a
translation layer between Splunk's XML output and the JSON that is used by
JavaScript. The SDK also includes several third-party libraries, which are
included for functionality such as cross-domain communication and other features
used by the examples.

### Entities and Collections

Most REST endpoints in the Splunk REST API can be thought of as operations on
entities and collections of entities. For example, there are operations to
create, modify, and remove apps. Similarly, there are operations to create,
manage, remove, and get results of search jobs. For each logical grouping, the
base abstractions are as follows:

*   Resource: An abstraction over a resource that can be accessed over HTTP,
    with shortcuts for making HTTP `GET`/`POST`/`DELETE` calls.

*   Entity: An abstraction over a Splunk entity (such as a single app:
    `apps/local/{app-name}`). Provides operations such as update, remove, read
    properties, and refresh.

*   Collection: An abstraction over a Splunk collection (such as all apps:
    `apps/local`). Provides operations such as creating entities and fetching
    specific entities.

Both Entity and Collection are a type of Resource:

    Entity = Resource.extend({...});
    Collection = Resource.extend({...});

### `Service` class

The `Service` class is the entry-point for using the Splunk JavaScript SDK to
access the different logical groupings in Splunk. For example, the following
code snippet gets the `Jobs` collection:

    var service = new Service(...); 
    var jobs = service.jobs();

The `Service` class also allows you to get more specialized version of the 
Splunk connection, which is necessary to change the namespace of the connection
(for example, to specialize to a specific user and/or app).

### Native JavaScript objects

The client layer provides higher-level access to the Splunk REST API through 
native JavaScript objects. Architecturally, each object implements either 
`Entity` or `Collection`. For example:

    Indexes = Collection.extend({...});
    Index = Entity.extend({
    Jobs = Collection.extend({...});
    Job = Entity.extend({...});

Each object has the default operations available to its superclass: `Job` 
has update and remove methods, while `Jobs` has create and list methods.

### Asynchronous model

JavaScript is asynchronous, so rather than return values, functions expect a 
callback as their last argument. In return, every callback takes an error 
parameter as its first argument. 

The following code shows how to create a job:

    var service = new Splunk.Client.Service({username: "admin", password: "changeme"});
    var jobs = service.jobs();
    service.login(function(err, success) {
        assert.ok(success);
        service.jobs.create("search index=_internal | head 1", {exec_mode: "blocking"}, function(err, job) {
            assert.ok(!err); // err will be null if we were successful.
            console.log(job.sid); 
        });
    });

However, writing in this nesting, diagonal style can become tiresome and 
hard to maintain, so Splunk provides the `Async` module to ease development. 
The above code could then be written as follows:

    var service = new Splunk.Client.Service({username: "admin", password: "changeme"});
    Async.chain([
            function(done) {
                service.login(done);
            },
            function(success, svc, done) {
                var jobs = svc.jobs();
                jobs.create("search index=_internal | head 1", {exec_mode: "blocking"}, done);
            },
            function(job, done) {
                console.log(job.sid);
                job.cancel(done);
            }
        ],
        function(err) {
            assert.ok(err);
            console.log("DONE");
        }
    );

`Async.chain` executes each function in turn, and passes the results to 
the next function. If any function encounters an error (by calling the 
callback with the first parameter `!= null`), it immediately calls the 
final callback with the error.

### Creating a Service and logging in

Communication with Splunk starts by creating a Service instance and 
logging in. For example:

    var service = new Splunk.Client.Service({username: "admin", password: "changeme"});
    svc.login(function(err, success) {
        console.log("Was login successful: " + (!err || success)); 
    });

You can pass more arguments to the Service constructor, such as scheme, 
namespace, or even a sessionKey if you already have one. For example, if you 
already got a Splunk session key from another source, you can just use it as 
follows:

    var service = new Splunk.Client.Service({sessionKey: mySessionKey});
    // since we have a session key, we're already logged in!

## Documentation

* Reference documentation can be found [here][refdocs]
* Conceptual documentation, tutorials and HOWTOs can be found at the Splunk 
[Dev Portal][devportal]

### Changelog

The file `CHANGELOG.md` in the root of the repository contains a description
of changes for each version of the SDK. You can also find it online at:

* https://github.com/splunk/splunk-sdk-javascript/blob/master/CHANGELOG.md

### Branches

The `master` branch always represents a stable and released version of the SDK.
You can read more about our branching model on our Wiki:

* https://github.com/splunk/splunk-sdk-javascript/wiki/Branching-Model

## Repository

<table>
<tr>
<td><em>bin</em><td>
<td>Directory for executable files (such as `sdkdo`)</td>
</tr>

<tr>
<td><em>client</em><td>
<td>Pre-built files for the browser</td>
</tr>

<tr>
<td><em>contrib</em><td>
<td>Packaged 3rd party dependencies (such as test runners, etc)</td>
</tr>

<tr>
<td><em>docs</em><td>
<td>Generated documentation for the SDK</td>
</tr>

<tr>
<td><em>examples</em><td>
<td>Examples</td>
</tr>

<tr>
<td><em>internal</em><td>
<td>Internal files used by the SDK for testing/example purposes</td>
</tr>

<tr>
<td><em>lib</em><td>
<td>The SDK itself</td>
</tr>

<tr>
<td><em>licenses</em><td>
<td>License information for packaged 3rd party dependencies</td>
</tr>

<tr>
<td><em>new_english</em><td>
<td>Source for the `new_english` XML -&gt; JSON translation app</td>
</tr>

<tr>
<td><em>tests</em><td>
<td>Unit tests</td>
</tr>

<tr>
<td><em>ui</em><td>
<td>Beginning of the Splunk UI SDK</td>
</tr>
</table>

## Resources

You can find anything having to do with developing on Splunk at the Splunk
developer portal:

* http://dev.splunk.com

You can also find reference documentation for the REST API:

* http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI

For an introduction to the Splunk product and some of its capabilities:

* http://docs.splunk.com/Documentation/Splunk/latest/User/SplunkOverview

For more information on the SDK and this repository check out our GitHub Wiki

* https://github.com/splunk/splunk-sdk-javascript/wiki/

## Community

Stay connected with other developers building on Splunk.

<table>

<tr>
<td><em>Email</em></td>
<td>devinfo@splunk.com</td>
</tr>

<tr>
<td><em>Issues</em>
<td><span>https://github.com/splunk/splunk-sdk-javascript/issues/</span></td>
</tr>

<tr>
<td><em>Answers</em>
<td><span>http://splunk-base.splunk.com/tags/javascript/</span></td>
</tr>

<tr>
<td><em>Blog</em>
<td><span>http://blogs.splunk.com/dev/</span></td>
</tr>

<tr>
<td><em>Twitter</em>
<td>@splunkdev</td>
</tr>

</table>

### How to contribute

We aren't ready to accept code contributions yet, but will be shortly. Check 
this README for more updates soon.

### Support

* SDKs in Preview will not be Splunk supported. Once the JavaScript SDK moves 
  to an Open Beta we will provide more detail on support.  

* Issues should be filed here: 
  https://github.com/splunk/splunk-sdk-javascript/issues

### Contact Us

You can reach the Dev Platform team at devinfo@splunk.com
## License

The Splunk Software Development Kit for JavaScript is licensed under the Apache
License 2.0. Details can be found in the file LICENSE.

### Third-Party Libraries

The third-party libraries embedded may have different licenses. This is the list
of embedded libraries and their licenses:

1. [dox]: [MIT][dox-license]
2. [davis.js Documentation Generator][davis.js]: [MIT][davis-license]
3. [easyXDM]: [MIT][xdm-license]
4. [jquery.class.js]: [MIT][jquery.class-license]
5. [nodeunit]: [MIT][nodeunit-license]
6. [showdown.js]: [BSD][showdown-license]
7. [staticresource]: [MIT][staticresource-license]
8. [webapp2]: [Apache][webapp2-license]
7. [commander]: [MIT][commander-license]
8. [script.js]: [Apache][scriptjs-license]


[dox]:                      https://github.com/visionmedia/dox
[davis.js]:                 https://github.com/olivernn/davis.js
[easyXDM]:                  http://easyxdm.net
[jquery.class.js]:          http://ejohn.org/blog/simple-javascript-inheritance/
[nodeunit]:                 https://github.com/caolan/nodeunit/
[showdown.js]:              https://github.com/coreyti/showdown/
[staticresource]:           https://github.com/atsuya/static-resource/
[webapp2]:                  http://code.google.com/p/webapp-improved/
[commander]:                https://github.com/visionmedia/commander.js/
[script.js]:                https://github.com/ded/script.js/
[dox-license]:              https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DOX
[davis-license]:            https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DAVIS
[xdm-license]:              https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-EASYXDM
[jquery.class-license]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-JQUERYCLASS
[nodeunit-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-NODEUNIT
[showdown-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-SHOWDOWN
[staticresource-license]:   https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-STATICRESOURCE
[webapp2-license]:          https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-WEBAPP2
[commander-license]:        https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-COMMANDER
[scriptjs-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-SCRIPTJS

[json2]:                    http://www.json.org/js.html
[new_english]:              https://github.com/splunk/splunk-sdk-javascript/tree/master/new_english
[splunkrc]:                 https://github.com/splunk/splunk-sdk-javascript/blob/master/splunkrc.spec
[node_examples_dir]:        https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/node
[browser_examples_dir]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/browser
[client_dir]:               https://github.com/splunk/splunk-sdk-javascript/blob/master/client
[refdocs]:                  http://splunk.github.com/splunk-sdk-javascript/docs/0.1.0/index.html
[devportal]:                http://dev.splunk.com
[cli]:                      https://github.com/splunk/splunk-sdk-javascript/blob/master/bin/cli.js
[SplunkInstall]:            http://docs.splunk.com/Documentation/Splunk/latest/Installation/WhatsintheInstallationManual
