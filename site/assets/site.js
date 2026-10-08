/* ItemiSet website: page behaviour for index.html, app.html and roadmap.html.
   Layout and drawing come from assets/itemiset.js (the library); this file only wires up the pages. */
(function () {
"use strict";
const IS = window.ItemiSet;
const EX = window.ITEMISET_EXAMPLES || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const vw = () => document.documentElement.clientWidth;
const compact = () => vw() < 640;
function joinNames(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
const zkey = (z) => z.join("\u0000");

/* ---------------- parsing pasted lists ---------------- */
function parseList(text) {
  const seen = new Set(), out = [];
  (text || "").split(/[\s,;]+/).forEach((tok) => {
    if (!tok) return;
    const m = tok.match(/^(.+?):(-?\d+(?:\.\d+)?)$/);
    const name = m ? m[1] : tok, score = m ? parseFloat(m[2]) : undefined;
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ name, score });
  });
  return out;
}
function parseCats(text) {
  const map = {}, order = [];
  (text || "").split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i < 0) return;
    const name = line.slice(0, i).trim();
    if (!name) return;
    if (!order.includes(name)) order.push(name);
    line.slice(i + 1).split(/[\s,;]+/).forEach((it) => { if (it && !(it in map)) map[it] = name; });
  });
  return { map, order };
}
function catsToText(categories) {
  const by = {};
  for (const [item, cat] of Object.entries(categories || {})) (by[cat] = by[cat] || []).push(item);
  return Object.entries(by).map(([c, items]) => `${c}: ${items.join(", ")}`).join("\n");
}

/* ---------------- an interactive figure ---------------- */
let UID = 0;
class Figure {
  constructor(root) {
    this.root = root; this.uid = "f" + (UID++);
    this.slot = $(".svgslot", root); this.foot = $(".figfoot", root);
    this.defaultFoot = this.foot ? this.foot.innerHTML : "";
    this.count = false; this.query = ""; this.pinned = false;
    $$(".seg button", root).forEach((b) => b.addEventListener("click", () => {
      this.count = b.dataset.mode === "counts";
      $$(".seg button", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      this.applyState();
    }));
    const search = $(".search", root);
    if (search) search.addEventListener("input", () => { this.query = search.value.trim().toLowerCase(); this.applyState(); });
    const on = (act, fn) => { const b = $(`[data-act="${act}"]`, root); if (b) b.addEventListener("click", () => fn(b)); };
    on("replay", () => this.replay());
    on("copy", async (b) => {
      try { await navigator.clipboard.writeText(this.svgText); b.textContent = "Copied"; }
      catch (e) { b.textContent = "Copy blocked"; }
      setTimeout(() => (b.textContent = "Copy SVG"), 1600);
    });
    on("svg", () => this.download("itemiset.svg", this.svgText, "image/svg+xml"));
    on("csv", () => this.download("itemiset-zones.csv", this.zonesCSV(), "text/csv"));
    this.slot.addEventListener("pointerover", (e) => this.hover(e));
    this.slot.addEventListener("click", (e) => this.hover(e, true));
    this.slot.addEventListener("pointerleave", () => { if (!this.pinned) this.clearHover(); });
  }
  draw(pairs, opts = {}) {
    this.pairs = pairs; this.opts = opts;
    const nonEmpty = pairs.some((p) => p[1].length);
    if (!nonEmpty) {
      this.lay = null; this.svg = null; this.svgText = "";
      this.slot.innerHTML = `<p style="padding:40px 16px;text-align:center;color:#566074">Add some items to any set to draw a diagram.</p>`;
      return null;
    }
    const lay = IS.layoutSets(pairs, { targetAspect: opts.targetAspect, bottom: opts.bottom, showEmpty: opts.showEmpty });
    this.lay = lay;
    const small = compact();
    const r = IS.renderSVG(lay, {
      cellHeight: small ? 20 : 22, fontSize: small ? 10 : 11, uid: this.uid,
      categories: opts.categories, categoryColours: opts.categoryColours, scores: opts.scores,
      ariaLabel: opts.aria,
    });
    this.svgText = r.svg; this.natural = r.width;
    this.slot.innerHTML = r.svg;
    this.svg = $("svg", this.slot);
    this.fit(); this.applyState();
    return lay;
  }
  fit() {
    if (!this.svg) return;
    const avail = this.slot.parentElement.clientWidth - 12;
    const w = this.natural > avail && avail / this.natural >= 0.66 ? avail : this.natural;
    this.svg.style.width = w + "px"; this.svg.style.height = "auto";
  }
  applyState() {
    if (!this.svg) return;
    this.svg.classList.toggle("countmode", this.count);
    const q = this.query;
    this.svg.classList.toggle("dim", !!q);
    let hits = 0;
    $$(".c", this.svg).forEach((g) => {
      const c = this.lay.cells[+g.dataset.i];
      const hit = !!q && c.item != null && c.item.toLowerCase().includes(q);
      if (hit) hits++;
      g.classList.toggle("hit", hit);
    });
    if (!this.foot) return;
    if (q) this.foot.innerHTML = hits ? `<b>${hits}</b> match${hits > 1 ? "es" : ""} for “${esc(q)}”.` : `No item matches “${esc(q)}”. Check the spelling, or clear the search.`;
    else if (!this.pinned) this.foot.innerHTML = this.defaultFoot;
  }
  replay() {
    if (!this.svg || reduceMotion) return;
    const n = this.lay.cells.length;
    this.svg.style.setProperty("--step", Math.max(2, Math.min(14, 1400 / n)) + "ms");
    this.svg.classList.remove("building"); void this.svg.getBBox(); this.svg.classList.add("building");
  }
  clearHover() {
    if (!this.svg) return;
    this.svg.classList.remove("zonehl");
    $$(".inzone", this.svg).forEach((g) => g.classList.remove("inzone"));
    if (!this.query && this.foot) this.foot.innerHTML = this.defaultFoot;
  }
  hover(e, pin) {
    if (!this.lay) return;
    const g = e.target.closest && e.target.closest(".c");
    if (!g) { if (pin) { this.pinned = false; this.clearHover(); } return; }
    if (this.pinned && !pin) return;
    this.pinned = !!pin;
    const c = this.lay.cells[+g.dataset.i], k = zkey(c.zone);
    this.svg.classList.add("zonehl");
    $$(".c", this.svg).forEach((x) => x.classList.toggle("inzone", zkey(this.lay.cells[+x.dataset.i].zone) === k));
    if (!this.foot) return;
    const drawn = this.lay.names.filter((n) => this.lay.cells.some((q) => q.zone.includes(n)));
    const ins = c.zone, outs = drawn.filter((n) => !c.zone.includes(n));
    const zoneN = this.lay.cells.filter((x) => zkey(x.zone) === k && x.item != null).length;
    let html;
    if (c.item == null && !c.placeholder) html = `<b>Filler cell.</b> It keeps ${esc(ins[0])} in one piece and isn't an item, so this strip isn't proportional.`;
    else if (c.placeholder) html = `<b>Empty zone.</b> No items are in ${esc(joinNames(ins))}${outs.length ? " but not " + esc(joinNames(outs)) : ""}.`;
    else {
      const where = ins.length === 1 ? `only in <b>${esc(ins[0])}</b>` : ins.length === drawn.length ? `in all ${ins.length === 2 ? "both" : "three"} sets` : `in <b>${esc(joinNames(ins))}</b>`;
      html = `<b>${esc(c.item)}</b> is ${where}, one of ${zoneN} item${zoneN > 1 ? "s" : ""} in that zone.`;
      const cat = this.opts.categories && this.opts.categories[c.item];
      if (cat) {
        const col = IS.categoryColours(this.lay, this.opts.categories, this.opts.categoryColours || {})[cat];
        html += ` Group: <span style="color:${col};font-weight:700">${esc(cat)}</span>.`;
      }
      const sc = this.opts.scores && this.opts.scores[c.item];
      if (sc != null) html += ` ${esc(this.opts.scoreLabel || "Score")}: ${sc}.`;
    }
    this.foot.innerHTML = html;
  }
  zonesCSV() {
    if (!this.lay) return "";
    const rows = IS.zoneRows(this.lay, this.opts.categories || {});
    const cols = ["item", "zone", ...this.lay.names, "category"];
    const q = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.map(q).join(",")].concat(rows.map((r) => cols.map((c) => q(r[c])).join(","))).join("\n") + "\n";
  }
  download(name, text, type) {
    if (!text) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
}

/* ---------------- hero (index) ---------------- */
let hero = null;
function drawHero(anim) {
  const ex = EX.pbody;
  if (!hero || !ex) return;
  const w = vw();
  hero.draw(ex.sets, {
    targetAspect: w < 640 ? 0.5 : w < 980 ? 1.35 : 2.2,
    categories: ex.categories, categoryColours: ex.category_colours,
    aria: "Itemized set diagram of proteins found by three P-body baits",
  });
  if (anim) hero.replay();
}

/* ---------------- how a layout is built (index) ---------------- */
let stepN = 1;
function demoSets() {
  const mk = (p, n) => Array.from({ length: n }, (_, i) => p + (i + 1));
  const z = { a: mk("a", 7), ac: mk("ac", 4), ab: mk("ab", 5), abc: mk("abc", 3), b: mk("b", 6), bc: mk("bc", 3), c: mk("c", 8) };
  return [["Left set", [...z.a, ...z.ac, ...z.ab, ...z.abc]],
          ["Right set", [...z.b, ...z.bc, ...z.ab, ...z.abc]],
          ["Bottom set", [...z.c, ...z.ac, ...z.abc, ...z.bc]]];
}
function snakeOrder(w, n, innerRight) {
  const out = []; let r = 0;
  while (out.length < n) {
    const rtl = r % 2 === 0 ? innerRight : !innerRight;
    for (let i = 0; i < w && out.length < n; i++) out.push([rtl ? w - 1 - i : i, r]);
    r++;
  }
  return out;
}
function drawSteps() {
  const host = $("#stepFig");
  if (!host) return;
  const lay = IS.layoutSets(demoSets(), { targetAspect: 1.3, bottom: "Bottom set" });
  const p = lay.plan, names = ["Left", "Middle", "Right"], inner = [true, false, false];
  const overlay = (L, geo) => {
    const { cw, ch, top, left } = geo;
    const X = (x) => (x - left) * cw, Y = (rowTop) => (rowTop - top) * ch;
    let s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1C2433"/></marker></defs>`;
    p.widths.forEach((w, i) => {
      if (!w) return;
      const x0 = p.xs[i], h = p.heights[i];
      if (stepN === 1) {
        s += `<rect x="${X(x0) + 1}" y="${Y(-h) + 1}" width="${w * cw - 2}" height="${h * ch - 2}" fill="none" stroke="#1C2433" stroke-width="1.5" stroke-dasharray="5 4" rx="4"/>`;
        s += `<text x="${X(x0 + w / 2)}" y="${Y(-h) - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#1C2433">${names[i]}</text>`;
      }
      if (stepN === 2) {
        const n = L.cells.filter((c) => c.y >= 0 && c.x >= x0 && c.x < x0 + w).length;
        const pts = snakeOrder(w, n, inner[i]).map(([c, r]) => `${X(x0 + c + 0.5)},${Y(-r - 0.5)}`);
        if (!pts.length) return;
        s += `<polyline points="${pts.join(" ")}" fill="none" stroke="#1C2433" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#arr)" opacity=".85"/>`;
        const [fx, fy] = pts[0].split(",");
        s += `<circle cx="${fx}" cy="${fy}" r="3.5" fill="#1C2433"/>`;
      }
    });
    if (stepN === 3) {
      const W = (p.totalW) * cw;
      s += `<line x1="-6" x2="${W + 6}" y1="${Y(0)}" y2="${Y(0)}" stroke="#1C2433" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      s += `<text x="${W + 4}" y="${Y(0) - 5}" text-anchor="end" font-size="11" font-weight="600" fill="#1C2433">baseline</text>`;
    }
    return s;
  };
  const dim = (c) => (stepN === 3 ? c.y >= 0 : c.y < 0);
  const r = IS.renderSVG(lay, { cellHeight: 24, fontSize: 11, uid: "st", overlay, dim, labels: false, counts: false,
                                padTop: 22, padLeft: 14, padRight: 14, ariaLabel: `Layout step ${stepN}` });
  host.innerHTML = r.svg;
  const svg = $("svg", host);
  svg.style.width = "100%"; svg.style.height = "auto"; svg.style.maxWidth = r.width + "px";
}

/* ---------------- playground (index and app) ---------------- */
function playgroundMarkup(full) {
  const setCard = (i, colour) => `<div class="setin" style="--k:${colour}"><input id="n${i}" aria-label="Name of set ${i + 1}"><textarea id="t${i}" rows="${full ? 6 : 4}" aria-label="Members of set ${i + 1}"></textarea><div class="cnt" id="c${i}"></div></div>`;
  return `
  <div class="presets" style="margin-top:14px">
    <button class="btn" type="button" data-preset="pbody">P-body baits</button>
    <button class="btn" type="button" data-preset="weighted">Weighted by how often found</button>
    <button class="btn" type="button" data-preset="two">Two sets</button>
    <button class="btn" type="button" data-preset="decay">Venn mode</button>
    <button class="btn" type="button" data-preset="clear">Clear</button>
  </div>
  <div class="play">
    <div class="inputs">
      ${setCard(0, "#1DA1D8")}${setCard(1, "#E0197D")}${setCard(2, "#C2B000")}
      <div class="catin"><label for="cats">Groups</label><div class="small muted">One per line: <code>Name: item, item</code>. Colours follow line order.</div><textarea id="cats" rows="3"></textarea></div>
      <div class="opts">
        <div class="opt"><label for="oBottom">Bottom set</label><select id="oBottom"></select></div>
        <div class="opt"><label for="oAspect">Shape: <span id="oAspectV"></span></label><input type="range" id="oAspect" min="0.5" max="3" step="0.05"></div>
        <label class="check" style="grid-column:1/-1"><input type="checkbox" id="oEmpty"> Show empty zones (Venn mode)</label>
      </div>
    </div>
    <div>
      <div class="figure" id="playFig" style="margin-top:0">
        <div class="figbar">
          <div class="seg" role="group" aria-label="Show">
            <button type="button" aria-pressed="true" data-mode="names">Names</button>
            <button type="button" aria-pressed="false" data-mode="counts">Counts only</button>
          </div>
          <span class="spacer"></span>
          <input class="search" type="search" placeholder="Find an item" aria-label="Find an item">
          <button class="btn" type="button" data-act="replay">Replay</button>
          <button class="btn" type="button" data-act="copy">Copy SVG</button>
          ${full ? `<button class="btn" type="button" data-act="svg">Download SVG</button><button class="btn" type="button" data-act="csv">Download zones CSV</button>` : ""}
        </div>
        <div class="figscroll"><div class="svgslot"></div></div>
        <div class="figfoot" aria-live="polite">Tap or hover a cell to see where it belongs. Tap empty space to let go.</div>
      </div>
      <div class="notes" id="playNotes" aria-live="polite"></div>
      <table class="zonetable" id="zoneTable" aria-label="Zone sizes"></table>
    </div>
  </div>`;
}

function initPlayground(host) {
  host.innerHTML = playgroundMarkup(host.hasAttribute("data-full"));
  const play = new Figure($("#playFig"));
  const pIn = [0, 1, 2].map((i) => ({ n: $("#n" + i), t: $("#t" + i), c: $("#c" + i) }));
  const oBottom = $("#oBottom"), oAspect = $("#oAspect"), oEmpty = $("#oEmpty"), cats = $("#cats");
  let presetNote = "", scoreLabel = "Score";
  const pb = EX.pbody, dec = EX.decay;
  const linesOf = (items, scores) => items.map((n) => (scores ? `${n}:${scores[n]}` : n)).join("\n");
  const PRESETS = {
    pbody: () => ({ sets: pb.sets.map(([n, v]) => [n, linesOf(v)]), cats: catsToText(pb.categories) }),
    weighted: () => ({ sets: pb.sets.map(([n, v]) => [n, linesOf(v, pb.scores)]), cats: "",
                       note: "Text weight shows how many of the study's 118 baits found each protein: the darker, the more common.",
                       scoreLabel: "Found by this many of the study's 118 baits" }),
    two: () => ({ sets: pb.sets.slice(0, 2).map(([n, v]) => [n, linesOf(v)]).concat([["", ""]]), cats: catsToText(pb.categories) }),
    decay: () => ({ sets: dec.sets.map(([n, v]) => [n, linesOf(v)]), cats: "", showEmpty: true,
                    note: "Nothing is found by DDX6 and PRRC2B alone, so that zone gets one ∅ cell." }),
    clear: () => ({ sets: [["Set 1", ""], ["Set 2", ""], ["Set 3", ""]], cats: "" }),
  };
  function load(key) {
    const p = PRESETS[key]();
    p.sets.forEach(([n, t], i) => { pIn[i].n.value = n; pIn[i].t.value = t; });
    cats.value = p.cats || "";
    oEmpty.checked = !!p.showEmpty;
    presetNote = p.note || ""; scoreLabel = p.scoreLabel || "Score";
    oBottom.value = "auto";
    draw(true);
  }
  function draw(anim) {
    const raw = pIn.map((p, i) => ({ name: p.n.value.trim() || `Set ${i + 1}`, items: parseList(p.t.value) }));
    raw.forEach((s, i) => { pIn[i].c.textContent = s.items.length ? `${s.items.length} item${s.items.length > 1 ? "s" : ""}` : "Empty, so not drawn"; });
    // the same set name twice would merge two inputs; keep the first
    const seen = new Set(), pairs = [], scores = {};
    raw.forEach((s) => {
      if (seen.has(s.name)) return;
      seen.add(s.name);
      pairs.push([s.name, s.items.map((x) => x.name)]);
      s.items.forEach((x) => { if (x.score !== undefined && !(x.name in scores)) scores[x.name] = x.score; });
    });
    const drawn = pairs.filter((p) => p[1].length);
    const prev = oBottom.value || "auto";
    oBottom.innerHTML = `<option value="auto">Best fit</option>` + (drawn.length === 3 ? drawn.map((p) => `<option value="${esc(p[0])}">${esc(p[0])}</option>`).join("") : "");
    oBottom.value = [...oBottom.options].some((o) => o.value === prev) ? prev : "auto";
    oBottom.disabled = drawn.length !== 3;
    const t = +oAspect.value;
    $("#oAspectV").textContent = t < 1 ? "tall" : t < 1.8 ? "balanced" : "wide";
    const cat = parseCats(cats.value);
    const colours = {};
    cat.order.forEach((c, i) => { colours[c] = IS.CATEGORY_PALETTE[i % IS.CATEGORY_PALETTE.length]; });
    let lay = null, error = "";
    try {
      lay = play.draw(pairs, { targetAspect: t, bottom: oBottom.value === "auto" ? null : oBottom.value, showEmpty: oEmpty.checked,
                               categories: cat.map, categoryColours: colours, scores: Object.keys(scores).length ? scores : null,
                               scoreLabel, aria: "Itemized set diagram of your lists" });
    } catch (e) { error = e.message; }
    const notes = lay ? lay.notes.filter((n) => !/has no members/.test(n)) : [];
    if (presetNote) notes.push(presetNote);
    if (error) notes.push(error);
    $("#playNotes").textContent = notes.join(" ");
    const zt = $("#zoneTable");
    if (!lay) { zt.innerHTML = ""; return; }
    const act = drawn.map((p) => p[0]);
    const combos = act.length === 3 ? [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]] : act.length === 2 ? [[0], [1], [0, 1]] : [[0]];
    const countOf = new Map(lay.counts.map(([z, n]) => [zkey(z), n]));
    zt.innerHTML = combos.map((cmb) => {
      const z = cmb.map((i) => act[i]);
      const n = countOf.get(zkey(z)) || 0;
      const fill = IS.tint(z.map((name) => lay.names.indexOf(name)));
      return `<tr><td><div class="sw" style="background:${fill}"></div></td><td>${esc(joinNames(z))}${z.length === 1 ? " only" : ""}</td><td class="n">${n}</td></tr>`;
    }).join("");
    if (anim) play.replay();
  }
  let tmr;
  const later = () => { clearTimeout(tmr); tmr = setTimeout(() => { presetNote = ""; draw(false); }, 180); };
  pIn.forEach((p) => { p.n.addEventListener("input", later); p.t.addEventListener("input", later); });
  cats.addEventListener("input", later);
  [oBottom, oEmpty, oAspect].forEach((e) => e.addEventListener("input", () => draw(false)));
  $$("[data-preset]", host).forEach((b) => b.addEventListener("click", () => load(b.dataset.preset)));
  oAspect.value = compact() ? 0.6 : 1.6;
  load("pbody");
  return { fig: play, redraw: () => draw(false) };
}

/* ---------------- tints and the flower (index) ---------------- */
function drawTints() {
  const el = $("#tints");
  if (!el) return;
  const names = { "0": ["C", "cyan", "set 1 only"], "1": ["M", "magenta", "set 2 only"], "2": ["Y", "yellow", "set 3 only"],
                  "0,1": ["CM", "lavender", "sets 1 and 2"], "0,2": ["CY", "green", "sets 1 and 3"], "1,2": ["MY", "salmon", "sets 2 and 3"],
                  "0,1,2": ["CMY", "grey", "all three sets"] };
  el.innerHTML = Object.keys(names).map((k) => `<button type="button" style="background:${IS.tint(k.split(",").map(Number))}" data-k="${k}" aria-label="${names[k][1]}: ${names[k][2]}"><span>${names[k][0]}</span></button>`).join("");
  const cap = $("#tintCap");
  const show = (k) => { const n = names[k]; cap.innerHTML = `<b style="color:var(--ink)">${n[1][0].toUpperCase() + n[1].slice(1)}</b> marks items in ${n[2]}.`; };
  $$("button", el).forEach((b) => ["click", "pointerenter", "focus"].forEach((ev) => b.addEventListener(ev, () => show(b.dataset.k))));
  show("0,1,2");
}
function drawFlower() {
  const el = $("#flower");
  if (!el) return;
  const s = 34, P = ["#BDE8F8", "#F8C3DE", "#F7F0A6", "#CFEBC7", "#E2D4F3"], D = ["#1DA1D8", "#E0197D", "#A39300", "#3C9A4E", "#7B54B8"];
  const petals = [[[3, 1], [3, 0]], [[4, 2], [5, 2]], [[3, 3], [3, 4]], [[2, 2], [1, 2]], [[5, 4], [5, 5]]];
  let g = "";
  for (let x = 0; x < 7; x++) for (let y = 0; y < 6; y++) g += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="none" stroke="var(--rule)" stroke-width="1"/>`;
  petals.forEach((p, i) => p.forEach(([x, y]) => (g += `<rect x="${x * s + 1}" y="${y * s + 1}" width="${s - 2}" height="${s - 2}" rx="4" fill="${P[i]}" stroke="${D[i]}" stroke-width="1.5"/>`)));
  petals.forEach((p, i) => { const [x, y] = p[1]; g += `<text x="${x * s + s / 2}" y="${y * s + s / 2 + 5}" text-anchor="middle" font-size="13" font-weight="800" fill="#1C2433">${i + 1}</text>`; });
  g += `<rect x="${3 * s + 1}" y="${2 * s + 1}" width="${s - 2}" height="${s - 2}" rx="4" fill="#D3D0C6" stroke="#1C2433" stroke-width="1.5"/><text x="${3 * s + s / 2}" y="${2 * s + s / 2 + 5}" text-anchor="middle" font-size="13" font-weight="800" fill="#1C2433">S</text>`;
  g += `<line x1="${5 * s + 3}" y1="${4 * s + 3}" x2="${4 * s - 2}" y2="${3 * s - 2}" stroke="#C8102E" stroke-width="2" stroke-dasharray="4 3"/><text x="${4.5 * s}" y="${3.62 * s}" text-anchor="middle" font-size="16" font-weight="800" fill="#C8102E">✗</text>`;
  el.innerHTML = `<svg viewBox="0 0 ${7 * s} ${6 * s}" role="img" aria-label="A shared cell S with four sides touches petals 1 to 4; petal 5 cannot touch it" style="width:100%;height:auto;font-family:Figtree,sans-serif">${g}</svg><p class="small muted" style="margin-top:6px">Shared prey S has four sides. Petal 5 can't reach it without passing through another bait's region.</p>`;
}

/* ---------------- roadmap ---------------- */
const PHASES = [
  { title: "Claim the name and package the prototype", when: "October 2026", goal: "Hold the name before it appears in a talk or preprint, and give the script a proper home.", tasks: [
    ["p1a", "Create the GitHub repository", "github.com/adamcc/itemiset, with this site on GitHub Pages.", true],
    ["p1b", "Register itemiset on PyPI", "Upload a small working 0.0.1. The name was still free on PyPI and npm on 6 October 2026."],
    ["p1c", "Split eulergrid.py into notebooks", "Layout, readers, rendering and the command line, each a tested nbdev notebook.", true],
    ["p1d", "Settle the public API", "plot, load_sets, layout_sets and check_layout in Python, and an itemiset command keeping the prototype's options.", true],
    ["p1e", "Choose a licence", "Apache-2.0 is planned. Until then the code is all rights reserved."]] },
  { title: "Prove the invariants", when: "November 2026", goal: "Turn the correctness argument into tests that run on every change.", tasks: [
    ["p2a", "Invariant checks on random layouts", "All five checks on hundreds of random inputs, in Python and in JavaScript.", true],
    ["p2b", "JavaScript port matches Python", "Over 200 recorded layouts reproduced cell for cell by the browser version.", true],
    ["p2c", "Whole-workflow edge-case tests", "File in, figure and zone table out, for every case from the prototype's gallery.", true],
    ["p2d", "First green CI run", "Notebook tests and JavaScript tests on GitHub Actions."],
    ["p2e", "Golden-image tests", "Image comparisons for the gallery, so any change to the drawing is a deliberate decision."],
    ["p2f", "Speed benchmark", "Time the layout for 50, 500 and 5,000 items, and publish honest limits."]] },
  { title: "Test with people", when: "December 2026 to January 2027", goal: "Find out whether the figures do their job for the people who will use them.", tasks: [
    ["p3a", "Rebuild the white paper's figure from the raw prey lists", "Privately, to compare with the hand-drawn version and note every difference."],
    ["p3b", "Lab pilot", "Three to five people run it on their own BioID or TurboID data. Record every point of friction."],
    ["p3c", "Small readability study", "Timed tasks (find a gene, name its baits, compare zone sizes) against a Venn diagram with a table, and against an UpSet plot."],
    ["p3d", "Colour-vision and greyscale check", "Simulate common colour-vision deficiencies and print in greyscale."]] },
  { title: "Document and pre-release", when: "January 2027", goal: "Make it possible to use ItemiSet without asking anyone how.", tasks: [
    ["p4a", "README, tour and reference docs", "Built from the notebooks with nbdev and Quarto.", true],
    ["p4b", "A public example dataset", "P-body baits from Youn et al. (2018) via BioGRID, rebuilt by a notebook.", true],
    ["p4c", "Literature check", "Mosaic cartograms (Cano et al. 2015), Chow and Ruskey, Rodgers and Stapleton, polyomino Venn diagrams, eulerr and Eunoia, waffle charts and Isotype."],
    ["p4d", "Release 0.1.0", "TestPyPI first, then PyPI through trusted publishing, with a Zenodo DOI for the tagged release."]] },
  { title: "Publish and grow", when: "February to June 2027", goal: "Get it cited, packaged and into other people's figures.", tasks: [
    ["p5a", "Preprint", "“ItemiSet: itemized area-proportional Euler diagrams”, with the formal statement and correctness argument in the methods, and the flower argument explaining the three-set limit."],
    ["p5b", "conda-forge and Bioconda recipes", "So it installs alongside the rest of an omics toolchain."],
    ["p5c", "Release 1.0", "After the API has held steady for one minor release and pilot feedback is in."],
    ["p5d", "Web app: open files and export PDF", "Read CSV and Excel files in the browser, alongside the SVG and zone-table downloads it has now."],
    ["p5e", "Hyperlinked items", "Each name in SVG output links to its gene or protein page."],
    ["p5f", "Beyond three sets", "Itemized UpSet plots, and itemized before-and-after Sankey diagrams."]] },
];
const KEY = "itemiset-roadmap-v2";
function loadTicks() { try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { return new Set(); } }
function saveTicks(t) { try { localStorage.setItem(KEY, JSON.stringify([...t])); } catch (e) { /* private window */ } }
function initRoadmap() {
  const host = $("#phases");
  if (!host) return;
  let ticks = loadTicks();
  const isDone = (t) => t[3] || ticks.has(t[0]);
  function render() {
    host.innerHTML = PHASES.map((p, pi) => `<li class="phase" data-p="${pi}"><details ${pi < 2 ? "open" : ""}><summary><h3>${esc(p.title)}</h3><span class="when">${esc(p.when)}</span><span class="tally"></span></summary><div class="body"><p class="goal">${esc(p.goal)}</p>${p.tasks.map((t) => `<div class="task${t[3] ? " done" : ""}"><input type="checkbox" id="${t[0]}" ${isDone(t) ? "checked" : ""} ${t[3] ? "disabled" : ""}><label for="${t[0]}"><b>${esc(t[1])}</b>${t[3] ? `<span class="tag" style="display:inline-block">Done</span>` : ""}<span>${esc(t[2])}</span></label></div>`).join("")}</div></details></li>`).join("");
    $$("input", host).forEach((cb) => cb.addEventListener("change", () => { cb.checked ? ticks.add(cb.id) : ticks.delete(cb.id); saveTicks(ticks); tally(); }));
    tally();
  }
  function tally() {
    let all = 0, done = 0;
    PHASES.forEach((p, pi) => {
      const n = p.tasks.length, d = p.tasks.filter(isDone).length;
      all += n; done += d;
      const li = $(`.phase[data-p="${pi}"]`);
      $(".tally", li).textContent = `${d} of ${n}`;
      li.classList.toggle("done", d === n);
    });
    const pct = Math.round((100 * done) / all);
    $("#pctBig").textContent = pct + "%"; $("#pctBar").style.width = pct + "%";
  }
  $("#resetTicks").addEventListener("click", () => { ticks = new Set(); saveTicks(ticks); render(); });
  render();
}

function setsFromCounts(k, counts) {
  const pairs = ["A", "B", "C"].slice(0, k).map((n) => [n, []]);
  for (const [z, n] of Object.entries(counts)) {
    for (let j = 1; j <= n; j++) {
      const name = z.toLowerCase() + j;
      for (const ch of z) pairs["ABC".indexOf(ch)][1].push(name);
    }
  }
  return pairs;
}
const CASES = [
  ["All seven zones filled", 3, { A: 5, B: 4, C: 6, AB: 3, AC: 2, BC: 3, ABC: 4 }, {}],
  ["No triple overlap", 3, { A: 5, B: 4, C: 5, AB: 3, AC: 2, BC: 3 }, {}],
  ["One set disjoint from the others", 3, { A: 5, B: 4, AB: 3, C: 6 }, {}],
  ["All three sets disjoint", 3, { A: 4, B: 5, C: 3 }, {}],
  ["One set nested inside another", 3, { A: 6, AB: 5, ABC: 2, AC: 3, C: 5 }, {}],
  ["Single-member zones", 3, { A: 1, B: 1, C: 1, AB: 1, AC: 1, BC: 1, ABC: 1 }, {}],
  ["One bait came back empty", 3, { A: 5, B: 6, AB: 4 }, {}],
  ["Venn mode: empty zones shown", 3, { A: 4, B: 3, C: 5, ABC: 2 }, { showEmpty: true }],
  ["Filler needed: bottom set forced", 3, { A: 3, B: 3, AB: 2, AC: 3, BC: 3 }, { bottom: "C" }],
];
function initGallery() {
  const host = $("#gallery");
  if (!host) return;
  host.innerHTML = CASES.map(([title, k, counts, opts], ci) => {
    const pairs = setsFromCounts(k, counts);
    const lay = IS.layoutSets(pairs, Object.assign({ targetAspect: 1.2 }, opts));
    const res = IS.checkLayout(lay, pairs);
    const r = IS.renderSVG(lay, { cellHeight: 16, fontSize: 8.5, uid: "g" + ci, counts: false, strokeWidth: 1.6, insetScale: 0.55, cornerRadius: 4, ariaLabel: title });
    const filler = lay.cells.filter((c) => c.item == null && !c.placeholder).length;
    const note = filler ? `<div class="note">${filler} filler cells, reported to the user.</div>` : "";
    return `<div class="case"><h3>${esc(title)}</h3><div class="mini">${r.svg}</div><ul class="checks">${Object.entries(res).map(([n, ok]) => `<li class="${ok ? "" : "bad"}">${esc(n)}</li>`).join("")}</ul>${note}</div>`;
  }).join("");
  const btn = $("#fuzzBtn"), out = $("#fuzzOut");
  btn.addEventListener("click", () => {
    btn.disabled = true;
    let done = 0, pass = 0, filler = 0;
    const N = 500, rnd = (n) => Math.floor(Math.random() * n);
    (function chunk() {
      for (let j = 0; j < 25 && done < N; j++, done++) {
        const k = 1 + rnd(3), counts = {};
        for (let m = 1; m < 1 << k; m++) {
          const z = "ABC".split("").filter((_, i) => m & (1 << i)).join("");
          counts[z] = Math.random() < 0.4 ? 0 : 1 + rnd(Math.random() < 0.2 ? 90 : 14);
        }
        const pairs = setsFromCounts(k, counts);
        if (!pairs.some((p) => p[1].length)) { pass++; continue; }
        const lay = IS.layoutSets(pairs, { targetAspect: 0.6 + Math.random() * 2.2, showEmpty: Math.random() < 0.3 });
        if (lay.cells.some((c) => c.item == null && !c.placeholder)) filler++;
        if (Object.values(IS.checkLayout(lay, pairs)).every(Boolean)) pass++;
      }
      out.textContent = `${done} of ${N} laid out…`;
      if (done < N) setTimeout(chunk, 0);
      else {
        out.textContent = `${pass} of ${N} random layouts passed all five checks.` + (filler ? ` ${filler} needed filler cells, and each was reported.` : " None needed filler cells.");
        btn.disabled = false; btn.textContent = "Run 500 more";
      }
    })();
  });
}

/* ---------------- start ---------------- */
let playground = null;
function start() {
  if ($("#heroFig")) hero = new Figure($("#heroFig"));
  const ph = $("[data-playground]");
  if (ph) playground = initPlayground(ph);
  drawSteps(); drawTints(); drawFlower(); initRoadmap(); initGallery();
  drawHero(false);
}
start();
let started = false;
function afterFonts() {   // text widths change once Figtree loads
  if (started) return; started = true;
  drawHero(true); drawSteps(); if (playground) playground.redraw();
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts);
setTimeout(afterFonts, 1500);
let lastW = vw(), rt;
window.addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const w = vw(), bucket = (x) => (x < 640 ? 0 : x < 980 ? 1 : 2);
    if (bucket(w) !== bucket(lastW)) { drawHero(false); if (playground) playground.redraw(); }
    lastW = w;
    if (hero) hero.fit();
    if (playground) playground.fig.fit();
  }, 150);
});
})();
