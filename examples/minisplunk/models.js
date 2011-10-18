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
    
    this.headers = [];
    var events = this;
    var resultsP = this.searcher.job.results({
      count: this.resultsPerPage, 
      offset: (page * this.resultsPerPage),
      show_empty_fields: true
    });
    
    return resultsP.whenResolved(function(results) {
      var data = results.rows || [];
      var baseOffset = results.offset
      var fields = results.fields;
      var timestampIndex = fields.indexOf("_time");
      var rawIndex = fields.indexOf("_raw");
      var rows = [];
      
      for(var i = 0; i < data.length; i++) {
        var result = data[i];
        
        var properties = [];
        var headers = {};
        
        for(var j = 0; j < fields.length; j++) {
          var property = fields[j]
          if (!Splunk.Utils.startsWith(property, "_")) {
            properties.push({
              key: property,
              value: result[j]
            });
            
            headers[property] = true;
          }
        }
        
        var rowData = new Event({
          index: i + baseOffset + 1,
          event: result,
          properties: properties,
          timestampIndex: timestampIndex,
          rawIndex: rawIndex
        });
        events.headers = _.keys(headers);
        
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
    if (!App.service()) {
      return;
    }
    if (this.isFetchingStarted) {
      return;
    }
    
    this.isFetchingStarted = true;
    
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