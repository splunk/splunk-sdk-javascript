splunkjs.Logger.setLevel("ALL");
assert = chai.assert;

describe('Utils tests', () => {
    it("Callback#callback to object success", function (done) {
        let successfulFunction = function (callback) {
            callback(null, "one", "two");
        };

        successfulFunction(function (err, one, two) {
            assert.strictEqual(one, "one");
            assert.strictEqual(two, "two");
            done();
        });
    });

    it("Callback#callback to object error - single argument", function (done) {
        let successfulFunction = function (callback) {
            callback("one");
        };

        successfulFunction(function (err, one, two) {
            assert.strictEqual(err, "one");
            assert.ok(!one);
            assert.ok(!two);
            done();
        });
    });

    it("Callback#callback to object error - multi argument", function (done) {
        let successfulFunction = function (callback) {
            callback(["one", "two"]);
        };

        successfulFunction(function (err, one, two) {
            assert.strictEqual(err[0], "one");
            assert.strictEqual(err[1], "two");
            assert.ok(!one);
            assert.ok(!two);
            done();
        });
    });

    it("keyOf works", function (done) {
        assert.ok(splunkjs.Utils.keyOf(3, { a: 3, b: 5 }));
        assert.ok(!splunkjs.Utils.keyOf(3, { a: 12, b: 6 }));
        done();
    });

    it("bind", function (done) {
        let f;
        (function () {
            f = function (a) {
                this.a = a;
            };
        })();
        let q = {};
        let g = splunkjs.Utils.bind(q, f);
        g(12);
        assert.strictEqual(q.a, 12);
        done();
    });

    it("trim", function (done) {
        assert.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");

        let realTrim = String.prototype.trim;
        String.prototype.trim = null;
        assert.strictEqual(splunkjs.Utils.trim("  test of something  \n\r  \t"), "test of something");
        String.prototype.trim = realTrim;

        done();
    });

    it("indexOf", function (done) {
        assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 5], 3), 2);
        assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 3], 3), 2);
        assert.strictEqual(splunkjs.Utils.indexOf([1, 2, 3, 4, 5], 12), -1);
        done();
    });

    it("contains", function (done) {
        assert.ok(splunkjs.Utils.contains([1, 2, 3, 4, 5], 3));
        assert.ok(splunkjs.Utils.contains([1, 2, 3, 4, 3], 3));
        assert.ok(!splunkjs.Utils.contains([1, 2, 3, 4, 5], 12));
        done();
    });

    it("startsWith", function (done) {
        assert.ok(splunkjs.Utils.startsWith("abcdefg", "abc"));
        assert.ok(!splunkjs.Utils.startsWith("bcdefg", "abc"));
        done();
    });

    it("endsWith", function (done) {
        assert.ok(splunkjs.Utils.endsWith("abcdef", "def"));
        assert.ok(!splunkjs.Utils.endsWith("abcdef", "bcd"));
        done();
    });

    it("toArray", function (done) {
        (function () {
            let found = splunkjs.Utils.toArray(arguments);
            let expected = [1, 2, 3, 4, 5];
            for (let i = 0; i < found.length; i++) {
                assert.strictEqual(found[i], expected[i]);
            }
        })(1, 2, 3, 4, 5);
        done();
    });

    it("isArray", function (done) {
        let a = [1, 2, 3, 4, 5];
        assert.ok(splunkjs.Utils.isArray(a));
        done();
    });

    it("isFunction", function (done) {
        assert.ok(splunkjs.Utils.isFunction(function () { }));
        assert.ok(!splunkjs.Utils.isFunction(3));
        assert.ok(!splunkjs.Utils.isFunction("abc"));
        assert.ok(!splunkjs.Utils.isFunction({}));
        done();
    });

    it("isNumber", function (done) {
        assert.ok(splunkjs.Utils.isNumber(3));
        assert.ok(splunkjs.Utils.isNumber(-2.55113e12));
        assert.ok(!splunkjs.Utils.isNumber("3"));
        assert.ok(!splunkjs.Utils.isNumber({ 3: 5 }));
        done();
    });

    it("isObject", function (done) {
        assert.ok(splunkjs.Utils.isObject({}));
        assert.ok(!splunkjs.Utils.isObject(3));
        assert.ok(!splunkjs.Utils.isObject("3"));
        done();
    });

    it("isEmpty", function (done) {
        assert.ok(splunkjs.Utils.isEmpty({}));
        assert.ok(splunkjs.Utils.isEmpty([]));
        assert.ok(splunkjs.Utils.isEmpty(""));
        assert.ok(!splunkjs.Utils.isEmpty({ a: 3 }));
        assert.ok(!splunkjs.Utils.isEmpty([1, 2]));
        assert.ok(!splunkjs.Utils.isEmpty("abc"));
        done();
    });

    it("forEach", function (done) {
        let a = [1, 2, 3, 4, 5];
        splunkjs.Utils.forEach(
            a,
            function (elem, index, list) {
                assert.strictEqual(a[index], elem);
            }
        );
        let b = { 1: 2, 2: 4, 3: 6 };
        splunkjs.Utils.forEach(
            b,
            function (elem, key, obj) {
                assert.strictEqual(b[key], elem);
            }
        );
        splunkjs.Utils.forEach(null, function (elem, key, obj) { });
        let c = { length: 5, 1: 12, 2: 15, 3: 8 };
        splunkjs.Utils.forEach(
            c,
            function (elem, key, obj) {
                assert.strictEqual(c[key], elem);
            }
        );
        done();
    });

    it("extend", function (done) {
        let found = splunkjs.Utils.extend({}, { a: 1, b: 2 }, { c: 3, b: 4 });
        let expected = { a: 1, b: 4, c: 3 };
        for (let k in found) {
            if (found.hasOwnProperty(k)) {
                assert.strictEqual(found[k], expected[k]);
            }
        }
        done();
    });

    it("clone", function (done) {
        let a = { a: 1, b: 2, c: { p: 5, q: 6 } };
        let b = splunkjs.Utils.clone(a);
        splunkjs.Utils.forEach(a, function (val, key, obj) { assert.strictEqual(val, b[key]); });
        a.a = 5;
        assert.strictEqual(b.a, 1);
        a.c.p = 4;
        assert.strictEqual(b.c.p, 4);
        done();
        assert.strictEqual(splunkjs.Utils.clone(3), 3);
        assert.strictEqual(splunkjs.Utils.clone("asdf"), "asdf");
        let p = [1, 2, [3, 4], 3];
        let q = splunkjs.Utils.clone(p);
        splunkjs.Utils.forEach(p, function (val, index, arr) { assert.strictEqual(p[index], q[index]); });
        p[0] = 3;
        assert.strictEqual(q[0], 1);
        p[2][0] = 7;
        assert.strictEqual(q[2][0], 7);
    });

    it("namespaceFromProperties", function (done) {
        let a = splunkjs.Utils.namespaceFromProperties(
            {
                acl: {
                    owner: "boris",
                    app: "factory",
                    sharing: "system",
                    other: 3
                },
                more: 12
            });
        splunkjs.Utils.forEach(
            a,
            function (val, key, obj) {
                assert.ok((key === "owner" && val === "boris") ||
                    (key === "app" && val === "factory") ||
                    (key === "sharing" && val === "system"));
            }
        );
        done();
    });

    it("namespaceFromProperties - bad data", function (done) {
        let undefinedProps;
        let a = splunkjs.Utils.namespaceFromProperties(undefinedProps);
        assert.strictEqual(a.owner, '');
        assert.strictEqual(a.app, '');
        assert.strictEqual(a.sharing, '');

        let b = splunkjs.Utils.namespaceFromProperties(undefinedProps);
        assert.strictEqual(b.owner, '');
        assert.strictEqual(b.app, '');
        assert.strictEqual(b.sharing, '');
        done();
    });

    it("While success", async function () {
        let i = 0;
        try {
            await utils.whilst(
                function () { return i++ < 3; },
                async function () {
                    await utils.sleep(0);
                }
            );
        } catch (error) {
            assert.ok(!error);
        }
    });

    it("While success deep", async function () {
        let i = 0;
        try {
            await utils.whilst(
                function () { return i++ < (isBrowser ? 100 : 10000); },
                async function () {
                    await utils.sleep(0);
                }
            );
        } catch (error) {
            assert.ok(!error);
        }
    });

    it("While error", async function () {
        let i = 0;
        try {
            let res = await utils.whilst(
                function () { return i++ < (isBrowser ? 100 : 10000); },
                async function () {
                    await utils.sleep(0);
                    return i === (isBrowser ? 50 : 10000) ? 1 : null;
                }
            );
            assert.ok(res);
        } catch (error) {
            assert.ok(error);
            assert.strictEqual(error, 1);
        }

    });

    it("Whilst sans condition is never", async function () {
        let i = false;
        try {
            await utils.whilst(
                undefined,
                function () {
                    i = true;
                }
            );
            assert.strictEqual(i, false);
        } catch (error) {
            assert.ok(!error);
        }


    });

    it("Whilst with empty body does nothing", async function () {
        let i = true;
        try {
            let res = await utils.whilst(
                function () {
                    if (i) {
                        i = false;
                        return true;
                    }
                    else {
                        return i;
                    }
                },
                undefined
            );
            assert.ok(!res);
        } catch (error) {
            assert.ok(!error);
        }
    });

    it("Parallel success", async function () {
        let [err, one, two] = await utils.parallel([
            function () {
                return [null, 1];
            },
            function () {
                return [null, 2, 3];
            }]
        );
        assert.ok(!err);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Parallel success - outside of arrays", async function () {
        let [err, one, two] = await utils.parallel(
            function () { return [null, 1]; },
            function () { return [null, 2, 3]; },
        );
        assert.ok(!err);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Parallel success - no reordering", async function () {
        let [err, one, two] = await utils.parallel([
            async function () {
                await utils.sleep(1);
                return [null, 1];
            },
            function () {
                return [null, 2, 3];
            }]
        );
        assert.ok(!err);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Parallel error", async function () {
        let [err, one, two] = await utils.parallel([
            function () {
                return [null, 1];
            },
            function () {
                return [null, 2, 3];
            },
            async function () {
                await utils.sleep(0);
                return ["ERROR"];
            }]
        );
        assert.ok(err === "ERROR");
        assert.ok(!one);
        assert.ok(!two);
    });

    it("Parallel no tasks", async function () {
        let [err, result] = await utils.parallel(
            []
        );
        assert.ok(!err);
    });

    it("Series success", async function () {
        let [err, one, two] = await utils.series([
            function () {
                return [null, 1];
            },
            function () {
                return [null, 2, 3];
            }]
        );
        assert.ok(!err);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Series success - outside of array", async function () {
        let [err, one, two] = await utils.series(
            function () {
                return [null, 1];
            },
            function () {
                return [null, 2, 3];
            }
        );
        assert.ok(!err);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Series reordering success", async function () {
        let keeper = 0;
        let [err, one, two] = await utils.series([
            async function () {
                await utils.sleep(10);
                assert.strictEqual(keeper++, 0);
                return [null, 1];
            },
            function () {
                assert.strictEqual(keeper++, 1);
                return [null, 2, 3];
            }]
        );
        assert.ok(!err);
        assert.strictEqual(keeper, 2);
        assert.strictEqual(one, 1);
        assert.strictEqual(two[0], 2);
        assert.strictEqual(two[1], 3);
    });

    it("Series error", async function () {
        let [err, one, two] = await utils.series([
            function () {
                return [null, 1];
            },
            function () {
                return ["ERROR", 2, 3];
            }]
        );
        assert.strictEqual(err, "ERROR");
        assert.ok(!one);
        assert.ok(!two);
    });

    it("Series no tasks", async function () {
        let [err, result] = await utils.series(
            []
        );
        assert.ok(!err);
    });

    it("Parallel map success", async function () {
        let [err, vals] = await utils.parallelMap(
            [1, 2, 3],
            function (val, idx) {
                return [null, val + 1];
            }
        );
        assert.ok(!err);
        assert.strictEqual(vals[0], 2);
        assert.strictEqual(vals[1], 3);
        assert.strictEqual(vals[2], 4);
    });

    it("Parallel map reorder success", async function () {
        let [err, vals] = await utils.parallelMap(
            [1, 2, 3],
            async function (val, idx) {
                if (val === 2) {
                    await utils.sleep(100);
                    return [null, val + 1];
                }
                else {
                    return [null, val + 1];
                }
            }
        );
        assert.strictEqual(vals[0], 2);
        assert.strictEqual(vals[1], 3);
        assert.strictEqual(vals[2], 4);
    });

    it("Parallel map error", async function () {
        let [err, vals] = await utils.parallelMap(
            [1, 2, 3],
            function (val, idx) {
                if (val === 2) {
                    return [5];
                }
                else {
                    return [null, val + 1];
                }
            }
        );
        assert.ok(err);
        assert.ok(!vals);
        assert.strictEqual(err, 5);
    });

    it("Series map success", async function () {
        let keeper = 1;
        let [err, vals] = await utils.seriesMap(
            [1, 2, 3],
            function (val, idx) {
                assert.strictEqual(keeper++, val);
                return [null, val + 1];
            }
        );
        assert.ok(!err);
        assert.strictEqual(vals[0], 2);
        assert.strictEqual(vals[1], 3);
        assert.strictEqual(vals[2], 4);
        assert.strictEqual(vals[2], keeper);
    });

    it("Series map error", async function () {
        let [err, vals] = await utils.seriesMap(
            [1, 2, 3],
            function (val, idx) {
                if (val === 2) {
                    return [5];
                }
                else {
                    return [null, val + 1];
                }
            }
        );
        assert.ok(err);
        assert.ok(!vals);
        assert.strictEqual(err, 5);
    });

    it("Parallel each reorder success", async function () {
        let total = 0;
        let err = await utils.parallelEach(
            [1, 2, 3],
            async function (val, idx) {
                let go = function () {
                    total += val;
                };
                if (idx === 1) {
                    await utils.sleep(100);
                    go();
                } else {
                    go();
                }
            }
        );
        assert.ok(!err);
        assert.strictEqual(total, 6);
    });

    it("Series each success", async function () {
        let results = [1, 3, 6];
        let total = 0;
        let err = await utils.seriesEach(
            [1, 2, 3],
            function (val, idx) {
                total += val;
                assert.strictEqual(total, results[idx]);
            }
        );
        assert.ok(!err);
        assert.strictEqual(total, 6);
    });
})