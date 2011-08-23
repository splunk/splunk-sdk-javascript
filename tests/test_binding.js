(function() {
    var Splunk      = require('../splunk/splunk.js');
    var NodeHttp    = require('../utils/node_http').NodeHttp;
    var __bind      = require('../utils/utils').bind;
    var Class       = require('../lib/jquery.class').Class;
    var Async       = require('../utils/async');
    var minitest    = require('../external/minitest');
    var assert      = require('assert');

    http = new NodeHttp();
    svc = new Splunk.Service(http, { 
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

            this.assertion("List jobs", function(test) {
                this.service.jobs().list(function(jobs) {
                    assert.ok(jobs);
                    assert.ok(jobs.length > 0);
                    test.finished();
                });
            });
        })      
    });
})();