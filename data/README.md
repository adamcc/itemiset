# Example data

`youn2018_biogrid-5.0.262.tab3.txt.gz` holds every high-confidence BioID proximity interaction from:

> Youn J-Y, Dunham WH, Hong SJ, *et al.* (2018). High-density proximity mapping reveals the
> subcellular organization of mRNA-associated granules and bodies. *Molecular Cell* 69(3):517–532.e11.
> https://doi.org/10.1016/j.molcel.2017.12.020 (PubMed 29395067)

as curated by BioGRID, release 5.0.262 (compiled 25 September 2026). High confidence means a
SAINTexpress score or AvgP of at least 0.95. The file has 7,489 bait–prey pairs from 118 baits.

## How it was made

From `BIOGRID-SYSTEM-5.0.262.tab3.zip`
(https://downloads.thebiogrid.org/Download/BioGRID/Release-Archive/BIOGRID-5.0.262/BIOGRID-SYSTEM-5.0.262.tab3.zip):

```sh
unzip BIOGRID-SYSTEM-5.0.262.tab3.zip "*Proximity_Label-MS*"
f=BIOGRID-SYSTEM-Proximity_Label-MS-5.0.262.tab3.txt
{ head -1 "$f"; grep "PUBMED:29395067" "$f"; } > youn2018_biogrid-5.0.262.tab3.txt
gzip -9 -n youn2018_biogrid-5.0.262.tab3.txt
```

SHA-256 of the uncompressed file:
`aa535b62c31241b43378c2bbd6105622e62315bf6ed420a726986223ada64cbb`

The notebook `nbs/05_examples.ipynb` turns it into the example sets used in the docs and on the website.

## Licence

BioGRID releases its data under the MIT License
(https://biogrid-downloads.nyc3.digitaloceanspaces.com/LICENSE.txt) and asks that publications
cite the original authors (above) and BioGRID:

> Stark C, Breitkreutz BJ, Reguly T, Boucher L, Breitkreutz A, Tyers M. BioGRID: a general
> repository for interaction datasets. *Nucleic Acids Research* 34:D535–D539 (2006).

The MIT License requires its notice to travel with the data, so BioGRID's licence is kept beside
it in `Biogrid-licence.txt`.
