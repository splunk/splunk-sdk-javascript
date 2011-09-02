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

var JQueryHttp = window.Splunk.JQueryHttp;

var performSearch = function(svc, query) {          
  var job = null;
  var searcher = null;
  
  if (!Splunk.Utils.startsWith(query.trim(), "search")) {
    query = "search " + query;
  }
  
  var jobP = svc.jobs().create(query, {rf: "*"});
  
  return jobP.whenResolved(function(createdJob) {      
    job = createdJob;
    searcher = new Splunk.Searcher.JobManager(svc, job);
    
    var searchDoneP = searcher.done();
    
    searchDoneP.onProgress(function(properties) {
      App.events.trigger("search:stats", properties);
    });
    
    return searchDoneP.whenResolved(function() {
      return searcher;
    });
  });
};

var Event = Backbone.Model.extend({
  save: function() {
    // do nothing
  }
});

var Events = Backbone.Collection.extend({
  model: Event,
  resultsPerPage: 100,
  
  initialize: function() {
    _.bindAll(this, "getResults", "setSearcher");
  
    App.events.bind("search:done", this.setSearcher);
    
    this.pages = {};
  },
  
  setSearcher: function(searcher) {
    if (this.searcher) {
      this.searcher.cancel();
    }
    
    this.pages = {};
    this.searcher = searcher;
  },
  
  getResults: function(page) {
    page = page || 0;
    
    if (this.pages[page]) {
      this.reset(this.pages[page]);
      return Splunk.Promise.Success();
    }
    
    var events = this;
    var resultsP = this.searcher.job.results({count: this.resultsPerPage, offset: (page * this.resultsPerPage)});
    
    return resultsP.whenResolved(function(results) {
      var data = results.data;
      var baseOffset = page * this.resultsPerPage;
      var rows = [];
      for(var i = 0; i < data.length; i++) {
        var index = parseInt(data[i]["__offset"]) + 1;
        var timestamp = new Date(Date.parse(data[i]["_time"][0].value)).format("m/d/yy h:MM:ss.l TT");
        var event = data[i]["_raw"][0].value[0];
        var properties = [];
        
        for(var property in data[i]) {
          if (data[i].hasOwnProperty(property) && !Splunk.Utils.startsWith(property, "_")) {
            properties.push({
              key: property,
              value: data[i][property][0].value
            });
          }
        }
        
        var rowData = new Event({
          index: index,
          timestamp: timestamp,
          event: event,
          properties: properties
        });
        
        rows.push(rowData);
      }
      
      events.pages[page] = rows;
      events.reset(rows);
    });
  }
});