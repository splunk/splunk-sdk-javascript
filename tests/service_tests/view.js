var splunkjs    = require('../../index');
var Async       = splunkjs.Async;

module.exports = function (svc) {
    return {
    setUp: function(done) {
        this.service = svc;
        done();
    },

    "Callback#List views": function(test) {
        var service = this.service;

        service.views({owner: "admin", app: "search"}).fetch(function(err, views) {
            test.ok(!err);
            test.ok(views);

            var viewsList = views.list();
            test.ok(viewsList);
            test.ok(viewsList.length > 0);

            for(var i = 0; i < viewsList.length; i++) {
                test.ok(viewsList[i]);
            }

            test.done();
        });
    },

    "Callback#Create + update + delete view": function(test) {
        var service = this.service;
        var name = "jssdk_testview";
        var originalData = "<view/>";
        var newData = "<view isVisible='false'></view>";

        Async.chain([
                function(done) {
                    service.views({owner: "admin", app: "sdk-app-collection"}).create({name: name, "eai:data": originalData}, done);
                },
                function(view, done) {
                    test.ok(view);

                    test.strictEqual(view.name, name);
                    test.strictEqual(view.properties()["eai:data"], originalData);

                    view.update({"eai:data": newData}, done);
                },
                function(view, done) {
                    test.ok(view);
                    test.strictEqual(view.properties()["eai:data"], newData);

                    view.remove(done);
                }
            ],
            function(err) {
                test.ok(!err);
                test.done();
            }
        );
    }
};
};