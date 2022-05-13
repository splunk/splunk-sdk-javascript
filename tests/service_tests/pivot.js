
exports.setup = function (svc) {
    var assert = require('chai').assert;

    var splunkjs = require('../../index');
    var tutils = require('../utils');

    var Async = splunkjs.Async;
    var utils = splunkjs.Utils;
    var idCounter = 0;

    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Pivot Tests", function () {
            beforeEach(function (done) {
                this.service = svc;
                this.dataModels = svc.dataModels({ owner: "nobody", app: "search" });
                this.skip = false;
                var that = this;
                this.service.serverInfo(function (err, info) {
                    if (parseInt(info.properties().version.split(".")[0], 10) < 6) {
                        that.skip = true;
                        splunkjs.Logger.log("Skipping pivot tests...");
                    }
                    done(err);
                });
            })

            it("Callback#Pivot - test constructor args", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        assert.ok(dataModel.objectByName("test_data"));
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test acceleration, then pivot", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        dataModel.objectByName("test_data");
                        assert.ok(dataModel);

                        dataModel.acceleration.enabled = true;
                        dataModel.acceleration.earliestTime = "-2mon";
                        dataModel.acceleration.cronSchedule = "0 */12 * * *";
                        dataModel.update(done);
                    },
                    function (dataModel, done) {
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
                    function (job, pivot, done) {
                        assert.ok(job);
                        assert.ok(pivot);
                        assert.notStrictEqual("FAILED", job.properties().dispatchState);

                        job.track({}, function (job) {
                            assert.ok(pivot.tstatsSearch);
                            assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                            assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                            assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                            assert.strictEqual(pivot.tstatsSearch, job.properties().request.search);
                            done(null, job);
                        });
                    },
                    function (job, done) {
                        assert.ok(job);
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test illegal filtering (all types)", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test boolean filtering", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test string filtering", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test IPv4 filtering", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test number filtering", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test limit filtering", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test row split", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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

                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test column split", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test cell value", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
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
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test pivot throws HTTP exception", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        var obj = dataModel.objectByName("test_data");
                        assert.ok(obj);

                        obj.createPivotSpecification().pivot(done);
                    },
                    function (pivot, done) {
                        assert.ok(false);
                    }
                ],
                    function (err) {
                        assert.ok(err);
                        var expectedErr = "In handler 'datamodelpivot': Error in 'PivotReport': Must have non-empty cells or non-empty rows.";
                        assert.ok(utils.endsWith(err.message, expectedErr));
                        done();
                    }
                );
            })

            it("Callback#Pivot - test pivot with simple namespace", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                var name = "delete-me-" + getNextId();
                var args;
                try {
                    args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
                }
                catch (err) {
                    // Fail if we can't read the file, likely to occur in the browser
                    assert.ok(!err);
                    done();
                }
                var that = this;
                var obj;
                var pivotSpecification;
                var adhocjob;
                Async.chain([
                    function (done) {
                        that.dataModels.create(name, args, done);
                    },
                    function (dataModel, done) {
                        obj = dataModel.objectByName("test_data");
                        assert.ok(obj);
                        obj.createLocalAccelerationJob(null, done);
                    },
                    function (job, done) {
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
                    function (pivot, done) {
                        assert.ok(pivot.tstatsSearch);
                        assert.ok(pivot.tstatsSearch.length > 0);
                        assert.strictEqual(0, pivot.tstatsSearch.indexOf("| tstats"));
                        // This test won't work with utils.startsWith due to the regex escaping
                        assert.strictEqual("| tstats", pivot.tstatsSearch.match("^\\| tstats")[0]);
                        assert.strictEqual(1, pivot.tstatsSearch.match("^\\| tstats").length);

                        pivot.run(done);
                    },
                    function (job, done) {
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties().isDone;
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        assert.ok("FAILED" !== job.properties().dispatchState);

                        assert.strictEqual(0, job.properties().request.search.indexOf("| tstats"));
                        // This test won't work with utils.startsWith due to the regex escaping
                        assert.strictEqual("| tstats", job.properties().request.search.match("^\\| tstats")[0]);
                        assert.strictEqual(1, job.properties().request.search.match("^\\| tstats").length);

                        adhocjob.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test pivot column range split", function (done) {
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
                    function (done) {
                        that.dataModels.fetch(done);
                    },
                    function (dataModels, done) {
                        var dm = dataModels.item("internal_audit_logs");
                        var obj = dm.objectByName("searches");
                        var pivotSpecification = obj.createPivotSpecification();

                        pivotSpecification.addRowSplit("user", "Executing user");
                        pivotSpecification.addRangeColumnSplit("exec_time", { start: 0, end: 12, step: 5, limit: 4 });
                        pivotSpecification.addCellValue("search", "Search Query", "values");
                        pivotSpecification.pivot(done);
                    },
                    function (pivot, done) {
                        // If tstats is undefined, use pivotSearch
                        search = pivot.tstatsSearch || pivot.pivotSearch;
                        pivot.run(done);
                    },
                    function (job, done) {
                        tutils.pollUntil(
                            job,
                            function (j) {
                                return job.properties().isDone;
                            },
                            10,
                            done
                        );
                    },
                    function (job, done) {
                        assert.notStrictEqual("FAILED", job.properties().dispatchState);
                        // Make sure the job is run with the correct search query
                        assert.strictEqual(search, job.properties().request.search);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#Pivot - test pivot with PivotSpecification.run and Job.track", function (done) {
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
                        var obj = dm.objectByName("searches");
                        var pivotSpecification = obj.createPivotSpecification();

                        pivotSpecification.addRowSplit("user", "Executing user");
                        pivotSpecification.addRangeColumnSplit("exec_time", { start: 0, end: 12, step: 5, limit: 4 });
                        pivotSpecification.addCellValue("search", "Search Query", "values");

                        pivotSpecification.run({}, done);
                    },
                    function (job, pivot, done) {
                        job.track({}, function (job) {
                            assert.strictEqual(pivot.tstatsSearch || pivot.pivotSearch, job.properties().request.search);
                            done(null, job);
                        });
                    },
                    function (job, done) {
                        assert.notStrictEqual("FAILED", job.properties().dispatchState);
                        job.cancel(done);
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })

            it("Callback#DataModels - delete any remaining data models created by the SDK tests", function (done) {
                if (this.skip) {
                    done();
                    return;
                }
                svc.dataModels().fetch(function (err, dataModels) {
                    if (err) {
                        assert.ok(!err);
                    }

                    var dms = dataModels.list();
                    Async.seriesEach(
                        dms,
                        function (datamodel, i, done) {
                            // Delete any test data models that we created
                            if (utils.startsWith(datamodel.name, "delete-me")) {
                                datamodel.remove(done);
                            }
                            else {
                                done();
                            }
                        },
                        function (err) {
                            assert.ok(!err);
                            done();
                        }
                    );
                });
            })
        })
    );
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
