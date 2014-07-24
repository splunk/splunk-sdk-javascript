/*!*/
// Copyright 2014 Splunk, Inc.
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

(function() {
    "use strict";
    
    var Service     = require("./service");
    var Async       = require('./async');
    var Paths       = require('./paths').Paths;
    var Class       = require('./jquery.class').Class;
    var utils       = require('./utils');

    var root = exports || this;

    /**
     * TODO: docs
     * Constructor for data model fields
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
     *
     * @class splunkjs.Service.DataModelField
     */
    root.DataModelField = Class.extend({
        /**
         * Constructor for a data model field.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `displayName` (_string_): The display name for this field.
         *      // TODO: finish these docs for possible properties
         *
         * @method splunkjs.Service.DataModelField
         */
        init: function(props) {
            // TODO: am I missing any types here?
            this.types = {
                string: "string",
                number: "number",
                timestamp: "timestamp",
                objectcount: "objectCount", // TODO: is this supposed to be camelCased?
                childcount: "childCount",
                ipv4: "ipv4",
                boolean: "boolean"
            };

            this.name           = props.fieldName;
            this.displayName    = props.displayName;
            this.type           = props.type;
            this.multivalued    = props.multivalue;
            this.required       = props.required;
            this.hidden         = props.hidden;
            this.editable       = props.editable;
            this.comment        = props.comment;
            this.fieldSearch    = props.fieldSearch;
            this.lineage        = props.owner.split(".");
            this.owner          = this.lineage[this.lineage.length - 1];
        },

        /**
         * Is this data model field of type string?
         *
         * @return {Boolean} True if this data model field is of type string.
         *
         * @method splunkjs.Service.DataModelField
         */
        isString: function() {
            return this.type === this.types.string;
        },

        /**
         * Is this data model field of type number?
         *
         * @return {Boolean} True if this data model field is of type number.
         *
         * @method splunkjs.Service.DataModelField
         */
        isNumber: function() {
            return this.type === this.types.number;
        },

        /**
         * Is this data model field of type timestamp?
         *
         * @return {Boolean} True if this data model field is of type timestamp.
         *
         * @method splunkjs.Service.DataModelField
         */
        isTimestamp: function() {
            return this.type === this.types.timestamp;
        },

        /**
         * Is this data model field of type object count?
         *
         * @return {Boolean} True if this data model field is of type object count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isObjectcount: function() {
            return this.type === this.types.objectcount;
        },

        /**
         * Is this data model field of type child count?
         *
         * @return {Boolean} True if this data model field is of type child count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isChildcount: function() {
            return this.type === this.types.childcount;
        },

        /**
         * Is this data model field of type ipv4?
         *
         * @return {Boolean} True if this data model field is of type ipv4.
         *
         * @method splunkjs.Service.DataModelField
         */
        isIPv4: function() {
            return this.type === this.types.ipv4;
        },

        /**
         * Is this data model field of type boolean?
         *
         * @return {Boolean} True if this data model field is of type boolean.
         *
         * @method splunkjs.Service.DataModelField
         */
        isBoolean: function() {
            return this.type === this.types.boolean;
        }
    });
    
    /**
     * TODO: docs
     * Constructor for data model constraints
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
     *
     * // TODO: clean this up
     * Has 3 properties:
     *    - query: {String} the search query defining this data model constraint
     *    - lineage: {Array} the lineage of this data model constraint
     *    - owner: {String} name of the data model object this data model 
     *             constraint belongs to
     *
     * @class splunkjs.Service.DataModelConstraint
     */
    root.DataModelConstraint = Class.extend({
        /**
         * Constructor for a data model constraint.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *      // TODO: finish these docs for possible properties
         *
         * @method splunkjs.Service.DataModelConstraint
         */
        init: function(props) {
            this.query   = props.search;
            this.lineage = props.owner.split(".");
            this.owner   = this.lineage[this.lineage.length - 1];
        }
    });
    
    /**
     * TODO: docs
     * Constructor for data model calculations
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
     *
     * @class splunkjs.Service.DataModelCalculation
     */
    root.DataModelCalculation = Class.extend({
        /**
         * Constructor for a data model calculations.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *      // TODO: finish these docs for possible properties
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        init: function(props) {
            this.types = {
                Lookup: "Lookup",
                Eval: "Eval",
                GeoIP: "GeoIP",
                Regexp: "Rex"
            };

            this.id             = props.calculationID;
            this.type           = props.calculationType;
            this.lineage        = props.owner.split(".");
            this.owner          = this.lineage[this.lineage.length - 1];
            this.comment        = props.comment;
            this.editable      = props.editable;

            this.outputFields = [];
            for (var i = 0; i < props.outputFields.length; i++) {
                this.outputFields[props.outputFields[i].fieldName] = new root.DataModelField(props.outputFields[i]);
            }

            // Based on the type, conditionally add some functions/properties; TODO: docs
            if (this.type === this.types.Eval || this.type === this.types.Regexp) {
                this.expression = props.expression;
            }
            if (this.type === this.types.GeoIP || this.type === this.types.Regexp) {
                this.inputField = props.inputField;
            }
            if (this.type === this.types.Lookup) {
                this.lookupName = props.lookupName;
                this.inputFieldMappings = props.lookupInputs;
            }
        },

        // TODO: docs
        outputFieldNames: function() {
            return Object.keys(this.outputFields);
        },

        // TODO: docs
        isEditable: function() {
            return this.editable;
        },

        /**
         * Is this data model calculation of type lookup?
         *
         * @return {Boolean} True if this data model calculation is of type lookup.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isLookup: function() {
            return this.type === this.types.Lookup;
        },

        /**
         * Is this data model calculation of type eval?
         *
         * @return {Boolean} True if this data model calculation is of type eval.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEval: function() {
            return this.type === this.types.Eval;
        },
        
        /**
         * Is this data model calculation of type Regexp?
         *
         * @return {Boolean} True if this data model calculation is of type Regexp.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isRegexp: function() {
            return this.type === this.types.Regexp;
        },

        /**
         * Is this data model calculation of type GeoIP?
         *
         * @return {Boolean} True if this data model calculation is of type GeoIP.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isGeoIP: function() {
            return this.type === this.types.GeoIP;
        }
    });
    

    /**
     * TODO: docs
     * Constructor for pivot specification
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
     *
     * @class splunkjs.Service.PivotSpec
     */
    root.PivotSpec = Class.extend({
        // TODO: docs, takes a DataModelObject instance as a parameter
        init: function(dataModelObject) {
            this.dataModelObject = dataModelObject;
            this.columns = [];
            this.rows = [];
            this.filters = [];
            this.cells = [];

            this.comparisonTypes = {
                boolean: "boolean",
                string: "string",
                number: "number",
                IPv4: "ipv4",
                timestamp: "timestamp",
                // TODO: do these need to be camelCase?
                objectcount: "objectCount",
                childcount: "childCount"
            };

            // TODO: types of comparisons
            this.comparisons = {};
            // TODO see if some can be combined; also they should be made into dicts with nicer names
            this.comparisons[this.comparisonTypes.boolean] = [
                "=",
                "is",
                "isNull",
                "isNotNull"
            ];
            this.comparisons[this.comparisonTypes.string] = [
                "=",
                "is",
                "isNull",
                "isNotNull",
                "contains",
                "doesNotContain",
                "startsWith",
                "endsWith",
                "regex"
            ];
            this.comparisons[this.comparisonTypes.IPv4] = [
                "is",
                "isNull",
                "isNotNull",
                "contains",
                "doesNotContain",
                "startsWith"
            ];
            this.comparisons[this.comparisonTypes.number] = [
                "=",
                "!=",
                "<",
                ">",
                "<=",
                ">=",
                "is",
                "isNull",
                "isNotNull"
            ];
            // TODO: the rest of these types

            this.statsFunctions = {
                LIST: "list",
                DISTINCT_VALUES: "values",
                FIRST: "first",
                LAST: "last",
                COUNT: "count",
                DISTINCT_COUNT: "dc",
                SUM: "sum",
                AVERAGE: "average",
                MAX: "max",
                MIN: "min",
                STDEV: "stdev",
                DURATION: "duration",
                EARLIEST: "earliest",
                LATEST: "latest"
            };

            this.sortDirections = {
                ASC: "ASCENDING",
                DESC: "DESCENDING",
                DEFAULT: "DEFAULT"
            };

            this.binning = {
                AUTO: "auto",
                YEAR: "year",
                MONTH: "month",
                DAY: "day",
                HOUR: "hour",
                MINUTE: "minute",
                SECOND: "second"
            };

            this.accelerationNamespace = 
                dataModelObject.dataModel.isAccelerated() ? 
                dataModelObject.dataModel.name :
                null;
        },
        // TODO: docs
        setAccelerationJob: function(sid) {
            if (!sid) {
                throw new Error("Sid to use for acceleration must not be null.");
            }
            else {
                // If a search object is passed in, get its sid
                if (typeof sid === "Object") {
                    sid = sid.sid;
                }
                
                this.accelerationNamespace = "sid=" + sid;
            }
            return this;
        },

        // TODO: docs
        setAccelerationNamespace: function(ns) {
            this.accelerationNamespace = ns;
            return this;
        },

        // TODO: docs
        // fieldName: name of the field
        // comparisonType: type of comparison (Boolean, String, IPv4, Number, limit of values)
        // TODO: maybe the comparisonType & comparison params can be simplified into one using dot notation
        addFilter: function(fieldName, comparisonType, comparison, compareTo) {
            // TODO: all parameters are required, so do some checking before doing anything else.

            if (!this.dataModelObject.hasField(fieldName)) { // TODO: use this check in row splits
                throw new Error("Cannot add filter on a nonexistent field.");
            }
            if (comparisonType !== this.dataModelObject.fieldByName(fieldName).type) {
                throw new Error(
                    "Cannot add " + comparisonType +  
                    " filter on " + fieldName + 
                    " because it is of type " +
                    this.dataModelObject.fieldByName(fieldName).type);
            }
            if (!utils.contains(this.comparisons[comparisonType], comparison)) {
                throw new Error(
                    "Cannot add " + comparisonType + 
                    " filter because " + comparison +
                    " is not a valid comparison");
            }

            var that = this;
            this.filters.push({
                fieldName: fieldName,
                dataModelObject: that.dataModelObject,
                type: comparisonType,
                toJSON: function() {
                    // add the common fields
                    var ret = {
                        fieldName: fieldName,
                        owner: this.dataModelObject.fieldByName(fieldName).lineage.join("."),
                        type: comparisonType
                    };

                    // TODO: there will be some common fields, some type-dependent
                    if (utils.contains([
                        that.comparisonTypes.boolean,
                        that.comparisonTypes.string,
                        that.comparisonTypes.IPv4,
                        that.comparisonTypes.number
                        ],
                        ret.type)) {

                        ret.comparator = comparison;
                        ret.compareTo = compareTo;
                    }

                    return ret;
                }
            });

            return this; // Return the pivot spec for the fluent style API
        },
        // TODO: docs
        addLimitFilter: function(fieldName, sortAttribute, sortDirection, limit, statsFunction) {
            // TODO: parameter validation
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Cannot add limit filter on a nonexistent field.");
            }
            if (!utils.contains([this.comparisonTypes.string, this.comparisonTypes.number, this.comparisonTypes.objectcount],
                    this.dataModelObject.fieldByName(fieldName).type)) {
                throw new Error("Cannot add limit filter on " + fieldName + " because it is of type " + this.dataModelObject.fieldByName(fieldName).type);
            }

            if (this.dataModelObject.fieldByName(fieldName).type === this.comparisonTypes.string &&
                !utils.contains([this.statsFunctions.COUNT, this.statsFunctions.DISTINCT_COUNT], statsFunction)
                ) {
                throw new Error("Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found " +
                    statsFunction);
            }

            if (this.dataModelObject.fieldByName(fieldName).type === this.comparisonTypes.number &&
                !utils.contains([this.statsFunctions.COUNT, this.statsFunctions.DISTINCT_COUNT, this.statsFunctions.AVERAGE, this.statsFunctions.SUM], statsFunction)
                ) {
                // TODO: error
                throw new Error("Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found " +
                    statsFunction);
            }

            if (this.dataModelObject.fieldByName(fieldName).type === this.comparisonTypes.objectcount &&
                !utils.contains([this.statsFunctions.COUNT], statsFunction)
                ) {
                throw new Error("Stats function for fields of type object count must be COUNT; found " + statsFunction);
            }

            var that = this;
            this.filters.push({
                dataModelObject: that.dataModelObject,
                sortAttribute: sortAttribute,
                sortDirection: sortDirection,
                limit: limit,
                statsFunction: statsFunction,
                type: that.comparisonTypes.number,
                toJSON: function() {
                    // add the common fields
                    var ret = {
                        fieldName: fieldName,
                        owner: this.dataModelObject.fieldByName(fieldName).lineage.join("."),
                        type: this.dataModelObject.fieldByName(fieldName).type
                    };

                    ret.attributeName = this.sortAttribute;
                    ret.attributeOwner = this.dataModelObject.fieldByName(this.sortAttribute).lineage.join(".");

                    if (sortDirection === that.sortDirections.ASC) {
                        ret.limitType = "lowest";
                    }
                    else { // Assumed this is preferred for when sortDirection is DEFAULT
                        ret.limitType = "highest";
                    }

                    ret.limitAmount = this.limit;
                    ret.statsFn = this.statsFunction;

                    return ret;
                }
            });

            return this; // Return the pivot spec for the fluent style API
        },
        // TODO: docs
        addRowSplit: function(field, label) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (!utils.contains([this.comparisonTypes.number, this.comparisonTypes.string], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var row = {
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label
            };

            if (f.type === this.comparisonTypes.number) {
                row.display = "all";
            }

            this.rows.push(row);

            return this;
        },
        // TODO: docs; only valid for numerical fields
        addRangeRowSplit: function(field, label, start, end, step, limit) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.number !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }
            var ranges = {};
            if (!utils.isUndefined(start) && start !== null) {
                ranges.start = start;
            }
            if (!utils.isUndefined(end) && end !== null) {
                ranges.end = end;
            }
            if (!utils.isUndefined(step) && step !== null) {
                ranges.size = step;
            }
            if (!utils.isUndefined(limit) && limit !== null) {
                ranges.maxNumberOf = limit;
            }

            var row = {
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                display: "ranges",
                ranges: ranges
            };

            this.rows.push(row);

            return this;
        },
        // TODO: docs; only valid for boolean fields
        addBooleanRowSplit: function(field, label, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.boolean !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected boolean.");
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                trueLabel: trueDisplayValue,
                falseLabel: falseDisplayValue
            });

            return this;
        },
        // TODO: docs; only valid for timestamp fields
        addTimestampRowSplit: function(field, label, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.timestamp !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                period: binning
            });

            return this;            
        },
        // TODO: docs; only valid for number and string fields
        addColumnSplit: function(field) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (!utils.contains([this.comparisonTypes.number, this.comparisonTypes.string], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            // TODO: only numeric has display
            var col = {
                fieldName: field,
                owner: f.owner,
                type: f.type
            };

            if (f.type === this.comparisonTypes.number) {
                col.display = "all";
            }

            this.columns.push(col);

            return this;
        },
        // TODO: docs; only valid for numerical fields
        addRangeColumnSplit: function(field, start, end, step, limit) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.number !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }

            // In Splunk 6.0.1.1, data models incorrectly expect strings for these fields
            // instead of numbers. In 6.1, this is fixed and both are accepted.
            var ranges = {};
            if (!utils.isUndefined(start) && start !== null) {
                ranges.start = start;
            }
            if (!utils.isUndefined(end) && end !== null) {
                ranges.end = end;
            }
            if (!utils.isUndefined(step) && step !== null) {
                ranges.size = step;
            }
            if (!utils.isUndefined(limit) && limit !== null) {
                ranges.maxNumberOf = limit;
            }

            var col = {
                fieldName: field,
                owner: f.owner,
                type: f.type,
                display: "ranges",
                ranges: ranges
            };

            this.columns.push(col);

            return this;
        },
        // TODO: docs; only valid for boolean fields
        addBooleanColumnSplit: function(field, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.boolean !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected boolean.");
            }

            this.columns.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                trueLabel: trueDisplayValue,
                falseLabel: falseDisplayValue
            });

            return this;
        },
        // TODO: docs; only valid for timestamp fields
        addTimestampColumnSplit: function(field, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if (this.comparisonTypes.timestamp !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }

            this.columns.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                period: binning
            });

            return this;            
        },
        // TOOD: docs
        addCellValue: function(field, label, statsFunction) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }

            var f = this.dataModelObject.fieldByName(field);
            if (utils.contains([this.comparisonTypes.string, this.comparisonTypes.IPv4], f.type) &&
                !utils.contains([
                    this.statsFunctions.LIST,
                    this.statsFunctions.DISTINCT_VALUES,
                    this.statsFunctions.FIRST,
                    this.statsFunctions.LAST,
                    this.statsFunctions.COUNT,
                    this.statsFunctions.DISTINCT_COUNT], statsFunction)
                ) {
                throw new Error("Stats function on string and IPv4 fields must be one of:" +
                    " list, distinct_values, first, last, count, or distinct_count; found " +
                    statsFunction);
            }
            else if (this.comparisonTypes.number === f.type && 
                !utils.contains([
                    this.statsFunctions.SUM,
                    this.statsFunctions.COUNT,
                    this.statsFunctions.AVERAGE,
                    this.statsFunctions.MIN,
                    this.statsFunctions.MAX,
                    this.statsFunctions.STDEV,
                    this.statsFunctions.LIST,
                    this.statsFunctions.DISTINCT_VALUES
                    ], statsFunction)
                ) {
                throw new Error("Stats function on number field must be must be one of:" +
                    " sum, count, average, max, min, stdev, list, or distinct_values; found " +
                    statsFunction
                    );
            }
            else if (this.comparisonTypes.timestamp === f.type &&
                !utils.contains([
                    this.statsFunctions.DURATION,
                    this.statsFunctions.EARLIEST,
                    this.statsFunctions.LATEST,
                    this.statsFunctions.LIST,
                    this.statsFunctions.DISTINCT_VALUES
                    ], statsFunction)
                ) {
                throw new Error("Stats function on timestamp field must be one of:" +
                    " duration, earliest, latest, list, or distinct values; found " +
                    statsFunction
                    );
            }
            else if (utils.contains([this.comparisonTypes.objectcount, this.comparisonTypes.childcount], f.type) &&
                this.statsFunctions.COUNT !== statsFunction
                ) {
                throw new Error("Stats function on childcount and objectcount fields must be count; " +
                    "found " + statsFunction);
            }
            else if (this.comparisonTypes.boolean === f.type) {
                throw new Error("Cannot use boolean valued fields as cell values.");
            }

            this.cells.push({
                fieldName: field,
                owner: f.lineage.join("."),
                type: f.type,
                label: label,
                sparkline: false, // Not properly implemented in core yet.
                value: statsFunction
            });

            return this;
        },
        // TODO: docs
        toJSON: function() {
            var ret = {
                "dataModel": this.dataModelObject.dataModel.name,
                "baseClass": this.dataModelObject.name,
                "filters": this.filters,
                "rows": this.rows,
                "columns": this.columns,
                "cells": this.cells
            };

            return ret;
        },
        // TODO: docs, runs async
        pivot: function(callback) {
            var svc = this.dataModelObject.dataModel.service;

            var args = {
                pivot_json: JSON.stringify(this.toJSON())
            };

            if (!utils.isUndefined(this.accelerationNamespace)) {
                args.namespace = this.accelerationNamespace;
            }
            
            return svc.get(Paths.pivot + "/" + encodeURIComponent(this.dataModelObject.dataModel.name), args, function(err, response) {
                if (err) {
                    callback(new Error(err.data.messages[0].text), response);
                }
                else {
                    // TODO: We want to return a Pivot object, we should create a new class for it.
                    if (response.data.entry && response.data.entry[0]) {
                        var content = response.data.entry[0].content;
                        var pivot = {
                            service: svc,
                            openInSearch: content["open_in_search"],
                            drilldownSearch: content["drilldown_search"],
                            pivotSearch: content["pivot_search"],
                            search: content["search"],
                            tstatsSearch: content["tstats_search"] || null,
                            // TODO: docs
                            prettyQuery: function() {
                                return this.openInSearch;
                            },
                            // TODO: docs
                            run: function(args, callback) {
                                // TODO: test this for optional params
                                if (utils.isUndefined(callback)) {
                                    callback = args;
                                    args = {};
                                }
                                if (!args || Object.keys(args).length === 0) {
                                    args = {};
                                }

                                // If tstats is undefined, use pivotSearch
                                this.service.search(this.tstatsSearch || this.pivotSearch, args, callback);
                            }
                        };
                        callback(null, pivot);
                    }
                    else {
                        callback(new Error("Didn't get a Pivot report back from Splunk"), response);
                    }
                }
            });
        }
    });

    /**
     * TODO: docs
     * Constructor for data model objects
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
     *
     * @class splunkjs.Service.DataModelObject
     */
    root.DataModelObject = Class.extend({
        /**
         * Constructor for a data model calculations.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *      // TODO: finish these docs for possible properties
         *
         * @param {Object} parentDataModel The `splunkjs.Service.DataModel` instance that is
         * the parent of this data model object.
         * @method splunkjs.Service.DataModelObject
         */
        init: function(props, parentDataModel) {
            this.dataModel              = parentDataModel;
            this.name                   = props.objectName;
            this.displayName            = props.displayName;
            this.parentName             = props.parentName;
            this.lineage                = props.lineage.split(".");

            // TODO: need some tests to hit these properties
            this.objectSearchNoFields   = props.objectSearchNoFields;
            this.objectSearch           = props.objectSearch;

            // TODO: this stuff for transactions; both properties should be arrays already
            if (props.hasOwnProperty("groupByFields")) {
                this.groupByFields = props.groupByFields;
            }
            if (props.hasOwnProperty("objectsToGroup")) {
                this.objectsToGroup = props.objectsToGroup;
            }
            if (props.hasOwnProperty("transactionMaxTimeSpan")) {
                this.maxSpan = props.transactionMaxTimeSpan;
            }
            if (props.hasOwnProperty("transactionMaxPause")) {
                this.maxPause = props.transactionMaxPause;
            }

            // TODO: handle the case of baseSearch
            if (props.hasOwnProperty("baseSearch")) {
                this.baseSearch = props.baseSearch;
            }

            // Parse fields
            this.fields = {};
            for (var i = 0; i < props.fields.length; i++) {
                this.fields[props.fields[i].fieldName] = new root.DataModelField(props.fields[i]);
            }

            // Parse constraints
            this.constraints = [];
            for (var j = 0; j < props.constraints.length; j++) {
                this.constraints.push(new root.DataModelConstraint(props.constraints[j]));
            }

            // Parse calculations
            this.calculations = [];
            for (var k = 0; k < props.calculations.length; k++) {
                this.calculations[props.calculations[k].calculationID] = new root.DataModelCalculation(props.calculations[k]);
            }
        },
        // TODO: docs, possibly use a better check
        // TODO: need a test of this
        isBaseEvent: function() {
            return !this.isBaseSearch() && !this.isBaseTransaction();
        },
        // TODO: docs, working title may need to rename (this is instead of creating a BaseSearch class)
        // TODO: need a test of this
        isBaseSearch: function() {
            return !utils.isUndefined(this.baseSearch);
        },
        // TODO: docs, working title may need to rename (this is instead of creating a BaseTransaction class)
        isBaseTransaction: function() {
            return !utils.isUndefined(this.maxSpan); // TODO: might want to use a different property
        },
        // TODO: docs
        fieldNames: function() {
            return Object.keys(this.fields);
        },
        // TODO: docs
        fieldByName: function(name) {
            return this.allFields()[name];
        },
        // TODO: docs, should be computed once on init
        allFields: function() {
            // merge fields and calculationFields()
            var fields = this.fields;
            var calculatedFields = this.calculatedFields();
            var keys = Object.keys(calculatedFields);

            for (var i = 0; i < keys.length; i++) {
                var calculatedField = calculatedFields[keys[i]];
                fields[calculatedField.name] = calculatedField;
            }
            return fields;
        },
        allFieldNames: function() {
            return Object.keys(this.allFields());
        },
        // TODO: docs, should be computed once on init
        calculatedFields: function(){
            var fields = {};
            // TODO: iterate over the calculations, get their fields
            var keys = this.calculationIDs();
            var calculations = this.calculations;
            for (var i = 0; i < keys.length; i++) {
                var calculation = calculations[keys[i]];
                for (var f = 0; f < calculation.outputFieldNames().length; f++) {
                    var outputField = calculation.outputFields[calculation.outputFieldNames(f)];
                    fields[outputField.name] = outputField;
                }
            }
            return fields;
        },
        // TODO: docs
        calculatedFieldNames: function() {
            return Object.keys(this.calculatedFields());
        },
        // TODO: docs
        hasField: function(fieldName) {
            return utils.contains(this.allFieldNames(), fieldName);
        },
        // TODO: docs
        calculationIDs: function() {
            return Object.keys(this.calculations);
        },
        // TODO: docs
        // Takes an optional string arg, `earliestTime`
        // call the callback with the search job
        createLocalAccelerationJob: function(earliestTime, callback) {
            // If earliestTime parameter is not specified, then set callback to it's value
            if (!callback && utils.isFunction(earliestTime)) {
                callback = earliestTime;
                earliestTime = undefined;
            }

            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search | tscollect"; 
            var args = earliestTime ? {earliest_time: earliestTime} : {};

            this.dataModel.service.search(query, args, callback);
        },
        // TODO: docs
        // optional args and querySuffix parameters
        runQuery: function(args, querySuffix, callback) {
            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search";
            // TODO: handle the optional parameters (args, and querySuffix are both optional)
            if (querySuffix) {
                querySuffix = " " + querySuffix; // Prepend a space
            }
            else {
                querySuffix = "";
            }
            this.dataModel.service.search(query + querySuffix, args, callback);
        },
        // TODO: docs; this will return undefined if the parent is BaseEvent/BaseSearch/BaseTransaction
        parent: function() {
            return this.dataModel.objectByName(this.parentName);
        },
        /**
         * TODO: docs
         *
         * Returns a Pivot Specification, accepts no parameters
         */
        createPivotSpec: function() {
            // Pass in the DataModelObject to create a PivotSpec
            return new root.PivotSpec(this);
        }
    });
    
    /**
     * Represents a data model on the server. Data models
     * contain data model objects, which specify structured
     * views on Splunk data.
     *
     * @endpoint datamodel/model/{name}
     * @class splunkjs.Service.DataModel
     * @extends splunkjs.Service.Entity
     */
    root.DataModel = Service.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.DataModel
         */
        path: function() {
            return Paths.dataModels + "/" + encodeURIComponent(this.name);
        },

        /**
         * Constructor for `splunkjs.Service.DataModel`.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {String} name The name for the new data model.
         * @param {Object} namespace Namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Object} params // TODO:
         * @return {splunkjs.Service.DataModel} A new `splunkjs.Service.DataModel` instance.
         *
         * @method splunkjs.Service.DataModel
         */
        init: function(service, name, namespace, props) {
            // If not given a 4th arg, assume the namespace was omitted
            if (!props) {
                props = namespace;
                namespace = {};
            }

            this.name = name;
            this._super(service, this.path(), namespace);

            // Constants
            this._ACCELERATION_LABEL = "acceleration";
            this._MODEL_NAME_LEABL = "modelName";
            this._DISPLAY_NAME_LABEL = "displayName";
            this._DESCRIPTION_LABEL = "description"; // The description key inside the JSON
            this._RAW_JSON_LABEL = "description"; // All of the JSON

            // If the acceleration property is present, parse it as JSON
            if (props.content[this._ACCELERATION_LABEL]) {
                this.acceleration = JSON.parse(props.content.acceleration) || {};
                if (this.acceleration.hasOwnProperty("enabled")) {
                    // convert the enabled property to a boolean
                    this.acceleration.enabled = !!this.acceleration.enabled;
                }
            }

            // concise=0 (false) forces the server to return all details of the newly created data model.
            // we do not want a summary of this data model
            if (!props.hasOwnProperty("concise") || utils.isUndefined(props.concise)) {
                this.concise = "0";
            }

            var rawJSON = JSON.parse(props.content[this._RAW_JSON_LABEL]);

            this.objectNames = rawJSON.objectNameList;
            this.displayName = rawJSON[this._DISPLAY_NAME_LABEL];
            this.description = rawJSON[this._DESCRIPTION_LABEL];

            // Parse the objects for this data model           
            var objs = rawJSON.objects;
            this.objects = [];
            for (var i = 0; i < objs.length; i++) {
                this.objects.push(new root.DataModelObject(objs[i], this));
            }

            this.remove = utils.bind(this, this.remove);
            this.update = utils.bind(this, this.update);
        },

        /**
         * Returns a boolean indicating whether acceleration is enabled or not.
         *
         * @return {Boolean} true if acceleration is enabled, false otherwise.
         * @method splunkjs.Service.DataModel
         */
        isAccelerated: function() {
            return !!this.acceleration.enabled;
        },

        /**
         * Returns a data model object from this data model
         * with the specified name if it exists, null otherwise.
         *
         * @return {Object} a data model object.
         * @method splunkjs.Service.DataModel
         */
        objectByName: function(name) {
            var objects = this.objects;
            for (var i = 0; i < objects.length; i++) {
                if (objects[i].name === name) {
                    return objects[i];
                }
            }
            return null;
        },

        /**
         * Returns a boolean of whether this exists in this data model or not.
         *
         * @return {Object} true if this data model has object with specified name,
         * false otherwise.
         * @method splunkjs.Service.DataModel
         */
        hasObject: function(name) {
            return utils.contains(this.objectNames, name);
        },

        // TODO: docs; needs to take a parameter for update properties
        // valid properties concise, and acceleration
        /**
         * Updates the data model on the server, used to update acceleration settings.
         *
         * @param {Object} props The properties to update the object with. // TODO: valid keys for props
         * @param {Function} callback A function to call when the data model is updated: `(err, dataModel)`.
         *
         * @method splunkjs.Service.DataModel
         * @protected
         */
        update: function(props, callback) {
            if (utils.isUndefined(callback)) {
                callback = props;
                props = {};
            }
            callback = callback || function() {};

            if (props.hasOwnProperty("name")) {
                callback(new Error("Cannot set 'name' field in 'update'"), this);
            }

            var updatedProps = {
                concise: props.concise || this.concise,
                acceleration: JSON.stringify({
                    enabled: props.accceleration && props.acceleration.enabled || this.acceleration.enabled,
                    earliest_time: props.accceleration && props.acceleration.earliest_time || this.acceleration.earliestTime,
                    cron_schedule: props.accceleration && props.acceleration.cron_schedule || this.acceleration.cronSchedule
                })
            };            

            var that = this;
            return this.post("", updatedProps, function(err, response) {
                if (err) {
                    callback(err, that);
                }
                else {
                    var dataModelNamespace = utils.namespaceFromProperties(response.data.entry[0]);
                    callback(null, new root.DataModel(that.service, response.data.entry[0].name, dataModelNamespace, response.data.entry[0]));
                }
            });
        }
    });
    
    /**
     * Represents a collection of data models. You can create and
     * list data models using this collection container, or
     * get a specific data model.
     *
     *
     * @endpoint datamodel/model
     * @class splunkjs.Service.DataModels
     * @extends splunkjs.Service.Collection
     */
    root.DataModels = Service.Collection.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.DataModels
         */
        path: function() {
            return Paths.dataModels;
        },

        /**
         * Constructor for `splunkjs.Service.DataModels`.
         * 
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * 
         * @method splunkjs.Service.DataModels
         */
        init: function(service, namespace) {
            namespace = namespace || {};
            this._super(service, this.path(), namespace);
            this.create = utils.bind(this, this.create);
        },

        /**
         * Creates a new `DataModel` object with the given name and parameters.
         * It is preferred that you create data models through the Splunk
         * Enterprise with a browser.
         *
         * @param {String} name The name of the data model to create.
         * @param {Object} params A dictionary of properties.
         * @param {Function} callback A function to call with the new `DataModel` object: `(err, createdDataModel)`.
         *
         * @method splunkjs.Service.DataModels
         */
        create: function(name, params, callback) {
            // If we get (name, callback) instead of (name, params, callback)
            // do the necessary variable swap
            if (utils.isFunction(params) && !callback) {
                callback = params;
                params = {};
            }

            params = params || {};
            callback = callback || function(){};

            var that = this;
            return this.post("", {name: name, description: JSON.stringify(params)}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var dataModel = new root.DataModel(that.service, response.data.entry[0].name, that.namespace, response.data.entry[0]);
                    callback(null, dataModel);
                }
            });
        },

        /**
         * Constructor for `splunkjs.Service.DataModel`.
         *
         * @constructor
         * @param {Object} props A dictionary of properties used to create a 
         * `DataModel` instance.
         * @return {splunkjs.Service.DataModel} A new `splunkjs.Service.DataModel` instance.
         *
         * @method splunkjs.Service.DataModels
         */
         instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.DataModel(this.service, props.name, entityNamespace, props);
         }
    });
})();