# itemiset.js

The browser version of ItemiSet's layout, used by the website and web app. It is a port of the
Python reference in `nbs/00_layout.ipynb` and must put every item in the same cell.

```html
<script src="itemiset.js"></script>
<script>
  const lay = ItemiSet.layoutSets([["DDX6", ["EDC4", "PATL1"]], ["LSM14A", ["EDC4", "LSM14B"]]]);
  const { svg } = ItemiSet.renderSVG(lay, { categories: { EDC4: "Decapping" } });
  document.body.insertAdjacentHTML("beforeend", svg);
</script>
```

| Function | Python equivalent | Must match Python? |
|---|---|---|
| `layoutSets(sets, {showEmpty, bottom, targetAspect, cellAspect, fontsize, maxWidth})` | `layout_sets` | Yes, cell for cell |
| `computeLayout`, `layoutRecord`, `zoneRows`, `naturalKey`, `roundHalfUp` | same names | Yes |
| `checkLayout(lay, sets)` | `check_layout` | Same five checks |
| `renderSVG(lay, options)` | `render` | No: drawing may differ |

## Tests

```sh
npm test
```

`test/fixtures/layouts.json` is written by `nbs/04_fixtures.ipynb`. If you change the Python layout,
regenerate it (`ITEMISET_REGEN=1 nbdev-test --file-glob 04_fixtures.ipynb`) and update `itemiset.js`
until the tests pass. No dependencies; Node 20 or later.
