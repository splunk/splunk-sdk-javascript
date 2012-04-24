# The Splunk JavaScript Software Development Kit (Preview Release)

The Splunk JavaScript Software Development Kit (SDK) contains library code and examples
designed to enable developers to build applications using Splunk and JavaScript. This SDK
supports both server- and client-side JavaScript. 

## License

The Splunk JavaScript SDK is licensed under the Apache License 2.0. Details can be found
in the LICENSE file.

## The Splunk JavaScript SDK is a Preview release

1.  This Preview is a pre-Beta release that is incomplete and may have
    bugs. There will be a Beta release prior to a general release.

2.  The Apache License only applies to the Splunk JavaScript SDK and no other Software
    provided by Splunk.

3.  Splunk, in using the Apache License, does not provide any warranties or indemnification,
    and does not accept any liabilities with the Preview release of the SDK.

4.  We are now accepting contributions from individuals and companies to our Splunk open
    source projects. See the [Open Source][contributions] page for more information.

## Installation

You can install the Splunk JavaScript SDK in a few simple steps. For more
detailed instructions, go to the [Splunk Developer Portal][install].

### Get the Splunk JavaScript SDK

You can get the SDK by [downloading it][zip] from GitHub, or by cloning it:

> git clone https://github.com/splunk/splunk-sdk-javascript.git

### Install the XML to JSON Splunk app

To install the XML to JSON Splunk app, [`xml2json`][xml2json], copy it 
to `$SPLUNK_HOME/etc/apps/`.

### Use the Splunk JavaScript SDK components on your web page

To use the components from the Splunk JavaScript SDK on your web page, copy the 
[`splunk-sdk-javascript/client`][client_dir] directory to your web server and 
include the `splunk.js` or `splunk.min.js` file from this directory in your code. 

So, include one of the following tags in your code:

    <script type="text/javascript" src="/yourpath/splunk.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/splunk.min.js"></script>

You can also include the UI components, such as the Timeline and Charting controls. 
The UI component files (such as `splunk.ui.timeline` and `splunk.ui.charting`) 
are also in the [`splunk-sdk-javascript/client`][client_dir] directory.

### Install the Splunk JavaScript SDK for Node.js

If you want to use the SDK with your Node.js programs, install the SDK
by using `npm` in *your* project's directory:

> npm install splunk-sdk

To include the SDK, use the `require` function in your code:

    var splunkjs = require('splunk-sdk');

## Usage

### Client-side code example

This HTML example uses the Splunk JavaScript SDK to list all jobs: 
    
    <script type="text/javascript" src="splunk.js"></script>
    
    <script type="text/javascript" charset="utf-8">
        var service = new splunkjs.Service({username: "admin", password: "changeme"});
        service.login(function(err, success) {
            if (err) {
                throw err;
            }

            console.log("Login was successful: " + success);
            service.jobs().refresh(function(err, jobs) {
                var jobList = jobs.list();
                for(var i = 0; i < jobList.length; i++) {
                    console.log("Job " + i + ": " + jobList[i].sid);
                }
            });
        });
    </script>

### Node.js code example

This example shows how to use the Splunk JavaScript SDK and Node.js to list all jobs:

    var splunkjs = require('splunk-sdk');

    var service = new splunkjs.Service({username: "admin", password: "changeme"});
    service.login(function(err, success) {
        if (err) {
            throw err;
        }

        console.log("Login was successful: " + success);
        service.jobs().refresh(function(err, jobs) {
            var jobList = jobs.list();
            for(var i = 0; i < jobList.length; i++) {
                console.log("Job " + i + ": " + jobList[i].sid);
            }
        });
    });

## SDK examples

The Splunk JavaScript SDK contains several server- and client-based examples. For
detailed instructions about getting them running, see the [Splunk Developer Portal][examples].

### Set up the `.splunkrc` file

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

Save the file as `.splunkrc` in the current user's home directory or in the root 
directory of the Splunk JavaScript SDK.

### Client-side examples

The Splunk JavaScript SDK includes several browser-based examples, which you can run
from the Examples web page. To start a simple web server and open this page in a
web browser, enter:

> node sdkdo examples

### Node.js examples

The Splunk JavaScript SDK includes several command-line examples, which are located in 
the [`/splunk-sdk-javascript/examples/node`][node_examples_dir] directory. These
examples run with Node.js and use the command-line arguments from the 
`.splunkrc` file, if you set this up with your login credentials. 

For example, to run the jobs.js sample, go to the 
[`splunk-sdk-javascript/examples/node`][node_examples_dir] directory and enter: 

> node jobs.js list

If you aren't storing your login credentials in .splunkrc, enter the following 
command: 

> node jobs.js --username yourusername --password yourpassword list

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

The Splunk JavaScript SDK infrastructure relies on Node.js, so if you want to
build files, run examples, run tests, or generate documentation, you must
install Node.js. You can read more about how to set up your environment
on the [Splunk Developer Portal][requirements].


All development activities are managed by a helper script called sdkdo. For a
list of possible commands and options, open a command prompt in the
`splunk-sdk-javascript` directory, then enter the following command:

> node sdkdo --help

### Compile (combine and minify) the browser files

To rebuild and minify the browser files, enter:

> node compile

### Run unit tests

The SDK includes several unit tests for each component. You can run individual
test modules or run all tests. Open a command prompt and go to the splunk-sdk-
javascript directory. To run all tests, enter the following command:

> node sdkdo tests

To run the HTTP and the Async tests, enter:

> node sdkdo tests http,async

To run the browser tests, enter:

> node sdkdo tests-browser

## Documentation

* For API reference documentation, go [here][refdocs].
* For conceptual and how-to documentation and tutorials, see the 
  [Splunk Developer Portal][devportal].

### Changelog

The `CHANGELOG.md` file contains a description of changes for each version of the SDK.
You can find this file in the root of the SDK repository, and online at:

* https://github.com/splunk/splunk-sdk-javascript/blob/master/CHANGELOG.md

### Branches

The `master` branch always represents a stable and released version of the SDK.
You can read more about our branching model on our Wiki:

* https://github.com/splunk/splunk-sdk-javascript/wiki/Branching-Model

## Repository

<table>
<tr>
<td><em>bin</em><td>
<td>Executable files (such as `sdkdo`)</td>
</tr>

<tr>
<td><em>client</em><td>
<td>Pre-built files for the browser</td>
</tr>

<tr>
<td><em>contrib</em><td>
<td>Packaged third-party dependencies (such as test runners)</td>
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
<td>Internal files used by the SDK for testing and examples</td>
</tr>

<tr>
<td><em>lib</em><td>
<td>The SDK code files</td>
</tr>

<tr>
<td><em>licenses</em><td>
<td>License information for packaged third-party dependencies</td>
</tr>

<tr>
<td><em>xml2json</em><td>
<td>Source for the `xml2json` XML -&gt; JSON app</td>
</tr>

<tr>
<td><em>tests</em><td>
<td>Unit tests</td>
</tr>

<tr>
<td><em>ui</em><td>
<td>UI components of the SDK</td>
</tr>
</table>

## Resources

Find anything having to do with developing on Splunk at the Splunk
Developer Portal:

* http://dev.splunk.com

Find reference documentation for the Splunk REST API:

* http://docs.splunk.com/Documentation/Splunk/latest/RESTAPI

For information about Splunk and its capabilities:

* http://docs.splunk.com/Documentation/Splunk

For more information about the SDK and this repository, see our GitHub Wiki:

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

### Contributions

If you want to make a code contribution, go to the [Open Source][contributions] 
page for more information.


### Support

* The Preview release of the SDK is not supported by Splunk. Once the Beta version
  has been released, we will provide more details about support.  

* File any issues here: 
  https://github.com/splunk/splunk-sdk-javascript/issues.

### Contact us

You can reach the Dev Platform team at devinfo@splunk.com.

## License

The Splunk JavaScript Software Development Kit is licensed under the Apache
License 2.0. Details can be found in the LICENSE file.

### Third-party libraries

The embedded third-party libraries may have different licenses. Here is a list
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
9. [base64.js]: [MIT][base64-license]
10.[eventemitter.js]: [MIT][event-license]


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
[base64.js]:                http://code.google.com/p/javascriptbase64/
[eventemitter.js]:          https://github.com/Wolfy87/EventEmitter
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
[base64-license]:           https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-BASE64
[event-license]:            https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-BASE64

[json2]:                    http://www.json.org/js.html
[xml2json]:                 https://github.com/splunk/splunk-sdk-javascript/tree/master/xml2json
[splunkrc]:                 https://github.com/splunk/splunk-sdk-javascript/blob/master/splunkrc.spec
[node_examples_dir]:        https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/node
[browser_examples_dir]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/browser
[client_dir]:               https://github.com/splunk/splunk-sdk-javascript/blob/master/client
[refdocs]:                  http://splunk.github.com/splunk-sdk-javascript/docs/0.1.0/index.html
[devportal]:                http://dev.splunk.com
[cli]:                      https://github.com/splunk/splunk-sdk-javascript/blob/master/bin/cli.js
[SplunkInstall]:            http://docs.splunk.com/Documentation/Splunk/latest/Installation/WhatsintheInstallationManual
[zip]:                      https://github.com/splunk/splunk-sdk-javascript/zipball/master
[install]:                  http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEFN
[examples]:                 http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEDD
[requirements]:             http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAED6
[contributions]:            http://dev.splunk.com/view/opensource/SP-CAAAEDM