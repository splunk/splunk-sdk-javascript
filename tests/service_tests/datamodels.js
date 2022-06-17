var assert = require('chai').assert;

var splunkjs = require('../../index');
var tutils = require('../utils');

var Async = splunkjs.Async;
var utils = splunkjs.Utils;

var idCounter = 0;
var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc) {
    return (
        describe("Datamodels test", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                this.dataModels = svc.dataModels();
                this.skip = false;
                var that = this;
                this.service.serverInfo(function (err, info) {
                    if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping data model tests...");
                    }
                    done(err);
                });
            });

            it("Callback#DataModels - fetch a built-in data model", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
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
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create & delete an empty data model", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var initialSize;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        initialSize = dataModels.list().length;
                        dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        // Make sure we have 1 more data model than we started with
                        assert.strictEqual(initialSize + 1, dataModels.list().length);
                        // Delete the data model we just created, by name.
                        dataModels.item(name).remove(done);
                    },
                    function (done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        // Make sure we have as many data models as we started with
                        assert.strictEqual(initialSize, dataModels.list().length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create a data model with spaces in the name, which are swapped for -'s", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me- " + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        assert.strictEqual(name.replace(" ", "_"), dataModel.name);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create a data model with 0 objects", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/empty_data_model.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        // Check for 0 objects before fetch
                        assert.strictEqual(0, dataModel.objects.length);
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        // Check for 0 objects after fetch
                        assert.strictEqual(0, dataModels.item(name).objects.length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create a data model with 1 search object", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var dataModels = this.service.dataModels();


                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/object_with_one_search.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        // Check for 1 object before fetch
                        assert.strictEqual(1, dataModel.objects.length);
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        // Check for 1 object after fetch
                        assert.strictEqual(1, dataModels.item(name).objects.length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create a data model with 2 search objects", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/object_with_two_searches.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        // Check for 2 objects before fetch
                        assert.strictEqual(2, dataModel.objects.length);
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        // Check for 2 objects after fetch
                        assert.strictEqual(2, dataModels.item(name).objects.length);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - data model objects are created correctly", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/object_with_two_searches.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        assert.ok(dataModel.hasObject("search1"));
                        assert.ok(dataModel.hasObject("search2"));

                        var search1 = dataModel.objectByName("search1");
                        assert.ok(search1);
                        assert.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 1", search1.displayName);

                        var search2 = dataModel.objectByName("search2");
                        assert.ok(search2);
                        assert.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ - search 2", search2.displayName);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - data model handles unicode characters", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/model_with_unicode_headers.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        assert.strictEqual(name, dataModel.name);
                        assert.strictEqual("·Ä©·öô‡Øµ", dataModel.displayName);
                        assert.strictEqual("‡Øµ‡Ø±‡Ø∞‡ØØ", dataModel.description);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create data model with empty headers", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/model_with_empty_headers.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        assert.strictEqual(name, dataModel.name);
                        assert.strictEqual("", dataModel.displayName);
                        assert.strictEqual("", dataModel.description);

                        // Make sure we're not getting a summary of the data model
                        assert.strictEqual("0", dataModel.concise);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test acceleration settings", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model object metadata", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        var obj = dataModel.objectByName("event1");
                        assert.ok(obj);

                        assert.strictEqual("event1 ·Ä©·öô", obj.displayName);
                        assert.strictEqual("event1", obj.name);
                        assert.deepEqual(dataModel, obj.dataModel);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model object parent", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        var obj = dataModel.objectByName("event1");
                        assert.ok(obj);
                        assert.ok(!obj.parent());

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model object lineage", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        var obj = dataModel.objectByName("level_0");
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

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model object fields", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                        assert.deepEqual(["BaseEvent"], timeField.lineage);
                        assert.strictEqual("_time", timeField.name);
                        assert.strictEqual(false, timeField.required);
                        assert.strictEqual(false, timeField.multivalued);
                        assert.strictEqual(false, timeField.hidden);
                        assert.strictEqual(false, timeField.editable);
                        assert.strictEqual(null, timeField.comment);

                        var lvl2 = obj.fieldByName("level_2");
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

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model object properties", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        var obj = dataModel.objectByName("test_data");
                        assert.ok(obj);
                        assert.strictEqual(5, obj.fieldNames().length);
                        assert.strictEqual(10, obj.allFieldNames().length);
                        assert.ok(obj.fieldByName("has_boris"));
                        assert.ok(obj.hasField("has_boris"));
                        assert.ok(obj.fieldByName("_time"));
                        assert.ok(obj.hasField("_time"));

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create local acceleration job", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("level_2");
                        assert.ok(obj);

                        obj.createLocalAccelerationJob(null, done);
                    },
                    function (job, done) {
                        assert.ok(job);

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
                        assert.strictEqual("| datamodel \"" + name + "\" level_2 search | tscollect", job.properties().request.search);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - create local acceleration job with earliest time", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/inheritance_test_data.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var oldNow = Date.now();
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("level_2");
                        assert.ok(obj);
                        obj.createLocalAccelerationJob("-1d", done);
                    },
                    function (job, done) {
                        assert.ok(job);
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model constraints", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - test data model calculations, and the different types", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_with_test_objects.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("event1");
                        assert.ok(obj);

                        var calculations = obj.calculations;
                        assert.strictEqual(4, Object.keys(calculations).length);
                        assert.strictEqual(4, obj.calculationIDs().length);

                        var evalCalculation = calculations["93fzsv03wa7"];
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

                        var field = evalCalculation.outputFields["new_field"];
                        assert.ok(field);
                        assert.strictEqual("My New Field", field.displayName);

                        var lookupCalculation = calculations["sr3mc8o3mjr"];
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

                        var regexpCalculation = calculations["a5v1k82ymic"];
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

                        var geoIPCalculation = calculations["pbe9bd0rp4"];
                        assert.ok(geoIPCalculation);
                        assert.strictEqual("event1", geoIPCalculation.owner);
                        assert.deepEqual(["event1"], geoIPCalculation.lineage);
                        assert.strictEqual("GeoIP", geoIPCalculation.type);
                        assert.ok(geoIPCalculation.isGeoIP());
                        assert.ok(!geoIPCalculation.isLookup());
                        assert.ok(!geoIPCalculation.isEval());
                        assert.ok(!geoIPCalculation.isRex());
                        assert.strictEqual("·Ä©·öô‡Øµ comment of pbe9bd0rp4", geoIPCalculation.comment);
                        assert.strictEqual(5, geoIPCalculation.outputFieldNames().length);
                        assert.strictEqual("output_from_reverse_hostname", geoIPCalculation.inputField);

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - run queries", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        obj = dm.objectByName("searches");
                        obj.startSearch({}, "", done);
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
                        assert.strictEqual("| datamodel internal_audit_logs searches search", job.properties().request.search);
                        job.cancel(done);
                    },
                    function (response, done) {
                        obj.startSearch({ status_buckets: 5, enable_lookups: false }, "| head 3", done);
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
                        assert.strictEqual("| datamodel internal_audit_logs searches search | head 3", job.properties().request.search);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - baseSearch is parsed correctly", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/model_with_multiple_types.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("search1");
                        assert.ok(obj);
                        assert.ok(obj instanceof splunkjs.Service.DataModelObject);
                        assert.strictEqual("BaseSearch", obj.parentName);
                        assert.ok(obj.isBaseSearch());
                        assert.ok(!obj.isBaseTransaction());
                        assert.strictEqual("search index=_internal | head 10", obj.baseSearch);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#DataModels - baseTransaction is parsed correctly", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/model_with_multiple_types.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var name = "delete-me-" + getNextId();

                var obj;
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("transaction1");
                        assert.ok(obj);
                        assert.ok(obj instanceof splunkjs.Service.DataModelObject);
                        assert.strictEqual("BaseTransaction", obj.parentName);
                        assert.ok(obj.isBaseTransaction());
                        assert.ok(!obj.isBaseSearch());
                        assert.deepEqual(["event1"], obj.objectsToGroup);
                        assert.deepEqual(["host", "from"], obj.groupByFields);
                        assert.strictEqual("25s", obj.maxPause);
                        assert.strictEqual("100m", obj.maxSpan);

                        done();
                    }
                ],
                    function (err) {
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
