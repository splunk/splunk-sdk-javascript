(function() {
    var Splunk      = require('../splunk/splunk.js'),
        NodeHttp    = require('../utils/node_http').NodeHttp,
        __bind      = require('../utils/utils').bind;
        Class       = require('../lib/jquery.class').Class,
        Async       = require('../utils/async');

    http = new NodeHttp();
    svc = new Splunk.Service(http, { 
        scheme: "http",
        host: "localhost",
        port: "8000",
        username: "itay",
        password: "changeme",
    });

    svc.login(function(success) {   
        console.log("success: " + success); 
        var jobs = svc.jobs();
        jobs.create('search index=twitter | head 1', {}, __bind(this, function(job) {           
            // job.setTTL(1600, function() {
            //     jobs.list(function(list) {
            //         list = list || [];
            //         for(var i = 0; i < list.length; i++) {
            //             console.log("Search " + i + ": " + list[i].__name + " [sid: "+ list[i].sid + "]");
            //             console.log("Search " + i + ": " + list[i].ttl);
            //         }
            //         jobs.contains(job.sid, function(contains) {
            //             console.log("contains: " + contains); 
            //         });
            //     });
            // });
            var jobDispatchState = "";
            Async.while({
               condition: function() { return jobDispatchState !== "DONE"; },
               body: function(iteration_done) {
                   job.read(function(response) {
                       // Get the current dispatch state
                       jobDispatchState = response.odata.results.dispatchState;
                       
                       // Wait for a second
                       setTimeout(iteration_done, 1000); 
                   });
               },
               done: function() {                
                   // Once the loop is done, we try and get some results
                   job.results({count: 2}, function(data) {
                       var results = data.data || [];
                       for(var i = 0; i < results.length; i++) {
                           // This is a bit hairy, and should probably be
                           // abstracted out in some way
                           var result = results[i];
                           console.log(result._raw[0].value[0]);
                       }
                   });
               },
            });
        }));
    });
})();