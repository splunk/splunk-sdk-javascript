# Setup

1. Set the `SPLUNK_HOME` environment variable to the root directory of your Splunk instance.
* Copy this whole `random_numbers` folder to `$SPLUNK_HOME/etc/apps`.
* Open a terminal to `$SPLUNK_HOME/etc/apps/random_numbers/bin/app`.
* Run `npm install`.
    
    If this step fails
    1. [Clone the SDK from Github](https://github.com/splunk/splunk-sdk-javascript).
    * Copy the full `splunk-sdk-javascript` folder to `$SPLUNK_HOME/etc/apps/random_numbers/bin/app/node_modules`.
    * Rename this copied folder as `splunk-sdk`.
* Restart Splunk