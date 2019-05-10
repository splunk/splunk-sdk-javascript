var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;
var tutils      = require('../utils');

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc, loggedOutSvc) {
    return {
        setUp: function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        },

        "Callback#list": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var savedSearches = searches.list();
                test.ok(savedSearches.length > 0);

                for(var i = 0; i < savedSearches.length; i++) {
                    test.ok(savedSearches[i]);
                }

                test.done();
            });
        },

        "Callback#contains": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var search = searches.item("Errors in the last hour");
                test.ok(search);

                test.done();
            });
        },

        "Callback#suppress": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var search = searches.item("Errors in the last hour");
                test.ok(search);

                search.suppressInfo(function(err, info, search) {
                    test.ok(!err);
                    test.done();
                });
            });
        },

        "Callback#list limit count": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch({count: 2}, function(err, searches) {
                var savedSearches = searches.list();
                test.strictEqual(savedSearches.length, 2);

                for(var i = 0; i < savedSearches.length; i++) {
                    test.ok(savedSearches[i]);
                }

                test.done();
            });
        },

        "Callback#list filter": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch({search: "Error"}, function(err, searches) {
                var savedSearches = searches.list();
                test.ok(savedSearches.length > 0);

                for(var i = 0; i < savedSearches.length; i++) {
                    test.ok(savedSearches[i]);
                }

                test.done();
            });
        },

        "Callback#list offset": function(test) {
            var searches = this.service.savedSearches();
            searches.fetch({offset: 2, count: 1}, function(err, searches) {
                var savedSearches = searches.list();
                test.strictEqual(searches.paging().offset, 2);
                test.strictEqual(searches.paging().perPage, 1);
                test.strictEqual(savedSearches.length, 1);

                for(var i = 0; i < savedSearches.length; i++) {
                    test.ok(savedSearches[i]);
                }

                test.done();
            });
        },

        "Callback#create + modify + delete saved search": function(test) {
            var name = "jssdk_savedsearch";
            var originalSearch = "search * | head 1";
            var updatedSearch = "search * | head 10";
            var updatedDescription = "description";

            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

            Async.chain([
                    function(done) {
                        searches.create({search: originalSearch, name: name}, done);
                    },
                    function(search, done) {
                        test.ok(search);

                        test.strictEqual(search.name, name);
                        test.strictEqual(search.properties().search, originalSearch);
                        test.ok(!search.properties().description);

                        search.update({search: updatedSearch}, done);
                    },
                    function(search, done) {
                        test.ok(search);
                        test.ok(search);

                        test.strictEqual(search.name, name);
                        test.strictEqual(search.properties().search, updatedSearch);
                        test.ok(!search.properties().description);

                        search.update({description: updatedDescription}, done);
                    },
                    function(search, done) {
                        test.ok(search);
                        test.ok(search);

                        test.strictEqual(search.name, name);
                        test.strictEqual(search.properties().search, updatedSearch);
                        test.strictEqual(search.properties().description, updatedDescription);

                        search.fetch(done);
                    },
                    function(search, done) {
                        // Verify that we have the required fields
                        test.ok(search.fields().optional.length > 1);
                        test.ok(utils.indexOf(search.fields().optional, "disabled") > -1);

                        search.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#dispatch error": function(test) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
            var search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                {owner: "nobody", app: "search"}
            );
            search.dispatch(function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#dispatch omitting optional arguments": function(test) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";

            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

            Async.chain(
                [function(done) {
                    searches.create({search: originalSearch, name: name}, done);
                },
                    function(search, done) {
                        test.ok(search);

                        test.strictEqual(search.name, name);
                        test.strictEqual(search.properties().search, originalSearch);
                        test.ok(!search.properties().description);

                        search.dispatch(done);
                    },
                    function(job, search, done) {
                        test.ok(job);
                        test.ok(search);
                        test.done();
                    }]
            );
        },

        "Callback#history error": function(test) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
            var search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                {owner: "nobody", app: "search", sharing: "system"}
            );
            search.history(function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#Update error": function(test) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
            var search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                {owner: "nobody", app: "search", sharing: "system"}
            );
            search.update(
                {},
                function(err) {
                    test.ok(err);
                    test.done();
                });
        },

        "Callback#oneshot requires search string": function(test) {
            test.throws(function() { this.service.oneshotSearch({name: "jssdk_oneshot_" + getNextId()}, function(err) {});});
            test.done();
        },

        "Callback#Create + dispatch + history": function(test) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";

            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});

            Async.chain(
                function(done) {
                    searches.create({search: originalSearch, name: name}, done);
                },
                function(search, done) {
                    test.ok(search);

                    test.strictEqual(search.name, name);
                    test.strictEqual(search.properties().search, originalSearch);
                    test.ok(!search.properties().description);

                    search.dispatch({force_dispatch: false, "dispatch.buckets": 295}, done);
                },
                function(job, search, done) {
                    test.ok(job);
                    test.ok(search);

                    tutils.pollUntil(
                        job,
                        function(j) {
                            return job.properties()["isDone"];
                        },
                        10,
                        Async.augment(done, search)
                    );
                },
                function(job, search, done) {
                    test.strictEqual(job.properties().statusBuckets, 295);
                    search.history(Async.augment(done, job));
                },
                function(jobs, search, originalJob, done) {
                    test.ok(jobs);
                    test.ok(jobs.length > 0);
                    test.ok(search);
                    test.ok(originalJob);

                    var cancel = function(job) {
                        return function(cb) {
                            job.cancel(cb);
                        };
                    };

                    var found = false;
                    var cancellations = [];
                    for(var i = 0; i < jobs.length; i++) {
                        cancellations.push(cancel(jobs[i]));
                        found = found || (jobs[i].sid === originalJob.sid);
                    }

                    test.ok(found);

                    search.remove(function(err) {
                        if (err) {
                            done(err);
                        }
                        else {
                            Async.parallel(cancellations, done);
                        }
                    });
                },
                function(err) {
                    test.ok(!err);
                    test.done();
                }
            );
        },

        "Callback#job events fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.events({}, function (err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#job preview fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.preview({}, function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#job results fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.results({}, function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#job searchlog fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.searchlog(function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#job summary fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.summary({}, function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#job timeline fails": function(test) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.timeline({}, function(err) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#delete test saved searches": function(test) {
            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});
            searches.fetch(function(err, searches) {
                var searchList = searches.list();
                Async.parallelEach(
                    searchList,
                    function(search, idx, callback) {
                        if (utils.startsWith(search.name, "jssdk_")) {
                            search.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            });
        },

        "Callback#setupInfo fails": function(test) {
            var searches = new splunkjs.Service.Application(this.loggedOutService, "search");
            searches.setupInfo(function(err, content, that) {
                test.ok(err);
                test.done();
            });
        },

        "Callback#setupInfo succeeds": function(test) {
            var app = new splunkjs.Service.Application(this.service, "sdk-app-collection");
            app.setupInfo(function(err, content, app) {
                // This error message was removed in modern versions of Splunk
                if (err) {
                    test.ok(err.data.messages[0].text.match("Setup configuration file does not"));
                    splunkjs.Logger.log("ERR ---", err.data.messages[0].text);
                }
                else {
                    test.ok(app);
                }
                test.done();
            });
        },

        "Callback#updateInfo": function(test) {
            var app = new splunkjs.Service.Application(this.service, "search");
            app.updateInfo(function(err, info, app) {
                test.ok(!err);
                test.ok(app);
                test.strictEqual(app.name, 'search');
                test.done();
            });
        },

        "Callback#updateInfo failure": function(test) {
            var app = new splunkjs.Service.Application(this.loggedOutService, "sdk-app-collection");
            app.updateInfo(function(err, info, app) {
                test.ok(err);
                test.done();
            });
        }
    };
};