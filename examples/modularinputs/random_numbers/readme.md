# Setup

* Copy this whole `random_numbers` folder to `$SPLUNK_HOME/etc/apps`.
    * If you have the `splunk-sdk` module installed globally, you're done.
    * Otherwise:
        * Clone the branch of the Splunk JavaScript SDK from Github.
        * Copy the `splunk-sdk-javascript` folder to `$SPLUNK_HOME/etc/apps/random_numbers/bin/app/node_modules`.
        * Rename the `splunk-sdk-javascript` folder you just copied over to `splunk-sdk`.
        * Restart Splunk