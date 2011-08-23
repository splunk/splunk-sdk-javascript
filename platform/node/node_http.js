(function() {
    var request = require('request'),
        Splunk  = require('../splunk/splunk.js'),
        __bind  = require('./utils').bind

    var root = exports || this;

    root.NodeHttp = Splunk.Http.extend({
        request: function(url, message, callback) {
            var request_options = {
                url: url,
                method: message.method,
                headers: message.headers,
                body: message.body
            };

            console.log("URL: " + request_options.url);

            request(request_options, __bind(this, function (error, res, data) {
                var complete_response = this._buildResponse(error, res, data);
                callback(complete_response);
            }));
        },

        parseJson: function(json) {
            return JSON.parse(json);
        }
    });
})();