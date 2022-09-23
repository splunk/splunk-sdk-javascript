[![Build Status](https://travis-ci.org/splunk/splunk-sdk-javascript.svg?branch=master)](https://travis-ci.org/splunk/splunk-sdk-javascript)
# The Splunk Enterprise Software Development Kit for JavaScript

#### Version 1.12.1

The Splunk Enterprise Software Development Kit (SDK) for JavaScript contains library code and examples designed to enable developers to build applications using the Splunk platform and JavaScript. This SDK supports server-side and client-side JavaScript.

For more information, see [Splunk Enterprise SDK for JavaScript](https://dev.splunk.com/enterprise/docs/devtools/javascript/sdk-javascript/) on the Splunk Developer Portal.

## Requirements

* Node.js v 8.17.0, or v14 or later

    The Splunk Enterprise SDK for JavaScript was tested with Node.js v8.17.0, v14. 

* Splunk Enterprise 9.0 or 8.2, or Splunk Cloud

    The Splunk Enterprise SDK for JavaScript was tested with Splunk Enterprise 9.0 or 8.2, or Splunk Cloud. 

*  Splunk Enterprise SDK for JavaScript

    Download the SDK as a [ZIP file](https://github.com/splunk/splunk-sdk-javascript/zipball/master) or clone the repository:

        git clone https://github.com/splunk/splunk-sdk-javascript.git


## Installation

This section describes the basic steps for installing the Splunk Enterprise SDK for JavaScript.


### Use the Splunk Enterprise SDK for JavaScript components on your web page

To use the components from the Splunk Enterprise SDK for JavaScript on your web page, copy the **/splunk-sdk-javascript/client** directory to your web server.
Then, include the **splunk.js** or **splunk.min.js** file from this directory in your code.

For example, include one of the following tags in your code:

    <script type="text/javascript" src="/yourpath/splunk.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/splunk.min.js"></script>

You can also include the UI components, such as the Timeline and Charting controls. These UI component files (**splunk.ui.timeline** and **splunk.ui.charting**) are also in the **/splunk-sdk-javascript/client** directory.

### Install Node.js in your project

To use the Splunk Enterprise SDK for JavaScript with your Node.js programs, install the SDK by running `npm` in *your* project's directory as follows:

    npm install splunk-sdk

Then, to include the Splunk Enterprise SDK for JavaScript, use the `require` function in your code:

    var splunkjs = require('splunk-sdk');

## Usage

The following examples show you how to list search jobs using client-side and server-side code.

### Client-side code example

This HTML example uses the Splunk Enterprise SDK for JavaScript to list all jobs:
```javascript
    <script type="text/javascript" src="splunk.js"></script>
    <script type="text/javascript" src="jquery.min.js"></script>

    <script type="text/javascript" charset="utf-8">

        var service = new splunkjs.Service({username: "admin", password: "changed!"});
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
```

### Node.js code example

This example shows how to use the Splunk Enterprise SDK for JavaScript and Node.js to list all jobs:

##### Login with username and password

```javascript
    var splunkjs = require('splunk-sdk');

    var service = new splunkjs.Service({username: "admin", password: "changed!"});
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
```
##### Login with sessionKey

```shell
# Create a sessionKey
curl -k -u <username>:<password>  <scheme>://<host>:<port>/services/auth/login -d username=<username> -d password=<password>
```

```javascript
var serviceWithSessionKey = new splunkjs.Service(
    {
        // Replace the host if you are accessing remote host
        scheme: 'https',
        host: 'localhost',
        port: '8089',
        sessionKey: SESSION_KEY, // Add your sessionKey here
        version: '9.0',
    });

serviceWithSessionKey.get("search/jobs", { count: 1 }, function (err, res) {
    if (err) {
        console.log(err);
    } else }
        console.log("Login successful with sessionKey");
    }
});
```

##### Login with token

```shell
#### From shell ####
# Enable token authetication
curl -k -u <username>:<password> -X POST <scheme>://<host>:<port>/services/admin/token-auth/tokens_auth -d disabled=false

# Create a token
curl -k -u <username>:<password> -X POST <scheme>://<host>:<port>/services/authorization/tokens?output_mode=json --data name=<username> --data audience=Users --data-urlencode expires_on=+30d
```

```shell
#### From web ####
# Enable token authentication
Go to settings > Tokens and click on 'Enable Token Authentication'

# Create a token
1. Go to settings > Token and click on 'New Token'
2. Enter the relevant information
3. Copy the created token and save it somewhere safe.
```

```javascript
var serviceWithBearerToken = new splunkjs.Service(
    {
        // Replace the host if you are accessing remote host
        scheme: 'https',
        host: 'localhost',
        port: '8089',
        sessionKey: TOKEN, // Add your token here
        version: '8',
    });

serviceWithBearerToken.get("search/jobs", { count: 2 }, function (err, res) {
    if (err)
        console.log(err);
    else
        console.log("Login successful with bearer token");
});
```

### Modular inputs examples
Support for modular inputs is removed from Splunk Enterprise SDK for JavaScript and we recommand to use [Splunk Enterprise SDK for Python](https://github.com/splunk/splunk-sdk-python) for the modular inputs. See the [Python SDK modular inputs example](https://github.com/splunk/splunk-app-examples/tree/master/modularinputs/python) and [PythonSDK modular inputs docs](https://dev.splunk.com/enterprise/docs/devtools/python/sdk-python/howtousesplunkpython/howtocreatemodpy) for reference.

## SDK examples

The Splunk Enterprise SDK for JavaScript contains several server- and client-based examples, which are located in the [Splunk App Example repo](https://github.com/splunk/splunk-app-examples).
For details, see the [Splunk Enterprise SDK for JavaScript Examples](https://dev.splunk.com/enterprise/docs/devtools/javascript/sdk-javascript/sdkjavascriptexamples) on the Splunk Developer Portal.

## Create a .splunkrc convenience file

To connect to Splunk Enterprise, many of the SDK unit tests take command-line arguments that specify values for the host, port, and login credentials for Splunk Enterprise. For convenience during development, you can store these arguments as key-value pairs in a text file named **.splunkrc**. Then, the SDK unit tests use the values from the **.splunkrc** file when you don't specify them.

>**Note**: Storing login credentials in the **.splunkrc** file is only for convenience during development. This file isn't part of the Splunk platform and shouldn't be used for storing user credentials for production. And, if you're at all concerned about the security of your credentials, enter them at the command line rather than saving them in this file.

To use this convenience file, create a text file with the following format:

    # Splunk Enterprise host (default: localhost)
    host=localhost
    # Splunk Enterprise admin port (default: 8089)
    port=8089
    # Splunk Enterprise username
    username=admin
    # Splunk Enterprise password
    password=changed!
    # Access scheme (default: https)
    scheme=https
    # Your version of Splunk Enterprise
    version=9.0

Save the file as **.splunkrc** in the current user's home directory.

*   For example on OS X, save the file as:

        ~/.splunkrc

*   On Windows, save the file as:

        C:\Users\currentusername\.splunkrc

    You might get errors in Windows when you try to name the file because ".splunkrc" appears to be a nameless file with an extension. You can use the command line to create this file by going to the **C:\Users\\&lt;currentusername&gt;** directory and entering the following command:

        Notepad.exe .splunkrc

    Click **Yes**, then continue creating the file.

### Create/Update a .conf file
```javascript

Async.chain([
    function (done) {
        // Fetch configurations
        var configs = svc.configurations(namespace);
        configs.fetch(done);
    },
    async function (configs, done) {
        // Create a key-value map to store under a stanza
        const filename = "app.conf";
        const stanzaName = "install";
        var keyValueMap = {}
        keyValueMap["state"] = "enabled";
        keyValueMap["python.version"] = "python3";

        // If file/stanza doesn't exist, it will be created 
        // else it will be updated.
        configs.createAsync(filename, stanzaName, keyValueMap, done);
    }
],
function (err) {
    done();
});
```

## Development

The Splunk Enterprise SDK for JavaScript infrastructure relies on Node.js to build files, run examples, run tests, and generate documentation. 

All development activities are managed by a helper script called `sdkdo`. For a list of possible commands and options, open a command prompt in the **splunk-sdk-javascript** directory and enter:

    node sdkdo --help

### Compile the browser files

To rebuild and minify the browser files, open a command prompt in the **splunk-sdk-javascript** directory and enter:
Note:- If any TypeError is encountered, please run "npm install" before running the below command.

    node sdkdo compile

### Run unit tests

The Splunk Enterprise SDK for JavaScript includes several unit tests for each component. You can run individual test modules or run all tests. Some searches need to be running in your Splunk Enterprise instance before you run these tests. You can start some searches by logging into Splunk Web and opening the Search app, which runs a few searches to populate the dashboard.

>**Note**: The [SDK App Collection](https://github.com/splunk/sdk-app-collection) app is required for running unit tests.

To run the unit tests, open a command prompt in the **splunk-sdk-javascript** directory, then run the following commands. 

To run all tests, enter:

    node sdkdo tests

To run the HTTP and the Async tests, enter:

    node sdkdo tests http,async

To run tests containing a particular string, enter:

    node sdkdo tests --grep "While success"

To run the browser tests, enter:

    node sdkdo tests-browser

To run all unit tests without log messages, enter:

    node sdkdo tests --quiet

To run all the tests and generate test report in **splunk-sdk-javascript/mochawesome-report/mochawesome.html**, enter:

    node sdkdo tests --reporter mochawesome

To get more info to run tests, enter:

    make test_specific

## Repository

| Directory     | Description                                                |
|:------------- |:---------------------------------------------------------- |
| /bin          | Executable files (such as sdkdo)                           |
| /client       | Pre-built files for the browser                            |
| /contrib      | Packaged third-party dependencies (such as test runners)   |
| /docs         | API reference documentation                                |
| /lib          | The SDK code files                                         |
| /licenses     | License information for packaged third-party dependencies  |
| /node_modules | JavaScript modules used by Node.js                         |
| /tests        | Unit tests                                                 |

### Changelog

The [CHANGELOG](CHANGELOG.md) contains a description of changes for each version of the SDK. For the latest version, see the [CHANGELOG.md](https://github.com/splunk/splunk-sdk-javascript/blob/master/CHANGELOG.md) on GitHub.

### Branches

The **master** branch represents a stable and released version of the SDK.
To learn about our branching model, see [Branching Model](https://github.com/splunk/splunk-sdk-javascript/wiki/Branching-Model) on GitHub.

## Documentation and resources

| Resource                | Description |
|:----------------------- |:----------- |
| [Splunk Developer Portal](http://dev.splunk.com) | General developer documentation, tools, and examples |
| [Integrate the Splunk platform using development tools for JavaScript](https://dev.splunk.com/enterprise/docs/devtools/javascript)| Documentation for JavaScript development |
| [Splunk Enterprise SDK for JavaScript Reference](http://docs.splunk.com/Documentation/JavaScriptSDK) | SDK API reference documentation |
| [REST API Reference Manual](https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog) | Splunk REST API reference documentation |
| [Splunk>Docs](https://docs.splunk.com/Documentation) | General documentation for the Splunk platform |
| [GitHub Wiki](https://github.com/splunk/splunk-sdk-javascript/wiki/) | Documentation for this SDK's repository on GitHub |
| [Splunk JavaScript SDK Examples](https://github.com/splunk/splunk-app-examples) | server- and client-based examples for the Splunk JavaScript SDK |


## Community

Stay connected with other developers building on the Splunk platform.

* [Email](mailto:devinfo@splunk.com)
* [Issues and pull requests](https://github.com/splunk/splunk-sdk-javascript/issues/)
* [Community Slack](https://splunk-usergroups.slack.com/app_redirect?channel=appdev)
* [Splunk Answers](https://community.splunk.com/t5/Splunk-Development/ct-p/developer-tools)
* [Splunk Blogs](https://www.splunk.com/blog)
* [Twitter](https://twitter.com/splunkdev)

### Contributions

If you would like to contribute to the SDK, see [Contributing to Splunk](https://www.splunk.com/en_us/form/contributions.html). For additional guidelines, see [CONTRIBUTING](CONTRIBUTING.md). 

### Support

*  You will be granted support if you or your company are already covered under an existing maintenance/support agreement. Submit a new case in the [Support Portal](https://www.splunk.com/en_us/support-and-services.html) and include "Splunk Enterprise SDK for JavaScript" in the subject line.

   If you are not covered under an existing maintenance/support agreement, you can find help through the broader community at [Splunk Answers](https://community.splunk.com/t5/Splunk-Development/ct-p/developer-tools).

*  Splunk will NOT provide support for SDKs if the core library (the code in the **/splunklib** directory) has been modified. If you modify an SDK and want support, you can find help through the broader community and [Splunk Answers](https://community.splunk.com/t5/Splunk-Development/ct-p/developer-tools). 

   We would also like to know why you modified the core library, so please send feedback to _devinfo@splunk.com_.

*  File any issues on [GitHub](https://github.com/splunk/splunk-sdk-javascript/issues).


### Contact us

You can reach the Splunk Developer Platform team at _devinfo@splunk.com_.

## License

The Splunk Enterprise Software Development Kit for JavaScript is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
