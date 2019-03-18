# nCSTB

## crispr motif search tool

### coreScript expected output

```json
{
    "out" : {
        "data" : [ HIT_ELEMENTS ],
        "not_in" : EXCLUDED_GENOMES_AS_STRING,
        "number_hits" : NUMBER_OF_MOTIFS,
        "tag"   : [FOLDER_PATH]
}
```
Where,
* **FOLDER_PATH** is made of the two deepest work folders
* **EXCLUDED_GENOMES_AS_STRING** is a simple string concatenating all excluded genomes
* **HIT_ELEMENT** is of the following form

```json
{
    "sequence": "CCGGATTTACTGGGTGTAAAGGG",
    "occurences": [ OCC_ELEMENT ]
}
```

Where **OCC_ELEMENT** is of the following form

```json
{
    "org": "Chlorobium phaeobacteroides BS1 GCF_000020545.1",
    "all_ref": [
        {
            "ref": "NC_010831.1",
            "coords": [
                "-(121992,122014)",
                "-(149641,149663)"
            ]
        }
    ]
}
```

