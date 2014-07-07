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

            // TODO: based on the type, conditionally add some functions/properties
            // TODO: this can be reduced by using some if/else instead of switch
            switch(this.type) {
                case this.typeLookup:
                    // TODO:
                    this.lookupName = props.lookupName;
                    this._inputFieldMappings = props.lookupInputs;
                    // TODO: docs
                    this.inputFieldMappings = function() {
                        return this._inputFieldMappings;
                    };
                    break;
                case this.typeEval:
                    // TODO: I think this is the default, if not make a default case
                    this._expression = props.expression;
                    this.expression = function() {
                        return this._expression;
                    };
                    break;
                case this.typeGeoIP:
                    // TODO:
                    this._inputField = props.inputField;
                    this.inputField = function() {
                        return this._inputField;
                    };
                    break;
                case this.typeRegexp:
                    // TODO: I think this can be merged with eval into the default case
                    this._expression = props.expression;
                    // TODO: docs
                    this.expression = function() {
                        return this._expression;
                    };
                    this._inputField = props.inputField;
                    // TODO: docs
                    this.inputField = function() {
                        return this._inputField;
                    };
                    break;
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

        // Functions for type checking

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
        // TODO: docs
        init: function(props, parentDataModel) {
            this._dataModel     = parentDataModel;
            this.name           = props.objectName;
            this.displayName    = props.displayName;
            this.parentName     = props.parentName;

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
        calculationIDs: function(targetID) {
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
            this.dataModel()._service.search(query + querySuffix, args, callback);
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
        init: function(service, name, props) {
            this.name = name;
            this._super(service, this.path());

            this._service = service;

            // Constants
            this._ACCELERATION_LABEL = "acceleration";
            this._MODEL_NAME_LEABL = "modelName";
            this._DISPLAY_NAME_LABEL = "displayName";
            this._DESCRIPTION_LABEL = "description"; // The description key inside the JSON
            this._RAW_JSON_LABEL = "description"; // All of the JSON
            
            var rawJSON = JSON.parse(props.content[this._RAW_JSON_LABEL]);

            // TODO: refactor to use rawJSON more than this._properties; some of this can be inlined.
            // If the acceleration property is present, parse it as JSON
            if (props.content[this._ACCELERATION_LABEL]) {
                this._properties.acceleration = JSON.parse(props.content.acceleration);
                if (props.content.acceleration.hasOwnProperty("enabled")) {
                    this._properties.accelerationEnabled = props.content.acceleration.enabled;
                    // If the acceleration enabled is stored as a number, convert to boolean.
                    if (utils.isNumber(this._properties.accelerationEnabled)) {
                        //this._properties.accelerationEnabled = this._properties.accelerationEnabled !== 0;
                        // TODO: add some test for this number to boolean conversion.
                        this._properties.accelerationEnabled = !!this._properties.accelerationEnabled;
                    }
                }
                if (props.content.acceleration.hasOwnProperty("earliest_time")) {
                    this._properties.earliestTime = props.content.acceleration.earliest_time;
                }
                if (this._properties.acceleration.hasOwnProperty("cron_schedule")) {
                    this._properties.cronSchedule = this._properties.acceleration.cron_schedule;
                }
            }

            this._properties._objectNames = rawJSON.objectNameList;
            this._properties.displayName = rawJSON[this._DISPLAY_NAME_LABEL];
            this._properties.description = rawJSON[this._DESCRIPTION_LABEL];

            // Parse the objects for this data model           
            var objs = rawJSON.objects;
            this._objects = [];
            for (var i = 0; i < objs.length; i++) {
                // TODO: test
                this._objects.push(new root.DataModelObject(objs[i], this));
            }

            // TODO: function binding, for async functions
        },

        /** TODO: docs
         * Enables or disables acceleration based on the provided boolean
         *
         */
        setAcceleration: function(enable) {
            this._properties.accelerationEnabled = enable;
        },

        /** TODO: docs
         * Sets earliest acceleration time.
         *
         */
        setEarliestAcceleratedTime: function(enable) {
            this._properties.earliestTime = enable;
        },

        /** TODO: docs
         * Sets acceleration cron schedule.
         *
         */
        setAccelerationCronSchedule: function(enable) {
            this._properties.cronSchedule = enable;
        },


        /** TODO: docs
         * Returns a boolean indicating whether acceleration is enabled or not.
         *
         */
        isAccelerated: function() {
            return this._properties.accelerationEnabled;
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

        /** TODO: Does namespace need to be used?
         * Constructor for `splunkjs.Service.DataModels`.
         * 
         * @constructor
         * @param {splunkjs.Service} service A `Service` instance.
         * 
         * @method splunkjs.Service.DataModels
         */
        init: function(service) {
            this._super(service, this.path());

            this.concise = "0"; // TODO: check this, maybe move it somewhere else
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

            // TODO: check this; may need a setConcise(), see https://github.com/splunk/splunk-sdk-javascript/blob/master/lib/service.js#L3282
            // concise=0 forces the server to return all details of the newly
            // created data model.
            if (!params.hasOwnProperty("concise")) {
                params.concise = "0";
            }

            var that = this;
            return this.post("", {name: name, description: JSON.stringify(params)}, function(err, response) {
                if (err) {
                    callback(err);
                }
                else {
                    var dataModel = new root.DataModel(that.service, response.data.entry[0].name, response.data.entry[0]);
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
            return new root.DataModel(this.service, props.name, props);
         }
    });
})();