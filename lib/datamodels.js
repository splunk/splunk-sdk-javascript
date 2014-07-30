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
     *    - `fieldName` (_string_): The name of this field.
     *    - `displayName` (_string_):  A human readable name for this field.
     *    - `type` (_string_): The type of this field.
     *    - `multivalued` (_boolean_): Whether this field is multivalued.
     *    - `required` (_boolean_): Whether this field is required.
     *    - `hidden` (_boolean_): Whether this field should be displayed in a data model UI.
     *    - `editable` (_boolean_): Whether this field can be edited.
     *    - `comment` (_string_): A comment for this field, or `null` if there isn't one.
     *    - `fieldSearch` (_string_): A search query fragment for this field.
     *    - `lineage` (_array_): An array of strings of the lineage of the data model
     *          on which this field is defined.
     *    - `owner` (_string_): The name of the data model object on which this field is defined.
     *
     * Possible types for a data model field:
     *    - `string`
     *    - `boolean`
     *    - `number`
     *    - `timestamp`
     *    - `objectCount`
     *    - `childCount`
     *    - `ipv4`
     *
     * @class splunkjs.Service.DataModelField
     */
    root.DataModelField = Class.extend({
        _types: [ "string", "number", "timestamp", "objectCount", "childCount", "ipv4", "boolean"],

        /**
         * Constructor for a data model field.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `fieldName` (_string_): The name of this field.
         *     - `displayName` (_string_): A human readable name for this field.
         *     - `type` (_string_): The type of this field, see valid types in class docs.
         *     - `multivalue` (_boolean_): Whether this field is multivalued.
         *     - `required` (_boolean_): Whether this field is required on events in the object
         *     - `hidden` (_boolean_): Whether this field should be displayed in a data model UI.
         *     - `editable` (_boolean_): Whether this field can be edited.
         *     - `comment` (_string_): A comment for this field, or `null` if there isn't one.
         *     - `fieldSearch` (_string_): A search query fragment for this field.
         *     - `lineage` (_string_): The lineage of the data model object on which this field
         *          is defined, items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *
         * @method splunkjs.Service.DataModelField
         */
        init: function(props) {
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
            return "string" === this.type;
        },

        /**
         * Is this data model field of type number?
         *
         * @return {Boolean} True if this data model field is of type number.
         *
         * @method splunkjs.Service.DataModelField
         */
        isNumber: function() {
            return "number" === this.type;
        },

        /**
         * Is this data model field of type timestamp?
         *
         * @return {Boolean} True if this data model field is of type timestamp.
         *
         * @method splunkjs.Service.DataModelField
         */
        isTimestamp: function() {
            return "timestamp" === this.type;
        },

        /**
         * Is this data model field of type object count?
         *
         * @return {Boolean} True if this data model field is of type object count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isObjectcount: function() {
            return "objectCount" === this.type;
        },

        /**
         * Is this data model field of type child count?
         *
         * @return {Boolean} True if this data model field is of type child count.
         *
         * @method splunkjs.Service.DataModelField
         */
        isChildcount: function() {
            return "childCount" === this.type;
        },

        /**
         * Is this data model field of type ipv4?
         *
         * @return {Boolean} True if this data model field is of type ipv4.
         *
         * @method splunkjs.Service.DataModelField
         */
        isIPv4: function() {
            return "ipv4" === this.type;
        },

        /**
         * Is this data model field of type boolean?
         *
         * @return {Boolean} True if this data model field is of type boolean.
         *
         * @method splunkjs.Service.DataModelField
         */
        isBoolean: function() {
            return "boolean" === this.type;
        }
    });
    
    /**
     * Represents a constraint on a `DataModelObject` or a `DataModelField`.
     *
     * Has these properties:
     *    - `query` (_string_): The search query defining this data model constraint.
     *    - `lineage` (_array_): The lineage of this data model constraint.
     *    - `owner` (_string_): The name of the data model object that owns
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
         *          constraint, items are delimited by a dot. This is converted into
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
     * Used for specifying a calculation on a `DataModelObject`.
     *
     * Has these properties:
     *    - `id` (_string_): The ID for this data model calculation.
     *    - `type` (_string_): The type of this data model calculation.
     *    - `comment` (_string_|_null_): The comment for this data model calculation, or `null`.
     *    - `editable` (_boolean_): True if this calculation can be edited, false otherwise.
     *    - `lineage` (_array_): The lineage of the data model object on which this calculation
     *          is defined in an array of strings.
     *    - `owner` (_string_): The data model that this calculation belongs to.
     *    - `outputFields` (_array_): The fields output by this calculation.
     *
     * The Rex and Eval types have an additional property:
     *    - `expression` (_string_): The expression to use for this calculation.
     *
     * The Rex and GeoIP types have an additional property:
     *    - `inputField` (_string_): The field to use for calculation.
     *
     * The Lookup type has additional properties:
     *    - `lookupName` (_string_): TODO: need a label
     *    - `inputFieldMappings` (_string_): TODO: need a label, is it actually a string?
     *
     * Valid types of calculations are:
     *    - `Lookup`
     *    - `Eval`
     *    - `GeoIP`
     *    - `Rex`
     *
     * @class splunkjs.Service.DataModelCalculation
     */
    root.DataModelCalculation = Class.extend({
        _types: ["Lookup", "Eval", "GeoIP", "Rex"],

        /**
         * Constructor for a data model calculations.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `calculationID` (_string_): The ID of this calculation.
         *     - `calculationType` (_string_): The type of this calculation, see class docs for valid types.
         *     - `editable` (_boolean_): Whether this calculation can be edited.
         *     - `comment` (_string_): A comment for this calculation, or `null` if there isn't one.
         *     - `owner` (_string_): The lineage of the data model object on which this calculation
         *          is defined, items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *     - `outputFields` (_array_): An array of the fields this calculation generates.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        init: function(props) {
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

            if ("Eval" === this.type || "Rex" === this.type) {
                this.expression = props.expression;
            }
            if ("GeoIP" === this.type || "Rex" === this.type) {
                this.inputField = props.inputField;
            }
            if ("Lookup" === this.type) {
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
            return "Lookup" === this.type;
        },

        /**
         * Is this data model calculation of type eval?
         *
         * @return {Boolean} True if this data model calculation is of type eval.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEval: function() {
            return "Eval" === this.type;
        },
        
        /**
         * Is this data model calculation of type Regexp?
         *
         * @return {Boolean} True if this data model calculation is of type Regexp.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isRegexp: function() {
            return "Rex" === this.type;
        },

        /**
         * Is this data model calculation of type GeoIP?
         *
         * @return {Boolean} True if this data model calculation is of type GeoIP.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isGeoIP: function() {
            return "GeoIP" === this.type;
        }
    });
    
    /**
     * Pivot represents data about a pivot report returned by the Splunk Server.
     *
     * Has these properties:
     *    - `service` (_splunkjs.Service_): A `Service` instance.
     *    - `search` (_string_): The search string for running the pivot report.
     *    - `drilldownSearch` (_string_): The search for running this pivot report using drilldown.
     *    - `openInSearch` (_string_): Equivalent to search parameter, but listed more simply.
     *    - `prettyQuery` (_string_): Equivalent to `openInSearch`.
     *    - `pivotSearch` (_string_): A pivot search command based on the named data model.
     *    - `tstats_search` (_string_): The search for running this pivot report using tstats.
     *
     * @class splunkjs.Service.Pivot
     */
    root.Pivot = Class.extend({
        /**
         * Constructor for a pivot.
         *
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * @param {Object} props A dictionary of properties to set:
         *    - `search` (_string_): The search string for running the pivot report.
         *    - `drilldown_search` (_string_): The search for running this pivot report using drilldown.
         *    - `open_in_search` (_string_): Equivalent to search parameter, but listed more simply.
         *    - `pivot_search` (_string_): A pivot search command based on the named data model.
         *    - `tstats_search` (_string_|_null_): The search for running this pivot report using tstats, null if acceleration is disabled.
         *
         * @method splunkjs.Service.Pivot
         */
        init: function(service, props) {
            this.service = service;
            this.search = props.search;
            this.drilldownSearch = props.drilldown_search;
            this.prettyQuery = this.openInSearch = props.open_in_search;
            this.pivotSearch = props.pivot_search;
            this.tstatsSearch = props.tstats_search || null;

            this.run = utils.bind(this, this.run);
        },

        /**
         * Starts a search job running this pivot, accelerated if possible.
         *
         * @param {Object} args A dictionary of properties for the search job. For a list of available parameters, see <a href="http://dev.splunk.com/view/SP-CAAAEFA#searchjobparams" target="_blank">Search job parameters</a> on Splunk Developer Portal.
         *        **Note:** This method throws an error if the `exec_mode=oneshot` parameter is passed in with the properties dictionary.
         *
         * @method splunkjs.Service.Pivot
         */
        run: function(args, callback) {
            if (utils.isUndefined(callback)) {
                callback = args;
                args = {};
            }
            if (!args || Object.keys(args).length === 0) {
                args = {};
            }

            // If tstats is undefined, use pivotSearch (try to run an accelerated search if possible)
            this.service.search(this.tstatsSearch || this.pivotSearch, args, callback);
        }
    });

    /**
     * PivotSpecification represents a pivot to be done on a particular data model object.
     * The user creates a PivotSpecification on some data model object, adds filters, row splits,
     * column splits, and cell values, then calls the pivot method to query splunkd and
     * get a set of SPL queries corresponding to this specification.
     *
     * Call the `pivot` method to query Splunk for SPL queries corresponding to this pivot.
     *
     * This class supports a fluent API, each function except `init`, `toJsonObject` & `pivot`
     * return the modified `splunkjs.Service.PivotSpecification` instance.
     *
     * @example
     *     service.dataModels().fetch(function(err, dataModels) {
     *         var searches = dataModels.item("internal_audit_logs").objectByName("searches");
     *         var pivotSpecification = searches.createPivotSpecification();
     *         pivotSpecification
     *             .addRowSplit("user", "Executing user")
     *             .addRangeColumnSplit("exec_time", {limit: 4})
     *             .addCellValue("search", "Search Query", "values")
     *             .pivot(function(err, pivot) {
     *                 console.log("Got a Pivot object from the Splunk server!");
     *             });
     *     });
     *
     * Has these properties:
     *    - `dataModelObject` (_splunkjs.Service.DataModelObject_): The `DataModelObject` from which
     *        this `PivotSpecification` was created.
     *    - `columns` (_array_): TODO: need a label
     *    - `rows` (_array_): TODO: need a label
     *    - `filters` (_array_): TODO: need a label
     *    - `cells` (_array_): TODO: need a label
     *    - `accelerationNamespace` (_array_|_null_): The name of the `DataModel` that owns the `DataModelObject`
     *        on which this `PivotSpecification` was created, or null if the `DataModel` is not accelerated.
     *
     * Valid comparison types are:
     *    - `boolean`
     *    - `string`
     *    - `number`
     *    - `ipv4`
     *
     * Valid boolean comparisons are:
     *    - `=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *
     * Valid string comparisons are:
     *    - `=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *    - `contains`
     *    - `doesNotContain`
     *    - `startsWith`
     *    - `endsWith`
     *    - `regex`
     *
     * Valid number comparisons are:
     *    - `=`
     *    - `!=`
     *    - `<`
     *    - `>`
     *    - `<=`
     *    - `>=`
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *
     * Valid ipv4 comparisons are:
     *    - `is`
     *    - `isNull`
     *    - `isNotNull`
     *    - `contains`
     *    - `doesNotContain`
     *    - `startsWith`
     *
     * Valid binning values are:
     *    - `auto`
     *    - `year`
     *    - `month`
     *    - `day`
     *    - `hour`
     *    - `minute`
     *    - `second`
     *
     * Valid sort directions are:
     *    - `ASCENDING`
     *    - `DECENDING`
     *    - `DEFAULT`
     *
     * Valid stats functions are:
     *    - `list`
     *    - `values`
     *    - `first`
     *    - `last`
     *    - `count`
     *    - `dc`
     *    - `sum`
     *    - `average`
     *    - `max`
     *    - `min`
     *    - `stdev`
     *    - `duration`
     *    - `earliest`
     *    - `latest`
     *
     * @class splunkjs.Service.PivotSpecification
     */
    root.PivotSpecification = Class.extend({
        _comparisons: {
            boolean: ["=", "is", "isNull", "isNotNull"],
            string: ["=", "is", "isNull", "isNotNull", "contains", "doesNotContain", "startsWith", "endsWith", "regex"],
            number: ["=", "!=", "<", ">", "<=", ">=", "is", "isNull", "isNotNull"],
            ipv4: ["is", "isNull", "isNotNull", "contains", "doesNotContain", "startsWith"]
        },
        _binning: ["auto", "year", "month", "day", "hour", "minute", "second"],
        _sortDirection: ["ASCENDING", "DESCENDING", "DEFAULT"],
        _statsFunctions: ["list", "values", "first", "last", "count", "dc", "sum", "average", "max", "min", "stdev", "duration", "earliest", "latest"],

        /**
         * Constructor for a pivot specification.
         *
         * @constructor
         * @param {splunkjs.Service.DataModel} parentDataModel The `DataModel` that owns this data model object.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        init: function(dataModelObject) {
            this.dataModelObject = dataModelObject;
            this.columns = [];
            this.rows = [];
            this.filters = [];
            this.cells = [];

            this.accelerationNamespace = dataModelObject.dataModel.isAccelerated() ? 
                dataModelObject.dataModel.name : null;
        },
        
        /**
         * Set a job with a query ending in `tscollect`, usually generated by
         * createLocalAccelerationJob on a DataModelObject instance, as
         * the acceleration cache for this pivot specification.
         *
         * @param {String|splunkjs.Service.Job} sid The sid of an acceleration job,
         *     or, a `splunkjs.Service.Job` instance.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        setAccelerationJob: function(sid) {
            if (!sid) {
                throw new Error("Sid to use for acceleration must not be null.");
            }
            // If a search object is passed in, get its sid
            if (sid instanceof Service.Job) {
                sid = sid.sid;
            }
            
            this.accelerationNamespace = "sid=" + sid;
            return this;
        },

        /**
         * Add a filter on a boolean valued field. The filter will be a constraint of the form
         * `field `comparison` compareTo`, for example: `is_remote = false`.
         *
         * @param {String} fieldName The name of field to filter on
         * @param {String} comparisonType The type of comparison, see class docs for valid types.
         * @param {String} comparisonOp The comparison, see class docs for valid comparisons, based on type.
         * @param {String} compareTo The value to compare the field to.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addFilter: function(fieldName, comparisonType, comparisonOp, compareTo) {
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
            if (!utils.contains(this._comparisons[comparisonType], comparisonOp)) {
                throw new Error(
                    "Cannot add " + comparisonType + 
                    " filter because " + comparisonOp +
                    " is not a valid comparison operator");
            }

            var ret = {
                fieldName: fieldName,
                owner: this.dataModelObject.fieldByName(fieldName).lineage.join("."),
                type: comparisonType
            };
            // These fields are type dependent
            if (utils.contains(["boolean", "string", "ipv4", "number"], ret.type)) {
                ret.comparator = comparisonOp;
                ret.compareTo = compareTo;
            }
            this.filters.push(ret);
    
            return this;
        },

        /**
         * Add a limit on the events shown in a pivot by sorting them according to some field, then taking
         * the specified number from the beginning or end of the list.
         *
         * @param {String} fieldName The name of field to filter on.
         * @param {String} sortAttribute The name of the field to use for sorting.
         * @param {String} sortDirection The direction to sort events, see class docs for valid types.
         * @param {String} limit The number of values from the sorted list to allow through this filter.
         * @param {String} statsFunction The stats function to use for aggregation before sorting, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
         // TODO: do some investigation/tests on what happens with bogus statsFunctions/comparisonOps, etc.
        addLimitFilter: function(fieldName, sortAttribute, sortDirection, limit, statsFunction) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Cannot add limit filter on a nonexistent field.");
            }
            if (!utils.contains(["string", "number", "objectCount"],
                    this.dataModelObject.fieldByName(fieldName).type)) {
                throw new Error("Cannot add limit filter on " + fieldName + " because it is of type " + this.dataModelObject.fieldByName(fieldName).type);
            }

            if ("string" === this.dataModelObject.fieldByName(fieldName).type &&
                !utils.contains(["count", "dc"], statsFunction)
                ) {
                throw new Error("Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found " +
                    statsFunction);
            }

            if ("number" === this.dataModelObject.fieldByName(fieldName).type &&
                !utils.contains(["count", "dc", "average", "sum"], statsFunction)
                ) {
                throw new Error("Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found " +
                    statsFunction);
            }

            if ("objectCount" === this.dataModelObject.fieldByName(fieldName).type &&
                !utils.contains(["count"], statsFunction)
                ) {
                throw new Error("Stats function for fields of type object count must be COUNT; found " + statsFunction);
            }

            var ret = {
                fieldName: fieldName,
                owner: this.dataModelObject.fieldByName(fieldName).lineage.join("."),
                type: this.dataModelObject.fieldByName(fieldName).type,
                attributeName: sortAttribute,
                attributeOwner: this.dataModelObject.fieldByName(sortAttribute).lineage.join("."),
                sortDirection: sortDirection,
                limitAmount: limit,
                statsFn: statsFunction
            };
            // Assumed "highest" is preferred for when sortDirection is "DEFAULT"
            ret.limitType = "ASCENDING" === sortDirection ? "lowest" : "highest";
            this.filters.push(ret);

            return this;
        },

        /**
         * Add a row split on a numeric or string valued field, splitting on each distinct value of the field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRowSplit: function(fieldName, label) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains(["number", "string"], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var row = {
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                label: label
            };

            if ("number" === f.type) {
                row.display = "all";
            }

            this.rows.push(row);

            return this;
        },

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
         * @param {Object} options An optional dictionary of collection filtering and pagination options:
         *    - `start` (_integer_): The value of the start of the first range, or null to take the lowest value in the events.
         *    - `end` (_integer_): The value for the end of the last range, or null to take the highest value in the events.
         *    - `step` (_integer_): The the width of each range, or null to have Splunk calculate it.
         *    - `limit` (_integer_): The maximum number of ranges to split into, or null for no limit.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRangeRowSplit: function(field, label, ranges) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("number" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }
            var updateRanges = {};
            if (!utils.isUndefined(ranges.start) && ranges.start !== null) {
                updateRanges.start = ranges.start;
            }
            if (!utils.isUndefined(ranges.end) && ranges.end !== null) {
                updateRanges.end = ranges.end;
            }
            if (!utils.isUndefined(ranges.step) && ranges.step !== null) {
                updateRanges.size = ranges.step;
            }
            if (!utils.isUndefined(ranges.limit) && ranges.limit !== null) {
                updateRanges.maxNumberOf = ranges.limit;
            }

            this.rows.push({
                fieldName: field,
                owner: f.owner,
                type: f.type,
                label: label,
                display: "ranges",
                ranges: updateRanges
            });

            return this;
        },

        /**
         * Add a row split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} label A human readable name for this set of rows.
         * @param {String} trueDisplayValue A string to display in the true valued row label.
         * @param {String} falseDisplayValue A string to display in the false valued row label.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addBooleanRowSplit: function(field, label, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("boolean" !== f.type) {
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
         * @param {String} binning The size of bins to use, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addTimestampRowSplit: function(field, label, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("timestamp" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }
            if (!utils.contains(this._binning, binning)) {
                throw new Error("Invalid binning " + binning + " found. Valid values are: " + this._binning.join(", "));
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
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addColumnSplit: function(fieldName) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if (!utils.contains(["number", "string"], f.type)) {
                throw new Error("Field was of type " + f.type + ", expected number or string.");
            }

            var col = {
                fieldName: fieldName,
                owner: f.owner,
                type: f.type
            };

            if ("number" === f.type) {
                col.display = "all";
            }

            this.columns.push(col);

            return this;
        },

        /**
         * Add a column split on a numeric field, splitting the values into ranges.
         *
         * @param {String} fieldName The field to split on.
         * @param {Object} options An optional dictionary of collection filtering and pagination options:
         *    - `start` (_integer_): The value of the start of the first range, or null to take the lowest value in the events.
         *    - `end` (_integer_): The value for the end of the last range, or null to take the highest value in the events.
         *    - `step` (_integer_): The the width of each range, or null to have Splunk calculate it.
         *    - `limit` (_integer_): The maximum number of ranges to split into, or null for no limit.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addRangeColumnSplit: function(fieldName, ranges) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if ("number" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected number.");
            }

            // In Splunk 6.0.1.1, data models incorrectly expect strings for these fields
            // instead of numbers. In 6.1, this is fixed and both are accepted.
            var updatedRanges = {};
            if (!utils.isUndefined(ranges.start) && ranges.start !== null) {
                updatedRanges.start = ranges.start;
            }
            if (!utils.isUndefined(ranges.end) && ranges.end !== null) {
                updatedRanges.end = ranges.end;
            }
            if (!utils.isUndefined(ranges.step) && ranges.step !== null) {
                updatedRanges.size = ranges.step;
            }
            if (!utils.isUndefined(ranges.limit) && ranges.limit !== null) {
                updatedRanges.maxNumberOf = ranges.limit;
            }

            this.columns.push({
                fieldName: fieldName,
                owner: f.owner,
                type: f.type,
                display: "ranges",
                ranges: updatedRanges
            });

            return this;
        },
        
        /**
         * Add a column split on a boolean valued field.
         *
         * @param {String} fieldName The name of field to split on.
         * @param {String} trueDisplayValue A string to display in the true valued column label.
         * @param {String} falseDisplayValue A string to display in the false valued column label.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addBooleanColumnSplit: function(fieldName, trueDisplayValue, falseDisplayValue) {
            if (!this.dataModelObject.fieldByName(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }
            var f = this.dataModelObject.fieldByName(fieldName);
            if ("boolean" !== f.type) {
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
         * @param {String} binning The size of bins to use, see class docs for valid types.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addTimestampColumnSplit: function(field, binning) {
            if (!this.dataModelObject.hasField(field)) {
                throw new Error("Did not find field " + field);
            }
            var f = this.dataModelObject.fieldByName(field);
            if ("timestamp" !== f.type) {
                throw new Error("Field was of type " + f.type + ", expected timestamp.");
            }
            if (!utils.contains(this._binning, binning)) {
                throw new Error("Invalid binning " + binning + " found. Valid values are: " + this._binning.join(", "));
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
         * @param {String} statsFunction The function to use for aggregation, see class docs for valid stats functions.
         * @return {splunkjs.Service.PivotSpecification} The updated pivot specification.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        addCellValue: function(fieldName, label, statsFunction) {
            if (!this.dataModelObject.hasField(fieldName)) {
                throw new Error("Did not find field " + fieldName);
            }

            var f = this.dataModelObject.fieldByName(fieldName);
            if (utils.contains(["string", "ipv4"], f.type) &&
                !utils.contains([
                    "list",
                    "values",
                    "first",
                    "last",
                    "count",
                    "dc"], statsFunction)
                ) {
                throw new Error("Stats function on string and IPv4 fields must be one of:" +
                    " list, distinct_values, first, last, count, or distinct_count; found " +
                    statsFunction);
            }
            else if ("number" === f.type && 
                !utils.contains([
                    "sum",
                    "count",
                    "average",
                    "min",
                    "max",
                    "stdev",
                    "list",
                    "values"
                    ], statsFunction)
                ) {
                throw new Error("Stats function on number field must be must be one of:" +
                    " sum, count, average, max, min, stdev, list, or distinct_values; found " +
                    statsFunction
                    );
            }
            else if ("timestamp" === f.type &&
                !utils.contains([
                    "duration",
                    "earliest",
                    "latest",
                    "list",
                    "values"
                    ], statsFunction)
                ) {
                throw new Error("Stats function on timestamp field must be one of:" +
                    " duration, earliest, latest, list, or distinct values; found " +
                    statsFunction
                    );
            }
            else if (utils.contains(["objectCount", "childCount"], f.type) &&
                "count" !== statsFunction
                ) {
                throw new Error("Stats function on childcount and objectcount fields must be count; " +
                    "found " + statsFunction);
            }
            else if ("boolean" === f.type) {
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
         * @method splunkjs.Service.PivotSpecification
         */
        toJsonObject: function() {
            return {
                dataModel: this.dataModelObject.dataModel.name,
                baseClass: this.dataModelObject.name,
                rows: this.rows,
                columns: this.columns,
                cells: this.cells,
                filters: this.filters
            };
        },

        /**
         * Query Splunk for SPL queries corresponding to a pivot report
         * for this data model, defined by this `PivotSpecification`.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var searches = dataModels.item("internal_audit_logs").objectByName("searches");
         *          var pivotSpec = searches.createPivotSpecification();
         *          // Use of the fluent API
         *          pivotSpec.addRowSplit("user", "Executing user")
         *              .addRangeColumnSplit("exec_time", {start: 0, end: 12, step:5, limit:4})
         *              .addCellValue("search", "Search Query", "values")
         *              .pivot(function(pivotErr, pivot) {
         *                  console.log("Pivot search is:", pivot.search);
         *              });
         *      });
         *
         * @param {Function} callback A function to call when done getting the pivot: `(err, pivot)`.
         *
         * @method splunkjs.Service.PivotSpecification
         */
        pivot: function(callback) {
            var svc = this.dataModelObject.dataModel.service;

            var args = {
                pivot_json: JSON.stringify(this.toJsonObject())
            };

            if (!utils.isUndefined(this.accelerationNamespace)) {
                args.namespace = this.accelerationNamespace;
            }
            
            return svc.get(Paths.pivot + "/" + encodeURIComponent(this.dataModelObject.dataModel.name), args, function(err, response) {
                if (err) {
                    callback(new Error(err.data.messages[0].text), response);
                    return;
                }

                if (response.data.entry && response.data.entry[0]) {
                    callback(null, new root.Pivot(svc, response.data.entry[0].content));
                }
                else {
                    callback(new Error("Didn't get a Pivot report back from Splunk"), response);
                }
            });
        }
    });

    /**
     * Represents one of the structured views in a `DataModel`.
     *
     * Has these properties:
     *    - `dataModel` (_splunkjs.Service.DataModel_): The `DataModel` to which this `DataModelObject` belongs.
     *    - `name` (_string_): The name of this `DataModelObject`.
     *    - `displayName` (_string_): The human readable name of this `DataModelObject`.
     *    - `parentName` (_string_): The name of the parent `DataModelObject` to this one.
     *    - `lineage` (_array_): An array of strings of the lineage of the data model
     *          on which this field is defined.
     *    - `fields` (_object_): A dictionary of `DataModelField` objects, accessible by name.
     *    - `constraints` (_array_): An array of `DataModelConstraint` objects.
     *    - `calculations` (_object_): A dictionary of `DataModelCalculation` objects, accessible by ID.
     *
     * BaseSearch has an additional property:
     *    - `baseSearch` (_string_): TODO: need a label
     *
     * BaseTransaction has additional properties:
     *    - `groupByFields` (_string_): TODO: need a label
     *    - `objectsToGroup` (_string_): TODO: need a label, is it really a string?
     *    - `maxSpan` (_string_): TODO: need a label
     *    - `maxPause` (_string_): TODO: need a label
     *
     * @class splunkjs.Service.DataModelObject
     */
    root.DataModelObject = Class.extend({
        /**
         * Constructor for a data model calculations.
         *
         * @constructor
         * @param {Object} props A dictionary of properties to set:
         *     - `objectName` (_string_): The name for this data model object.
         *     - `displayName` (_string_): A human readable name for this data model object.
         *     - `parentName` (_string_): The name of the data model that owns this data model object.
         *     - `lineage` (_string_): The lineage of the data model that owns this data model object,
         *          items are delimited by a dot. This is converted into an array of
         *          strings upon construction.
         *     - `objectSearch` (_string_): TODO: need a label
         *     - `objectSearchNoFields` (_string_): TODO: need a label
         *     - `fields` (_array_): An array of data model fields.
         *     - `constraints` (_array_): An array of data model constraints.
         *     - `calculations` (_array_): An array of data model calculations.
         *     - `baseSearch` (_string_): TODO: need a label; exclusive to BaseSearch (optional)
         *     - `groupByFields` (_string_): TODO: need a label; exclusive to BaseTransaction (optional)
         *     - `objectsToGroup` (_string_): TODO: need a label; exclusive to BaseTransaction (optional)
         *     - `maxSpan` (_string_): TODO: need a label; exclusive to BaseTransaction (optional)
         *     - `maxPause` (_string_): TODO: need a label; exclusive to BaseTransaction (optional)
         *
         * @param {splunkjs.Service.DataModel} parentDataModel The `DataModel` that owns this data model object.
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

            // Properties exclusive to BaseTransaction
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

            // Property exclusive to BaseSearch
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
        
        /**
         * Is this data model object is a BaseEvent?
         *
         * @return {Boolean} Whether this data model object is the root type, BaseEvent.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseEvent: function() {
            // TODO: is there a better way to test for BaseEvent?
            return !this.isBaseSearch() && !this.isBaseTransaction();
        },

        /**
         * Is this data model object is a BaseSearch?
         *
         * @return {Boolean} Whether this data model object is the root type, BaseSearch.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseSearch: function() {
            return !utils.isUndefined(this.baseSearch);
        },

        /**
         * Is this data model object is a BaseTransaction?
         *
         * @return {Boolean} Whether this data model object is the root type, BaseTransaction.
         *
         * @method splunkjs.Service.DataModelObject
         */
        isBaseTransaction: function() {
            return !utils.isUndefined(this.maxSpan);
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
         * @return {splunkjs.Service.DataModelField|null} The data model field
         * from this data model object with the specified name, null if it the 
         * field by that name doesn't exist.
         *
         * @method splunkjs.Service.DataModelObject
         */
        fieldByName: function(name) {
            return this.calculatedFields()[name] || this.fields[name] || null;
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
            var calculatedFields = this.calculatedFields();

            for (var cf in calculatedFields) {
                if (calculatedFields.hasOwnProperty(cf)) {
                    fields[cf] = calculatedFields[cf];
                }
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
                    fields[calculation.outputFieldNames()[f]] = calculation.outputFields[calculation.outputFieldNames()[f]];
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

        // TODO look into how acceleration works
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
        createLocalAccelerationJob: function(earliestTime, callback) {
            // If earliestTime parameter is not specified, then set callback to its value
            if (!callback && utils.isFunction(earliestTime)) {
                callback = earliestTime;
                earliestTime = undefined;
            }

            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search | tscollect"; 
            var args = earliestTime ? {earliest_time: earliestTime} : {};

            this.dataModel.service.search(query, args, callback);
        },

        /**
         * Start a search job that applies querySuffix to all the events in this data model object.
         *
         * @example
         *
         *      service.dataModels().fetch(function(err, dataModels) {
         *          var object = dataModels.item("internal_audit_logs").objectByName("searches");
         *          object.startSearch({}, "| head 5", function(err, job) {
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
        startSearch: function(params, querySuffix, callback) {
            var query = "| datamodel " + this.dataModel.name + " " + this.name + " search";
            // Prepend a space to the querySuffix, or set it to an empty string if null or undefined
            querySuffix = querySuffix ? " " + querySuffix : "";
            this.dataModel.service.search(query + querySuffix, params, callback);
        },
        
        /**
         * Returns the data model object this one inherits from if it is a user defined,
         * otherwise return null.
         *
         * @return {splunkjs.Service.DataModelObject|null} This data model object's parent
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
         * @return {splunkjs.Service.PivotSpecification} A new pivot specification.
         *
         * @method splunkjs.Service.DataModelObject
         */
        createPivotSpecification: function() {
            // Pass in this DataModelObject to create a PivotSpecification
            return new root.PivotSpecification(this);
        }
    });
    
    /**
     * Represents a data model on the server. Data models
     * contain `DataModelObject` instances, which specify structured
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
         * @param {Object} namespace (Optional) namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
         * @param {Object} props Properties of this data model.
         *    - `acceleration` (_string_): A JSON object with an enabled key, representing if acceleration is enabled or not.
         *    - `concise` (_string_): Indicates whether to list a concise JSON description of the data model, should always be "0".
         *    - `description` (_string_): The JSON describing the data model.
         *    - `displayName` (_string_): The name displayed for the data model in Splunk Web.
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

            this.acceleration = JSON.parse(props.content.acceleration) || {};
            if (this.acceleration.hasOwnProperty("enabled")) {
                // convert the enabled property to a boolean
                this.acceleration.enabled = !!this.acceleration.enabled;
            }

            // concise=0 (false) forces the server to return all details of the newly created data model.
            // we do not want a summary of this data model
            if (!props.hasOwnProperty("concise") || utils.isUndefined(props.concise)) {
                this.concise = "0";
            }

            var dataModelDefinition = JSON.parse(props.content.description);

            this.objectNames = dataModelDefinition.objectNameList;
            this.displayName = dataModelDefinition.displayName;
            this.description = dataModelDefinition.description;

            // Parse the objects for this data model           
            var objs = dataModelDefinition.objects;
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
         * @return {Boolean} Returns true if this data model has object with specified name, false otherwise.

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
        update: function(props, callback) {
            if (utils.isUndefined(callback)) {
                callback = props;
                props = {};
            }
            callback = callback || function() {};

            if (!props) {
                callback(new Error("Must specify a props argument to update a data model."));
                return; // Exit if props isn't set, to avoid calling the callback twice.
            }
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
         * @param {Object} namespace (Optional) namespace information:
         *    - `owner` (_string_): The Splunk username, such as "admin". A value of "nobody" means no specific user. The "-" wildcard means all users.
         *    - `app` (_string_): The app context for this resource (such as "search"). The "-" wildcard means all apps.
         *    - `sharing` (_string_): A mode that indicates how the resource is shared. The sharing mode can be "user", "app", "global", or "system".
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
         * @return {splunkjs.Service.DataModel} A new `DataModel` instance.
         *
         * @method splunkjs.Service.DataModels
         */
        instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.DataModel(this.service, props.name, entityNamespace, props);
        }
    });
})();