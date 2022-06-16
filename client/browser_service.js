
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;
assert = chai.assert;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

describe("Service Tests ", function(){

    describe("Namespace Tests",function () {
        before(function (finished) {
            this.service = svc;
            var that = this;

            var appName1 = "jssdk_testapp_" + getNextId();
            var appName2 = "jssdk_testapp_" + getNextId();

            var userName1 = "jssdk_testuser_" + getNextId();
            var userName2 = "jssdk_testuser_" + getNextId();

            var apps = this.service.apps();
            var users = this.service.users();

            this.namespace11 = {owner: userName1, app: appName1};
            this.namespace12 = {owner: userName1, app: appName2};
            this.namespace21 = {owner: userName2, app: appName1};
            this.namespace22 = {owner: userName2, app: appName2};

            Async.chain([
                function (done) {
                    apps.create({name: appName1}, done);
                },
                function (app1, done) {
                    that.app1 = app1;
                    that.appName1 = appName1;
                    apps.create({name: appName2}, done);
                },
                function (app2, done) {
                    that.app2 = app2;
                    that.appName2 = appName2;
                    users.create({name: userName1, password: "abcdefg!", roles: ["user"]}, done);
                },
                function (user1, done) {
                    that.user1 = user1;
                    that.userName1 = userName1;
                    users.create({name: userName2, password: "abcdefg!", roles: ["user"]}, done);
                },
                function (user2, done) {
                    that.user2 = user2;
                    that.userName2 = userName2;

                    done();
                }
            ],
            function (err) {
                finished(err);
            }
            );
        });

        it("Callback#Namespace protection", function(done) {
            var searchName = "jssdk_search_" + getNextId();
            var search = "search *";
            var service = this.service;

            var savedSearches11 = service.savedSearches(this.namespace11);
            var savedSearches21 = service.savedSearches(this.namespace21);

            var that = this;
            Async.chain([
                    function(done) {
                        // Create the saved search only in the 11 namespace
                        savedSearches11.create({name: searchName, search: search}, done);
                    },
                    function(savedSearch, done) {
                        // Refresh the 11 saved searches
                        savedSearches11.fetch(done);
                    },
                    function(savedSearches, done) {
                        // Refresh the 21 saved searches
                        savedSearches21.fetch(done);
                    },
                    function(savedSearches, done) {
                        var entity11 = savedSearches11.item(searchName);
                        var entity21 = savedSearches21.item(searchName);

                        // Make sure the saved search exists in the 11 namespace
                        assert.ok(entity11);
                        assert.strictEqual(entity11.name, searchName);
                        assert.strictEqual(entity11.properties().search, search);

                        // Make sure the saved search doesn't exist in the 11 namespace
                        assert.ok(!entity21);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Namespace item", function(done) {
            var searchName = "jssdk_search_" + getNextId();
            var search = "search *";
            var service = this.service;

            var namespace_1 = {owner: "-", app: this.appName1};
            var namespace_nobody1 = {owner: "nobody", app: this.appName1};

            var savedSearches11 = service.savedSearches(this.namespace11);
            var savedSearches21 = service.savedSearches(this.namespace21);
            var savedSearches_1 = service.savedSearches(namespace_1);
            var savedSearches_nobody1 = service.savedSearches(namespace_nobody1);

            var that = this;
            Async.chain([
                    function(done) {
                        // Create a saved search in the 11 namespace
                        savedSearches11.create({name: searchName, search: search}, done);
                    },
                    function(savedSearch, done) {
                        // Create a saved search in the 21 namespace
                        savedSearches21.create({name: searchName, search: search}, done);
                    },
                    function(savedSearch, done) {
                        // Refresh the -/1 namespace
                        savedSearches_1.fetch(done);
                    },
                    function(savedSearches, done) {
                        // Refresh the 1/1 namespace
                        savedSearches11.fetch(done);
                    },
                    function(savedSearches, done) {
                        // Refresh the 2/1 namespace
                        savedSearches21.fetch(done);
                    },
                    function(savedSearches, done) {
                        var entity11 = savedSearches11.item(searchName, that.namespace11);
                        var entity21 = savedSearches21.item(searchName, that.namespace21);

                        // Ensure that the saved search exists in the 11 namespace
                        assert.ok(entity11);
                        assert.strictEqual(entity11.name, searchName);
                        assert.strictEqual(entity11.properties().search, search);
                        assert.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                        assert.strictEqual(entity11.namespace.app, that.namespace11.app);

                        // Ensure that the saved search exists in the 21 namespace
                        assert.ok(entity21);
                        assert.strictEqual(entity21.name, searchName);
                        assert.strictEqual(entity21.properties().search, search);
                        assert.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                        assert.strictEqual(entity21.namespace.app, that.namespace21.app);

                        done();
                    },
                    function(done) {
                        // Create a saved search in the nobody/1 namespace
                        savedSearches_nobody1.create({name: searchName, search: search}, done);
                    },
                    function(savedSearch, done) {
                        // Refresh the 1/1 namespace
                        savedSearches11.fetch(done);
                    },
                    function(savedSearches, done) {
                        // Refresh the 2/1 namespace
                        savedSearches21.fetch(done);
                    },
                    function(savedSearches, done) {
                        // Ensure that we can't get the item from the generic
                        // namespace without specifying a namespace
                        try {
                            savedSearches_1.item(searchName);
                            assert.ok(false);
                        }
                        catch(err) {
                            assert.ok(err);
                        }

                        // Ensure that we can't get the item using wildcard namespaces.
                        try{
                            savedSearches_1.item(searchName, {owner:'-'});
                            assert.ok(false);
                        }
                        catch(err){
                            assert.ok(err);
                        }

                        try{
                            savedSearches_1.item(searchName, {app:'-'});
                            assert.ok(false);
                        }
                        catch(err){
                            assert.ok(err);
                        }

                        try{
                            savedSearches_1.item(searchName, {app:'-', owner:'-'});
                            assert.ok(false);
                        }
                        catch(err){
                            assert.ok(err);
                        }

                        // Ensure we get the right entities from the -/1 namespace when we
                        // specify it.
                        var entity11 = savedSearches_1.item(searchName, that.namespace11);
                        var entity21 = savedSearches_1.item(searchName, that.namespace21);

                        assert.ok(entity11);
                        assert.strictEqual(entity11.name, searchName);
                        assert.strictEqual(entity11.properties().search, search);
                        assert.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                        assert.strictEqual(entity11.namespace.app, that.namespace11.app);

                        assert.ok(entity21);
                        assert.strictEqual(entity21.name, searchName);
                        assert.strictEqual(entity21.properties().search, search);
                        assert.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                        assert.strictEqual(entity21.namespace.app, that.namespace21.app);

                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#delete test applications", function(done) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                assert.ok(!err);
                assert.ok(apps);
                var appList = apps.list();

                Async.parallelEach(
                    appList,
                    function(app, idx, callback) {
                        if (utils.startsWith(app.name, "jssdk_")) {
                            app.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });

        it("Callback#delete test users", function(done) {
            var users = this.service.users();
            users.fetch(function(err, users) {
                var userList = users.list();

                Async.parallelEach(
                    userList,
                    function(user, idx, callback) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            user.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });
    });

    describe("Job Tests", function() {
        before (function(done) {
            idCounter=0;
            this.service = svc;
            done();
        });
        
        // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
        //
        // "Callback#Create+abort job", function(done) {
        //     var service = this.service;
        //     Async.chain([
        //         function(done){
        //             var app_name = path.join(process.env.SPLUNK_HOME, ('/etc/apps/sdk-app-collection/build/sleep_command.tar'));
        //             // Fix path on Windows if $SPLUNK_HOME contains a space (ex: C:/Program%20Files/Splunk)
        //             app_name = app_name.replace("%20", " ");
        //             service.post("apps/appinstall", {update:1, name:app_name}, done);
        //         },
        //         function(done){
        //             var sid = getNextId();
        //             var options = {id: sid};
        //             var jobs = service.jobs({app: "sdk-app-collection"});
        //             var req = jobs.oneshotSearch('search index=_internal | head 1 | sleep 10', options, function(err, job) {
        //                 assert.ok(err);
        //                 assert.ok(!job);
        //                 assert.strictEqual(err.error, "abort");
        //                 done();
        //             });
    
        //             Async.sleep(1000, function(){
        //                 req.abort();
        //             });
        //         }
        //     ],
        //     function(err){
        //         assert.ok(!err);
        //         done();
        //     });
        // },
    
        it("Callback#Create+cancel job", function(done) {
            var sid = getNextId();
            this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {
                assert.ok(job);
                assert.strictEqual(job.sid, sid);
    
                job.cancel(function() {
                    done();
                });
            });
        });
    
        it("Callback#Create job error", function(done) {
            var sid = getNextId();
            this.service.jobs().search({search: 'index=_internal | head 1', id: sid}, function(err) {
                assert.ok(!!err);
                done();
            });
        });
    
        it("Callback#List jobs", function(done) {
            this.service.jobs().fetch(function(err, jobs) {
                assert.ok(!err);
                assert.ok(jobs);
    
                var jobsList = jobs.list();
                assert.ok(jobsList.length > 0);
    
                for(var i = 0; i < jobsList.length; i++) {
                    assert.ok(jobsList[i]);
                }
    
                done();
            });
        });
    
        it("Callback#Contains job", function(done) {
            var that = this;
            var sid = getNextId();
            var jobs = this.service.jobs();
    
            jobs.search('search index=_internal | head 1', {id: sid}, function(err, job) {
                assert.ok(!err);
                assert.ok(job);
                assert.strictEqual(job.sid, sid);
    
                jobs.fetch(function(err, jobs) {
                    assert.ok(!err);
                    var job = jobs.item(sid);
                    assert.ok(job);
    
                    job.cancel(function() {
                        done();
                    });
                });
            });
        });
    
        it("Callback#job results", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.results({}, done);
                    },
                    function(results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#job events", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.events({}, done);
                    },
                    function(results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, results.rows[0].length);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#job events - fallback to v1 with search params", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 2', {id: sid}, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.events({search: "| head 1"}, done);
                    },
                    function (results, job, done) {
                        assert.strictEqual(results.post_process_count, 1);
                        assert.notEqual(job._state.links.alternate.indexOf("/search/jobs/"), -1);
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, results.rows[0].length);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#job events - use v2 endpoints: no search params", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 2', {id: sid}, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.events({}, done);
                    },
                    function (results, job, done) {
                        assert.isUndefined(results.post_process_count);
                        assert.strictEqual(results.rows.length, 2);
                        assert.strictEqual(results.fields.length, results.rows[0].length);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#job results preview", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.preview({}, done);
                    },
                    function(results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#job results iterator", function(done) {
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 10', {}, done);
                    },
                    function(job, done) {
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        var iterator = job.iterator("results", { pagesize: 4 });
                        var hasMore = true;
                        var numElements = 0;
                        var pageSizes = [];
                        Async.whilst(
                            function() { return hasMore; },
                            function(nextIteration) {
                                iterator.next(function(err, results, _hasMore) {
                                    if (err) {
                                        nextIteration(err);
                                        return;
                                    }
    
                                    hasMore = _hasMore;
                                    if (hasMore) {
                                        pageSizes.push(results.rows.length);
                                    }
                                    nextIteration();
                                });
                            },
                            function(err) {
                                assert.deepEqual(pageSizes, [4,4,2]);
                                done(err);
                            }
                        );
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
        //
        // "Callback#Enable + disable preview", function(done) {
        //     var that = this;
        //     var sid = getNextId();
    
        //     var service = this.service.specialize("nobody", "sdk-app-collection");
    
        //     Async.chain([
        //             function(done) {
        //                 service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
        //             },
        //             function(job, done) {
        //                 job.enablePreview(done);
    
        //             },
        //             function(job, done) {
        //                 job.disablePreview(done);
        //             },
        //             function(job, done) {
        //                 job.cancel(done);
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },
    
        // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
        //
        // "Callback#Pause + unpause + finalize preview", function(done) {
        //     var that = this;
        //     var sid = getNextId();
    
        //     var service = this.service.specialize("nobody", "sdk-app-collection");
    
        //     Async.chain([
        //             function(done) {
        //                 service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
        //             },
        //             function(job, done) {
        //                 job.pause(done);
        //             },
        //             function(job, done) {
        //                 tutils.pollUntil(
        //                     job,
        //                     function(j) {
        //                         return j.properties()["isPaused"];
        //                     },
        //                     10,
        //                     done
        //                 );
        //             },
        //             function(job, done) {
        //                 assert.ok(job.properties()["isPaused"]);
        //                 job.unpause(done);
        //             },
        //             function(job, done) {
        //                 tutils.pollUntil(
        //                     job,
        //                     function(j) {
        //                         return !j.properties()["isPaused"];
        //                     },
        //                     10,
        //                     done
        //                 );
        //             },
        //             function(job, done) {
        //                 assert.ok(!job.properties()["isPaused"]);
        //                 job.finalize(done);
        //             },
        //             function(job, done) {
        //                 job.cancel(done);
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },
    
        it("Callback#Set TTL", function(done) {
            var sid = getNextId();
            var originalTTL = 0;
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                    },
                    function(job, done) {
                        job.fetch(done);
                    },
                    function(job, done) {
                        var ttl = job.properties()["ttl"];
                        originalTTL = ttl;
    
                        job.setTTL(ttl*2, done);
                    },
                    function(job, done) {
                        job.fetch(done);
                    },
                    function(job, done) {
                        var ttl = job.properties()["ttl"];
                        assert.ok(ttl > originalTTL);
                        assert.ok(ttl <= (originalTTL*2));
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
        //
        // "Callback#Set priority", function(done) {
        //     var sid = getNextId();
        //     var originalPriority = 0;
        //     var that = this;
    
        //     var service = this.service.specialize("nobody", "sdk-app-collection");
    
        //     Async.chain([
        //             function(done) {
        //                 service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
        //             },
        //             function(job, done) {
        //                 job.track({}, {
        //                     ready: function(job) {
        //                         done(null, job);
        //                     }
        //                 });
        //             },
        //             function(job, done) {
        //                 var priority = job.properties()["priority"];
        //                 assert.ok(priority, 5);
        //                 job.setPriority(priority + 1, done);
        //             },
        //             function(job, done) {
        //                 job.fetch(done);
        //             },
        //             function(job, done) {
        //                 job.cancel(done);
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },
    
        it("Callback#Search log", function(done) {
            var sid = getNextId();
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1', {id: sid, exec_mode: "blocking"}, done);
                    },
                    function(job, done) {
                        job.searchlog(done);
                    },
                    function(log, job, done) {
                        assert.ok(job);
                        assert.ok(log);
                        assert.ok(log.length > 0);
                        assert.ok(log.split("\r\n").length > 0);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Search summary", function(done) {
            var sid = getNextId();
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search(
                            'search index=_internal | head 1 | eval foo="bar" | fields foo',
                            {
                                id: sid,
                                status_buckets: 300,
                                rf: ["foo"]
                            },
                            done);
                    },
                    function(job, done) {
                        // Let's sleep for 2 second so
                        // we let the server catch up
                        Async.sleep(2000, function() {
                            job.summary({}, done);
                        });
                    },
                    function(summary, job, done) {
                        assert.ok(job);
                        assert.ok(summary);
                        assert.strictEqual(summary.event_count, 1);
                        assert.strictEqual(summary.fields.foo.count, 1);
                        assert.strictEqual(summary.fields.foo.distinct_count, 1);
                        assert.ok(summary.fields.foo.is_exact, 1);
                        assert.strictEqual(summary.fields.foo.modes.length, 1);
                        assert.strictEqual(summary.fields.foo.modes[0].count, 1);
                        assert.strictEqual(summary.fields.foo.modes[0].value, "bar");
                        assert.ok(summary.fields.foo.modes[0].is_exact);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Search timeline", function(done) {
            var sid = getNextId();
            var that = this;
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search(
                            'search index=_internal | head 1 | eval foo="bar" | fields foo',
                            {
                                id: sid,
                                status_buckets: 300,
                                rf: ["foo"],
                                exec_mode: "blocking"
                            },
                            done);
                    },
                    function(job, done) {
                        job.timeline({}, done);
                    },
                    function(timeline, job, done) {
                        assert.ok(job);
                        assert.ok(timeline);
                        assert.strictEqual(timeline.buckets.length, 1);
                        assert.strictEqual(timeline.event_count, 1);
                        assert.strictEqual(timeline.buckets[0].available_count, 1);
                        assert.strictEqual(timeline.buckets[0].duration, 0.001);
                        assert.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
                        assert.strictEqual(timeline.buckets[0].total_count, 1);
                        assert.ok(timeline.buckets[0].is_finalized);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Touch", function(done) {
            var sid = getNextId();
            var that = this;
            var originalTime = "";
    
            Async.chain([
                    function(done) {
                        that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                    },
                    function(job, done) {
                        job.fetch(done);
                    },
                    function(job, done) {
                        assert.ok(job);
                        originalTime = job.properties().updated;
                        Async.sleep(1200, function() { job.touch(done); });
                    },
                    function(job, done) {
                        job.fetch(done);
                    },
                    function(job, done) {
                        assert.ok(originalTime !== job.updated());
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Create failure", function(done) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
    
            var jobs = this.service.jobs();
            assert.throws(function() {jobs.create({search: originalSearch, name: name, exec_mode: "oneshot"}, function() {});});
            done();
        });
    
        it("Callback#Create fails with no search string", function(done) {
            var jobs = this.service.jobs();
            jobs.create(
                "", {},
                function(err) {
                    assert.ok(err);
                    done();
                }
            );
        });
    
        it("Callback#Oneshot search", function(done) {
            var sid = getNextId();
            var that = this;
            var originalTime = "";
    
            Async.chain([
                    function(done) {
                        that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                    },
                    function(results, done) {
                        assert.ok(results);
                        assert.ok(results.fields);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.ok(results.rows);
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.rows[0].length, 1);
                        assert.strictEqual(results.rows[0][0], "1");
    
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Oneshot search with no results", function(done) {
            var sid = getNextId();
            var that = this;
            var originalTime = "";
    
            Async.chain([
                    function(done) {
                        var query = 'search index=history MUST_NOT_EXISTABCDEF';
                        that.service.jobs().oneshotSearch(query, {id: sid}, done);
                    },
                    function(results, done) {
                        assert.ok(results);
                        assert.strictEqual(results.fields.length, 0);
                        assert.strictEqual(results.rows.length, 0);
                        assert.ok(!results.preview);
    
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
        
        // Disabling the test for now because the messages field is missing in results object from Splunk 8.2
        // so assert.ok(results.messages[1].text.indexOf('owner="admin"')); 
        // and assert.ok(results.messages[1].text.indexOf('app="search"')); assertions will fail.
        //
        // "Callback#Service oneshot search", function(done) {
        //     var sid = getNextId();
        //     var that = this;
        //     var namespace = {owner: "admin", app: "search"};
        //     var splunkVersion = 6.1; // Default to pre-6.2 version
        //     var originalLoggerLevel = "DEBUG";
    
        //     Async.chain([
        //             function(done) {
        //                 // If running on Splunk 6.2+, first set the search logger level to DEBUG
        //                 Async.chain([
        //                         function(done1) {
        //                             that.service.serverInfo(done1);
        //                         },
        //                         function(info, done1) {
        //                             splunkVersion = parseFloat(info.properties().version);
        //                             if (splunkVersion < 6.2) {
        //                                 done(); // Exit the inner Async.chain
        //                             }
        //                             else {
        //                                 done1();
        //                             }
        //                         },
        //                         function(done1) {
        //                             that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
        //                         },
        //                         function(confs, done1) {
        //                             try {
        //                                 confs.item("limits").fetch(done1);
        //                             }
        //                             catch(e) {
        //                                 done1(e);
        //                             }
        //                         },
        //                         function(conf, done1) {
        //                             var searchInfo = conf.item("search_info");
        //                             // Save this so it can be restored later
        //                             originalLoggerLevel = searchInfo.properties()["infocsv_log_level"];
        //                             searchInfo.update({"infocsv_log_level": "DEBUG"}, done1);
        //                         },
        //                         function(conf, done1) {
        //                             assert.strictEqual("DEBUG", conf.properties()["infocsv_log_level"]);
        //                             done1();
        //                         }
        //                     ],
        //                     function(err) {
        //                         assert.ok(!err);
        //                         done();
        //                     }
        //                 );
        //             },
        //             function(done) {
        //                 that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
        //             },
        //             function(results, done) {
        //                 assert.ok(results);
        //                 assert.ok(results.fields);
        //                 assert.strictEqual(results.fields.length, 1);
        //                 assert.strictEqual(results.fields[0], "count");
        //                 assert.ok(results.rows);
        //                 assert.strictEqual(results.rows.length, 1);
        //                 assert.strictEqual(results.rows[0].length, 1);
        //                 assert.strictEqual(results.rows[0][0], "1");
        //                 assert.ok(results.messages[1].text.indexOf('owner="admin"'));
        //                 assert.ok(results.messages[1].text.indexOf('app="search"'));
    
        //                 done();
        //             },
        //             function(done) {
        //                 Async.chain([
        //                         function(done1) {
        //                             if (splunkVersion < 6.2) {
        //                                 done(); // Exit the inner Async.chain
        //                             }
        //                             else {
        //                                 done1();
        //                             }
        //                         },
        //                         function(done1) {
        //                             that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
        //                         },
        //                         function(confs, done1) {
        //                             try {
        //                                 confs.item("limits").fetch(done1);
        //                             }
        //                             catch(e) {
        //                                 done1(e);
        //                             }
        //                         },
        //                         function(conf, done1) {
        //                             var searchInfo = conf.item("search_info");
        //                             // Restore the logger level from before
        //                             searchInfo.update({"infocsv_log_level": originalLoggerLevel}, done1);
        //                         },
        //                         function(conf, done1) {
        //                             assert.strictEqual(originalLoggerLevel, conf.properties()["infocsv_log_level"]);
        //                             done1();
        //                         }
        //                     ],
        //                     function(err) {
        //                         assert.ok(!err);
        //                         done();
        //                     }
        //                 );
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },
    
        it("Callback#Service search", function(done) {
            var sid = getNextId();
            var service = this.service;
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                    function(done) {
                        that.service.search('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
                    },
                    function(job, done) {
                        assert.strictEqual(job.sid, sid);
                        assert.strictEqual(job.namespace, namespace);
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        job.results({}, done);
                    },
                    function(results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Wait until job done", function(done) {
            this.service.search('search index=_internal | head 1000', {}, function(err, job) {
                assert.ok(!err);
    
                var numReadyEvents = 0;
                var numProgressEvents = 0;
                job.track({ period: 200 }, {
                    ready: function(job) {
                        assert.ok(job);
    
                        numReadyEvents++;
                    },
                    progress: function(job) {
                        assert.ok(job);
    
                        numProgressEvents++;
                    },
                    done: function(job) {
                        assert.ok(job);
    
                        assert.ok(numReadyEvents === 1);      // all done jobs must have become ready
                        assert.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                        done();
                    },
                    failed: function(job) {
                        assert.ok(job);
    
                        assert.ok(false, "Job failed unexpectedly.");
                        done();
                    },
                    error: function(err) {
                        assert.ok(err);
    
                        assert.ok(false, "Error while tracking job.");
                        done();
                    }
                });
            });
        });
    
        it("Callback#Wait until job failed", function(done) {
            this.service.search('search index=_internal | head bogusarg', {}, function(err, job) {
                if (err) {
                    assert.ok(!err);
                    done();
                    return;
                }
    
                var numReadyEvents = 0;
                var numProgressEvents = 0;
                job.track({ period: 200 }, {
                    ready: function(job) {
                        assert.ok(job);
    
                        numReadyEvents++;
                    },
                    progress: function(job) {
                        assert.ok(job);
    
                        numProgressEvents++;
                    },
                    done: function(job) {
                        assert.ok(job);
    
                        assert.ok(false, "Job became done unexpectedly.");
                        done();
                    },
                    failed: function(job) {
                        assert.ok(job);
    
                        assert.ok(numReadyEvents === 1);      // even failed jobs become ready
                        assert.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                        done();
                    },
                    error: function(err) {
                        assert.ok(err);
    
                        assert.ok(false, "Error while tracking job.");
                        done();
                    }
                });
            });
        });
    
        it("Callback#track() with default params and one function", function(done) {
            this.service.search('search index=_internal | head 1', {}, function(err, job) {
                if (err) {
                    assert.ok(!err);
                    done();
                    return;
                }
    
                job.track({}, function(job) {
                    assert.ok(job);
                    done();
                });
            });
        });
    
        it("Callback#track() should stop polling if only the ready callback is specified", function(done) {
            this.service.search('search index=_internal | head 1', {}, function(err, job) {
                if (err) {
                    assert.ok(!err);
                    done();
                    return;
                }
    
                job.track({}, {
                    ready: function(job) {
                        assert.ok(job);
                    },
    
                    _stoppedAfterReady: function(job) {
                        done();
                    }
                });
            });
        });
    
        it("Callback#track() a job that is not immediately ready", function(done) {
            /*jshint loopfunc:true */
            var numJobs = 20;
            var numJobsLeft = numJobs;
            var gotJobNotImmediatelyReady = false;
            for (var i = 0; i < numJobs; i++) {
                this.service.search('search index=_internal | head 10000', {}, function(err, job) {
                    if (err) {
                        assert.ok(!err);
                        done();
                        return;
                    }
    
                    job.track({}, {
                        _preready: function(job) {
                            gotJobNotImmediatelyReady = true;
                        },
    
                        ready: function(job) {
                            numJobsLeft--;
    
                            if (numJobsLeft === 0) {
                                if (!gotJobNotImmediatelyReady) {
                                    splunkjs.Logger.error("", "WARNING: Couldn't test code path in track() where job wasn't ready immediately.");
                                }
                                done();
                            }
                        }
                    });
                });
            }
        });
    
        it("Callback#Service.getJob() works", function(done) {
            var that = this;
            var sidsMatch = false;
            this.service.search('search index=_internal | head 1', {}, function(err, job){
                if (err) {
                    assert.ok(!err);
                    done();
                    return;
                }
                var sid = job.sid;
                return Async.chain([
                        function(done) {
                            that.service.getJob(sid, done);
                        },
                        function(innerJob, done) {
                            assert.strictEqual(sid, innerJob.sid);
                            sidsMatch = sid === innerJob.sid;
                            done();
                        }
                    ],
                    function(err) {
                        assert.ok(!err);
                        assert.ok(sidsMatch);
                        done();
                    }
                );
            });
        });
    });

    describe("Data Model tests", function() {
        before( function(done) {
            this.service = svc;
            this.dataModels = svc.dataModels();
            this.skip = false;
            var that = this;
            this.service.serverInfo(function(err, info) {
                if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                    that.skip = true;
                    splunkjs.Logger.log("Skipping data model tests...");
                }
                done(err);
            });
        });
    
        it("Callback#DataModels - fetch a built-in data model", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var that = this;
            Async.chain([
                    function(done) {
                        that.dataModels.fetch(done);
                    },
                    function(dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        // Check for the 3 objects we expect
                        assert.ok(dm.objectByName("Audit"));
                        assert.ok(dm.objectByName("searches"));
                        assert.ok(dm.objectByName("modify"));
    
                        // Check for an object that shouldn't exist
                        assert.strictEqual(null, dm.objectByName(getNextId()));
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#DataModels - create & delete an empty data model", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var args;
            var name = "delete-me-" + getNextId();
            var initialSize;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                fetch('./data/empty_data_model.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            initialSize = dataModels.list().length;
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Make sure we have 1 more data model than we started with
                            assert.strictEqual(initialSize + 1, dataModels.list().length);
                            // Delete the data model we just created, by name.
                            dataModels.item(name).remove(done);
                        },
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Make sure we have as many data models as we started with
                            assert.strictEqual(initialSize, dataModels.list().length);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create a data model with spaces in the name, which are swapped for -'s", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var args;
            var name = "delete-me- " + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                fetch('./data/empty_data_model.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            assert.strictEqual(name.replace(" ", "_"), dataModel.name);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create a data model with 0 objects", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                fetch('./data/empty_data_model.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 0 objects before fetch
                            assert.strictEqual(0, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 0 objects after fetch
                            assert.strictEqual(0, dataModels.item(name).objects.length);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create a data model with 1 search object", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var dataModels = this.service.dataModels();
            var name = "delete-me-" + getNextId();
            var that = this;
            var args;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/object_with_one_search.json"));
                fetch('./data/object_with_one_search.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 1 object before fetch
                            assert.strictEqual(1, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 1 object after fetch
                            assert.strictEqual(1, dataModels.item(name).objects.length);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create a data model with 2 search objects", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                fetch('./data/object_with_two_searches.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 2 objects before fetch
                            assert.strictEqual(2, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 2 objects after fetch
                            assert.strictEqual(2, dataModels.item(name).objects.length);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - data model objects are created correctly", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                fetch('./data/object_with_two_searches.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            assert.ok(dataModel.hasObject("search1"));
                            assert.ok(dataModel.hasObject("search2"));
    
                            var search1 = dataModel.objectByName("search1");
                            assert.ok(search1);
                            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98%20-%20search%201"), search1.displayName);
    
                            var search2 = dataModel.objectByName("search2");
                            assert.ok(search2);
                            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98%20-%20search%202"), search2.displayName);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - data model handles unicode characters", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/model_with_unicode_headers.json"));
                fetch('./data/model_with_unicode_headers.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            assert.strictEqual(name, dataModel.name);
                            assert.strictEqual(decodeURI("%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4%E2%80%A1%C3%98%C2%B5"), dataModel.displayName);
                            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98"), dataModel.description);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create data model with empty headers", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/model_with_empty_headers.json"));
                fetch('./data/model_with_empty_headers.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            assert.strictEqual(name, dataModel.name);
                            assert.strictEqual("", dataModel.displayName);
                            assert.strictEqual("", dataModel.description);
    
                            // Make sure we're not getting a summary of the data model
                            assert.strictEqual("0", dataModel.concise);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test acceleration settings", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                fetch('./data/data_model_with_test_objects.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.acceleration.enabled = true;
                            dataModel.acceleration.earliestTime = "-2mon";
                            dataModel.acceleration.cronSchedule = "5/* * * * *";
    
                            assert.strictEqual(true, dataModel.isAccelerated());
                            assert.strictEqual(true, dataModel.acceleration.enabled);
                            assert.strictEqual("-2mon", dataModel.acceleration.earliestTime);
                            assert.strictEqual("5/* * * * *", dataModel.acceleration.cronSchedule);
    
                            dataModel.acceleration.enabled = false;
                            dataModel.acceleration.earliestTime = "-1mon";
                            dataModel.acceleration.cronSchedule = "* * * * *";
    
                            assert.strictEqual(false, dataModel.isAccelerated());
                            assert.strictEqual(false, dataModel.acceleration.enabled);
                            assert.strictEqual("-1mon", dataModel.acceleration.earliestTime);
                            assert.strictEqual("* * * * *", dataModel.acceleration.cronSchedule);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model object metadata", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                fetch('./data/data_model_with_test_objects.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            assert.ok(obj);
    
                            assert.strictEqual(decodeURI("event1%20%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4"), obj.displayName);
                            assert.strictEqual("event1", obj.name);
                            assert.equal(dataModel, obj.dataModel);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model object parent", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                fetch('./data/data_model_with_test_objects.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            assert.ok(obj);
                            assert.ok(!obj.parent());
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model object lineage", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                fetch('./data/inheritance_test_data.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_0");
                            assert.ok(obj);
                            assert.strictEqual(1, obj.lineage.length);
                            assert.strictEqual("level_0", obj.lineage[0]);
                            assert.strictEqual("BaseEvent", obj.parentName);
    
                            obj = dataModel.objectByName("level_1");
                            assert.ok(obj);
                            assert.strictEqual(2, obj.lineage.length);
                            assert.sameMembers(["level_0", "level_1"], obj.lineage, 'same members');
                            assert.strictEqual("level_0", obj.parentName);
    
                            obj = dataModel.objectByName("level_2");
                            assert.ok(obj);
                            assert.strictEqual(3, obj.lineage.length);
                            assert.sameMembers(["level_0", "level_1", "level_2"], obj.lineage, 'same members');
                            assert.strictEqual("level_1", obj.parentName);
    
                            // Make sure there's no extra children
                            assert.ok(!dataModel.objectByName("level_3"));
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model object fields", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                fetch('./data/inheritance_test_data.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_2");
                            assert.ok(obj);
    
                            var timeField = obj.fieldByName("_time");
                            assert.ok(timeField);
                            assert.strictEqual("timestamp", timeField.type);
                            assert.ok(timeField.isTimestamp());
                            assert.ok(!timeField.isNumber());
                            assert.ok(!timeField.isString());
                            assert.ok(!timeField.isObjectcount());
                            assert.ok(!timeField.isChildcount());
                            assert.ok(!timeField.isIPv4());
                            assert.sameMembers(["BaseEvent"], timeField.lineage, 'same members');
                            assert.strictEqual("_time", timeField.name);
                            assert.strictEqual(false, timeField.required);
                            assert.strictEqual(false, timeField.multivalued);
                            assert.strictEqual(false, timeField.hidden);
                            assert.strictEqual(false, timeField.editable);
                            assert.strictEqual(null, timeField.comment);
    
                            var lvl2 = obj.fieldByName("level_2");
                            assert.strictEqual("level_2", lvl2.owner);
                            assert.sameMembers(["level_0", "level_1", "level_2"], lvl2.lineage, 'same members');
                            assert.strictEqual("objectCount", lvl2.type);
                            assert.ok(!lvl2.isTimestamp());
                            assert.ok(!lvl2.isNumber());
                            assert.ok(!lvl2.isString());
                            assert.ok(lvl2.isObjectcount());
                            assert.ok(!lvl2.isChildcount());
                            assert.ok(!lvl2.isIPv4());
                            assert.strictEqual("level_2", lvl2.name);
                            assert.strictEqual("level 2", lvl2.displayName);
                            assert.strictEqual(false, lvl2.required);
                            assert.strictEqual(false, lvl2.multivalued);
                            assert.strictEqual(false, lvl2.hidden);
                            assert.strictEqual(false, lvl2.editable);
                            assert.strictEqual(null, lvl2.comment);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model object properties", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var that = this;
            
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
                            assert.strictEqual(5, obj.fieldNames().length);
                            assert.strictEqual(10, obj.allFieldNames().length);
                            assert.ok(obj.fieldByName("has_boris"));
                            assert.ok(obj.hasField("has_boris"));
                            assert.ok(obj.fieldByName("_time"));
                            assert.ok(obj.hasField("_time"));
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create local acceleration job", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                fetch('./data/inheritance_test_data.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            assert.ok(obj);
    
                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            assert.ok(job);
    
                            pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            assert.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
                            job.cancel(done);
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - create local acceleration job with earliest time", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var oldNow = Date.now();
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                fetch('./data/inheritance_test_data.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            assert.ok(obj);
                            obj.createLocalAccelerationJob("-1d", done);
                        },
                        function(job, done) {
                            assert.ok(job);
                            pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            assert.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
    
                            // Make sure the earliest time is 1 day behind
                            var yesterday = new Date(Date.now() - (1000 * 60 * 60 * 24));
                            var month = (yesterday.getMonth() + 1);
                            if (month <= 9) {
                                month = "0" + month;
                            }
                            var date = yesterday.getDate();
                            if (date <= 9) {
                                date = "0" + date;
                            }
                            var expectedDate = yesterday.getFullYear() + "-" + month + "-" + date;
                            assert.ok(utils.startsWith(job._state.content.earliestTime, expectedDate));
    
                            job.cancel(done);
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model constraints", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                fetch('./data/data_model_with_test_objects.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            assert.ok(obj);
                            var constraints = obj.constraints;
                            assert.ok(constraints);
                            var onlyOne = true;
    
                            for (var i = 0; i < constraints.length; i++) {
                                var constraint = constraints[i];
                                assert.ok(!!onlyOne);
    
                                assert.strictEqual("event1", constraint.owner);
                                assert.strictEqual("uri=\"*.php\" OR uri=\"*.py\"\nNOT (referer=null OR referer=\"-\")", constraint.query);
                            }
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - test data model calculations, and the different types", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                fetch('./data/data_model_with_test_objects.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            assert.ok(obj);
    
                            var calculations = obj.calculations;
                            assert.strictEqual(4, Object.keys(calculations).length);
                            assert.strictEqual(4, obj.calculationIDs().length);
    
                            var evalCalculation = calculations["93fzsv03wa7"];
                            assert.ok(evalCalculation);
                            assert.strictEqual("event1", evalCalculation.owner);
                            assert.sameMembers(["event1"], evalCalculation.lineage, 'same members');
                            assert.strictEqual("Eval", evalCalculation.type);
                            assert.ok(evalCalculation.isEval());
                            assert.ok(!evalCalculation.isLookup());
                            assert.ok(!evalCalculation.isGeoIP());
                            assert.ok(!evalCalculation.isRex());
                            assert.strictEqual(null, evalCalculation.comment);
                            assert.strictEqual(true, evalCalculation.isEditable());
                            assert.strictEqual("if(cidrmatch(\"192.0.0.0/16\", clientip), \"local\", \"other\")", evalCalculation.expression);
    
                            assert.strictEqual(1, Object.keys(evalCalculation.outputFields).length);
                            assert.strictEqual(1, evalCalculation.outputFieldNames().length);
    
                            var field = evalCalculation.outputFields["new_field"];
                            assert.ok(field);
                            assert.strictEqual("My New Field", field.displayName);
    
                            var lookupCalculation = calculations["sr3mc8o3mjr"];
                            assert.ok(lookupCalculation);
                            assert.strictEqual("event1", lookupCalculation.owner);
                            assert.sameMembers(["event1"], lookupCalculation.lineage, 'same members');
                            assert.strictEqual("Lookup", lookupCalculation.type);
                            assert.ok(lookupCalculation.isLookup());
                            assert.ok(!lookupCalculation.isEval());
                            assert.ok(!lookupCalculation.isGeoIP());
                            assert.ok(!lookupCalculation.isRex());
                            assert.strictEqual(null, lookupCalculation.comment);
                            assert.strictEqual(true, lookupCalculation.isEditable());
                            assert.deepEqual({lookupField: "a_lookup_field", inputField: "host"}, lookupCalculation.inputFieldMappings);
                            assert.strictEqual(2, Object.keys(lookupCalculation.inputFieldMappings).length);
                            assert.strictEqual("a_lookup_field", lookupCalculation.inputFieldMappings.lookupField);
                            assert.strictEqual("host", lookupCalculation.inputFieldMappings.inputField);
                            assert.strictEqual("dnslookup", lookupCalculation.lookupName);
    
                            var regexpCalculation = calculations["a5v1k82ymic"];
                            assert.ok(regexpCalculation);
                            assert.strictEqual("event1", regexpCalculation.owner);
                            assert.sameMembers(["event1"], regexpCalculation.lineage, 'same members');
                            assert.strictEqual("Rex", regexpCalculation.type);
                            assert.ok(regexpCalculation.isRex());
                            assert.ok(!regexpCalculation.isLookup());
                            assert.ok(!regexpCalculation.isEval());
                            assert.ok(!regexpCalculation.isGeoIP());
                            assert.strictEqual(2, regexpCalculation.outputFieldNames().length);
                            assert.strictEqual("_raw", regexpCalculation.inputField);
                            assert.strictEqual(" From: (?<from>.*) To: (?<to>.*) ", regexpCalculation.expression);
    
                            var geoIPCalculation = calculations["pbe9bd0rp4"];
                            assert.ok(geoIPCalculation);
                            assert.strictEqual("event1", geoIPCalculation.owner);
                            assert.sameMembers(["event1"], geoIPCalculation.lineage, 'same members');
                            assert.strictEqual("GeoIP", geoIPCalculation.type);
                            assert.ok(geoIPCalculation.isGeoIP());
                            assert.ok(!geoIPCalculation.isLookup());
                            assert.ok(!geoIPCalculation.isEval());
                            assert.ok(!geoIPCalculation.isRex());
                            assert.strictEqual(decodeURI("%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4%E2%80%A1%C3%98%C2%B5%20comment%20of%20pbe9bd0rp4"), geoIPCalculation.comment);
                            assert.strictEqual(5, geoIPCalculation.outputFieldNames().length);
                            assert.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - run queries", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var obj;
            var that = this;
            Async.chain([
                    function(done) {
                        that.dataModels.fetch(done);
                    },
                    function(dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        obj = dm.objectByName("searches");
                        obj.startSearch({}, "", done);
                    },
                    function(job, done) {
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        assert.strictEqual("| datamodel internal_audit_logs searches search", job.properties().request.search);
                        job.cancel(done);
                    },
                    function(response, done) {
                        obj.startSearch({status_buckets: 5, enable_lookups: false}, "| head 3", done);
                    },
                    function(job, done) {
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        assert.strictEqual("| datamodel internal_audit_logs searches search | head 3", job.properties().request.search);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#DataModels - baseSearch is parsed correctly", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                fetch('./data/model_with_multiple_types.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("search1");
                            assert.ok(obj);
                            assert.strictEqual("BaseSearch", obj.parentName);
                            assert.ok(obj.isBaseSearch());
                            assert.ok(!obj.isBaseTransaction());
                            assert.strictEqual("search index=_internal | head 10", obj.baseSearch);
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#DataModels - baseTransaction is parsed correctly", function(done) {
            if (this.skip) {
                done();
                return;
            }
    
            var args;
            var name = "delete-me-" + getNextId();
            var obj;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                fetch('./data/model_with_multiple_types.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("transaction1");
                            assert.ok(obj);
                            assert.strictEqual("BaseTransaction", obj.parentName);
                            assert.ok(obj.isBaseTransaction());
                            assert.ok(!obj.isBaseSearch());
                            assert.sameMembers(["event1"], obj.objectsToGroup, 'same members');
                            assert.sameMembers(["host", "from"], obj.groupByFields, 'same members');
                            assert.strictEqual("25s", obj.maxPause);
                            assert.strictEqual("100m", obj.maxSpan);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    });

    describe("Pivot tests", function() {
        before( function(done) {
            this.service = svc;
            this.dataModels = svc.dataModels({owner: "nobody", app: "search"});
            this.skip = false;
            var that = this;
            this.service.serverInfo(function(err, info) {
                if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                    that.skip = true;
                    splunkjs.Logger.log("Skipping pivot tests...");
                }
                done(err);
            });
        });
    
        it("Callback#Pivot - test constructor args", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                            function(done) {
                                that.dataModels.create(name, args, done);
                            },
                            function(dataModel, done) {
                                assert.ok(dataModel.objectByName("test_data"));
                                done();
                            }
                        ],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test acceleration, then pivot",  function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                            function(done) {
                                that.dataModels.create(name, args, done);
                            },
                            function(dataModel, done) {
                                dataModel.objectByName("test_data");
                                assert.ok(dataModel);
    
                                dataModel.acceleration.enabled = true;
                                dataModel.acceleration.earliestTime = "-2mon";
                                dataModel.acceleration.cronSchedule = "0 */12 * * *";
                                dataModel.update(done);
                            },
                            function(dataModel, done) {
                                var props = dataModel.properties();
    
                                assert.strictEqual(true, dataModel.isAccelerated());
                                assert.strictEqual(true, !!dataModel.acceleration.enabled);
                                assert.strictEqual("-2mon", dataModel.acceleration.earliest_time);
                                assert.strictEqual("0 */12 * * *", dataModel.acceleration.cron_schedule);
    
                                var dataModelObject = dataModel.objectByName("test_data");
                                var pivotSpecification = dataModelObject.createPivotSpecification();
    
                                assert.strictEqual(dataModelObject.dataModel.name, pivotSpecification.accelerationNamespace);
    
                                var name1 = "delete-me-" + getNextId();
                                pivotSpecification.setAccelerationJob(name1);
                                assert.strictEqual("sid=" + name1, pivotSpecification.accelerationNamespace);
    
                                var namespaceTemp = "delete-me-" + getNextId();
                                pivotSpecification.accelerationNamespace = namespaceTemp;
                                assert.strictEqual(namespaceTemp, pivotSpecification.accelerationNamespace);
    
                                pivotSpecification
                                    .addCellValue("test_data", "Source Value", "count")
                                    .run(done);
                            },
                            function(job, pivot, done) {
                                assert.ok(job);
                                assert.ok(pivot);
                                assert.notStrictEqual("FAILED", job.properties().dispatchState);
    
                                job.track({}, function(job) {
                                    assert.ok(pivot.tstatsSearch);
                                    assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                                    assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                                    assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);
    
                                    assert.strictEqual(pivot.tstatsSearch, job.properties().request.search);
                                    done(null, job);
                                });
                            },
                            function(job, done) {
                                assert.ok(job);
                                done();
                            }
                        ],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }                    
        });
    
        it("Callback#Pivot - test illegal filtering (all types)", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
    
                            // Boolean comparisons
                            try {
                                pivotSpecification.addFilter(getNextId(), "boolean", "=", true);
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addFilter("_time", "boolean", "=", true);
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add boolean filter on _time because it is of type timestamp");
                            }
    
                            // String comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "string", "contains", "abc");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add string filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "string", "contains", "abc");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
    
                            // IPv4 comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "ipv4", "startsWith", "192.168");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add ipv4 filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "ipv4", "startsWith", "192.168");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
    
                            // Number comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "number", "atLeast", 2.3);
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add number filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "number", "atLeast", 2.3);
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
    
                            // Limit filter
                            try {
                                pivotSpecification.addLimitFilter("has_boris", "host", "DEFAULT", 50, "count");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add limit filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addLimitFilter(getNextId(), "host", "DEFAULT", 50, "count");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot add limit filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addLimitFilter("source", "host", "DEFAULT", 50, "sum");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message,
                                    "Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found sum");
                            }
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "DEFAULT", 50, "duration");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message,
                                    "Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found duration");
                            }
                            try {
                                pivotSpecification.addLimitFilter("test_data", "host", "DEFAULT", 50, "list");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message,
                                    "Stats function for fields of type object count must be COUNT; found list");
                            }
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test boolean filtering", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("has_boris", "boolean", "=", true);
                                assert.strictEqual(1, pivotSpecification.filters.length);
    
                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];
    
                                assert.ok(filter.hasOwnProperty("fieldName"));
                                assert.ok(filter.hasOwnProperty("type"));
                                assert.ok(filter.hasOwnProperty("rule"));
                                assert.ok(filter.hasOwnProperty("owner"));
    
                                assert.strictEqual("has_boris", filter.fieldName);
                                assert.strictEqual("boolean", filter.type);
                                assert.strictEqual("=", filter.rule.comparator);
                                assert.strictEqual(true, filter.rule.compareTo);
                                assert.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                assert.ok(false);
                            }
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test string filtering", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("host", "string", "contains", "abc");
                                assert.strictEqual(1, pivotSpecification.filters.length);
    
                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];
    
                                assert.ok(filter.hasOwnProperty("fieldName"));
                                assert.ok(filter.hasOwnProperty("type"));
                                assert.ok(filter.hasOwnProperty("rule"));
                                assert.ok(filter.hasOwnProperty("owner"));
    
                                assert.strictEqual("host", filter.fieldName);
                                assert.strictEqual("string", filter.type);
                                assert.strictEqual("contains", filter.rule.comparator);
                                assert.strictEqual("abc", filter.rule.compareTo);
                                assert.strictEqual("BaseEvent", filter.owner);
                            }
                            catch (e) {
                                assert.ok(false);
                            }
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test IPv4 filtering", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("hostip", "ipv4", "startsWith", "192.168");
                                assert.strictEqual(1, pivotSpecification.filters.length);
    
                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];
    
                                assert.ok(filter.hasOwnProperty("fieldName"));
                                assert.ok(filter.hasOwnProperty("type"));
                                assert.ok(filter.hasOwnProperty("rule"));
                                assert.ok(filter.hasOwnProperty("owner"));
    
                                assert.strictEqual("hostip", filter.fieldName);
                                assert.strictEqual("ipv4", filter.type);
                                assert.strictEqual("startsWith", filter.rule.comparator);
                                assert.strictEqual("192.168", filter.rule.compareTo);
                                assert.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                assert.ok(false);
                            }
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test number filtering", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("epsilon", "number", ">=", 2.3);
                                assert.strictEqual(1, pivotSpecification.filters.length);
    
                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];
    
                                assert.ok(filter.hasOwnProperty("fieldName"));
                                assert.ok(filter.hasOwnProperty("type"));
                                assert.ok(filter.hasOwnProperty("rule"));
                                assert.ok(filter.hasOwnProperty("owner"));
    
                                assert.strictEqual("epsilon", filter.fieldName);
                                assert.strictEqual("number", filter.type);
                                assert.strictEqual(">=", filter.rule.comparator);
                                assert.strictEqual(2.3, filter.rule.compareTo);
                                assert.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                assert.ok(false);
                            }
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test limit filtering", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "ASCENDING", 500, "average");
                                assert.strictEqual(1, pivotSpecification.filters.length);
    
                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];
    
                                assert.ok(filter.hasOwnProperty("fieldName"));
                                assert.ok(filter.hasOwnProperty("type"));
                                assert.ok(filter.hasOwnProperty("owner"));
                                assert.ok(filter.hasOwnProperty("attributeName"));
                                assert.ok(filter.hasOwnProperty("attributeOwner"));
                                assert.ok(filter.hasOwnProperty("limitType"));
                                assert.ok(filter.hasOwnProperty("limitAmount"));
                                assert.ok(filter.hasOwnProperty("statsFn"));
    
                                assert.strictEqual("epsilon", filter.fieldName);
                                assert.strictEqual("number", filter.type);
                                assert.strictEqual("test_data", filter.owner);
                                assert.strictEqual("host", filter.attributeName);
                                assert.strictEqual("BaseEvent", filter.attributeOwner);
                                assert.strictEqual("lowest", filter.limitType);
                                assert.strictEqual(500, filter.limitAmount);
                                assert.strictEqual("average", filter.statsFn);
                            }
                            catch (e) {
                                assert.ok(false);
                            }
    
                            done();
                        }],
                        function(err) {
                           assert.ok(!err);
                           done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test row split", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
    
                            // Test error handling for row split
                            try {
                                pivotSpecification.addRowSplit("has_boris", "Wrong type here");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {
    
                                pivotSpecification.addRowSplit(field, "Break Me!");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test row split, number
                            pivotSpecification.addRowSplit("epsilon", "My Label");
                            assert.strictEqual(1, pivotSpecification.rows.length);
    
                            var row = pivotSpecification.rows[0];
                            assert.ok(row.hasOwnProperty("fieldName"));
                            assert.ok(row.hasOwnProperty("owner"));
                            assert.ok(row.hasOwnProperty("type"));
                            assert.ok(row.hasOwnProperty("label"));
                            assert.ok(row.hasOwnProperty("display"));
    
                            assert.strictEqual("epsilon", row.fieldName);
                            assert.strictEqual("test_data", row.owner);
                            assert.strictEqual("number", row.type);
                            assert.strictEqual("My Label", row.label);
                            assert.strictEqual("all", row.display);
                            assert.deepEqual({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "My Label",
                                    display: "all"
                                },
                                row);
    
                            // Test row split, string
                            pivotSpecification.addRowSplit("host", "My Label");
                            assert.strictEqual(2, pivotSpecification.rows.length);
    
                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            assert.ok(row.hasOwnProperty("fieldName"));
                            assert.ok(row.hasOwnProperty("owner"));
                            assert.ok(row.hasOwnProperty("type"));
                            assert.ok(row.hasOwnProperty("label"));
                            assert.ok(!row.hasOwnProperty("display"));
    
                            assert.strictEqual("host", row.fieldName);
                            assert.strictEqual("BaseEvent", row.owner);
                            assert.strictEqual("string", row.type);
                            assert.strictEqual("My Label", row.label);
                            assert.deepEqual({
                                    fieldName: "host",
                                    owner: "BaseEvent",
                                    type: "string",
                                    label: "My Label"
                                },
                                row);
    
                            // Test error handling on range row split
                            try {
                                pivotSpecification.addRangeRowSplit("has_boris", "Wrong type here", {start: 0, end: 100, step:20, limit:5});
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeRowSplit(field, "Break Me!", {start: 0, end: 100, step:20, limit:5});
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test range row split
                            pivotSpecification.addRangeRowSplit("epsilon", "My Label", {start: 0, end: 100, step:20, limit:5});
                            assert.strictEqual(3, pivotSpecification.rows.length);
    
                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            assert.ok(row.hasOwnProperty("fieldName"));
                            assert.ok(row.hasOwnProperty("owner"));
                            assert.ok(row.hasOwnProperty("type"));
                            assert.ok(row.hasOwnProperty("label"));
                            assert.ok(row.hasOwnProperty("display"));
                            assert.ok(row.hasOwnProperty("ranges"));
    
                            assert.strictEqual("epsilon", row.fieldName);
                            assert.strictEqual("test_data", row.owner);
                            assert.strictEqual("number", row.type);
                            assert.strictEqual("My Label", row.label);
                            assert.strictEqual("ranges", row.display);
    
                            var ranges = {
                                start: 0,
                                end: 100,
                                size: 20,
                                maxNumberOf: 5
                            };
                            assert.deepEqual(ranges, row.ranges);
                            assert.deepEqual({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "My Label",
                                    display: "ranges",
                                    ranges: ranges
                                },
                                row);
    
                            // Test error handling on boolean row split
                            try {
                                pivotSpecification.addBooleanRowSplit("epsilon", "Wrong type here", "t", "f");
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanRowSplit(field, "Break Me!", "t", "f");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test boolean row split
                            pivotSpecification.addBooleanRowSplit("has_boris", "My Label", "is_true", "is_false");
                            assert.strictEqual(4, pivotSpecification.rows.length);
    
                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            assert.ok(row.hasOwnProperty("fieldName"));
                            assert.ok(row.hasOwnProperty("owner"));
                            assert.ok(row.hasOwnProperty("type"));
                            assert.ok(row.hasOwnProperty("label"));
                            assert.ok(row.hasOwnProperty("trueLabel"));
                            assert.ok(row.hasOwnProperty("falseLabel"));
    
                            assert.strictEqual("has_boris", row.fieldName);
                            assert.strictEqual("My Label", row.label);
                            assert.strictEqual("test_data", row.owner);
                            assert.strictEqual("boolean", row.type);
                            assert.strictEqual("is_true", row.trueLabel);
                            assert.strictEqual("is_false", row.falseLabel);
                            assert.deepEqual({
                                    fieldName: "has_boris",
                                    label: "My Label",
                                    owner: "test_data",
                                    type: "boolean",
                                    trueLabel: "is_true",
                                    falseLabel: "is_false"
                                },
                                row);
    
                            // Test error handling on timestamp row split
                            try {
                                pivotSpecification.addTimestampRowSplit("epsilon", "Wrong type here", "some binning");
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit(field, "Break Me!", "some binning");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit("_time", "some label", "Bogus binning value");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }
    
                            // Test timestamp row split
                            pivotSpecification.addTimestampRowSplit("_time", "My Label", "day");
                            assert.strictEqual(5, pivotSpecification.rows.length);
    
                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            assert.ok(row.hasOwnProperty("fieldName"));
                            assert.ok(row.hasOwnProperty("owner"));
                            assert.ok(row.hasOwnProperty("type"));
                            assert.ok(row.hasOwnProperty("label"));
                            assert.ok(row.hasOwnProperty("period"));
    
                            assert.strictEqual("_time", row.fieldName);
                            assert.strictEqual("My Label", row.label);
                            assert.strictEqual("BaseEvent", row.owner);
                            assert.strictEqual("timestamp", row.type);
                            assert.strictEqual("day", row.period);
                            assert.deepEqual({
                                    fieldName: "_time",
                                    label: "My Label",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                row);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test column split", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
    
                            // Test error handling for column split
                            try {
                                pivotSpecification.addColumnSplit("has_boris", "Wrong type here");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {
    
                                pivotSpecification.addColumnSplit(field, "Break Me!");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test column split, number
                            pivotSpecification.addColumnSplit("epsilon");
                            assert.strictEqual(1, pivotSpecification.columns.length);
    
                            var col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            assert.ok(col.hasOwnProperty("fieldName"));
                            assert.ok(col.hasOwnProperty("owner"));
                            assert.ok(col.hasOwnProperty("type"));
                            assert.ok(col.hasOwnProperty("display"));
    
                            assert.strictEqual("epsilon", col.fieldName);
                            assert.strictEqual("test_data", col.owner);
                            assert.strictEqual("number", col.type);
                            assert.strictEqual("all", col.display);
                            assert.deepEqual({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "all"
                                },
                                col);
    
                            // Test column split, string
                            pivotSpecification.addColumnSplit("host");
                            assert.strictEqual(2, pivotSpecification.columns.length);
    
                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            assert.ok(col.hasOwnProperty("fieldName"));
                            assert.ok(col.hasOwnProperty("owner"));
                            assert.ok(col.hasOwnProperty("type"));
                            assert.ok(!col.hasOwnProperty("display"));
    
                            assert.strictEqual("host", col.fieldName);
                            assert.strictEqual("BaseEvent", col.owner);
                            assert.strictEqual("string", col.type);
                            assert.deepEqual({
                                    fieldName: "host",
                                    owner: "BaseEvent",
                                    type: "string"
                                },
                                col);
    
                            done();
    
                            // Test error handling for range column split
                            try {
                                pivotSpecification.addRangeColumnSplit("has_boris", "Wrong type here", {start: 0, end: 100, step:20, limit:5});
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeColumnSplit(field, {start: 0, end: 100, step:20, limit:5});
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test range column split
                            pivotSpecification.addRangeColumnSplit("epsilon", {start: 0, end: 100, step:20, limit:5});
                            assert.strictEqual(3, pivotSpecification.columns.length);
    
                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            assert.ok(col.hasOwnProperty("fieldName"));
                            assert.ok(col.hasOwnProperty("owner"));
                            assert.ok(col.hasOwnProperty("type"));
                            assert.ok(col.hasOwnProperty("display"));
                            assert.ok(col.hasOwnProperty("ranges"));
    
                            assert.strictEqual("epsilon", col.fieldName);
                            assert.strictEqual("test_data", col.owner);
                            assert.strictEqual("number", col.type);
                            assert.strictEqual("ranges", col.display);
                            var ranges = {
                                start: 0,
                                end: 100,
                                size: 20,
                                maxNumberOf: 5
                            };
                            assert.deepEqual(ranges, col.ranges);
                            assert.deepEqual({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "ranges",
                                    ranges: ranges
                                },
                                col);
    
                            // Test error handling on boolean column split
                            try {
                                pivotSpecification.addBooleanColumnSplit("epsilon", "t", "f");
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanColumnSplit(field, "t", "f");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
    
                            // Test boolean column split
                            pivotSpecification.addBooleanColumnSplit("has_boris", "is_true", "is_false");
                            assert.strictEqual(4, pivotSpecification.columns.length);
    
                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            assert.ok(col.hasOwnProperty("fieldName"));
                            assert.ok(col.hasOwnProperty("owner"));
                            assert.ok(col.hasOwnProperty("type"));
                            assert.ok(!col.hasOwnProperty("label"));
                            assert.ok(col.hasOwnProperty("trueLabel"));
                            assert.ok(col.hasOwnProperty("falseLabel"));
    
                            assert.strictEqual("has_boris", col.fieldName);
                            assert.strictEqual("test_data", col.owner);
                            assert.strictEqual("boolean", col.type);
                            assert.strictEqual("is_true", col.trueLabel);
                            assert.strictEqual("is_false", col.falseLabel);
                            assert.deepEqual({
                                    fieldName: "has_boris",
                                    owner: "test_data",
                                    type: "boolean",
                                    trueLabel: "is_true",
                                    falseLabel: "is_false"
                                },
                                col);
    
                            // Test error handling on timestamp column split
                            try {
                                pivotSpecification.addTimestampColumnSplit("epsilon", "Wrong type here");
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit(field, "Break Me!");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit("_time", "Bogus binning value");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }
    
                            // Test timestamp column split
                            pivotSpecification.addTimestampColumnSplit("_time", "day");
                            assert.strictEqual(5, pivotSpecification.columns.length);
    
                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            assert.ok(col.hasOwnProperty("fieldName"));
                            assert.ok(col.hasOwnProperty("owner"));
                            assert.ok(col.hasOwnProperty("type"));
                            assert.ok(!col.hasOwnProperty("label"));
                            assert.ok(col.hasOwnProperty("period"));
    
                            assert.strictEqual("_time", col.fieldName);
                            assert.strictEqual("BaseEvent", col.owner);
                            assert.strictEqual("timestamp", col.type);
                            assert.strictEqual("day", col.period);
                            assert.deepEqual({
                                    fieldName: "_time",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                col);
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test cell value", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            var pivotSpecification = obj.createPivotSpecification();
    
                            // Test error handling for cell value, string
                            try {
                                pivotSpecification.addCellValue("iDontExist", "Break Me!", "explosion");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Did not find field iDontExist");
                            }
                            try {
                                pivotSpecification.addCellValue("source", "Wrong Stats Function", "stdev");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }
    
                            // Add cell value, string
                            pivotSpecification.addCellValue("source", "Source Value", "dc");
                            assert.strictEqual(1, pivotSpecification.cells.length);
    
                            var cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            assert.ok(cell.hasOwnProperty("fieldName"));
                            assert.ok(cell.hasOwnProperty("owner"));
                            assert.ok(cell.hasOwnProperty("type"));
                            assert.ok(cell.hasOwnProperty("label"));
                            assert.ok(cell.hasOwnProperty("value"));
                            assert.ok(cell.hasOwnProperty("sparkline"));
    
                            assert.strictEqual("source", cell.fieldName);
                            assert.strictEqual("BaseEvent", cell.owner);
                            assert.strictEqual("string", cell.type);
                            assert.strictEqual("Source Value", cell.label);
                            assert.strictEqual("dc", cell.value);
                            assert.strictEqual(false, cell.sparkline);
                            assert.deepEqual({
                                    fieldName: "source",
                                    owner: "BaseEvent",
                                    type: "string",
                                    label: "Source Value",
                                    value: "dc",
                                    sparkline: false
                                }, cell);
    
                            // Test error handling for cell value, IPv4
                            try {
                                pivotSpecification.addCellValue("hostip", "Wrong Stats Function", "stdev");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }
    
                            // Add cell value, IPv4
                            pivotSpecification.addCellValue("hostip", "Source Value", "dc");
                            assert.strictEqual(2, pivotSpecification.cells.length);
    
                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            assert.ok(cell.hasOwnProperty("fieldName"));
                            assert.ok(cell.hasOwnProperty("owner"));
                            assert.ok(cell.hasOwnProperty("type"));
                            assert.ok(cell.hasOwnProperty("label"));
                            assert.ok(cell.hasOwnProperty("value"));
                            assert.ok(cell.hasOwnProperty("sparkline"));
    
                            assert.strictEqual("hostip", cell.fieldName);
                            assert.strictEqual("test_data", cell.owner);
                            assert.strictEqual("ipv4", cell.type);
                            assert.strictEqual("Source Value", cell.label);
                            assert.strictEqual("dc", cell.value);
                            assert.strictEqual(false, cell.sparkline);
                            assert.deepEqual({
                                    fieldName: "hostip",
                                    owner: "test_data",
                                    type: "ipv4",
                                    label: "Source Value",
                                    value: "dc",
                                    sparkline: false
                                }, cell);
    
                            // Test error handling for cell value, boolean
                            try {
                                pivotSpecification.addCellValue("has_boris", "Booleans not allowed", "sum");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Cannot use boolean valued fields as cell values.");
                            }
    
                            // Test error handling for cell value, number
                            try {
                                pivotSpecification.addCellValue("epsilon", "Wrong Stats Function", "latest");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Stats function on number field must be must be one of:" +
                                    " sum, count, average, max, min, stdev, list, or distinct_values; found latest");
                            }
    
                            // Add cell value, number
                            pivotSpecification.addCellValue("epsilon", "Source Value", "average");
                            assert.strictEqual(3, pivotSpecification.cells.length);
    
                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            assert.ok(cell.hasOwnProperty("fieldName"));
                            assert.ok(cell.hasOwnProperty("owner"));
                            assert.ok(cell.hasOwnProperty("type"));
                            assert.ok(cell.hasOwnProperty("label"));
                            assert.ok(cell.hasOwnProperty("value"));
                            assert.ok(cell.hasOwnProperty("sparkline"));
    
                            assert.strictEqual("epsilon", cell.fieldName);
                            assert.strictEqual("test_data", cell.owner);
                            assert.strictEqual("number", cell.type);
                            assert.strictEqual("Source Value", cell.label);
                            assert.strictEqual("average", cell.value);
                            assert.strictEqual(false, cell.sparkline);
                            assert.deepEqual({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "Source Value",
                                    value: "average",
                                    sparkline: false
                                }, cell);
    
                            // Test error handling for cell value, timestamp
                            try {
                                pivotSpecification.addCellValue("_time", "Wrong Stats Function", "max");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Stats function on timestamp field must be one of:" +
                                    " duration, earliest, latest, list, or distinct values; found max");
                            }
    
                            // Add cell value, timestamp
                            pivotSpecification.addCellValue("_time", "Source Value", "earliest");
                            assert.strictEqual(4, pivotSpecification.cells.length);
    
                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            assert.ok(cell.hasOwnProperty("fieldName"));
                            assert.ok(cell.hasOwnProperty("owner"));
                            assert.ok(cell.hasOwnProperty("type"));
                            assert.ok(cell.hasOwnProperty("label"));
                            assert.ok(cell.hasOwnProperty("value"));
                            assert.ok(cell.hasOwnProperty("sparkline"));
    
                            assert.strictEqual("_time", cell.fieldName);
                            assert.strictEqual("BaseEvent", cell.owner);
                            assert.strictEqual("timestamp", cell.type);
                            assert.strictEqual("Source Value", cell.label);
                            assert.strictEqual("earliest", cell.value);
                            assert.strictEqual(false, cell.sparkline);
                            assert.deepEqual({
                                    fieldName: "_time",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    label: "Source Value",
                                    value: "earliest",
                                    sparkline: false
                                }, cell);
    
                            // Test error handling for cell value, count
                            try {
                                pivotSpecification.addCellValue("test_data", "Wrong Stats Function", "min");
                                assert.ok(false);
                            }
                            catch (e) {
                                assert.ok(e);
                                assert.strictEqual(e.message, "Stats function on childcount and objectcount fields " +
                                    "must be count; found " + "min");
                            }
    
                            // Add cell value, count
                            pivotSpecification.addCellValue("test_data", "Source Value", "count");
                            assert.strictEqual(5, pivotSpecification.cells.length);
    
                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            assert.ok(cell.hasOwnProperty("fieldName"));
                            assert.ok(cell.hasOwnProperty("owner"));
                            assert.ok(cell.hasOwnProperty("type"));
                            assert.ok(cell.hasOwnProperty("label"));
                            assert.ok(cell.hasOwnProperty("value"));
                            assert.ok(cell.hasOwnProperty("sparkline"));
    
                            assert.strictEqual("test_data", cell.fieldName);
                            assert.strictEqual("test_data", cell.owner);
                            assert.strictEqual("objectCount", cell.type);
                            assert.strictEqual("Source Value", cell.label);
                            assert.strictEqual("count", cell.value);
                            assert.strictEqual(false, cell.sparkline);
                            assert.deepEqual({
                                    fieldName: "test_data",
                                    owner: "test_data",
                                    type: "objectCount",
                                    label: "Source Value",
                                    value: "count",
                                    sparkline: false
                                }, cell);
    
                            done();
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test pivot throws HTTP exception", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
    
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
    
                            obj.createPivotSpecification().pivot(done);
                        },
                        function(pivot, done) {
                            assert.ok(false);
                        }],
                        function(err) {
                            assert.ok(err);
                            var expectedErr = "In handler 'datamodelpivot': Error in 'PivotReport': Must have non-empty cells or non-empty rows.";
                            assert.ok(utils.endsWith(err.message, expectedErr));
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test pivot with simple namespace", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var name = "delete-me-" + getNextId();
            var args;
            var that = this;
            var obj;
            var pivotSpecification;
            var adhocjob;
            try {
                // args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                fetch('./data/data_model_for_pivot.json')
                .then(response => response.json())
                .then(json => {
                    args = json;
                    Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("test_data");
                            assert.ok(obj);
                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            adhocjob = job;
                            assert.ok(job);
                            pivotSpecification = obj.createPivotSpecification();
    
                            pivotSpecification.addBooleanRowSplit("has_boris", "Has Boris", "meep", "hilda");
                            pivotSpecification.addCellValue("hostip", "Distinct IPs", "count");
    
                            // Test setting a job
                            pivotSpecification.setAccelerationJob(job);
                            assert.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            assert.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);
    
                            // Test setting a job's SID
                            pivotSpecification.setAccelerationJob(job.sid);
                            assert.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            assert.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);
    
                            pivotSpecification.pivot(done);
                        },
                        function(pivot, done) {
                            assert.ok(pivot.tstatsSearch);
                            assert.ok(pivot.tstatsSearch.length > 0);
                            assert.strictEqual(0, pivot.tstatsSearch.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            assert.strictEqual("| tstats", pivot.tstatsSearch.match("^\\| tstats")[0]);
                            assert.strictEqual(1, pivot.tstatsSearch.match("^\\| tstats").length);
    
                            pivot.run(done);
                        },
                        function(job, done) {
                            pollUntil(
                                job,
                                function(j) {
                                    return job.properties().isDone;
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            assert.ok("FAILED" !== job.properties().dispatchState);
    
                            assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                            assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);
    
                            adhocjob.cancel(done);
                        }],
                        function(err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            }
            catch(err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
                done();
            }
        });
    
        it("Callback#Pivot - test pivot column range split", function(done) {
            // This test is here because we had a problem with fields that were supposed to be
            // numbers being expected as strings in Splunk 6.0. This was fixed in Splunk 6.1, and accepts
            // either strings or numbers.
    
            if (this.skip) {
                done();
                return;
            }
            var that = this;
            var search;
            Async.chain([
                    function(done) {
                        that.dataModels.fetch(done);
                    },
                    function(dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        var obj = dm.objectByName("searches");
                        var pivotSpecification = obj.createPivotSpecification();
    
                        pivotSpecification.addRowSplit("user", "Executing user");
                        pivotSpecification.addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4});
                        pivotSpecification.addCellValue("search", "Search Query", "values");
                        pivotSpecification.pivot(done);
                    },
                    function(pivot, done) {
                        // If tstats is undefined, use pivotSearch
                        search = pivot.tstatsSearch || pivot.pivotSearch;
                        pivot.run(done);
                    },
                    function(job, done) {
                        pollUntil(
                            job,
                            function(j) {
                                return job.properties().isDone;
                            },
                            10,
                            done
                        );
                    },
                    function(job, done) {
                        assert.notStrictEqual("FAILED", job.properties().dispatchState);
                        // Make sure the job is run with the correct search query
                        assert.strictEqual(search, job.properties().request.search);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#Pivot - test pivot with PivotSpecification.run and Job.track", function(done) {
            if (this.skip) {
                done();
                return;
            }
            var that = this;
            Async.chain([
                function(done) {
                        that.dataModels.fetch(done);
                    },
                    function(dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        var obj = dm.objectByName("searches");
                        var pivotSpecification = obj.createPivotSpecification();
    
                        pivotSpecification.addRowSplit("user", "Executing user");
                        pivotSpecification.addRangeColumnSplit("exec_time", {start: 0, end: 12, step: 5, limit: 4});
                        pivotSpecification.addCellValue("search", "Search Query", "values");
    
                        pivotSpecification.run({}, done);
                    },
                    function(job, pivot, done) {
                        job.track({}, function(job) {
                            assert.strictEqual(pivot.tstatsSearch || pivot.pivotSearch, job.properties().request.search);
                            done(null, job);
                        });
                    },
                    function(job, done) {
                        assert.notStrictEqual("FAILED", job.properties().dispatchState);
                        job.cancel(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#DataModels - delete any remaining data models created by the SDK tests", function(done) {
            if (this.skip) {
                done();
                return;
            }
            svc.dataModels().fetch(function(err, dataModels) {
                if (err) {
                    assert.ok(!err);
                }
    
                var dms = dataModels.list();
                Async.seriesEach(
                    dms,
                    function(datamodel, i, done) {
                        // Delete any test data models that we created
                        if (utils.startsWith(datamodel.name, "delete-me")) {
                            datamodel.remove(done);
                        }
                        else {
                            done();
                        }
                    },
                    function(err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });
    });

    describe("App Tests", function(){
        
        before(function (done) {
            idCounter = 0;
            this.service = svc;
            done();
        })
        
        it("Callback#list applications", function(done) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                var appList = apps.list();
                assert.ok(appList.length > 0);
                done();
            });
        });

        it("Callback#contains applications", function(done) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                var app = apps.item("search");
                assert.ok(app);
                done();
            });
        });

        it("Callback#create + contains app", function(done) {
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();

            apps.create({name: name}, function(err, app) {
                var appName = app.name;
                apps.fetch(function(err, apps) {
                    var entity = apps.item(appName);
                    assert.ok(entity);
                    app.remove(function() {
                        done();
                    });
                });
            });
        });

        it("Callback#create + modify app", function(done) {
            var DESCRIPTION = "TEST DESCRIPTION";
            var VERSION = "1.1.0";

            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();

            Async.chain([
                function(callback) {
                    apps.create({name: name}, callback);
                },
                function(app, callback) {
                    assert.ok(app);
                    assert.strictEqual(app.name, name);
                    var versionMatches = app.properties().version === "1.0" ||
                        app.properties().version === "1.0.0";
                    assert.ok(versionMatches);

                    app.update({
                        description: DESCRIPTION,
                        version: VERSION
                    }, callback);
                },
                function(app, callback) {
                    assert.ok(app);
                    var properties = app.properties();

                    assert.strictEqual(properties.description, DESCRIPTION);
                    assert.strictEqual(properties.version, VERSION);

                    app.remove(callback);
                }
            ], function(err) {
                assert.ok(!err);
                done();
            });
        });

        it("Callback#delete test applications", function(done) {
            var apps = this.service.apps();
            apps.fetch(function(err, apps) {
                var appList = apps.list();

                Async.parallelEach(
                    appList,
                    function(app, idx, callback) {
                        if (utils.startsWith(app.name, "jssdk_")) {
                            app.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });

        it("list applications with cookies as authentication", function(done) {
            this.service.serverInfo(function (err, info) {
                // Cookie authentication was added in splunk 6.2
                var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                // Skip cookie test if Splunk older than 6.2
                if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                    splunkjs.Logger.log("Skipping cookie test...");
                    done();
                    return;
                }

                var service = new splunkjs.Service(svc.http,
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        username: svc.username,
                        password: svc.password,
                        version: svc.version
                    });

                var service2 = new splunkjs.Service(svc.http,
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        version: svc.version
                    });

                Async.chain([
                        function (done) {
                            service.login(done);
                        },
                        function (job, done) {
                            // Save the cookie store
                            var cookieStore = service.http._cookieStore;
                            // Test that there are cookies
                            assert.ok(!utils.isEmpty(cookieStore));

                            // Add the cookies to a service with no other authenitcation information
                            service2.http._cookieStore = cookieStore;

                            var apps = service2.apps();
                            apps.fetch(done);
                        },
                        function (apps, done) {
                            var appList = apps.list();
                            assert.ok(appList.length > 0);
                            assert.ok(!utils.isEmpty(service2.http._cookieStore));
                            done();
                        }
                    ],
                    function(err) {
                        // Test that no errors were returned
                        assert.ok(!err);
                        done();
                    });
            });
        });
        
    });

    describe("Saved Search Tests", function() {
        before( function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        });
    
        it("Callback#list", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var savedSearches = searches.list();
                assert.ok(savedSearches.length > 0);
    
                for(var i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
    
                done();
            });
        });
    
        it("Callback#contains", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var search = searches.item("Errors in the last hour");
                assert.ok(search);
    
                done();
            });
        });
    
        it("Callback#suppress", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch(function(err, searches) {
                var search = searches.item("Errors in the last hour");
                assert.ok(search);
    
                search.suppressInfo(function(err, info, search) {
                    assert.ok(!err);
                    done();
                });
            });
        });
    
        it("Callback#list limit count", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch({count: 2}, function(err, searches) {
                var savedSearches = searches.list();
                assert.strictEqual(savedSearches.length, 2);
    
                for(var i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
    
                done();
            });
        });
    
        it("Callback#list filter", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch({search: "Error"}, function(err, searches) {
                var savedSearches = searches.list();
                assert.ok(savedSearches.length > 0);
    
                for(var i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
    
                done();
            });
        });
    
        it("Callback#list offset", function(done) {
            var searches = this.service.savedSearches();
            searches.fetch({offset: 2, count: 1}, function(err, searches) {
                var savedSearches = searches.list();
                assert.strictEqual(searches.paging().offset, 2);
                assert.strictEqual(searches.paging().perPage, 1);
                assert.strictEqual(savedSearches.length, 1);
    
                for(var i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
    
                done();
            });
        });
    
        it("Callback#create + modify + delete saved search", function(done) {
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
                        assert.ok(search);
    
                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, originalSearch);
                        assert.ok(!search.properties().description);
    
                        search.update({search: updatedSearch}, done);
                    },
                    function(search, done) {
                        assert.ok(search);
                        assert.ok(search);
    
                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, updatedSearch);
                        assert.ok(!search.properties().description);
    
                        search.update({description: updatedDescription}, done);
                    },
                    function(search, done) {
                        assert.ok(search);
                        assert.ok(search);
    
                        assert.strictEqual(search.name, name);
                        assert.strictEqual(search.properties().search, updatedSearch);
                        assert.strictEqual(search.properties().description, updatedDescription);
    
                        search.fetch(done);
                    },
                    function(search, done) {
                        // Verify that we have the required fields
                        assert.ok(search.fields().optional.length > 1);
                        assert.ok(utils.indexOf(search.fields().optional, "disabled") > -1);
    
                        search.remove(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#dispatch error", function(done) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
            var search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                {owner: "nobody", app: "search"}
            );
            search.dispatch(function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#dispatch omitting optional arguments", function(done) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
    
            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});
    
            Async.chain(
                [function(done) {
                    searches.create({search: originalSearch, name: name}, done);
                },
                function(search, done) {
                    assert.ok(search);
    
                    assert.strictEqual(search.name, name);
                    assert.strictEqual(search.properties().search, originalSearch);
                    assert.ok(!search.properties().description);
    
                    search.dispatch(done);
                },
                function(job, search, done) {
                    assert.ok(job);
                    assert.ok(search);
                    done();
                }]
            );
        });
    
        it("Callback#history error", function(done) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
            var search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                {owner: "nobody", app: "search", sharing: "system"}
            );
            search.history(function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#Update error", function(done) {
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
                    assert.ok(err);
                    done();
                });
        });
    
        it("Callback#oneshot requires search string", function(done) {
            assert.throws(function() { this.service.oneshotSearch({name: "jssdk_oneshot_" + getNextId()}, function(err) {});});
            done();
        });
    
        it("Callback#Create + dispatch + history", function(done) {
            var name = "jssdk_savedsearch_" + getNextId();
            var originalSearch = "search index=_internal | head 1";
    
            var searches = this.service.savedSearches({owner: this.service.username, app: "sdk-app-collection"});
    
            Async.chain(
                function(done) {
                    searches.create({search: originalSearch, name: name}, done);
                },
                function(search, done) {
                    assert.ok(search);
    
                    assert.strictEqual(search.name, name);
                    assert.strictEqual(search.properties().search, originalSearch);
                    assert.ok(!search.properties().description);
    
                    search.dispatch({force_dispatch: false, "dispatch.buckets": 295}, done);
                },
                function(job, search, done) {
                    assert.ok(job);
                    assert.ok(search);
    
                    pollUntil(
                        job,
                        function(j) {
                            return job.properties()["isDone"];
                        },
                        10,
                        Async.augment(done, search)
                    );
                },
                function(job, search, done) {
                    assert.strictEqual(job.properties().statusBuckets, 295);
                    search.history(Async.augment(done, job));
                },
                function(jobs, search, originalJob, done) {
                    assert.ok(jobs);
                    assert.ok(jobs.length > 0);
                    assert.ok(search);
                    assert.ok(originalJob);
    
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
    
                    assert.ok(found);
    
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
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        it("Callback#job events fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.events({}, function (err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#job preview fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.preview({}, function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#job results fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.results({}, function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#job searchlog fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.searchlog(function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#job summary fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.summary({}, function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#job timeline fails", function(done) {
            var job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            job.timeline({}, function(err) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#delete test saved searches", function(done) {
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
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });
    
        it("Callback#setupInfo fails", function(done) {
            var searches = new splunkjs.Service.Application(this.loggedOutService, "search");
            searches.setupInfo(function(err, content, that) {
                assert.ok(err);
                done();
            });
        });
    
        it("Callback#setupInfo succeeds", function(done) {
            var app = new splunkjs.Service.Application(this.service, "sdk-app-collection");
            app.setupInfo(function(err, content, app) {
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
        });
    
        it("Callback#updateInfo", function(done) {
            var app = new splunkjs.Service.Application(this.service, "search");
            app.updateInfo(function(err, info, app) {
                assert.ok(!err);
                assert.ok(app);
                assert.strictEqual(app.name, 'search');
                done();
            });
        });
    
        it("Callback#updateInfo failure", function(done) {
            var app = new splunkjs.Service.Application(this.loggedOutService, "sdk-app-collection");
            app.updateInfo(function(err, info, app) {
                assert.ok(err);
                done();
            });
        });
    });

    describe("Fired Alerts Tests", function() {
        before( function(done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
    
            var indexes = this.service.indexes();
            done();
        });
    
        it("Callback#create + verify emptiness + delete new alert group", function(done) {
            var searches = this.service.savedSearches({owner: this.service.username});
    
            var name = "jssdk_savedsearch_alert_" + getNextId();
            var searchConfig = {
                "name": name,
                "search": "index=_internal | head 1",
                "alert_type": "always",
                "alert.severity": "2",
                "alert.suppress": "0",
                "alert.track": "1",
                "dispatch.earliest_time": "-1h",
                "dispatch.latest_time": "now",
                "is_scheduled": "1",
                "cron_schedule": "* * * * *"
            };
    
            Async.chain([
                    function(done) {
                        searches.create(searchConfig, done);
                    },
                    function(search, done) {
                        assert.ok(search);
                        assert.strictEqual(search.alertCount(), 0);
                        search.history(done);
                    },
                    function(jobs, search, done) {
                        assert.strictEqual(jobs.length, 0);
                        assert.strictEqual(search.firedAlertGroup().count(), 0);
                        searches.service.firedAlertGroups().fetch( Async.augment(done, search) );
                    },
                    function(firedAlertGroups, originalSearch, done) {
                        assert.strictEqual(firedAlertGroups.list().indexOf(originalSearch.name), -1);
                        done(null, originalSearch);
                    },
                    function(originalSearch, done) {
                        originalSearch.remove(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    
        // This test is not stable, commenting it out until we figure it out
        // "Callback#alert is triggered + test firedAlert entity -- FAILS INTERMITTENTLY", function(done) {
        //     var searches = this.service.savedSearches({owner: this.service.username});
        //     var indexName = "sdk-tests-alerts";
        //     var name = "jssdk_savedsearch_alert_" + getNextId();
    
        //     // Real-time search config
        //     var searchConfig = {
        //         "name": name,
        //         "search": "index="+indexName+" sourcetype=sdk-tests-alerts | head 1",
        //         "alert_type": "always",
        //         "alert.severity": "2",
        //         "alert.suppress": "0",
        //         "alert.track": "1",
        //         "dispatch.earliest_time": "rt-1s",
        //         "dispatch.latest_time": "rt",
        //         "is_scheduled": "1",
        //         "cron_schedule": "* * * * *"
        //     };
    
        //     Async.chain([
        //             function(done) {
        //                 searches.create(searchConfig, done);
        //             },
        //             function(search, done) {
        //                 assert.ok(search);
        //                 assert.strictEqual(search.alertCount(), 0);
        //                 assert.strictEqual(search.firedAlertGroup().count(), 0);
    
        //                 var indexes = search.service.indexes();
        //                 indexes.create(indexName, {}, function(err, index) {
        //                     if (err && err.status !== 409) {
        //                         done(new Error("Index creation failed for an unknown reason"));
        //                     }
        //                     done(null, search);
        //                 });
        //             },
        //             function(originalSearch, done) {
        //                 var indexes = originalSearch.service.indexes();
        //                 indexes.fetch(function(err, indexes) {
        //                     if (err) {
        //                         done(err);
        //                     }
        //                     else {
        //                         var index = indexes.item(indexName);
        //                         assert.ok(index);
        //                         index.enable(Async.augment(done, originalSearch));
        //                     }
        //                 });
        //             },
        //             function(index, originalSearch, done) {
        //                 //Is the index enabled?
        //                 assert.ok(!index.properties().disabled);
        //                 //refresh the index
        //                 index.fetch(Async.augment(done, originalSearch));
        //             },
        //             function(index, originalSearch, done) {
        //                 //Store the current event count for a later comparison
        //                 var eventCount = index.properties().totalEventCount;
    
        //                 assert.strictEqual(index.properties().sync, 0);
        //                 assert.ok(!index.properties().disabled);
    
        //                 index.fetch(Async.augment(done, originalSearch, eventCount));
        //             },
        //             function(index, originalSearch, eventCount, done) {
        //                 // submit an event
        //                 index.submitEvent(
        //                     "JS SDK: testing alerts",
        //                     {
        //                         sourcetype: "sdk-tests-alerts"
        //                     },
        //                     Async.augment(done, originalSearch, eventCount)
        //                 );
        //             },
        //             function(result, index, originalSearch, eventCount, done) {
        //                 Async.sleep(1000, function(){
        //                     //refresh the search
        //                     index.fetch(Async.augment(done, originalSearch, eventCount));
        //                 });
        //             },
        //             function(index, originalSearch, eventCount, done) {
        //                 // Did the event get submitted
        //                 assert.strictEqual(index.properties().totalEventCount, eventCount+1);
        //                 // Refresh the search
        //                 originalSearch.fetch(Async.augment(done, index));
        //             },
        //             function(originalSearch, index, done) {
        //                 splunkjs.Logger.log("\tAlert count pre-fetch", originalSearch.alertCount());
        //                 var attemptNum = 1;
        //                 var maxAttempts = 20;
        //                 Async.whilst(
        //                     function() {
        //                         // When this returns false, it hits the final function in the chain
        //                         splunkjs.Logger.log("\tFetch attempt", attemptNum, "of", maxAttempts, "alertCount", originalSearch.alertCount());
        //                         if (originalSearch.alertCount() !== 0) {
        //                             return false;
        //                         }
        //                         else {
        //                             attemptNum++;
        //                             return attemptNum < maxAttempts;
        //                         }
        //                     },
        //                     function(callback) {
        //                         Async.sleep(500, function() {
        //                             originalSearch.fetch(callback);
        //                         });
        //                     },
        //                     function(err) {
        //                         splunkjs.Logger.log("Attempted fetching", attemptNum, "of", maxAttempts, "result is", originalSearch.alertCount() !== 0);
        //                         originalSearch.fetch(Async.augment(done, index));
        //                     }
        //                 );
        //             },
        //             function(originalSearch, index, done) {
        //                 splunkjs.Logger.log("about to fetch");
        //                 splunkjs.Logger.log("SavedSearch name was: " + originalSearch.name);
        //                 svc.firedAlertGroups({username: svc.username}).fetch(Async.augment(done, index, originalSearch));
        //             },
        //             function(firedAlertGroups, index, originalSearch, done) {
        //                 Async.seriesEach(
        //                     firedAlertGroups.list(),
        //                     function(firedAlertGroup, innerIndex, seriescallback) {
        //                         Async.chain([
        //                                 function(insideChainCallback) {
        //                                     firedAlertGroup.list(insideChainCallback);
        //                                 },
        //                                 function(firedAlerts, firedAlertGroup, insideChainCallback) {
        //                                     for(var i = 0; i < firedAlerts.length; i++) {
        //                                         var firedAlert = firedAlerts[i];
        //                                         firedAlert.actions();
        //                                         firedAlert.alertType();
        //                                         firedAlert.isDigestMode();
        //                                         firedAlert.expirationTime();
        //                                         firedAlert.savedSearchName();
        //                                         firedAlert.severity();
        //                                         firedAlert.sid();
        //                                         firedAlert.triggerTime();
        //                                         firedAlert.triggerTimeRendered();
        //                                         firedAlert.triggeredAlertCount();
        //                                     }
        //                                     insideChainCallback(null);
        //                                 }
        //                             ],
        //                             function(err) {
        //                                 if (err) {
        //                                     seriescallback(err);
        //                                 }
        //                                     seriescallback(null);
        //                             }
        //                         );
        //                     },
        //                     function(err) {
        //                         if (err) {
        //                             done(err, originalSearch, index);
        //                         }
        //                         done(null, originalSearch, index);
        //                     }
        //                 );
        //             },
        //             function(originalSearch, index, done) {
        //                 // Make sure the event count has incremented, as expected
        //                 assert.strictEqual(originalSearch.alertCount(), 1);
        //                 // Remove the search, especially because it's a real-time search
        //                 originalSearch.remove(Async.augment(done, index));
        //             },
        //             function(index, done) {
        //                 Async.sleep(500, function() {
        //                     index.remove(done);
        //                 });
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },
    
        it("Callback#delete all alerts", function(done) {
            var namePrefix = "jssdk_savedsearch_alert_";
            var alertList = this.service.savedSearches().list();
    
            Async.parallelEach(
                alertList,
                function(alert, idx, callback) {
                    if (utils.startsWith(alert.name, namePrefix)) {
                        splunkjs.Logger.log("ALERT ---", alert.name);
                        alert.remove(callback);
                    }
                    else {
                        callback();
                    }
                }, function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    });

    describe("Properties Tests", function() {
        before( function(done) {
            idCounter=0;
            this.service = svc;
            done();
        });
    
        it("Callback#list", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) {
                    that.service.configurations(namespace).fetch(done);
                },
                function(props, done) {
                    var files = props.list();
                    assert.ok(files.length > 0);
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#item", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("web");
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(file.name, "web");
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#contains stanza", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("web");
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(file.name, "web");
                    var stanza = file.item("settings");
                    assert.ok(stanza);
                    stanza.fetch(done);
                },
                function(stanza, done) {
                    assert.ok(stanza.properties().hasOwnProperty("httpport"));
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#create file + create stanza + update stanza", function(done) {
            var that = this;
            var fileName = "jssdk_file_" + getNextId();
            var value = "barfoo_" + getNextId();
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) {
                    var properties = that.service.configurations(namespace);
                    properties.fetch(done);
                },
                function(properties, done) {
                    properties.create(fileName, done);
                },
                function(file, done) {
                    file.create("stanza", done);
                },
                function(stanza, done) {
                    stanza.update({"jssdk_foobar": value}, done);
                },
                function(stanza, done) {
                    assert.strictEqual(stanza.properties()["jssdk_foobar"], value);
                    done();
                },
                function(done) {
                    var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                    file.fetch(done);
                },
                function(file, done) {
                    var stanza = file.item("stanza");
                    assert.ok(stanza);
                    stanza.remove(done);
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    });

    describe("Configuration Tests", function() {
        before(function(done) {
            idCounter=0;
            this.service = svc;
            done();
        });
    
        it("Callback#list", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var files = props.list();
                    assert.ok(files.length > 0);
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#contains", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("web");
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(file.name, "web");
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#contains stanza", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("web");
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(file.name, "web");
    
                    var stanza = file.item("settings");
                    assert.ok(stanza);
                    stanza.fetch(done);
                },
                function(stanza, done) {
                    assert.ok(stanza.properties().hasOwnProperty("httpport"));
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#configurations init", function(done) {
            assert.throws(function() {
                var confs = new splunkjs.Service.Configurations(
                    this.service,
                    {owner: "-", app: "-", sharing: "system"}
                );
            });
            done();
        });
    
        it("Callback#create file + create stanza + update stanza", function(done) {
            var that = this;
            var namespace = {owner: "nobody", app: "system"};
            var fileName = "jssdk_file_" + getNextId();
            var value = "barfoo_" + getNextId();
    
            Async.chain([
                function(done) {
                    var configs = svc.configurations(namespace);
                    configs.fetch(done);
                },
                function(configs, done) {
                    configs.create({__conf: fileName}, done);
                },
                function(file, done) {
                    if (file.item("stanza")) {
                        file.item("stanza").remove();
                    }
                    file.create("stanza", done);
                },
                function(stanza, done) {
                    stanza.update({"jssdk_foobar": value}, done);
                },
                function(stanza, done) {
                    assert.strictEqual(stanza.properties()["jssdk_foobar"], value);
                    done();
                },
                function(done) {
                    var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                    file.fetch(done);
                },
                function(file, done) {
                    var stanza = file.item("stanza");
                    assert.ok(stanza);
                    stanza.remove(done);
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#can get default stanza", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("savedsearches");
                    assert.strictEqual(namespace, file.namespace);
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(namespace, file.namespace);
                    file.getDefaultStanza().fetch(done);
                },
                function(stanza, done) {
                    assert.strictEqual(stanza.name, "default");
                    assert.strictEqual(namespace, stanza.namespace);
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    
        it("Callback#updating default stanza is noop", function(done) {
            var that = this;
            var namespace = {owner: "admin", app: "search"};
            var backup = null;
            var invalid = "this won't work";
    
            Async.chain([
                function(done) { that.service.configurations(namespace).fetch(done); },
                function(props, done) {
                    var file = props.item("savedsearches");
                    assert.strictEqual(namespace, file.namespace);
                    assert.ok(file);
                    file.fetch(done);
                },
                function(file, done) {
                    assert.strictEqual(namespace, file.namespace);
                    file.getDefaultStanza().fetch(done);
                },
                function(stanza, done) {
                    assert.ok(stanza._properties.hasOwnProperty("max_concurrent"));
                    assert.strictEqual(namespace, stanza.namespace);
                    backup = stanza._properties.max_concurrent;
                    stanza.update({"max_concurrent": invalid}, done);
                },
                function(stanza, done) {
                    assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                    assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                    assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                    stanza.fetch(done);
                },
                function(stanza, done) {
                    assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
                    assert.strictEqual(stanza.properties()["max_concurrent"], backup);
                    assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
                    done();
                }
            ],
            function(err) {
                assert.ok(!err);
                done();
            });
        });
    });

    describe('Storage Passwords Test', function(){
        before(function (done) {
            idCounter=0;
            this.service=svc;
            done();
        })
        it("Callback#Create", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create with backslashes", function(done) {
            var startcount = -1;
            var name = "\\delete-me-" + getNextId();
            var realm = "\\delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create with slashes", function(done) {
            var startcount = -1;
            var name = "/delete-me-" + getNextId();
            var realm = "/delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create without realm", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual("", storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create should fail without user, or realm", function(done) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: null, password: "changed!"}, done);
                    }
                ],
                function(err) {
                    assert.ok(err);
                    done();
                }
            );
        });

        it("Callback#Create should fail without password", function(done) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: "something", password: null}, done);
                    }
                ],
                function(err) {
                    assert.ok(err);
                    done();
                }
            );
        });

        it("Callback#Create should fail without user, realm, or password", function(done) {
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        storagePasswords.create({name: null, password: null}, done);
                    }
                ],
                function(err) {
                    assert.ok(err);
                    done();
                }
            );
        });

        it("Callback#Create with colons", function(done) {
            var startcount = -1;
            var name = ":delete-me-" + getNextId();
            var realm = ":delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create crazy", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                                name: name + ":end!@#$%^&*()_+{}:|<>?",
                                realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                                password: "changed!"},
                            done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                        assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Create with unicode chars", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({
                                name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                                realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                                password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))},
                            done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                        assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                        //assert.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                        assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Read", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        try {
                            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            assert.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        assert.ok(found);

                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Read with slashes", function(done) {
            var startcount = -1;
            var name = "/delete-me-" + getNextId();
            var realm = "/delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        try {
                            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                        }
                        catch (e) {
                            assert.ok(false);
                        }

                        var list = storagePasswords.list();
                        var found = false;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                            }
                        }
                        assert.ok(found);

                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Update", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.update({password: "changed"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        var list = storagePasswords.list();
                        var found = false;
                        var index = -1;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                                index = i;
                                assert.strictEqual(name, list[i].properties().username);
                                assert.strictEqual(realm + ":" + name + ":", list[i].name);
                                assert.strictEqual("changed", list[i].properties().clear_password);
                                assert.strictEqual(realm, list[i].properties().realm);
                            }
                        }
                        assert.ok(found);

                        if (!found) {
                            done(new Error("Didn't find the created password"));
                        }
                        else {
                            list[index].remove(done);
                        }
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Delete", function(done) {
            var startcount = -1;
            var name = "delete-me-" + getNextId();
            var realm = "delete-me-" + getNextId();
            var that = this;
            Async.chain([
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        startcount = storagePasswords.list().length;
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
                        //assert.strictEqual("changed!", storagePassword.properties().clear_password);
                        assert.strictEqual(realm, storagePassword.properties().realm);
                        that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                    },
                    function(storagePasswords, storagePassword, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        storagePassword.remove(done);
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
                    },
                    function(storagePassword, done) {
                        assert.strictEqual(name, storagePassword.properties().username);
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount + 1, storagePasswords.list().length);
                        var list = storagePasswords.list();
                        var found = false;
                        var index = -1;

                        assert.strictEqual(startcount + 1, list.length);
                        for (var i = 0; i < list.length; i ++) {
                            if (realm + ":" + name + ":" === list[i].name) {
                                found = true;
                                index = i;
                                assert.strictEqual(name, list[i].properties().username);
                                assert.strictEqual(realm + ":" + name + ":", list[i].name);
                                assert.strictEqual("changed!", list[i].properties().clear_password);
                                assert.strictEqual(realm, list[i].properties().realm);
                            }
                        }
                        assert.ok(found);

                        if (!found) {
                            done(new Error("Didn't find the created password"));
                        }
                        else {
                            list[index].remove(done);
                        }
                    },
                    function(done) {
                        that.service.storagePasswords().fetch(done);
                    },
                    function(storagePasswords, done) {
                        assert.strictEqual(startcount, storagePasswords.list().length);
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    });

    describe('Index Tests', function() {
        before(function(done){
            idCounter = 0;
            this.service = svc;
            this.loggedOutService = loggedOutSvc;

            // Create the index for everyone to use
            var name = this.indexName = "sdk-tests";
            var indexes = this.service.indexes();
            indexes.create(name, {}, function(err, index) {
                if (err && err.status !== 409) {
                    throw new Error("Index creation failed for an unknown reason");
                }
                done();
            });

        })

        it("Callback#remove index fails on Splunk 4.x", function(done) {
            var original_version = this.service.version;
            this.service.version = "4.0";

            var index = this.service.indexes().item(this.indexName);
            assert.throws(function() { index.remove(function(err) {}); });

            this.service.version = original_version;
            done();
        });

        it("Callback#remove index", function(done) {
            var indexes = this.service.indexes();

            // Must generate a private index because an index cannot
            // be recreated with the same name as a deleted index
            // for a certain period of time after the deletion.
            var salt = Math.floor(Math.random() * 65536);
            var myIndexName = this.indexName + '-' + salt;

            if (this.service.versionCompare("5.0") < 0) {
                splunkjs.Logger.info("", "Must be running Splunk 5.0+ for this test to work.");
                done();
                return;
            }

            Async.chain([
                    function(callback) {
                        indexes.create(myIndexName, {}, callback);
                    },
                    function(index, callback) {
                        index.remove(callback);
                    },
                    function(callback) {
                        var numTriesLeft = 50;
                        var delayPerTry = 100;  // ms

                        Async.whilst(
                             function() { return indexes.item(myIndexName) && ((numTriesLeft--) > 0); },
                             function(iterDone) {
                                  Async.sleep(delayPerTry, function() { indexes.fetch(iterDone); });
                             },
                             function(err) {
                                  if (err) {
                                       callback(err);
                                  }
                                  else {
                                       callback(numTriesLeft <= 0 ? "Timed out" : null);
                                  }
                             }
                        );
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#list indexes", function(done) {
            var indexes = this.service.indexes();
            indexes.fetch(function(err, indexes) {
                var indexList = indexes.list();
                assert.ok(indexList.length > 0);
                done();
            });
        });

        it("Callback#contains index", function(done) {
            var indexes = this.service.indexes();
            var indexName = this.indexName;

            indexes.fetch(function(err, indexes) {
                var index = indexes.item(indexName);
                assert.ok(index);
                done();
            });
        });

        it("Callback#modify index", function(done) {

            var name = this.indexName;
            var indexes = this.service.indexes();
            var originalSyncMeta = false;

            Async.chain([
                    function(callback) {
                        indexes.fetch(callback);
                    },
                    function(indexes, callback) {
                        var index = indexes.item(name);
                        assert.ok(index);

                        originalSyncMeta = index.properties().syncMeta;
                        index.update({
                            syncMeta: !originalSyncMeta
                        }, callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        var properties = index.properties();

                        assert.strictEqual(!originalSyncMeta, properties.syncMeta);

                        index.update({
                            syncMeta: !properties.syncMeta
                        }, callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        var properties = index.properties();

                        assert.strictEqual(originalSyncMeta, properties.syncMeta);
                        callback();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Enable+disable index", function(done) {

            var name = this.indexName;
            var indexes = this.service.indexes();

            Async.chain([
                    function(callback) {
                        indexes.fetch(callback);
                    },
                    function(indexes, callback) {
                        var index = indexes.item(name);
                        assert.ok(index);

                        index.disable(callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        index.fetch(callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        assert.ok(index.properties().disabled);

                        index.enable(callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        index.fetch(callback);
                    },
                    function(index, callback) {
                        assert.ok(index);
                        assert.ok(!index.properties().disabled);

                        callback();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Service submit event", function(done) {
            var message = "Hello World -- " + getNextId();
            var sourcetype = "sdk-tests";

            var service = this.service;
            var indexName = this.indexName;
            Async.chain(
                function(done) {
                    service.log(message, {sourcetype: sourcetype, index: indexName}, done);
                },
                function(eventInfo, done) {
                    assert.ok(eventInfo);
                    assert.strictEqual(eventInfo.sourcetype, sourcetype);
                    assert.strictEqual(eventInfo.bytes, message.length);
                    assert.strictEqual(eventInfo.index, indexName);

                    // We could poll to make sure the index has eaten up the event,
                    // but unfortunately this can take an unbounded amount of time.
                    // As such, since we got a good response, we'll just be done with it.
                    done();
                },
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Service submit event, omitting optional arguments", function(done) {
            var message = "Hello World -- " + getNextId();
            var sourcetype = "sdk-tests";

            var service = this.service;
            var indexName = this.indexName;
            Async.chain(
                function(done) {
                    service.log(message, done);
                },
                function(eventInfo, done) {
                    assert.ok(eventInfo);
                    assert.strictEqual(eventInfo.bytes, message.length);

                    // We could poll to make sure the index has eaten up the event,
                    // but unfortunately this can take an unbounded amount of time.
                    // As such, since we got a good response, we'll just be done with it.
                    done();
                },
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Service submit events with multi-byte chars", function(done) {
            var service = this.service;
            var messages = [
                "Ummelner Straße 6",
                "Ümmelner Straße 6",
                "Iԉｔéｒԉáｔíòлåɭìƶåｔｉòл",
                "Iｎｔéｒｎâｔì߀лàɭíƶɑｔïòл",
                "ãϻéｔ ｄòｎｅｒ ｔｕｒƙëｙ ѵ߀ｌù",
                "ｐｔãｔｅ ìԉ ｒëρｒèｈëｎԁéｒｉｔ ",
                "ϻ߀ｌɭｉｔ ｆìɭèｔ ϻìǥｎｏԉ ɭäｂ߀ｒíѕ",
                " êӽ ｃɦùｃｋ ｃüｐïᏧåｔåｔ Ꮷèѕëｒｕлｔ. ",
                "D߀ɭｏｒ ѵéｌíｔ ìｒｕｒè, ｓèᏧ ѕｈòｒ",
                "ｔ ｒｉƅѕ ｃ߀ɰ ɭãｎԁյàéɢêｒ ｄｒúｍｓｔ",
                "íｃƙ. Mｉｎïｍ ƃàɭｌ ｔｉｐ ѕհòｒｔ ｒìƃѕ,",
                " ïԁ ａɭïｑúìρ ѕɦàｎƙ ρ߀ｒｃɦéｔｔɑ. Pìǥ",
                " ｈãｍ ɦòｃｋ ìлｃíｄíԁùԉｔ ｓéԁ ｃüｐïϻ ",
                "ƙèｖｉл ｌáｂｏｒê. Eｔ ｔａｉɭ ѕｔｒｉρ",
                " ｓｔｅáｋ úｔ üｌｌãϻｃ߀ ｒｕｍｐ ｄ߀ɭｏｒｅ.",
                "٩(͡๏̯͡๏)۶ ٩(-̮̮̃•̃).",
                "Lɑƅòｒé ƃｒëｓãòｌá ｄ߀лèｒ ѕâｌáｍí ",
                "ｃíｌｌûｍ ìｎ ѕɯìлｅ ϻêàｔɭ߀àｆ ｄûìｓ ",
                "ρãｎｃｅｔｔä ƅｒìｓƙéｔ ԁèｓêｒûлｔ áúｔè",
                " յòɰɭ. Lɑｂòｒìѕ ƙìêɭ",
                "ｂáｓá ԁòｌòｒé ｆａｔƃɑｃｋ ƅêéｆ. Pɑѕｔｒ",
                "äｍì ｐｉɢ ѕհàлƙ ùɭɭａｍｃò ѕａû",
                "ѕäǥë ｓɦàｎƙｌë.",
                " Cúｐíｍ ɭäƃｏｒｕｍ ｄｒｕｍｓｔïｃƙ ｊｅｒｋϒ ｖｅｌｉ",
                " ｐïｃåԉɦɑ ƙíéɭƅãｓａ. Aｌïｑû",
                "ｉρ íｒüｒë ｃûｐíϻ, äɭìɋｕâ ǥｒòûлｄ ",
                "ｒｏúлᏧ ｔｏԉｇüè ρàｒìãｔùｒ ",
                "ｂｒｉѕｋèｔ ԉｏｓｔｒｕᏧ ｃûɭｐɑ",
                " ìｄ ｃòлѕèｑûâｔ ｌàƅ߀ｒìｓ."
            ];

            var counter = 0;
            Async.seriesMap(
                messages,
                function(val, idx, done) {
                    counter++;
                    service.log(val, done);
                },
                function(err, vals) {
                    assert.ok(!err);
                    assert.strictEqual(counter, messages.length);

                    // Verify that the full byte-length was sent for each message
                    for (var m in messages) {
                        assert.notStrictEqual(messages[m].length, vals[m].bytes);
                        try {
                            assert.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                        }
                        catch (err) {
                            // Assume Buffer isn't defined, we're probably in the browser
                            assert.strictEqual(new Blob([messages[m]]).size, vals[m].bytes);
                        }
                    }

                    done();
                }
            );
        });

        it("Callback#Service submit event, failure", function(done) {
            var message = "Hello World -- " + getNextId();
            var sourcetype = "sdk-tests";

            var service = this.loggedOutService;
            var indexName = this.indexName;
            Async.chain(
                function(done) {
                    assert.ok(service);
                    service.log(message, done);
                },
                function(err) {
                    assert.ok(err);
                    done();
                }
            );
        });

        it("Callback#remove throws an error", function(done) {
            var index = this.service.indexes().item("_internal");
            assert.throws(function() {
                index.remove();
            });
            done();
        });

        it("Callback#create an index with alternate argument format", function(done) {
            var indexes = this.service.indexes();
            indexes.create(
                {name: "_internal"},
                function(err, newIndex) {
                    assert.ok(err.data.messages[0].text.match("name=_internal already exists"));
                    done();
                }
            );
        });

        it("Callback#Index submit event with omitted optional arguments", function(done) {
            var message = "Hello world -- " + getNextId();

            var indexName = this.indexName;
            var indexes = this.service.indexes();

            Async.chain(
                [
                    function(done) {
                        indexes.fetch(done);
                    },
                    function(indexes, done) {
                        var index = indexes.item(indexName);
                        assert.ok(index);
                        assert.strictEqual(index.name, indexName);
                        index.submitEvent(message, done);
                    },
                    function(eventInfo, index, done) {
                        assert.ok(eventInfo);
                        assert.strictEqual(eventInfo.bytes, message.length);
                        assert.strictEqual(eventInfo.index, indexName);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Index submit event", function(done) {
            var message = "Hello World -- " + getNextId();
            var sourcetype = "sdk-tests";

            var indexName = this.indexName;
            var indexes = this.service.indexes();
            Async.chain([
                    function(done) {
                        indexes.fetch(done);
                    },
                    function(indexes, done) {
                        var index = indexes.item(indexName);
                        assert.ok(index);
                        assert.strictEqual(index.name, indexName);
                        index.submitEvent(message, {sourcetype: sourcetype}, done);
                    },
                    function(eventInfo, index, done) {
                        assert.ok(eventInfo);
                        assert.strictEqual(eventInfo.sourcetype, sourcetype);
                        assert.strictEqual(eventInfo.bytes, message.length);
                        assert.strictEqual(eventInfo.index, indexName);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    });

    describe('User Tests', function() {
        before(function(){
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
        })

        afterEach(function(){
            this.service.logout();
        })

        it("Callback#Current user", function(done) {
            var service = this.service;

            service.currentUser(function(err, user) {
                assert.ok(!err);
                assert.ok(user);
                assert.strictEqual(user.name, service.username);
                done();
            });
        });

        it("Callback#Current user fails", function(done) {
            var service = this.loggedOutService;

            service.currentUser(function(err, user) {
                assert.ok(err);
                done();
            });
        });

        it("Callback#List users", function(done) {
            var service = this.service;

            service.users().fetch(function(err, users) {
                var userList = users.list();
                assert.ok(!err);
                assert.ok(users);

                assert.ok(userList);
                assert.ok(userList.length > 0);
                done();
            });
        });

        it("Callback#create user failure", function(done) {
            this.loggedOutService.users().create(
                {name: "jssdk_testuser", password: "abcdefg!", roles: "user"},
                function(err, response) {
                    assert.ok(err);
                    done();
                }
            );
        });

        it("Callback#Create + update + delete user", function(done) {
            var service = this.service;
            var name = "jssdk_testuser";

            Async.chain([
                    function(done) {
                        service.users().create({name: "jssdk_testuser", password: "abcdefg!", roles: "user"}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.name, name);
                        assert.strictEqual(user.properties().roles.length, 1);
                        assert.strictEqual(user.properties().roles[0], "user");

                        user.update({realname: "JS SDK", roles: ["admin", "user"]}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.properties().realname, "JS SDK");
                        assert.strictEqual(user.properties().roles.length, 2);
                        assert.strictEqual(user.properties().roles[0], "admin");
                        assert.strictEqual(user.properties().roles[1], "user");

                        user.remove(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

        it("Callback#Roles", function(done) {
            var service = this.service;
            var name = "jssdk_testuser_" + getNextId();

            Async.chain([
                    function(done) {
                        service.users().create({name: name, password: "abcdefg!", roles: "user"}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.name, name);
                        assert.strictEqual(user.properties().roles.length, 1);
                        assert.strictEqual(user.properties().roles[0], "user");

                        user.update({roles: ["admin", "user"]}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.properties().roles.length, 2);
                        assert.strictEqual(user.properties().roles[0], "admin");
                        assert.strictEqual(user.properties().roles[1], "user");

                        user.update({roles: "user"}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.properties().roles.length, 1);
                        assert.strictEqual(user.properties().roles[0], "user");

                        user.update({roles: "__unknown__"}, done);
                    }
                ],
                function(err) {
                    assert.ok(err);
                    assert.strictEqual(err.status, 400);
                    done();
                }
            );
        });

        it("Callback#Passwords", function(done) {
            var service = this.service;
            var newService = null;
            var name = "jssdk_testuser_" + getNextId();

            var firstPassword = "abcdefg!";
            var secondPassword = "hijklmn!";

            var useOldPassword = false;

            Async.chain([
                    function (done) {
                        service.serverInfo(done);
                    },
                    function (info, done) {
                        var versionParts = info.properties().version.split(".");

                        var isDevBuild = versionParts.length === 1;
                        var newerThan72 = (parseInt(versionParts[0], 10) > 7 ||
                                           (parseInt(versionParts[0], 10) === 7 && parseInt(versionParts[1], 10) >= 2));

                        if (isDevBuild || newerThan72) {
                            useOldPassword = true;
                        }
                        done();
                    },
                    function(done) {
                        service.users().create({name: name, password: firstPassword, roles: "user"}, done);
                    },
                    function(user, done) {
                        assert.ok(user);
                        assert.strictEqual(user.name, name);
                        assert.strictEqual(user.properties().roles.length, 1);
                        assert.strictEqual(user.properties().roles[0], "user");

                        newService = new splunkjs.Service(service.http, {
                            username: name,
                            password: firstPassword,
                            host: service.host,
                            port: service.port,
                            scheme: service.scheme,
                            version: service.version
                        });

                        newService.login(Async.augment(done, user));
                    },
                    function(success, user, done) {
                        assert.ok(success);
                        assert.ok(user);

                        var body = {
                            password: secondPassword
                        };
                        if (useOldPassword) {
                            body['oldpassword'] = firstPassword;
                        }

                        user.update(body, done);
                    },
                    function(user, done) {
                        newService.login(function(err, success) {
                            assert.ok(err);
                            assert.ok(!success);

                            var body = {
                                password: firstPassword
                            };
                            if (useOldPassword) {
                                body['oldpassword'] = secondPassword;
                            }

                            user.update(body, done);
                        });
                    },
                    function(user, done) {
                        assert.ok(user);
                        newService.login(done);
                    }
                ],
                function(err) {
                    assert.ok(!err, JSON.stringify(err));
                    done();
                }
            );
        });

        it("Callback#delete test users", function(done) {
            var users = this.service.users();
            users.fetch(function(err, users) {
                var userList = users.list();

                Async.parallelEach(
                    userList,
                    function(user, idx, callback) {
                        if (utils.startsWith(user.name, "jssdk_")) {
                            user.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function(err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
        });
    });

    describe('Server Info Tests', function() {
        before(function(){
            this.service = svc;
        })

        afterEach(function(){
            this.service.logout();
        })

        it("Callback#Basic", function(done) {
            var service = this.service;

            service.serverInfo(function(err, info) {
                assert.ok(!err);
                assert.ok(info);
                assert.strictEqual(info.name, "server-info");
                assert.ok(info.properties().hasOwnProperty("version"));
                assert.ok(info.properties().hasOwnProperty("serverName"));
                assert.ok(info.properties().hasOwnProperty("os_version"));

                done();
            });
        });
    });

    describe('View Info Tests', function() {
        before(function(){
            this.service = svc;
        })

        it("Callback#List views", function(done) {
            var service = this.service;
    
            service.views({owner: "admin", app: "search"}).fetch(function(err, views) {
                assert.ok(!err);
                assert.ok(views);
    
                var viewsList = views.list();
                assert.ok(viewsList);
                assert.ok(viewsList.length > 0);
    
                for(var i = 0; i < viewsList.length; i++) {
                    assert.ok(viewsList[i]);
                }
    
                done();
            });
        });
    
        it("Callback#Create + update + delete view", function(done) {
            var service = this.service;
            var name = "jssdk_testview";
            var originalData = "<view/>";
            var newData = "<view isVisible='false'></view>";
    
            Async.chain([
                    function(done) {
                        service.views({owner: "admin", app: "sdk-app-collection"}).create({name: name, "eai:data": originalData}, done);
                    },
                    function(view, done) {
                        assert.ok(view);
    
                        assert.strictEqual(view.name, name);
                        assert.strictEqual(view.properties()["eai:data"], originalData);
    
                        view.update({"eai:data": newData}, done);
                    },
                    function(view, done) {
                        assert.ok(view);
                        assert.strictEqual(view.properties()["eai:data"], newData);
    
                        view.remove(done);
                    }
                ],
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });
    });

    describe('Parser Tests', function() {
        before(function(){
            this.service = svc;
        })

        it("Callback#Basic parse", function(done) {
            var service = this.service;

            service.parse("search index=_internal | head 1", function(err, parse) {
                assert.ok(!err);
                assert.ok(parse);
                assert.ok(parse.commands.length > 0);
                done();
            });
        });

        it("Callback#Parse error", function(done) {
            var service = this.service;

            service.parse("ABCXYZ", function(err, parse) {
                assert.ok(err);
                assert.strictEqual(err.status, 400);
                done();
            });
        });

    });

    describe('Typeheads Tests', function() {
        before(function(){
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
        })

        it("Callback#Typeahead failure", function(done) {
            var service = this.loggedOutService;
            service.typeahead("index=", 1, function(err, options) {
                assert.ok(err);
                done();
            });
        });

        it("Callback#Basic typeahead", function(done) {
            var service = this.service;

            service.typeahead("index=", 1, function(err, options) {
                assert.ok(!err);
                assert.ok(options);
                assert.strictEqual(options.length, 1);
                assert.ok(options[0]);
                done();
            });
        });

        it("Typeahead with omitted optional arguments", function(done) {
            var service = this.service;
            service.typeahead("index=", function(err, options) {
                assert.ok(!err);
                assert.ok(options);
                done();
            });
        });

    });

    describe('Endpoints Tests', function() {
        before(function(){
            this.service = svc;
        })

        it("Throws on null arguments to init", function(done) {
            var service = this.service;
            assert.throws(function() {
                var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
            });
            assert.throws(function() {
                var endpoint = new splunkjs.Service.Endpoint(service, null);
            });
            done();
        });

        it("Endpoint delete on a relative path", function(done) {
            var service = this.service;
            var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
            endpoint.del("search/jobs/12345", {}, function() { done();});
        });

        it("Methods of Resource to be overridden", function(done) {
            var service = this.service;
            var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
            assert.throws(function() { resource.path(); });
            assert.throws(function() { resource.fetch(); });
            assert.ok(splunkjs.Utils.isEmpty(resource.state()));
            done();
        });
    });

    describe('Entity Tests', function() {
        before(function(){
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
        })

        it("Accessors function properly", function(done) {
            var entity = new splunkjs.Service.Entity(
                this.service,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity._load(
                {acl: {owner: "boris", app: "factory", sharing: "app"},
                    links: {link1: 35},
                    published: "meep",
                    author: "Hilda"}
            );
            assert.ok(entity.acl().owner === "boris");
            assert.ok(entity.acl().app === "factory");
            assert.ok(entity.acl().sharing === "app");
            assert.ok(entity.links().link1 === 35);
            assert.strictEqual(entity.author(), "Hilda");
            assert.strictEqual(entity.published(), "meep");
            done();
        });

        it("Refresh throws error correctly", function(done) {
            var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
            entity.fetch({}, function(err) { assert.ok(err); done();});
        });

        it("Cannot update name of entity", function(done) {
            var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
            assert.throws(function() { entity.update({name: "asdf"});});
            done();
        });

        it("Disable throws error correctly", function(done) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity.disable(function(err) { assert.ok(err); done();});
        });

        it("Enable throws error correctly", function(done) {
            var entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                {owner: "boris", app: "factory", sharing: "app"}
            );
            entity.enable(function(err) { assert.ok(err); done();});
        });

        it("Does reload work?", function(done) {
            var idx = new splunkjs.Service.Index(
                this.service,
                "data/indexes/sdk-test",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            var name = "jssdk_testapp_" + getNextId();
            var apps = this.service.apps();

            var that = this;
            Async.chain(
                function(done) {
                    apps.create({name: name}, done);
                },
                function(app, done) {
                    app.reload(function(err) {
                        assert.ok(!err);
                        done(null, app);
                    });
                },
                function(app, done) {
                    var app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                    app2.reload(function(err) {
                        assert.ok(err);
                        done(null, app);
                    });
                },
                function(app, done) {
                    app.remove(done);
                },
                function(err) {
                    assert.ok(!err);
                    done();
                }
            );
        });

    });

    describe('Collections Tests', function() {
        before(function(){
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
        })

        it("Methods to be overridden throw", function(done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {owner: "admin",
                    app: "search",
                    sharing: "app"}
            );
            assert.throws(function() {
                coll.instantiateEntity({});
            });
            done();
        });

        it("Accessors work", function(done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {owner: "admin",
                    app: "search",
                    sharing: "app"}
            );
            coll._load({links: "Hilda", updated: true});
            assert.strictEqual(coll.links(), "Hilda");
            assert.ok(coll.updated());
            done();
        });

        it("Contains throws without a good id", function(done) {
            var coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            assert.throws(function() { coll.item(null);});
            done();
        });

    });
    

});