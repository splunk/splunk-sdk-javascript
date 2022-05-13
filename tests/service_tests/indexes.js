var assert = require('chai').assert;

var splunkjs = require('../../index');

var Async = splunkjs.Async;
var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc, loggedOutSvc) {
    return (
        describe("Indexes tests", function (done) {
            beforeEach(function (done) {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;

                // Create the index for everyone to use
                var name = this.indexName = "sdk-tests";
                var indexes = this.service.indexes();
                indexes.create(name, {}, function (err, index) {
                    if (err && err.status !== 409) {
                        throw new Error("Index creation failed for an unknown reason");
                    }

                    done();
                });
            });

            // it("Callback#remove index fails on Splunk 4.x", function(done) {
            //     var original_version = this.service.version;
            //     this.service.version = "4.0";
            //
            //     var index = this.service.indexes().item(this.indexName);
            //     assert.throws(function() { index.remove(function(err) {}); });
            //
            //     this.service.version = original_version;
            //     done();
            // });

            // it("Callback#remove index", function(done) {
            //     var indexes = this.service.indexes();
            //
            //     // Must generate a private index because an index cannot
            //     // be recreated with the same name as a deleted index
            //     // for a certain period of time after the deletion.
            //     var salt = Math.floor(Math.random() * 65536);
            //     var myIndexName = this.indexName + '-' + salt;
            //
            //     if (this.service.versionCompare("5.0") < 0) {
            //         splunkjs.Logger.info("", "Must be running Splunk 5.0+ for this test to work.");
            //         done();
            //         return;
            //     }
            //
            //     Async.chain([
            //             function(callback) {
            //                 indexes.create(myIndexName, {}, callback);
            //             },
            //             function(index, callback) {
            //                 index.remove(callback);
            //             },
            //             function(callback) {
            //                 var numTriesLeft = 50;
            //                 var delayPerTry = 200;  // ms
            //
            //                 Async.whilst(
            //                     function() { return indexes.item(myIndexName) && ((numTriesLeft--) > 0); },
            //                     function(iterDone) {
            //                         Async.sleep(delayPerTry, function() { indexes.fetch(iterDone); });
            //                     },
            //                     function(err) {
            //                         if (err) {
            //                             callback(err);
            //                         }
            //                         else {
            //                             callback(numTriesLeft <= 0 ? "Timed out" : null);
            //                         }
            //                     }
            //                 );
            //             }
            //         ],
            //         function(err) {
            //             assert.ok(!err);
            //             done();
            //         }
            //     );
            // });

            it("Callback#list indexes", function (done) {
                var indexes = this.service.indexes();
                indexes.fetch(function (err, indexes) {
                    var indexList = indexes.list();
                    assert.ok(indexList.length > 0);
                    done();
                });
            });

            it("Callback#contains index", function (done) {
                var indexes = this.service.indexes();
                var indexName = this.indexName;

                indexes.fetch(function (err, indexes) {
                    var index = indexes.item(indexName);
                    assert.ok(index);
                    done();
                });
            });

            it("Callback#modify index", function (done) {

                var name = this.indexName;
                var indexes = this.service.indexes();
                var originalSyncMeta = false;

                Async.chain([
                    function (callback) {
                        indexes.fetch(callback);
                    },
                    function (indexes, callback) {
                        var index = indexes.item(name);
                        assert.ok(index);

                        originalSyncMeta = index.properties().syncMeta;
                        index.update({
                            syncMeta: !originalSyncMeta
                        }, callback);
                    },
                    function (index, callback) {
                        assert.ok(index);
                        var properties = index.properties();

                        assert.strictEqual(!originalSyncMeta, properties.syncMeta);

                        index.update({
                            syncMeta: !properties.syncMeta
                        }, callback);
                    },
                    function (index, callback) {
                        assert.ok(index);
                        var properties = index.properties();

                        assert.strictEqual(originalSyncMeta, properties.syncMeta);
                        callback();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Enable+disable index", function (done) {

                this.timeout(40000);
                var name = this.indexName;
                var indexes = this.service.indexes();

                Async.chain([
                    function (callback) {
                        indexes.fetch(callback);
                    },
                    function (indexes, callback) {
                        var index = indexes.item(name);
                        assert.ok(index);

                        index.disable(callback);
                    },
                    function (index, callback) {
                        Async.sleep(5000, function () {
                            callback(null, index);
                        });
                    },
                    function (index, callback) {
                        assert.ok(index);
                        index.fetch(callback);
                    },
                    function (index, callback) {
                        assert.ok(index);
                        assert.ok(index.properties().disabled);

                        index.enable(callback);
                    },
                    function (index, callback) {
                        Async.sleep(5000, function () {
                            callback(null, index);
                        });
                    },
                    function (index, callback) {
                        assert.ok(index);
                        index.fetch(callback);
                    },
                    function (index, callback) {
                        assert.ok(index);
                        assert.ok(!index.properties().disabled);

                        callback();
                    }
                ],
                    function (err) {
                        assert.ok(!err, JSON.stringify(err));
                        done();
                    }
                );
            });

            it("Callback#Service submit event", function (done) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function (done) {
                        service.log(message, { sourcetype: sourcetype, index: indexName }, done);
                    },
                    function (eventInfo, done) {
                        assert.ok(eventInfo);
                        assert.strictEqual(eventInfo.sourcetype, sourcetype);
                        assert.strictEqual(eventInfo.bytes, message.length);
                        assert.strictEqual(eventInfo.index, indexName);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Service submit event, omitting optional arguments", function (done) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.service;
                var indexName = this.indexName;
                Async.chain(
                    function (done) {
                        service.log(message, done);
                    },
                    function (eventInfo, done) {
                        assert.ok(eventInfo);
                        assert.strictEqual(eventInfo.bytes, message.length);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    },
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Service submit events with multi-byte chars", function (done) {
                var service = this.service;
                var messages = [
                    "Ummelner Straße 6",
                    "Ümmelner Straße 6",
                    "Iԉｔéｒԉáｔíòлåɭìƶåｔｉòл",
                    "Iｎｔéｒｎâｔì߀лàɭíƶɑｔïòл",
                    "ãϻéｔ ｄòｎｅｒ ｔｕｒƙëｙ ѵ߀ｌù",
                    "ｐｔãｔｅ ìԉ ｒëρｒèｈëｎԁéｒｉｔ ",
                    "ϻ߀ｌɭｉｔ ｆìɭèｔ ϻìǥｎｏԉ ɭäｂ߀ｒíѕ",
                    " êӽ ｃɦùｃｋ ｃüｐïᏧåｔåｔ Ꮷèѕëｒｕлｔ. ",
                    "D߀ɭｏｒ ѵéｌíｔ ìｒｕｒè, ｓèᏧ ѕｈòｒ",
                    "ｔ ｒｉƅѕ ｃ߀ɰ ɭãｎԁյàéɢêｒ ｄｒúｍｓｔ",
                    "íｃƙ. Mｉｎïｍ ƃàɭｌ ｔｉｐ ѕհòｒｔ ｒìƃѕ,",
                    " ïԁ ａɭïｑúìρ ѕɦàｎƙ ρ߀ｒｃɦéｔｔɑ. Pìǥ",
                    " ｈãｍ ɦòｃｋ ìлｃíｄíԁùԉｔ ｓéԁ ｃüｐïϻ ",
                    "ƙèｖｉл ｌáｂｏｒê. Eｔ ｔａｉɭ ѕｔｒｉρ",
                    " ｓｔｅáｋ úｔ üｌｌãϻｃ߀ ｒｕｍｐ ｄ߀ɭｏｒｅ.",
                    "٩(͡๏̯͡๏)۶ ٩(-̮̮̃•̃).",
                    "Lɑƅòｒé ƃｒëｓãòｌá ｄ߀лèｒ ѕâｌáｍí ",
                    "ｃíｌｌûｍ ìｎ ѕɯìлｅ ϻêàｔɭ߀àｆ ｄûìｓ ",
                    "ρãｎｃｅｔｔä ƅｒìｓƙéｔ ԁèｓêｒûлｔ áúｔè",
                    " յòɰɭ. Lɑｂòｒìѕ ƙìêɭ",
                    "ｂáｓá ԁòｌòｒé ｆａｔƃɑｃｋ ƅêéｆ. Pɑѕｔｒ",
                    "äｍì ｐｉɢ ѕհàлƙ ùɭɭａｍｃò ѕａû",
                    "ѕäǥë ｓɦàｎƙｌë.",
                    " Cúｐíｍ ɭäƃｏｒｕｍ ｄｒｕｍｓｔïｃƙ ｊｅｒｋϒ ｖｅｌｉ",
                    " ｐïｃåԉɦɑ ƙíéɭƅãｓａ. Aｌïｑû",
                    "ｉρ íｒüｒë ｃûｐíϻ, äɭìɋｕâ ǥｒòûлｄ ",
                    "ｒｏúлᏧ ｔｏԉｇüè ρàｒìãｔùｒ ",
                    "ｂｒｉѕｋèｔ ԉｏｓｔｒｕᏧ ｃûɭｐɑ",
                    " ìｄ ｃòлѕèｑûâｔ ｌàƅ߀ｒìｓ."
                ];

                var counter = 0;
                Async.seriesMap(
                    messages,
                    function (val, idx, done) {
                        counter++;
                        service.log(val, done);
                    },
                    function (err, vals) {
                        assert.ok(!err);
                        assert.strictEqual(counter, messages.length);

                        // Verify that the full byte-length was sent for each message
                        for (var m in messages) {
                            assert.notStrictEqual(messages[m].length, vals[m].bytes);
                            try {
                                assert.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                            }
                            catch (err) {
                                // Assume Buffer isn't defined, we're probably in the browser
                                assert.strictEqual(decodeURI(encodeURIComponent(messages[m])).length, vals[m].bytes);
                            }
                        }

                        done();
                    }
                );
            });

            it("Callback#Service submit event, failure", function (done) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var service = this.loggedOutService;
                var indexName = this.indexName;
                Async.chain(
                    function (done) {
                        assert.ok(service);
                        service.log(message, done);
                    },
                    function (err) {
                        assert.ok(err);
                        done();
                    }
                );
            });

            it("Callback#remove throws an error", function (done) {
                var index = this.service.indexes().item("_internal");
                assert.throws(function () {
                    index.remove();
                });
                done();
            });

            it("Callback#create an index with alternate argument format", function (done) {
                var indexes = this.service.indexes();
                indexes.create(
                    { name: "_internal" },
                    function (err, newIndex) {
                        assert.ok(err.data.messages[0].text.match("name=_internal already exists"));
                        done();
                    }
                );
            });

            it("Callback#Index submit event with omitted optional arguments", function (done) {
                var message = "Hello world -- " + getNextId();

                var indexName = this.indexName;
                var indexes = this.service.indexes();

                Async.chain(
                    [
                        function (done) {
                            indexes.fetch(done);
                        },
                        function (indexes, done) {
                            var index = indexes.item(indexName);
                            assert.ok(index);
                            assert.strictEqual(index.name, indexName);
                            index.submitEvent(message, done);
                        },
                        function (eventInfo, index, done) {
                            assert.ok(eventInfo);
                            assert.strictEqual(eventInfo.bytes, message.length);
                            assert.strictEqual(eventInfo.index, indexName);

                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        }
                    ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            });

            it("Callback#Index submit event", function (done) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";

                var indexName = this.indexName;
                var indexes = this.service.indexes();
                Async.chain([
                    function (done) {
                        indexes.fetch(done);
                    },
                    function (indexes, done) {
                        var index = indexes.item(indexName);
                        assert.ok(index);
                        assert.strictEqual(index.name, indexName);
                        index.submitEvent(message, { sourcetype: sourcetype }, done);
                    },
                    function (eventInfo, index, done) {
                        assert.ok(eventInfo);
                        assert.strictEqual(eventInfo.sourcetype, sourcetype);
                        assert.strictEqual(eventInfo.bytes, message.length);
                        assert.strictEqual(eventInfo.index, indexName);

                        // We could poll to make sure the index has eaten up the event,
                        // but unfortunately this can take an unbounded amount of time.
                        // As such, since we got a good response, we'll just be done with it.
                        done();
                    }
                ],
                    function (err) {
                        assert.ok(!err);
                        done();
                    }
                );
            })
        })
    )
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    var cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    var svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    var loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise((resolve, reject) => {
        svc.login(function (err, success) {
            if (err || !success) {
                throw new Error("Login failed - not running tests", err || "");
            }
            return resolve(exports.setup(svc, loggedOutSvc));
        });
    });
}
