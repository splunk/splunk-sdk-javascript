
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

module.exports = {
    parseParameters: function (node) {
        var params = {};

        for (var tag in node) {
            if (tag === "$") {
                // Skip the attributes
                continue;
            }
            else if (tag === "param") {
                for (var singleValue in node[tag]) {
                    if (node[tag][singleValue]) {
                        params[node[tag][singleValue]["$"].name] = node[tag][singleValue]["_"];
                    }
                }
            }
            else if (tag === "param_list") {
                for (var multiValue in node[tag]) {
                    if (node[tag][multiValue]) {
                        params[node[tag][multiValue]["$"].name] = node[tag][multiValue].value;
                    }
                }
            }
            else {
                throw new Error("Invalid configuration scheme, " + node + " tag unexpected.");
            }
        }

        return params;
    }
};