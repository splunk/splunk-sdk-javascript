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

## Getting Started

In order to use the SDK you are going to need a copy of Splunk. If you don't 
already have a copy you can download one from http://www.splunk.com/download.

The JavaScript SDK is built to support both Node.js and browser-side JavaScript.

### Cloning the SDK

If you wish to get the SDK and all examples, tests and other supporting materials,
you can simply clone it from GitHub using the following command:

> git clone https://github.com/splunk/splunk-sdk-javascript.git

### Installing the XML -> JSON Splunk App (`new_english`)

Splunk uses XML as its communication format for the REST API, which is not well-suited
for JavaScript usage. Until Splunk gets native JSON support, we are providing a Splunk
app that will translate the XML returned by Splunk into JSON. This is app is called
`new_english`.

To install `new_english`, you simply need to either copy the [`new_english`][new_english] 
directory (in its entirety) into `$SPLUNK_HOME/etc/apps`:

> cp -r new_english $SPLUNK_HOME/etc/apps/new_english 

or create a symbolic link:

> ln -s /absolute/path/to/new_english $SPLUNK_HOME/etc/apps/new_english

Once `new_english` is installed, you will need to restart your Splunk instance.

### .splunkrc

The examples and units are also designed to receive arguments from an optional
`.splunkrc` file located in your home directory. The format of the file is
simply a list of key=value pairs, same as the options that are taken on the
command line, for example:

    host=localhost
    username=admin
    password=changeme

The `.splunkrc` file is a feature of the SDK examples and unit tests and not
the Splunk platform or SDK libraries and is intended simply as convenience for
developers using the SDK.

The `.splunkrc` file should not be used for storing user credentials for apps
built on Splunk and should not be used if you are concerned about the security
of the credentails used in your development environment.

You can view a sample `.splunkrc` file by looking at the [`splunkrc.spec`][splunkrc] file
in the root directory of the repistory.

### Node.js

#### Installation

To use the SDK on Node.js, you first need to install Node, which you can do from
here for desired platform: http://nodejs.org/#download

You also need to install the Node Package Manager (npm). npm is bundled with node
starting with version 0.6.4, but you can also follow the instructions here to
get it if you want an earlier version: http://npmjs.org/doc/README.html#Super-Easy-Install

To have the SDK library be available to your node programs, you can execute:

> npm install splunk-sdk

or declare it as a dependency in your `package.json` file.

If you cloned the SDK and want to run examples and tests, you need to install the
development depedencies. To do this, go to the cloned SDK directory, and execute:

> npm install

#### Usage

With the SDK installed, you can include it in your projects by simply using
`require` and adding `require('splunk-sdk') to your code. Here is a quick 
example:

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
    
#### Examples

The JavaScript SDK comes with several examples that run on Node.js. These
can be found in the [`examples/node`][node_examples_dir] directory. All
examples use the same command line format, and respect the settings in 
your `.splunkrc` file.

For example, to run the search job management sample, you can simply execute:

> node examples/jobs.js --username=admin --password=changeme list

### Browser

#### Installation

The SDK comes pre-packaged with files built for running in browsers. You can find
these files in the [`client`][client_dir] directory. You can simply copy these files
to your site and include the following `<script>` tag:

    <script type="text/javascript" src="/path/to/splunk.js"></script>

or

    <script type="text/javascript" src="/path/to/splunk.min.js"></script>
    
This will create a global variable called `Splunk`, which is the root of the SDK. No 
other global variables will be introduced.

#### Dependencies

The only dependency the SDK has when running in the browser is on JSON support. If
your site supports older browsers, you may need to include JSON handling for 
compatibility. You can learn more about this on the [JSON][json2] website.

The SDK uses the [easyXDM][easyXDM] library internally for cross-domain communication, 
but it is already packaged in the pre-built files for you, so you don't need to do
anything.

#### Cross-Domain

The SDK uses cross-domain messaging when running in the browser, using the excellent
[easyXDM][easyXDM] library. Due to browser security policy, cross-domain messaging
cannot be done when running off the `file://` protocol, and so the HTML pages need 
to be served from a server. The SDK comes bundled with a simple server which can be
started by doing:

> node sdkdo runserver

You can then navigate to `http://localhost:6969/path/to/your/example.html` to see
your sample.

#### Usage

Here is a sample HTML page using the SDK:

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

#### Multiple SDKs per page / No Conflict

If you want to run multiple SDK versions on the same page, or your code is on a 
page which you don't control, you can use the `noConflict` method:

    var MySplunk = Splunk.noConflict();
    
This will return control of the global `Splunk` variable to the previous owner, and
return to you an instance of the SDK.

#### Examples

The JavaScript SDK comes with several examples that run in the browser. These
can be found in the [`examples/browser`][browser_examples_dir] directory. To run
any of them, execute:

> node sdkdo runserver

Once it is running, navigate your browser to http://localhost:6969/examples/browser/path/to/example.html

Note that to run the examples, you need to install Node.js. 

### "Building" and Testing

The SDK infrastructure is based around Node.js, so if you'd like to build, run tests or examples, generate
documentation or anything of the sort, you will need to install Node.js

All development activities are managed by a helper script called `sdkdo`. You can run it to get a list
of available commands and their options:

> node sdkdo --help

#### Building

To rebuild the browser files, you simply tell the SDK to "recompile" them:

> node sdkdo compile

TODO: currently doesn't work on Windows!

#### Testing

The SDK comes with several unit tests for each component. You can run individual test modules,
or run all the tests.

To run all tests:

> node sdkdo tests

To run the `HTTP` and the `Async` tests:

> node sdkdo tests http,async

Finally, to run the browser tests:

> node sdkdo tests-browser

## Documentation

* Reference documentation can be found [here][refdocs]
* Conceptual documentation, tutorials and HOWTOs can be found at the Splunk [Dev Portal][devportal]

## License

The Splunk Software Development Kit for JavaScript is licensed under the Apache License 2.0. Details can be found in the file LICENSE.

### Third-Party Libraries

The third-party libraries embedded may have different licenses. This is the list of embedded libraries and their licenses:

1. [dox]: [MIT][dox-license]
2. [davis.js Documentation Generator][davis.js]: [MIT][davis-license]
3. [easyXDM]: [MIT][xdm-license]
4. [jquery.class.js]: [MIT][jquery.class-license]
5. [nodeunit]: [MIT][nodeunit-license]
6. [showdown.js]: [BSD][showdown-license]
7. [staticresource]: [MIT][staticresource-license]
8. [webapp2]: [Apache][webapp2-license]


### Changelog

The file CHANGELOG.md in the root of the repository contains a description
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
<td><em>platform</em><td>
<td>Platform-specific SDK files (for Node.js and browser)</td>
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

We aren't ready to accept code contributions yet, but will be shortly.  Check 
this README for more updates soon.

### Support

* SDKs in Preview will not be Splunk supported. Once the JavaScript SDK moves to an
  Open Beta we will provide more detail on support.  

* Issues should be filed here: https://github.com/splunk/splunk-sdk-javascript/issues

### Contact Us

You can reach the Dev Platform team at devinfo@splunk.com


[dox]:                                          https://github.com/visionmedia/dox
[davis.js]:                                     https://github.com/olivernn/davis.js
[easyXDM]:                                      http://easyxdm.net
[jquery.class.js]:                              http://ejohn.org/blog/simple-javascript-inheritance/
[nodeunit]:                                     https://github.com/caolan/nodeunit/
[showdown.js]:                                  https://github.com/coreyti/showdown/
[staticresource]:                               https://github.com/atsuya/static-resource/
[webapp2]:                                      http://code.google.com/p/webapp-improved/
[dox-license]:              https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DOX
[davis-license]:            https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-DAVIS
[xdm-license]:              https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-EASYXDM
[jquery.class-license]:     https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-JQUERYCLASS
[nodeunit-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-NODEUNIT
[showdown-license]:         https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-SHOWDOWN
[staticresource-license]:   https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-STATICRESOURCE
[webapp2-license]:          https://github.com/splunk/splunk-sdk-javascript/blob/master/licenses/LICENSE-WEBAPP2

[json2]: http://www.json.org/js.html
[new_english]: https://github.com/splunk/splunk-sdk-javascript/tree/master/new_english
[splunkrc]: https://github.com/splunk/splunk-sdk-javascript/blob/master/splunkrc.spec
[node_examples_dir]: https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/node
[browser_examples_dir]: https://github.com/splunk/splunk-sdk-javascript/blob/master/examples/browser
[client_dir]: https://github.com/splunk/splunk-sdk-javascript/blob/master/client
[refdocs]: https://splunk.github.com/splunk-sdk-javascript/docs/0.1.0/index.html
[devportal]: http://dev.splunk.com