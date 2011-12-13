/*!*/
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

(function() {
    "use strict";
    var utils = require('./utils');
    
    var root = exports || this;

    var levels = {
        "ALL": 4,
        "INFO": 3,
        "WARN": 2,
        "ERROR": 1,
        "NONE": 0
    };
    
    var exists = function(key) {
        return typeof(process.env[key]) !== "undefined";
    };
    
    if (exists("LOG_LEVEL")) {
        // If it isn't set, then we default to only errors
        process.env.LOG_LEVEL = levels["ERROR"];
    }
    else if (utils.isString(process.env.LOG_LEVEL)) {
        // If it is a string, try and convert it, but default
        // to error output if we can't convert it.
        if (levels.hasOwnProperty(process.env.LOG_LEVEL)) {
            process.env.LOG_LEVEL = levels[process.env.LOG_LEVEL];
        }
        else {
            process.env.LOG_LEVEL = levels["ERROR"];
        }
    }
    else if (!utils.isNumber(process.env.LOG_LEVEL)) {
        // If it is anything other than a string or number,
        // set it to only error output.
        process.env.LOG_LEVEL = levels["ERROR"];
    }

    // Set the actual output functions
    var _log, _warn, _error, _info;
    _log = _warn = _error = _info = function() {};
    if (typeof(console) !== "undefined") {
        _log   = (console.log   ?
            function(str) { try { console.log.apply(console, arguments);   } catch (ex) { console.log(str);   } }   :
            _log);
        _error = (console.error ?
            function(str) { try { console.error.apply(console, arguments); } catch (ex) { console.error(str); } } :
            _error);
        _warn  = (console.warn  ?
            function(str) { try { console.warn.apply(console, arguments);  } catch (ex) { console.warn(str);  } } :
            _warn);
        _info  = (console.info  ?
            function(str) { try { console.info.apply(console, arguments);  } catch (ex) { console.info(str);  } } :
            _info);
    }

    /**
     * Splunk.Logger
     * 
     * A controllable logging module.
     *
     * @moduleRoot Splunk.Logger
     */
    exports.Logger = {
        /**
         * Log to the console (equivalent to `console.log`)
         *
         * @module Splunk.Logger
         */
        log: function() {
            if (process.env.LOG_LEVEL >= levels.ALL) {
                _log.apply(null, arguments);
            }
        },
        
        /**
         * Log error to the console (equivalent to `console.error`)
         *
         * @module Splunk.Logger
         */
        error: function() {
            if (process.env.LOG_LEVEL >= levels.ERROR) {
                _error.apply(null, arguments);
            }
        },
        
        /**
         * Log warning to the console (equivalent to `console.warn`)
         *
         * @module Splunk.Logger
         */
        warn: function() {
            if (process.env.LOG_LEVEL >= levels.WARN) {
                _warn.apply(null, arguments);
            }
        },
        
        /**
         * Log info to the console (equivalent to `console.info`)
         *
         * @module Splunk.Logger
         */
        info: function() {
            if (process.env.LOG_LEVEL >= levels.INFO) {
                _info.apply(null, arguments);
            }
        },
        
        /**
         * Set the global logging level
         *
         * Example:
         *
         *      Splunk.Logger.setLevel("WARN");
         *      Splunk.Logger.setLevel(0); // equivalent to NONE
         *
         * @param {String|Number} level A string (`ALL` | `INFO` | `WARN` | `ERROR` | `NONE`) or number representing the log level
         *
         * @module Splunk.Logger
         */
        setLevel: function(level) {    
            if (utils.isString(level)) {
                if (levels.hasOwnProperty(level)) {
                    process.env.LOG_LEVEL = levels[level];
                }
                else {
                    process.env.LOG_LEVEL = levels["ERROR"];
                }
            }
            else if (utils.isNumber(level)) {
                process.env.LOG_LEVEL = level;
            }
            else {
                process.env.LOG_LEVEL = levels["ERROR"];
            }
        },
        
        /*!*/
        levels: levels
    };
})();