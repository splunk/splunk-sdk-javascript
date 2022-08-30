
exports.setup = function (svc, loggedOutSvc) {
    var assert = require('chai').assert;
    var splunkjs = require('../../index');
    var tutils = require('../utils');
    var utils = splunkjs.Utils;
    var idCounter = 0;
    var getNextId = function () {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };
    return (
        describe("Saved Search Tests", () => {
            beforeEach(function () {
                this.service = svc;
                this.loggedOutService = loggedOutSvc;
            })

            it("list", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch();
                let savedSearches = searches.list();
                assert.ok(savedSearches.length > 0);

                for (let i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                };
            })

            it("contains", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch();
                let search = searches.item("Errors in the last hour");
                assert.ok(search);
            })

            it("suppress", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch();
                let search = searches.item("Errors in the last hour");
                assert.ok(search);
                await search.suppressInfo();
            })

            it("list limit count", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch({ count: 2 });
                let savedSearches = searches.list();
                assert.strictEqual(savedSearches.length, 2);

                for (let i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
            })

            it("list filter", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch({ search: "Error" });
                let savedSearches = searches.list();
                assert.ok(savedSearches.length > 0);

                for (let i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
            })

            it("list offset", async function () {
                let searches = this.service.savedSearches();
                searches = await searches.fetch({ offset: 2, count: 1 });
                let savedSearches = searches.list();
                assert.strictEqual(searches.paging().offset, 2);
                assert.strictEqual(searches.paging().perPage, 1);
                assert.strictEqual(savedSearches.length, 1);

                for (let i = 0; i < savedSearches.length; i++) {
                    assert.ok(savedSearches[i]);
                }
            })

            it("create, modify and delete", async function () {
                let name = "jssdk_savedsearch3";
                let originalSearch = "search * | head 1";
                let updatedSearch = "search * | head 10";
                let updatedDescription = "description";

                let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                let search = await searches.create({ search: originalSearch, name: name });
                assert.ok(search);
                assert.strictEqual(search.name, name);
                assert.strictEqual(search.properties().search, originalSearch);
                assert.ok(!search.properties().description);

                search = await search.update({ search: updatedSearch });
                assert.ok(search);
                assert.strictEqual(search.name, name);
                assert.strictEqual(search.properties().search, updatedSearch);
                assert.ok(!search.properties().description);

                search = await search.update({ description: updatedDescription });
                assert.ok(search);
                assert.strictEqual(search.name, name);
                assert.strictEqual(search.properties().search, updatedSearch);
                assert.strictEqual(search.properties().description, updatedDescription);

                search = await search.fetch();
                // Verify that we have the required fields
                assert.ok(search.fields().optional.length > 1);
                assert.ok(utils.indexOf(search.fields().optional, "disabled") > -1);

                await search.remove();
            })

            it("dispatch error", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search" }
                );
                let res;
                try {
                    res = await search.dispatch();
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("dispatch omitting optional arguments", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let originalSearch = "search index=_internal | head 1";

                let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                let search = await searches.create({ search: originalSearch, name: name });
                assert.ok(search);
                assert.strictEqual(search.name, name);
                assert.strictEqual(search.properties().search, originalSearch);
                assert.ok(!search.properties().description);
                [job, search] = await search.dispatch();
                assert.ok(job);
                assert.ok(search);
            })

            it("history with pagination", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let originalSearch = "search index=_internal | head 1";
                let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                let search = await searches.create({ search: originalSearch, name: name });
                assert.ok(search);
                [job, search] = await search.dispatch();
                assert.ok(job);
                assert.ok(search);
                await tutils.pollUntil(
                    job,
                    () => job.properties()["isDone"],
                    10
                );
                assert.ok(job);
                [jobs, search] = await search.history({ count: 1 });
                assert.ok(jobs.length > 0);
                assert.equal(jobs.length, 1);
            });

            it("history error", async function () {
                const name = "jssdk_savedsearch_" + getNextId();
                let search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search", sharing: "system" }
                );
                let res;
                try {
                    res = await search.history();
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("update error", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let search = new splunkjs.Service.SavedSearch(
                    this.loggedOutService,
                    name,
                    { owner: "nobody", app: "search", sharing: "system" }
                );
                let res;
                try {
                    res = await search.update({});
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("oneshot requires search string", async function () {
                let res;
                try {
                    res = await this.service.oneshotSearch({ name: "jssdk_oneshot_" + getNextId() });
                } catch (error) {
                    assert.ok(error);
                }
                assert.ok(!res);
            })

            it("Create, dispatch and history", async function () {
                let name = "jssdk_savedsearch_" + getNextId();
                let originalSearch = "search index=_internal | head 1";

                let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                let search = await searches.create({ search: originalSearch, name: name });
                assert.ok(search);
                assert.strictEqual(search.name, name);
                assert.strictEqual(search.properties().search, originalSearch);
                assert.ok(!search.properties().description);
                [job, search] = await search.dispatch({ force_dispatch: false, "dispatch.buckets": 295 });
                assert.ok(job);
                assert.ok(search);
                await tutils.pollUntil(
                    job,
                    function (j) {
                        return job.properties()["isDone"];
                    },
                    10
                );
                assert.strictEqual(job.properties().statusBuckets, 295);
                let originalJob = job;
                [jobs, search] = await search.history();
                assert.ok(jobs);
                assert.ok(jobs.length > 0);
                assert.ok(search);
                assert.ok(originalJob);

                let cancel = function (job) {
                    return async function () {
                        await job.cancel();
                    };
                };
                let found = false;
                let cancellations = [];
                for (let i = 0; i < jobs.length; i++) {
                    cancellations.push(cancel(jobs[i]));
                    found = found || (jobs[i].sid === originalJob.sid);
                }
                assert.ok(found);
                await search.remove();
                await utils.parallel(cancellations);
            })

            it("delete test saved searches", async function () {
                let searches = this.service.savedSearches({ owner: this.service.username, app: "sdkappcollection" });
                searches = await searches.fetch();
                let searchList = searches.list();
                let err = await utils.parallelEach(
                    searchList,
                    async function (search, idx,) {
                        if (utils.startsWith(search.name, "jssdk_")) {
                            await search.remove();
                        }
                    }
                );
                assert.ok(!err);
            })

            it("Job events fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                let res;
                try {
                    res = await job.events({});
                } catch (err) {
                    assert.ok(err);
                }
                assert.ok(!res);
            })

            it("Job preview fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                try {
                    job = await job.preview({});
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("Job results fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                try {
                    job = await job.results({});
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("Job searchlog fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                try {
                    job = await job.searchlog();
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("Job summary fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                try {
                    job = await job.summary({});
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("Job timeline fails", async function () {
                let job = new splunkjs.Service.Job(this.loggedOutService, "abc", {});
                try {
                    job = await job.timeline({});
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("SetupInfo succeeds", async function () {
                let app = new splunkjs.Service.Application(this.service, "sdkappcollection");
                let response = await app.setupInfo();
                app = response[1];
                assert.ok(app);
            })

            it("SetupInfo failure", async function () {
                let searches = new splunkjs.Service.Application(this.loggedOutService, "search");
                try {
                    await searches.setupInfo();
                } catch (err) {
                    assert.ok(err);
                }
            })

            it("UpdateInfo succeeds", async function () {
                let app = new splunkjs.Service.Application(this.service, "search");
                let response = await app.updateInfo();
                app = response[1];
                assert.ok(app);
                assert.strictEqual(app.name, 'search');
            })

            it("UpdateInfo failure", async function () {
                let app = new splunkjs.Service.Application(this.loggedOutService, "sdkappcollection");
                try {
                    await app.updateInfo();
                } catch (err) {
                    assert.ok(err);
                }
            })
        })
    );
};

if (module.id === __filename && module.parent.id.includes('mocha')) {
    var splunkjs = require('../../index');
    var options = require('../cmdline');

    let cmdline = options.create().parse(process.argv);

    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }

    let svc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password,
        version: cmdline.opts.version
    });

    let loggedOutSvc = new splunkjs.Service({
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password + 'wrong',
        version: cmdline.opts.version
    });

    // Exports tests on a successful login
    module.exports = new Promise(async (resolve, reject) => {
        try {
            await svc.login();
            return resolve(exports.setup(svc, loggedOutSvc))
        } catch (error) {
            throw new Error("Login failed - not running tests", error || "");
        }
    });
}
