
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

exports.setup = function(svc, loggedOutSvc) {
    var splunkjs    = require('../index');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    var suite = {
        "Namespace Tests": {
            setUp: function(finished) {
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
                        function(done) {
                            apps.create({name: appName1}, done);
                        },
                        function(app1, done) {
                            that.app1 = app1;
                            that.appName1 = appName1;
                            apps.create({name: appName2}, done);
                        },
                        function(app2, done) {
                            that.app2 = app2;
                            that.appName2 = appName2;
                            users.create({name: userName1, password: "abc", roles: ["user"]}, done);
                        },
                        function(user1, done) {
                            that.user1 = user1;
                            that.userName1 = userName1;
                            users.create({name: userName2, password: "abc", roles: ["user"]}, done);
                        },
                        function(user2, done) {
                            that.user2 = user2;
                            that.userName2 = userName2;

                            done();
                        }
                    ],
                    function(err) {
                        finished();
                    }
                );
            },

            "Callback#Namespace protection": function(test) {
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
                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);

                            // Make sure the saved search doesn't exist in the 11 namespace
                            test.ok(!entity21);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Namespace item": function(test) {
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
                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);
                            test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                            test.strictEqual(entity11.namespace.app, that.namespace11.app);

                            // Ensure that the saved search exists in the 21 namespace
                            test.ok(entity21);
                            test.strictEqual(entity21.name, searchName);
                            test.strictEqual(entity21.properties().search, search);
                            test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                            test.strictEqual(entity21.namespace.app, that.namespace21.app);

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
                                test.ok(false);
                            }
                            catch(err) {
                                test.ok(err);
                            }

                            // Ensure that we can't get the item using wildcard namespaces.
                            try{
                                savedSearches_1.item(searchName, {owner:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

                            try{
                                savedSearches_1.item(searchName, {app:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

                            try{
                                savedSearches_1.item(searchName, {app:'-', owner:'-'});
                                test.ok(false);
                            }
                            catch(err){
                                test.ok(err);
                            }

                            // Ensure we get the right entities from the -/1 namespace when we
                            // specify it.
                            var entity11 = savedSearches_1.item(searchName, that.namespace11);
                            var entity21 = savedSearches_1.item(searchName, that.namespace21);

                            test.ok(entity11);
                            test.strictEqual(entity11.name, searchName);
                            test.strictEqual(entity11.properties().search, search);
                            test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
                            test.strictEqual(entity11.namespace.app, that.namespace11.app);

                            test.ok(entity21);
                            test.strictEqual(entity21.name, searchName);
                            test.strictEqual(entity21.properties().search, search);
                            test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
                            test.strictEqual(entity21.namespace.app, that.namespace21.app);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#delete test applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    test.ok(!err);
                    test.ok(apps);
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
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            },

            "Callback#delete test users": function(test) {
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
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },

        "Job Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Create+abort job": function(test) {
                var service = this.service;
                Async.chain([
                    function(done){
                        var app_name = process.env.SPLUNK_HOME + ('/etc/apps/sdk-app-collection/build/sleep_command.tar');
                        // Fix path on Windows if $SPLUNK_HOME contains a space (ex: C:/Program%20Files/Splunk)
                        app_name = app_name.replace("%20", " ");
                        service.post("apps/appinstall", {update:1, name:app_name}, done);
                    },
                    function(done){
                        var sid = getNextId();
                        var options = {id: sid};
                        var jobs = service.jobs({app: "sdk-app-collection"});
                        var req = jobs.oneshotSearch('search index=_internal | head 1 | sleep 10', options, function(err, job) {
                            test.ok(err);
                            test.ok(!job);
                            test.strictEqual(err.error, "abort");
                            test.done();
                        });

                        Async.sleep(1000, function(){
                            req.abort();
                        });
                    }
                ],
                function(err){
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#Create+cancel job": function(test) {
                var sid = getNextId();
                this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    job.cancel(function() {
                        test.done();
                    });
                });
            },

            "Callback#Create job error": function(test) {
                var sid = getNextId();
                this.service.jobs().search({search: 'index=_internal | head 1', id: sid}, function(err) {
                    test.ok(!!err);
                    test.done();
                });
            },

            "Callback#List jobs": function(test) {
                this.service.jobs().fetch(function(err, jobs) {
                    test.ok(!err);
                    test.ok(jobs);

                    var jobsList = jobs.list();
                    test.ok(jobsList.length > 0);

                    for(var i = 0; i < jobsList.length; i++) {
                        test.ok(jobsList[i]);
                    }

                    test.done();
                });
            },

            "Callback#Contains job": function(test) {
                var that = this;
                var sid = getNextId();
                var jobs = this.service.jobs();

                jobs.search('search index=_internal | head 1', {id: sid}, function(err, job) {
                    test.ok(!err);
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    jobs.fetch(function(err, jobs) {
                        test.ok(!err);
                        var job = jobs.item(sid);
                        test.ok(job);

                        job.cancel(function() {
                            test.done();
                        });
                    });
                });
            },

            "Callback#job results": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
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
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job events": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
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
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, results.rows[0].length);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job results preview": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
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
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job results iterator": function(test) {
                var that = this;

                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 10', {}, done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
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
                                    test.deepEqual(pageSizes, [4,4,2]);
                                    done(err);
                                }
                            );
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Enable + disable preview": function(test) {
                var that = this;
                var sid = getNextId();

                var service = this.service.specialize("nobody", "sdk-app-collection");

                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
                        },
                        function(job, done) {
                            job.enablePreview(done);

                        },
                        function(job, done) {
                            job.disablePreview(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pause + unpause + finalize preview": function(test) {
                var that = this;
                var sid = getNextId();

                var service = this.service.specialize("nobody", "sdk-app-collection");

                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.pause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(job.properties()["isPaused"]);
                            job.unpause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return !j.properties()["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(!job.properties()["isPaused"]);
                            job.finalize(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Set TTL": function(test) {
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
                            test.ok(ttl > originalTTL);
                            test.ok(ttl <= (originalTTL*2));
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Set priority": function(test) {
                var sid = getNextId();
                var originalPriority = 0;
                var that = this;

                var service = this.service.specialize("nobody", "sdk-app-collection");

                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.track({}, {
                                ready: function(job) {
                                    done(null, job);
                                }
                            });
                        },
                        function(job, done) {
                            var priority = job.properties()["priority"];
                            test.ok(priority, 5);
                            job.setPriority(priority + 1, done);
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Search log": function(test) {
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
                            test.ok(job);
                            test.ok(log);
                            test.ok(log.length > 0);
                            test.ok(log.split("\r\n").length > 0);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Search summary": function(test) {
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
                            test.ok(job);
                            test.ok(summary);
                            test.strictEqual(summary.event_count, 1);
                            test.strictEqual(summary.fields.foo.count, 1);
                            test.strictEqual(summary.fields.foo.distinct_count, 1);
                            test.ok(summary.fields.foo.is_exact, 1);
                            test.strictEqual(summary.fields.foo.modes.length, 1);
                            test.strictEqual(summary.fields.foo.modes[0].count, 1);
                            test.strictEqual(summary.fields.foo.modes[0].value, "bar");
                            test.ok(summary.fields.foo.modes[0].is_exact);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Search timeline": function(test) {
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
                            test.ok(job);
                            test.ok(timeline);
                            test.strictEqual(timeline.buckets.length, 1);
                            test.strictEqual(timeline.event_count, 1);
                            test.strictEqual(timeline.buckets[0].available_count, 1);
                            test.strictEqual(timeline.buckets[0].duration, 0.001);
                            test.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
                            test.strictEqual(timeline.buckets[0].total_count, 1);
                            test.ok(timeline.buckets[0].is_finalized);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Touch": function(test) {
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
                            test.ok(job);
                            originalTime = job.properties().updated;
                            Async.sleep(1200, function() { job.touch(done); });
                        },
                        function(job, done) {
                            job.fetch(done);
                        },
                        function(job, done) {
                            test.ok(originalTime !== job.updated());
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create failure": function(test) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var jobs = this.service.jobs();
                test.throws(function() {jobs.create({search: originalSearch, name: name, exec_mode: "oneshot"}, function() {});});
                test.done();
            },

            "Callback#Create fails with no search string": function(test) {
                var jobs = this.service.jobs();
                jobs.create(
                    "", {},
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";

                Async.chain([
                        function(done) {
                            that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Oneshot search with no results": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";

                Async.chain([
                        function(done) {
                            var query = 'search index=history MUST_NOT_EXISTABCDEF';
                            that.service.jobs().oneshotSearch(query, {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.strictEqual(results.fields.length, 0);
                            test.strictEqual(results.rows.length, 0);
                            test.ok(!results.preview);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Service oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                var splunkVersion = 6.1; // Default to pre-6.2 version
                var originalLoggerLevel = "DEBUG";

                Async.chain([
                        function(done) {
                            // If running on Splunk 6.2+, first set the search logger level to DEBUG
                            Async.chain([
                                    function(done1) {
                                        that.service.serverInfo(done1);
                                    },
                                    function(info, done1) {
                                        splunkVersion = parseFloat(info.properties().version);
                                        if (splunkVersion < 6.2) {
                                            done(); // Exit the inner Async.chain
                                        }
                                        else {
                                            done1();
                                        }
                                    },
                                    function(done1) {
                                        that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
                                    },
                                    function(confs, done1) {
                                        try {
                                            confs.item("limits").fetch(done1);
                                        }
                                        catch(e) {
                                            done1(e);
                                        }
                                    },
                                    function(conf, done1) {
                                        var searchInfo = conf.item("search_info");
                                        // Save this so it can be restored later
                                        originalLoggerLevel = searchInfo.properties()["infocsv_log_level"];
                                        searchInfo.update({"infocsv_log_level": "DEBUG"}, done1);
                                    },
                                    function(conf, done1) {
                                        test.strictEqual("DEBUG", conf.properties()["infocsv_log_level"]);
                                        done1();
                                    }
                                ],
                                function(err) {
                                    test.ok(!err);
                                    done();
                                }
                            );
                        },
                        function(done) {
                            that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");
                            test.ok(results.messages[1].text.indexOf('owner="admin"'));
                            test.ok(results.messages[1].text.indexOf('app="search"'));

                            done();
                        },
                        function(done) {
                            Async.chain([
                                    function(done1) {
                                        if (splunkVersion < 6.2) {
                                            done(); // Exit the inner Async.chain
                                        }
                                        else {
                                            done1();
                                        }
                                    },
                                    function(done1) {
                                        that.service.configurations({owner: "admin", app: "search"}).fetch(done1);
                                    },
                                    function(confs, done1) {
                                        try {
                                            confs.item("limits").fetch(done1);
                                        }
                                        catch(e) {
                                            done1(e);
                                        }
                                    },
                                    function(conf, done1) {
                                        var searchInfo = conf.item("search_info");
                                        // Restore the logger level from before
                                        searchInfo.update({"infocsv_log_level": originalLoggerLevel}, done1);
                                    },
                                    function(conf, done1) {
                                        test.strictEqual(originalLoggerLevel, conf.properties()["infocsv_log_level"]);
                                        done1();
                                    }
                                ],
                                function(err) {
                                    test.ok(!err);
                                    done();
                                }
                            );
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Service search": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                        function(done) {
                            that.service.search('search index=_internal | head 1 | stats count', {id: sid}, namespace, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            test.strictEqual(job.namespace, namespace);
                            tutils.pollUntil(
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
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Wait until job done": function(test) {
                this.service.search('search index=_internal | head 1000', {}, function(err, job) {
                    test.ok(!err);

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function(job) {
                            test.ok(job);

                            numReadyEvents++;
                        },
                        progress: function(job) {
                            test.ok(job);

                            numProgressEvents++;
                        },
                        done: function(job) {
                            test.ok(job);

                            test.ok(numReadyEvents === 1);      // all done jobs must have become ready
                            test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            test.done();
                        },
                        failed: function(job) {
                            test.ok(job);

                            test.ok(false, "Job failed unexpectedly.");
                            test.done();
                        },
                        error: function(err) {
                            test.ok(err);

                            test.ok(false, "Error while tracking job.");
                            test.done();
                        }
                    });
                });
            },

            "Callback#Wait until job failed": function(test) {
                this.service.search('search index=_internal | head bogusarg', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function(job) {
                            test.ok(job);

                            numReadyEvents++;
                        },
                        progress: function(job) {
                            test.ok(job);

                            numProgressEvents++;
                        },
                        done: function(job) {
                            test.ok(job);

                            test.ok(false, "Job became done unexpectedly.");
                            test.done();
                        },
                        failed: function(job) {
                            test.ok(job);

                            test.ok(numReadyEvents === 1);      // even failed jobs become ready
                            test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            test.done();
                        },
                        error: function(err) {
                            test.ok(err);

                            test.ok(false, "Error while tracking job.");
                            test.done();
                        }
                    });
                });
            },

            "Callback#track() with default params and one function": function(test) {
                this.service.search('search index=_internal | head 1', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    job.track({}, function(job) {
                        test.ok(job);
                        test.done();
                    });
                });
            },

            "Callback#track() should stop polling if only the ready callback is specified": function(test) {
                this.service.search('search index=_internal | head 1', {}, function(err, job) {
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }

                    job.track({}, {
                        ready: function(job) {
                            test.ok(job);
                        },

                        _stoppedAfterReady: function(job) {
                            test.done();
                        }
                    });
                });
            },

            "Callback#track() a job that is not immediately ready": function(test) {
                /*jshint loopfunc:true */
                var numJobs = 20;
                var numJobsLeft = numJobs;
                var gotJobNotImmediatelyReady = false;
                for (var i = 0; i < numJobs; i++) {
                    this.service.search('search index=_internal | head 10000', {}, function(err, job) {
                        if (err) {
                            test.ok(!err);
                            test.done();
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
                                    test.done();
                                }
                            }
                        });
                    });
                }
            },

            "Callback#Service.getJob() works": function(test) {
                var that = this;
                var sidsMatch = false;
                this.service.search('search index=_internal | head 1', {}, function(err, job){
                    if (err) {
                        test.ok(!err);
                        test.done();
                        return;
                    }
                    var sid = job.sid;
                    return Async.chain([
                            function(done) {
                                that.service.getJob(sid, done);
                            },
                            function(innerJob, done) {
                                test.strictEqual(sid, innerJob.sid);
                                sidsMatch = sid === innerJob.sid;
                                done();
                            }
                        ],
                        function(err) {
                            test.ok(!err);
                            test.ok(sidsMatch);
                            test.done();
                        }
                    );
                });
            }
        },

        "Data Model tests": {
            setUp: function(done) {
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
            },

            "Callback#DataModels - fetch a built-in data model": function(test) {
                if (this.skip) {
                    test.done();
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
                            test.ok(dm.objectByName("Audit"));
                            test.ok(dm.objectByName("searches"));
                            test.ok(dm.objectByName("modify"));

                            // Check for an object that shouldn't exist
                            test.strictEqual(null, dm.objectByName(getNextId()));
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create & delete an empty data model": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var initialSize;
                var that = this;
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
                            test.strictEqual(initialSize + 1, dataModels.list().length);
                            // Delete the data model we just created, by name.
                            dataModels.item(name).remove(done);
                        },
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Make sure we have as many data models as we started with
                            test.strictEqual(initialSize, dataModels.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with spaces in the name, which are swapped for -'s": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me- " + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name.replace(" ", "_"), dataModel.name);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 0 objects": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 0 objects before fetch
                            test.strictEqual(0, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 0 objects after fetch
                            test.strictEqual(0, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 1 search object": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var dataModels = this.service.dataModels();


                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_one_search.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 1 object before fetch
                            test.strictEqual(1, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 1 object after fetch
                            test.strictEqual(1, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create a data model with 2 search objects": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 2 objects before fetch
                            test.strictEqual(2, dataModel.objects.length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 2 objects after fetch
                            test.strictEqual(2, dataModels.item(name).objects.length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - data model objects are created correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.ok(dataModel.hasObject("search1"));
                            test.ok(dataModel.hasObject("search2"));

                            var search1 = dataModel.objectByName("search1");
                            test.ok(search1);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 1", search1.displayName);

                            var search2 = dataModel.objectByName("search2");
                            test.ok(search2);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 2", search2.displayName);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - data model handles unicode characters": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_unicode_headers.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            test.strictEqual("·Ä©·öô‡Øµ", dataModel.displayName);
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ", dataModel.description);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create data model with empty headers": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_empty_headers.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            test.strictEqual("", dataModel.displayName);
                            test.strictEqual("", dataModel.description);

                            // Make sure we're not getting a summary of the data model
                            test.strictEqual("0", dataModel.concise);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test acceleration settings": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.acceleration.enabled = true;
                            dataModel.acceleration.earliestTime = "-2mon";
                            dataModel.acceleration.cronSchedule = "5/* * * * *";

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual(true, dataModel.acceleration.enabled);
                            test.strictEqual("-2mon", dataModel.acceleration.earliestTime);
                            test.strictEqual("5/* * * * *", dataModel.acceleration.cronSchedule);
                            test.same({enabled: true, earliestTime: "-2mon", cronSchedule: "5/* * * * *"}, dataModel.acceleration);

                            dataModel.acceleration.enabled = false;
                            dataModel.acceleration.earliestTime = "-1mon";
                            dataModel.acceleration.cronSchedule = "* * * * *";

                            test.strictEqual(false, dataModel.isAccelerated());
                            test.strictEqual(false, dataModel.acceleration.enabled);
                            test.strictEqual("-1mon", dataModel.acceleration.earliestTime);
                            test.strictEqual("* * * * *", dataModel.acceleration.cronSchedule);
                            test.same({enabled: false, earliestTime: "-1mon", cronSchedule: "* * * * *"}, dataModel.acceleration);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object metadata": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            test.strictEqual("event1 ·Ä©·öô", obj.displayName);
                            test.strictEqual("event1", obj.name);
                            test.same(dataModel, obj.dataModel);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object parent": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            test.ok(obj);
                            test.ok(!obj.parent());

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object lineage": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_0");
                            test.ok(obj);
                            test.strictEqual(1, obj.lineage.length);
                            test.strictEqual("level_0", obj.lineage[0]);
                            test.strictEqual("BaseEvent", obj.parentName);

                            obj = dataModel.objectByName("level_1");
                            test.ok(obj);
                            test.strictEqual(2, obj.lineage.length);
                            test.same(["level_0", "level_1"], obj.lineage);
                            test.strictEqual("level_0", obj.parentName);

                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            test.strictEqual(3, obj.lineage.length);
                            test.same(["level_0", "level_1", "level_2"], obj.lineage);
                            test.strictEqual("level_1", obj.parentName);

                            // Make sure there's no extra children
                            test.ok(!dataModel.objectByName("level_3"));

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object fields": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_2");
                            test.ok(obj);

                            var timeField = obj.fieldByName("_time");
                            test.ok(timeField);
                            test.strictEqual("timestamp", timeField.type);
                            test.ok(timeField.isTimestamp());
                            test.ok(!timeField.isNumber());
                            test.ok(!timeField.isString());
                            test.ok(!timeField.isObjectcount());
                            test.ok(!timeField.isChildcount());
                            test.ok(!timeField.isIPv4());
                            test.same(["BaseEvent"], timeField.lineage);
                            test.strictEqual("_time", timeField.name);
                            test.strictEqual(false, timeField.required);
                            test.strictEqual(false, timeField.multivalued);
                            test.strictEqual(false, timeField.hidden);
                            test.strictEqual(false, timeField.editable);
                            test.strictEqual(null, timeField.comment);

                            var lvl2 = obj.fieldByName("level_2");
                            test.strictEqual("level_2", lvl2.owner);
                            test.same(["level_0", "level_1", "level_2"], lvl2.lineage);
                            test.strictEqual("objectCount", lvl2.type);
                            test.ok(!lvl2.isTimestamp());
                            test.ok(!lvl2.isNumber());
                            test.ok(!lvl2.isString());
                            test.ok(lvl2.isObjectcount());
                            test.ok(!lvl2.isChildcount());
                            test.ok(!lvl2.isIPv4());
                            test.strictEqual("level_2", lvl2.name);
                            test.strictEqual("level 2", lvl2.displayName);
                            test.strictEqual(false, lvl2.required);
                            test.strictEqual(false, lvl2.multivalued);
                            test.strictEqual(false, lvl2.hidden);
                            test.strictEqual(false, lvl2.editable);
                            test.strictEqual(null, lvl2.comment);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model object properties": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);
                            test.strictEqual(5, obj.fieldNames().length);
                            test.strictEqual(10, obj.allFieldNames().length);
                            test.ok(obj.fieldByName("has_boris"));
                            test.ok(obj.hasField("has_boris"));
                            test.ok(obj.fieldByName("_time"));
                            test.ok(obj.hasField("_time"));

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create local acceleration job": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);

                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            test.ok(job);

                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - create local acceleration job with earliest time": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var oldNow = Date.now();
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            obj.createLocalAccelerationJob("-1d", done);
                        },
                        function(job, done) {
                            test.ok(job);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);

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
                            test.ok(utils.startsWith(job._state.content.earliestTime, expectedDate));

                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model constraints": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);
                            var constraints = obj.constraints;
                            test.ok(constraints);
                            var onlyOne = true;

                            for (var i = 0; i < constraints.length; i++) {
                                var constraint = constraints[i];
                                test.ok(!!onlyOne);

                                test.strictEqual("event1", constraint.owner);
                                test.strictEqual("uri=\"*.php\" OR uri=\"*.py\"\nNOT (referer=null OR referer=\"-\")", constraint.query);
                            }

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - test data model calculations, and the different types": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            var calculations = obj.calculations;
                            test.strictEqual(4, Object.keys(calculations).length);
                            test.strictEqual(4, obj.calculationIDs().length);

                            var evalCalculation = calculations["93fzsv03wa7"];
                            test.ok(evalCalculation);
                            test.strictEqual("event1", evalCalculation.owner);
                            test.same(["event1"], evalCalculation.lineage);
                            test.strictEqual("Eval", evalCalculation.type);
                            test.ok(evalCalculation.isEval());
                            test.ok(!evalCalculation.isLookup());
                            test.ok(!evalCalculation.isGeoIP());
                            test.ok(!evalCalculation.isRex());
                            test.strictEqual(null, evalCalculation.comment);
                            test.strictEqual(true, evalCalculation.isEditable());
                            test.strictEqual("if(cidrmatch(\"192.0.0.0/16\", clientip), \"local\", \"other\")", evalCalculation.expression);

                            test.strictEqual(1, Object.keys(evalCalculation.outputFields).length);
                            test.strictEqual(1, evalCalculation.outputFieldNames().length);

                            var field = evalCalculation.outputFields["new_field"];
                            test.ok(field);
                            test.strictEqual("My New Field", field.displayName);

                            var lookupCalculation = calculations["sr3mc8o3mjr"];
                            test.ok(lookupCalculation);
                            test.strictEqual("event1", lookupCalculation.owner);
                            test.same(["event1"], lookupCalculation.lineage);
                            test.strictEqual("Lookup", lookupCalculation.type);
                            test.ok(lookupCalculation.isLookup());
                            test.ok(!lookupCalculation.isEval());
                            test.ok(!lookupCalculation.isGeoIP());
                            test.ok(!lookupCalculation.isRex());
                            test.strictEqual(null, lookupCalculation.comment);
                            test.strictEqual(true, lookupCalculation.isEditable());
                            test.same({lookupField: "a_lookup_field", inputField: "host"}, lookupCalculation.inputFieldMappings);
                            test.strictEqual(2, Object.keys(lookupCalculation.inputFieldMappings).length);
                            test.strictEqual("a_lookup_field", lookupCalculation.inputFieldMappings.lookupField);
                            test.strictEqual("host", lookupCalculation.inputFieldMappings.inputField);
                            test.strictEqual("dnslookup", lookupCalculation.lookupName);

                            var regexpCalculation = calculations["a5v1k82ymic"];
                            test.ok(regexpCalculation);
                            test.strictEqual("event1", regexpCalculation.owner);
                            test.same(["event1"], regexpCalculation.lineage);
                            test.strictEqual("Rex", regexpCalculation.type);
                            test.ok(regexpCalculation.isRex());
                            test.ok(!regexpCalculation.isLookup());
                            test.ok(!regexpCalculation.isEval());
                            test.ok(!regexpCalculation.isGeoIP());
                            test.strictEqual(2, regexpCalculation.outputFieldNames().length);
                            test.strictEqual("_raw", regexpCalculation.inputField);
                            test.strictEqual(" From: (?<from>.*) To: (?<to>.*) ", regexpCalculation.expression);

                            var geoIPCalculation = calculations["pbe9bd0rp4"];
                            test.ok(geoIPCalculation);
                            test.strictEqual("event1", geoIPCalculation.owner);
                            test.same(["event1"], geoIPCalculation.lineage);
                            test.strictEqual("GeoIP", geoIPCalculation.type);
                            test.ok(geoIPCalculation.isGeoIP());
                            test.ok(!geoIPCalculation.isLookup());
                            test.ok(!geoIPCalculation.isEval());
                            test.ok(!geoIPCalculation.isRex());
                            test.strictEqual("·Ä©·öô‡Øµ comment of pbe9bd0rp4", geoIPCalculation.comment);
                            test.strictEqual(5, geoIPCalculation.outputFieldNames().length);
                            test.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - run queries": function(test) {
                if (this.skip) {
                    test.done();
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
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.strictEqual("| datamodel internal_audit_logs searches search", job.properties().request.search);
                            job.cancel(done);
                        },
                        function(response, done) {
                            obj.startSearch({status_buckets: 5, enable_lookups: false}, "| head 3", done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties()["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.strictEqual("| datamodel internal_audit_logs searches search | head 3", job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - baseSearch is parsed correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("search1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseSearch", obj.parentName);
                            test.ok(obj.isBaseSearch());
                            test.ok(!obj.isBaseTransaction());
                            test.strictEqual("search index=_internal | head 10", obj.baseSearch);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#DataModels - baseTransaction is parsed correctly": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("transaction1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseTransaction", obj.parentName);
                            test.ok(obj.isBaseTransaction());
                            test.ok(!obj.isBaseSearch());
                            test.same(["event1"], obj.objectsToGroup);
                            test.same(["host", "from"], obj.groupByFields);
                            test.strictEqual("25s", obj.maxPause);
                            test.strictEqual("100m", obj.maxSpan);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Pivot tests": {
            setUp: function(done) {
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
            },

            "Callback#Pivot - test constructor args": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.ok(dataModel.objectByName("test_data"));
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test acceleration, then pivot": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.objectByName("test_data");
                            test.ok(dataModel);

                            dataModel.acceleration.enabled = true;
                            dataModel.acceleration.earliestTime = "-2mon";
                            dataModel.acceleration.cronSchedule = "0 */12 * * *";
                            dataModel.update(done);
                        },
                        function(dataModel, done) {
                            var props = dataModel.properties();

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual(true, !!dataModel.acceleration.enabled);
                            test.strictEqual("-2mon", dataModel.acceleration.earliest_time);
                            test.strictEqual("0 */12 * * *", dataModel.acceleration.cron_schedule);

                            var dataModelObject = dataModel.objectByName("test_data");
                            var pivotSpecification = dataModelObject.createPivotSpecification();

                            test.strictEqual(dataModelObject.dataModel.name, pivotSpecification.accelerationNamespace);

                            var name1 = "delete-me-" + getNextId();
                            pivotSpecification.setAccelerationJob(name1);
                            test.strictEqual("sid=" + name1, pivotSpecification.accelerationNamespace);

                            var namespaceTemp = "delete-me-" + getNextId();
                            pivotSpecification.accelerationNamespace = namespaceTemp;
                            test.strictEqual(namespaceTemp, pivotSpecification.accelerationNamespace);

                            pivotSpecification
                                .addCellValue("test_data", "Source Value", "count")
                                .run(done);
                        },
                        function(job, pivot, done) {
                            test.ok(job);
                            test.ok(pivot);
                            test.notStrictEqual("FAILED", job.properties().dispatchState);

                            job.track({}, function(job) {
                                test.ok(pivot.tstatsSearch);
                                test.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                                test.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                                test.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                                test.strictEqual(pivot.tstatsSearch, job.properties().request.search);
                                done(null, job);
                            });
                        },
                        function(job, done) {
                            test.ok(job);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test illegal filtering (all types)": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Boolean comparisons
                            try {
                                pivotSpecification.addFilter(getNextId(), "boolean", "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addFilter("_time", "boolean", "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add boolean filter on _time because it is of type timestamp");
                            }

                            // String comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "string", "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add string filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "string", "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // IPv4 comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "ipv4", "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add ipv4 filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "ipv4", "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Number comparisons
                            try {
                                pivotSpecification.addFilter("has_boris", "number", "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add number filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addFilter(getNextId(), "number", "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Limit filter
                            try {
                                pivotSpecification.addLimitFilter("has_boris", "host", "DEFAULT", 50, "count");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpecification.addLimitFilter(getNextId(), "host", "DEFAULT", 50, "count");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on a nonexistent field.");
                            }
                            try {
                                pivotSpecification.addLimitFilter("source", "host", "DEFAULT", 50, "sum");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found sum");
                            }
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "DEFAULT", 50, "duration");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found duration");
                            }
                            try {
                                pivotSpecification.addLimitFilter("test_data", "host", "DEFAULT", 50, "list");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type object count must be COUNT; found list");
                            }
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test boolean filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("has_boris", "boolean", "=", true);
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("comparator"));
                                test.ok(filter.hasOwnProperty("compareTo"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("has_boris", filter.fieldName);
                                test.strictEqual("boolean", filter.type);
                                test.strictEqual("=", filter.comparator);
                                test.strictEqual(true, filter.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test string filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("host", "string", "contains", "abc");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("comparator"));
                                test.ok(filter.hasOwnProperty("compareTo"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("host", filter.fieldName);
                                test.strictEqual("string", filter.type);
                                test.strictEqual("contains", filter.comparator);
                                test.strictEqual("abc", filter.compareTo);
                                test.strictEqual("BaseEvent", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test IPv4 filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("hostip", "ipv4", "startsWith", "192.168");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("comparator"));
                                test.ok(filter.hasOwnProperty("compareTo"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("hostip", filter.fieldName);
                                test.strictEqual("ipv4", filter.type);
                                test.strictEqual("startsWith", filter.comparator);
                                test.strictEqual("192.168", filter.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },

            "Callback#Pivot - test number filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addFilter("epsilon", "number", ">=", 2.3);
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("comparator"));
                                test.ok(filter.hasOwnProperty("compareTo"));
                                test.ok(filter.hasOwnProperty("owner"));

                                test.strictEqual("epsilon", filter.fieldName);
                                test.strictEqual("number", filter.type);
                                test.strictEqual(">=", filter.comparator);
                                test.strictEqual(2.3, filter.compareTo);
                                test.strictEqual("test_data", filter.owner);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },
            "Callback#Pivot - test limit filtering": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();
                            try {
                                pivotSpecification.addLimitFilter("epsilon", "host", "ASCENDING", 500, "average");
                                test.strictEqual(1, pivotSpecification.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpecification.filters[0];

                                test.ok(filter.hasOwnProperty("fieldName"));
                                test.ok(filter.hasOwnProperty("type"));
                                test.ok(filter.hasOwnProperty("owner"));
                                test.ok(filter.hasOwnProperty("attributeName"));
                                test.ok(filter.hasOwnProperty("attributeOwner"));
                                test.ok(filter.hasOwnProperty("limitType"));
                                test.ok(filter.hasOwnProperty("limitAmount"));
                                test.ok(filter.hasOwnProperty("statsFn"));

                                test.strictEqual("epsilon", filter.fieldName);
                                test.strictEqual("number", filter.type);
                                test.strictEqual("test_data", filter.owner);
                                test.strictEqual("host", filter.attributeName);
                                test.strictEqual("BaseEvent", filter.attributeOwner);
                                test.strictEqual("lowest", filter.limitType);
                                test.strictEqual(500, filter.limitAmount);
                                test.strictEqual("average", filter.statsFn);
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            done();
                        }
                    ],
                    function(err) {
                       test.ok(!err);
                       test.done();
                    }
                );
            },
            "Callback#Pivot - test row split": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for row split
                            try {
                                pivotSpecification.addRowSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpecification.addRowSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test row split, number
                            pivotSpecification.addRowSplit("epsilon", "My Label");
                            test.strictEqual(1, pivotSpecification.rows.length);

                            var row = pivotSpecification.rows[0];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("number", row.type);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("all", row.display);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    label: "My Label",
                                    display: "all"
                                },
                                row);

                            // Test row split, string
                            pivotSpecification.addRowSplit("host", "My Label");
                            test.strictEqual(2, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(!row.hasOwnProperty("display"));

                            test.strictEqual("host", row.fieldName);
                            test.strictEqual("BaseEvent", row.owner);
                            test.strictEqual("string", row.type);
                            test.strictEqual("My Label", row.label);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeRowSplit(field, "Break Me!", {start: 0, end: 100, step:20, limit:5});
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range row split
                            pivotSpecification.addRangeRowSplit("epsilon", "My Label", {start: 0, end: 100, step:20, limit:5});
                            test.strictEqual(3, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));
                            test.ok(row.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("number", row.type);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("ranges", row.display);

                            var ranges = {
                                start: 0,
                                end: 100,
                                size: 20,
                                maxNumberOf: 5
                            };
                            test.same(ranges, row.ranges);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanRowSplit(field, "Break Me!", "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean row split
                            pivotSpecification.addBooleanRowSplit("has_boris", "My Label", "is_true", "is_false");
                            test.strictEqual(4, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("trueLabel"));
                            test.ok(row.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual("boolean", row.type);
                            test.strictEqual("is_true", row.trueLabel);
                            test.strictEqual("is_false", row.falseLabel);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit(field, "Break Me!", "some binning");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampRowSplit("_time", "some label", "Bogus binning value");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }

                            // Test timestamp row split
                            pivotSpecification.addTimestampRowSplit("_time", "My Label", "day");
                            test.strictEqual(5, pivotSpecification.rows.length);

                            row = pivotSpecification.rows[pivotSpecification.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("period"));

                            test.strictEqual("_time", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("BaseEvent", row.owner);
                            test.strictEqual("timestamp", row.type);
                            test.strictEqual("day", row.period);
                            test.same({
                                    fieldName: "_time",
                                    label: "My Label",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                row);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test column split": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for column split
                            try {
                                pivotSpecification.addColumnSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpecification.addColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test column split, number
                            pivotSpecification.addColumnSplit("epsilon");
                            test.strictEqual(1, pivotSpecification.columns.length);

                            var col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("number", col.type);
                            test.strictEqual("all", col.display);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "all"
                                },
                                col);

                            // Test column split, string
                            pivotSpecification.addColumnSplit("host");
                            test.strictEqual(2, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("display"));

                            test.strictEqual("host", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual("string", col.type);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpecification.addRangeColumnSplit(field, {start: 0, end: 100, step:20, limit:5});
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range column split
                            pivotSpecification.addRangeColumnSplit("epsilon", {start: 0, end: 100, step:20, limit:5});
                            test.strictEqual(3, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));
                            test.ok(col.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("number", col.type);
                            test.strictEqual("ranges", col.display);
                            var ranges = {
                                start: "0",
                                end: "100",
                                size: "20",
                                maxNumberOf: "5"
                            };
                            test.same(ranges, col.ranges);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpecification.addBooleanColumnSplit(field, "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean column split
                            pivotSpecification.addBooleanColumnSplit("has_boris", "is_true", "is_false");
                            test.strictEqual(4, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("trueLabel"));
                            test.ok(col.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual("boolean", col.type);
                            test.strictEqual("is_true", col.trueLabel);
                            test.strictEqual("is_false", col.falseLabel);
                            test.same({
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
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }
                            try {
                                pivotSpecification.addTimestampColumnSplit("_time", "Bogus binning value");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Invalid binning Bogus binning value found. Valid values are: " + pivotSpecification._binning.join(", "));
                            }

                            // Test timestamp column split
                            pivotSpecification.addTimestampColumnSplit("_time", "day");
                            test.strictEqual(5, pivotSpecification.columns.length);

                            col = pivotSpecification.columns[pivotSpecification.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("period"));

                            test.strictEqual("_time", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual("timestamp", col.type);
                            test.strictEqual("day", col.period);
                            test.same({
                                    fieldName: "_time",
                                    owner: "BaseEvent",
                                    type: "timestamp",
                                    period: "day"
                                },
                                col);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test cell value": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpecification = obj.createPivotSpecification();

                            // Test error handling for cell value, string
                            try {
                                pivotSpecification.addCellValue("iDontExist", "Break Me!", "explosion");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field iDontExist");
                            }
                            try {
                                pivotSpecification.addCellValue("source", "Wrong Stats Function", "stdev");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }

                            // Add cell value, string
                            pivotSpecification.addCellValue("source", "Source Value", "dc");
                            test.strictEqual(1, pivotSpecification.cells.length);

                            var cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("source", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual("string", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("dc", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
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
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" +
                                    " list, distinct_values, first, last, count, or distinct_count; found stdev");
                            }

                            // Add cell value, IPv4
                            pivotSpecification.addCellValue("hostip", "Source Value", "dc");
                            test.strictEqual(2, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("hostip", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("ipv4", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("dc", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
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
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot use boolean valued fields as cell values.");
                            }

                            // Test error handling for cell value, number
                            try {
                                pivotSpecification.addCellValue("epsilon", "Wrong Stats Function", "latest");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on number field must be must be one of:" +
                                    " sum, count, average, max, min, stdev, list, or distinct_values; found latest");
                            }

                            // Add cell value, number
                            pivotSpecification.addCellValue("epsilon", "Source Value", "average");
                            test.strictEqual(3, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("epsilon", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("number", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("average", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
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
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on timestamp field must be one of:" +
                                    " duration, earliest, latest, list, or distinct values; found max");
                            }

                            // Add cell value, timestamp
                            pivotSpecification.addCellValue("_time", "Source Value", "earliest");
                            test.strictEqual(4, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("_time", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual("timestamp", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("earliest", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
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
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on childcount and objectcount fields " +
                                    "must be count; found " + "min");
                            }

                            // Add cell value, count
                            pivotSpecification.addCellValue("test_data", "Source Value", "count");
                            test.strictEqual(5, pivotSpecification.cells.length);

                            cell = pivotSpecification.cells[pivotSpecification.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("test_data", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual("objectCount", cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual("count", cell.value);
                            test.strictEqual(false, cell.sparkline);
                            test.same({
                                    fieldName: "test_data",
                                    owner: "test_data",
                                    type: "objectCount",
                                    label: "Source Value",
                                    value: "count",
                                    sparkline: false
                                }, cell);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot throws HTTP exception": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            obj.createPivotSpecification().pivot(done);
                        },
                        function(pivot, done) {
                            test.ok(false);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        var expectedErr = "In handler 'datamodelpivot': Error in 'PivotReport': Must have non-empty cells or non-empty rows.";
                        test.ok(utils.endsWith(err.message, expectedErr));
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot with simple namespace": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                }
                catch(err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    test.ok(!err);
                    test.done();
                }
                var that = this;
                var obj;
                var pivotSpecification;
                var adhocjob;
                Async.chain([
                        function(done) {
                           that.dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("test_data");
                            test.ok(obj);
                            obj.createLocalAccelerationJob(null, done);
                        },
                        function(job, done) {
                            adhocjob = job;
                            test.ok(job);
                            pivotSpecification = obj.createPivotSpecification();

                            pivotSpecification.addBooleanRowSplit("has_boris", "Has Boris", "meep", "hilda");
                            pivotSpecification.addCellValue("hostip", "Distinct IPs", "count");

                            // Test setting a job
                            pivotSpecification.setAccelerationJob(job);
                            test.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            test.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);

                            // Test setting a job's SID
                            pivotSpecification.setAccelerationJob(job.sid);
                            test.strictEqual("string", typeof pivotSpecification.accelerationNamespace);
                            test.strictEqual("sid=" + job.sid, pivotSpecification.accelerationNamespace);

                            pivotSpecification.pivot(done);
                        },
                        function(pivot, done) {
                            test.ok(pivot.tstatsSearch);
                            test.ok(pivot.tstatsSearch.length > 0);
                            test.strictEqual(0, pivot.tstatsSearch.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            test.strictEqual("| tstats", pivot.tstatsSearch.match("^\\| tstats")[0]);
                            test.strictEqual(1, pivot.tstatsSearch.match("^\\| tstats").length);

                            pivot.run(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().isDone;
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok("FAILED" !== job.properties().dispatchState);

                            test.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                            // This test won't work with utils.startsWith due to the regex escaping
                            test.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                            test.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                            adhocjob.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot column range split": function(test) {
                // This test is here because we had a problem with fields that were supposed to be
                // numbers being expected as strings in Splunk 6.0. This was fixed in Splunk 6.1, and accepts
                // either strings or numbers.

                if (this.skip) {
                    test.done();
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
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().isDone;
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.notStrictEqual("FAILED", job.properties().dispatchState);
                            // Make sure the job is run with the correct search query
                            test.strictEqual(search, job.properties().request.search);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#Pivot - test pivot with PivotSpecification.run and Job.track": function(test) {
                if (this.skip) {
                    test.done();
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
                                test.strictEqual(pivot.tstatsSearch || pivot.pivotSearch, job.properties().request.search);
                                done(null, job);
                            });
                        },
                        function(job, done) {
                            test.notStrictEqual("FAILED", job.properties().dispatchState);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            "Callback#DataModels - delete any remaining data models created by the SDK tests": function(test) {
                if (this.skip) {
                    test.done();
                    return;
                }
                svc.dataModels().fetch(function(err, dataModels) {
                    if (err) {
                        test.ok(!err);
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
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },

        "App Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#list applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    var appList = apps.list();
                    test.ok(appList.length > 0);
                    test.done();
                });
            },

            "Callback#contains applications": function(test) {
                var apps = this.service.apps();
                apps.fetch(function(err, apps) {
                    var app = apps.item("search");
                    test.ok(app);
                    test.done();
                });
            },

            "Callback#create + contains app": function(test) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                apps.create({name: name}, function(err, app) {
                    var appName = app.name;
                    apps.fetch(function(err, apps) {
                        var entity = apps.item(appName);
                        test.ok(entity);
                        app.remove(function() {
                            test.done();
                        });
                    });
                });
            },

            "Callback#create + modify app": function(test) {
                var DESCRIPTION = "TEST DESCRIPTION";
                var VERSION = "1.1";

                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();

                Async.chain([
                    function(callback) {
                        apps.create({name: name}, callback);
                    },
                    function(app, callback) {
                        test.ok(app);
                        test.strictEqual(app.name, name);
                        test.strictEqual(app.properties().version, "1.0");

                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function(app, callback) {
                        test.ok(app);
                        var properties = app.properties();

                        test.strictEqual(properties.description, DESCRIPTION);
                        test.strictEqual(properties.version, VERSION);

                        app.remove(callback);
                    }
                ], function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#delete test applications": function(test) {
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
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            },

            "list applications with cookies as authentication": function(test) {
                this.service.serverInfo(function (err, info) {
                    // Cookie authentication was added in splunk 6.2
                    var majorVersion = parseInt(info.properties().version.split(".")[0], 10);
                    var minorVersion = parseInt(info.properties().version.split(".")[1], 10);
                    // Skip cookie test if Splunk older than 6.2
                    if(majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                        splunkjs.Logger.log("Skipping cookie test...");
                        test.done();
                        return;
                    }

                    var service = new splunkjs.Service(
                    {
                        scheme: svc.scheme,
                        host: svc.host,
                        port: svc.port,
                        username: svc.username,
                        password: svc.password,
                        version: svc.version
                    });

                    var service2 = new splunkjs.Service(
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
                                test.ok(!utils.isEmpty(cookieStore));

                                // Add the cookies to a service with no other authenitcation information
                                service2.http._cookieStore = cookieStore;

                                var apps = service2.apps();
                                apps.fetch(done);
                            },
                            function (apps, done) {
                                var appList = apps.list();
                                test.ok(appList.length > 0);
                                test.ok(!utils.isEmpty(service2.http._cookieStore));
                                done();
                            }
                        ],
                        function(err) {
                            // Test that no errors were returned
                            test.ok(!err);
                            test.done();
                        });
                });
            }
        },

        "Saved Search Tests": {
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
                    var search = searches.item("Indexing workload");
                    test.ok(search);

                    test.done();
                });
            },

            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.fetch(function(err, searches) {
                    var search = searches.item("Indexing workload");
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
                app.setupInfo(function(err, content, search) {
                    test.ok(err.data.messages[0].text.match("Setup configuration file does not"));
                    splunkjs.Logger.log("ERR ---", err.data.messages[0].text);
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
        },

        "Fired Alerts Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;

                var indexes = this.service.indexes();
                done();
            },

            "Callback#create + verify emptiness + delete new alert group": function(test) {
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
                            test.ok(search);
                            test.strictEqual(search.alertCount(), 0);
                            search.history(done);
                        },
                        function(jobs, search, done) {
                            test.strictEqual(jobs.length, 0);
                            test.strictEqual(search.firedAlertGroup().count(), 0);
                            searches.service.firedAlertGroups().fetch( Async.augment(done, search) );
                        },
                        function(firedAlertGroups, originalSearch, done) {
                            test.strictEqual(firedAlertGroups.list().indexOf(originalSearch.name), -1);
                            done(null, originalSearch);
                        },
                        function(originalSearch, done) {
                            originalSearch.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#alert is triggered + test firedAlert entity -- FAILS INTERMITTENTLY": function(test) {
                var searches = this.service.savedSearches({owner: this.service.username});
                var indexName = "sdk-tests-alerts";
                var name = "jssdk_savedsearch_alert_" + getNextId();

                // Real-time search config
                var searchConfig = {
                    "name": name,
                    "search": "index="+indexName+" sourcetype=sdk-tests-alerts | head 1",
                    "alert_type": "always",
                    "alert.severity": "2",
                    "alert.suppress": "0",
                    "alert.track": "1",
                    "dispatch.earliest_time": "rt-1s",
                    "dispatch.latest_time": "rt",
                    "is_scheduled": "1",
                    "cron_schedule": "* * * * *"
                };

                Async.chain([
                        function(done) {
                            searches.create(searchConfig, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.strictEqual(search.alertCount(), 0);
                            test.strictEqual(search.firedAlertGroup().count(), 0);

                            var indexes = search.service.indexes();
                            indexes.create(indexName, {}, function(err, index) {
                                if (err && err.status !== 409) {
                                    done(new Error("Index creation failed for an unknown reason"));
                                }
                                done(null, search);
                            });
                        },
                        function(originalSearch, done) {
                            var indexes = originalSearch.service.indexes();
                            indexes.fetch(function(err, indexes) {
                                if (err) {
                                    done(err);
                                }
                                else {
                                    var index = indexes.item(indexName);
                                    test.ok(index);
                                    index.enable(Async.augment(done, originalSearch));
                                }
                            });
                        },
                        function(index, originalSearch, done) {
                            //Is the index enabled?
                            test.ok(!index.properties().disabled);
                            //refresh the index
                            index.fetch(Async.augment(done, originalSearch));
                        },
                        function(index, originalSearch, done) {
                            //Store the current event count for a later comparison
                            var eventCount = index.properties().totalEventCount;

                            test.strictEqual(index.properties().sync, 0);
                            test.ok(!index.properties().disabled);

                            index.fetch(Async.augment(done, originalSearch, eventCount));
                        },
                        function(index, originalSearch, eventCount, done) {
                            // submit an event
                            index.submitEvent(
                                "JS SDK: testing alerts",
                                {
                                    sourcetype: "sdk-tests-alerts"
                                },
                                Async.augment(done, originalSearch, eventCount)
                            );
                        },
                        function(result, index, originalSearch, eventCount, done) {
                            Async.sleep(1000, function(){
                                //refresh the search
                                index.fetch(Async.augment(done, originalSearch, eventCount));
                            });
                        },
                        function(index, originalSearch, eventCount, done) {
                            // Did the event get submitted
                            test.strictEqual(index.properties().totalEventCount, eventCount+1);
                            // Refresh the search
                            originalSearch.fetch(Async.augment(done, index));
                        },
                        function(originalSearch, index, done) {
                            splunkjs.Logger.log("\tAlert count pre-fetch", originalSearch.alertCount());
                            var attemptNum = 1;
                            var maxAttempts = 20;
                            Async.whilst(
                                function() {
                                    // When this returns false, it hits the final function in the chain
                                    splunkjs.Logger.log("\tFetch attempt", attemptNum, "of", maxAttempts, "alertCount", originalSearch.alertCount());
                                    if (originalSearch.alertCount() !== 0) {
                                        return false;
                                    }
                                    else {
                                        attemptNum++;
                                        return attemptNum < maxAttempts;
                                    }
                                },
                                function(callback) {
                                    Async.sleep(500, function() {
                                        originalSearch.fetch(callback);
                                    });
                                },
                                function(err) {
                                    splunkjs.Logger.log("Attempted fetching", attemptNum, "of", maxAttempts, "result is", originalSearch.alertCount() !== 0);
                                    originalSearch.fetch(Async.augment(done, index));
                                }
                            );
                        },
                        function(originalSearch, index, done) {
                            splunkjs.Logger.log("about to fetch");
                            splunkjs.Logger.log("SavedSearch name was: " + originalSearch.name);
                            svc.firedAlertGroups({username: svc.username}).fetch(Async.augment(done, index, originalSearch));
                        },
                        function(firedAlertGroups, index, originalSearch, done) {
                            Async.seriesEach(
                                firedAlertGroups.list(),
                                function(firedAlertGroup, innerIndex, seriescallback) {
                                    Async.chain([
                                            function(insideChainCallback) {
                                                firedAlertGroup.list(insideChainCallback);
                                            },
                                            function(firedAlerts, firedAlertGroup, insideChainCallback) {
                                                for(var i = 0; i < firedAlerts.length; i++) {
                                                    var firedAlert = firedAlerts[i];
                                                    firedAlert.actions();
                                                    firedAlert.alertType();
                                                    firedAlert.isDigestMode();
                                                    firedAlert.expirationTime();
                                                    firedAlert.savedSearchName();
                                                    firedAlert.severity();
                                                    firedAlert.sid();
                                                    firedAlert.triggerTime();
                                                    firedAlert.triggerTimeRendered();
                                                    firedAlert.triggeredAlertCount();
                                                }
                                                insideChainCallback(null);
                                            }
                                        ],
                                        function(err) {
                                            if (err) {
                                                seriescallback(err);
                                            }
                                                seriescallback(null);
                                        }
                                    );
                                },
                                function(err) {
                                    if (err) {
                                        done(err, originalSearch, index);
                                    }
                                    done(null, originalSearch, index);
                                }
                            );
                        },
                        function(originalSearch, index, done) {
                            // Make sure the event count has incremented, as expected
                            test.strictEqual(originalSearch.alertCount(), 1);
                            // Remove the search, especially because it's a real-time search
                            originalSearch.remove(Async.augment(done, index));
                        },
                        function(index, done) {
                            Async.sleep(500, function() {
                                index.remove(done);
                            });
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#delete all alerts": function(test) {
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
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Properties Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#list": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) {
                        that.service.configurations(namespace).fetch(done);
                    },
                    function(props, done) {
                        var files = props.list();
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#item": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#contains stanza": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
                        var stanza = file.item("settings");
                        test.ok(stanza);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#create file + create stanza + update stanza": function(test) {
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
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.fetch(done);
                    },
                    function(file, done) {
                        var stanza = file.item("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
        },

        "Configuration Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#list": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var files = props.list();
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#contains": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#contains stanza": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("web");
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.name, "web");

                        var stanza = file.item("settings");
                        test.ok(stanza);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#configurations init": function(test) {
                test.throws(function() {
                    var confs = new splunkjs.Service.Configurations(
                        this.service,
                        {owner: "-", app: "-", sharing: "system"}
                    );
                });
                test.done();
            },

            "Callback#create file + create stanza + update stanza": function(test) {
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
                        test.strictEqual(stanza.properties()["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.fetch(done);
                    },
                    function(file, done) {
                        var stanza = file.item("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#can get default stanza": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("alert_actions");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.name, "default");
                        test.strictEqual(namespace, stanza.namespace);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },

            "Callback#updating default stanza is noop": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                var backup = null;
                var invalid = "this won't work";

                Async.chain([
                    function(done) { that.service.configurations(namespace).fetch(done); },
                    function(props, done) {
                        var file = props.item("alert_actions");
                        test.strictEqual(namespace, file.namespace);
                        test.ok(file);
                        file.fetch(done);
                    },
                    function(file, done) {
                        test.strictEqual(namespace, file.namespace);
                        file.getDefaultStanza().fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza._properties.hasOwnProperty("maxresults"));
                        test.strictEqual(namespace, stanza.namespace);
                        backup = stanza._properties.maxresults;
                        stanza.update({"maxresults": invalid}, done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("maxresults"));
                        test.strictEqual(stanza.properties()["maxresults"], backup);
                        test.notStrictEqual(stanza.properties()["maxresults"], invalid);
                        stanza.fetch(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().hasOwnProperty("maxresults"));
                        test.strictEqual(stanza.properties()["maxresults"], backup);
                        test.notStrictEqual(stanza.properties()["maxresults"], invalid);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            }
        },

        "Storage Passwords Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Create": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with backslashes": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with slashes": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create without realm": function(test) {
                var startcount = -1;
                var name = "delete-me-" + getNextId();
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            startcount = storagePasswords.list().length;
                            storagePasswords.create({name: name, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual("", storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without user, or realm": function(test) {
                var that = this;
                Async.chain([
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            storagePasswords.create({name: null, password: "changeme"}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without password": function(test) {
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
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create should fail without user, realm, or password": function(test) {
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
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create with colons": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create crazy": function(test) {
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
                                    password: "changeme"},
                                done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
                            test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Create with unicode chars": function(test) {
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
                            test.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
                            test.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
                            test.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
                            test.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Read": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            try {
                                test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            var list = storagePasswords.list();
                            var found = false;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                }
                            }
                            test.ok(found);

                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Read with slashes": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            try {
                                test.ok(!!storagePasswords.item(realm + ":" + name + ":"));
                            }
                            catch (e) {
                                test.ok(false);
                            }

                            var list = storagePasswords.list();
                            var found = false;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                }
                            }
                            test.ok(found);

                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Update": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.update({password: "changed"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changed", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            var list = storagePasswords.list();
                            var found = false;
                            var index = -1;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                    index = i;
                                    test.strictEqual(name, list[i].properties().username);
                                    test.strictEqual(realm + ":" + name + ":", list[i].name);
                                    test.strictEqual("changed", list[i].properties().clear_password);
                                    test.strictEqual(realm, list[i].properties().realm);
                                }
                            }
                            test.ok(found);

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
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Delete": function(test) {
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
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            test.strictEqual(realm + ":" + name + ":", storagePassword.name);
                            test.strictEqual("changeme", storagePassword.properties().clear_password);
                            test.strictEqual(realm, storagePassword.properties().realm);
                            that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
                        },
                        function(storagePasswords, storagePassword, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            storagePassword.remove(done);
                        },
                        function(done) {
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount, storagePasswords.list().length);
                            storagePasswords.create({name: name, realm: realm, password: "changeme"}, done);
                        },
                        function(storagePassword, done) {
                            test.strictEqual(name, storagePassword.properties().username);
                            that.service.storagePasswords().fetch(done);
                        },
                        function(storagePasswords, done) {
                            test.strictEqual(startcount + 1, storagePasswords.list().length);
                            var list = storagePasswords.list();
                            var found = false;
                            var index = -1;

                            test.strictEqual(startcount + 1, list.length);
                            for (var i = 0; i < list.length; i ++) {
                                if (realm + ":" + name + ":" === list[i].name) {
                                    found = true;
                                    index = i;
                                    test.strictEqual(name, list[i].properties().username);
                                    test.strictEqual(realm + ":" + name + ":", list[i].name);
                                    test.strictEqual("changeme", list[i].properties().clear_password);
                                    test.strictEqual(realm, list[i].properties().realm);
                                }
                            }
                            test.ok(found);

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
                            test.strictEqual(startcount, storagePasswords.list().length);
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Index Tests": {
            setUp: function(done) {
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
            },

            "Callback#remove index fails on Splunk 4.x": function(test) {
                var original_version = this.service.version;
                this.service.version = "4.0";

                var index = this.service.indexes().item(this.indexName);
                test.throws(function() { index.remove(function(err) {}); });

                this.service.version = original_version;
                test.done();
            },

            "Callback#remove index": function(test) {
                var indexes = this.service.indexes();

                // Must generate a private index because an index cannot
                // be recreated with the same name as a deleted index
                // for a certain period of time after the deletion.
                var salt = Math.floor(Math.random() * 65536);
                var myIndexName = this.indexName + '-' + salt;

                if (this.service.versionCompare("5.0") < 0) {
                    splunkjs.Logger.info("", "Must be running Splunk 5.0+ for this test to work.");
                    test.done();
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
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#list indexes": function(test) {
                var indexes = this.service.indexes();
                indexes.fetch(function(err, indexes) {
                    var indexList = indexes.list();
                    test.ok(indexList.length > 0);
                    test.done();
                });
            },

            "Callback#contains index": function(test) {
                var indexes = this.service.indexes();
                var indexName = this.indexName;

                indexes.fetch(function(err, indexes) {
                    var index = indexes.item(indexName);
                    test.ok(index);
                    test.done();
                });
            },

            "Callback#modify index": function(test) {

                var name = this.indexName;
                var indexes = this.service.indexes();
                var originalSyncMeta = false;

                Async.chain([
                        function(callback) {
                            indexes.fetch(callback);
                        },
                        function(indexes, callback) {
                            var index = indexes.item(name);
                            test.ok(index);

                            originalSyncMeta = index.properties().syncMeta;
                            index.update({
                                syncMeta: !originalSyncMeta
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();

                            test.strictEqual(!originalSyncMeta, properties.syncMeta);

                            index.update({
                                syncMeta: !properties.syncMeta
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();

                            test.strictEqual(originalSyncMeta, properties.syncMeta);
                            callback();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Enable+disable index": function(test) {

                var name = this.indexName;
                var indexes = this.service.indexes();

                Async.chain([
                        function(callback) {
                            indexes.fetch(callback);
                        },
                        function(indexes, callback) {
                            var index = indexes.item(name);
                            test.ok(index);

                            index.disable(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            index.fetch(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(index.properties().disabled);

                            index.enable(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            index.fetch(callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            test.ok(!index.properties().disabled);

                            callback();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Service submit event": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        service.log(message, {sourcetype: sourcetype, index: indexName}, done);
                    },
                    function(eventInfo, done) {
                        test.ok(eventInfo);
                        test.strictEqual(eventInfo.sourcetype, sourcetype);
                        test.strictEqual(eventInfo.bytes, message.length);
                        test.strictEqual(eventInfo.index, indexName);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    },
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Service submit event, omitting optional arguments": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        service.log(message, done);
                    },
                    function(eventInfo, done) {
                        test.ok(eventInfo);
                        test.strictEqual(eventInfo.bytes, message.length);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    },
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Service submit events with multi-byte chars": function(test) {
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
                        test.ok(!err);
                        test.strictEqual(counter, messages.length);

                        // Verify that the full byte-length was sent for each message
                        for (var m in messages) {
                            test.notStrictEqual(messages[m].length, vals[m].bytes);
                            try {
                                test.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                            }
                            catch (err) {
                                // Assume Buffer isn't defined, we're probably in the browser
                                test.strictEqual(decodeURI(encodeURIComponent(messages[m])).length, vals[m].bytes);
                            }
                        }

                        test.done();
                    }
                );
            },

            "Callback#Service submit event, failure": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.loggedOutService;
                var indexName = this.indexName;
                Async.chain(
                    function(done) {
                        test.ok(service);
                        service.log(message, done);
                    },
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#remove throws an error": function(test) {
                var index = this.service.indexes().item("_internal");
                test.throws(function() {
                    index.remove();
                });
                test.done();
            },

            "Callback#create an index with alternate argument format": function(test) {
                var indexes = this.service.indexes();
                indexes.create(
                    {name: "_internal"},
                    function(err, newIndex) {
                        test.ok(err.data.messages[0].text.match("Index name=_internal already exists"));
                        test.done();
                    }
                );
            },

            "Callback#Index submit event with omitted optional arguments": function(test) {
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
                            test.ok(index);
                            test.strictEqual(index.name, indexName);
                            index.submitEvent(message, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo.index, indexName);

                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Index submit event": function(test) {
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
                            test.ok(index);
                            test.strictEqual(index.name, indexName);
                            index.submitEvent(message, {sourcetype: sourcetype}, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.sourcetype, sourcetype);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo.index, indexName);

                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "User Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            tearDown: function(done) {
                this.service.logout(done);
            },

            "Callback#Current user": function(test) {
                var service = this.service;

                service.currentUser(function(err, user) {
                    test.ok(!err);
                    test.ok(user);
                    test.strictEqual(user.name, service.username);
                    test.done();
                });
            },

            "Callback#Current user fails": function(test) {
                var service = this.loggedOutService;

                service.currentUser(function(err, user) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#List users": function(test) {
                var service = this.service;

                service.users().fetch(function(err, users) {
                    var userList = users.list();
                    test.ok(!err);
                    test.ok(users);

                    test.ok(userList);
                    test.ok(userList.length > 0);
                    test.done();
                });
            },

            "Callback#create user failure": function(test) {
                this.loggedOutService.users().create(
                    {name: "jssdk_testuser", password: "abc", roles: "user"},
                    function(err, response) {
                        test.ok(err);
                        test.done();
                    }
                );
            },

            "Callback#Create + update + delete user": function(test) {
                var service = this.service;
                var name = "jssdk_testuser";

                Async.chain([
                        function(done) {
                            service.users().create({name: "jssdk_testuser", password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");

                            user.update({realname: "JS SDK", roles: ["admin", "user"]}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().realname, "JS SDK");
                            test.strictEqual(user.properties().roles.length, 2);
                            test.strictEqual(user.properties().roles[0], "admin");
                            test.strictEqual(user.properties().roles[1], "user");

                            user.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Roles": function(test) {
                var service = this.service;
                var name = "jssdk_testuser_" + getNextId();

                Async.chain([
                        function(done) {
                            service.users().create({name: name, password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");

                            user.update({roles: ["admin", "user"]}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().roles.length, 2);
                            test.strictEqual(user.properties().roles[0], "admin");
                            test.strictEqual(user.properties().roles[1], "user");

                            user.update({roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");

                            user.update({roles: "__unknown__"}, done);
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.strictEqual(err.status, 400);
                        test.done();
                    }
                );
            },

            "Callback#Passwords": function(test) {
                var service = this.service;
                var newService = null;
                var name = "jssdk_testuser_" + getNextId();

                Async.chain([
                        function(done) {
                            service.users().create({name: name, password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.name, name);
                            test.strictEqual(user.properties().roles.length, 1);
                            test.strictEqual(user.properties().roles[0], "user");

                            newService = new splunkjs.Service(service.http, {
                                username: name,
                                password: "abc",
                                host: service.host,
                                port: service.port,
                                scheme: service.scheme,
                                version: service.version
                            });

                            newService.login(Async.augment(done, user));
                        },
                        function(success, user, done) {
                            test.ok(success);
                            test.ok(user);

                            user.update({password: "abc2"}, done);
                        },
                        function(user, done) {
                            newService.login(function(err, success) {
                                test.ok(err);
                                test.ok(!success);

                                user.update({password: "abc"}, done);
                            });
                        },
                        function(user, done) {
                            test.ok(user);
                            newService.login(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#delete test users": function(test) {
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
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },

        "Server Info Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Basic": function(test) {
                var service = this.service;

                service.serverInfo(function(err, info) {
                    test.ok(!err);
                    test.ok(info);
                    test.strictEqual(info.name, "server-info");
                    test.ok(info.properties().hasOwnProperty("version"));
                    test.ok(info.properties().hasOwnProperty("serverName"));
                    test.ok(info.properties().hasOwnProperty("os_version"));

                    test.done();
                });
            }
        },

        "View Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#List views": function(test) {
                var service = this.service;

                service.views({owner: "admin", app: "search"}).fetch(function(err, views) {
                    test.ok(!err);
                    test.ok(views);

                    var viewsList = views.list();
                    test.ok(viewsList);
                    test.ok(viewsList.length > 0);

                    for(var i = 0; i < viewsList.length; i++) {
                        test.ok(viewsList[i]);
                    }

                    test.done();
                });
            },

            "Callback#Create + update + delete view": function(test) {
                var service = this.service;
                var name = "jssdk_testview";
                var originalData = "<view/>";
                var newData = "<view isVisible='false'></view>";

                Async.chain([
                        function(done) {
                            service.views({owner: "admin", app: "sdk-app-collection"}).create({name: name, "eai:data": originalData}, done);
                        },
                        function(view, done) {
                            test.ok(view);

                            test.strictEqual(view.name, name);
                            test.strictEqual(view.properties()["eai:data"], originalData);

                            view.update({"eai:data": newData}, done);
                        },
                        function(view, done) {
                            test.ok(view);
                            test.strictEqual(view.properties()["eai:data"], newData);

                            view.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Parser Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Callback#Basic parse": function(test) {
                var service = this.service;

                service.parse("search index=_internal | head 1", function(err, parse) {
                    test.ok(!err);
                    test.ok(parse);
                    test.ok(parse.commands.length > 0);
                    test.done();
                });
            },

            "Callback#Parse error": function(test) {
                var service = this.service;

                service.parse("ABCXYZ", function(err, parse) {
                    test.ok(err);
                    test.strictEqual(err.status, 400);
                    test.done();
                });
            }
        },

        "Typeahead Tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Callback#Typeahead failure": function(test) {
                var service = this.loggedOutService;
                service.typeahead("index=", 1, function(err, options) {
                    test.ok(err);
                    test.done();
                });
            },

            "Callback#Basic typeahead": function(test) {
                var service = this.service;

                service.typeahead("index=", 1, function(err, options) {
                    test.ok(!err);
                    test.ok(options);
                    test.strictEqual(options.length, 1);
                    test.ok(options[0]);
                    test.done();
                });
            },

            "Typeahead with omitted optional arguments": function(test) {
                var service = this.service;
                service.typeahead("index=", function(err, options) {
                    test.ok(!err);
                    test.ok(options);
                    test.done();
                });
            }
        },

        "Endpoint Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },

            "Throws on null arguments to init": function(test) {
                var service = this.service;
                test.throws(function() {
                    var endpoint = new splunkjs.Service.Endpoint(null, "a/b");
                });
                test.throws(function() {
                    var endpoint = new splunkjs.Service.Endpoint(service, null);
                });
                test.done();
            },

            "Endpoint delete on a relative path": function(test) {
                var service = this.service;
                var endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
                endpoint.del("search/jobs/12345", {}, function() { test.done();});
            },

            "Methods of Resource to be overridden": function(test) {
                var service = this.service;
                var resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
                test.throws(function() { resource.path(); });
                test.throws(function() { resource.fetch(); });
                test.ok(splunkjs.Utils.isEmpty(resource.state()));
                test.done();
            }
        },

        "Entity tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Accessors function properly": function(test) {
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
                test.ok(entity.acl().owner === "boris");
                test.ok(entity.acl().app === "factory");
                test.ok(entity.acl().sharing === "app");
                test.ok(entity.links().link1 === 35);
                test.strictEqual(entity.author(), "Hilda");
                test.strictEqual(entity.published(), "meep");
                test.done();
            },

            "Refresh throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
                entity.fetch({}, function(err) { test.ok(err); test.done();});
            },

            "Cannot update name of entity": function(test) {
                var entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", {owner: "boris", app: "factory", sharing: "app"});
                test.throws(function() { entity.update({name: "asdf"});});
                test.done();
            },

            "Disable throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    {owner: "boris", app: "factory", sharing: "app"}
                );
                entity.disable(function(err) { test.ok(err); test.done();});
            },

            "Enable throws error correctly": function(test) {
                var entity = new splunkjs.Service.Entity(
                    this.loggedOutService,
                    "/search/jobs/12345",
                    {owner: "boris", app: "factory", sharing: "app"}
                );
                entity.enable(function(err) { test.ok(err); test.done();});
            },

            "Does reload work?": function(test) {
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
                            test.ok(!err);
                            done(null, app);
                        });
                    },
                    function(app, done) {
                        var app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
                        app2.reload(function(err) {
                            test.ok(err);
                            done(null, app);
                        });
                    },
                    function(app, done) {
                        app.remove(done);
                    },
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },

        "Collection tests": {
            setUp: function(done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                done();
            },

            "Methods to be overridden throw": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {owner: "admin",
                     app: "search",
                     sharing: "app"}
                );
                test.throws(function() {
                    coll.instantiateEntity({});
                });
                test.done();
            },

            "Accessors work": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {owner: "admin",
                     app: "search",
                     sharing: "app"}
                );
                coll._load({links: "Hilda", updated: true});
                test.strictEqual(coll.links(), "Hilda");
                test.ok(coll.updated());
                test.done();
            },

            "Contains throws without a good id": function(test) {
                var coll = new splunkjs.Service.Collection(
                    this.service,
                    "/data/indexes",
                    {
                        owner: "admin",
                        app: "search",
                        sharing: "app"
                    }
                );
                test.throws(function() { coll.item(null);});
                test.done();
            }
        }
    };
    return suite;
};

if (module === require.main) {
    var splunkjs    = require('../index');
    var options     = require('../examples/node/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');

    var parser = options.create();
    var cmdline = parser.parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    if(!process.env.SPLUNK_HOME){
        throw new Error("$PATH variable SPLUNK_HOME is not set. Please export SPLUNK_HOME to the splunk instance.");
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

    var suite = exports.setup(svc, loggedOutSvc);

    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}
