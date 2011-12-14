
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
    var Splunk = require('./splunk');

    Splunk.namespace("util");

    /****** DON'T CHANGE ANYTHING ABOVE THIS LINE ***********/

    Splunk.util = {
        /**
         * Assign empty handlers for logger calls. Overriden by Splunk.Logger if it is imported.
         */
        logger : {
            "info":function(){},
            "log":function(){},
            "debug":function(){},
            "warn":function(){},
            "error":function(){}
        },

        /**
         * Converts an object literal to an encoded querystring key/value string.
         *
         */
        propToQueryString: function(dictionary) {
            var o = [];
            var val;
            for (var prop in dictionary) {
                val = '' + dictionary[prop];
                o.push(encodeURIComponent(prop) + '=' + encodeURIComponent(dictionary[prop]));
            }
            return o.join('&');
        },

        /**
         * Converts a flat querystring into an object literal
         *
         */
        queryStringToProp: function(args) {
            args = this.trim(args, '&\?#');

            var parts = args.split('&');
            var output = {};

            var key;
            var value;
            var equalsSegments;
            var lim = parts.length;
            for (var i=0,l=lim; i<l; i++) {
                equalsSegments = parts[i].split('=');
                key = decodeURIComponent(equalsSegments.shift());
                value = equalsSegments.join("=");
                output[key] = decodeURIComponent(value);
            }
            return output;
        },

        /**
         * Extracts the fragment identifier value.
         */
        getHash: function(){
        var hashPos = window.location.href.indexOf('#');

        if (hashPos == -1) {
            return "";
        }

        var qPos = window.location.href.indexOf('?', hashPos);

        if (qPos != -1)
            return window.location.href.substr(qPos);

        return window.location.href.substr(hashPos);
        },

        /**
         * This was ported, rewritten a bit and greatly simplified from the
         * same method in the old Calendar object we used to use.
         * TODO - it is only here temporarily, and we should continue trying to
         * kill it.
         */
        parseDate : function(str, fmt) {

            if ((!str) || (!str.indexOf) || (str.indexOf("mm")==0)) return null;

            var y = 0;
            var m = -1;
            var d = 0;
            var a = str.split(/\W+/);
            var b = fmt.match(/%./g);
            var i = 0, j = 0;
            var hr = 0;
            var min = 0;
            var sec = 0;

            for (i = 0; i < a.length; ++i) {
                if (!a[i])
                    continue;
                switch (b[i]) {
                    case "%d":
                        d = parseInt(a[i], 10);
                        break;

                    case "%m":
                        m = parseInt(a[i], 10) - 1;
                        break;

                    case "%Y":
                    case "%y":
                        y = parseInt(a[i], 10);
                        (y < 100) && (y += (y > 29) ? 1900 : 2000);
                        break;

                    case "%H":
                        hr = parseInt(a[i], 10);
                        break;

                    case "%M":
                        min = parseInt(a[i], 10);
                        break;

                    case "%S":
                        sec = parseInt(a[i], 10);
                        break;

                    default:
                        break;
                }
            }
            if (y != 0 && m != -1 && d != 0) {
                var ourDate = new Date(y, m, d, hr, min, sec);
                return ourDate;
            } else {
                //this.logger.warn('unable to parse date "' + str + '" into "' + fmt + '"');
                return false;
            }
        },
        /**
         * Given a timezone offset in minutes, and  a JS Date object,
         * returns the delta in milliseconds, of the two timezones.
         * Note that this will include the offset contributions from DST for both.
         */
        getTimezoneOffsetDelta: function(serverOffsetThen, d) {
            if (!Splunk.util.isInt(serverOffsetThen)) {
                return 0;
            }
            // what JS thinks the timezone offset is at the time given by d. This WILL INCLUDE DST
            var clientOffsetThen = d.getTimezoneOffset() * 60;
            // what splunkd told is the actual timezone offset.
            serverOffsetThen     = serverOffsetThen * -60;

            return 1000 * (serverOffsetThen - clientOffsetThen);
        },

        getEpochTimeFromISO: function(isoStr) {
            // lazily init the regex so we only do it only if necessary and only once.
            if (!this._isoTimeRegex) {
                // Nobody doesnt like ISO.
                this._isoTimeRegex = /([\+\-])?(\d{4,})(?:(?:\-(\d{2}))(?:(?:\-(\d{2}))(?:(?:[T ](\d{2}))(?:(?:\:(\d{2}))(?:(?:\:(\d{2}(?:\.\d+)?)))?)?(?:(Z)|([\+\-])(\d{2})(?:\:(\d{2}))?)?)?)?)?/;
            }
            var m = this._isoTimeRegex.exec(isoStr);
            // put it into a string form that JS Date constructors can actually deal with.

            // Being Super Careful: calling substring on undefined variable
            // here throws an exception that kills the stack but doesnt
            // appear in firebug nor even in the Error Console.
            var seconds, milliseconds;
            if (m[7]) {
                seconds = m[7].substring(0,2);
                // Note this includes the period.  ie ".003"
                millisecondsStr = m[7].substring(2);
            } else {
                millisecondsStr = "";
            }
            var offset = eval(m[9] + (60*m[10] + parseInt(m[11], 10)));

            var str = sprintf("%s/%s/%s %s:%s:%s", m[3], m[4], m[2], m[5], m[6], seconds);
            // its still wrong, because JS will interpret this time in localtime,
            // AND if you give IE the timezone part of the string, it passes out in its own vomit.
            var t = new Date(str);

            // so we patch it.
            t.setTime(t.getTime() + this.getTimezoneOffsetDelta(offset, t));
            var startTime = t.getTime() / 1000;

            return startTime + millisecondsStr;
        },

        getConfigValue: function(configKey, optionalDefault) {
            if (window.$C && window.$C.hasOwnProperty(configKey)) return window.$C[configKey];
            else {
                if (typeof optionalDefault != 'undefined') { // ensure optionalDefault can be set to 'false'
                    // util.logger will have been swapped out by the Logger when Logger
                    // has already been setup, but still works when its not.

                    //this.logger.debug('getConfigValue - ' + configKey + ' not set, defaulting to ' + optionalDefault);
                    return optionalDefault;
                }

                throw new Error('getConfigValue - ' + configKey + ' not set, no default provided');
            }
        },

        /**
         * Returns a proper path that is relative to the current appserver location.
         * This is critical to ensure that we are proxy compatible. This method
         * takes 1 or more arguments, which will all be stiched together in sequence.
         *
         * Ex: make_url('search/job'); // "/splunk/search/job"
         * Ex: make_url('/search/job'); // "/splunk/search/job"
         * Ex: make_url('/search', '/job'); // "/splunk/search/job"
         * Ex: make_url('/search', '/job', 1234); // "/splunk/search/job/1234"
         *
         * Static paths are augmented with a cache defeater
         *
         * Ex: make_url('/static/js/foo.js'); // "/splunk/static/@12345/js/foo.js"
         * Ex: make_url('/static/js/foo.js'); // "/splunk/static/@12345.1/js/foo.js"
         *
         * @param path {String} The relative path to extend
         *
         * TODO: lots of fancy URL munging
         *
         */
        make_url: function() {
            var output = '', seg, len;
            for (var i=0,l=arguments.length; i<l; i++) {
                seg = arguments[i].toString();
                len = seg.length;
                if (len > 1 && seg.charAt(len-1) == '/') {
                    seg = seg.substring(0, len-1);
                }
                if (seg.charAt(0) != '/') {
                    output += '/' + seg;
                } else {
                    output += seg;
                }
            }

            // augment static dirs with build number
            if (output!='/') {
                var segments = output.split('/');
                var firstseg = segments[1];
                if (firstseg=='static' || firstseg=='modules') {
                    var postfix = output.substring(firstseg.length+2, output.length);
                    output = '/'+firstseg+'/@' + window.$C['BUILD_NUMBER'];
                    if (window.$C['BUILD_PUSH_NUMBER']) output += '.' + window.$C['BUILD_PUSH_NUMBER'];
                    if (segments[2] == 'app')
                        output += ':'+this.getConfigValue('APP_BUILD', 0);
                    output += '/' + postfix;
                }
            }

            var root = Splunk.util.getConfigValue('MRSPARKLE_ROOT_PATH', '/');
            var locale = Splunk.util.getConfigValue('LOCALE', 'en-US');
            if (root == '' || root == '/') {
                return '/' + locale + output;
            } else {
                return root + '/' + locale + output;
            }
        },

        /**
         * Given a path and a dictionary of options, builds a qualified query string.
         *
         * @param uri {String} required; path to endpoint. eg. "search/jobs"
         * @param options {Object} key / value par of query params eg. {'foo': 'bar'}
         */
        make_full_url: function(url, options) {
            url = this.make_url(url);
            if (options) url = url + '?' + this.propToQueryString(options);
            return url;
        },

        /**
         * Redirects user to a new page.
         *
         * @param uri {String} required
         * @param options {Object} containing parameters like:
         *         sid => attaches optional sid in valid format
         *         s => attaches optional saved search name
         *         q => attaches optional search string in valid format
         *
         *         Example:
         *             util.redirect_to('app/core/search', {
         *                 'sid' : 1234,
         *                 'foo' : 'bar'
         *             });
         *
         *             redirects to 'splunk/app/core/search?sid=1234&foo=bar'
         * @param windowObj {Window Object} an optional window object to target the location change
         * @param focus {Boolean} if true, focus is called on windowObj
         */
        redirect_to: function(uri, options, windowObj, focus) {
            uri = this.make_full_url(uri, options);
            if (!windowObj) windowObj = window;
            windowObj.document.location = uri;
            if (focus && windowObj.focus) windowObj.focus();
            return;
        },

        /**
         * Returns the current app name (not label).
         */
        getCurrentApp: function() {
            return $(document.body).attr("s:app") || 'UNKNOWN_APP';
        },

        /**
         * Returns the current view name (not label).
         */
        getCurrentView: function() {
            return $(document.body).attr("s:view") || 'UNKNOWN_VIEW';
        },
        /**
         * Returns the current 'displayView' name if it differs from the view name, else returns the current view name.
         */
        getCurrentDisplayView: function() {
            return $(document.body).attr("s:displayview") || this.getCurrentView();
        },
        getAutoCancelInterval: function() {
            var interval = $(document.body).attr("s:autoCancelInterval");
            if (!interval) {
                this.logger.error("no autoCancelInterval found. Returning 0");
                interval = 0;
            }
            return interval;
        },
        /**
         * Returns the current viewstate ID as requested via the URI parameter
         * 'vs'.  This is embedded in the <body> tag.
         *
         * If no viewstate has been requested, then all parameter writes will
         * go to the default sticky state, keyed by the reserved token '_current'.
         *
         * NOTE: viewstate is also provided to the modules through context resurrection,
         * And that being the case, the value of this is marginal.
         */
        //getCurrentViewState: function() {
        //    return $(document.body).attr("s:viewstateid") || null;
        //},

        /**
         * Returns a dictionary of all the app, view, and saved search config
         * data that is specified in the current view.  Ex:
         * {
         *    'view': {"template": "builder.html", "displayView": "report_builder_display", "refresh": null, "label": "Display Report", "viewstateId": "*:ft10i02z", "onunloadCancelJobs": false, "id": "report_builder_display"},
         *    'app': {"id": "search", "label": "Search"},
         *    'savedSearch': {"search": "johnvey | timechart count", "name": "jvreport3", "vsid": "*:ft10i02z", "qualifiedSearch": "search  johnvey | timechart count"}
         * }
         */
        getCurrentViewConfig: function() {
            return $.extend({}, Splunk.ViewConfig);
        },

        /**
         * Return the path without the localization segment.
         */
        getPath: function(path) {
            if (path === undefined) {
                path = document.location.pathname;
            }
            var locale = this.getConfigValue('LOCALE').toString();

            // if there is no way to figure out the locale, just return pathname
            if (!this.getConfigValue('LOCALE') || path.indexOf(locale) == -1) {
                return path;
            }
            var start = locale.length + path.indexOf(locale);
            return path.slice(start);
        },

        /**
         * Get the cumulative offsetTop for an element.
         *
         * @param {Object} element A DOM element.
         */
        getCumlativeOffsetTop: function(element){
            if(!element) return 0;
            return element.offsetTop + this.getCumlativeOffsetTop(element.offsetParent);
        },

        /**
         * Get the cumulative offsetLeft for an element.
         *
         * @param {Object} element A DOM element.
         */
        getCumlativeOffsetLeft: function(element){
            if(!element) return 0;
            return element.offsetLeft + this.getCumlativeOffsetLeft(element.offsetParent);
        },

        /**
         * Retrieve the amount of content that has been hidden by scrolling down.
         *
         * @type Number
         * @return 0-n value.
         */
        getPageYOffset: function(){
            var pageYOffset = 0;
            if(window.pageYOffset){
                pageYOffset = window.pageYOffset;
            }else if(document.documentElement && document.documentElement.scrollTop){
                pageYOffset = document.documentElement.scrollTop;
            }
            return pageYOffset;
        },

        /**
         * Retrieve the inner dimensions of the window. This does not work in jQuery.
         *
         * @type Object
         * @return An object literal having width and height attributes.
         */
        getWindowDimensions: function(){
            return {
                width:(!isNaN(window.innerWidth))?window.innerWidth:document.documentElement.clientWidth||0,
                height:(!isNaN(window.innerHeight))?window.innerHeight:document.documentElement.clientHeight||0
            };
        },

        /**
         * Retrieve the computed style from a specified element.
         *
         * @param el
         * @param styleProperty
         * @return The computed style value.
         * @type String
         */
        getComputedStyleHelper: function(el, styleProperty){
            if(el.currentStyle){
                return el.currentStyle[styleProperty];
            }else if(window.getComputedStyle){
                var cssProperty = styleProperty.replace(/([A-Z])/g, "-$1").toLowerCase();
                var computedStyle = window.getComputedStyle(el, "");
                return computedStyle.getPropertyValue(cssProperty);
            }else{
                return "";
            }
        },

        /**
         * Retrieve a GET parameter from the window.location. Type casting is not performed.
         * @param {String} p The param value to retrieve.
         * @param {String} s Optional string to search through instead of window.location.search
         * @return {String || null} The string value or null if it does not exist.
         */
        getParameter: function(p, s){
            s = s || window.location.search;
            if(!s){
                return null;
            }
            if(!(s.indexOf(p+'=')+1)){
                return null;
            }
            return s.split(p+'=')[1].split('&')[0];
        },

        /**
         * Take an RGB value and convert to HEX equivalent.
         *
         * @param {String} rgb A RGB value following rgb(XXX, XXX, XXX) convention.
         * @type String
         * @return A HEX equivalent for a given RGB value with a leading '#' character.
         */
        getHEX: function(rgb){
            var parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            var hex = (parts[1]<<16|parts[2]<<8|parts[3]).toString(16);
            return "#"+Array(6-hex.length).concat([hex]).toString().replace(/,/g, 0);
        },

        /**
         * Take an arbitrary RGB or HEX in long or shorthand notation and normalize to standard long HEX form with leading '#' character.
         *
         * @param {String} color A RGB or HEX color value in long or short notation.
         * @type String or null
         * @return A fully qualified 6 character hexadecimal value or with leading '#' character or null if it can't be processed.
         */
        normalizeColor: function(color){
            normalizedColor = null;
            if(color.charAt(0)==="#"){
                if(color.length===4){
                    normalizedColor = color + color.charAt(1) + color.charAt(2) + color.charAt(3);
                }else{
                    normalizedColor = color;
                }
            }else{
                try{
                    normalizedColor = this.getHEX(color);
                }catch(e){}
            }
            return normalizedColor;
        },

        /**
         * innerHTML substitute when it is not fast enough.
         * @param {HTMLObject} target The target DOM element to replace innerHTML content with.
         * @param {String} innerHTML The innerHTML string to add.
         * @return {HTMLObject} The reference to the target DOM element as it may have been cloned and removed.
         */
        turboInnerHTML: function(target, innerHTML) {
            /*@cc_on //innerHTML is faster for IE
                target.innerHTML = innerHTML;
                return target;
            @*/
            var targetClone = target.cloneNode(false);
            targetClone.innerHTML = innerHTML;
            target.parentNode.replaceChild(targetClone, target);
            return targetClone;
        },
        normalizeBoolean: function(test, strictMode) {

            if (typeof(test) == 'string') {
                test = test.toLowerCase();
            }

            switch (test) {
                case true:
                case 1:
                case '1':
                case 'yes':
                case 'on':
                case 'true':
                    return true;

                case false:
                case 0:
                case '0':
                case 'no':
                case 'off':
                case 'false':
                    return false;

                default:
                    if (strictMode) throw TypeError("Unable to cast value into boolean: " + test);
                    return test;
            }
        },
        getCommaFormattedNumber: function(nStr) {
            nStr += '';
            var x = nStr.split('.');
            var x1 = x[0];
            var x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },


        reLTrim: /^[\s\t\r\n]+/,
        reLTrimCommand: /^[\s\t\r\n\|]+/,
        reRNormalize: /[\s\t\r\n]+$/,

        /**
         * Returns a fully qualified search string by prepending the 'search'
         * command of unqualified searches.  This method deems strings as unqualified
         * if it does not start with a | or 'search '
         *
         * @param {boolean} isUserEntered Indicates if 'q' is expected to be unqualified
         */
        addLeadingSearchCommand: function(q, isUserEntered) {
            var workingQ = '' + q;
            workingQ = workingQ.replace(this.reLTrim, '').replace(this.reRNormalize, ' ');
            if (workingQ.substring(0, 1) == '|') {
                return q;
            }

            // this is specific to the case where searchstring = 'search ',
            // which we conservatively assume does not constitute a search command
            if (!isUserEntered
                && (workingQ.substring(0, 7) == 'search ' && workingQ.length > 7))
            {
                return q;
            }
            return 'search ' + workingQ;
        },

        /**
         * Returns an unqualified search string by removing any leading 'search '
         * command.  This method does a simple search at the beginning of the
         * search.
         */
        stripLeadingSearchCommand: function(q) {
            var workingQ = '' + q;
            workingQ = workingQ.replace(this.reLTrimCommand, '');
            if (workingQ.substring(0, 7) == 'search ') {
                return workingQ.substring(7).replace(this.reLTrimCommand, '');
            }
            return q;
        },

        /**
         * Deserializes a string into a field list.
         */
        stringToFieldList: function(strList) {
            if (typeof(strList) != 'string' || !strList) return [];
            var items = [];
            var field_name_buffer = [];
            var inquote = false;
            var str = $.trim(strList);
            for (var i=0,j=str.length; i<j; i++) {
                if (str.charAt(i) == '\\') {
                    var nextidx = i+1;
                    if (j > nextidx && (str.charAt(nextidx) == '\\' || str.charAt(nextidx) == '"')) {
                        field_name_buffer.push(str.charAt(nextidx));
                        i++;
                        continue;
                    } else {
                        field_name_buffer.push(str.charAt(i));
                        continue;
                    }
                }

                if (str.charAt(i) == '"') {
                    if (!inquote) {
                        inquote = true;
                        continue;
                    } else {
                        inquote = false;
                        items.push(field_name_buffer.join(''));
                        field_name_buffer = [];
                        continue;
                    }
                }

                if ((str.charAt(i) == ' ' || str.charAt(i) == ',') && !inquote) {
                    if (field_name_buffer.length > 0) {
                        items.push(field_name_buffer.join(''));
                    }
                    field_name_buffer = [];
                    continue;
                }
                field_name_buffer.push(str.charAt(i));
            }
            if (field_name_buffer.length > 0) items.push(field_name_buffer.join(''));
            return items;
        },


        /**
         * Serializes a field list array into a string.
         */
        _sflQuotable: /([\\",\s])/,
        _sflEscapable: /([\\"])/g,
        fieldListToString: function(fieldArray) {
            if (!fieldArray) return '';
            var output = [];
            for (var i=0,L=fieldArray.length; i<L; i++) {
                var v = $.trim(fieldArray[i]);
                if (v != '') {
                    // Escape any char with the backslash.
                    if (v.search(this._sflEscapable) > -1) {
                        v = v.replace(this._sflEscapable, "\\$1");
                    }

                    // Quote the entire string if a backslash, comma, space
                    // or double quote is present.
                    if (v.search(this._sflQuotable) > -1) {
                        v = ['"', v, '"'].join('');
                    }

                    output.push(v);
                }
            }
            return output.join(',');
        },
        searchEscape: function(str) {
        if (!str.match(/[\s\,=|\[\]\"]/))
            return str;

        return '"' + str.replace(/(\"|\\)/g, "\\$1") + '"';
        },

        /**
         * Compare the likeness of two objects. Please use with discretion.
         */
        objectSimilarity: function(obj1, obj2){
                if(obj1 instanceof Array && obj2 instanceof Array){
                        if(obj1.length!==obj2.length){
                           return false;
                        }else{
                            for(var i=0; i<obj1.length; i++){
                                if(!this.objectSimilarity(obj1[i], obj2[i])){
                                    return false;
                                }
                            }
                        }
                }else if(obj1 instanceof Object && obj2 instanceof Object){
                    if(obj1!=obj2){
                        for(var j in obj2){
                            if(!obj1.hasOwnProperty(j)){
                                return false;
                            }
                        }
                        for(var k in obj1){
                            if(obj1.hasOwnProperty(k)){
                                if(obj2.hasOwnProperty(k)){
                                    if(!this.objectSimilarity(obj1[k], obj2[k])){
                                        return false;
                                    }
                                }else{
                                    return false;
                                }
                            }
                        }
                    }
                }else if(typeof(obj1)==="function" && typeof(obj2)==="function"){
                    if(obj1.toString()!==obj2.toString()){
                        return false;
                    }
                }else if(obj1!==obj2){
                    return false;
                }
                return true;
        },
        /**
         * Stop watch class.
         */
        StopWatch: function(){
            var self = this,
                startTime = null,
                stopTime = null,
                times = [];
            var isSet = function(prop){
                return (prop==null)?false:true;
            };
            var isStarted = function(){
                return isSet(startTime);
            };
            var isStopped = function(){
                return isSet(stopTime);
            };
            var softReset = function(){
                startTime = null;
                stopTime = null;
            };
            self.start = function(){
                if(isStarted()){
                   throw new Error("cannot call start, start already invoked.");
                }
                startTime = new Date();
            };
            self.stop = function(){
               if(!isStarted()){
                   throw new Error("cannot call stop, start not invoked.");
               }
               if(isStopped()){
                   throw new Error("cannot call stop, stop already invoked.");
               }
               stopTime = new Date();
               time = stopTime - startTime;
               times.push(time);
            };
            self.pause = function(){
                if(!isStarted()){
                   throw new Error("cannot call pause, start not invoked.");
                }
                if(isStopped()){
                   throw new Error("cannot call pause, stop already invoked.");
                }
                self.stop();
                softReset();
            };
            self.reset = function(){
                softReset();
                times = [];
            };
            self.time = function(){
                var total = 0;
                for(i=0; i<times.length; i++){
                    total += times[i];
                }
                if(isStarted() && !isStopped()){
                    total += (new Date() - startTime);
                }
                return total/1000;
            };
        },

        isInt: function(num) {
            return num!=='' && !isNaN(parseInt(num, 10)) && parseInt(num, 10)==(num/1);
        },

        /**
         * Returns a string trimmed to maxLength by removing characters from the
         * middle of the string and replacing with ellipses.
         *
         * Ex: Splunk.util.smartTrim('1234567890', 5) ==> '12...890'
         *
         */
        smartTrim: function(string, maxLength) {
            if (!string) return string;
            if (maxLength < 1) return string;
            if (string.length <= maxLength) return string;
            if (maxLength == 1) return string.substring(0,1) + '...';

            var midpoint = Math.ceil(string.length / 2);
            var toremove = string.length - maxLength;
            var lstrip = Math.ceil(toremove/2);
            var rstrip = toremove - lstrip;
            return string.substring(0, midpoint-lstrip) + '...' + string.substring(midpoint+rstrip);
        },
        _tokenDiscoverer : /\$([^$]+)\$/g,

        /**
         * Finds all instances of any string looking like "$foo$" anywhere in the given object literal.
         * returns an array of all the distinct values it found, eg 'foo'.
         * if a single string value in the struct has two, like "$foo$ $bar$", duplicates are removed.
         * This will also discover any number of "$foo$" substrings that are found within the
         * keys of object literals, not just the values.
         */
        discoverReplacementTokens: function(fragment) {
            var keys = [];
            var tokenDiscoverer = Splunk.util._tokenDiscoverer;
            var keysToAdd;

            if (typeof fragment == 'string') {
                if (fragment.match(tokenDiscoverer)) {
                    keysToAdd = fragment.match(tokenDiscoverer);
                    // TODO - im sure there's a way to write the re so that it doesnt include the '$' chars but im moving on.
                    for (var i=0; i<keysToAdd.length; i++ ) {
                        keysToAdd[i] = keysToAdd[i].substring(1, keysToAdd[i].length-1);
                    }
                    return keysToAdd;
                }
                return [];
            }
            else if (typeof fragment == "function") {
                return [];
            }

            // then fragment is not a string.
            for (var key in fragment) {
                keysToAdd = [];
                keysToAdd = Splunk.util.discoverReplacementTokens(fragment[key]);

                // up until now we've only looked at values. We have to also discover keys in the key itself..
                var matchesInTheKeyItself = key.match(tokenDiscoverer) || [];
                for (var j=0; j<matchesInTheKeyItself.length; j++) {
                    // TODO - im sure there's a way to write the re so that it doesnt include the '$' chars but im moving on.
                    keysToAdd.push(matchesInTheKeyItself[j].substring(1, matchesInTheKeyItself[j].length-1));
                }
                // check against duplicates.
                for (var k=0; k<keysToAdd.length; k++) {
                    if (keys.indexOf(keysToAdd[k]) ==-1) {
                        keys.push(keysToAdd[k]);
                    }
                }
            }
            return keys;
        },

        /**
         * walked through the entirety of fragment to all levels of nesting
         *  and will replace all matches of the given single regex with the given
         *  single value.
         *  replacement will occur in both keys and values.
         */
        replaceTokens: function(fragment, reg, value) {
            if (typeof fragment == 'string') {
                if (fragment.match(reg)) {
                    fragment = fragment.replace(reg, value);
                }
                return fragment;
            }
            else if (typeof fragment == "function") {
                return fragment;
            }
            // watch out for infinite loops.  We make all changes to the array after iteration.

            var keysToRename = {};
            for (var key in fragment) {
                // recurse
                if (typeof fragment[key] == 'object') {
                    Splunk.util.replaceTokens(fragment[key], reg, value);
                }
                // we have hit a string value.
                else if (typeof fragment[key] == 'string' && fragment[key].match(reg)) {
                    fragment[key] = fragment[key].replace(reg, value);
                }
                // now that the value is changed we check the key itself
                if (key.match(reg)) {
                    // mark this to be changed after we're out of the iterator
                    keysToRename[key] = key.replace(reg, value);
                }
            }
            for (oldKey in keysToRename) {
                var newKey = keysToRename[oldKey];
                fragment[newKey] = fragment[oldKey];
                delete(fragment[oldKey]);
            }
            return fragment;
        },


        getServerTimezoneOffset: function() {
            return Splunk.util.getConfigValue('SERVER_TIMEZONE_OFFSET');
        },

        // constants used by Modules as well as ModuleLoader, to denote runtime states
        // WAITING_FOR_INITIALIZATION and WAITING_FOR_HIERARCHY mean that the Modules
        // are still being loaded by ModuleLoader.
        // the remaining two states are relevant BOTH during page load, and in general
        // at runtime thereafter.
        // whether or not the page is still loading is an orthogonal piece of information,
        // and modules can check it on demand by calling Module.isPageLoadComplete().
        moduleLoadStates: {
            WAITING_FOR_INITIALIZATION   : 1,  // waiting for INITIALIZATION
            WAITING_FOR_HIERARCHY   : 2,  // waiting for HIERARCHY
            WAITING_FOR_CONTEXT: 6,
            HAS_CONTEXT         : 7
        },

        /**
         * Returns a wait time (sec) based on the current time elapsed, as mapped
         * onto a cubic easing function.
         *
         * elapsed_time: number of seconds that have elapsed since the first
         *     call to getRetryInterval()
         *
         * min_interval: minimum return value of this method; also the interval
         *     returned when elapsed_time = 0
         *
         * max_interval: maximum return value of this method; also the interval
         *     returned when elapsed_time >= clamp_time
         *
         * clamp_time: total duration over which to calculate a wait time; while
         *     elapsed_time < clamp_time, the return value will be less than
         *     max_interval; when elapsed_time >= clamp_time, the return value will
         *     always be max_interval
         *
         */
        getRetryInterval: function(elapsed_time, min_interval, max_interval, clamp_time) {
            if (elapsed_time >= clamp_time) return parseFloat(max_interval);
            return Math.min(max_interval * Math.pow(elapsed_time/parseFloat(clamp_time), 3) + min_interval, max_interval);
        },


        /**
         * Returns a string with HTML entities escaped.
         * NOTE: IE will not interpret ""&apos;", opting to just render it encoded
         *      we use the alternate decimal version instead
         *
         */
        escapeHtml: function(input) {
            return (""+input).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        /**
         * Returns a string with backslashes escaped
         */
        escapeBackslash: function(input) {
            return (""+input).replace(/\\/g, '\\\\');
        },

        /**
         * From http://blog.stevenlevithan.com/archives/faster-trim-javascript
         * profiler shows this is much faster than the previous implementation in both IE and Firefox.
         *
         * @param {String} str The string to trim.
         * @param {String} (Optional) delim The characters to remove from the start/end of the string.
         *
         * @type String
         * @return A trimmed string.
         */
        trim: function(str, delim) {
            if (delim) return str.replace(new RegExp("^[\\s" + delim + "]+"),'').replace(new RegExp("[\\s" + delim + "]+$"), '');
            else return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },

        focusFirstField: function(popup){ //this puts the focus on the first form element whether an input or select dropdown
            var firstInput = $(":input:visible:enabled:first",popup),
            firstSelect = $("select:visible:enabled:first",popup),
            firstInputOffset = (firstInput.length) ? firstInput.offset().top : false,
            firstSelectOffset = (firstSelect.length) ? firstSelect.offset().top : false,
            firstElem = firstInput;

            if(firstInputOffset && firstSelectOffset){
                if(firstSelectOffset < firstInputOffset){
                    firstElem = firstSelect;
                }
            }
            firstElem.focus();
        }

    };

    /**
     * ----------------------
     * Black magic for Prototype's bind() method which we're still using.
     *
     */
    var $A = function(iterable) {
      if (!iterable) return [];
      if (iterable.toArray) {
        return iterable.toArray();
      } else {
        var results = [];
        for (var i = 0, length = iterable.length; i < length; i++)
          results.push(iterable[i]);
        return results;
      }
    };

    Function.prototype.bind = function() {
      var __method = this, args = $A(arguments), object = args.shift();
      return function() {
        return __method.apply(object, args.concat($A(arguments)));
      };
    };
    /**
     * ----------------------
     * Prototype augmentation.
     * TODO - find another way.
     *
     */

    if (!String.prototype.repeat) {
        String.prototype.repeat = function(count) {
            return new Array(count+1).join(this);
        };
    }

    if (!String.prototype.reverse) {
        String.prototype.reverse = function() {
            return this.split('').reverse().join('');
        };
    }

    if (!String.prototype.rsplit) {
        String.prototype.rsplit = function(sep, limit) {
            var sp = this.split(sep);
            if (limit && sp.length > limit) {
                var r = [];
                for(var i=0; i<limit; i++)
                    r[i] = sp[sp.length-limit+i];
                return r;
            }
            return sp;
        };
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(search, fromIndex) {
            if (!fromIndex) fromIndex = 0;
            for(var i=0; i<this.length; i++) {
                if (this[i] === search)
                    return i;
            }
            return -1;
        };
    }

    if (!Array.prototype.extend) {
        Array.prototype.extend = function(arr) {
            for(var i=0; i<arr.length; i++)
                this.push(arr[i]);
        };
    }

    /**
    * sprintf routine borrowed from http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_sprintf/
    * Licensed under GPL and MIT licenses
    *
    * Modified by Gareth to add support for Python style argument specifiers:
    * sprintf("Hi %(name)s, welcome to %(application)s", { name: 'Gareth', app: 'Splunk })
    * Objects holding named arguments can also implement a python style __getitem__ method to return dynamic values
    */
    function sprintf( ) {
        // Return a formatted string
        //
        // +    discuss at: http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_sprintf/
        // +       version: 810.1015
        // +   original by: Ash Searle (http://hexmen.com/blog/)
        // + namespaced by: Michael White (http://getsprink.com)
        // +    tweaked by: Jack
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // *     example 1: sprintf("%01.2f", 123.1);
        // *     returns 1: 123.10

        var regex = /%%|%(\d+\$)?(\([^)]+\))?([-+#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegEG])/g;
        var a = arguments;
        var i = 0;
        var format = a[i];
        i++;

        // pad()
        var pad = function(str, len, chr, leftJustify) {
            var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str;
        };

        // justify()
        var justify = function(value, prefix, leftJustify, minWidth, zeroPad) {
            var diff = minWidth - value.length;
            if (diff > 0) {
                if (leftJustify || !zeroPad) {
                    value = pad(value, minWidth, ' ', leftJustify);
                } else {
                    value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
                }
            }
            return value;
        };

        // formatBaseX()
        var formatBaseX = function(value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
            // Note: casts negative numbers to positive ones
            var number = value >>> 0;
            prefix = prefix && number && {'2': '0b', '8': '0', '16': '0x'}[base] || '';
            value = prefix + pad(number.toString(base), precision || 0, '0', false);
            return justify(value, prefix, leftJustify, minWidth, zeroPad);
        };

        // formatString()
        var formatString = function(value, leftJustify, minWidth, precision, zeroPad) {
            if (precision != null) {
                value = value.slice(0, precision);
            }
            return justify(value, '', leftJustify, minWidth, zeroPad);
        };

        // finalFormat()
        var doFormat = function(substring, valueIndex, valueName, flags, minWidth, _, precision, type) {
            if (substring == '%%') return '%';

            // parse flags
            var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false;
            var flagsl = flags.length;
            for (var j = 0; flags && j < flagsl; j++) switch (flags.charAt(j)) {
                case ' ': positivePrefix = ' '; break;
                case '+': positivePrefix = '+'; break;
                case '-': leftJustify = true; break;
                case '0': zeroPad = true; break;
                case '#': prefixBaseX = true; break;
                default: break;
            }

            // parameters may be null, undefined, empty-string or real valued
            // we want to ignore null, undefined and empty-string values
            if (!minWidth) {
                minWidth = 0;
            } else if (minWidth == '*') {
                minWidth = +a[i];
                i++;
            } else if (minWidth.charAt(0) == '*') {
                minWidth = +a[minWidth.slice(1, -1)];
            } else {
                minWidth = +minWidth;
            }

            // Note: undocumented perl feature:
            if (minWidth < 0) {
                minWidth = -minWidth;
                leftJustify = true;
            }

            if (!isFinite(minWidth)) {
                throw new Error('sprintf: (minimum-)width must be finite');
            }

            if (!precision) {
                precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void(0);
            } else if (precision == '*') {
                precision = +a[i];
                i++;
            } else if (precision.charAt(0) == '*') {
                precision = +a[precision.slice(1, -1)];
            } else {
                precision = +precision;
            }

            // grab value using valueIndex if required?
            var value;
            if (valueName) {
                valueName = valueName.substr(1, valueName.length-2);
                value = a[1].__getitem__ ? a[1].__getitem__(valueName) : a[1][valueName];
            } else {
                if (valueIndex){
                    value = a[valueIndex.slice(0, -1)];
                }
                else
                {
                    value = a[i];
                    i++;
                }
            }

            var number;
            var prefix;
            switch (type) {
                case 's': return formatString(String(value), leftJustify, minWidth, precision, zeroPad);
                case 'c': return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
                case 'b': return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'o': return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'x': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'X': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
                case 'u': return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'i':
                case 'd': {
                            number = parseInt(+value, 10);
                            prefix = number < 0 ? '-' : positivePrefix;
                            value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                            return justify(value, prefix, leftJustify, minWidth, zeroPad);
                        }
                case 'e':
                case 'E':
                case 'f':
                case 'F':
                case 'g':
                case 'G':
                            {
                            number = +value;
                            prefix = number < 0 ? '-' : positivePrefix;
                            var method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                            var textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                            value = prefix + Math.abs(number)[method](precision);
                            return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
                        }
                default: return substring;
            }
        };

        return format.replace(regex, doFormat);
    }// }}}
})();