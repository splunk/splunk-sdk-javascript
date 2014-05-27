// Copyright 2014 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

(function() {
    var https           = require("https");
    var fs              = require("fs");
    var splunkjs        = require("splunk-sdk");
    var ModularInputs   = splunkjs.ModularInputs;
    var Logger          = ModularInputs.Logger;
    var Event           = ModularInputs.Event;
    var Scheme          = ModularInputs.Scheme;
    var Argument        = ModularInputs.Argument;
    var utils           = ModularInputs.utils;

    // The version number should be updated every time a new version of the JavaScript SDK is released
    var SDK_UA_STRING = "splunk-sdk-javascript/1.4.0";

    // Get the Github API path, with the the access token if supplied
    function getPath(singleInput) {
        var path = "/repos/" + singleInput.owner + "/" + singleInput.repository + "/commits";

        if (!utils.isUndefined(singleInput.token)) {
            path += "?access_token=" + singleInput.token;
        }

        return path;
    }

    // Create easy to read date format
    function getDisplayDate(date) {
        var monthStrings = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        date = new Date(date);

        var hours = date.getHours();
        if (hours < 10) {
            hours = "0" + hours.toString();
        }
        var mins = date.getMinutes();
        if (mins < 10) {
            mins = "0" + mins.toString();
        }

        return monthStrings[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() +
            " - " + hours + ":" + mins + " " + (date.getUTCHours() < 12 ? "AM" : "PM");
    }

    exports.getScheme = function() {
        var scheme = new Scheme("Github Commits");

        scheme.description = "Streams events of commits in the specified Github repository (must be public, unless setting a token).";
        scheme.useExternalValidation = true;
        scheme.useSingleInstance = false; // Set to false so an input can have an optional interval parameter

        scheme.args = [
            new Argument({
                name: "owner",
                dataType: Argument.dataTypeString,
                description: "Github user or organization that created the repository.",
                requiredOnCreate: true,
                requiredOnEdit: false
            }),
            new Argument({
                name: "repository",
                dataType: Argument.dataTypeString,
                description: "Name of a public Github repository, owned by the specified owner.",
                requiredOnCreate: true,
                requiredOnEdit: false
            }),
            new Argument({
                name: "token",
                dataType: Argument.dataTypeString,
                description: "(Optional) A Github API access token. Required for private repositories (the token must have the 'repo' and 'public_repo' scopes enabled). Recommended to avoid Github's API limit, especially if setting an interval.",
                requiredOnCreate: false,
                requiredOnEdit: false
            })
        ];

        return scheme;
    };

    exports.validateInput = function(definition, done) {
        var owner = definition.parameters.owner;
        var repository = definition.parameters.repository;

        // Do an HTTP get request to the Github API and check if the repository is valid
        https.get({
            hostname: "api.github.com",
            path: getPath(definition.parameters),
            headers: {
                // Must specify a user agent for the Github API
                "User-Agent": SDK_UA_STRING
            }
        }, function(res) {
            var data = "";
            res.on("data", function(chunk) {
                data += chunk.toString();
            });

            res.on("end", function() {
                data = JSON.parse(data); 

                // Did we reach Github's API limit?
                if (!utils.isUndefined(data.message) && utils.startsWith(data.message, "API rate limit exceeded")) {
                    Logger.info("Github Commits", "Reached the API limit");
                    done(new Error("Your IP address has been rate limited by the Github API."));
                }
                // Was the repository not found?
                else if (data.length === 1 || (!utils.isUndefined(data.message) && data.message === "Not Found")) {
                    // If there is only 1 element in the data Array, some kind or error occurred
                    // with the Github API.
                    // Typically, this will happen with an invalid repository.
                    Logger.info("Github Commits", "Repository not found " + repository + " owned by " + owner);
                    done(new Error("The Github repository was not found."));
                }
                else {
                    // If the API response seems normal, assume valid input
                    done();
                }
            });
        }).on("error", function(e) {
            done(e);
        });
    };

    exports.streamEvents = function(name, singleInput, eventWriter, done) {
        // Get the checkpoint directory out of the modular input's metadata
        var checkpointDir = this._inputDefinition.metadata["checkpoint_dir"];

        var owner = singleInput.owner;
        var repository = singleInput.repository;

        var alreadyIndexed = 0;

        https.get({
            hostname: "api.github.com",
            path: getPath(singleInput),
            headers: {
                // Must specify a user agent for the Github API
                "User-Agent": SDK_UA_STRING
            }
        }, function(res) {
            var data = "";
            res.on("data", function(chunk) {
                data += chunk.toString();
            });

            res.on("end", function() {
                data = JSON.parse(data); // Reverse the data to index events in ascending order

                var errorFound = false;
                for (var i = 0; i < data.length && !errorFound; i++) {
                    var json = {
                        sha: data[i].sha,
                        api_url: data[i].url,
                        url: "https://github.com/" + owner + "/" + repository + "/commit/" + data[i].sha
                    };

                    var checkpointFilePath = checkpointDir + "/" + owner + " " + repository + ".txt";
                    
                    // If the file exists and doesn't contain the sha, or if the file doesn't exist
                    if ((fs.existsSync(checkpointFilePath) && utils.readFile("", checkpointFilePath).indexOf(data[i].sha + "\n") < 0) || !fs.existsSync(checkpointFilePath)) {
                        var commit = data[i].commit;

                        // At this point, assumed checkpoint doesn't exist
                        json.message = commit.message.replace("\n|\r", " "); // Replace newlines and carriage returns with spaces
                        json.author = commit.author.name;
                        json.rawdate = commit.author.date;
                        json.displaydate = getDisplayDate(commit.author.date.replace("T|Z", " ").trim());

                        try {
                            var event = new Event({
                                stanza: repository,
                                sourcetype: "github_commits",
                                data: JSON.stringify(json), // Have Splunk index our event data as JSON
                                time: Date.parse(json.rawdate) // Set the event timestamp to the time of the commit
                            });
                            eventWriter.writeEvent(event);

                            fs.appendFileSync(checkpointFilePath, data[i].sha + "\n");
                            Logger.info(name, "Indexed a Github commit with sha: " + data[i].sha);
                        }
                        catch (e) {
                            errorFound = true;
                            Logger.error(name, e.message, eventWriter._err);
                            done(e);

                            // We had an error, die
                            return;
                        }
                    }
                    else {
                        alreadyIndexed++; // The file exists and contains the sha, assume it's already indexed
                    }
                }

                if (alreadyIndexed > 0) {
                    Logger.info(name, "Skipped " + alreadyIndexed.toString() + " already indexed Github commits from " + owner + "/" + repository);
                }
                
                // We're done
                done();
            });
        }).on("error", function(e) {
            done(e);
        });
    };

    ModularInputs.execute(exports, module);
})();