var splunkjs = require('./splunk')

var token = "yTvjqUZZ_f3ogIiHXdULys_99ryH-j199I13rBllFzF8H-cpbb97tWRt5Tp2OFKg_sQ4sF3vhLw=";
var project = "b8cfde384e9811e1af81123139335bf7";
var service = new splunkjs.StormService({token: token});

service.log("HELLO WORLD - SDK2 - TEST2", {project: project, sourcetype: "itay"}, function(err, response) {
    if (!err) {
        console.log("SUCCESS!", response); 
    }
    else {
        console.log(err);
    }
});