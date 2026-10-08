"""Add the splash page, web app and roadmap to the built docs.

    nbdev-docs                     # builds the documentation into _docs/
    python tools/build_site.py     # copies site/ and js/itemiset.js over it

The pages in site/ are hand-built HTML; Quarto builds everything else. site/index.html replaces
the index page Quarto writes. To look at the site pages alone, without building the docs:

    python tools/build_site.py --out _site_preview && python -m http.server -d _site_preview
"""
import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build(out: Path):
    site, lib = ROOT / "site", ROOT / "js" / "itemiset.js"
    out.mkdir(parents=True, exist_ok=True)
    copied = []
    for src in sorted(site.rglob("*")):
        if src.is_file() and not src.name.startswith("."):
            dst = out / src.relative_to(site)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied.append(dst.relative_to(out))
    (out / "assets").mkdir(exist_ok=True)
    shutil.copy2(lib, out / "assets" / "itemiset.js")
    copied.append(Path("assets/itemiset.js"))
    (out / ".nojekyll").touch()   # GitHub Pages: serve files as they are
    return copied


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(ROOT / "_docs"), help="output folder (default: _docs)")
    out = Path(ap.parse_args().out)
    for f in build(out):
        print(f"  {out / f}")
