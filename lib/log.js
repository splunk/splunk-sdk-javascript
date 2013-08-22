/*!*/
// Copyright 2012 Splunk, Inc.
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

    // Normalize the value of the environment variable $LOG_LEVEL to
    // an integer (look up named levels like "ERROR" in levels above),
    // and default to "ERROR" if there is no value or an invalid value
    // set.
    var setLevel = function(level) {    
        if (utils.isString(level) && levels.hasOwnProperty(level)) {
            process.env.LOG_LEVEL = levels[level];
        } 
        else if (!isNaN(parseInt(level, 10)) &&
                   utils.keyOf(parseInt(level, 10), levels)) {
            process.env.LOG_LEVEL = level;
        } 
        else {
            process.env.LOG_LEVEL = levels["ERROR"];                
        }
    };

    if (process.env.LOG_LEVEL) {
        setLevel(process.env.LOG_LEVEL);
    } 
    else {
        process.env.LOG_LEVEL = levels["ERROR"];
    }

    // Set the actual output functions
    // This section is not covered by unit tests, since there's no
    // straightforward way to control what the console object will be.
    var _log, _warn, _error, _info;
    _log = _warn = _error = _info = function() {};
    if (typeof(console) !== "undefined") {

        var logAs = function(level) {
            return function(str) {
                try { 
                    console[level].apply(console, arguments);
                }
                catch(ex) { 
                    console[level](str);
                }
            };
        };

        if (console.log) { _log = logAs("log"); }
        if (console.error) { _error = logAs("error"); }
        if (console.warn) { _warn = logAs("warn"); }
        if (console.info) { _info = logAs("info"); }
    }

    /**
     * A controllable logging module that lets you display different types of
     * debugging information to the console.  
     *
     * @module splunkjs.Logger
     */
    exports.Logger = {
        /**
         * Logs debug messages to the console. This function is the same as 
         * `console.log`.
         *
         * @function splunkjs.Logger
         */
        log: function() {
            if (process.env.LOG_LEVEL >= levels.ALL) {
                _log.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug errors to the console. This function is the same as 
         * `console.error`.
         *
         * @function splunkjs.Logger
         */
        error: function() {
            if (process.env.LOG_LEVEL >= levels.ERROR) {
                _error.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug warnings to the console. This function is the same as 
         * `console.warn`.
         *
         * @function splunkjs.Logger
         */
        warn: function() {
            if (process.env.LOG_LEVEL >= levels.WARN) {
                _warn.apply(null, arguments);
            }
        },
        
        /**
         * Logs debug info to the console. This function is the same as 
         * `console.info`.
         *
         * @function splunkjs.Logger
         */
        info: function() {
            if (process.env.LOG_LEVEL >= levels.INFO) {
                _info.apply(null, arguments);
            }
        },
        
        /**
         * Prints all messages that are retrieved from the splunkd server to the
         * console.
         *
         * @function splunkjs.Logger
         */
        printMessages: function(allMessages) {
            allMessages = allMessages || [];
            
            for(var i = 0; i < allMessages.length; i++) {
                var message = allMessages[i];
                var type = message["type"];
                var text = message["text"];
                var msg = '[SPLUNKD] ' + text;
                switch (type) {
                    case 'HTTP':
                    case 'FATAL':
                    case 'ERROR':
                        this.error(msg);
                        break;
                    case 'WARN':
                        this.warn(msg);
                        break;
                    case 'INFO':
                        this.info(msg);
                        break;
                    case 'HTTP':
                        this.error(msg);
                        break;
                    default:
                        this.info(msg);
                        break;
                }
            }  
        },
        
        /**
         * Sets the global logging level to indicate which information to log.
         *
         * @example
         *
         *      splunkjs.Logger.setLevel("WARN");
         *      splunkjs.Logger.setLevel(0); // equivalent to NONE
         *
         * @param {String|Number} level A string or number ("ALL" = 4 | "INFO" = 3 | "WARN" = 2 | "ERROR" = 1 | "NONE" = 0) indicating the logging level.
         *
         * @function splunkjs.Logger
         */
        setLevel: function(level) { setLevel.apply(this, arguments); },
        
        /*!*/
        levels: levels
    };
})();
