# The Splunk Software Development Kit for JavaScript (Preview Release)

This SDK contains library code and examples designed to enable developers to
build applications using Splunk and JavaScript. The SDK supports both 
server- and client-side JavaScript. 

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

## Installation

Installing the JavaScript SDK can be done in a few simple steps. For more
detailed instructions, you can go to the [Splunk Dev Portal][install].

### Get the SDK

You can get the SDK by either [downloading it][zip] or by cloning it using
Git:

> git clone https://github.com/splunk/splunk-sdk-javascript.git

### XML to JSON Splunk App

To install the XML to JSON translation app, [`new_english`][new_english], you
can copy it to `$SPLUNK_HOME/etc/apps/`

### Installing the SDK on your web page

If you want to use the SDK on your web page, you can simply include the 
`splunk.js` or `splunk.min.js` file in your page. You can find both of them
in the [`splunk-sdk-javascript/client`][client_dir] directory.

To include them in your page:

    <script type="text/javascript" src="/yourpath/splunk.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/splunk.min.js"></script>

To include the SDK UI components (e.g. the Timeline and Charting controls),
simply put those files in the same folder as `splunk.js` or `splunk.min.js`.

### Installing the SDK For Node.js

If you want to use the SDK with your Node.js program, you can install it
by using `npm` in *your* project's directory:

> npm install splunk-sdk

To include then, you can use the `require` function:

    var Splunk = require('splunk-sdk').Splunk;

## Usage

### Client-side code example

The following contains sample HTML that uses the Splunk JavaScript SDK to list all jobs: 
    
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

### Node.js code example

Here is how you can use the JavaScript SDK and Node.js to list all jobs:

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

## Examples

The SDK contains several examples, both server- and client-based. You can read
detailed instructions on how to get them running on the [Splunk Dev Portal][examples].

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
    # Namespace to use (OPTIONAL)
    namespace=*:*

Save the file as `.splunkrc` in the current user's home directory or in the root 
directory of the Splunk JavaScript SDK.

### Client-side examples

The JavaScript SDK includes several browser-based examples. To run them, you 
can enter:

> node sdkdo examples

This will start a small web-server and launch your browser to the examples page.

### Node.js examples

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

## Development

The Splunk JavaScript SDK infrastructure relies on Node.js, so if you want to
build files, run examples, run tests, or generate documentation, you must
install Node.js. You can read more about how to setup your environment
on the [Splunk Dev Portal][requirements].


All development activities are managed by a helper script called sdkdo. For a
list of possible commands and options, open a command prompt and go to the
`splunk-sdk-javascript` directory, then enter the following command:

> node sdkdo --help

### Compiling (combining and minifying) the browser files

> node compile

### Running unit tests

The SDK includes several unit tests for each component. You can run individual
test modules or run all tests. Open a command prompt and go to the splunk-sdk-
javascript directory. To run all tests, enter the following command:

> node sdkdo tests

To run the HTTP and the Async tests, enter:

> node sdkdo tests http,async

To run the browser tests, enter:

> node sdkdo tests-browser

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
[zip]:                      https://github.com/splunk/splunk-sdk-javascript/zipball/master
[install]:                  http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEFN
[examples]:                 http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAEDD
[requirements]:             http://dev.splunk.com/view/javascript-sdk-getting-started/SP-CAAAED6