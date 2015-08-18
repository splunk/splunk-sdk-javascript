# The Splunk Software Development Kit for JavaScript

#### Version 1.8.0

The Splunk Software Development Kit (SDK) for JavaScript contains library code and
examples designed to enable developers to build applications using Splunk and
JavaScript. This SDK supports both server- and client-side JavaScript.

## Installation

This section describes the basic steps for installing the Splunk SDK for JavaScript.
For more detailed instructions and requirements, see the
[Splunk Developer Portal][install].

### Get the Splunk SDK for JavaScript

You can get the SDK by [downloading it][zip] from GitHub, or by cloning it:

    git clone https://github.com/splunk/splunk-sdk-javascript.git

### Use the Splunk SDK for JavaScript components on your web page

To use the components from the Splunk SDK for JavaScript on your web page, copy the
**/splunk-sdk-javascript/client** directory to your web server.
Then, include the **splunk.js** or **splunk.min.js** file from this directory in
your code.

For example, include one of the following tags in your code:

    <script type="text/javascript" src="/yourpath/splunk.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/splunk.min.js"></script>

You can also include the UI components, such as the Timeline and Charting
controls. These UI component files (<b>splunk.ui.timeline</b> and
<b>splunk.ui.charting</b>) are also in the <b>/splunk-sdk-javascript/client</b>
directory.

### Install the Splunk SDK for JavaScript for Node.js
> **Note:** The Splunk SDK for JavaScript v1.7.0 requires Node.js version 0.8.x, 0.10.x, or 0.12.x. IO.js is not formally supported, but it should work as of `v1.7.0` of the SDK.

If you want to use the Splunk SDK for JavaScript with your Node.js programs, install
the SDK by running `npm` in *your* project's directory as follows:

    npm install splunk-sdk

Then, to include the Splunk SDK for JavaScript, use the `require` function in your
code:

    var splunkjs = require('splunk-sdk');

## Usage

The following examples show you how to list search jobs using client-side and
server-side code.

### Client-side code example

This HTML example uses the Splunk SDK for JavaScript to list all jobs:

    <script type="text/javascript" src="splunk.js"></script>
    <script type="text/javascript" src="jquery.min.js"></script>

    <script type="text/javascript" charset="utf-8">

        var service = new splunkjs.Service({username: "admin", password: "changeme"});
        service.login(function(err, success) {
            if (err) {
                throw err;
            }

            console.log("Login was successful: " + success);
            service.jobs().fetch(function(err, jobs) {
                var jobList = jobs.list();
                for(var i = 0; i < jobList.length; i++) {
                    console.log("Job " + i + ": " + jobList[i].sid);
                }
            });
        });

    </script>

### Node.js code example

This example shows how to use the Splunk SDK for JavaScript and Node.js to list all
jobs:

    var splunkjs = require('splunk-sdk');

    var service = new splunkjs.Service({username: "admin", password: "changeme"});
    service.login(function(err, success) {
        if (err) {
            throw err;
        }

        console.log("Login was successful: " + success);
        service.jobs().fetch(function(err, jobs) {
            var jobList = jobs.list();
            for(var i = 0; i < jobList.length; i++) {
                console.log("Job " + i + ": " + jobList[i].sid);
            }
        });
    });

## SDK examples

The Splunk SDK for JavaScript contains several server- and client-based examples.
For detailed instructions about getting them running, see the
[Splunk Developer Portal][examples].

### Set up the .splunkrc file

To connect to Splunk, many of the SDK examples and unit tests take command-line
arguments that specify values for the host, port, and login credentials for
Splunk. For convenience during development, you can store these arguments as
key-value pairs in a text file named **.splunkrc**. Then, the SDK examples and
unit tests use the values from the **.splunkrc** file when you don't specify
them.

To use this convenience file, create a text file with the following format and
save it as **.splunkrc** in the current user's home directory:

    # Splunk host (default: localhost)
    host=localhost
    # Splunk admin port (default: 8089)
    port=8089
    # Splunk username
    username=admin
    # Splunk password
    password=changeme
    # Access scheme (default: https)
    scheme=https
    # Your version of Splunk (default: 5.0)
    version=5.0

**Note**: The `version` key is required if using Splunk 4.3.

### Client-side examples

The Splunk SDK for JavaScript includes several browser-based examples, which you can
run from the Examples web page.

To start a simple web server and open the Examples page in a
web browser, enter:

    node sdkdo examples

### Node.js examples

The Splunk SDK for JavaScript includes several command-line examples, which are
located in the **/splunk-sdk-javascript/examples/node** directory. These
examples run with Node.js and use the command-line arguments from the
**.splunkrc** file, if you set this up with your login credentials.

For example, to run the **jobs.js** example, open a command prompt in the
**/splunk-sdk-javascript/examples/node** directory and enter:

    node jobs.js list

If you aren't storing your login credentials in **.splunkrc**, enter the
following command, providing your own values:

    node jobs.js --username yourusername --password yourpassword list

Your output should look something like this:

    ~\splunk-sdk-javascript\examples\node> node .\jobs.js list
      Job 1 sid: scheduler__nobody__search_VG9wIGZpdmUgc291cmNldHlwZXM_at_1323917700_79740ae7e22350d6
      Job 2 sid: scheduler__nobody__search_VG9wIGZpdmUgc291cmNldHlwZXM_at_1323917400_0dceb302931a2b3f
      Job 3 sid: scheduler__nobody__search_SW5kZXhpbmcgd29ya2xvYWQ_at_1323917100_48fb4cc65a25c5b1
      Job 4 sid: scheduler__nobody__search_SW5kZXhpbmcgd29ya2xvYWQ_at_1323916200_b2f239fef7834523
      Job 5 sid: scheduler__nobody__unix_QWxlcnQgLSBzeXNsb2cgZXJyb3JzIGxhc3QgaG91cg_at_1323914400_96cb9084680b25d7
      Job 6 sid: admin__admin__search_TXkgQXdlc29tZSBTYXZlZCBTZWFyY2g_1323901055.6
    ==============

## Development

The Splunk SDK for JavaScript infrastructure relies on Node.js, so if you want to
build files, run examples, run tests, or generate documentation, you must
install Node.js. You can read more about how to set up your environment
on the [Splunk Developer Portal][requirements].


All development activities are managed by a helper script called *sdkdo*. For a
list of possible commands and options, open a command prompt in the
**splunk-sdk-javascript** directory and enter:

    node sdkdo --help

### Compile (combine and minify) the browser files

To rebuild and minify the browser files, open a command prompt in the
**splunk-sdk-javascript** directory and enter:

    node sdkdo compile

### Run unit tests

The Splunk SDK for JavaScript includes several unit tests for each component. You
can run individual test modules or run all tests. Before you run them, some
searches need to be running in your splunkd instance. You can start some
searches by logging into Splunk Web and opening the Search app, which will run a
few searches to populate its dashboard.

**Note**: The 'sdk-app-collection' app is required for running unit tests.

To run the unit tests, open a command prompt in the **splunk-sdk-javascript**
directory. To run all tests, enter:

    node sdkdo tests

To run the HTTP and the Async tests, enter:

    node sdkdo tests http,async

To run the browser tests, enter:

    node sdkdo tests-browser

To run all unit tests without log messages from splunk, enter:

    `node sdkdo tests --quiet`

To run all the tests and generate JUnit compatible XML in `splunk-sdk-javascript/test_logs/junit_test_results.xml`, enter:

    `node sdkdo tests --reporter junit`

## Repository

<table>
<tr>
<td><b>/bin</b></td>
<td>Executable files (such as sdkdo)</td>
</tr>

<tr>
<td><b>/client</b></td>
<td>Pre-built files for the browser</td>
</tr>

<tr>
<td><b>/contrib</b></td>
<td>Packaged third-party dependencies (such as test runners)</td>
</tr>

<tr>
<td><b>/docs</b></td>
<td>API reference documentation</td>
</tr>

<tr>
<td><b>/examples</b></td>
<td>Examples</td>
</tr>

<tr>
<td><b>/lib</b></td>
<td>The SDK code files</td>
</tr>

<tr>
<td><b>/licenses</b></td>
<td>License information for packaged third-party dependencies</td>
</tr>

<tr>
<td><b>/node_modules</b></td>
<td>JavaScript modules used by Node.js</td>
</tr>

<tr>
<td><b>/tests</b></td>
<td>Unit tests</td>
</tr>


</table>

### Changelog

The **CHANGELOG.md** file in the root of the repository contains a description
of changes for each version of the SDK. You can also find the
[Splunk SDK for JavaScript Changelog][changelog] online.

### Branches

The **master** branch always represents a stable and released version of the
SDK. You can read more about the
[JavaScript SDK Branching Model][branchingmodel] on our wiki.

## Documentation and resources

If you need to know more:

* For all things developer with Splunk, your main resource is the
  [Splunk Developer Portal][devportal].

* For conceptual and how-to documentation, see the
  [Overview of the Splunk SDK for JavaScript][jsoverview].

* For API reference documentation, see the
  [Splunk SDK for JavaScript Reference][jsapiref].

* For more about the Splunk REST API, see the
  [REST API Reference][restapiref].

* For more about about Splunk in general, see [Splunk>Docs][splunkdocs].


* For more about this SDK's repository, see our [GitHub Wiki][jsgithubwiki].

## Community

Stay connected with other developers building on Splunk.

<table>

<tr>
<td><b>Email</b></td>
<td>devinfo@splunk.com</td>
</tr>

<tr>
<td><b>Issues</b>
<td><span>https://github.com/splunk/splunk-sdk-javascript/issues/</span></td>
</tr>

<tr>
<td><b>Answers</b>
<td><span>http://splunk-base.splunk.com/tags/javascript/</span></td>
</tr>

<tr>
<td><b>Blog</b>
<td><span>http://blogs.splunk.com/dev/</span></td>
</tr>

<tr>
<td><b>Twitter</b>
<td>@splunkdev</td>
</tr>

</table>

### How to contribute

If you would like to contribute to the SDK, go here for more information:

* [Splunk and open source][contributions]

* [Individual contributions][indivcontrib]

* [Company contributions][companycontrib]


### Support

1. You will be granted support if you or your company are already covered
   under an existing maintenance/support agreement. Send an email to
   _support@splunk.com_ and include "Splunk SDK for JavaScript" in the
   subject line.

2. If you are not covered under an existing maintenance/support agreement, you
   can find help through the broader community at:

   <ul>
   <li><a href='http://splunk-base.splunk.com/answers/'>Splunk Answers</a> (use
    the <b>sdk</b>, <b>java</b>, <b>python</b>, and <b>javascript</b> tags to
    identify your questions)</li>
   <li><a href="http://groups.google.com/group/splunkdev">Splunkdev Google
    Group</a></li>
   </ul>
3. Splunk will NOT provide support for SDKs if the core library (the
   code in the <b>/lib</b> directory) has been modified. If you modify an SDK
   and want support, you can find help through the broader community and Splunk
   answers (see above). We would also like to know why you modified the core
   library&mdash;please send feedback to _devinfo@splunk.com_.
4. File any issues on [GitHub](githubjsissues).

### Contact us

You can reach the Developer Platform team at _devinfo@splunk.com_.

## License

The Splunk JavaScript Software Development Kit is licensed under the Apache
License 2.0. Details can be found in the LICENSE file.

### Third-party libraries

The embedded third-party libraries may have different licenses. Here is a list
of embedded libraries and their licenses:

* [dox]: [MIT][dox-license]
* [davis.js Documentation Generator][davis.js]: [MIT][davis-license]
* [jquery.class.js]: [MIT][jquery.class-license]
* [nodeunit]: [MIT][nodeunit-license]
* [showdown.js]: [BSD][showdown-license]
* [staticresource]: [MIT][staticresource-license]
* [webapp2]: [Apache][webapp2-license]
* [commander]: [MIT][commander-license]
* [script.js]: [Apache][scriptjs-license]
* [base64.js]: [MIT][base64-license]


[dox]:                      https://github.com/visionmedia/dox
[davis.js]:                 https://github.com/olivernn/davis.js
[jquery.class.js]:          http://ejohn.org/blog/simple-javascript-inheritance/
[nodeunit]:                 https://github.com/caolan/nodeunit/
[showdown.js]:              https://github.com/coreyti/showdown/
[staticresource]:           https://github.com/atsuya/static-resource/
[webapp2]:                  http://code.google.com/p/webapp-improved/
[commander]:                https://github.com/visionmedia/commander.js/
[script.js]:                https://github.com/ded/script.js/
[base64.js]:                http://code.google.com/p/javascriptbase64/
[dox-license]:              https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DOX
[davis-license]:            https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DAVIS
[jquery.class-license]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-JQUERYCLASS
[nodeunit-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-NODEUNIT
[showdown-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-SHOWDOWN
[staticresource-license]:   https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-STATICRESOURCE
[webapp2-license]:          https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-WEBAPP2
[commander-license]:        https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-COMMANDER
[scriptjs-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-SCRIPTJS
[base64-license]:           https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-BASE64
[event-license]:            https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-BASE64

[json2]:                    http://www.json.org/js.html
[splunkrc]:                 https://github.com/splunk/splunk-sdk-javascript/blob/master/splunkrc.spec
[node_examples_dir]:        https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/node
[browser_examples_dir]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/browser
[client_dir]:               https://github.com/splunk/splunk-sdk-javascript/blob/master/client
[refdocs]:                  http://docs.splunk.com/Documentation/JavaScriptSDK
[devportal]:                http://dev.splunk.com
[cli]:                      https://github.com/splunk/splunk-sdk-javascript/blob/master/bin/cli.js
[SplunkInstall]:            http://docs.splunk.com/Documentation/Splunk/latest/Installation/WhatsintheInstallationManual
[zip]:                      https://github.com/splunk/splunk-sdk-javascript/zipball/master
[jsoverview]:               http://dev.splunk.com/view/SP-CAAAECM
[install]:                  http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEFN
[examples]:                 http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEDD
[requirements]:             http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAED6
[contributions]:            http://dev.splunk.com/view/opensource/SP-CAAAEDM
[changelog]:                https://github.com/splunk/splunk-sdk-javascript/blob/master/CHANGELOG.md
[branchingmodel]:           https://github.com/splunk/splunk-sdk-javascript/wiki/Branching-Model
[jsapiref]:                 http://docs.splunk.com/Documentation/JavaScriptSDK
[restapiref]:               http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI
[splunkdocs]:               http://docs.splunk.com/Documentation/Splunk
[jsgithubwiki]:             https://github.com/splunk/splunk-sdk-javascript/wiki
[indivcontrib]:             http://dev.splunk.com/goto/individualcontributions
[companycontrib]:           http://dev.splunk.com/view/companycontributions/SP-CAAAEDR
[githubjsissues]:           https://github.com/splunk/splunk-sdk-javascript/issues
