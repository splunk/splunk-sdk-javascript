(function() {
    var Class = require('../lib/jquery.class').Class,
        utils = require('../utils/utils'),
        Paths = require('./paths').Paths;

    var root = exports || this;

    // This is a utility function to encode an object into a URI-compliant
    // URI. It will convert objects into '&key=value' pairs, and arrays into
    // `&key=value1&key=value2...'
    var encode = function(params) {
        var encodedStr = "";

        // We loop over all the keys so we encode them.
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                // Only append the ampersand if we already have
                // something encdoed
                if (encodedStr) {
                    encodedStr = encodedStr + "&";
                }
                    
                // Get the value
                var value = params[key];

                // If it's an array, we loop over each value
                // and encode it in the form &key=value[i]
                if (value instanceof Array) {
                    for (var item in value) {
                        encodedStr = encodedStr + key + "=" + encodeURIComponent(item);
                    }
                }
                else {
                    // If it's not an array, we just encode it
                    encodedStr = encodedStr + key + "=" + encodeURIComponent(value);
                }
            }
        };

        return encodedStr;
    };

    // This is our base class for HTTP implementations. It provides the basic 
    // functionality (get/post/delete), as well as a utility function to build
    // a uniform response object.
    //
    // Base classes should only override 'request'.
    root.Http = Class.extend({
        init: function() {
            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get                = utils.bind(this, this.get);
            this.del                = utils.bind(this, this.del);
            this.post               = utils.bind(this, this.post);
            this.request            = utils.bind(this, this.request);
            this._buildResponse     = utils.bind(this, this._buildResponse);
        },

        get: function(url, headers, params, timeout, callback) {
            var url = url + "?" + encode(params);
            var message = {
                method: "GET",
                headers: headers,
                timeout: timeout,  
            };
            this.request(url, message, callback);
        },

        post: function(url, headers, params, timeout, callback) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var message = {
                method: "POST",
                headers: headers,
                timeout: timeout,
                body: encode(params),
            };
            this.request(url, message, callback);
        },

        del: function(url, headers, params, timeout, callback) {
            var url = url + "?" + encode(params);
            var message = {
                method: "DELETE",
                headers: headers,
                timeout: timeout,  
            };

            this.request(url, message, callback);
        },

        request: function(url, message, callback) {
            throw "UNDEFINED FUNCTION - OVERRIDE REQUIRED";  
        },

        _buildResponse: function(error, response, data) {
            // Parse the JSON data and build the OData response
            // object.
            var json = JSON.parse(data);
            var odata = root.ODataResponse.fromJson(json);  

            // Print any messages that came with the response
            root.ODataResponse.printMessages(odata);

            var complete_response = {
                status: (response ? response.statusCode : 0),
                odata: odata,
                error: error,
            };

            return complete_response;
        },
    });

    // Our basic class to represent an OData resposne object.
    root.ODataResponse = Class.extend({
        offset: 0,
        count: 0,
        totalCount: 0,
        messages: [],
        timings: [],
        results: null,

        init: function() {

        },

        isCollection: function() {
            return this.results instanceof Array;
        },
    });

    // A static utility function to convert an object derived from JSON
    // into an ODataResponse
    root.ODataResponse.fromJson = function(json) {
        if (!json || !json.d) {
            console.log('Invalid JSON object passed; cannot parse into OData');
            return null;
        }

        var d = json.d;
        
        var output = new root.ODataResponse();

        // Look for our special keys, and add them to the results
        var prefixedKeys = ['messages', 'offset', 'count', 'timings', 'total_count'];
        for (var i=0; i < prefixedKeys.length; i++) {
            if (d.hasOwnProperty('__' + prefixedKeys[i])) {
                output[prefixedKeys[i]] = d['__' + prefixedKeys[i]];
            }
        }

        if (d.results) {
            output.results = d.results;
        }

        return output;
    };

    // Print any messages that came with the response, as encoded
    // in the ODataResponse.
    root.ODataResponse.printMessages = function(struct) {
        var list = struct.messages || struct.__messages || [];

        if (list) {
            for (var i = 0; i < list.length; i++) {
                var msg = '[SPLUNKD] ' + list[i].text;
                switch (list[i].type) {
                    case 'FATAL':
                    case 'ERROR':
                        console.error(msg);
                        break;
                    case 'WARN':
                        console.warn(msg);
                        break;
                    case 'INFO':
                        console.info(msg);
                        break;
                    case 'HTTP':
                        break;
                    default:
                        console.info('[SPLUNKD] ' + list[i].type + ' - ' + msg);
                        break;
                }
            }
        }

        return list;  
    };

    // Our basic class that stores the context of a specific session, such
    // as login information, host name, port, etc.
    root.Context = Class.extend({
        init: function(http, params) {
            this.http = http;
            this.scheme = params["scheme"] || "https";
            this.host = params["host"] || "localhost";
            this.port = params["port"] || 8000;
            this.username = params["username"] || null;  
            this.password = params["password"] || null;  
            this.owner = params["owner"] || "-";  
            this.namespace = params["namespace"] || "-";  
            this.sessionKey = params["sessionKey"] || "";
            
            // Store our full prefix, which is just combining together
            // the scheme with the host
            this.prefix = this.scheme + "://" + this.host + ":" + this.port + "/en-US/custom/old_english/svc";

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this._headers   = utils.bind(this, this._headers);
            this.fullpath   = utils.bind(this, this.fullpath);
            this.urlify     = utils.bind(this, this.urlify);
            this.get        = utils.bind(this, this.get);
            this.del        = utils.bind(this, this.del);
            this.post       = utils.bind(this, this.post);
            this.login      = utils.bind(this, this.login);
        },

        // Return any session-specific headers (such as authorization).
        _headers: function () {
            return {
                Authorization: "Splunk " + this.sessionKey,
                "X-SessionKey": this.sessionKey,  
            };
        },

        // Convert any partial path into a full path containing the full
        // owner and namespace prefixes if necessary.
        fullpath: function(path) {
            if (utils.startsWith(path, "/")) {
                return path;
            }  

            if (!this.namespace) {
                return "/services/" + path;
            }

            var owner = (this.owner === "*" ? "-" : this.owner);
            var namespace = (this.namespace === "*" ? "-" : this.namespace);

            return "/" + owner + "/" + namespace + "/" + path; 
        },

        // Given any path, this function will turn it into a fully
        // qualified URL, using the current context.
        urlify: function(path) {
            return this.prefix + this.fullpath(path);
        },

        // Authorize to the server and store the given session key.
        login: function(callback) {
            var url = Paths.login;
            var params = { username: this.username, password: this.password };

            this.post(url, params, utils.bind(this, function(response) {
               if (response.status >= 400) {
                   console.log("Error getting login info");
                   callback(false);
                   return;
               }
               else {
                   this.sessionKey = response.odata.results["sessionKey"]; 
                   console.log("Session Key: " + this.sessionKey);
                   callback(true);
               }
            }));
        },

        get: function(path, params, callback) {
            this.http.get(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        del: function(path, params, callback) {
            this.http.del(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },

        post: function(path, params, callback) {
            this.http.post(
                this.urlify(path),
                this._headers(),
                params,
                0,
                callback
            );  
        },
    });

    // From here on we start the definition of a client-level API.
    // It is still stateless, but provides reasonable convenience methods
    // in order to access higher-level Splunk functionality (such as
    // jobs and indices).

    // A service is the root of context for the Splunk RESTful API.
    // It defines the host and login information, and makes all the 
    // request using that context.
    root.Service = root.Context.extend({
        init: function() {
            this._super.apply(this, arguments);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.jobs       = utils.bind(this, this.jobs);
        },

        jobs: function() {
            return new root.Jobs(this);  
        },
    });

    // An endpoint is the basic handler. It is associated with an instance
    // of a Service and a path (such as /search/jobs/{SID}/), and
    // provide the relevant functionality.
    root.Endpoint = Class.extend({
        init: function(service, path) {
            if (!service) {
                console.log("Passed in a null Service.");
                return;
            }

            if (!path) {
                console.log("Passed in an empty path.");
                return;
            }

            this.service = service;
            this.path = path;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.get    = utils.bind(this, this.get);
            this.post   = utils.bind(this, this.post);
        },

        get: function(relpath, params, callback) {
            url = this.path;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            this.service.get(
                url,
                params,
                utils.bind(this, function(response) {
                    if (response.status !== 200) {
                        console.log("Received error status " + response.status + " for URL: " + url);
                        callback(null);
                    }
                    else {
                        callback(response);
                    }
                })
            );
        },

        post: function(relpath, params, callback) {
            url = this.path;

            // If we have a relative path, we will append it with a preceding
            // slash.
            if (relpath) {
                url = url + "/" + relpath;    
            }

            this.service.post(
                url,
                params,
                utils.bind(this, function(response) {
                    if (response.status !== 200 && response.status !== 201) {
                        console.log("Received error status " + response.status + " for URL: " + url);
                        callback(null);
                    }
                    else {
                        callback(response);
                    }
                })
            );
        },
    });

    // A collection is just another type of endpoint that represents
    // a collection of entities
    root.Collection = root.Endpoint.extend({
        
    });

    // An endpoint for all the jobs running on the current Splunk instance,
    // allowing us to create and list jobs
    root.Jobs = root.Collection.extend({
        init: function(service) {
            this._super(service, Paths.jobs);

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.create     = utils.bind(this, this.create);
            this.list       = utils.bind(this, this.list);
            this.contains   = utils.bind(this, this.contains);
         },

        
        // Create a search job with the given query and parameters
        create: function(query, params, callback) {
            if (!query) {
                throw "Must provide a query to create a search job";
            }

            params["search"] = query;  
            this.post("", params, utils.bind(this, function(response) {
                var job = new root.Job(this.service, response.odata.results.sid);
                callback(job);
            }));
         },

         // List all search jobs
        list: function(callback) {
            this.get("", {}, utils.bind(this, function(response) {
                job_list = response.odata.results;
                callback(job_list);
            }));
        },

        // Find whether a certain job exists
        contains: function(sid, callback) {
            // Get a list of all the current jobs
            this.list(function(list) {
                list = list || [];
                for(var i = 0; i < list.length; i++) {
                    // If the job is the same, then call the callback,
                    // and return
                    if (list[i].sid === sid) {
                        callback(true);
                        return;
                    }
                }

                // If we didn't find anything, let the callback now.
                callback(false);
            });
        },
    });

    // An endpoint for an instance of a specific search job. Allows us to perform
    // control operations on that job (such as cancelling, pausing, setting priority),
    // as well as read the job properties, results and events
    root.Job = root.Endpoint.extend({
        init: function(service, sid) {
            this._super(service, Paths.job + sid);
            this.sid = sid;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.read = utils.bind(this, this.read);
        },

        cancel: function(callback) {
            this.post("control", {action: "cancel"}, callback);  
        },

        disablePreview: function(callback) {
            this.post("control", {action: "disablepreview"}, callback);  
        },

        enablePreview: function(callback) {
            this.post("control", {action: "enablepreview"}, callback);  
        },

        events: function(params, callback) {
            this.get("events", params, function(response) { callback(response.odata.results); });
        },

        finalize: function(callback) {
            this.post("control", {action: "finalize"}, callback);  
        },

        pause: function(callback) {
            this.post("control", {action: "pause"}, callback);  
        },

        preview: function(params, callback) {
            this.get("results_preview", params, function(response) { callback(response.odata.results); });
        },

        read: function(callback) {
            this.get("", {}, callback);
        },

        results: function(params, callback) {
            this.get("results", params, function(response) { callback(response.odata.results); });
        },

        searchlog: function(params, callback) {
            this.get("search.log", params, function(response) { callback(response.odata.results); });
        },

        setPriority: function(value, callback) {
            this.post("control", {action: "setpriority", priority: value}, callback);  
        },

        setTTL: function(value, callback) {
            this.post("control", {action: "setttl", ttl: value}, callback);  
        },

        summary: function(params, callback) {
            this.get("summary", params, function(response) { callback(response.odata.results); });
        },

        timeline: function(params, callback) {
            this.get("timeline", params, function(response) { callback(response.odata.results); });
        },

        touch: function(callback) {
            this.post("control", {action: "touch"}, callback);  
        },

        unpause: function(callback) {
            this.post("control", {action: "unpause"}, callback);  
        },
    });
})();