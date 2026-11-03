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

The notebook `nbs/euler/05_examples.ipynb` turns it into the example sets used in the docs and on the website.

## Licence

BioGRID releases its data under the MIT License
(https://biogrid-downloads.nyc3.digitaloceanspaces.com/LICENSE.txt) and asks that publications
cite the original authors (above) and BioGRID:

> Stark C, Breitkreutz BJ, Reguly T, Boucher L, Breitkreutz A, Tyers M. BioGRID: a general
> repository for interaction datasets. *Nucleic Acids Research* 34:D535–D539 (2006).

The MIT License requires its notice to travel with the data, so BioGRID's licence is kept beside
it in `Biogrid-licence.txt`.

# Treemap example data

The tables in `treemap/` feed the treemap examples. The notebook `nbs/treemap/02_examples.ipynb`
turns them into `itemiset/data/treemap_examples.json`, which `itemiset.treemap.load_example` reads.
Its first cell (not run by the tests) holds the code that made the tables from the sources below.

## `treemap/ddx6_hgnc_groups.csv`: DDX6 partners and their gene groups

The 42 high-confidence preys of the DDX6 bait in the Youn *et al.* file above, matched by Entrez
ID to their current HGNC symbol, with one row for each HGNC gene group a protein belongs to
(including the groups that contain those groups). Proteins in no gene group have one row with the
group columns empty. 101 rows.

Source: the HGNC files below, downloaded 22 October 2026 from
`https://storage.googleapis.com/public-download-files/hgnc/` (the files behind genenames.org's
download page). SHA-256:

| file | SHA-256 |
|---|---|
| `hgnc_complete_set.txt` | `12363916be36f8f6f91879b0faade4eeaac973722de7136ec61329b77f2c2f91` |
| `family.csv` | `6d8735105126ea6556f8f46276f2789244dd85a674da5cfac6a97c499562ac02` |
| `gene_has_family.csv` | `d80173afc6cafacacc3bbd07d727e1047c68446d9387f96142f92477ad605df5` |
| `hierarchy.csv` | `af36370ac8b51f46ba2385f3fa0f5008720ec00a142defa4e3237fe956f57b4e` |

HGNC data are free to use under CC0 (https://www.genenames.org/about/license/). Please cite:

> Seal RL, Braschi B, Gray K, *et al.* Genenames.org: the HGNC resources in 2023.
> *Nucleic Acids Research* 51:D1003–D1009 (2023).

## `treemap/cldr_m49_countries.csv`: countries by UN region

Every ISO 3166-1 territory in the Unicode CLDR's copy of the UN M49 region tree, with its
continent, subregion, English short name and population estimate. 248 rows.

Source: CLDR JSON release 48.2.3 (`https://github.com/unicode-org/cldr-json`, tag `48.2.3`).
SHA-256:

| file | SHA-256 |
|---|---|
| `cldr-localenames-full/main/en/territories.json` | `158c1d575308f7e46912edbeda435c8fe2ef5dad280798231f3a432e406b1807` |
| `cldr-core/supplemental/territoryContainment.json` | `9f7d2eed5278ebb7c302b7536e391708b237945c314d09a206c632c2fab45ee2` |
| `cldr-core/supplemental/territoryInfo.json` | `b50369a0e1f5434c942dfe45064b39f488604ca0cedac5117e993248c19f2c0a` |

CLDR data are released under the Unicode License v3. Its notice must travel with the data, so it
is kept beside the table in `treemap/CLDR-LICENSE.txt`.

## Licences in the installed package

The installed package carries data derived from BioGRID and CLDR (`itemiset/data/*.json`), so
both notices are copied into `itemiset/data/` as well: `BIOGRID-LICENSE.txt` and `CLDR-LICENSE.txt`.
