
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;
assert = chai.assert;

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

describe("Service Tests ", function(){

    describe("Namespace tests", () => {
        beforeEach(async function () {
            this.service = svc;
            let that = this;

            let appName1 = "jssdk_testapp_" + getNextId();
            let appName2 = "jssdk_testapp_" + getNextId();

            let userName1 = "jssdk_testuser_" + getNextId();
            let userName2 = "jssdk_testuser_" + getNextId();

            let apps = this.service.apps();
            let users = this.service.users();

            this.namespace11 = { owner: userName1, app: appName1 };
            this.namespace12 = { owner: userName1, app: appName2 };
            this.namespace21 = { owner: userName2, app: appName1 };
            this.namespace22 = { owner: userName2, app: appName2 };

            let app1 = await apps.create({ name: appName1 });
            that.app1 = app1;
            that.appName1 = appName1;
            let app2 = await apps.create({ name: appName2 });
            that.app2 = app2;
            that.appName2 = appName2;
            let user1 = users.create({ name: userName1, password: "abcdefg!", roles: ["user"] });
            that.user1 = user1;
            that.userName1 = userName1;
            let user2 = users.create({ name: userName2, password: "abcdefg!", roles: ["user"] });
            that.user2 = user2;
            that.userName2 = userName2;
            await utils.sleep(2000);
        });

        it("Namespace protection", async function () {
            let searchName = "jssdk_search_" + getNextId();
            let search = "search *";
            let service = this.service;
            let savedSearches11 = service.savedSearches(this.namespace11);
            let savedSearches21 = service.savedSearches(this.namespace21);

            // Create the saved search only in the 11 namespace
            await savedSearches11.create({ name: searchName, search: search });
            // Refresh the 11 saved searches
            await savedSearches11.fetch();
            // Refresh the 21 saved searches
            await savedSearches21.fetch();
            let entity11 = savedSearches11.item(searchName);
            let entity21 = savedSearches21.item(searchName);

            // Make sure the saved search exists in the 11 namespace
            assert.ok(entity11);
            assert.strictEqual(entity11.name, searchName);
            assert.strictEqual(entity11.properties().search, search);

            // Make sure the saved search doesn't exist in the 11 namespace
            assert.ok(!entity21);
        });

        it("Namespace item", async function () {
            let searchName = "jssdk_search_" + getNextId();
            let search = "search *";
            let service = this.service;

            let namespace_1 = { owner: "-", app: this.appName1 };
            let namespace_nobody1 = { owner: "nobody", app: this.appName1 };

            let savedSearches11 = service.savedSearches(this.namespace11);
            let savedSearches21 = service.savedSearches(this.namespace21);
            let savedSearches_1 = service.savedSearches(namespace_1);
            let savedSearches_nobody1 = service.savedSearches(namespace_nobody1);

            let that = this;
            // Create a saved search in the 11 namespace
            await savedSearches11.create({ name: searchName, search: search });
            // Create a saved search in the 21 namespace
            await savedSearches21.create({ name: searchName, search: search });
            // Refresh the -/1 namespace
            await savedSearches_1.fetch();
            // Refresh the 1/1 namespace
            await savedSearches11.fetch();
            // Refresh the 2/1 namespace
            await savedSearches21.fetch();
            let entity11 = savedSearches11.item(searchName, that.namespace11);
            let entity21 = savedSearches21.item(searchName, that.namespace21);

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

            // Create a saved search in the nobody/1 namespace
            await savedSearches_nobody1.create({ name: searchName, search: search });
            // Refresh the 1/1 namespace
            await savedSearches11.fetch();
            // Refresh the 2/1 namespace
            await savedSearches21.fetch();
            // Ensure that we can't get the item from the generic
            // namespace without specifying a namespace
            try {
                savedSearches_1.item(searchName);
                assert.ok(false);
            } catch (err) {
                assert.ok(err);
            }

            // Ensure that we can't get the item using wildcard namespaces.
            try {
                savedSearches_1.item(searchName, { owner: '-' });
                assert.ok(false);
            } catch (err) {
                assert.ok(err);
            }

            try {
                savedSearches_1.item(searchName, { app: '-' });
                assert.ok(false);
            } catch (err) {
                assert.ok(err);
            }

            try {
                savedSearches_1.item(searchName, { app: '-', owner: '-' });
                assert.ok(false);
            } catch (err) {
                assert.ok(err);
            }

            // Ensure we get the right entities from the -/1 namespace when we
            // specify it.
            entity11 = savedSearches_1.item(searchName, that.namespace11);
            entity21 = savedSearches_1.item(searchName, that.namespace21);

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
        });

        it("Delete test users", async function () {
            let users = this.service.users();
            users = await users.fetch();
            let userList = users.list();
            await utils.parallelEach(
                userList,
                async function (user, idx) {
                    if (utils.startsWith(user.name, "jssdk_")) {
                        await user.remove();
                    }
                }
            );
        })
    });

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
            var that = this;
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
            let service = this.service;
            let that = this;
            let job = await that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid });
            assert.strictEqual(job.sid, sid);
            await pollUntil(
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
            let service = this.service;
            let that = this;
            let job = await that.service.jobs().search('search index=_internal | head 1', { id: sid });
            assert.strictEqual(job.sid, sid);
            await pollUntil(
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
            let service = this.service;
            let that = this;
            let job = await that.service.jobs().search('search index=_internal | head 2', { id: sid });
            assert.strictEqual(job.sid, sid);
            await pollUntil(
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
            let service = this.service;
            let that = this;
            let job = await that.service.jobs().search('search index=_internal | head 1 | stats count', { id: sid });
            assert.strictEqual(job.sid, sid);
            await pollUntil(
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
            await pollUntil(
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
        //             pollUntil(
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
        //             pollUntil(
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
            let response = await job.searchlog();
            let log = response[0];
            job = response[1];
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
            let response = await job.summary({});
            let summary = response[0];
            job = response[1];
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
            let response = await job.timeline({});
            let timeline = response[0];
            job = response[1];
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
            try {
                let res = await jobs.create({ search: originalSearch, name: name, exec_mode: "oneshot" });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Create fails with no search string", async function () {
            let jobs = this.service.jobs();
            try {
                let res = await jobs.create("", {});
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Oneshot search", async function () {
            let sid = getNextId();
            var that = this;
            let originalTime = "";
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
            let service = this.service;
            let that = this;
            let namespace = { owner: "admin", app: "search" };
            let job = await that.service.search('search index=_internal | head 1 | stats count', { id: sid }, namespace);
            assert.strictEqual(job.sid, sid);
            assert.strictEqual(job.namespace, namespace);
            await pollUntil(
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
            for (let i = 0; i < numJobs; i++) {
                this.service.search('search index=_internal | head 10000', {}).then(async (job) => {
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
                });
            }
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
    });

    describe("Datamodels test", () => {
        beforeEach(async function () {
            this.service = svc;
            this.dataModels = svc.dataModels();
            this.skip = false;
            var that = this;
            let info = await this.service.serverInfo();
            if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                that.skip = true;
                splunkjs.Logger.log("Skipping data model tests...");
            }
        });

        it("DataModels - fetch a built-in data model", async function () {
            if (this.skip) {
                return;
            }
            let that = this;
            let dataModels = await that.dataModels.fetch();
            let dm = dataModels.item("internal_audit_logs");
            // Check for the 3 objects we expect
            assert.ok(dm.objectByName("Audit"));
            assert.ok(dm.objectByName("searches"));
            assert.ok(dm.objectByName("modify"));

            // Check for an object that shouldn't exist
            assert.strictEqual(null, dm.objectByName(getNextId()));
        });

        it("DataModels - create & delete an empty data model", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/empty_data_model.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModels = await that.dataModels.fetch();
            let initialSize = dataModels.list().length;
            let dataModel = await dataModels.create(name, args);
            let updatedDataModels = await that.dataModels.fetch();
            // Make sure we have 1 more data model than we started with
            assert.strictEqual(initialSize + 1, updatedDataModels.list().length);
            // Delete the data model we just created, by name.
            await updatedDataModels.item(name).remove();
            let newDataModels = await that.dataModels.fetch();
            assert.strictEqual(initialSize, newDataModels.list().length);
        });

        it("DataModels - create a data model with spaces in the name, which are swapped for -'s", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/empty_data_model.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me- " + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            assert.strictEqual(name.replace(" ", "_"), dataModel.name);
        });

        it("DataModels - create a data model with 0 objects", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/empty_data_model.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            // Check for 0 objects before fetch
            assert.strictEqual(0, dataModel.objects.length);
            let dataModels = await that.dataModels.fetch();
            assert.strictEqual(0, dataModels.item(name).objects.length);
        });

        it("DataModels - create a data model with 1 search object", async function () {
            if (this.skip) {
                return;
            }
            let dataModels = this.service.dataModels();

            let args;
            try {
                let response = await fetch("./data/object_with_one_search.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            // Check for 1 object before fetch
            assert.strictEqual(1, dataModel.objects.length);
            dataModels = await that.dataModels.fetch();
            // Check for 1 object after fetch
            assert.strictEqual(1, dataModels.item(name).objects.length);
        });

        it("DataModels - create a data model with 2 search objects", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/object_with_two_searches.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            // Check for 2 objects before fetch
            assert.strictEqual(2, dataModel.objects.length);
            dataModels = await that.dataModels.fetch();
            // Check for 2 objects after fetch
            assert.strictEqual(2, dataModels.item(name).objects.length);
        });

        it("DataModels - data model objects are created correctly", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/object_with_two_searches.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            assert.ok(dataModel.hasObject("search1"));
            assert.ok(dataModel.hasObject("search2"));
            
            let search1 = dataModel.objectByName("search1");
            assert.ok(search1);
            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98%20-%20search%201"), search1.displayName);
            
            let search2 = dataModel.objectByName("search2");
            assert.ok(search2);
            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98%20-%20search%202"), search2.displayName);
        });

        it("DataModels - data model handles unicode characters", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/model_with_unicode_headers.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            assert.strictEqual(name, dataModel.name);
            assert.strictEqual(decodeURI("%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4%E2%80%A1%C3%98%C2%B5"), dataModel.displayName);
            assert.strictEqual(decodeURI("%E2%80%A1%C3%98%C2%B5%E2%80%A1%C3%98%C2%B1%E2%80%A1%C3%98%E2%88%9E%E2%80%A1%C3%98%C3%98"), dataModel.description);
        });

        it("DataModels - create data model with empty headers", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/model_with_empty_headers.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            assert.strictEqual(name, dataModel.name);
            assert.strictEqual("", dataModel.displayName);
            assert.strictEqual("", dataModel.description);
            
            // Make sure we're not getting a summary of the data model
            assert.strictEqual("0", dataModel.concise);
        });

        it("DataModels - test acceleration settings", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_with_test_objects.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
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
        });

        it("DataModels - test data model object metadata", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_with_test_objects.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("event1");
            assert.ok(obj);
            
            assert.strictEqual(decodeURI("event1%20%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4"), obj.displayName);
            assert.strictEqual("event1", obj.name);
            assert.deepEqual(dataModel, obj.dataModel);
        });

        it("DataModels - test data model object parent", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_with_test_objects.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("event1");
            assert.ok(obj);
            assert.ok(!obj.parent());
        });

        it("DataModels - test data model object lineage", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/inheritance_test_data.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("level_0");
            assert.ok(obj);
            assert.strictEqual(1, obj.lineage.length);
            assert.strictEqual("level_0", obj.lineage[0]);
            assert.strictEqual("BaseEvent", obj.parentName);
            
            obj = dataModel.objectByName("level_1");
            assert.ok(obj);
            assert.strictEqual(2, obj.lineage.length);
            assert.deepEqual(["level_0", "level_1"], obj.lineage);
            assert.strictEqual("level_0", obj.parentName);
            
            obj = dataModel.objectByName("level_2");
            assert.ok(obj);
            assert.strictEqual(3, obj.lineage.length);
            assert.deepEqual(["level_0", "level_1", "level_2"], obj.lineage);
            assert.strictEqual("level_1", obj.parentName);
            
            // Make sure there's no extra children
            assert.ok(!dataModel.objectByName("level_3"));
        });

        it("DataModels - test data model object fields", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/inheritance_test_data.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("level_2");
            assert.ok(obj);
            
            let timeField = obj.fieldByName("_time");
            assert.ok(timeField);
            assert.strictEqual("timestamp", timeField.type);
            assert.ok(timeField.isTimestamp());
            assert.ok(!timeField.isNumber());
            assert.ok(!timeField.isString());
            assert.ok(!timeField.isObjectcount());
            assert.ok(!timeField.isChildcount());
            assert.ok(!timeField.isIPv4());
            assert.deepEqual(["BaseEvent"], timeField.lineage);
            assert.strictEqual("_time", timeField.name);
            assert.strictEqual(false, timeField.required);
            assert.strictEqual(false, timeField.multivalued);
            assert.strictEqual(false, timeField.hidden);
            assert.strictEqual(false, timeField.editable);
            assert.strictEqual(null, timeField.comment);
            
            let lvl2 = obj.fieldByName("level_2");
            assert.strictEqual("level_2", lvl2.owner);
            assert.deepEqual(["level_0", "level_1", "level_2"], lvl2.lineage);
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
        });

        it("DataModels - test data model object properties", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            assert.strictEqual(5, obj.fieldNames().length);
            assert.strictEqual(10, obj.allFieldNames().length);
            assert.ok(obj.fieldByName("has_boris"));
            assert.ok(obj.hasField("has_boris"));
            assert.ok(obj.fieldByName("_time"));
            assert.ok(obj.hasField("_time"));
        });

        it("DataModels - create local acceleration job", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/inheritance_test_data.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let obj;
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            obj = dataModel.objectByName("level_2");
            assert.ok(obj);
            job = await obj.createLocalAccelerationJob(null);
            assert.ok(job);
            await pollUntil(
                job,
                function (j) {
                    return job.properties()["isDone"];
                },
                10
            );
            assert.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
            await job.cancel();
        });

        it("DataModels - create local acceleration job with earliest time", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/inheritance_test_data.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("level_2");
            assert.ok(obj);
            let job = await obj.createLocalAccelerationJob("-1d");
            assert.ok(job);
            await pollUntil(
                job,
                function (j) {
                    return job.properties()["isDone"];
                },
                10
                );
                assert.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
                
                // Make sure the earliest time is 1 day behind
                let yesterday = new Date(Date.now() - (1000 * 60 * 60 * 24));
                let month = (yesterday.getMonth() + 1);
                if (month <= 9) {
                month = "0" + month;
            }
            let date = yesterday.getDate();
            if (date <= 9) {
                date = "0" + date;
            }
            let expectedDate = yesterday.getFullYear() + "-" + month + "-" + date;
            assert.ok(utils.startsWith(job._state.content.earliestTime, expectedDate));
            
            await job.cancel();
        });

        it("DataModels - test data model constraints", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_with_test_objects.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("event1");
            assert.ok(obj);
            let constraints = obj.constraints;
            assert.ok(constraints);
            let onlyOne = true;
            for (var i = 0; i < constraints.length; i++) {
                var constraint = constraints[i];
                assert.ok(!!onlyOne);
                assert.strictEqual("event1", constraint.owner);
                assert.strictEqual("uri=\"*.php\" OR uri=\"*.py\"\nNOT (referer=null OR referer=\"-\")", constraint.query);
            }
        });

        it("DataModels - test data model calculations, and the different types", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/data_model_with_test_objects.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("event1");
            assert.ok(obj);
            let calculations = obj.calculations;
            assert.strictEqual(4, Object.keys(calculations).length);
            assert.strictEqual(4, obj.calculationIDs().length);
            
            let evalCalculation = calculations["93fzsv03wa7"];
            assert.ok(evalCalculation);
            assert.strictEqual("event1", evalCalculation.owner);
            assert.deepEqual(["event1"], evalCalculation.lineage);
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
            
            let field = evalCalculation.outputFields["new_field"];
            assert.ok(field);
            assert.strictEqual("My New Field", field.displayName);
            
            let lookupCalculation = calculations["sr3mc8o3mjr"];
            assert.ok(lookupCalculation);
            assert.strictEqual("event1", lookupCalculation.owner);
            assert.deepEqual(["event1"], lookupCalculation.lineage);
            assert.strictEqual("Lookup", lookupCalculation.type);
            assert.ok(lookupCalculation.isLookup());
            assert.ok(!lookupCalculation.isEval());
            assert.ok(!lookupCalculation.isGeoIP());
            assert.ok(!lookupCalculation.isRex());
            assert.strictEqual(null, lookupCalculation.comment);
            assert.strictEqual(true, lookupCalculation.isEditable());
            assert.deepEqual({ lookupField: "a_lookup_field", inputField: "host" }, lookupCalculation.inputFieldMappings);
            assert.strictEqual(2, Object.keys(lookupCalculation.inputFieldMappings).length);
            assert.strictEqual("a_lookup_field", lookupCalculation.inputFieldMappings.lookupField);
            assert.strictEqual("host", lookupCalculation.inputFieldMappings.inputField);
            assert.strictEqual("dnslookup", lookupCalculation.lookupName);
            
            let regexpCalculation = calculations["a5v1k82ymic"];
            assert.ok(regexpCalculation);
            assert.strictEqual("event1", regexpCalculation.owner);
            assert.deepEqual(["event1"], regexpCalculation.lineage);
            assert.strictEqual("Rex", regexpCalculation.type);
            assert.ok(regexpCalculation.isRex());
            assert.ok(!regexpCalculation.isLookup());
            assert.ok(!regexpCalculation.isEval());
            assert.ok(!regexpCalculation.isGeoIP());
            assert.strictEqual(2, regexpCalculation.outputFieldNames().length);
            assert.strictEqual("_raw", regexpCalculation.inputField);
            assert.strictEqual(" From: (?<from>.*) To: (?<to>.*) ", regexpCalculation.expression);
            
            let geoIPCalculation = calculations["pbe9bd0rp4"];
            assert.ok(geoIPCalculation);
            assert.strictEqual("event1", geoIPCalculation.owner);
            assert.deepEqual(["event1"], geoIPCalculation.lineage);
            assert.strictEqual("GeoIP", geoIPCalculation.type);
            assert.ok(geoIPCalculation.isGeoIP());
            assert.ok(!geoIPCalculation.isLookup());
            assert.ok(!geoIPCalculation.isEval());
            assert.ok(!geoIPCalculation.isRex());
            assert.strictEqual(decodeURI("%C2%B7%C3%84%C2%A9%C2%B7%C3%B6%C3%B4%E2%80%A1%C3%98%C2%B5%20comment%20of%20pbe9bd0rp4"), geoIPCalculation.comment);
            assert.strictEqual(5, geoIPCalculation.outputFieldNames().length);
            assert.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField);
        });

        it("DataModels - run queries", async function () {
            if (this.skip) {
                return;
            }
            let that = this;
            let dataModels = await that.dataModels.fetch();
            let dm = dataModels.item("internal_audit_logs");
            let obj = dm.objectByName("searches");
            let job = await obj.startSearch({}, "");
            await pollUntil(
                job,
                function (j) {
                    return job.properties()["isDone"];
                },
                10);
            assert.strictEqual("| datamodel internal_audit_logs searches search", job.properties().request.search);
            await job.cancel();

            job = await obj.startSearch({ status_buckets: 5, enable_lookups: false }, "| head 3");
            await pollUntil(
                job,
                function (j) {
                    return job.properties()["isDone"];
                },
                10);
            assert.strictEqual("| datamodel internal_audit_logs searches search | head 3", job.properties().request.search);
            await job.cancel();
        });

        it("DataModels - baseSearch is parsed correctly", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/model_with_multiple_types.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("search1");
            assert.ok(obj);
            assert.ok(obj instanceof splunkjs.Service.DataModelObject);
            assert.strictEqual("BaseSearch", obj.parentName);
            assert.ok(obj.isBaseSearch());
            assert.ok(!obj.isBaseTransaction());
            assert.strictEqual("search index=_internal | head 10", obj.baseSearch);
        });

        it("DataModels - baseTransaction is parsed correctly", async function () {
            if (this.skip) {
                return;
            }
            let args;
            try {
                let response = await fetch("./data/model_with_multiple_types.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let name = "delete-me-" + getNextId();
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("transaction1");
            assert.ok(obj);
            assert.ok(obj instanceof splunkjs.Service.DataModelObject);
            assert.strictEqual("BaseTransaction", obj.parentName);
            assert.ok(obj.isBaseTransaction());
            assert.ok(!obj.isBaseSearch());
            assert.deepEqual(["event1"], obj.objectsToGroup);
            assert.deepEqual(["host", "from"], obj.groupByFields);
            assert.strictEqual("25s", obj.maxPause);
            assert.strictEqual("100m", obj.maxSpan);
        })
    });

    describe("Pivot Tests", () => {
        beforeEach(async function () {
            this.service = svc;
            this.dataModels = svc.dataModels({ owner: "nobody", app: "search" });
            this.skip = false;
            var that = this;
            let info = await this.service.serverInfo();
            if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                that.skip = true;
                splunkjs.Logger.log("Skipping pivot tests...");
            }
        })

        it("Pivot - test constructor args", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            assert.ok(dataModel.objectByName("test_data"));
        })

        it("Pivot - test acceleration, then pivot", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            dataModel.objectByName("test_data");
            assert.ok(dataModel);
            dataModel.acceleration.enabled = true;
            dataModel.acceleration.earliestTime = "-2mon";
            dataModel.acceleration.cronSchedule = "0 */12 * * *";
            dataModel = await dataModel.update();
            let props = dataModel.properties();
            assert.strictEqual(true, dataModel.isAccelerated());
            assert.strictEqual(true, !!dataModel.acceleration.enabled);
            assert.strictEqual("-2mon", dataModel.acceleration.earliest_time);
            assert.strictEqual("0 */12 * * *", dataModel.acceleration.cron_schedule);
            
            let dataModelObject = dataModel.objectByName("test_data");
            let pivotSpecification = dataModelObject.createPivotSpecification();
            assert.strictEqual(dataModelObject.dataModel.name, pivotSpecification.accelerationNamespace);
            
            let name1 = "delete-me-" + getNextId();
            pivotSpecification.setAccelerationJob(name1);
            assert.strictEqual("sid=" + name1, pivotSpecification.accelerationNamespace);
            
            let namespaceTemp = "delete-me-" + getNextId();
            pivotSpecification.accelerationNamespace = namespaceTemp;
            assert.strictEqual(namespaceTemp, pivotSpecification.accelerationNamespace);
            
            [job, pivot] = await pivotSpecification
            .addCellValue("test_data", "Source Value", "count")
            .run();
            assert.ok(job);
            assert.ok(pivot);
            assert.notStrictEqual("FAILED", job.properties().dispatchState);
            
            job = await job.track({}, function (job) {
                assert.ok(pivot.tstatsSearch);
                assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);
                assert.strictEqual(pivot.tstatsSearch, job.properties().request.search);
            });
        })

        it("Pivot - test illegal filtering (all types)", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            
            let pivotSpecification = obj.createPivotSpecification();
            
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
        })
        
        it("Pivot - test boolean filtering", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            
            let pivotSpecification = obj.createPivotSpecification();
            try {
                pivotSpecification.addFilter("has_boris", "boolean", "=", true);
                assert.strictEqual(1, pivotSpecification.filters.length);
                
                //Test the individual parts of the filter
                let filter = pivotSpecification.filters[0];
                
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
        })

        it("Pivot - test string filtering", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            
            var pivotSpecification = obj.createPivotSpecification();
            try {
                pivotSpecification.addFilter("host", "string", "contains", "abc");
                assert.strictEqual(1, pivotSpecification.filters.length);
                
                //Test the individual parts of the filter
                let filter = pivotSpecification.filters[0];
                
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
        })

        it("Pivot - test IPv4 filtering", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            
            var pivotSpecification = obj.createPivotSpecification();
            try {
                pivotSpecification.addFilter("hostip", "ipv4", "startsWith", "192.168");
                assert.strictEqual(1, pivotSpecification.filters.length);
                
                //Test the individual parts of the filter
                let filter = pivotSpecification.filters[0];
                
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
        })

        it("Pivot - test number filtering", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
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
        })

        it("Pivot - test limit filtering", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);

            let pivotSpecification = obj.createPivotSpecification();
            try {
                pivotSpecification.addLimitFilter("epsilon", "host", "ASCENDING", 500, "average");
                assert.strictEqual(1, pivotSpecification.filters.length);
                
                //Test the individual parts of the filter
                let filter = pivotSpecification.filters[0];
                
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
        })

        it("Pivot - test row split", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            
            let pivotSpecification = obj.createPivotSpecification();
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
                pivotSpecification.addRangeRowSplit("has_boris", "Wrong type here", { start: 0, end: 100, step: 20, limit: 5 });
            }
            catch (e) {
                assert.ok(e);
                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
            }
            try {
                pivotSpecification.addRangeRowSplit(field, "Break Me!", { start: 0, end: 100, step: 20, limit: 5 });
                assert.ok(false);
            }
            catch (e) {
                assert.ok(e);
                assert.strictEqual(e.message, "Did not find field " + field);
            }
            
            // Test range row split
            pivotSpecification.addRangeRowSplit("epsilon", "My Label", { start: 0, end: 100, step: 20, limit: 5 });
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
        })

        it("Pivot - test column split", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);

            let pivotSpecification = obj.createPivotSpecification();
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

            // Test error handling for range column split
            try {
                pivotSpecification.addRangeColumnSplit("has_boris", "Wrong type here", { start: 0, end: 100, step: 20, limit: 5 });
            }
            catch (e) {
                assert.ok(e);
                assert.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
            }
            try {
                pivotSpecification.addRangeColumnSplit(field, { start: 0, end: 100, step: 20, limit: 5 });
                assert.ok(false);
            }
            catch (e) {
                assert.ok(e);
                assert.strictEqual(e.message, "Did not find field " + field);
            }

            // Test range column split
            pivotSpecification.addRangeColumnSplit("epsilon", { start: 0, end: 100, step: 20, limit: 5 });
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
        })

        it("Pivot - test cell value", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }

            let that = this;
            let dataModel = await that.dataModels.create(name, args);
            let obj = dataModel.objectByName("test_data");
            assert.ok(obj);

            let pivotSpecification = obj.createPivotSpecification()
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
        })

        it("Pivot - test pivot throws HTTP exception", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
                
            let that = this;
            try {
                let dataModel = await that.dataModels.create(name, args);
                let obj = dataModel.objectByName("test_data");
                assert.ok(obj);

                let pivot = await obj.createPivotSpecification().pivot();
                assert.ok(false);
            } catch (err) {
                assert.ok(err);
                let expectedErr = "In handler 'datamodelpivot': Error in 'PivotReport': Must have non-empty cells or non-empty rows.";
                assert.ok(utils.endsWith(err.message, expectedErr));
            }
        })

        it("Pivot - test pivot with simple namespace", async function () {
            if (this.skip) {
                return;
            }
            let name = "delete-me-" + getNextId();
            let args;
            try {
                let response = await fetch("./data/data_model_for_pivot.json");
                args = await response.json();
            }
            catch (err) {
                // Fail if we can't read the file, likely to occur in the browser
                assert.ok(!err);
            }
            let that = this;
            let obj;
            let pivotSpecification;
            let adhocjob;
            let dataModel = await that.dataModels.create(name, args);
            obj = dataModel.objectByName("test_data");
            assert.ok(obj);
            job = await obj.createLocalAccelerationJob(null);
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

            let pivot = await pivotSpecification.pivot();
            assert.ok(pivot.tstatsSearch);
            assert.ok(pivot.tstatsSearch.length > 0);
            assert.strictEqual(0, pivot.tstatsSearch.indexOf("| tstats"));
            // This test won't work with utils.startsWith due to the regex escaping
            assert.strictEqual("| tstats", pivot.tstatsSearch.match("^\\| tstats")[0]);
            assert.strictEqual(1, pivot.tstatsSearch.match("^\\| tstats").length);
            job = await pivot.run();
            await pollUntil(
                job,
                function (j) {
                    return job.properties().isDone;
                },
                10
            );
            assert.ok("FAILED" !== job.properties().dispatchState);
            assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
            // This test won't work with utils.startsWith due to the regex escaping
            assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
            assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);
            
            await adhocjob.cancel();
        })

        it("Pivot - test pivot column range split", async function () {
            // This test is here because we had a problem with fields that were supposed to be
            // numbers being expected as strings in Splunk 6.0. This was fixed in Splunk 6.1, and accepts
            // either strings or numbers.

            if (this.skip) {
                return;
            }
            let that = this;
            let search;
            let dataModels = await that.dataModels.fetch();
            let dm = dataModels.item("internal_audit_logs");
            let obj = dm.objectByName("searches");
            let pivotSpecification = obj.createPivotSpecification();

            pivotSpecification.addRowSplit("user", "Executing user");
            pivotSpecification.addRangeColumnSplit("exec_time", { start: 0, end: 12, step: 5, limit: 4 });
            pivotSpecification.addCellValue("search", "Search Query", "values");
            let pivot = await pivotSpecification.pivot();
            // If tstats is undefined, use pivotSearch
            search = pivot.tstatsSearch || pivot.pivotSearch;
            let job = await pivot.run();
            await pollUntil(
                job,
                function (j) {
                    return job.properties().isDone;
                },
                10
            );
            assert.notStrictEqual("FAILED", job.properties().dispatchState);
            // Make sure the job is run with the correct search query
            assert.strictEqual(search, job.properties().request.search);
            await job.cancel();
        })

        it("Pivot - test pivot with PivotSpecification.run and Job.track", async function () {
            if (this.skip) {
                return;
            }
            let that = this;
            let dataModels = await that.dataModels.fetch();
            let dm = dataModels.item("internal_audit_logs");
            let obj = dm.objectByName("searches");
            let pivotSpecification = obj.createPivotSpecification();

            pivotSpecification.addRowSplit("user", "Executing user");
            pivotSpecification.addRangeColumnSplit("exec_time", { start: 0, end: 12, step: 5, limit: 4 });
            pivotSpecification.addCellValue("search", "Search Query", "values");

            let response = await pivotSpecification.run({});
            let job = response[0];
            let pivot = response[1];
            job = await job.track({}, function (job) {
                assert.strictEqual(pivot.tstatsSearch || pivot.pivotSearch, job.properties().request.search);
                return job;
            });
            assert.notStrictEqual("FAILED", job.properties().dispatchState);
            await job.cancel();
        })

        it("DataModels - delete any remaining data models created by the SDK tests", async function () {
            if (this.skip) {
                return;
            }
            let dataModels = await svc.dataModels().fetch();
            let dms = dataModels.list();
            dms.forEach(async (dataModel) => {
                if (utils.startsWith(dataModel.name, "delete-me")) {
                    await dataModel.remove();
                }
            });
        })
    });

    describe("App tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            done();
        });

        it("List applications", async function () {
            let apps = this.service.apps();
            let response = await apps.fetch();
            let appList = response.list()
            assert.ok(appList.length > 0);
        });

        it("Contains applications", async function () {
            let apps = this.service.apps();
            let response = await apps.fetch();
            let app = response.item("search");
            assert.ok(app);
        });

        it("Create, contains app", async function () {
            let name = "jssdk_testapp_" + getNextId();
            let apps = this.service.apps();
            let app = await apps.create({ name: name });
            let appName = app.name;
            let response = await apps.fetch();
            let entity = response.item(appName);
            assert.ok(entity);
            await app.remove();
        });

        it("Create, modify app", async function () {
            let DESCRIPTION = "TEST DESCRIPTION";
            let VERSION = "1.1.0";

            let name = "jssdk_testapp_" + getNextId();
            let apps = this.service.apps();

            let app = await apps.create({ name: name });
            assert.ok(app);
            assert.strictEqual(app.name, name);
            let versionMatches = app.properties().version === "1.0" ||
                app.properties().version === "1.0.0";
            assert.ok(versionMatches);
            app = await app.update({
                description: DESCRIPTION,
                version: VERSION
            });
            assert.ok(app);
            let properties = app.properties();

            assert.strictEqual(properties.description, DESCRIPTION);
            assert.strictEqual(properties.version, VERSION);
            await app.remove();
        });

        it("Delete test applications", async function () {
            let apps = this.service.apps();
            let response = await apps.fetch();
            let appList = response.list();
            await utils.parallelEach(
                appList,
                async function (app, idx) {
                    if (utils.startsWith(app.name, "jssdk_")) {
                        await app.remove();
                    }
                }
            );
        });

        it("list applications with cookies as authentication", async function () {
            let info = await this.service.serverInfo();
            let majorVersion = parseInt(info.properties().version.split(".")[0], 10);
            let minorVersion = parseInt(info.properties().version.split(".")[1], 10);
            // Skip cookie test if Splunk older than 6.2
            if (majorVersion < 6 || (majorVersion === 6 && minorVersion < 2)) {
                splunkjs.Logger.log("Skipping cookie test...");
                return;
            }
            let service1 = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                username: svc.username,
                password: svc.password,
                version: svc.version
            });
            let service2 = new splunkjs.Service(svc.http,{
                scheme: svc.scheme,
                host: svc.host,
                port: svc.port,
                version: svc.version
            });

            await service1.login();
            // Save the cookie store
            let cookieStore = service1.http._cookieStore;
            // Test that there are cookies
            assert.ok(!utils.isEmpty(cookieStore));

            // Add the cookies to a service with no other authenitcation information
            service2.http._cookieStore = cookieStore;

            let apps = service2.apps();
            let response = await apps.fetch();

            let appList = response.list();
            assert.ok(appList.length > 0);
            assert.ok(!utils.isEmpty(service2.http._cookieStore));

        })
    });

    describe("Saved Search Tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        })

        it("list", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch();
            const savedSearches = searches.list();
            assert.ok(savedSearches.length > 0);

            for (let i = 0; i < savedSearches.length; i++) {
                assert.ok(savedSearches[i]);
            };
        })

        it("contains", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch();
            const search = searches.item("Errors in the last hour");
            assert.ok(search);
        })

        it("suppress", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch();
            const search = searches.item("Errors in the last hour");
            assert.ok(search);
            await search.suppressInfo();
        })

        it("list limit count", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch({ count: 2 });
            const savedSearches = searches.list();
            assert.strictEqual(savedSearches.length, 2);

            for (let i = 0; i < savedSearches.length; i++) {
                assert.ok(savedSearches[i]);
            }
        })

        it("list filter", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch({ search: "Error" });
            const savedSearches = searches.list();
            assert.ok(savedSearches.length > 0);

            for (let i = 0; i < savedSearches.length; i++) {
                assert.ok(savedSearches[i]);
            }
        })

        it("list offset", async function () {
            let searches = this.service.savedSearches();
            searches = await searches.fetch({ offset: 2, count: 1 });
            const savedSearches = searches.list();
            assert.strictEqual(searches.paging().offset, 2);
            assert.strictEqual(searches.paging().perPage, 1);
            assert.strictEqual(savedSearches.length, 1);

            for (let i = 0; i < savedSearches.length; i++) {
                assert.ok(savedSearches[i]);
            }
        })

        it("create, modify and delete", async function () {
            const name = "jssdk_savedsearch3";
            const originalSearch = "search * | head 1";
            const updatedSearch = "search * | head 10";
            const updatedDescription = "description";

            let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
            let search = await searches.create({ search: originalSearch, name: name });
            assert.ok(search);
            assert.strictEqual(search.name, name);
            assert.strictEqual(search.properties().search, originalSearch);
            assert.ok(!search.properties().description);

            search = await search.update({ search: updatedSearch });
            assert.ok(search);
            assert.strictEqual(search.name, name);
            assert.strictEqual(search.properties().search, updatedSearch);
            assert.ok(!search.properties().description);

            search = await search.update({ description: updatedDescription });
            assert.ok(search);
            assert.strictEqual(search.name, name);
            assert.strictEqual(search.properties().search, updatedSearch);
            assert.strictEqual(search.properties().description, updatedDescription);

            search = await search.fetch();
            // Verify that we have the required fields
            assert.ok(search.fields().optional.length > 1);
            assert.ok(utils.indexOf(search.fields().optional, "disabled") > -1);

            await search.remove();
        })

        it("dispatch error", async function () {
            const name = "jssdk_savedsearch_" + getNextId();
            let search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                { owner: "nobody", app: "search" }
            );
            try {
                await search.dispatch();
            } catch (err) {
                assert.ok(err);
            }
        })

        it("dispatch omitting optional arguments", async function () {
            const name = "jssdk_savedsearch_" + getNextId();
            const originalSearch = "search index=_internal | head 1";

            let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
            var search = await searches.create({ search: originalSearch, name: name });
            assert.ok(search);
            assert.strictEqual(search.name, name);
            assert.strictEqual(search.properties().search, originalSearch);
            assert.ok(!search.properties().description);
            [job, search] = await search.dispatch();
            assert.ok(job);
            assert.ok(search);
        })

        it("history with pagination", async function () {
            const name = "jssdk_savedsearch_" + getNextId();
            const originalSearch = "search index=_internal | head 1";
            let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
            let search = await searches.create({ search: originalSearch, name: name });
            assert.ok(search);
            [job, search] = await search.dispatch();
            assert.ok(job);
            assert.ok(search);
            await pollUntil(
                job,
                () => job.properties()["isDone"],
                10
            );
            assert.ok(job);
            [jobs, search] = await search.history({ count: 1 });
            assert.ok(jobs.length > 0);
            assert.equal(jobs.length, 1);
        });

        it("history error", async function () {
            const name = "jssdk_savedsearch_" + getNextId();
            let search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                { owner: "nobody", app: "search", sharing: "system" }
            );
            try {
                await search.history();
            } catch (err) {
                assert.ok(err);
            }
        })

        it("update error", async function () {
            const name = "jssdk_savedsearch_" + getNextId();
            let search = new splunkjs.Service.SavedSearch(
                this.loggedOutService,
                name,
                { owner: "nobody", app: "search", sharing: "system" }
            );
            try {
                await search.update({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("oneshot requires search string", async function () {
            try {
                let res = await this.service.oneshotSearch({ name: "jssdk_oneshot_" + getNextId() });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        })

        it("Create, dispatch and history", async function () {
            let name = "jssdk_savedsearch_" + getNextId();
            let originalSearch = "search index=_internal | head 1";

            let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
            let search = await searches.create({ search: originalSearch, name: name });
            assert.ok(search);
            assert.strictEqual(search.name, name);
            assert.strictEqual(search.properties().search, originalSearch);
            assert.ok(!search.properties().description);
            [job, search] = await search.dispatch({ force_dispatch: false, "dispatch.buckets": 295 });
            assert.ok(job);
            assert.ok(search);
            await pollUntil(
                job,
                function (j) {
                    return job.properties()["isDone"];
                },
                10
            );
            assert.strictEqual(job.properties().statusBuckets, 295);
            let originalJob = job;
            [jobs, search] = await search.history();
            assert.ok(jobs);
            assert.ok(jobs.length > 0);
            assert.ok(search);
            assert.ok(originalJob);

            var cancel = function (job) {
                return async function () {
                    await job.cancel();
                };
            };
            let found = false;
            let cancellations = [];
            for (let i = 0; i < jobs.length; i++) {
                cancellations.push(cancel(jobs[i]));
                found = found || (jobs[i].sid === originalJob.sid);
            }
            assert.ok(found);
            await search.remove();
            await utils.parallel(cancellations);
        })

        it("delete test saved searches", async function () {
            let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
            searches = await searches.fetch();
            let searchList = searches.list();
            await utils.parallelEach(
                searchList,
                async function (search, idx,) {
                    if (utils.startsWith(search.name, "jssdk_")) {
                        await search.remove();
                    }
                }
            );
        })

        it("Job events fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.events({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Job preview fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.preview({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Job results fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.results({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Job searchlog fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.searchlog();
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Job summary fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.summary({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Job timeline fails", async function () {
            let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
            try {
                job = await job.timeline({});
            } catch (err) {
                assert.ok(err);
            }
        })

        it("SetupInfo succeeds", async function () {
            let app = new splunkjs.Service.Application(this.service, "sdkappcollection");
            const response = await app.setupInfo();
            app = response[1];
            assert.ok(app);
        })

        it("SetupInfo failure", async function () {
            let searches = new splunkjs.Service.Application(this.loggedOutService, "search");
            try {
                await searches.setupInfo();
            } catch (err) {
                assert.ok(err);
            }
        })

        it("UpdateInfo succeeds", async function () {
            let app = new splunkjs.Service.Application(this.service, "search");
            const response = await app.updateInfo();
            app = response[1];
            assert.ok(app);
            assert.strictEqual(app.name, 'search');
        })

        it("UpdateInfo failure", async function () {
            let app = new splunkjs.Service.Application(this.loggedOutService, "sdkappcollection");
            try {
                await app.updateInfo();
            } catch (err) {
                assert.ok(err);
            }
        })
    });

    describe("Fired alerts tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            var indexes = this.service.indexes();
            done();
        });

        it("create, verify emptiness and delete new alert group", async function () {
            let searches = this.service.savedSearches({ owner: this.service.username });
            let name = "jssdk_savedsearch_alert_" + getNextId();
            let searchConfig = {
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
            let search = await searches.create(searchConfig);
            assert.ok(search);
            assert.strictEqual(search.alertCount(), 0);
            let response = await search.history();
            let jobs = response[0];
            search = response[1];
            assert.strictEqual(jobs.length, 0);
            assert.strictEqual(search.firedAlertGroup().count(), 0);
            let firedAlertGroups = await searches.service.firedAlertGroups().fetch();
            let originalSearch = search;
            assert.strictEqual(firedAlertGroups.list().indexOf(originalSearch.name), -1);
            await originalSearch.remove();
        });

        // This test is not stable, commenting it out until we figure it out
        // it("Callback#alert is triggered + test firedAlert entity -- FAILS INTERMITTENTLY", function(done) {
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
        // });

        it("Delete all alerts", async function () {
            let namePrefix = "jssdk_savedsearch_alert_";
            let alertList = this.service.savedSearches().list();
            await utils.parallelEach(
                alertList,
                async function (alert, idx) {
                    if (utils.startsWith(alert.name, namePrefix)) {
                        splunkjs.Logger.log("ALERT ---", alert.name);
                        await alert.remove();
                    }
                }
            );
        })
    });

    describe("Properties Tests", () => {

        beforeEach(function (done) {
            this.service = svc;
            done();
        })

        it("List", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };
            let props = await that.service.configurations(namespace).fetch();
            let files = props.list();
            assert.ok(files.length > 0);
        })

        it("Item", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };
            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("web");
            assert.ok(file);
            file = await file.fetch();
            assert.strictEqual(file.name, "web");
        })

        it("Contains stanza", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };
            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("web");
            assert.ok(file);
            file = await file.fetch();
            assert.strictEqual(file.name, "web");
            let stanza = file.item("settings");
            assert.ok(stanza);
            stanza = await stanza.fetch();
            assert.ok(stanza.properties().hasOwnProperty("httpport"));
        })

        it("Create file, create stanza and update stanza", async function () {
            var that = this;
            let fileName = "jssdk_file_" + getNextId();
            let value = "barfoo_" + getNextId();
            let namespace = { owner: "admin", app: "search" };
            let properties = await that.service.configurations(namespace).fetch();
            let file = await properties.create(fileName);
            let stanza = await file.create("stanza");
            stanza = await stanza.update({ "jssdk_foobar": value });
            assert.strictEqual(stanza.properties()["jssdk_foobar"], value);

            let configFile = new splunkjs.Service.ConfigurationFile(svc, fileName);
            file = await configFile.fetch();
            stanza = file.item("stanza");
            assert.ok(stanza);
            await stanza.remove();
        })
    });

    describe("Configuration tests", function (done) {
        beforeEach(function (done) {
            this.service = svc;
            done();
        });

        it("List configurations", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };

            let props = await that.service.configurations(namespace).fetch();
            let files = props.list();
            assert.ok(files.length > 0);
        });

        it("Contains configurations", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };

            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("web");
            assert.ok(file);
            let fileFetched = await file.fetch();
            assert.strictEqual(fileFetched.name, "web");
        });

        it("Contains stanza", async function () {
            var that = this;
            let namespace = { owner: "admin", app: "search" };

            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("web");
            assert.ok(file);
            file = await file.fetch();
            assert.strictEqual(file.name, "web");
            let stanza = file.item("settings");
            assert.ok(stanza);
            stanza = await stanza.fetch();
            assert.ok(stanza.properties().hasOwnProperty("httpport"));
        });

        it("Configurations init", function (done) {
            assert.throws(function () {
                let confs = new splunkjs.Service.Configurations(
                    this.service,
                    { owner: "-", app: "-", sharing: "system" }
                );
            });
            done();
        });

        it("Create file, create stanza, update stanza", async function () {
            let namespace = { owner: "nobody", app: "system" };
            let fileName = "jssdk_file_" + getNextId();
            let value = "barfoo_" + getNextId();

            let configs = svc.configurations(namespace);
            configs = await configs.fetch();
            let file = await configs.create({ __conf: fileName });
            if (file.item("stanza")) {
                file.item("stanza").remove();
            }
            let stanza = await file.create("stanza");
            let stanzaUpdated = await stanza.update({ "jssdk_foobar": value });
            assert.strictEqual(stanzaUpdated.properties()["jssdk_foobar"], value);

            let fileFetched = new splunkjs.Service.ConfigurationFile(svc, fileName);
            fileFetched = await fileFetched.fetch();

            let stanzaFetched = fileFetched.item("stanza");
            assert.ok(stanzaFetched);
            await stanzaFetched.remove();
        });

        it("CreateAsync", async function () {
            let namespace = { owner: "nobody", app: "system" };
            let filename = "jssdk_file_new_" + getNextId();
            let stanza = "install"
            let property1 = "state"
            let value1 = "enabled";
            let property2 = "python.version"
            let value2 = "python3";

            let configs = svc.configurations(namespace);
            configs = await configs.fetch();
            let keyValueMap = {}
            keyValueMap[property1] = value1;
            keyValueMap[property2] = value2;
            await configs.createAsync(filename, stanza, keyValueMap);
            configs = svc.configurations(namespace);
            await configs.fetch();

            // a. File exists: Positive
            let configFile = await configs.getConfFile(filename);
            assert.ok(configFile);

            // b. Stanza exists: Positive
            configFile = await configFile.fetchAsync();
            let configStanza = await configs.getStanza(configFile, stanza);
            assert.ok(configStanza);
            assert.ok(configStanza._properties);
            assert.strictEqual(configStanza._properties[property1], value1);
            assert.strictEqual(configStanza._properties[property2], value2);

            // c. File exists: Negative
            let invalidConfigFile = await configs.getConfFile("invalid_filename");
            assert.ok(!invalidConfigFile);

            // d. Stanza exists: Negative
            let invalidConfigStanza = await configs.getStanza(configFile, "invalid_stanza_name");
            assert.ok(!invalidConfigStanza);
        });

        it("Get default stanza", async function () {
            let that = this;
            let namespace = { owner: "admin", app: "search" };

            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("savedsearches");
            assert.strictEqual(namespace, file.namespace);
            assert.ok(file);
            file = await file.fetch(done);
            assert.strictEqual(namespace, file.namespace);
            let stanza = await file.getDefaultStanza().fetch();
            assert.strictEqual(stanza.name, "default");
            assert.strictEqual(namespace, stanza.namespace);
        });

        it("Updating default stanza is noop", async function () {
            let that = this;
            let namespace = { owner: "admin", app: "search" };
            let backup = null;
            let invalid = "this won't work";

            let props = await that.service.configurations(namespace).fetch();
            let file = props.item("savedsearches");
            assert.strictEqual(namespace, file.namespace);
            assert.ok(file);
            file = await file.fetch();
            assert.strictEqual(namespace, file.namespace);
            let stanza = await file.getDefaultStanza().fetch();
            assert.ok(stanza._properties.hasOwnProperty("max_concurrent"));
            assert.strictEqual(namespace, stanza.namespace);
            backup = stanza._properties.max_concurrent;
            stanza = await stanza.update({ "max_concurrent": invalid });
            assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
            assert.strictEqual(stanza.properties()["max_concurrent"], backup);
            assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
            stanza = await stanza.fetch();
            assert.ok(stanza.properties().hasOwnProperty("max_concurrent"));
            assert.strictEqual(stanza.properties()["max_concurrent"], backup);
            assert.notStrictEqual(stanza.properties()["max_concurrent"], invalid);
        })
    });

    describe("Storage Password Tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            done();
        });

        it("Create", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            let realm = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create with backslashes", async function () {
            let startcount = -1;
            let name = "\\delete-me-" + getNextId();
            let realm = "\\delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create with slashes", async function () {
            let startcount = -1;
            let name = "/delete-me-" + getNextId();
            let realm = "/delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create without realm", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual("", storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create should fail without user, or realm", async function () {
            var that = this;
            let storagePasswords = that.service.storagePasswords().fetch();
            try {
                let res = await storagePasswords.create({ name: null, password: "changed!" });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        })

        it("Create should fail without password", async function () {
            var that = this;
            let storagePasswords = that.service.storagePasswords().fetch();
            try {
                let res = await storagePasswords.create({ name: "something", password: null });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        })

        it("Create should fail without user, realm, or password", async function () {
            var that = this;
            let storagePasswords = that.service.storagePasswords().fetch();
            try {
                let res = await storagePasswords.create({ name: null, password: null });
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        })

        it("Create with colons", async function () {
            let startcount = -1;
            let name = ":delete-me-" + getNextId();
            let realm = ":delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual("\\" + realm + ":\\" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create crazy", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            let realm = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({
                name: name + ":end!@#$%^&*()_+{}:|<>?",
                realm: ":start::!@#$%^&*()_+{}:|<>?" + realm,
                password: "changed!"
            });
            assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?", storagePassword.properties().username);
            assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?:", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Create with unicode chars", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            let realm = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({
                name: name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für",
                realm: ":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm,
                password: decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für"))
            });
            assert.strictEqual(name + ":end!@#$%^&*()_+{}:|<>?쎼 and 쎶 and &lt;&amp;&gt; für", storagePassword.properties().username);
            assert.strictEqual("\\:start\\:\\:!@#$%^&*()_+{}\\:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm + ":" + name + "\\:end!@#$%^&*()_+{}\\:|<>?쎼 and 쎶 and &lt;&amp;&gt; für:", storagePassword.name);
            assert.strictEqual(decodeURIComponent(encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für")), storagePassword.properties().clear_password);
            assert.strictEqual(":start::!@#$%^&*()_+{}:|<>?" + encodeURIComponent("쎼 and 쎶 and &lt;&amp;&gt; für") + realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Read", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            let realm = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
            let list = storagePasswords.list();
            let found = false;

            assert.strictEqual(startcount + 1, list.length);
            for (let i = 0; i < list.length; i++) {
                if (realm + ":" + name + ":" === list[i].name) {
                    found = true;
                }
            }
            assert.ok(found);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        it("Read with slashes", async function () {
            let startcount = -1;
            let name = "/delete-me-" + getNextId();
            let realm = "/delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.ok(!!storagePasswords.item(realm + ":" + name + ":"));
            let list = storagePasswords.list();
            let found = false;
            assert.strictEqual(startcount + 1, list.length);
            for (let i = 0; i < list.length; i++) {
                if (realm + ":" + name + ":" === list[i].name) {
                    found = true;
                }
            }
            assert.ok(found);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })

        // Disabling this test because clear_password field has been removed in Splunk 8.2
        //
        //
        // it("Callback#Update": function(done) {
        //     var startcount = -1;
        //     var name = "delete-me-" + getNextId();
        //     var realm = "delete-me-" + getNextId();
        //     var that = this;
        //     Async.chain([
        //             function(done) {
        //                 that.service.storagePasswords().fetch(done);
        //             },
        //             function(storagePasswords, done) {
        //                 startcount = storagePasswords.list().length;
        //                 storagePasswords.create({name: name, realm: realm, password: "changed!"}, done);
        //             },
        //             function(storagePassword, done) {
        //                 assert.strictEqual(name, storagePassword.properties().username);
        //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
        //                 assert.strictEqual("changed!", storagePassword.properties().clear_password);
        //                 assert.strictEqual(realm, storagePassword.properties().realm);
        //                 that.service.storagePasswords().fetch(Async.augment(done, storagePassword));
        //             },
        //             function(storagePasswords, storagePassword, done) {
        //                 assert.strictEqual(startcount + 1, storagePasswords.list().length);
        //                 storagePassword.update({password: "changed"}, done);
        //             },
        //             function(storagePassword, done) {
        //                 assert.strictEqual(name, storagePassword.properties().username);
        //                 assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
        //                 assert.strictEqual("changed", storagePassword.properties().clear_password);
        //                 assert.strictEqual(realm, storagePassword.properties().realm);
        //                 that.service.storagePasswords().fetch(done);
        //             },
        //             function(storagePasswords, done) {
        //                 var list = storagePasswords.list();
        //                 var found = false;
        //                 var index = -1;

        //                 assert.strictEqual(startcount + 1, list.length);
        //                 for (var i = 0; i < list.length; i ++) {
        //                     if (realm + ":" + name + ":" === list[i].name) {
        //                         found = true;
        //                         index = i;
        //                         assert.strictEqual(name, list[i].properties().username);
        //                         assert.strictEqual(realm + ":" + name + ":", list[i].name);
        //                         assert.strictEqual("changed", list[i].properties().clear_password);
        //                         assert.strictEqual(realm, list[i].properties().realm);
        //                     }
        //                 }
        //                 assert.ok(found);

        //                 if (!found) {
        //                     done(new Error("Didn't find the created password"));
        //                 }
        //                 else {
        //                     list[index].remove(done);
        //                 }
        //             },
        //             function(done) {
        //                 that.service.storagePasswords().fetch(done);
        //             },
        //             function(storagePasswords, done) {
        //                 assert.strictEqual(startcount, storagePasswords.list().length);
        //                 done();
        //             }
        //         ],
        //         function(err) {
        //             assert.ok(!err);
        //             done();
        //         }
        //     );
        // },

        it("Delete", async function () {
            let startcount = -1;
            let name = "delete-me-" + getNextId();
            let realm = "delete-me-" + getNextId();
            var that = this;
            let storagePasswords = await that.service.storagePasswords().fetch();
            startcount = storagePasswords.list().length;
            let storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            assert.strictEqual(realm + ":" + name + ":", storagePassword.name);
            assert.strictEqual("changed!", storagePassword.properties().clear_password);
            assert.strictEqual(realm, storagePassword.properties().realm);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            await storagePassword.remove();
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
            storagePassword = await storagePasswords.create({ name: name, realm: realm, password: "changed!" });
            assert.strictEqual(name, storagePassword.properties().username);
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount + 1, storagePasswords.list().length);
            let list = storagePasswords.list();
            let found = false;
            let index = -1;
            assert.strictEqual(startcount + 1, list.length);
            for (let i = 0; i < list.length; i++) {
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
                await list[index].remove();
            }
            storagePasswords = await that.service.storagePasswords().fetch();
            assert.strictEqual(startcount, storagePasswords.list().length);
        })
    });

    describe("Indexes tests", () => {
        beforeEach(async function () {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;

            // Create the index for everyone to use
            let name = this.indexName = "sdk-tests";
            let indexes = this.service.indexes();
            try {
                await indexes.create(name, {});
            } catch (err) {
                if (err.status !== 409) {
                    throw new Error("Index creation failed for an unknown reason");
                }
            }
        });

        // it("Callback#remove index fails on Splunk 4.x", function(done) {
        //     var original_version = this.service.version;
        //     this.service.version = "4.0";
        //
        //     var index = this.service.indexes().item(this.indexName);
        //     assert.throws(function() { index.remove(function(err) {}); });
        //
        //     this.service.version = original_version;
        //     done();
        // });

        // it("Callback#remove index", function(done) {
        //     var indexes = this.service.indexes();
        //
        //     // Must generate a private index because an index cannot
        //     // be recreated with the same name as a deleted index
        //     // for a certain period of time after the deletion.
        //     var salt = Math.floor(Math.random() * 65536);
        //     var myIndexName = this.indexName + '-' + salt;
        //
        //     if (this.service.versionCompare("5.0") < 0) {
        //         splunkjs.Logger.info("", "Must be running Splunk 5.0+ for this test to work.");
        //         done();
        //         return;
        //     }
        //
        //     Async.chain([
        //             function(callback) {
        //                 indexes.create(myIndexName, {}, callback);
        //             },
        //             function(index, callback) {
        //                 index.remove(callback);
        //             },
        //             function(callback) {
        //                 var numTriesLeft = 50;
        //                 var delayPerTry = 200;  // ms
        //
        //                 Async.whilst(
        //                     function() { return indexes.item(myIndexName) && ((numTriesLeft--) > 0); },
        //                     function(iterDone) {
        //                         Async.sleep(delayPerTry, function() { indexes.fetch(iterDone); });
        //                     },
        //                     function(err) {
        //                         if (err) {
        //                             callback(err);
        //                         }
        //                         else {
        //                             callback(numTriesLeft <= 0 ? "Timed out" : null);
        //                         }
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

        it("list indexes", async function () {
            let indexes = this.service.indexes();
            indexes = await indexes.fetch();
            let indexList = indexes.list();
            assert.ok(indexList.length > 0);
        });

        it("Contains index", async function () {
            let indexes = this.service.indexes();
            let indexName = this.indexName;

            indexes = await indexes.fetch();
            let index = indexes.item(indexName);
            assert.ok(index);
        });

        it("Modify index", async function () {
            let name = this.indexName;
            let indexes = this.service.indexes();
            let originalSyncMeta = false;
            indexes = await indexes.fetch();
            let index = indexes.item(name);
            assert.ok(index);

            originalSyncMeta = index.properties().syncMeta;
            index = await index.update({ syncMeta: !originalSyncMeta });
            assert.ok(index);
            let properties = index.properties();
            assert.strictEqual(!originalSyncMeta, properties.syncMeta);
            index = await index.update({ syncMeta: !properties.syncMeta });
            assert.ok(index);
            properties = index.properties();
            assert.strictEqual(originalSyncMeta, properties.syncMeta);
        });

        it("Enable/disable index", async function () {
            this.timeout(40000);
            let name = this.indexName;
            let indexes = this.service.indexes();

            indexes = await indexes.fetch();
            let index = indexes.item(name);
            assert.ok(index);
            index = await index.disable();
            await utils.sleep(5000);
            assert.ok(index);
            index = await index.fetch();
            assert.ok(index);
            assert.ok(index.properties().disabled);

            index = await index.enable();
            await utils.sleep(5000);
            assert.ok(index);
            index = await index.fetch();
            assert.ok(index);
            assert.ok(!index.properties().disabled);
        });

        it("Service submit event", async function () {
            let message = "Hello World -- " + getNextId();
            let sourcetype = "sdk-tests";

            let service = this.service;
            let indexName = this.indexName;
            let eventInfo = await service.log(message, { sourcetype: sourcetype, index: indexName });
            assert.ok(eventInfo);
            assert.strictEqual(eventInfo.sourcetype, sourcetype);
            assert.strictEqual(eventInfo.bytes, message.length);
            assert.strictEqual(eventInfo.index, indexName);
        });

        it("Service submit event, omitting optional arguments", async function () {
            let message = "Hello World -- " + getNextId();

            let service = this.service;
            let eventInfo = await service.log(message);
            assert.ok(eventInfo);
            assert.strictEqual(eventInfo.bytes, message.length);

        });

        it("Service submit events with multi-byte chars", async function () {
            let service = this.service;
            let messages = [
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

            let counter = 0;
            let [err, vals] = await utils.seriesMap(
                messages,
                async function (val, idx) {
                    counter++;
                    try {
                        let res = await service.log(val);
                        return [null, res];
                    } catch (error) {
                        return [error];
                    }
                }
            );
            assert.ok(!err);
            assert.strictEqual(counter, messages.length);

            // Verify that the full byte-length was sent for each message
            for (let m in messages) {
                assert.notStrictEqual(messages[m].length, vals[m].bytes);
                try {
                    assert.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                }
                catch (err) {
                    // Assume Buffer isn't defined, we're probably in the browser
                    assert.strictEqual(new Blob([messages[m]]).size, vals[m].bytes);
                }
            }
        });

        it("Service submit event, failure", async function () {
            let message = "Hello World -- " + getNextId();

            let service = this.loggedOutService;
            try {
                assert.ok(service);
                await service.log(message);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Remove throws an error1", async function () {
            let index = this.service.indexes().item("_internal");
            assert.isNull(index);
            assert.throws(function () { index.remove(); });
        });

        it("Create an index with alternate argument format", async function () {
            let indexes = this.service.indexes();
            try {
                await indexes.create({ name: "_internal" });
            } catch (error) {
                assert.ok(error.data.messages[0].text.match("name=_internal already exists"));
            }
        });

        it("Index submit event with omitted optional arguments", async function () {
            let message = "Hello world -- " + getNextId();
            let indexName = this.indexName;
            let indexes = this.service.indexes();

            indexes = await indexes.fetch();
            let index = indexes.item(indexName);
            assert.ok(index);
            assert.strictEqual(index.name, indexName);
            let response = await index.submitEvent(message);
            let eventInfo = response[0];
            assert.ok(eventInfo);
            assert.strictEqual(eventInfo.bytes, message.length);
            assert.strictEqual(eventInfo.index, indexName);
        });

        it("Index submit event", async function () {
            let message = "Hello World -- " + getNextId();
            let sourcetype = "sdk-tests";

            let indexName = this.indexName;
            let indexes = this.service.indexes();
            indexes = await indexes.fetch();
            let index = indexes.item(indexName);
            assert.ok(index);
            assert.strictEqual(index.name, indexName);
            let response = await index.submitEvent(message, { sourcetype: sourcetype });
            let eventInfo = response[0];
            assert.ok(eventInfo);
            assert.strictEqual(eventInfo.sourcetype, sourcetype);
            assert.strictEqual(eventInfo.bytes, message.length);
            assert.strictEqual(eventInfo.index, indexName);
        })
    });

    describe("User Tests", () => {

        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        })

        afterEach(async function () {
            await this.service.logout();
        })

        it("Current user", async function () {
            let service = this.service;
            const user = await service.currentUser();
            assert.ok(user);
            assert.strictEqual(user.name, service.username);
        })

        it("Current user fails", async function () {
            let service = this.loggedOutService;
            try {
                await service.currentUser();
            } catch (err) {
                assert.ok(err);
            }
        })

        it("List users", async function () {
            let service = this.service;
            const users = await service.users().fetch();
            const userList = users.list();
            assert.ok(users);
            assert.ok(userList);
            assert.ok(userList.length > 0);
        })

        it("Create user failure", async function () {
            try {
                const response = await this.loggedOutService.users().create(
                    { name: "jssdk_testuser", password: "abcdefg!", roles: "user" });
            } catch (err) {
                assert.ok(err);
            }
        })

        it("User - Create, update and delete user", async function () {
            let service = this.service;
            const name = "jssdk_testuser";
            const users = service.users();
            const user = await users.create({ name: "jssdk_testuser", password: "abcdefg!", roles: "user" });
            assert.ok(user);
            assert.strictEqual(user.name, name);
            assert.strictEqual(user.properties().roles.length, 1);
            assert.strictEqual(user.properties().roles[0], "user");

            const updatedUser = await user.update({ realname: "JS SDK", roles: ["admin", "user"] });
            assert.ok(updatedUser);
            assert.strictEqual(updatedUser.properties().realname, "JS SDK");
            assert.strictEqual(updatedUser.properties().roles.length, 2);
            assert.strictEqual(updatedUser.properties().roles[0], "admin");
            assert.strictEqual(updatedUser.properties().roles[1], "user");

            await updatedUser.remove();
        })

        it("User - Roles", async function () {
            let service = this.service;
            let name = "jssdk_testuser_" + getNextId();

            let user = await service.users().create({ name: name, password: "abcdefg!", roles: "user" });
            assert.ok(user);
            assert.strictEqual(user.name, name);
            assert.strictEqual(user.properties().roles.length, 1);
            assert.strictEqual(user.properties().roles[0], "user");

            user = await user.update({ roles: ["admin", "user"] });
            assert.ok(user);
            assert.strictEqual(user.properties().roles.length, 2);
            assert.strictEqual(user.properties().roles[0], "admin");
            assert.strictEqual(user.properties().roles[1], "user");

            user = await user.update({ roles: "user" });
            assert.ok(user);
            assert.strictEqual(user.properties().roles.length, 1);
            assert.strictEqual(user.properties().roles[0], "user");
            try {
                await user.update({ roles: "__unknown__" });
            } catch (error) {
                assert.ok(error);
                assert.strictEqual(error[0].status, 400);
            }
        })

        it("User - Passwords", async function () {
            let service = this.service;
            let name = "jssdk_testuser_" + getNextId();

            let firstPassword = "abcdefg!";
            let secondPassword = "hijklmn!";

            let useOldPassword = false;

            let info = await service.serverInfo();
            let versionParts = info.properties().version.split(".");

            let isDevBuild = versionParts.length === 1;
            let newerThan72 = (parseInt(versionParts[0], 10) > 7 ||
                (parseInt(versionParts[0], 10) === 7 && parseInt(versionParts[1], 10) >= 2));

            if (isDevBuild || newerThan72) {
                useOldPassword = true;
            }
            let user = await service.users().create({ name: name, password: firstPassword, roles: "user" });
            assert.ok(user);
            assert.strictEqual(user.name, name);
            assert.strictEqual(user.properties().roles.length, 1);
            assert.strictEqual(user.properties().roles[0], "user");

            const newService = new splunkjs.Service(service.http, {
                username: name,
                password: firstPassword,
                host: service.host,
                port: service.port,
                scheme: service.scheme,
                version: service.version
            });
            success = await newService.login();
            assert.ok(success);
            assert.ok(user);
            let body = {
                password: secondPassword
            };
            if (useOldPassword) {
                body['oldpassword'] = firstPassword;
            }
            user = await user.update(body);
            try {
                let res = await newService.login();;
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
            body = {
                password: firstPassword
            };
            if (useOldPassword) {
                body['oldpassword'] = secondPassword;
            }
            user = await user.update(body);
            assert.ok(user);
            await newService.login();
        })

        it("Delete test users", async function () {
            let users = this.service.users();
            users = await users.fetch();
            let userList = users.list();
            await utils.parallelEach(
                userList,
                async function (user, idx) {
                    if (utils.startsWith(user.name, "jssdk_")) {
                        await user.remove();
                    }
                }
            );
        })
    });

    describe("Server Info Test", () => {
        beforeEach(function (done) {
            this.service = svc;
            done();
        })

        it("Basic", async function () {
            let service = this.service;
            const info = await service.serverInfo();
            assert.ok(info);
            assert.strictEqual(info.name, "server-info");
            assert.ok(info.properties().hasOwnProperty("version"));
            assert.ok(info.properties().hasOwnProperty("serverName"));
            assert.ok(info.properties().hasOwnProperty("os_version"));
        })
    });

    describe("View Info Test ", () => {

        beforeEach(function (done) {
            this.service = svc;
            done();
        })

        it("List views", async function () {
            let service = this.service;
            const views = await service.views({ owner: "admin", app: "search" }).fetch();
            assert.ok(views);

            const viewsList = views.list();
            assert.ok(viewsList);
            assert.ok(viewsList.length > 0);

            for (let i = 0; i < viewsList.length; i++) {
                assert.ok(viewsList[i]);
            }
        })

        it("Views - Create, update and delete view", async function () {
            let service = this.service;
            const name = "jssdk_testview";
            const originalData = "<view/>";
            const newData = "<view isVisible='false'></view>";

            const view = await service.views({ owner: "admin", app: "sdkappcollection" }).create({ name: name, "eai:data": originalData });
            assert.ok(view);
            assert.strictEqual(view.name, name);
            assert.strictEqual(view.properties()["eai:data"], originalData);

            const updatedView = await view.update({ "eai:data": newData });
            assert.ok(updatedView);
            assert.strictEqual(updatedView.properties()["eai:data"], newData);

            await updatedView.remove();
        })
    });

    describe("Parser Tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            done();
        });

        it("Basic parse", async function () {
            let service = this.service;
            let parse = await service.parse("search index=_internal | head 1");
            assert.ok(parse);
            assert.ok(parse.commands.length > 0);
        });

        it("Parse error", async function () {
            let service = this.service;
            try {
                await service.parse("ABCXYZ");
            } catch (err) {
                assert.ok(err);
                assert.strictEqual(err.status, 400);
            }
        });
    });

    describe("Typeahead Tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        })

        it("Typeahead failure", async function () {
            let service = this.loggedOutService;
            try {
                await service.typeahead("index=", 1);
            } catch (err) {
                assert.ok(err);
            }
        })

        it("Typeahead basic", async function () {
            let service = this.service;
            const options = await service.typeahead("index=", 1);
            assert.ok(options);
            assert.strictEqual(options.length, 1);
            assert.ok(options[0]);
        })

        it("Typeahead with omitted optional arguments", async function () {
            let service = this.service;
            const options = await service.typeahead("index=");
            assert.ok(options);
        })
    });

    describe("Endpoint tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            done();
        });

        it("Throws on null arguments to init", function (done) {
            let service = this.service;
            assert.throws(function () {
                let endpoint = new splunkjs.Service.Endpoint(null, "a/b");
            });
            assert.throws(function () {
                let endpoint = new splunkjs.Service.Endpoint(service, null);
            });
            done();
        });

        it("Endpoint delete on a relative path", async function () {
            let service = this.service;
            let endpoint = new splunkjs.Service.Endpoint(service, "/search/jobs/12345");
            try {
                let res = endpoint.del("search/jobs/12345", {});
                assert.ok(res);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Methods of Resource to be overridden", function (done) {
            let service = this.service;
            let resource = new splunkjs.Service.Resource(service, "/search/jobs/12345");
            assert.throws(function () { resource.path(); });
            assert.throws(function () { resource.fetch(); });
            assert.ok(splunkjs.Utils.isEmpty(resource.state()));
            done();
        })
    });

    describe("Entity tests", () => {

        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        });

        it("Accessors function properly", function (done) {
            let entity = new splunkjs.Service.Entity(
                this.service,
                "/search/jobs/12345",
                { owner: "boris", app: "factory", sharing: "app" }
            );
            entity._load(
                {
                    acl: { owner: "boris", app: "factory", sharing: "app" },
                    links: { link1: 35 },
                    published: "meep",
                    author: "Hilda"
                }
            );
            assert.ok(entity.acl().owner === "boris");
            assert.ok(entity.acl().app === "factory");
            assert.ok(entity.acl().sharing === "app");
            assert.ok(entity.links().link1 === 35);
            assert.strictEqual(entity.author(), "Hilda");
            assert.strictEqual(entity.published(), "meep");
            done();
        });

        it("Refresh throws error correctly", async function () {
            let entity = new splunkjs.Service.Entity(this.loggedOutService, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
            try {
                let res = await entity.fetch({});
                assert.ok(!res)
            } catch (error) {
                assert.ok(error)
            }
        });

        it("Cannot update name of entity", function (done) {
            let entity = new splunkjs.Service.Entity(this.service, "/search/jobs/12345", { owner: "boris", app: "factory", sharing: "app" });
            assert.throws(function () { entity.update({ name: "asdf" }); });
            done();
        });

        it("Disable throws error correctly", async function () {
            let entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                { owner: "boris", app: "factory", sharing: "app" }
            );
            try {
                let res = await entity.disable();
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Enable throws error correctly", async function () {
            let entity = new splunkjs.Service.Entity(
                this.loggedOutService,
                "/search/jobs/12345",
                { owner: "boris", app: "factory", sharing: "app" }
            );
            try {
                let res = await entity.enable();
                assert.ok(!res);
            } catch (error) {
                assert.ok(error);
            }
        });

        it("Does reload work?", async function () {
            let name = "jssdk_testapp_" + getNextId();
            let apps = this.service.apps();

            let that = this;
            let app = await apps.create({ name: name });
            await app.reload();
            let app2 = new splunkjs.Service.Application(that.loggedOutService, app.name);
            try {
                await app2.reload();
            } catch (error) {
                assert.ok(error);
            }
            await app.remove();
        })
    });

    describe("Collection tests", () => {
        beforeEach(function (done) {
            this.service = svc;
            this.loggedOutService = loggedOutSvc;
            done();
        });

        it("Methods to be overridden throw", function (done) {
            let coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            assert.throws(function () {
                coll.instantiateEntity({});
            });
            done();
        });

        it("Accessors work", function (done) {
            let coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            coll._load({ links: "Hilda", updated: true });
            assert.strictEqual(coll.links(), "Hilda");
            assert.ok(coll.updated());
            done();
        });

        it("Contains throws without a good id", function (done) {
            let coll = new splunkjs.Service.Collection(
                this.service,
                "/data/indexes",
                {
                    owner: "admin",
                    app: "search",
                    sharing: "app"
                }
            );
            assert.throws(function () { coll.item(null); });
            done();
        })
    });
    

});