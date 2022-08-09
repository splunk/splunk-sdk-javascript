var assert = require('chai').assert;

//const { utils } = require('mocha');
var splunkjs = require('../../index');
var utils = splunkjs.Utils;

var idCounter = 0;

var getNextId = function () {
    return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
};

exports.setup = function (svc, loggedOutSvc) {
    return (
        describe("Indexes tests", function (done) {
            beforeEach(async function () {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;

                // Create the index for everyone to use
                let name = this.indexName = "sdk-tests";
                let indexes = this.service.indexes();
                try {
                    await indexes.create(name, {});
                } catch (err) {
                    if (err.status !== 409) {
                        throw new Error("Index creation failed for an unknown reason");
                    }
                }
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

            it("list indexes", async function () {
                let indexes = this.service.indexes();
                indexes = await indexes.fetch();
                let indexList = indexes.list();
                assert.ok(indexList.length > 0);
            });

            it("Contains index", async function () {
                let indexes = this.service.indexes();
                let indexName = this.indexName;

                indexes = await indexes.fetch();
                let index = indexes.item(indexName);
                assert.ok(index);
            });

            it("Modify index", async function () {
                let name = this.indexName;
                let indexes = this.service.indexes();
                let originalSyncMeta = false;
                indexes = await indexes.fetch();
                let index = indexes.item(name);
                assert.ok(index);

                originalSyncMeta = index.properties().syncMeta;
                index = await index.update({ syncMeta: !originalSyncMeta });
                assert.ok(index);
                let properties = index.properties();
                assert.strictEqual(!originalSyncMeta, properties.syncMeta);
                index = await index.update({ syncMeta: !properties.syncMeta });
                assert.ok(index);
                properties = index.properties();
                assert.strictEqual(originalSyncMeta, properties.syncMeta);
            });

            it("Enable/disable index", async function () {
                this.timeout(40000);
                let name = this.indexName;
                let indexes = this.service.indexes();

                indexes = await indexes.fetch();
                let index = indexes.item(name);
                assert.ok(index);
                index = await index.disable();
                await new Promise(resolve => setTimeout(resolve, 5000));
                assert.ok(index);
                index = await index.fetch();
                assert.ok(index);
                assert.ok(index.properties().disabled);

                index = await index.enable();
                await new Promise(resolve => setTimeout(resolve, 5000));
                assert.ok(index);
                index = await index.fetch();
                assert.ok(index);
                assert.ok(!index.properties().disabled);
            });

            it("Service submit event", async function () {
                let message = "Hello World -- " + getNextId();
                let sourcetype = "sdk-tests";

                let service = this.service;
                let indexName = this.indexName;
                let eventInfo = await service.log(message, { sourcetype: sourcetype, index: indexName });
                assert.ok(eventInfo);
                assert.strictEqual(eventInfo.sourcetype, sourcetype);
                assert.strictEqual(eventInfo.bytes, message.length);
                assert.strictEqual(eventInfo.index, indexName);
            });

            it("Service submit event, omitting optional arguments", async function () {
                let message = "Hello World -- " + getNextId();

                let service = this.service;
                let eventInfo = await service.log(message);
                assert.ok(eventInfo);
                assert.strictEqual(eventInfo.bytes, message.length);

            });

            it("Service submit events with multi-byte chars", async function () {
                let service = this.service;
                let messages = [
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

                let counter = 0;
                let [err, vals] = await utils.seriesMap(
                    messages,
                    async function (val, idx) {
                        counter++;
                        try {
                            let res = await service.log(val);
                            return [null, res];
                        } catch (error) {
                            return [error];
                        }
                    }
                );
                assert.ok(!err);
                assert.strictEqual(counter, messages.length);
                // Verify that the full byte-length was sent for each message
                for (let m in messages) {
                    assert.notStrictEqual(messages[m].length, vals[m].bytes);
                    try {
                        assert.strictEqual(Buffer.byteLength(messages[m]), vals[m].bytes);
                    }
                    catch (err) {
                        // Assume Buffer isn't defined, we're probably in the browser
                        assert.strictEqual(decodeURI(encodeURIComponent(messages[m])).length, vals[m].bytes);
                    }
                }
            });

            it("Service submit event, failure", async function () {
                let message = "Hello World -- " + getNextId();

                let service = this.loggedOutService;
                try {
                    assert.ok(service);
                    await service.log(message);
                } catch (error) {
                    assert.ok(error);
                }
            });

            it("Remove throws an error1", async function () {
                let index = this.service.indexes().item("_internal");
                assert.isNull(index);
                assert.throws(function () { index.remove(); });
            });

            it("Create an index with alternate argument format", async function () {
                let indexes = this.service.indexes();
                try {
                    await indexes.create({ name: "_internal" });
                } catch (error) {
                    assert.ok(error.data.messages[0].text.match("name=_internal already exists"));
                }
            });

            it("Index submit event with omitted optional arguments", async function () {
                let message = "Hello world -- " + getNextId();
                let indexName = this.indexName;
                let indexes = this.service.indexes();

                indexes = await indexes.fetch();
                let index = indexes.item(indexName);
                assert.ok(index);
                assert.strictEqual(index.name, indexName);
                let response = await index.submitEvent(message);
                let eventInfo = response[0];
                assert.ok(eventInfo);
                assert.strictEqual(eventInfo.bytes, message.length);
                assert.strictEqual(eventInfo.index, indexName);
            });

            it("Index submit event", async function () {
                let message = "Hello World -- " + getNextId();
                let sourcetype = "sdk-tests";

                let indexName = this.indexName;
                let indexes = this.service.indexes();
                indexes = await indexes.fetch();
                let index = indexes.item(indexName);
                assert.ok(index);
                assert.strictEqual(index.name, indexName);
                let response = await index.submitEvent(message, { sourcetype: sourcetype });
                let eventInfo = response[0];
                assert.ok(eventInfo);
                assert.strictEqual(eventInfo.sourcetype, sourcetype);
                assert.strictEqual(eventInfo.bytes, message.length);
                assert.strictEqual(eventInfo.index, indexName);
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
