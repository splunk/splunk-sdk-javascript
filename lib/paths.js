/*!*/
// Copyright 2011 Splunk, Inc.
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
    "use strict";
    
    var root = exports || this;

    // A list of the Splunk API endpoint paths
    root.Paths = {
        apps: "/services/apps/local",
        capabilities: "authorization/capabilities",
        configurations: "configs",
        deploymentClient: "deployment/client",
        deploymentServers: "deployment/server",
        deploymentServerClasses: "deployment/serverclass",
        deploymentTenants: "deployment/tenants",
        eventTypes: "saved/eventTypes",
        indexes: "data/indexes",
        info: "/services/server/info",
        inputs: null,
        jobs: "search/jobs",
        licenseGroups: "licenser/groups",
        licenseMessages: "licenser/messages",
        licensePools: "licenser/pools",
        licenseSlaves: "licenser/slaves",
        licenseStacks: "licenser/stacks",
        licenses: "licenser/licenses",
        loggers: "server/logger",
        login: "/services/auth/login",
        messages: "messages",
        passwords: "admin/passwords",
        parser: "search/parser",
        properties: "properties",
        roles: "authentication/roles",
        savedSearches: "saved/searches",
        settings: "server/settings",
        users: "/services/authentication/users",
        typeahead: "search/typeahead",
        views: "data/ui/views",
        
        currentUser: "/services/authentication/current-context",
        submitEvent: "receivers/simple",
        
        storm: {
            submitEvent: "/inputs/http"
        }
    };
})();