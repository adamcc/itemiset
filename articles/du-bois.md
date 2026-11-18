# The Du Bois method: expanding the boundaries of information design


## From Playfair’s bars to Du Bois’s coils

In 1786 the Scottish engineer and political economist William Playfair
published *The Commercial and Political Atlas* ([Playfair
1786](#ref-playfair1786); facsimile in [Playfair
2005](#ref-playfair2005)). Most of its plates are line charts of
England’s trade over time. For Scotland he had figures for only one
year, so one plate shows Scotland’s exports and imports, place by place,
from Christmas 1780 to Christmas 1781, as horizontal bars. It is usually
counted as the first bar chart, and as the first quantitative graph
whose axis is neither space nor time ([Beniger and Robyn
1978](#ref-beniger1978); see also [Funkhouser
1937](#ref-funkhouser1937)).

Playfair’s charts set conventions that statistical graphics still
follow: bars share a baseline, and every length is drawn to one scale. A
little over a century later, W. E. B. Du Bois and a team at Atlanta
University stretched those conventions. For the American Negro exhibit
at the 1900 Paris Exposition, assembled by Thomas J. Calloway, Du Bois
and Daniel A. P. Murray, the team drew a series of hand-made charts of
Black life in Georgia and across the United States, made to answer
prejudice with evidence ([Lindberg 2020](#ref-lindberg2020);
[Battle-Baptiste and Rusert 2018](#ref-battlebaptiste2018); [Library of
Congress, n.d.](#ref-loc1900collection)).

## The outlier problem on a rectangular page

A bar chart struggles when one value dwarfs the rest. On a page of fixed
size, the designer has two poor choices ([Lohr 2019](#ref-lohr2019)):

- **Fit the scale to the largest value**, and the small bars shrink to
  slivers that are hard to read or compare.
- **Break the axis** (a “gapped” bar), and the largest bar no longer
  shows how much larger it really is. Broken and cut-off axes are
  common, but they are known to mislead readers ([Karduni et al.
  2020](#ref-karduni2020)).

## Coiling the long bar

Du Bois’s team found a third way: keep the long bar unbroken, but bend
it. In *City and Rural Population. 1890*, from the Georgia series, the
small city populations are short straight bars, while the rural
population, by far the largest group, is drawn as a large red coil ([Du
Bois 1900](#ref-dubois1900city); [Lindberg 2020](#ref-lindberg2020)).
The other bars can then use a scale at which they stay legible, and the
coiled bar, if straightened, would still be exactly as long as its value
requires ([Lohr 2019](#ref-lohr2019); [Yau 2017](#ref-yau2017)). It was
not a one-off: Karduni and colleagues reproduce three of Du Bois’s
charts that wrap their largest bar, among them a chart of occupations
([Karduni et al. 2020](#ref-karduni2020)).

The idea has since been tested. Karduni and colleagues turned it into
the *Du Bois wrapped bar chart* and compared it with standard bar charts
in crowdsourced experiments. When values were very unequal, readers of
the wrapped charts identified the smallest values and estimated ratios
between bars more accurately. The cost was speed: wrapped bars took
longer to read, especially when a bar wrapped many times ([Karduni et
al. 2020](#ref-karduni2020)).

## From coils to discorectilinear polygons

ItemiSet takes the same step with cells instead of ink. Every item (a
gene, a protein, a country) gets one cell, so a region’s area is exactly
its count. A long run of cells is never cut or rescaled. Instead it is
folded back and forth, row by row or column by column, the way Du Bois
folded his longest bar, so a region of 63 items can sit beside a region
of 4 and both stay readable.

The folded run is drawn as one shape: the union of its cells, inset
slightly and with its corners rounded. We call this a *discorectilinear
polygon*: a rectilinear polygon assembled from discrete grid cells.
ItemiSet uses it in both of its grid layouts:

- In an [Euler diagram](../euler/layout.html), each column group is
  filled back and forth from a common baseline, so every zone is one
  connected run of cells.
- In a [treemap](../treemap/layout.html), the cells follow one
  back-and-forth path through the whole grid, and every group at every
  depth gets a contiguous stretch of it.

<img src="du-bois-fold.svg"
data-fig-alt="Three panels. Panel a shows bars of 4, 7 and 63 on one scale, so the first two are tiny. Panel b shows the same values with one unit per item, the bar of 63 folding back and forth in rows of 12. Panel c shows 4, 7 and 63 cells, the 63 cells folded in rows of 12 and outlined as one rounded shape."
alt="Three panels. Panel a shows bars of 4, 7 and 63 on one scale, so the first two are tiny. Panel b shows the same values with one unit per item, the bar of 63 folding back and forth in rows of 12. Panel c shows 4, 7 and 63 cells, the 63 cells folded in rows of 12 and outlined as one rounded shape." />

There are two differences from Du Bois’s coils. A wrapped bar keeps
*length* proportional to the value; ItemiSet keeps *area* proportional,
which a fold of whole cells does exactly. And because each cell carries
an item’s name, the folded region is not only a measure of how many: it
is also the list of which ones.

The figure above is drawn by `tools/du_bois_figure.py` with the
library’s own outline code
([`itemiset.core.outline.rounded_region`](https://adamcc.github.io/itemiset/core/outline.html#rounded_region)).

## Further reading

- The Library of Congress holds the original charts, in its collection
  *African American Photographs Assembled for 1900 Paris Exposition*
  ([Library of Congress, n.d.](#ref-loc1900collection)). The coiled
  chart discussed here is [*City and Rural Population.
  1890*](https://www.loc.gov/item/2013650430/) ([Du Bois
  1900](#ref-dubois1900city)).
- Battle-Baptiste and Rusert reproduce the full series in colour, with
  essays on its history ([Battle-Baptiste and Rusert
  2018](#ref-battlebaptiste2018)).
- Sharon Lohr explains why the serpentine bar solves the outlier problem
  ([Lohr 2019](#ref-lohr2019)); Nathan Yau’s FlowingData post gives an
  overview of the collection ([Yau 2017](#ref-yau2017)); and Tableau’s
  blog sets the exhibit in its social and political context ([Tableau
  2019](#ref-tableau2019)).

## References

<div id="refs" class="references csl-bib-body hanging-indent">

<div id="ref-battlebaptiste2018" class="csl-entry">

Battle-Baptiste, Whitney, and Britt Rusert, eds. 2018.
*<span class="nocase">W. E. B. Du Bois’s</span> Data Portraits:
Visualizing Black America*. Princeton Architectural Press.
<https://search.worldcat.org/search?q=bn:9781616897062>.

</div>

<div id="ref-beniger1978" class="csl-entry">

Beniger, James R., and Dorothy L. Robyn. 1978. “Quantitative Graphics in
Statistics: A Brief History.” *The American Statistician* 32 (1): 1–11.
<https://doi.org/10.1080/00031305.1978.10479235>.

</div>

<div id="ref-dubois1900city" class="csl-entry">

Du Bois, W. E. B. 1900. *City and Rural Population. 1890*.
<https://www.loc.gov/item/2013650430/>.

</div>

<div id="ref-funkhouser1937" class="csl-entry">

Funkhouser, H. Gray. 1937. “Historical Development of the Graphical
Representation of Statistical Data.” *Osiris* 3: 269–404.
<https://doi.org/10.1086/368480>.

</div>

<div id="ref-karduni2020" class="csl-entry">

Karduni, Alireza, Ryan Wesslen, Isaac Cho, and Wenwen Dou. 2020. “Du
Bois Wrapped Bar Chart: Visualizing Categorical Data with
Disproportionate Values.” *Proceedings of the 2020 CHI Conference on
Human Factors in Computing Systems*.
<https://doi.org/10.1145/3313831.3376365>.

</div>

<div id="ref-loc1900collection" class="csl-entry">

Library of Congress. n.d. *African American Photographs Assembled for
1900 Paris Exposition*.
<https://www.loc.gov/pictures/collection/anedub/>.

</div>

<div id="ref-lindberg2020" class="csl-entry">

Lindberg, Melissa. 2020. *African Americans at the Turn of the 20th
Century: A Graphic Visualization*. Picture This (Library of Congress
blog).
<https://blogs.loc.gov/picturethis/2020/04/african-americans-at-the-turn-of-the-20th-century-a-graphic-visualization/>.

</div>

<div id="ref-lohr2019" class="csl-entry">

Lohr, Sharon. 2019. *<span class="nocase">W.E.B. Du Bois’s</span>
Serpentine Bar Chart*.
<https://www.sharonlohr.com/blog/2019/2/4/web-du-boiss-bar-charts>.

</div>

<div id="ref-playfair1786" class="csl-entry">

Playfair, William. 1786. *The Commercial and Political Atlas*. London.

</div>

<div id="ref-playfair2005" class="csl-entry">

Playfair, William. 2005. *Playfair’s Commercial and Political Atlas and
Statistical Breviary*. Edited by Howard Wainer and Ian Spence. Cambridge
University Press. <https://search.worldcat.org/title/58604637>.

</div>

<div id="ref-tableau2019" class="csl-entry">

Tableau. 2019. *How W.E.B. Du Bois Used Data Visualization to Confront
Prejudice in the Early 20th Century*. Tableau blog.
<https://www.tableau.com/blog/how-web-du-bois-used-data-visualization-confront-prejudice-early-20th-century>.

</div>

<div id="ref-yau2017" class="csl-entry">

Yau, Nathan. 2017. *Graphs from 1900 That Depict a Snapshot of African
American Life*. FlowingData.
<https://flowingdata.com/2017/02/14/graphs-from-1900-that-depict-a-snapshot-of-african-american-life/>.

</div>

</div>
