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
            this.name           = props.fieldName;
            this.displayName    = props.displayName;
            // TODO: valid values are string, timestamp, objectCount, string, number, childCount, ipv4, boolean, etc.
            this.type           = props.type;
            this.multivalued    = props.multivalue;
            this.required       = props.required;
            this.hidden         = props.hidden;
            this.editable       = props.editable;
            this.comment        = props.comment;
            this.fieldSearch    = props.fieldSearch;
            this._lineage       = props.owner.split(".");
        },

        /**
         * Returns the lineage of the data model object owner (which may or may not
         * be the data model object from which you accessed this field)
         * that defines this field as an array of strings.
         * 
         * @return {Array} Array of strings representing the lineage of this data model field's 
         * owner, a data model object.
         *
         * @method splunkjs.Service.DataModelField
         */
        ownerLineage: function() {
            return this._lineage;
        },

        /**
         * Returns the name of the owner, a data model object, of this data model field.
         *
         * @return {String} The name of the data model object owner of this field.
         *
         * @method splunkjs.DataModelField
         */
        ownerName: function() {
            return this.ownerLineage()[this.ownerLineage().length - 1];
        },

        /**
         * Returns a string of JSON representing this data model field.
         * This method is used internally for updating data models.
         *
         * @return {String} The JSON representation of this data model field.
         *
         * @method splunkjs.DataModelField
         */
        toJSON: function() {
            var ret = {
                fieldName: this.name,
                displayName: this.displayName,
                type: this.type,
                multivalue: this.multivalued,
                required: this.required,
                hidden: this.hidden,
                editable: this.editable,
                comment: this.comment,
                fieldSearch: this.fieldSearch,
                owner: this._lineage.join(".")
            };
            return JSON.stringify(ret);
        }
    });
    
    /**
     * TODO: docs
     * Constructor for data model constraints
     * This object has no endpoint on the REST API, and is
     * more of a helper class that anything else. Thus,
     * it doesn't inherit from root.Entity
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
            this._query          = props.search;
            this._owner          = props.owner; // TODO: sometimes owner is a string, sometimes it's a stringified lineage

            // TODO: do I need to add typing?
        },

        /**
         * Returns the Splunk search query for this constraint.
         *
         * @return {String} The Splunk search query for this constraint.
         *
         * @method splunkjs.Service.DataModelConstraint
         */
        query: function() {
            return this._query;
        },

        /**
         * Returns the name of the owner, a data model object, of this data model constraint.
         *
         * @return {String} The name of the data model object owner of this constraint.
         *
         * @method splunkjs.Service.DataModelConstraint
         */
        ownerName: function() {
            return this._owner;
        },

        /**
         * Returns a string of JSON representing this data model constraint.
         * This method is used internally for updating data models.
         *
         * @return {String} The JSON representation of this data model constraint.
         *
         * @method splunkjs.DataModelConstraint
         */
        toJSON: function() {
            var ret = {
                search: this._query,
                owner: this._owner
            };
            return JSON.stringify(ret);
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
            // Calculation type constants
            this.typeLookup     = "Lookup";
            this.typeEval       = "Eval";
            this.typeGeoIP      = "GeoIP";
            this.typeRegexp     = "Rex";

            this.id             = props.calculationID;
            this.type           = props.calculationType;
            this._lineage       = props.owner.split(".");
            this.comment        = props.comment;
            this._editable      = props.editable;

            this._outputFields = [];
            for (var i = 0; i < props.outputFields.length; i++) {
                this._outputFields[props.outputFields[i].fieldName] = new root.DataModelField(props.outputFields[i]);
            }

            // Based on the type, conditionally add some functions/properties
            if (this.type === this.typeEval || this.type === this.typeRegexp) {
                // TODO: docs
                this._expression = props.expression;
                this.expression = function() {
                    return this._expression;
                };
            }
            if (this.type === this.typeGeoIP || this.type === this.typeRegexp) {
                // TODO: docs
                this._inputField = props.inputField;
                this.inputField = function() {
                    return this._inputField;
                };
            }
            if (this.type === this.typeLookup) {
                // TODO: docs
                this.lookupName = props.lookupName;
                this._inputFieldMappings = props.lookupInputs;
                this.inputFieldMappings = function() {
                    return this._inputFieldMappings;
                };
            }
        },

        // TODO: docs
        owner: function() {
            return this._lineage[this._lineage.length - 1];
        },

        // TODO: docs
        outputFields: function() {
            return this._outputFields;
        },

        // TODO: docs
        outputFieldNames: function() {
            return Object.keys(this._outputFields);
        },

        // TODO: docs
        lineage: function() {
            return this._lineage;
        },

        // TODO: docs
        isEditable: function() {
            return this._editable;
        },

        /**
         * Is this data model calculation of type lookup?
         *
         * @return {Boolean} True if this data model calculation is of type lookup.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isLookup: function() {
            return this.type === this.typeLookup;
        },

        /**
         * Is this data model calculation of type eval?
         *
         * @return {Boolean} True if this data model calculation is of type eval.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isEval: function() {
            return this.type === this.typeEval;
        },
        
        /**
         * Is this data model calculation of type Regexp?
         *
         * @return {Boolean} True if this data model calculation is of type Regexp.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isRegexp: function() {
            return this.type === this.typeRegexp;
        },

        /**
         * Is this data model calculation of type GeoIP?
         *
         * @return {Boolean} True if this data model calculation is of type GeoIP.
         *
         * @method splunkjs.Service.DataModelCalculation
         */
        isGeoIP: function() {
            return this.type === this.typeGeoIP;
        },

        /**
         * Returns a string of JSON representing this data model calculation.
         * This method is used internally for updating data models.
         *
         * @return {String} The JSON representation of this data model calculation.
         *
         * @method splunkjs.DataModelCalculation
         */
        toJSON: function() {
            var ret = {
                calculationID: this.id,
                calculationType: this.type,
                owner: this._lineage.join("."),
                comment: this.comment,
                editable: this._editable
            };

            // Based on the type, conditionally add some properties
            if (this.type === this.typeEval || this.type === this.typeRegexp) {
                ret.expression = this._expression;
            }
            if (this.type === this.typeGeoIP || this.type === this.typeRegexp) {
                ret.inputField = this._inputField;
            }
            if (this.type === this.typeLookup) {
                ret.lookupName = this.lookupName;
                ret.lookupInputs = this._inputFieldMappings;
            }
            
            ret.outputFields = [];
            for (var i = 0; i < this.outputFieldNames().length; i++) {
                ret.outputFields.push(this.outputFields()[this.outputFieldNames()[i]].toJSON());
            }
            
            return JSON.stringify(ret);
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
        // TODO: docs, takes a DataModel instance as a parameter
        init: function(dataModelObject) {
            this._dataModelObject = dataModelObject;
            this.columns = this.rows = this.filters = this.cells = [];

            // comparison type constants, TODO: cleanup; also it may help to define the types in DataModelField
            this.comparisonBoolean = "boolean";
            this.comparisonString = "string";
            this.comparisonNumber = "number";
            this.comparisonIPv4 = "ipv4";
            this.comparisonObjectCount = "objectCount";

            // TODO: types of comparisons
            this._comparisonTypes = {};
            // TODO see if some can be combined; also they should be made into dicts with nicer names
            this._comparisonTypes[this.comparisonBoolean] = [
                "=",
                "is",
                "isNull",
                "isNotNull"
            ];
            this._comparisonTypes[this.comparisonString] = [
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
            this._comparisonTypes[this.comparisonIPv4] = [
                "is",
                "isNull",
                "isNotNull",
                "contains",
                "doesNotContain",
                "startsWith"
            ];
            this._comparisonTypes[this.comparisonNumber] = [
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

            this.accelerationNamespace = 
                dataModelObject.dataModel().isAccelerated() ? 
                dataModelObject.dataModel().name :
                null;
        },

        // TODO: docs
        dataModelObject: function() {
            return this._dataModelObject;
        },
        // TODO: docs
        setAccelerationJob: function(sid) {
            if (!sid) {
                throw new Error("Sid to use for acceleration must not be null.");
            }
            else {
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

            if (this._dataModelObject.hasField(fieldName)) {
                if (comparisonType === this._dataModelObject.fieldByName(fieldName).type) {
                    if (utils.contains(this._comparisonTypes[comparisonType], comparison)) {
                        var that = this;
                        this.filters.push({
                            fieldName: fieldName,
                            dataModelObject: that._dataModelObject,
                            type: comparisonType,
                            toJSON: function() {
                                // add the common fields
                                var ret = {
                                    fieldName: fieldName,
                                    owner: this.dataModelObject.fieldByName(fieldName).ownerLineage().join("."),
                                    type: comparisonType
                                };

                                // TODO: there will be some common fields, some type-dependent
                                if (utils.contains([
                                    that.comparisonBoolean,
                                    that.comparisonString,
                                    that.comparisonIPv4,
                                    that.comparisonNumber
                                    ],
                                    ret.type)) {

                                    ret.comparator = comparison;
                                    ret.compareTo = compareTo;
                                }

                                return ret;
                            }
                            // TODO: other methods
                        });
                    }
                    else {
                        throw new Error(
                            "Cannot add " + comparisonType + 
                            " filter because " + comparison +
                            " is not a valid comparison");
                    }
                }
                else {
                    throw new Error(
                        "Cannot add " + comparisonType +  
                        " filter on " + fieldName + 
                        " because it is of type " +
                        this._dataModelObject.fieldByName(fieldName).type);
                }
            }
            else {
                throw new Error("Cannot add filter on a nonexistent field.");
            }
            return this; // Return the pivot spec for the fluent style API
        },

        // TODO: docs
        addLimitFilter: function(fieldName, sortAttribute, sortDirection, limit, statsFunction) {
            // TODO: parameter validation
            if (!this._dataModelObject.hasField(fieldName)) {
                throw new Error("Cannot add limit filter on a nonexistent field.");
            }
            if (!utils.contains([this.comparisonString, this.comparisonNumber, this.comparisonObjectCount],
                    this._dataModelObject.fieldByName(fieldName).type)) {
                throw new Error("Cannot add limit filter on " + fieldName + " because it is of type " + this._dataModelObject.fieldByName(fieldName).type);
            }

            if (this._dataModelObject.fieldByName(fieldName).type === this.comparisonString &&
                !utils.contains([this.statsFunctions.COUNT, this.statsFunctions.DISTINCT_COUNT], statsFunction)
                ) {
                throw new Error("Stats function for fields of type string must be COUNT or DISTINCT_COUNT; found " +
                    statsFunction);
            }

            if (this._dataModelObject.fieldByName(fieldName).type === this.comparisonNumber &&
                !utils.contains([this.statsFunctions.COUNT, this.statsFunctions.DISTINCT_COUNT, this.statsFunctions.AVERAGE, this.statsFunctions.SUM], statsFunction)
                ) {
                // TODO: error
                throw new Error("Stats function for fields of type number must be one of COUNT, DISTINCT_COUNT, SUM, or AVERAGE; found " +
                    statsFunction);
            }

            if (this._dataModelObject.fieldByName(fieldName).type === this.comparisonObjectCount &&
                !utils.contains([this.statsFunctions.COUNT], statsFunction)
                ) {
                throw new Error("Stats function for fields of type object count must be COUNT; found " + statsFunction);
            }

            var that = this;
            this.filters.push({
                dataModelObject: that._dataModelObject,
                sortAttribute: sortAttribute,
                sortDirection: sortDirection,
                limit: limit,
                statsFunction: statsFunction,
                type: that.comparisonNumber,
                toJSON: function() {
                    // add the common fields
                    var ret = {
                        fieldName: fieldName,
                        owner: this.dataModelObject.fieldByName(fieldName).ownerLineage().join("."),
                        type: this.dataModelObject.fieldByName(fieldName).type
                    };

                    ret.attributeName = this.sortAttribute;
                    ret.attributeOwner = this.dataModelObject.fieldByName(this.sortAttribute).ownerLineage().join(".");

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
            this._dataModel             = parentDataModel;
            this.name                   = props.objectName;
            this.displayName            = props.displayName;
            this.parentName             = props.parentName;
            this._objectSearchNoFields  = props.objectSearchNoFields;
            this._objectSearch          = props.objectSearch;

            // TODO: this stuff for transactions; both properties should be arrays already
            if (props.hasOwnProperty("groupByFields")) {
                // TODO: handle this property
                this._groupByFields = props.groupByFields;
                this.groupByFields = function() {
                    return this._groupByFields;
                };
            }
            if (props.hasOwnProperty("objectsToGroup")) {
                // TODO: handle this property
                this._objectsToGroup = props.objectsToGroup;
                this.objectsToGroup = function() {
                    return this._objectsToGroup;
                };
            }
            this.maxSpan = props.transactionMaxTimeSpan;
            this.maxPause = props.transactionMaxPause;

            // TODO: handle the case of baseSearch, or should I conditionally assign it like above?
            this.baseSearch = props.baseSearch; // Set to undefined if it's not there

            this._lineage = props.lineage.split("."); // TODO: probably need some fallback if lineage is undefined

            // Parse fields
            this._fields = {};
            for (var i = 0; i < props.fields.length; i++) {
                var name = props.fields[i].fieldName || props.fields[i].name;
                this._fields[name] = new root.DataModelField(props.fields[i]);
            }

            // Parse constraints
            this._constraints = [];
            for (var j = 0; j < props.constraints.length; j++) {
                this._constraints.push(new root.DataModelConstraint(props.constraints[j]));
            }

            // Parse calculations
            this._calculations = [];
            for (var k = 0; k < props.calculations.length; k++) {
                this._calculations[props.calculations[k].calculationID] = new root.DataModelCalculation(props.calculations[k]);
            }
        },
        // TODO: docs, working title may need to rename (this is instead of creating a BaseSearch class)
        isBaseSearch: function() {
            return !utils.isUndefined(this.baseSearch);
        },
        // TODO: docs, working title may need to rename (this is instead of creating a BaseTransaction class)
        isBaseTransaction: function() {
            return !utils.isUndefined(this.maxSpan); // TODO: might want to use a different property
        },
        // TODO: docs
        dataModel: function() {
            return this._dataModel;
        },
        // TODO: docs
        lineage: function() {
            return this._lineage;
        },
        // TODO: docs
        fields: function() {
            return this._fields;
        },
        // TODO: docs
        fieldNames: function() {
            return Object.keys(this._fields);
        },
        // TODO: docs
        fieldByName: function(name) {
            return this._fields[name];
        },
        // TODO: docs
        allFields: function() {
            // merge fields() and calculationFields()
            var fields = this.fields();
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
        // TODO: docs
        calculatedFields: function(){
            var fields = {};
            // TODO: iterate over the calculations, get their fields
            var keys = this.calculationIDs();
            var calculations = this.calculations();
            for (var i = 0; i < keys.length; i++) {
                var calculation = calculations[keys[i]];
                for (var f = 0; f < calculation.outputFieldNames().length; f++) {
                    var outputField = calculation.outputFields()[calculation.outputFieldNames(f)];
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
        constraints: function() {
            return this._constraints;
        },
        // TODO: docs
        calculations: function() {
            return this._calculations;
        },
        // TODO: docs
        calculationIDs: function() {
            return Object.keys(this._calculations);
        },
        // TODO: docs
        parent: function() {
            return this.dataModel().objectByName(this.parentName);
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

            var query = "| datamodel " + this.dataModel().name + " " + this.name + " search | tscollect";
            // TODO: create the search
            var args = {};
            if (earliestTime) {
                // TODO: is this correct? how can we know?
                args.earliest_time = earliestTime;
            }
            // TODO: figure out why some of these functions are missing, like service()
            // TODO: should this be this.dataModel()._service.oneshotSearch(query, args, callback);?
            this.dataModel()._service.search(query, args, callback);
        },
        // TODO: docs
        // optional args and querySuffix parameters
        runQuery: function(args, querySuffix, callback) {
            var query = "| datamodel " + this.dataModel().name + " " + this.name + " search";
            // TODO: handle the optional parameters (args, and querySuffix are both optional)
            if (querySuffix) {
                querySuffix = " " + querySuffix; // Prepend a space
            }
            else {
                querySuffix = "";
            }
            this.dataModel()._service.search(query + querySuffix, args, callback);
        },

        /**
         * Returns a string of JSON representing this data model field.
         * This method is used internally for updating data models.
         *
         * @return {String} The JSON representation of this data model field.
         *
         * @method splunkjs.DataModelObject
         */
        toJSON: function() {
            var ret = {
               objectName: this.name,
               displayName: this.displayName,
               parentName: this.parentName,
               lineage: this._lineage.join("."),
               objectSearchNoFields: this._objectSearchNoFields,
               objectSearch: this._objectSearch
            };

            if (this.hasOwnProperty("_groupByFields")) {
                ret.groupByFields = this._groupByFields;
            }
            if (this.hasOwnProperty("_objectsToGroup")) {
                ret.objectsToGroup = this._objectsToGroup;
            }
            if (this.hasOwnProperty("maxSpan")) {
                ret.transactionMaxTimeSpan = this.maxSpan;
            }
            if (this.hasOwnProperty("maxPause")) {
                ret.transactionMaxPause = this.maxPause;
            }
            if (this.hasOwnProperty("baseSearch")) {
                ret.baseSearch = this.baseSearch;
            }

            ret.fields = [];
            for (var i = 0; i < this.fieldNames().length; i++) {
                var fName = this.fieldNames()[i];
                ret.fields.push(this.fields()[fName].toJSON());
            }

            ret.constraints = [];
            for (var j = 0; j < this.constraints().length; j++) {
                ret.constraints.push(this.constraints()[j].toJSON());
            }

            ret.calculations = [];
            for (var k = 0; k < this.calculationIDs().length; k++) {
                var cID = this.calculationIDs()[k];
                ret.calculations.push(this.calculations()[cID].toJSON());
            }

            return JSON.stringify(ret);
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
    
    root.DataModel = Service.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.DataModel
         */
        path: function() {
            return Paths.dataModels + "/" + encodeURIComponent(this.name);
        },

        /** TODO: docs
         * Constructor for `splunkjs.Service.DataModel`.
         *
         * @constructor
         */
        init: function(service, name, namespace, props) {
            // TODO: conditional args
            if (!props) {
                // If we're not given a 4th arg, assume the namespace was omitted
                props = namespace;
                namespace = null;
            }

            this.name = name;
            this._super(service, this.path(), namespace);
            this._service = service;

            // Constants
            this._ACCELERATION_LABEL = "acceleration";
            this._MODEL_NAME_LEABL = "modelName";
            this._DISPLAY_NAME_LABEL = "displayName";
            this._DESCRIPTION_LABEL = "description"; // The description key inside the JSON
            this._RAW_JSON_LABEL = "description"; // All of the JSON
            
            var rawJSON = JSON.parse(props.content[this._RAW_JSON_LABEL]);

            // If the acceleration property is present, parse it as JSON
            if (props.content[this._ACCELERATION_LABEL]) {
                this._properties.acceleration = JSON.parse(props.content.acceleration);
                if (props.content.acceleration.hasOwnProperty("enabled")) {
                    // convert the enabled property to a boolean
                    this._properties.acceleration.enabled = !!this._properties.acceleration.enabled;
                }
            }

            if (!props.hasOwnProperty("concise") || utils.isUndefined(props.concise)) {
                this._properties.concise = "0";
            }

            this._properties._objectNames = rawJSON.objectNameList;
            this._properties.displayName = rawJSON[this._DISPLAY_NAME_LABEL];
            this._properties.description = rawJSON[this._DESCRIPTION_LABEL];

            // Parse the objects for this data model           
            var objs = rawJSON.objects;
            this._objects = [];
            for (var i = 0; i < objs.length; i++) {
                this._objects.push(new root.DataModelObject(objs[i], this));
            }

            // TODO: function binding, for async functions
            this.remove = utils.bind(this, this.remove);
            this.update = utils.bind(this, this.update);
        },

        /** TODO: docs
         * Enables or disables acceleration based on the provided boolean
         *
         */
        setAcceleration: function(enable) {
            this._properties.acceleration.enabled = enable;
        },

        /** TODO: docs
         * Sets earliest acceleration time.
         *
         */
        setEarliestAcceleratedTime: function(earliestTime) {
            this._properties.acceleration.earliestTime = earliestTime;
        },

        /** TODO: docs
         * Sets acceleration cron schedule.
         *
         */
        setAccelerationCronSchedule: function(cronSchedule) {
            this._properties.acceleration.cronSchedule = cronSchedule;
        },


        /** TODO: docs
         * Returns a boolean indicating whether acceleration is enabled or not.
         *
         */
        isAccelerated: function() {
            return !!this._properties.acceleration.enabled;
        },

        /** TODO: docs
         * Gets the description of this data model
         *
         */
        description: function() {
            return this._properties.description;
        },

        /** TODO: docs
         * Gets the display name of this data model
         *
         */
        displayName: function() {
            return this._properties.displayName;
        },

        /** TODO: docs
         * Gets the objects for this data model.
         *
         */
        objects: function() {
            return this._objects;
        },

        /** TODO: docs
         * Gets a specific object for this data model.
         *
         */
        objectByName: function(name) {
            var objects = this.objects();
            for (var i = 0; i < objects.length; i++) {
                if (objects[i].name === name) {
                    return objects[i];
                }
            }
        },

        /** TODO: docs
         * Gets list of object names for this data model.
         *
         */
        objectNames: function() {
            return this._properties._objectNames;
        },

        /** TODO: docs
         * Checks if a specific object exists in this data model.
         *
         * returns a boolean, true if this data model has object with specified name,
         * else false.
         */
        hasObject: function(name) {
            return utils.contains(this.objectNames(), name);
        },

        /**
         * Deletes the data model from the server.
         *
         * @param {Function} callback A function to call when the object is deleted: `(err)`.
         *
         * @method splunkjs.Service.DataModel
         * @protected
         */
        remove: function(callback) {
            callback = callback || function() {};
            
            var that = this;
            return this.del("", {}, function(err) {
                callback(err);
            });
        },
        // TODO: docs
        // Returns a service
        service: function() {
            return this._service;
        },
        // TODO: docs
        // Updates the entity, used to update the acceleration settings.
        update: function(callback) {
            callback = callback || function() {};

            var props = {
                acceleration: {
                    enabled: this.properties().acceleration.enabled,
                    earliest_time: this.properties().acceleration.earliestTime,
                    cron_schedule: this.properties().acceleration.cronSchedule
                }
            };
            props.acceleration = JSON.stringify(props.acceleration);
            props.concise = this.properties().concise;

            if (props.hasOwnProperty("name")) {
                callback(new Error("Cannot set 'name' field in 'update'"), this);
            }

            var that = this;
            return this.post("", props, function(err, response) {
                if (err) {
                    callback(err, that);
                }
                else {
                    var dataModelNamespace = utils.namespaceFromProperties(response.data.entry[0]);
                    callback(null, new root.DataModel(that._service, response.data.entry[0].name, dataModelNamespace, response.data.entry[0]));
                }
            });
        }
    });
    
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
         *
         * @example
         *     // TODO: write example usage
         *
         * @param {String} name The name of the data model to create.
         * @param {Object} params A dictionary of properties. // TODO: for a list of available parameters see ... (docs to dev.splunk.com) 
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
            params.modelName = name; // TODO: maybe this should be moved to `DataModel.init`
            callback = callback || function(){};

            // concise=0 (false) forces the server to return all details of the newly created data model.
            // we do not want a summary of this data model
            if (!params.hasOwnProperty("concise")) {
                params.concise = "0";
            }

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
         * @param {Object} props A dictionary of properties used to
         * create a `DataModel` object.
         *    - // TODO: list valid keys for this Object
         *
         * @return {splunkjs.Service.DataModel} A new `splunkjs.Service.DataModel` instance.
         *
         * @method splunkjs.Service.DataModels
         */
         instantiateEntity: function(props) {
            var entityNamespace = utils.namespaceFromProperties(props);
            return new root.DataModel(this.service, props.name, entityNamespace, props);
         }
    });

    root.Pivot = Service.Entity.extend({
        /**
         * Retrieves the REST endpoint path for this resource (with no namespace).
         *
         * @method splunkjs.Service.Pivot
         */
        path: function() {
            return Paths.pivot + "/" + encodeURIComponent(this.name);
        },

        /** TODO: docs
         * Constructor for `splunkjs.Service.Pivot`.
         *
         * @constructor
         */
        init: function(service, name, props) {
        }
    });
})();