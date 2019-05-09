var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var tutils      = require('../utils');
var path        = require("path");

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function(svc) {
    return {
        setUp: function(done) {
            this.service = svc;
            done();
        },

        "Callback#Create+abort job": function(test) {
            var service = this.service;
            Async.chain([
                    function(done){
                        var app_name = path.join(process.env.SPLUNK_HOME, ('/etc/apps/sdk-app-collection/build/sleep_command.tar'));
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
    };
};
