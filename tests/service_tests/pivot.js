var splunkjs    = require('../../index');
var Async       = splunkjs.Async;
var utils       = splunkjs.Utils;
var tutils      = require('../utils');

var idCounter = 0;
var getNextId = function() {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

module.exports = function (svc) {
    return {
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                            test.ok(filter.hasOwnProperty("rule"));
                            test.ok(filter.hasOwnProperty("owner"));

                            test.strictEqual("has_boris", filter.fieldName);
                            test.strictEqual("boolean", filter.type);
                            test.strictEqual("=", filter.rule.comparator);
                            test.strictEqual(true, filter.rule.compareTo);
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                            test.ok(filter.hasOwnProperty("rule"));
                            test.ok(filter.hasOwnProperty("owner"));

                            test.strictEqual("host", filter.fieldName);
                            test.strictEqual("string", filter.type);
                            test.strictEqual("contains", filter.rule.comparator);
                            test.strictEqual("abc", filter.rule.compareTo);
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                            test.ok(filter.hasOwnProperty("rule"));
                            test.ok(filter.hasOwnProperty("owner"));

                            test.strictEqual("hostip", filter.fieldName);
                            test.strictEqual("ipv4", filter.type);
                            test.strictEqual("startsWith", filter.rule.comparator);
                            test.strictEqual("192.168", filter.rule.compareTo);
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                            test.ok(filter.hasOwnProperty("rule"));
                            test.ok(filter.hasOwnProperty("owner"));

                            test.strictEqual("epsilon", filter.fieldName);
                            test.strictEqual("number", filter.type);
                            test.strictEqual(">=", filter.rule.comparator);
                            test.strictEqual(2.3, filter.rule.compareTo);
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
                args = JSON.parse(utils.readFile(__filename, "../../data/data_model_for_pivot.json"));
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
    };
};