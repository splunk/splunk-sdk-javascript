(function() {
    var Splunk  = require('../splunk/splunk.js'),
        __bind  = require('./utils').bind

    var root = exports || this;

    root.JQueryHttp = Splunk.Http.extend({
        request: function(url, message, callback) {
            var params = {
                url: url,
                type: message.method,
                headers: message.headers,
                data: message.body,
                success: __bind(this, function (data, error, res) {
                    var response = {
                        statusCode: res.status
                    };

                    var complete_response = this._buildResponse(error, response, data);
                    callback(complete_response);
                })
                
            };

            console.log("URL: " + params.url);

            $.ajax(params);
        },

        parseJson: function(json) {
            // JQuery does this for us
            return json;
        }
    });
})();