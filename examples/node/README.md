## Node.js Examples

This directory contains several examples of the Splunk JavaScript SDK running
on Node.js. The examples vary in complexity and utility, but they aim to illustrate
specific portions of the SDK.

### Directory: `helloworld`

This directory contains several simple examples that show off very narrow aspects
of the SDK in a straightforward manner.

### File: `jobs.js`

This file contains an example that enables to perform management of Splunk search
jobs from the command line. You can list jobs, create new ones, obtain results and
events, and cancel jobs.

To see more options and example usage, you can execute:
> node jobs.js --help

#### File: `conf.js`

This file contains an example that enables navigation and modification of the Splunk
configuration system. With it, you can list configuration files, stanzas and properties,
as well as create, modify and delete files, stanzas and properties.

These operations are available in both the global and namespace-specific variations.

To see more options and example usage, you can execute:
> node conf.js --help