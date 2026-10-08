// Properties of the JavaScript port that don't need the Python fixtures.
const test = require("node:test");
const assert = require("node:assert/strict");
const IS = require("../itemiset.js");

test("halves round up", () => {
  assert.deepEqual([0.5, 1.5, 2.5, -0.5, -1.5].map(IS.roundHalfUp), [1, 2, 3, 0, -1]);
});

test("natural sort ignores case and compares numbers", () => {
  const s = ["CNOT10", "cnot2", "CNOT1", "AGO2", "ago1"].sort(IS.compareNatural);
  assert.deepEqual(s, ["ago1", "AGO2", "CNOT1", "cnot2", "CNOT10"]);
  assert.deepEqual(["b2", "B02", "b1"].sort(IS.compareNatural), ["b1", "b2", "B02"]);
});

function randomSets(rand, k) {
  const names = ["A", "B", "C"].slice(0, k), sets = names.map((n) => [n, []]);
  for (let m = 1; m < 1 << k; m++) {
    const n = rand() < 0.35 ? 0 : 1 + Math.floor(rand() * 15);
    const members = names.filter((_, i) => m & (1 << i));
    for (let j = 0; j < n; j++) for (const s of members) sets[names.indexOf(s)][1].push(members.join("").toLowerCase() + j);
  }
  return sets;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("500 random layouts pass every check", () => {
  const rand = mulberry32(7);
  let n = 0;
  for (let t = 0; t < 500; t++) {
    const k = 1 + Math.floor(rand() * 3), sets = randomSets(rand, k);
    if (!sets.some((s) => s[1].length)) continue;
    const opts = { showEmpty: rand() < 0.3, targetAspect: [0.6, 1.2, 2.2, 3.0][Math.floor(rand() * 4)] };
    const lay = IS.layoutSets(sets, opts);
    const res = IS.checkLayout(lay, sets);
    for (const [name, ok] of Object.entries(res)) assert.ok(ok, `${name} failed for ${JSON.stringify(sets)}`);
    n++;
  }
  assert.ok(n > 400);
});

test("the checks catch a broken layout", () => {
  const lay = IS.layoutSets([["A", ["a1", "a2", "ab"]], ["B", ["ab", "b1"]]]);
  lay.cells[0] = Object.assign({}, lay.cells[0], { x: lay.cells[0].x + 20 });
  const res = IS.checkLayout(lay);
  assert.ok(!(res["Each set is one piece"] && res["Each zone is one piece"]));
});

test("renderSVG draws every item as text", () => {
  const lay = IS.layoutSets([["DDX6", ["EDC4", "PATL1", "CNOT1"]], ["LSM14A", ["EDC4", "LSM14B"]]]);
  const { svg, width, height } = IS.renderSVG(lay, { categories: { EDC4: "Decapping" } });
  for (const n of ["EDC4", "PATL1", "CNOT1", "LSM14B"]) assert.ok(svg.includes(`>${n}</text>`), n);
  assert.ok(width > 100 && height > 50);
  assert.ok(svg.includes("#C8102E"), "first category colour");
});

test("zone rows list every item once", () => {
  const lay = IS.layoutSets([["A", ["x", "y"]], ["B", ["y", "z"]]]);
  const rows = IS.zoneRows(lay);
  assert.deepEqual(rows.map((r) => r.item), ["x", "y", "z"]);
  assert.deepEqual(rows.map((r) => r.zone), ["A", "A & B", "B"]);
});
