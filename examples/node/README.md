## Node.js Examples

This directory contains several examples of the Splunk SDK for JavaScript running
on Node.js. The examples vary in complexity and utility, but they aim to illustrate
specific portions of the SDK.

### Directory: [`helloworld`]

This directory contains several simple examples that show off very narrow aspects
of the SDK in a straightforward manner.

### File: [`jobs.js`]

This file contains an example that enables to perform management of Splunk search
jobs from the command line. You can list jobs, create new ones, obtain results and
events, and cancel jobs.

To see more options and example usage, you can execute:
> node jobs.js --help

### Files: [`search.js`] and [`results.js`]

[`search.js`] contains an example that shows how to create searches (both regular and oneshot)
using the SDK. It accepts many options to configure the search, and can be asked to print
out job status as the search runs.

When the search is complete, it will print out the results in JSON format to the console.
This is especially useful in conjunction with `results.js`, as you can do something of the
form:

> node search.js --search 'search index=_internal | head 20' | node results.js 

[`results.js`] contains an example that shows how to handle result output from Splunk,
including key-value extraction. It is meant to be used mostly in conjunction with [`search.js`]

[`helloworld`]: https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/helloworld
[`jobs.js`]:    https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/jobs.js
[`conf.js`]:    https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/conf.js
[`search.js`]:  https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/search.js
[`results.js`]: https://github.com/splunk/splunk-sdk-javascript/tree/master/examples/node/results.js