
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var tutils = require('../utils');
    var Async = splunkjs.Async;
    var utils = splunkjs.Utils;
    var idCounter = 0;
    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Saved Search", function () {
            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            })

            it("Callback#list", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch(function (err, searches) {
                    var savedSearches = searches.list();
                    assert.ok(savedSearches.length > 0);

                    for (var i = 0; i < savedSearches.length; i++) {
                        assert.ok(savedSearches[i]);
                    }

                    done();
                });
            })

            it("Callback#contains", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch(function (err, searches) {
                    var search = searches.item("Errors in the last hour");
                    assert.ok(search);

                    done();
                });
            })

            it("Callback#suppress", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch(function (err, searches) {
                    var search = searches.item("Errors in the last hour");
                    assert.ok(search);

                    search.suppressInfo(function (err, info, search) {
                        assert.ok(!err);
                        done();
                    });
                });
            })

            it("Callback#list limit count", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch({ count: 2 }, function (err, searches) {
                    var savedSearches = searches.list();
                    assert.strictEqual(savedSearches.length, 2);

                    for (var i = 0; i < savedSearches.length; i++) {
                        assert.ok(savedSearches[i]);
                    }

                    done();
                });
            })

            it("Callback#list filter", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch({ search: "Error" }, function (err, searches) {
                    var savedSearches = searches.list();
                    assert.ok(savedSearches.length > 0);

                    for (var i = 0; i < savedSearches.length; i++) {
                        assert.ok(savedSearches[i]);
                    }

                    done();
                });
            })

            it("Callback#list offset", function (done) {
                var searches = this.service.savedSearches();
                searches.fetch({ offset: 2, count: 1 }, function (err, searches) {
                    var savedSearches = searches.list();
                    assert.strictEqual(searches.paging().offset, 2);
                    assert.strictEqual(searches.paging().perPage, 1);
                    assert.strictEqual(savedSearches.length, 1);

                    for (var i = 0; i < savedSearches.length; i++) {
                        assert.ok(savedSearches[i]);
                    }

                    done();
                });
            })

            it("Callback#create + modify + delete saved search", function (done) {
                var name = "jssdk_savedsearch";
                var originalSearch = "search * | head 1";
                var updatedSearch = "search * | head 10";
                var updatedDescription = "description";

                var searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });

                Async.chain([
                    function (done) {
                        searches.create({ search: originalSearch, name: name }, done);
                    },
                    function (search, done) {
                        assert.ok(search);

                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, originalSearch);
                        assert.ok(!search.properties().description);

                        search.update({ search: updatedSearch }, done);
                    },
                    function (search, done) {
                        assert.ok(search);
                        assert.ok(search);

                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, updatedSearch);
                        assert.ok(!search.properties().description);

                        search.update({ description: updatedDescription }, done);
                    },
                    function (search, done) {
                        assert.ok(search);
                        assert.ok(search);

                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, updatedSearch);
                        assert.strictEqual(search.properties().description, updatedDescription);

                        search.fetch(done);
                    },
                    function (search, done) {
                        // Verify that we have the required fields
                        assert.ok(search.fields().optional.length > 1);
                        assert.ok(utils.indexOf(search.fields().optional, "disabled") > -1);

                        search.remove(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#dispatch error", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search" }
                );
                search.dispatch(function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#dispatch omitting optional arguments", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var searches = this.service.savedSearches({ owner: this.service.username, app: "sdk-app-collection" });

                Async.chain(
                    [function (done) {
                        searches.create({ search: originalSearch, name: name }, done);
                    },
                    function (search, done) {
                        assert.ok(search);

                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, originalSearch);
                        assert.ok(!search.properties().description);

                        search.dispatch(done);
                    },
                    function (job, search, done) {
                        assert.ok(job);
                        assert.ok(search);
                    }]
                );
                done();
            })

            it("Callback#history with pagination", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });

                Async.chain([
                    function (done) {
                        searches.create({ search: originalSearch, name: name }, done);
                    },
                    function (search, done) {
                        assert.ok(search);
                        search.dispatch(done);
                    },
                    function (job, search, done) {
                        assert.ok(job);
                        assert.ok(search);
                        search.dispatch(done);
                    },
                    function (job, search, done) {
                        assert.ok(job);
                        assert.ok(search);

                        tutils.pollUntil(
                            job, () => job.properties()["isDone"], 10, Async.augment(done, search)
                        );
                    },
                    function (job, search, done) {
                        search.history({ count: 1 }, Async.augment(done, job));
                    },
                    function (jobs, search, originalJob, done) {
                        assert.ok(jobs.length > 0);
                        assert.equal(jobs.length, 1);
                        done();
                    }],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#history error", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search", sharing: "system" }
                );
                search.history(function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#Update error", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";
                var search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search", sharing: "system" }
                );
                search.update(
                    {},
                    function (err) {
                        assert.ok(err);
                        done();
                    });
            })

            it("Callback#oneshot requires search string", function (done) {
                assert.throws(function () { this.service.oneshotSearch({ name: "jssdk_oneshot_" + getNextId() }, function (err) { }); });
                done();
            })

            it("Callback#Create + dispatch + history", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });

                Async.chain(
                    function (done) {
                        searches.create({ search: originalSearch, name: name }, done);
                    },
                    function (search, done) {
                        assert.ok(search);

                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, originalSearch);
                        assert.ok(!search.properties().description);

                        search.dispatch({ force_dispatch: false, "dispatch.buckets": 295 }, done);
                    },
                    function (job, search, done) {
                        assert.ok(job);
                        assert.ok(search);

                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            Async.augment(done, search)
                        );
                    },
                    function (job, search, done) {
                        assert.strictEqual(job.properties().statusBuckets, 295);
                        search.history(Async.augment(done, job));
                    },
                    function (jobs, search, originalJob, done) {
                        assert.ok(jobs);
                        assert.ok(jobs.length > 0);
                        assert.ok(search);
                        assert.ok(originalJob);

                        var cancel = function (job) {
                            return function (cb) {
                                job.cancel(cb);
                            };
                        };

                        var found = false;
                        var cancellations = [];
                        for (var i = 0; i < jobs.length; i++) {
                            cancellations.push(cancel(jobs[i]));
                            found = found || (jobs[i].sid === originalJob.sid);
                        }

                        assert.ok(found);

                        search.remove(function (err) {
                            if (err) {
                                done(err);
                            }
                            else {
                                Async.parallel(cancellations, done);
                            }
                        });
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#job events fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.events({}, function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#job preview fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.preview({}, function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#job results fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.results({}, function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#job searchlog fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.searchlog(function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#job summary fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.summary({}, function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#job timeline fails", function (done) {
                var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                job.timeline({}, function (err) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#delete test saved searches", function (done) {
                var searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                searches.fetch(function (err, searches) {
                    var searchList = searches.list();
                    Async.parallelEach(
                        searchList,
                        function (search, idx, callback) {
                            if (utils.startsWith(search.name, "jssdk_")) {
                                search.remove(callback);
                            }
                            else {
                                callback();
                            }
                        }, function (err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            })

            it("Callback#setupInfo fails", function (done) {
                var searches = new splunkjs.Service.Application(this.loggedOutService, "search");
                searches.setupInfo(function (err, content, that) {
                    assert.ok(err);
                    done();
                });
            })

            it("Callback#setupInfo succeeds", function (done) {
                var app = new splunkjs.Service.Application(this.service, "sdkappcollection");
                app.setupInfo(function (err, content, app) {
                    // This error message was removed in modern versions of Splunk
                    if (err) {
                        assert.ok(err.data.messages[0].text.match("Setup configuration file does not"));
                        splunkjs.Logger.log("ERR ---", err.data.messages[0].text);
                    }
                    else {
                        assert.ok(app);
                    }
                    done();
                });
            })

            it("Callback#updateInfo", function (done) {
                var app = new splunkjs.Service.Application(this.service, "search");
                app.updateInfo(function (err, info, app) {
                    assert.ok(!err);
                    assert.ok(app);
                    assert.strictEqual(app.name, 'search');
                    done();
                });
            })

            it("Callback#updateInfo failure", function (done) {
                var app = new splunkjs.Service.Application(this.loggedOutService, "sdkappcollection");
                app.updateInfo(function (err, info, app) {
                    assert.ok(err);
                    done();
                });
            })
        })
    );
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc, loggedOutSvc));
        });
    });
}
