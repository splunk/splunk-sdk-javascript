var splunkjs = require('../../index');

module.exports = function() {
    return {
        setUp: function(done) {
            done();
        },

        "Callback#Test with invalid Splunk host": function(test) {
            var invalidSvc = new splunkjs.Service({ 
                scheme: 'https',
                host: '$%&sss',
                port: 8089,
                username: '',
                password: ''
            });

            invalidSvc.login(function(err, success) {
                test.ok(err.message.toLocaleLowerCase.includes('invalid uri'));
                test.ok(!success);
                test.done();
            });
        }
    };
};
