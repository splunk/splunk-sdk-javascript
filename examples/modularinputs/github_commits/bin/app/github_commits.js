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

    exports.getScheme = function() {
        var scheme = new Scheme("Github Commits");

        scheme.description = "Streams events of commits in the specified Github repository (must be public).";
        scheme.useExternalValidation = true;
        scheme.useSingleInstance = false; // We set since instance to false so we can constantly fetch the API

        var owner = new Argument({
            name: "owner",
            dataType: Argument.dataTypeString,
            description: "Github user or organization that created the repository.",
            requiredOnCreate: true,
            requiredOnEdit: true
        });

        var repository = new Argument({
            name: "repository",
            dataType: Argument.dataTypeString,
            description: "Name of a public Github repository, owned by the specified owner.",
            requiredOnCreate: true,
            requiredOnEdit: true
        });

        ///*
        var token = new Argument({
            name: "token",
            dataType: Argument.dataTypeString,
            description: "(Optional) A Github API access token, recommended to avoid hitting Github's API limit if using the interval option.",
            requiredOnCreate: false,
            requiredOnEdit: false
        });
        //*/

        scheme.args = [owner, repository, token];

        return scheme;
    };

    exports.validateInput = function(definition, callback) {
        var owner = definition.parameters["owner"];
        var repository = definition.parameters["repository"];

        var path = "/repos/" + owner + "/" + repository + "/commits"; //+ "?access_token=0916d93fa8234a35048bb50917a96a2f5f96faa3";

        if (!utils.isUndefined(definition.parameters["token"])) {
            path += "?access_token=" + definition.parameters["token"];
        }


        https.get({
            host: "api.github.com",
            path: path,
            //path:  "/repos/" + owner + "/" + repository + "/commits" + "?access_token=0916d93fa8234a35048bb50917a96a2f5f96faa3",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
            }
        }, function(res) {
            var data = "";

            res.on("data", function(chunk) {
                data += chunk.toString();
            });

            res.on("end", function() {
                data = JSON.parse(data); 

                if (!utils.isUndefined(data.message) && utils.startsWith(data.message, "API rate limit exceeded")) {
                    Logger.info("Github Commits", "Reached the API limit");
                    callback(new Error("Your IP address has been rate limited by the Github API."));
                }
                // If there is only 1 element in the data Array, some kind or error occurred
                // with the Github API.
                // Typically, this will happen with an invalid repository.
                else if (data.length === 1 || (!utils.isUndefined(data.message) && data.message === "Not Found")) {
                    Logger.info("Github Commits", "Repository not found " + repository + " owned by " + owner);
                    callback(new Error("The Github repository was not found."));
                }
                else {
                    // If the API response seems normal, assume valid input
                    callback();
                }
            });
        }).on("error", function(e) {
            callback(e);
        });
    };

    exports.streamEvents = function(name, singleInput, eventWriter, callback) {
        // Get the checkpoint directory out of the modular input's metadata
        var checkpointDir = this._inputDefinition.metadata["checkpoint_dir"];

        var monthStrings = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
        ];

        var getSplunkDate = function (date) {
            date = new Date(date);
            var mins = date.getMinutes();
            if (mins < 10) {
                mins = "0" + mins.toString();
            }

            return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() +
            " " + date.getUTCHours() + ":" + mins + ":" + date.getSeconds();
        };

        var getDisplayDate = function (date) {
            date = new Date(date);
            var hours = date.getHours();
            if (hours < 10) {
                hours = "0" + hours.toString();
            }
            var mins = date.getMinutes();
            if (mins < 10) {
                mins = "0" + mins.toString();
            }

            return monthStrings[date.getMonth()] + " " + date.getDate() + ", " +
                date.getFullYear() + " - " + hours + ":" + mins +
                " " + (date.getUTCHours() < 12 ? "AM" : "PM");
        };

        var getMonthDate = function (date) {
            date = new Date(date);
            return monthStrings[date.getMonth()] + " " + date.getDate();
        };

        var owner = singleInput.owner;
        var repository = singleInput.repository;

        var alreadyIndexed = 0;

        https.get({
            host: "api.github.com",
            path: "/repos/" + owner + "/" + repository + "/commits" ,//+ "?access_token=0916d93fa8234a35048bb50917a96a2f5f96faa3",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
            }
        }, function(res) {
            var data = "";
            res.on("data", function(chunk) {
                data += chunk.toString();
            });

            res.on("end", function() {
                data = JSON.parse(data).reverse(); // Reverse the data to index events in ascending order

                var errorFound = false;
                for (var i = 0; i < data.length && !errorFound; i++) {
                    var json = {};

                    json.sha = data[i].sha;
                    json.api_url = data[i].url;
                    json.url = "https://github.com/" + owner + "/" + repository + "/commit/" + json.sha;

                    var checkpointFilePath = checkpointDir + "/" + json.sha;
                    
                    // Look for the checkpoint file, if it exists skip this commit
                    if (!fs.existsSync(checkpointFilePath)) {
                        var commit = data[i].commit;

                        // At this point, assumed checkpoint doesn't exist
                        json.message = commit.message.replace("\n|\r", " "); // Replace newlines and carriage returns with spaces
                        json.author = commit.author.name;
                        json.rawdate = commit.author.date;


                        var date = commit.author.date.replace("T|Z", " ").trim();

                        // A few different time formats to simplify Splunk search queries
                        json.splunkdate = getSplunkDate(date);
                        json.displaydate = getDisplayDate(date);
                        json.monthdate = getMonthDate(date);

                        try {
                            var event = new Event({
                                stanza: repository,
                                sourcetype: "Github API",
                                data: JSON.stringify(json) // Have Splunk index our event data as JSON
                            });
                            
                            eventWriter.writeEvent(event);
                            // Write the checkpoint file
                            fs.writeFileSync(checkpointFilePath, "");
                            Logger.info(name, "Indexed a Github commit with sha: " + data[i].sha, eventWriter._err);
                        }
                        catch (e) {
                            errorFound = true;
                            Logger.error(name, e.message, eventWriter._err);
                            callback(e);

                            // We had an error, die
                            return;
                        }
                    }
                    else {
                        alreadyIndexed++;
                    }
                }
                if (alreadyIndexed > 0) {
                    Logger.info(name, "Skipped " + alreadyIndexed.toString() + " already indexed Github commits.", eventWriter._err);
                }

                // We're done
                callback();
            });
        }).on("error", function(e) {
            callback(e);
        });
    };

    ModularInputs.execute(exports, module);
})();