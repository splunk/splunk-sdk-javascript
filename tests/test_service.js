
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
        // "Namespace Tests": {
        //     setUp: function(finished) {
        //         this.service = svc;
        //         var that = this;
                                
        //         var appName1 = "jssdk_testapp_" + getNextId();
        //         var appName2 = "jssdk_testapp_" + getNextId();
                
        //         var userName1 = "jssdk_testuser_" + getNextId();
        //         var userName2 = "jssdk_testuser_" + getNextId();
                
        //         var apps = this.service.apps();
        //         var users = this.service.users();
                
        //         this.namespace11 = {owner: userName1, app: appName1};
        //         this.namespace12 = {owner: userName1, app: appName2};
        //         this.namespace21 = {owner: userName2, app: appName1};
        //         this.namespace22 = {owner: userName2, app: appName2};
                
        //         Async.chain([
        //                 function(done) {
        //                     apps.create({name: appName1}, done);
        //                 },
        //                 function(app1, done) {
        //                     that.app1 = app1;
        //                     that.appName1 = appName1;
        //                     apps.create({name: appName2}, done);
        //                 },
        //                 function(app2, done) {
        //                     that.app2 = app2;
        //                     that.appName2 = appName2;
        //                     users.create({name: userName1, password: "abc", roles: ["user"]}, done);
        //                 },
        //                 function(user1, done) {
        //                     that.user1 = user1;
        //                     that.userName1 = userName1;
        //                     users.create({name: userName2, password: "abc", roles: ["user"]}, done);
        //                 },
        //                 function(user2, done) {
        //                     that.user2 = user2;
        //                     that.userName2 = userName2;
                            
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 finished(); 
        //             }
        //         );
        //     },        
            
        //     "Callback#Namespace protection": function(test) {    
        //         var searchName = "jssdk_search_" + getNextId();
        //         var search = "search *";
        //         var service = this.service;
                
        //         var savedSearches11 = service.savedSearches(this.namespace11);
        //         var savedSearches21 = service.savedSearches(this.namespace21);
                
        //         var that = this;
        //         Async.chain([
        //                 function(done) {
        //                     // Create the saved search only in the 11 namespace
        //                     savedSearches11.create({name: searchName, search: search}, done);
        //                 },
        //                 function(savedSearch, done) {
        //                     // Refresh the 11 saved searches
        //                     savedSearches11.fetch(done);
        //                 },
        //                 function(savedSearches, done) {
        //                     // Refresh the 21 saved searches
        //                     savedSearches21.fetch(done);
        //                 },
        //                 function(savedSearches, done) {                            
        //                     var entity11 = savedSearches11.item(searchName);
        //                     var entity21 = savedSearches21.item(searchName);
                            
        //                     // Make sure the saved search exists in the 11 namespace
        //                     test.ok(entity11);
        //                     test.strictEqual(entity11.name, searchName);
        //                     test.strictEqual(entity11.properties().search, search);
                            
        //                     // Make sure the saved search doesn't exist in the 11 namespace
        //                     test.ok(!entity21);
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },    
            
        //     "Callback#Namespace item": function(test) {    
        //         var searchName = "jssdk_search_" + getNextId();
        //         var search = "search *";
        //         var service = this.service;
                
        //         var namespace_1 = {owner: "-", app: this.appName1};
        //         var namespace_nobody1 = {owner: "nobody", app: this.appName1};
                
        //         var savedSearches11 = service.savedSearches(this.namespace11);
        //         var savedSearches21 = service.savedSearches(this.namespace21);
        //         var savedSearches_1 = service.savedSearches(namespace_1);
        //         var savedSearches_nobody1 = service.savedSearches(namespace_nobody1);
                
        //         var that = this;
        //         Async.chain([
        //                 function(done) {
        //                     // Create a saved search in the 11 namespace
        //                     savedSearches11.create({name: searchName, search: search}, done);
        //                 },
        //                 function(savedSearch, done) {
        //                     // Create a saved search in the 21 namespace
        //                     savedSearches21.create({name: searchName, search: search}, done);
        //                 },
        //                 function(savedSearch, done) {
        //                     // Refresh the -/1 namespace
        //                     savedSearches_1.fetch(done);
        //                 },
        //                 function(savedSearches, done) {
        //                     // Refresh the 1/1 namespace
        //                     savedSearches11.fetch(done);
        //                 },
        //                 function(savedSearches, done) {
        //                     // Refresh the 2/1 namespace
        //                     savedSearches21.fetch(done);
        //                 },
        //                 function(savedSearches, done) {                            
        //                     var entity11 = savedSearches11.item(searchName, that.namespace11);
        //                     var entity21 = savedSearches21.item(searchName, that.namespace21);
                            
        //                     // Ensure that the saved search exists in the 11 namespace
        //                     test.ok(entity11);
        //                     test.strictEqual(entity11.name, searchName);
        //                     test.strictEqual(entity11.properties().search, search);
        //                     test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
        //                     test.strictEqual(entity11.namespace.app, that.namespace11.app);
                            
        //                     // Ensure that the saved search exists in the 21 namespace
        //                     test.ok(entity21);
        //                     test.strictEqual(entity21.name, searchName);
        //                     test.strictEqual(entity21.properties().search, search);
        //                     test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
        //                     test.strictEqual(entity21.namespace.app, that.namespace21.app);
                            
        //                     done();
        //                 },
        //                 function(done) {
        //                     // Create a saved search in the nobody/1 namespace
        //                     savedSearches_nobody1.create({name: searchName, search: search}, done);
        //                 },
        //                 function(savedSearch, done) {
        //                     // Refresh the 1/1 namespace
        //                     savedSearches11.fetch(done);
        //                 },
        //                 function(savedSearches, done) {
        //                     // Refresh the 2/1 namespace
        //                     savedSearches21.fetch(done);
        //                 },
        //                 function(savedSearches, done) {  
        //                     // Ensure that we can't get the item from the generic
        //                     // namespace without specifying a namespace
        //                     var thrown = false;
        //                     try {
        //                         var entity = savedSearches_1.item(searchName);
        //                     }
        //                     catch(ex) {
        //                         thrown = true;
        //                     }
                            
        //                     test.ok(thrown);
                                                    
        //                     // Ensure we get the right entities from the -/1 namespace when we
        //                     // specify it.  
        //                     var entity11 = savedSearches_1.item(searchName, that.namespace11);
        //                     var entity21 = savedSearches_1.item(searchName, that.namespace21);
                            
        //                     test.ok(entity11);
        //                     test.strictEqual(entity11.name, searchName);
        //                     test.strictEqual(entity11.properties().search, search);
        //                     test.strictEqual(entity11.namespace.owner, that.namespace11.owner);
        //                     test.strictEqual(entity11.namespace.app, that.namespace11.app);
                            
        //                     test.ok(entity21);
        //                     test.strictEqual(entity21.name, searchName);
        //                     test.strictEqual(entity21.properties().search, search);
        //                     test.strictEqual(entity21.namespace.owner, that.namespace21.owner);
        //                     test.strictEqual(entity21.namespace.app, that.namespace21.app);
                            
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },
            
        //     "Callback#delete test applications": function(test) {
        //         var apps = this.service.apps();
        //         apps.fetch(function(err, apps) {
        //             test.ok(!err);
        //             test.ok(apps);
        //             var appList = apps.list();
                    
        //             Async.parallelEach(
        //                 appList,
        //                 function(app, idx, callback) {
        //                     if (utils.startsWith(app.name, "jssdk_")) {
        //                         app.remove(callback);
        //                     }
        //                     else {
        //                         callback();
        //                     }
        //                 }, function(err) {
        //                     test.ok(!err);
        //                     test.done();
        //                 }
        //             );
        //         });
        //     },
            
        //     "Callback#delete test users": function(test) {
        //         var users = this.service.users();
        //         users.fetch(function(err, users) {
        //             var userList = users.list();
                    
        //             Async.parallelEach(
        //                 userList,
        //                 function(user, idx, callback) {
        //                     if (utils.startsWith(user.name, "jssdk_")) {
        //                         user.remove(callback);
        //                     }
        //                     else {
        //                         callback();
        //                     }
        //                 }, function(err) {
        //                     test.ok(!err);
        //                     test.done();
        //                 }
        //             );
        //         });
        //     }
        // },
        
        // "Job Tests": {
        //     setUp: function(done) {
        //         this.service = svc;
        //         done();
        //     },
            
        //     "Callback#Create+abort job": function(test) {
        //         var sid = getNextId();
        //         var options = {id: sid};
        //         var jobs = this.service.jobs({app: "xml2json"});
        //         var req = jobs.oneshotSearch('search index=_internal |  head 1 | sleep 10', options, function(err, job) {   
        //             test.ok(err);
        //             test.ok(!job);
        //             test.strictEqual(err.error, "abort");
        //             test.done();
        //         }); 
                
        //         splunkjs.Async.sleep(1000, function() {
        //             req.abort();
        //         });
        //     },

        //     "Callback#Create+cancel job": function(test) {
        //         var sid = getNextId();
        //         this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {   
        //             test.ok(job);
        //             test.strictEqual(job.sid, sid);

        //             job.cancel(function() {
        //                 test.done();
        //             });
        //         }); 
        //     },

        //     "Callback#Create job error": function(test) {
        //         var sid = getNextId();
        //         this.service.jobs().search({search: 'index=_internal | head 1', id: sid}, function(err) { 
        //             test.ok(!!err);
        //             test.done(); 
        //         });
        //     },

        //     "Callback#List jobs": function(test) {
        //         this.service.jobs().fetch(function(err, jobs) {
        //             test.ok(!err);
        //             test.ok(jobs);
                    
        //             var jobsList = jobs.list();
        //             test.ok(jobsList.length > 0);
                    
        //             for(var i = 0; i < jobsList.length; i++) {
        //                 test.ok(jobsList[i]);
        //             }
                    
        //             test.done();
        //         });
        //     },

        //     "Callback#Contains job": function(test) {
        //         var that = this;
        //         var sid = getNextId();
        //         var jobs = this.service.jobs();
                
        //         jobs.search('search index=_internal | head 1', {id: sid}, function(err, job) {   
        //             test.ok(!err);
        //             test.ok(job);
        //             test.strictEqual(job.sid, sid);

        //             jobs.fetch(function(err, jobs) {
        //                 test.ok(!err);
        //                 var job = jobs.item(sid);
        //                 test.ok(job);

        //                 job.cancel(function() {
        //                     test.done();
        //                 });
        //             });
        //         }); 
        //     },

        //     "Callback#job results": function(test) {
        //         var sid = getNextId();
        //         var service = this.service;
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     test.strictEqual(job.sid, sid);
        //                     tutils.pollUntil(
        //                         job,
        //                         function(j) {
        //                             return job.properties()["isDone"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     job.results({}, done);
        //                 },
        //                 function(results, job, done) {
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.fields.length, 1);
        //                     test.strictEqual(results.fields[0], "count");
        //                     test.strictEqual(results.rows[0][0], "1");
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },

        //     "Callback#job events": function(test) {
        //         var sid = getNextId();
        //         var service = this.service;
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     test.strictEqual(job.sid, sid);
        //                     tutils.pollUntil(
        //                         job,
        //                         function(j) {
        //                             return job.properties()["isDone"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     job.events({}, done);
        //                 },
        //                 function(results, job, done) {
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.fields.length, results.rows[0].length);
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },

        //     "Callback#job results preview": function(test) {
        //         var sid = getNextId();
        //         var service = this.service;
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     test.strictEqual(job.sid, sid);
        //                     tutils.pollUntil(
        //                         job,
        //                         function(j) {
        //                             return job.properties()["isDone"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     job.preview({}, done);
        //                 },
        //                 function(results, job, done) {
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.fields.length, 1);
        //                     test.strictEqual(results.fields[0], "count");
        //                     test.strictEqual(results.rows[0][0], "1");
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },
            
        //     "Callback#job results iterator": function(test) {
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 10', {}, done);
        //                 },
        //                 function(job, done) {
        //                     tutils.pollUntil(
        //                         job,
        //                         function(j) {
        //                             return job.properties()["isDone"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     var iterator = job.iterator("results", { pagesize: 4 });
        //                     var hasMore = true;
        //                     var numElements = 0;
        //                     var pageSizes = [];
        //                     Async.whilst(
        //                         function() { return hasMore; },
        //                         function(nextIteration) {
        //                             iterator.next(function(err, results, _hasMore) {
        //                                 if (err) {
        //                                     nextIteration(err);
        //                                     return;
        //                                 }
                                        
        //                                 hasMore = _hasMore;
        //                                 if (hasMore) {
        //                                     pageSizes.push(results.rows.length);
        //                                 }
        //                                 nextIteration();
        //                             });
        //                         },
        //                         function(err) {
        //                             test.deepEqual(pageSizes, [4,4,2]);
        //                             done(err);
        //                         }
        //                     );
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },

        //     "Callback#Enable + disable preview": function(test) {
        //         var that = this;
        //         var sid = getNextId();
                
        //         var service = this.service.specialize("nobody", "xml2json");
                
        //         Async.chain([
        //                 function(done) {
        //                     service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     job.enablePreview(done);
                            
        //                 },
        //                 function(job, done) {
        //                     job.disablePreview(done);
        //                 },
        //                 function(job, done) {
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Pause + unpause + finalize preview": function(test) {
        //         var that = this;
        //         var sid = getNextId();
                
        //         var service = this.service.specialize("nobody", "xml2json");
                
        //         Async.chain([
        //                 function(done) {
        //                     service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     job.pause(done);
        //                 },
        //                 function(job, done) {
        //                     tutils.pollUntil(
        //                         job, 
        //                         function(j) {
        //                             return j.properties()["isPaused"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     test.ok(job.properties()["isPaused"]);
        //                     job.unpause(done);
        //                 },
        //                 function(job, done) {
        //                     tutils.pollUntil(
        //                         job, 
        //                         function(j) {
        //                             return !j.properties()["isPaused"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     test.ok(!job.properties()["isPaused"]);
        //                     job.finalize(done);
        //                 },
        //                 function(job, done) {
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Set TTL": function(test) {
        //         var sid = getNextId();
        //         var originalTTL = 0;
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     job.fetch(done);
        //                 },
        //                 function(job, done) {
        //                     var ttl = job.properties()["ttl"];
        //                     originalTTL = ttl;
                            
        //                     job.setTTL(ttl*2, done);
        //                 },
        //                 function(job, done) {
        //                     job.fetch(done);
        //                 },
        //                 function(job, done) {
        //                     var ttl = job.properties()["ttl"];
        //                     test.ok(ttl > originalTTL);
        //                     test.ok(ttl <= (originalTTL*2));
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Set priority": function(test) {
        //         var sid = getNextId();
        //         var originalPriority = 0;
        //         var that = this;
                
        //         var service = this.service.specialize("nobody", "xml2json");
                
        //         Async.chain([
        //                 function(done) {
        //                     service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     job.track({}, {
        //                         ready: function(job) {
        //                             done(null, job);       
        //                         }
        //                     });
        //                 },
        //                 function(job, done) {
        //                     var priority = job.properties()["priority"];
        //                     test.ok(priority, 5);
        //                     job.setPriority(priority + 1, done);
        //                 },
        //                 function(job, done) {
        //                     job.fetch(done);
        //                 },
        //                 function(job, done) {
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Search log": function(test) {
        //         var sid = getNextId();
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1', {id: sid, exec_mode: "blocking"}, done);
        //                 },
        //                 function(job, done) {
        //                     job.searchlog(done);
        //                 },
        //                 function(log, job, done) {
        //                     test.ok(job);
        //                     test.ok(log);
        //                     test.ok(log.length > 0);
        //                     test.ok(log.split("\r\n").length > 0);
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Search summary": function(test) {
        //         var sid = getNextId();
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search(
        //                         'search index=_internal | head 1 | eval foo="bar" | fields foo', 
        //                         {
        //                             id: sid,
        //                             status_buckets: 300,
        //                             rf: ["foo"]
        //                         }, 
        //                         done);
        //                 },
        //                 function(job, done) {
        //                     // Let's sleep for 2 second so
        //                     // we let the server catch up
        //                     Async.sleep(2000, function() {
        //                         job.summary({}, done);
        //                     });
        //                 },
        //                 function(summary, job, done) {
        //                     test.ok(job);
        //                     test.ok(summary);
        //                     test.strictEqual(summary.event_count, 1);
        //                     test.strictEqual(summary.fields.foo.count, 1);
        //                     test.strictEqual(summary.fields.foo.distinct_count, 1);
        //                     test.ok(summary.fields.foo.is_exact, 1);
        //                     test.strictEqual(summary.fields.foo.modes.length, 1);
        //                     test.strictEqual(summary.fields.foo.modes[0].count, 1);
        //                     test.strictEqual(summary.fields.foo.modes[0].value, "bar");
        //                     test.ok(summary.fields.foo.modes[0].is_exact);
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Search timeline": function(test) {
        //         var sid = getNextId();
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search(
        //                         'search index=_internal | head 1 | eval foo="bar" | fields foo', 
        //                         {
        //                             id: sid,
        //                             status_buckets: 300,
        //                             rf: ["foo"],
        //                             exec_mode: "blocking"
        //                         }, 
        //                         done);
        //                 },
        //                 function(job, done) {
        //                     job.timeline({}, done);
        //                 },
        //                 function(timeline, job, done) {
        //                     test.ok(job);
        //                     test.ok(timeline);
        //                     test.strictEqual(timeline.buckets.length, 1);
        //                     test.strictEqual(timeline.event_count, 1);
        //                     test.strictEqual(timeline.buckets[0].available_count, 1);
        //                     test.strictEqual(timeline.buckets[0].duration, 0.001);
        //                     test.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
        //                     test.strictEqual(timeline.buckets[0].total_count, 1);
        //                     test.ok(timeline.buckets[0].is_finalized);
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Touch": function(test) {
        //         var sid = getNextId();
        //         var that = this;
        //         var originalTime = "";
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     job.fetch(done);
        //                 },
        //                 function(job, done) {
        //                     test.ok(job);
        //                     originalTime = job.properties().updated;
        //                     Async.sleep(1200, function() { job.touch(done); });
        //                 },
        //                 function(job, done) {
        //                     job.fetch(done);
        //                 },
        //                 function(job, done) {
        //                     test.ok(originalTime !== job.updated());
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Create failure": function(test) {
        //         var name = "jssdk_savedsearch_" + getNextId();
        //         var originalSearch = "search index=_internal | head 1";
            
        //         var jobs = this.service.jobs();
        //         test.throws(function() {jobs.create({search: originalSearch, name: name, exec_mode: "oneshot"}, function() {});});
        //         test.done();
        //     },

        //     "Callback#Create fails with no search string": function(test) {
        //         var jobs = this.service.jobs();
        //         jobs.create(
        //             "", {},
        //             function(err) { 
        //                 test.ok(err);
        //                 test.done();
        //             }
        //         );
        //     },

        //     "Callback#Oneshot search": function(test) {
        //         var sid = getNextId();
        //         var that = this;
        //         var originalTime = "";
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
        //                 },
        //                 function(results, done) {
        //                     test.ok(results);
        //                     test.ok(results.fields);
        //                     test.strictEqual(results.fields.length, 1);
        //                     test.strictEqual(results.fields[0], "count");
        //                     test.ok(results.rows);
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.rows[0].length, 1);
        //                     test.strictEqual(results.rows[0][0], "1");
                            
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Oneshot search with no results": function(test) {
        //         var sid = getNextId();
        //         var that = this;
        //         var originalTime = "";
                
        //         Async.chain([
        //                 function(done) {
        //                     var query = 'search index=history MUST_NOT_EXISTABCDEF';
        //                     that.service.jobs().oneshotSearch(query, {id: sid}, done);
        //                 },
        //                 function(results, done) {
        //                     test.ok(results);
        //                     test.strictEqual(results.fields.length, 0);
        //                     test.strictEqual(results.rows.length, 0);
        //                     test.ok(!results.preview);
                            
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },

        //     "Callback#Service oneshot search": function(test) {
        //         var sid = getNextId();
        //         var that = this;
        //         var originalTime = "";
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
        //                 },
        //                 function(results, done) {
        //                     test.ok(results);
        //                     test.ok(results.fields);
        //                     test.strictEqual(results.fields.length, 1);
        //                     test.strictEqual(results.fields[0], "count");
        //                     test.ok(results.rows);
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.rows[0].length, 1);
        //                     test.strictEqual(results.rows[0][0], "1");
                            
        //                     done();
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         ); 
        //     },
                        
        //     "Callback#Service search": function(test) {
        //         var sid = getNextId();
        //         var service = this.service;
        //         var that = this;
                
        //         Async.chain([
        //                 function(done) {
        //                     that.service.search('search index=_internal | head 1 | stats count', {id: sid}, done);
        //                 },
        //                 function(job, done) {
        //                     test.strictEqual(job.sid, sid);
        //                     tutils.pollUntil(
        //                         job,
        //                         function(j) {
        //                             return job.properties()["isDone"];
        //                         },
        //                         10,
        //                         done
        //                     );
        //                 },
        //                 function(job, done) {
        //                     job.results({}, done);
        //                 },
        //                 function(results, job, done) {
        //                     test.strictEqual(results.rows.length, 1);
        //                     test.strictEqual(results.fields.length, 1);
        //                     test.strictEqual(results.fields[0], "count");
        //                     test.strictEqual(results.rows[0][0], "1");
        //                     job.cancel(done);
        //                 }
        //             ],
        //             function(err) {
        //                 test.ok(!err);
        //                 test.done();
        //             }
        //         );
        //     },
            
        //     "Callback#Wait until job done": function(test) {
        //         this.service.search('search index=_internal | head 1000', {}, function(err, job) {
        //             test.ok(!err);
                    
        //             var numReadyEvents = 0;
        //             var numProgressEvents = 0;
        //             job.track({ period: 200 }, {
        //                 ready: function(job) {
        //                     test.ok(job);
                            
        //                     numReadyEvents++;
        //                 },
        //                 progress: function(job) {
        //                     test.ok(job);
                            
        //                     numProgressEvents++;
        //                 },
        //                 done: function(job) {
        //                     test.ok(job);
                            
        //                     test.ok(numReadyEvents === 1);      // all done jobs must have become ready
        //                     test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
        //                     test.done();
        //                 },
        //                 failed: function(job) {
        //                     test.ok(job);
                            
        //                     test.ok(false, "Job failed unexpectedly.");
        //                     test.done();
        //                 },
        //                 error: function(err) {
        //                     test.ok(err);
                            
        //                     test.ok(false, "Error while tracking job.");
        //                     test.done();
        //                 }
        //             });
        //         });
        //     },
            
        //     "Callback#Wait until job failed": function(test) {
        //         this.service.search('search index=_internal | head bogusarg', {}, function(err, job) {
        //             if (err) {
        //                 test.ok(!err);
        //                 test.done();
        //                 return;
        //             }
                    
        //             var numReadyEvents = 0;
        //             var numProgressEvents = 0;
        //             job.track({ period: 200 }, {
        //                 ready: function(job) {
        //                     test.ok(job);
                            
        //                     numReadyEvents++;
        //                 },
        //                 progress: function(job) {
        //                     test.ok(job);
                            
        //                     numProgressEvents++;
        //                 },
        //                 done: function(job) {
        //                     test.ok(job);
                            
        //                     test.ok(false, "Job became done unexpectedly.");
        //                     test.done();
        //                 },
        //                 failed: function(job) {
        //                     test.ok(job);
                            
        //                     test.ok(numReadyEvents === 1);      // even failed jobs become ready
        //                     test.ok(numProgressEvents >= 1);    // a job that becomes ready has progress
        //                     test.done();
        //                 },
        //                 error: function(err) {
        //                     test.ok(err);
                            
        //                     test.ok(false, "Error while tracking job.");
        //                     test.done();
        //                 }
        //             });
        //         });
        //     },
            
        //     "Callback#track() with default params and one function": function(test) {
        //         this.service.search('search index=_internal | head 1', {}, function(err, job) {
        //             if (err) {
        //                 test.ok(!err);
        //                 test.done();
        //                 return;
        //             }
                    
        //             job.track({}, function(job) {
        //                 test.ok(job);
        //                 test.done();
        //             });
        //         });
        //     },
            
        //     "Callback#track() should stop polling if only the ready callback is specified": function(test) {
        //         this.service.search('search index=_internal | head 1', {}, function(err, job) {
        //             if (err) {
        //                 test.ok(!err);
        //                 test.done();
        //                 return;
        //             }
                    
        //             job.track({}, {
        //                 ready: function(job) {
        //                     test.ok(job);
        //                 },
                        
        //                 _stoppedAfterReady: function(job) {
        //                     test.done();
        //                 }
        //             });
        //         });
        //     },
            
        //     "Callback#track() a job that is not immediately ready": function(test) {
        //         /*jshint loopfunc:true */
        //         var numJobs = 20;
        //         var numJobsLeft = numJobs;
        //         var gotJobNotImmediatelyReady = false;
        //         for (var i = 0; i < numJobs; i++) {
        //             this.service.search('search index=_internal | head 10000', {}, function(err, job) {
        //                 if (err) {
        //                     test.ok(!err);
        //                     test.done();
        //                     return;
        //                 }
                        
        //                 job.track({}, {
        //                     _preready: function(job) {
        //                         gotJobNotImmediatelyReady = true;
        //                     },
                            
        //                     ready: function(job) {
        //                         numJobsLeft--;
                                
        //                         if (numJobsLeft === 0) {
        //                             if (!gotJobNotImmediatelyReady) {
        //                                 console.log("WARNING: Couldn't test code path in track() where job wasn't ready immediately.");
        //                             }
        //                             test.done();
        //                         }
        //                     }
        //                 });
        //             });
        //         }
        //     }
        // },

        "Data Model tests": {
            setUp: function(done) {
                this.service = svc;
                this.dataModels = svc.dataModels();
                done();
            },

            "Callback#DataModels - fetch a built-in data model": function(test) {                
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
                            test.ok(utils.isUndefined(dm.objectByName(getNextId())));
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
                var args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
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
                        function(response, done) {
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

            "Callback#DataModels - create a data model with 0 objects": function(test) {
                var args = JSON.parse(utils.readFile(__filename, "../data/empty_data_model.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 0 objects before fetch
                            test.strictEqual(0, dataModel.objects().length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 0 objects after fetch
                            test.strictEqual(0, dataModels.item(name).objects().length);
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
                var dataModels = this.service.dataModels();

                var args = JSON.parse(utils.readFile(__filename, "../data/object_with_one_search.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 1 object before fetch
                            test.strictEqual(1, dataModel.objects().length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 1 object after fetch
                            test.strictEqual(1, dataModels.item(name).objects().length);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            // Check for 2 objects before fetch
                            test.strictEqual(2, dataModel.objects().length);
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            // Check for 2 objects after fetch
                            test.strictEqual(2, dataModels.item(name).objects().length);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/object_with_two_searches.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/model_with_unicode_headers.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            // TODO: Should have some proper unicode handling?
                            //     : see https://github.com/splunk/splunk-sdk-java/blob/master/tests/com/splunk/DataModelTest.java#L139
                            test.strictEqual("·Ä©·öô‡Øµ", dataModel.displayName());
                            test.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ", dataModel.description());

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
                var args = JSON.parse(utils.readFile(__filename, "../data/model_with_empty_headers.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            test.strictEqual(name, dataModel.name);
                            test.strictEqual("", dataModel.displayName());
                            test.strictEqual("", dataModel.description());

                            // Make sure we're not getting a summary of the data model definition
                            test.strictEqual("0", dataModel.properties().concise);

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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.setAcceleration(true);
                            dataModel.setEarliestAcceleratedTime("-2mon");
                            dataModel.setAccelerationCronSchedule("5/* * * * *");

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual("-2mon", dataModel.properties().acceleration.earliestTime);
                            test.strictEqual("5/* * * * *", dataModel.properties().acceleration.cronSchedule);

                            dataModel.setAcceleration(false);
                            dataModel.setEarliestAcceleratedTime("-1mon");
                            dataModel.setAccelerationCronSchedule("* * * * *");

                            test.ok(!dataModel.isAccelerated());
                            test.strictEqual("-1mon", dataModel.properties().acceleration.earliestTime);
                            test.strictEqual("* * * * *", dataModel.properties().acceleration.cronSchedule);

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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            test.strictEqual("event1 ·Ä©·öô", obj.displayName);
                            test.strictEqual("event1", obj.name);
                            test.same(dataModel, obj.dataModel());
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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_0");
                            test.ok(obj);
                            test.strictEqual(1, obj.lineage().length);
                            test.strictEqual("level_0", obj.lineage()[0]);
                            test.strictEqual("BaseEvent", obj.parentName);

                            obj = dataModel.objectByName("level_1");
                            test.ok(obj);
                            test.strictEqual(2, obj.lineage().length);
                            test.same(["level_0", "level_1"], obj.lineage());
                            test.strictEqual("level_0", obj.parentName);

                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            test.strictEqual(3, obj.lineage().length);
                            test.same(["level_0", "level_1", "level_2"], obj.lineage());
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
                var args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("level_2");
                            test.ok(obj);

                            var timeField = obj.fieldByName("_time");
                            test.ok(timeField);
                            test.strictEqual("timestamp", timeField.type); // TODO: do I need some object constants?
                            test.same(["BaseEvent"], timeField.ownerLineage());
                            test.strictEqual("_time", timeField.name);
                            test.strictEqual(false, timeField.required);
                            test.strictEqual(false, timeField.multivalued);
                            test.strictEqual(false, timeField.hidden);
                            test.strictEqual(false, timeField.editable);
                            test.strictEqual("", timeField.comment);

                            var lvl2 = obj.fieldByName("level_2");
                            test.strictEqual("level_2", lvl2.ownerName());
                            test.same(["level_0", "level_1", "level_2"], lvl2.ownerLineage());
                            test.strictEqual("objectCount", lvl2.type);
                            test.strictEqual("level_2", lvl2.name);
                            test.strictEqual("level 2", lvl2.displayName);
                            test.strictEqual(false, lvl2.required);
                            test.strictEqual(false, lvl2.multivalued);
                            test.strictEqual(false, lvl2.hidden);
                            test.strictEqual(false, lvl2.editable);
                            test.strictEqual("", lvl2.comment);

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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
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
                            test.strictEqual("| datamodel " + name + " level_2 search | tscollect", job.properties().request.search);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/inheritance_test_data.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var oldNow = Date.now();
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("level_2");
                            test.ok(obj);
                            obj.createLocalAccelerationJob("-1d", done);
                        },
                        function(job, done) {
                            test.ok(job);
                            // TODO: see if there is someway to test that the job is actually created with the earliestTime property set
                            //     : probably do an update, and get it's properties at that time.
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
                            test.strictEqual("| datamodel " + name + " level_2 search | tscollect", job.properties().request.search);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);
                            var constraints = obj.constraints();
                            test.ok(constraints);
                            var onlyOne = true;

                            for (var i = 0; i < constraints.length; i++) {
                                var constraint = constraints[i];
                                test.ok(!!onlyOne);

                                test.strictEqual("event1", constraint.ownerName());
                                test.strictEqual("uri=\"*.php\" OR uri=\"*.py\"\nNOT (referer=null OR referer=\"-\")", constraint.query());
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
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_with_test_objects.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("event1");
                            test.ok(obj);

                            var calculations = obj.calculations();
                            test.strictEqual(4, Object.keys(calculations).length);
                            test.strictEqual(4, obj.calculationIDs().length);

                            var evalCalculation = calculations["93fzsv03wa7"];
                            test.ok(evalCalculation);
                            test.strictEqual("event1", evalCalculation.owner());
                            test.same(["event1"], evalCalculation.lineage());
                            test.strictEqual(evalCalculation.typeEval, evalCalculation.type);
                            test.ok(evalCalculation.isEval());
                            test.ok(!evalCalculation.isLookup());
                            test.ok(!evalCalculation.isGeoIP());
                            test.ok(!evalCalculation.isRegexp());
                            test.strictEqual("", evalCalculation.comment);
                            test.strictEqual(true, evalCalculation.isEditable());
                            test.strictEqual("if(cidrmatch(\"192.0.0.0/16\", clientip), \"local\", \"other\")", evalCalculation.expression());

                            test.strictEqual(1, Object.keys(evalCalculation.outputFields()).length);
                            test.strictEqual(1, evalCalculation.outputFieldNames().length);

                            var field = evalCalculation.outputFields()["new_field"];
                            test.ok(field);
                            test.strictEqual("My New Field", field.displayName);

                            var lookupCalculation = calculations["sr3mc8o3mjr"];
                            test.ok(lookupCalculation);
                            test.strictEqual("event1", lookupCalculation.owner());
                            test.same(["event1"], lookupCalculation.lineage());
                            test.strictEqual(lookupCalculation.typeLookup, lookupCalculation.type);
                            test.ok(lookupCalculation.isLookup());
                            test.ok(!lookupCalculation.isEval());
                            test.ok(!lookupCalculation.isGeoIP());
                            test.ok(!lookupCalculation.isRegexp());
                            test.strictEqual("", lookupCalculation.comment);
                            test.strictEqual(true, lookupCalculation.isEditable());
                            test.same([{lookupField: "a_lookup_field", inputField: "host"}], lookupCalculation.inputFieldMappings());
                            test.strictEqual(1, lookupCalculation.inputFieldMappings().length);
                            test.strictEqual("a_lookup_field", lookupCalculation.inputFieldMappings()[0].lookupField);
                            test.strictEqual("host", lookupCalculation.inputFieldMappings()[0].inputField);
                            test.strictEqual("dnslookup", lookupCalculation.lookupName);
                            
                            var regexpCalculation = calculations["a5v1k82ymic"];
                            test.ok(regexpCalculation);
                            test.strictEqual("event1", regexpCalculation.owner());
                            test.same(["event1"], regexpCalculation.lineage());
                            test.strictEqual(regexpCalculation.typeRegexp, regexpCalculation.type);
                            test.ok(regexpCalculation.isRegexp());
                            test.ok(!regexpCalculation.isLookup());
                            test.ok(!regexpCalculation.isEval());
                            test.ok(!regexpCalculation.isGeoIP());
                            test.strictEqual(2, regexpCalculation.outputFieldNames().length);
                            test.strictEqual("_raw", regexpCalculation.inputField());
                            test.strictEqual(" From: (?<from>.*) To: (?<to>.*) ", regexpCalculation.expression());

                            var geoIPCalculation = calculations["pbe9bd0rp4"];
                            test.ok(geoIPCalculation);
                            test.strictEqual("event1", geoIPCalculation.owner());
                            test.same(["event1"], geoIPCalculation.lineage());
                            test.strictEqual(geoIPCalculation.typeGeoIP, geoIPCalculation.type);
                            test.ok(geoIPCalculation.isGeoIP());
                            test.ok(!geoIPCalculation.isLookup());
                            test.ok(!geoIPCalculation.isEval());
                            test.ok(!geoIPCalculation.isRegexp());
                            test.strictEqual("·Ä©·öô‡Øµ comment of pbe9bd0rp4", geoIPCalculation.comment);
                            test.strictEqual(5, geoIPCalculation.outputFieldNames().length);
                            test.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField());

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
                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            obj = dm.objectByName("searches");
                            obj.runQuery({}, "", done);
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
                            obj.runQuery({status_buckets: 5, enable_lookups: false}, "| head 3", done);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("search1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseSearch", obj.parentName);
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
                var args = JSON.parse(utils.readFile(__filename, "../data/model_with_multiple_types.json"));
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            obj = dataModel.objectByName("transaction1");
                            test.ok(obj);
                            test.ok(obj instanceof splunkjs.Service.DataModelObject);
                            test.strictEqual("BaseTransaction", obj.parentName);
                            test.ok(obj.isBaseTransaction());
                            test.same(["event1"], obj.objectsToGroup());
                            test.same(["host", "from"], obj.groupByFields());
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
            },

            "Callback#DataModels - delete any remaining data models created by the SDK tests": function(test) {
                svc.dataModels().fetch(function(err, dataModels) {
                    if (err) {
                        test.ok(!err);
                    }

                    var dms = dataModels.list();
                    Async.seriesEach(
                        dms,
                        function(val, i, done) {
                            // Delete any tests that we created
                            if (utils.startsWith(val["name"], "delete-me")) {
                                val.remove(done);
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
            },

            "Callback#DataModels - all toJSON functions work": function(test) {
                // TODO: actually all toJSON() functions can be dropped, but leave them in for now
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            var dm = dataModels.item("internal_audit_logs");
                            var obj = dm.objectByName("Audit"); 
                            test.ok(obj);

                            // Test the fields JSON
                            var expectedFields = JSON.parse(utils.readFile(__filename, "../data/data_model_expected_fields.json"));
                            var fields = JSON.parse(obj.toJSON()).fields;
                            for (var i = 0; i < fields.length; i++) {
                                fields[i] = JSON.parse(fields[i]);
                            }
                            test.same(expectedFields, fields);

                            // Test the constraints JSON
                            var expectedConstraints = JSON.parse(utils.readFile(__filename, "../data/data_model_expected_constraints.json"));
                            var constraints = JSON.parse(obj.toJSON()).constraints;
                            for (var j = 0; j < constraints.length; j++) {
                                constraints[j] = JSON.parse(constraints[j]);
                            }
                            test.same(expectedConstraints, constraints);

                            // Test the calculations JSON; the calculationID changes frequently, so we will re-parse it
                            // instead of storing the expected JSON in a file.
                            var objList = JSON.parse(dm.description()).objects;
                            var expectedCalculations = null;
                            var tempObj = null;
                            for (var k = 0; k < objList.length; k++) {
                                if (objList[k].objectName === "Audit") {
                                    tempObj = objList[k];
                                    expectedCalculations = objList[k].calculations;
                                }
                            }
                            var calculations = JSON.parse(obj.toJSON()).calculations;
                            for (var l = 0; l < calculations.length; l++) {
                                calculations[l] = JSON.parse(calculations[l]);
                                for (var m = 0; m < calculations[l].outputFields.length; m++) {
                                    calculations[l].outputFields[m] = JSON.parse(calculations[l].outputFields[m]);
                                }
                            }
                            test.strictEqual(typeof expectedCalculations, typeof calculations);
                            test.strictEqual(expectedCalculations.length, calculations.length);
                            test.same(expectedCalculations, calculations);

                            // Test data model object JSON
                            var recreatedJSON = JSON.parse(obj.toJSON());
                            recreatedJSON.constraints = constraints;
                            recreatedJSON.calculations = calculations;
                            recreatedJSON.fields = fields;
                            for (var n = 0; n < Object.keys(recreatedJSON).length; n++) {
                                var o = Object.keys(recreatedJSON)[n];
                                test.same(tempObj[o], recreatedJSON[o]);
                            }

                            // TODO: test DataModel.toJSON()

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
                done();
            },

            "Callback#Pivot - test constructor args": function(test) {
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
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

            "Callback#Pivot - test acceleration": function(test) {
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                            dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            dataModel.objectByName("test_data");
                            test.ok(dataModel);
                            
                            dataModel.setAcceleration(true);
                            dataModel.setEarliestAcceleratedTime("-2mon");
                            dataModel.setAccelerationCronSchedule("0 */12 * * *");
                            dataModel.update(done);                            
                        },
                        function(dataModel, done) {
                            var props = dataModel.properties();

                            test.strictEqual(true, dataModel.isAccelerated());
                            test.strictEqual(true, !!props.acceleration.enabled);
                            test.strictEqual("-2mon", props.acceleration.earliest_time);
                            test.strictEqual("0 */12 * * *", props.acceleration.cron_schedule);

                            var dataModelObject = dataModel.objectByName("test_data");
                            var pivotSpec = dataModelObject.createPivotSpec();

                            test.strictEqual(dataModelObject.dataModel().name, pivotSpec.accelerationNamespace);

                            var name1 = "delete-me-" + getNextId();
                            pivotSpec.setAccelerationJob(name1);
                            test.strictEqual("sid=" + name1, pivotSpec.accelerationNamespace);

                            var namespaceTemp = "delete-me-" + getNextId();
                            pivotSpec.setAccelerationNamespace(namespaceTemp);
                            test.strictEqual(namespaceTemp, pivotSpec.accelerationNamespace);

                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        if (err) {
                            console.log(err);
                        }
                        test.done();
                    }
                );
            },

            "Callback#Pivot - test illegal filtering (all types)": function(test) {
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();

                            // Boolean comparisons
                            try {
                                pivotSpec.addFilter(getNextId(), pivotSpec.comparisonBoolean, "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }
                            try {
                                pivotSpec.addFilter("_time", pivotSpec.comparisonBoolean, "=", true);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add " + pivotSpec.comparisonBoolean + " filter on _time because it is of type timestamp");
                            }

                            // String comparisons
                            try {
                                pivotSpec.addFilter("has_boris", pivotSpec.comparisonString, "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add " + pivotSpec.comparisonString + " filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpec.addFilter(getNextId(), pivotSpec.comparisonString, "contains", "abc");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // IPv4 comparisons
                            try {
                                pivotSpec.addFilter("has_boris", pivotSpec.comparisonIPv4, "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add " + pivotSpec.comparisonIPv4 + " filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpec.addFilter(getNextId(), pivotSpec.comparisonIPv4, "startsWith", "192.168");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Number comparisons
                            try {
                                pivotSpec.addFilter("has_boris", pivotSpec.comparisonNumber, "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add " + pivotSpec.comparisonNumber + " filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpec.addFilter(getNextId(), pivotSpec.comparisonNumber, "atLeast", 2.3);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add filter on a nonexistent field.");
                            }

                            // Limit filter
                            try {
                                pivotSpec.addLimitFilter("has_boris", "host", pivotSpec.sortDirections.DEFAULT, 50, pivotSpec.statsFunctions.COUNT);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on has_boris because it is of type boolean");
                            }
                            try {
                                pivotSpec.addLimitFilter(getNextId(), "host", pivotSpec.sortDirections.DEFAULT, 50, pivotSpec.statsFunctions.COUNT);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot add limit filter on a nonexistent field.");
                            }
                            try {
                                pivotSpec.addLimitFilter("source", "host", pivotSpec.sortDirections.DEFAULT, 50, pivotSpec.statsFunctions.SUM);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found " +
                                    pivotSpec.statsFunctions.SUM);
                            }
                            try {
                                pivotSpec.addLimitFilter("epsilon", "host", pivotSpec.sortDirections.DEFAULT, 50, pivotSpec.statsFunctions.DURATION);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found " +
                                    pivotSpec.statsFunctions.DURATION);
                            }
                            try {
                                pivotSpec.addLimitFilter("test_data", "host", pivotSpec.sortDirections.DEFAULT, 50, pivotSpec.statsFunctions.LIST);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message,
                                    "Stats function for fields of type object count must be COUNT; found " +
                                    pivotSpec.statsFunctions.LIST);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();
                            try {
                                pivotSpec.addFilter("has_boris", pivotSpec.comparisonBoolean, "=", true);
                                test.strictEqual(1, pivotSpec.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpec.filters[0];
                                test.strictEqual(pivotSpec.comparisonBoolean, filter.type);

                                var filterJSON = filter.toJSON();
                                test.ok(filterJSON.hasOwnProperty("fieldName"));
                                test.ok(filterJSON.hasOwnProperty("type"));
                                test.ok(filterJSON.hasOwnProperty("comparator"));
                                test.ok(filterJSON.hasOwnProperty("compareTo"));
                                test.ok(filterJSON.hasOwnProperty("owner"));

                                test.strictEqual("has_boris", filterJSON.fieldName);
                                test.strictEqual("boolean", filterJSON.type);
                                test.strictEqual("=", filterJSON.comparator);
                                test.strictEqual(true, filterJSON.compareTo);
                                test.strictEqual("test_data", filterJSON.owner);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();
                            try {
                                pivotSpec.addFilter("host", pivotSpec.comparisonString, "contains", "abc");
                                test.strictEqual(1, pivotSpec.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpec.filters[0];
                                test.strictEqual(pivotSpec.comparisonString, filter.type);

                                var filterJSON = filter.toJSON();
                                test.ok(filterJSON.hasOwnProperty("fieldName"));
                                test.ok(filterJSON.hasOwnProperty("type"));
                                test.ok(filterJSON.hasOwnProperty("comparator"));
                                test.ok(filterJSON.hasOwnProperty("compareTo"));
                                test.ok(filterJSON.hasOwnProperty("owner"));

                                test.strictEqual("host", filterJSON.fieldName);
                                test.strictEqual("string", filterJSON.type);
                                test.strictEqual("contains", filterJSON.comparator);
                                test.strictEqual("abc", filterJSON.compareTo);
                                test.strictEqual("BaseEvent", filterJSON.owner);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();
                            try {
                                pivotSpec.addFilter("hostip", pivotSpec.comparisonIPv4, "startsWith", "192.168");
                                test.strictEqual(1, pivotSpec.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpec.filters[0];
                                test.strictEqual(pivotSpec.comparisonIPv4, filter.type);

                                var filterJSON = filter.toJSON();
                                test.ok(filterJSON.hasOwnProperty("fieldName"));
                                test.ok(filterJSON.hasOwnProperty("type"));
                                test.ok(filterJSON.hasOwnProperty("comparator"));
                                test.ok(filterJSON.hasOwnProperty("compareTo"));
                                test.ok(filterJSON.hasOwnProperty("owner"));

                                test.strictEqual("hostip", filterJSON.fieldName);
                                test.strictEqual("ipv4", filterJSON.type);
                                test.strictEqual("startsWith", filterJSON.comparator);
                                test.strictEqual("192.168", filterJSON.compareTo);
                                test.strictEqual("test_data", filterJSON.owner);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();
                            try {
                                pivotSpec.addFilter("epsilon", pivotSpec.comparisonNumber, ">=", 2.3);
                                test.strictEqual(1, pivotSpec.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpec.filters[0];
                                test.strictEqual(pivotSpec.comparisonNumber, filter.type);

                                var filterJSON = filter.toJSON();
                                test.ok(filterJSON.hasOwnProperty("fieldName"));
                                test.ok(filterJSON.hasOwnProperty("type"));
                                test.ok(filterJSON.hasOwnProperty("comparator"));
                                test.ok(filterJSON.hasOwnProperty("compareTo"));
                                test.ok(filterJSON.hasOwnProperty("owner"));

                                test.strictEqual("epsilon", filterJSON.fieldName);
                                test.strictEqual("number", filterJSON.type);
                                test.strictEqual(">=", filterJSON.comparator);
                                test.strictEqual(2.3, filterJSON.compareTo);
                                test.strictEqual("test_data", filterJSON.owner);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();
                            try {
                                pivotSpec.addLimitFilter("epsilon", "host", pivotSpec.sortDirections.ASC, 500, pivotSpec.statsFunctions.AVERAGE);
                                test.strictEqual(1, pivotSpec.filters.length);

                                //Test the individual parts of the filter
                                var filter = pivotSpec.filters[0];
                                test.strictEqual(pivotSpec.comparisonNumber, filter.type);

                                var filterJSON = filter.toJSON();
                                test.ok(filterJSON.hasOwnProperty("fieldName"));
                                test.ok(filterJSON.hasOwnProperty("type"));
                                test.ok(filterJSON.hasOwnProperty("owner"));
                                test.ok(filterJSON.hasOwnProperty("attributeName"));
                                test.ok(filterJSON.hasOwnProperty("attributeOwner"));
                                test.ok(filterJSON.hasOwnProperty("limitType"));
                                test.ok(filterJSON.hasOwnProperty("limitAmount"));
                                test.ok(filterJSON.hasOwnProperty("statsFn"));

                                test.strictEqual("epsilon", filterJSON.fieldName);
                                test.strictEqual(pivotSpec.comparisonNumber, filterJSON.type);
                                test.strictEqual("test_data", filterJSON.owner);
                                test.strictEqual("host", filterJSON.attributeName);
                                test.strictEqual("BaseEvent", filterJSON.attributeOwner);
                                test.strictEqual("lowest", filterJSON.limitType);
                                test.strictEqual(500, filterJSON.limitAmount);
                                test.strictEqual("average", filterJSON.statsFn);
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
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();

                            // Test error handling for row split
                            try {
                                pivotSpec.addRowSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpec.addRowSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test row split, number
                            pivotSpec.addRowSplit("epsilon", "My Label");
                            test.strictEqual(1, pivotSpec.rows.length);
                            
                            var row = pivotSpec.rows[0];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual(pivotSpec.comparisonNumber, row.type);
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
                            pivotSpec.addRowSplit("host", "My Label");
                            test.strictEqual(2, pivotSpec.rows.length);

                            row = pivotSpec.rows[pivotSpec.rows.length - 1];
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
                                pivotSpec.addRangeRowSplit("has_boris", "Wrong type here", 0, 100, 20, 5);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpec.addRangeRowSplit(field, "Break Me!", 0, 100, 20, 5);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range row split
                            pivotSpec.addRangeRowSplit("epsilon", "My Label", 0, 100, 20, 5);
                            test.strictEqual(3, pivotSpec.rows.length);

                            row = pivotSpec.rows[pivotSpec.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("display"));
                            test.ok(row.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", row.fieldName);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual(pivotSpec.comparisonNumber, row.type);
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
                                pivotSpec.addBooleanRowSplit("epsilon", "Wrong type here", "t", "f");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpec.addBooleanRowSplit(field, "Break Me!", "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean row split
                            pivotSpec.addBooleanRowSplit("has_boris", "My Label", "is_true", "is_false");
                            test.strictEqual(4, pivotSpec.rows.length);

                            row = pivotSpec.rows[pivotSpec.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("trueLabel"));
                            test.ok(row.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("test_data", row.owner);
                            test.strictEqual(pivotSpec.comparisonBoolean, row.type);
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
                                pivotSpec.addTimestampRowSplit("epsilon", "Wrong type here");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpec.addTimestampRowSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test timestamp row split
                            pivotSpec.addTimestampRowSplit("_time", "My Label", pivotSpec.binning.DAY);
                            test.strictEqual(5, pivotSpec.rows.length);

                            row = pivotSpec.rows[pivotSpec.rows.length - 1];
                            test.ok(row.hasOwnProperty("fieldName"));
                            test.ok(row.hasOwnProperty("owner"));
                            test.ok(row.hasOwnProperty("type"));
                            test.ok(row.hasOwnProperty("label"));
                            test.ok(row.hasOwnProperty("period"));

                            test.strictEqual("_time", row.fieldName);
                            test.strictEqual("My Label", row.label);
                            test.strictEqual("BaseEvent", row.owner);
                            test.strictEqual(pivotSpec.comparisonTimestamp, row.type);
                            test.strictEqual(pivotSpec.binning.DAY, row.period);
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
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();

                            // Test error handling for column split
                            try {
                                pivotSpec.addColumnSplit("has_boris", "Wrong type here");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number or string.");
                            }
                            var field = getNextId();
                            try {

                                pivotSpec.addColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test column split, number
                            pivotSpec.addColumnSplit("epsilon");
                            test.strictEqual(1, pivotSpec.columns.length);

                            var col = pivotSpec.columns[pivotSpec.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual(pivotSpec.comparisonNumber, col.type);
                            test.strictEqual("all", col.display);
                            test.same({
                                    fieldName: "epsilon",
                                    owner: "test_data",
                                    type: "number",
                                    display: "all"
                                }, 
                                col);

                            // Test column split, string
                            pivotSpec.addColumnSplit("host");
                            test.strictEqual(2, pivotSpec.columns.length);

                            col = pivotSpec.columns[pivotSpec.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("display"));

                            test.strictEqual("host", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual(pivotSpec.comparisonString, col.type);
                            test.same({
                                    fieldName: "host",
                                    owner: "BaseEvent",
                                    type: "string"
                                }, 
                                col);

                            done();

                            // Test error handling for range column split
                            try {
                                pivotSpec.addRangeColumnSplit("has_boris", "Wrong type here", 0, 100, 20, 5);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("has_boris").type + ", expected number.");
                            }
                            try {
                                pivotSpec.addRangeColumnSplit(field, 0, 100, 20, 5);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test range column split
                            pivotSpec.addRangeColumnSplit("epsilon", 0, 100, 20, 5);
                            test.strictEqual(3, pivotSpec.columns.length);

                            col = pivotSpec.columns[pivotSpec.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(col.hasOwnProperty("display"));
                            test.ok(col.hasOwnProperty("ranges"));

                            test.strictEqual("epsilon", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual(pivotSpec.comparisonNumber, col.type);
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
                                pivotSpec.addBooleanColumnSplit("epsilon", "t", "f");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected boolean.");
                            }
                            try {
                                pivotSpec.addBooleanColumnSplit(field, "t", "f");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test boolean column split
                            pivotSpec.addBooleanColumnSplit("has_boris", "is_true", "is_false");
                            test.strictEqual(4, pivotSpec.columns.length);

                            col = pivotSpec.columns[pivotSpec.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("trueLabel"));
                            test.ok(col.hasOwnProperty("falseLabel"));

                            test.strictEqual("has_boris", col.fieldName);
                            test.strictEqual("test_data", col.owner);
                            test.strictEqual(pivotSpec.comparisonBoolean, col.type);
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
                                pivotSpec.addTimestampColumnSplit("epsilon", "Wrong type here");
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Field was of type " + obj.fieldByName("epsilon").type + ", expected timestamp.");
                            }
                            try {
                                pivotSpec.addTimestampColumnSplit(field, "Break Me!");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field " + field);
                            }

                            // Test timestamp column split
                            pivotSpec.addTimestampColumnSplit("_time", pivotSpec.binning.DAY);
                            test.strictEqual(5, pivotSpec.columns.length);

                            col = pivotSpec.columns[pivotSpec.columns.length - 1];
                            test.ok(col.hasOwnProperty("fieldName"));
                            test.ok(col.hasOwnProperty("owner"));
                            test.ok(col.hasOwnProperty("type"));
                            test.ok(!col.hasOwnProperty("label"));
                            test.ok(col.hasOwnProperty("period"));

                            test.strictEqual("_time", col.fieldName);
                            test.strictEqual("BaseEvent", col.owner);
                            test.strictEqual(pivotSpec.comparisonTimestamp, col.type);
                            test.strictEqual(pivotSpec.binning.DAY, col.period);
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
                var name = "delete-me-" + getNextId();
                var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
                var that = this;
                Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            var pivotSpec = obj.createPivotSpec();

                            // Test error handling for cell value, string
                            try {
                                pivotSpec.addCellValue("iDontExist", "Break Me!", "explosion");
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Did not find field iDontExist");
                            }
                            try {
                                pivotSpec.addCellValue("source", "Wrong Stats Function", pivotSpec.statsFunctions.STDEV);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" + 
                                    " list, distinct_values, first, last, count, or distinct_count; found " + 
                                    pivotSpec.statsFunctions.STDEV);
                            }

                            // Add cell value, string
                            pivotSpec.addCellValue("source", "Source Value", pivotSpec.statsFunctions.DISTINCT_COUNT);
                            test.strictEqual(1, pivotSpec.cells.length);

                            var cell = pivotSpec.cells[pivotSpec.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("source", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual(pivotSpec.comparisonString, cell.type);
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
                                pivotSpec.addCellValue("hostip", "Wrong Stats Function", pivotSpec.statsFunctions.STDEV);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on string and IPv4 fields must be one of:" + 
                                    " list, distinct_values, first, last, count, or distinct_count; found " + 
                                    pivotSpec.statsFunctions.STDEV);
                            }

                            // Add cell value, IPv4
                            pivotSpec.addCellValue("hostip", "Source Value", pivotSpec.statsFunctions.DISTINCT_COUNT);
                            test.strictEqual(2, pivotSpec.cells.length);

                            cell = pivotSpec.cells[pivotSpec.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("hostip", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual(pivotSpec.comparisonIPv4, cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual(pivotSpec.statsFunctions.DISTINCT_COUNT, cell.value);
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
                                pivotSpec.addCellValue("has_boris", "Booleans not allowed", pivotSpec.statsFunctions.SUM);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Cannot use boolean valued fields as cell values.");
                            }

                            // Test error handling for cell value, number
                            try {
                                pivotSpec.addCellValue("epsilon", "Wrong Stats Function", pivotSpec.statsFunctions.LATEST);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on number field must be must be one of:" +
                                    " sum, count, average, max, min, stdev, list, or distinct_values; found " +
                                    pivotSpec.statsFunctions.LATEST);
                            }

                            // Add cell value, number
                            pivotSpec.addCellValue("epsilon", "Source Value", pivotSpec.statsFunctions.AVERAGE);
                            test.strictEqual(3, pivotSpec.cells.length);

                            cell = pivotSpec.cells[pivotSpec.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("epsilon", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual(pivotSpec.comparisonNumber, cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual(pivotSpec.statsFunctions.AVERAGE, cell.value);
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
                                pivotSpec.addCellValue("_time", "Wrong Stats Function", pivotSpec.statsFunctions.MAX);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on timestamp field must be one of:" +
                                    " duration, earliest, latest, list, or distinct values; found " +   
                                    pivotSpec.statsFunctions.MAX);
                            }

                            // Add cell value, timestamp
                            pivotSpec.addCellValue("_time", "Source Value", pivotSpec.statsFunctions.EARLIEST);
                            test.strictEqual(4, pivotSpec.cells.length);

                            cell = pivotSpec.cells[pivotSpec.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("_time", cell.fieldName);
                            test.strictEqual("BaseEvent", cell.owner);
                            test.strictEqual(pivotSpec.comparisonTimestamp, cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual(pivotSpec.statsFunctions.EARLIEST, cell.value);
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
                                pivotSpec.addCellValue("test_data", "Wrong Stats Function", pivotSpec.statsFunctions.MIN);
                                test.ok(false);
                            }
                            catch (e) {
                                test.ok(e);
                                test.strictEqual(e.message, "Stats function on childcount and objectcount fields " +
                                    "must be count; found " + pivotSpec.statsFunctions.MIN);
                            }
                            
                            // Add cell value, count
                            pivotSpec.addCellValue("test_data", "Source Value", pivotSpec.statsFunctions.COUNT);
                            test.strictEqual(5, pivotSpec.cells.length);

                            cell = pivotSpec.cells[pivotSpec.cells.length - 1];
                            test.ok(cell.hasOwnProperty("fieldName"));
                            test.ok(cell.hasOwnProperty("owner"));
                            test.ok(cell.hasOwnProperty("type"));
                            test.ok(cell.hasOwnProperty("label"));
                            test.ok(cell.hasOwnProperty("value"));
                            test.ok(cell.hasOwnProperty("sparkline"));

                            test.strictEqual("test_data", cell.fieldName);
                            test.strictEqual("test_data", cell.owner);
                            test.strictEqual(pivotSpec.comparisonObjectCount, cell.type);
                            test.strictEqual("Source Value", cell.label);
                            test.strictEqual(pivotSpec.statsFunctions.COUNT, cell.value);
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
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);

                            obj.createPivotSpec().pivot(done);
                        },
                        function(response, done) {
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(err);
                        test.done();
                    }
                ); 
            },
            "Callback#Pivot - test pivot without namespace": function(test) {
               var name = "delete-me-" + getNextId();
               var args = JSON.parse(utils.readFile(__filename, "../data/data_model_for_pivot.json"));
               var that = this;
               Async.chain([
                        function(done) {
                            that.dataModels.fetch(done);
                        },
                        function(dataModels, done) {
                           dataModels.create(name, args, done);
                        },
                        function(dataModel, done) {
                            var obj = dataModel.objectByName("test_data");
                            test.ok(obj);
                            var pivotSpec = obj.createPivotSpec();
                            
                            pivotSpec.addBooleanRowSplit("has_boris", "Has Boris", "meep", "hilda");
                            pivotSpec.addCellValue("hostip", "Distinct IPs", pivotSpec.statsFunctions.DISTINCT_COUNT);

                            pivotSpec.pivot(done);
                        },
                        function(pivot, done) {
                            test.strictEqual(null, pivot.tstatsSearch);
                            // TODO: this test fails with utils.startsWith, probably due to the pipe char
                            test.strictEqual(0, pivot.pivotSearch.indexOf("| pivot"));

                            pivot.run(done);
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
                            job.cancel(done);
                        },
                        function(response, done) {
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },
        },  

        /*
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
                    },
                    function(callback) {
                        test.done();
                        callback();
                    }
                ]);
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
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                
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
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                
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
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
                
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
                var searches = this.service.savedSearches({owner: this.service.username, app: "xml2json"});
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
                var app = new splunkjs.Service.Application(this.service, "xml2json");
                app.setupInfo(function(err, content, search) {
                    test.ok(err.data.messages[0].text.match("Setup configuration file does not"));
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
                var app = new splunkjs.Service.Application(this.loggedOutService, "xml2json");
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
                        if (err) {
                            console.log(err);
                        }
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#alert is triggered + test firedAlert entity": function(test) {
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
                            console.log("\tAlert count pre-fetch", originalSearch.alertCount());
                            var attemptNum = 1;
                            var maxAttempts = 20;
                            Async.whilst(
                                function() {
                                    // When this returns false, it hits the final function in the chain
                                    console.log("\tFetch attempt", attemptNum, "of", maxAttempts, "alertCount", originalSearch.alertCount());
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
                                    console.log("Attempted fetching", attemptNum, "of", maxAttempts, "result is", originalSearch.alertCount() !== 0);
                                    originalSearch.fetch(Async.augment(done, index));
                                }
                            );
                        },
                        function(originalSearch, index, done) {
                            console.log("about to fetch");
                            console.log("SavedSearch name was", originalSearch.name);
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
                                                    console.log();
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
                        if (err) {
                            console.log(err);
                        }
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
                            console.log(alert.name);
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
                    console.log("Must be running Splunk 5.0+ for this test to work.");
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
                            service.views({owner: "admin", app: "xml2json"}).create({name: name, "eai:data": originalData}, done);
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
        
        "Collections": {
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
        */
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