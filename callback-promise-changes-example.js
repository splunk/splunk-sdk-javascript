var splunkjs = require('./index');

var token = "<Bearer_token/Session_key>"
var appName = '<app-name>';

var serviceWithToken = new splunkjs.Service(
    {
        // Replace the host if you are accessing remote host
        scheme: 'https',
        host: 'localhost',
        port: '8089',
        sessionKey: token,
        version: '8'
    });

function callback_example(service) {
    service.apps().fetch(function (err, apps) {
        if (err)
            console.log("There was an error retrieving the list of applications:", err);
        else{
            var app = apps.item(appName);
            app.fetch(function (err, app) {
                if (err)
                    console.log("Can't fetch an app, Error : ", err);
                else{
                    console.log("App author name - ", app._author);
                }
            });
        }
    });
}

async function async_example(service) {
    try {
        var apps = service.apps();
        await apps.fetch();
        
        var app = apps.item(appName);
        await app.fetch();
        console.log("App author name - ", app._author);
    } catch (error) {
        console.log("Error -", error);
    }
}

function promises_example(service) {
    service.apps().fetch().then((apps) => {
        var app = apps.item(appName);
        app.fetch().then((app) =>{
            console.log("App author name - ", app._author);
        }).catch((err) => {
            console.log("Can't fetch an app, Error : ", err);
        });
    }).catch((err) => {
        console.log("There was an error retrieving the list of applications:", err);
    })
}

// callback_example(serviceWithToken);
// async_example(serviceWithToken);
// promises_example(serviceWithToken);
