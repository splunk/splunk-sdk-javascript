var assert = require('chai').assert;

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var utils = splunkjs.Utils;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc, loggedOutSvc) {
    return (
        describe("Fired alerts tests", () => {
            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
                var indexes = this.service.indexes();
                done();
            });

            it("Callback#create + verify emptiness + delete new alert group", function (done) {

                var searches = this.service.savedSearches({ owner: this.service.username });
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
                    function (done) {
                        searches.create(searchConfig, done);
                    },
                    function (search, done) {
                        assert.ok(search);
                        assert.strictEqual(search.alertCount(), 0);
                        search.history(done);
                    },
                    function (jobs, search, done) {
                        assert.strictEqual(jobs.length, 0);
                        assert.strictEqual(search.firedAlertGroup().count(), 0);
                        searches.service.firedAlertGroups().fetch(Async.augment(done, search));
                    },
                    function (firedAlertGroups, originalSearch, done) {
                        assert.strictEqual(firedAlertGroups.list().indexOf(originalSearch.name), -1);
                        done(null, originalSearch);
                    },
                    function (originalSearch, done) {
                        originalSearch.remove(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
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

            it("Callback#delete all alerts", function (done) {
                var namePrefix = "jssdk_savedsearch_alert_";
                var alertList = this.service.savedSearches().list();

                Async.parallelEach(
                    alertList,
                    function (alert, idx, callback) {
                        if (utils.startsWith(alert.name, namePrefix)) {
                            splunkjs.Logger.log("ALERT ---", alert.name);
                            alert.remove(callback);
                        }
                        else {
                            callback();
                        }
                    }, function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })
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
