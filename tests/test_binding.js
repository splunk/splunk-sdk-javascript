
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
    var Splunk      = require('../splunk').Splunk;
    var NodeHttp    = require('../platform/node/node_http').NodeHttp;
    var minitest    = require('../external/minitest');
    var assert      = require('assert');

    var http = new NodeHttp();
    var svc = new Splunk.Client.Service(http, { 
        scheme: "http",
        host: "localhost",
        port: "8000",
        username: "itay",
        password: "changeme",
    });

    minitest.setupListeners();

    svc.login(function(success) {   
        minitest.context("Basic Tests", function() {
            this.setup(function() {
                this.service = svc;
            });

            this.assertion("Service exists", function(test) {
                assert.ok(this.service);
                test.finished();
            });

            this.assertion("Login succeeded", function(test) {
                assert.ok(this.service.sessionKey);
                test.finished();
            });

            this.assertion("Create job", function(test) {
                this.service.jobs().create('search index=twitter | head 1', {}, Splunk.Utils.bind(this, function(job) {   
                    assert.ok(job);
                    test.finished();
                })); 
            });

            this.assertion("Cancel job", function(test) {
                this.service.jobs().create('search index=twitter | head 1', {}, Splunk.Utils.bind(this, function(job) {   
                    job.cancel(function() {
                        test.finished();
                    });
                })); 
            });

            this.assertion("List jobs", function(test) {
                this.service.jobs().list(function(jobs) {
                    assert.ok(jobs);
                    assert.ok(jobs.length > 0);
                    test.finished();
                });
            });
        });
    });
})();