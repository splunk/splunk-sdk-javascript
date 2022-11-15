exports.setup = function (svc) {
    var assert = require('chai').assert;
    var path = require("path");

    var splunkjs = require('../../index');
    var tutils = require('../utils');
    const { Logger } = require('../../lib/log');

    var utils = splunkjs.Utils;
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Job tests", () => {
            beforeEach(function () {
                this.service = svc;
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
                let testData = {
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

            it("Create and cancel job", async function () {
                let sid = getNextId();
                let job = await this.service.jobs().search('search index=_internal | head 1', { id: sid });
                assert.ok(job);
                assert.strictEqual(job.sid, sid);

                await job.cancel();
            });

            it("Create job error", async function () {
                let sid = getNextId();
                try {
                    let res = await this.service.jobs().search({ search: 'index=_internal | head 1', id: sid });
                    assert.ok(!res);
                } catch (error) {
                    assert.ok(error);
                }
            });

            it("List jobs", async function () {
                let jobs = await this.service.jobs().fetch();
                assert.ok(jobs);

                let jobsList = jobs.list();
                assert.ok(jobsList.length > 0);

                for (let i = 0; i < jobsList.length; i++) {
                    assert.ok(jobsList[i]);
                };
            });

            it("Contains job", async function () {
                let sid = getNextId();
                let jobs = this.service.jobs();

                let job = await jobs.search('search index=_internal | head 1', { id: sid });
                assert.ok(job);
                assert.strictEqual(job.sid, sid);

                jobs = await jobs.fetch();
                job = jobs.item(sid);
                assert.ok(job);

                await job.cancel();
            });

            it("Job results", async function () {
                let sid = getNextId();
                let that = this;
                let job = await that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid });
                assert.strictEqual(job.sid, sid);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                [results, job] = await job.results({});
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.fields.length, 1);
                assert.strictEqual(results.fields[0], "count");
                assert.strictEqual(results.rows[0][0], "1");
                await job.cancel();
            });

            it("Job events", async function () {
                let sid = getNextId();
                let that = this;
                let job = await that.service.jobs().search('search index=_internal | head 1', { id: sid });
                assert.strictEqual(job.sid, sid);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                [results, job] = await job.events({});
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.fields.length, results.rows[0].length);
                await job.cancel();
            });

            it("Job events - post processing search params", async function () {
                let sid = getNextId();
                let that = this;
                let job = await that.service.jobs().search('search index=_internal | head 2', { id: sid });
                assert.strictEqual(job.sid, sid);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                [results, job] = await job.events({ search: "| head 1" });
                assert.strictEqual(results.post_process_count, 1);
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.fields.length, results.rows[0].length);
                await job.cancel();
            });

            it("Job results preview", async function () {
                let sid = getNextId();
                let that = this;
                let job = await that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid });
                assert.strictEqual(job.sid, sid);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                [results, job] = await job.preview({});
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.fields.length, 1);
                assert.strictEqual(results.fields[0], "count");
                assert.strictEqual(results.rows[0][0], "1");
                await job.cancel();
            });

            it("Job results iterator", async function () {
                let that = this;
                let job = await that.service.jobs().search('search index=_internal | head 10', {});
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                let iterator = job.iterator("results", { pagesize: 4 });
                let hasMore = true;
                let pageSizes = [];
                await utils.whilst(
                    function () { return hasMore; },
                    async function () {
                        try {
                            [results, _hasMore] = await iterator.next();
                            hasMore = _hasMore;
                            if (hasMore) {
                                pageSizes.push(results.rows.length);
                            }
                        } catch (error) {
                            return error;
                        }
                    }
                );
                assert.deepStrictEqual(pageSizes, [4, 4, 2]);
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

            it("Set TTL", async function () {
                let sid = getNextId();
                let originalTTL = 0;
                var that = this;
                let job = await that.service.jobs().search('search index=_internal | head 1', { id: sid });
                job = await job.fetch();
                let ttl = job.properties()["ttl"];
                originalTTL = ttl;
                let res = await job.setTTL(ttl * 2);
                job = await job.fetch();
                ttl = job.properties()["ttl"];
                assert.ok(ttl > originalTTL);
                assert.ok(ttl <= (originalTTL * 2));
                await job.cancel();
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

            it("Search log", async function () {
                let sid = getNextId();
                var that = this;
                let job = await that.service.jobs().search('search index=_internal | head 1', { id: sid, exec_mode: "blocking" });
                [log, job] = await job.searchlog();
                assert.ok(job);
                assert.ok(log);
                assert.ok(log.length > 0);
                assert.ok(log.split("\r\n").length > 0);
                await job.cancel();
            });

            it("Search summary", async function () {
                let sid = getNextId();
                var that = this;
                let job = await that.service.jobs().search(
                    'search index=_internal | head 1 | eval foo="bar" | fields foo',
                    {
                        id: sid,
                        status_buckets: 300,
                        rf: ["foo"]
                    });
                // Let's sleep for 2 second so
                // we let the server catch up
                await utils.sleep(2000);
                [summary, job] = await job.summary({});
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
                await job.cancel();
            });

            it("Search timeline", async function () {
                let sid = getNextId();
                var that = this;
                let job = await that.service.jobs().search(
                    'search index=_internal | head 1 | eval foo="bar" | fields foo',
                    {
                        id: sid,
                        status_buckets: 300,
                        rf: ["foo"],
                        exec_mode: "blocking"
                    });
                [timeline, job] = await job.timeline({});
                assert.ok(job);
                assert.ok(timeline);
                assert.strictEqual(timeline.buckets.length, 1);
                assert.strictEqual(timeline.event_count, 1);
                assert.strictEqual(timeline.buckets[0].available_count, 1);
                assert.strictEqual(timeline.buckets[0].duration, 0.001);
                assert.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
                assert.strictEqual(timeline.buckets[0].total_count, 1);
                assert.ok(timeline.buckets[0].is_finalized);
                await job.cancel();
            });

            it("Touch", async function () {
                let sid = getNextId();
                var that = this;
                let originalTime = "";
                let job = await that.service.jobs().search('search index=_internal | head 1', { id: sid });
                job = await job.fetch();
                assert.ok(job);
                originalTime = job.properties().updated;
                await utils.sleep(1200);
                await job.touch();
                job = await job.fetch();
                assert.ok(originalTime !== job.updated());
                await job.cancel();
            });

            it("Create failure", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let originalSearch = "search index=_internal | head 1";

                let jobs = this.service.jobs();
                let res;
                try {
                    res = await jobs.create({ search: originalSearch, name: name, exec_mode: "oneshot" });
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            });

            it("Create fails with no search string", async function () {
                let jobs = this.service.jobs();
                let res;
                try {
                    res = await jobs.create("", {});
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            });

            it("Oneshot search", async function () {
                let sid = getNextId();
                var that = this;
                let results = await that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', { id: sid });
                assert.ok(results);
                assert.ok(results.fields);
                assert.strictEqual(results.fields.length, 1);
                assert.strictEqual(results.fields[0], "count");
                assert.ok(results.rows);
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.rows[0].length, 1);
                assert.strictEqual(results.rows[0][0], "1");
            });

            it("Oneshot search with json results", async function () {
                let sid = getNextId();
                var that = this;
                let results = await that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', { id: sid, output_mode: 'json' });
                assert.ok(results);
                assert.ok(results.fields);
                assert.strictEqual(results.fields.length, 1);
            });

            it("Oneshot search with xml results", async function () {
                let sid = getNextId();
                var that = this;
                let results = await that.service.jobs().oneshotSearch('search index=_internal | head 2 | stats count', { id: sid, output_mode: 'xml' });
                assert.ok(results);
                assert.ok(results.includes('<field>count</field>'));
                assert.ok(results.includes('<value><text>2</text></value>'));
            });

            it("Oneshot search with csv results", async function () {
                let sid = getNextId();
                var that = this;
                let results = await that.service.jobs().oneshotSearch('makeresults count=3 | streamstats count | eval foo="bar" | fields - _time', { id: sid, output_mode: 'csv' });
                assert.ok(results);
                assert.ok(results.includes('count,foo'));
                assert.ok(results.includes('1,bar'));
                assert.ok(results.includes('2,bar'));
                assert.ok(results.includes('3,bar'));
            });

            it("Oneshot search with no results", async function () {
                let sid = getNextId();
                var that = this;
                let query = 'search index=history MUST_NOT_EXISTABCDEF';
                let results = await that.service.jobs().oneshotSearch(query, { id: sid });
                assert.ok(results);
                assert.strictEqual(results.fields.length, 0);
                assert.strictEqual(results.rows.length, 0);
                assert.ok(!results.preview);
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

            it("Service search", async function () {
                let sid = getNextId();
                let that = this;
                let namespace = { owner: "admin", app: "search" };
                let job = await that.service.search('search index=_internal | head 1 | stats count', { id: sid }, namespace);
                assert.strictEqual(job.sid, sid);
                assert.strictEqual(job.namespace, namespace);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                [results, job] = await job.results({});
                assert.strictEqual(results.rows.length, 1);
                assert.strictEqual(results.fields.length, 1);
                assert.strictEqual(results.fields[0], "count");
                assert.strictEqual(results.rows[0][0], "1");
                await job.cancel();
            });

            it("Wait until job done", async function () {
                let job = await this.service.search('search index=_internal | head 1000', {});
                let numReadyEvents = 0;
                let numProgressEvents = 0;
                await job.track({ period: 200 }, {
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
                    },
                    failed: function (job) {
                        assert.ok(job);
                        assert.ok(false, "Job failed unexpectedly.");
                    },
                    error: function (err) {
                        assert.ok(err);
                        assert.ok(false, "Error while tracking job.");
                    }
                });

            });

            it("Wait until job failed", async function () {
                let job = await this.service.search('search index=_internal | head bogusarg', {});

                let numReadyEvents = 0;
                let numProgressEvents = 0;
                await job.track({ period: 200 }, {
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
                    },
                    failed: function (job) {
                        assert.ok(job);
                        assert.ok(numReadyEvents === 1);      // even failed jobs become ready
                        assert.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
                    },
                    error: function (err) {
                        assert.ok(err);
                        assert.ok(false, "Error while tracking job.");
                    }
                });
            });

            it("track() with default params and one function", async function () {
                let job = await this.service.search('search index=_internal | head 1', {});

                await job.track({}, function (job) {
                    assert.ok(job);
                });
            });

            it("track() should stop polling if only the ready callback is specified", async function () {
                let job = await this.service.search('search index=_internal | head 1', {});

                await job.track({}, {
                    ready: function (job) {
                        assert.ok(job);
                    },
                    _stoppedAfterReady: function (job) {
                        assert.ok(job);
                    }
                });
            });

            it("track() a job that is not immediately ready", async function () {
                /*jshint loopfunc:true */
                let numJobs = 20;
                let numJobsLeft = numJobs;
                let gotJobNotImmediatelyReady = false;
                let taskList = []
                let service = this.service;
                for (let i = 0; i < numJobs; i++) {
                    taskList.push(async function(){
                        let job = await service.search('search index=_internal | head 10000', {});
                            await job.track({}, {
                                _preready: function (job) {
                                    gotJobNotImmediatelyReady = true;
                                },
    
                                ready: function (job) {
                                    numJobsLeft--;
                                    if (numJobsLeft === 0) {
                                        if (!gotJobNotImmediatelyReady) {
                                            splunkjs.Logger.error("", "WARNING: Couldn't test code path in track() where job wasn't ready immediately.");
                                        }
                                        
                                        assert.ok(true);
                                    }
                                }
                            });
                    })
                }
                let [err, resp] = await utils.parallel(taskList);
                assert.ok(!err);
            });

            it("Service.getJob() works", async function () {
                var that = this;
                let sidsMatch = false;
                let job = await this.service.search('search index=_internal | head 1', {});
                let sid = job.sid;
                let innerJob = await that.service.getJob(sid);
                assert.strictEqual(sid, innerJob.sid);
                sidsMatch = sid === innerJob.sid;
                assert.ok(sidsMatch);
            });
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    let cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    if (!process.env.SPLUNK_HOME) {
        throw new Error("$PATH variable SPLUNK_HOME is not set. Please export SPLUNK_HOME to the splunk instance.");
    }

    let svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
