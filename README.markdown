Summary
-------
Quick and dirty Javascript data layer for interfacing with Splunk. This requires
the OData JSON app that is currently hosted in p4 at //splunk/applications/old_english/...

Requires: Jquery 1.6 and the simple class inheritance in jquery.class.js


Usage
-----
    
    // all methods are async; you must use callbacks via Jquery's
    // deferred model: http://www.erichynds.com/jquery/using-deferreds-in-jquery/
    
    // ------------------------------------------------------------------------
    // init service

    svc = new splunk.service.Service('localhost');
    svc.login('admin','changeme');


    // ------------------------------------------------------------------------
    // job lifecycle

    var job;
    svc.dispatchJob({search: 'windbag', status_buckets:300, rf: '*'})
        .pipe(function(sid) {
            return svc.fetchJob(sid);
        })
        .done(function(j) {
            job = j;
            console.log('got job object populated');
            console.log(job);
            console.log('this job object id=' + job.get('id'));
        });


    job.fetchFullEvents()
        .done(function(results) {
            console.log(results);
        })
        
    job.cancel();

        
    // ------------------------------------------------------------------------
    // get list of things

    var searches;
    svc.fetchCollection('/saved/searches', null, null, {count:5})
        .done(function(odata) {
            searches = odata;
            var i,L;
            for (i=0,L=searches.length; i<L; i++) {
                console.log('got search: ' + searches[i].__name);
            }
        });
    
    // ------------------------------------------------------------------------
    // get a single thing

    var singleSearch;
    svc.fetchEntry('/saved/searches', 'Errors in the last hour')
        .done(function(odata) {
            console.log('got a saved search string: ' + odata.search);
            })
        .fail(function(err) {
            console.log('HTTP status=' + err.statusCode);
            console.log('error thrown=' + err.errorThrown);
            console.log('messages:');
            console.log(err.messages);
            });
