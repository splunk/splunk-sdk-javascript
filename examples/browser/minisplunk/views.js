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
  resultRow: $("#resultRowTemplate"),
  searchForm: $("#searchFormTemplate"),
  searchStats: $("#searchStatsTemplate"),
  pagination: $("#paginationTemplate"),
  events: $("#eventsTemplate"),
  results: $("#resultsTemplate"),
  job: $("#jobRowTemplate"),
  jobs: $("#jobsTemplate"),
  alert: $("#alertTemplate"),
  navBar: $("#navBarTemplate"),
  signin: $("#signinTemplate"),
  map: $("#mapTemplate"),
  eventProperties: $("#eventPropertiesTemplate")
};

var performSearch = function(svc, query, callback) {
  callback = callback || function() {};          
  
  if (!splunkjs.Utils.startsWith(splunkjs.Utils.trim(query), "search")) {
    query = "search " + query;
  }
  
  svc.jobs().create(query, {rf: "*"}, function(err, job) {
    if (err) {
      var response = args[0];
      var messages = {};
      var message = response.data.messages[1];
      messages[message.type.toLowerCase()] = [message.text];
      App.events.trigger("search:failed", query, messages);
    }
    else {
      App.events.trigger("search:new", job);
      
      job.track({}, {
        progress: function(job) {
          App.events.trigger("search:stats", job.state());
        },
        done: function(job) {
          App.events.trigger("search:done", job);
          callback();
        },
        error: function(err) {
          callback(err)
        }
      });
    }
  })
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
  
  if (splunkjs.Utils.indexOf(okStates, properties.dispatchState) > -1) {
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
    var eventInfo = this.model.get("event");
    var timestamp = eventInfo[this.model.get("timestampIndex")];
    var raw = eventInfo[this.model.get("rawIndex")];
    
    var timestamp = new Date(Date.parse(timestamp)).format("m/d/yy h:MM:ss.l TT");
    var raw = raw;
    
    var context = {
      index: this.model.get("index"),
      timestamp: timestamp,
      raw: raw,
      properties: this.model.get("properties")
    };
    var content = this.template.tmpl(context);
    
    $(this.el).html(content);
    return this;
  },
  
  events: {
    "click tr.result-data" : "toggleInfo",
    "click a.close" : "hideInfo"
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
    // Sometimes we need to hide info not in response
    // to an HTML event, but just because another
    // view was opened
    if (e) {
      e.preventDefault();
    }
    
    this.$("td.result-info").addClass("hidden");
  }
});

var ResultView = Backbone.View.extend({
  tagName: "tr",
  className: "result-info",
  
  initialize: function() {
    this.template = templates.resultRow;
    
    _.bindAll(this, "render");
  },
  
  render: function() { 
    $(this.el).empty();
    
    $(this.el).html(this.template.tmpl(this.model.toJSON()));
    
    return this;
  }
});

var EventsView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "results",
  
  initialize: function() {
    this.eventsTemplate = templates.events;
    this.resultsTemplate = templates.results;
    
    _.bindAll(this, "render", "add", "reset", "hide", "show", "eventInfo", "stats", "searchNew", "searchDeleted");
    
    this.collection.bind("add", this.add);
    this.collection.bind("reset", this.reset);
    
    App.events.bind("search:new", this.searchNew);
    App.events.bind("search:stats", this.stats);
    App.events.bind("event:info", this.eventInfo);
    App.events.bind("search:deleted", this.searchDeleted);
    
    this.renderedEvents = [];
    this.eventsContainer = this.options.container;
  },
  
  render: function(empty, renderedEvents) {
    if (empty || empty === undefined) {
      $(this.el).empty();
    }
    
    renderedEvents = renderedEvents || this.renderedEvents;
    
    var template = this.isTransform ? this.resultsTemplate : this.eventsTemplate;
    
    $(this.el).html(template.tmpl({
      headers: this.headers()
    }));
    
    this.$(this.eventsContainer).append(renderedEvents);
    
    if (this.collection.length > 0) {
      this.show();
    }
    else {
      this.hide();
    }
    
    return this;
  },
  
  headers: function() {
    if (this.isTransform) {
      return this.collection.headers;
    }
    else {
      return ["Date", "Event"];
    }
  },
  
  searchNew: function(job) {
    this.hide();
    this.job = job;
  },
  
  searchDeleted: function(job) {
    if (this.job && this.job.sid === job.sid) {
      this.job = null;
      this.hide();
    }
  },
  
  stats: function(properties) {
    var reportSearch = properties.content.reportSearch;
    this.isTransform = (reportSearch && splunkjs.Utils.trim(reportSearch) !== "");
  },
  
  add: function(event) {
    var view = (this.isTransform ? new ResultView({model: event}) : new EventView({model: event}));
    var el = view.render().el;
    this.renderedEvents.push(el);
    
    this.render(false, [el]);
  },
  
  reset: function(events) {
    var that = this;
    var renderedEvents = this.renderedEvents = [];
    
    events.each(function(event) {
      var view = (that.isTransform ? new ResultView({model: event}) : new EventView({model: event}));
      renderedEvents.push(view.render().el);
    });
    
    this.render(true);
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
    
    _.bindAll(this, "stats", "searchNew", "searchDone", "searchDeleted", "render", "show", "hide", "prev", "next", "page", "gotoPage");
    
    App.events.bind("search:stats", this.stats);
    App.events.bind("search:done", this.searchDone);
    App.events.bind("search:new", this.searchNew);
    App.events.bind("search:deleted", this.searchDeleted);
  },
  
  events: {
    "click div.pagination li.prev a": "prev",
    "click div.pagination li.next a": "next",
    "click div.pagination li.number a": "page"
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
    this.collection.getResults(pageNum - 1, function() {
      pagination.render();
    });
  },
  
  stats: function(properties) {
    this.resultCount = properties.content.resultCount;
  },
  
  searchNew: function(job) {
    this.isSearchDone = false;
    this.resultCount = 0;
    this.currentPage = 0;
    this.job = job;
    this.render();
  },
  
  searchDone: function() {
    this.isSearchDone = true;
    this.render();
    this.gotoPage(1);
  },
  
  searchDeleted: function(job) {
    if (this.job && job.sid === this.job.sid) {
      this.resultCount = 0;
      this.isSearchDone = false;
      this.render();
    }
  },
  
  render: function() {
    var numPages = Math.ceil((this.resultCount / this.collection.resultsPerPage));
    var pageList = _.range(1, numPages + 1, 1);
    
    var paginationInfo = {
      isPrevDisabled: this.currentPage === 1,
      isNextDisabled: this.currentPage === numPages,
      items: [],
      numPages: numPages
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
    
    _.bindAll(this, "render", "hide", "show", "stats", "newJob", "unpause", "pause", "del", "finalize");
    
    App.events.bind("search:new", this.hide);
    App.events.bind("search:new", this.newJob);
    App.events.bind("search:stats", this.stats);
    App.events.bind("search:deleted", this.hide);
  },
  
  events: {
    "click a.unpause" : "unpause",
    "click a.pause" : "pause",
    "click a.delete" : "del",
    "click a.finalize" : "finalize"
  },
  
  newJob: function(job) {
    this.job = job;
  },
  
  unpause: function(e) {
    e.preventDefault();
    this.job.unpause();
  },
  
  pause: function(e) {
    e.preventDefault();
    this.job.pause();
  },
  
  del: function(e) {
    e.preventDefault();
    this.job.cancel();
    this.hide();
    App.events.trigger("search:deleted", this.job);
  },
  
  finalize: function(e) {
    e.preventDefault();
    this.job.finalize();
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
      eventCount: properties.content.eventCount,
      scanCount: properties.content.scanCount,
      actions: propertiesToActions(properties.content)
    };
    
    this.render(stats);
  }
});

var messageMappings = {
  "warn": "warning",
  "fatal": "error",
  "error": "error",
  "info": "info"
}

var SearchFormView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  id: "search-row",
  
  initialize : function() {
    this.template = templates.searchForm;
    this.alertTemplate = templates.alert;
    this.messages = {};
    
    _.bindAll(this, "search", "render", "stats", "failed", "deleted");
    App.events.bind("search:stats", this.stats);
    App.events.bind("search:failed", this.failed);
    App.events.bind("search:deleted", this.deleted);
  },
  
  events: {
    "submit #search-form": "search",
    "click #submit-search": "search"
  },
  
  stats: function(properties) {
    this.sid = properties.content.sid;
    this.messages = properties.messages || {};
    this.render();
  },
  
  failed: function(query, messages) {
    this.messages = messages || {};
    this.render();
  },
  
  deleted: function(job) {
    if (this.sid && this.sid === job.sid) {
      this.messages = {};
      this.render();
    }
  },
  
  search: function(e) {
    e.preventDefault();
    if (!App.service()) {
      return;
    }
    
    var query = splunkjs.Utils.trim($("#searchbox").val());
    
    if (query !== "") {
      performSearch(App.service(), query);
    }
    
    e.preventDefault();
  },
  
  render: function() {
    var query = $("#searchbox").val() || "";
    
    var content = this.template.tmpl();
    $(this.el).html(content);
    
    // Set values
    $("#searchbox").val(query);
    
    // Render any alerts
    var messageElements = [];
    var alertTemplate = this.alertTemplate;
    _.each(this.messages, function(value, key) {
      key = messageMappings[key];
      
      _.each(value, function(text) {
        var el = alertTemplate.tmpl({
          messageClass: key,
          text: text
        });
        
        messageElements.push(el[0]);
      });
    });
    
    $("#messages").append(messageElements);
    
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
    "click a.finalize" : "finalize"
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
    App.events.trigger("search:deleted", this.model.job);
  },
  
  finalize: function(e) {
    e.preventDefault();
    this.model.finalize();
  },
  
  render: function() {
    var properties = this.model.toJSON();
    
    var expires = new Date();
    expires = new Date(expires.valueOf() + properties.content.ttl * 1000);
    runtime = new Date(parseFloat(properties.content.runDuration) * 1000 - (16 * 60 * 60 * 1000));
    
    var templateData = {
      dispatchedAt: new Date(Date.parse(properties.published)).format("m/d/yy h:MM:ss TT"),
      owner: properties.author,
      application: properties.acl.app,
      size: (properties.content.diskUsage / 1000000).toFixed(2) + "MB",
      events: properties.content.eventCount,
      runtime: runtime.format("HH:MM:ss.l"),
      expires: expires.format("m/d/yy h:MM:ss TT"),
      status: propertiesToState(properties.content),
      query: properties.content.label || properties.name,
      actions: propertiesToActions(properties.content)
    };
    var content = this.template.tmpl(templateData);
    
    $(this.el).html(content);
    
    return this;
  }
});

var JobsView = Backbone.View.extend({
  tagName: "div",
  className: "row",
  
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
    
    this.searchFormView = new SearchFormView();
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
  }
});

var JobManagerView = Backbone.View.extend({
  tagName: "div",
  className: "container",
  id: "content",
  
  initialize: function() {
    _.bindAll(this, "render");
    
    this.jobs = new Jobs([], {});
    this.jobsView = new JobsView({collection: this.jobs, container: "#jobs-list"});
    
    var that = this;
    App.events.bind("search:new", function() {
      that.jobs.fetch();
    });
    
    this.jobs.continuousFetch();
  },
  
  render: function() {
    $(this.el).empty();
    
    $(this.el).append(this.jobsView.render().el);
    
    return this;
  }
});

var MapView = Backbone.View.extend({
  tagName: "div",
  className: "container",
  id: "content",
  
  initialize: function() {
    this.template = templates.map;
    _.bindAll(this, "render", "searchDone", "stats");
    
    this.markers = {};
    
    App.events.bind("search:stats", this.stats);
    App.events.bind("search:done", this.searchDone);
  },
  
  stats: function(properties) {
    this.properties = properties;
  },
  
  searchDone: function(job) {
    this.job = job;
    
    this.getResults();
  },
  
  getResults: function() {
    this.markers = {};
    
    var that = this;
    var iterator = this.job.iterator("results");
    
    var hasMore = true;
    splunkjs.Async.whilst(
      function() { return hasMore; },
      function(iterationDone) {
        iterator.next(function(err, results, more) {
          if (err) {
            iterationDone(err);
            return;
          }
          
          hasMore = more;
          
          if (more) {
            var fields = results.fields;
            var lngIndex, latIndex;
            
            for(var i = 0; i < fields.length; i++) {
              if (fields[i] === "lng") {
                lngIndex = i;
              }
              else if (fields[i] === "lat") {
                latIndex = i;
              }
            }
            
            var data = results.rows;
            for(var i = 0; i < data.length; i++) {
              var result = data[i];
              var latVal = result[latIndex];
              var lngVal = result[lngIndex];
              
              if (!latVal || !lngVal) {
                continue;
              }
              
              var lat = latVal;
              var lng = lngVal;
              
              var properties = [];
              for (var j = 0; j < fields.length; j++) {
                property = fields[j];
                if (!splunkjs.Utils.startsWith(property, "_")) {
                  properties.push({
                    key: property,
                    value: result[j]
                  });
                }
              }
              
              that.addMarker(lat, lng, properties);
            }
          }
          
          iterationDone();
        });
      },
      function(err) {
        if (err) {
          console.log("GEO ERR: " + err);
          alert("GEOERR!");
        }
        that.render();
      });
  },
  
  addMarker: function(lat, lng, properties) {
    var key = lat + "," + lng;
    var marker = this.markers[key] || { lat: lat, lng: lng, count: 0, properties: properties };
    marker.count++;
    
    this.markers[key] = marker;
  },
  
  render: function() {
    var that = this;
    $(this.el).empty();
    
    $(this.el).html(this.template.tmpl());
    
    this.$("#map-canvas").gmap({
      center: "47.669221800000003,-122.38209860000001",
      zoom: 10
    }).bind('init', function(e, map) {
      _.each(that.markers, function(marker, key) {
        that.$("#map-canvas").gmap('addMarker', {
          position: key,
          value: key
        }).click(function(e) {
          var content = templates.eventProperties.tmpl(marker);
          that.$("#map-canvas").gmap("openInfoWindow", {
            content: content[0]
          }, this);
        });
      });
    });
    
    return this;
  }
});  

var BootstrapModalView = Backbone.View.extend({
  initialize: function() {
    this.template = this.options.template;
    this.el = $(this.template.tmpl());
    this.modal = this.el.modal({
      backdrop: true,
      modal: true,
      closeOnEscape: true
    });
    
    _.bindAll(this, "show", "hide", "primaryClicked", "secondaryClicked");
    
    this.delegateEvents();
  },
  
  events: {
    "click a.button1": "primaryClicked",
    "click a.button2": "secondaryClicked"
  },
  
  show: function() {
    this.modal.open();
  },
  
  hide: function(e) {
    if (e) {
      e.preventDefault();
    }
    
    this.modal.close();
  },
  
  primaryClicked: function(e) {
    e.preventDefault();
  },
  
  secondaryClicked: function(e) {
    e.preventDefault();
  }
});

var SigninView = BootstrapModalView.extend({
  initialize: function() {
    this.options.template = templates.signin;
    BootstrapModalView.prototype.initialize.call(this);
     
    _.bindAll(this, "submit", "clear", "login");
    this.events["keypress input"] = "submit";
    this.delegateEvents();
  },
  
  submit: function(e) {
    // Submit on enter
    if (e.keyCode === 13) {
      this.login(e);
    }
  },
    
  login: function(e) {
    e.preventDefault();    
    var that = this;
    
    var username = this.$("#id_username").val() || "admin";
    var password = this.$("#id_password").val() || "changeme";
    var scheme   = this.$("#id_scheme").val() || "https";
    var host     = this.$("#id_host").val() || "localhost";
    var port     = this.$("#id_port").val() || "8089";
    var app      = this.$("#id_app").val() || "search";
    var version  = this.$("#id_version").val() || "5.0";
    
    var base = scheme + "://" + host + ":" + port;
    
    var http = new splunkjs.ProxyHttp("/proxy");
    var svc = new splunkjs.Service(http, { 
        scheme: scheme,
        host: host,
        port: port,
        username: username,
        password: password,
        app: app,
        version: version
    });
      
    svc.login(function(err, success) {
      if (err || !success) {
          this.$("#login-error p").text("There was an error logging in.").parent().removeClass("hidden");
        }
        else {
          that.hide(e);
          App.events.trigger("service:login", svc);
        }
      });
  },
  
  primaryClicked: function(e) {
    this.login(e);
  },
  
  secondaryClicked: function(e) {
    e.preventDefault();
    this.hide();
  },  
  
  clear: function() {
    this.$("input").each(function(index, input) {
      $(input).val("");
    });
    
    this.$("#login-error").addClass("hidden");
  }
});

var NavBarView = Backbone.View.extend({
  initialize: function() {
    this.template = templates.navBar;
    
    _.bindAll(this, "render", "signin", "signedIn", "doNothing");
    
    App.events.bind("service:login", this.signedIn);
  },
  
  events: {
    "click button.signin": "signin",
    "click a#login-info": "doNothing"
  },
  
  doNothing: function(e) {
    e.preventDefault();
  },
  
  signin: function(e) {
    e.preventDefault();
    
    var signinView = new SigninView();
    signinView.clear();
    signinView.show();
  },
  
  signedIn: function(service) {
    var base = service.scheme + "://" + service.host + ":" + service.port;
    var username = service.username;
    
    var text = username + " @ " + base;
    this.$("#login-info").text(text);
  },
  
  render: function() {
    $(this.el).empty();
    $(this.el).append(this.template.tmpl());
    
    return this;
  }
});