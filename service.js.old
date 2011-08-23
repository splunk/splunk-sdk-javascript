(function(){

var splunk = {};
splunk.service = splunk.service || {};
this.splunk = splunk;

// no-op the console calls on other browsers
if (console === undefined) {
    console = { log: function() {} };
    console.error = console.warn = console.info = console.debug = console.debug;
}

splunk.service.Service = Class.extend({

    // constants
    DEFAULT_PATH:   '/en-US/custom/old_english/svc',
    DEFAULT_NS:     '-',
    DEFAULT_OWNER:  '-',
    ENTRY_TEMPLATE: '_new',
    JOB_ENDPOINT:   '/search/jobs',

    // members
    sessionKey: null,
    basePath: null,
    
    init: function(basePath) {
        this.basePath = basePath || this.DEFAULT_PATH;
    },
    
    
    //
    // core HTTP requester
    //
    
    buildUri: function(path, ns, owner, useNS) {
        ns = ns || this.DEFAULT_NS;
        owner = owner || this.DEFAULT_OWNER;
        if (path.charAt(0) !== '/') {
            throw new Error('path argument must start with a / relative to /services; ' + path);
        }
        if (useNS === false) {
            return [this.basePath, path.substring(1)].join('/');
        } else {
            return [this.basePath, owner, ns, path.substring(1)].join('/');
        }
    },
    
    request: function(url, ajaxArgs) {
        ajaxArgs = ajaxArgs || {};
        ajaxArgs.dataType = 'json';

        // TODO: process array params into proper QS members
        
        var deferred = $.ajax(url, ajaxArgs);
        
        var deferredSuccess = $.proxy(function(data, textStatus, jxhr) {
            if (!data) {
                console.error('Unhandled splunkd request failure! statusCode=' + jxhr.status);
                return false;
            }
            var odata = splunk.service.ODataResponse.fromJSON(data);
            return odata;
        }, this);
        
        var deferredError = $.proxy(function(jxhr, textStatus, errorThrown) {
            // TODO: should recover from bad input
            var json = $.parseJSON(jxhr.responseText);
            var odata = splunk.service.ODataResponse.fromJSON(json);
            var messages = splunk.service.ODataResponse.printMessages(odata);
            
            // define standard struct for ajax error response
            return {
                statusCode: jxhr.status,
                errorThrown: errorThrown,
                messages: odata.messages
            };
        }, this);
        
        return deferred.pipe(deferredSuccess, deferredError);
    },


    //
    // auth mgmt
    //
    
    login: function(username, password, callback) {
        if (!username || !password) {
            throw new Error('username or password cannot be empty');
        }
        
        var deferredRequest = this.request(
            this.buildUri('/auth/login', null, null, false), 
            {
                type: 'POST',
                data: {
                    username: username,
                    password: password
                }
            }
        );
        
        var deferredSuccess = $.proxy(function(odata) {
            this.sessionKey = odata.results.sessionKey;
            console.debug('Got splunkd key: ' + this.sessionKey);
            return this.sessionKey;
        }, this);
        
        return deferredRequest.pipe(deferredSuccess);
    },
    
    
    //
    // entry mgmt
    //
    
    fetchEntry: function(path, name, ns, owner, extraParams) {
        var deferred = this.request(
            this.buildUri(path + '/' + encodeURIComponent(name), ns, owner),
            {
                type: 'GET',
                data: extraParams
            }
        );
        
        var deferredSuccess = $.proxy(function(odata) {
            if (!odata || odata.results === undefined) {
                console.warn('fetchEntry yielded no data');
                return false;
            }
            var output;
            if (odata.isCollection()) {
                output = odata.results[0];
            } else {
                output = odata.results;
            }
            console.debug('Entry: ' + output.__name);
            splunk.service.ODataResponse.printMessages(output);
            return output;
        }, this);
        
        return deferred.pipe(deferredSuccess);
    },
    
    fetchEntryTemplate: function(path, ns, owner, extraParams) {
        if (!ns) {
            throw new Error('ns parameter cannot be null');
        }
        if (!owner) {
            throw new Error('owner parameter cannot be null');
        }
        return this.fetchEntry(path, this.ENTRY_TEMPLATE, ns, owner, extraParams);
    },
    
    fetchCollection: function(path, ns, owner, extraParams) {
        var deferred = this.request(
            this.buildUri(path, ns, owner),
            {
                type: 'GET',
                data: extraParams
            }
        );
        
        var deferredSuccess = $.proxy(function(odata) {
            if (!odata || odata.results === undefined) {
                console.warn('fetchCollection yielded no data');
                return false;
            }
            splunk.service.ODataResponse.printMessages(odata);
            return odata.results;
        }, this);
        
        return deferred.pipe(deferredSuccess);
    },

    
    //
    // job mgmt
    //
    
    dispatchJob: function(dispatchParams, ns, owner) {
        if (!dispatchParams.hasOwnProperty('search')) {
            throw new Error('dispatchParams must specify "search" parameter');
        }
        
        var deferred = this.request(this.buildUri(this.JOB_ENDPOINT, ns, owner), {
            type: 'POST',
            data: dispatchParams
        });
        
        var deferredSuccess = function(odata) {
            if (!odata.results.sid) {
                console.error('did not receive SID from server');
                return false;
            }
            console.debug('[service] dispatched sid=' + odata.results.sid);
            return odata.results.sid;
        };
        
        var deferredError = function(errorResponse) {
            return errorResponse;
        };
        
        return deferred.pipe(deferredSuccess, deferredError);
    },
    
    fetchJob: function(sid, ns, owner, extraParams) {
        ns = ns || this.DEFAULT_NS;
        owner = owner || this.DEFAULT_OWNER;
        var deferred = this.fetchEntry(this.JOB_ENDPOINT, sid, ns, owner, extraParams);
        
        var svcInstance = this;
        var deferredSuccess = $.proxy(function(entry) {
            var job = new splunk.service.Job(entry.sid, ns, owner, svcInstance);
            job._setProperties(entry);
            return job;
        }, this);
        
        return deferred.pipe(deferredSuccess);
    },
    
    
    //
    // debug
    //
    
    fetchInfo: function() {
        var deferred = this.fetchEntry('/server/info', '');
        
        var deferredSuccess = function(entry) {
            var k;
            for (k in entry) {
                console.debug(k + ': ' + entry[k]);
            }
            return true;
        };
        
        var deferredError = function(errorResponse) {
            console.error('failed fetching server info');
            return true;
        };
        
        return deferred.pipe(deferredSuccess, deferredError);
    }
    
});


//
// OData wrapper
//

splunk.service.ODataResponse = Class.extend({
    offset: 0,
    count: 0,
    total_count: 0,
    messages: [],
    timings: [],
    results: null,
    
    isCollection: function() {
        return (this.results instanceof Array);
    }
});

splunk.service.ODataResponse.fromJSON = function(json) {
    if (!json || !json.d) {
        console.error('Invalid JSON object passed; cannot parse into OData');
        return null;
    }
    var d = json.d;
    
    var output = new splunk.service.ODataResponse();
    var prefixedKeys = ['messages', 'offset', 'count', 'timings', 'total_count'];
    var i,L;
    for (i=0,L=prefixedKeys.length; i<L; i++) {
        if (d.hasOwnProperty('__' + prefixedKeys[i])) {
            output[prefixedKeys[i]] = d['__' + prefixedKeys[i]];
        }
    }
    if (d.results) {
        output.results = d.results;
    }
    return output;
};

splunk.service.ODataResponse.printMessages = function(struct) {
    var i,L,msg;
    var list = struct.messages || struct.__messages || [];
    if (list) {
        for (i=0,L=list.length; i<L; i++) {
            msg = '[SPLUNKD] ' + list[i].text;
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
                    console.log('[SPLUNKD] ' + list[i].type + ' - ' + msg);
                    break;
            }
        }
    }
    return list;
};


//
// search jobs
//

splunk.service.Job = Class.extend({

    // pre-request info
    _service: null,
    _id: null,
    _ns: null,
    _owner: null,
    _uri: null,

    // post-request info
    _state: null,
    _metadata: {},
    _properties: {},

    
    init: function(sid, ns, owner, service) {
        this._id = sid;
        this._ns = ns;
        this._owner = owner;
        this._service = service;
        this._state = splunk.service.JobStates.INITIALIZED;
        
        this._uri = service.buildUri(
            service.JOB_ENDPOINT + '/' + encodeURIComponent(sid),
            ns,
            owner
        );
    },
    
    
    // properties
    
    _setProperties: function(properties) {
        this._properties = properties;
        switch (properties.dispatchState) {
            case 'QUEUED':
                this._setState(splunk.service.JobStates.QUEUED);
                break;
            case 'PARSING':
                this._setState(splunk.service.JobStates.PARSING);
                break;
            case 'RUNNING':
                this._setState(splunk.service.JobStates.RUNNING);
                break;
            case 'FINALIZING':
                this._setState(splunk.service.JobStates.FINALIZING);
                break;
            case 'DONE':
                this._setState(splunk.service.JobStates.DONE);
                break;
            case 'FAILED':
                this._setState(splunk.service.JobStates.FAILED);
                break;
            default:
                console.warn('unrecognized dispatchState: ' + properties.dispatchState);
                break;
        }
    },
    
    _setState: function(state) {
        var k;
        for (k in splunk.service.JobStates) {
            if (splunk.service.JobStates[k] === state) {
                if (this._state === state) {
                    return false; // no change
                }
                this._state = state;
                console.debug('[job: ' + this._id + '] state=' + k);
                $(this).trigger('stateChange', [state]);
                return true;
            }
        }
        throw new Error('unknown job state: ' + state);
    },
    
    get: function(key) {
        switch (key) {
            case 'id':
                return this._id;
            case 'ns':
                return this._ns;
            case 'owner':
                return this._owner;
            case 'uri':
                return this._uri;
            case 'state':
                return this._state;
            default:
                return this._properties[key];
        }
    },
    
    updateProperties: function() {
        var deferred = this._service.request(this.get('uri'));
        var deferredSuccess = $.proxy(function(odata) {
            this._setProperties(odata.results);
            if (odata.results.__metadata) {
                this._metadata = odata.results.__metadata;
            }
            console.debug('[job: ' + this._id + '] properties updated; ttl=' + this.get('ttl'));
            $(this).trigger('propertiesUpdate');
            return this;
        }, this);
        var deferredError = $.proxy(function(errorResponse) {
            console.warn('[job: ' + this._id + '] error updating job properties');
            this._setState(splunk.service.JobStates.UNKNOWN);
            return this;
        }, this)
        return deferred.pipe(deferredSuccess, deferredError);
    },
    
    toJSON: function() {
        return this._properties;
    },
    
    
    
    //
    // simple poller; TODO: needs to be refactored into global poller
    //
    
    _pollTimer: null,

    _poller: function() {
        if (this._state >= splunk.service.JobStates.DONE) {
            console.debug('[job: ' + this._id + '] auto-canceling poller');
            return;
        }
        this.updateProperties();
        this._pollTimer = setTimeout($.proxy(this._poller, this), 1000);
    },
    
    startPoll: function() {
        this._poller();
        $(this).trigger('pollerStart');
    },
    
    stopPoll: function() {
        console.debug('[job: ' + this._id + '] stopping poller');
        $(this).trigger('pollerStop');
        clearTimeout(this._pollTimer);
    },
    
    
    
    // data
    
    fetchLinkedAsset: function(asset, params) {
        var i,L,uri;
        if (this._metadata && this._metadata.links) {
            for (i=0,L=this._metadata.links.length; i<L; i++) {
                if (this._metadata.links[i].rel === asset) {
                    uri = this._metadata.links[i].href.replace(/\/services(NS)?/, '');
                    uri = this._service.basePath + uri;
                    break;
                }
            }
        }
        if (!uri) {
            console.warn('job asset was not specified in <link>; falling back to manual construction');
            uri = this.get('uri') + '/' + encodeURIComponent(asset);
        }
        var deferred = this._service.request(uri, {data:params});
        var deferredSuccess = $.proxy(function(odata) {
            return odata.results;
        }, this);
        return deferred.pipe(deferredSuccess);
    },
    
    fetchTimeline: function(params) {
        return this.fetchLinkedAsset('timeline', params);
    },
    
    fetchFieldSummary: function(params) {
        return this.fetchLinkedAsset('summary', params);
    },
    
    fetchFullEvents: function(params) {
        return this.fetchLinkedAsset('events', params);
    },
    
    fetchShallowEvents: function(params) {
        throw new Error('Not implemented'); // TODO
    },
    
    fetchFullResults: function(params, usePreview, returnShallowData) {
        var asset = (usePreview === false ? 'results' : 'results_preview');
        var deferred = this.fetchLinkedAsset(asset, params);
        var deferredSuccess = $.proxy(function(results) {
            if (returnShallowData) {
                var fieldOrder = results.field_list;
            } else {
                var fieldOrder = results.field_list;
            }
            console.debug('results field list: ' + fieldOrder.join(', '));
            var output = [];
            var i,L,j,M,item,key;
            for (i=0,L=results.data.length; i<L; i++) {
                item = [];
                for (j=0,M=fieldOrder.length; j<M; j++) {
                    key = fieldOrder[j];
                    if (results.data[i].hasOwnProperty(key)) {
                        if (returnShallowData === true) {
                            item.push(results.data[i][key][0].value);
                        } else {
                            item.push(results.data[i][key]);
                        }
                    } else {
                        item.push(null);
                    }
                }
                output.push(item);
            }
            return {
                fieldList: fieldOrder,
                data: output
            }
        }, this);
        return deferred.pipe(deferredSuccess);
    },
    
    fetchShallowResults: function(params, usePreview) {
        return this.fetchFullResults(params, usePreview, true);
    },
        
    
    
    // control
    _sendControl: function(command, extraParams) {
        var post = {action: command};
        if (extraParams) {
            $.extend(post, extraParams);
        }
        
        var deferred = this._service.request(this.get('uri') + '/control', {
            type: 'POST',
            data: post
        });
            
        var deferredSuccess = $.proxy(function(odata) {
            splunk.service.ODataResponse.printMessages(odata);
            console.debug('job action=' + command + ' succeeded; sid=' + this.get('id'));
            return true;
        }, this);
            
        return deferred.pipe(deferredSuccess);
    },
    
    enablePreview: function() {
        return this._sendControl('enablepreview');
    },
    disablePreview: function() {
        return this._sendControl('disablepreview');
    },
    pause: function() {
        return this._sendControl('pause');
    },
    unpause: function() {
        return this._sendControl('unpause');
    },
    finalize: function() {
        return this._sendControl('finalize');
    },
    touch: function() {
        return this._sendControl('touch');
    },
    save: function() {
        return this._sendControl('save');
    },
    unsave: function() {
        return this._sendControl('unsave');
    },
    setTTL: function(ttl) {
        return this._sendControl('setttl', {ttl: ttl});
    },
    cancel: function() {
        return this._sendControl('cancel');
    }
   
});
    
// dispatch state; 1-99=nominal; 100+=unavailable
splunk.service.JobStates = {
    INITIALIZED: 0,
    ACKED: 2,
    QUEUED: 10,
    PARSING: 12,
    RUNNING: 20,
    PAUSING: 22,
    PAUSED: 24,
    UNPAUSING: 26,
    FINALIZING: 30,
    DONE: 40,
    CANCELING: 100,
    CANCELED: 102,
    FAILED: 104,
    ZOMBIED: 106,
    UNKNOWN: 200
};


})();