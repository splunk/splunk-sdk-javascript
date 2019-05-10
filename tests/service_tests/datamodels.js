var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;
var tutils      = require('../utils');

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function(svc) {
    return {
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
                args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/object_with_one_search.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/object_with_two_searches.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/object_with_two_searches.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/model_with_unicode_headers.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/model_with_empty_headers.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
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

                        dataModel.acceleration.enabled = false;
                        dataModel.acceleration.earliestTime = "-1mon";
                        dataModel.acceleration.cronSchedule = "* * * * *";

                        test.strictEqual(false, dataModel.isAccelerated());
                        test.strictEqual(false, dataModel.acceleration.enabled);
                        test.strictEqual("-1mon", dataModel.acceleration.earliestTime);
                        test.strictEqual("* * * * *", dataModel.acceleration.cronSchedule);

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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/model_with_multiple_types.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/model_with_multiple_types.json"));
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
    };
};