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

var templates = {
  eventRow: $("#eventRowTemplate"),
  searchForm: $("#searchFormTemplate"),
  searchStats: $("#searchStatsTemplate"),
  pagination: $("#paginationTemplate")
}

var JQueryHttp = window.Splunk.JQueryHttp;

var performSearch = function(svc, query) {          
  var job = null;
  var searcher = null;
  
  if (!Splunk.Utils.startsWith(query.trim(), "search")) {
    query = "search " + query;
  }
  
  var jobP = svc.jobs().create(query);
  
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
  resultsPerPage: 5,
  
  initialize: function() {
    _.bindAll(this, "getResults", "setSearcher");
    
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
        var rowData = new Event({
          index: parseInt(data[i]["__offset"]) + 1,
          timestamp: new Date(Date.parse(data[i]["_time"][0].value)).format("m/d/yy h:MM:ss.l TT"),
          event: data[i]["_raw"][0].value[0]
        });
        
        rows.push(rowData);
      }
      
      events.pages[page] = rows;
      events.reset(rows);
    });
  }
});

var eventsCollection = new Events();

var EventView = Backbone.View.extend({
  tagName: "tr",
  initialize: function() {
    this.template = templates.eventRow;
    
    _.bindAll(this, "render", "showInfo");
  },
  
  render: function() {
    var content = this.template.tmpl(this.model.toJSON());
    
    $(this.el).html(content);
    return this;
  },
  
  events: {
    "click" : "showInfo"
  },
  
  showInfo: function() {
    console.log("Show Info: ", this.model.get("index")); 
  }
});

var PaginationView = Backbone.View.extend({
  initialize: function() {
    this.template = templates.pagination;
    this.currentPage = 1;
    this.resultCount = 0;
    
    _.bindAll(this, "stats", "searchNew", "searchDone", "render", "show", "hide", "prev", "next", "page", "gotoPage");
    
    App.events.bind("search:stats", this.stats);
    App.events.bind("search:done", this.searchDone);
    App.events.bind("search:new", this.searchNew);
  },
  
  events: {
    "click div.pagination li.prev a": "prev",
    "click div.pagination li.next a": "next",
    "click div.pagination li.number a": "page",
  },
  
  prev: function(e) {
    this.gotoPage(this.currentPage - 1);
    e.preventDefault();
  },
  
  next: function(e) {
    this.gotoPage(this.currentPage + 1);
    e.preventDefault();
  },
  
  page: function(e) {
    this.gotoPage(parseInt($(e.target).text()));
    e.preventDefault();
  },
  
  gotoPage: function(pageNum) {
    this.currentPage = pageNum;
    
    var pagination = this;
    this.collection.getResults(pageNum - 1).whenResolved(function() {
      pagination.render();
    });
  },
  
  stats: function(properties) {
    this.resultCount = properties.resultCount;
  },
  
  searchNew: function() {
    this.searchDone = false;
    this.resultCount = 0;
    this.currentPage = 0;
    this.render();
  },
  
  searchDone: function() {
    this.searchDone = true;
    this.render();
    this.gotoPage(1);
  },
  
  render: function() {
    var numPages = Math.ceil((this.resultCount / this.collection.resultsPerPage));    
    var pageList = _.range(1, numPages + 1, 1);
    
    var paginationInfo = {
      isPrevDisabled: this.currentPage === 1,
      isNextDisabled: this.currentPage === numPages,
      items: [],
      numPages: numPages,
    };
    
    for(var i = 0; i < pageList.length; i++) {
      paginationInfo.items.push({
        isDisabled: false,
        isCurrent: pageList[i] === this.currentPage,
        number: pageList[i]
      });
    }
    
    var content = this.template.tmpl(paginationInfo);
    
    $(this.el).html(content);
    
    if (numPages > 1) {
      this.show();
    }
    else {
      this.hide();
    }
    
    return this;
  },
  
  show: function() {
    $(this.el).removeClass("hidden");
  },
  
  hide: function() {
    $(this.el).addClass("hidden");
  }
})

var EventsView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, "render", "add", "reset", "hide", "show");
    
    this.collection.bind("add", this.add);
    this.collection.bind("reset", this.reset);
    
    App.events.bind("search:new", this.hide);
    
    this.renderedEvents = [];
    this.container = this.options.container;
  },
  
  render: function(empty, renderedEvents) {
    if (empty || empty === undefined) {
      $(this.el).empty();
    }
    
    renderedEvents = renderedEvents || this.renderedEvents;
    
    $(this.el).append(renderedEvents);
    
    if (this.collection.length > 0) {
      this.show();
    }
    else {
      this.hide();
    }
    
    return this;
  },
  
  add: function(event) {
    var view = new EventView({model: event});
    var el = view.render().el;
    this.renderedEvents.push(el);
    
    this.render(false, [el]);
  },
  
  reset: function(events) {
    var renderedEvents = this.renderedEvents = [];
    
    events.each(function(event) {
      var view = new EventView({model: event});
      renderedEvents.push(view.render().el);
    });
    
    this.render();
  },
  
  hide: function() {
    $(this.container).addClass("hidden");
  },
  
  show: function() {
    $(this.container).removeClass("hidden");
  }
});

var SearchFormView = Backbone.View.extend({
  initialize : function() {
    this.template = templates.searchForm;
    
    _.bindAll(this, "search", "render");
  },
  
  events: {
    "submit #search-form": "search",
    "click #submit-search": "search"
  },
  
  search: function(e) {
    e.preventDefault();
    var query = $("#searchbox").val().trim();
    
    if (query !== "") {
      performSearch(this.options.service, query).whenResolved(function(searcher) {
        eventsCollection.setSearcher(searcher);
        App.events.trigger("search:done");
      });
      
      App.events.trigger("search:new");
    }
    
    e.preventDefault();
  },
  
  render: function() {
    var content = this.template.tmpl();
    $(this.el).html(content);
    return this;
  }
});

var SearchStatsView = Backbone.View.extend({
  initialize : function() {
    this.template = templates.searchStats;
    
    _.bindAll(this, "render", "hide", "show", "stats");
    
    App.events.bind("search:new", this.hide);
    App.events.bind("search:stats", this.stats);
  },
  
  render: function(stats) {
    var content = this.template.tmpl(stats);
    $(this.el).html(content);
    
    if (stats) {
      this.show();
    }
    else {
      this.hide();
    }
    
    return this;
  },
  
  hide: function() {
    $(this.el).addClass("hidden");
  },
  
  show: function() {
    $(this.el).removeClass("hidden");
  },
  
  stats: function(properties) {
    var stats = {
      eventCount: properties.eventCount,
      scanCount: properties.scanCount
    };
    
    this.render(stats);
  }
});

var SearchApp = Backbone.Router.extend({
  initialize: function(svc) {
    window.App = this;
    
    this.events = _.extend({}, Backbone.Events);
    this.searchFormView = new SearchFormView({el: "#search-row", service: svc});
    this.eventsView = new EventsView({collection: eventsCollection, el : "#results-table > tbody:last", container: "#results"});
    this.searchStatsView = new SearchStatsView({el: "#stats-row", collection: eventsCollection});
    this.paginationView = new PaginationView({el: "#pagination-row", collection: eventsCollection});
  },
  
  routes: {
    "" : "index"
  },
  
  index : function() {
    this.searchFormView.render();
    this.eventsView.render();
    this.searchStatsView.render();
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