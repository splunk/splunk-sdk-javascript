
var templates = {
  eventRow: $("#eventRowTemplate"),
  searchForm: $("#searchFormTemplate"),
  searchStats: $("#searchStatsTemplate")
}

var JQueryHttp = window.Splunk.JQueryHttp;

var performSearch = function(svc, query) {          
  var job = null;
  
  if (!Splunk.Utils.startsWith(query.trim(), "search")) {
    query = "search " + query;
  }
  
  var jobP = svc.jobs().create(query);
  
  jobP.whenResolved(function(createdJob) {  
    events.reset();
    
    job = createdJob;
    searcher = new Splunk.Searcher.JobManager(svc, job);
    
    var searchDoneP = searcher.done();
    
    searchDoneP.onProgress(function(properties) {
      App.events.trigger("search:stats", properties);
    });
    
    return searchDoneP;
  }).whenResolved(function() {
    var iterator = searcher.eventsIterator(1000);
    
    var hasMore = true;
    var iterateP = Splunk.Promise.while({
        condition: function() { return hasMore; },
        body: function(index) {
            return iterator.next().whenResolved(function(more, results) {
                hasMore = more;
                
                if (more) {
                  var data = results.data;
                  var rows = [];
                  for(var i = 0; i < data.length; i++) {
                    var rowData = {
                      index: parseInt(data[i]["__offset"]) + 1,
                      timestamp: new Date(Date.parse(data[i]["_time"][0].value)).format("m/d/yy h:MM:ss.l TT"),
                      event: data[i]["_raw"][0].value[0]
                    };
                    
                    rows.push(rowData);
                  }
                  
                  events.add(rows);
                }
            });
        }
    });
  });
};

var Event = Backbone.Model.extend({
  save: function() {
    // do nothing
  }
});

var Events = Backbone.Collection.extend({
  model: Event
});

var events = new Events();

var EventView = Backbone.View.extend({
  tagName: "tr",
  initialize: function() {
    this.template = templates.eventRow;//$("#eventRowTemplate");
    
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

var EventsView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, "render", "add", "reset", "hide", "show");
    
    this.collection.bind("add", this.add);
    this.collection.bind("reset", this.reset);
    
    console.log(App);
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
    this.renderedEvents = [];
    
    _.each(events, function(event) {
      var view = new EventView({model: event});
      this.renderedEvents.push(view.render().el);
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
    var query = $("#searchbox").val().trim();
    
    if (query !== "") {
      performSearch(this.options.service, query)
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
    console.log("Render stats: ", stats);
    var content = this.template.tmpl(stats);
    $(this.el).html(content);
    
    if (stats) {
      console.log("show")
      this.show();
    }
    else {
      console.log("hide")
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
    this.eventsView = new EventsView({collection: events, el : "#results-table > tbody:last", container: "#results"});
    this.searchStatsView = new SearchStatsView({el: "#stats-row"});
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
  
  var job = null;
  var searcher = null;
  var loginP = svc.login();
  var doneP = loginP.whenResolved(function() {
    var app = new SearchApp(svc);
    Backbone.history.start();
  });
  
});