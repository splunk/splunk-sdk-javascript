exports.setup = function (svc) {
    var assert = require('chai').assert;
    var path = require("path");

    var splunkjs = require('../../index');
    var tutils = require('../utils');
    const { Logger } = require('../../lib/log');

    var Async = splunkjs.Async;
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Job tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                done();
            });

            // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
            // it("Callback#Create+abort job", function (done) {
            //     var service = this.service;
            //     Async.chain([
            //         function (done) {
            //             var app_name = path.join(process.env.SPLUNK_HOME, ('/etc/apps/sdkappcollection/build/sleep_command.tar'));
            //             // Fix path on Windows if $SPLUNK_HOME contains a space (ex: C:/Program%20Files/Splunk)
            //             app_name = app_name.replace("%20", " ");
            //             // var app_name = "sleep_command";
            //             service.post("apps/local", { update: 1, name: app_name, filename: true }, done);
            //         },
            //         function (done) {
            //             var sid = getNextId();
            //             var options = { id: sid };
            //             var jobs = service.jobs();
            //             var req = jobs.oneshotSearch('search index=_internal | head 1 | sleep 10', options, function (err, job) {
            //                 assert.ok(err);
            //                 assert.ok(!job);
            //                 assert.strictEqual(err.error, "abort");
            //             });

            //             Async.sleep(1000, function () {
            //                 req.abort();
            //             });
            //         }
            //     ],
            //         function (err) {
            //             assert.ok(!err);
            //             done();
            //         });
            //     done();
            // });

            it("Job Create Urls validation", function () {
                var testData = {
                    "v1_1": {
                        "qualifiedPath": "/servicesNS/admin/foo/search/jobs/id5_1649796951725",
                        "relpath": "search/jobs/id5_1649796951725/events",
                        "expected": "/servicesNS/admin/foo/search/jobs/id5_1649796951725/events"
                    },
                    "v1_2": {
                        "qualifiedPath": "/services/search/jobs/id5_1649796951725",
                        "relpath": "search/jobs/id5_1649796951725/events",
                        "expected": "/services/search/jobs/id5_1649796951725/events"
                    },
                    "v2_1": {
                        "qualifiedPath": "/servicesNS/admin/foo/search/v2/jobs/id5_1649796951725",
                        "relpath": "search/v2/jobs/id5_1649796951725/events",
                        "expected": "/servicesNS/admin/foo/search/v2/jobs/id5_1649796951725/events"
                    },
                    "v2_2": {
                        "qualifiedPath": "/services/search/v2/jobs/id5_1649796951725",
                        "relpath": "search/v2/jobs/id5_1649796951725/events",
                        "expected": "/services/search/v2/jobs/id5_1649796951725/events"
                    }
                }
                
                for (const [key, value] of Object.entries(testData)) {
                    createdUrl = this.service.jobs().createUrl(value.qualifiedPath, value.relpath);
                    assert.strictEqual(value.expected, createdUrl);
                }
            });

            it("Callback#Create+cancel job", function (done) {
                var sid = getNextId();
                this.service.jobs().search('search index=_internal | head 1', { id: sid }, function (err, job) {
                    assert.ok(job);
                    assert.strictEqual(job.sid, sid);

                    job.cancel(function () {
                        done();
                    });
                });
            });

            it("Callback#Create job error", function (done) {
                var sid = getNextId();
                this.service.jobs().search({ search: 'index=_internal | head 1', id: sid }, function (err) {
                    assert.ok(!!err);
                    done();
                });
            });

            it("Callback#List jobs", function (done) {
                this.service.jobs().fetch(function (err, jobs) {
                    assert.ok(!err);
                    assert.ok(jobs);

                    var jobsList = jobs.list();
                    assert.ok(jobsList.length > 0);

                    for (var i = 0; i < jobsList.length; i++) {
                        assert.ok(jobsList[i]);
                    }

                    done();
                });
            });

            it("Callback#Contains job", function (done) {
                var that = this;
                var sid = getNextId();
                var jobs = this.service.jobs();

                jobs.search('search index=_internal | head 1', { id: sid }, function (err, job) {
                    assert.ok(!err);
                    assert.ok(job);
                    assert.strictEqual(job.sid, sid);

                    jobs.fetch(function (err, jobs) {
                        assert.ok(!err);
                        var job = jobs.item(sid);
                        assert.ok(job);

                        job.cancel(function () {
                            done();
                        });
                    });
                });
            });

            it("Callback#job results", function (done) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid }, done);
                    },
                    function (job, done) {
                        assert.strictEqual(job.sid, sid);
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        job.results({}, done);
                    },
                    function (results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#job events", function (done) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1', { id: sid }, done);
                    },
                    function (job, done) {
                        assert.strictEqual(job.sid, sid);
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        job.events({}, done);
                    },
                    function (results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, results.rows[0].length);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });
                
            it("Callback#job events - post processing search params", function(done) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
        
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 2', {id: sid}, done);
                        },
                        function(job, done) {
                            assert.strictEqual(job.sid, sid);
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
                            job.events({ search: "| head 1" }, done);
                        },
                        function (results, job, done) {
                            assert.strictEqual(results.post_process_count, 1);
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

            it("Callback#job results preview", function (done) {
                var sid = getNextId();
                var service = this.service;
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid }, done);
                    },
                    function (job, done) {
                        assert.strictEqual(job.sid, sid);
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        job.preview({}, done);
                    },
                    function (results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#job results iterator", function (done) {
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 10', {}, done);
                    },
                    function (job, done) {
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        var iterator = job.iterator("results", { pagesize: 4 });
                        var hasMore = true;
                        var numElements = 0;
                        var pageSizes = [];
                        Async.whilst(
                            function () { return hasMore; },
                            function (nextIteration) {
                                iterator.next(function (err, results, _hasMore) {
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
                            function (err) {
                                assert.deepStrictEqual(pageSizes, [4, 4, 2]);
                                done(err);
                            }
                        );
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
            // it("Callback#Enable + disable preview", function (done) {
            //     var that = this;
            //     var sid = getNextId();

            //     var service = this.service.specialize("nobody", "sdkappcollection");

            //     Async.chain([
            //         function (done) {
            //             service.jobs().search('search index=_internal | head 1 | sleep 60', { id: sid }, done);
            //         },
            //         function (job, done) {
            //             job.enablePreview(done);

            //         },
            //         function (job, done) {
            //             job.disablePreview(done);
            //         },
            //         function (job, done) {
            //             job.cancel(done);
            //         }
            //     ],
            //         function (err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // });

            // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
            // it("Callback#Pause + unpause + finalize preview", function (done) {
            //     var that = this;
            //     var sid = getNextId();

            //     var service = this.service.specialize("nobody", "sdkappcollection");

            //     Async.chain([
            //         function (done) {
            //             service.jobs().search('search index=_internal | head 1 | sleep 5', { id: sid }, done);
            //         },
            //         function (job, done) {
            //             job.pause(done);
            //         },
            //         function (job, done) {
            //             tutils.pollUntil(
            //                 job,
            //                 function (j) {
            //                     return j.properties()["isPaused"];
            //                 },
            //                 10,
            //                 done
            //             );
            //         },
            //         function (job, done) {
            //             assert.ok(job.properties()["isPaused"]);
            //             job.unpause(done);
            //         },
            //         function (job, done) {
            //             tutils.pollUntil(
            //                 job,
            //                 function (j) {
            //                     return !j.properties()["isPaused"];
            //                 },
            //                 10,
            //                 done
            //             );
            //         },
            //         function (job, done) {
            //             assert.ok(!job.properties()["isPaused"]);
            //             job.finalize(done);
            //         },
            //         function (job, done) {
            //             job.cancel(done);
            //         }
            //     ],
            //         function (err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // });

            it("Callback#Set TTL", function (done) {
                var sid = getNextId();
                var originalTTL = 0;
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1', { id: sid }, done);
                    },
                    function (job, done) {
                        job.fetch(done);
                    },
                    function (job, done) {
                        var ttl = job.properties()["ttl"];
                        originalTTL = ttl;

                        job.setTTL(ttl * 2, done);
                    },
                    function (job, done) {
                        job.fetch(done);
                    },
                    function (job, done) {
                        var ttl = job.properties()["ttl"];
                        assert.ok(ttl > originalTTL);
                        assert.ok(ttl <= (originalTTL * 2));
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            // Disabling the test for now because the apps/appinstall endpoint have been deprecated from Splunk 8.2
            // it("Callback#Set priority", function (done) {
            //     var sid = getNextId();
            //     var originalPriority = 0;
            //     var that = this;

            //     var service = this.service.specialize("nobody", "sdkappcollection");

            //     Async.chain([
            //         function (done) {
            //             service.jobs().search('search index=_internal | head 1 | sleep 5', { id: sid }, done);
            //         },
            //         function (job, done) {
            //             job.track({}, {
            //                 ready: function (job) {
            //                     done(null, job);
            //                 }
            //             });
            //         },
            //         function (job, done) {
            //             var priority = job.properties()["priority"];
            //             assert.ok(priority, 5);
            //             job.setPriority(priority + 1, done);
            //         },
            //         function (job, done) {
            //             job.fetch(done);
            //         },
            //         function (job, done) {
            //             job.cancel(done);
            //         }
            //     ],
            //         function (err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // });

            it("Callback#Search log", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1', { id: sid, exec_mode: "blocking" }, done);
                    },
                    function (job, done) {
                        job.searchlog(done);
                    },
                    function (log, job, done) {
                        assert.ok(job);
                        assert.ok(log);
                        assert.ok(log.length > 0);
                        assert.ok(log.split("\r\n").length > 0);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Search summary", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().search(
                            'search index=_internal | head 1 | eval foo="bar" | fields foo',
                            {
                                id: sid,
                                status_buckets: 300,
                                rf: ["foo"]
                            },
                            done);
                    },
                    function (job, done) {
                        // Let's sleep for 2 second so
                        // we let the server catch up
                        Async.sleep(2000, function () {
                            job.summary({}, done);
                        });
                    },
                    function (summary, job, done) {
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
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Search timeline", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
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
                    function (job, done) {
                        job.timeline({}, done);
                    },
                    function (timeline, job, done) {
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
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Touch", function (done) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";

                Async.chain([
                    function (done) {
                        that.service.jobs().search('search index=_internal | head 1', { id: sid }, done);
                    },
                    function (job, done) {
                        job.fetch(done);
                    },
                    function (job, done) {
                        assert.ok(job);
                        originalTime = job.properties().updated;
                        Async.sleep(1200, function () { job.touch(done); });
                    },
                    function (job, done) {
                        job.fetch(done);
                    },
                    function (job, done) {
                        assert.ok(originalTime !== job.updated());
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Create failure", function (done) {
                var name = "jssdk_savedsearch_" + getNextId();
                var originalSearch = "search index=_internal | head 1";

                var jobs = this.service.jobs();
                assert.throws(function () { jobs.create({ search: originalSearch, name: name, exec_mode: "oneshot" }, function () { }); });
                done();
            });

            it("Callback#Create fails with no search string", function (done) {
                var jobs = this.service.jobs();
                jobs.create(
                    "", {},
                    function (err) {
                        assert.ok(err);
                        done();
                    }
                );
            });

            it("Callback#Oneshot search", function (done) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";

                Async.chain([
                    function (done) {
                        that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', { id: sid }, done);
                    },
                    function (results, done) {
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
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Oneshot search with json results", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', { id: sid, output_mode: 'json' }, done);
                    },
                    function (results, done) {
                        assert.ok(results);
                        assert.ok(results.fields);
                        assert.strictEqual(results.fields.length, 1);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Oneshot search with xml results", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().oneshotSearch('search index=_internal | head 2 | stats count', { id: sid, output_mode: 'xml' }, done);
                    },
                    function (results, done) {
                        assert.ok(results);
                        assert.ok(results.includes('<field>count</field>'));
                        assert.ok(results.includes('<value><text>2</text></value>'));
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Oneshot search with csv results", function (done) {
                var sid = getNextId();
                var that = this;

                Async.chain([
                    function (done) {
                        that.service.jobs().oneshotSearch('makeresults count=3 | streamstats count | eval foo="bar" | fields - _time', { id: sid, output_mode: 'csv' }, done);
                    },
                    function (results, done) {
                        assert.ok(results);
                        assert.ok(results.includes('count,foo'));
                        assert.ok(results.includes('1,bar'));
                        assert.ok(results.includes('2,bar'));
                        assert.ok(results.includes('3,bar'));
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Oneshot search with no results", function (done) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";

                Async.chain([
                    function (done) {
                        var query = 'search index=history MUST_NOT_EXISTABCDEF';
                        that.service.jobs().oneshotSearch(query, { id: sid }, done);
                    },
                    function (results, done) {
                        assert.ok(results);
                        assert.strictEqual(results.fields.length, 0);
                        assert.strictEqual(results.rows.length, 0);
                        assert.ok(!results.preview);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            // it("Callback#Service oneshot search", function(done) {
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
            // });

            it("Callback#Service search", function (done) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                var namespace = { owner: "admin", app: "search" };

                Async.chain([
                    function (done) {
                        that.service.search('search index=_internal | head 1 | stats count', { id: sid }, namespace, done);
                    },
                    function (job, done) {
                        assert.strictEqual(job.sid, sid);
                        assert.strictEqual(job.namespace, namespace);
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties()["isDone"];
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        job.results({}, done);
                    },
                    function (results, job, done) {
                        assert.strictEqual(results.rows.length, 1);
                        assert.strictEqual(results.fields.length, 1);
                        assert.strictEqual(results.fields[0], "count");
                        assert.strictEqual(results.rows[0][0], "1");
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Wait until job done", function (done) {
                this.service.search('search index=_internal | head 1000', {}, function (err, job) {
                    assert.ok(!err);

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function (job) {
                            assert.ok(job);

                            numReadyEvents++;
                        },
                        progress: function (job) {
                            assert.ok(job);

                            numProgressEvents++;
                        },
                        done: function (job) {
                            assert.ok(job);

                            assert.ok(numReadyEvents === 1);      // all done jobs must have become ready
                            assert.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            done();
                        },
                        failed: function (job) {
                            assert.ok(job);

                            assert.ok(false, "Job failed unexpectedly.");
                            done();
                        },
                        error: function (err) {
                            assert.ok(err);

                            assert.ok(false, "Error while tracking job.");
                            done();
                        }
                    });
                });
            });

            it("Callback#Wait until job failed", function (done) {
                this.service.search('search index=_internal | head bogusarg', {}, function (err, job) {
                    if (err) {
                        assert.ok(!err);
                        done();
                        return;
                    }

                    var numReadyEvents = 0;
                    var numProgressEvents = 0;
                    job.track({ period: 200 }, {
                        ready: function (job) {
                            assert.ok(job);

                            numReadyEvents++;
                        },
                        progress: function (job) {
                            assert.ok(job);

                            numProgressEvents++;
                        },
                        done: function (job) {
                            assert.ok(job);

                            assert.ok(false, "Job became done unexpectedly.");
                            done();
                        },
                        failed: function (job) {
                            assert.ok(job);

                            assert.ok(numReadyEvents === 1);      // even failed jobs become ready
                            assert.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                            done();
                        },
                        error: function (err) {
                            assert.ok(err);

                            assert.ok(false, "Error while tracking job.");
                            done();
                        }
                    });
                });
            });

            it("Callback#track() with default params and one function", function (done) {
                this.service.search('search index=_internal | head 1', {}, function (err, job) {
                    if (err) {
                        assert.ok(!err);
                        done();
                        return;
                    }

                    job.track({}, function (job) {
                        assert.ok(job);
                        done();
                    });
                });
            });

            it("Callback#track() should stop polling if only the ready callback is specified", function (done) {
                this.service.search('search index=_internal | head 1', {}, function (err, job) {
                    if (err) {
                        assert.ok(!err);
                        done();
                        return;
                    }

                    job.track({}, {
                        ready: function (job) {
                            assert.ok(job);
                        },

                        _stoppedAfterReady: function (job) {
                            done();
                        }
                    });
                });
            });

            it("Callback#track() a job that is not immediately ready", function (done) {
                /*jshint loopfunc:true */
                var numJobs = 20;
                var numJobsLeft = numJobs;
                var gotJobNotImmediatelyReady = false;
                for (var i = 0; i < numJobs; i++) {
                    this.service.search('search index=_internal | head 10000', {}, function (err, job) {
                        if (err) {
                            assert.ok(!err);
                            done();
                            return;
                        }

                        job.track({}, {
                            _preready: function (job) {
                                gotJobNotImmediatelyReady = true;
                            },

                            ready: function (job) {
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

            it("Callback#Service.getJob() works", function (done) {
                var that = this;
                var sidsMatch = false;
                this.service.search('search index=_internal | head 1', {}, function (err, job) {
                    if (err) {
                        assert.ok(!err);
                        done();
                        return;
                    }
                    var sid = job.sid;
                    return Async.chain([
                        function (done) {
                            that.service.getJob(sid, done);
                        },
                        function (innerJob, done) {
                            assert.strictEqual(sid, innerJob.sid);
                            sidsMatch = sid === innerJob.sid;
                            done();
                        }
                    ],
                        function (err) {
                            assert.ok(!err);
                            assert.ok(sidsMatch);
                            done();
                        }
                    );
                });
            });
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    if (!process.env.SPLUNK_HOME) {
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

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc));
        });
    });
}
