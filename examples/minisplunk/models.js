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

var Event = Backbone.Model.extend({
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
      var data = results.data || [];
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

var Job = Backbone.Model.extend({
  initialize: function(attr, options) {
    _.bindAll(this, "unpause", "del", "finalize");
    this.job = options.job;
  },
  
  unpause: function() {
    this.set({isPaused: false});
    this.job.unpause();
  },
  
  pause: function() {
    this.set({isPaused: true});
    this.job.pause();
  },
  
  del: function() {
    var job = this;
    this.job.cancel().whenResolved(function() {
      job.destroy();
    });
  },
  
  finalize: function() {
    this.set({isFinalized: true});
    this.job.finalize();
  },
});

var Jobs = Backbone.Collection.extend({
  model: Job,
  
  initialize: function(models, options) {    
    _.bindAll(this, "fetch", "continuousFetch");
  },
  
  fetch: function() {
    if (!App.service()) {
      return;
    }
    
    var jobs = this;
    var listP = App.service().jobs().list();
    return listP.whenResolved(function(list) {
      var models = [];
      for(var i = 0; i < list.length; i++) {
        var properties = list[i];
        var job = new Splunk.Client.Job(App.service(), properties["sid"]);
        var jobModel = new Job(properties, {job: job});
        
        models.push(jobModel);
      }
      
      jobs.reset(models);
    });
  },
  
  continuousFetch: function() {
    var jobs = this;
    Promise.while({
      condition: function() { return true; },
      body: function() {
        var fetchP = jobs.fetch();
        return Promise.join(fetchP, Promise.sleep(10000));
      }
    });
  },
});