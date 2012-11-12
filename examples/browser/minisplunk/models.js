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

var utils = splunkjs.Utils;

var Event = Backbone.Model.extend({
});

var Events = Backbone.Collection.extend({
  model: Event,
  resultsPerPage: 100,
  
  initialize: function() {
    _.bindAll(this, "getResults", "setJob");
  
    App.events.bind("search:done", this.setJob);
    
    this.pages = {};
  },
  
  setJob: function(job) {
    if (this.job) {
      this.job.cancel();
    }
    
    this.pages = {};
    this.job = job;
  },
  
  getResults: function(page, callback) {
    page = page || 0;
    
    if (this.pages[page]) {
      this.reset(this.pages[page]);
      callback();
    }
    
    this.headers = [];
    var that = this;
    splunkjs.Async.chain([
      function(done) {
        that.job.results({
          count: that.resultsPerPage, 
          offset: (page * that.resultsPerPage),
          show_empty_fields: true
        }, done);
      },
      function(results, job, done) {
        var data = results.rows || [];
        var baseOffset = results.init_offset
        var fields = results.fields;
        var timestampIndex = utils.indexOf(fields, "_time");
        var rawIndex = utils.indexOf(fields, "_raw");
        var rows = [];
        
        for(var i = 0; i < data.length; i++) {
          var result = data[i];
          
          var properties = [];
          var headers = {};
          
          for(var j = 0; j < fields.length; j++) {
            var property = fields[j]
            if (!splunkjs.Utils.startsWith(property, "_")) {
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
          that.headers = _.keys(headers);
          
          rows.push(rowData);
        }
        
        that.pages[page] = rows;
        that.reset(rows);
        
        done();
      }],
      callback);
  }
});

var Job = Backbone.Model.extend({
  initialize: function(attr, options) {
    _.bindAll(this, "unpause", "del", "finalize");
    this.job = options.job;
  },
  
  unpause: function(callback) {
    this.set({isPaused: false});
    this.job.unpause(callback);
  },
  
  pause: function(callback) {
    this.set({isPaused: true});
    this.job.pause(callback);
  },
  
  del: function(callback) {
    callback = callback || function() {}
    
    var job = this;
    this.job.cancel(function(err) {
      job.collection.remove(job);
      callback();
    });
  },
  
  finalize: function(callback) {
    this.set({isFinalized: true});
    this.job.finalize(callback);
  }
});

var Jobs = Backbone.Collection.extend({
  model: Job,
  
  initialize: function(models, options) {    
    _.bindAll(this, "fetch", "continuousFetch");
  },
  
  fetch: function(callback) {
    callback = callback || function() {};
    
    if (!App.service()) {
      return;
    }
    
    var that = this;
    App.service().jobs().fetch(function(err, jobs) {
      var list = jobs.list();
      var models = [];
      for(var i = 0; i < list.length; i++) {
        var job = list[i];
        var properties = job.state();
        var jobModel = new Job(properties, {job: job});
        models.push(jobModel);
      }
      
      that.reset(models);
      callback();
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
    splunkjs.Async.whilst(
      function() { return true; },
      function(iterationDone) {
        splunkjs.Async.chain([
          function(done) {
            jobs.fetch(done);
          },
          function(done) {
            splunkjs.Async.sleep(10000, done);
          }
        ],
        iterationDone);
      },
      function(err) {
        console.log(err);
        alert("ERR: " + err);
      }
    )
  }
});