/*!
 * ItemiSet for the browser: itemized area-proportional Euler diagrams.
 *
 * A port of the Python reference layout (nbs/00_layout.ipynb). The layout part must
 * put every item in the same cell as Python does; js/test/fixtures.test.js checks this
 * against records written by nbs/04_fixtures.ipynb. Drawing (renderSVG) is free to differ.
 *
 * Works as a <script> (defines window.ItemiSet) and as a CommonJS module (for Node tests).
 * © 2026 Adam Claridge-Chang. No licence has been granted yet.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ItemiSet = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "0.0.1";
  const PLACEHOLDER = "∅";
  const CELL_H_IN = 0.19;

  /* ------------------------------------------------------------------ */
  /* Spec helpers (see "Rules that keep Python and JavaScript identical") */
  /* ------------------------------------------------------------------ */

  /** Round to the nearest integer, halves upwards (Python: round_half_up). */
  function roundHalfUp(x) { return Math.floor(x + 0.5); }

  /** Natural sort key: case-insensitive text with digit runs as numbers (Python: natural_key). */
  function naturalKey(s) {
    return String(s).split(/([0-9]+)/).map((t, i) => (i % 2 ? BigInt(t) : t.toLowerCase()));
  }
  function compareKeys(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = a[i], y = b[i];
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return a.length - b.length;
  }
  function compareNatural(a, b) { return compareKeys(naturalKey(a), naturalKey(b)); }

  /** Length in characters (code points), like Python's len. */
  function charLength(s) { return Array.from(String(s)).length; }

  /** Cell width and height in inches for the longest name (Python: cell_size). */
  function cellSize(names, fontsize = 6.5) {
    let maxlen = 4;
    for (const n of names) maxlen = Math.max(maxlen, charLength(n));
    return [Math.max(0.45, 0.0105 * fontsize * maxlen + 0.12), CELL_H_IN];
  }
  function defaultCellAspect(names, fontsize = 6.5) {
    const [w, h] = cellSize(names, fontsize);
    return w / h;
  }

  /* ------------------------------------------------------------------ */
  /* The template                                                        */
  /* ------------------------------------------------------------------ */

  function snake(w, n, innerRight) {
    const out = [];
    let r = 0;
    while (out.length < n) {
      const rtl = r % 2 === 0 ? innerRight : !innerRight;
      for (let i = 0; i < w && out.length < n; i++) out.push([rtl ? w - 1 - i : i, r]);
      r++;
    }
    return out;
  }

  // Zones are bit masks over the active set names, in input order.
  function groupsFor(roles, bit) {
    const keys = Object.keys(roles).sort();
    const names = keys.map((k) => roles[k]);
    if (names.length === 1) return [{ g: "L", lo: bit(names[0]), up: 0, innerRight: true }];
    if (names.length === 2) {
      const a = bit(names[0]), b = bit(names[1]);
      return [{ g: "L", lo: a, up: 0, innerRight: true },
              { g: "M", lo: a | b, up: 0, innerRight: false },
              { g: "R", lo: b, up: 0, innerRight: false }];
    }
    const a = bit(roles.A), b = bit(roles.B), c = bit(roles.C);
    return [{ g: "L", lo: a | c, up: a, innerRight: true },
            { g: "M", lo: a | b | c, up: a | b, innerRight: false },
            { g: "R", lo: b | c, up: b, innerRight: false }];
  }

  function* compositions(W, k) {
    if (k === 1) { yield [W]; return; }
    for (let i = 0; i <= W; i++) for (const rest of compositions(W - i, k - 1)) yield [i].concat(rest);
  }

  function plan(counts, roles, widths, cellAspect, targetAspect, bit) {
    const groups = groupsFor(roles, bit);
    const get = (m) => (m ? counts.get(m) || 0 : 0);
    const ns = [];
    for (let i = 0; i < groups.length; i++) {
      const n = get(groups[i].lo) + get(groups[i].up);
      if ((n > 0) !== (widths[i] > 0)) return null;
      ns.push(n);
    }
    const gap = groups.length === 3 && ns[0] && ns[2] && !ns[1] ? 0.5 : 0.0;
    const xs = [], heights = [], cIntervals = [];
    const hasC = roles.C !== undefined;
    let x = 0.0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i], w = widths[i];
      if (i === 2) x += gap;
      xs.push(x);
      heights.push(w ? Math.ceil(ns[i] / w) : 0);
      const nLo = get(g.lo);
      if (hasC && w && nLo) {
        const k = Math.min(nLo, w);
        cIntervals.push(g.innerRight ? [x + w - k, x + w] : [x, x + k]);
      }
      x += w;
    }
    let sumW = 0;
    for (const w of widths) sumW += w;
    const totalW = sumW + gap;
    const hg = heights.length ? Math.max(...heights) : 0;

    let band = null, filler = 0;
    if (hasC) {
      const nC = get(bit(roles.C));
      const iv = cIntervals.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const merged = [];
      for (const [a, b] of iv) {
        if (merged.length && a <= merged[merged.length - 1][1] + 1e-9) {
          const last = merged[merged.length - 1];
          merged[merged.length - 1] = [last[0], Math.max(last[1], b)];
        } else merged.push([a, b]);
      }
      const connected = merged.length <= 1;
      let s0, s1;
      if (merged.length) { s0 = merged[0][0]; s1 = merged[merged.length - 1][1]; }
      else { s0 = s1 = totalW / 2; }
      const span = s1 - s0;
      const need = connected ? 0 : Math.ceil(span - 1e-9);
      const nBand = Math.max(nC, need);
      if (nBand) {
        filler = nBand - nC;
        const rowsTarget = Math.max(1, roundHalfUp(hg * 0.25));
        let bw = Math.max(Math.ceil(span - 1e-9), Math.ceil(nBand / rowsTarget), 1);
        if (totalW >= 1) bw = Math.min(bw, Math.max(1, Math.floor(totalW + 1e-9)), nBand);
        bw = Math.max(bw, Math.min(nBand, Math.ceil(span - 1e-9)));
        const centre = (s0 + s1) / 2;
        let x0 = Math.min(Math.max(centre - bw / 2, 0.0), Math.max(0.0, totalW - bw));
        if (merged.length) {
          x0 = roundHalfUp(x0 - merged[0][0]) + merged[0][0];
          x0 = Math.min(Math.max(x0, 0.0), Math.max(0.0, totalW - bw));
        }
        const rows = Math.ceil(nBand / bw);
        const vgap = merged.length ? 0 : 0.4;
        band = { x0, bw, rows, n: nBand, vgap };
      }
    }
    const bandRows = band ? band.rows + band.vgap : 0;
    const H = hg + bandRows;
    let ncells = filler;  // (sum of counts) + filler
    for (const v of counts.values()) ncells += v;
    const aspect = (totalW * cellAspect) / Math.max(H, 1e-9);
    const empty = Math.max(0.0, totalW * H - ncells) / Math.max(totalW * H, 1);
    const l = Math.log(aspect / targetAspect);
    const raw = 2.0 * (l * l) + 3.0 * empty + 1.5 * filler + 0.02 * totalW;
    return { score: roundHalfUp(raw * 1e9),
             plan: { widths, xs, heights, band, filler, gap, totalW, H, hg } };
  }

  /* ------------------------------------------------------------------ */
  /* Laying out sets                                                     */
  /* ------------------------------------------------------------------ */

  /** Accept [[name, items]], [{name, items}], a Map or a plain object; return [[name, items]]. */
  function toPairs(sets) {
    if (sets instanceof Map) return Array.from(sets.entries());
    if (Array.isArray(sets)) return sets.map((s) => (Array.isArray(s) ? [s[0], s[1]] : [s.name, s.items]));
    return Object.entries(sets);
  }

  function combinationsOf(n, k) {
    const out = [];
    const rec = (start, acc) => {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (let i = start; i < n; i++) { acc.push(i); rec(i + 1, acc); acc.pop(); }
    };
    rec(0, []);
    return out;
  }

  /** The core algorithm (Python: compute_layout). Most callers want layoutSets. */
  function computeLayout(sets, opts = {}) {
    const pairs = toPairs(sets);
    const names = pairs.map((p) => p[0]);
    const index = new Map(names.map((n, i) => [n, i]));
    const bit = (name) => 1 << index.get(name);
    const showEmpty = !!opts.showEmpty;
    const bottom = opts.bottom == null ? null : opts.bottom;
    const targetAspect = opts.targetAspect == null ? 2.2 : opts.targetAspect;

    const membership = new Map();
    for (const [s, items] of pairs) for (const it of items) membership.set(it, (membership.get(it) || 0) | bit(s));
    const zones = new Map();
    for (const [item, m] of membership) {
      if (!zones.has(m)) zones.set(m, []);
      zones.get(m).push(item);
    }
    const counts = new Map();
    for (const [m, v] of zones) counts.set(m, v.length);
    const cellAspect = opts.cellAspect == null ? defaultCellAspect(Array.from(membership.keys())) : opts.cellAspect;

    const notes = [];
    const placeholders = new Set();
    if (showEmpty) {
      for (let k = 1; k <= names.length; k++) {
        for (const combo of combinationsOf(names.length, k)) {
          let m = 0;
          for (const i of combo) m |= 1 << i;
          if (!counts.get(m)) { counts.set(m, 1); placeholders.add(m); }
        }
      }
      if (placeholders.size) {
        notes.push(`${placeholders.size} empty zone(s) shown as '${PLACEHOLDER}' ` +
                   "placeholder cells (1 cell each; not area-proportional).");
      }
    } else {
      for (const s of names) {
        let any = false;
        for (const m of counts.keys()) if (m & bit(s)) any = true;
        if (!any) notes.push(`Set '${s}' is empty and is not drawn.`);
      }
    }

    let cands;
    if (names.length === 3) {
      cands = [];
      for (const c of names) {
        if (bottom && c !== bottom) continue;
        const [a, b] = names.filter((n) => n !== c);
        cands.push({ A: a, B: b, C: c });
      }
      if (!cands.length) throw new Error(`bottom set '${bottom}' is not one of ${JSON.stringify(names)}`);
    } else if (names.length === 2) cands = [{ A: names[0], B: names[1] }];
    else cands = [{ A: names[0] }];

    let nTotal = 0;
    for (const v of counts.values()) nTotal += v;
    const wmax = opts.maxWidth ||
      Math.max(4, Math.min(60, Math.trunc(Math.sqrt(nTotal * targetAspect / cellAspect) * 3) + 2));
    let best = null;
    for (const roles of cands) {
      const k = groupsFor(roles, bit).length;
      for (let W = 1; W <= wmax; W++) {
        for (const widths of compositions(W, k)) {
          const r = plan(counts, roles, widths, cellAspect, targetAspect, bit);
          if (r && (best === null || r.score < best.score)) best = { score: r.score, roles, plan: r.plan };
        }
      }
    }
    if (best === null) throw new Error("No valid layout found (are all sets empty?)");
    const { roles, plan: p } = best;

    const zoneCells = new Map();
    const push = (m, cell) => { if (!zoneCells.has(m)) zoneCells.set(m, []); zoneCells.get(m).push(cell); };
    groupsFor(roles, bit).forEach((g, i) => {
      const w = p.widths[i], x0 = p.xs[i];
      const nLo = counts.get(g.lo) || 0, nUp = g.up ? counts.get(g.up) || 0 : 0;
      snake(w, nLo + nUp, g.innerRight).forEach(([c, r], j) => {
        const z = j < nLo ? g.lo : g.up;
        push(z, { x: x0 + c, y: r, mask: z, item: null, placeholder: false });
      });
    });
    if (p.band) {
      const zc = bit(roles.C), b = p.band;
      const fullRows = Math.floor(b.n / b.bw), rem = b.n - fullRows * b.bw;
      for (let i = 0; i < fullRows; i++)
        for (let c = 0; c < b.bw; c++) push(zc, { x: b.x0 + c, y: -1 - i - b.vgap, mask: zc, item: null, placeholder: false });
      if (rem) {
        const off = Math.floor((b.bw - rem) / 2);
        for (let c = 0; c < rem; c++)
          push(zc, { x: b.x0 + off + c, y: -1 - fullRows - b.vgap, mask: zc, item: null, placeholder: false });
      }
      if (p.filler) {
        notes.push(`${p.filler} blank filler cell(s) added to '${roles.C} only' to keep that set connected.`);
      }
    }

    const cells = [];
    const zoneNames = (m) => names.filter((n, i) => m & (1 << i));
    for (const [z, zc] of zoneCells) {
      zc.sort((a, b) => a.x - b.x || b.y - a.y);
      if (placeholders.has(z)) zc[0].placeholder = true;
      else {
        const items = (zones.get(z) || []).slice().sort(compareNatural);
        for (let i = 0; i < zc.length && i < items.length; i++) zc[i].item = items[i];
      }
      for (const c of zc) {
        cells.push({ x: c.x, y: c.y, zone: zoneNames(c.mask), item: c.item, placeholder: c.placeholder });
      }
    }
    const zoneCounts = [];
    for (const [m, v] of zones) zoneCounts.push([zoneNames(m), v.length]);
    return { cells, roles, widths: p.widths, notes, names: names.slice(), counts: zoneCounts,
             plan: p, score: best.score, cellAspect };
  }

  /** Lay out 1–3 named sets (Python: layout_sets). Duplicates are dropped and empty sets left out with a note. */
  function layoutSets(sets, opts = {}) {
    const m = new Map();
    for (const [k, v] of toPairs(sets)) {
      const seen = new Set(), items = [];
      for (const it of v || []) { const s = String(it); if (!seen.has(s)) { seen.add(s); items.push(s); } }
      m.set(String(k), items);
    }
    const all = Array.from(m.entries());
    if (all.length < 1 || all.length > 3) {
      throw new Error(`ItemiSet draws 1 to 3 sets; got ${all.length}: ${JSON.stringify(all.map((p) => p[0]))}`);
    }
    const dropped = all.filter((p) => !p[1].length).map((p) => p[0]);
    const active = all.filter((p) => p[1].length);
    if (!active.length) throw new Error("All sets are empty, so there is nothing to draw.");
    let bottom = opts.bottom == null ? null : opts.bottom;
    if (dropped.includes(bottom)) bottom = null;
    let cellAspect = opts.cellAspect;
    if (cellAspect == null) {
      const items = [];
      for (const [, v] of active) for (const it of v) items.push(it);
      cellAspect = defaultCellAspect(items, opts.fontsize == null ? 6.5 : opts.fontsize);
    }
    const lay = computeLayout(active, { showEmpty: opts.showEmpty, bottom, cellAspect,
                                        targetAspect: opts.targetAspect, maxWidth: opts.maxWidth });
    lay.notes.unshift(...dropped.map((k) => `Set '${k}' has no members and was left out of the diagram.`));
    lay.names = all.map((p) => p[0]);
    return lay;
  }

  /** Plain summary of a layout (Python: layout_record), for comparing implementations. */
  function layoutRecord(lay) {
    const cells = lay.cells.slice().sort((a, b) => a.x - b.x || b.y - a.y);
    const roles = {};
    for (const k of Object.keys(lay.roles).sort()) roles[k] = lay.roles[k];
    return {
      roles, widths: lay.widths.slice(), notes: lay.notes.slice(), score: lay.score,
      cells: cells.map((c) => [c.x, c.y, lay.names.filter((n) => c.zone.includes(n)), c.item, c.placeholder]),
    };
  }

  /** One row per item: item, zone, a 0/1 field per set, category (Python: zone_rows). */
  function zoneRows(lay, categories = {}) {
    const rows = [];
    for (const c of lay.cells) {
      if (c.item == null) continue;
      const row = { item: c.item, zone: lay.names.filter((n) => c.zone.includes(n)).join(" & ") };
      for (const n of lay.names) row[n] = c.zone.includes(n) ? 1 : 0;
      row.category = (categories && categories[c.item]) || "";
      rows.push(row);
    }
    return rows.sort((a, b) => (a.zone < b.zone ? -1 : a.zone > b.zone ? 1 : compareNatural(a.item, b.item)));
  }

  /* ------------------------------------------------------------------ */
  /* Checks (Python: check_layout)                                       */
  /* ------------------------------------------------------------------ */

  const SX = 4, SY = 5;
  const CHECKS = ["One cell per item", "Each set is one piece", "No set has a hole",
                  "Each zone is one piece", "No stray white pockets"];
  const key = (x, y) => x + "," + y;
  function squaresOf(c) {
    const x0 = roundHalfUp(c.x * SX), y0 = roundHalfUp(c.y * SY), out = [];
    for (let x = x0; x < x0 + SX; x++) for (let y = y0; y < y0 + SY; y++) out.push([x, y]);
    return out;
  }
  function connectedSq(sq) {
    if (!sq.size) return true;
    const start = sq.values().next().value;
    const seen = new Set([start]), stack = [start];
    while (stack.length) {
      const [x, y] = stack.pop().split(",").map(Number);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = key(nx, ny);
        if (sq.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
      }
    }
    return seen.size === sq.size;
  }
  function enclosedSq(sq) {
    if (!sq.size) return 0;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const k of sq) {
      const [x, y] = k.split(",").map(Number);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    x0--; x1++; y0--; y1++;
    const seen = new Set([key(x0, y0)]), stack = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = key(nx, ny);
        if (nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1 && !sq.has(k) && !seen.has(k)) { seen.add(k); stack.push([nx, ny]); }
      }
    }
    return (x1 - x0 + 1) * (y1 - y0 + 1) - sq.size - seen.size;
  }

  /** Test the five properties every layout must have. Returns {check name: passed?}. */
  function checkLayout(lay, sets) {
    const all = new Set();
    let overlap = false;
    const setSq = new Map(lay.names.map((n) => [n, new Set()]));
    const zoneSq = new Map();
    for (const c of lay.cells) {
      const zk = c.zone.join("\u0000");
      if (!zoneSq.has(zk)) zoneSq.set(zk, new Set());
      for (const [x, y] of squaresOf(c)) {
        const k = key(x, y);
        if (all.has(k)) overlap = true;
        all.add(k);
        zoneSq.get(zk).add(k);
        for (const n of c.zone) setSq.get(n).add(k);
      }
    }
    const items = lay.cells.filter((c) => c.item != null).map((c) => c.item);
    let one = !overlap && new Set(items).size === items.length;
    if (sets) {
      const want = new Set();
      for (const [, v] of toPairs(sets)) for (const i of v) want.add(String(i));
      one = one && want.size === items.length && items.every((i) => want.has(i));
    }
    const sq = Array.from(setSq.values());
    const res = [one, sq.every(connectedSq), sq.every((s) => enclosedSq(s) === 0),
                 Array.from(zoneSq.values()).every(connectedSq), enclosedSq(all) === 0];
    const out = {};
    CHECKS.forEach((name, i) => { out[name] = res[i]; });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Drawing (free to differ from the Python renderer)                   */
  /* ------------------------------------------------------------------ */

  const SET_COLOURS = [["#BDE8F8", "#1DA1D8"], ["#F8C3DE", "#E0197D"], ["#F7F0A6", "#A39300"]];
  const CATEGORY_PALETTE = ["#C8102E", "#2140A8", "#7B2A86", "#1A7F3C", "#C25400", "#5E3C99", "#008080", "#8C510A"];

  /** Fill colour for a cell in the sets with these indices (multiplied like inks). */
  function tint(indices) {
    let r = 1, g = 1, b = 1;
    for (const i of indices) {
      const h = SET_COLOURS[i % 3][0];
      r *= parseInt(h.slice(1, 3), 16) / 255; g *= parseInt(h.slice(3, 5), 16) / 255; b *= parseInt(h.slice(5, 7), 16) / 255;
    }
    const t = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    return "#" + t(r) + t(g) + t(b);
  }

  /** Assign a colour to every category present, given colours first (Python: same rule as render). */
  function categoryColours(lay, categories = {}, given = {}) {
    const present = [];
    for (const c of lay.cells) {
      const cat = c.item != null ? categories[c.item] : undefined;
      if (cat && !present.includes(cat)) present.push(cat);
    }
    const cats = Object.keys(given).filter((c) => present.includes(c));
    for (const c of present) if (!cats.includes(c)) cats.push(c);
    const out = Object.assign({}, given);
    const used = new Set(Object.values(given));
    const pal = CATEGORY_PALETTE.filter((c) => !used.has(c));
    let j = 0;
    for (const c of cats) if (!out[c]) out[c] = pal[j++] || "#444444";
    const ordered = {};
    for (const c of cats) ordered[c] = out[c];
    return ordered;
  }

  let canvasCtx = null;
  function defaultMeasure(text, px, weight) {
    if (typeof document !== "undefined") {
      if (!canvasCtx) canvasCtx = document.createElement("canvas").getContext("2d");
      canvasCtx.font = `${weight} ${px}px Figtree, system-ui, sans-serif`;
      return canvasCtx.measureText(text).width;
    }
    return charLength(text) * px * 0.62;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Outline of the cells in `cells`, traced on the same fine raster the checks use.
  function outlinePaths(cells, top, cw, ch, inset, radius) {
    const sq = new Set();
    for (const c of cells) {
      const x0 = roundHalfUp(c.x * SX), y0 = roundHalfUp((-(c.y + 1) - top) * SY);
      for (let x = x0; x < x0 + SX; x++) for (let y = y0; y < y0 + SY; y++) sq.add(key(x, y));
    }
    const edges = new Map();
    const add = (a, b) => { const k = key(a[0], a[1]); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (const k of sq) {
      const [x, y] = k.split(",").map(Number);
      if (!sq.has(key(x, y - 1))) add([x, y], [x + 1, y]);
      if (!sq.has(key(x + 1, y))) add([x + 1, y], [x + 1, y + 1]);
      if (!sq.has(key(x, y + 1))) add([x + 1, y + 1], [x, y + 1]);
      if (!sq.has(key(x - 1, y))) add([x, y + 1], [x, y]);
    }
    const loops = [];
    for (const [start, list] of edges) {
      while (list.length) {
        const pts = [start.split(",").map(Number)];
        let cur = start, dir = null, guard = 0;
        while (guard++ < 1e6) {
          const outs = edges.get(cur);
          if (!outs || !outs.length) break;
          const [cx, cy] = cur.split(",").map(Number);
          let idx = 0;
          if (outs.length > 1 && dir) {
            const pref = [[-dir[1], dir[0]], dir, [dir[1], -dir[0]]];   // right turn, straight, left turn
            for (const d of pref) {
              const j = outs.findIndex((e) => e[0] - cx === d[0] && e[1] - cy === d[1]);
              if (j >= 0) { idx = j; break; }
            }
          }
          const nxt = outs.splice(idx, 1)[0];
          dir = [nxt[0] - cx, nxt[1] - cy];
          cur = key(nxt[0], nxt[1]);
          if (cur === start) break;
          pts.push(nxt);
        }
        loops.push(pts);
      }
    }
    return loops.map((pts) => roundPath(simplify(pts).map(([x, y]) => [x / SX * cw, y / SY * ch]), inset, radius));
  }
  function simplify(pts) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) out.push(b);
    }
    return out;
  }
  function roundPath(pts, inset, rad) {
    const n = pts.length;
    if (n < 3) return "";
    const unit = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const ip = pts.map((v, i) => {
      const d1 = unit(pts[(i - 1 + n) % n], v), d2 = unit(v, pts[(i + 1) % n]);
      return [v[0] + inset * (-d1[1] - d2[1]), v[1] + inset * (d1[0] + d2[0])];
    });
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = ip[(i - 1 + n) % n], v = ip[i], q = ip[(i + 1) % n];
      const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
      const r = Math.max(0, Math.min(rad, l1 / 2, l2 / 2));
      const a = [v[0] + (p[0] - v[0]) / (l1 || 1) * r, v[1] + (p[1] - v[1]) / (l1 || 1) * r];
      const b = [v[0] + (q[0] - v[0]) / (l2 || 1) * r, v[1] + (q[1] - v[1]) / (l2 || 1) * r];
      d += (i ? "L" : "M") + a[0].toFixed(1) + " " + a[1].toFixed(1) +
           "Q" + v[0].toFixed(1) + " " + v[1].toFixed(1) + " " + b[0].toFixed(1) + " " + b[1].toFixed(1);
    }
    return d + "Z";
  }

  /**
   * Draw a layout as an SVG string. Returns {svg, width, height, cellWidth, cellHeight, top}.
   * Options: cellHeight (px, 22), fontSize (px, 11), categories {item: name}, categoryColours {name: colour},
   * scores {item: number} (shown as font weight), labels (true), counts (true: adds a hidden counts layer),
   * strokeWidth (2), insetScale (1), uid, ariaLabel, measure(text, px, weight), overlay(lay, geom), dim(cell).
   */
  function renderSVG(lay, o = {}) {
    const ch = o.cellHeight || 22;
    const fs = o.fontSize || 11;
    const cw = o.cellWidth || Math.round(ch * (lay.cellAspect || 4));
    const measure = o.measure || defaultMeasure;
    const uid = o.uid || "is";
    const labelsOn = o.labels !== false;
    const cats = o.categories || {};
    const catCol = categoryColours(lay, cats, o.categoryColours || {});
    const scores = o.scores || null;
    let smin = Infinity, smax = -Infinity;
    if (scores) for (const c of lay.cells) {
      const v = c.item != null ? scores[c.item] : undefined;
      if (typeof v === "number") { smin = Math.min(smin, v); smax = Math.max(smax, v); }
    }
    const idxOf = (n) => lay.names.indexOf(n);
    let top = Infinity, left = Infinity, right = -Infinity, bottomY = -Infinity;
    for (const c of lay.cells) {
      top = Math.min(top, -(c.y + 1)); bottomY = Math.max(bottomY, -c.y);
      left = Math.min(left, c.x); right = Math.max(right, c.x + 1);
    }
    const px = (c) => (c.x - left) * cw;
    const py = (c) => (-(c.y + 1) - top) * ch;
    const W = (right - left) * cw, H = (bottomY - top) * ch;

    // set labels, placed by role
    const labels = [];
    const roleOf = {};
    for (const [r, n] of Object.entries(lay.roles)) roleOf[n] = r;
    if (labelsOn) lay.names.forEach((name, i) => {
      const cs = lay.cells.filter((c) => c.zone.includes(name));
      if (!cs.length) return;
      const x0 = Math.min(...cs.map(px)), x1 = Math.max(...cs.map((c) => px(c) + cw));
      const y0 = Math.min(...cs.map(py)), y1 = Math.max(...cs.map((c) => py(c) + ch));
      const n = cs.filter((c) => c.item != null).length;
      const w = measure(name, 14, 750) + measure(" " + n, 13, 500) + 4;
      const role = roleOf[name] || "A";
      if (role === "C") labels.push({ i, name, n, anchor: "middle", x: (x0 + x1) / 2, y: y1 + 19, w, below: true });
      else if (role === "B") labels.push({ i, name, n, anchor: "end", x: x1 - 2, y: y0 - 9, w });
      else labels.push({ i, name, n, anchor: "start", x: x0 + 2, y: y0 - 9, w });
    });
    const la = labels.find((l) => l.anchor === "start"), lb = labels.find((l) => l.anchor === "end");
    if (la && lb && Math.abs(la.y - lb.y) < 16 && la.x + la.w + 10 > lb.x - lb.w) lb.y = Math.min(la.y, lb.y) - 17;
    const minLabelY = Math.min(0, ...labels.filter((l) => !l.below).map((l) => l.y - 14));
    const mt = (labelsOn ? 12 : 8) - minLabelY + (o.padTop || 0);
    const mb = labelsOn && labels.some((l) => l.below) ? 30 : 10;
    let padL = o.padLeft == null ? 10 : o.padLeft, padR = o.padRight == null ? 10 : o.padRight;
    for (const l of labels) {
      if (l.anchor === "middle") { padL = Math.max(padL, l.w / 2 - l.x + 4); padR = Math.max(padR, l.x + l.w / 2 - W + 4); }
      if (l.anchor === "start") padR = Math.max(padR, l.x + l.w - W + 4);
      if (l.anchor === "end") padL = Math.max(padL, l.w - l.x + 4);
    }
    const Wp = Math.ceil(W + padL + padR), Hp = Math.ceil(H + mt + mb);
    const fit = (s, max, size, wt) => {
      if (measure(s, size, wt) <= max) return s;
      let t = s;
      while (t.length > 1 && measure(t + "…", size, wt) > max) t = t.slice(0, -1);
      return t + "…";
    };

    let s = `<svg xmlns="http://www.w3.org/2000/svg" class="isd" viewBox="0 0 ${Wp} ${Hp}" width="${Wp}" height="${Hp}" ` +
            `role="img" aria-label="${esc(o.ariaLabel || "Itemized set diagram")}" font-family="Figtree, Helvetica, Arial, sans-serif">`;
    const cIdx = lay.roles.C != null ? idxOf(lay.roles.C) : 0;
    s += `<defs><pattern id="${uid}-fill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
         `<rect width="6" height="6" fill="${tint([cIdx])}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#fff" stroke-width="2.4"/></pattern></defs>`;
    s += `<rect width="${Wp}" height="${Hp}" fill="#fff"/>`;
    s += `<g transform="translate(${padL.toFixed(1)} ${mt.toFixed(1)})">`;
    lay.cells.forEach((c, k) => {
      const filler = c.item == null && !c.placeholder;
      const fill = filler ? `url(#${uid}-fill)` : tint(c.zone.map(idxOf));
      let t = "";
      if (c.placeholder) {
        t = `<text class="names" x="${cw / 2}" y="${ch / 2 + fs * 0.36}" text-anchor="middle" font-size="${fs + 1}" fill="#8892A2">${PLACEHOLDER}</text>`;
      } else if (!filler) {
        const cat = cats[c.item];
        let wt = cat ? 700 : 500;
        if (scores && typeof scores[c.item] === "number" && smax > smin) wt = Math.round(300 + 600 * (scores[c.item] - smin) / (smax - smin));
        const col = cat ? catCol[cat] : "#1C2433";
        t = `<text class="names" x="${cw / 2}" y="${ch / 2 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-weight="${wt}" fill="${col}">${esc(fit(c.item, cw - 6, fs, wt))}</text>`;
      }
      const dim = o.dim && o.dim(c) ? ";opacity:.22" : "";
      s += `<g class="c" data-i="${k}" style="--o:${k}${dim}" transform="translate(${px(c)} ${py(c)})"><rect width="${cw}" height="${ch}" fill="${fill}" stroke="#fff" stroke-width="1"/>${t}</g>`;
    });
    // outlines
    s += `<g fill="none" stroke-width="${o.strokeWidth || 2}" stroke-linejoin="round" pointer-events="none">`;
    const shift = `translate(${(-left * cw).toFixed(1)} 0)`;
    lay.names.forEach((name, i) => {
      const cs = lay.cells.filter((c) => c.zone.includes(name));
      if (!cs.length) return;
      const inset = (o.insetScale == null ? 1 : o.insetScale) * [2, 4, 6][i % 3];
      for (const d of outlinePaths(cs, top, cw, ch, inset, o.cornerRadius == null ? 6 : o.cornerRadius)) {
        s += `<path d="${d}" stroke="${SET_COLOURS[i % 3][1]}" transform="${shift}"/>`;
      }
    });
    s += `</g>`;
    if (o.counts !== false) {
      s += `<g class="counts">`;
      const byZone = new Map();
      for (const c of lay.cells) {
        if (c.item == null && !c.placeholder) continue;
        const zk = c.zone.join("\u0000");
        if (!byZone.has(zk)) byZone.set(zk, []);
        byZone.get(zk).push(c);
      }
      for (const cs of byZone.values()) {
        const n = cs.filter((c) => !c.placeholder).length;
        const mx = cs.reduce((a, c) => a + px(c), 0) / cs.length, my = cs.reduce((a, c) => a + py(c), 0) / cs.length;
        let best = cs[0], bd = Infinity;
        for (const c of cs) { const d = (px(c) - mx) ** 2 + (py(c) - my) ** 2; if (d < bd) { bd = d; best = c; } }
        s += `<text x="${px(best) + cw / 2}" y="${py(best) + ch / 2 + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="#1C2433">${n}</text>`;
      }
      s += `</g>`;
    }
    if (o.overlay) s += o.overlay(lay, { cw, ch, px, py, top, left });
    for (const l of labels) {
      s += `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}" font-size="14" font-weight="750" fill="${SET_COLOURS[l.i % 3][1]}">${esc(l.name)}` +
           `<tspan font-weight="500" font-size="13" fill="#566074"> ${l.n}</tspan></text>`;
    }
    s += `</g></svg>`;
    return { svg: s, width: Wp, height: Hp, cellWidth: cw, cellHeight: ch, top, left, padLeft: padL, padTop: mt };
  }

  return {
    VERSION, PLACEHOLDER, CHECKS, SET_COLOURS, CATEGORY_PALETTE,
    roundHalfUp, naturalKey, compareNatural, cellSize, defaultCellAspect,
    computeLayout, layoutSets, layoutRecord, zoneRows, checkLayout,
    tint, categoryColours, renderSVG,
  };
});
