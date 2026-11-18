"""Draw the figure for nbs/articles/du-bois.qmd: one large and two small counts as
(a) straight bars on one scale, (b) a wrapped bar, and (c) itemized cells folded into
discorectilinear polygons, as ItemiSet draws them.

    python tools/du_bois_figure.py            # writes nbs/articles/du-bois-fold.svg
"""
from pathlib import Path

import matplotlib
from matplotlib.figure import Figure
from matplotlib.patches import PathPatch, Rectangle
from shapely.geometry import box

from itemiset.core.outline import poly_to_path, rounded_region

OUT = Path(__file__).resolve().parent.parent / "nbs" / "articles" / "du-bois-fold.svg"
COUNTS = [("A", 4, "#BDE8F8", "#1DA1D8"), ("B", 7, "#F8C3DE", "#E0197D"), ("C", 63, "#F7F0A6", "#A39300")]
WIDTH = 12          # cells (or bar units) per row in panels b and c
INK, MUTED = "#1C2433", "#566074"


def snake(n, w):
    "(col, row) of n cells filled back and forth in rows of w, top row first."
    return [((i % w) if (i // w) % 2 == 0 else w - 1 - i % w, i // w) for i in range(n)]


def panel_title(ax, letter, text):
    ax.text(-0.04, 1.02, f"{letter}  {text}", transform=ax.transAxes, ha="left", va="bottom",
            fontsize=12.5, fontweight="bold", color=INK)


def main():
    fig = Figure(figsize=(8.4, 3.9))
    axes = [fig.add_axes([0.035 + i * 0.33, 0.04, 0.295, 0.82]) for i in range(3)]
    for ax in axes:
        ax.set_xlim(-0.9, WIDTH + 2.0); ax.set_ylim(11.8, -1.4)
        ax.set_aspect("equal"); ax.axis("off")

    # (a) straight bars on one scale: the large value sets the scale, small ones shrink to slivers
    ax = axes[0]
    panel_title(ax, "a", "Straight bars")
    scale = WIDTH / max(n for _, n, *_ in COUNTS)
    for k, (name, n, fill, edge) in enumerate(COUNTS):
        y = k * 1.6
        ax.add_patch(Rectangle((0, y), n * scale, 0.8, facecolor=edge, edgecolor="none"))
        ax.text(-0.25, y + 0.4, name, ha="right", va="center", fontsize=11, color=INK)
        ax.text(n * scale + 0.25, y + 0.4, str(n), ha="left", va="center", fontsize=11, color=MUTED)
    ax.text(0, 10.0, "One scale fits the largest value,\nso the small bars become slivers.",
            fontsize=10.5, color=MUTED, va="top")

    # (b) wrapped bar: one unit per item; the long bar folds back and forth and keeps its length
    ax = axes[1]
    panel_title(ax, "b", "Wrapped bar")
    y = 0.0
    for name, n, fill, edge in COUNTS:
        cells = snake(n, WIDTH)
        pts = [(c + 0.5, y + r * 1.0 + 0.4) for c, r in cells]
        xs, ys = [pts[0][0] - 0.5], [pts[0][1]]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            xs.append(x1); ys.append(y1)
        end = 0.5 if (len(cells) - 1) // WIDTH % 2 == 0 else -0.5
        xs.append(pts[-1][0] + end); ys.append(pts[-1][1])
        if n <= WIDTH:
            xs, ys = [0, n], [y + 0.4, y + 0.4]
        ax.plot(xs, ys, color=edge, lw=7.5, solid_capstyle="butt", solid_joinstyle="round")
        ax.text(-0.25, y + 0.4, name, ha="right", va="center", fontsize=11, color=INK)
        ax.text(min(n, WIDTH) + 0.25, y + 0.4, str(n), ha="left", va="center", fontsize=11, color=MUTED)
        y += 1.6 if n <= WIDTH else (len(cells) - 1) // WIDTH + 1.6
    ax.text(0, 10.0, "Unrolled, the long bar is still\n63 units long.",
            fontsize=10.5, color=MUTED, va="top")

    # (c) itemized: one cell per item, each run folded the same way, outlined as one rounded polygon
    ax = axes[2]
    panel_title(ax, "c", "Itemized (ItemiSet)")
    y = 0.0
    for name, n, fill, edge in COUNTS:
        cells = [(c, y + r) for c, r in snake(n, WIDTH)]
        region = rounded_region([box(c, r, c + 1, r + 1) for c, r in cells], inset=0.06, radius=0.32)
        ax.add_patch(PathPatch(poly_to_path(region), facecolor=fill, edgecolor="none"))
        for c, r in cells:
            ax.add_patch(Rectangle((c + 0.14, r + 0.38), 0.72, 0.24, facecolor=edge, alpha=0.55,
                                   edgecolor="none"))   # stand-ins for the names
        ax.text(-0.25, y + 0.5, name, ha="right", va="center", fontsize=11, color=INK)
        ax.text(min(n, WIDTH) + 0.25, y + 0.5, str(n), ha="left", va="center", fontsize=11, color=MUTED)
        y += (len(cells) - 1) // WIDTH + 1 + 0.6
    ax.text(0, 10.0, "Area is the count, and\nevery cell holds a name.",
            fontsize=10.5, color=MUTED, va="top")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with matplotlib.rc_context({"svg.fonttype": "none", "svg.hashsalt": "itemiset"}):
        fig.savefig(OUT, metadata={"Date": None}, bbox_inches="tight", pad_inches=0.08)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
