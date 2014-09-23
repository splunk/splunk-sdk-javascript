# Setup

1. Set the `SPLUNK_HOME` environment variable to the root directory of your Splunk instance.
* Copy this whole `github_commits` folder to `$SPLUNK_HOME/etc/apps`.
* Open a terminal at `$SPLUNK_HOME/etc/apps/github_commits/bin/app`.
* Run `npm install`.
    
    If this step fails
    1. [Clone the SDK from Github](https://github.com/splunk/splunk-sdk-javascript).
    * Copy the full `splunk-sdk-javascript` folder to `$SPLUNK_HOME/etc/apps/github_commits/bin/app/node_modules`.
    * Rename this copied folder as `splunk-sdk`.
    * Run `npm install github`.
* Restart Splunk

# Adding an input

1. From Splunk Home, click the Settings menu. Under **Data**, click **Data inputs**, and find `Github commits`, the input you just added. **Click Add new on that row**.
* Click **Add new** and fill in:
    * `name` (whatever name you want to give this input)
    * `owner` (the owner of the Github repository, this is a Github username or org name)
    * `repository` (the name of the Github repository)
    * (optional) `token` if using a private repository and/or to avoid Github's API limits. To get a Github API token visit the [Github settings page](https://github.com/settings/tokens/new) and make sure the `repo` and `public_repo` scopes are selected.
* Save your input, and navigate back to Splunk Home.
* Do a search for `sourcetype=github_commits` and you should see some commits indexed, if your repository has a large number of commits indexing them may take a few moments.

