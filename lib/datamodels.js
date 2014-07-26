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
    
    var Service     = require('./service');
    var Async       = require('./async');
    var Paths       = require('./paths').Paths;
    var Class       = require('./jquery.class').Class;
    var utils       = require('./utils');

    var root = exports || this;

    /**
     * Represents a field of a data model object.
     * This is a helper class for `DataModelCalculation`
     * and `DataModelObject`.
     *
     * Has these properties:
     *    - `fieldName`: {String} The name of this field.
     *    - `displayName`: {String} A human readable name for this field.
     *    - `type`: {String} The type of this field. One of: "string",
     *          "number", "timestamp", "objectCount", "childCount", "ipv4",
     *          "boolean".
     *    - `types`: {Object} Possible values for `type`.
     *    - `multivalued`: {Boolean} Whether this field is multivalued.
     *    - `required`: {Boolean} Whether this field is multivalued.
     *    - `hidden`: {Boolean} Whether this field should be displayed in a data model UI.
     *    - `editable`: {Boolean} Whether this field can be edited.
     *    - `comment`: {String} A comment for this field, or `null` if there isn't one.
     *    - `fieldSearch`: {String} A search query fragment for this field.
     *    - `lineage`: {Array} An array of strings of the lineage of the data model
     *          on which this field is defined.
     *    - `owner`: {String} The name of the data model object on which this field is defined.
     *
     * @class splunkjs.Service.DataModelField
     */
    root.DataModelField = Class.extend({
        /**
         * Constructor for a data model field.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `fieldName` (_string_): The name of this field.
         *     - `displayName` (_string_): A human readable name for this field.
         *     - `type` (_string_): The type of this field.
         *     - `multivalue` (_boolean_): Whether this field is multivalued.
         *     - `required` (_boolean_): Whether this field is required on events in the object
         *     - `hidden` (_boolean_): Whether this field should be displayed in a data model UI.
         *     - `editable` (_boolean_): Whether this field can be edited.
         *     - `comment` (_string_): A comment for this field, or `null` if there isn't one.
         *     - `fieldSearch` (_string_): A search query fragment for this field.
         *     - `lineage` (_string_): The lineage of the data model object on which this field
         *          is defined, items are delimited by a `.`. This is converted into an array of
         *          strings upon construction.
         *
         * @method splunkjs.Service.DataModelField
         */
        init: function(props) {
            this.types = { // TODO: make this an str array, make it private, also add valid types to class docs
                string: "string",
                number: "number",
                timestamp: "timestamp",
                // TODO: are these supposed to be camelCased?
                objectcount: "objectCount", 
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
            this.comment        = props.comment || null;
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
     * Represents a constraint on a data model object or a field on a data model object.
     *
     * Has these properties:
     *    - `query`: {String} the search query defining this data model constraint.
     *    - `lineage`: {Array} the lineage of this data model constraint.
     *    - `owner`: {String} name of the data model object that owns
     *          this data model constraint.
     *
     * @class splunkjs.Service.DataModelConstraint
     */
    root.DataModelConstraint = Class.extend({
        /**
         * Constructor for a data model constraint.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `search` (_string_): The Splunk search query this constraint specifies.
         *     - `owner` (_string_): The lineage of the data model object that owns this
         *          constraint, items are delimited by a `.`. This is converted into
         *          an array of strings upon construction.
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
     * Used for specifying a calculation on a data model object.
     *
     * // TODO: list common properties, and conditional ones available for certain types
     *
     * @class splunkjs.Service.DataModelCalculation
     */
    root.DataModelCalculation = Class.extend({
        /**
         * Constructor for a data model calculations.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `calculationID` (_string_): The ID of this calculation.
         *     - `calculationType` (_string_): The type of this calculation, one of:
         *          "Lookup", "Eval", "GeoIP", "Rex"
         *     - `types`: {Object} Possible values for `type`.
         *     - `editable` (_boolean_): Whether this calculation can be edited.
         *     - `comment` (_string_): A comment for this calculation, or `null` if there isn't one.
         *     - `owner` (_string_): The lineage of the data model object on which this calculation
         *          is defined, items are delimited by a `.`. This is converted into an array of
         *          strings upon construction.
         *     - `outputFields` (_array_): An array of the fields this calculation generates.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        init: function(props) {
            this.types = { // TODO: see comments for DataModelField
                Lookup: "Lookup",
                Eval: "Eval",
                GeoIP: "GeoIP",
                Regexp: "Rex"
            };

            this.id             = props.calculationID;
            this.type           = props.calculationType;
            this.comment        = props.comment || null;
            this.editable       = props.editable;
            this.lineage        = props.owner.split(".");
            this.owner          = this.lineage[this.lineage.length - 1];

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

        /**
         * Returns an array of strings of output field names.
         *
         * @return {Array} An array of strings of output field names.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        outputFieldNames: function() {
            return Object.keys(this.outputFields);
        },

        /**
         * Is this data model calculation editable?
         *
         * @return {Boolean} True if this data model calculation is editable.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEditable: function() {
            return !!this.editable;
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
     * PivotSpecification represents a pivot to be done on a particular data model object.
     * The user creates a `PivotSpec` on some data model object, adds filters, row splits,
     * column splits, and cell values, then calls the pivot method to query splunkd and
     * get a set of SPL queries corresponding to this specification.
     *
     * Call the `pivot` method to query Splunk for SPL queries corresponding to this pivot.
     *
     * // TODO: list properties, example
     *
     * @class splunkjs.Service.PivotSpec
     */
    root.PivotSpec = Class.extend({
        /**
         * Constructor for a pivot specification.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *      // TODO: finish these docs for possible properties
         *
         * @method splunkjs.Service.PivotSpec
         */
        init: function(dataModelObject) {
            this.dataModelObject = dataModelObject;
            this.columns = [];
            this.rows = [];
            this.filters = [];
            this.cells = [];

            this.comparisonTypes = { // TODO: inline these, then this.comparisons becomes a single declaration; then update the docs to "see class docs" for valid types, then add them to the class docs
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

            this.statsFunctions = { // TODO: make this a str array
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

            this.sortDirections = { // TODO: make this a str array
                ASC: "ASCENDING",
                DESC: "DESCENDING",
                DEFAULT: "DEFAULT"
            };

            this.binning = { // TODO: make this a str array
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
        
        /**
         * Set a job with a query ending in `tscollect`, usually generated by
         * createLocalAccelerationJob on a DataModelObject instance, as
         * the acceleration cache for this pivot specification.
         *
         * @param {String | Object} sid The sid of an acceleration job,
         *     or, a `splunk.js.Service.Job` instance.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        setAccelerationJob: function(sid) {
            if (!sid) {
                throw new Error("Sid to use for acceleration must not be null.");
            }
            // If a search object is passed in, get its sid
            if (typeof sid === "Object") {
                sid = sid.sid;
            }
            
            this.accelerationNamespace = "sid=" + sid;
            return this;
        },

        // TODO: maybe the comparisonType & comparison params can be simplified into one using dot notation?
        /**
         * Add a filter on a boolean valued field. The filter will be a constraint of the form
         * `field `comparison` compareTo`, for example: `is_remote = false`.
         *
         * @param {String} fieldName The name of field to filter on
         * @param {String} comparisonType The type of comparison, see `this.comparisonTypes` for valid types. TODO: inline the types here.
         * @param {String} comparison The comparison, see `this.comparisons` for valid comparisons, based on type.
         * @param {String} compareTo The value to compare the field to.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addFilter: function(fieldName, comparisonType, comparison, compareTo) { // TODO: rename comparison to comparisonOp
            if (!this.dataModelObject.hasField(fieldName)) {
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
                    " is not a valid comparison operator"); // TODO: make sure all cases of comparison operator match up... 
            }

            var that = this;
            this.filters.push({
                fieldName: fieldName,
                dataModelObject: that.dataModelObject,
                type: comparisonType,
                toJSON: function() { // TODO: rename to toJsonObject
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

            return this; // Return the pivot spec for the fluent style API; TODO: move this note the class docs
        },

        /**
         * Add a limit on the events shown in a pivot by sorting them according to some field, then taking
         * the specified number from the beginning or end of the list.
         *
         * @param {String} fieldName The name of field to filter on.
         * @param {String} sortAttribute The name of the field to use for sorting.
         * @param {String} sortDirection The direction to sort events, see `this.sortDirections` for valid types. TODO: inline the types here.
         * @param {String} limit The number of values from the sorted list to allow through this filter.
         * @param {String} statsFunction stats function to use for aggregation before sorting, see `this.statsFunctions` for valid types. TODO: inline the types here.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
         // TODO: do some investigation/tests on what happens with bogus statsfunctions/comparisonOps, etc.
        addLimitFilter: function(fieldName, sortAttribute, sortDirection, limit, statsFunction) {
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
                toJSON: function() { // TODO: rename
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

            return this;
        },

        /**
         * Add a row split on a numeric or string valued field, splitting on each distinct value of the field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addRowSplit: function(fieldName, label) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains([this.comparisonTypes.number, this.comparisonTypes.string], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var row = {
                fieldName: fieldName,
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

        // TODO: accept a dict of arguments for start/end/step/limit
        /**
         * Add a row split on a numeric field, splitting into numeric ranges.
         *
         * This split generates bins with edges equivalent to the
         * classic loop 'for i in <start> to <end> by <step>' but with a maximum
         * number of bins <limit>. This dispatches to the stats and xyseries search commands.
         * See their documentation for more details.
         *
         * @param {String} fieldName The field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {Number} start The value of the start of the first range, or null to take the lowest value in the events.
         * @param {Number} end The value for the end of the last range, or null to take the highest value in the events.
         * @param {Number} step The the width of each range, or null to have Splunk calculate it.
         * @param {Number} limit The maximum number of ranges to split into, or null for no limit.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
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

        /**
         * Add a row split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {String} trueDisplayValue A string to display in the true valued row label.
         * @param {String} falseDisplayValue A string to display in the false valued row label.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
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

        /**
         * Add a row split on a timestamp valued field, binned by the specified bucket size.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {String} binning The size of bins to use, see `this.binning` for valid types. TODO: inline the types here.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
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
        
        /**
         * Add a column split on a string or number valued field, producing a column for
         * each distinct value of the field.
         *
         * @param {String} fieldName The name of field to split on.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addColumnSplit: function(fieldName) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains([this.comparisonTypes.number, this.comparisonTypes.string], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var col = {
                fieldName: fieldName,
                owner: f.owner,
                type: f.type
            };

            if (f.type === this.comparisonTypes.number) {
                col.display = "all";
            }

            this.columns.push(col);

            return this;
        },
        
        // TODO: accept a dict of arguments for start/end/step/limit
        /**
         * Add a column split on a numeric field, splitting the values into ranges.
         *
         * @param {String} fieldName The field to split on.
         * @param {Number} start The value of the start of the first range, or null to take the lowest value in the events.
         * @param {Number} end The value for the end of the last range, or null to take the highest value in the events.
         * @param {Number} step The the width of each range, or null to have Splunk calculate it.
         * @param {Number} limit The maximum number of ranges to split into, or null for no limit.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addRangeColumnSplit: function(fieldName, start, end, step, limit) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
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
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                display: "ranges",
                ranges: ranges
            };

            this.columns.push(col);

            return this;
        },
        
        /**
         * Add a column split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} trueDisplayValue A string to display in the true valued column label.
         * @param {String} falseDisplayValue A string to display in the false valued column label.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addBooleanColumnSplit: function(fieldName, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (this.comparisonTypes.boolean !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected boolean.");
            }

            this.columns.push({
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                trueLabel: trueDisplayValue,
                falseLabel: falseDisplayValue
            });

            return this;
        },
        
        /**
         * Add a column split on a timestamp valued field, binned by the specified bucket size.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} binning The size of bins to use, see `this.binning` for valid types. TODO: class level docs, add those binning types to class level docs; same w/ row version of this function
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
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
        
        /**
         * Add an aggregate to each cell of the pivot.
         *
         * @param {String} fieldName The name of field to aggregate.
         * @param {String} label a human readable name for this aggregate.
         * @param {String} statsFunction The function to use for aggregation.
         * @return {`splunkjs.Service.PivotSpec`} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        addCellValue: function(fieldName, label, statsFunction) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }

            var f = this.dataModelObject.fieldByName(fieldName);
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
                fieldName: fieldName,
                owner: f.lineage.join("."),
                type: f.type,
                label: label,
                sparkline: false, // Not properly implemented in core yet.
                value: statsFunction
            });

            return this;
        },
        
        /**
         * Returns a JSON ready object representation of this pivot specification.
         *
         * @return {Object} The JSON ready object representation of this pivot specification.
         *
         * @method splunkjs.Service.PivotSpec
         */
        toJSON: function() { // TODO: rename to toJsonObject
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

        /**
         * Query Splunk for SPL queries corresponding to this pivot.
         *
         * // TODO: docs, example
         *
         * @param {Function} callback A function to call when done getting the pivot: `(err, pivot)`.
         *
         * @method splunkjs.Service.PivotSpec
         */
         // TODO: investigate what's actually going on, so docs aren't foolish
        pivot: function(callback) {
            var svc = this.dataModelObject.dataModel.service;

            var args = {
                pivot_json: JSON.stringify(this.toJSON()) // TODO: this will change to toJsonObject
            };

            if (!utils.isUndefined(this.accelerationNamespace)) {
                args.namespace = this.accelerationNamespace;
            }
            
            return svc.get(Paths.pivot + "/" + encodeURIComponent(this.dataModelObject.dataModel.name), args, function(err, response) {
                if (err) {
                    callback(new Error(err.data.messages[0].text), response);
                    // TODO: remove the else, and add a return here
                }
                else {
                    // TODO: We want to return a Pivot object, should create a new class for it? YES
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
                                return this.openInSearch; // TODO: why can't this be just a rename instead of a func?
                            },
                            // TODO: docs
                            run: function(args, callback) {
                                if (utils.isUndefined(callback)) {
                                    callback = args;
                                    args = {};
                                }
                                if (!args || Object.keys(args).length === 0) {
                                    args = {};
                                }

                                // If tstats is undefined, use pivotSearch
                                this.service.search(this.tstatsSearch || this.pivotSearch, args, callback);
                                // this.service.oneshotSearch(this.tstatsSearch || this.pivotSearch, args, callback);
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
     * Represents one of the structured views in a data model.
     *
     * // TODO: doc properties, and those available to certain types
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
         *
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
        
        // TODO: need a test of this
        /**
         * Is this data model object is a BaseEvent?
         *
         * @return {Boolean} Whether this data model object is a descendant of BaseEvent.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseEvent: function() {
            return !this.isBaseSearch() && !this.isBaseTransaction() && this.hasOwnProperty("baseSearch");
        },

        // TODO: need a test of this
        /**
         * Is this data model object is a BaseSearch?
         *
         * @return {Boolean} Whether this data model object is a descendant of BaseSearch.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseSearch: function() {
            return !utils.isUndefined(this.baseSearch);
        },

        /**
         * Is this data model object is a BaseTransaction?
         *
         * @return {Boolean} Whether this data model object is a descendant of BaseTransaction.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseTransaction: function() {
            return !utils.isUndefined(this.maxSpan); // TODO: might want to use a different property
        },

        /**
         * Returns a string array of the names of this data model object's fields.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        fieldNames: function() {
            return Object.keys(this.fields);
        },

        /**
         * Returns a data model field instance, representing a field on this
         * data model object. 
         *
         * @return {`splunkjs.Service.DataModelField`|`null`} The data model field
         * from this data model object with the specified name, null if it the 
         * field by that name doesn't exist.
         *
         * @method splunkjs.Service.DataModelObject
         */
        fieldByName: function(name) {
            return this.calculatedFields()[name] || this.fields[name] || null;    // TODO: verify this works
        },
        
        /**
         * Returns an array of data model fields from this data model object's
         * calculations, and this data model object's fields.
         *
         * @return {Array} An array of `splunk.Service.DataModelField` objects
         * which includes this data model object's fields, and the fields from
         * this data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        allFields: function() {
            // merge fields and calculatedFields()
            var fields = this.fields;
            var calculatedFields = this.calculatedFields(); // TODO: simplify this
            var keys = Object.keys(calculatedFields);

            for (var i = 0; i < keys.length; i++) {
                var calculatedField = calculatedFields[keys[i]];
                fields[calculatedField.name] = calculatedField;
            }
            return fields;
        },

        /**
         * Returns a string array of the field names of this data model object's
         * calculations, and the names of this data model object's fields.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object's calculations, and the names of fields on 
         * this data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        allFieldNames: function() {
            return Object.keys(this.allFields());
        },

        /**
         * Returns an array of data model fields from this data model object's
         * calculations.
         *
         * @return {Array} An array of `splunk.Service.DataModelField` objects
         * of the fields from this data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculatedFields: function(){
            var fields = {};
            // Iterate over the calculations, get their fields
            var keys = this.calculationIDs();
            var calculations = this.calculations;
            for (var i = 0; i < keys.length; i++) {
                var calculation = calculations[keys[i]];
                for (var f = 0; f < calculation.outputFieldNames().length; f++) {
                    var outputField = calculation.outputFields[calculation.outputFieldNames()[f]]; // TODO verify this change
                    fields[outputField.name] = outputField;
                }
            }
            return fields;
        },

        /**
         * Returns a string array of the field names of this data model object's
         * calculations.
         *
         * @return {Array} An array of strings with the field names of this 
         * data model object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculatedFieldNames: function() {
            return Object.keys(this.calculatedFields());
        },

        /**
         * Returns whether this data model object contains the field with the
         * name passed in the `fieldName` parameter.
         *
         * @param {String} fieldName The name of the field to look for.
         * @return {Boolean} True if this data model contains the field by name.
         *
         * @method splunkjs.Service.DataModelObject
         */
        hasField: function(fieldName) {
            return utils.contains(this.allFieldNames(), fieldName);
        },

        /**
         * Returns a string array of the IDs of this data model object's
         * calculations.
         *
         * @return {Array} An array of strings with the IDs of this data model
         * object's calculations.
         *
         * @method splunkjs.Service.DataModelObject
         */
        calculationIDs: function() {
            return Object.keys(this.calculations);
        },

        /**
         * Local acceleration is tsidx acceleration of a data model object that is handled
         * manually by a user. You create a job which generates an index, and then use that
         * index in your pivots on the data model object.
         *
         * The namespace created by the job is 'sid={sid}' where {sid} is the job's sid. You
         * would use it in another job by starting your search query with `| tstats ... from sid={sid} | ...`
         *
         * The tsidx index created by this job is deleted when the job is garbage collected by Splunk.
         *
         * It is the user's responsibility to manage this job, including cancelling it.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var object = dataModels.item("some_data_model").objectByName("some_object");
         *          // TODO: example code
         *          object.createLocalAccelerationJob("-1d", function(err, accelerationJob) {
         *              console.log("The job has name:", accelerationJob.name);
         *          });
         *      });
         *
         * @param {String} earliestTime A time modifier (e.g., "-2w") setting the earliest time to index.
         * @param {Function} callback A function to call with the search job: `(err, accelerationJob)`.
         *
         * @method splunkjs.Service.DataModelObject
         */
         // TODO look into how acceleration works
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

        /**
         * Start a job that applies querySuffix to all the events in this data model object.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var object = dataModels.item("internal_audit_logs").objectByName("searches");
         *          object.runQuery({}, "| head 5", function(err, job) {
         *              console.log("The job has name:", job.name);
         *          });
         *      });
         *
         * @param {Object} params A dictionary of properties for the search job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         * @param {String} querySuffix A search query, starting with a '|' that will be appended to the command to fetch the contents of this data model object (e.g., "| head 3").
         * @param {Function} callback A function to call with the search job: `(err, job)`.
         *
         * @method splunkjs.Service.DataModelObject
         */
        // TODO: rename to runSearch or startSearch
        runQuery: function(params, querySuffix, callback) {
            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search";
            // Prepend a space to the querySuffix, or set it to an empty string if null or undefined
            querySuffix = querySuffix ? " " + querySuffix : "";
            this.dataModel.service.search(query + querySuffix, params, callback);
        },
        
        /**
         * Returns the data model object this one inherits from if it is a user defined,
         * otherwise return null.
         *
         * @return {`splunkjs.Service.DataModelObject`|`null`} This data model object's parent
         *     or null if this is not a user defined data model object.
         *
         * @method splunkjs.Service.DataModelObject
         */
        parent: function() {
            return this.dataModel.objectByName(this.parentName);
        },
        
        /**
         * Returns a new Pivot Specification, accepts no parameters.
         *
         * @return {`splunkjs.Service.PivotSpec`} A new pivot specification.
         *
         * @method splunkjs.Service.DataModelObject
         */
        // TODO undo abbreviation
        createPivotSpec: function() {
            // Pass in this DataModelObject to create a PivotSpec
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

        // TODO: make a note about the namespace parameter being optional
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
         * @param {Object} params // TODO: list these params
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
            
            // concise=0 (false) forces the server to return all details of the newly created data model.
            // we do not want a summary of this data model
            if (!props.hasOwnProperty("concise") || utils.isUndefined(props.concise)) {
                this.concise = "0";
            }

            this.acceleration = JSON.parse(props.content.acceleration) || {}; // TODO: does this need to be public?
            if (this.acceleration.hasOwnProperty("enabled")) {
                // convert the enabled property to a boolean
                this.acceleration.enabled = !!this.acceleration.enabled;
            }            

            // rename to dataModelDefinition
            var dataModelDefinition = JSON.parse(props.content.description); // rename to dataModelDefinition

            this.objectNames = dataModelDefinition.objectNameList || []; // todo: failover is probably dead code, remove if it is
            this.displayName = dataModelDefinition.displayName;
            this.description = dataModelDefinition.description;

            // Parse the objects for this data model           
            var objs = dataModelDefinition.objects || []; // todo: failover is probably dead code, remove if it is
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
         *
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
         *
         * @method splunkjs.Service.DataModel
         */
        objectByName: function(name) {
            for (var i = 0; i < this.objects.length; i++) {
                if (this.objects[i].name === name) {
                    return this.objects[i];
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

        /**
         * Updates the data model on the server, used to update acceleration settings.
         *
         * @param {Object} props A dictionary of properties to update the object with:
         *     - `acceleration` (_object_): The acceleration settings for the data model.
         *         Valid keys are: `enabled`, `earliestTime`, `cronSchedule`.
         *         Any keys not set will be pulled from the acceleration settings already
         *         set on this data model.
         * @param {Function} callback A function to call when the data model is updated: `(err, dataModel)`.
         *
         * @method splunkjs.Service.DataModel
         */
        update: function(props, callback) { // TODO: make sure props is a required parameter
            if (utils.isUndefined(callback)) {
                callback = props;
                props = {};
            }
            callback = callback || function() {};

            if (props.hasOwnProperty("name")) {
                callback(new Error("Cannot set 'name' field in 'update'"), this);
                return; // Exit if the name is set, to avoid calling the callback twice.
            }

            var updatedProps = {
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