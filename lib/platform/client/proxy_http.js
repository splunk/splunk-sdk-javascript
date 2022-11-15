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
    var Http    = require('../../http');
    var utils   = require('../../utils');
    var SDK_VERSION = require('../../../package.json').version;

    var root = exports || this;
    
    var getHeaders = function(headersString) {
        var headers = {};
        var headerLines = headersString.split("\n");
        for(var i = 0; i < headerLines.length; i++) {
            if (utils.trim(headerLines[i]) !== "") {
                var headerParts = headerLines[i].split(": ");
                headers[headerParts[0]] = headerParts[1];
            }
        }

        return headers;
    };
    
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License
    function parseUri (str) {
        var o   = parseUri.options,
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;

        while (i--) {
            uri[o.key[i]] = m[i] || "";
        }

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) {
                uri[o.q.name][$1] = $2;
            }
        });

        return uri;
    }

    parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };
    
    var specials = /[.*+?|()\[\]{}\\$\^]/g; // .*+?|()[]{}\$^
    var escape = function(str) {
        str = str || "";
        return str.replace(specials, "\\$&");
    };

    root.ProxyHttp = Http.extend({
        init: function(prefix) {
            this.prefix = prefix;
            this._super();
        },

        makeRequest: function(url, message) {
            // Add our original destination to to headers,
            // as some proxy implementations would rather
            // use this.
            message.headers["X-ProxyDestination"] = url;
            message.headers["Splunk-Client"] = "splunk-sdk-javascript/" + SDK_VERSION;
            
            // Need to remove the hostname from the URL
            var parsed = parseUri(url);
            var prefixToRemove = "" + (parsed.protocol ? parsed.protocol : "") + "://" + parsed.authority;
            url = url.replace(new RegExp(escape(prefixToRemove), "i"), "");
            
            // Now, we prepend the prefix
            url = this.prefix + url;
            var that = this;
            var complete_response;
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body || "",
                timeout: Math.max(message.timeout, message.response_timeout) || 0,
                dataType: "text",
                success: function(data, error, res) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    complete_response = that._buildResponse(error, response, data);
                    return Promise.resolve(complete_response);
                },
                error: function(res, data, error) {
                    // Format abort response
                    if(data === "timeout"){
                        let response = { headers: {}, statusCode: "abort", body: {}};
                        complete_response = that._buildResponse("abort",response,{});
                        return Promise.reject(complete_response);
                    }
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders())
                    };

                    if (data === "abort") {
                        response.statusCode = "abort";
                        res.responseText = "{}";
                    }
                    var json = res.responseText;

                    complete_response = that._buildResponse(error, response, json);
                    
                    return Promise.reject(complete_response);
                }
            };
            
            return $.ajax(params).then((xhr)=>{
                return complete_response;
            }).catch((err)=>{
                return complete_response;
            });
        },

        makeRequestAsync: function(url, message) {
            // Add our original destination to to headers,
            // as some proxy implementations would rather
            // use this.
            message.headers["X-ProxyDestination"] = url;
            message.headers["Splunk-Client"] = "splunk-sdk-javascript/" + SDK_VERSION;

            // Need to remove the hostname from the URL
            var parsed = parseUri(url);
            var prefixToRemove = "" + (parsed.protocol ? parsed.protocol : "") + "://" + parsed.authority;
            url = url.replace(new RegExp(escape(prefixToRemove), "i"), "");
            
            // Now, we prepend the prefix
            url = this.prefix + url;
            
            var that = this;
            var complete_response;
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body || "",
                timeout: Math.max(message.timeout,message.response_timeout) || 0,
                dataType: "text",
                success: function(data, error, res) {
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders()),
                        body: JSON.parse(data)
                    };
                    complete_response = response;
                    return Promise.resolve(complete_response);
                },
                error: function(res, data, error) {
                    // Format abort response
                    if(data === "timeout"){
                        let response = { headers: {}, statusCode: "abort", body: {}};
                        complete_response = that._buildResponse("abort",response,{});
                        return Promise.reject(complete_response);
                    }
                    var response = {
                        statusCode: res.status,
                        headers: getHeaders(res.getAllResponseHeaders()),
                    };
                    
                    if (data === "abort") {
                        response.statusCode = "abort";
                        res.responseText = "{}";
                    }
                    var json = res.responseText;
                    complete_response = that._buildResponse(error, response, json);;
                    
                    return Promise.reject(complete_response);
                }
            };
            
            return $.ajax(params).then((xhr)=>{
                return complete_response;
            }).catch((err)=>{
                return complete_response;
            });
        },

        parseJson: function(json) {
            // JQuery does this for us
            return JSON.parse(json);
        }
    });

    root.SplunkWebHttp = root.ProxyHttp.extend({
        init: function() {
            this._super("/en-US/splunkd/__raw");
        }
    });
})();