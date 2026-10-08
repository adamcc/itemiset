// The JavaScript layout must match the Python reference cell for cell.
// Fixtures are written by nbs/04_fixtures.ipynb.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const IS = require("../itemiset.js");

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "layouts.json"), "utf8"));

const jsOptions = (o) => ({
  showEmpty: o.show_empty, bottom: o.bottom, cellAspect: o.cell_aspect,
  targetAspect: o.target_aspect, fontsize: o.fontsize, maxWidth: o.max_width,
});

function sameCells(got, want, name) {
  assert.equal(got.length, want.length, `${name}: number of cells`);
  for (let i = 0; i < want.length; i++) {
    const [gx, gy, gz, gi, gp] = got[i], [wx, wy, wz, wi, wp] = want[i];
    const where = `${name}: cell ${i} (Python has ${JSON.stringify(want[i])}, JS has ${JSON.stringify(got[i])})`;
    assert.ok(gx === wx && gy === wy, where);   // === so that -0 equals 0
    assert.deepEqual(gz, wz, where);
    assert.equal(gi, wi, where);
    assert.equal(gp, wp, where);
  }
}

test("fixtures exist", () => assert.ok(fx.cases.length > 100));

for (const c of fx.cases) {
  test(c.name, () => {
    const lay = IS.layoutSets(c.sets, jsOptions(c.options));
    const got = IS.layoutRecord(lay), want = c.expected;
    assert.deepEqual(got.roles, want.roles, `${c.name}: roles`);
    assert.deepEqual(got.widths, want.widths, `${c.name}: widths`);
    assert.deepEqual(got.notes, want.notes, `${c.name}: notes`);
    assert.ok(Math.abs(got.score - want.score) <= 1, `${c.name}: score ${got.score} vs ${want.score}`);
    sameCells(got.cells, want.cells, c.name);
  });
}

for (const e of fx.errors) {
  test(`error: ${e.name}`, () => {
    assert.throws(() => IS.layoutSets(e.sets, jsOptions(e.options)));
  });
}
