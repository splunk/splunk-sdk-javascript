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

var SearchApp = Backbone.Router.extend({
  initialize: function(svc) {
    window.App = this;
    
    this.events = _.extend({}, Backbone.Events);
    this.searchView = new SearchView({el: "#container", service: svc});
    
    _.bindAll(this, "search");
  },
  
  routes: {
    "" : "search",
    "search" : "search"
  },
  
  search : function() {
    this.searchView.render();
  },
});

$(document).ready(function() {  
  var http = new JQueryHttp();
  var svc = new Splunk.Client.Service(http, { 
      scheme: "http",
      host: "localhost",
      port: "8000",
      username: "itay",
      password: "changeme",
  });
  
    
  var loginP = svc.login();
  var doneP = loginP.whenResolved(function() {
    var app = new SearchApp(svc);
    Backbone.history.start();
  });
  
});