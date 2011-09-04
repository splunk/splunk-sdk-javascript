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
  pagination: $("#paginationTemplate"),
  events: $("#eventsTemplate"),
  job: $("#jobRowTemplate"),
  jobs: $("#jobsTemplate")
};

var performSearch = function(svc, query) {          
  var job = null;
  var searcher = null;
  
  if (!Splunk.Utils.startsWith(query.trim(), "search")) {
    query = "search " + query;
  }
  
  var jobP = svc.jobs().create(query, {rf: "*"});
  
  return jobP.whenResolved(function(createdJob) {      
    App.events.trigger("search:new");
      
    job = createdJob;
    searcher = new Splunk.Searcher.JobManager(svc, job);
    
    var searchDoneP = searcher.done();
    
    searchDoneP.onProgress(function(properties) {
      App.events.trigger("search:stats", properties);
    });
    
    return searchDoneP.whenResolved(function() {     
      App.events.trigger("search:done", searcher);
    });
  });
};

var propertiesToActions = function(properties) {  
  if (properties.isPaused) {
    return ["Unpause", "Finalize", "Delete"];
  }
  
  if (properties.isDone) {
    return ["Delete"];
  }
  
  if (properties.isFinalized) {
    return ["Delete"];
  }
  
  var okStates = ["INITIALIZED", "ACKED", "QUEUED", "PARSING", "RUNNING"];
  
  if (okStates.indexOf(properties.dispatchState) > -1) {
    return ["Pause", "Finalize", "Delete"];
  }
  
  return ["Delete"];
};

var propertiesToState = function(properties) {
  if (properties.isPaused) {
    return "Paused";
  }
  
  if (properties.isFinalized) {
    return "Finalized";
  }
  
  if (properties.isFailed) {
    return "Failed";
  }
  
  if (properties.isDone) {
    return "Done";
  }
  
  return "Running";
};

var EventView = Backbone.View.extend({
  tagName: "li",
  initialize: function() {
    this.template = templates.eventRow;
    
    _.bindAll(this, "render", "toggleInfo", "hideInfo");
  },
  
  render: function() {
    var content = this.template.tmpl(this.model.toJSON());
    
    $(this.el).html(content);
    return this;
  },
  
  events: {
    "click tr.result-data" : "toggleInfo",
    "click a.close" : "hideInfo",
  },
  
  toggleInfo: function(e) {
    e.preventDefault();
    
    var resultInfoCell = this.$("td.result-info");
    if (resultInfoCell.hasClass("hidden")) {
      App.events.trigger("event:info", this);
      resultInfoCell.toggleClass("hidden");
    }
    else {
      this.hideInfo();
    }
  },

  hideInfo: function(e) {
    e.preventDefault();
    this.$("td.result-info").addClass("hidden");
  }
});

var EventsView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "results",
  
  initialize: function() {
    this.template = templates.events;
    
    _.bindAll(this, "render", "add", "reset", "hide", "show", "eventInfo");
    
    this.collection.bind("add", this.add);
    this.collection.bind("reset", this.reset);
    
    App.events.bind("search:new", this.hide);
    App.events.bind("event:info", this.eventInfo);
    
    this.renderedEvents = [];
    this.eventsContainer = this.options.container;
  },
  
  render: function(empty, renderedEvents) {
    if (empty || empty === undefined) {
      $(this.el).empty();
    }
    
    renderedEvents = renderedEvents || this.renderedEvents;
    
    $(this.el).html(this.template.tmpl());
    
    this.$(this.eventsContainer).append(renderedEvents);
    
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
    $(this.el).addClass("hidden");
  },
  
  show: function() {
    $(this.el).removeClass("hidden");
  },
  
  eventInfo: function(view) {
    if (this.expandedEventView) {
      this.expandedEventView.hideInfo();
    }
    
    this.expandedEventView = view;
  }
});

var PaginationView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "pagination-row",
  
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
    e.preventDefault();
    if ($(e.target).parent().hasClass("disabled")) {
      return;
    }
    
    this.gotoPage(this.currentPage - 1);
  },
  
  next: function(e) {
    e.preventDefault();
    if ($(e.target).parent().hasClass("disabled")) {
      return;
    }
    
    this.gotoPage(this.currentPage + 1);
  },
  
  page: function(e) {
    e.preventDefault();
    if ($(e.target).parent().hasClass("disabled")) {
      return;
    }
    
    this.gotoPage(parseInt($(e.target).text()));
  },
  
  gotoPage: function(pageNum) {
    if (pageNum === this.currentPage) {
      return;
    }
    
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
});

var SearchStatsView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "stats-row",
  
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

var SearchFormView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "search-row",
  
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
      performSearch(this.options.service, query);
    }
    
    e.preventDefault();
  },
  
  render: function() {
    var content = this.template.tmpl();
    $(this.el).html(content);
    return this;
  }
});

var JobView = Backbone.View.extend({
  tagName: "tbody",
  
  initialize: function() {
    this.template = templates.job;
    _.bindAll(this, "render", "unpause", "pause", "del", "finalize");
    this.model.bind("change", this.render);
  },
  
  events: {
    "click a.unpause" : "unpause",
    "click a.pause" : "pause",
    "click a.delete" : "del",
    "click a.finalize" : "finalize",
  },
  
  unpause: function(e) {
    e.preventDefault();
    this.model.unpause();
  },
  
  pause: function(e) {
    e.preventDefault();
    this.model.pause();
  },
  
  del: function(e) {
    e.preventDefault();
    this.model.del();
  },
  
  finalize: function(e) {
    e.preventDefault();
    this.model.finalize();
  },
  
  render: function() {
    var properties = this.model.toJSON();
    
    var expires = new Date();
    expires = new Date(expires.valueOf() + properties.ttl * 1000);
    runtime = new Date(parseFloat(properties.runDuration) * 1000 - (16 * 60 * 60 * 1000));
    
    var templateData = {
      dispatchedAt: new Date(Date.parse(properties.published)).format("m/d/yy h:MM:ss TT"),
      owner: properties.author,
      application: properties.__metadata.acl.app,
      size: (properties.diskUsage / 1000000).toFixed(2) + "MB",
      events: properties.eventCount,
      runtime: runtime.format("HH:MM:ss.l"),
      expires: expires.format("m/d/yy h:MM:ss TT"),
      status: propertiesToState(properties),
      query: properties.label || properties.__name,
      actions: propertiesToActions(properties),
    };
    var content = this.template.tmpl(templateData);
    
    $(this.el).html(content);
    
    return this;
  }
});

var JobsView = Backbone.View.extend({
  tagName: "div",
  class: "row",
  
  initialize: function() {
    this.template = templates.jobs;
    this.jobsContainer = this.options.container;
    _.bindAll(this, "render");
    this.collection.bind("add", this.render);
    this.collection.bind("remove", this.render);
    this.collection.bind("reset", this.render);
  },
  
  render: function() {
    this.$(this.jobsContainer).empty();
    
    var els = [];
    this.collection.each(function(model){
      var view = new JobView({model : model});
        els.push(view.render().el);
    });
    
    $(this.el).html(this.template.tmpl());
    
    this.$(this.jobsContainer).append(els);
    
    return this;
  }
});

var SearchView = Backbone.View.extend({
  tagName: "div",
  className: "container",
  id: "content",
  
  initialize: function() {
    _.bindAll(this, "render");
    this.events = new Events();
    
    this.searchFormView = new SearchFormView({service: this.options.service});
    this.eventsView = new EventsView({collection: this.events, container: "#results-list"});
    this.searchStatsView = new SearchStatsView({collection: this.events});
    this.paginationView = new PaginationView({collection: this.events});
  },
  
  render: function() {    
    $(this.el).empty();
    
    $(this.el).append(this.searchFormView.render().el);
    $(this.el).append(this.searchStatsView.render().el);
    $(this.el).append(this.paginationView.render().el);
    $(this.el).append(this.eventsView.render().el);
    
    return this;
  },
});

var JobManagerView = Backbone.View.extend({
  tagName: "div",
  className: "container",
  id: "content",
  
  initialize: function() {
    _.bindAll(this, "render");
    
    this.jobs = new Jobs([], {service: this.options.service});
    this.jobsView = new JobsView({collection: this.jobs, container: "#jobs-list"});
    
    App.events.bind("search:new", this.jobs.fetch);
    
    this.jobs.continuousFetch();
  },
  
  render: function() {
    $(this.el).empty();
    
    $(this.el).append(this.jobsView.render().el);
    
    return this;
  }
});