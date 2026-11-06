__version__ = "0.0.1"

# Methods live in subpackages (itemiset.euler, itemiset.treemap, and later itemiset.upset);
# code shared between them lives in itemiset.core.
from itemiset import core, euler, treemap

# The Euler method's names stay importable from the top level, so `from itemiset import plot`
# keeps working. They are aliases of itemiset.euler.* until version 0.1.
from itemiset.euler.layout import Cell, Layout, check_layout, compute_layout, layout_record, layout_sets, zone_rows
from itemiset.euler.readers import load_sets
from itemiset.euler.render import plot, render
from itemiset.euler.examples import load_example
