var splunkjs = require('./index');

var token = "<Bearer_token/Session_key>";

var serviceWithToken = new splunkjs.Service(
    {
        // Replace the host if you are accessing remote host
        scheme: 'https',
        host: 'localhost',
        port: '8089',
        sessionKey: token,
        version: '8'
    });

function promise_example() {
    var job = serviceWithToken.get("apps/local", { count: 5 });
    
    job.then((res) => {
            console.log("Applications: ");
            var appList = res.data.entry;
            for(var i = 0; i < appList.length; i++){
                var app = appList[i];
                console.log("  App " + i + ": " + app.name);
            }
        }).catch((err) => {
            console.log("There was an error retrieving the list of applications: ", err);
        })
}

function promise_example_with_timeout() {
    var job = serviceWithToken.get("apps/local", { count: 5 }, response_timeout = 10);

    job.then((res) => {
            console.log("Applications:");
            var appList = res.data.entry;
            for(var i = 0; i < appList.length; i++){
                var app = appList[i];
                console.log("  App " + i + ": " + app.name);
            }
        }).catch((err) => {
            console.log("There was an error retrieving the list of applications: ", err);
        })
}

// promise_example();
promise_example_with_timeout();
